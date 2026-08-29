import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { EventTypeList } from "./event-type-list";

export default async function EventTypesPage() {
  const eventTypes = await prisma.eventType.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tipos de reunião</h1>
        <Button variant="ghost" size="sm" render={<Link href="/admin" />}>
          <ArrowLeft data-icon="inline-start" className="size-4" />
          Voltar
        </Button>
      </div>
      <EventTypeList
        eventTypes={eventTypes.map((eventType) => ({
          id: eventType.id,
          slug: eventType.slug,
          title: eventType.title,
          description: eventType.description ?? "",
          durationMinutes: eventType.durationMinutes,
          isActive: eventType.isActive,
        }))}
      />
    </main>
  );
}
