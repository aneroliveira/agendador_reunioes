import { cn } from "@/lib/utils";
import { getReadableForeground } from "@/lib/color";

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AvatarInitials({
  name,
  accentColor,
  className,
}: {
  name: string;
  accentColor: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold", className)}
      style={{ backgroundColor: accentColor, color: getReadableForeground(accentColor) }}
    >
      {getInitials(name)}
    </div>
  );
}
