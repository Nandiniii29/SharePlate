import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma/db.js';

const SESSION_COOKIE_NAME = 'shareplate_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS };

/**
 * Hash plain password with bcrypt
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

/**
 * Compare plain password against bcrypt hash
 */
export async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Create a persistent session in SQLite database
 */
export async function createSession(userId) {
  const sid = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  const session = await prisma.session.create({
    data: {
      sid,
      userId,
      expiresAt
    }
  });

  return session;
}

/**
 * Delete a session from database
 */
export async function destroySession(sid) {
  if (!sid) return;
  try {
    await prisma.session.deleteMany({
      where: { sid }
    });
  } catch (err) {
    console.error('[SharePlate Auth] Error deleting session:', err);
  }
}

/**
 * Session authentication middleware
 * Attaches req.user if a valid session exists. Does not block unauthenticated requests.
 */
export async function sessionMiddleware(req, res, next) {
  req.user = null;
  const sid = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sid) {
    return next();
  }

  try {
    const session = await prisma.session.findUnique({
      where: { sid },
      include: {
        user: {
          include: {
            organization: true
          }
        }
      }
    });

    if (session && session.expiresAt > new Date()) {
      if (session.user.status === 'ACTIVE') {
        const { passwordHash, ...safeUser } = session.user;
        req.user = safeUser;
        req.sessionId = sid;
      }
    } else if (session) {
      // Clean up expired session
      await prisma.session.delete({ where: { sid } }).catch(() => {});
    }
  } catch (err) {
    console.error('[SharePlate Auth Middleware Error]:', err);
  }

  next();
}

/**
 * Guard middleware requiring an active authenticated user
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to perform this action.'
    });
  }

  if (req.user.status === 'SUSPENDED') {
    return res.status(403).json({
      error: 'Your account has been suspended by administration. Access denied.'
    });
  }

  next();
}

/**
 * Guard middleware enforcing specific user role(s)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.'
      });
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}
