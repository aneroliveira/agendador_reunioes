import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { eventType: { select: { title: true, durationMinutes: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    status: booking.status,
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    inviteeTimezone: booking.inviteeTimezone,
    startTimeUTC: booking.startTimeUTC.toISOString(),
    endTimeUTC: booking.endTimeUTC.toISOString(),
    cancelToken: booking.cancelToken,
    eventType: booking.eventType,
  });
}
