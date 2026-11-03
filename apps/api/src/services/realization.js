import { db } from '../db/index.js';
import { projectedRows } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';

/**
 * Automatically match a real transaction against projected recurring rows
 * to retire the projected row and prevent double-counting (PRD F3 & Section 8.1)
 */
export async function autoRealizeProjectedRow({
  userId,
  accountId,
  amount,
  direction,
  postedAt,
  transactionId,
}) {
  const activeProjected = await db
    .select()
    .from(projectedRows)
    .where(
      and(
        eq(projectedRows.user_id, userId),
        eq(projectedRows.account_id, accountId),
        eq(projectedRows.direction, direction),
        isNull(projectedRows.realized_tx_id),
        isNull(projectedRows.voided_at)
      )
    );

  const txDate = DateTime.fromJSDate(new Date(postedAt));
  const txAmount = Number(amount);

  for (const row of activeProjected) {
    const rowDate = DateTime.fromJSDate(new Date(row.due_at));
    const dayDiff = Math.abs(txDate.diff(rowDate, 'days').days);

    if (dayDiff <= 3.5) {
      const rowAmount = Number(row.amount);
      if (!Number.isFinite(rowAmount) || rowAmount <= 0 || !Number.isFinite(txAmount)) {
        continue;
      }
      const diffRatio = Math.abs(txAmount - rowAmount) / rowAmount;

      // Within 5% amount tolerance or 1 rupee
      if (diffRatio <= 0.05 || Math.abs(txAmount - rowAmount) <= 1.0) {
        await db
          .update(projectedRows)
          .set({ realized_tx_id: transactionId })
          .where(eq(projectedRows.id, row.id));

        console.log(`[Realization] Transaction #${transactionId} realized projected row #${row.id} (${row.amount})`);
        return row.id;
      }
    }
  }

  return null;
}
