"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface AvailabilityRuleInput {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export function AvailabilityForm({ initialRules }: { initialRules: AvailabilityRuleInput[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRule(dayOfWeek: number, patch: Partial<AvailabilityRuleInput>) {
    setSaved(false);
    setRules((prev) => prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao salvar");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-4 text-lg font-medium">Disponibilidade semanal</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {rules.map((rule) => (
            <div key={rule.dayOfWeek} className="flex items-center gap-3">
              <Switch
                checked={rule.isActive}
                onCheckedChange={(checked) => updateRule(rule.dayOfWeek, { isActive: checked })}
              />
              <span className="w-20 text-sm">{DAY_LABELS[rule.dayOfWeek]}</span>
              <input
                type="time"
                value={rule.startTime}
                disabled={!rule.isActive}
                onChange={(e) => updateRule(rule.dayOfWeek, { startTime: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
              />
              <span className="text-sm text-muted-foreground">até</span>
              <input
                type="time"
                value={rule.endTime}
                disabled={!rule.isActive}
                onChange={(e) => updateRule(rule.dayOfWeek, { endTime: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
              />
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
