import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import ConfirmationEmail from "@/emails/confirmation";
import ReminderEmail from "@/emails/reminder";
import CancellationEmail from "@/emails/cancellation";
import OwnerNotificationEmail from "@/emails/owner-notification";
import RescheduleProposalEmail from "@/emails/reschedule-proposal";
import RescheduleDeclinedEmail from "@/emails/reschedule-declined-owner";
import { prisma } from "./db";
import { buildInviteIcs } from "./ics";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface BookingEmailInfo {
  bookingId: string;
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  inviteeEmail: string;
  meetLink: string | null;
  cancelUrl: string;
  startTimeUTC: Date;
  endTimeUTC: Date;
  eventTypeSlug: string;
  inviteeNotes?: string | null;
  meetingProvider?: "GOOGLE_MEET" | "TEAMS";
}

interface Attachment {
  filename: string;
  content: string;
  contentType: string;
}

async function sendMail(to: string, subject: string, html: string, attachments: Attachment[] = []) {
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME ?? "Agendador"}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
}

async function getAccentColor(): Promise<string> {
  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 }, select: { themeColor: true } });
  return owner?.themeColor ?? "#c4677a";
}

function buildIcsAttachment(
  info: Pick<BookingEmailInfo, "bookingId" | "eventTitle" | "startTimeUTC" | "endTimeUTC" | "inviteeEmail" | "inviteeName" | "meetLink">,
  options: { method: "PUBLISH" | "CANCEL"; status: "CONFIRMED" | "CANCELLED"; sequence: number },
): Attachment {
  // Same UID across confirmation/reminder (PUBLISH) and cancellation (CANCEL)
  // is what lets a calendar client match the CANCEL to the original invite.
  const ics = buildInviteIcs({
    uid: `${info.bookingId}@agendador-reunioes`,
    method: options.method,
    status: options.status,
    sequence: options.sequence,
    summary: info.eventTitle,
    location: info.meetLink ?? undefined,
    startUTC: info.startTimeUTC,
    endUTC: info.endTimeUTC,
    organizerEmail: process.env.GMAIL_USER ?? "",
    organizerName: process.env.EMAIL_FROM_NAME ?? "Agendador",
    attendeeEmail: info.inviteeEmail,
    attendeeName: info.inviteeName,
  });
  return {
    filename: "convite.ics",
    content: ics,
    contentType: `text/calendar; method=${options.method}; charset=UTF-8`,
  };
}

export async function sendConfirmationEmail(info: BookingEmailInfo) {
  const accentColor = await getAccentColor();
  const html = await render(
    ConfirmationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
      startTimeUTC: info.startTimeUTC,
      endTimeUTC: info.endTimeUTC,
      inviteeNotes: info.inviteeNotes,
      meetingProvider: info.meetingProvider,
      accentColor,
    }),
  );
  const attachment = buildIcsAttachment(info, { method: "PUBLISH", status: "CONFIRMED", sequence: 0 });
  await sendMail(info.inviteeEmail, `Confirmado: ${info.eventTitle}`, html, [attachment]);
}

export async function sendReminderEmail(info: BookingEmailInfo) {
  const accentColor = await getAccentColor();
  const html = await render(
    ReminderEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
      startTimeUTC: info.startTimeUTC,
      endTimeUTC: info.endTimeUTC,
      inviteeNotes: info.inviteeNotes,
      meetingProvider: info.meetingProvider,
      accentColor,
    }),
  );
  const attachment = buildIcsAttachment(info, { method: "PUBLISH", status: "CONFIRMED", sequence: 0 });
  await sendMail(info.inviteeEmail, `Lembrete: ${info.eventTitle} em breve`, html, [attachment]);
}

export async function sendCancellationEmail(
  info: Pick<
    BookingEmailInfo,
    "bookingId" | "eventTitle" | "formattedDateTime" | "inviteeName" | "inviteeEmail" | "startTimeUTC" | "endTimeUTC" | "eventTypeSlug" | "meetLink"
  >,
) {
  const accentColor = await getAccentColor();
  const bookAgainUrl = `${process.env.NEXT_PUBLIC_APP_URL}/book/${info.eventTypeSlug}`;
  const html = await render(
    CancellationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      bookAgainUrl,
      accentColor,
    }),
  );
  const attachment = buildIcsAttachment(info, { method: "CANCEL", status: "CANCELLED", sequence: 1 });
  await sendMail(info.inviteeEmail, `Cancelado: ${info.eventTitle}`, html, [attachment]);
}

export async function sendOwnerNotificationEmail(
  info: Pick<
    BookingEmailInfo,
    "eventTitle" | "formattedDateTime" | "inviteeName" | "inviteeEmail" | "inviteeNotes" | "meetingProvider" | "meetLink"
  > & {
    ownerEmail: string;
    durationMinutes: number;
  },
) {
  const accentColor = await getAccentColor();
  const html = await render(
    OwnerNotificationEmail({
      eventTitle: info.eventTitle,
      durationMinutes: info.durationMinutes,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      inviteeEmail: info.inviteeEmail,
      inviteeNotes: info.inviteeNotes,
      meetingProvider: info.meetingProvider,
      meetLink: info.meetLink,
      accentColor,
    }),
  );
  await sendMail(info.ownerEmail, `Nova reunião: ${info.inviteeName}`, html);
}

export async function sendRescheduleProposalEmail(info: {
  inviteeEmail: string;
  inviteeName: string;
  eventTitle: string;
  reason: string;
  originalFormattedDateTime: string;
  proposedFormattedDateTime: string;
  respondUrl: string;
}) {
  const accentColor = await getAccentColor();
  const html = await render(
    RescheduleProposalEmail({
      eventTitle: info.eventTitle,
      inviteeName: info.inviteeName,
      reason: info.reason,
      originalFormattedDateTime: info.originalFormattedDateTime,
      proposedFormattedDateTime: info.proposedFormattedDateTime,
      respondUrl: info.respondUrl,
      accentColor,
    }),
  );
  await sendMail(info.inviteeEmail, `Nova sugestão de horário: ${info.eventTitle}`, html);
}

export async function sendRescheduleDeclinedEmail(info: {
  ownerEmail: string;
  eventTitle: string;
  inviteeName: string;
  inviteeEmail: string;
  proposedFormattedDateTime: string;
}) {
  const accentColor = await getAccentColor();
  const html = await render(
    RescheduleDeclinedEmail({
      eventTitle: info.eventTitle,
      inviteeName: info.inviteeName,
      inviteeEmail: info.inviteeEmail,
      proposedFormattedDateTime: info.proposedFormattedDateTime,
      accentColor,
    }),
  );
  await sendMail(info.ownerEmail, `${info.inviteeName} recusou o novo horário`, html);
}
