/**
 * SharePlate API Client Helper
 * Connects the React frontend to the Express backend via the Vite '/api' proxy.
 * Transmits HttpOnly session cookies automatically with credentials: 'include'.
 */

async function handleResponse(res) {
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMessage = (typeof data === 'object' && data.error) 
      ? data.error 
      : (typeof data === 'string' && data) 
      ? data 
      : `Request failed with status ${res.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  // System Health
  getHealth: async () => {
    const res = await fetch('/api/health');
    return handleResponse(res);
  },

  // Authentication & Session
  signup: async (payload) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  login: async (credentials) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },

  logout: async () => {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    return handleResponse(res);
  },

  updateProfile: async (payload) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  changePassword: async (payload) => {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Donations
  getDonations: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.category && filters.category !== 'ALL') params.append('category', filters.category);
    if (filters.isVeg !== undefined && filters.isVeg !== 'ALL') params.append('isVeg', filters.isVeg);
    if (filters.search) params.append('search', filters.search);

    const qs = params.toString();
    const url = qs ? `/api/donations?${qs}` : '/api/donations';
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  getDonationById: async (id) => {
    const res = await fetch(`/api/donations/${encodeURIComponent(id)}`, {
      credentials: 'include'
    });
    return handleResponse(res);
  },

  createDonation: async (payload) => {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  updateDonation: async (id, payload) => {
    const res = await fetch(`/api/donations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  cancelDonation: async (id, reason) => {
    const res = await fetch(`/api/donations/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Recipients & Matching
  getRecipients: async () => {
    const res = await fetch('/api/recipients', { credentials: 'include' });
    return handleResponse(res);
  },

  getMatches: async (donationId) => {
    const res = await fetch(`/api/donations/${encodeURIComponent(donationId)}/matches`, {
      credentials: 'include'
    });
    return handleResponse(res);
  },

  getRecipientClaims: async (recipientId) => {
    const res = await fetch(`/api/recipients/${encodeURIComponent(recipientId)}/claims`, {
      credentials: 'include'
    });
    return handleResponse(res);
  },

  // Claims & Split-and-Match
  claimPortions: async (donationId, claimPayload) => {
    const res = await fetch(`/api/donations/${encodeURIComponent(donationId)}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(claimPayload)
    });
    return handleResponse(res);
  },

  cancelClaim: async (claimId, reason) => {
    const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Recovery & Safety
  reportFailedPickup: async (claimId, payload) => {
    const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/report-failed-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Verification Handshake
  verifyPickup: async (claimId, payload) => {
    const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Verified Impact Dashboard
  getImpact: async () => {
    const res = await fetch('/api/impact', { credentials: 'include' });
    return handleResponse(res);
  },

  // In-app Notifications
  getNotifications: async () => {
    const res = await fetch('/api/notifications', { credentials: 'include' });
    return handleResponse(res);
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
      credentials: 'include'
    });
    return handleResponse(res);
  },

  markAllNotificationsRead: async () => {
    const res = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      credentials: 'include'
    });
    return handleResponse(res);
  },

  // Admin & Moderation
  getAdminStats: async () => {
    const res = await fetch('/api/admin/stats', { credentials: 'include' });
    return handleResponse(res);
  },

  getAdminUsers: async () => {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    return handleResponse(res);
  },

  updateUserStatus: async (id, status) => {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  getAdminIncidents: async () => {
    const res = await fetch('/api/admin/incidents', { credentials: 'include' });
    return handleResponse(res);
  },

  reportIncident: async (payload) => {
    const res = await fetch('/api/admin/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  resolveIncident: async (id, resolutionNotes) => {
    const res = await fetch(`/api/admin/incidents/${encodeURIComponent(id)}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ resolutionNotes })
    });
    return handleResponse(res);
  },

  // Safety & Recovery Audit Log
  getAuditEvents: async () => {
    const res = await fetch('/api/audit', { credentials: 'include' });
    return handleResponse(res);
  }
};
