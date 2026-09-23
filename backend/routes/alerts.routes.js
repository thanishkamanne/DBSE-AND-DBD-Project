import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Format user alert for API response.
 */
export function formatAlertResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type || 'system',
    title: row.title,
    message: row.message,
    is_read: Boolean(row.is_read),
    created_at: row.created_at,
  };
}

/**
 * GET /api/alerts
 * Lists real application notifications and safety alerts for the authenticated user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, type, title, message, is_read, created_at
       FROM user_alerts
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [req.user.id]
    );

    const unreadCount = rows.filter((r) => !r.is_read).length;

    return res.status(200).json({
      success: true,
      count: rows.length,
      unreadCount,
      alerts: rows.map(formatAlertResponse),
    });
  } catch (err) {
    console.error('[Get Alerts Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts.',
    });
  }
});

/**
 * PUT /api/alerts/read-all
 * Marks all alerts as read for the authenticated user.
 */
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE user_alerts SET is_read = 1 WHERE user_id = ?`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'All alerts marked as read.',
    });
  } catch (err) {
    console.error('[Mark All Alerts Read Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark all alerts as read.',
    });
  }
});

/**
 * PUT /api/alerts/:id/read
 * Marks a single alert as read.
 */
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId) || alertId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert ID format.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id FROM user_alerts WHERE id = ? AND user_id = ?',
      [alertId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or does not belong to you.',
      });
    }

    await pool.query(
      'UPDATE user_alerts SET is_read = 1 WHERE id = ? AND user_id = ?',
      [alertId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Alert marked as read.',
    });
  } catch (err) {
    console.error('[Mark Alert Read Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update alert status.',
    });
  }
});

/**
 * POST /api/alerts
 * Logs a new real in-app safety notification.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required.',
      });
    }

    const cleanTitle = String(title).trim().slice(0, 255);
    const cleanMessage = String(message).trim();
    const cleanType = type ? String(type).trim().slice(0, 50) : 'system';

    const [result] = await pool.query(
      `INSERT INTO user_alerts (user_id, type, title, message, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [req.user.id, cleanType, cleanTitle, cleanMessage]
    );

    const [inserted] = await pool.query(
      `SELECT id, user_id, type, title, message, is_read, created_at
       FROM user_alerts
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Alert recorded successfully.',
      alert: formatAlertResponse(inserted[0]),
    });
  } catch (err) {
    console.error('[Create Alert Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create alert.',
    });
  }
});

export default router;
