import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Text } from "@react-email/components";

export interface ConfirmationEmailProps {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  meetLink: string | null;
  cancelUrl: string;
}

export default function ConfirmationEmail({
  eventTitle,
  formattedDateTime,
  inviteeName,
  meetLink,
  cancelUrl,
}: ConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reunião confirmada: {eventTitle}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "20px" }}>Reunião confirmada</Heading>
          <Text>Olá {inviteeName},</Text>
          <Text>
            Sua reunião <strong>{eventTitle}</strong> está confirmada para:
          </Text>
          <Text style={{ fontSize: "16px", fontWeight: "bold" }}>{formattedDateTime}</Text>
          {meetLink && (
            <Text>
              Link da videochamada: <Link href={meetLink}>{meetLink}</Link>
            </Text>
          )}
          <Hr />
          <Text style={{ fontSize: "12px", color: "#666666" }}>
            Precisa cancelar? <Link href={cancelUrl}>Clique aqui</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
