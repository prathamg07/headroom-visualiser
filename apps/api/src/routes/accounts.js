import express from 'express';
import { db } from '../db/index.js';
import { accounts, transactions } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { createAccountSchema, updateAccountSchema } from '@headroom/shared';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, req.user.id), isNull(accounts.archived_at)));

    // Calculate current posted balance for each account
    const accountsWithBalance = await Promise.all(
      userAccounts.map(async (acc) => {
        const txs = await db
          .select({
            amount: transactions.amount,
            direction: transactions.direction,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.account_id, acc.id),
              isNull(transactions.voided_at)
            )
          );

        let currentBalance = Number(acc.opening_balance || 0);
        for (const tx of txs) {
          const amt = Number(tx.amount);
          currentBalance += tx.direction === 'credit' ? amt : -amt;
        }

        return {
          ...acc,
          current_balance: currentBalance,
        };
      })
    );

    return res.json(accountsWithBalance);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parseResult = createAccountSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const [account] = await db
      .insert(accounts)
      .values({
        ...parseResult.data,
        user_id: req.user.id,
        opening_balance: String(parseResult.data.opening_balance || 0),
        credit_limit: parseResult.data.credit_limit ? String(parseResult.data.credit_limit) : null,
      })
      .returning();

    return res.status(201).json(account);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parseResult = updateAccountSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const updates = { ...parseResult.data };
    if (updates.opening_balance !== undefined) {
      updates.opening_balance = String(updates.opening_balance);
    }
    if (updates.credit_limit !== undefined) {
      updates.credit_limit = updates.credit_limit ? String(updates.credit_limit) : null;
    }

    const [updated] = await db
      .update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.user_id, req.user.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [archived] = await db
      .update(accounts)
      .set({ archived_at: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.user_id, req.user.id)))
      .returning();

    if (!archived) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json({ message: 'Account archived successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
