import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "zentravo-customer-secret-key-2026";

export interface CustomerSessionPayload {
  phone: string;
  exp: number; // unix timestamp in seconds
}

/**
 * Creates a signed token for a verified customer mobile number.
 * Valid for 30 days.
 */
export function signCustomerToken(phone: string): string {
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 3600; // 30 days
  const data = JSON.stringify({ phone, exp });
  const payload = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verifies a customer token and returns payload if valid and not expired.
 */
export function verifyCustomerToken(token?: string | null): CustomerSessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const data: CustomerSessionPayload = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );
    if (data.exp < Math.floor(Date.now() / 1000)) {
      return null; // expired
    }
    return data;
  } catch {
    return null;
  }
}
