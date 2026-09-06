"use client";

import { LoadingIcon } from "@/components/loading-icon";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Copy, ExternalLink, Globe, MessageCircle, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

const ALTRUVEX_WHATSAPP = "+20 102 312 5493";

const PHASES = [
  "DISCOVERY",
  "DESIGN",
  "DEVELOPMENT",
  "QA",
  "STAGING_REVIEW",
  "LAUNCHED",
  "POST_LAUNCH_SUPPORT",
] as const;

const PHASE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery & Strategy",
  DESIGN: "UI/UX Design",
  DEVELOPMENT: "Engineering",
  QA: "QA & Testing",
  STAGING_REVIEW: "Staging Review",
  LAUNCHED: "Live Build",
  POST_LAUNCH_SUPPORT: "Post-Launch Support",
};

const MILESTONE_LABELS: Record<string, string> = {
  DEPOSIT_50: "First Payment (50%)",
  MILESTONE_30: "Second Payment (30%)",
  FINAL_20: "Final Payment (20%)",
  OTHER: "Custom Milestone",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Due",
  PAID: "Paid",
  OVERDUE: "Overdue",
  WAIVED: "Waived",
};

interface Payment {
  milestone: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
}

interface PortalProject {
  name: string;
  phase: string;
  status: string;
  stagingUrl: string | null;
  liveUrl: string | null;
  client: { name: string | null; company: string | null };
  payments: Payment[];
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [project, setProject] = useState<PortalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portal/${token}`);
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    startTransition(() => {
      fetchProject();
    });
  }, [fetchProject]);

  const copyPortalLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingIcon size={24} />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <div className="text-center max-w-sm plane p-6">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-base font-medium text-foreground">Project not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This tracking link is invalid or has expired. Please check the secure link sent via WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  const currentPhaseIndex = PHASES.indexOf(
    project.phase as (typeof PHASES)[number],
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen px-4 py-12 bg-background">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="grid size-5 place-items-center rounded bg-foreground text-[10px] font-semibold text-background">A</span>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Altruvex Portal</p>
            </div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {project.client.company || project.client.name || project.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live status tracker for <span className="font-medium text-foreground">{project.name}</span>.
            </p>
          </div>
          <button
            onClick={copyPortalLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Bookmark or Copy Link"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Copied Link" : "Share Tracker"}
          </button>
        </div>
        {(project.stagingUrl || project.liveUrl) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.stagingUrl && (
              <a
                href={project.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="plane p-4 flex items-center justify-between group hover:border-brand/40 transition-all"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
                  <p className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">Staging Build</p>
                </div>
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-brand transition-colors" />
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="plane p-4 flex items-center justify-between group hover:border-success/40 transition-all"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Production</p>
                  <p className="text-sm font-semibold text-foreground group-hover:text-success transition-colors">Live Application</p>
                </div>
                <Globe className="size-4 text-muted-foreground group-hover:text-success transition-colors" />
              </a>
            )}
          </div>
        )}
        <div className="plane p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Project Lifecycle
            </h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Phase {currentPhaseIndex !== -1 ? currentPhaseIndex + 1 : 1} of {PHASES.length}
            </span>
          </div>
          <div className="space-y-5 relative before:absolute before:inset-y-2 before:left-2.75 before:w-0.5 before:bg-border">
            {PHASES.map((phase, i) => {
              const done = currentPhaseIndex > i;
              const active = currentPhaseIndex === i;
              return (
                <div key={phase} className="flex items-center gap-3.5 relative z-10">
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      done && "bg-success text-white shadow-sm",
                      active && "bg-brand text-white shadow-md ring-4 ring-brand/15",
                      !done && !active && "bg-background border border-border text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </div>
                  <div>
                    <span
                      className={cn(
                        "text-sm block",
                        active ? "font-semibold text-foreground" : done ? "text-foreground/80 font-medium" : "text-muted-foreground",
                      )}
                    >
                      {PHASE_LABELS[phase]}
                    </span>
                    {active && (
                      <span className="text-xs text-brand font-medium flex items-center gap-1 mt-0.5">
                        <Sparkles className="size-3 animate-pulse" /> Currently in progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="plane p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Financial Milestones
            </h2>
            <Trophy className="size-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border/50">
            {project.payments.map((payment, i) => (
              <div key={i} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    {MILESTONE_LABELS[payment.milestone] ?? payment.milestone}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{formatCurrency(payment.amount)}</span>
                    {payment.dueDate && <span>• Due: {formatDate(payment.dueDate)}</span>}
                    {payment.paidAt && <span>• Paid: {formatDate(payment.paidAt)}</span>}
                  </div>
                </div>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide",
                    payment.status === "PAID" && "bg-success/10 text-success border border-success/20",
                    payment.status === "PENDING" && "bg-warning/10 text-warning border border-warning/20",
                    payment.status === "OVERDUE" && "bg-destructive/10 text-destructive border border-destructive/20",
                    payment.status === "WAIVED" && "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <a
            href={`https://wa.me/${ALTRUVEX_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi Altruvex team, I'm checking in on project: ${project.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-success text-white h-12 text-sm font-medium hover:bg-success/90 transition-all shadow-sm"
          >
            <MessageCircle className="size-4" />
            Message us on WhatsApp
          </a>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Encrypted secure client token session
          </p>
        </div>
      </div>
    </div>
  );
}