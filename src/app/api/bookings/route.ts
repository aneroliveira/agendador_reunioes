import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { computeAvailableSlots } from "@/lib/availability";

const bodySchema = z.object({
  eventTypeSlug: z.string().min(1),
  startTimeUTC: z.iso.datetime({ offset: true }),
  inviteeName: z.string().trim().min(1).max(200),
  inviteeEmail: z.email(),
  inviteeTimezone: z.string().min(1),
  inviteeNotes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  const { eventTypeSlug, startTimeUTC, inviteeName, inviteeEmail, inviteeTimezone, inviteeNotes } = parsed.data;

  const [owner, eventType] = await Promise.all([
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
    prisma.eventType.findUnique({
      where: { slug: eventTypeSlug },
      include: { availabilityRules: true },
    }),
  ]);

  if (!owner) {
    return NextResponse.json({ error: "Conta do dono da agenda não configurada" }, { status: 500 });
  }
  if (!eventType || !eventType.isActive) {
    return NextResponse.json({ error: "Tipo de reunião não encontrado" }, { status: 404 });
  }

  const requestedStart = new Date(startTimeUTC);
  const requestedEnd = new Date(requestedStart.getTime() + eventType.durationMinutes * 60_000);

  // Re-validate against live data instead of trusting the client: recompute
  // slots for a window around the requested day and require an exact match.
  // This is what stops a booking from landing outside working hours or on
  // top of a slot someone else just took (on top of the DB unique index below).
  const existingBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: eventType.id,
      status: "CONFIRMED",
      startTimeUTC: { lt: new Date(requestedStart.getTime() + 24 * 60 * 60_000) },
      endTimeUTC: { gt: new Date(requestedStart.getTime() - 24 * 60 * 60_000) },
    },
    select: { startTimeUTC: true, endTimeUTC: true },
  });

  const validSlots = computeAvailableSlots({
    rules: eventType.availabilityRules,
    ownerTimezone: owner.timezone,
    durationMinutes: eventType.durationMinutes,
    bufferBeforeMin: eventType.bufferBeforeMin,
    bufferAfterMin: eventType.bufferAfterMin,
    minNoticeMinutes: owner.minNoticeMinutes,
    bookingHorizonDays: owner.bookingHorizonDays,
    busy: existingBookings.map((b) => ({ start: b.startTimeUTC, end: b.endTimeUTC })),
    rangeFromUTC: new Date(requestedStart.getTime() - 24 * 60 * 60_000),
    rangeToUTC: new Date(requestedStart.getTime() + 24 * 60 * 60_000),
    now: new Date(),
  });

  const isValidSlot = validSlots.some((s) => s.startUTC.getTime() === requestedStart.getTime());
  if (!isValidSlot) {
    return NextResponse.json(
      { error: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  const activeSlotKey = `${eventType.id}_${requestedStart.toISOString()}`;

  try {
    const booking = await prisma.booking.create({
      data: {
        eventTypeId: eventType.id,
        inviteeName,
        inviteeEmail,
        inviteeTimezone,
        inviteeNotes,
        startTimeUTC: requestedStart,
        endTimeUTC: requestedEnd,
        activeSlotKey,
      },
    });

    return NextResponse.json(
      {
        id: booking.id,
        cancelToken: booking.cancelToken,
        startTimeUTC: booking.startTimeUTC.toISOString(),
        endTimeUTC: booking.endTimeUTC.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." },
        { status: 409 },
      );
    }
    throw error;
  }
}
