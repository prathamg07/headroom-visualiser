import { DateTime } from 'luxon';
import { trigramSimilarity } from './trigram.js';

/**
 * Duplicate & Correction detector matching PRD Section 7.4
 */
export function matchCandidateAgainstTransactions(candidate, existingTransactions = []) {
  const candidateAmount = Number(candidate.amount);

  for (const tx of existingTransactions) {
    if (tx.voided_at) continue;

    // 1. Exact Reference Match
    if (
      candidate.bank_reference &&
      tx.bank_reference &&
      candidate.bank_reference.toLowerCase() === tx.bank_reference.toLowerCase()
    ) {
      const txAmount = Number(tx.amount);
      if (Math.abs(txAmount - candidateAmount) < 0.01) {
        return {
          action: 'skip',
          reason: 'Exact bank reference and amount match',
          existing_id: tx.id,
          matchedTransaction: tx,
        };
      } else {
        return {
          action: 'update',
          reason: 'Same bank reference with corrected amount',
          existing_id: tx.id,
          diff: {
            oldAmount: txAmount,
            newAmount: candidateAmount,
          },
          matchedTransaction: tx,
        };
      }
    }

    // 2. Fuzzy Match:
    // Same direction, amount within 1 minor unit, within 1 day, merchant trigram >= 0.6
    if (candidate.direction === tx.direction) {
      const amountDiff = Math.abs(Number(tx.amount) - candidateAmount);
      if (amountDiff <= 0.05) {
        const d1 = DateTime.fromISO(candidate.posted_at);
        const d2 = DateTime.fromISO(tx.posted_at);
        const dayDiff = Math.abs(d1.diff(d2, 'days').days);

        if (dayDiff <= 1.5) {
          const sim = trigramSimilarity(candidate.merchant || '', tx.merchant || '');
          if (sim >= 0.6) {
            return {
              action: 'skip',
              reason: `Fuzzy match on date, amount, and merchant (${(sim * 100).toFixed(0)}% similarity)`,
              existing_id: tx.id,
              matchedTransaction: tx,
            };
          }
        }
      }
    }
  }

  return {
    action: 'create',
    reason: 'New transaction',
  };
}
