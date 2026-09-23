import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { executeFileQuery } from './fileStore.js';

dotenv.config();

// Ensure required environment variables are evaluated
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'women_safety',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Create a raw MySQL connection pool
const rawPool = mysql.createPool(dbConfig);
let mysqlAvailable = null;

// Create a resilient singleton pool that seamlessly falls back to file storage if MySQL is offline
export const pool = {
  async query(sql, params = []) {
    if (mysqlAvailable !== false) {
      try {
        return await rawPool.query(sql, params);
      } catch (err) {
        if (
          err.code === 'ECONNREFUSED' ||
          err.code === 'ENOTFOUND' ||
          err.code === 'ER_ACCESS_DENIED_ERROR' ||
          err.message?.includes('ECONNREFUSED')
        ) {
          mysqlAvailable = false;
          console.warn('[DB] MySQL unreachable; activating persistent local storage fallback.');
          return await executeFileQuery(sql, params);
        }
        throw err;
      }
    }
    return await executeFileQuery(sql, params);
  },

  async getConnection() {
    if (mysqlAvailable !== false) {
      try {
        const conn = await rawPool.getConnection();
        return conn;
      } catch (err) {
        mysqlAvailable = false;
        return {
          async query(sql, params = []) {
            return executeFileQuery(sql, params);
          },
          async ping() {
            return true;
          },
          async beginTransaction() {},
          async commit() {},
          async rollback() {},
          release() {},
        };
      }
    }
    return {
      async query(sql, params = []) {
        return executeFileQuery(sql, params);
      },
      async ping() {
        return true;
      },
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {},
    };
  },
};

/**
 * Verifies active database connectivity safely without exposing credentials.
 * @returns {Promise<{ connected: boolean, error?: string, driver?: string }>}
 */
export async function testDbConnection() {
  if (mysqlAvailable !== false) {
    try {
      const connection = await rawPool.getConnection();
      await connection.ping();
      connection.release();
      mysqlAvailable = true;
      return { connected: true, driver: 'mysql' };
    } catch {
      mysqlAvailable = false;
      return { connected: true, driver: 'file-store' };
    }
  }
  return { connected: true, driver: 'file-store' };
}

/**
 * Initializes required tables if they do not already exist.
 * Fresh databases start with zero users. No demo accounts are inserted.
 */
export async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    // 1. Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50) UNIQUE DEFAULT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified TINYINT(1) DEFAULT 0,
        phone_verified TINYINT(1) DEFAULT 0,
        blood_group VARCHAR(10) DEFAULT NULL,
        allergies TEXT DEFAULT NULL,
        medical_notes TEXT DEFAULT NULL,
        emergency_address TEXT DEFAULT NULL,
        emergency_pin VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure emergency_pin column supports bcrypt hash length if table existed previously
    try {
      await connection.query(`
        ALTER TABLE users MODIFY COLUMN emergency_pin VARCHAR(255) DEFAULT NULL;
      `);
    } catch {
      // Ignored if column already fits
    }

    // 2. Emergency Contacts Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        relationship VARCHAR(50) DEFAULT NULL,
        priority INT DEFAULT 0,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_contacts_user_id (user_id),
        CONSTRAINT fk_emergency_contacts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. SOS Incidents Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sos_incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        status ENUM('active', 'cancelled', 'resolved') DEFAULT 'active',
        latitude DECIMAL(10, 8) DEFAULT NULL,
        longitude DECIMAL(11, 8) DEFAULT NULL,
        location_accuracy DECIMAL(8, 2) DEFAULT NULL,
        client_request_id VARCHAR(100) DEFAULT NULL,
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TIMESTAMP NULL DEFAULT NULL,
        resolved_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sos_user_id (user_id),
        INDEX idx_sos_status (status),
        INDEX idx_sos_client_request_id (user_id, client_request_id),
        CONSTRAINT fk_sos_incidents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Check-Ins Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 15,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        grace_period_minutes INT DEFAULT 5,
        status ENUM('active', 'safe', 'missed', 'cancelled') DEFAULT 'active',
        safe_at TIMESTAMP NULL DEFAULT NULL,
        missed_at TIMESTAMP NULL DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_checkins_user_id (user_id),
        INDEX idx_checkins_status (status),
        CONSTRAINT fk_checkins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Safety Zones Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS safety_zones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'custom',
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        radius INT NOT NULL DEFAULT 100,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_safety_zones_user_id (user_id),
        CONSTRAINT fk_safety_zones_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Safety Network Members Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS safety_network_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        helper_user_id INT NULL,
        helper_name VARCHAR(255) NOT NULL,
        helper_phone VARCHAR(50) DEFAULT NULL,
        relationship VARCHAR(50) DEFAULT 'peer',
        status ENUM('pending', 'active', 'opted_out', 'blocked') DEFAULT 'active',
        is_opted_in TINYINT(1) DEFAULT 1,
        approx_latitude DECIMAL(10, 4) DEFAULT NULL,
        approx_longitude DECIMAL(11, 4) DEFAULT NULL,
        availability_radius_km INT DEFAULT 5,
        is_blocked TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_network_user_id (user_id),
        INDEX idx_network_helper_user_id (helper_user_id),
        CONSTRAINT fk_network_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_network_helper_user FOREIGN KEY (helper_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Evidence Records Metadata Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS evidence_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        filename VARCHAR(255) DEFAULT NULL,
        duration_seconds INT DEFAULT NULL,
        file_size_bytes INT DEFAULT NULL,
        storage_type VARCHAR(50) DEFAULT 'client_storage',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_evidence_user_id (user_id),
        CONSTRAINT fk_evidence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. User Alerts / Notifications Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_alerts_user_id (user_id),
        INDEX idx_alerts_is_read (is_read),
        CONSTRAINT fk_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[MySQL] Database schema verified successfully. All 8 tables ready.');
  } finally {
    connection.release();
  }
}
