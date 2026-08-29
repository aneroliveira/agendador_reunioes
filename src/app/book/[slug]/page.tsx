import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OwnerHeader } from "@/components/owner-header";
import { Button } from "@/components/ui/button";
import { BookingForm } from "./booking-form";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [eventType, owner, activeEventTypeCount] = await Promise.all([
    prisma.eventType.findUnique({ where: { slug } }),
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
    prisma.eventType.count({ where: { isActive: true } }),
  ]);

  if (!eventType || !eventType.isActive || !owner) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 pt-6 pb-12">
      <OwnerHeader owner={owner} />
      {/* Only worth a "back" step when there was actually a choice to make. */}
      {activeEventTypeCount > 1 && (
        <Button variant="ghost" size="sm" className="w-fit -ml-2" render={<Link href="/" />}>
          <ChevronLeft data-icon="inline-start" className="size-4" />
          Voltar para escolher outro tipo
        </Button>
      )}
      <BookingForm
        eventTypeSlug={eventType.slug}
        eventTitle={eventType.title}
        eventDescription={eventType.description}
        durationMinutes={eventType.durationMinutes}
        bookingHorizonDays={owner.bookingHorizonDays}
        availableProviders={{
          googleMeet: Boolean(owner.googleRefreshToken),
          teams: Boolean(owner.teamsMeetingLink),
        }}
      />
    </main>
  );
}
