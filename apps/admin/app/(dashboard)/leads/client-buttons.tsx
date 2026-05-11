"use client";

import { ExternalLink, FileDown, X } from "lucide-react";
import { useState } from "react";

export function ExportCsvButton({ leads }: { leads: any[] }) {
  const handleExport = () => {
    const headers = [
      "Timestamp",
      "Name",
      "Phone",
      "Project Type",
      "Timeline",
      "Complexity",
      "Price Min",
      "Price Max",
    ];

    const csvContent = [
      headers.join(","),
      ...leads.map((lead) =>
        [
          `"${new Date(lead.createdAt).toISOString()}"`,
          `"${lead.name || "Anonymous"}"`,
          `"${lead.phone || ""}"`,
          `"${lead.projectType || ""}"`,
          `"${lead.timeline || ""}"`,
          `"${lead.complexity || ""}"`,
          lead.priceMin,
          lead.priceMax,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 rounded-sm border border-foreground/10 bg-foreground/5 font-mono text-[10px] uppercase tracking-wider text-primary/60 hover:text-primary transition-colors flex items-center gap-2"
    >
      <FileDown className="h-3 w-3" />
      Export CSV
    </button>
  );
}

const FIELD_LABELS: Record<string, string> = {
  createdAt: "Submitted",
  name: "Name",
  phone: "Phone",
  email: "Email",
  projectType: "Project Type",
  timeline: "Timeline",
  complexity: "Complexity",
  priceMin: "Price Min (EGP)",
  priceMax: "Price Max (EGP)",
  source: "Source",
  message: "Message",
};

const ORDERED_KEYS = Object.keys(FIELD_LABELS);

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined || value === "") return "-";
  if (key === "createdAt") {
    return new Date(value).toLocaleString("en-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  if (key === "priceMin" || key === "priceMax") {
    return `EGP ${Number(value).toLocaleString()}`;
  }
  return String(value);
}

function LeadDetailModal({
  lead,
  onClose,
}: {
  lead: any;
  onClose: () => void;
}) {
  const knownRows = ORDERED_KEYS.filter((k) => k in lead);
  const extraRows = Object.keys(lead).filter(
    (k) => !ORDERED_KEYS.includes(k) && k !== "id",
  );
  const rows = [...knownRows, ...extraRows];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-background border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/40">
              Lead Detail
            </p>
            <p className="text-sm font-medium text-foreground mt-0.5">
              {lead.name || "Anonymous"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-foreground/30 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((key, i) => (
                <tr key={key} className={i % 2 === 0 ? "bg-foreground/2" : ""}>
                  <td className="px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground/40 whitespace-nowrap w-40 align-top">
                    {FIELD_LABELS[key] ?? key}
                  </td>
                  <td className="px-6 py-3 text-foreground/80 wrap-break-word">
                    {formatValue(key, lead[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-between items-center">
          <p className="font-mono text-[10px] text-foreground/30">
            ID: {lead.id ?? "-"}
          </p>
          <a
            href={`https://wa.me/${(lead.phone ?? "").replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            Open WhatsApp
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function ViewDetailsButton({ lead }: { lead: any }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-sm border border-foreground/10 bg-foreground/5 text-primary/40 hover:text-primary hover:bg-foreground/10 transition-all duration-200"
        title="View Details"
      >
        <ExternalLink className="h-4 w-4" />
      </button>
      {open && <LeadDetailModal lead={lead} onClose={() => setOpen(false)} />}
    </>
  );
}
