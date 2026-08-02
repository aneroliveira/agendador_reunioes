import { Link } from "@react-email/components";
import { getReadableForeground } from "@/lib/color";
import { buildGoogleCalendarUrl } from "@/lib/ics";

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
  const href = buildGoogleCalendarUrl({ title, description, location, startUTC, endUTC });

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
