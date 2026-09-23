import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Format safety network relationship safely respecting user privacy.
 */
export function formatNetworkMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    helper_user_id: row.helper_user_id || null,
    helper_name: row.helper_name,
    helper_phone: row.helper_phone || null,
    relationship: row.relationship || 'peer',
    status: row.status,
    is_opted_in: Boolean(row.is_opted_in),
    // Approximate coordinates only provided if opted-in to protect privacy
    approx_latitude: row.is_opted_in && row.approx_latitude !== null ? Number(row.approx_latitude) : null,
    approx_longitude: row.is_opted_in && row.approx_longitude !== null ? Number(row.approx_longitude) : null,
    availability_radius_km: Number(row.availability_radius_km) || 5,
    is_blocked: Boolean(row.is_blocked),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /api/safety-network
 * Lists the authenticated user's safety network members and verified relationships.
 * No fake helpers are generated.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, helper_user_id, helper_name, helper_phone,
              relationship, status, is_opted_in, approx_latitude, approx_longitude,
              availability_radius_km, is_blocked, created_at, updated_at
       FROM safety_network_members
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      members: rows.map(formatNetworkMember),
    });
  } catch (err) {
    console.error('[Get Safety Network Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve safety network members.',
    });
  }
});

/**
 * POST /api/safety-network
 * Adds a real contact or registered user to the user's safety network.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      helperName,
      helper_name,
      helperPhone,
      helper_phone,
      helperEmail,
      relationship,
      approxLatitude,
      approx_latitude,
      approxLongitude,
      approx_longitude,
      availabilityRadiusKm,
      availability_radius_km,
    } = req.body;

    const name = (helperName || helper_name || '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Helper name is required.',
      });
    }

    const phone = helperPhone || helper_phone ? String(helperPhone || helper_phone).trim() : null;
    const rel = relationship ? String(relationship).trim() : 'peer';

    // Optional: check if helperEmail matches an existing registered user
    let linkedUserId = null;
    if (helperEmail && typeof helperEmail === 'string') {
      const cleanEmail = helperEmail.trim().toLowerCase();
      const [matchedUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [cleanEmail, req.user.id]
      );
      if (matchedUsers && matchedUsers.length > 0) {
        linkedUserId = matchedUsers[0].id;
      }
    }

    // Approximate location (coarse coordinates only)
    const rawLat = approxLatitude !== undefined ? approxLatitude : approx_latitude;
    const rawLng = approxLongitude !== undefined ? approxLongitude : approx_longitude;
    let approxLat = null;
    let approxLng = null;

    if (rawLat !== undefined && rawLat !== null && rawLat !== '') {
      const parsedLat = Number(rawLat);
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        approxLat = parseFloat(parsedLat.toFixed(4));
      }
    }

    if (rawLng !== undefined && rawLng !== null && rawLng !== '') {
      const parsedLng = Number(rawLng);
      if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        approxLng = parseFloat(parsedLng.toFixed(4));
      }
    }

    const rawRadius = availabilityRadiusKm !== undefined ? availabilityRadiusKm : availability_radius_km;
    const radiusKm = rawRadius !== undefined && !isNaN(Number(rawRadius)) ? Math.max(1, Number(rawRadius)) : 5;

    const [result] = await pool.query(
      `INSERT INTO safety_network_members
        (user_id, helper_user_id, helper_name, helper_phone, relationship, status, is_opted_in, approx_latitude, approx_longitude, availability_radius_km, is_blocked)
       VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?, ?, 0)`,
      [req.user.id, linkedUserId, name, phone, rel, approxLat, approxLng, radiusKm]
    );

    const [inserted] = await pool.query(
      `SELECT id, user_id, helper_user_id, helper_name, helper_phone,
              relationship, status, is_opted_in, approx_latitude, approx_longitude,
              availability_radius_km, is_blocked, created_at, updated_at
       FROM safety_network_members
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Safety network member added successfully.',
      member: formatNetworkMember(inserted[0]),
    });
  } catch (err) {
    console.error('[Add Safety Network Member Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to add safety network member.',
    });
  }
});

/**
 * PUT /api/safety-network/:id
 * Updates opt-in, availability, or block status of a safety network member.
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (isNaN(memberId) || memberId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id FROM safety_network_members WHERE id = ? AND user_id = ?',
      [memberId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Safety network member not found or does not belong to you.',
      });
    }

    const {
      isOptedIn,
      is_opted_in,
      isBlocked,
      is_blocked,
      relationship,
      availabilityRadiusKm,
      availability_radius_km,
    } = req.body;

    const updates = [];
    const params = [];

    const optedInVal = isOptedIn !== undefined ? isOptedIn : is_opted_in;
    if (optedInVal !== undefined) {
      updates.push('is_opted_in = ?');
      params.push(Boolean(optedInVal) ? 1 : 0);
    }

    const blockedVal = isBlocked !== undefined ? isBlocked : is_blocked;
    if (blockedVal !== undefined) {
      updates.push('is_blocked = ?');
      params.push(Boolean(blockedVal) ? 1 : 0);
      if (Boolean(blockedVal)) {
        updates.push("status = 'blocked'");
      }
    }

    if (relationship !== undefined) {
      updates.push('relationship = ?');
      params.push(String(relationship).trim());
    }

    const rawRadius = availabilityRadiusKm !== undefined ? availabilityRadiusKm : availability_radius_km;
    if (rawRadius !== undefined && !isNaN(Number(rawRadius))) {
      updates.push('availability_radius_km = ?');
      params.push(Math.max(1, Number(rawRadius)));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid update fields provided.',
      });
    }

    params.push(memberId, req.user.id);
    await pool.query(
      `UPDATE safety_network_members SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [updated] = await pool.query(
      `SELECT id, user_id, helper_user_id, helper_name, helper_phone,
              relationship, status, is_opted_in, approx_latitude, approx_longitude,
              availability_radius_km, is_blocked, created_at, updated_at
       FROM safety_network_members
       WHERE id = ? AND user_id = ?`,
      [memberId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Safety network member updated successfully.',
      member: formatNetworkMember(updated[0]),
    });
  } catch (err) {
    console.error('[Update Safety Network Member Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update safety network member.',
    });
  }
});

/**
 * DELETE /api/safety-network/:id
 * Removes a helper from the user's safety network.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (isNaN(memberId) || memberId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id FROM safety_network_members WHERE id = ? AND user_id = ?',
      [memberId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Safety network member not found or does not belong to you.',
      });
    }

    await pool.query(
      'DELETE FROM safety_network_members WHERE id = ? AND user_id = ?',
      [memberId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Safety network member removed successfully.',
    });
  } catch (err) {
    console.error('[Delete Safety Network Member Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete safety network member.',
    });
  }
});

export default router;
