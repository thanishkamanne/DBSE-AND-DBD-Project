import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Format check-in row for client.
 */
export function formatCheckinResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    duration_minutes: Number(row.duration_minutes),
    started_at: row.started_at,
    expires_at: row.expires_at,
    grace_period_minutes: Number(row.grace_period_minutes) || 5,
    status: row.status,
    safe_at: row.safe_at || null,
    missed_at: row.missed_at || null,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /api/checkins
 * Lists recent check-in sessions for the authenticated user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, duration_minutes, started_at, expires_at,
              grace_period_minutes, status, safe_at, missed_at, notes,
              created_at, updated_at
       FROM check_ins
       WHERE user_id = ?
       ORDER BY started_at DESC, id DESC
       LIMIT 50`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      checkins: rows.map(formatCheckinResponse),
    });
  } catch (err) {
    console.error('[Get Checkins Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve check-in sessions.',
    });
  }
});

/**
 * GET /api/checkins/active
 * Returns the currently active check-in session for the user if any.
 */
router.get('/active', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, duration_minutes, started_at, expires_at,
              grace_period_minutes, status, safe_at, missed_at, notes,
              created_at, updated_at
       FROM check_ins
       WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        hasActiveCheckin: false,
        checkin: null,
      });
    }

    return res.status(200).json({
      success: true,
      hasActiveCheckin: true,
      checkin: formatCheckinResponse(rows[0]),
    });
  } catch (err) {
    console.error('[Get Active Checkin Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve active check-in.',
    });
  }
});

/**
 * POST /api/checkins
 * Creates a new safety check-in timer session.
 * Supports frontend preset durations (15, 30, 60 minutes) or custom positive minutes.
 * Includes a 5-minute grace period state model.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { durationMinutes, duration_minutes, notes } = req.body;

    const rawMinutes = durationMinutes !== undefined ? durationMinutes : duration_minutes;
    const minutes = rawMinutes !== undefined ? parseInt(rawMinutes, 10) : 15;

    if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be a positive integer between 1 and 1440 minutes.',
      });
    }

    const cleanNotes = notes ? String(notes).trim().slice(0, 500) : null;

    // Calculate expiration timestamp
    const expiresDate = new Date(Date.now() + minutes * 60 * 1000);

    const [result] = await pool.query(
      `INSERT INTO check_ins
        (user_id, duration_minutes, started_at, expires_at, grace_period_minutes, status, notes)
       VALUES (?, ?, NOW(), ?, 5, 'active', ?)`,
      [req.user.id, minutes, expiresDate, cleanNotes]
    );

    const [inserted] = await pool.query(
      `SELECT id, user_id, duration_minutes, started_at, expires_at,
              grace_period_minutes, status, safe_at, missed_at, notes,
              created_at, updated_at
       FROM check_ins
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: `Safety check-in started for ${minutes} minutes.`,
      checkin: formatCheckinResponse(inserted[0]),
    });
  } catch (err) {
    console.error('[Create Checkin Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to start safety check-in session.',
    });
  }
});

/**
 * PUT /api/checkins/:id/safe
 * Marks an active check-in as safe.
 */
router.put('/:id/safe', requireAuth, async (req, res) => {
  try {
    const checkinId = parseInt(req.params.id, 10);
    if (isNaN(checkinId) || checkinId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid check-in ID format.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id, status FROM check_ins WHERE id = ? AND user_id = ?',
      [checkinId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Check-in session not found or does not belong to you.',
      });
    }

    await pool.query(
      `UPDATE check_ins
       SET status = 'safe', safe_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [checkinId, req.user.id]
    );

    const [updated] = await pool.query(
      `SELECT id, user_id, duration_minutes, started_at, expires_at,
              grace_period_minutes, status, safe_at, missed_at, notes,
              created_at, updated_at
       FROM check_ins
       WHERE id = ? AND user_id = ?`,
      [checkinId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Check-in marked as safe.',
      checkin: formatCheckinResponse(updated[0]),
    });
  } catch (err) {
    console.error('[Mark Checkin Safe Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark check-in as safe.',
    });
  }
});

/**
 * PUT /api/checkins/:id/missed
 * Marks an expired check-in as missed.
 * Note: Does not claim external SMS/notification delivery.
 */
router.put('/:id/missed', requireAuth, async (req, res) => {
  try {
    const checkinId = parseInt(req.params.id, 10);
    if (isNaN(checkinId) || checkinId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid check-in ID format.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id, status FROM check_ins WHERE id = ? AND user_id = ?',
      [checkinId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Check-in session not found or does not belong to you.',
      });
    }

    await pool.query(
      `UPDATE check_ins
       SET status = 'missed', missed_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [checkinId, req.user.id]
    );

    const [updated] = await pool.query(
      `SELECT id, user_id, duration_minutes, started_at, expires_at,
              grace_period_minutes, status, safe_at, missed_at, notes,
              created_at, updated_at
       FROM check_ins
       WHERE id = ? AND user_id = ?`,
      [checkinId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Check-in state marked as missed.',
      checkin: formatCheckinResponse(updated[0]),
    });
  } catch (err) {
    console.error('[Mark Checkin Missed Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update check-in status.',
    });
  }
});

export default router;
