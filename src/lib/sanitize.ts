/**
 * Input sanitization and validation utilities for order forms
 */

export function sanitizeText(input: string | null | undefined, maxLength: number): string {
  if (!input) return "";
  const cleaned = input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[^\w\s\d,.\-/#()]/gi, "") // Keep alphanumeric, punctuation useful for addresses
    .trim();
  return cleaned.slice(0, maxLength);
}

export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(0, 15);
}

export function isValidPakistanPhone(phone: string): boolean {
  const digits = sanitizePhone(phone);
  return /^03\d{9}$/.test(digits);
}
