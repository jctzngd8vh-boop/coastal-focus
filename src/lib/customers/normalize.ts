/**
 * Normalization used both to de-duplicate customers (unique indexes on
 * phone_normalized / email_normalized) and to build tel:/sms: links.
 */

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Assume US/Canada numbers: 10 digits, or 11 digits starting with 1.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+")) return `+${digits}`;
  return digits.length >= 7 ? digits : null;
}

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function formatPhoneForDisplay(normalized: string | null): string {
  if (!normalized) return "";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return normalized;
}

export interface CustomerMatchCandidate {
  id: string;
  phone_normalized: string | null;
  email_normalized: string | null;
}

/**
 * Finds an existing customer that matches by normalized phone OR email,
 * used to prevent obvious duplicate customer records.
 */
export function findDuplicateCustomer(
  candidates: CustomerMatchCandidate[],
  phoneNormalized: string | null,
  emailNormalized: string | null
): CustomerMatchCandidate | null {
  return (
    candidates.find(
      (c) =>
        (phoneNormalized && c.phone_normalized === phoneNormalized) ||
        (emailNormalized && c.email_normalized === emailNormalized)
    ) ?? null
  );
}
