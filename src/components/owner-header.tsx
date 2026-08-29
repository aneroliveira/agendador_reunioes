import Link from "next/link";
import { Settings } from "lucide-react";
import { AvatarInitials } from "@/components/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OwnerAccount } from "@/generated/prisma/client";

export function OwnerHeader({
  owner,
}: {
  owner: Pick<OwnerAccount, "displayName" | "themeColor" | "introText" | "linkedinUrl" | "whatsappUrl">;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <AvatarInitials name={owner.displayName} accentColor={owner.themeColor} />
        <div>
          <h2 className="text-lg font-semibold">{owner.displayName}</h2>
          {owner.introText && <p className="text-sm text-muted-foreground">{owner.introText}</p>}
          {(owner.linkedinUrl || owner.whatsappUrl) && (
            <div className="mt-1 flex gap-2">
              {owner.linkedinUrl && (
                <Badge
                  variant="outline"
                  render={<a href={owner.linkedinUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  LinkedIn
                </Badge>
              )}
              {owner.whatsappUrl && (
                <Badge
                  variant="outline"
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
