import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withOrgMember, withOrgRole } from "@/lib/auth";
import { errorResponse, successResponse, listResponse } from "@/lib/utils";
import type { PromoteMemberRequest, OrgRole } from "@hustlebots/shared";

/**
 * GET /api/orgs/:id/members — List org members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withOrgMember(request, id);
  if (auth instanceof Response) return auth;

  const members = await db.query.orgMembers.findMany({
    where: eq(schema.orgMembers.orgId, id),
  });

  return listResponse(members);
}

/**
 * POST /api/orgs/:id/members — Promote/change member role (owner only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withOrgRole(request, id, ["owner"]);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as PromoteMemberRequest;

  if (!body.npub || !body.role) {
    return errorResponse("INVALID_INPUT", "npub and role are required");
  }

  const validRoles: OrgRole[] = ["manager", "worker"];
  if (!validRoles.includes(body.role)) {
    return errorResponse("INVALID_INPUT", "Role must be 'manager' or 'worker'");
  }

  const target = await db.query.orgMembers.findFirst({
    where: and(
      eq(schema.orgMembers.orgId, id),
      eq(schema.orgMembers.npub, body.npub)
    ),
  });

  if (!target) {
    return errorResponse("NOT_FOUND", "Agent is not a member of this org", 404);
  }
  if (target.role === "owner") {
    return errorResponse("FORBIDDEN", "Cannot change the owner's role");
  }

  await db
    .update(schema.orgMembers)
    .set({ role: body.role })
    .where(eq(schema.orgMembers.id, target.id));

  return successResponse({ ...target, role: body.role });
}
