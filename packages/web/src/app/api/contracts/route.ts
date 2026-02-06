import { NextRequest } from "next/server";
import { eq, and, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import {
  generateId,
  now,
  errorResponse,
  successResponse,
  listResponse,
} from "@/lib/utils";
import type { CreateContractRequest } from "@hustlebots/shared";
import { DEFAULT_NOTICE_DAYS } from "@hustlebots/shared";

/**
 * POST /api/contracts — Create a contract offer (owner or manager)
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const body = (await request.json()) as CreateContractRequest;

  // Validate input
  if (!body.orgId) return errorResponse("INVALID_INPUT", "orgId is required");
  if (!body.employeeNpub)
    return errorResponse("INVALID_INPUT", "employeeNpub is required");
  if (!body.role) return errorResponse("INVALID_INPUT", "role is required");
  if (!body.paySats || body.paySats <= 0)
    return errorResponse("INVALID_INPUT", "paySats must be a positive number");
  if (!body.duties) return errorResponse("INVALID_INPUT", "duties is required");

  // Check the requester is owner or manager of the org
  const membership = await db.query.orgMembers.findFirst({
    where: and(
      eq(schema.orgMembers.orgId, body.orgId),
      eq(schema.orgMembers.npub, auth.npub)
    ),
  });

  if (!membership || membership.role === "worker") {
    return errorResponse(
      "FORBIDDEN",
      "Only org owners and managers can create contracts",
      403
    );
  }

  // Check employee doesn't already have an active contract with this org
  const existingContract = await db.query.contracts.findFirst({
    where: and(
      eq(schema.contracts.orgId, body.orgId),
      eq(schema.contracts.employeeNpub, body.employeeNpub),
      or(
        eq(schema.contracts.status, "offered"),
        eq(schema.contracts.status, "active")
      )
    ),
  });

  if (existingContract) {
    return errorResponse(
      "CONFLICT",
      "Employee already has an active or pending contract with this org",
      409
    );
  }

  const contractId = generateId("contract");
  const timestamp = now();

  await db.insert(schema.contracts).values({
    id: contractId,
    orgId: body.orgId,
    employerNpub: auth.npub,
    employeeNpub: body.employeeNpub,
    role: body.role,
    paySats: body.paySats,
    payInterval: "weekly",
    duties: body.duties,
    noticeDays: body.noticeDays ?? DEFAULT_NOTICE_DAYS,
    status: "offered",
    hiredByNpub: auth.npub,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const contract = await db.query.contracts.findFirst({
    where: eq(schema.contracts.id, contractId),
  });

  return successResponse(contract, 201);
}

/**
 * GET /api/contracts — List contracts
 * Query params: org=<orgId> or employee=<npub> or mine=true
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org");
  const employeeNpub = searchParams.get("employee");

  if (orgId) {
    // Check requester is a member of the org
    const membership = await db.query.orgMembers.findFirst({
      where: and(
        eq(schema.orgMembers.orgId, orgId),
        eq(schema.orgMembers.npub, auth.npub)
      ),
    });

    if (!membership) {
      return errorResponse("FORBIDDEN", "You are not a member of this org", 403);
    }

    const contracts = await db.query.contracts.findMany({
      where: eq(schema.contracts.orgId, orgId),
    });

    return listResponse(contracts);
  }

  if (employeeNpub) {
    // Can only view own contracts unless you're an org owner/manager
    if (employeeNpub !== auth.npub) {
      return errorResponse("FORBIDDEN", "Can only view your own contracts", 403);
    }
  }

  // Default: return all contracts where the requester is employer or employee
  const contracts = await db.query.contracts.findMany({
    where: or(
      eq(schema.contracts.employerNpub, auth.npub),
      eq(schema.contracts.employeeNpub, auth.npub)
    ),
  });

  return listResponse(contracts);
}
