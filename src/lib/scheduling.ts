import { prisma } from "@/lib/db";
import { computeAvailableSlots, type AvailableSlot } from "@/lib/availability";
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
}): Promise<AvailableSlot[]> {
  const { eventType, owner, rangeFromUTC, rangeToUTC, now } = params;

  const [localBookings, googleBusy] = await Promise.all([
    prisma.booking.findMany({
      where: {
        eventTypeId: eventType.id,
        status: "CONFIRMED",
        startTimeUTC: { lt: rangeToUTC },
        endTimeUTC: { gt: rangeFromUTC },
      },
      select: { startTimeUTC: true, endTimeUTC: true },
    }),
    getBusyIntervals(rangeFromUTC, rangeToUTC).catch((err) => {
      console.error("Falha ao consultar freebusy do Google Calendar, seguindo só com reservas locais:", err);
      return [];
    }),
  ]);

  const busy = [
    ...localBookings.map((b) => ({ start: b.startTimeUTC, end: b.endTimeUTC })),
    ...googleBusy,
  ];

  return computeAvailableSlots({
    rules: eventType.availabilityRules,
    ownerTimezone: owner.timezone,
    durationMinutes: eventType.durationMinutes,
    bufferBeforeMin: eventType.bufferBeforeMin,
    bufferAfterMin: eventType.bufferAfterMin,
    minNoticeMinutes: owner.minNoticeMinutes,
    bookingHorizonDays: owner.bookingHorizonDays,
    busy,
    rangeFromUTC,
    rangeToUTC,
    now,
  });
}
