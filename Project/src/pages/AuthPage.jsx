import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AuthPage() {
  const {
    login,
    register,
    verifyOtp,
    resendOtp,
    requestPasswordReset,
    confirmPasswordReset,
  } = useAuth();

  // Mode: 'signin' | 'signup' | 'otp' | 'forgot'
  const [mode, setMode] = useState('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState(null);
  const [otpDestination, setOtpDestination] = useState('');
  const [otpChannel, setOtpChannel] = useState('email');
  const [providerConfigured, setProviderConfigured] = useState(true);
  const [advisoryCode, setAdvisoryCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password State
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'confirm'
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status messages
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Resend countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const clearFeedback = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleTabSwitch = (newMode) => {
    if (newMode === mode) return;
    clearFeedback();
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await login(email, password);
        if (!res || !res.success) {
          setError(res?.error || 'Invalid credentials. Please verify your email/phone and password.');
        } else if (res.requiresVerification) {
          // Seamless transition to OTP verification
          setPendingUserId(res.userId);
          setOtpChannel(res.channel || 'email');
          setOtpDestination(res.destination || '');
          setProviderConfigured(res.providerConfigured !== false);
          setAdvisoryCode(res.advisoryCode || '');
          if (res.advisoryCode) {
            setOtpCode(res.advisoryCode);
          }
          setResendCooldown(60);
          setMode('otp');
          setSuccessMsg(res.message || 'Please enter the verification code sent to your account.');
        }
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please provide your full legal or display name.');
          setLoading(false);
          return;
        }
        if (preferredChannel === 'sms' && (!phone || !phone.trim())) {
          setError('A mobile phone number is required when SMS is chosen.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must contain at least 6 characters.');
          setLoading(false);
          return;
        }

        const res = await register(name, email, password, phone, preferredChannel);
        if (!res || !res.success) {
          setError(res?.error || 'Account creation could not be completed. Please try again.');
        } else if (res.requiresVerification) {
          setPendingUserId(res.userId);
          setOtpChannel(res.channel);
          setOtpDestination(res.destination);
          setProviderConfigured(res.providerConfigured !== false);
          setAdvisoryCode(res.advisoryCode || '');
          if (res.advisoryCode) {
            setOtpCode(res.advisoryCode);
          }
          setResendCooldown(60);
          setMode('otp');
          setSuccessMsg(res.message || 'Account registered! Please verify your identity.');
        }
      } else if (mode === 'otp') {
        const cleanOtp = otpCode.trim();
        if (!cleanOtp || cleanOtp.length !== 6) {
          setError('Please enter the full 6-digit verification code.');
          setLoading(false);
          return;
        }

        const res = await verifyOtp({
          userId: pendingUserId,
          email: email.trim().toLowerCase(),
          code: cleanOtp,
        });

        if (!res || !res.success) {
          setError(res?.error || 'Verification code is invalid or has expired.');
        } else {
          setSuccessMsg('Account verified! Securely signing you in...');
        }
      } else if (mode === 'forgot') {
        if (resetStep === 'request') {
          if (!email.trim()) {
            setError('Please enter your registered email address.');
            setLoading(false);
            return;
          }
          const res = await requestPasswordReset(email.trim().toLowerCase());
          if (res && res.success) {
            setResetStep('confirm');
            setAdvisoryCode(res.advisoryCode || '');
            if (res.advisoryCode) {
              setResetCode(res.advisoryCode);
            }
            setSuccessMsg(res.message || 'Verification code sent. Enter it below with your new password.');
          } else {
            setError(res?.error || 'Could not dispatch password reset code.');
          }
        } else {
          const cleanCode = resetCode.trim();
          if (!cleanCode || cleanCode.length !== 6) {
            setError('Please enter the 6-digit verification code.');
            setLoading(false);
            return;
          }
          if (!newPassword || newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            setLoading(false);
            return;
          }

          const res = await confirmPasswordReset(email.trim().toLowerCase(), cleanCode, newPassword);
          if (res && res.success) {
            setSuccessMsg('Password updated successfully! Redirecting...');
          } else {
            setError(res?.error || 'Failed to update password. Please verify the code.');
          }
        }
      }
    } catch (submitErr) {
      setError(submitErr?.message || 'An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    clearFeedback();
    setLoading(true);

    try {
      const res = await resendOtp({
        userId: pendingUserId,
        email: email.trim().toLowerCase(),
        channel: otpChannel,
      });

      if (res && res.success) {
        setResendCooldown(60);
        setProviderConfigured(res.providerConfigured !== false);
        if (res.advisoryCode) {
          setAdvisoryCode(res.advisoryCode);
          setOtpCode(res.advisoryCode);
        }
        setSuccessMsg(res.message || 'A fresh verification code has been dispatched.');
      } else {
        setError(res?.error || 'Unable to dispatch code at this time.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-8 sm:pt-14 pb-16 px-4 sm:px-6 antialiased selection:bg-slate-900 selection:text-white">
      {/* Brand Badge & Header - Anchored to eliminate layout bounce */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[420px] text-center mb-6"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-md mb-3 ring-4 ring-slate-100">
          <Shield className="w-6 h-6 stroke-[2.2]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Women Safety
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Personal Protection &amp; Instant Emergency Network
        </p>
      </motion.div>

      {/* Main Authentication Card with Fluid Framer-Motion Layout */}
      <motion.div
        layout
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 relative overflow-hidden"
      >
        {/* Pro Pill Switcher (Sign In vs Create Account) */}
        {mode !== 'otp' && mode !== 'forgot' && (
          <div className="relative mb-6 p-1 bg-slate-100/90 rounded-xl flex items-center select-none border border-slate-200/50">
            <button
              id="auth-tab-signin"
              type="button"
              onClick={() => handleTabSwitch('signin')}
              className={`relative z-10 flex-1 py-2 text-xs font-bold text-center transition-colors rounded-lg cursor-pointer ${
                mode === 'signin' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode === 'signin' && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">Sign In</span>
            </button>

            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => handleTabSwitch('signup')}
              className={`relative z-10 flex-1 py-2 text-xs font-bold text-center transition-colors rounded-lg cursor-pointer ${
                mode === 'signup' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode === 'signup' && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">Create Account</span>
            </button>
          </div>
        )}

        {/* Back Button Headers for OTP & Forgot Password */}
        {mode === 'otp' && (
          <div className="mb-5 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                clearFeedback();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-800">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Verify Your Account</h2>
                <p className="text-[11px] text-slate-500">
                  Code sent to <span className="font-semibold text-slate-800">{otpDestination || email}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="mb-5 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setResetStep('request');
                clearFeedback();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-800">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {resetStep === 'request' ? 'Reset Password' : 'Set New Password'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {resetStep === 'request'
                    ? 'Receive a secure 6-digit recovery code via email'
                    : `Enter the code sent to ${email} and choose a new password`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advisory Code Banner for unconfigured cloud SMS/Email in preview */}
        <AnimatePresence>
          {(mode === 'otp' || (mode === 'forgot' && resetStep === 'confirm')) && advisoryCode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block">Preview Environment Notice</span>
                    <span className="text-[11px] text-amber-800">
                      SMS/Email gateway unconfigured. Active code:{' '}
                      <span className="font-mono font-bold bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300 text-amber-950">
                        {advisoryCode}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'otp') setOtpCode(advisoryCode);
                    if (mode === 'forgot') setResetCode(advisoryCode);
                  }}
                  className="shrink-0 text-[11px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer pt-0.5"
                >
                  Auto-fill
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Banners */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="font-medium leading-relaxed">{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span className="font-medium leading-relaxed">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Mode Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {/* 1. SIGN IN FORM */}
            {mode === 'signin' && (
              <motion.div
                key="signin-form"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="space-y-3.5"
              >
                <Input
                  id="auth-signin-email"
                  label="Email or Phone Number"
                  type="text"
                  placeholder="name@example.com or +1..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                  autoFocus
                />

                <Input
                  id="auth-signin-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 focus:ring-slate-900 focus:ring-offset-0"
                    />
                    <span className="text-xs text-slate-600 font-medium">Keep me signed in</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setResetStep('request');
                      clearFeedback();
                    }}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. CREATE ACCOUNT FORM */}
            {mode === 'signup' && (
              <motion.div
                key="signup-form"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <Input
                  id="auth-signup-name"
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                  autoFocus
                />

                <Input
                  id="auth-signup-email"
                  label="Email Address"
                  type="email"
                  placeholder="maya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="auth-signup-phone"
                    label="Mobile Phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Phone className="w-4 h-4" />}
                    required={preferredChannel === 'sms'}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Verify Via <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreferredChannel('email')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                          preferredChannel === 'email'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferredChannel('sms')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                          preferredChannel === 'sms'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        SMS
                      </button>
                    </div>
                  </div>
                </div>

                <Input
                  id="auth-signup-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />

                {/* Password requirement micro-badge */}
                <div className="flex items-center gap-2 px-1">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      password.length >= 6 ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      password.length >= 6 ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    At least 6 characters
                  </span>
                </div>
              </motion.div>
            )}

            {/* 3. OTP VERIFICATION FORM */}
            {mode === 'otp' && (
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor="auth-otp-input" className="block text-xs font-bold text-slate-800">
                    6-Digit Verification Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="auth-otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center text-2xl font-mono font-bold tracking-[0.4em] py-3 px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between pt-1 px-1">
                  <span className="text-xs text-slate-400 font-medium">
                    {resendCooldown > 0 ? (
                      `Resend available in ${resendCooldown}s`
                    ) : (
                      "Didn't receive the code?"
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Resend Code
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
              <motion.div
                key={`forgot-${resetStep}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3.5"
              >
                {resetStep === 'request' ? (
                  <Input
                    id="auth-forgot-email"
                    label="Registered Email Address"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                    autoFocus
                  />
                ) : (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="auth-reset-code-input" className="block text-xs font-bold text-slate-800">
                        6-Digit Reset Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="auth-reset-code-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="0 0 0 0 0 0"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full text-center text-xl font-mono font-bold tracking-[0.35em] py-2.5 px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
                        required
                        autoFocus
                      />
                    </div>

                    <Input
                      id="auth-reset-new-password"
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                      required
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Action Button */}
          <Button
            id="auth-submit-btn"
            variant="primary"
            size="md"
            fullWidth
            type="submit"
            disabled={loading}
            className="mt-5 py-3 text-sm font-bold shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : mode === 'signup' ? (
              'Create Account'
            ) : mode === 'otp' ? (
              'Verify & Enter'
            ) : resetStep === 'request' ? (
              'Send Reset Code'
            ) : (
              'Update Password & Sign In'
            )}
          </Button>
        </form>
      </motion.div>

      {/* Trust & Security Reassurance Micro-Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400 font-medium"
      >
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" />
          End-to-End Encrypted
        </span>
        <span>•</span>
        <span>PIN Protected</span>
        <span>•</span>
        <span>Zero Location Tracking</span>
      </motion.div>
    </div>
  );
}
