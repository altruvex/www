import nodemailer from "nodemailer";

export type EmailTransport = "resend" | "smtp" | "none";

export function emailTransport(): EmailTransport {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) return "smtp";
  return "none";
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super(
      "No mail transport is configured. Set RESEND_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASSWORD.",
    );
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailSendError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "EmailSendError";
  }
}

export function fromAddress(): string {
  const explicit = process.env.EMAIL_FROM;
  if (explicit) return explicit;
  if (process.env.SMTP_USER) return process.env.SMTP_USER;
  throw new EmailNotConfiguredError();
}

export function replyToAddress(): string | undefined {
  const value = process.env.EMAIL_REPLY_TO?.trim();
  return value ? value : undefined;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface EmailResult {
  messageId: string;
  transport: Exclude<EmailTransport, "none">;
}

export function looksLikeAnAddress(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 320) return false;
  if (/\s/.test(trimmed)) return false;
  const at = trimmed.indexOf("@");
  if (at <= 0 || at !== trimmed.lastIndexOf("@")) return false;
  const domain = trimmed.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

async function sendViaResend(email: OutboundEmail): Promise<EmailResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [email.to],
      subject: email.subject,
      text: email.text,
      ...(email.html ? { html: email.html } : {}),
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!response.ok) {
    throw new EmailSendError(
      payload.message ?? payload.name ?? `Resend returned ${response.status}.`,
    );
  }
  if (!payload.id) throw new EmailSendError("Resend accepted the mail but returned no id.");
  return { messageId: payload.id, transport: "resend" };
}

async function sendViaSmtp(email: OutboundEmail): Promise<EmailResult> {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    const info = await transporter.sendMail({
      from: fromAddress(),
      to: email.to,
      subject: email.subject,
      text: email.text,
      ...(email.html ? { html: email.html } : {}),
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    });
    return { messageId: info.messageId, transport: "smtp" };
  } catch (error) {
    throw new EmailSendError(error instanceof Error ? error.message : String(error));
  } finally {
    transporter.close();
  }
}

export async function sendEmail(email: OutboundEmail): Promise<EmailResult> {
  const transport = emailTransport();
  if (transport === "none") throw new EmailNotConfiguredError();
  if (!looksLikeAnAddress(email.to)) {
    throw new EmailSendError(`"${email.to}" is not an address this can deliver to.`);
  }
  const withReplyTo: OutboundEmail = { ...email, replyTo: email.replyTo ?? replyToAddress() };
  return transport === "resend" ? sendViaResend(withReplyTo) : sendViaSmtp(withReplyTo);
}
