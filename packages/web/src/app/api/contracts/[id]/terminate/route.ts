import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { now, errorResponse, successResponse } from "@/lib/utils";
import type { TerminateContractRequest } from "@hustlebots/shared";

/**
 * POST /api/contracts/:id/terminate — Quit (employee) or fire (employer/manager)
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

  if (contract.status !== "active" && contract.status !== "notice") {
    return errorResponse(
      "INVALID_STATE",
      `Contract is '${contract.status}', can only terminate 'active' or 'notice' contracts`
    );
  }

  const body = (await request.json()) as TerminateContractRequest;
  const timestamp = now();

  const isEmployee = contract.employeeNpub === auth.npub;
  const isEmployer = contract.employerNpub === auth.npub;

  // Check if the requester is an org manager who hired this person
  let isManager = false;
  if (!isEmployee && !isEmployer) {
    const membership = await db.query.orgMembers.findFirst({
      where: and(
        eq(schema.orgMembers.orgId, contract.orgId),
        eq(schema.orgMembers.npub, auth.npub)
      ),
    });
    isManager =
      membership?.role === "manager" || membership?.role === "owner";
  }

  if (!isEmployee && !isEmployer && !isManager) {
    return errorResponse("FORBIDDEN", "You cannot terminate this contract", 403);
  }

  // If contract has a notice period and is currently active, move to notice first
  if (contract.status === "active" && contract.noticeDays > 0) {
    const noticeEndDate = new Date();
    noticeEndDate.setDate(noticeEndDate.getDate() + contract.noticeDays);

    await db
      .update(schema.contracts)
      .set({
        status: "notice",
        endDate: noticeEndDate.toISOString(),
        terminationReason: body.reason || (isEmployee ? "Employee quit" : "Terminated by employer"),
        updatedAt: timestamp,
      })
      .where(eq(schema.contracts.id, id));

    const updated = await db.query.contracts.findFirst({
      where: eq(schema.contracts.id, id),
    });

    return successResponse({
      ...updated,
      message: `Notice period started. Contract ends ${noticeEndDate.toISOString()}`,
    });
  }

  // Immediate termination (no notice period, or already in notice)
  await db
    .update(schema.contracts)
    .set({
      status: "terminated",
      endDate: timestamp,
      terminationReason: body.reason || (isEmployee ? "Employee quit" : "Terminated by employer"),
      updatedAt: timestamp,
    })
    .where(eq(schema.contracts.id, id));

  const updated = await db.query.contracts.findFirst({
    where: eq(schema.contracts.id, id),
  });

  return successResponse(updated);
}
