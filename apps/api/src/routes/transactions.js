import express from 'express';
import { db } from '../db/index.js';
import { transactions, transactionChanges, accounts, categories } from '../db/schema.js';
import { eq, and, isNull, gte, lte, ilike, desc, or } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { createTransactionSchema, updateTransactionSchema } from '@headroom/shared';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { from, to, account_id, category_id, direction, q, include_voided } = req.query;

    const conditions = [eq(transactions.user_id, req.user.id)];

    if (!include_voided || include_voided === 'false') {
      conditions.push(isNull(transactions.voided_at));
    }

    if (account_id) {
      conditions.push(eq(transactions.account_id, parseInt(account_id, 10)));
    }

    if (category_id) {
      conditions.push(eq(transactions.category_id, parseInt(category_id, 10)));
    }

    if (direction) {
      conditions.push(eq(transactions.direction, direction));
    }

    if (from) {
      conditions.push(gte(transactions.posted_at, new Date(from)));
    }

    if (to) {
      conditions.push(lte(transactions.posted_at, new Date(to)));
    }

    if (q) {
      conditions.push(
        or(
          ilike(transactions.merchant, `%${q}%`),
          ilike(transactions.description, `%${q}%`)
        )
      );
    }

    const list = await db
      .select({
        id: transactions.id,
        user_id: transactions.user_id,
        account_id: transactions.account_id,
        account_name: accounts.name,
        account_kind: accounts.kind,
        posted_at: transactions.posted_at,
        amount: transactions.amount,
        currency: transactions.currency,
        direction: transactions.direction,
        category_id: transactions.category_id,
        category_name: categories.name,
        category_color: categories.color,
        category_is_fixed: categories.is_fixed,
        merchant: transactions.merchant,
        description: transactions.description,
        bank_reference: transactions.bank_reference,
        source: transactions.source,
        voided_at: transactions.voided_at,
        created_at: transactions.created_at,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.account_id, accounts.id))
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.posted_at));

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parseResult = createTransactionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const data = parseResult.data;

    // Verify account belongs to user
    const [acc] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, data.account_id), eq(accounts.user_id, req.user.id)));

    if (!acc) {
      return res.status(400).json({ error: 'Account not found or access denied' });
    }

    const [newTx] = await db
      .insert(transactions)
      .values({
        ...data,
        user_id: req.user.id,
        amount: String(data.amount),
        posted_at: new Date(data.posted_at),
      })
      .returning();

    // Record change history
    await db.insert(transactionChanges).values({
      transaction_id: newTx.id,
      user_id: req.user.id,
      change_type: 'created',
      new_values: newTx,
      source: data.source || 'manual',
    });

    return res.status(201).json(newTx);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parseResult = updateTransactionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const [existing] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.user_id, req.user.id)));

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updates = { ...parseResult.data };
    if (updates.amount !== undefined) {
      updates.amount = String(updates.amount);
    }
    if (updates.posted_at !== undefined) {
      updates.posted_at = new Date(updates.posted_at);
    }

    const [updated] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();

    // Record change history
    await db.insert(transactionChanges).values({
      transaction_id: id,
      user_id: req.user.id,
      change_type: 'updated',
      old_values: existing,
      new_values: updated,
      source: 'manual',
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/void', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [existing] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.user_id, req.user.id)));

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const [voided] = await db
      .update(transactions)
      .set({ voided_at: new Date() })
      .where(eq(transactions.id, id))
      .returning();

    await db.insert(transactionChanges).values({
      transaction_id: id,
      user_id: req.user.id,
      change_type: 'voided',
      old_values: existing,
      new_values: voided,
      source: 'manual',
    });

    return res.json({ message: 'Transaction voided', transaction: voided });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const history = await db
      .select()
      .from(transactionChanges)
      .where(and(eq(transactionChanges.transaction_id, id), eq(transactionChanges.user_id, req.user.id)))
      .orderBy(desc(transactionChanges.created_at));

    return res.json(history);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
