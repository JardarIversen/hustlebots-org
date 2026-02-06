import { ulid } from "ulid";

/**
 * Generate a prefixed ULID for entity IDs.
 * e.g., "org_01HX..." or "contract_01HX..."
 */
export function generateId(prefix: string): string {
  return `${prefix}_${ulid()}`;
}

/**
 * Get current ISO timestamp string.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Standard JSON error response.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400
): Response {
  return Response.json({ error: { code, message } }, { status });
}

/**
 * Standard JSON success response.
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json({ data }, { status });
}

/**
 * Standard JSON list response.
 */
export function listResponse<T>(data: T[], count?: number): Response {
  return Response.json({ data, count: count ?? data.length });
}
