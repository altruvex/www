"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientSourceBadge, submissionPriorityBadge, submissionStatusBadge } from "@/lib/status-badges";
import { cn } from "@/lib/utils";
import { Calendar, Eye, Phone, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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

export interface ClientRow {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  source: ClientSource;
  status: ClientStatus;
  priority: Priority;
  createdAt: string | Date;
  contactSubmission?: {
    id: string;
    message: string;
    serviceInterest?: string | null;
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
  proposals: { status: string }[];
  contracts: { status: string }[];
}

const SOURCE_LABELS: Record<ClientSource, string> = {
  WEBSITE_CONTACT_FORM: "Contact form",
  TRANSPARENCY_ESTIMATOR: "Estimator",
  MANUAL: "Manual",
  WHATSAPP_INBOUND: "WhatsApp",
  REFERRAL: "Referral",
};

interface ClientsClientProps {
  initialClients: ClientRow[];
  initialTotalPages: number;
}

export function ClientsClient({
  initialClients,
  initialTotalPages,
}: ClientsClientProps) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", page.toString());
      params.append("pageSize", "20");

      const response = await fetch(`/api/admin/clients?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setClients(data.clients || []);
        setTotalPages(Math.ceil((data.total || 0) / 20));
      }
    } catch (error: unknown) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchClients();
  };

  useEffect(() => {
    if (!mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sourceFilter, page]);

  const updateClient = async (
    id: string,
    updates: { status?: ClientStatus; priority?: Priority },
  ) => {
    try {
      setUpdating(id);
      const response = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        await fetchClients();
        toast.success("Client updated successfully");
      } else {
        toast.error(data.message || "Failed to update client");
      }
    } catch (error: unknown) {
      console.error("Error updating client:", error);
      toast.error("Failed to update client");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: ClientStatus) =>
    submissionStatusBadge[status] ?? submissionStatusBadge.NEW;

  const getPriorityColor = (priority: Priority) =>
    submissionPriorityBadge[priority] ?? submissionPriorityBadge.MEDIUM;

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const projectSummary = (client: ClientRow) => {
    if (client.transparencyLead) {
      return `${client.transparencyLead.projectType} · ${client.transparencyLead.complexity}`;
    }
    if (client.contactSubmission?.serviceInterest) {
      return client.contactSubmission.serviceInterest.replace(/_/g, " ");
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2">
            Clients
          </h1>
          <p className="text-[15px] text-muted-foreground font-sans">
            Every lead and client in one pipeline — auto-captured or entered by hand
          </p>
        </div>
        <Button variant="brand" className="rounded-xl h-11" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>
      <div className="rounded-4xl liquid-glass p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form className="relative flex-1" onSubmit={handleSearchSubmit}>
            <Search className="absolute inset-s-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or company (Press enter)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-11 pe-4 h-11 border border-border rounded-xl bg-muted/50 focus:outline-none focus:bg-transparent focus:ring-1 focus:ring-foreground/20 transition-all font-sans text-[14px]"
            />
          </form>
          <div className="flex gap-4 shrink-0">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-11 border-border bg-muted/50 rounded-xl text-[14px]">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-lg">
                <SelectItem value="all">All Stages</SelectItem>
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
            <Select
              value={sourceFilter}
              onValueChange={(v) => {
                setSourceFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-11 border-border bg-muted/50 rounded-xl text-[14px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-lg">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="WEBSITE_CONTACT_FORM">Contact form</SelectItem>
                <SelectItem value="TRANSPARENCY_ESTIMATOR">Estimator</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="WHATSAPP_INBOUND">WhatsApp</SelectItem>
                <SelectItem value="REFERRAL">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-border">
          {loading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 backdrop-blur-[2px]">
              <LoadingIcon size={24} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Client
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Source
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Project
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Stage
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Added
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-muted-foreground text-[14px]"
                    >
                      No clients found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => {
                    const latestContract = client.contracts[0];
                    const latestProposal = client.proposals[0];
                    return (
                      <tr
                        key={client.id}
                        className="group hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground mb-1">
                            {client.name || "Unnamed"}
                          </div>
                          <div className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3 opacity-60" />
                            <bdi>{client.phone}</bdi>
                          </div>
                          {client.company && (
                            <div className="text-[12px] text-muted-foreground/80 mt-1">
                              {client.company}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border",
                              clientSourceBadge[client.source],
                            )}
                          >
                            {SOURCE_LABELS[client.source]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[13px] text-muted-foreground max-w-[220px]">
                            {projectSummary(client) || "—"}
                          </div>
                          {(latestProposal || latestContract) && (
                            <div className="text-[11px] text-muted-foreground/70 mt-1 uppercase tracking-wide">
                              {latestContract
                                ? `Contract: ${latestContract.status}`
                                : `Proposal: ${latestProposal!.status}`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={client.status}
                            onValueChange={(value) =>
                              updateClient(client.id, {
                                status: value as ClientStatus,
                              })
                            }
                            disabled={updating === client.id}
                          >
                            <SelectTrigger
                              className={cn(
                                "text-[12px] font-medium h-8 w-[130px] rounded-full border shadow-none",
                                getStatusColor(client.status),
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
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
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={client.priority}
                            onValueChange={(value) =>
                              updateClient(client.id, {
                                priority: value as Priority,
                              })
                            }
                            disabled={updating === client.id}
                          >
                            <SelectTrigger
                              className={cn(
                                "text-[12px] font-medium h-8 w-[110px] rounded-full border shadow-none",
                                getPriorityColor(client.priority),
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[13px] text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="h-3.5 w-3.5 opacity-60" />
                            {formatDate(client.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-end">
                          <Link
                            href={`/clients/${client.id}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-border">
            <span className="text-[13px] text-muted-foreground font-medium">
              Showing page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg h-9 px-4 border-border bg-muted/50 hover:bg-muted shadow-none"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg h-9 px-4 border-border bg-muted/50 hover:bg-muted shadow-none"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      {addOpen && (
        <AddClientDialog
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            setPage(1);
            fetchClients();
          }}
        />
      )}
    </div>
  );
}

function AddClientDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Phone is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, company, industry }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Client added");
        onCreated();
      } else {
        setError(data.message || "Failed to add client");
      }
    } catch (err: unknown) {
      console.error("Error creating client:", err);
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl liquid-glass p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-foreground">Add client</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
            autoFocus
          />
          <input
            type="text"
            placeholder="Phone (required)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
          <input
            type="text"
            placeholder="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="brand"
            className="w-full h-11 rounded-xl"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Adding…" : "Add client"}
          </Button>
        </form>
      </div>
    </div>
  );
}
