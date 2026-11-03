import express from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { updateProfileSchema } from '@headroom/shared';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/', async (req, res) => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const updates = parseResult.data;
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user.id))
      .returning();

    const { password_hash, ...safeUser } = updatedUser;
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
