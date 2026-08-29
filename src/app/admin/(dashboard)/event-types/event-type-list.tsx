"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EventTypeForm, type EventTypeFormValues } from "./event-type-form";
import { EventTypeCard } from "./event-type-card";

const TITLE_PLACEHOLDERS = [
  "ex: Bate-papo Rápido",
  "ex: Mentoria",
  "ex: Follow-up",
  "ex: Alinhamento Semanal",
];
const DESCRIPTION_PLACEHOLDER = "ex: Uma conversa objetiva, direto ao ponto.";

export function EventTypeList({ eventTypes }: { eventTypes: EventTypeFormValues[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  // Picked once per mount, not per render, so it doesn't shuffle while typing.
  const [titlePlaceholder] = useState(
    () => TITLE_PLACEHOLDERS[Math.floor(Math.random() * TITLE_PLACEHOLDERS.length)],
  );

  return (
    <div className="flex flex-col gap-3">
      {eventTypes.map((eventType) => (
        <EventTypeCard key={eventType.id} eventType={eventType} />
      ))}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger render={<Button variant="outline" className="w-fit" />}>
          <Plus data-icon="inline-start" className="size-4" />
          Novo tipo de reunião
        </DialogTrigger>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Novo tipo de reunião</DialogTitle>
          </DialogHeader>
          <EventTypeForm
            titlePlaceholder={titlePlaceholder}
            descriptionPlaceholder={DESCRIPTION_PLACEHOLDER}
            onSaved={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
