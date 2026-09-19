import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'women_safety_dev_secret_key_change_in_production';

/**
 * Middleware to require authentication.
 * Checks for token in HTTP-only cookie first, then falls back to Authorization: Bearer <token>.
 */
export async function requireAuth(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2. Check Authorization header (Bearer <token>)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Session has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token.',
      });
    }

    // Query user record from MySQL
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, email_verified, phone_verified,
              blood_group, allergies, medical_notes, emergency_address, emergency_pin,
              created_at, updated_at
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Authenticated user account was not found.',
      });
    }

    // Attach user to request object
    req.user = rows[0];
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during authentication verification.',
    });
  }
}
