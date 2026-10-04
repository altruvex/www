"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/database";

import { authorize } from "@/lib/authorize";
import { recordActivity, recordChange, userActor } from "@/lib/activity-log";

export type EngineeringResult = { ok: true; message: string } | { ok: false; message: string };

const linkSchema = z.object({
  logId: z.string().min(1),
  incidentId: z.string().min(1).nullable(),
});

const incidentLabel = (incident: { number: number; product: { name: string } }) =>
  `${incident.product.name} #${incident.number}`;

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

const INCIDENT_DETAIL_MAX_LENGTH = 5000;

const incidentTextSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "An incident needs a title.").max(300, "Keep the title under 300 characters."),
  detail: z
    .string()
    .trim()
    .max(
      INCIDENT_DETAIL_MAX_LENGTH,
      `Keep the detail under ${INCIDENT_DETAIL_MAX_LENGTH.toLocaleString("en-US")} characters.`,
    )
    .nullable()
    .transform((value) => (value ? value : null)),
});

export async function updateIncidentText(input: {
  id: string;
  title: string;
  detail: string | null;
}): Promise<EngineeringResult> {
  let session;
  try {
    session = await authorize("edit", "incident");
  } catch {
    return { ok: false, message: "Your role cannot edit incidents." };
  }

  const parsed = incidentTextSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "That request is incomplete." };
  }
  const { id, title, detail } = parsed.data;

  try {
    const incident = await prisma.incident.findUnique({
      where: { id },
      select: { id: true, number: true, title: true, detail: true, product: { select: { name: true } } },
    });
    if (!incident) return { ok: false, message: "That incident no longer exists." };
    if (incident.title === title && (incident.detail ?? null) === detail) {
      return { ok: true, message: "Nothing changed." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.incident.update({ where: { id }, data: { title, detail } });
      await recordChange(
        {
          action: "incident.changed",
          actor: userActor(session),
          entityType: "incident",
          entityId: id,
          entityLabel: incidentLabel(incident),
          summary: `Edited the wording of ${incidentLabel(incident)}`,
          before: { title: incident.title, detail: incident.detail },
          after: { title, detail },
        },
        tx,
      );
    });

    revalidatePath("/incidents");
    revalidatePath(`/incidents/${id}`);
    return { ok: true, message: "Incident updated." };
  } catch (error) {
    console.error("updateIncidentText failed", error);
    return { ok: false, message: "The incident could not be saved. Nothing was changed." };
  }
}
