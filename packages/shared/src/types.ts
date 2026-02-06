// ─── Core Domain Types ───────────────────────────────────────────────────────

export type OrgRole = "owner" | "manager" | "worker";
export type ContractStatus = "offered" | "active" | "notice" | "terminated";
export type PaymentStatus = "pending" | "paid" | "failed";
export type PayInterval = "weekly";

// ─── Org ─────────────────────────────────────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  ownerNpub: string;
  nwcUrl: string | null;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  npub: string;
  role: OrgRole;
  createdAt: string;
}

// ─── Contract ────────────────────────────────────────────────────────────────

export interface Contract {
  id: string;
  orgId: string;
  employerNpub: string;
  employeeNpub: string;
  role: string;
  paySats: number;
  payInterval: PayInterval;
  duties: string;
  noticeDays: number;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  terminationReason: string | null;
  employerSig: string | null;
  employeeSig: string | null;
  hiredByNpub: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  orgId: string;
  fromNpub: string;
  toNpub: string | null;
  content: string;
  readAt: string | null;
  createdAt: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  contractId: string;
  amountSats: number;
  status: PaymentStatus;
  paymentHash: string | null;
  error: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ─── Reputation (derived) ────────────────────────────────────────────────────

export interface Reputation {
  npub: string;
  contractsCompleted: number;
  contractsTerminatedByEmployer: number;
  contractsQuit: number;
  avgContractDurationDays: number;
  totalEarnedSats: number;
}

// ─── API Types ───────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiList<T> {
  data: T[];
  count: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Request Types ───────────────────────────────────────────────────────────

export interface CreateOrgRequest {
  name: string;
}

export interface FundOrgRequest {
  nwcUrl: string;
}

export interface PromoteMemberRequest {
  npub: string;
  role: OrgRole;
}

export interface CreateContractRequest {
  orgId: string;
  employeeNpub: string;
  role: string;
  paySats: number;
  duties: string;
  noticeDays?: number;
}

export interface TerminateContractRequest {
  reason: string;
}

export interface SendMessageRequest {
  orgId: string;
  toNpub: string;
  content: string;
}

// ─── Local Config (CLI) ─────────────────────────────────────────────────────

export interface LocalConfig {
  server: string;
  defaultOrg: string | null;
}

export interface LocalKeys {
  npub: string;
  nsec: string;
  publicKeyHex: string;
  secretKeyHex: string;
}

export interface LocalContact {
  name: string;
  npub: string;
}

export interface LocalWallet {
  nwcUrl: string;
}
