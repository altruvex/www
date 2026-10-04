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

export function changeRequestQuoteDraft(input: {
  clientName: string | null;
  title: string;
  amount: string;
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

export function ensureLink(body: string, link: string): string {
  if (body.includes(link)) return body;
  return `${body.trimEnd()}\n\n${link}\n`;
}

export function serviceRenewalDraft(input: {
  clientName: string | null;
  serviceName: string;
  kindLabel: string;
  expires: string;
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

export function paymentReminderDraft(input: {
  clientName: string | null;
  what: string;
  amount: string;
  due: string | null;
  overdue: boolean;
  invoiceNumber: string | null;
  link: string | null;
}): EmailDraft {
  const ref = input.invoiceNumber ? ` (invoice ${input.invoiceNumber})` : "";
  const when = input.due
    ? input.overdue
      ? `was due on ${input.due} and we have not received it yet`
      : `is due on ${input.due}`
    : "is now due";
  return {
    subject: input.overdue
      ? `Payment overdue: ${input.what}`
      : `Payment reminder: ${input.what}`,
    body: [
      ...sign(input.clientName || "there"),
      `A quick reminder that the payment of ${input.amount} for ${input.what}${ref} ${when}.`,
      "",
      ...(input.link ? ["Your payment schedule is here:", input.link, ""] : []),
      "If it is already on its way, thank you and please ignore this. If something is holding it",
      "up, reply to this message and we will sort it out together.",
      "",
      "Altruvex",
    ].join("\n"),
  };
}
