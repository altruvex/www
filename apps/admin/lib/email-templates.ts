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
