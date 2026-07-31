import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";

/**
 * Daily safety net: Vercel Cron hits this once a day looking for confirmed
 * bookings starting soon that somehow never got a reminder (e.g. a lost
 * QStash message). The per-booking QStash schedule is still the primary
 * mechanism — this just catches the rare miss.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 60 * 60_000);

  const missed = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startTimeUTC: { gte: now, lte: soon },
    },
    include: { eventType: { select: { title: true } } },
  });

  for (const booking of missed) {
    const formattedDateTime = DateTime.fromJSDate(booking.startTimeUTC, { zone: booking.inviteeTimezone }).toLocaleString(
      { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
    );
    try {
      await sendReminderEmail({
        eventTitle: booking.eventType.title,
        formattedDateTime,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        meetLink: booking.meetLink,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${booking.cancelToken}`,
      });
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });
    } catch (err) {
      console.error("Falha ao enviar lembrete (sweep) para a reserva", booking.id, err);
    }
  }

  return NextResponse.json({ ok: true, checked: missed.length });
}
