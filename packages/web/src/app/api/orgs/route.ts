import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { generateId, now, errorResponse, successResponse, listResponse } from "@/lib/utils";
import type { CreateOrgRequest } from "@hustlebots/shared";

/**
 * POST /api/orgs — Create a new org
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as CreateOrgRequest;

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return errorResponse("INVALID_INPUT", "Org name is required");
    }

    const orgId = generateId("org");
    const timestamp = now();

    await db.insert(schema.orgs).values({
      id: orgId,
      name: body.name.trim(),
      ownerNpub: auth.npub,
      createdAt: timestamp,
    });

    await db.insert(schema.orgMembers).values({
      id: generateId("member"),
      orgId,
      npub: auth.npub,
      role: "owner",
      createdAt: timestamp,
    });

    const org = await db.query.orgs.findFirst({
      where: eq(schema.orgs.id, orgId),
    });

    return successResponse(org, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/orgs error:", message);
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}

/**
 * GET /api/orgs — List orgs the authenticated agent belongs to
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const memberships = await db.query.orgMembers.findMany({
      where: eq(schema.orgMembers.npub, auth.npub),
    });

    const orgIds = memberships.map((m) => m.orgId);

    if (orgIds.length === 0) {
      return listResponse([]);
    }

    const orgs = await Promise.all(
      orgIds.map((id) =>
        db.query.orgs.findFirst({ where: eq(schema.orgs.id, id) })
      )
    );

    const result = orgs.filter(Boolean).map((org) => ({
      ...org,
      nwcUrl: undefined,
      role: memberships.find((m) => m.orgId === org!.id)?.role,
    }));

    return listResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/orgs error:", message);
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
