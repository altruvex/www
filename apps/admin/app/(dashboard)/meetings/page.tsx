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
  Calendar,
  Clock,
  Search,
  Trash2,
  User,
  Video,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MeetingStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";
type MeetingType = "DISCOVERY" | "CONSULTATION" | "PROPOSAL" | "FOLLOWUP";

interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  type: MeetingType;
  status: MeetingStatus;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  guestName?: string | null;
  guestEmail?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  assignedTo?: { name: string | null; email: string } | null;
  contactSubmission?: { id: string; name: string; phone: string } | null;
  createdAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    id: string;
    status: MeetingStatus;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, debouncedSearchQuery]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);

      const response = await fetch(`/api/admin/meetings?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setMeetings(data.meetings || []);
      }
    } catch (error: unknown) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const updateMeeting = async (
    id: string,
    updates: {
      status?: MeetingStatus;
      meetingUrl?: string | null;
      adminNotes?: string | null;
    },
  ) => {
    try {
      setUpdating(id);
      const response = await fetch("/api/admin/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchMeetings();
        toast.success("Meeting updated successfully");
      } else {
        toast.error(data.message || "Failed to update meeting");
      }
    } catch (error: unknown) {
      console.error("Error updating meeting:", error);
      toast.error("Failed to update meeting");
    } finally {
      setUpdating(null);
    }
  };

  const openDeleteDialog = (id: string, title: string) => {
    setMeetingToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!meetingToDelete) return;

    try {
      setDeleting(meetingToDelete.id);
      const response = await fetch(
        `/api/admin/meetings?id=${meetingToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success(
          `Meeting "${meetingToDelete.title}" deleted successfully`,
        );
        await fetchMeetings();
      } else {
        toast.error(data.message || "Failed to delete meeting");
      }
    } catch (error: unknown) {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        meeting.title.toLowerCase().includes(query) ||
        meeting.guestName?.toLowerCase().includes(query) ||
        meeting.contactSubmission?.phone?.toLowerCase().includes(query) ||
        meeting.guestEmail?.toLowerCase().includes(query) ||
        meeting.notes?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: MeetingStatus) => {
    const colors: Record<MeetingStatus, string> = {
      PENDING:
        "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      APPROVED:
        "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
      REJECTED:
        "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
      COMPLETED:
        "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
      CANCELLED:
        "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30",
      RESCHEDULED:
        "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
    };
    return colors[status] || colors.PENDING;
  };

  const getTypeColor = (type: MeetingType) => {
    const colors: Record<MeetingType, string> = {
      DISCOVERY: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      CONSULTATION: "bg-green-500/20 text-green-700 dark:text-green-400",
      PROPOSAL: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
      FOLLOWUP: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    };
    return colors[type] || colors.DISCOVERY;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };



  const getTimeSlot = (time: string) => {
    const slots: Record<string, string> = {
      morning: "9:00 AM - 12:00 PM",
      afternoon: "12:00 PM - 3:00 PM",
      evening: "3:00 PM - 6:00 PM",
    };
    return slots[time] || time;
  };

  if (loading && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Meetings</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all meeting requests and scheduled calls
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredMeetings.length}{" "}
          {filteredMeetings.length === 1 ? "meeting" : "meetings"}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, guest name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="DISCOVERY">Discovery</SelectItem>
            <SelectItem value="CONSULTATION">Consultation</SelectItem>
            <SelectItem value="PROPOSAL">Proposal</SelectItem>
            <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Meeting
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Guest
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMeetings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No meetings found
                  </td>
                </tr>
              ) : (
                filteredMeetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium">{meeting.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {meeting.type.replace(/_/g, " ")}
                      </div>
                      {meeting.meetingUrl && (
                        <a
                          href={meeting.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          <Video className="h-3 w-3" />
                          Join Meeting
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {meeting.guestName && (
                        <div className="font-medium flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {meeting.guestName}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        <bdi>
                          {meeting.contactSubmission?.phone ||
                            meeting.guestEmail}
                        </bdi>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(meeting.scheduledDate)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {getTimeSlot(meeting.scheduledTime)} (
                        {meeting.durationMinutes} min)
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Select
                        value={meeting.status}
                        onValueChange={(value) => {
                          setPendingStatusChange({
                            id: meeting.id,
                            status: value as MeetingStatus,
                          });
                          setStatusChangeDialogOpen(true);
                        }}
                        disabled={updating === meeting.id}
                      >
                        <SelectTrigger
                          className={`text-xs h-8 w-[140px] ${getStatusColor(meeting.status)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="RESCHEDULED">
                            Rescheduled
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded ${getTypeColor(
                          meeting.type,
                        )}`}
                      >
                        {meeting.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {meeting.contactSubmission && (
                          <Link
                            href={`/contacts/${meeting.contactSubmission.id}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <User className="h-4 w-4" />
                            View Contact
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openDeleteDialog(meeting.id, meeting.title)
                          }
                          disabled={deleting === meeting.id}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the meeting{" "}
              <span className="font-semibold text-foreground">
                &quot;{meetingToDelete?.title}&quot;
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

      <AlertDialog
        open={statusChangeDialogOpen}
        onOpenChange={setStatusChangeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the meeting status to{" "}
              <span className="font-semibold text-foreground uppercase">
                {pendingStatusChange?.status}
              </span>
              ? This may trigger automated notifications to the guest.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatusChange(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingStatusChange) {
                  await updateMeeting(pendingStatusChange.id, {
                    status: pendingStatusChange.status,
                  });
                  setPendingStatusChange(null);
                }
                setStatusChangeDialogOpen(false);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
