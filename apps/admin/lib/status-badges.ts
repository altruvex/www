/** Badge classes aligned with www design tokens (brand, success, warning, destructive). */

export const submissionStatusBadge: Record<string, string> = {
  NEW: "bg-brand/10 text-brand border-brand/25",
  VIEWED: "bg-muted text-muted-foreground border-border",
  CONTACTED: "bg-accent/10 text-accent border-accent/25",
  QUALIFIED: "bg-success/10 text-success border-success/25",
  PROPOSAL_SENT: "bg-warning/10 text-warning border-warning/25",
  WON: "bg-success/15 text-success border-success/35",
  LOST: "bg-destructive/10 text-destructive border-destructive/25",
  SPAM: "bg-muted text-muted-foreground border-border",
};

export const submissionPriorityBadge: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-brand/10 text-brand border-brand/25",
  HIGH: "bg-warning/10 text-warning border-warning/25",
  URGENT: "bg-destructive/10 text-destructive border-destructive/25",
};

export const meetingStatusBadge: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/25",
  APPROVED: "bg-success/10 text-success border-success/25",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/25",
  COMPLETED: "bg-brand/10 text-brand border-brand/25",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  RESCHEDULED: "bg-accent/10 text-accent border-accent/25",
};

export const meetingTypeBadge: Record<string, string> = {
  DISCOVERY: "bg-brand/10 text-brand",
  CONSULTATION: "bg-success/10 text-success",
  PROPOSAL: "bg-accent/10 text-accent",
  FOLLOWUP: "bg-warning/10 text-warning",
};
