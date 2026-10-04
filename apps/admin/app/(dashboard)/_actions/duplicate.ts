"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@repo/database";

import { authorize } from "@/lib/authorize";
import { recordActivity, userActor } from "@/lib/activity-log";

export type DuplicateResult =
  | { ok: true; message: string; href: string }
  | { ok: false; message: string };

const NAME_MAX = 200;
const SLUG_MAX = 80;

async function freeSlug(source: string): Promise<string | null> {
  for (let n = 1; n <= 20; n++) {
    const suffix = n === 1 ? "-copy" : `-copy-${n}`;
    const base = source.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, "");
    const candidate = `${base}${suffix}`;
    const taken = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return null;
}

export async function duplicateProduct(productId: string): Promise<DuplicateResult> {
  let session;
  try {
    session = await authorize("create", "project");
  } catch {
    return { ok: false, message: "Your role cannot create products." };
  }

  const source = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      clientId: true,
      projectId: true,
      kind: true,
      framework: true,
      hostingProvider: true,
      client: { select: { name: true, company: true } },
    },
  });
  if (!source) return { ok: false, message: "That product no longer exists." };

  const slug = await freeSlug(source.slug);
  if (!slug) {
    return {
      ok: false,
      message: `Too many copies of "${source.slug}" already exist. Create the product by hand with its own slug.`,
    };
  }
  const name = `${source.name.slice(0, NAME_MAX - " (copy)".length)} (copy)`;

  let created;
  try {
    created = await prisma.product.create({
      data: {
        clientId: source.clientId,
        projectId: source.projectId,
        name,
        slug,
        kind: source.kind,
        status: "PLANNED",
        framework: source.framework,
        hostingProvider: source.hostingProvider,
      },
      select: { id: true, name: true, slug: true, kind: true, status: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "That slug was just taken. Try Duplicate again." };
    }
    console.error("duplicateProduct failed", error);
    return { ok: false, message: "The product could not be duplicated." };
  }

  await recordActivity({
    action: "product.created",
    actor: userActor(session),
    entityType: "product",
    entityId: created.id,
    entityLabel: created.name,
    summary: `Duplicated ${source.name} as ${created.name} for ${source.client.company || source.client.name || "a client"}`,
    after: { slug: created.slug, kind: created.kind, status: created.status },
    metadata: { sourceProductId: source.id, duplicated: true },
  });

  revalidatePath("/products");
  return {
    ok: true,
    message: `Created ${created.name}. Add its URLs, repository and ingest token — none were copied.`,
    href: `/products/${created.id}`,
  };
}
