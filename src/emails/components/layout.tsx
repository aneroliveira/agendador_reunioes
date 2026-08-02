import { Body, Container, Head, Html, Preview } from "@react-email/components";
import type { ReactNode } from "react";

export function EmailLayout({
  previewText,
  accentColor,
  children,
}: {
  previewText: string;
  accentColor: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "8px",
            borderTop: `4px solid ${accentColor}`,
          }}
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
}
