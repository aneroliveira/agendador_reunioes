import { Heading, Link } from "@react-email/components";
import { EmailLayout } from "./components/layout";
import { InfoRow } from "./components/info-row";

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
