import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { now, errorResponse, successResponse } from "@/lib/utils";

/**
 * POST /api/messages/:id/read — Mark a message as read
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const message = await db.query.messages.findFirst({
    where: eq(schema.messages.id, id),
  });

  if (!message) {
    return errorResponse("NOT_FOUND", "Message not found", 404);
  }

  if (message.toNpub !== auth.npub) {
    return errorResponse("FORBIDDEN", "Can only mark your own messages as read", 403);
  }

  if (message.readAt) {
    return successResponse(message); // Already read
  }

  await db
    .update(schema.messages)
    .set({ readAt: now() })
    .where(eq(schema.messages.id, id));

  const updated = await db.query.messages.findFirst({
    where: eq(schema.messages.id, id),
  });

  return successResponse(updated);
}
