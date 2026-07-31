"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BookingSummary {
  status: "CONFIRMED" | "CANCELLED";
  inviteeName: string;
  startTimeUTC: string;
  eventType: { title: string; durationMinutes: number };
}

export function CancelPanel({ cancelToken }: { cancelToken: string }) {
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/cancel/${cancelToken}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setBooking)
      .catch(() => setError("Reserva não encontrada."));
  }, [cancelToken]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/cancel/${cancelToken}`, { method: "POST" });
      if (!res.ok) throw new Error();
      setCancelled(true);
    } catch {
      setError("Não foi possível cancelar. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
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
        <CardContent className="pt-6 text-sm">Reunião cancelada.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <h1 className="text-lg font-semibold">{booking.eventType.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(booking.startTimeUTC).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
        </p>
        <p className="text-sm">Convidado(a): {booking.inviteeName}</p>
        <Button variant="destructive" onClick={handleCancel} disabled={cancelling} className="w-fit">
          {cancelling ? "Cancelando…" : "Cancelar reunião"}
        </Button>
      </CardContent>
    </Card>
  );
}
