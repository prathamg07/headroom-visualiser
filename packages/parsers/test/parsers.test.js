import { describe, it, expect } from 'vitest';
import {
  redactPII,
  parseSmsWithTemplates,
  trigramSimilarity,
  matchCandidateAgainstTransactions,
} from '../src/index.js';

describe('packages/parsers unit tests', () => {
  it('redacts PII: card numbers, phone numbers, and OTPs', () => {
    const raw = 'Your OTP is 492011 for card 4111 2222 3333 4444. Call +91-9876543210 for help.';
    const redacted = redactPII(raw);

    expect(redacted).not.toContain('492011');
    expect(redacted).toContain('●●●●');
    expect(redacted).toContain('4444'); // Last four digits preserved
    expect(redacted).not.toContain('4111');
    expect(redacted).not.toContain('9876543210');
  });

  it('parses HDFC bank debit SMS fixture', () => {
    const sms = 'Alert: Rs. 1,499.00 debited from HDFC Bank A/C ending 4321 to Netflix. Ref: HDFC998877. Avl bal: Rs. 24,000';
    const parsed = parseSmsWithTemplates(sms);

    expect(parsed).not.toBeNull();
    expect(parsed.amount).toBe(1499.0);
    expect(parsed.direction).toBe('debit');
    expect(parsed.account_last_four).toBe('4321');
    expect(parsed.merchant).toBe('Netflix');
    expect(parsed.bank_reference).toBe('HDFC998877');
    expect(parsed.bank).toBe('HDFC');
  });

  it('parses PhonePe UPI SMS fixture', () => {
    const sms = 'Paid Rs. 350 to Starbucks Coffee successfully via PhonePe. Txn ID: P24110499';
    const parsed = parseSmsWithTemplates(sms);

    expect(parsed).not.toBeNull();
    expect(parsed.amount).toBe(350);
    expect(parsed.direction).toBe('debit');
    expect(parsed.merchant).toBe('Starbucks Coffee');
    expect(parsed.bank_reference).toBe('P24110499');
    expect(parsed.bank).toBe('PhonePe');
  });

  it('parses Chase US card alert fixture', () => {
    const sms = 'Chase Alert: You made a $85.20 transaction with Trader Joes on card ending in 7766';
    const parsed = parseSmsWithTemplates(sms);

    expect(parsed).not.toBeNull();
    expect(parsed.amount).toBe(85.2);
    expect(parsed.currency).toBe('USD');
    expect(parsed.direction).toBe('debit');
    expect(parsed.account_last_four).toBe('7766');
    expect(parsed.merchant).toBe('Trader Joes');
    expect(parsed.bank).toBe('Chase');
  });

  it('calculates trigram similarity correctly', () => {
    expect(trigramSimilarity('Uber India', 'Uber India')).toBe(1.0);
    expect(trigramSimilarity('Uber', 'Uber BV')).toBeGreaterThan(0.5);
    expect(trigramSimilarity('Apple Store', 'Netflix')).toBeLessThan(0.2);
  });

  it('identifies exact duplicate vs correction', () => {
    const existing = [
      { id: 10, bank_reference: 'REF123', amount: 500, direction: 'debit' },
    ];

    // Same reference & amount -> skip (duplicate)
    const dup = matchCandidateAgainstTransactions(
      { bank_reference: 'REF123', amount: 500, direction: 'debit' },
      existing
    );
    expect(dup.action).toBe('skip');

    // Same reference, changed amount -> update (correction)
    const correction = matchCandidateAgainstTransactions(
      { bank_reference: 'REF123', amount: 600, direction: 'debit' },
      existing
    );
    expect(correction.action).toBe('update');
    expect(correction.diff.newAmount).toBe(600);
  });
});
