"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  submissionPriorityBadge,
  submissionStatusBadge,
} from "@/lib/status-badges";
import { cn } from "@/lib/utils";
import { Calendar, Eye, Phone, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SubmissionStatus =
  | "NEW"
  | "VIEWED"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST"
  | "SPAM";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ContactSubmission {
  id: string;
  name: string;
  phone: string;
  message: string;
  status: SubmissionStatus;
  priority: Priority;
  serviceInterest?: string | null;
  projectTimeline?: string | null;
  submittedAt: string | Date;
  assignedTo?: { name: string | null; email: string } | null;
  _count?: {
    notes: number;
    meetings: number;
  };
}

interface ContactsClientProps {
  initialContacts: ContactSubmission[];
  initialTotalPages: number;
}

export function ContactsClient({
  initialContacts,
  initialTotalPages,
}: ContactsClientProps) {
  const [contacts, setContacts] =
    useState<ContactSubmission[]>(initialContacts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [mounted, setMounted] = useState(false);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", page.toString());
      params.append("pageSize", "20");

      const response = await fetch(`/api/admin/contacts?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setContacts(data.submissions || []);
        setTotalPages(Math.ceil((data.total || 0) / 20));
      }
    } catch (error: unknown) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchContacts();
  };

  useEffect(() => {
    if (!mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, page]);

  const updateContact = async (
    id: string,
    updates: { status?: SubmissionStatus; priority?: Priority },
  ) => {
    try {
      setUpdating(id);
      const response = await fetch("/api/admin/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchContacts();
        toast.success("Contact updated successfully");
      } else {
        toast.error(data.message || "Failed to update contact");
      }
    } catch (error: unknown) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    } finally {
      setUpdating(null);
    }
  };

  const openDeleteDialog = (id: string, name: string) => {
    setContactToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      setDeleting(contactToDelete.id);
      const response = await fetch(
        `/api/admin/contacts?id=${contactToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Contact "${contactToDelete.name}" deleted successfully`);
        await fetchContacts();
      } else {
        toast.error(data.message || "Failed to delete contact");
      }
    } catch (error: unknown) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const getStatusColor = (status: SubmissionStatus) =>
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2">
            Contact Submissions
          </h1>
          <p className="text-[15px] text-muted-foreground font-sans">
            Manage and track all contact form inquiries
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form className="relative flex-1" onSubmit={handleSearchSubmit}>
            <Search className="absolute start-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search by name, phone, or message (Press enter)..."
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
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-lg">
                <SelectItem value="all">All Statuses</SelectItem>
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
              value={priorityFilter}
              onValueChange={(v) => {
                setPriorityFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-11 border-border bg-muted/50 rounded-xl text-[14px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-lg">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-border">
          {loading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 backdrop-blur-[2px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Message
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground text-[14px]"
                    >
                      No contacts found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="group hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground mb-1">
                          {contact.name}
                        </div>
                        <div className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                          <Phone className="h-3 w-3 opacity-60" />
                          <bdi>{contact.phone}</bdi>
                        </div>
                        {contact.serviceInterest && (
                          <div className="text-[12px] text-muted-foreground/80 mt-1.5 bg-muted inline-block px-2 py-0.5 rounded-md">
                            {contact.serviceInterest.replace(/_/g, " ")}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[14px] text-muted-foreground line-clamp-2 max-w-[300px]">
                          {contact.message}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={contact.status}
                          onValueChange={(value) =>
                            updateContact(contact.id, {
                              status: value as SubmissionStatus,
                            })
                          }
                          disabled={updating === contact.id}
                        >
                          <SelectTrigger
                            className={cn(
                              "text-[12px] font-medium h-8 w-[130px] rounded-full border shadow-none",
                              getStatusColor(contact.status)
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
                          value={contact.priority}
                          onValueChange={(value) =>
                            updateContact(contact.id, {
                              priority: value as Priority,
                            })
                          }
                          disabled={updating === contact.id}
                        >
                          <SelectTrigger
                            className={cn(
                              "text-[12px] font-medium h-8 w-[110px] rounded-full border shadow-none",
                              getPriorityColor(contact.priority)
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
                          {formatDate(contact.submittedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => openDeleteDialog(contact.id, contact.name)}
                            disabled={deleting === contact.id}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete Contact"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light text-xl tracking-tight">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px]">
              This will permanently delete the contact submission from{" "}
              <span className="font-medium text-foreground">
                &quot;{contactToDelete?.name}&quot;
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl h-11 bg-destructive text-white hover:bg-destructive/90 border-none shadow-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}