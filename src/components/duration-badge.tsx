import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// A distinct color per duration tier (shortest to longest) so the picker
// grid reads at a glance — custom Tailwind classes at the call site rather
// than extending the shared `badgeVariants` CVA, which would affect every
// other Badge consumer in the app.
const DURATION_COLOR_STEPS: { maxMinutes: number; className: string }[] = [
  { maxMinutes: 15, className: "border-sky-200 bg-sky-100 text-sky-800" },
  { maxMinutes: 30, className: "border-emerald-200 bg-emerald-100 text-emerald-800" },
  { maxMinutes: 45, className: "border-amber-200 bg-amber-100 text-amber-800" },
  { maxMinutes: 60, className: "border-orange-200 bg-orange-100 text-orange-800" },
];
const FALLBACK_CLASSNAME = "border-purple-200 bg-purple-100 text-purple-800";

function colorForDuration(minutes: number): string {
  return DURATION_COLOR_STEPS.find((step) => minutes <= step.maxMinutes)?.className ?? FALLBACK_CLASSNAME;
}

export function DurationBadge({ minutes }: { minutes: number }) {
  return (
    <Badge variant="outline" className={colorForDuration(minutes)}>
      <Clock data-icon="inline-start" className="size-3" />
      {minutes} minutos
    </Badge>
  );
}
