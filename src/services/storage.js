/**
 * Local Storage Persistence Layer
 * Strictly adheres to rule: No preloaded fake data. Real user data only.
 * Provides clean initial empty states.
 */

const KEYS = {
  AUTH: 'ws_auth_v3',
  CONTACTS: 'ws_contacts_v3',
  PROFILE: 'ws_profile_v3',
  ALERTS: 'ws_alerts_v3',
  INCIDENTS: 'ws_incidents_v3',
  SAFETY_ZONES: 'ws_zones_v3',
  CHECKIN: 'ws_checkin_v3',
  SETTINGS: 'ws_settings_v3',
  SOS_LOGS: 'ws_sos_logs_v3',
  SECRET_SOS: 'ws_secret_sos_v3',
  RECORDINGS: 'ws_recordings_v3',
  PENDING_SOS: 'ws_pending_sos_v3',
  LAST_LOCATION: 'ws_last_location_v3',
  EMERGENCY_PIN: 'ws_emergency_pin_v3',
};

/**
 * Strips out demo/sample defaults from stored profile data so real empty states are preserved.
 */
export function sanitizeUserProfile(user) {
  if (!user || typeof user !== 'object') return null;
  const sanitized = { ...user };

  if (sanitized.name === 'Alex Morgan' || sanitized.name === 'Sarah Connor') {
    sanitized.name = '';
  }
  if (sanitized.email === 'alex.morgan@safe.net' || sanitized.email === 'sarah.c@example.com') {
    sanitized.email = '';
  }

  const demoAllergies = ['Penicillin, Peanuts', 'Penicillin', 'Peanuts'];
  if (demoAllergies.includes(sanitized.allergies)) {
    sanitized.allergies = '';
  }

  const demoMedical = [
    'Mild Asthma (carries rescue inhaler)',
    'Asthma inhaler in bag',
    'Asthma',
  ];
  if (demoMedical.includes(sanitized.medicalNotes)) {
    sanitized.medicalNotes = '';
  }

  const demoAddresses = [
    '742 Evergreen Terrace, Apt 4B',
    '742 Evergreen Terrace',
  ];
  if (demoAddresses.some((addr) => sanitized.emergencyAddress && sanitized.emergencyAddress.toLowerCase() === addr.toLowerCase())) {
    sanitized.emergencyAddress = '';
  }

  // Remove hardcoded avatar field so dynamic initials from name are always used
  delete sanitized.avatar;

  return sanitized;
}

export const storage = {
  // --- Auth State ---
  getAuthUser() {
    try {
      const data = localStorage.getItem(KEYS.AUTH);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.user) {
          parsed.user = sanitizeUserProfile(parsed.user);
          const localPin = this.getEmergencyPin();
          if (parsed.user && (!parsed.user.emergencyPin || parsed.user.emergencyPin === '****') && localPin) {
            parsed.user.emergencyPin = localPin;
          }
        }
        return parsed;
      }
      return {
        isAuthenticated: false,
        user: null,
        hasCompletedOnboarding: false,
      };
    } catch {
      return {
        isAuthenticated: false,
        user: null,
        hasCompletedOnboarding: false,
      };
    }
  },

  setAuthUser(authData) {
    try {
      if (authData?.user?.emergencyPin && authData.user.emergencyPin !== '****') {
        this.setEmergencyPin(authData.user.emergencyPin);
      }
      localStorage.setItem(KEYS.AUTH, JSON.stringify(authData));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  // --- Registered Accounts Store ---
  getRegisteredUsers() {
    try {
      const data = localStorage.getItem('ws_registered_accounts_v1');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveRegisteredUsers(users) {
    try {
      localStorage.setItem('ws_registered_accounts_v1', JSON.stringify(users));
    } catch (e) {
      console.error('Save registered users error:', e);
    }
  },

  findRegisteredUser(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getRegisteredUsers();
    return users.find((u) => u.email?.toLowerCase() === cleanEmail) || null;
  },

  registerUserLocally(userData) {
    const users = this.getRegisteredUsers();
    const cleanEmail = userData.email.trim().toLowerCase();
    const existingIndex = users.findIndex((u) => u.email?.toLowerCase() === cleanEmail);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...userData };
    } else {
      users.push(userData);
    }
    this.saveRegisteredUsers(users);
    return userData;
  },

  // --- Trusted Contacts (Max 7) ---
  getContacts() {
    try {
      const data = localStorage.getItem(KEYS.CONTACTS);
      // New users start with an empty contacts array: 0 / 7
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveContacts(contacts) {
    try {
      const safeList = Array.isArray(contacts) ? contacts.slice(0, 7) : [];
      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(safeList));
      return safeList;
    } catch (e) {
      console.error(e);
      return contacts;
    }
  },

  // --- Emergency PIN ---
  getEmergencyPin() {
    try {
      return localStorage.getItem(KEYS.EMERGENCY_PIN) || '';
    } catch {
      return '';
    }
  },

  setEmergencyPin(pin) {
    try {
      if (pin && typeof pin === 'string' && pin.trim().length === 4 && pin.trim() !== '****') {
        localStorage.setItem(KEYS.EMERGENCY_PIN, pin.trim());
      } else if (!pin) {
        localStorage.removeItem(KEYS.EMERGENCY_PIN);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // --- Profile ---
  getProfile() {
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      if (data) {
        const parsed = sanitizeUserProfile(JSON.parse(data));
        const localPin = this.getEmergencyPin();
        if (parsed && (!parsed.emergencyPin || parsed.emergencyPin === '****') && localPin) {
          parsed.emergencyPin = localPin;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  saveProfile(profile) {
    try {
      const sanitized = sanitizeUserProfile(profile) || profile;
      if (sanitized) {
        const localPin = this.getEmergencyPin();
        if (sanitized.emergencyPin && sanitized.emergencyPin !== '****' && sanitized.emergencyPin.length === 4) {
          this.setEmergencyPin(sanitized.emergencyPin);
        } else if ((!sanitized.emergencyPin || sanitized.emergencyPin === '****') && localPin) {
          sanitized.emergencyPin = localPin;
        }
      }
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(sanitized));
    } catch (e) {
      console.error(e);
    }
  },

  // --- Safety Zones ---
  getSafetyZones() {
    try {
      const data = localStorage.getItem(KEYS.SAFETY_ZONES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSafetyZones(zones) {
    try {
      localStorage.setItem(KEYS.SAFETY_ZONES, JSON.stringify(zones));
      return zones;
    } catch (e) {
      console.error(e);
      return zones;
    }
  },

  // --- Alerts ---
  getAlerts() {
    try {
      const data = localStorage.getItem(KEYS.ALERTS);
      // New users start with empty alerts list
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAlerts(alerts) {
    try {
      localStorage.setItem(KEYS.ALERTS, JSON.stringify(alerts));
    } catch (e) {
      console.error(e);
    }
  },

  // --- Incidents ---
  getIncidents() {
    try {
      const data = localStorage.getItem(KEYS.INCIDENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveIncidents(incidents) {
    try {
      localStorage.setItem(KEYS.INCIDENTS, JSON.stringify(incidents));
    } catch (e) {
      console.error(e);
    }
  },

  // --- Check-In ---
  getCheckIn() {
    try {
      const data = localStorage.getItem(KEYS.CHECKIN);
      return data
        ? JSON.parse(data)
        : {
            isActive: false,
            isPaused: false,
            endsAt: null,
            durationMinutes: 30,
            destination: '',
            remainingSeconds: 0,
            status: 'idle', // 'idle' | 'active' | 'missed' | 'resolved' | 'escalated'
            missedAt: null,
            graceEndsAt: null,
            graceSecondsRemaining: 300,
            escalatedAt: null,
            resolvedAt: null,
          };
    } catch {
      return {
        isActive: false,
        isPaused: false,
        endsAt: null,
        durationMinutes: 30,
        destination: '',
        remainingSeconds: 0,
        status: 'idle',
        missedAt: null,
        graceEndsAt: null,
        graceSecondsRemaining: 300,
        escalatedAt: null,
        resolvedAt: null,
      };
    }
  },

  saveCheckIn(checkIn) {
    try {
      localStorage.setItem(KEYS.CHECKIN, JSON.stringify(checkIn));
    } catch (e) {
      console.error(e);
    }
  },

  // --- SOS History Logs ---
  getSosLogs() {
    try {
      const data = localStorage.getItem(KEYS.SOS_LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSosLogs(logs) {
    try {
      localStorage.setItem(KEYS.SOS_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error(e);
    }
  },

  // --- Evidence Audio Recordings ---
  getRecordings() {
    try {
      const data = localStorage.getItem(KEYS.RECORDINGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveRecordings(recordings) {
    try {
      localStorage.setItem(KEYS.RECORDINGS, JSON.stringify(recordings));
      return recordings;
    } catch (e) {
      console.error(e);
      return recordings;
    }
  },

  // --- Offline Pending SOS Queue ---
  getPendingSosEvents() {
    try {
      const data = localStorage.getItem(KEYS.PENDING_SOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePendingSosEvents(events) {
    try {
      localStorage.setItem(KEYS.PENDING_SOS, JSON.stringify(events));
      return events;
    } catch (e) {
      console.error(e);
      return events;
    }
  },

  // --- Last Successfully Obtained Location ---
  getLastKnownLocation() {
    try {
      const data = localStorage.getItem(KEYS.LAST_LOCATION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveLastKnownLocation(location) {
    try {
      localStorage.setItem(KEYS.LAST_LOCATION, JSON.stringify(location));
    } catch (e) {
      console.error(e);
    }
  },

  // --- Settings ---
  getSettings() {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data
        ? JSON.parse(data)
        : {
            safetyNetworkEnabled: false,
            vibrationOnSos: true,
            sirenAllowed: true,
            shareBattery: true,
            pushAlerts: true,
            smsFallback: true,
            secretSosEnabled: false,
            secretSosTrigger: 'discreet_gesture', // 'discreet_gesture' | 'long_press' | 'secret_code'
            secretSosDelay: 3,
            highContrast: false,
          };
    } catch {
      return {
        safetyNetworkEnabled: false,
        vibrationOnSos: true,
        sirenAllowed: true,
        shareBattery: true,
        pushAlerts: true,
        smsFallback: true,
        secretSosEnabled: false,
        secretSosTrigger: 'discreet_gesture',
        secretSosDelay: 3,
        highContrast: false,
      };
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  },

  clearAll() {
    try {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error(e);
    }
  },
};
