import { prisma } from "@repo/database";
import { format } from "date-fns";
import { Phone, MessageCircle, Users } from "lucide-react";
import { ExportCsvButton, ViewDetailsButton } from "./client-buttons";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
          <h1 className="text-3xl font-normal text-primary mb-2">
            Transparency Leads
          </h1>
          <p className="text-sm text-primary/50">
            Manage and contact all prospective clients who used the transparency
            flow.
          </p>
        </div>
        <div className="flex gap-3">
          <ExportCsvButton leads={leads} />
        </div>
      </div>

      <div className="rounded-sm border border-foreground/10 bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-foreground/5 border-b border-foreground/10">
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/40">
                  Timestamp
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/40">
                  Contact Info
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/40">
                  Project Summary
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/40">
                  Transparency Range
                </th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/40 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-foreground/2 transition-colors group"
                  >
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col">
                        <span className="text-sm text-primary">
                          {format(lead.createdAt, "MMM d, yyyy")}
                        </span>
                        <span className="text-[10px] font-mono text-primary/30">
                          {format(lead.createdAt, "HH:mm:ss")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-primary">
                          {lead.name || "Anonymous Client"}
                        </span>
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-xs font-mono text-primary/60 hover:text-primary flex items-center gap-1.5"
                        >
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                          <span className="px-2 py-0.5 rounded-[2px] bg-foreground/5 text-primary/60 text-[10px] font-mono uppercase tracking-wider border border-foreground/5">
                            {lead.projectType}
                          </span>
                          <span className="px-2 py-0.5 rounded-[2px] bg-foreground/5 text-primary/60 text-[10px] font-mono uppercase tracking-wider border border-foreground/5">
                            {lead.complexity}
                          </span>
                        </div>
                        <span className="text-xs text-primary/40">
                          Timeline:{" "}
                          <span className="text-primary/60">
                            {lead.timeline}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-primary">
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
                        <span className="text-[10px] font-mono text-primary/40 uppercase tracking-wider">
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
                      <Users className="h-8 w-8 text-primary/10" />
                      <p className="text-primary/30 font-medium">
                        No leads found in the database.
                      </p>
                      <p className="text-xs text-primary/20">
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
