"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clientSourceBadge,
  submissionPriorityBadge,
  submissionStatusBadge,
} from "@/lib/status-badges";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Phone,
  Plus,
  Tag,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoadingIcon } from "@/components/loading-icon";

type ClientStatus =
  | "NEW"
  | "VIEWED"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST"
  | "SPAM";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type ClientSource =
  | "WEBSITE_CONTACT_FORM"
  | "TRANSPARENCY_ESTIMATOR"
  | "MANUAL"
  | "WHATSAPP_INBOUND"
  | "REFERRAL";

const SOURCE_LABELS: Record<ClientSource, string> = {
  WEBSITE_CONTACT_FORM: "Contact form",
  TRANSPARENCY_ESTIMATOR: "Estimator",
  MANUAL: "Manual",
  WHATSAPP_INBOUND: "WhatsApp",
  REFERRAL: "Referral",
};

interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: { name: string | null; email: string };
}

interface DetailTag {
  id: string;
  name: string;
  createdAt: string;
}

interface Meeting {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
}

interface WhatsAppMessage {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  status: string;
  body: string;
  createdAt: string;
}

interface ClientDetail {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  industry: string | null;
  source: ClientSource;
  status: ClientStatus;
  priority: Priority;
  createdAt: string;
  contactSubmission?: {
    id: string;
    message: string;
    serviceInterest?: string | null;
    notes: Note[];
    tags: DetailTag[];
    meetings: Meeting[];
  } | null;
  transparencyLead?: {
    projectType: string;
    complexity: string;
    timeline: string;
    priceMin: number;
    priceMax: number;
    weeksMin: number;
    weeksMax: number;
  } | null;
  proposals: {
    id: string;
    status: string;
    totalPrice: number;
    currency: string;
    fileUrl: string | null;
    pdfUrl: string | null;
    createdAt: string;
  }[];
  contracts: { id: string; status: string; createdAt: string }[];
  messages: WhatsAppMessage[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/clients/${id}`);
      const data = await response.json();

      if (data.success) {
        setClient(data.client);
      } else {
        setError(data.message || "Failed to load client");
      }
    } catch (error: unknown) {
      console.error("Error fetching client:", error);
      setError("Failed to load client details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchClient();
    }
  }, [id, fetchClient]);

  const updateClient = async (updates: {
    status?: ClientStatus;
    priority?: Priority;
  }) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        await fetchClient();
      } else {
        setError(data.message || "Failed to update client");
      }
    } catch (error: unknown) {
      console.error("Error updating client:", error);
      setError("Failed to update client");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: ClientStatus) =>
    submissionStatusBadge[status] ?? submissionStatusBadge.NEW;

  const getPriorityColor = (priority: Priority) =>
    submissionPriorityBadge[priority] ?? submissionPriorityBadge.MEDIUM;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatEGP = (amount: number) =>
    new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <LoadingIcon size={24} />
          <p className="mt-4 text-muted-foreground">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64 border rounded-lg bg-destructive/10">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              The client you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name || "Unnamed client"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Client Details</p>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                clientSourceBadge[client.source],
              )}
            >
              {SOURCE_LABELS[client.source]}
            </span>
          </div>
        </div>
        <Button variant="brand" className="rounded-xl" asChild>
          <Link href={`/clients/${client.id}/new-proposal`}>
            <Plus className="h-4 w-4" />
            New Proposal
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Stage</label>
          <Select
            value={client.status}
            onValueChange={(value) =>
              updateClient({ status: value as ClientStatus })
            }
            disabled={updating}
          >
            <SelectTrigger className={getStatusColor(client.status)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="VIEWED">Viewed</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="QUALIFIED">Qualified</SelectItem>
              <SelectItem value="PROPOSAL_SENT">Proposal Sent</SelectItem>
              <SelectItem value="WON">Won</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
              <SelectItem value="SPAM">Spam</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Priority</label>
          <Select
            value={client.priority}
            onValueChange={(value) =>
              updateClient({ priority: value as Priority })
            }
            disabled={updating}
          >
            <SelectTrigger className={getPriorityColor(client.priority)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="liquid-glass rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${client.phone}`}
                    className="text-sm font-medium hover:underline"
                  >
                    <bdi>{client.phone}</bdi>
                  </a>
                </div>
              </div>
              {client.email && (
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${client.email}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {client.email}
                    </a>
                  </div>
                </div>
              )}
              {client.company && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">
                      {client.company}
                      {client.industry ? ` · ${client.industry}` : ""}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Added</p>
                  <p className="text-sm font-medium">
                    {formatDate(client.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {client.transparencyLead && (
            <div className="liquid-glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transparency Estimate
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project type</span>
                  <span className="font-medium">
                    {client.transparencyLead.projectType} ·{" "}
                    {client.transparencyLead.complexity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeline</span>
                  <span className="font-medium">
                    {client.transparencyLead.timeline}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price range</span>
                  <span className="font-medium">
                    {formatEGP(client.transparencyLead.priceMin)} –{" "}
                    {formatEGP(client.transparencyLead.priceMax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">
                    {client.transparencyLead.weeksMin}–
                    {client.transparencyLead.weeksMax} weeks
                  </span>
                </div>
              </div>
            </div>
          )}

          {client.contactSubmission?.message && (
            <div className="liquid-glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {client.contactSubmission.message}
              </p>
            </div>
          )}

          <div className="liquid-glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp ({client.messages.length})
            </h2>
            {client.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages yet — proposal and contract sends will show up here.
              </p>
            ) : (
              <div className="space-y-3">
                {client.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-xl p-3 text-sm",
                      message.direction === "OUTBOUND"
                        ? "bg-brand/10 ms-8"
                        : "bg-muted me-8",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{message.status}</span>
                      <span>•</span>
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {client.contactSubmission && client.contactSubmission.tags.length > 0 && (
            <div className="liquid-glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {client.contactSubmission.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/25"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {client.contactSubmission ? (
            <div className="liquid-glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes ({client.contactSubmission.notes.length})
              </h2>
              {client.contactSubmission.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet</p>
              ) : (
                <div className="space-y-4">
                  {client.contactSubmission.notes.map((note) => (
                    <div
                      key={note.id}
                      className="border-l-2 border-brand/30 pl-4 py-2"
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{note.createdBy.name || note.createdBy.email}</span>
                        <span>•</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="liquid-glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </h2>
              <p className="text-sm text-muted-foreground">
                Notes require a linked contact form submission.
              </p>
            </div>
          )}

          {client.contactSubmission && client.contactSubmission.meetings.length > 0 && (
            <div className="liquid-glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Related Meetings ({client.contactSubmission.meetings.length})
              </h2>
              <div className="space-y-3">
                {client.contactSubmission.meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="liquid-glass rounded-2xl p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push("/meetings")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{meeting.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {meeting.type.replace(/_/g, " ")}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-brand/10 text-brand">
                        {meeting.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(meeting.scheduledDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(meeting.scheduledTime)} (
                        {meeting.durationMinutes} min)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(client.proposals.length > 0 || client.contracts.length > 0) && (
            <div className="liquid-glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Proposals & Contracts
              </h2>
              <div className="space-y-3">
                {client.proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      Proposal ·{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: proposal.currency,
                        maximumFractionDigits: 0,
                      }).format(proposal.totalPrice)}
                    </span>
                    <div className="flex items-center gap-2">
                      {proposal.fileUrl && (
                        <a
                          href={proposal.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Download .pptx"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning">
                        {proposal.status}
                      </span>
                    </div>
                  </div>
                ))}
                {client.contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>Contract</span>
                    <span className="text-xs px-2 py-1 rounded bg-success/10 text-success">
                      {contract.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
