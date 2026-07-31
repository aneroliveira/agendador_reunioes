import { Resend } from "resend";
import ConfirmationEmail from "@/emails/confirmation";
import ReminderEmail from "@/emails/reminder";
import CancellationEmail from "@/emails/cancellation";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface BookingEmailInfo {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  inviteeEmail: string;
  meetLink: string | null;
  cancelUrl: string;
}

// The Resend SDK never throws on API errors — it always resolves with
// { data: null, error }. Without this check, a rejected send (bad
// recipient, missing domain verification, etc.) would look identical to a
// successful one to every caller's try/catch.
function assertSent<T>(result: { data: T | null; error: { message: string; name: string } | null }): T {
  if (result.error) {
    throw new Error(`Resend: ${result.error.name} - ${result.error.message}`);
  }
  return result.data as T;
}

export async function sendConfirmationEmail(info: BookingEmailInfo) {
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: info.inviteeEmail,
    subject: `Confirmado: ${info.eventTitle}`,
    react: ConfirmationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
    }),
  });
  assertSent(result);
}

export async function sendReminderEmail(info: BookingEmailInfo) {
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: info.inviteeEmail,
    subject: `Lembrete: ${info.eventTitle} em breve`,
    react: ReminderEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
    }),
  });
  assertSent(result);
}

export async function sendCancellationEmail(
  info: Pick<BookingEmailInfo, "eventTitle" | "formattedDateTime" | "inviteeName" | "inviteeEmail">,
) {
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: info.inviteeEmail,
    subject: `Cancelado: ${info.eventTitle}`,
    react: CancellationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
    }),
  });
  assertSent(result);
}
