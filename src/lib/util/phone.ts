export function toE164(raw: string, defaultCountry = "61"): string | null {
  // Strip all formatting characters, preserve leading +
  const hasPlus = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (!digits) return null;

  // Already has explicit country code via +
  if (hasPlus) return `+${digits}`;

  // 00-prefixed international format (e.g. 0061412345678)
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;

  // Local format with trunk prefix 0 (e.g. 0412345678 → +61412345678)
  if (digits.startsWith("0")) return `+${defaultCountry}${digits.slice(1)}`;

  // Bare digits with country code already (e.g. 61412345678)
  return `+${digits}`;
}