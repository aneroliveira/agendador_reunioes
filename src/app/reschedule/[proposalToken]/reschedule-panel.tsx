"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProposalSummary {
  proposalStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  inviteeName: string;
  reason: string | null;
  startTimeUTC: string;
  proposedStartTimeUTC: string | null;
  eventType: { title: string; durationMinutes: number; slug: string };
}

export function ReschedulePanel({ proposalToken }: { proposalToken: string }) {
  const [proposal, setProposal] = useState<ProposalSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolvedAs, setResolvedAs] = useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/reschedule/${proposalToken}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setProposal)
      .catch(() => setLoadError("Sugestão não encontrada."));
  }, [proposalToken]);

  async function respond(action: "accept" | "decline") {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/reschedule/${proposalToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível responder.");
      setResolvedAs(data.status);
      setDialogOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível responder. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="text-sm text-destructive">{loadError}</CardContent>
      </Card>
    );
  }

  if (!proposal) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">Carregando…</CardContent>
      </Card>
    );
  }

  const finalStatus = resolvedAs ?? (proposal.proposalStatus !== "PENDING" ? proposal.proposalStatus : null);
  if (finalStatus) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">
            {finalStatus === "ACCEPTED" ? "Novo horário confirmado!" : "Sugestão recusada"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {finalStatus === "ACCEPTED"
              ? "Você vai receber um novo e-mail de confirmação com os detalhes."
              : "A reunião foi cancelada. Combine outro horário diretamente."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const originalFormatted = new Date(proposal.startTimeUTC).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const proposedFormatted = proposal.proposedStartTimeUTC
    ? new Date(proposal.proposedStartTimeUTC).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })
    : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Nova sugestão de horário</h1>
        <p className="text-base font-medium">{proposal.eventType.title}</p>
        {proposal.reason && <p className="text-sm text-muted-foreground">{proposal.reason}</p>}
        <p className="text-sm text-muted-foreground line-through">Antes: {originalFormatted}</p>
        <p className="text-sm font-medium">Novo horário: {proposedFormatted}</p>
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button disabled={submitting} onClick={() => respond("accept")} className="w-fit">
            {submitting ? "Confirmando…" : "Aceitar novo horário"}
          </Button>
          <AlertDialog open={dialogOpen} onOpenChange={(open) => (!submitting ? setDialogOpen(open) : null)}>
            <AlertDialogTrigger render={<Button variant="outline" className="w-fit" />}>Recusar</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Recusar esse horário?</AlertDialogTitle>
                <AlertDialogDescription>
                  A reunião será cancelada e não reagendada automaticamente. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {actionError && <p className="text-sm text-destructive">{actionError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => respond("decline")} disabled={submitting}>
                  {submitting ? "Enviando…" : "Sim, recusar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
