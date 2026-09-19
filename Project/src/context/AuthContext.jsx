import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../services/storage.js';
import { AuthService, ProfileService } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authData, setAuthData] = useState(() => storage.getAuthUser());
  const [loading, setLoading] = useState(true);

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
        const backendUser = await AuthService.getCurrentUser();
        if (isMounted) {
          if (backendUser) {
            const updated = {
              isAuthenticated: true,
              user: backendUser,
              hasCompletedOnboarding: backendUser.hasCompletedOnboarding ?? true,
            };
            setAuthData(updated);
            storage.setAuthUser(updated);
            storage.saveProfile(backendUser);
          } else {
            // Backend token invalid: clear state
            const loggedOut = {
              isAuthenticated: false,
              user: null,
              hasCompletedOnboarding: false,
            };
            setAuthData(loggedOut);
            storage.setAuthUser(loggedOut);
            localStorage.removeItem('women_safety_token');
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Backend session check note:', err?.message);
        if (isMounted) {
          const loggedOut = {
            isAuthenticated: false,
            user: null,
            hasCompletedOnboarding: false,
          };
          setAuthData(loggedOut);
          storage.setAuthUser(loggedOut);
          localStorage.removeItem('women_safety_token');
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

      const cleanEmail = email.trim().toLowerCase();
      const res = await AuthService.login(cleanEmail, password);

      if (!res.success) {
        return { success: false, error: res.error || 'Invalid credentials.' };
      }

      // If user is unverified, trigger OTP verification
      if (res.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          userId: res.userId,
          channel: res.channel,
          destination: res.destination,
          providerConfigured: res.providerConfigured,
          advisoryCode: res.advisoryCode,
          message: res.message,
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

      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err?.message || 'Sign In failed. Please try again.' };
    }
  };

  const register = async (name, email, password, phone, preferredChannel = 'sms') => {
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
      const cleanPhone = phone && typeof phone === 'string' ? phone.trim() : null;

      const res = await AuthService.register(name.trim(), cleanEmail, password, cleanPhone, preferredChannel);

      if (!res.success) {
        return { success: false, error: res.error || 'Registration failed.' };
      }

      return {
        success: true,
        requiresVerification: true,
        userId: res.userId,
        channel: res.channel,
        destination: res.destination,
        providerConfigured: res.providerConfigured,
        otpSent: res.otpSent,
        advisoryCode: res.advisoryCode,
        message: res.message,
      };
    } catch (err) {
      console.error('[AuthContext] Register error:', err);
      return { success: false, error: err?.message || 'Registration failed. Please try again.' };
    }
  };

  const verifyOtp = async (payload) => {
    try {
      const res = await AuthService.verifyOtp(payload);
      if (!res.success) {
        return { success: false, error: res.error || 'Invalid verification code.' };
      }

      if (res.token) {
        localStorage.setItem('women_safety_token', res.token);
      }

      const updated = {
        isAuthenticated: true,
        user: res.user,
        hasCompletedOnboarding: Boolean(res.user?.hasCompletedOnboarding),
      };
      setAuthData(updated);
      storage.setAuthUser(updated);
      storage.saveProfile(res.user);

      return { success: true, user: res.user, message: res.message };
    } catch (err) {
      return { success: false, error: err?.message || 'Verification failed.' };
    }
  };

  const resendOtp = async (payload) => {
    try {
      const res = await AuthService.resendOtp(payload);
      return res;
    } catch (err) {
      return { success: false, error: err?.message || 'Failed to resend code.' };
    }
  };

  const completeOnboarding = () => {
    setAuthData((prev) => {
      const next = { ...prev, hasCompletedOnboarding: true };
      storage.setAuthUser(next);
      return next;
    });
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
    if (updatedFields?.emergencyPin && updatedFields.emergencyPin.length === 4 && updatedFields.emergencyPin !== '****') {
      storage.setEmergencyPin(updatedFields.emergencyPin);
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
    if (pin && typeof pin === 'string' && pin.trim().length === 4) {
      storage.setEmergencyPin(pin.trim());
    }
    return updateProfile({ emergencyPin: pin });
  };

  const requestPasswordReset = async (email) => {
    return AuthService.requestPasswordReset(email);
  };

  const confirmPasswordReset = async (email, code, newPassword) => {
    const res = await AuthService.confirmPasswordReset(email, code, newPassword);
    if (res?.success && res?.user) {
      const updated = {
        isAuthenticated: true,
        user: res.user,
        hasCompletedOnboarding: true,
      };
      setAuthData(updated);
      storage.setAuthUser(updated);
      storage.saveProfile(res.user);
    }
    return res;
  };

  const resetPassword = async (email) => {
    return AuthService.resetPassword(email);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authData.isAuthenticated,
        hasCompletedOnboarding: authData.hasCompletedOnboarding,
        user: authData.user,
        loading,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        deleteAccount,
        completeOnboarding,
        updateProfile,
        updateEmergencyPin,
        resetPassword,
        requestPasswordReset,
        confirmPasswordReset,
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
