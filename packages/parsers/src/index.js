import { redactPII } from './pii.js';
import { INDIAN_BANK_TEMPLATES } from './sms/indianBanks.js';
import { US_BANK_TEMPLATES } from './sms/usBanks.js';
import { trigramSimilarity } from './matching/trigram.js';
import { matchCandidateAgainstTransactions } from './matching/duplicateDetector.js';
import { parseBankCsv } from './csv/csvParser.js';

export {
  redactPII,
  INDIAN_BANK_TEMPLATES,
  US_BANK_TEMPLATES,
  trigramSimilarity,
  matchCandidateAgainstTransactions,
  parseBankCsv,
};

const ALL_TEMPLATES = [...INDIAN_BANK_TEMPLATES, ...US_BANK_TEMPLATES];

/**
 * Match a line of SMS text against the regex library.
 * Returns parsed transaction object if matched, or null if unmatched.
 */
export function parseSmsWithTemplates(text) {
  if (!text || typeof text !== 'string') return null;

  for (const template of ALL_TEMPLATES) {
    const match = text.match(template.regex);
    if (match) {
      try {
        const parsed = template.parse(match, text);
        return {
          ...parsed,
          template_name: template.name,
          posted_at: new Date().toISOString(),
        };
      } catch (err) {
        // Continue to next template if extraction fails
        continue;
      }
    }
  }

  return null;
}

/**
 * Batch parses multi-line SMS pastes:
 * 1. Pre-process and redact PII.
 * 2. Runs regex parsers for each segment.
 * 3. Returns { matched: [...], unmatched: [...] }
 */
export function extractFromPastedText(rawText) {
  const redacted = redactPII(rawText);

  // Split on double newlines or lines starting with bank keywords / dates
  const segments = rawText
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const matched = [];
  const unmatched = [];

  for (const segment of segments) {
    const item = parseSmsWithTemplates(segment);
    if (item) {
      matched.push({
        ...item,
        original_text: redactPII(segment),
      });
    } else {
      unmatched.push(redactPII(segment));
    }
  }

  return {
    redactedFullText: redacted,
    matched,
    unmatched,
  };
}
