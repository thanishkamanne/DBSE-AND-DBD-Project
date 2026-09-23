import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Helper to format an SOS incident row safely.
 */
export function formatSosResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    location_accuracy: row.location_accuracy !== null ? Number(row.location_accuracy) : null,
    client_request_id: row.client_request_id || null,
    triggered_at: row.triggered_at,
    cancelled_at: row.cancelled_at || null,
    resolved_at: row.resolved_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /api/sos/history
 * Returns all past and current SOS incidents for the authenticated user.
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, status, latitude, longitude, location_accuracy,
              client_request_id, triggered_at, cancelled_at, resolved_at,
              created_at, updated_at
       FROM sos_incidents
       WHERE user_id = ?
       ORDER BY triggered_at DESC, id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      incidents: rows.map(formatSosResponse),
    });
  } catch (err) {
    console.error('[Get SOS History Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve SOS incident history.',
    });
  }
});

/**
 * GET /api/sos/active
 * Returns the currently active SOS incident if one exists for the authenticated user.
 */
router.get('/active', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, status, latitude, longitude, location_accuracy,
              client_request_id, triggered_at, cancelled_at, resolved_at,
              created_at, updated_at
       FROM sos_incidents
       WHERE user_id = ? AND status = 'active'
       ORDER BY triggered_at DESC, id DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        hasActiveSos: false,
        incident: null,
      });
    }

    const incident = formatSosResponse(rows[0]);

    // Query notifications for this active incident
    const [notifRows] = await pool.query(
      `SELECT id, incident_id, contact_id, recipient_name, recipient_phone,
              notification_type, status, error_message, sent_at
       FROM sos_notifications
       WHERE incident_id = ? AND user_id = ?`,
      [incident.id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      hasActiveSos: true,
      incident,
      notifications: notifRows || [],
    });
  } catch (err) {
    console.error('[Get Active SOS Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to check active SOS status.',
    });
  }
});

/**
 * GET /api/sos/:id/notifications
 * Returns recorded contact notifications for a specific incident
 */
router.get('/:id/notifications', requireAuth, async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT id, incident_id, contact_id, recipient_name, recipient_phone,
              notification_type, status, error_message, sent_at, created_at
       FROM sos_notifications
       WHERE incident_id = ? AND user_id = ?
       ORDER BY id ASC`,
      [incidentId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      notifications: rows || [],
    });
  } catch (err) {
    console.error('[Get SOS Notifications Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification records.',
    });
  }
});

/**
 * POST /api/sos and POST /api/sos/trigger
 * Real emergency flow:
 * 1. Validates real GPS coordinates
 * 2. Creates incident with idempotency check
 * 3. Associates incident with user's emergency contacts in database
 * Note: Does NOT send automated SMS/messages per requirement.
 */
async function handleTriggerSos(req, res) {
  try {
    const {
      latitude,
      longitude,
      locationAccuracy,
      location_accuracy,
      clientRequestId,
      client_request_id,
      idempotencyKey,
    } = req.body;

    const rawRequestId = clientRequestId || client_request_id || idempotencyKey || req.headers['idempotency-key'] || null;
    const cleanRequestId = rawRequestId ? String(rawRequestId).trim().slice(0, 100) : null;

    // 1. Idempotency Check
    if (cleanRequestId) {
      const [existing] = await pool.query(
        `SELECT id, user_id, status, latitude, longitude, location_accuracy,
                client_request_id, triggered_at, cancelled_at, resolved_at,
                created_at, updated_at
         FROM sos_incidents
         WHERE user_id = ? AND client_request_id = ?
         LIMIT 1`,
        [req.user.id, cleanRequestId]
      );

      if (existing && existing.length > 0) {
        const [notifRows] = await pool.query(
          `SELECT id, incident_id, contact_id, recipient_name, recipient_phone, status, error_message
           FROM sos_notifications WHERE incident_id = ?`,
          [existing[0].id]
        );
        return res.status(200).json({
          success: true,
          duplicateDetected: true,
          message: 'Existing SOS incident retrieved for this request.',
          incident: formatSosResponse(existing[0]),
          notifications: notifRows || [],
        });
      }
    }

    // 2. Validate coordinates if provided
    let cleanLat = null;
    let cleanLng = null;
    let cleanAcc = null;

    if (latitude !== undefined && latitude !== null && latitude !== '') {
      const parsedLat = Number(latitude);
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        cleanLat = parsedLat;
      }
    }

    if (longitude !== undefined && longitude !== null && longitude !== '') {
      const parsedLng = Number(longitude);
      if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        cleanLng = parsedLng;
      }
    }

    const rawAcc = locationAccuracy !== undefined ? locationAccuracy : location_accuracy;
    if (rawAcc !== undefined && rawAcc !== null && rawAcc !== '') {
      const parsedAcc = Number(rawAcc);
      if (!isNaN(parsedAcc) && parsedAcc >= 0) {
        cleanAcc = parsedAcc;
      }
    }

    // 3. Insert SOS incident record
    const [result] = await pool.query(
      `INSERT INTO sos_incidents
        (user_id, status, latitude, longitude, location_accuracy, client_request_id, triggered_at)
       VALUES (?, 'active', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [req.user.id, cleanLat, cleanLng, cleanAcc, cleanRequestId]
    );

    const incidentId = result.insertId;

    // 4. Create internal alert record
    try {
      await pool.query(
        `INSERT INTO user_alerts (user_id, type, title, message)
         VALUES (?, 'sos_update', 'SOS Triggered', 'Emergency SOS mode was activated in your application.')`,
        [req.user.id]
      );
    } catch {}

    // 5. Query the authenticated user's emergency contacts
    const [contacts] = await pool.query(
      `SELECT id, name, phone, relationship, is_enabled
       FROM emergency_contacts
       WHERE user_id = ? AND is_enabled = 1
       ORDER BY priority ASC, id ASC`,
      [req.user.id]
    );

    const notifications = [];

    // 6. Record linkage to emergency contacts for audit history (no SMS sent)
    for (const contact of contacts) {
      try {
        const [notifResult] = await pool.query(
          `INSERT INTO sos_notifications
            (incident_id, user_id, contact_id, recipient_name, recipient_phone, notification_type, status, sent_at)
           VALUES (?, ?, ?, ?, ?, 'app_record', 'recorded', CURRENT_TIMESTAMP)`,
          [incidentId, req.user.id, contact.id, contact.name, contact.phone]
        );

        notifications.push({
          id: notifResult.insertId,
          contactId: contact.id,
          recipientName: contact.name,
          recipientPhone: contact.phone,
          status: 'recorded',
        });
      } catch (err) {
        console.error('[Insert Notification Record Error]:', err);
      }
    }

    const [createdRows] = await pool.query('SELECT * FROM sos_incidents WHERE id = ?', [incidentId]);

    return res.status(201).json({
      success: true,
      message: 'Emergency SOS initiated and recorded successfully.',
      incident: formatSosResponse(createdRows[0]),
      contactsCount: contacts.length,
      notifications,
    });
  } catch (err) {
    console.error('[Trigger SOS Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate SOS incident.',
    });
  }
}

router.post('/', requireAuth, handleTriggerSos);
router.post('/trigger', requireAuth, handleTriggerSos);

/**
 * PUT /api/sos/:id
 * Updates, cancels, or resolves an SOS incident.
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id, 10);
    if (isNaN(incidentId) || incidentId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid SOS incident ID.' });
    }

    const [existing] = await pool.query(
      'SELECT id, status FROM sos_incidents WHERE id = ? AND user_id = ?',
      [incidentId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'SOS incident not found or does not belong to you.' });
    }

    const { status, latitude, longitude, locationAccuracy, location_accuracy } = req.body;
    const updates = [];
    const params = [];

    if (status !== undefined) {
      const cleanStatus = String(status).trim().toLowerCase();
      if (!['active', 'cancelled', 'resolved'].includes(cleanStatus)) {
        return res.status(400).json({ success: false, error: 'Status must be: active, cancelled, or resolved.' });
      }

      updates.push('status = ?');
      params.push(cleanStatus);

      if (cleanStatus === 'cancelled') {
        updates.push('cancelled_at = CURRENT_TIMESTAMP');
      } else if (cleanStatus === 'resolved') {
        updates.push('resolved_at = CURRENT_TIMESTAMP');
      }
    }

    if (latitude !== undefined && latitude !== null && latitude !== '') {
      const parsedLat = Number(latitude);
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        updates.push('latitude = ?');
        params.push(parsedLat);
      }
    }

    if (longitude !== undefined && longitude !== null && longitude !== '') {
      const parsedLng = Number(longitude);
      if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        updates.push('longitude = ?');
        params.push(parsedLng);
      }
    }

    const rawAcc = locationAccuracy !== undefined ? locationAccuracy : location_accuracy;
    if (rawAcc !== undefined && rawAcc !== null && rawAcc !== '') {
      const parsedAcc = Number(rawAcc);
      if (!isNaN(parsedAcc) && parsedAcc >= 0) {
        updates.push('location_accuracy = ?');
        params.push(parsedAcc);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields provided for update.' });
    }

    params.push(incidentId, req.user.id);
    await pool.query(
      `UPDATE sos_incidents SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [updatedRows] = await pool.query('SELECT * FROM sos_incidents WHERE id = ?', [incidentId]);

    return res.status(200).json({
      success: true,
      message: 'SOS incident updated successfully.',
      incident: formatSosResponse(updatedRows[0]),
    });
  } catch (err) {
    console.error('[Update SOS Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update SOS incident.' });
  }
});

export default router;
