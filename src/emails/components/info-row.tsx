import type { ReactNode } from "react";
import { Text } from "@react-email/components";

/** One "Label: value" line — easier to scan than a paragraph mixing everything together. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Text style={{ margin: "0 0 10px", fontSize: "14px" }}>
      <strong>{label}:</strong> {children}
    </Text>
  );
}
