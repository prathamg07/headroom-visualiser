import express from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { groups, groupMembers, splits, splitShares, settlements, users } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { createGroupSchema, joinGroupSchema, createSplitSchema, createSettlementSchema } from '@headroom/shared';
import { calculateSettlements, calculateGroupBalances } from '@headroom/settle';

const router = express.Router();
router.use(authenticate);

function generateJoinCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.get('/', async (req, res) => {
  try {
    const userMemberships = await db
      .select({
        group_id: groupMembers.group_id,
        role: groupMembers.role,
        group_name: groups.name,
        join_code: groups.join_code,
        base_currency: groups.base_currency,
        owner_id: groups.owner_id,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.group_id, groups.id))
      .where(eq(groupMembers.user_id, req.user.id));

    return res.json(userMemberships);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parseResult = createGroupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { name, base_currency } = parseResult.data;
    const join_code = generateJoinCode();

    const [newGroup] = await db
      .insert(groups)
      .values({
        name,
        join_code,
        base_currency,
        owner_id: req.user.id,
      })
      .returning();

    // Add creator as owner member
    await db.insert(groupMembers).values({
      group_id: newGroup.id,
      user_id: req.user.id,
      role: 'owner',
    });

    return res.status(201).json(newGroup);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/join', async (req, res) => {
  try {
    const parseResult = joinGroupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { join_code } = parseResult.data;
    const [targetGroup] = await db
      .select()
      .from(groups)
      .where(eq(groups.join_code, join_code.toUpperCase()));

    if (!targetGroup) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    // Check already member
    const [existing] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.group_id, targetGroup.id), eq(groupMembers.user_id, req.user.id)));

    if (existing) {
      return res.json({ message: 'Already a member', group: targetGroup });
    }

    await db.insert(groupMembers).values({
      group_id: targetGroup.id,
      user_id: req.user.id,
      role: 'member',
    });

    return res.json({ message: 'Joined successfully', group: targetGroup });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = await db
      .select({
        user_id: users.id,
        name: users.name,
        email: users.email,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.user_id, users.id))
      .where(eq(groupMembers.group_id, groupId));

    return res.json({ ...group, members });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/splits', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const groupSplits = await db
      .select()
      .from(splits)
      .where(and(eq(splits.group_id, groupId), isNull(splits.deleted_at)));

    const splitsWithShares = await Promise.all(
      groupSplits.map(async (s) => {
        const shares = await db
          .select({
            user_id: splitShares.user_id,
            share: splitShares.share,
            name: users.name,
          })
          .from(splitShares)
          .innerJoin(users, eq(splitShares.user_id, users.id))
          .where(eq(splitShares.split_id, s.id));

        return { ...s, shares };
      })
    );

    return res.json(splitsWithShares);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/splits', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const parseResult = createSplitSchema.safeParse({ ...req.body, group_id: groupId });
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const data = parseResult.data;

    const [newSplit] = await db
      .insert(splits)
      .values({
        group_id: groupId,
        posted_by: req.user.id,
        paid_by: data.paid_by,
        label: data.label,
        total: String(data.total),
        currency: data.currency,
        posted_at: new Date(data.posted_at),
        notes: data.notes,
      })
      .returning();

    for (const s of data.shares) {
      await db.insert(splitShares).values({
        split_id: newSplit.id,
        user_id: s.user_id,
        share: String(s.share),
      });
    }

    return res.status(201).json(newSplit);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/balances', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const members = await db
      .select({ id: users.id, name: users.name })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.user_id, users.id))
      .where(eq(groupMembers.group_id, groupId));

    const groupSplits = await db
      .select()
      .from(splits)
      .where(and(eq(splits.group_id, groupId), isNull(splits.deleted_at)));

    const splitsWithShares = await Promise.all(
      groupSplits.map(async (s) => {
        const shares = await db
          .select()
          .from(splitShares)
          .where(eq(splitShares.split_id, s.id));
        return { ...s, shares };
      })
    );

    const netBalances = calculateGroupBalances(splitsWithShares, members);

    return res.json({ members, netBalances });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/settle-up', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const members = await db
      .select({ id: users.id, name: users.name })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.user_id, users.id))
      .where(eq(groupMembers.group_id, groupId));

    const groupSplits = await db
      .select()
      .from(splits)
      .where(and(eq(splits.group_id, groupId), isNull(splits.deleted_at)));

    const splitsWithShares = await Promise.all(
      groupSplits.map(async (s) => {
        const shares = await db
          .select()
          .from(splitShares)
          .where(eq(splitShares.split_id, s.id));
        return { ...s, shares };
      })
    );

    const netBalances = calculateGroupBalances(splitsWithShares, members);
    const transfers = calculateSettlements(netBalances);

    // Map names to transfers
    const memberMap = new Map(members.map((m) => [String(m.id), m.name]));
    const namedTransfers = transfers.map((t) => ({
      ...t,
      from_name: memberMap.get(String(t.from_user)) || `User ${t.from_user}`,
      to_name: memberMap.get(String(t.to_user)) || `User ${t.to_user}`,
    }));

    return res.json({
      transfers: namedTransfers,
      count: namedTransfers.length,
      netBalances,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/settlements', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const parseResult = createSettlementSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const [settlement] = await db
      .insert(settlements)
      .values({
        ...parseResult.data,
        group_id: groupId,
        amount: String(parseResult.data.amount),
      })
      .returning();

    return res.status(201).json(settlement);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
