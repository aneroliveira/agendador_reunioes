export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "production") {
    // Local emulator for QStash so reminder scheduling can be tested against
    // localhost. Never throws (per the library's own contract) — if it can't
    // download its binary (e.g. restricted network), scheduling just silently
    // no-ops in dev, which sendConfirmationEmail/booking creation must tolerate.
    const { startDevServer } = await import("@upstash/qstash");
    await startDevServer();
  }
}
