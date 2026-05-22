const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const TAG_REGEX = /<[^>]*>/g;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeWhitespaceForInput(value: string): string {
  return value.replace(/\s+/g, ' ');
}

export function sanitizeText(input: string | null | undefined, maxLength = 255): string {
  const value = String(input ?? '');
  return normalizeWhitespace(value.replace(TAG_REGEX, '').replace(CONTROL_CHARS_REGEX, '')).slice(0, maxLength);
}

export function sanitizeMultilineText(input: string | null | undefined, maxLength = 5000): string {
  const value = String(input ?? '')
    .replace(TAG_REGEX, '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_REGEX, '');

  return value.trim().slice(0, maxLength);
}

// Input-time sanitizer variants: preserve edge spaces while user types,
// but still strip tags/control chars and normalize repeated whitespace.
export function sanitizeTextInput(input: string | null | undefined, maxLength = 255): string {
  const value = String(input ?? '');
  return normalizeWhitespaceForInput(value.replace(TAG_REGEX, '').replace(CONTROL_CHARS_REGEX, '')).slice(0, maxLength);
}

export function sanitizeMultilineTextInput(input: string | null | undefined, maxLength = 5000): string {
  const value = String(input ?? '')
    .replace(TAG_REGEX, '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_REGEX, '');

  return value.slice(0, maxLength);
}

export function sanitizeNameInput(input: string | null | undefined, maxLength = 100): string {
  return sanitizeTextInput(input, maxLength);
}

export function sanitizePhoneInput(input: string | null | undefined, maxLength = 24): string {
  const value = String(input ?? '');
  const digitsAndFormatting = value.replace(/[^\d()+\-\s]/g, '');
  return normalizeWhitespaceForInput(digitsAndFormatting).slice(0, maxLength);
}

export function sanitizeEmail(input: string | null | undefined, maxLength = 255): string {
  return sanitizeText(input, maxLength).toLowerCase();
}

export function sanitizeName(input: string | null | undefined, maxLength = 100): string {
  return sanitizeText(input, maxLength);
}

export function sanitizeLocation(input: string | null | undefined): string {
  return sanitizeText(input, 32).toLowerCase();
}

export function sanitizePhone(input: string | null | undefined, maxLength = 24): string {
  const value = String(input ?? '');
  const digitsAndFormatting = value.replace(/[^\d()+\-\s]/g, '');
  return normalizeWhitespace(digitsAndFormatting).slice(0, maxLength);
}

export function sanitizePostalCode(input: string | null | undefined, maxLength = 16): string {
  return sanitizeText(input, maxLength).toUpperCase();
}
