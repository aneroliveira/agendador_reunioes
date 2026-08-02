import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildGoogleCalendarUrl } from "@/lib/ics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { eventType: { select: { title: true, durationMinutes: true, slug: true } } },
  });

  if (!booking) {
    notFound();
  }

  const isCancelled = booking.status === "CANCELLED";
  const bookAgainHref = `/book/${booking.eventType.slug}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-12">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{isCancelled ? "Cancelado!" : "Confirmado!"}</h1>
            {isCancelled ? (
              <Badge variant="destructive" className="w-fit">
                Cancelada
              </Badge>
            ) : (
              <Badge className="w-fit">Confirmada</Badge>
            )}
          </div>
          <p className="text-base font-medium">{booking.eventType.title}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(booking.startTimeUTC).toLocaleString("pt-BR", {
              timeZone: booking.inviteeTimezone,
              dateStyle: "full",
              timeStyle: "short",
            })}{" "}
            ({booking.inviteeTimezone})
          </p>
          <p className="text-sm">Convidado(a): {booking.inviteeName}</p>

          {!isCancelled && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                render={
                  <a
                    href={buildGoogleCalendarUrl({
                      title: booking.eventType.title,
                      location: booking.meetLink ?? undefined,
                      startUTC: booking.startTimeUTC,
                      endUTC: booking.endTimeUTC,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Lembrete no Google Calendar
              </Button>
              <Button variant="outline" render={<Link href={bookAgainHref} />}>
                Voltar para o calendário
              </Button>
            </div>
          )}

          {isCancelled && (
            <Button variant="outline" className="w-fit" render={<Link href={bookAgainHref} />}>
              Voltar para o calendário
            </Button>
          )}

          {!isCancelled && (
            <Link
              href={`/cancel/${booking.cancelToken}`}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Cancelar esta reunião
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
