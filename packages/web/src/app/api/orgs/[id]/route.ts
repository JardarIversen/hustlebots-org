import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withOrgMember } from "@/lib/auth";
import { successResponse } from "@/lib/utils";

/**
 * GET /api/orgs/:id — Get org details (members only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withOrgMember(request, id);
  if (auth instanceof Response) return auth;

  const org = await db.query.orgs.findFirst({
    where: eq(schema.orgs.id, id),
  });

  return successResponse({
    ...org,
    nwcUrl: auth.membership.role === "owner" ? org?.nwcUrl : undefined,
    myRole: auth.membership.role,
  });
}
