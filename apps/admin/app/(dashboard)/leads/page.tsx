import { Button } from "@/components/ui/button";
import { prisma } from "@repo/database";
import { format } from "date-fns";
import { MessageCircle, Phone, Users } from "lucide-react";
import Link from "next/link";
import { ExportCsvButton, ViewDetailsButton } from "./client-buttons";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [leads, total] = await Promise.all([
    prisma.transparencyLead.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.transparencyLead.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="mb-2 text-foreground">Transparency leads</h1>
          <p className="text-sm text-muted-foreground">
            Manage and contact all prospective clients who used the transparency
            flow.
          </p>
        </div>
        <div className="flex gap-3">
          <ExportCsvButton leads={leads} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Timestamp
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Contact Info
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Project Summary
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Transparency Range
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-muted/40 transition-colors group"
                  >
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">
                          {format(lead.createdAt, "MMM d, yyyy")}
                        </span>
                        <span className="text-[10px] font-mono text-foreground/30">
                          {format(lead.createdAt, "HH:mm:ss")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                          {lead.name || "Anonymous Client"}
                        </span>
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-xs font-mono text-foreground/60 hover:text-foreground flex items-center gap-1.5"
                        >
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                          <span className="px-2 py-0.5 rounded-[2px] bg-muted text-foreground/60 text-[10px] font-mono uppercase tracking-wider border border-border">
                            {lead.projectType}
                          </span>
                          <span className="px-2 py-0.5 rounded-[2px] bg-muted text-foreground/60 text-[10px] font-mono uppercase tracking-wider border border-border">
                            {lead.complexity}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Timeline:{" "}
                          <span className="text-foreground/60">
                            {lead.timeline}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {new Intl.NumberFormat("en-EG", {
                            style: "currency",
                            currency: "EGP",
                            maximumFractionDigits: 0,
                          }).format(lead.priceMin)}{" "}
                          -{" "}
                          {new Intl.NumberFormat("en-EG", {
                            style: "currency",
                            currency: "EGP",
                            maximumFractionDigits: 0,
                          }).format(lead.priceMax)}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                          {lead.weeksMin}–{lead.weeksMax} Weeks Delivery
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <div className="flex justify-end gap-2">
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp Message"
                            className="p-2 rounded-sm border border-green-500/20 bg-green-500/5 text-green-500 hover:bg-green-500 hover:text-white transition-all duration-200"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <ViewDetailsButton lead={lead} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-foreground/10" />
                      <p className="text-foreground/30 font-medium">
                        No leads found in the database.
                      </p>
                      <p className="text-xs text-foreground/20">
                        Check back later or test the transparency flow yourself.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4">
          <Link href={`/leads?page=${Math.max(page - 1, 1)}`}>
            <Button variant="outline" size="sm" disabled={page === 1}>
              Previous
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground mx-4">
            Page {page} of {totalPages}
          </span>
          <Link href={`/leads?page=${Math.min(page + 1, totalPages)}`}>
            <Button variant="outline" size="sm" disabled={page === totalPages}>
              Next
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
