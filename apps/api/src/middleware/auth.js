import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { refreshTokens, users } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'headroom_jwt_access_super_secret_key_2026_dev';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'headroom_jwt_refresh_super_secret_key_2026_dev';

export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      base_currency: user.base_currency,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

export function generateRefreshTokenPayload() {
  return {
    tokenId: uuidv4(),
    familyId: uuidv4(),
  };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createRefreshToken(userId, familyId = null) {
  const finalFamilyId = familyId || uuidv4();
  const rawToken = jwt.sign(
    { userId, familyId: finalFamilyId, jti: uuidv4() },
    REFRESH_SECRET,
    { expiresIn: '30d' }
  );

  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [inserted] = await db
    .insert(refreshTokens)
    .values({
      user_id: userId,
      token_hash: tokenHash,
      family_id: finalFamilyId,
      expires_at: expiresAt,
    })
    .returning();

  return { rawToken, refreshTokenRow: inserted };
}

export async function verifyAndRotateRefreshToken(rawToken) {
  let decoded;
  try {
    decoded = jwt.verify(rawToken, REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawToken);
  const [tokenRecord] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token_hash, tokenHash));

  if (!tokenRecord) {
    throw new Error('Refresh token not found');
  }

  // Token reuse detection (PRD F1): Reuse of a revoked token revokes the entire token family
  if (tokenRecord.revoked_at) {
    await db
      .update(refreshTokens)
      .set({ revoked_at: new Date() })
      .where(eq(refreshTokens.family_id, tokenRecord.family_id));
    throw new Error('Compromised refresh token reused. All sessions revoked.');
  }

  // Revoke current token
  await db
    .update(refreshTokens)
    .set({ revoked_at: new Date() })
    .where(eq(refreshTokens.id, tokenRecord.id));

  // Find user
  const [user] = await db.select().from(users).where(eq(users.id, tokenRecord.user_id));
  if (!user) {
    throw new Error('User not found');
  }

  // Issue new token pair
  const newAccessToken = generateAccessToken(user);
  const { rawToken: newRefreshToken } = await createRefreshToken(user.id, tokenRecord.family_id);

  return { newAccessToken, newRefreshToken, user };
}

export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, ACCESS_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.user = user;
    next();
  });
}
