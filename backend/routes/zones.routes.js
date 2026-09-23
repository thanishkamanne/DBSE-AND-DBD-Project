import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Format safety zone record for API response.
 */
export function formatZoneResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type || 'custom',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radius: Number(row.radius) || 100,
    is_enabled: Boolean(row.is_enabled),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /api/safety-zones
 * Lists all safety zones created by the authenticated user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, name, type, latitude, longitude, radius, is_enabled,
              created_at, updated_at
       FROM safety_zones
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      zones: rows.map(formatZoneResponse),
    });
  } catch (err) {
    console.error('[Get Safety Zones Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve safety zones.',
    });
  }
});

/**
 * POST /api/safety-zones
 * Adds a new safety zone for the authenticated user.
 * Validates coordinate ranges and radius.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, type, latitude, longitude, radius, is_enabled, enabled } = req.body;

    // 1. Name validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Zone name is required.',
      });
    }

    // 2. Latitude validation
    if (latitude === undefined || latitude === null || latitude === '') {
      return res.status(400).json({
        success: false,
        error: 'Latitude coordinate is required.',
      });
    }
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude. Must be between -90 and 90.',
      });
    }

    // 3. Longitude validation
    if (longitude === undefined || longitude === null || longitude === '') {
      return res.status(400).json({
        success: false,
        error: 'Longitude coordinate is required.',
      });
    }
    const lng = Number(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid longitude. Must be between -180 and 180.',
      });
    }

    // 4. Radius validation (in meters)
    let cleanRadius = 100;
    if (radius !== undefined && !isNaN(Number(radius))) {
      cleanRadius = Math.max(10, Math.min(50000, Number(radius)));
    }

    // 5. Type validation
    const validTypes = ['home', 'college', 'office', 'hostel', 'custom'];
    const cleanType = type && validTypes.includes(String(type).toLowerCase())
      ? String(type).toLowerCase()
      : 'custom';

    const isEnabledVal = is_enabled !== undefined
      ? (Boolean(is_enabled) ? 1 : 0)
      : (enabled !== undefined ? (Boolean(enabled) ? 1 : 0) : 1);

    // 6. Insert zone
    const [result] = await pool.query(
      `INSERT INTO safety_zones
        (user_id, name, type, latitude, longitude, radius, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name.trim(), cleanType, lat, lng, cleanRadius, isEnabledVal]
    );

    const [inserted] = await pool.query(
      `SELECT id, user_id, name, type, latitude, longitude, radius, is_enabled,
              created_at, updated_at
       FROM safety_zones
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Safety zone created successfully.',
      zone: formatZoneResponse(inserted[0]),
    });
  } catch (err) {
    console.error('[Create Safety Zone Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create safety zone.',
    });
  }
});

/**
 * PUT /api/safety-zones/:id
 * Updates an existing safety zone belonging to the authenticated user.
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id, 10);
    if (isNaN(zoneId) || zoneId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid safety zone ID format.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id FROM safety_zones WHERE id = ? AND user_id = ?',
      [zoneId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Safety zone not found or does not belong to you.',
      });
    }

    const { name, type, latitude, longitude, radius, is_enabled, enabled } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Zone name cannot be empty.',
        });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (type !== undefined) {
      const validTypes = ['home', 'college', 'office', 'hostel', 'custom'];
      const cleanType = validTypes.includes(String(type).toLowerCase())
        ? String(type).toLowerCase()
        : 'custom';
      updates.push('type = ?');
      params.push(cleanType);
    }

    if (latitude !== undefined) {
      const lat = Number(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          error: 'Invalid latitude. Must be between -90 and 90.',
        });
      }
      updates.push('latitude = ?');
      params.push(lat);
    }

    if (longitude !== undefined) {
      const lng = Number(longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          error: 'Invalid longitude. Must be between -180 and 180.',
        });
      }
      updates.push('longitude = ?');
      params.push(lng);
    }

    if (radius !== undefined) {
      const rad = Number(radius);
      if (isNaN(rad) || rad <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Radius must be a positive number of meters.',
        });
      }
      updates.push('radius = ?');
      params.push(Math.max(10, Math.min(50000, rad)));
    }

    if (is_enabled !== undefined) {
      updates.push('is_enabled = ?');
      params.push(Boolean(is_enabled) ? 1 : 0);
    } else if (enabled !== undefined) {
      updates.push('is_enabled = ?');
      params.push(Boolean(enabled) ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid safety zone fields provided for update.',
      });
    }

    params.push(zoneId, req.user.id);
    await pool.query(
      `UPDATE safety_zones SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [updated] = await pool.query(
      `SELECT id, user_id, name, type, latitude, longitude, radius, is_enabled,
              created_at, updated_at
       FROM safety_zones
       WHERE id = ? AND user_id = ?`,
      [zoneId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Safety zone updated successfully.',
      zone: formatZoneResponse(updated[0]),
    });
  } catch (err) {
    console.error('[Update Safety Zone Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update safety zone.',
    });
  }
});

/**
 * DELETE /api/safety-zones/:id
 * Deletes a safety zone belonging to the authenticated user.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id, 10);
    if (isNaN(zoneId) || zoneId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid safety zone ID format.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id FROM safety_zones WHERE id = ? AND user_id = ?',
      [zoneId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Safety zone not found or does not belong to you.',
      });
    }

    await pool.query(
      'DELETE FROM safety_zones WHERE id = ? AND user_id = ?',
      [zoneId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Safety zone deleted successfully.',
    });
  } catch (err) {
    console.error('[Delete Safety Zone Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete safety zone.',
    });
  }
});

export default router;
