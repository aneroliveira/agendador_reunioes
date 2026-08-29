import Link from "next/link";
import { Settings } from "lucide-react";
import { AvatarInitials } from "@/components/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OwnerAccount } from "@/generated/prisma/client";

export function OwnerHeader({
  owner,
}: {
  owner: Pick<
    OwnerAccount,
    "displayName" | "themeColor" | "introText" | "linkedinUrl" | "whatsappUrl" | "avatarImageUrl"
  >;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        {owner.avatarImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Vercel Blob, an external host we can't configure next/image for without extra setup.
          <img src={owner.avatarImageUrl} alt="" className="size-14 shrink-0 rounded-full object-cover" />
        ) : (
          <AvatarInitials name={owner.displayName} accentColor={owner.themeColor} />
        )}
        <div>
          <h2 className="text-lg font-semibold">{owner.displayName}</h2>
          {owner.introText && <p className="text-sm text-muted-foreground">{owner.introText}</p>}
          {(owner.linkedinUrl || owner.whatsappUrl) && (
            <div className="mt-1 flex gap-2">
              {owner.linkedinUrl && (
                <Badge
                  variant="outline"
                  className="border-sky-200 bg-sky-100 text-sky-800"
                  render={<a href={owner.linkedinUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  LinkedIn
                </Badge>
              )}
              {owner.whatsappUrl && (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-100 text-emerald-800"
                  render={<a href={owner.whatsappUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  WhatsApp
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground"
        aria-label="Área administrativa"
        render={<Link href="/admin" />}
      >
        <Settings className="size-4" />
      </Button>
    </div>
  );
}
