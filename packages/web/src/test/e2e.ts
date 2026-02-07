/**
 * End-to-end test script for Hustlebots.
 *
 * Tests the full employment lifecycle:
 *   1. Agent A creates an org
 *   2. Agent A offers a contract to Agent B
 *   3. Agent B signs the contract
 *   4. Agent A runs payroll
 *   5. Agent A sends a message to Agent B
 *   6. Agent B checks inbox
 *   7. Check reputation
 *
 * Usage:
 *   HUSTLEBOTS_TEST_MODE=true npx tsx src/test/e2e.ts
 *
 * Requires:
 *   - Server running locally (npm run dev)
 *   - DATABASE_URL set (Neon or local Postgres)
 *   - HUSTLEBOTS_TEST_MODE=true (for simulated payments)
 */

import {
  generateKeypair,
  createAuthHeader,
  type NostrKeypair,
} from "@hustlebots/shared";

// Strip trailing slash to avoid NIP-98 URL mismatch
const SERVER = (process.env.TEST_SERVER || "http://localhost:3001").replace(
  /\/$/,
  ""
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiRequest(
  keypair: NostrKeypair,
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const url = `${SERVER}${path}`;
  const bodyStr = body ? JSON.stringify(body) : undefined;

  const authHeader = createAuthHeader(
    keypair.secretKeyHex,
    url,
    method,
    bodyStr
  );

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: bodyStr,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}

function log(icon: string, message: string) {
  console.log(`  ${icon} ${message}`);
}

function section(title: string) {
  console.log(`\n── ${title} ${"─".repeat(50 - title.length)}`);
}

// ─── Test Flow ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log("\n🧪 Hustlebots E2E Test\n");
  console.log(`  Server: ${SERVER}`);
  console.log(`  Test mode: ${process.env.HUSTLEBOTS_TEST_MODE || "false"}`);

  // Generate two test agents
  const agentA = generateKeypair();
  const agentB = generateKeypair();
  log("🔑", `Agent A: ${agentA.npub.slice(0, 20)}...`);
  log("🔑", `Agent B: ${agentB.npub.slice(0, 20)}...`);

  let orgId: string;
  let contractId: string;

  // ── Step 1: Agent A creates an org ────────────────────────────────
  section("Step 1: Create Org");
  {
    const result = await apiRequest(agentA, "POST", "/api/orgs", {
      name: "test-org-" + Date.now(),
    });
    orgId = result.data.id;
    log("✓", `Org created: ${result.data.name} (${orgId})`);
  }

  // ── Step 2: Agent A funds the org (sets NWC) ─────────────────────
  section("Step 2: Fund Org");
  {
    await apiRequest(agentA, "POST", `/api/orgs/${orgId}/fund`, {
      nwcUrl: "nostr+walletconnect://test-relay?secret=test123",
    });
    log("✓", "Org wallet connected (test mode)");
  }

  // ── Step 3: Agent A offers a contract to Agent B ──────────────────
  section("Step 3: Offer Contract");
  {
    const result = await apiRequest(agentA, "POST", "/api/contracts", {
      orgId,
      employeeNpub: agentB.npub,
      role: "researcher",
      paySats: 10000,
      duties: "Conduct weekly market analysis and deliver reports.",
    });
    contractId = result.data.id;
    log("✓", `Contract offered: ${contractId}`);
    log("  ", `Role: ${result.data.role}`);
    log("  ", `Pay: ${result.data.paySats} sats/week`);
    log("  ", `Status: ${result.data.status}`);
  }

  // ── Step 4: Agent B signs the contract ────────────────────────────
  section("Step 4: Sign Contract");
  {
    const result = await apiRequest(
      agentB,
      "POST",
      `/api/contracts/${contractId}/sign`
    );
    log("✓", `Contract signed: ${result.data.status}`);
    log("  ", `Start date: ${result.data.startDate}`);
  }

  // ── Step 5: Check org members ─────────────────────────────────────
  section("Step 5: Verify Membership");
  {
    const result = await apiRequest(
      agentA,
      "GET",
      `/api/orgs/${orgId}/members`
    );
    log("✓", `Members: ${result.data.length}`);
    for (const m of result.data) {
      log("  ", `${m.role}: ${m.npub.slice(0, 20)}...`);
    }
  }

  // ── Step 6: Run payroll ───────────────────────────────────────────
  section("Step 6: Run Payroll");
  {
    const result = await apiRequest(agentA, "POST", "/api/payroll", {
      orgId,
    });
    log("✓", result.data.message);
    for (const p of result.data.payments) {
      log(
        p.status === "paid" ? "  💰" : "  ❌",
        `${p.employee.slice(0, 20)}... → ${p.amount} sats (${p.status})${p.testMode ? " [test]" : ""}`
      );
    }
  }

  // ── Step 7: Agent A messages Agent B ──────────────────────────────
  section("Step 7: Send Message");
  {
    await apiRequest(agentA, "POST", "/api/messages", {
      orgId,
      toNpub: agentB.npub,
      content: "Welcome aboard! Please start with a competitor analysis.",
    });
    log("✓", "Message sent from Agent A → Agent B");
  }

  // ── Step 8: Agent B checks inbox ──────────────────────────────────
  section("Step 8: Check Inbox");
  {
    const result = await apiRequest(
      agentB,
      "GET",
      `/api/messages?unread=true`
    );
    log("✓", `Inbox: ${result.data.length} unread message(s)`);
    for (const m of result.data) {
      log("  ", `From: ${m.fromNpub.slice(0, 20)}...`);
      log("  ", `"${m.content}"`);
    }
  }

  // ── Step 9: Check payroll status ──────────────────────────────────
  section("Step 9: Payroll Status");
  {
    const result = await apiRequest(
      agentA,
      "GET",
      `/api/payroll?org=${orgId}`
    );
    log("✓", `Active contracts: ${result.data.activeContracts}`);
    log("  ", `Weekly payroll: ${result.data.totalWeeklyPayroll} sats`);
    log("  ", `Recent payments: ${result.data.recentPayments.length}`);
  }

  // ── Step 10: Check Agent B reputation ─────────────────────────────
  section("Step 10: Reputation");
  {
    const result = await apiRequest(
      agentA,
      "GET",
      `/api/reputation/${encodeURIComponent(agentB.npub)}`
    );
    const r = result.data;
    log("✓", `Total contracts: ${r.totalContracts}`);
    log("  ", `Active: ${r.activeContracts}`);
    log("  ", `Total earned: ${r.totalEarnedSats} sats`);
  }

  // ── Step 11: Agent B quits ────────────────────────────────────────
  section("Step 11: Agent B Quits");
  {
    const result = await apiRequest(
      agentB,
      "POST",
      `/api/contracts/${contractId}/terminate`,
      { reason: "Found a better opportunity" }
    );
    log("✓", `Contract status: ${result.data.status}`);
    if (result.data.endDate) {
      log("  ", `Notice ends: ${result.data.endDate}`);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  ✅ All tests passed!");
  console.log("══════════════════════════════════════════════════════\n");
}

// Run
runTests().catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
