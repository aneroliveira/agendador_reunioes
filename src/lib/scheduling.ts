import { prisma } from "@/lib/db";
import { computeAvailableSlots, type ComputedSlots } from "@/lib/availability";
import { getBusyIntervals } from "@/lib/google-calendar";
import type { EventType, AvailabilityRule, OwnerAccount } from "@/generated/prisma/client";

/**
 * Computes bookable slots for one event type, blending local confirmed
 * bookings with the owner's real Google Calendar busy blocks (if connected).
 * Shared by the public availability endpoint and the booking-creation
 * route's server-side re-validation, so both always agree on what's bookable.
 */
export async function computeSlotsForEventType(params: {
  eventType: EventType & { availabilityRules: AvailabilityRule[] };
  owner: OwnerAccount;
  rangeFromUTC: Date;
  rangeToUTC: Date;
  now: Date;
}): Promise<ComputedSlots & { holidays: { date: string; label: string }[] }> {
  const { eventType, owner, rangeFromUTC, rangeToUTC, now } = params;

  const [localBookings, googleBusy, holidays] = await Promise.all([
    // Not scoped to this eventType: it's a single-owner app with one real
    // calendar, so a confirmed booking under ANY event type occupies real
    // time and must block slots for every other event type too. BLOCKED
    // rows are placeholders left behind by a resolved reschedule proposal —
    // no real meeting, but the slot stays off-limits regardless.
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "BLOCKED"] },
        startTimeUTC: { lt: rangeToUTC },
        endTimeUTC: { gt: rangeFromUTC },
      },
      select: { startTimeUTC: true, endTimeUTC: true },
    }),
    getBusyIntervals(rangeFromUTC, rangeToUTC).catch((err) => {
      console.error("Falha ao consultar freebusy do Google Calendar, seguindo só com reservas locais:", err);
      return [];
    }),
    // Padded by a day on each side, same reasoning as the day-walk in
    // computeAvailableSlots: a working day near the edge of the range can
    // fall on a different UTC day than its owner-local calendar date.
    prisma.holiday.findMany({
      where: {
        date: {
          gte: new Date(rangeFromUTC.getTime() - 24 * 60 * 60_000),
          lte: new Date(rangeToUTC.getTime() + 24 * 60 * 60_000),
        },
      },
      select: { date: true, label: true },
    }),
  ]);

  const busy = [
    ...localBookings.map((b) => ({ start: b.startTimeUTC, end: b.endTimeUTC })),
    ...googleBusy,
  ];

  const slots = computeAvailableSlots({
    rules: eventType.availabilityRules,
    ownerTimezone: owner.timezone,
    durationMinutes: eventType.durationMinutes,
    bufferBeforeMin: eventType.bufferBeforeMin,
    bufferAfterMin: eventType.bufferAfterMin,
    minNoticeMinutes: owner.minNoticeMinutes,
    bookingHorizonDays: owner.bookingHorizonDays,
    busy,
    holidayDates: new Set(holidays.map((h) => h.date.toISOString().slice(0, 10))),
    rangeFromUTC,
    rangeToUTC,
    now,
  });

  return { ...slots, holidays: holidays.map((h) => ({ date: h.date.toISOString().slice(0, 10), label: h.label })) };
}
