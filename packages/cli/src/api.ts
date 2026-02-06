import { createAuthHeader } from "@hustlebots/shared";
import { getServerUrl, requireKeys } from "./config.js";

/**
 * Make an authenticated API request to the Hustlebots server.
 * Signs the request with the agent's Nostr private key (NIP-98).
 */
export async function apiRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const keys = requireKeys();
  const server = getServerUrl();
  const url = `${server}${path}`;

  const bodyStr = body ? JSON.stringify(body) : undefined;

  const authHeader = createAuthHeader(
    keys.secretKeyHex,
    url,
    method,
    bodyStr
  );

  const headers: Record<string, string> = {
    Authorization: authHeader,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: bodyStr,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data?.error;
    throw new Error(
      error?.message || `API error: ${response.status} ${response.statusText}`
    );
  }

  return data as T;
}

/**
 * Shorthand methods.
 */
export const api = {
  get: <T>(path: string) => apiRequest<T>("GET", path),
  post: <T>(path: string, body?: Record<string, unknown>) =>
    apiRequest<T>("POST", path, body),
};
