import nodemailer from "nodemailer";

/**
 * Outbound transactional mail (§26).
 *
 * Two transports, chosen by which credentials exist, because the honest answer
 * to "which one" depends on something this application cannot decide: whether
 * the studio is sending from its own domain yet.
 *
 * - **Resend** sends from `hello@altruvex.com` once the domain is verified. It
 *   is an HTTP API, so there is no SDK here — the surface used is one endpoint.
 * - **SMTP** sends from whatever mailbox the credentials belong to, including a
 *   plain Gmail account with an app password. Free, immediate, and the From
 *   address is the mailbox's own.
 *
 * Neither is required, and with neither configured nothing pretends to send.
 * `/email` says so, and every call fails loudly rather than returning a message
 * id for a mail that went nowhere.
 */

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

/**
 * The address mail is sent as.
 *
 * Resend refuses an address on a domain it has not verified, and SMTP servers
 * refuse an address the mailbox does not own — so this is deliberately explicit
 * rather than derived from anything. A wrong value fails at the transport,
 * which is the right place for it to fail.
 */
export function fromAddress(): string {
  const explicit = process.env.EMAIL_FROM;
  if (explicit) return explicit;
  if (process.env.SMTP_USER) return process.env.SMTP_USER;
  throw new EmailNotConfiguredError();
}

/**
 * Where a client's reply goes.
 *
 * Mail is sent from a dedicated sending subdomain, which is right for
 * deliverability and wrong for conversation: nobody reads
 * `hello@mail.altruvex.com`. Without a reply-to, a client answering a proposal
 * is answering into a mailbox that does not exist, and the studio never learns
 * they replied at all.
 *
 * Optional, because a setup where the sending address *is* a real mailbox needs
 * nothing here.
 */
export function replyToAddress(): string | undefined {
  const value = process.env.EMAIL_REPLY_TO?.trim();
  return value ? value : undefined;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  /** Plain text. Always sent, and the only body when no HTML is given. */
  text: string;
  html?: string;
  replyTo?: string;
}

export interface EmailResult {
  /** The transport's own id, so a delivery question has something to quote. */
  messageId: string;
  transport: Exclude<EmailTransport, "none">;
}

/**
 * Rejects an address this could never deliver to before spending a request on
 * it. Deliberately loose — the transport is the authority on what is
 * deliverable, and a clever regex here would reject valid addresses nobody
 * could then explain.
 */
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
    // Resend names the cause ("domain is not verified", "validation_error"),
    // and that sentence is the whole of what an operator needs to fix it.
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
    // 465 is implicit TLS; 587 starts plaintext and upgrades with STARTTLS.
    // Getting this backwards is the single most common reason an SMTP send
    // hangs rather than failing, so it is derived from the port rather than
    // being one more thing to configure wrongly.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
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

/**
 * Sends, and throws when it does not.
 *
 * No swallowing here, unlike the Slack notifier: mail in this application is
 * the thing an operator pressed a button to do, not a side effect of something
 * else. Reporting success over a rejected send would be the exact lie the
 * honesty rule exists to prevent.
 */
export async function sendEmail(email: OutboundEmail): Promise<EmailResult> {
  const transport = emailTransport();
  if (transport === "none") throw new EmailNotConfiguredError();
  if (!looksLikeAnAddress(email.to)) {
    throw new EmailSendError(`"${email.to}" is not an address this can deliver to.`);
  }
  // Applied here rather than at each call site: a send that forgets it is a
  // reply nobody receives, and there is no error to notice.
  const withReplyTo: OutboundEmail = { ...email, replyTo: email.replyTo ?? replyToAddress() };
  return transport === "resend" ? sendViaResend(withReplyTo) : sendViaSmtp(withReplyTo);
}
