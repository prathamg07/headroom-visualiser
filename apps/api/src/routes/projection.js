import express from 'express';
import { db } from '../db/index.js';
import { accounts, transactions, projectedRows, categories, users } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import {
  calculateBurnRate,
  calculateDailyBalances,
  simulateHeadroom,
  detectCollisions,
} from '@headroom/projection';
import { DateTime } from 'luxon';

const router = express.Router();
router.use(authenticate);

async function loadUserProjectionContext(userId, preferredCurrency = null) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const currency = preferredCurrency || user.base_currency || 'INR';

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.user_id, userId), isNull(accounts.archived_at)));

  const userTxs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.user_id, userId), isNull(transactions.voided_at)));

  const userProjected = await db
    .select()
    .from(projectedRows)
    .where(and(eq(projectedRows.user_id, userId), isNull(projectedRows.voided_at), isNull(projectedRows.realized_tx_id)));

  const userCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.user_id, userId));

  const bufferAmounts = user.buffer_amounts || {};
  const buffer = Number(bufferAmounts[currency] !== undefined ? bufferAmounts[currency] : 2000);
  const settings = user.projection_settings || {};
  const horizonDays = settings.horizonDays || 30;
  const burnWindowDays = settings.burnWindowDays || 14;
  const includeCreditAvail = settings.includeCreditAvail || false;

  return {
    user,
    currency,
    buffer,
    horizonDays,
    burnWindowDays,
    includeCreditAvail,
    accounts: userAccounts,
    transactions: userTxs,
    projectedRows: userProjected,
    categories: userCategories,
  };
}

router.get('/', async (req, res) => {
  try {
    const ctx = await loadUserProjectionContext(req.user.id, req.query.currency);
    const todayStr = DateTime.now().setZone(ctx.user.timezone || 'UTC').toISODate();

    const burnRate = calculateBurnRate({
      transactions: ctx.transactions,
      categories: ctx.categories,
      todayStr,
      burnWindowDays: ctx.burnWindowDays,
      zone: ctx.user.timezone || 'UTC',
    }) || 0;

    const dailyBalances = calculateDailyBalances({
      accounts: ctx.accounts,
      transactions: ctx.transactions,
      projectedRows: ctx.projectedRows,
      todayStr,
      horizonDays: ctx.horizonDays,
      currency: ctx.currency,
      buffer: ctx.buffer,
      burnRate,
      includeCreditAvail: ctx.includeCreditAvail,
      zone: ctx.user.timezone || 'UTC',
    });

    const collisions = detectCollisions(dailyBalances);

    // Prepare forward projected debits and credits by date for headroom simulation
    const projectedCredits = new Map();
    const projectedFixedDebits = new Map();
    const fixedCatIds = new Set(ctx.categories.filter((c) => c.is_fixed).map((c) => c.id));

    for (const row of ctx.projectedRows) {
      const dateKey = DateTime.fromJSDate(new Date(row.due_at), { zone: ctx.user.timezone || 'UTC' }).toISODate();
      const amt = Number(row.amount);
      if (row.direction === 'credit') {
        projectedCredits.set(dateKey, (projectedCredits.get(dateKey) || 0) + amt);
      } else {
        projectedFixedDebits.set(dateKey, (projectedFixedDebits.get(dateKey) || 0) + amt);
      }
    }

    const startingBalance = dailyBalances[0] ? dailyBalances[0].balance : 0;

    const headroom = simulateHeadroom({
      startingBalance,
      burnRate,
      projectedCreditsByDay: projectedCredits,
      projectedFixedDebitsByDay: projectedFixedDebits,
      buffer: ctx.buffer,
      horizonDays: ctx.horizonDays,
      todayStr,
      zone: ctx.user.timezone || 'UTC',
    });

    return res.json({
      currency: ctx.currency,
      buffer: ctx.buffer,
      burnRate,
      headroomDays: headroom.headroomDays,
      headroomDate: headroom.headroomDate,
      collisions,
      dailyBalances,
      today: todayStr,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/heatmap', async (req, res) => {
  try {
    const ctx = await loadUserProjectionContext(req.user.id, req.query.currency);
    const todayStr = DateTime.now().setZone(ctx.user.timezone || 'UTC').toISODate();

    const burnRate = calculateBurnRate({
      transactions: ctx.transactions,
      categories: ctx.categories,
      todayStr,
      burnWindowDays: ctx.burnWindowDays,
      zone: ctx.user.timezone || 'UTC',
    }) || 0;

    const dailyBalances = calculateDailyBalances({
      accounts: ctx.accounts,
      transactions: ctx.transactions,
      projectedRows: ctx.projectedRows,
      todayStr,
      horizonDays: ctx.horizonDays,
      currency: ctx.currency,
      buffer: ctx.buffer,
      burnRate,
      includeCreditAvail: ctx.includeCreditAvail,
      zone: ctx.user.timezone || 'UTC',
    });

    return res.json({
      currency: ctx.currency,
      buffer: ctx.buffer,
      burnRate,
      days: dailyBalances,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/headroom', async (req, res) => {
  try {
    const ctx = await loadUserProjectionContext(req.user.id, req.query.currency);
    const todayStr = DateTime.now().setZone(ctx.user.timezone || 'UTC').toISODate();

    const burnRate = calculateBurnRate({
      transactions: ctx.transactions,
      categories: ctx.categories,
      todayStr,
      burnWindowDays: ctx.burnWindowDays,
      zone: ctx.user.timezone || 'UTC',
    }) || 0;

    const dailyBalances = calculateDailyBalances({
      accounts: ctx.accounts,
      transactions: ctx.transactions,
      projectedRows: ctx.projectedRows,
      todayStr,
      horizonDays: ctx.horizonDays,
      currency: ctx.currency,
      buffer: ctx.buffer,
      burnRate,
      includeCreditAvail: ctx.includeCreditAvail,
      zone: ctx.user.timezone || 'UTC',
    });

    const projectedCredits = new Map();
    const projectedFixedDebits = new Map();

    for (const row of ctx.projectedRows) {
      const dateKey = DateTime.fromJSDate(new Date(row.due_at), { zone: ctx.user.timezone || 'UTC' }).toISODate();
      const amt = Number(row.amount);
      if (row.direction === 'credit') {
        projectedCredits.set(dateKey, (projectedCredits.get(dateKey) || 0) + amt);
      } else {
        projectedFixedDebits.set(dateKey, (projectedFixedDebits.get(dateKey) || 0) + amt);
      }
    }

    const startingBalance = dailyBalances[0] ? dailyBalances[0].balance : 0;

    const headroom = simulateHeadroom({
      startingBalance,
      burnRate,
      projectedCreditsByDay: projectedCredits,
      projectedFixedDebitsByDay: projectedFixedDebits,
      buffer: ctx.buffer,
      horizonDays: ctx.horizonDays,
      todayStr,
      zone: ctx.user.timezone || 'UTC',
    });

    return res.json({
      currency: ctx.currency,
      buffer: ctx.buffer,
      burnRate,
      headroomDays: headroom.headroomDays,
      headroomDate: headroom.headroomDate,
      dailyPath: headroom.dailyPath,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
