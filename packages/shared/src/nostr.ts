import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { sha256 } from "@noble/hashes/sha2";

// ─── Key Generation ──────────────────────────────────────────────────────────

export interface NostrKeypair {
  npub: string;
  nsec: string;
  publicKeyHex: string;
  secretKeyHex: string;
}

export function generateKeypair(): NostrKeypair {
  const secretKey = generateSecretKey();
  const publicKey = getPublicKey(secretKey);

  return {
    npub: nip19.npubEncode(publicKey),
    nsec: nip19.nsecEncode(secretKey),
    publicKeyHex: publicKey,
    secretKeyHex: bytesToHex(secretKey),
  };
}

// ─── Key Conversion ──────────────────────────────────────────────────────────

export function npubToHex(npub: string): string {
  const { type, data } = nip19.decode(npub);
  if (type !== "npub") throw new Error("Not a valid npub");
  return data as string;
}

export function nsecToHex(nsec: string): string {
  const { type, data } = nip19.decode(nsec);
  if (type !== "nsec") throw new Error("Not a valid nsec");
  return bytesToHex(data as Uint8Array);
}

export function hexToNpub(hex: string): string {
  return nip19.npubEncode(hex);
}

export function nsecToBytes(nsec: string): Uint8Array {
  const { type, data } = nip19.decode(nsec);
  if (type !== "nsec") throw new Error("Not a valid nsec");
  return data as Uint8Array;
}

// ─── NIP-98 HTTP Auth ────────────────────────────────────────────────────────
// https://github.com/nostr-protocol/nips/blob/master/98.md

export interface Nip98Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Create a NIP-98 authorization header for an HTTP request.
 * The client signs a Nostr event containing the URL, method, and payload hash.
 */
export function createAuthHeader(
  secretKeyHex: string,
  url: string,
  method: string,
  body?: string
): string {
  const tags: string[][] = [
    ["u", url],
    ["method", method.toUpperCase()],
  ];

  if (body) {
    const bodyHash = bytesToHex(sha256(new TextEncoder().encode(body)));
    tags.push(["payload", bodyHash]);
  }

  const event = finalizeEvent(
    {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: "",
    },
    hexToBytes(secretKeyHex)
  );

  const encoded = btoa(JSON.stringify(event));
  return `Nostr ${encoded}`;
}

/**
 * Verify a NIP-98 authorization header and extract the pubkey.
 * Returns the hex pubkey if valid, throws otherwise.
 */
export function verifyAuthHeader(
  authHeader: string,
  url: string,
  method: string,
  body?: string
): string {
  if (!authHeader.startsWith("Nostr ")) {
    throw new Error("Invalid auth header: must start with 'Nostr '");
  }

  const encoded = authHeader.slice(6);
  let event: Nip98Event;

  try {
    event = JSON.parse(atob(encoded));
  } catch {
    throw new Error("Invalid auth header: malformed base64/JSON");
  }

  // Verify event signature
  if (!verifyEvent(event)) {
    throw new Error("Invalid auth header: bad signature");
  }

  // Verify kind
  if (event.kind !== 27235) {
    throw new Error("Invalid auth header: wrong event kind");
  }

  // Verify timestamp (within 60 seconds)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > 60) {
    throw new Error("Invalid auth header: event too old or too new");
  }

  // Verify URL
  const eventUrl = event.tags.find((t) => t[0] === "u")?.[1];
  if (eventUrl !== url) {
    throw new Error("Invalid auth header: URL mismatch");
  }

  // Verify method
  const eventMethod = event.tags.find((t) => t[0] === "method")?.[1];
  if (eventMethod !== method.toUpperCase()) {
    throw new Error("Invalid auth header: method mismatch");
  }

  // Verify payload hash (if body was provided)
  if (body) {
    const eventPayload = event.tags.find((t) => t[0] === "payload")?.[1];
    const bodyHash = bytesToHex(sha256(new TextEncoder().encode(body)));
    if (eventPayload !== bodyHash) {
      throw new Error("Invalid auth header: payload hash mismatch");
    }
  }

  return event.pubkey; // hex pubkey
}
