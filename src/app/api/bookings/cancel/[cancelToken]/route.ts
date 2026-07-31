import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  const booking = await prisma.booking.findUnique({ where: { cancelToken } });
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

  return NextResponse.json({ ok: true });
}
