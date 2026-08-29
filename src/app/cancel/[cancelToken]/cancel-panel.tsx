"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BookingSummary {
  status: "CONFIRMED" | "CANCELLED";
  inviteeName: string;
  startTimeUTC: string;
  eventType: { title: string; durationMinutes: number; slug: string };
}

export function CancelPanel({ cancelToken }: { cancelToken: string }) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/cancel/${cancelToken}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setBooking)
      .catch(() => setLoadError("Reserva não encontrada."));
  }, [cancelToken]);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/bookings/cancel/${cancelToken}`, { method: "POST" });
      if (!res.ok) throw new Error();
      setCancelled(true);
      setDialogOpen(false);
    } catch {
      setCancelError("Não foi possível cancelar. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">{loadError}</CardContent>
      </Card>
    );
  }

  if (!booking) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Carregando…</CardContent>
      </Card>
    );
  }

  if (cancelled || booking.status === "CANCELLED") {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-1 pt-6">
          <h1 className="text-xl font-semibold">Cancelado!</h1>
          <p className="text-sm text-muted-foreground">Sua reunião foi cancelada.</p>
          <Button className="mt-3" render={<Link href="/" />}>
            Fazer novo agendamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formattedStart = new Date(booking.startTimeUTC).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="relative">
      <div className="absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full border-2 border-destructive bg-background ring-4 ring-background">
        <span className="text-lg leading-none font-bold text-destructive">?</span>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <h1 className="text-2xl font-semibold">Cancelar reunião</h1>
          <p className="text-base font-medium">{booking.eventType.title}</p>
          <p className="text-sm text-muted-foreground">{formattedStart}</p>
          <p className="text-sm">Convidado(a): {booking.inviteeName}</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="w-fit" onClick={() => router.back()}>
              Voltar
            </Button>
            <AlertDialog
              open={dialogOpen}
              onOpenChange={(open) => {
                // Não deixa fechar (Escape/clique fora) enquanto o cancelamento está em andamento.
                if (cancelling) return;
                setDialogOpen(open);
              }}
            >
              <AlertDialogTrigger render={<Button variant="destructive" className="w-fit" />}>
                Cancelar reunião
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar esta reunião?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {booking.eventType.title}, em {formattedStart}. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={cancelling}>Manter reunião</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? "Cancelando…" : "Sim, cancelar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
