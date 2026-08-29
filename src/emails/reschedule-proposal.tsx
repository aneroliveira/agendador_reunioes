import { Heading, Link, Text } from "@react-email/components";
import { getReadableForeground } from "@/lib/color";
import { EmailLayout } from "./components/layout";
import { InfoRow } from "./components/info-row";

export interface RescheduleProposalEmailProps {
  eventTitle: string;
  inviteeName: string;
  reason: string;
  originalFormattedDateTime: string;
  proposedFormattedDateTime: string;
  respondUrl: string;
  accentColor: string;
}

export default function RescheduleProposalEmail({
  eventTitle,
  inviteeName,
  reason,
  originalFormattedDateTime,
  proposedFormattedDateTime,
  respondUrl,
  accentColor,
}: RescheduleProposalEmailProps) {
  return (
    <EmailLayout previewText={`Nova sugestão de horário: ${eventTitle}`} accentColor={accentColor}>
      <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>Nova sugestão de horário</Heading>
      <Text>Olá {inviteeName},</Text>
      <Text>
        Infelizmente o horário combinado para <strong>{eventTitle}</strong> não vai mais funcionar. {reason}
      </Text>
      <InfoRow label="Horário original">{originalFormattedDateTime}</InfoRow>
      <InfoRow label="Novo horário sugerido">{proposedFormattedDateTime}</InfoRow>
      <Text>
        <Link
          href={respondUrl}
          style={{
            display: "inline-block",
            backgroundColor: accentColor,
            color: getReadableForeground(accentColor),
            padding: "10px 20px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          Ver e responder à sugestão
        </Link>
      </Text>
    </EmailLayout>
  );
}
