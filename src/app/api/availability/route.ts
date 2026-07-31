import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeAvailableSlots } from "@/lib/availability";

const querySchema = z.object({
  eventType: z.string().min(1),
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  const { eventType: slug, from, to } = parsed.data;

  const [owner, eventType] = await Promise.all([
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
    prisma.eventType.findUnique({
      where: { slug },
      include: { availabilityRules: true },
    }),
  ]);

  if (!owner) {
    return NextResponse.json({ error: "Conta do dono da agenda não configurada" }, { status: 500 });
  }
  if (!eventType || !eventType.isActive) {
    return NextResponse.json({ error: "Tipo de reunião não encontrado" }, { status: 404 });
  }

  const rangeFromUTC = new Date(from);
  const rangeToUTC = new Date(to);

  // Local confirmed bookings for this event type count as busy, same as
  // Google Calendar busy blocks will once Phase 2 wires that in.
  const existingBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: eventType.id,
      status: "CONFIRMED",
      startTimeUTC: { lt: rangeToUTC },
      endTimeUTC: { gt: rangeFromUTC },
    },
    select: { startTimeUTC: true, endTimeUTC: true },
  });

  const slots = computeAvailableSlots({
    rules: eventType.availabilityRules,
    ownerTimezone: owner.timezone,
    durationMinutes: eventType.durationMinutes,
    bufferBeforeMin: eventType.bufferBeforeMin,
    bufferAfterMin: eventType.bufferAfterMin,
    minNoticeMinutes: owner.minNoticeMinutes,
    bookingHorizonDays: owner.bookingHorizonDays,
    busy: existingBookings.map((b) => ({ start: b.startTimeUTC, end: b.endTimeUTC })),
    rangeFromUTC,
    rangeToUTC,
    now: new Date(),
  });

  return NextResponse.json({
    eventType: { slug: eventType.slug, title: eventType.title, durationMinutes: eventType.durationMinutes },
    ownerTimezone: owner.timezone,
    slots: slots.map((s) => ({ startUTC: s.startUTC.toISOString(), endUTC: s.endUTC.toISOString() })),
  });
}
