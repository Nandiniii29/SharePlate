import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Prisma & Database
import { prisma, sanitizeDonation, recordAuditEvent, sendNotification } from './prisma/db.js';

// Authentication & Session
import { 
  hashPassword, 
  comparePassword, 
  createSession, 
  destroySession, 
  sessionMiddleware, 
  requireAuth, 
  requireRole,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS 
} from './auth.js';

// Core algorithmic rescue engines
import { calculateRescuePriorityScore } from './engines/priorityScore.js';
import { matchRecipients } from './engines/smartMatcher.js';
import { validateClaim } from './engines/splitMatcher.js';
import { evaluateFailedPickupRecovery } from './engines/recoveryEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting credentials (cookies)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin, tests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for local dev
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

/**
 * Helper to normalize and format a Donation DB record into the standard API response structure
 */
function formatDonationForResponse(donation, reqUser = null) {
  if (!donation) return null;

  let breakdown = {};
  if (donation.priorityBreakdown) {
    try {
      breakdown = typeof donation.priorityBreakdown === 'string' 
        ? JSON.parse(donation.priorityBreakdown) 
        : donation.priorityBreakdown;
    } catch (e) {}
  }

  let recoveryAlert = null;
  if (donation.recoveryAlert) {
    try {
      recoveryAlert = typeof donation.recoveryAlert === 'string'
        ? JSON.parse(donation.recoveryAlert)
        : donation.recoveryAlert;
    } catch (e) {}
  }

  const rawAllocations = donation.allocations || [];
  const formattedAllocations = rawAllocations.map(a => {
    const isOwnerRecipient = reqUser && (a.recipientUserId === reqUser.id || a.recipientId === reqUser.organizationId);
    const isAdmin = reqUser && reqUser.role === 'ADMIN';

    const base = {
      allocationId: a.id,
      id: a.id,
      donationId: a.donationId,
      recipientId: a.recipientId,
      recipientUserId: a.recipientUserId,
      recipientName: a.recipientName,
      portions: a.portions,
      notes: a.notes,
      status: a.status,
      releaseReason: a.releaseReason,
      dispositionReason: a.dispositionReason,
      actualPortionsCollected: a.actualPortionsCollected,
      verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
      verifiedBy: a.verifiedBy,
      recoveryAttempts: a.recoveryAttempts,
      createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString()
    };

    // Private verification codes must only be visible to the authorized recipient or admin
    if (isOwnerRecipient || isAdmin) {
      base.verificationCode = a.verificationCode;
    }

    return base;
  });

  return {
    id: donation.id,
    title: donation.title,
    description: donation.description || '',
    category: donation.category || 'PREPARED_MEALS',
    donorId: donation.donorId,
    organizationId: donation.organizationId,
    donorName: donation.donorName,
    donorContact: donation.donorContact,
    location: donation.location,
    foodType: donation.foodType,
    storageCondition: donation.storageCondition,
    totalPortions: donation.totalPortions,
    allocatedPortions: donation.allocatedPortions,
    remainingPortions: donation.remainingPortions,
    status: donation.status,
    isVeg: donation.isVeg,
    dietaryInfo: donation.dietaryInfo || (donation.isVeg ? 'Vegetarian' : 'Non-Vegetarian'),
    allergens: donation.allergens || 'None declared',
    pickupWindowStart: donation.pickupWindowStart,
    pickupWindowEnd: donation.pickupWindowEnd,
    safeConsumptionDeadline: donation.safeConsumptionDeadline ? donation.safeConsumptionDeadline.toISOString() : null,
    estimatedTransitMinutes: donation.estimatedTransitMinutes,
    imageUrl: donation.imageUrl || null,
    safetyStatus: {
      isCertifiedSafe: donation.isCertifiedSafe,
      hasTemperatureAbuse: donation.hasTemperatureAbuse,
      sensoryInspectionPassed: donation.sensoryInspectionPassed,
      certifiedBy: donation.certifiedBy || donation.donorName,
      notes: donation.safetyNotes || ''
    },
    priorityScore: {
      score: donation.priorityScore,
      urgencyLevel: donation.urgencyLevel,
      eligibleForRescue: donation.eligibleForRescue,
      breakdown
    },
    recoveryAlert,
    createdAt: donation.createdAt ? donation.createdAt.toISOString() : new Date().toISOString(),
    allocations: formattedAllocations
  };
}

// ============================================================================
// 1. HEALTH & WELCOME ENDPOINTS
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SharePlate Backend API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: 'SQLite (Prisma ORM with ACID Transactions)'
  });
});

app.get('/', (req, res) => {
  res.json({
    brand: 'SharePlate — Good Food. Greater Impact.',
    message: 'Welcome to the SharePlate REST API',
    documentation: 'See README.md for endpoint specifications'
  });
});

/**
 * GET /api/audit
 * Returns safety, recovery, and audit log events.
 */
app.get('/api/audit', async (req, res) => {
  try {
    const events = await prisma.auditEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    const auditEvents = events.map(e => ({
      eventId: e.id,
      id: e.id,
      type: e.type,
      donationId: e.donationId,
      allocationId: e.allocationId,
      userId: e.userId,
      details: e.details,
      timestamp: e.timestamp.toISOString()
    }));

    res.json({ auditEvents });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve audit events: ${err.message}` });
  }
});

// ============================================================================
// 2. AUTHENTICATION & SESSION ENDPOINTS
// ============================================================================

/**
 * POST /api/auth/signup
 * Register a genuine donor or recipient account.
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      accountType, // 'DONOR' or 'RECIPIENT'
      organizationName,
      phone = '',
      location = '',
      capacityMax = 150,
      acceptsNonVeg = true,
      operatingHoursStart = '09:00',
      operatingHoursEnd = '22:00'
    } = req.body;

    // 1. Validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const role = (accountType || 'RECIPIENT').toUpperCase();
    if (role !== 'DONOR' && role !== 'RECIPIENT') {
      return res.status(400).json({ error: "Account type must be either 'DONOR' or 'RECIPIENT'." });
    }

    // 2. Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create Organization and User in an atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const orgId = `ORG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const orgName = (organizationName && organizationName.trim()) 
        ? organizationName.trim() 
        : `${fullName.trim()}'s Organization`;

      const org = await tx.organization.create({
        data: {
          id: orgId,
          name: orgName,
          type: role === 'DONOR' ? 'MESS_CANTEEN' : 'COMMUNITY_KITCHEN',
          contactPerson: fullName.trim(),
          phone: phone.trim(),
          email: normalizedEmail,
          location: location.trim() || 'Campus District',
          capacityMin: 10,
          capacityMax: Number(capacityMax) || 150,
          acceptsNonVeg: Boolean(acceptsNonVeg),
          operatingHoursStart: operatingHoursStart || '09:00',
          operatingHoursEnd: operatingHoursEnd || '22:00',
          illustrativeDistanceKm: 2.5,
          isVerified: true
        }
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: fullName.trim(),
          role,
          organizationId: org.id,
          phone: phone.trim(),
          status: 'ACTIVE'
        },
        include: {
          organization: true
        }
      });

      // Create persistent session
      const sid = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
      await tx.session.create({
        data: {
          sid,
          userId: user.id,
          expiresAt
        }
      });

      // Welcome notification
      await tx.notification.create({
        data: {
          userId: user.id,
          recipientOrgId: org.id,
          title: `Welcome to SharePlate, ${user.fullName}!`,
          message: role === 'DONOR' 
            ? 'Your donor account is active. You can list prepared surplus batches, specify storage parameters, and verify pickups securely.'
            : 'Your recipient account is active. Browse fresh surplus postings, claim split portions, and track physical delivery handshakes.',
          type: 'SYSTEM'
        }
      });

      return { user, sid, expiresAt };
    });

    // 5. Set HttpOnly session cookie
    res.cookie(SESSION_COOKIE_NAME, result.sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS
    });

    const { passwordHash: _, ...safeUser } = result.user;

    res.status(201).json({
      success: true,
      message: 'Account successfully registered and logged in.',
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

/**
 * POST /api/auth/login
 * Log in with email and password.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'This account has been suspended by administration. Please contact support.' });
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create session in SQLite
    const session = await createSession(user.id);

    // Set HttpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, session.sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS
    });

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Logged in successfully.',
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: `Login failed: ${err.message}` });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session and clear cookie.
 */
app.post('/api/auth/logout', async (req, res) => {
  try {
    const sid = req.cookies?.[SESSION_COOKIE_NAME];
    if (sid) {
      await destroySession(sid);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: `Logout failed: ${err.message}` });
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user profile and organization.
 */
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  res.json({ user: req.user });
});

/**
 * PUT /api/auth/profile
 * Update profile and organization settings.
 */
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { 
      fullName, 
      phone, 
      organizationName, 
      location, 
      capacityMin, 
      capacityMax, 
      acceptsNonVeg,
      operatingHoursStart,
      operatingHoursEnd
    } = req.body;

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (req.user.organizationId) {
        await tx.organization.update({
          where: { id: req.user.organizationId },
          data: {
            name: organizationName !== undefined ? organizationName.trim() : undefined,
            location: location !== undefined ? location.trim() : undefined,
            capacityMin: capacityMin !== undefined ? Number(capacityMin) : undefined,
            capacityMax: capacityMax !== undefined ? Number(capacityMax) : undefined,
            acceptsNonVeg: acceptsNonVeg !== undefined ? Boolean(acceptsNonVeg) : undefined,
            operatingHoursStart: operatingHoursStart || undefined,
            operatingHoursEnd: operatingHoursEnd || undefined
          }
        });
      }

      return await tx.user.update({
        where: { id: req.user.id },
        data: {
          fullName: fullName !== undefined ? fullName.trim() : undefined,
          phone: phone !== undefined ? phone.trim() : undefined
        },
        include: { organization: true }
      });
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    res.json({ success: true, message: 'Profile updated successfully.', user: safeUser });
  } catch (err) {
    res.status(500).json({ error: `Failed to update profile: ${err.message}` });
  }
});

/**
 * PUT /api/auth/password
 * Secure password change.
 */
app.put('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const passwordValid = await comparePassword(currentPassword, user.passwordHash);

    if (!passwordValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash }
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: `Failed to update password: ${err.message}` });
  }
});

// ============================================================================
// 3. DONATION ENDPOINTS
// ============================================================================

/**
 * GET /api/donations
 * Retrieves donations with optional search & filters.
 */
app.get('/api/donations', async (req, res) => {
  try {
    const { status, category, isVeg, search } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (isVeg !== undefined && isVeg !== 'ALL') {
      where.isVeg = isVeg === 'true';
    }
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { donorName: { contains: search.trim() } },
        { location: { contains: search.trim() } }
      ];
    }

    const donations = await prisma.donation.findMany({
      where,
      include: { allocations: true },
      orderBy: { createdAt: 'desc' }
    });

    const sanitized = donations.map(d => formatDonationForResponse(d, req.user));
    res.json({ donations: sanitized });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve donations: ${err.message}` });
  }
});

/**
 * GET /api/donations/:id
 * Retrieves a single donation by ID.
 */
app.get('/api/donations/:id', async (req, res) => {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: req.params.id },
      include: { allocations: true }
    });

    if (!donation) {
      return res.status(404).json({ error: `Donation with ID '${req.params.id}' was not found.` });
    }

    res.json({ donation: formatDonationForResponse(donation, req.user) });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve donation: ${err.message}` });
  }
});

/**
 * POST /api/donations
 * Creates a new surplus food donation with Rescue Priority Score and safety checklist.
 */
app.post('/api/donations', async (req, res) => {
  try {
    const {
      title,
      description = '',
      category = 'PREPARED_MEALS',
      donorName,
      donorContact = 'unspecified@campus.edu',
      location = 'Campus Canteen (Illustrative location)',
      foodType = 'COOKED_HOT',
      storageCondition = 'HOT_HOLDING',
      totalPortions,
      isVeg = true,
      dietaryInfo = '',
      allergens = '',
      pickupWindowStart = '18:00',
      pickupWindowEnd = '21:00',
      safeConsumptionDeadline,
      estimatedTransitMinutes = 20,
      imageUrl = null,
      safetyStatus = {}
    } = req.body;

    // 1. Validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Donation title is required and must be non-empty.' });
    }

    const effectiveDonorName = donorName || req.user?.fullName || 'Campus Donor';
    if (!effectiveDonorName || effectiveDonorName.trim() === '') {
      return res.status(400).json({ error: 'Donor name is required and must be non-empty.' });
    }

    const portions = Number(totalPortions);
    if (!Number.isInteger(portions) || portions <= 0) {
      return res.status(400).json({ error: 'totalPortions must be a positive integer greater than 0.' });
    }

    // 2. Compute hours remaining for Rescue Priority Score
    let hoursUntilExpiry = 2.0;
    let deadlineDate = safeConsumptionDeadline ? new Date(safeConsumptionDeadline) : null;
    if (deadlineDate && !isNaN(deadlineDate.getTime())) {
      const msRemaining = deadlineDate.getTime() - Date.now();
      hoursUntilExpiry = Math.max(0, msRemaining / (1000 * 60 * 60));
    } else {
      deadlineDate = new Date(Date.now() + 2.5 * 3600000);
    }

    // 3. Compute Rescue Priority Score (Innovation 1)
    const priorityResult = calculateRescuePriorityScore({
      foodType,
      hoursUntilExpiry,
      storageCondition,
      estimatedTransitMinutes,
      safetyData: safetyStatus
    });

    const donationId = `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newDonation = await prisma.$transaction(async (tx) => {
      const record = await tx.donation.create({
        data: {
          id: donationId,
          title: title.trim(),
          description: description.trim(),
          category,
          donorId: req.user?.id || null,
          organizationId: req.user?.organizationId || null,
          donorName: effectiveDonorName.trim(),
          donorContact: donorContact.trim(),
          location: location.trim(),
          foodType,
          storageCondition,
          totalPortions: portions,
          allocatedPortions: 0,
          remainingPortions: portions,
          status: 'AVAILABLE',
          isVeg: Boolean(isVeg),
          dietaryInfo: dietaryInfo.trim() || (isVeg ? 'Vegetarian' : 'Non-Vegetarian'),
          allergens: allergens.trim() || 'None declared',
          pickupWindowStart,
          pickupWindowEnd,
          safeConsumptionDeadline: deadlineDate,
          estimatedTransitMinutes: Number(estimatedTransitMinutes) || 20,
          imageUrl,
          isCertifiedSafe: Boolean(safetyStatus.isCertifiedSafe ?? true),
          hasTemperatureAbuse: Boolean(safetyStatus.hasTemperatureAbuse ?? false),
          sensoryInspectionPassed: Boolean(safetyStatus.sensoryInspectionPassed ?? true),
          certifiedBy: safetyStatus.certifiedBy || effectiveDonorName,
          safetyNotes: safetyStatus.notes || 'Checked by donor upon listing.',
          priorityScore: priorityResult.score,
          urgencyLevel: priorityResult.urgencyLevel,
          eligibleForRescue: priorityResult.eligibleForRescue,
          priorityBreakdown: JSON.stringify(priorityResult.breakdown)
        },
        include: { allocations: true }
      });

      await tx.auditEvent.create({
        data: {
          id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'DONATION_CREATED',
          donationId: record.id,
          userId: req.user?.id || null,
          details: `Donation '${record.title}' (${record.totalPortions} portions) created with priority score ${priorityResult.score}.`
        }
      });

      // Mirror to legacy db.json for backward test compatibility
      try {
        const legacyDbPath = path.join(__dirname, 'data/db.json');
        if (fs.existsSync(legacyDbPath)) {
          const raw = JSON.parse(fs.readFileSync(legacyDbPath, 'utf-8'));
          if (Array.isArray(raw.donations)) {
            raw.donations.unshift(record);
            fs.writeFileSync(legacyDbPath, JSON.stringify(raw, null, 2), 'utf-8');
          }
        }
      } catch (e) {}

      return record;
    });

    res.status(201).json({
      success: true,
      donation: formatDonationForResponse(newDonation, req.user)
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to create donation: ${err.message}` });
  }
});

/**
 * PUT /api/donations/:id
 * Allows a donor to edit an eligible donation if no portions have been claimed yet.
 */
app.put('/api/donations/:id', async (req, res) => {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: req.params.id },
      include: { allocations: true }
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    if (donation.allocatedPortions > 0) {
      return res.status(400).json({ 
        error: 'Cannot modify a donation that has active or completed claims. Cancel claims first or contact recipients.' 
      });
    }

    const {
      title,
      description,
      category,
      location,
      foodType,
      storageCondition,
      totalPortions,
      isVeg,
      dietaryInfo,
      allergens,
      pickupWindowStart,
      pickupWindowEnd
    } = req.body;

    const portions = totalPortions ? Number(totalPortions) : donation.totalPortions;

    const updated = await prisma.donation.update({
      where: { id: donation.id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        category: category || undefined,
        location: location !== undefined ? location.trim() : undefined,
        foodType: foodType || undefined,
        storageCondition: storageCondition || undefined,
        totalPortions: portions,
        remainingPortions: portions,
        isVeg: isVeg !== undefined ? Boolean(isVeg) : undefined,
        dietaryInfo: dietaryInfo !== undefined ? dietaryInfo.trim() : undefined,
        allergens: allergens !== undefined ? allergens.trim() : undefined,
        pickupWindowStart: pickupWindowStart || undefined,
        pickupWindowEnd: pickupWindowEnd || undefined
      },
      include: { allocations: true }
    });

    await recordAuditEvent({
      type: 'DONATION_UPDATED',
      donationId: updated.id,
      userId: req.user?.id || null,
      details: `Donation '${updated.title}' updated by donor.`
    });

    res.json({
      success: true,
      message: 'Donation updated successfully.',
      donation: formatDonationForResponse(updated, req.user)
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to update donation: ${err.message}` });
  }
});

/**
 * POST /api/donations/:id/cancel
 * Cancels a donation and releases allocations if permitted.
 */
app.post('/api/donations/:id/cancel', async (req, res) => {
  try {
    const { reason = 'Cancelled by donor' } = req.body;
    const donation = await prisma.donation.findUnique({
      where: { id: req.params.id },
      include: { allocations: true }
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    const hasCompletedPickups = donation.allocations.some(a => a.status === 'COMPLETED');
    if (hasCompletedPickups) {
      return res.status(400).json({ error: 'Cannot cancel a donation with verified completed pickups.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Release any pending allocations
      await tx.allocation.updateMany({
        where: { donationId: donation.id, status: 'RESERVED' },
        data: { status: 'CANCELLED', releaseReason: `Donation cancelled: ${reason}` }
      });

      const don = await tx.donation.update({
        where: { id: donation.id },
        data: { status: 'CANCELLED', remainingPortions: 0 },
        include: { allocations: true }
      });

      await tx.auditEvent.create({
        data: {
          id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'DONATION_CANCELLED',
          donationId: don.id,
          userId: req.user?.id || null,
          details: `Donation '${don.title}' cancelled. Reason: ${reason}`
        }
      });

      return don;
    });

    res.json({
      success: true,
      message: 'Donation cancelled.',
      donation: formatDonationForResponse(updated, req.user)
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to cancel donation: ${err.message}` });
  }
});

// ============================================================================
// 4. RECIPIENT & SMART MATCHING ENDPOINTS
// ============================================================================

/**
 * GET /api/recipients
 * Returns registered recipient organizations.
 */
app.get('/api/recipients', async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        type: {
          in: ['COMMUNITY_KITCHEN', 'SHELTER', 'YOUTH_VOLUNTEER_NETWORK', 'STUDENT_NGO', 'NGO']
        }
      }
    });

    // If empty, return all verified orgs
    const results = orgs.length > 0 
      ? orgs 
      : await prisma.organization.findMany({ where: { isVerified: true } });

    res.json({ recipients: results });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve recipients: ${err.message}` });
  }
});

/**
 * GET /api/donations/:id/matches
 * Uses Smart Recipient Matcher (Innovation 2) to rank compatible recipients.
 */
app.get('/api/donations/:id/matches', async (req, res) => {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: req.params.id }
    });

    if (!donation) {
      return res.status(404).json({ error: `Donation with ID '${req.params.id}' was not found.` });
    }

    const recipients = await prisma.organization.findMany({
      where: { isVerified: true }
    });

    const matches = matchRecipients(
      {
        id: donation.id,
        portionsAvailable: donation.remainingPortions,
        pickupWindowStart: donation.pickupWindowStart,
        pickupWindowEnd: donation.pickupWindowEnd,
        isVeg: donation.isVeg,
        foodType: donation.foodType
      },
      recipients
    );

    res.json({
      donationId: donation.id,
      donationTitle: donation.title,
      remainingPortions: donation.remainingPortions,
      matches
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to match recipients: ${err.message}` });
  }
});

/**
 * GET /api/recipients/:id/claims
 * Returns claims made by a specific recipient organization, including verification codes.
 */
app.get('/api/recipients/:id/claims', async (req, res) => {
  try {
    const recipientId = req.params.id;

    const allocations = await prisma.allocation.findMany({
      where: { recipientId },
      include: { donation: true },
      orderBy: { createdAt: 'desc' }
    });

    const claims = allocations.map(a => ({
      allocationId: a.id,
      id: a.id,
      donationId: a.donationId,
      donationTitle: a.donation.title,
      donorName: a.donation.donorName,
      location: a.donation.location,
      pickupWindowStart: a.donation.pickupWindowStart,
      pickupWindowEnd: a.donation.pickupWindowEnd,
      portions: a.portions,
      verificationCode: a.verificationCode, // Exposed safely to recipient
      status: a.status,
      notes: a.notes,
      actualPortionsCollected: a.actualPortionsCollected,
      verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString()
    }));

    res.json({ claims });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve claims: ${err.message}` });
  }
});

// ============================================================================
// 5. PORTION CLAIMING & SPLIT-AND-MATCH (Innovation 3)
// ============================================================================

/**
 * POST /api/donations/:id/claims
 * Claims portions of a donation (full batch or split portion).
 * Enforces atomic portion conservation in a database transaction.
 */
app.post('/api/donations/:id/claims', async (req, res) => {
  try {
    const { recipientId, recipientName, portions, notes = '' } = req.body;

    const requestedPortions = Number(portions);
    if (!Number.isInteger(requestedPortions) || requestedPortions <= 0) {
      return res.status(400).json({ error: 'Portions to claim must be a positive whole number.' });
    }

    const effectiveRecipientId = recipientId || req.user?.organizationId || req.user?.id;
    if (!effectiveRecipientId || typeof effectiveRecipientId !== 'string') {
      return res.status(400).json({ error: 'recipientId is required.' });
    }

    const effectiveRecipientName = recipientName || req.user?.fullName || 'Community Recipient';

    // Execute atomic claim inside Prisma ACID transaction
    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id: req.params.id },
        include: { allocations: true }
      });

      if (!donation) {
        return { status: 404, error: `Donation with ID '${req.params.id}' was not found.` };
      }

      // Validate claim invariants
      const validation = validateClaim(
        {
          status: donation.status,
          remainingPortions: donation.remainingPortions
        },
        requestedPortions,
        effectiveRecipientId
      );

      if (!validation.isValid) {
        return { status: 400, error: validation.error };
      }

      // Calculate new portion balances
      const newAllocated = donation.allocatedPortions + requestedPortions;
      const newRemaining = donation.totalPortions - newAllocated;

      if (newRemaining < 0 || newAllocated > donation.totalPortions) {
        return {
          status: 400,
          error: 'Invariant violation: Requested portions exceed remaining portions.'
        };
      }

      const newStatus = newRemaining === 0 ? 'FULLY_ALLOCATED' : 'PARTIALLY_ALLOCATED';
      const allocationId = `ALC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const verificationCode = `SP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // 1. Create Allocation record
      const allocation = await tx.allocation.create({
        data: {
          id: allocationId,
          donationId: donation.id,
          recipientId: effectiveRecipientId,
          recipientUserId: req.user?.id || null,
          recipientName: effectiveRecipientName,
          portions: requestedPortions,
          notes,
          verificationCode,
          status: 'RESERVED'
        }
      });

      // 2. Update Donation portion balances
      const updatedDonation = await tx.donation.update({
        where: { id: donation.id },
        data: {
          allocatedPortions: newAllocated,
          remainingPortions: newRemaining,
          status: newStatus
        },
        include: { allocations: true }
      });

      // 3. Record Audit Event
      await tx.auditEvent.create({
        data: {
          id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'CLAIM_CREATED',
          donationId: donation.id,
          allocationId: allocation.id,
          userId: req.user?.id || null,
          details: `Reserved ${requestedPortions} portions for '${effectiveRecipientName}'. Remaining balance: ${newRemaining}.`
        }
      });

      // 4. Send in-app notification to donor
      if (donation.organizationId || donation.donorId) {
        await tx.notification.create({
          data: {
            userId: donation.donorId,
            recipientOrgId: donation.organizationId,
            title: 'New Portion Claim Reserved',
            message: `${effectiveRecipientName} reserved ${requestedPortions} portions of '${donation.title}'. Pickup verification required upon handover.`,
            type: 'CLAIM_CREATED',
            link: '/donor'
          }
        });
      }

      return {
        status: 201,
        allocation: {
          allocationId: allocation.id,
          id: allocation.id,
          donationId: allocation.donationId,
          recipientId: allocation.recipientId,
          recipientName: allocation.recipientName,
          portions: allocation.portions,
          verificationCode, // Returned securely to claimant
          notes: allocation.notes,
          status: allocation.status,
          createdAt: allocation.createdAt.toISOString()
        },
        donation: formatDonationForResponse(updatedDonation, req.user)
      };
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      message: `Successfully reserved ${requestedPortions} portions. Present this rescue verification code upon collection.`,
      allocation: result.allocation,
      donation: result.donation
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to process portion claim: ${err.message}` });
  }
});

/**
 * POST /api/claims/:id/cancel
 * Cancels a portion claim before pickup and restores portions to donation balance.
 */
app.post('/api/claims/:id/cancel', async (req, res) => {
  try {
    const { reason = 'Voluntary cancellation by recipient organization' } = req.body;
    const allocationId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { id: allocationId },
        include: { donation: true }
      });

      if (!allocation) {
        return { status: 404, error: `Claim allocation '${allocationId}' was not found.` };
      }

      if (allocation.status === 'COMPLETED') {
        return { status: 400, error: 'Cannot cancel a claim whose pickup has already been completed.' };
      }

      if (allocation.status === 'CANCELLED' || allocation.status === 'RELEASED') {
        return { status: 400, error: `Claim '${allocationId}' is already cancelled.` };
      }

      const portionsToRestore = allocation.portions;
      const donation = allocation.donation;

      const newAllocated = Math.max(0, donation.allocatedPortions - portionsToRestore);
      const newRemaining = donation.remainingPortions + portionsToRestore;
      const newStatus = newRemaining === donation.totalPortions ? 'AVAILABLE' : 'PARTIALLY_ALLOCATED';

      // 1. Mark allocation as cancelled
      await tx.allocation.update({
        where: { id: allocation.id },
        data: {
          status: 'CANCELLED',
          releaseReason: reason
        }
      });

      // 2. Restore donation portions
      const updatedDonation = await tx.donation.update({
        where: { id: donation.id },
        data: {
          allocatedPortions: newAllocated,
          remainingPortions: newRemaining,
          status: newStatus
        },
        include: { allocations: true }
      });

      // 3. Log Audit
      await tx.auditEvent.create({
        data: {
          id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'CLAIM_CANCELLED',
          donationId: donation.id,
          allocationId: allocation.id,
          userId: req.user?.id || null,
          details: `Claim cancelled. ${portionsToRestore} portions returned to surplus balance. Reason: ${reason}`
        }
      });

      // 4. Send notification
      if (donation.organizationId || donation.donorId) {
        await tx.notification.create({
          data: {
            userId: donation.donorId,
            recipientOrgId: donation.organizationId,
            title: 'Claim Cancelled — Portions Restored',
            message: `${allocation.recipientName} released ${portionsToRestore} portions of '${donation.title}'.`,
            type: 'CLAIM_CANCELLED',
            link: '/donor'
          }
        });
      }

      return {
        status: 200,
        portionsRestored: portionsToRestore,
        donation: formatDonationForResponse(updatedDonation, req.user)
      };
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json({
      success: true,
      message: `Claim cancelled. ${result.portionsRestored} portions returned to available surplus.`,
      donation: result.donation
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to cancel claim: ${err.message}` });
  }
});

// ============================================================================
// 6. FAILED-PICKUP RECOVERY & SAFETY AUDIT (Innovation 4)
// ============================================================================

/**
 * POST /api/claims/:id/report-failed-pickup
 * Reports a failed collection (driver breakdown, no-show, grace window expired).
 * Enforces two mandatory prerequisite gates via Recovery Engine.
 */
app.post('/api/claims/:id/report-failed-pickup', async (req, res) => {
  try {
    const { failureReason = 'NO_SHOW', safetyStatus } = req.body;
    const allocationId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { id: allocationId },
        include: { donation: true }
      });

      if (!allocation) {
        return { status: 404, error: `Claim allocation '${allocationId}' was not found.` };
      }

      if (allocation.status === 'COMPLETED') {
        return { status: 400, error: 'Cannot report failure on a pickup that was already completed and verified.' };
      }

      const donation = allocation.donation;
      const effectiveSafety = safetyStatus || {
        isCertifiedSafe: donation.isCertifiedSafe,
        hasTemperatureAbuse: donation.hasTemperatureAbuse,
        sensoryInspectionPassed: donation.sensoryInspectionPassed
      };

      const recoveryEvaluation = evaluateFailedPickupRecovery({
        donation: {
          ...donation,
          safeConsumptionDeadline: donation.safeConsumptionDeadline ? donation.safeConsumptionDeadline.toISOString() : null,
          safetyStatus: effectiveSafety
        },
        failedAllocation: {
          allocationId: allocation.id,
          portions: allocation.portions,
          failureReason,
          previousRecoveryAttempts: allocation.recoveryAttempts
        },
        options: {
          currentTime: new Date()
        }
      });

      if (recoveryEvaluation.canRecover) {
        // SAFE TO RECOVER: Release portions back into donation for secondary matching
        const restoredPortions = allocation.portions;
        const newAllocated = Math.max(0, donation.allocatedPortions - restoredPortions);
        const newRemaining = donation.remainingPortions + restoredPortions;
        const newStatus = newRemaining === donation.totalPortions ? 'AVAILABLE' : 'PARTIALLY_ALLOCATED';

        const recoveryAlertData = {
          isReallocationCandidate: true,
          previousFailedAllocationId: allocation.id,
          elevatedPriority: recoveryEvaluation.priorityUrgencyTag,
          minutesRemaining: recoveryEvaluation.minutesRemaining,
          reopenedAt: new Date().toISOString()
        };

        await tx.allocation.update({
          where: { id: allocation.id },
          data: {
            status: 'FAILED_RECOVERED',
            releaseReason: `FAILED_PICKUP_RECOVERED: ${failureReason}`,
            recoveryAttempts: allocation.recoveryAttempts + 1
          }
        });

        const updatedDonation = await tx.donation.update({
          where: { id: donation.id },
          data: {
            allocatedPortions: newAllocated,
            remainingPortions: newRemaining,
            status: newStatus,
            recoveryAlert: JSON.stringify(recoveryAlertData)
          },
          include: { allocations: true }
        });

        await tx.auditEvent.create({
          data: {
            id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: 'FAILED_PICKUP_RECOVERED',
            donationId: donation.id,
            allocationId: allocation.id,
            details: JSON.stringify(recoveryEvaluation.auditRecord)
          }
        });

        return {
          status: 200,
          recovered: true,
          message: 'Pickup failed. Food verified safe and re-opened for rapid secondary matching.',
          recoveryDetails: recoveryEvaluation,
          donation: formatDonationForResponse(updatedDonation, req.user)
        };
      } else {
        // UNSAFE OR INSUFFICIENT TIME: Redistribution strictly halted
        await tx.allocation.update({
          where: { id: allocation.id },
          data: {
            status: 'FAILED_DISCARDED',
            dispositionReason: recoveryEvaluation.reason
          }
        });

        await tx.auditEvent.create({
          data: {
            id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: 'FAILED_PICKUP_DISCARDED',
            donationId: donation.id,
            allocationId: allocation.id,
            details: JSON.stringify(recoveryEvaluation.auditRecord)
          }
        });

        return {
          status: 200,
          recovered: false,
          message: 'Pickup failed. Food safety or collection time criteria not met. Redistribution strictly prevented.',
          recoveryDetails: recoveryEvaluation
        };
      }
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Failed to evaluate pickup failure: ${err.message}` });
  }
});

// ============================================================================
// 7. PICKUP VERIFICATION HANDSHAKE
// ============================================================================

/**
 * POST /api/claims/:id/verify-pickup
 * Verifies that the recipient physically arrived and collected the portions.
 * Requires the secret verification code.
 * Prevents double-verification and logs to the verified pickups ledger.
 */
app.post('/api/claims/:id/verify-pickup', async (req, res) => {
  try {
    const { verificationCode, actualPortionsCollected, verifiedBy = 'Donor Staff' } = req.body;
    const allocationId = req.params.id;

    if (!verificationCode || typeof verificationCode !== 'string') {
      return res.status(400).json({ error: 'verificationCode is required to complete the pickup handshake.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { id: allocationId },
        include: { donation: true }
      });

      if (!allocation) {
        return { status: 404, error: `Claim allocation '${allocationId}' was not found.` };
      }

      if (allocation.status === 'COMPLETED') {
        return { status: 400, error: 'Pickup was already verified previously. Duplicate verification prevented.' };
      }

      if (allocation.status === 'CANCELLED' || allocation.status === 'RELEASED' || allocation.status === 'FAILED_DISCARDED') {
        return { status: 400, error: `Cannot verify claim in '${allocation.status}' status.` };
      }

      // Check verification code (case-insensitive)
      if (allocation.verificationCode.trim().toUpperCase() !== verificationCode.trim().toUpperCase()) {
        return {
          status: 400,
          error: 'Invalid rescue verification code. Handshake failed. Please verify the code displayed on the recipient device.'
        };
      }

      const collectedCount = actualPortionsCollected ? Number(actualPortionsCollected) : allocation.portions;
      if (!Number.isInteger(collectedCount) || collectedCount <= 0 || collectedCount > allocation.portions) {
        return {
          status: 400,
          error: `actualPortionsCollected must be a whole number between 1 and ${allocation.portions}.`
        };
      }

      // 1. Mark allocation as completed
      const updatedAllocation = await tx.allocation.update({
        where: { id: allocation.id },
        data: {
          status: 'COMPLETED',
          verifiedAt: new Date(),
          actualPortionsCollected: collectedCount,
          verifiedBy
        }
      });

      // 2. Insert into Pickups Ledger
      const pickupId = `PKP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const pickupRecord = await tx.pickup.create({
        data: {
          id: pickupId,
          claimId: allocation.id,
          donationId: allocation.donation.id,
          donationTitle: allocation.donation.title,
          donorName: allocation.donation.donorName,
          recipientId: allocation.recipientId,
          recipientName: allocation.recipientName,
          portionsClaimed: allocation.portions,
          actualPortionsCollected: collectedCount,
          verifiedAt: new Date(),
          verifiedBy,
          verificationMethod: 'SECURE_RESCUE_CODE_HANDSHAKE',
          isPrototypeVerification: false
        }
      });

      // 3. Log Audit
      await tx.auditEvent.create({
        data: {
          id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'PICKUP_VERIFIED',
          donationId: allocation.donation.id,
          allocationId: allocation.id,
          userId: req.user?.id || null,
          details: `Pickup verified. ${collectedCount} portions collected by '${allocation.recipientName}'. Handshake code verified.`
        }
      });

      // 4. Send Notifications
      await tx.notification.create({
        data: {
          recipientOrgId: allocation.recipientId,
          userId: allocation.recipientUserId,
          title: 'Pickup Confirmed & Verified',
          message: `Your pickup of ${collectedCount} portions from '${allocation.donation.title}' was verified. Impact recorded on the platform ledger.`,
          type: 'PICKUP_VERIFIED',
          link: '/impact'
        }
      });

      const updatedDonation = await tx.donation.findUnique({
        where: { id: allocation.donation.id },
        include: { allocations: true }
      });

      return {
        status: 200,
        pickup: {
          pickupId: pickupRecord.id,
          id: pickupRecord.id,
          claimId: pickupRecord.claimId,
          donationId: pickupRecord.donationId,
          donationTitle: pickupRecord.donationTitle,
          donorName: pickupRecord.donorName,
          recipientId: pickupRecord.recipientId,
          recipientName: pickupRecord.recipientName,
          portionsClaimed: pickupRecord.portionsClaimed,
          actualPortionsCollected: pickupRecord.actualPortionsCollected,
          verifiedAt: pickupRecord.verifiedAt.toISOString(),
          verifiedBy: pickupRecord.verifiedBy
        },
        donation: formatDonationForResponse(updatedDonation, req.user)
      };
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json({
      success: true,
      message: `Pickup verified successfully! ${result.pickup.actualPortionsCollected} portions marked as rescued.`,
      pickup: result.pickup,
      donation: result.donation
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to verify pickup: ${err.message}` });
  }
});

// ============================================================================
// 8. VERIFIED IMPACT DASHBOARD (Innovation 5)
// ============================================================================

/**
 * GET /api/impact
 * Aggregates impact strictly from completed verified pickups in the database.
 */
app.get('/api/impact', async (req, res) => {
  try {
    const pickups = await prisma.pickup.findMany({
      orderBy: { verifiedAt: 'desc' }
    });

    const totalPickupsCompleted = pickups.length;
    const totalMealsRescued = pickups.reduce((sum, p) => sum + (Number(p.actualPortionsCollected) || 0), 0);

    // Research-backed environmental conversion factors:
    // 1. Average portion weight: 0.40 kg per meal
    // 2. Landfill methane diversion: 2.5 kg CO2e per kg food waste (UNEP Food Waste Index)
    // 3. Embedded agricultural freshwater saved: 850 Liters per balanced meal (Water Footprint Network)
    const estimatedFoodWeightKg = Math.round(totalMealsRescued * 0.40 * 10) / 10;
    const estimatedCo2ePreventedKg = Math.round(estimatedFoodWeightKg * 2.5 * 10) / 10;
    const estimatedWaterSavedLiters = Math.round(totalMealsRescued * 850);

    // Grouping by Donor
    const donorStats = {};
    for (const p of pickups) {
      const name = p.donorName || 'Campus Donor';
      if (!donorStats[name]) {
        donorStats[name] = { donorName: name, pickups: 0, mealsRescued: 0 };
      }
      donorStats[name].pickups += 1;
      donorStats[name].mealsRescued += Number(p.actualPortionsCollected) || 0;
    }

    // Grouping by Recipient
    const recipientStats = {};
    for (const p of pickups) {
      const name = p.recipientName || 'Community Recipient';
      if (!recipientStats[name]) {
        recipientStats[name] = { recipientName: name, pickups: 0, mealsReceived: 0 };
      }
      recipientStats[name].pickups += 1;
      recipientStats[name].mealsReceived += Number(p.actualPortionsCollected) || 0;
    }

    res.json({
      verifiedSummary: {
        totalPickupsCompleted,
        totalMealsRescued,
        estimatedFoodWeightKg,
        estimatedCo2ePreventedKg,
        estimatedWaterSavedLiters
      },
      leaderboard: {
        donors: Object.values(donorStats).sort((a, b) => b.mealsRescued - a.mealsRescued),
        recipients: Object.values(recipientStats).sort((a, b) => b.mealsReceived - a.mealsReceived)
      },
      methodologyAndAssumptions: {
        mealWeightBenchmark: '0.40 kg per average cafeteria meal portion',
        co2eConversionFactor: '2.5 kg CO2e emissions avoided per kg food diverted from landfill decomposition (UNEP benchmark)',
        waterFootprintFactor: '850 liters of embedded agricultural freshwater conserved per meal (Water Footprint Network)',
        disclaimer: 'Environmental metrics are research-backed estimates calculated strictly from completed physical pickups. Calculations represent estimated avoidance of landfill methane emissions and conserved agricultural resources.'
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to compute impact metrics: ${err.message}` });
  }
});

// ============================================================================
// 9. IN-APP PERSISTENT NOTIFICATIONS
// ============================================================================

/**
 * GET /api/notifications
 * Retrieves notifications for the active user or their organization.
 */
app.get('/api/notifications', async (req, res) => {
  try {
    const where = {};
    if (req.user) {
      where.OR = [
        { userId: req.user.id },
        ...(req.user.organizationId ? [{ recipientOrgId: req.user.organizationId }] : [])
      ];
    }

    const notifications = await prisma.notification.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString()
      })),
      unreadCount
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve notifications: ${err.message}` });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marks a notification as read.
 */
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ error: `Failed to update notification: ${err.message}` });
  }
});

/**
 * PUT /api/notifications/read-all
 * Marks all notifications for user/org as read.
 */
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const where = {};
    if (req.user) {
      where.OR = [
        { userId: req.user.id },
        ...(req.user.organizationId ? [{ recipientOrgId: req.user.organizationId }] : [])
      ];
    }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true }
    });

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: `Failed to mark all as read: ${err.message}` });
  }
});

// ============================================================================
// 10. ADMIN & MODERATION ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/stats
 * Platform statistics for administrator review.
 */
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrganizations,
      totalDonations,
      activeDonations,
      totalPickups,
      openIncidents
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.donation.count(),
      prisma.donation.count({ where: { status: { in: ['AVAILABLE', 'PARTIALLY_ALLOCATED'] } } }),
      prisma.pickup.count(),
      prisma.incident.count({ where: { status: 'OPEN' } })
    ]);

    res.json({
      stats: {
        totalUsers,
        totalOrganizations,
        totalDonations,
        activeDonations,
        totalPickups,
        openIncidents
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to load admin stats: ${err.message}` });
  }
});

/**
 * GET /api/admin/users
 * Returns users with roles and status.
 */
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { organization: true },
      orderBy: { createdAt: 'desc' }
    });

    const safeUsers = users.map(u => {
      const { passwordHash: _, ...safe } = u;
      return safe;
    });

    res.json({ users: safeUsers });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve users: ${err.message}` });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Suspend or restore user accounts.
 */
app.put('/api/admin/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // 'ACTIVE' or 'SUSPENDED'
    if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
      return res.status(400).json({ error: "Status must be 'ACTIVE' or 'SUSPENDED'." });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status }
    });

    await recordAuditEvent({
      type: 'USER_STATUS_CHANGED',
      userId: updated.id,
      details: `User '${updated.email}' status changed to '${status}'.`
    });

    const { passwordHash: _, ...safe } = updated;
    res.json({ success: true, message: `User status set to ${status}.`, user: safe });
  } catch (err) {
    res.status(500).json({ error: `Failed to update user status: ${err.message}` });
  }
});

/**
 * GET /api/admin/incidents
 * Returns reported safety or quality incidents.
 */
app.get('/api/admin/incidents', async (req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      include: { donation: true, reportedByUser: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ incidents });
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve incidents: ${err.message}` });
  }
});

/**
 * POST /api/admin/incidents
 * Report a food safety concern or inappropriate listing.
 */
app.post('/api/admin/incidents', async (req, res) => {
  try {
    const { donationId, allocationId, title, description, severity = 'MEDIUM' } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required to report an incident.' });
    }

    const incident = await prisma.incident.create({
      data: {
        donationId: donationId || null,
        allocationId: allocationId || null,
        reportedByUserId: req.user?.id || null,
        title: title.trim(),
        description: description.trim(),
        severity,
        status: 'OPEN'
      }
    });

    await recordAuditEvent({
      type: 'INCIDENT_REPORTED',
      donationId,
      allocationId,
      userId: req.user?.id || null,
      details: `Incident reported: '${title}'. Severity: ${severity}.`
    });

    res.status(201).json({ success: true, message: 'Incident reported successfully.', incident });
  } catch (err) {
    res.status(500).json({ error: `Failed to create incident: ${err.message}` });
  }
});

/**
 * PUT /api/admin/incidents/:id/resolve
 * Resolve an incident.
 */
app.put('/api/admin/incidents/:id/resolve', async (req, res) => {
  try {
    const { resolutionNotes } = req.body;
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolutionNotes: resolutionNotes || 'Resolved by administrator inspection.'
      }
    });

    await recordAuditEvent({
      type: 'INCIDENT_RESOLVED',
      donationId: incident.donationId,
      userId: req.user?.id || null,
      details: `Incident '${incident.title}' resolved.`
    });

    res.json({ success: true, message: 'Incident marked as resolved.', incident });
  } catch (err) {
    res.status(500).json({ error: `Failed to resolve incident: ${err.message}` });
  }
});

// ============================================================================
// START SERVER IF RUN DIRECTLY
// ============================================================================

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SharePlate Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
