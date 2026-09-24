/**
 * The default wording for the two documents that go to a client (§26).
 *
 * One source, used twice: the send screen pre-fills from it so an operator has
 * something to edit rather than a blank box, and the route falls back to it
 * when nothing was edited. Two copies of this text would drift, and the drift
 * would only ever be discovered by a client receiving the older one.
 */

export interface EmailDraft {
  subject: string;
  body: string;
}

const sign = (name: string) => [`Hi ${name},`, ""];

export function proposalDraft(clientName: string | null, link: string): EmailDraft {
  return {
    subject: "Your proposal from Altruvex",
    body: [
      ...sign(clientName || "there"),
      "Your proposal is ready. It is here:",
      link,
      "",
      "Reply to this message with anything you want changed — a scope, a number, a date.",
      "",
      "Altruvex",
    ].join("\n"),
  };
}

export function contractDraft(clientName: string | null, link: string): EmailDraft {
  return {
    subject: "Your contract from Altruvex",
    body: [
      ...sign(clientName || "there"),
      "Your contract is ready to sign. Open it here:",
      link,
      "",
      "The link is yours alone — please do not forward it. Reply to this message if anything in",
      "the agreement needs to change before you sign.",
      "",
      "Altruvex",
    ].join("\n"),
  };
}

/**
 * A change-request quote. The figure and the terms are passed in already
 * formatted — this file holds wording, never a price — and the hourly line says
 * plainly that the bill follows the hours actually spent, so the number a
 * client approves is never read as a cap it is not.
 */
export function changeRequestQuoteDraft(input: {
  clientName: string | null;
  title: string;
  amount: string;
  /** e.g. "3 h estimated at EGP 800 / hour", or null for a fixed price. */
  hourlyTerms: string | null;
  validUntil: string | null;
  link: string;
}): EmailDraft {
  return {
    subject: `Quote: ${input.title}`,
    body: [
      ...sign(input.clientName || "there"),
      "Here is the quote for the change you asked for.",
      "",
      input.title,
      input.hourlyTerms
        ? `${input.amount} — ${input.hourlyTerms}, billed on the hours actually spent.`
        : `${input.amount} — fixed price.`,
      "",
      "Review and approve it here:",
      input.link,
      "",
      ...(input.validUntil ? [`The quote is valid until ${input.validUntil}.`] : []),
      "Reply to this message with any questions.",
      "",
      "Altruvex",
    ].join("\n"),
  };
}

/**
 * Guarantees the document is actually in the mail.
 *
 * The body is editable, which means it is deletable. A proposal email whose
 * link was removed while rewriting the note above it is worse than no email: it
 * tells a client something is ready and gives them no way to see it, and
 * nothing about it looks wrong at the moment of sending.
 *
 * So the link is re-appended rather than the send being refused — the operator
 * wanted to send, and the fix is to send something complete.
 */
export function ensureLink(body: string, link: string): string {
  if (body.includes(link)) return body;
  return `${body.trimEnd()}\n\n${link}\n`;
}

/**
 * The renewal notice the contract promises ("Altruvex notifies the Client
 * before each renewal date").
 *
 * Figures arrive formatted, like the change-request quote — this file holds
 * wording, never a price. It says what renews, when, for how much, and what
 * the client has to do if they do NOT want it: silence is the renewal, and a
 * notice that hides the way out is not a notice.
 */
export function serviceRenewalDraft(input: {
  clientName: string | null;
  serviceName: string;
  kindLabel: string;
  /** "10 October 2026" */
  expires: string;
  /** "EGP 950 / year" */
  price: string;
}): EmailDraft {
  return {
    subject: `${input.serviceName} renews on ${input.expires}`,
    body: [
      ...sign(input.clientName || "there"),
      `Your ${input.kindLabel.toLowerCase()} ${input.serviceName} is due for renewal on ${input.expires}.`,
      "",
      `We will renew it for the next term at ${input.price}, and send the invoice for that term.`,
      "",
      "Nothing is needed from you to keep it running. If you do not want to renew, reply to this",
      `message before ${input.expires} and we will let it lapse instead.`,
      "",
      "Altruvex",
    ].join("\n"),
  };
}
