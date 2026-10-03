"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/database";

import { authorize } from "@/lib/authorize";
import { recordActivity, userActor } from "@/lib/activity-log";

/**
 * Server actions for the engineering screens.
 *
 * Builds, deployments and log lines are written by CI alone. The one write the
 * admin app makes on a log line is the operator's judgement that it is evidence
 * for an incident — `LogEntry.incidentId`, nothing else — and that judgement is
 * recorded on the incident, because the incident is the record people read.
 */

export type EngineeringResult = { ok: true; message: string } | { ok: false; message: string };

const linkSchema = z.object({
  logId: z.string().min(1),
  incidentId: z.string().min(1).nullable(),
});

const incidentLabel = (incident: { number: number; product: { name: string } }) =>
  `${incident.product.name} #${incident.number}`;

/**
 * Links a log line to an incident of the same product, or clears the link
 * (`incidentId: null`). Moving a line from one incident to another records the
 * unlink on the old incident and the link on the new one.
 */
export async function linkLogToIncident(input: {
  logId: string;
  incidentId: string | null;
}): Promise<EngineeringResult> {
  let session;
  try {
    session = await authorize("edit", "incident");
  } catch {
    return { ok: false, message: "Your role cannot change incident evidence." };
  }

  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That request is incomplete." };
  const { logId, incidentId } = parsed.data;

  try {
    const log = await prisma.logEntry.findUnique({
      where: { id: logId },
      select: {
        id: true,
        productId: true,
        message: true,
        level: true,
        incidentId: true,
        incident: {
          select: { id: true, number: true, title: true, product: { select: { name: true } } },
        },
      },
    });
    if (!log) return { ok: false, message: "That log line no longer exists." };

    if (log.incidentId === incidentId) {
      return {
        ok: false,
        message: incidentId
          ? "That line is already linked to this incident."
          : "That line is not linked to an incident.",
      };
    }

    const target = incidentId
      ? await prisma.incident.findUnique({
          where: { id: incidentId },
          select: {
            id: true,
            number: true,
            title: true,
            productId: true,
            product: { select: { name: true } },
          },
        })
      : null;
    if (incidentId && !target) return { ok: false, message: "That incident no longer exists." };
    if (target && target.productId !== log.productId) {
      return {
        ok: false,
        message: "That incident is about a different product — a line can only be evidence for its own product.",
      };
    }

    await prisma.logEntry.update({ where: { id: log.id }, data: { incidentId } });

    const actor = userActor(session);
    const excerpt = log.message.length > 120 ? `${log.message.slice(0, 120)}…` : log.message;
    const metadata = { logId: log.id, level: log.level, productId: log.productId };

    if (log.incident) {
      await recordActivity({
        action: "incident.log_unlinked",
        actor,
        entityType: "incident",
        entityId: log.incident.id,
        entityLabel: incidentLabel(log.incident),
        summary: `Unlinked a ${log.level} log line from ${log.incident.title}`,
        before: { log: excerpt },
        after: { log: null },
        metadata: target ? { ...metadata, movedTo: target.id } : metadata,
      });
    }
    if (target) {
      await recordActivity({
        action: "incident.log_linked",
        actor,
        entityType: "incident",
        entityId: target.id,
        entityLabel: incidentLabel(target),
        summary: `Linked a ${log.level} log line to ${target.title}`,
        before: { log: null },
        after: { log: excerpt },
        metadata: log.incident ? { ...metadata, movedFrom: log.incident.id } : metadata,
      });
    }

    revalidatePath("/logs");
    if (log.incident) revalidatePath(`/incidents/${log.incident.id}`);
    if (target) revalidatePath(`/incidents/${target.id}`);

    return {
      ok: true,
      message: target
        ? `Linked to ${incidentLabel(target)}.`
        : `Unlinked from ${log.incident ? incidentLabel(log.incident) : "the incident"}.`,
    };
  } catch (error) {
    console.error("linkLogToIncident failed", error);
    return { ok: false, message: "The link could not be saved. Nothing was changed." };
  }
}
