-- Women Safety Database Schema
-- Target Database: MySQL 8.0+

CREATE DATABASE IF NOT EXISTS women_safety;
USE women_safety;

-- 1. Users Table (Zero demo data, fresh start)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) UNIQUE DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) DEFAULT 0,
  phone_verified TINYINT(1) DEFAULT 0,
  preferred_verification_channel ENUM('sms', 'email') DEFAULT 'sms',
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

-- 1b. OTP Verifications Table (Secure, hashed, single-use with expiry and attempt limiting)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  channel ENUM('sms', 'email') NOT NULL,
  destination VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_user_id (user_id),
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Emergency Contacts Table (Maximum 7 contacts per user enforced at API level)
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

-- 3. SOS Incidents Table (With idempotency client_request_id for safe offline retries)
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

-- 3b. SOS Notifications Dispatch & Delivery Status Tracking (Per contact tracking)
CREATE TABLE IF NOT EXISTS sos_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  user_id INT NOT NULL,
  contact_id INT NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(50) NOT NULL,
  notification_type ENUM('sms', 'call', 'push') DEFAULT 'sms',
  provider_message_id VARCHAR(255) DEFAULT NULL,
  status ENUM('queued', 'sent', 'delivered', 'failed', 'provider_not_configured') DEFAULT 'queued',
  error_message TEXT DEFAULT NULL,
  sent_at TIMESTAMP NULL DEFAULT NULL,
  delivered_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sos_notif_incident (incident_id),
  INDEX idx_sos_notif_user (user_id),
  INDEX idx_sos_notif_provider_id (provider_message_id),
  CONSTRAINT fk_sos_notif_incident FOREIGN KEY (incident_id) REFERENCES sos_incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_sos_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Check-Ins Table
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

-- 5. Safety Zones Table
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

-- 6. Safety Network Members Table (Verified registered users and relationships only)
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

-- 7. Evidence Records Metadata Table
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

-- 8. User Alerts / Notifications Table
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

