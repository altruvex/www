"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/database";

import { authorize } from "@/lib/authorize";
import { diff, recordChange, userActor } from "@/lib/activity-log";
import { httpUrl } from "@/lib/http-url";

/**
 * Editing a project's own record: its name, the launch date promised to the
 * client, and where its environments live.
 *
 * Phase and status are not here on purpose. They are moves with side effects
 * (LAUNCHED stamps the launch date, COMPLETED goes through Close project) and
 * already have their own actions in records.ts and change-requests.ts — a
 * second writer for the same column is how the two would start disagreeing.
 */

export type ProjectActionResult =
  | { ok: true; changed: boolean }
  | { ok: false; message: string };

/** An empty input clears the field; anything else must be an http(s) URL. */
const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(httpUrl.nullable());

const editSchema = z.object({
  name: z.string().trim().min(1, "A project needs a name.").max(200, "Keep the name under 200 characters."),
  /** `YYYY-MM-DD` from a date input, or empty to clear. */
  targetLaunchDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Pick a valid date.")
    .transform((value) => (value === "" ? null : new Date(`${value}T00:00:00.000Z`))),
  stagingUrl: optionalUrl,
  liveUrl: optionalUrl,
});

export async function updateProjectDetails(
  projectId: string,
  input: z.input<typeof editSchema>,
): Promise<ProjectActionResult> {
  let session;
  try {
    session = await authorize("edit", "project");
  } catch {
    return { ok: false, message: "Your role cannot edit projects." };
  }

  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const message =
      field === "stagingUrl" || field === "liveUrl"
        ? `${field === "stagingUrl" ? "Staging" : "Live"} URL must start with http:// or https://.`
        : (issue?.message ?? "Some of that input is invalid.");
    return { ok: false, message };
  }
  const data = parsed.data;

  const before = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, targetLaunchDate: true, stagingUrl: true, liveUrl: true },
  });
  if (!before) return { ok: false, message: "That project no longer exists." };

  // Saving the form unchanged writes nothing and says so, rather than bumping
  // updatedAt and answering with a "saved" toast over a no-op.
  if (!diff(before, data)) return { ok: true, changed: false };

  try {
    await prisma.project.update({ where: { id: projectId }, data });
  } catch (error) {
    console.error("updateProjectDetails failed", error);
    return { ok: false, message: "The project could not be saved." };
  }

  // recordChange keeps only the fields that actually moved.
  await recordChange({
    action: "project.updated",
    actor: userActor(session),
    entityType: "project",
    entityId: projectId,
    entityLabel: data.name,
    summary:
      before.name !== data.name
        ? `Renamed "${before.name}" to "${data.name}"`
        : `Updated "${data.name}"`,
    before,
    after: data,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/tasks");
  return { ok: true, changed: true };
}
