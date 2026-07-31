import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import { sendCancellationEmail } from "@/lib/email";
import { cancelReminder } from "@/lib/qstash";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ cancelToken: string }> }) {
  const { cancelToken } = await params;

  const booking = await prisma.booking.findUnique({
    where: { cancelToken },
    include: { eventType: { select: { title: true, durationMinutes: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    status: booking.status,
    inviteeName: booking.inviteeName,
    startTimeUTC: booking.startTimeUTC.toISOString(),
    endTimeUTC: booking.endTimeUTC.toISOString(),
    eventType: booking.eventType,
  });
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ cancelToken: string }> }) {
  const { cancelToken } = await params;

  const booking = await prisma.booking.findUnique({
    where: { cancelToken },
    include: { eventType: { select: { title: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    // Freeing activeSlotKey is what lets the slot be booked again.
    data: { status: "CANCELLED", activeSlotKey: null },
  });

  if (booking.googleEventId) {
    try {
      await deleteCalendarEvent(booking.googleEventId);
    } catch (err) {
      // The booking is already cancelled in our DB either way; a stray
      // event left on the calendar is a cosmetic issue, not a booking bug.
      console.error("Falha ao remover evento do Google Calendar para a reserva", booking.id, err);
    }
  }

  if (booking.qstashMessageId) {
    await cancelReminder(booking.qstashMessageId);
  }

  try {
    const formattedDateTime = DateTime.fromJSDate(booking.startTimeUTC, { zone: booking.inviteeTimezone }).toLocaleString({
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendCancellationEmail({
      eventTitle: booking.eventType.title,
      formattedDateTime,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
    });
  } catch (err) {
    console.error("Falha ao enviar e-mail de cancelamento para a reserva", booking.id, err);
  }

  return NextResponse.json({ ok: true });
}
