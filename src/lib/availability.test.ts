import { describe, expect, it } from "vitest";
import { computeAvailableSlots } from "./availability";

const baseRule = { startTime: "09:00", endTime: "12:00", isActive: true };

describe("computeAvailableSlots", () => {
  it("generates fixed-duration slots within a single day's working hours", () => {
    // 2026-08-03 is a Monday.
    const slots = computeAvailableSlots({
      rules: [{ ...baseRule, dayOfWeek: 1 }],
      ownerTimezone: "America/Sao_Paulo",
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMinutes: 0,
      bookingHorizonDays: 30,
      busy: [],
      rangeFromUTC: new Date("2026-08-03T00:00:00Z"),
      rangeToUTC: new Date("2026-08-03T23:59:59Z"),
      now: new Date("2026-08-01T00:00:00Z"),
    });

    // 09:00-12:00 in one-hour steps -> 3 slots.
    expect(slots).toHaveLength(3);
    expect(slots[0].startUTC.toISOString()).toBe("2026-08-03T12:00:00.000Z");
    expect(slots[2].endUTC.toISOString()).toBe("2026-08-03T15:00:00.000Z");
  });

  it("excludes slots that overlap a busy interval", () => {
    const slots = computeAvailableSlots({
      rules: [{ ...baseRule, dayOfWeek: 1 }],
      ownerTimezone: "America/Sao_Paulo",
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMinutes: 0,
      bookingHorizonDays: 30,
      busy: [{ start: new Date("2026-08-03T13:00:00Z"), end: new Date("2026-08-03T14:00:00Z") }],
      rangeFromUTC: new Date("2026-08-03T00:00:00Z"),
      rangeToUTC: new Date("2026-08-03T23:59:59Z"),
      now: new Date("2026-08-01T00:00:00Z"),
    });

    expect(slots).toHaveLength(2);
    expect(slots.some((s) => s.startUTC.toISOString() === "2026-08-03T13:00:00.000Z")).toBe(false);
  });

  it("respects minimum notice by dropping slots too close to now", () => {
    const slots = computeAvailableSlots({
      rules: [{ ...baseRule, dayOfWeek: 1 }],
      ownerTimezone: "America/Sao_Paulo",
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMinutes: 180, // 3h
      bookingHorizonDays: 30,
      busy: [],
      rangeFromUTC: new Date("2026-08-03T00:00:00Z"),
      rangeToUTC: new Date("2026-08-03T23:59:59Z"),
      // 2026-08-03T12:30 UTC is 30min into the working window (12:00-15:00 UTC).
      now: new Date("2026-08-03T12:30:00Z"),
    });

    // With 3h notice from 12:30, earliest bookable start is 15:30 UTC -> no slot fits before 15:00 UTC close.
    expect(slots).toHaveLength(0);
  });

  it("respects the booking horizon by dropping slots too far in the future", () => {
    const slots = computeAvailableSlots({
      rules: [{ ...baseRule, dayOfWeek: 1 }],
      ownerTimezone: "America/Sao_Paulo",
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMinutes: 0,
      bookingHorizonDays: 1,
      busy: [],
      rangeFromUTC: new Date("2026-08-03T00:00:00Z"),
      rangeToUTC: new Date("2026-08-03T23:59:59Z"),
      now: new Date("2026-08-01T00:00:00Z"), // horizon ends 2026-08-02, before the 08-03 window
    });

    expect(slots).toHaveLength(0);
  });

  it("applies buffer minutes around existing busy intervals", () => {
    const slots = computeAvailableSlots({
      rules: [{ ...baseRule, dayOfWeek: 1 }],
      ownerTimezone: "America/Sao_Paulo",
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 30,
      minNoticeMinutes: 0,
      bookingHorizonDays: 30,
      // Busy 13:00-14:00 UTC. The 12:00-13:00 candidate needs a 30min gap
      // *after* itself before the busy block starts (12:00-13:30 padded),
      // which overlaps -> excluded. The 14:00-15:00 candidate starts right
      // as the busy block ends, so it's unaffected -> kept.
      busy: [{ start: new Date("2026-08-03T13:00:00Z"), end: new Date("2026-08-03T14:00:00Z") }],
      rangeFromUTC: new Date("2026-08-03T00:00:00Z"),
      rangeToUTC: new Date("2026-08-03T23:59:59Z"),
      now: new Date("2026-08-01T00:00:00Z"),
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].startUTC.toISOString()).toBe("2026-08-03T14:00:00.000Z");
  });

  it("handles the DST transition in America/Sao_Paulo-style dates without drifting", () => {
    // Brazil abolished DST in 2019, so use a zone that still observes it:
    // America/New_York springs forward on 2026-03-08 (02:00 -> 03:00 local).
    const slots = computeAvailableSlots({
      rules: [{ startTime: "09:00", endTime: "11:00", isActive: true, dayOfWeek: 0 }], // Sunday
      ownerTimezone: "America/New_York",
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMinutes: 0,
      bookingHorizonDays: 30,
      busy: [],
      rangeFromUTC: new Date("2026-03-08T00:00:00Z"),
      rangeToUTC: new Date("2026-03-08T23:59:59Z"),
      now: new Date("2026-03-01T00:00:00Z"),
    });

    // Before the transition (spring forward at 2026-03-08 02:00 local), UTC offset is -05:00,
    // so 09:00 local = 14:00 UTC; after the transition it's -04:00, so 10:00 local = 14:00 UTC.
    // Either way there must be exactly 2 one-hour slots and each must last exactly 60 real minutes.
    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(slot.endUTC.getTime() - slot.startUTC.getTime()).toBe(60 * 60 * 1000);
    }
  });

  it("returns no slots when there are no active rules", () => {
    const slots = computeAvailableSlots({
      rules: [{ ...baseRule, dayOfWeek: 1, isActive: false }],
      ownerTimezone: "America/Sao_Paulo",
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMinutes: 0,
      bookingHorizonDays: 30,
      busy: [],
      rangeFromUTC: new Date("2026-08-03T00:00:00Z"),
      rangeToUTC: new Date("2026-08-03T23:59:59Z"),
      now: new Date("2026-08-01T00:00:00Z"),
    });

    expect(slots).toHaveLength(0);
  });
});
