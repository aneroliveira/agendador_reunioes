import { Client } from "@upstash/qstash";

const isDev = process.env.NODE_ENV !== "production";

// In dev, `devMode` targets a local QStash emulator (started via
// `startDevServer()` in instrumentation.ts) instead of the real Upstash
// cloud — this is what lets us test the full schedule -> webhook loop
// against `localhost`, which the real QStash cloud could never reach.
export const qstashClient = new Client(isDev ? { devMode: true } : { token: process.env.QSTASH_TOKEN! });

const REMINDER_LEAD_MINUTES = 60;

/**
 * Schedules a one-off reminder for `startTimeUTC - 60min`. Returns the
 * QStash message id to store on the booking (so it can be cancelled later),
 * or null if the meeting is already too close for a reminder to make sense.
 *
 * `REMINDER_TEST_DELAY_SECONDS` overrides the computed time with a short
 * fixed delay, for manually testing the whole loop without waiting an hour.
 */
export async function scheduleReminder(params: { bookingId: string; startTimeUTC: Date }): Promise<string | null> {
  const testDelaySeconds = process.env.REMINDER_TEST_DELAY_SECONDS
    ? Number(process.env.REMINDER_TEST_DELAY_SECONDS)
    : null;

  let notBefore: number;
  if (testDelaySeconds !== null) {
    notBefore = Math.floor(Date.now() / 1000) + testDelaySeconds;
  } else {
    const reminderTime = params.startTimeUTC.getTime() - REMINDER_LEAD_MINUTES * 60_000;
    if (reminderTime <= Date.now()) return null;
    notBefore = Math.floor(reminderTime / 1000);
  }

  const res = await qstashClient.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/send-reminder`,
    body: { bookingId: params.bookingId },
    notBefore,
  });

  return res.messageId;
}

export async function cancelReminder(messageId: string): Promise<void> {
  try {
    await qstashClient.messages.delete(messageId);
  } catch (err) {
    // Already-delivered or already-expired messages can't be deleted —
    // that's fine, the reminder handler is idempotent anyway.
    console.error("Falha ao cancelar lembrete agendado no QStash:", err);
  }
}
