"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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

export interface UpcomingBookingSummary {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  startTimeUTC: string;
  meetLink: string | null;
  eventType: { title: string; slug: string; durationMinutes: number };
}

interface Slot {
  startUTC: string;
  endUTC: string;
}

export function UpcomingBookings({ bookings }: { bookings: UpcomingBookingSummary[] }) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-medium">Próximas reuniões</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: UpcomingBookingSummary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao cancelar");
      setCancelDialogOpen(false);
      router.refresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Não foi possível cancelar. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  }

  async function loadSlotsForDay(dateStr: string) {
    setDay(dateStr);
    setSelectedSlot(null);
    setSlots(null);
    if (!dateStr) return;
    setLoadingSlots(true);
    try {
      const from = new Date(`${dateStr}T00:00:00`);
      const to = new Date(`${dateStr}T23:59:59`);
      const res = await fetch(
        `/api/availability?eventType=${encodeURIComponent(booking.eventType.slug)}&from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSubmit() {
    if (!selectedSlot || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/propose-reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedStartTimeUTC: selectedSlot.startUTC, reason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao enviar sugestão");
      setOpen(false);
      setReason("");
      setDay("");
      setSlots(null);
      setSelectedSlot(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">{booking.eventType.title}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(booking.startTimeUTC).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })} —{" "}
            {booking.inviteeName} ({booking.inviteeEmail})
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {booking.meetLink && (
            <Button
              variant="outline"
              render={<a href={booking.meetLink} target="_blank" rel="noopener noreferrer" />}
            >
              Meet
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button variant="ghost" size="sm" />}>Sugerir novo horário</DialogTrigger>
            <DialogContent size="lg">
              <DialogHeader>
                <DialogTitle>Sugerir novo horário</DialogTitle>
                <DialogDescription>
                  {booking.inviteeName} vai receber um e-mail explicando o motivo, podendo aceitar ou recusar.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor={`reason-${booking.id}`}>Motivo</Label>
                  <Textarea
                    id={`reason-${booking.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="ex: Surgiu um imprevisto nesse horário…"
                  />
                </div>
                <div>
                  <Label htmlFor={`day-${booking.id}`}>Novo dia</Label>
                  <input
                    id={`day-${booking.id}`}
                    type="date"
                    min={todayStr}
                    value={day}
                    onChange={(e) => loadSlotsForDay(e.target.value)}
                    className="block rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
                {day && (
                  <div>
                    <Label>Horário</Label>
                    {loadingSlots ? (
                      <p className="text-sm text-muted-foreground">Carregando horários…</p>
                    ) : !slots || slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum horário livre nesse dia.</p>
                    ) : (
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {slots.map((slot) => (
                          <Button
                            key={slot.startUTC}
                            type="button"
                            variant={selectedSlot?.startUTC === slot.startUTC ? "default" : "outline"}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatTime(slot.startUTC)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                <Button disabled={!selectedSlot || !reason.trim() || submitting} onClick={handleSubmit}>
                  {submitting ? "Enviando…" : "Enviar sugestão"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => (!cancelling ? setCancelDialogOpen(open) : null)}>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Cancelar reunião</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar essa reunião?</AlertDialogTitle>
                <AlertDialogDescription>
                  {booking.inviteeName} vai receber o mesmo e-mail de cancelamento de quando ela mesma cancela. Essa
                  ação não pode ser desfeita.
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
  );
}
