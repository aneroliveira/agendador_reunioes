import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { DateTime } from "luxon";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";

const bodySchema = z.object({ bookingId: z.string().min(1) });

async function handler(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { eventType: { select: { title: true, slug: true } } },
  });

  // Idempotent: already reminded, cancelled, or gone are all fine — QStash
  // retries delivery, so this handler must be safe to run more than once.
  if (!booking || booking.status !== "CONFIRMED" || booking.reminderSentAt) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const formattedDateTime = DateTime.fromJSDate(booking.startTimeUTC, { zone: booking.inviteeTimezone }).toLocaleString(
    { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
  );

  await sendReminderEmail({
    bookingId: booking.id,
    eventTitle: booking.eventType.title,
    formattedDateTime,
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    meetLink: booking.meetLink,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${booking.cancelToken}`,
    startTimeUTC: booking.startTimeUTC,
    endTimeUTC: booking.endTimeUTC,
    eventTypeSlug: booking.eventType.slug,
  });

  await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });

  return NextResponse.json({ ok: true });
}

export const POST = verifySignatureAppRouter(handler, {
  devMode: process.env.NODE_ENV !== "production",
});
