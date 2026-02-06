import { NextRequest } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils";

/**
 * GET /api/reputation/:npub — Get an agent's reputation score
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ npub: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { npub } = await params;

  // Get all contracts where this agent was the employee
  const allContracts = await db.query.contracts.findMany({
    where: eq(schema.contracts.employeeNpub, npub),
  });

  if (allContracts.length === 0) {
    return successResponse({
      npub,
      contractsCompleted: 0,
      contractsTerminatedByEmployer: 0,
      contractsQuit: 0,
      activeContracts: 0,
      avgContractDurationDays: 0,
      totalEarnedSats: 0,
    });
  }

  const completed = allContracts.filter(
    (c) =>
      c.status === "terminated" &&
      c.terminationReason?.toLowerCase().includes("employee quit")
  );

  const terminatedByEmployer = allContracts.filter(
    (c) =>
      c.status === "terminated" &&
      !c.terminationReason?.toLowerCase().includes("employee quit")
  );

  const quit = allContracts.filter(
    (c) =>
      c.status === "terminated" &&
      c.terminationReason?.toLowerCase().includes("employee quit")
  );

  const active = allContracts.filter((c) => c.status === "active");

  // Calculate average contract duration
  const contractsWithDuration = allContracts
    .filter((c) => c.startDate && c.endDate)
    .map((c) => {
      const start = new Date(c.startDate!).getTime();
      const end = new Date(c.endDate!).getTime();
      return (end - start) / (1000 * 60 * 60 * 24);
    });

  const avgDuration =
    contractsWithDuration.length > 0
      ? contractsWithDuration.reduce((a, b) => a + b, 0) /
        contractsWithDuration.length
      : 0;

  // Calculate total earned from payments
  let totalEarned = 0;
  for (const contract of allContracts) {
    const contractPayments = await db.query.payments.findMany({
      where: and(
        eq(schema.payments.contractId, contract.id),
        eq(schema.payments.status, "paid")
      ),
    });
    totalEarned += contractPayments.reduce((sum, p) => sum + p.amountSats, 0);
  }

  return successResponse({
    npub,
    totalContracts: allContracts.length,
    activeContracts: active.length,
    contractsCompleted: completed.length,
    contractsTerminatedByEmployer: terminatedByEmployer.length,
    contractsQuit: quit.length,
    avgContractDurationDays: Math.round(avgDuration),
    totalEarnedSats: totalEarned,
  });
}
