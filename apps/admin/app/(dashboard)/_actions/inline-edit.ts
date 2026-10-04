"use server";

import { prisma } from "@repo/database";
import { statusOf } from "@/lib/status";
import { setProjectPhase, setProjectStatus } from "./records";

export type InlineEditResult = { ok: boolean; message: string };

function refusal(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : "";
  if (message.startsWith("Not permitted:")) {
    const [, action = "change", subject = "record"] = message
      .replace("Not permitted:", "")
      .trim()
      .split(" ");
    return `Your role cannot ${action} a ${subject}. Nothing was changed.`;
  }
  return message ? `${message} Nothing was changed.` : fallback;
}

export async function changeProjectPhase(projectId: string, phase: string): Promise<InlineEditResult> {
  try {
    const before = await prisma.project.findUnique({
      where: { id: projectId },
      select: { actualLaunchDate: true },
    });
    if (!before) return { ok: false, message: "That project no longer exists." };
    await setProjectPhase(projectId, phase);
    const label = statusOf("projectPhase", phase).label;
    if (phase !== "LAUNCHED") return { ok: true, message: `Moved to ${label}.` };
    return {
      ok: true,
      message: before.actualLaunchDate
        ? `Moved to ${label}. The launch date already recorded stands.`
        : `Moved to ${label}. Launch date recorded as today.`,
    };
  } catch (err) {
    return { ok: false, message: refusal(err, "The phase did not change.") };
  }
}

export async function changeProjectHold(
  projectId: string,
  status: "ACTIVE" | "ON_HOLD",
): Promise<InlineEditResult> {
  if (status !== "ACTIVE" && status !== "ON_HOLD") {
    return { ok: false, message: "Cancel or close a project from its page." };
  }
  try {
    const before = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (!before) return { ok: false, message: "That project no longer exists." };
    if (before.status !== "ACTIVE" && before.status !== "ON_HOLD") {
      return { ok: false, message: "This project is closed or cancelled — reopen it from its page." };
    }
    if (before.status === status) return { ok: true, message: "Nothing changed." };
    await setProjectStatus(projectId, status);
    return { ok: true, message: status === "ON_HOLD" ? "Project put on hold." : "Project resumed." };
  } catch (err) {
    return { ok: false, message: refusal(err, "The status did not change.") };
  }
}
