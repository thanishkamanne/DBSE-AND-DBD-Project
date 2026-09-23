import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Formats a contact row safely without internal database noise.
 */
export function formatContactResponse(contact) {
  return {
    id: contact.id,
    user_id: contact.user_id,
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship || null,
    priority: Number(contact.priority) || 0,
    is_enabled: Boolean(contact.is_enabled),
    created_at: contact.created_at,
    updated_at: contact.updated_at,
  };
}

/**
 * GET /api/contacts
 * Returns all emergency contacts for the authenticated user ordered by priority.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, name, phone, relationship, priority, is_enabled, created_at, updated_at
       FROM emergency_contacts
       WHERE user_id = ?
       ORDER BY priority ASC, id ASC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      contacts: rows.map(formatContactResponse),
    });
  } catch (err) {
    console.error('[Get Contacts Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve emergency contacts.',
    });
  }
});

/**
 * POST /api/contacts
 * Adds a new emergency contact for the authenticated user.
 * Enforces a strict ceiling of maximum 7 contacts per user.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, phone, relationship, priority, is_enabled, enabled } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Contact name is required.',
      });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Contact phone number is required.',
      });
    }

    // 2. Enforce maximum limit of 7 contacts per user
    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM emergency_contacts WHERE user_id = ?',
      [req.user.id]
    );

    const totalContacts = countRows[0]?.total || 0;
    if (totalContacts >= 7) {
      return res.status(400).json({
        success: false,
        error: 'Maximum limit of 7 emergency contacts reached. Please remove an existing contact to add a new one.',
      });
    }

    // 3. Prepare fields
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanRelationship = relationship ? String(relationship).trim() : null;
    
    let contactPriority = totalContacts;
    if (priority !== undefined && !isNaN(Number(priority))) {
      contactPriority = Number(priority);
    }

    let contactEnabled = 1;
    if (is_enabled !== undefined) {
      contactEnabled = Boolean(is_enabled) ? 1 : 0;
    } else if (enabled !== undefined) {
      contactEnabled = Boolean(enabled) ? 1 : 0;
    }

    // 4. Insert contact
    const [result] = await pool.query(
      `INSERT INTO emergency_contacts (user_id, name, phone, relationship, priority, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, cleanName, cleanPhone, cleanRelationship, contactPriority, contactEnabled]
    );

    // 5. Fetch newly created contact
    const [insertedRows] = await pool.query(
      `SELECT id, user_id, name, phone, relationship, priority, is_enabled, created_at, updated_at
       FROM emergency_contacts
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Emergency contact added successfully.',
      contact: formatContactResponse(insertedRows[0]),
    });
  } catch (err) {
    console.error('[Add Contact Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to add emergency contact.',
    });
  }
});

/**
 * PUT /api/contacts/:id
 * Updates an emergency contact belonging to the authenticated user.
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id, 10);
    if (isNaN(contactId) || contactId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact ID format.',
      });
    }

    // 1. Verify contact exists and belongs to authenticated user
    const [existing] = await pool.query(
      'SELECT id FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Emergency contact not found or does not belong to you.',
      });
    }

    // 2. Gather updates
    const { name, phone, relationship, priority, is_enabled, enabled } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Contact name cannot be empty.',
        });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || !phone.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Contact phone cannot be empty.',
        });
      }
      updates.push('phone = ?');
      params.push(phone.trim());
    }

    if (relationship !== undefined) {
      updates.push('relationship = ?');
      params.push(relationship ? String(relationship).trim() : null);
    }

    if (priority !== undefined) {
      if (isNaN(Number(priority))) {
        return res.status(400).json({
          success: false,
          error: 'Priority must be a valid number.',
        });
      }
      updates.push('priority = ?');
      params.push(Number(priority));
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
        error: 'No valid contact fields provided for update.',
      });
    }

    // 3. Apply updates
    params.push(contactId, req.user.id);
    await pool.query(
      `UPDATE emergency_contacts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    // 4. Fetch updated row
    const [updatedRows] = await pool.query(
      `SELECT id, user_id, name, phone, relationship, priority, is_enabled, created_at, updated_at
       FROM emergency_contacts
       WHERE id = ? AND user_id = ?`,
      [contactId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Emergency contact updated successfully.',
      contact: formatContactResponse(updatedRows[0]),
    });
  } catch (err) {
    console.error('[Update Contact Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update emergency contact.',
    });
  }
});

/**
 * DELETE /api/contacts/:id
 * Deletes an emergency contact belonging to the authenticated user.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id, 10);
    if (isNaN(contactId) || contactId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact ID format.',
      });
    }

    // 1. Verify contact exists and belongs to authenticated user
    const [existing] = await pool.query(
      'SELECT id FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Emergency contact not found or does not belong to you.',
      });
    }

    // 2. Perform deletion
    await pool.query(
      'DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Emergency contact deleted successfully.',
    });
  } catch (err) {
    console.error('[Delete Contact Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete emergency contact.',
    });
  }
});

export default router;
