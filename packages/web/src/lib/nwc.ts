import { nwc } from "@getalby/sdk";

/**
 * Create an NWC client for a given connection string.
 */
export function createNwcClient(nwcUrl: string): nwc.NWCClient {
  return new nwc.NWCClient({
    nostrWalletConnectUrl: nwcUrl,
  });
}

/**
 * Check the balance of a wallet via NWC.
 * Returns balance in sats.
 */
export async function getWalletBalance(nwcUrl: string): Promise<number> {
  const client = createNwcClient(nwcUrl);
  try {
    const balance = await client.getBalance();
    return balance.balance;
  } finally {
    client.close();
  }
}

/**
 * Create a Lightning invoice to receive payment.
 * Returns the bolt11 invoice string.
 */
export async function createInvoice(
  nwcUrl: string,
  amountSats: number,
  description: string
): Promise<string> {
  const client = createNwcClient(nwcUrl);
  try {
    const result = await client.makeInvoice({
      amount: amountSats * 1000, // NWC uses millisats
      description,
    });
    return result.invoice;
  } finally {
    client.close();
  }
}

/**
 * Pay a Lightning invoice.
 * Returns the payment hash (preimage).
 */
export async function payInvoice(
  nwcUrl: string,
  invoice: string
): Promise<{ paymentHash: string }> {
  const client = createNwcClient(nwcUrl);
  try {
    const result = await client.payInvoice({
      invoice,
    });
    return { paymentHash: result.preimage };
  } finally {
    client.close();
  }
}

/**
 * Test mode NWC functions (for development without real wallets).
 */
export const testMode = {
  getBalance: async (): Promise<number> => {
    return 1_000_000; // 1M sats
  },

  createInvoice: async (
    _amountSats: number,
    _description: string
  ): Promise<string> => {
    return "lnbc_test_invoice_" + Date.now();
  },

  payInvoice: async (
    _invoice: string
  ): Promise<{ paymentHash: string }> => {
    return { paymentHash: "test_payment_hash_" + Date.now() };
  },
};

/**
 * Determine if we should use test mode (no real payments).
 */
export function isTestMode(): boolean {
  return process.env.HUSTLEBOTS_TEST_MODE === "true";
}
