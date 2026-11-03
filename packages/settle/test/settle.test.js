import { describe, it, expect } from 'vitest';
import { calculateSettlements, calculateGroupBalances } from '../src/index.js';

describe('packages/settle unit tests', () => {
  it('settles a simple 2-person split', () => {
    // User 1 paid 100, split 50/50 with User 2
    // User 1 net: +50, User 2 net: -50
    const balances = {
      '1': 50,
      '2': -50,
    };
    const transfers = calculateSettlements(balances);
    expect(transfers).toEqual([
      { from_user: '2', to_user: '1', amount: 50 },
    ]);
  });

  it('settles a 3-person group in at most 2 transfers', () => {
    // Alice (1) is owed 80, Bob (2) owes 50, Charlie (3) owes 30
    const balances = {
      '1': 80,
      '2': -50,
      '3': -30,
    };
    const transfers = calculateSettlements(balances);
    expect(transfers.length).toBeLessThanOrEqual(2);

    // Sum of transfers received by Alice = 80
    const aliceReceived = transfers
      .filter((t) => t.to_user === '1')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(aliceReceived).toBe(80);

    // Bob pays 50, Charlie pays 30
    expect(transfers.find((t) => t.from_user === '2').amount).toBe(50);
    expect(transfers.find((t) => t.from_user === '3').amount).toBe(30);
  });

  it('correctly calculates net balances from splits', () => {
    const members = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const splits = [
      {
        paid_by: '1',
        total: 90,
        shares: [
          { user_id: '1', share: 30 },
          { user_id: '2', share: 30 },
          { user_id: '3', share: 30 },
        ],
      },
    ];

    const balances = calculateGroupBalances(splits, members);
    expect(balances['1']).toBe(60); // 90 paid - 30 share
    expect(balances['2']).toBe(-30);
    expect(balances['3']).toBe(-30);
  });
});
