/**
 * Service Layer & API Client Interfaces
 * Connects the React frontend to the Node/Express + MySQL backend.
 * Provides resilient error handling preventing null reference exceptions.
 */

// Base URL for API endpoints. Uses VITE_API_URL or defaults to relative '/api' for Vite dev proxy.
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

/**
 * Common HTTP request handler with credentials and error parsing
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Also pass authorization header if token is stored in localStorage as backup
  const storedToken = localStorage.getItem('women_safety_token');
  const authHeaders = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include', // Include HTTP-only authentication cookies
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const contentType = response.headers?.get('content-type') || '';

    // Handle HTML responses gracefully
    if (contentType.includes('text/html')) {
      const err = new Error('Unexpected non-JSON response received from server.');
      err.status = response.status;
      err.isHtml = true;
      throw err;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.error ||
        data?.message ||
        `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data || {};
      throw err;
    }

    // Always ensure non-null return object to prevent null.success errors
    return data || { success: response.ok };
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      const networkError = new Error('Cannot connect to backend server. Operating in offline safety mode.');
      networkError.status = 503;
      throw networkError;
    }
    throw err;
  }
}

// ==========================================
// 1. REAL BACKEND AUTHENTICATION SERVICE
// ==========================================

export const AuthService = {
  /**
   * Retrieves currently authenticated user via session cookie/JWT.
   */
  async getCurrentUser() {
    try {
      const res = await apiRequest('/auth/me', { method: 'GET' });
      return res?.user || null;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        return null;
      }
      return null;
    }
  },

  /**
   * Authenticates user against MySQL password hash.
   */
  async login(email, password) {
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      return res || { success: false, error: 'Empty response from server.' };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Invalid email or password.',
        status: err.status,
      };
    }
  },

  /**
   * Registers new user with secure password hash in MySQL.
   */
  async register(name, email, password, phone, preferredChannel = 'sms') {
    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password, phone, preferredChannel },
      });
      return res || { success: false, error: 'Registration failed.' };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Registration failed.',
        status: err.status,
      };
    }
  },

  /**
   * Verifies 6-digit OTP and authenticates user
   */
  async verifyOtp(payload) {
    try {
      const res = await apiRequest('/auth/otp/verify', {
        method: 'POST',
        body: payload,
      });
      return res || { success: false, error: 'Verification failed.' };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Verification failed.',
        status: err.status,
      };
    }
  },

  /**
   * Resends OTP to preferred channel
   */
  async resendOtp(payload) {
    try {
      const res = await apiRequest('/auth/otp/resend', {
        method: 'POST',
        body: payload,
      });
      return res || { success: false, error: 'Failed to resend code.' };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Failed to resend code.',
        status: err.status,
      };
    }
  },

  /**
   * Requests email verification code for Profile
   */
  async sendEmailVerificationCode() {
    try {
      const res = await apiRequest('/auth/email/send-code', { method: 'POST' });
      return res || { success: false };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Failed to send verification code.',
        status: err.status,
      };
    }
  },

  /**
   * Requests phone SMS verification code for Profile
   */
  async sendPhoneVerificationCode() {
    try {
      const res = await apiRequest('/auth/phone/send-code', { method: 'POST' });
      return res || { success: false };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Failed to send verification code.',
        status: err.status,
      };
    }
  },

  /**
   * Invalidates session cookie on backend.
   */
  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Backend logout notice:', e.message);
    }
    localStorage.removeItem('women_safety_token');
    return { success: true };
  },

  /**
   * Deletes the currently authenticated user's account and all safety records permanently.
   */
  async deleteAccount() {
    try {
      const res = await apiRequest('/auth/account', { method: 'DELETE' });
      localStorage.removeItem('women_safety_token');
      return res || { success: false };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Failed to delete account.',
        status: err.status,
      };
    }
  },

  async requestPasswordReset(email) {
    try {
      const res = await apiRequest('/auth/password/reset-request', {
        method: 'POST',
        body: { email },
      });
      return res || { success: false };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Password reset request failed.',
        status: err.status,
      };
    }
  },

  async confirmPasswordReset(email, code, newPassword) {
    try {
      const res = await apiRequest('/auth/password/reset-confirm', {
        method: 'POST',
        body: { email, code, newPassword },
      });
      if (res?.token) {
        localStorage.setItem('women_safety_token', res.token);
      }
      return res || { success: false };
    } catch (err) {
      return {
        success: false,
        error: err.data?.error || err.message || 'Failed to reset password.',
        status: err.status,
      };
    }
  },

  async resetPassword(email) {
    return this.requestPasswordReset(email);
  },
};

// ==========================================
// 2. REAL BACKEND PROFILE SERVICE
// ==========================================

export const ProfileService = {
  async getProfile() {
    const res = await apiRequest('/profile', { method: 'GET' });
    return res?.profile || null;
  },

  async updateProfile(updates) {
    const res = await apiRequest('/profile', {
      method: 'PUT',
      body: updates,
    });
    return res || { success: false };
  },

  async verifyEmergencyPin(pin) {
    try {
      const res = await apiRequest('/profile/verify-pin', {
        method: 'POST',
        body: { pin },
      });
      return res || { success: false, verified: false };
    } catch (err) {
      return {
        success: false,
        verified: false,
        error: err.data?.error || err.message || 'Incorrect Emergency PIN. Emergency broadcast remains active.',
      };
    }
  },
};

// ==========================================
// 3. REAL BACKEND VERIFICATION ARCHITECTURE
// ==========================================

export const EmailVerificationService = {
  async changeEmail(newEmail) {
    return apiRequest('/auth/email/change', {
      method: 'POST',
      body: { newEmail },
    });
  },

  async verifyEmail(code) {
    return apiRequest('/auth/otp/verify', {
      method: 'POST',
      body: { code },
    });
  },

  async resendEmail() {
    return apiRequest('/auth/email/send-code', {
      method: 'POST',
    });
  },
};

export const PhoneVerificationService = {
  async changePhone(newPhone) {
    return apiRequest('/auth/phone/change', {
      method: 'POST',
      body: { newPhone },
    });
  },

  async verifyPhone(otp) {
    return apiRequest('/auth/otp/verify', {
      method: 'POST',
      body: { code: otp },
    });
  },

  async resendPhone() {
    return apiRequest('/auth/phone/send-code', {
      method: 'POST',
    });
  },
};

// ==========================================
// 4. BACKEND HEALTH CHECK SERVICE
// ==========================================

export const HealthService = {
  async checkHealth() {
    return apiRequest('/health', { method: 'GET' });
  },
};

// ==========================================
// 5. REAL BACKEND CONTACTS SERVICE
// ==========================================

export const ContactsService = {
  async getContacts() {
    const res = await apiRequest('/contacts', { method: 'GET' });
    return res?.contacts || [];
  },

  async createContact(contact) {
    const res = await apiRequest('/contacts', {
      method: 'POST',
      body: contact,
    });
    return res || { success: false };
  },

  async updateContact(id, updates) {
    const res = await apiRequest(`/contacts/${id}`, {
      method: 'PUT',
      body: updates,
    });
    return res || { success: false };
  },

  async deleteContact(id) {
    const res = await apiRequest(`/contacts/${id}`, {
      method: 'DELETE',
    });
    return res || { success: false };
  },
};

// ==========================================
// 6. REAL BACKEND SOS SERVICE
// ==========================================

export const SosService = {
  async getActiveSos() {
    const res = await apiRequest('/sos/active', { method: 'GET' });
    return res || { success: false, hasActiveSos: false };
  },

  async getSosHistory() {
    const res = await apiRequest('/sos/history', { method: 'GET' });
    return res?.incidents || [];
  },

  async getSosNotifications(incidentId) {
    const res = await apiRequest(`/sos/${incidentId}/notifications`, { method: 'GET' });
    return res?.notifications || [];
  },

  async triggerSos(payload) {
    const res = await apiRequest('/sos', {
      method: 'POST',
      body: {
        latitude: payload.latitude !== undefined ? payload.latitude : null,
        longitude: payload.longitude !== undefined ? payload.longitude : null,
        locationAccuracy: payload.accuracy || payload.locationAccuracy || null,
        clientRequestId: payload.clientRequestId || payload.id || null,
      },
    });
    return res || { success: false };
  },

  async updateSos(id, updates) {
    const res = await apiRequest(`/sos/${id}`, {
      method: 'PUT',
      body: updates,
    });
    return res || { success: false };
  },
};

// ==========================================
// 7. REAL BACKEND CHECK-INS SERVICE
// ==========================================

export const CheckInService = {
  async getActiveCheckin() {
    const res = await apiRequest('/checkins/active', { method: 'GET' });
    return res || { success: false, hasActiveCheckin: false };
  },

  async getCheckinHistory() {
    const res = await apiRequest('/checkins', { method: 'GET' });
    return res?.checkins || [];
  },

  async startCheckin(durationMinutes, notes) {
    const res = await apiRequest('/checkins', {
      method: 'POST',
      body: {
        durationMinutes: parseInt(durationMinutes, 10) || 15,
        notes: notes || null,
      },
    });
    return res || { success: false };
  },

  async markCheckinSafe(id) {
    const res = await apiRequest(`/checkins/${id}/safe`, { method: 'PUT' });
    return res || { success: false };
  },

  async markCheckinMissed(id) {
    const res = await apiRequest(`/checkins/${id}/missed`, { method: 'PUT' });
    return res || { success: false };
  },
};

// ==========================================
// 8. REAL BACKEND SAFETY ZONES SERVICE
// ==========================================

export const SafetyZonesService = {
  async getSafetyZones() {
    const res = await apiRequest('/safety-zones', { method: 'GET' });
    return res?.zones || [];
  },

  async createSafetyZone(zone) {
    const res = await apiRequest('/safety-zones', {
      method: 'POST',
      body: {
        name: zone.name,
        type: zone.type || 'custom',
        latitude: zone.latitude,
        longitude: zone.longitude,
        radius: zone.radius || zone.radiusMeters || 100,
        is_enabled: zone.is_enabled !== undefined ? zone.is_enabled : (zone.enabled !== false),
      },
    });
    return res || { success: false };
  },

  async updateSafetyZone(id, updates) {
    const res = await apiRequest(`/safety-zones/${id}`, {
      method: 'PUT',
      body: updates,
    });
    return res || { success: false };
  },

  async deleteSafetyZone(id) {
    const res = await apiRequest(`/safety-zones/${id}`, {
      method: 'DELETE',
    });
    return res || { success: false };
  },
};

// ==========================================
// 9. REAL BACKEND SAFE PLACES SERVICE
// ==========================================

export const SafePlacesService = {
  async getSafePlaces(latitude, longitude) {
    let query = '';
    if (latitude !== undefined && longitude !== undefined) {
      query = `?latitude=${latitude}&longitude=${longitude}`;
    }
    const res = await apiRequest(`/safe-places${query}`, { method: 'GET' });
    return res || { success: true, places: [], providerConfigured: false };
  },
};

// ==========================================
// 10. REAL BACKEND ALERTS & NOTIFICATIONS SERVICE
// ==========================================

export const AlertsService = {
  async getAlerts() {
    const res = await apiRequest('/alerts', { method: 'GET' });
    return res || { success: true, alerts: [] };
  },

  async markAlertAsRead(id) {
    const res = await apiRequest(`/alerts/${id}/read`, { method: 'PUT' });
    return res || { success: false };
  },

  async markAllAlertsAsRead() {
    const res = await apiRequest('/alerts/read-all', { method: 'PUT' });
    return res || { success: false };
  },

  async createAlert(title, message, type = 'system') {
    const res = await apiRequest('/alerts', {
      method: 'POST',
      body: { title, message, type },
    });
    return res || { success: false };
  },
};

// ==========================================
// 11. REAL BACKEND EVIDENCE METADATA SERVICE
// ==========================================

export const EvidenceService = {
  async getEvidenceLogs() {
    const res = await apiRequest('/evidence', { method: 'GET' });
    return res?.evidence || [];
  },

  async createEvidenceRecord(metadata) {
    const res = await apiRequest('/evidence', {
      method: 'POST',
      body: metadata,
    });
    return res || { success: false };
  },

  async deleteEvidenceRecord(id) {
    const res = await apiRequest(`/evidence/${id}`, { method: 'DELETE' });
    return res || { success: false };
  },
};
