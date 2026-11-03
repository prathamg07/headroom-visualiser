import express from 'express';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { createCategorySchema, updateCategorySchema } from '@headroom/shared';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const list = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, req.user.id));
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parseResult = createCategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const [category] = await db
      .insert(categories)
      .values({
        ...parseResult.data,
        user_id: req.user.id,
      })
      .returning();

    return res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parseResult = updateCategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const [updated] = await db
      .update(categories)
      .set(parseResult.data)
      .where(and(eq(categories.id, id), eq(categories.user_id, req.user.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, req.user.id)));
    return res.json({ message: 'Category deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
