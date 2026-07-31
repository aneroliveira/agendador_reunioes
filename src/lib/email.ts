import { Resend } from "resend";
import ConfirmationEmail from "@/emails/confirmation";
import ReminderEmail from "@/emails/reminder";
import CancellationEmail from "@/emails/cancellation";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface BookingEmailInfo {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  inviteeEmail: string;
  meetLink: string | null;
  cancelUrl: string;
}

export async function sendConfirmationEmail(info: BookingEmailInfo) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: info.inviteeEmail,
    subject: `Confirmado: ${info.eventTitle}`,
    react: ConfirmationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
    }),
  });
}

export async function sendReminderEmail(info: BookingEmailInfo) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: info.inviteeEmail,
    subject: `Lembrete: ${info.eventTitle} em breve`,
    react: ReminderEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
    }),
  });
}

export async function sendCancellationEmail(
  info: Pick<BookingEmailInfo, "eventTitle" | "formattedDateTime" | "inviteeName" | "inviteeEmail">,
) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: info.inviteeEmail,
    subject: `Cancelado: ${info.eventTitle}`,
    react: CancellationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
    }),
  });
}
