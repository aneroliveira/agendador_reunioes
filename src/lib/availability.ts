import { DateTime } from "luxon";

export interface AvailabilityRuleInput {
  dayOfWeek: number; // 0=Sun ... 6=Sat, owner-local (matches JS Date#getDay())
  startTime: string; // "HH:mm", owner-local
  endTime: string; // "HH:mm", owner-local
  isActive: boolean;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface ComputeAvailableSlotsParams {
  rules: AvailabilityRuleInput[];
  ownerTimezone: string;
  durationMinutes: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeMinutes: number;
  bookingHorizonDays: number;
  /** Already-occupied intervals (confirmed bookings, Google Calendar busy blocks), UTC. */
  busy: BusyInterval[];
  /** Owner-local calendar days ("yyyy-MM-dd") blocked off entirely, e.g. holidays. */
  holidayDates?: Set<string>;
  /** Caller-requested window, UTC. Narrowed further by notice/horizon. */
  rangeFromUTC: Date;
  rangeToUTC: Date;
  /** Injected "current time" so the function stays pure and testable. */
  now: Date;
}

export interface AvailableSlot {
  startUTC: Date;
  endUTC: Date;
}

export interface ComputedSlots {
  /** Bookable slots. */
  available: AvailableSlot[];
  /** Slots that exist within working hours but are already taken — shown grayed out, never bookable. */
  unavailable: AvailableSlot[];
}

function parseHHMM(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

function intervalsOverlap(aStart: DateTime, aEnd: DateTime, bStart: DateTime, bEnd: DateTime): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Computes bookable UTC slots from owner-local working-hours rules, minus
 * busy intervals, minus the minimum-notice/booking-horizon window.
 *
 * Pure function: no DB/network access, no wall-clock reads. Duration/buffer
 * arithmetic uses Luxon's real-elapsed-time `plus`, so results stay correct
 * across DST transitions instead of drifting by wall-clock hours.
 */
export function computeAvailableSlots(params: ComputeAvailableSlotsParams): ComputedSlots {
  const {
    rules,
    ownerTimezone,
    durationMinutes,
    bufferBeforeMin,
    bufferAfterMin,
    minNoticeMinutes,
    bookingHorizonDays,
    busy,
    holidayDates,
    rangeFromUTC,
    rangeToUTC,
    now,
  } = params;

  const nowDT = DateTime.fromJSDate(now, { zone: "utc" });
  const earliestStart = nowDT.plus({ minutes: minNoticeMinutes });
  const latestEnd = nowDT.plus({ days: bookingHorizonDays });

  const windowStart = DateTime.max(DateTime.fromJSDate(rangeFromUTC, { zone: "utc" }), earliestStart);
  const windowEnd = DateTime.min(DateTime.fromJSDate(rangeToUTC, { zone: "utc" }), latestEnd);

  if (windowEnd <= windowStart) return { available: [], unavailable: [] };

  const busyDT = busy.map((b) => ({
    start: DateTime.fromJSDate(b.start, { zone: "utc" }),
    end: DateTime.fromJSDate(b.end, { zone: "utc" }),
  }));

  const activeRulesByDay = new Map<number, AvailabilityRuleInput[]>();
  for (const rule of rules) {
    if (!rule.isActive) continue;
    const list = activeRulesByDay.get(rule.dayOfWeek) ?? [];
    list.push(rule);
    activeRulesByDay.set(rule.dayOfWeek, list);
  }
  if (activeRulesByDay.size === 0) return { available: [], unavailable: [] };

  const available: AvailableSlot[] = [];
  const unavailable: AvailableSlot[] = [];

  // Walk owner-local calendar days covering [windowStart, windowEnd], with a
  // one-day pad on each side so a day whose local working hours cross a UTC
  // day boundary isn't missed.
  let cursor = windowStart.setZone(ownerTimezone).startOf("day").minus({ days: 1 });
  const lastDay = windowEnd.setZone(ownerTimezone).startOf("day").plus({ days: 1 });

  while (cursor <= lastDay) {
    // A holiday takes the whole day off the table — same visual result as a
    // day with no active rule (zero slots), just for a different reason.
    if (holidayDates?.has(cursor.toFormat("yyyy-MM-dd"))) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    const ourDayOfWeek = cursor.weekday % 7; // Luxon: 1=Mon..7=Sun -> 0=Sun..6=Sat
    const dayRules = activeRulesByDay.get(ourDayOfWeek) ?? [];

    for (const rule of dayRules) {
      const { hour: startHour, minute: startMinute } = parseHHMM(rule.startTime);
      const { hour: endHour, minute: endMinute } = parseHHMM(rule.endTime);

      const dayWindowStart = cursor.set({ hour: startHour, minute: startMinute, second: 0, millisecond: 0 });
      const dayWindowEnd = cursor.set({ hour: endHour, minute: endMinute, second: 0, millisecond: 0 });
      if (dayWindowEnd <= dayWindowStart) continue;

      let slotStart = dayWindowStart;
      while (slotStart.plus({ minutes: durationMinutes }) <= dayWindowEnd) {
        const slotEnd = slotStart.plus({ minutes: durationMinutes });

        if (slotStart >= windowStart && slotEnd <= windowEnd) {
          const paddedStart = slotStart.minus({ minutes: bufferBeforeMin });
          const paddedEnd = slotEnd.plus({ minutes: bufferAfterMin });
          const isBusy = busyDT.some((b) => intervalsOverlap(paddedStart, paddedEnd, b.start, b.end));
          const target = isBusy ? unavailable : available;
          target.push({ startUTC: slotStart.toJSDate(), endUTC: slotEnd.toJSDate() });
        }

        slotStart = slotStart.plus({ minutes: durationMinutes });
      }
    }

    cursor = cursor.plus({ days: 1 });
  }

  available.sort((a, b) => a.startUTC.getTime() - b.startUTC.getTime());
  unavailable.sort((a, b) => a.startUTC.getTime() - b.startUTC.getTime());
  return { available, unavailable };
}
