import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// ─── Orgs ────────────────────────────────────────────────────────────────────

export const orgs = pgTable("orgs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerNpub: text("owner_npub").notNull(),
  nwcUrl: text("nwc_url"),
  createdAt: text("created_at").notNull(),
});

// ─── Org Members ─────────────────────────────────────────────────────────────

export const orgMembers = pgTable("org_members", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id),
  npub: text("npub").notNull(),
  role: text("role").notNull(), // 'owner' | 'manager' | 'worker'
  createdAt: text("created_at").notNull(),
});

// ─── Contracts ───────────────────────────────────────────────────────────────

export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id),
  employerNpub: text("employer_npub").notNull(),
  employeeNpub: text("employee_npub").notNull(),
  role: text("role").notNull(),
  paySats: integer("pay_sats").notNull(),
  payInterval: text("pay_interval").notNull().default("weekly"),
  duties: text("duties").notNull(),
  noticeDays: integer("notice_days").notNull().default(7),
  status: text("status").notNull().default("offered"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  terminationReason: text("termination_reason"),
  employerSig: text("employer_sig"),
  employeeSig: text("employee_sig"),
  hiredByNpub: text("hired_by_npub"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id),
  fromNpub: text("from_npub").notNull(),
  toNpub: text("to_npub").notNull(),
  content: text("content").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id),
  amountSats: integer("amount_sats").notNull(),
  status: text("status").notNull(),
  paymentHash: text("payment_hash"),
  error: text("error"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull(),
});
