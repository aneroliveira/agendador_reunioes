import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { OwnerHeader } from "@/components/owner-header";
import { DurationBadge } from "@/components/duration-badge";
import { Card, CardContent } from "@/components/ui/card";

// Depends on which EventType(s) are active in the DB — must not be baked in at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [activeEventTypes, owner] = await Promise.all([
    prisma.eventType.findMany({
      where: { isActive: true },
      orderBy: { durationMinutes: "asc" },
    }),
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
  ]);

  if (activeEventTypes.length === 0 || !owner) {
    notFound();
  }

  // Single active event type: keep today's behavior exactly (redirect
  // straight through) — the picker below only shows up once there's an
  // actual choice to make.
  if (activeEventTypes.length === 1) {
    redirect(`/book/${activeEventTypes[0].slug}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 pt-6 pb-12">
      <OwnerHeader owner={owner} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Que tipo de conversa você quer agendar?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha uma opção para ver os horários disponíveis.</p>
      </div>
      <div className="flex flex-col gap-3">
        {activeEventTypes.map((eventType) => (
          <Link key={eventType.id} href={`/book/${eventType.slug}`} className="block">
            <Card className="transition hover:ring-2 hover:ring-primary">
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div>
                  <p className="font-medium">{eventType.title}</p>
                  {eventType.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{eventType.description}</p>
                  )}
                </div>
                <DurationBadge minutes={eventType.durationMinutes} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
