"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Slot {
  startUTC: string;
  endUTC: string;
}

const DAYS_AHEAD = 14;

export function BookingForm({
  eventTypeSlug,
  durationMinutes,
}: {
  eventTypeSlug: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const [visitorTimezone, setVisitorTimezone] = useState("UTC");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [inviteeName, setInviteeName] = useState("");
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteeNotes, setInviteeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Reading the browser's real timezone can only happen after mount (it's
    // "UTC" during SSR); this one-time read from an external API isn't
    // rewritable as derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitorTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  async function loadAvailability() {
    setSlots(null);
    setLoadError(null);
    const from = new Date();
    const to = new Date(from.getTime() + DAYS_AHEAD * 24 * 60 * 60_000);
    try {
      const res = await fetch(
        `/api/availability?eventType=${encodeURIComponent(eventTypeSlug)}&from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      if (!res.ok) throw new Error("Falha ao carregar horários disponíveis");
      const data = await res.json();
      setSlots(data.slots);
    } catch {
      setLoadError("Não foi possível carregar os horários disponíveis. Tente recarregar a página.");
    }
  }

  useEffect(() => {
    // Data fetch on mount / when the event type changes. `loadAvailability`
    // is intentionally omitted from deps: it's redefined every render but
    // only ever needs to re-run when eventTypeSlug changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeSlug]);

  const slotsByDate = useMemo(() => {
    if (!slots) return new Map<string, Slot[]>();
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const localDate = new Date(slot.startUTC).toLocaleDateString("en-CA", { timeZone: visitorTimezone });
      const list = map.get(localDate) ?? [];
      list.push(slot);
      map.set(localDate, list);
    }
    return map;
  }, [slots, visitorTimezone]);

  const availableDates = useMemo(() => Array.from(slotsByDate.keys()).sort(), [slotsByDate]);
  // Derived instead of mirrored into state+effect: falls back to the first
  // available date until the visitor explicitly picks one.
  const effectiveSelectedDate = selectedDate ?? availableDates[0] ?? null;

  function formatDateLabel(dateStr: string) {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  }

  function formatTimeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      timeZone: visitorTimezone,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeSlug,
          startTimeUTC: selectedSlot.startUTC,
          inviteeName,
          inviteeEmail,
          inviteeTimezone: visitorTimezone,
          inviteeNotes: inviteeNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Não foi possível confirmar a reserva.");
        if (res.status === 409) {
          setSelectedSlot(null);
          loadAvailability();
        }
        return;
      }
      router.push(`/confirmation/${data.id}`);
    } catch {
      setSubmitError("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">{loadError}</CardContent>
      </Card>
    );
  }

  if (slots === null) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Carregando horários…</CardContent>
      </Card>
    );
  }

  if (availableDates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Não há horários disponíveis nos próximos {DAYS_AHEAD} dias.
        </CardContent>
      </Card>
    );
  }

  if (selectedSlot) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="mb-4 text-sm">
            <span className="font-medium">{formatTimeLabel(selectedSlot.startUTC)}</span>{" "}
            <span className="text-muted-foreground">
              ({formatDateLabel(new Date(selectedSlot.startUTC).toLocaleDateString("en-CA", { timeZone: visitorTimezone }))}
              , {durationMinutes} min, fuso {visitorTimezone})
            </span>
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" required value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" value={inviteeNotes} onChange={(e) => setInviteeNotes(e.target.value)} />
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedSlot(null)} disabled={submitting}>
                Voltar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Confirmando…" : "Confirmar reunião"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Card className="sm:w-56">
        <CardContent className="flex flex-col gap-1 pt-6">
          {availableDates.map((date) => (
            <Button
              key={date}
              variant={date === effectiveSelectedDate ? "default" : "ghost"}
              className="justify-start capitalize"
              onClick={() => setSelectedDate(date)}
            >
              {formatDateLabel(date)}
            </Button>
          ))}
        </CardContent>
      </Card>
      <Card className="flex-1">
        <CardContent className="grid grid-cols-2 gap-2 pt-6 sm:grid-cols-3">
          {(effectiveSelectedDate ? slotsByDate.get(effectiveSelectedDate) ?? [] : []).map((slot) => (
            <Button key={slot.startUTC} variant="outline" onClick={() => setSelectedSlot(slot)}>
              {formatTimeLabel(slot.startUTC)}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
