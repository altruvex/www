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

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }
    fetchContacts();
  }, [statusFilter, priorityFilter, page]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchContacts();
  };

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

  const getStatusColor = (status: SubmissionStatus) => {
    const colors: Record<SubmissionStatus, string> = {
      NEW: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
      VIEWED:
        "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30",
      CONTACTED:
        "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
      QUALIFIED:
        "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
      PROPOSAL_SENT:
        "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      WON: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/30",
      LOST: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
      SPAM: "bg-gray-400/20 text-gray-600 dark:text-gray-500 border-gray-400/30",
    };
    return colors[status] || colors.NEW;
  };

  const getPriorityColor = (priority: Priority) => {
    const colors: Record<Priority, string> = {
      LOW: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
      MEDIUM: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      HIGH: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      URGENT: "bg-red-600/20 text-red-700 dark:text-red-400",
    };
    return colors[priority] || colors.MEDIUM;
  };

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Submissions</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all contact form submissions
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <form className="relative flex-1" onSubmit={handleSearchSubmit}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, or message (Press enter)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y relative">
              {contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        <bdi>{contact.phone}</bdi>
                      </div>
                      {contact.serviceInterest && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Service: {contact.serviceInterest.replace(/_/g, " ")}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm line-clamp-2 max-w-md">
                        {contact.message}
                      </div>
                    </td>
                    <td className="p-4">
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
                          className={`text-xs h-8 w-[140px] ${getStatusColor(contact.status)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="VIEWED">Viewed</SelectItem>
                          <SelectItem value="CONTACTED">Contacted</SelectItem>
                          <SelectItem value="QUALIFIED">Qualified</SelectItem>
                          <SelectItem value="PROPOSAL_SENT">
                            Proposal Sent
                          </SelectItem>
                          <SelectItem value="WON">Won</SelectItem>
                          <SelectItem value="LOST">Lost</SelectItem>
                          <SelectItem value="SPAM">Spam</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
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
                          className={`text-xs h-8 w-[120px] ${getPriorityColor(contact.priority)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1 text-nowrap">
                        <Calendar className="h-3 w-3" />
                        {formatDate(contact.submittedAt)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openDeleteDialog(contact.id, contact.name)
                          }
                          disabled={deleting === contact.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
        <div className="flex justify-end items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground mx-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contact submission from{" "}
              <span className="font-semibold text-foreground">
                &quot;{contactToDelete?.name}&quot;
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
