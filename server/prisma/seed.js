import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('[SharePlate Migration] Starting migration from JSON to SQLite database...');

  // 1. Locate source JSON data
  const dbJsonPath = path.join(__dirname, '../data/db.json');
  const seedJsonPath = path.join(__dirname, '../data/seed.json');
  
  let sourceData = { donations: [], recipients: [], pickups: [], auditEvents: [] };
  if (fs.existsSync(dbJsonPath)) {
    try {
      sourceData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));
      console.log(`[SharePlate Migration] Loaded source data from ${dbJsonPath}`);
    } catch (e) {
      console.warn('[SharePlate Migration] Could not parse db.json, falling back to seed.json');
    }
  } else if (fs.existsSync(seedJsonPath)) {
    sourceData = JSON.parse(fs.readFileSync(seedJsonPath, 'utf-8'));
    console.log(`[SharePlate Migration] Loaded source data from ${seedJsonPath}`);
  }

  // Pre-calculate password hashes
  const userPasswordHash = await bcrypt.hash('Password123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminSecure2026!', 10);

  // 2. Create Administrator Account
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@shareplate.org' },
    update: {},
    create: {
      email: 'admin@shareplate.org',
      passwordHash: adminPasswordHash,
      fullName: 'SharePlate Platform Administrator',
      role: 'ADMIN',
      phone: '+91-98000-00001',
      status: 'ACTIVE'
    }
  });
  console.log(`[SharePlate Migration] Created Admin account: ${adminUser.email}`);

  // 3. Migrate Recipient Organizations & Users
  const recipients = sourceData.recipients || [];
  for (const rec of recipients) {
    const org = await prisma.organization.upsert({
      where: { id: rec.id },
      update: {
        name: rec.name,
        type: rec.type || 'COMMUNITY_KITCHEN',
        contactPerson: rec.contactPerson,
        phone: rec.phone,
        capacityMin: Number(rec.capacityMin) || 10,
        capacityMax: Number(rec.capacityMax) || 150,
        acceptsNonVeg: Boolean(rec.acceptsNonVeg),
        operatingHoursStart: rec.operatingHoursStart || '09:00',
        operatingHoursEnd: rec.operatingHoursEnd || '22:00',
        illustrativeDistanceKm: Number(rec.illustrativeDistanceKm) || 2.5,
        isVerified: Boolean(rec.isVerified ?? true),
        notes: rec.notes || ''
      },
      create: {
        id: rec.id,
        name: rec.name,
        type: rec.type || 'COMMUNITY_KITCHEN',
        contactPerson: rec.contactPerson,
        phone: rec.phone,
        capacityMin: Number(rec.capacityMin) || 10,
        capacityMax: Number(rec.capacityMax) || 150,
        acceptsNonVeg: Boolean(rec.acceptsNonVeg),
        operatingHoursStart: rec.operatingHoursStart || '09:00',
        operatingHoursEnd: rec.operatingHoursEnd || '22:00',
        illustrativeDistanceKm: Number(rec.illustrativeDistanceKm) || 2.5,
        isVerified: Boolean(rec.isVerified ?? true),
        notes: rec.notes || ''
      }
    });

    // Create an authenticatable user for each recipient organization
    const emailPrefix = rec.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    const userEmail = `${emailPrefix || rec.id.toLowerCase()}@shareplate.org`;
    
    await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        organizationId: org.id
      },
      create: {
        email: userEmail,
        passwordHash: userPasswordHash,
        fullName: rec.contactPerson || rec.name,
        role: 'RECIPIENT',
        organizationId: org.id,
        phone: rec.phone,
        status: 'ACTIVE'
      }
    });
    console.log(`[SharePlate Migration] Migrated Recipient Org: ${org.name} (Login: ${userEmail})`);
  }

  // 4. Create Standard Donor Organizations & Users
  const donorProfiles = [
    {
      id: 'ORG-DON-001',
      name: 'Hostel 3 Mess Council',
      type: 'HOSTEL',
      contactPerson: 'Supervisor K. Sharma',
      email: 'hostel3@shareplate.org',
      phone: '+91-98765-10001',
      location: 'Hostel 3 Ground Floor Canteen Block'
    },
    {
      id: 'ORG-DON-002',
      name: 'Central Dining Services',
      type: 'MESS_CANTEEN',
      contactPerson: 'Executive Chef R. Sen',
      email: 'dining@shareplate.org',
      phone: '+91-98765-10002',
      location: 'Student Activity Center Level 1'
    },
    {
      id: 'ORG-DON-003',
      name: 'Campus Cafe & Bakery',
      type: 'RESTAURANT',
      contactPerson: 'Baker T. Nair',
      email: 'bakery@shareplate.org',
      phone: '+91-98765-10003',
      location: 'North Library Complex'
    },
    {
      id: 'ORG-DON-004',
      name: 'Sports Complex Catering',
      type: 'CATERER',
      contactPerson: 'Quality Auditor S. Verma',
      email: 'sports@shareplate.org',
      phone: '+91-98765-10004',
      location: 'Main Athletics Pavilion'
    }
  ];

  const donorUserMap = {};
  for (const d of donorProfiles) {
    const org = await prisma.organization.upsert({
      where: { id: d.id },
      update: {
        name: d.name,
        type: d.type,
        contactPerson: d.contactPerson,
        email: d.email,
        phone: d.phone,
        location: d.location,
        isVerified: true
      },
      create: {
        id: d.id,
        name: d.name,
        type: d.type,
        contactPerson: d.contactPerson,
        email: d.email,
        phone: d.phone,
        location: d.location,
        isVerified: true
      }
    });

    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {
        organizationId: org.id
      },
      create: {
        email: d.email,
        passwordHash: userPasswordHash,
        fullName: d.contactPerson,
        role: 'DONOR',
        organizationId: org.id,
        phone: d.phone,
        status: 'ACTIVE'
      }
    });

    donorUserMap[d.name] = user;
    console.log(`[SharePlate Migration] Migrated Donor Org: ${org.name} (Login: ${user.email})`);
  }

  // 5. Migrate Donations & Allocations
  const donations = sourceData.donations || [];
  for (const don of donations) {
    const matchedDonorUser = donorUserMap[don.donorName] || null;
    const deadline = don.safeConsumptionDeadline ? new Date(don.safeConsumptionDeadline) : new Date(Date.now() + 3 * 3600000);

    const donationRecord = await prisma.donation.upsert({
      where: { id: don.id },
      update: {
        title: don.title,
        donorName: don.donorName,
        donorContact: don.donorContact || 'unspecified@campus.edu',
        location: don.location,
        foodType: don.foodType || 'COOKED_HOT',
        storageCondition: don.storageCondition || 'HOT_HOLDING',
        totalPortions: Number(don.totalPortions) || 100,
        allocatedPortions: Number(don.allocatedPortions) || 0,
        remainingPortions: Number(don.remainingPortions) ?? Number(don.totalPortions) ?? 100,
        status: don.status || 'AVAILABLE',
        isVeg: Boolean(don.isVeg ?? true),
        pickupWindowStart: don.pickupWindowStart || '18:00',
        pickupWindowEnd: don.pickupWindowEnd || '21:00',
        safeConsumptionDeadline: isNaN(deadline.getTime()) ? new Date(Date.now() + 3 * 3600000) : deadline,
        estimatedTransitMinutes: Number(don.estimatedTransitMinutes) || 20,
        isCertifiedSafe: Boolean(don.safetyStatus?.isCertifiedSafe ?? true),
        hasTemperatureAbuse: Boolean(don.safetyStatus?.hasTemperatureAbuse ?? false),
        sensoryInspectionPassed: Boolean(don.safetyStatus?.sensoryInspectionPassed ?? true),
        certifiedBy: don.safetyStatus?.certifiedBy || don.donorName,
        safetyNotes: don.safetyStatus?.notes || '',
        priorityScore: Number(don.priorityScore?.score) || 75,
        urgencyLevel: don.priorityScore?.urgencyLevel || 'HIGH',
        eligibleForRescue: Boolean(don.priorityScore?.eligibleForRescue ?? true),
        priorityBreakdown: JSON.stringify(don.priorityScore?.breakdown || {}),
        recoveryAlert: don.recoveryAlert ? JSON.stringify(don.recoveryAlert) : null,
        donorId: matchedDonorUser?.id || null,
        organizationId: matchedDonorUser?.organizationId || null
      },
      create: {
        id: don.id,
        title: don.title,
        donorName: don.donorName,
        donorContact: don.donorContact || 'unspecified@campus.edu',
        location: don.location,
        foodType: don.foodType || 'COOKED_HOT',
        storageCondition: don.storageCondition || 'HOT_HOLDING',
        totalPortions: Number(don.totalPortions) || 100,
        allocatedPortions: Number(don.allocatedPortions) || 0,
        remainingPortions: Number(don.remainingPortions) ?? Number(don.totalPortions) ?? 100,
        status: don.status || 'AVAILABLE',
        isVeg: Boolean(don.isVeg ?? true),
        pickupWindowStart: don.pickupWindowStart || '18:00',
        pickupWindowEnd: don.pickupWindowEnd || '21:00',
        safeConsumptionDeadline: isNaN(deadline.getTime()) ? new Date(Date.now() + 3 * 3600000) : deadline,
        estimatedTransitMinutes: Number(don.estimatedTransitMinutes) || 20,
        isCertifiedSafe: Boolean(don.safetyStatus?.isCertifiedSafe ?? true),
        hasTemperatureAbuse: Boolean(don.safetyStatus?.hasTemperatureAbuse ?? false),
        sensoryInspectionPassed: Boolean(don.safetyStatus?.sensoryInspectionPassed ?? true),
        certifiedBy: don.safetyStatus?.certifiedBy || don.donorName,
        safetyNotes: don.safetyStatus?.notes || '',
        priorityScore: Number(don.priorityScore?.score) || 75,
        urgencyLevel: don.priorityScore?.urgencyLevel || 'HIGH',
        eligibleForRescue: Boolean(don.priorityScore?.eligibleForRescue ?? true),
        priorityBreakdown: JSON.stringify(don.priorityScore?.breakdown || {}),
        recoveryAlert: don.recoveryAlert ? JSON.stringify(don.recoveryAlert) : null,
        donorId: matchedDonorUser?.id || null,
        organizationId: matchedDonorUser?.organizationId || null
      }
    });

    // Migrate allocations within this donation
    const allocations = don.allocations || [];
    for (const alc of allocations) {
      await prisma.allocation.upsert({
        where: { id: alc.allocationId },
        update: {
          portions: Number(alc.portions) || 0,
          status: alc.status || 'RESERVED',
          notes: alc.notes || '',
          verificationCode: alc.verificationCode || 'SP-SAMPLE',
          releaseReason: alc.releaseReason || null,
          dispositionReason: alc.dispositionReason || null,
          actualPortionsCollected: alc.actualPortionsCollected ? Number(alc.actualPortionsCollected) : null,
          verifiedAt: alc.completedAt ? new Date(alc.completedAt) : null,
          verifiedBy: alc.verifiedBy || null
        },
        create: {
          id: alc.allocationId,
          donationId: donationRecord.id,
          recipientId: alc.recipientId,
          recipientName: alc.recipientName || 'Community Recipient',
          portions: Number(alc.portions) || 0,
          status: alc.status || 'RESERVED',
          notes: alc.notes || '',
          verificationCode: alc.verificationCode || 'SP-SAMPLE',
          releaseReason: alc.releaseReason || null,
          dispositionReason: alc.dispositionReason || null,
          actualPortionsCollected: alc.actualPortionsCollected ? Number(alc.actualPortionsCollected) : null,
          verifiedAt: alc.completedAt ? new Date(alc.completedAt) : null,
          verifiedBy: alc.verifiedBy || null
        }
      });
    }

    console.log(`[SharePlate Migration] Migrated Donation: ${donationRecord.title} (${donationRecord.totalPortions} portions)`);
  }

  // 6. Migrate Pickups
  const pickups = sourceData.pickups || [];
  for (const pkp of pickups) {
    // Ensure allocation exists for pickup foreign key
    const existingAlc = await prisma.allocation.findUnique({ where: { id: pkp.claimId } });
    if (!existingAlc) {
      // Create stub allocation to satisfy relationship constraint
      await prisma.allocation.create({
        data: {
          id: pkp.claimId,
          donationId: pkp.donationId,
          recipientId: pkp.recipientId,
          recipientName: pkp.recipientName,
          portions: pkp.portionsClaimed,
          actualPortionsCollected: pkp.actualPortionsCollected,
          verificationCode: 'SP-PRELOADED',
          status: 'COMPLETED',
          verifiedAt: new Date(pkp.verifiedAt || Date.now()),
          verifiedBy: pkp.verifiedBy || 'Supervisor'
        }
      });
    }

    await prisma.pickup.upsert({
      where: { id: pkp.pickupId },
      update: {},
      create: {
        id: pkp.pickupId,
        claimId: pkp.claimId,
        donationId: pkp.donationId,
        donationTitle: pkp.donationTitle || 'Surplus Meal',
        donorName: pkp.donorName || 'Campus Donor',
        recipientId: pkp.recipientId,
        recipientName: pkp.recipientName,
        portionsClaimed: Number(pkp.portionsClaimed) || 0,
        actualPortionsCollected: Number(pkp.actualPortionsCollected) || 0,
        verifiedAt: new Date(pkp.verifiedAt || Date.now()),
        verifiedBy: pkp.verifiedBy || 'Supervisor',
        verificationMethod: pkp.verificationMethod || 'SECURE_RESCUE_CODE_HANDSHAKE',
        isPrototypeVerification: Boolean(pkp.isPrototypeVerification),
        notes: pkp.notes || ''
      }
    });
    console.log(`[SharePlate Migration] Migrated Pickup Record: ${pkp.pickupId}`);
  }

  // 7. Migrate Audit Events
  const auditEvents = sourceData.auditEvents || [];
  for (const aud of auditEvents) {
    const eventId = aud.eventId || `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.auditEvent.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        type: aud.type || 'SYSTEM_EVENT',
        donationId: aud.donationId || null,
        allocationId: aud.allocationId || null,
        details: typeof aud.details === 'object' ? JSON.stringify(aud.details) : (aud.details || aud.description || 'System event recorded'),
        timestamp: aud.timestamp ? new Date(aud.timestamp) : new Date()
      }
    });
  }

  // 8. Create Welcome Notifications
  await prisma.notification.createMany({
    data: [
      {
        recipientOrgId: 'REC-001',
        title: 'Welcome to SharePlate',
        message: 'Your organization profile is active. You can browse fresh surplus batches and reserve portions in real time.',
        type: 'SYSTEM',
        isRead: false
      },
      {
        recipientOrgId: 'ORG-DON-001',
        title: 'Listing Reminder',
        message: 'Ensure all evening banquet surplus is logged before 21:00 for optimal volunteer dispatch.',
        type: 'SYSTEM',
        isRead: false
      }
    ]
  });

  console.log('[SharePlate Migration] Database migration and seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('[SharePlate Migration Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
