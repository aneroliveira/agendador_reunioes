import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { computeSlotsForEventType } from "@/lib/scheduling";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendConfirmationEmail, sendOwnerNotificationEmail } from "@/lib/email";
import { scheduleReminder } from "@/lib/qstash";

const bodySchema = z.object({
  eventTypeSlug: z.string().min(1),
  startTimeUTC: z.iso.datetime({ offset: true }),
  inviteeName: z.string().trim().min(1).max(200),
  inviteeEmail: z.email(),
  inviteeTimezone: z.string().min(1),
  inviteeNotes: z.string().trim().max(2000).optional(),
  meetingProvider: z.enum(["GOOGLE_MEET", "TEAMS"]).optional(),
  // Honeypot: a hidden field real visitors never see or fill. Bots that
  // blindly fill every input tend to fill it, so a non-empty value here is
  // treated as spam. Optional so requests that omit it entirely still pass.
  company: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.company) {
    // Pretend success so bots don't learn to leave the honeypot alone.
    return NextResponse.json({ id: "ok", cancelToken: "", startTimeUTC: "", endTimeUTC: "" }, { status: 201 });
  }
  const { eventTypeSlug, startTimeUTC, inviteeName, inviteeEmail, inviteeTimezone, inviteeNotes, meetingProvider: requestedProvider } =
    parsed.data;

  const [owner, eventType] = await Promise.all([
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
    prisma.eventType.findUnique({
      where: { slug: eventTypeSlug },
      include: { availabilityRules: true },
    }),
  ]);

  if (!owner) {
    return NextResponse.json({ error: "Conta do dono da agenda não configurada" }, { status: 500 });
  }
  if (!eventType || !eventType.isActive) {
    return NextResponse.json({ error: "Tipo de reunião não encontrado" }, { status: 404 });
  }

  // Never trust the client's choice blindly — re-derive what's actually
  // connected and fall back sensibly if the submitted provider isn't.
  const googleAvailable = Boolean(owner.googleRefreshToken);
  const teamsAvailable = Boolean(owner.teamsMeetingLink);
  const meetingProvider: "GOOGLE_MEET" | "TEAMS" =
    requestedProvider === "TEAMS" && teamsAvailable
      ? "TEAMS"
      : requestedProvider === "GOOGLE_MEET" && googleAvailable
        ? "GOOGLE_MEET"
        : teamsAvailable && !googleAvailable
          ? "TEAMS"
          : "GOOGLE_MEET";

  const requestedStart = new Date(startTimeUTC);
  const requestedEnd = new Date(requestedStart.getTime() + eventType.durationMinutes * 60_000);

  // Re-validate against live data instead of trusting the client: recompute
  // slots for a window around the requested day and require an exact match.
  // This is what stops a booking from landing outside working hours or on
  // top of a slot someone else (or a real Google Calendar event) already has
  // (on top of the DB unique index below).
  const validSlots = await computeSlotsForEventType({
    eventType,
    owner,
    rangeFromUTC: new Date(requestedStart.getTime() - 24 * 60 * 60_000),
    rangeToUTC: new Date(requestedStart.getTime() + 24 * 60 * 60_000),
    now: new Date(),
  });

  const isValidSlot = validSlots.available.some((s) => s.startUTC.getTime() === requestedStart.getTime());
  if (!isValidSlot) {
    return NextResponse.json(
      { error: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  const activeSlotKey = `${eventType.id}_${requestedStart.toISOString()}`;

  try {
    const booking = await prisma.booking.create({
      data: {
        eventTypeId: eventType.id,
        inviteeName,
        inviteeEmail,
        inviteeTimezone,
        inviteeNotes,
        startTimeUTC: requestedStart,
        endTimeUTC: requestedEnd,
        activeSlotKey,
        meetingProvider,
      },
    });

    // The DB row above is what actually "holds" the slot; a Google Calendar
    // failure here must not undo the booking, just leave it unsynced for
    // now (calendarSyncStatus stays at its "pending_retry" value below).
    try {
      const calendarEvent = await createCalendarEvent({
        summary: `${eventType.title} com ${inviteeName}`,
        description: inviteeNotes,
        location: meetingProvider === "TEAMS" ? (owner.teamsMeetingLink ?? undefined) : undefined,
        startTimeUTC: requestedStart,
        endTimeUTC: requestedEnd,
        attendeeEmail: inviteeEmail,
        attendeeName: inviteeName,
        conferenceType: meetingProvider === "TEAMS" ? "none" : "google_meet",
      });
      const meetLink = meetingProvider === "TEAMS" ? (owner.teamsMeetingLink ?? null) : (calendarEvent?.meetLink ?? null);
      if (calendarEvent) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            googleEventId: calendarEvent.googleEventId,
            meetLink,
            calendarSyncStatus: "synced",
          },
        });
      } else if (meetingProvider === "TEAMS") {
        // Google Calendar isn't connected, but a fixed Teams link doesn't need it.
        await prisma.booking.update({ where: { id: booking.id }, data: { meetLink } });
      }
    } catch (err) {
      console.error("Falha ao criar evento no Google Calendar para a reserva", booking.id, err);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { calendarSyncStatus: "failed" },
      });
    }

    const freshBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    const formattedDateTime = DateTime.fromJSDate(requestedStart, { zone: inviteeTimezone }).toLocaleString({
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${booking.cancelToken}`;

    // Notifications are best-effort: the booking itself must not fail just
    // because Resend or QStash had a hiccup.
    try {
      await sendConfirmationEmail({
        bookingId: booking.id,
        eventTitle: eventType.title,
        formattedDateTime,
        inviteeName,
        inviteeEmail,
        meetLink: freshBooking.meetLink,
        meetingProvider: freshBooking.meetingProvider,
        cancelUrl,
        startTimeUTC: requestedStart,
        endTimeUTC: requestedEnd,
        inviteeNotes,
        eventTypeSlug: eventType.slug,
      });
    } catch (err) {
      console.error("Falha ao enviar e-mail de confirmação para a reserva", booking.id, err);
    }

    try {
      await sendOwnerNotificationEmail({
        ownerEmail: owner.email,
        eventTitle: eventType.title,
        durationMinutes: eventType.durationMinutes,
        formattedDateTime,
        inviteeName,
        inviteeEmail,
        inviteeNotes,
        meetingProvider: freshBooking.meetingProvider,
        meetLink: freshBooking.meetLink,
      });
    } catch (err) {
      console.error("Falha ao enviar e-mail de notificação ao dono para a reserva", booking.id, err);
    }

    try {
      const messageId = await scheduleReminder({ bookingId: booking.id, startTimeUTC: requestedStart });
      if (messageId) {
        await prisma.booking.update({ where: { id: booking.id }, data: { qstashMessageId: messageId } });
      }
    } catch (err) {
      console.error("Falha ao agendar lembrete no QStash para a reserva", booking.id, err);
    }

    return NextResponse.json(
      {
        id: booking.id,
        cancelToken: booking.cancelToken,
        startTimeUTC: booking.startTimeUTC.toISOString(),
        endTimeUTC: booking.endTimeUTC.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." },
        { status: 409 },
      );
    }
    throw error;
  }
}
