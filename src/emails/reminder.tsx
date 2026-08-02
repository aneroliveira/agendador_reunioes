import { Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout } from "./components/layout";
import { StatusBadge } from "./components/status-badge";
import { CalendarButton } from "./components/calendar-button";

export interface ReminderEmailProps {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  meetLink: string | null;
  cancelUrl: string;
  startTimeUTC: Date;
  endTimeUTC: Date;
  inviteeNotes?: string | null;
  meetingProvider?: "GOOGLE_MEET" | "TEAMS";
  accentColor: string;
}

export default function ReminderEmail({
  eventTitle,
  formattedDateTime,
  inviteeName,
  meetLink,
  cancelUrl,
  startTimeUTC,
  endTimeUTC,
  inviteeNotes,
  meetingProvider,
  accentColor,
}: ReminderEmailProps) {
  const meetLinkLabel = meetingProvider === "TEAMS" ? "Link do Microsoft Teams" : "Link do Google Meet";
  return (
    <EmailLayout previewText={`Lembrete: ${eventTitle} em breve`} accentColor={accentColor}>
      <StatusBadge status="reminder" accentColor={accentColor} />
      <Heading style={{ fontSize: "20px" }}>Sua reunião é daqui a pouco</Heading>
      <Text>Olá {inviteeName},</Text>
      <Text>
        Lembrete de que <strong>{eventTitle}</strong> começa em breve:
      </Text>
      <Text style={{ fontSize: "16px", fontWeight: "bold" }}>{formattedDateTime}</Text>
      {meetLink && (
        <Text>
          {meetLinkLabel}: <Link href={meetLink}>{meetLink}</Link>
        </Text>
      )}
      {inviteeNotes && (
        <Text>
          <strong>Observações:</strong> {inviteeNotes}
        </Text>
      )}
      <CalendarButton
        title={eventTitle}
        startUTC={startTimeUTC}
        endUTC={endTimeUTC}
        location={meetLink ?? undefined}
        accentColor={accentColor}
      />
      <Hr />
      <Text style={{ fontSize: "14px" }}>
        Precisa cancelar? <Link href={cancelUrl} style={{ textDecoration: "underline" }}>Clique aqui</Link>.
      </Text>
    </EmailLayout>
  );
}
