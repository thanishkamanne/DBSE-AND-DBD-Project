import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Format evidence metadata row for API response.
 */
export function formatEvidenceResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    filename: row.filename || null,
    duration_seconds: row.duration_seconds !== null ? Number(row.duration_seconds) : null,
    file_size_bytes: row.file_size_bytes !== null ? Number(row.file_size_bytes) : null,
    storage_type: row.storage_type || 'client_storage',
    recorded_at: row.recorded_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /api/evidence
 * Returns all evidence logs and recorded metadata for the authenticated user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, type, filename, duration_seconds, file_size_bytes,
              storage_type, recorded_at, created_at, updated_at
       FROM evidence_records
       WHERE user_id = ?
       ORDER BY recorded_at DESC, id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      evidence: rows.map(formatEvidenceResponse),
    });
  } catch (err) {
    console.error('[Get Evidence Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence records.',
    });
  }
});

/**
 * POST /api/evidence
 * Logs new evidence record metadata in the database.
 * Note: Storage honesty is preserved. If binary blobs remain in browser IndexedDB/CacheStorage,
 * this persists the verifiable incident log and metadata in MySQL with storage_type: 'client_storage'.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      type,
      filename,
      durationSeconds,
      duration_seconds,
      fileSizeBytes,
      file_size_bytes,
      storageType,
      storage_type,
    } = req.body;

    const validTypes = ['audio', 'photo', 'video', 'sensor', 'location_breadcrumb'];
    const cleanType = type && validTypes.includes(String(type).toLowerCase())
      ? String(type).toLowerCase()
      : 'audio';

    const cleanFilename = filename ? String(filename).trim().slice(0, 255) : null;

    const rawDuration = durationSeconds !== undefined ? durationSeconds : duration_seconds;
    const cleanDuration = rawDuration !== undefined && !isNaN(Number(rawDuration))
      ? Math.max(0, parseInt(rawDuration, 10))
      : null;

    const rawSize = fileSizeBytes !== undefined ? fileSizeBytes : file_size_bytes;
    const cleanSize = rawSize !== undefined && !isNaN(Number(rawSize))
      ? Math.max(0, parseInt(rawSize, 10))
      : null;

    const cleanStorage = storageType || storage_type || 'client_storage';

    const [result] = await pool.query(
      `INSERT INTO evidence_records
        (user_id, type, filename, duration_seconds, file_size_bytes, storage_type, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, cleanType, cleanFilename, cleanDuration, cleanSize, cleanStorage]
    );

    const [inserted] = await pool.query(
      `SELECT id, user_id, type, filename, duration_seconds, file_size_bytes,
              storage_type, recorded_at, created_at, updated_at
       FROM evidence_records
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Evidence metadata logged successfully.',
      evidence: formatEvidenceResponse(inserted[0]),
    });
  } catch (err) {
    console.error('[Create Evidence Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to record evidence metadata.',
    });
  }
});

/**
 * DELETE /api/evidence/:id
 * Deletes an evidence log record belonging to the authenticated user.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const evidenceId = parseInt(req.params.id, 10);
    if (isNaN(evidenceId) || evidenceId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence ID format.',
      });
    }

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id FROM evidence_records WHERE id = ? AND user_id = ?',
      [evidenceId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found or does not belong to you.',
      });
    }

    await pool.query(
      'DELETE FROM evidence_records WHERE id = ? AND user_id = ?',
      [evidenceId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Evidence record deleted successfully.',
    });
  } catch (err) {
    console.error('[Delete Evidence Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete evidence record.',
    });
  }
});

export default router;
