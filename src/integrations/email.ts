import nodemailer from "nodemailer";

import { env } from "@/config/env";

export interface InquiryNotification {
  inquiryId: string;
  name: string;
  email: string;
  countryCode?: string | null | undefined;
  whatsapp?: string | null | undefined;
  description?: string | null | undefined;
  attachmentCount: number;
}

export interface EmailNotifier {
  notifyInquiry(input: InquiryNotification): Promise<void>;
}

class DevelopmentEmailNotifier implements EmailNotifier {
  async notifyInquiry(input: InquiryNotification): Promise<void> {
    process.stdout.write(
      `[development-email] inquiry ${input.inquiryId} notification captured; PII omitted from log.\n`,
    );
  }
}

class SmtpEmailNotifier implements EmailNotifier {
  private readonly transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
  });

  async notifyInquiry(input: InquiryNotification): Promise<void> {
    if (!env.EMAIL_FROM || !env.INQUIRY_NOTIFICATION_TO) {
      throw new Error("Production inquiry notification addresses are missing.");
    }
    const lines = [
      `Inquiry ID: ${input.inquiryId}`,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Country: ${input.countryCode ?? "Not provided"}`,
      `WhatsApp: ${input.whatsapp ?? "Not provided"}`,
      `Description: ${input.description ?? "Image-only inquiry"}`,
      `Private attachments: ${input.attachmentCount}`,
      "Open CWT Operations to review private files through expiring access.",
    ];
    await this.transport.sendMail({
      from: env.EMAIL_FROM,
      to: env.INQUIRY_NOTIFICATION_TO,
      subject: `New CWT inquiry ${input.inquiryId}`,
      text: lines.join("\n"),
    });
  }
}

export function createEmailNotifier(): EmailNotifier {
  return env.EMAIL_DRIVER === "smtp"
    ? new SmtpEmailNotifier()
    : new DevelopmentEmailNotifier();
}
