import { getReadableForeground } from "@/lib/color";

const LABELS = {
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  reminder: "Lembrete",
} as const;

// Cancellation always reads as red regardless of the brand accent color, so the
// status stays unambiguous even if the owner's accent happens to be reddish too.
const CANCELLED_COLOR = "#dc2626";

export function StatusBadge({
  status,
  accentColor,
}: {
  status: "confirmed" | "cancelled" | "reminder";
  accentColor: string;
}) {
  const backgroundColor = status === "cancelled" ? CANCELLED_COLOR : accentColor;
  const color = status === "cancelled" ? "#ffffff" : getReadableForeground(backgroundColor);

  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor,
        color,
        fontSize: "12px",
        fontWeight: "bold",
        padding: "4px 10px",
        borderRadius: "999px",
      }}
    >
      {LABELS[status]}
    </span>
  );
}
