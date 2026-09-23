import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'women_safety_dev_secret_key_change_in_production';

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
    emailVerified: true,
    phoneVerified: Boolean(row.phone),
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
 * POST /api/auth/register
 * Direct registration without OTP:
 * Name + Email + Phone + Password -> Create Account -> Auto-login with JWT
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

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

    const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;

    // 1. Duplicate Check on Email
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail && existingEmail.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    // 2. Duplicate Check on Phone (if provided)
    if (cleanPhone) {
      const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
      if (existingPhone && existingPhone.length > 0) {
        return res.status(409).json({ success: false, error: 'An account with this phone number already exists.' });
      }
    }

    // 3. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert User directly as verified active user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, email_verified, phone_verified)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [name.trim(), cleanEmail, cleanPhone, passwordHash, cleanPhone ? 1 : 0]
    );

    const newUserId = result.insertId;

    // 5. Query created user row
    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
    const createdUser = userRows && userRows.length > 0 ? userRows[0] : null;

    // 6. Generate JWT token & set cookie for instant automatic login
    const token = jwt.sign({ id: newUserId, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: formatUserResponse(createdUser || { id: newUserId, name: name.trim(), email: cleanEmail, phone: cleanPhone }),
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
 * POST /api/auth/login
 * Direct login:
 * Email or Phone + Password -> Validate against MySQL password hash -> Issue JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginCredential = email || identifier;

    if (!loginCredential || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanInput = String(loginCredential).trim().toLowerCase();

    // Query user by email or phone
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [cleanInput, cleanInput]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Generate Token & Log In Directly
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
 * POST /api/auth/password/reset
 * Direct password reset for account recovery
 */
router.post('/password/reset', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email address.' });
    }

    const user = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully updated. You can now sign in with your new password.',
    });
  } catch (err) {
    console.error('[Password Reset Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Password reset failed due to a server error.',
    });
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
