import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withOrgRole } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils";
import type { FundOrgRequest } from "@hustlebots/shared";

/**
 * POST /api/orgs/:id/fund — Set the org's NWC wallet connection (owner only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withOrgRole(request, id, ["owner"]);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as FundOrgRequest;

  if (!body.nwcUrl || typeof body.nwcUrl !== "string") {
    return errorResponse("INVALID_INPUT", "NWC connection URL is required");
  }
  if (!body.nwcUrl.startsWith("nostr+walletconnect://")) {
    return errorResponse("INVALID_INPUT", "Invalid NWC URL format");
  }

  await db
    .update(schema.orgs)
    .set({ nwcUrl: body.nwcUrl })
    .where(eq(schema.orgs.id, id));

  return successResponse({ message: "Org wallet connected" });
}
