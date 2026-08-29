"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getReadableForeground } from "@/lib/color";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function AppearanceForm({ initialThemeColor }: { initialThemeColor: string }) {
  const router = useRouter();
  const [themeColor, setThemeColor] = useState(initialThemeColor);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidHex = HEX_PATTERN.test(themeColor);
  const previewForeground = getReadableForeground(isValidHex ? themeColor : initialThemeColor);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidHex) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <h2 className="mb-4 text-lg font-medium">Aparência</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="themeColor">Cor de destaque</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="themeColor"
                type="color"
                value={isValidHex ? themeColor : initialThemeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border"
              />
              <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-32" />
            </div>
            {!isValidHex && <p className="mt-1 text-sm text-destructive">Informe uma cor hex válida, ex: #c4677a</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Prévia:</span>
            <Button
              type="button"
              style={{ backgroundColor: themeColor, color: previewForeground }}
              className="pointer-events-none"
            >
              Confirmar reunião
            </Button>
            <Badge style={{ backgroundColor: themeColor, color: previewForeground }} className="pointer-events-none">
              Confirmada
            </Badge>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving || !isValidHex} className="w-fit">
            {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
