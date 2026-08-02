import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import ConfirmationEmail from "@/emails/confirmation";
import ReminderEmail from "@/emails/reminder";
import CancellationEmail from "@/emails/cancellation";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface BookingEmailInfo {
  eventTitle: string;
  formattedDateTime: string;
  inviteeName: string;
  inviteeEmail: string;
  meetLink: string | null;
  cancelUrl: string;
}

async function sendMail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME ?? "Agendador"}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendConfirmationEmail(info: BookingEmailInfo) {
  const html = await render(
    ConfirmationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
    }),
  );
  await sendMail(info.inviteeEmail, `Confirmado: ${info.eventTitle}`, html);
}

export async function sendReminderEmail(info: BookingEmailInfo) {
  const html = await render(
    ReminderEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
      meetLink: info.meetLink,
      cancelUrl: info.cancelUrl,
    }),
  );
  await sendMail(info.inviteeEmail, `Lembrete: ${info.eventTitle} em breve`, html);
}

export async function sendCancellationEmail(
  info: Pick<BookingEmailInfo, "eventTitle" | "formattedDateTime" | "inviteeName" | "inviteeEmail">,
) {
  const html = await render(
    CancellationEmail({
      eventTitle: info.eventTitle,
      formattedDateTime: info.formattedDateTime,
      inviteeName: info.inviteeName,
    }),
  );
  await sendMail(info.inviteeEmail, `Cancelado: ${info.eventTitle}`, html);
}
