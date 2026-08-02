"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm({
  initialIntroText,
  initialLinkedinUrl,
  initialWhatsappUrl,
  initialTeamsMeetingLink,
}: {
  initialIntroText: string;
  initialLinkedinUrl: string;
  initialWhatsappUrl: string;
  initialTeamsMeetingLink: string;
}) {
  const router = useRouter();
  const [introText, setIntroText] = useState(initialIntroText);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [whatsappUrl, setWhatsappUrl] = useState(initialWhatsappUrl);
  const [teamsMeetingLink, setTeamsMeetingLink] = useState(initialTeamsMeetingLink);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introText, linkedinUrl, whatsappUrl, teamsMeetingLink }),
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
      <CardContent className="pt-6">
        <h2 className="mb-4 text-lg font-medium">Perfil público</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="introText">Texto de introdução</Label>
            <Textarea id="introText" value={introText} onChange={(e) => setIntroText(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="linkedinUrl">LinkedIn</Label>
            <Input
              id="linkedinUrl"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <Label htmlFor="whatsappUrl">WhatsApp</Label>
            <Input
              id="whatsappUrl"
              value={whatsappUrl}
              onChange={(e) => setWhatsappUrl(e.target.value)}
              placeholder="https://wa.me/55..."
            />
          </div>
          <div>
            <Label htmlFor="teamsMeetingLink">Link do Microsoft Teams</Label>
            <Input
              id="teamsMeetingLink"
              value={teamsMeetingLink}
              onChange={(e) => setTeamsMeetingLink(e.target.value)}
              placeholder="https://teams.microsoft.com/l/meetup-join/..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
