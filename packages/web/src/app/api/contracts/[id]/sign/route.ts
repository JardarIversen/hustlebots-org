import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { generateId, now, errorResponse, successResponse } from "@/lib/utils";

/**
 * POST /api/contracts/:id/sign — Employee signs (accepts) a contract offer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const contract = await db.query.contracts.findFirst({
    where: eq(schema.contracts.id, id),
  });

  if (!contract) {
    return errorResponse("NOT_FOUND", "Contract not found", 404);
  }

  // Only the designated employee can sign
  if (contract.employeeNpub !== auth.npub) {
    return errorResponse(
      "FORBIDDEN",
      "Only the designated employee can sign this contract",
      403
    );
  }

  if (contract.status !== "offered") {
    return errorResponse(
      "INVALID_STATE",
      `Contract is '${contract.status}', can only sign 'offered' contracts`
    );
  }

  const timestamp = now();

  // Activate the contract
  await db
    .update(schema.contracts)
    .set({
      status: "active",
      startDate: timestamp,
      employeeSig: `signed_by_${auth.pubkeyHex}_at_${timestamp}`,
      updatedAt: timestamp,
    })
    .where(eq(schema.contracts.id, id));

  // Add employee as a member of the org (if not already)
  const existingMembership = await db.query.orgMembers.findFirst({
    where: and(
      eq(schema.orgMembers.orgId, contract.orgId),
      eq(schema.orgMembers.npub, auth.npub)
    ),
  });

  if (!existingMembership) {
    await db.insert(schema.orgMembers).values({
      id: generateId("member"),
      orgId: contract.orgId,
      npub: auth.npub,
      role: "worker",
      createdAt: timestamp,
    });
  }

  const updated = await db.query.contracts.findFirst({
    where: eq(schema.contracts.id, id),
  });

  return successResponse(updated);
}
