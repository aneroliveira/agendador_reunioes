"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarInitials } from "@/components/avatar-initials";

export function ProfileForm({
  displayName,
  themeColor,
  initialAvatarImageUrl,
  initialIntroText,
  initialLinkedinUrl,
  initialWhatsappUrl,
  initialTeamsMeetingLink,
}: {
  displayName: string;
  themeColor: string;
  initialAvatarImageUrl: string | null;
  initialIntroText: string;
  initialLinkedinUrl: string;
  initialWhatsappUrl: string;
  initialTeamsMeetingLink: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState(initialAvatarImageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [introText, setIntroText] = useState(initialIntroText);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [whatsappUrl, setWhatsappUrl] = useState(initialWhatsappUrl);
  const [teamsMeetingLink, setTeamsMeetingLink] = useState(initialTeamsMeetingLink);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Uploading a photo is independent of the rest of the form's "Salvar" —
  // it happens as soon as a file is picked, no need to wait for the submit.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/profile/avatar", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao enviar imagem");
      setAvatarImageUrl(data.url);
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
      <CardContent>
        <h2 className="mb-4 text-lg font-medium">Perfil público</h2>
        <div className="mb-4 flex items-center gap-4">
          {avatarImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Vercel Blob, an external host we can't configure next/image for without extra setup.
            <img src={avatarImageUrl} alt="" className="size-14 shrink-0 rounded-full object-cover" />
          ) : (
            <AvatarInitials name={displayName} accentColor={themeColor} />
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Enviando…" : "Trocar foto"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadError && <p className="mt-1 text-sm text-destructive">{uploadError}</p>}
          </div>
        </div>
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
