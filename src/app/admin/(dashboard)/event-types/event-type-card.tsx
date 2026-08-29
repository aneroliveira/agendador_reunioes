"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EventTypeForm, type EventTypeFormValues } from "./event-type-form";

export function EventTypeCard({ eventType }: { eventType: EventTypeFormValues }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{eventType.title}</p>
            <Badge variant="secondary">{eventType.durationMinutes} min</Badge>
            {!eventType.isActive && <Badge variant="outline">Inativo</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">/book/{eventType.slug}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Editar ${eventType.title}`} />}>
            <Pencil className="size-4" />
          </DialogTrigger>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>Editar tipo de reunião</DialogTitle>
            </DialogHeader>
            <EventTypeForm initial={eventType} onSaved={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
