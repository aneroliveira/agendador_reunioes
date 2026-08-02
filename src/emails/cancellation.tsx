import { Heading, Link, Text } from "@react-email/components";
import { getReadableForeground } from "@/lib/color";
import { EmailLayout } from "./components/layout";
import { StatusBadge } from "./components/status-badge";

export interface CancellationEmailProps {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  bookAgainUrl: string;
  accentColor: string;
}

export default function CancellationEmail({
  eventTitle,
  formattedDateTime,
  inviteeName,
  bookAgainUrl,
  accentColor,
}: CancellationEmailProps) {
  return (
    <EmailLayout previewText={`Reunião cancelada: ${eventTitle}`} accentColor={accentColor}>
      <StatusBadge status="cancelled" accentColor={accentColor} />
      <Heading style={{ fontSize: "20px" }}>Reunião cancelada</Heading>
      <Text>Olá {inviteeName},</Text>
      <Text>
        Sua reunião <strong>{eventTitle}</strong>, que estava marcada para:
      </Text>
      <Text style={{ fontSize: "16px", fontWeight: "bold" }}>{formattedDateTime}</Text>
      <Text>foi cancelada.</Text>
      <Link
        href={bookAgainUrl}
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
        Agendar de novo
      </Link>
    </EmailLayout>
  );
}
