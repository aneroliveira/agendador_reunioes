"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrazilianHolidays } from "@/lib/holidays";

export interface HolidayItem {
  id: string;
  date: string; // "yyyy-MM-dd"
  label: string;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function HolidaysForm({ initialHolidays }: { initialHolidays: HolidayItem[] }) {
  const router = useRouter();
  const [holidays, setHolidays] = useState(initialHolidays);
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingDates = new Set(holidays.map((h) => h.date));
  const currentYear = new Date().getFullYear();
  const suggestions = [...getBrazilianHolidays(currentYear), ...getBrazilianHolidays(currentYear + 1)].filter(
    (s) => !existingDates.has(s.date),
  );

  async function addHoliday(newDate: string, newLabel: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, label: newLabel }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao adicionar");
      setHolidays((prev) => [...prev.filter((h) => h.date !== data.date), data].sort((a, b) => a.date.localeCompare(b.date)));
      setDate("");
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHoliday(id: string) {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/admin/holidays/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <h2 className="mb-4 text-lg font-medium">Feriados</h2>
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum feriado cadastrado.</p>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{formatDate(h.date)}</span>{" "}
                  <span className="text-muted-foreground">— {h.label}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${h.label}`}
                  onClick={() => removeHoliday(h.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="text-sm font-medium">Adicionar manualmente</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Motivo (ex: Recesso)"
              className="flex-1"
            />
            <Button disabled={saving || !date || !label.trim()} onClick={() => addHoliday(date, label)} className="w-fit">
              Adicionar
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-medium">Sugestões (feriados nacionais)</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s.date}
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => addHoliday(s.date, s.label)}
                >
                  {formatDate(s.date)} — {s.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
