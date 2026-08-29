import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { computeSlotsForEventType } from "@/lib/scheduling";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendConfirmationEmail, sendCancellationEmail, sendRescheduleDeclinedEmail } from "@/lib/email";
import { cancelReminder, scheduleReminder } from "@/lib/qstash";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ proposalToken: string }> }) {
  const { proposalToken } = await params;

  const booking = await prisma.booking.findUnique({
    where: { proposalToken },
    include: { eventType: { select: { title: true, durationMinutes: true, slug: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    proposalStatus: booking.proposalStatus,
    inviteeName: booking.inviteeName,
    reason: booking.proposalReason,
    startTimeUTC: booking.startTimeUTC.toISOString(),
    proposedStartTimeUTC: booking.proposedStartTimeUTC?.toISOString() ?? null,
    eventType: booking.eventType,
  });
}

const bodySchema = z.object({ action: z.enum(["accept", "decline"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ proposalToken: string }> }) {
  const { proposalToken } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const [owner, booking] = await Promise.all([
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
    prisma.booking.findUnique({
      where: { proposalToken },
      include: { eventType: { include: { availabilityRules: true } } },
    }),
  ]);

  if (!owner) {
    return NextResponse.json({ error: "Conta do dono da agenda não configurada" }, { status: 500 });
  }
  if (!booking || booking.proposalStatus !== "PENDING" || !booking.proposedStartTimeUTC || !booking.proposedEndTimeUTC) {
    return NextResponse.json({ error: "Essa sugestão já foi respondida ou não existe mais" }, { status: 404 });
  }

  if (parsed.data.action === "accept") {
    // Re-validate against live availability instead of trusting the stored
    // proposal blindly — someone else could have taken that exact slot
    // meanwhile (the proposed time isn't held preventively, only the
    // original booking's own slot is).
    const validSlots = await computeSlotsForEventType({
      eventType: booking.eventType,
      owner,
      rangeFromUTC: new Date(booking.proposedStartTimeUTC.getTime() - 24 * 60 * 60_000),
      rangeToUTC: new Date(booking.proposedStartTimeUTC.getTime() + 24 * 60 * 60_000),
      now: new Date(),
    });
    const isValidSlot = validSlots.available.some(
      (s) => s.startUTC.getTime() === booking.proposedStartTimeUTC!.getTime(),
    );
    if (!isValidSlot) {
      return NextResponse.json(
        { error: "Esse horário não está mais disponível. Entre em contato para combinar outro." },
        { status: 409 },
      );
    }

    const newActiveSlotKey = `${booking.eventTypeId}_${booking.proposedStartTimeUTC.toISOString()}`;
    const oldActiveSlotKey = `${booking.eventTypeId}_${booking.startTimeUTC.toISOString()}`;
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          startTimeUTC: booking.proposedStartTimeUTC,
          endTimeUTC: booking.proposedEndTimeUTC,
          activeSlotKey: newActiveSlotKey,
          proposalStatus: "ACCEPTED",
          proposalRespondedAt: new Date(),
        },
      }),
      // The owner rescheduled away from this slot for her own reasons
      // (usually a conflict on her end, not the invitee's) — it never
      // re-opens for a new booking, even though the meeting itself moved.
      prisma.booking.create({
        data: {
          eventTypeId: booking.eventTypeId,
          inviteeName: booking.inviteeName,
          inviteeEmail: booking.inviteeEmail,
          inviteeTimezone: booking.inviteeTimezone,
          startTimeUTC: booking.startTimeUTC,
          endTimeUTC: booking.endTimeUTC,
          status: "BLOCKED",
          activeSlotKey: oldActiveSlotKey,
        },
      }),
    ]);

    if (booking.googleEventId) {
      try {
        await updateCalendarEvent({
          googleEventId: booking.googleEventId,
          startTimeUTC: booking.proposedStartTimeUTC,
          endTimeUTC: booking.proposedEndTimeUTC,
        });
      } catch (err) {
        console.error("Falha ao mover evento do Google Calendar para a reserva", booking.id, err);
      }
    }

    if (booking.qstashMessageId) {
      await cancelReminder(booking.qstashMessageId);
    }
    try {
      const messageId = await scheduleReminder({ bookingId: booking.id, startTimeUTC: booking.proposedStartTimeUTC });
      if (messageId) {
        await prisma.booking.update({ where: { id: booking.id }, data: { qstashMessageId: messageId } });
      }
    } catch (err) {
      console.error("Falha ao reagendar lembrete no QStash para a reserva", booking.id, err);
    }

    try {
      const formattedDateTime = DateTime.fromJSDate(booking.proposedStartTimeUTC, { zone: booking.inviteeTimezone }).toLocaleString({
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      await sendConfirmationEmail({
        bookingId: booking.id,
        eventTitle: booking.eventType.title,
        formattedDateTime,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        meetLink: booking.meetLink,
        meetingProvider: booking.meetingProvider,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${booking.cancelToken}`,
        startTimeUTC: booking.proposedStartTimeUTC,
        endTimeUTC: booking.proposedEndTimeUTC,
        inviteeNotes: booking.inviteeNotes,
        eventTypeSlug: booking.eventType.slug,
      });
    } catch (err) {
      console.error("Falha ao reenviar e-mail de confirmação para a reserva", booking.id, err);
    }

    return NextResponse.json({ ok: true, status: "ACCEPTED" });
  }

  // decline: neither the original nor the proposed time will happen, so the
  // booking is fully cancelled — the owner needs to know to follow up
  // herself, otherwise the decline button would be a dead end for her.
  // The original slot still never re-opens (same reasoning as accept).
  const oldActiveSlotKey = `${booking.eventTypeId}_${booking.startTimeUTC.toISOString()}`;
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        activeSlotKey: null,
        proposalStatus: "DECLINED",
        proposalRespondedAt: new Date(),
      },
    }),
    prisma.booking.create({
      data: {
        eventTypeId: booking.eventTypeId,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        inviteeTimezone: booking.inviteeTimezone,
        startTimeUTC: booking.startTimeUTC,
        endTimeUTC: booking.endTimeUTC,
        status: "BLOCKED",
        activeSlotKey: oldActiveSlotKey,
      },
    }),
  ]);

  if (booking.googleEventId) {
    try {
      await deleteCalendarEvent(booking.googleEventId);
    } catch (err) {
      console.error("Falha ao remover evento do Google Calendar para a reserva", booking.id, err);
    }
  }
  if (booking.qstashMessageId) {
    await cancelReminder(booking.qstashMessageId);
  }

  try {
    const formattedDateTime = DateTime.fromJSDate(booking.startTimeUTC, { zone: booking.inviteeTimezone }).toLocaleString({
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendCancellationEmail({
      bookingId: booking.id,
      eventTitle: booking.eventType.title,
      formattedDateTime,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      startTimeUTC: booking.startTimeUTC,
      endTimeUTC: booking.endTimeUTC,
      eventTypeSlug: booking.eventType.slug,
      meetLink: booking.meetLink,
    });
  } catch (err) {
    console.error("Falha ao enviar e-mail de cancelamento para a reserva", booking.id, err);
  }

  try {
    const proposedFormattedDateTime = DateTime.fromJSDate(booking.proposedStartTimeUTC, { zone: booking.inviteeTimezone }).toLocaleString({
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendRescheduleDeclinedEmail({
      ownerEmail: owner.email,
      eventTitle: booking.eventType.title,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      proposedFormattedDateTime,
    });
  } catch (err) {
    console.error("Falha ao enviar e-mail de recusa pro dono para a reserva", booking.id, err);
  }

  return NextResponse.json({ ok: true, status: "DECLINED" });
}
