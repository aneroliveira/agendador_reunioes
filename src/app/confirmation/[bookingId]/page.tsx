import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { eventType: { select: { title: true, durationMinutes: true } } },
  });

  if (!booking) {
    notFound();
  }

  const isCancelled = booking.status === "CANCELLED";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-12">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {isCancelled ? (
            <Badge variant="destructive" className="w-fit">
              Cancelada
            </Badge>
          ) : (
            <Badge className="w-fit">Confirmada</Badge>
          )}
          <h1 className="text-xl font-semibold">{booking.eventType.title}</h1>
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
