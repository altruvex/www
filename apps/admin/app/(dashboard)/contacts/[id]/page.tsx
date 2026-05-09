"use client"

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    Calendar,
    Clock,
    Mail,
    MessageSquare,
    Tag,
    User,
    AlertCircle,
    FileText,
    Building2,
    Eye,
    Phone,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type SubmissionStatus =
    | "NEW"
    | "VIEWED"
    | "CONTACTED"
    | "QUALIFIED"
    | "PROPOSAL_SENT"
    | "WON"
    | "LOST"
    | "SPAM"

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

interface Note {
    id: string
    content: string
    createdAt: string
    createdBy: {
        name: string | null
        email: string
    }
}

interface Tag {
    id: string
    name: string
    color?: string | null
    createdAt: string
}

interface Meeting {
    id: string
    title: string
    type: string
    status: string
    scheduledDate: string
    scheduledTime: string
    durationMinutes: number
}

interface ContactSubmission {
    id: string
    name: string
    phone: string
    message: string
    status: SubmissionStatus
    priority: Priority
    serviceInterest?: string | null
    projectTimeline?: string | null
    website?: string | null
    submittedAt: string
    firstViewedAt?: string | null
    firstContactedAt?: string | null
    assignedTo?: {
        id: string
        name: string | null
        email: string
    } | null
    notes: Note[]
    tags: Tag[]
    meetings: Meeting[]
}

export default function ContactDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [contact, setContact] = useState<ContactSubmission | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            fetchContact()
        }
    }, [id])

    const fetchContact = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`/api/admin/contacts/${id}`)
            const data = await response.json()

            if (data.success) {
                setContact(data.submission)
            } else {
                setError(data.message || "Failed to load contact")
            }
        } catch (error: unknown) {
            console.error("Error fetching contact:", error)
            setError("Failed to load contact details")
        } finally {
            setLoading(false)
        }
    }

    const updateContact = async (updates: { status?: SubmissionStatus; priority?: Priority }) => {
        try {
            setUpdating(true)
            const response = await fetch("/api/admin/contacts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...updates }),
            })

            const data = await response.json()
            if (data.success) {
                await fetchContact()
            } else {
                setError(data.message || "Failed to update contact")
            }
        } catch (error: unknown) {
            console.error("Error updating contact:", error)
            setError("Failed to update contact")
        } finally {
            setUpdating(false)
        }
    }

    const getStatusColor = (status: SubmissionStatus) => {
        const colors: Record<SubmissionStatus, string> = {
            NEW: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
            VIEWED: "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30",
            CONTACTED: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
            QUALIFIED: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
            PROPOSAL_SENT: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
            WON: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/30",
            LOST: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
            SPAM: "bg-gray-400/20 text-gray-600 dark:text-gray-500 border-gray-400/30",
        }
        return colors[status] || colors.NEW
    }

    const getPriorityColor = (priority: Priority) => {
        const colors: Record<Priority, string> = {
            LOW: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
            MEDIUM: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
            HIGH: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
            URGENT: "bg-red-600/20 text-red-700 dark:text-red-400",
        }
        return colors[priority] || colors.MEDIUM
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const formatTime = (timeString: string) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Loading contact details...</p>
                </div>
            </div>
        )
    }

    if (error && !contact) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-center h-64 border rounded-lg bg-destructive/10">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <p className="text-lg font-semibold text-destructive">{error}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            The contact you&apos;re looking for doesn&lsquo;t exist or has been deleted.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!contact) {
        return null
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{contact.name}</h1>
                    <p className="text-muted-foreground mt-1">Contact Submission Details</p>
                </div>
            </div>

            
            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select
                        value={contact.status}
                        onValueChange={(value) =>
                            updateContact({ status: value as SubmissionStatus })
                        }
                        disabled={updating}
                    >
                        <SelectTrigger className={`${getStatusColor(contact.status)}`}>
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
                        value={contact.priority}
                        onValueChange={(value) =>
                            updateContact({ priority: value as Priority })
                        }
                        disabled={updating}
                    >
                        <SelectTrigger className={`${getPriorityColor(contact.priority)}`}>
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
                    
                    <div className="border rounded-lg p-6 space-y-4">
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
                                        href={`tel:${contact.phone}`}
                                        className="text-sm font-medium hover:underline"
                                    >
                                        <bdi>
                                            {contact.phone}
                                        </bdi>
                                    </a>
                                </div>
                            </div>
                            {contact.website && (
                                <div className="flex items-start gap-3">
                                    <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Website</p>
                                        <a
                                            href={contact.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium hover:underline"
                                        >
                                            {contact.website}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {contact.serviceInterest && (
                                <div className="flex items-start gap-3">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Service Interest</p>
                                        <p className="text-sm font-medium">
                                            {contact.serviceInterest.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {contact.projectTimeline && (
                                <div className="flex items-start gap-3">
                                    <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Project Timeline</p>
                                        <p className="text-sm font-medium">
                                            {contact.projectTimeline.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Submitted</p>
                                    <p className="text-sm font-medium">{formatDate(contact.submittedAt)}</p>
                                </div>
                            </div>
                            {contact.firstViewedAt && (
                                <div className="flex items-start gap-3">
                                    <Eye className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">First Viewed</p>
                                        <p className="text-sm font-medium">
                                            {formatDate(contact.firstViewedAt)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {contact.firstContactedAt && (
                                <div className="flex items-start gap-3">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">First Contacted</p>
                                        <p className="text-sm font-medium">
                                            {formatDate(contact.firstContactedAt)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {contact.assignedTo && (
                                <div className="flex items-start gap-3">
                                    <User className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Assigned To</p>
                                        <p className="text-sm font-medium">
                                            {contact.assignedTo.name || contact.assignedTo.email}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    
                    <div className="border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Message
                        </h2>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{contact.message}</p>
                    </div>
                </div>

                
                <div className="space-y-6">
                    
                    {contact.tags.length > 0 && (
                        <div className="border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Tag className="h-5 w-5" />
                                Tags
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {contact.tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    
                    <div className="border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Notes ({contact.notes.length})
                        </h2>
                        {contact.notes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No notes yet</p>
                        ) : (
                            <div className="space-y-4">
                                {contact.notes.map((note) => (
                                    <div key={note.id} className="border-l-2 border-primary/30 pl-4 py-2">
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

                    
                    {contact.meetings.length > 0 && (
                        <div className="border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Related Meetings ({contact.meetings.length})
                            </h2>
                            <div className="space-y-3">
                                {contact.meetings.map((meeting) => (
                                    <div
                                        key={meeting.id}
                                        className="border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/meetings?contactId=${contact.id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-medium">{meeting.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {meeting.type.replace(/_/g, " ")}
                                                </p>
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-1 rounded ${meeting.status === "SCHEDULED"
                                                        ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                                        : meeting.status === "COMPLETED"
                                                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                                            : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                                                    }`}
                                            >
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
                                                {formatTime(meeting.scheduledTime)} ({meeting.durationMinutes} min)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
