import type { ReactNode } from "react";
import { Heading, Link, Text } from "@react-email/components";
import { EmailLayout } from "./components/layout";

export interface OwnerNotificationEmailProps {
  eventTitle: string;
  durationMinutes: number;
  formattedDateTime: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeNotes?: string | null;
  meetingProvider?: "GOOGLE_MEET" | "TEAMS";
  meetLink?: string | null;
  accentColor: string;
}

// One "Label: value" line per piece of info — easier to scan at a glance
// than a paragraph mixing everything together.
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Text style={{ margin: "0 0 10px", fontSize: "14px" }}>
      <strong>{label}:</strong> {children}
    </Text>
  );
}

export default function OwnerNotificationEmail({
  eventTitle,
  durationMinutes,
  formattedDateTime,
  inviteeName,
  inviteeEmail,
  inviteeNotes,
  meetingProvider,
  meetLink,
  accentColor,
}: OwnerNotificationEmailProps) {
  const meetLinkLabel = meetingProvider === "TEAMS" ? "Microsoft Teams" : "Google Meet";
  return (
    <EmailLayout previewText={`Nova reunião: ${inviteeName}`} accentColor={accentColor}>
      <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>Nova reunião agendada</Heading>
      <InfoRow label="Convidado(a)">
        {inviteeName} (<Link href={`mailto:${inviteeEmail}`}>{inviteeEmail}</Link>)
      </InfoRow>
      {inviteeNotes && <InfoRow label="Motivo">{inviteeNotes}</InfoRow>}
      <InfoRow label="Tipo">
        {eventTitle} · {durationMinutes} minutos
      </InfoRow>
      <InfoRow label="Quando">{formattedDateTime}</InfoRow>
      {meetLink && (
        <InfoRow label={meetLinkLabel}>
          <Link href={meetLink}>{meetLink}</Link>
        </InfoRow>
      )}
    </EmailLayout>
  );
}
