import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Text } from "@react-email/components";

export interface ReminderEmailProps {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  meetLink: string | null;
  cancelUrl: string;
}

export default function ReminderEmail({
  eventTitle,
  formattedDateTime,
  inviteeName,
  meetLink,
  cancelUrl,
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Lembrete: {eventTitle} em breve</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "20px" }}>Sua reunião é daqui a pouco</Heading>
          <Text>Olá {inviteeName},</Text>
          <Text>
            Lembrete de que <strong>{eventTitle}</strong> começa em breve:
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
