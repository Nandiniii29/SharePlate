import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';
import { prisma } from '../prisma/db.js';

describe('SharePlate Authentication, Role Permissions & Platform Upgrades Test Suite', () => {
  let server;
  let baseUrl;
  let donorCookie;
  let recipientCookie;
  let adminCookie;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================================================
  // 1. SIGNUP & DUPLICATE ACCOUNT PREVENTION
  // ==========================================================================
  it('rejects signup with missing or mismatched password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Chef',
        email: 'chef.test@shareplate.org',
        password: 'Password123!',
        confirmPassword: 'WrongPassword!',
        accountType: 'DONOR'
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /passwords do not match/i);
  });

  it('successfully registers a genuine new Donor account and sets session cookie', async () => {
    const uniqueEmail = `donor_${Date.now()}@shareplate.org`;

    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Executive Chef Vikram',
        email: uniqueEmail,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        accountType: 'DONOR',
        organizationName: 'Grand Canteen & Banquets',
        phone: '+91-99887-11223',
        location: 'Culinary Block A'
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'DONOR');
    assert.equal(body.user.email, uniqueEmail);
    assert.equal(body.user.passwordHash, undefined, 'passwordHash must never be exposed');

    // Extract cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Session cookie must be set in response headers');
    assert.ok(setCookie.includes('shareplate_session='), 'Cookie name must match shareplate_session');
    assert.ok(setCookie.toLowerCase().includes('httponly'), 'Session cookie must be HttpOnly');

    donorCookie = setCookie.split(';')[0];
  });

  it('prevents duplicate account registration with normalized email', async () => {
    // Attempt signup with same email uppercase
    const email = 'duplicate.test@shareplate.org';

    // First signup
    await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'First User',
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        accountType: 'RECIPIENT'
      })
    });

    // Duplicate attempt with uppercase
    const dupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Duplicate User',
        email: email.toUpperCase(),
        password: 'Password123!',
        confirmPassword: 'Password123!',
        accountType: 'RECIPIENT'
      })
    });

    assert.equal(dupRes.status, 400);
    const body = await dupRes.json();
    assert.match(body.error, /already exists/i);
  });

  // ==========================================================================
  // 2. LOGIN & PASSWORD HASH VERIFICATION
  // ==========================================================================
  it('rejects login with incorrect password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hostel3@shareplate.org',
        password: 'DefinitelyWrongPassword'
      })
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /invalid email or password/i);
  });

  it('successfully logs in with pre-seeded recipient credentials and returns user profile', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'robinhooda@shareplate.org',
        password: 'Password123!'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'RECIPIENT');
    assert.equal(body.user.passwordHash, undefined);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    recipientCookie = setCookie.split(';')[0];
  });

  it('authenticates pre-seeded Administrator account', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@shareplate.org',
        password: 'AdminSecure2026!'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.role, 'ADMIN');

    const setCookie = res.headers.get('set-cookie');
    adminCookie = setCookie.split(';')[0];
  });

  // ==========================================================================
  // 3. PERSISTENT SESSION & LOGOUT
  // ==========================================================================
  it('GET /api/auth/me returns authenticated user details using session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Cookie': recipientCookie }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.user);
    assert.equal(body.user.email, 'robinhooda@shareplate.org');
    assert.equal(body.user.role, 'RECIPIENT');
    assert.ok(body.user.organization);
  });

  it('POST /api/auth/logout destroys session and clears session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': recipientCookie }
    });

    assert.equal(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('shareplate_session=;'));

    // Verifying /api/auth/me now returns null user
    const checkRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Cookie': recipientCookie }
    });
    const checkBody = await checkRes.json();
    assert.equal(checkBody.user, null);
  });

  // ==========================================================================
  // 4. IN-APP PERSISTENT NOTIFICATIONS
  // ==========================================================================
  it('persists notifications and supports mark-as-read', async () => {
    // 1. Fetch notifications
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: { 'Cookie': donorCookie }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.notifications));
    assert.ok(typeof body.unreadCount === 'number');

    if (body.notifications.length > 0) {
      const firstId = body.notifications[0].id;
      // Mark as read
      const readRes = await fetch(`${baseUrl}/api/notifications/${firstId}/read`, {
        method: 'PUT',
        headers: { 'Cookie': donorCookie }
      });
      assert.equal(readRes.status, 200);
    }

    // Mark all as read
    const readAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Cookie': donorCookie }
    });
    assert.equal(readAllRes.status, 200);
  });

  // ==========================================================================
  // 5. ADMIN CAPABILITIES & MODERATION
  // ==========================================================================
  it('GET /api/admin/stats returns aggregated platform overview', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { 'Cookie': adminCookie }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(typeof body.stats.totalUsers === 'number');
    assert.ok(typeof body.stats.totalDonations === 'number');
    assert.ok(typeof body.stats.totalPickups === 'number');
  });

  it('supports food safety incident reporting and admin resolution', async () => {
    // Report incident
    const reportRes = await fetch(`${baseUrl}/api/admin/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        title: 'Mislabeled allergen disclaimer',
        description: 'Contains trace sesame seeds not reflected in initial listing notes.',
        severity: 'MEDIUM'
      })
    });

    assert.equal(reportRes.status, 201);
    const reportBody = await reportRes.json();
    assert.equal(reportBody.success, true);
    const incidentId = reportBody.incident.id;

    // Resolve incident
    const resolveRes = await fetch(`${baseUrl}/api/admin/incidents/${incidentId}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        resolutionNotes: 'Donor contacted, listing notes corrected with full allergen warning.'
      })
    });

    assert.equal(resolveRes.status, 200);
    const resolveBody = await resolveRes.json();
    assert.equal(resolveBody.incident.status, 'RESOLVED');
  });

  it('allows administrator to suspend and restore user accounts', async () => {
    // Find non-admin user
    const users = await prisma.user.findMany({ where: { role: 'RECIPIENT' }, take: 1 });
    assert.ok(users.length > 0);
    const targetUserId = users[0].id;

    // Suspend
    const suspendRes = await fetch(`${baseUrl}/api/admin/users/${targetUserId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ status: 'SUSPENDED' })
    });

    assert.equal(suspendRes.status, 200);
    const suspendBody = await suspendRes.json();
    assert.equal(suspendBody.user.status, 'SUSPENDED');

    // Restore
    const restoreRes = await fetch(`${baseUrl}/api/admin/users/${targetUserId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ status: 'ACTIVE' })
    });

    assert.equal(restoreRes.status, 200);
    const restoreBody = await restoreRes.json();
    assert.equal(restoreBody.user.status, 'ACTIVE');
  });
});
