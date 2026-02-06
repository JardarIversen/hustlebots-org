import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils";

/**
 * GET /api/contracts/:id — Get contract details
 */
export async function GET(
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

  // Only employer, employee, or org members can view
  if (
    contract.employerNpub !== auth.npub &&
    contract.employeeNpub !== auth.npub
  ) {
    // Check if requester is an org member
    const membership = await db.query.orgMembers.findFirst({
      where: (m, { and, eq: e }) =>
        and(e(m.orgId, contract.orgId), e(m.npub, auth.npub)),
    });

    if (!membership) {
      return errorResponse("FORBIDDEN", "Access denied", 403);
    }
  }

  return successResponse(contract);
}
