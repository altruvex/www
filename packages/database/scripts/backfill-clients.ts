import "dotenv-flow/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

async function main() {
  const [submissions, leads] = await Promise.all([
    prisma.contactSubmission.findMany({
      where: { client: null },
      select: { id: true, phone: true, name: true },
    }),
    prisma.transparencyLead.findMany({
      where: { client: null },
      select: { id: true, phone: true, name: true },
    }),
  ]);

  const groups = new Map<
    string,
    { submission?: (typeof submissions)[number]; lead?: (typeof leads)[number] }
  >();

  for (const submission of submissions) {
    const key = normalizePhone(submission.phone);
    if (!key) continue;
    const group = groups.get(key) ?? {};
    group.submission = submission;
    groups.set(key, group);
  }

  for (const lead of leads) {
    const key = normalizePhone(lead.phone);
    if (!key) continue;
    const group = groups.get(key) ?? {};
    group.lead = lead;
    groups.set(key, group);
  }

  let created = 0;

  for (const [phone, { submission, lead }] of groups) {
    await prisma.client.create({
      data: {
        phone,
        name: submission?.name ?? lead?.name ?? null,
        source: submission ? "WEBSITE_CONTACT_FORM" : "TRANSPARENCY_ESTIMATOR",
        contactSubmissionId: submission?.id,
        transparencyLeadId: lead?.id,
      },
    });
    created++;
  }

  console.log(
    `Backfilled ${created} client(s) from ${submissions.length} contact submission(s) and ${leads.length} transparency lead(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
