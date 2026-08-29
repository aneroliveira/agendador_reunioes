import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DateTime } from "luxon";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { computeSlotsForEventType } from "@/lib/scheduling";
import { sendRescheduleProposalEmail } from "@/lib/email";

const bodySchema = z.object({
  proposedStartTimeUTC: z.iso.datetime({ offset: true }),
  reason: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const [owner, booking] = await Promise.all([
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
    prisma.booking.findUnique({
      where: { id },
      include: { eventType: { include: { availabilityRules: true } } },
    }),
  ]);

  if (!owner) {
    return NextResponse.json({ error: "Conta do dono da agenda não configurada" }, { status: 500 });
  }
  if (!booking || booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Reserva não encontrada ou já cancelada" }, { status: 404 });
  }

  const proposedStart = new Date(parsed.data.proposedStartTimeUTC);
  const proposedEnd = new Date(proposedStart.getTime() + booking.eventType.durationMinutes * 60_000);

  // Never trust the client's chosen slot blindly — same re-validation the
  // public booking-creation route does against live availability.
  const validSlots = await computeSlotsForEventType({
    eventType: booking.eventType,
    owner,
    rangeFromUTC: new Date(proposedStart.getTime() - 24 * 60 * 60_000),
    rangeToUTC: new Date(proposedStart.getTime() + 24 * 60 * 60_000),
    now: new Date(),
  });
  const isValidSlot = validSlots.available.some((s) => s.startUTC.getTime() === proposedStart.getTime());
  if (!isValidSlot) {
    return NextResponse.json({ error: "Esse horário não está disponível. Escolha outro." }, { status: 409 });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      proposalStatus: "PENDING",
      proposedStartTimeUTC: proposedStart,
      proposedEndTimeUTC: proposedEnd,
      proposalReason: parsed.data.reason,
      proposalToken: crypto.randomUUID(),
      proposalRespondedAt: null,
    },
  });

  try {
    const originalFormattedDateTime = DateTime.fromJSDate(booking.startTimeUTC, { zone: booking.inviteeTimezone }).toLocaleString({
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const proposedFormattedDateTime = DateTime.fromJSDate(proposedStart, { zone: booking.inviteeTimezone }).toLocaleString({
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendRescheduleProposalEmail({
      inviteeEmail: booking.inviteeEmail,
      inviteeName: booking.inviteeName,
      eventTitle: booking.eventType.title,
      reason: parsed.data.reason,
      originalFormattedDateTime,
      proposedFormattedDateTime,
      respondUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reschedule/${updated.proposalToken}`,
    });
  } catch (err) {
    console.error("Falha ao enviar e-mail de sugestão de horário para a reserva", booking.id, err);
  }

  return NextResponse.json({ ok: true });
}
