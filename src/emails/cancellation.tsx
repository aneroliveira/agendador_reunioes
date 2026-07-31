import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

export interface CancellationEmailProps {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
}

export default function CancellationEmail({ eventTitle, formattedDateTime, inviteeName }: CancellationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reunião cancelada: {eventTitle}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "20px" }}>Reunião cancelada</Heading>
          <Text>Olá {inviteeName},</Text>
          <Text>
            Sua reunião <strong>{eventTitle}</strong>, que estava marcada para:
          </Text>
          <Text style={{ fontSize: "16px", fontWeight: "bold" }}>{formattedDateTime}</Text>
          <Text>foi cancelada.</Text>
        </Container>
      </Body>
    </Html>
  );
}
