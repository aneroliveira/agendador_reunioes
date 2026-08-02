import { notFound } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { prisma } from "@/lib/db";
import { AvatarInitials } from "@/components/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarInitials name={owner.displayName} accentColor={owner.themeColor} />
          <div>
            <h2 className="text-lg font-semibold">{owner.displayName}</h2>
            {owner.introText && <p className="text-sm text-muted-foreground">{owner.introText}</p>}
            {(owner.linkedinUrl || owner.whatsappUrl) && (
              <div className="mt-1 flex gap-2">
                {owner.linkedinUrl && (
                  <Badge
                    variant="outline"
                    render={<a href={owner.linkedinUrl} target="_blank" rel="noopener noreferrer" />}
                  >
                    LinkedIn
                  </Badge>
                )}
                {owner.whatsappUrl && (
                  <Badge
                    variant="outline"
                    render={<a href={owner.whatsappUrl} target="_blank" rel="noopener noreferrer" />}
                  >
                    WhatsApp
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          aria-label="Área administrativa"
          render={<Link href="/admin" />}
        >
          <Settings className="size-4" />
        </Button>
      </div>
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
