import { describe, it, expect } from 'vitest';
import {
  calculateMedian,
  classifyDay,
  simulateHeadroom,
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

    // Classify dailyPath to detect collisions
    const classifiedDays = result.dailyPath.map((p) => ({
      date: p.date,
      balance: p.balance,
      status: classifyDay(p.balance, buffer, burnRate),
    }));

    const collisions = detectCollisions(classifiedDays);
    expect(collisions.length).toBe(1);
    expect(collisions[0].startDate).toBe('2026-11-25');
    expect(collisions[0].lengthDays).toBe(10); // 25 Nov through 4 Dec
  });
});
