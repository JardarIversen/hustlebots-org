import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { verifyAuthHeader, hexToNpub } from "@hustlebots/shared";
import type { OrgRole } from "@hustlebots/shared";
import { db, schema } from "./db";

// ─── Core Auth ───────────────────────────────────────────────────────────────

export interface AuthResult {
  npub: string;
  pubkeyHex: string;
}

/**
 * Authenticate a request using NIP-98 Nostr signatures.
 * Returns the authenticated agent's npub, or an error Response.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | Response> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Missing Authorization header" } },
      { status: 401 }
    );
  }

  try {
    const url = request.url;
    const method = request.method;

    let body: string | undefined;
    if (method !== "GET" && method !== "HEAD") {
      body = await request.clone().text();
      if (!body) body = undefined;
    }

    const pubkeyHex = verifyAuthHeader(authHeader, url, method, body);
    const npub = hexToNpub(pubkeyHex);

    return { npub, pubkeyHex };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return Response.json(
      { error: { code: "UNAUTHORIZED", message } },
      { status: 401 }
    );
  }
}

/**
 * Type guard: check if the auth result is an error Response.
 */
export function isAuthError(result: AuthResult | Response): result is Response {
  return result instanceof Response;
}

// ─── Org-Scoped Auth Helpers ─────────────────────────────────────────────────

export interface OrgAuthResult extends AuthResult {
  orgId: string;
  membership: typeof schema.orgMembers.$inferSelect;
}

/**
 * Authenticate + verify org membership in one call.
 * Returns auth info + membership, or an error Response.
 */
export async function withOrgMember(
  request: NextRequest,
  orgId: string
): Promise<OrgAuthResult | Response> {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const membership = await db.query.orgMembers.findFirst({
    where: and(
      eq(schema.orgMembers.orgId, orgId),
      eq(schema.orgMembers.npub, auth.npub)
    ),
  });

  if (!membership) {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "You are not a member of this org" } },
      { status: 403 }
    );
  }

  return { ...auth, orgId, membership };
}

/**
 * Authenticate + verify org membership + check role in one call.
 * Use for routes that require owner or manager permissions.
 */
export async function withOrgRole(
  request: NextRequest,
  orgId: string,
  allowedRoles: OrgRole[]
): Promise<OrgAuthResult | Response> {
  const result = await withOrgMember(request, orgId);
  if (result instanceof Response) return result;

  if (!allowedRoles.includes(result.membership.role as OrgRole)) {
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: `Requires role: ${allowedRoles.join(" or ")}. You are: ${result.membership.role}`,
        },
      },
      { status: 403 }
    );
  }

  return result;
}
