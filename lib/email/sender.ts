import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  attachments: Mail.Attachment[] = [],
  options: Pick<Mail.Options, "replyTo"> = {},
) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { sent: false, reason: "SMTP env vars are not configured. Report generated but not emailed." };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    text,
    attachments,
    ...options,
  });

  return { sent: true };
}
