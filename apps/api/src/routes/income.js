import express from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, incomeSources } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { createIncomeSchema } from '@headroom/shared';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const rows = await db.select().from(incomeSources).where(eq(incomeSources.user_id, req.user.id));
  return res.json(rows);
});

router.post('/', async (req, res) => {
  const parsed = createIncomeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
  const [account] = await db.select({ id: accounts.id }).from(accounts).where(
    and(eq(accounts.id, parsed.data.account_id), eq(accounts.user_id, req.user.id), isNull(accounts.archived_at))
  );
  if (!account) return res.status(400).json({ error: 'Account not found or access denied' });
  const [source] = await db.insert(incomeSources).values({
    ...parsed.data,
    user_id: req.user.id,
    amount: String(parsed.data.amount),
    next_at: new Date(parsed.data.next_at),
    active: true,
  }).returning();
  return res.status(201).json(source);
});

router.patch('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const parsed = createIncomeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
  const values = { ...parsed.data };
  if (values.amount !== undefined) values.amount = String(values.amount);
  if (values.next_at !== undefined) values.next_at = new Date(values.next_at);
  const [updated] = await db.update(incomeSources).set(values).where(
    and(eq(incomeSources.id, id), eq(incomeSources.user_id, req.user.id))
  ).returning();
  if (!updated) return res.status(404).json({ error: 'Income source not found' });
  return res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const [updated] = await db.update(incomeSources).set({ active: false }).where(
    and(eq(incomeSources.id, id), eq(incomeSources.user_id, req.user.id))
  ).returning();
  if (!updated) return res.status(404).json({ error: 'Income source not found' });
  return res.json(updated);
});

export default router;
