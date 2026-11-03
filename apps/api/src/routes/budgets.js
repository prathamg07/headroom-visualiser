import express from 'express';
import { db } from '../db/index.js';
import { budgets, categories, transactions } from '../db/schema.js';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { setBudgetSchema } from '@headroom/shared';
import { DateTime } from 'luxon';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const list = await db
      .select({
        category_id: budgets.category_id,
        category_name: categories.name,
        category_color: categories.color,
        amount: budgets.amount,
        currency: budgets.currency,
        period: budgets.period,
        rollover: budgets.rollover,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.category_id, categories.id))
      .where(eq(budgets.user_id, req.user.id));

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:categoryId', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    const parseResult = setBudgetSchema.safeParse({ ...req.body, category_id: categoryId });
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { amount, currency, rollover, period } = parseResult.data;

    // Check if budget exists
    const [existing] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.user_id, req.user.id), eq(budgets.category_id, categoryId)));

    let result;
    if (existing) {
      [result] = await db
        .update(budgets)
        .set({
          amount: String(amount),
          currency,
          rollover,
        })
        .where(and(eq(budgets.user_id, req.user.id), eq(budgets.category_id, categoryId)))
        .returning();
    } else {
      [result] = await db
        .insert(budgets)
        .values({
          user_id: req.user.id,
          category_id: categoryId,
          period,
          amount: String(amount),
          currency,
          rollover,
        })
        .returning();
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:categoryId', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    await db
      .delete(budgets)
      .where(and(eq(budgets.user_id, req.user.id), eq(budgets.category_id, categoryId)));

    return res.json({ message: 'Budget removed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const userBudgets = await db
      .select({
        category_id: budgets.category_id,
        category_name: categories.name,
        category_color: categories.color,
        amount: budgets.amount,
        currency: budgets.currency,
        rollover: budgets.rollover,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.category_id, categories.id))
      .where(eq(budgets.user_id, req.user.id));

    const now = DateTime.now();
    const startOfMonth = now.startOf('month').toJSDate();
    const endOfMonth = now.endOf('month').toJSDate();
    const daysInMonth = now.daysInMonth;
    const currentDay = now.day;
    const daysRemaining = daysInMonth - currentDay;

    const statusList = await Promise.all(
      userBudgets.map(async (b) => {
        const txs = await db
          .select({ amount: transactions.amount })
          .from(transactions)
          .where(
            and(
              eq(transactions.user_id, req.user.id),
              eq(transactions.category_id, b.category_id),
              eq(transactions.direction, 'debit'),
              isNull(transactions.voided_at),
              gte(transactions.posted_at, startOfMonth),
              lte(transactions.posted_at, endOfMonth)
            )
          );

        const spent = txs.reduce((sum, t) => sum + Number(t.amount), 0);
        const budgetAmount = Number(b.amount);
        const remaining = budgetAmount - spent;
        const pctUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        const expectedPacePct = (currentDay / daysInMonth) * 100;
        const paceRatio = expectedPacePct > 0 ? pctUsed / expectedPacePct : 1;

        return {
          category_id: b.category_id,
          category_name: b.category_name,
          category_color: b.category_color,
          currency: b.currency,
          budget_amount: budgetAmount,
          spent,
          remaining,
          pct_used: Math.round(pctUsed),
          days_remaining: daysRemaining,
          pace_ratio: parseFloat(paceRatio.toFixed(2)),
          is_over_budget: spent > budgetAmount,
          warning_level: pctUsed >= 100 ? 'danger' : pctUsed >= 75 ? 'caution' : 'ok',
        };
      })
    );

    return res.json(statusList);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
