import { describe, expect, it } from "vitest";
import { buildInviteIcs } from "./ics";

const baseParams = {
  uid: "booking-123@agendador",
  method: "PUBLISH" as const,
  status: "CONFIRMED" as const,
  sequence: 0,
  summary: "Conversa Flexível com Fulano",
  startUTC: new Date("2026-08-10T14:00:00Z"),
  endUTC: new Date("2026-08-10T14:30:00Z"),
  organizerEmail: "owner@example.com",
  organizerName: "Lorena",
  attendeeEmail: "fulano@example.com",
  attendeeName: "Fulano",
};

describe("buildInviteIcs", () => {
  it("includes the required VEVENT fields", () => {
    const ics = buildInviteIcs(baseParams);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("DTSTART:20260810T140000Z");
    expect(ics).toContain("DTEND:20260810T143000Z");
    expect(ics).toContain("SUMMARY:Conversa Flexível com Fulano");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("ORGANIZER;CN=Lorena:mailto:owner@example.com");
    expect(ics).toContain("ATTENDEE;CN=Fulano:mailto:fulano@example.com");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("marks cancellations with METHOD:CANCEL and STATUS:CANCELLED", () => {
    const ics = buildInviteIcs({ ...baseParams, method: "CANCEL", status: "CANCELLED", sequence: 1 });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:1");
  });

  it("escapes commas and semicolons in free text", () => {
    const ics = buildInviteIcs({ ...baseParams, summary: "Reunião; pauta, revisão" });
    expect(ics).toContain("SUMMARY:Reunião\\; pauta\\, revisão");
  });
});
