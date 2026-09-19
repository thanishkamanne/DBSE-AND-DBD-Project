import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { formatUserResponse } from './auth.routes.js';

const router = express.Router();

/**
 * GET /api/profile
 * Returns the currently authenticated user's real profile.
 * Sensitive fields (passwords, hashed PINs) are never exposed.
 * Fields not configured are returned as empty/null.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, email_verified, phone_verified,
              blood_group, allergies, medical_notes, emergency_address, emergency_pin,
              created_at, updated_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      profile: formatUserResponse(rows[0]),
    });
  } catch (err) {
    console.error('[Get Profile Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile information.',
    });
  }
});

/**
 * PUT /api/profile
 * Updates the currently authenticated user's profile.
 * Hashes emergency PIN with bcrypt before storing.
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      bloodGroup,
      blood_group,
      allergies,
      medicalNotes,
      medical_notes,
      emergencyAddress,
      emergency_address,
      emergencyPin,
      emergency_pin,
    } = req.body;

    const updates = [];
    const params = [];

    // 1. Name
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Name cannot be empty.',
        });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    // 2. Email
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Email cannot be empty.',
        });
      }
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address format.',
        });
      }
      const [existingEmail] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [cleanEmail, req.user.id]
      );
      if (existingEmail && existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'This email address is already in use by another user.',
        });
      }
      updates.push('email = ?');
      params.push(cleanEmail);
    }

    // 3. Phone
    if (phone !== undefined) {
      const cleanPhone = phone ? String(phone).trim() : null;
      if (cleanPhone) {
        const [existingPhone] = await pool.query(
          'SELECT id FROM users WHERE phone = ? AND id != ?',
          [cleanPhone, req.user.id]
        );
        if (existingPhone && existingPhone.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'This phone number is already registered to another user.',
          });
        }
      }
      updates.push('phone = ?');
      params.push(cleanPhone);
    }

    // 4. Blood Group
    const targetBlood = bloodGroup !== undefined ? bloodGroup : blood_group;
    if (targetBlood !== undefined) {
      const cleanBlood = targetBlood ? String(targetBlood).trim() : null;
      updates.push('blood_group = ?');
      params.push(cleanBlood);
    }

    // 5. Allergies
    if (allergies !== undefined) {
      const cleanAllergies = allergies ? String(allergies).trim() : null;
      updates.push('allergies = ?');
      params.push(cleanAllergies);
    }

    // 6. Medical Notes
    const targetMedical = medicalNotes !== undefined ? medicalNotes : medical_notes;
    if (targetMedical !== undefined) {
      const cleanMedical = targetMedical ? String(targetMedical).trim() : null;
      updates.push('medical_notes = ?');
      params.push(cleanMedical);
    }

    // 7. Emergency Address
    const targetAddress = emergencyAddress !== undefined ? emergencyAddress : emergency_address;
    if (targetAddress !== undefined) {
      const cleanAddress = targetAddress ? String(targetAddress).trim() : null;
      updates.push('emergency_address = ?');
      params.push(cleanAddress);
    }

    // 8. Emergency PIN (Hashed securely before storing)
    const targetPin = emergencyPin !== undefined ? emergencyPin : emergency_pin;
    if (targetPin !== undefined) {
      const cleanPin = targetPin ? String(targetPin).trim() : null;
      if (cleanPin) {
        if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
          return res.status(400).json({
            success: false,
            error: 'Emergency PIN must be exactly 4 digits.',
          });
        }
        const hashedPin = await bcrypt.hash(cleanPin, 10);
        updates.push('emergency_pin = ?');
        params.push(hashedPin);
      } else {
        // Clears the PIN if null or empty string provided
        updates.push('emergency_pin = NULL');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid profile fields provided for update.',
      });
    }

    params.push(req.user.id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Query updated row safely
    const [updatedRows] = await pool.query(
      `SELECT id, name, email, phone, email_verified, phone_verified,
              blood_group, allergies, medical_notes, emergency_address, emergency_pin,
              created_at, updated_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile: formatUserResponse(updatedRows[0]),
    });
  } catch (err) {
    console.error('[Update Profile Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile information.',
    });
  }
});

/**
 * POST /api/profile/verify-pin
 * Verifies the emergency deactivation PIN against the user's stored bcrypt hash.
 */
router.post('/verify-pin', requireAuth, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Please enter a valid 4-digit PIN.',
      });
    }

    const cleanPin = pin.trim();

    const [rows] = await pool.query(
      'SELECT emergency_pin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'User account not found.',
      });
    }

    const hashedPin = rows[0].emergency_pin;

    // If user has not configured a PIN, permit resolution safely
    if (!hashedPin) {
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'No emergency PIN is configured.',
      });
    }

    const isMatch = await bcrypt.compare(cleanPin, hashedPin);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Incorrect Emergency PIN. Emergency broadcast remains active.',
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'PIN verified successfully.',
    });
  } catch (err) {
    console.error('[Verify Emergency PIN Error]:', err);
    return res.status(500).json({
      success: false,
      verified: false,
      error: 'Failed to verify emergency PIN.',
    });
  }
});

export default router;
