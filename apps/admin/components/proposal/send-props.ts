import "server-only";

import { headers } from "next/headers";
import { documentUrl } from "@/lib/storage";
import { proposalEmailTemplate, contractEmailTemplate } from "@/lib/document-templates";
import { emailTransport } from "@/lib/email";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { whatsappConfigured } from "@/lib/sign-verification";

export interface SendProps {
  endpoint: string;
  defaultSubject: string;
  defaultBody: string;
  clientEmail: string | null;
  emailConfigured: boolean;
  whatsappConfigured: boolean;
}

async function absolute(url: string | null): Promise<string> {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return `${publicBaseUrlFromHeaders(await headers())}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function proposalSendProps(proposal: {
  id: string;
  pdfUrl: string | null;
  fileUrl: string | null;
  projectType?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  client: { name: string | null; email: string | null };
}): Promise<{ docUrl: string | null; pdfUrl: string | null; send: SendProps | null }> {
  const docUrl = await documentUrl(proposal.pdfUrl ?? proposal.fileUrl);
  const pdfUrl = await documentUrl(proposal.pdfUrl);
  if (!docUrl) return { docUrl: null, pdfUrl, send: null };
  const draft = proposalEmailTemplate({
    clientName: proposal.client.name,
    projectType: proposal.projectType,
    totalPrice: proposal.totalPrice,
    currency: proposal.currency,
    link: await absolute(docUrl),
  });
  return {
    docUrl,
    pdfUrl,
    send: {
      endpoint: `/api/admin/proposals/${proposal.id}/send`,
      defaultSubject: draft.subject,
      defaultBody: draft.body,
      clientEmail: proposal.client.email,
      emailConfigured: emailTransport() !== "none",
      whatsappConfigured: whatsappConfigured(),
    },
  };
}

export async function contractSendProps(contract: {
  id: string;
  signToken: string | null;
  fileUrl: string | null;
  proposal?: { projectType: string | null } | null;
  client: { name: string | null; email: string | null };
}): Promise<{ signUrl: string | null; send: SendProps | null }> {
  if (!contract.signToken) return { signUrl: null, send: null };
  const signUrl = `${publicBaseUrlFromHeaders(await headers())}/sign/${contract.signToken}`;
  if (!contract.fileUrl) return { signUrl, send: null };
  const draft = contractEmailTemplate({
    clientName: contract.client.name,
    projectType: contract.proposal?.projectType,
    link: signUrl,
  });
  return {
    signUrl,
    send: {
      endpoint: `/api/admin/contracts/${contract.id}/send`,
      defaultSubject: draft.subject,
      defaultBody: draft.body,
      clientEmail: contract.client.email,
      emailConfigured: emailTransport() !== "none",
      whatsappConfigured: whatsappConfigured(),
    },
  };
}
