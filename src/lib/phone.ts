/**
 * Phone number normalization & variant generation utility.
 * Standardizes Sri Lankan and international numbers into canonical E.164 (+94XXXXXXXXX)
 * 
 * Sri Lanka canonical format: +94771234567
 * Accepted inputs: 0771234567, 077 123 4567, 077-123-4567, 94771234567, +94771234567
 */

/**
 * Standardize phone into canonical E.164 format (+94XXXXXXXXX for Sri Lanka).
 * Always use this canonical format before saving into database!
 */
export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, "");

  // If already starts with +94
  if (cleaned.startsWith("+94") && cleaned.length >= 12) {
    const core = cleaned.slice(3).replace(/\D/g, "");
    if (core.length === 9) {
      return `+94${core}`;
    }
    return cleaned;
  }

  // Starts with 94 without +
  if (cleaned.startsWith("94") && cleaned.length >= 11) {
    const core = cleaned.slice(2).replace(/\D/g, "");
    if (core.length === 9) {
      return `+94${core}`;
    }
    return `+${cleaned}`;
  }

  // Starts with 0 (e.g., 0771234567)
  if (cleaned.startsWith("0") && cleaned.length >= 10) {
    const core = cleaned.slice(1).replace(/\D/g, "");
    if (core.length === 9) {
      return `+94${core}`;
    }
  }

  // Just 9 digits (e.g., 771234567)
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 9) {
    return `+94${digits}`;
  }

  // Fallback if international with +
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  return cleaned ? `+${cleaned}` : "";
}

/**
 * Returns user-friendly local display format (e.g., "077 123 4567")
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";
  const canonical = normalizePhone(phone);
  if (canonical.startsWith("+94") && canonical.length === 12) {
    const core = canonical.slice(3); // 9 digits
    const p1 = "0" + core.slice(0, 2);
    const p2 = core.slice(2, 5);
    const p3 = core.slice(5);
    return `${p1} ${p2} ${p3}`;
  }
  return phone;
}

/**
 * Generates all possible lookup variations of a phone number so query lookups
 * match irrespective of how the number was historically entered.
 */
export function getPhoneVariants(phone: string): string[] {
  if (!phone || typeof phone !== "string") return [];

  const raw = phone.trim();
  if (!raw) return [];

  const variants = new Set<string>();
  variants.add(raw);

  const stripped = raw.replace(/[\s\-\(\)\.]/g, "");
  variants.add(stripped);

  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly) {
    variants.add(digitsOnly);
  }

  // Extract 9-digit core for Sri Lanka
  let core9 = "";

  if (stripped.startsWith("+94") && stripped.length >= 12) {
    core9 = stripped.slice(3, 12);
  } else if (stripped.startsWith("94") && stripped.length >= 11) {
    core9 = stripped.slice(2, 11);
  } else if (stripped.startsWith("0") && stripped.length >= 10) {
    core9 = stripped.slice(1, 10);
  } else if (digitsOnly.length === 9) {
    core9 = digitsOnly;
  } else if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    core9 = digitsOnly.slice(1, 10);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("94")) {
    core9 = digitsOnly.slice(2, 11);
  }

  if (core9.length === 9) {
    const local10 = "0" + core9;
    const intlPlus = "+94" + core9;
    const intlNoPlus = "94" + core9;

    variants.add(intlPlus);
    variants.add(local10);
    variants.add(intlNoPlus);
    variants.add(core9);

    // Spaced and dashed variants
    const p1 = local10.slice(0, 3);
    const p2 = local10.slice(3, 6);
    const p3 = local10.slice(6);
    variants.add(`${p1} ${p2} ${p3}`);
    variants.add(`${p1}-${p2}-${p3}`);

    const ip1 = "+94";
    const ip2 = core9.slice(0, 2);
    const ip3 = core9.slice(2, 5);
    const ip4 = core9.slice(5);
    variants.add(`${ip1} ${ip2} ${ip3} ${ip4}`);
    variants.add(`${ip1}${ip2}${ip3}${ip4}`);
  }

  return Array.from(variants).filter((v) => v && v.length >= 3);
}
