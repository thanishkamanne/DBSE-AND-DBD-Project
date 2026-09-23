import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../services/storage.js';
import { AuthService, ProfileService } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Check if token exists synchronously to avoid initial render flicker
  const [authData, setAuthData] = useState(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('women_safety_token') : null;
    if (!token) {
      return {
        isAuthenticated: false,
        user: null,
        hasCompletedOnboarding: false,
      };
    }
    const cached = storage.getAuthUser();
    return {
      isAuthenticated: Boolean(cached?.isAuthenticated && cached?.user),
      user: cached?.user || null,
      hasCompletedOnboarding: true,
    };
  });

  const [loading, setLoading] = useState(() => {
    return typeof window !== 'undefined' ? Boolean(localStorage.getItem('women_safety_token')) : false;
  });

  const [backendError, setBackendError] = useState(null);

  // Synchronize authentication status with backend on application load
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      const storedToken = localStorage.getItem('women_safety_token');
      if (!storedToken) {
        if (isMounted) {
          const loggedOut = {
            isAuthenticated: false,
            user: null,
            hasCompletedOnboarding: false,
          };
          setAuthData(loggedOut);
          storage.setAuthUser(loggedOut);
          setLoading(false);
        }
        return;
      }

      try {
        const { user: backendUser, isUnauthorized, isOffline, error } = await AuthService.getCurrentUser();
        if (!isMounted) return;

        if (backendUser) {
          const updated = {
            isAuthenticated: true,
            user: backendUser,
            hasCompletedOnboarding: true,
          };
          setAuthData(updated);
          storage.setAuthUser(updated);
          storage.saveProfile(backendUser);
          setBackendError(null);
        } else if (isUnauthorized) {
          // Token is invalid or expired
          const loggedOut = {
            isAuthenticated: false,
            user: null,
            hasCompletedOnboarding: false,
          };
          setAuthData(loggedOut);
          storage.setAuthUser(loggedOut);
          localStorage.removeItem('women_safety_token');
          setBackendError(null);
        } else if (isOffline) {
          // Backend is unreachable; do not destroy session if cached user exists
          setBackendError(error || 'Backend server is currently unreachable.');
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[AuthContext] Backend session check notice:', err?.message);
          setBackendError('Cannot connect to backend server.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuthSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      if (!email || !email.trim()) {
        return { success: false, error: 'Email or phone number is required.' };
      }
      if (!password) {
        return { success: false, error: 'Password is required.' };
      }

      const cleanInput = email.trim().toLowerCase();
      const res = await AuthService.login(cleanInput, password);

      if (!res.success || !res.user) {
        return {
          success: false,
          error: res.error || 'Invalid email or password.',
        };
      }

      if (res.token) {
        localStorage.setItem('women_safety_token', res.token);
      }

      const updated = {
        isAuthenticated: true,
        user: res.user,
        hasCompletedOnboarding: true,
      };

      setAuthData(updated);
      storage.setAuthUser(updated);
      storage.saveProfile(res.user);
      setBackendError(null);

      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err?.message || 'Sign In failed. Please try again.' };
    }
  };

  const register = async (name, email, password, phone) => {
    try {
      if (!name || !name.trim()) {
        return { success: false, error: 'Full name is required.' };
      }
      if (!email || !email.trim()) {
        return { success: false, error: 'Email address is required.' };
      }
      if (!password || password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;

      const res = await AuthService.register(name.trim(), cleanEmail, password, cleanPhone);

      if (!res.success || !res.user) {
        return { success: false, error: res.error || 'Registration failed.' };
      }

      if (res.token) {
        localStorage.setItem('women_safety_token', res.token);
      }

      // Automatically log the user directly into the app
      const updated = {
        isAuthenticated: true,
        user: res.user,
        hasCompletedOnboarding: true,
      };

      setAuthData(updated);
      storage.setAuthUser(updated);
      storage.saveProfile(res.user);
      setBackendError(null);

      return { success: true, user: res.user };
    } catch (err) {
      console.error('[AuthContext] Register error:', err);
      return { success: false, error: err?.message || 'Registration failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      console.warn('Logout network notice:', err.message);
    }
    localStorage.removeItem('women_safety_token');
    const loggedOut = { isAuthenticated: false, user: null, hasCompletedOnboarding: false };
    setAuthData(loggedOut);
    storage.setAuthUser(loggedOut);
    storage.saveProfile(null);
    return loggedOut;
  };

  const deleteAccount = async () => {
    try {
      const res = await AuthService.deleteAccount();
      localStorage.removeItem('women_safety_token');
      const loggedOut = { isAuthenticated: false, user: null, hasCompletedOnboarding: false };
      setAuthData(loggedOut);
      storage.setAuthUser(loggedOut);
      storage.saveProfile(null);
      return {
        success: true,
        message: res.message || 'Account permanently deleted.',
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete account.' };
    }
  };

  const updateProfile = async (updatedFields) => {
    // If updating emergency PIN, validate and save locally
    if (updatedFields?.emergencyPin !== undefined && updatedFields.emergencyPin !== null) {
      const pinStr = String(updatedFields.emergencyPin).trim();
      if (pinStr.length === 4 && /^\d{4}$/.test(pinStr)) {
        storage.setEmergencyPin(pinStr);
      }
    }

    setAuthData((prev) => {
      const nextUser = { ...prev.user, ...updatedFields };
      storage.saveProfile(nextUser);
      const nextAuth = { ...prev, user: nextUser };
      storage.setAuthUser(nextAuth);
      return nextAuth;
    });

    try {
      const res = await ProfileService.updateProfile(updatedFields);
      if (res.success && res.profile) {
        setAuthData((prev) => {
          const localPin = storage.getEmergencyPin();
          const mergedProfile = {
            ...res.profile,
            emergencyPin: localPin || res.profile.emergencyPin,
            hasEmergencyPin: Boolean(res.profile.hasEmergencyPin || localPin),
          };
          const nextAuth = { ...prev, user: mergedProfile };
          storage.setAuthUser(nextAuth);
          storage.saveProfile(mergedProfile);
          return nextAuth;
        });
        return { success: true, profile: res.profile };
      }
    } catch (err) {
      console.warn('[AuthContext] Backend profile update notice:', err.message);
      return { success: false, error: err.message };
    }
  };

  const updateEmergencyPin = async (pin) => {
    const cleanPin = pin !== undefined && pin !== null ? String(pin).trim() : '';
    if (cleanPin.length === 4 && /^\d{4}$/.test(cleanPin)) {
      storage.setEmergencyPin(cleanPin);
    }
    return updateProfile({ emergencyPin: cleanPin });
  };

  const resetPassword = async (email, newPassword) => {
    return AuthService.resetPassword(email, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authData.isAuthenticated,
        hasCompletedOnboarding: authData.hasCompletedOnboarding,
        user: authData.user,
        loading,
        backendError,
        login,
        register,
        logout,
        deleteAccount,
        updateProfile,
        updateEmergencyPin,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
