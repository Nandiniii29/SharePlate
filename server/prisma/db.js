import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

/**
 * Strips private verification codes from allocations in donation object for public viewing.
 */
export function sanitizeDonation(donation, currentUserId = null, userRole = null) {
  if (!donation) return donation;
  const clone = JSON.parse(JSON.stringify(donation));
  
  if (Array.isArray(clone.allocations)) {
    clone.allocations = clone.allocations.map(alc => {
      // If user is admin or the recipient who claimed this allocation, allow seeing verification code
      const isOwnerRecipient = currentUserId && (alc.recipientUserId === currentUserId);
      if (userRole === 'ADMIN' || isOwnerRecipient) {
        return alc;
      }
      const { verificationCode, ...safeAlc } = alc;
      return safeAlc;
    });
  }
  return clone;
}

/**
 * Creates an immutable audit event
 */
export async function recordAuditEvent({ type, donationId = null, allocationId = null, userId = null, details }) {
  try {
    const eventId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
    
    return await prisma.auditEvent.create({
      data: {
        id: eventId,
        type,
        donationId,
        allocationId,
        userId,
        details: detailsStr
      }
    });
  } catch (err) {
    console.error('[SharePlate Audit Error] Failed to log audit event:', err);
    return null;
  }
}

/**
 * Creates an in-app notification
 */
export async function sendNotification({ userId = null, recipientOrgId = null, title, message, type = 'SYSTEM', link = null }) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        recipientOrgId,
        title,
        message,
        type,
        link,
        isRead: false
      }
    });
  } catch (err) {
    console.error('[SharePlate Notification Error] Failed to send notification:', err);
    return null;
  }
}
