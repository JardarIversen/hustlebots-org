import { NextRequest } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withOrgRole, withOrgMember } from "@/lib/auth";
import { generateId, now, errorResponse, successResponse } from "@/lib/utils";
import {
  createInvoice,
  payInvoice,
  isTestMode,
  testMode,
} from "@/lib/nwc";

/**
 * POST /api/payroll — Trigger payroll run for an org (owner only)
 */
export async function POST(request: NextRequest) {
  const body = await request.clone().json();
  const orgId = body.orgId;

  if (!orgId) return errorResponse("INVALID_INPUT", "orgId is required");

  const auth = await withOrgRole(request, orgId, ["owner"]);
  if (auth instanceof Response) return auth;

  const org = await db.query.orgs.findFirst({
    where: eq(schema.orgs.id, orgId),
  });

  if (!org) return errorResponse("NOT_FOUND", "Org not found", 404);

  if (!org.nwcUrl && !isTestMode()) {
    return errorResponse(
      "NO_WALLET",
      "Org has no wallet connected. Use 'hustlebots org fund' to connect one."
    );
  }

  const activeContracts = await db.query.contracts.findMany({
    where: and(
      eq(schema.contracts.orgId, orgId),
      eq(schema.contracts.status, "active")
    ),
  });

  if (activeContracts.length === 0) {
    return successResponse({ message: "No active contracts to pay", payments: [] });
  }

  const results = [];
  const timestamp = now();

  for (const contract of activeContracts) {
    const paymentId = generateId("pay");

    try {
      if (isTestMode()) {
        const result = await testMode.payInvoice("test");
        await db.insert(schema.payments).values({
          id: paymentId,
          contractId: contract.id,
          amountSats: contract.paySats,
          status: "paid",
          paymentHash: result.paymentHash,
          paidAt: timestamp,
          createdAt: timestamp,
        });
        results.push({
          contractId: contract.id,
          employee: contract.employeeNpub,
          amount: contract.paySats,
          status: "paid",
          testMode: true,
        });
      } else {
        const invoice = await createInvoice(
          org.nwcUrl!,
          contract.paySats,
          `Hustlebots payroll: ${contract.role} @ ${org.name}`
        );
        const result = await payInvoice(org.nwcUrl!, invoice);
        await db.insert(schema.payments).values({
          id: paymentId,
          contractId: contract.id,
          amountSats: contract.paySats,
          status: "paid",
          paymentHash: result.paymentHash,
          paidAt: timestamp,
          createdAt: timestamp,
        });
        results.push({
          contractId: contract.id,
          employee: contract.employeeNpub,
          amount: contract.paySats,
          status: "paid",
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Payment failed";
      await db.insert(schema.payments).values({
        id: paymentId,
        contractId: contract.id,
        amountSats: contract.paySats,
        status: "failed",
        error: errorMsg,
        createdAt: timestamp,
      });
      results.push({
        contractId: contract.id,
        employee: contract.employeeNpub,
        amount: contract.paySats,
        status: "failed",
        error: errorMsg,
      });
    }
  }

  return successResponse({
    message: `Payroll complete: ${results.filter((r) => r.status === "paid").length}/${results.length} payments succeeded`,
    payments: results,
  });
}

/**
 * GET /api/payroll — Get payroll status and history
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org");

  if (!orgId) return errorResponse("INVALID_INPUT", "org query param is required");

  const auth = await withOrgMember(request, orgId);
  if (auth instanceof Response) return auth;

  const activeContracts = await db.query.contracts.findMany({
    where: and(
      eq(schema.contracts.orgId, orgId),
      eq(schema.contracts.status, "active")
    ),
  });

  const totalWeeklyPayroll = activeContracts.reduce((sum, c) => sum + c.paySats, 0);

  // Get recent payments across all contracts in this org
  const allPayments: (typeof schema.payments.$inferSelect)[] = [];
  for (const contract of activeContracts) {
    const contractPayments = await db.query.payments.findMany({
      where: eq(schema.payments.contractId, contract.id),
      orderBy: desc(schema.payments.createdAt),
    });
    allPayments.push(...contractPayments);
  }

  const recentPayments = allPayments
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);

  return successResponse({
    activeContracts: activeContracts.length,
    totalWeeklyPayroll,
    recentPayments,
  });
}
