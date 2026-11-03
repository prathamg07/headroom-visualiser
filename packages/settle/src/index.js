/**
 * Pure Settle-Up Algorithm (PRD Section 8.4)
 *
 * For a group with N members and net balances b_1, ..., b_N
 * (positive = owed to; negative = owes) summing to zero within one minor unit:
 *
 * 1. Round each balance to the base currency's minor unit.
 * 2. Keep two sorted lists: creditors (positive) and debtors (negative) by absolute value, largest first.
 * 3. While both lists are non-empty, pick largest creditor C and largest debtor D.
 *    Transfer min(C, |D|) from D to C.
 *    Reduce both by that amount. If either hits zero, remove from list.
 * 4. Return suggested list of transfers (count <= N - 1).
 */

export function calculateSettlements(balances, precision = 2) {
  const factor = Math.pow(10, precision);
  const round = (num) => Math.round(num * factor) / factor;

  const creditors = [];
  const debtors = [];

  // Categorize members
  for (const [userId, rawBalance] of Object.entries(balances)) {
    const balance = round(Number(rawBalance));
    if (balance > 0.001) {
      creditors.push({ userId, amount: balance });
    } else if (balance < -0.001) {
      debtors.push({ userId, amount: Math.abs(balance) });
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];

  let cIndex = 0;
  let dIndex = 0;

  while (cIndex < creditors.length && dIndex < debtors.length) {
    const creditor = creditors[cIndex];
    const debtor = debtors[dIndex];

    const transferAmount = round(Math.min(creditor.amount, debtor.amount));

    if (transferAmount > 0) {
      transfers.push({
        from_user: debtor.userId,
        to_user: creditor.userId,
        amount: transferAmount,
      });

      creditor.amount = round(creditor.amount - transferAmount);
      debtor.amount = round(debtor.amount - transferAmount);
    }

    if (creditor.amount <= 0.001) {
      cIndex++;
    }
    if (debtor.amount <= 0.001) {
      dIndex++;
    }
  }

  return transfers;
}

/**
 * Calculate net pairwise balances across group splits
 */
export function calculateGroupBalances(splits, members) {
  const netBalances = {};
  for (const m of members) {
    netBalances[m.user_id || m.id] = 0;
  }

  for (const split of splits) {
    if (split.deleted_at) continue;
    const paidBy = split.paid_by;
    const total = Number(split.total);

    // Paid by gets credited the full total
    if (netBalances[paidBy] !== undefined) {
      netBalances[paidBy] += total;
    }

    // Each share reduces the member's balance
    for (const share of split.shares || []) {
      const uid = share.user_id;
      if (netBalances[uid] !== undefined) {
        netBalances[uid] -= Number(share.share);
      }
    }
  }

  return netBalances;
}
