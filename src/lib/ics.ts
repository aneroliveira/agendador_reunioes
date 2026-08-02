export interface BuildInviteIcsParams {
  uid: string;
  method: "PUBLISH" | "CANCEL";
  status: "CONFIRMED" | "CANCELLED";
  sequence: number;
  summary: string;
  description?: string;
  location?: string;
  startUTC: Date;
  endUTC: Date;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
}

/** Compact UTC timestamp shared by the .ics builder and the Google Calendar link builder (e.g. "20260810T140000Z"). */
export function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Builds a minimal RFC 5545 VEVENT invite, used as an email attachment so calendar clients can pick it up automatically. */
export function buildInviteIcs(params: BuildInviteIcsParams): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agendador de Reunioes//PT-BR",
    `METHOD:${params.method}`,
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(params.startUTC)}`,
    `DTEND:${formatIcsDate(params.endUTC)}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
    ...(params.description ? [`DESCRIPTION:${escapeIcsText(params.description)}`] : []),
    ...(params.location ? [`LOCATION:${escapeIcsText(params.location)}`] : []),
    `SEQUENCE:${params.sequence}`,
    `STATUS:${params.status}`,
    `ORGANIZER;CN=${escapeIcsText(params.organizerName)}:mailto:${params.organizerEmail}`,
    `ATTENDEE;CN=${escapeIcsText(params.attendeeName)}:mailto:${params.attendeeEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
