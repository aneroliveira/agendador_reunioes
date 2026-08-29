"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export interface EventTypeFormValues {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  isActive: boolean;
}

// Reused for both creating a new event type (no `initial`) and editing an
// existing one (`initial` set) — the two only differ in HTTP verb/URL and
// whether the slug is shown.
export function EventTypeForm({ initial }: { initial?: EventTypeFormValues }) {
  const router = useRouter();
  const isEditing = Boolean(initial);
  const fieldId = initial?.id ?? "new";
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 30);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const url = isEditing ? `/api/admin/event-types/${initial!.id}` : "/api/admin/event-types";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, durationMinutes, isActive }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao salvar");
      setSaved(true);
      router.refresh();
      if (!isEditing) {
        setTitle("");
        setDescription("");
        setDurationMinutes(30);
        setIsActive(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor={`title-${fieldId}`}>Título</Label>
              <Input
                id={`title-${fieldId}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Chamada rápida"
                required
              />
              {isEditing && <p className="mt-1 text-xs text-muted-foreground">/book/{initial!.slug}</p>}
            </div>
            <div className="flex flex-col items-center gap-1 pt-1">
              <Label className="text-xs text-muted-foreground">Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <div>
            <Label htmlFor={`description-${fieldId}`}>Descrição (opcional)</Label>
            <Textarea
              id={`description-${fieldId}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Label htmlFor={`duration-${fieldId}`}>Duração (minutos)</Label>
            <Input
              id={`duration-${fieldId}`}
              type="number"
              min={5}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : saved ? "Salvo!" : isEditing ? "Salvar" : "Criar tipo de reunião"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
