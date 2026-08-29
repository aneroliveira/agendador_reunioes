import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "./components/layout";
import { InfoRow } from "./components/info-row";

export interface RescheduleDeclinedEmailProps {
  eventTitle: string;
  inviteeName: string;
  inviteeEmail: string;
  proposedFormattedDateTime: string;
  accentColor: string;
}

export default function RescheduleDeclinedEmail({
  eventTitle,
  inviteeName,
  inviteeEmail,
  proposedFormattedDateTime,
  accentColor,
}: RescheduleDeclinedEmailProps) {
  return (
    <EmailLayout previewText={`${inviteeName} recusou o novo horário`} accentColor={accentColor}>
      <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>Sugestão de horário recusada</Heading>
      <Text>
        {inviteeName} não pôde no novo horário sugerido pra <strong>{eventTitle}</strong> e a reunião foi cancelada.
        Combine outro horário diretamente com {inviteeEmail}.
      </Text>
      <InfoRow label="Horário que foi recusado">{proposedFormattedDateTime}</InfoRow>
    </EmailLayout>
  );
}
