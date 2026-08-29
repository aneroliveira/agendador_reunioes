"use client";

import { EventTypeForm, type EventTypeFormValues } from "./event-type-form";

export function EventTypeList({ eventTypes }: { eventTypes: EventTypeFormValues[] }) {
  return (
    <div className="flex flex-col gap-4">
      {eventTypes.map((eventType) => (
        <EventTypeForm key={eventType.id} initial={eventType} />
      ))}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Novo tipo de reunião</h2>
        <EventTypeForm />
      </div>
    </div>
  );
}
