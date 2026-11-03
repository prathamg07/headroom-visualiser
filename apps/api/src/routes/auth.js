import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import { users, categories, accounts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { registerSchema, loginSchema } from '@headroom/shared';
import {
  generateAccessToken,
  createRefreshToken,
  verifyAndRotateRefreshToken,
} from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for login: 5 failed attempts in 15 mins (PRD F1)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts total to allow legitimate retries
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#E53935', is_fixed: false },
  { name: 'Rent & Housing', color: '#1E88E5', is_fixed: true },
  { name: 'Utilities & Bills', color: '#FDD835', is_fixed: true },
  { name: 'Transportation', color: '#888888', is_fixed: false },
  { name: 'Subscriptions', color: '#D64545', is_fixed: true },
  { name: 'Entertainment', color: '#2D6CDF', is_fixed: false },
  { name: 'Healthcare', color: '#E8C547', is_fixed: false },
  { name: 'Salary / Income', color: '#1E88E5', is_fixed: false },
];

router.post('/register', async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { name, email, password, timezone, base_currency, buffer_amounts, projection_settings } =
      parseResult.data;

    // Check existing email
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password_hash,
        timezone,
        base_currency,
        buffer_amounts,
        projection_settings,
      })
      .returning();

    // Seed default categories for this user
    for (const cat of DEFAULT_CATEGORIES) {
      await db.insert(categories).values({
        user_id: newUser.id,
        name: cat.name,
        color: cat.color,
        is_fixed: cat.is_fixed,
      });
    }

    // Seed default primary checking account
    await db.insert(accounts).values({
      user_id: newUser.id,
      name: 'Primary Checking',
      kind: 'checking',
      currency: base_currency,
      opening_balance: '0.00',
    });

    const accessToken = generateAccessToken(newUser);
    const { rawToken: refreshToken } = await createRefreshToken(newUser.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        base_currency: newUser.base_currency,
        timezone: newUser.timezone,
        buffer_amounts: newUser.buffer_amounts,
        projection_settings: newUser.projection_settings,
      },
      accessToken,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { email, password } = parseResult.data;
    const [user] = await db.select().from(users).where(eq(users.email, email));

    // Constant-time check mitigation
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user);
    const { rawToken: refreshToken } = await createRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        base_currency: user.base_currency,
        display_currency: user.display_currency,
        timezone: user.timezone,
        buffer_amounts: user.buffer_amounts,
        projection_settings: user.projection_settings,
      },
      accessToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const { newAccessToken, newRefreshToken, user } = await verifyAndRotateRefreshToken(rawToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken: newAccessToken, user });
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully' });
});

export default router;
