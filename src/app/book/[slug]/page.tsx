import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookingForm } from "./booking-form";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [eventType, owner] = await Promise.all([
    prisma.eventType.findUnique({ where: { slug } }),
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
  ]);

  if (!eventType || !eventType.isActive || !owner) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{eventType.title}</h1>
        {eventType.description && <p className="mt-1 text-muted-foreground">{eventType.description}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{eventType.durationMinutes} minutos</p>
      </div>
      <BookingForm eventTypeSlug={eventType.slug} durationMinutes={eventType.durationMinutes} />
    </main>
  );
}
