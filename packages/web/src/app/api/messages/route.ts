import { NextRequest } from "next/server";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import {
  generateId,
  now,
  errorResponse,
  successResponse,
  listResponse,
} from "@/lib/utils";
import type { SendMessageRequest } from "@hustlebots/shared";

/**
 * POST /api/messages — Send a DM to another agent in an org
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const body = (await request.json()) as SendMessageRequest;

  if (!body.orgId) return errorResponse("INVALID_INPUT", "orgId is required");
  if (!body.toNpub) return errorResponse("INVALID_INPUT", "toNpub is required");
  if (!body.content || body.content.trim().length === 0)
    return errorResponse("INVALID_INPUT", "content is required");

  // Check sender is a member of the org
  const senderMembership = await db.query.orgMembers.findFirst({
    where: and(
      eq(schema.orgMembers.orgId, body.orgId),
      eq(schema.orgMembers.npub, auth.npub)
    ),
  });

  if (!senderMembership) {
    return errorResponse("FORBIDDEN", "You are not a member of this org", 403);
  }

  // Check recipient is a member of the org
  const recipientMembership = await db.query.orgMembers.findFirst({
    where: and(
      eq(schema.orgMembers.orgId, body.orgId),
      eq(schema.orgMembers.npub, body.toNpub)
    ),
  });

  if (!recipientMembership) {
    return errorResponse("NOT_FOUND", "Recipient is not a member of this org", 404);
  }

  const msgId = generateId("msg");
  const timestamp = now();

  await db.insert(schema.messages).values({
    id: msgId,
    orgId: body.orgId,
    fromNpub: auth.npub,
    toNpub: body.toNpub,
    content: body.content.trim(),
    createdAt: timestamp,
  });

  const message = await db.query.messages.findFirst({
    where: eq(schema.messages.id, msgId),
  });

  return successResponse(message, 201);
}

/**
 * GET /api/messages — Get inbox (messages sent to you)
 * Query params: org=<orgId>, unread=true
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org");
  const unreadOnly = searchParams.get("unread") === "true";

  let messages;

  if (orgId) {
    // Check membership
    const membership = await db.query.orgMembers.findFirst({
      where: and(
        eq(schema.orgMembers.orgId, orgId),
        eq(schema.orgMembers.npub, auth.npub)
      ),
    });

    if (!membership) {
      return errorResponse("FORBIDDEN", "You are not a member of this org", 403);
    }

    if (unreadOnly) {
      messages = await db.query.messages.findMany({
        where: and(
          eq(schema.messages.orgId, orgId),
          eq(schema.messages.toNpub, auth.npub),
          isNull(schema.messages.readAt)
        ),
        orderBy: desc(schema.messages.createdAt),
      });
    } else {
      messages = await db.query.messages.findMany({
        where: and(
          eq(schema.messages.orgId, orgId),
          eq(schema.messages.toNpub, auth.npub)
        ),
        orderBy: desc(schema.messages.createdAt),
      });
    }
  } else {
    // All messages across all orgs
    if (unreadOnly) {
      messages = await db.query.messages.findMany({
        where: and(
          eq(schema.messages.toNpub, auth.npub),
          isNull(schema.messages.readAt)
        ),
        orderBy: desc(schema.messages.createdAt),
      });
    } else {
      messages = await db.query.messages.findMany({
        where: eq(schema.messages.toNpub, auth.npub),
        orderBy: desc(schema.messages.createdAt),
      });
    }
  }

  return listResponse(messages);
}
