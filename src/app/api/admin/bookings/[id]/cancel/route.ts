import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import { sendCancellationEmail } from "@/lib/email";
import { cancelReminder } from "@/lib/qstash";

// Same cancellation behavior as the invitee's own cancel link
// (src/app/api/bookings/cancel/[cancelToken]/route.ts), just triggered by
// the owner from /admin instead of by the invitee's token.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { eventType: { select: { title: true, slug: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", activeSlotKey: null },
  });

  if (booking.googleEventId) {
    try {
      await deleteCalendarEvent(booking.googleEventId);
    } catch (err) {
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
      bookingId: booking.id,
      eventTitle: booking.eventType.title,
      formattedDateTime,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      startTimeUTC: booking.startTimeUTC,
      endTimeUTC: booking.endTimeUTC,
      eventTypeSlug: booking.eventType.slug,
      meetLink: booking.meetLink,
    });
  } catch (err) {
    console.error("Falha ao enviar e-mail de cancelamento para a reserva", booking.id, err);
  }

  return NextResponse.json({ ok: true });
}
