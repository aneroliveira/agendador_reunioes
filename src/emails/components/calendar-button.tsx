import { Link } from "@react-email/components";
import { getReadableForeground } from "@/lib/color";
import { formatIcsDate } from "@/lib/ics";

export function CalendarButton({
  title,
  description,
  location,
  startUTC,
  endUTC,
  accentColor,
}: {
  title: string;
  description?: string;
  location?: string;
  startUTC: Date;
  endUTC: Date;
  accentColor: string;
}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatIcsDate(startUTC)}/${formatIcsDate(endUTC)}`,
  });
  if (description) params.set("details", description);
  if (location) params.set("location", location);

  const href = `https://calendar.google.com/calendar/render?${params.toString()}`;

  return (
    <Link
      href={href}
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
      Adicionar ao Google Calendar
    </Link>
  );
}
