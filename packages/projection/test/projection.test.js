import { describe, it, expect } from 'vitest';
import {
  calculateMedian,
  classifyDay,
  simulateHeadroom,
  calculateDailyBalances,
  detectCollisions,
} from '../src/index.js';

describe('packages/projection unit tests', () => {
  it('calculates median correctly', () => {
    expect(calculateMedian([10, 20, 30])).toBe(20);
    expect(calculateMedian([10, 20, 30, 40])).toBe(25);
    expect(calculateMedian([])).toBe(0);
    expect(calculateMedian([500])).toBe(500);
  });

  it('classifies days according to Bauhaus semantic tokens', () => {
    const buffer = 2000;
    const safeMargin = 340;

    // Below buffer -> danger (red)
    expect(classifyDay(1999, buffer, safeMargin)).toBe('danger');
    expect(classifyDay(-500, buffer, safeMargin)).toBe('danger');

    // Between buffer and buffer + safeMargin -> tight (yellow)
    expect(classifyDay(2000, buffer, safeMargin)).toBe('tight');
    expect(classifyDay(2200, buffer, safeMargin)).toBe('tight');

    // Above buffer + safeMargin -> safe (blue)
    expect(classifyDay(2340, buffer, safeMargin)).toBe('safe');
    expect(classifyDay(10000, buffer, safeMargin)).toBe('safe');
  });

  it('matches Riya worked example from PRD Section 8.7', () => {
    // 4 November 2026
    const todayStr = '2026-11-04';
    const startingBalance = 19000; // HDFC 18,400 + Cash 600
    const buffer = 2000;
    const burnRate = 340;
    const horizonDays = 30;

    // Recurring fixed debits by day
    const fixedDebits = new Map();
    fixedDebits.set('2026-11-05', 8000); // Rent
    fixedDebits.set('2026-11-07', 399);  // Phone bill
    fixedDebits.set('2026-11-25', 4200); // Credit card bill
    fixedDebits.set('2026-12-01', 8000); // Dec Rent

    // Recurring credits by day
    const credits = new Map();
    credits.set('2026-12-01', 10000); // Parents transfer

    const result = simulateHeadroom({
      startingBalance,
      burnRate,
      projectedCreditsByDay: credits,
      projectedFixedDebitsByDay: fixedDebits,
      buffer,
      horizonDays,
      todayStr,
    });

    // Check specific days from Section 8.7 table:
    // Day 1 (5 Nov): 19000 - 340 - 8000 = 10,660
    const day5Nov = result.dailyPath.find((p) => p.date === '2026-11-05');
    expect(day5Nov.balance).toBe(10660);

    // Day 2 (6 Nov): 10660 - 340 = 10,320
    const day6Nov = result.dailyPath.find((p) => p.date === '2026-11-06');
    expect(day6Nov.balance).toBe(10320);

    // Day 3 (7 Nov): 10320 - 340 - 399 = 9,581
    const day7Nov = result.dailyPath.find((p) => p.date === '2026-11-07');
    expect(day7Nov.balance).toBe(9581);

    // Day 20 (24 Nov): 19000 - (20 * 340) - 8000 - 399 = 3,801
    const day24Nov = result.dailyPath.find((p) => p.date === '2026-11-24');
    expect(day24Nov.balance).toBe(3801);

    // Day 21 (25 Nov): 3801 - 340 - 4200 = -739 (crosses buffer 2,000)
    const day25Nov = result.dailyPath.find((p) => p.date === '2026-11-25');
    expect(day25Nov.balance).toBe(-739);

    // Buffer 2,000 is crossed on 25 Nov (Day 21)
    expect(result.headroomDays).toBe(21);
    expect(result.headroomDate).toBe('2026-11-25');

    // Test calculateDailyBalances produces the exact same daily balances as simulateHeadroom
    const accounts = [
      { id: 1, currency: 'INR', kind: 'checking', opening_balance: '18400' },
      { id: 2, currency: 'INR', kind: 'cash', opening_balance: '600' },
    ];
    const projectedRows = [
      { id: 1, account_id: 1, due_at: '2026-11-05', amount: '8000', direction: 'debit' },
      { id: 2, account_id: 1, due_at: '2026-11-07', amount: '399', direction: 'debit' },
      { id: 3, account_id: 1, due_at: '2026-11-25', amount: '4200', direction: 'debit' },
      { id: 4, account_id: 1, due_at: '2026-12-01', amount: '10000', direction: 'credit' },
      { id: 5, account_id: 1, due_at: '2026-12-01', amount: '8000', direction: 'debit' },
    ];

    const dailyBalances = calculateDailyBalances({
      accounts,
      transactions: [],
      projectedRows,
      todayStr,
      horizonDays,
      currency: 'INR',
      buffer,
      burnRate,
    });

    const heatmap5Nov = dailyBalances.find((d) => d.date === '2026-11-05');
    expect(heatmap5Nov.balance).toBe(10660);

    const heatmap25Nov = dailyBalances.find((d) => d.date === '2026-11-25');
    expect(heatmap25Nov.balance).toBe(-739);
    expect(heatmap25Nov.status).toBe('danger');

    const collisions = detectCollisions(dailyBalances);
    expect(collisions.length).toBe(1);
    expect(collisions[0].startDate).toBe('2026-11-25');
    expect(collisions[0].lengthDays).toBe(10);
  });
});
