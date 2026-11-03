/**
 * PII Redaction according to PRD Section 7.2 & 10
 * - Strips phone numbers
 * - Strips card numbers past the last four digits
 * - Strips OTPs
 */

export function redactPII(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Redact OTPs: 4-8 digits near "OTP", "code", "secret", "verification"
  text = text.replace(
    /\b(?:otp|code|passcode|secret|verification(?:\s*code)?)\s*(?:is|:|=)?\s*(\d{4,8})\b/gi,
    (match, digits) => match.replace(digits, '●●●●')
  );

  // 2. Redact Card numbers (12-19 digits, with or without spaces/dashes), preserving last 4 digits
  text = text.replace(
    /\b(?:\d[ -]?){11,15}(\d{4})\b/g,
    (match, last4) => `●●●●-●●●●-●●●●-${last4}`
  );

  // 3. Redact Phone numbers (+91-9876543210, 9876543210, (555) 123-4567, +1-555-123-4567)
  text = text.replace(
    /(?:\+?(\d{1,3})[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '●●●●-●●●●'
  );

  return text;
}
