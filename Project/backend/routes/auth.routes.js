import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendRealSms, isSmsConfigured } from '../services/sms.service.js';
import { sendRealEmail, isEmailConfigured } from '../services/email.service.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'women_safety_dev_secret_key_change_in_production';

/**
 * Helper to mask destination for secure display
 * e.g., phone: +1234567890 -> ******7890, email: test@example.com -> t***@example.com
 */
function maskDestination(channel, value) {
  if (!value) return '';
  if (channel === 'sms') {
    const s = String(value).trim();
    if (s.length <= 4) return '****' + s;
    return '*'.repeat(Math.max(4, s.length - 4)) + s.slice(-4);
  }
  const s = String(value).trim();
  const [user, domain] = s.split('@');
  if (!domain) return '****';
  const maskedUser = user.length > 2 ? user[0] + '*'.repeat(user.length - 2) + user.slice(-1) : user[0] + '***';
  return `${maskedUser}@${domain}`;
}

/**
 * Helper to format database user row to frontend camelCase object.
 * Never includes password or password_hash.
 */
export function formatUserResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || null,
    emailVerified: Boolean(row.email_verified),
    phoneVerified: Boolean(row.phone_verified),
    preferredVerificationChannel: row.preferred_verification_channel || 'sms',
    bloodGroup: row.blood_group || null,
    allergies: row.allergies || null,
    medicalNotes: row.medical_notes || null,
    emergencyAddress: row.emergency_address || null,
    emergencyPin: row.emergency_pin ? '****' : '',
    hasEmergencyPin: Boolean(row.emergency_pin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Helper to generate secure 6-digit OTP, hash it, and dispatch via provider
 */
async function generateAndSendOtp({ userId, channel, destination, userName }) {
  // 1. Cryptographically secure 6-digit OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(rawOtp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // 2. Invalidate any previous un-used OTPs for this user & channel
  try {
    await pool.query(
      'UPDATE otp_verifications SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND channel = ? AND used_at IS NULL',
      [userId, channel]
    );
  } catch {
    // ignore
  }

  // 3. Save hashed OTP to database
  await pool.query(
    `INSERT INTO otp_verifications (user_id, channel, destination, code_hash, attempts, max_attempts, expires_at)
     VALUES (?, ?, ?, ?, 0, 5, ?)`,
    [userId, channel, destination, codeHash, expiresAt]
  );

  // 4. Real Dispatch
  let dispatchResult = { sent: false, providerConfigured: false, status: 'provider_not_configured' };

  if (channel === 'sms') {
    if (isSmsConfigured()) {
      dispatchResult = await sendRealSms({
        to: destination,
        message: `Your Women Safety verification code is: ${rawOtp}. Valid for 10 minutes. Do NOT share this code with anyone.`,
      });
    } else {
      dispatchResult = {
        sent: false,
        providerConfigured: false,
        status: 'provider_not_configured',
        error: 'SMS verification gateway not configured (Twilio credentials required).',
      };
    }
  } else if (channel === 'email') {
    if (isEmailConfigured()) {
      dispatchResult = await sendRealEmail({
        to: destination,
        subject: 'Women Safety - Verification Code',
        text: `Hello ${userName || 'User'},\n\nYour verification code is: ${rawOtp}\n\nThis code will expire in 10 minutes. Do not share it with anyone.`,
      });
    } else {
      dispatchResult = {
        sent: false,
        providerConfigured: false,
        status: 'provider_not_configured',
        error: 'Email verification service is not configured.',
      };
    }
  }

  return {
    rawOtp, // never returned to client!
    dispatchResult,
  };
}

/**
 * POST /api/auth/register
 * Step 1: User enters Name, Email, Phone, Password
 * Step 2: User chooses preferred channel (SMS or Email)
 * Step 3: Backend creates UNVERIFIED account
 * Step 4: Backend sends REAL OTP
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, preferredChannel } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanPhone = phone && typeof phone === 'string' ? phone.trim() : null;
    const selectedChannel = preferredChannel === 'email' ? 'email' : 'sms';

    if (selectedChannel === 'sms' && !cleanPhone) {
      return res.status(400).json({ success: false, error: 'Phone number is required for SMS verification.' });
    }

    // Duplicate Check
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail && existingEmail.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    if (cleanPhone) {
      const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
      if (existingPhone && existingPhone.length > 0) {
        return res.status(409).json({ success: false, error: 'An account with this phone number already exists.' });
      }
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert User as UNVERIFIED
    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, email_verified, phone_verified, preferred_verification_channel)
       VALUES (?, ?, ?, ?, 0, 0, ?)`,
      [name.trim(), cleanEmail, cleanPhone, passwordHash, selectedChannel]
    );

    const newUserId = result.insertId;
    const destination = selectedChannel === 'sms' ? cleanPhone : cleanEmail;

    // Dispatch real OTP
    const { rawOtp, dispatchResult } = await generateAndSendOtp({
      userId: newUserId,
      channel: selectedChannel,
      destination,
      userName: name.trim(),
    });

    const masked = maskDestination(selectedChannel, destination);

    let clientMessage = '';
    if (dispatchResult.sent) {
      clientMessage = `Verification code sent to ${masked}. Please enter the 6-digit code.`;
    } else if (!dispatchResult.providerConfigured) {
      clientMessage = selectedChannel === 'sms'
        ? 'Account created. SMS verification gateway is not configured (Twilio credentials required).'
        : 'Account created. Email verification service is not configured.';
    } else {
      clientMessage = `Account created, but dispatch failed: ${dispatchResult.error || 'Provider error'}`;
    }

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      userId: newUserId,
      channel: selectedChannel,
      destination: masked,
      providerConfigured: dispatchResult.providerConfigured,
      otpSent: dispatchResult.sent,
      advisoryCode: !dispatchResult.providerConfigured ? rawOtp : undefined,
      message: clientMessage,
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Registration failed due to a server error. Please try again.',
    });
  }
});

/**
 * POST /api/auth/otp/verify
 * Step 6: Backend verifies correct OTP, correct user, OTP not expired, not already used
 * Step 7: Mark verification status as verified
 * Step 8: Automatically authenticate the user and return active session token (no manual re-login!)
 */
router.post('/otp/verify', async (req, res) => {
  try {
    const { userId, email, code } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, error: '6-digit verification code is required.' });
    }

    const cleanCode = code.trim();

    // Identify user
    let user = null;
    if (userId) {
      const [uRows] = await pool.query('SELECT * FROM users WHERE id = ?', [Number(userId)]);
      if (uRows && uRows.length > 0) user = uRows[0];
    } else if (email) {
      const [uRows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      if (uRows && uRows.length > 0) user = uRows[0];
    } else if (req.cookies?.token || req.headers.authorization) {
      // Authenticated session check
      try {
        const rawToken = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        const [uRows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (uRows && uRows.length > 0) user = uRows[0];
      } catch {}
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    // Retrieve active OTP records for this user
    const [otpRows] = await pool.query(
      `SELECT * FROM otp_verifications
       WHERE user_id = ? AND used_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [user.id]
    );

    if (!otpRows || otpRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active verification code found. Please request a new code.',
      });
    }

    const otpRecord = otpRows[0];

    // Check expiry
    const now = new Date();
    const expiry = new Date(otpRecord.expires_at);
    if (now > expiry) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new code.',
      });
    }

    // Check attempt limit (max 5)
    if (otpRecord.attempts >= (otpRecord.max_attempts || 5)) {
      return res.status(429).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.',
      });
    }

    // Check bcrypt hash
    const isMatch = await bcrypt.compare(cleanCode, otpRecord.code_hash);
    if (!isMatch) {
      // Increment attempts
      await pool.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        error: 'Incorrect verification code. Please check and try again.',
      });
    }

    // Correct OTP: mark as used
    await pool.query('UPDATE otp_verifications SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [otpRecord.id]);

    // Update user verification status
    if (otpRecord.channel === 'sms') {
      await pool.query('UPDATE users SET phone_verified = 1 WHERE id = ?', [user.id]);
      user.phone_verified = 1;
    } else {
      await pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]);
      user.email_verified = 1;
    }

    // Step 8: Automatically authenticate user and issue session token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const [updatedUserRows] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);

    return res.status(200).json({
      success: true,
      message: 'Account verified successfully.',
      token,
      user: formatUserResponse(updatedUserRows[0]),
    });
  } catch (err) {
    console.error('[OTP Verify Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Verification failed due to a server error. Please try again.',
    });
  }
});

/**
 * POST /api/auth/otp/resend and POST /api/auth/otp/send
 * Send / Resend OTP with cooldown rate limit
 */
async function handleSendOrResendOtp(req, res) {
  try {
    const { userId, email, channel, type } = req.body;

    let user = null;
    if (userId) {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [Number(userId)]);
      if (rows && rows.length > 0) user = rows[0];
    } else if (email) {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      if (rows && rows.length > 0) user = rows[0];
    } else if (req.cookies?.token || req.headers.authorization) {
      try {
        const rawToken = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (rows && rows.length > 0) user = rows[0];
      } catch {}
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const requestedChannel = channel || type;
    const targetChannel = (requestedChannel === 'sms' || requestedChannel === 'phone')
      ? 'sms'
      : (requestedChannel === 'email' ? 'email' : (user.preferred_verification_channel || 'email'));
    const destination = targetChannel === 'sms' ? user.phone : user.email;

    if (!destination) {
      return res.status(400).json({
        success: false,
        error: `No ${targetChannel === 'sms' ? 'phone number' : 'email'} associated with this account.`,
      });
    }

    // Cooldown check: 60 seconds
    const [recentRows] = await pool.query(
      `SELECT created_at FROM otp_verifications
       WHERE user_id = ? AND channel = ?
       ORDER BY id DESC LIMIT 1`,
      [user.id, targetChannel]
    );

    if (recentRows && recentRows.length > 0) {
      const lastCreated = new Date(recentRows[0].created_at).getTime();
      const diffSec = (Date.now() - lastCreated) / 1000;
      if (diffSec < 60) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${Math.ceil(60 - diffSec)} seconds before requesting a new code.`,
        });
      }
    }

    const { rawOtp, dispatchResult } = await generateAndSendOtp({
      userId: user.id,
      channel: targetChannel,
      destination,
      userName: user.name,
    });

    const masked = maskDestination(targetChannel, destination);

    if (!dispatchResult.providerConfigured) {
      return res.status(200).json({
        success: true,
        providerConfigured: false,
        otpSent: false,
        advisoryCode: rawOtp,
        destination: masked,
        message: targetChannel === 'sms'
          ? 'SMS verification gateway not configured (Twilio credentials required).'
          : 'Email verification service is not configured (SMTP/Resend credentials required).',
      });
    }

    if (!dispatchResult.sent) {
      return res.status(502).json({
        success: false,
        providerConfigured: true,
        otpSent: false,
        error: dispatchResult.error || 'Failed to dispatch verification code.',
      });
    }

    return res.status(200).json({
      success: true,
      providerConfigured: true,
      otpSent: true,
      destination: masked,
      message: `Verification code sent to ${masked}.`,
    });
  } catch (err) {
    console.error('[OTP Send/Resend Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to send code due to a server error.',
    });
  }
}

router.post('/otp/resend', handleSendOrResendOtp);
router.post('/otp/send', handleSendOrResendOtp);

/**
 * POST /api/auth/login
 * Step 4: If verified account -> directly enters app (no OTP forced).
 * If unverified account -> identifies unverified -> triggers OTP flow.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user by email or phone
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [cleanEmail, cleanEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Check verification status
    const isVerified = Boolean(user.email_verified || user.phone_verified);

    if (!isVerified) {
      // Account exists but is NOT verified. Send OTP through preferred channel.
      const preferredChannel = user.preferred_verification_channel || (user.phone ? 'sms' : 'email');
      const destination = preferredChannel === 'sms' ? user.phone : user.email;

      const { rawOtp, dispatchResult } = await generateAndSendOtp({
        userId: user.id,
        channel: preferredChannel,
        destination,
        userName: user.name,
      });

      const masked = maskDestination(preferredChannel, destination);

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        userId: user.id,
        channel: preferredChannel,
        destination: masked,
        providerConfigured: dispatchResult.providerConfigured,
        otpSent: dispatchResult.sent,
        advisoryCode: !dispatchResult.providerConfigured ? rawOtp : undefined,
        message: dispatchResult.sent
          ? `Account is unverified. Verification code sent to ${masked}.`
          : (preferredChannel === 'sms'
              ? 'Account is unverified. SMS verification gateway not configured (Twilio credentials required).'
              : 'Account is unverified. Email verification service is not configured.'),
      });
    }

    // Verified account: Generate Token & Log In Directly
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Sign In successful.',
      token,
      user: formatUserResponse(user),
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Sign In failed due to a server error. Please try again.',
    });
  }
});

/**
 * POST /api/auth/password/reset-request
 * Sends OTP for password reset
 */
router.post('/password/reset-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email address.' });
    }

    const user = rows[0];
    const { rawOtp, dispatchResult } = await generateAndSendOtp({
      userId: user.id,
      channel: 'email',
      destination: user.email,
      userName: user.name,
    });

    return res.status(200).json({
      success: true,
      message: dispatchResult.sent
        ? `Reset code sent to ${maskDestination('email', user.email)}.`
        : 'Password reset code generated. Email service is not configured.',
      providerConfigured: dispatchResult.providerConfigured,
      advisoryCode: !dispatchResult.providerConfigured ? rawOtp : undefined,
    });
  } catch (err) {
    console.error('[Password Reset Request Error]:', err);
    return res.status(500).json({ success: false, error: 'Password reset request failed.' });
  }
});

/**
 * POST /api/auth/password/reset-confirm
 * Verifies OTP and resets password
 */
router.post('/password/reset-confirm', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const [uRows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!uRows || uRows.length === 0) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }
    const user = uRows[0];

    const [otpRows] = await pool.query(
      'SELECT * FROM otp_verifications WHERE user_id = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1',
      [user.id]
    );

    if (!otpRows || otpRows.length === 0) {
      return res.status(400).json({ success: false, error: 'No active reset code found. Please request a new code.' });
    }

    const otpRecord = otpRows[0];
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new code.' });
    }

    const isMatch = await bcrypt.compare(cleanCode, otpRecord.code_hash);
    if (!isMatch) {
      await pool.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({ success: false, error: 'Incorrect verification code.' });
    }

    // Mark OTP used
    await pool.query('UPDATE otp_verifications SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [otpRecord.id]);

    // Hash new password and mark email verified
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?', [newHash, user.id]);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const [updatedRows] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
      token,
      user: formatUserResponse(updatedRows[0]),
    });
  } catch (err) {
    console.error('[Password Reset Confirm Error]:', err);
    return res.status(500).json({ success: false, error: 'Password reset failed due to a server error.' });
  }
});

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Restores session for authenticated user
 */
router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    user: formatUserResponse(req.user),
  });
});

/**
 * POST /api/auth/email/send-code
 * For Profile Page email verification request
 */
router.post('/email/send-code', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user.email_verified) {
      return res.status(400).json({ success: false, error: 'Email address is already verified.' });
    }

    const { rawOtp, dispatchResult } = await generateAndSendOtp({
      userId: user.id,
      channel: 'email',
      destination: user.email,
      userName: user.name,
    });

    if (!dispatchResult.providerConfigured) {
      return res.status(200).json({
        success: true,
        providerConfigured: false,
        otpSent: false,
        advisoryCode: rawOtp,
        message: 'Email verification service is not configured (SMTP/Resend credentials required).',
      });
    }

    return res.status(200).json({
      success: true,
      providerConfigured: true,
      otpSent: dispatchResult.sent,
      message: dispatchResult.sent
        ? `Verification email sent to ${maskDestination('email', user.email)}.`
        : `Email dispatch failed: ${dispatchResult.error || 'Provider error'}`,
    });
  } catch (err) {
    console.error('[Email Send Code Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to request email verification.' });
  }
});

/**
 * POST /api/auth/phone/send-code
 * For Profile Page phone verification request
 */
router.post('/phone/send-code', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user.phone) {
      return res.status(400).json({ success: false, error: 'No phone number registered on your profile.' });
    }
    if (user.phone_verified) {
      return res.status(400).json({ success: false, error: 'Phone number is already verified.' });
    }

    const { rawOtp, dispatchResult } = await generateAndSendOtp({
      userId: user.id,
      channel: 'sms',
      destination: user.phone,
      userName: user.name,
    });

    if (!dispatchResult.providerConfigured) {
      return res.status(200).json({
        success: true,
        providerConfigured: false,
        otpSent: false,
        advisoryCode: rawOtp,
        message: 'SMS verification gateway is not configured (Twilio credentials required).',
      });
    }

    return res.status(200).json({
      success: true,
      providerConfigured: true,
      otpSent: dispatchResult.sent,
      message: dispatchResult.sent
        ? `Verification SMS sent to ${maskDestination('sms', user.phone)}.`
        : `SMS dispatch failed: ${dispatchResult.error || 'Provider error'}`,
    });
  } catch (err) {
    console.error('[Phone Send Code Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to request SMS verification.' });
  }
});

/**
 * DELETE /api/auth/account
 * Permanently deletes the authenticated user's account and all associated safety data.
 */
router.delete('/account', requireAuth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;

    // Cascade delete across all tables
    await connection.query('DELETE FROM user_alerts WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM evidence_records WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM safety_network_members WHERE user_id = ? OR helper_user_id = ?', [userId, userId]);
    await connection.query('DELETE FROM safety_zones WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM check_ins WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM sos_notifications WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM sos_incidents WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM emergency_contacts WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM otp_verifications WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit();

    // Clear session cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Account and all associated safety data have been permanently deleted.',
    });
  } catch (err) {
    await connection.rollback();
    console.error('[Delete Account Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to permanently delete account.',
    });
  } finally {
    connection.release();
  }
});

export default router;
