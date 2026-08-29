"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToastManager } from "@/components/ui/toast";

interface Slot {
  startUTC: string;
  endUTC: string;
}

interface DaySlot extends Slot {
  available: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Builds the pt-BR weekday header (dom, seg, ter, ...) without depending on any specific calendar year. */
function buildWeekdayLabels(): string[] {
  const today = new Date();
  const mostRecentSunday = new Date(today);
  mostRecentSunday.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mostRecentSunday);
    d.setDate(mostRecentSunday.getDate() + i);
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(/\.$/, "").toUpperCase();
  });
}

const WEEKDAY_LABELS = buildWeekdayLabels();

export function BookingForm({
  eventTypeSlug,
  eventTitle,
  eventDescription,
  durationMinutes,
  bookingHorizonDays,
  availableProviders,
}: {
  eventTypeSlug: string;
  eventTitle: string;
  eventDescription: string | null;
  durationMinutes: number;
  bookingHorizonDays: number;
  availableProviders: { googleMeet: boolean; teams: boolean };
}) {
  const router = useRouter();
  const toastManager = useToastManager();
  const [visitorTimezone, setVisitorTimezone] = useState("UTC");

  const today = useMemo(() => new Date(), []);
  const [visibleYear, setVisibleYear] = useState(today.getFullYear());
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(today.getMonth());

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [unavailableSlots, setUnavailableSlots] = useState<Slot[]>([]);
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  // Below the lg breakpoint, the calendar/time grid stacks above the form —
  // once a slot is picked it collapses out of the way instead of forcing a
  // long scroll past the whole grid to reach the form. At lg+ it stays
  // visible regardless (see the `lg:contents`/`lg:flex` overrides below).
  const [mobilePickerOpen, setMobilePickerOpen] = useState(true);

  const bothProvidersAvailable = availableProviders.googleMeet && availableProviders.teams;
  const [meetingProvider, setMeetingProvider] = useState<"GOOGLE_MEET" | "TEAMS">(
    availableProviders.googleMeet ? "GOOGLE_MEET" : "TEAMS",
  );

  const [inviteeName, setInviteeName] = useState("");
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteeNotes, setInviteeNotes] = useState("");
  const [company, setCompany] = useState(""); // honeypot — must stay empty
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Reading the browser's real timezone can only happen after mount (it's
    // "UTC" during SSR); this one-time read from an external API isn't
    // rewritable as derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitorTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const minMonth = today.getFullYear() * 12 + today.getMonth();
  const horizonDate = new Date(today.getTime() + bookingHorizonDays * 24 * 60 * 60_000);
  const maxMonth = horizonDate.getFullYear() * 12 + horizonDate.getMonth();
  const currentMonth = visibleYear * 12 + visibleMonthIndex;

  function goToMonth(deltaMonths: number) {
    const target = new Date(visibleYear, visibleMonthIndex + deltaMonths, 1);
    setVisibleYear(target.getFullYear());
    setVisibleMonthIndex(target.getMonth());
    setSelectedDate(null);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadAvailability() {
      setSlots(null);
      setUnavailableSlots([]);
      setHolidays(new Map());
      setLoadError(null);
      const monthStart = new Date(visibleYear, visibleMonthIndex, 1);
      const monthEnd = new Date(visibleYear, visibleMonthIndex + 1, 1);
      const from = new Date(monthStart.getTime() - 24 * 60 * 60_000);
      const to = new Date(monthEnd.getTime() + 24 * 60 * 60_000);
      try {
        const res = await fetch(
          `/api/availability?eventType=${encodeURIComponent(eventTypeSlug)}&from=${from.toISOString()}&to=${to.toISOString()}`,
        );
        if (!res.ok) throw new Error("Falha ao carregar horários disponíveis");
        const data = await res.json();
        if (!cancelled) {
          setSlots(data.slots);
          setUnavailableSlots(data.unavailableSlots ?? []);
          setHolidays(new Map((data.holidays ?? []).map((h: { date: string; label: string }) => [h.date, h.label])));
        }
      } catch {
        if (!cancelled) setLoadError("Não foi possível carregar os horários disponíveis. Tente recarregar a página.");
      }
    }
    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [eventTypeSlug, visibleYear, visibleMonthIndex]);

  const slotsByDate = useMemo(() => {
    if (!slots) return new Map<string, DaySlot[]>();
    const map = new Map<string, DaySlot[]>();
    const add = (slot: Slot, available: boolean) => {
      const localDate = new Date(slot.startUTC).toLocaleDateString("en-CA", { timeZone: visitorTimezone });
      const list = map.get(localDate) ?? [];
      list.push({ ...slot, available });
      map.set(localDate, list);
    };
    for (const slot of slots) add(slot, true);
    for (const slot of unavailableSlots) add(slot, false);
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startUTC).getTime() - new Date(b.startUTC).getTime());
    }
    return map;
  }, [slots, unavailableSlots, visitorTimezone]);

  // Days with at least one bookable slot — used to pick a sensible default
  // day. Days that only have taken (unavailable) slots aren't good defaults,
  // but are still selectable directly from the day grid.
  const availableDates = useMemo(
    () => Array.from(slotsByDate.entries())
      .filter(([, daySlots]) => daySlots.some((s) => s.available))
      .map(([date]) => date)
      .sort(),
    [slotsByDate],
  );
  const anyDates = useMemo(() => Array.from(slotsByDate.keys()).sort(), [slotsByDate]);
  // Derived instead of mirrored into state+effect: falls back to the first
  // available date until the visitor explicitly picks one.
  const effectiveSelectedDate = selectedDate ?? availableDates[0] ?? anyDates[0] ?? null;

  function selectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setMobilePickerOpen(false);
  }

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
          meetingProvider: bothProvidersAvailable ? meetingProvider : undefined,
          company,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Não foi possível confirmar a reserva.");
        if (res.status === 409) {
          setSelectedSlot(null);
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

  const daysInMonth = new Date(visibleYear, visibleMonthIndex + 1, 0).getDate();
  const firstWeekday = new Date(visibleYear, visibleMonthIndex, 1).getDay();
  // Month name + year only, no "de" connector (Intl's combined month+year
  // format would produce "agosto de 2026") — built from separate parts instead.
  const rawMonthName = new Date(visibleYear, visibleMonthIndex, 1).toLocaleDateString("pt-BR", { month: "long" });
  const monthLabel = `${rawMonthName.charAt(0).toUpperCase()}${rawMonthName.slice(1)} ${visibleYear}`;
  const dayCells: Array<{ day: number; dateStr: string } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, dateStr: `${visibleYear}-${pad(visibleMonthIndex + 1)}-${pad(day)}` };
    }),
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-primary">{eventTitle}</h1>
            {eventDescription && <p className="mt-1 text-sm text-muted-foreground">{eventDescription}</p>}
            <Badge variant="secondary" className="mt-2 w-fit">
              <Clock data-icon="inline-start" className="size-3" />
              {durationMinutes} minutos
            </Badge>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">Fuso horário: {visitorTimezone}</p>
        </div>

        {loadError && <p className="text-sm text-destructive">{loadError}</p>}

        {!loadError && (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div
              className={
                selectedSlot && !mobilePickerOpen ? "hidden lg:contents" : "flex flex-col gap-4 lg:contents"
              }
            >
            <div className="sm:w-64">
              <div className="mb-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={currentMonth <= minMonth || submitting}
                  onClick={() => goToMonth(-1)}
                  aria-label="Mês anterior"
                >
                  ‹
                </Button>
                <span className="text-sm font-medium">{monthLabel}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={currentMonth >= maxMonth || submitting}
                  onClick={() => goToMonth(1)}
                  aria-label="Próximo mês"
                >
                  ›
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
                {slots === null
                  ? Array.from({ length: firstWeekday + daysInMonth }, (_, i) => <div key={i} />)
                  : dayCells.map((cell, i) => {
                      if (!cell) return <div key={i} />;
                      const holidayLabel = holidays.get(cell.dateStr);
                      const hasSlots = slotsByDate.has(cell.dateStr);
                      const isSelected = cell.dateStr === effectiveSelectedDate;

                      if (holidayLabel) {
                        // Not `disabled`: a disabled button won't reliably fire
                        // click/touch, and the reason needs to reach mobile too
                        // (as a toast) where there's no hover for the tooltip.
                        return (
                          <Tooltip key={cell.dateStr}>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="w-full text-muted-foreground line-through"
                                  onClick={() => toastManager.add({ title: holidayLabel })}
                                />
                              }
                            >
                              {cell.day}
                            </TooltipTrigger>
                            <TooltipContent>{holidayLabel}</TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <Button
                          key={cell.dateStr}
                          type="button"
                          variant={isSelected ? "default" : hasSlots ? "outline" : "ghost"}
                          size="icon-sm"
                          disabled={!hasSlots || submitting}
                          onClick={() => setSelectedDate(cell.dateStr)}
                          className="w-full"
                        >
                          {cell.day}
                        </Button>
                      );
                    })}
              </div>
            </div>

            <div className="flex-1">
              {slots === null ? (
                <p className="text-sm text-muted-foreground">Carregando horários…</p>
              ) : anyDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum horário em {monthLabel}. Use as setas para ver outro mês.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(effectiveSelectedDate ? slotsByDate.get(effectiveSelectedDate) ?? [] : []).map((slot) => (
                    <Button
                      key={slot.startUTC}
                      type="button"
                      variant={
                        !slot.available ? "ghost" : selectedSlot?.startUTC === slot.startUTC ? "default" : "outline"
                      }
                      disabled={submitting || !slot.available}
                      title={slot.available ? undefined : "Já ocupado"}
                      className={!slot.available ? "text-muted-foreground line-through" : undefined}
                      onClick={() => selectSlot(slot)}
                    >
                      {formatTimeLabel(slot.startUTC)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            </div>

            {selectedSlot && (
              <div
                key={selectedSlot.startUTC}
                className="animate-in fade-in slide-in-from-right-2 duration-300 lg:w-72 lg:border-l lg:pl-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Agendamento</p>
                    <p className="text-sm font-medium">
                      {formatDateLabel(new Date(selectedSlot.startUTC).toLocaleDateString("en-CA", { timeZone: visitorTimezone }))}{" "}
                      às {formatTimeLabel(selectedSlot.startUTC)}
                    </p>
                  </div>
                  {!mobilePickerOpen && (
                    <button
                      type="button"
                      onClick={() => setMobilePickerOpen(true)}
                      className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 lg:hidden"
                    >
                      Trocar horário
                    </button>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Honeypot: hidden from real visitors, tempting for bots that fill every field. */}
                  <div className="absolute left-[-9999px]" aria-hidden="true">
                    <label htmlFor="company">Empresa</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
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
                  {bothProvidersAvailable && (
                    <div role="radiogroup" aria-label="Videochamada">
                      <Label>Videochamada</Label>
                      <div className="mt-1 flex gap-2">
                        <Button
                          type="button"
                          role="radio"
                          aria-checked={meetingProvider === "GOOGLE_MEET"}
                          variant={meetingProvider === "GOOGLE_MEET" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setMeetingProvider("GOOGLE_MEET")}
                        >
                          <Video data-icon="inline-start" className="size-4" />
                          Google Meet
                        </Button>
                        <Button
                          type="button"
                          role="radio"
                          aria-checked={meetingProvider === "TEAMS"}
                          variant={meetingProvider === "TEAMS" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setMeetingProvider("TEAMS")}
                        >
                          <Users data-icon="inline-start" className="size-4" />
                          Microsoft Teams
                        </Button>
                      </div>
                    </div>
                  )}
                  {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Confirmando…" : "Confirmar reunião"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
