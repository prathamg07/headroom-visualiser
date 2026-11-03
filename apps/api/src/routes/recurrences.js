import express from 'express';
import { db } from '../db/index.js';
import { recurrences, projectedRows, accounts, categories, transactions } from '../db/schema.js';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { createRecurrenceSchema, updateRecurrenceSchema } from '@headroom/shared';
import { DateTime } from 'luxon';

const router = express.Router();
router.use(authenticate);

function generateProjectedDates(cadence, nextAt, horizonDays = 90, endAt = null) {
  const dates = [];
  let current = DateTime.fromISO(new Date(nextAt).toISOString()).startOf('day');
  const horizonLimit = DateTime.now().plus({ days: horizonDays }).startOf('day');
  const finalLimit = endAt
    ? DateTime.min(horizonLimit, DateTime.fromISO(new Date(endAt).toISOString()).startOf('day'))
    : horizonLimit;

  while (current <= finalLimit) {
    dates.push(current.toJSDate());

    if (cadence === 'weekly') {
      current = current.plus({ weeks: 1 });
    } else if (cadence === 'biweekly') {
      current = current.plus({ weeks: 2 });
    } else if (cadence === 'monthly') {
      current = current.plus({ months: 1 });
    } else {
      break; // one_off
    }
  }

  return dates;
}

router.get('/', async (req, res) => {
  try {
    const list = await db
      .select({
        id: recurrences.id,
        user_id: recurrences.user_id,
        account_id: recurrences.account_id,
        account_name: accounts.name,
        category_id: recurrences.category_id,
        category_name: categories.name,
        category_color: categories.color,
        label: recurrences.label,
        amount: recurrences.amount,
        currency: recurrences.currency,
        direction: recurrences.direction,
        cadence: recurrences.cadence,
        next_at: recurrences.next_at,
        end_at: recurrences.end_at,
        active: recurrences.active,
      })
      .from(recurrences)
      .leftJoin(accounts, eq(recurrences.account_id, accounts.id))
      .leftJoin(categories, eq(recurrences.category_id, categories.id))
      .where(eq(recurrences.user_id, req.user.id));

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parseResult = createRecurrenceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const data = parseResult.data;

    const [newRec] = await db
      .insert(recurrences)
      .values({
        ...data,
        user_id: req.user.id,
        amount: String(data.amount),
        next_at: new Date(data.next_at),
        end_at: data.end_at ? new Date(data.end_at) : null,
      })
      .returning();

    // Generate projected rows for the 90-day horizon
    const projectedDates = generateProjectedDates(
      data.cadence,
      data.next_at,
      90,
      data.end_at
    );

    for (const dueAt of projectedDates) {
      await db.insert(projectedRows).values({
        recurrence_id: newRec.id,
        user_id: req.user.id,
        account_id: data.account_id,
        due_at: dueAt,
        amount: String(data.amount),
        direction: data.direction,
      });
    }

    return res.status(201).json(newRec);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Delete future un-realized rows
    await db
      .delete(projectedRows)
      .where(
        and(
          eq(projectedRows.recurrence_id, id),
          isNull(projectedRows.realized_tx_id)
        )
      );

    await db
      .delete(recurrences)
      .where(and(eq(recurrences.id, id), eq(recurrences.user_id, req.user.id)));

    return res.json({ message: 'Recurrence removed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Recurrence detection suggestion (PRD 8.6)
router.get('/suggestions', async (req, res) => {
  try {
    const ninetyDaysAgo = DateTime.now().minus({ days: 90 }).toJSDate();
    const userTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, req.user.id),
          eq(transactions.direction, 'debit'),
          isNull(transactions.voided_at),
          gte(transactions.posted_at, ninetyDaysAgo)
        )
      );

    // Group by merchant and amount within 5%
    const groups = new Map();
    for (const tx of userTxs) {
      if (!tx.merchant) continue;
      const key = tx.merchant.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tx);
    }

    const suggestions = [];
    for (const [merchant, txs] of groups.entries()) {
      if (txs.length >= 3) {
        // Average amount
        const avgAmt = txs.reduce((sum, t) => sum + Number(t.amount), 0) / txs.length;
        suggestions.push({
          merchant,
          count: txs.length,
          suggestedAmount: Math.round(avgAmt),
          currency: txs[0].currency,
          account_id: txs[0].account_id,
          category_id: txs[0].category_id,
          cadence: 'monthly',
        });
      }
    }

    return res.json(suggestions);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
