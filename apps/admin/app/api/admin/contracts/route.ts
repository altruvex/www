import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { recordActivity, userActor } from "@/lib/activity-log";
import { requireAdminSession } from "@/lib/require-admin";
import { buildContractDocx } from "@/lib/contract-builder";
import { upload } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminSession(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const contracts = await prisma.contract.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, contracts });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching contracts:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to fetch contracts" },
      { status: 500 },
    );
  }
}

const createContractSchema = z.object({
  proposalId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { proposalId } = createContractSchema.parse(body);

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { client: true, contract: true },
    });

    if (!proposal) {
      return NextResponse.json(
        { success: false, message: "Proposal not found" },
        { status: 404 },
      );
    }

    if (proposal.contract) {
      return NextResponse.json(
        { success: false, message: "This proposal already has a contract" },
        { status: 409 },
      );
    }

    const contract = await prisma.contract.create({
      data: {
        proposalId: proposal.id,
        clientId: proposal.clientId,
        signToken: randomBytes(24).toString("hex"),
      },
    });

    try {
      const docxBuffer = await buildContractDocx({ ...contract, proposal, client: proposal.client });
      const fileUrl = await upload(
        docxBuffer,
        `contracts/${contract.id}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );

      const updated = await prisma.contract.update({
        where: { id: contract.id },
        data: { fileUrl },
      });

      await recordActivity({
        action: "contract.created",
        actor: userActor(session),
        entityType: "contract",
        entityId: contract.id,
        entityLabel: proposal.client.name || proposal.client.company,
        summary: `Generated a contract for ${proposal.client.name || proposal.client.company || "a client"}`,
        metadata: { clientId: proposal.clientId, proposalId: proposal.id },
      });

      return NextResponse.json({ success: true, contract: updated }, { status: 201 });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error generating contract file:", error);
      }
      return NextResponse.json(
        {
          success: false,
          message: "Contract was created but the document failed to generate.",
          contract,
        },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error creating contract:", error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create contract" },
      { status: 500 },
    );
  }
}
