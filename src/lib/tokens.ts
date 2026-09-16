import { randomBytes, randomUUID } from "crypto";

/**
 * Unguessable, URL-safe token for customer order-status links. 24 random
 * bytes (192 bits) base64url-encoded — never a sequential database id.
 */
export function generateOrderStatusToken(): string {
  return randomBytes(24).toString("base64url");
}

export function generateIdempotencyKey(): string {
  return randomUUID();
}
