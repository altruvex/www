import "dotenv-flow/config";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@repo/database";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_SECRET;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_SECRET must be set to seed the admin user.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "SUPERADMIN", emailVerified: true },
    create: {
      email,
      name: "Ali",
      passwordHash,
      role: "SUPERADMIN",
      emailVerified: true,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: { providerId: "credential", accountId: user.id },
    },
    update: { password: passwordHash },
    create: {
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: passwordHash,
    },
  });

  console.log(`Seeded admin user ${email} (${user.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
