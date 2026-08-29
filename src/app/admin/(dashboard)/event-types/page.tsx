import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AdminDecorativeBackground } from "@/components/admin-decorative-background";
import { EventTypeList } from "./event-type-list";

export default async function EventTypesPage() {
  const eventTypes = await prisma.eventType.findMany({
    orderBy: { createdAt: "asc" },
    include: { availabilityRules: true },
  });

  return (
    <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <AdminDecorativeBackground />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tipos de reunião</h1>
        <Button variant="ghost" size="sm" render={<Link href="/admin" />}>
          <ArrowLeft data-icon="inline-start" className="size-4" />
          Voltar
        </Button>
      </div>
      <EventTypeList
        eventTypes={eventTypes.map((eventType) => {
          const rulesByDay = new Map(eventType.availabilityRules.map((r) => [r.dayOfWeek, r]));
          return {
            id: eventType.id,
            slug: eventType.slug,
            title: eventType.title,
            description: eventType.description ?? "",
            durationMinutes: eventType.durationMinutes,
            isActive: eventType.isActive,
            availabilityRules: Array.from({ length: 7 }, (_, dayOfWeek) => {
              const existing = rulesByDay.get(dayOfWeek);
              return {
                dayOfWeek,
                isActive: existing?.isActive ?? false,
                startTime: existing?.startTime ?? "09:00",
                endTime: existing?.endTime ?? "18:00",
              };
            }),
          };
        })}
      />
    </main>
  );
}
