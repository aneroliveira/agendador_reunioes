import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OwnerHeader } from "@/components/owner-header";
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 pt-6 pb-12">
      <OwnerHeader owner={owner} />
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
