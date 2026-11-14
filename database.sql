-- aBility Manager (id_badges.php#pane-kiosk) — Standalone Database Schema & Seed
-- Can be imported into `ability_db` or `attendance_app` in XAMPP phpMyAdmin.

CREATE DATABASE IF NOT EXISTS `attendance_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `attendance_app`;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(64) NOT NULL UNIQUE,
    `full_name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(150) DEFAULT NULL,
    `password_hash` VARCHAR(255) DEFAULT NULL,
    `phone` VARCHAR(50) DEFAULT '+250 788 100 200',
    `role` VARCHAR(50) NOT NULL DEFAULT 'technician',
    `department` VARCHAR(80) DEFAULT 'Audio',
    `profile_image` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_badges` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `badge_code` VARCHAR(32) NOT NULL UNIQUE,
    `rfid_uid` VARCHAR(64) DEFAULT NULL,
    `clearance_level` VARCHAR(50) NOT NULL DEFAULT 'L1_VENUE_BASIC',
    `stock_access_mode` VARCHAR(32) NOT NULL DEFAULT 'none',
    `allowed_stock_ids` TEXT DEFAULT NULL,
    `venue_access_mode` VARCHAR(32) NOT NULL DEFAULT 'assigned_only',
    `allowed_event_ids` TEXT DEFAULT NULL,
    `badge_status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `emergency_contact` VARCHAR(100) DEFAULT '+250 788 000 112',
    `blood_group` VARCHAR(10) DEFAULT 'O+',
    `issued_at` DATE NOT NULL,
    `expires_at` DATE NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stock_locations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `code` VARCHAR(32) DEFAULT 'NDR-STK',
    `location_code` VARCHAR(32) DEFAULT 'NDR',
    `location` VARCHAR(160) DEFAULT 'Kigali, Rwanda',
    `open_time` VARCHAR(16) DEFAULT '08:00:00',
    `close_time` VARCHAR(16) DEFAULT '18:00:00',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `terminal_pin` VARCHAR(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `events` (
    `id` VARCHAR(64) PRIMARY KEY,
    `title` VARCHAR(160) NOT NULL,
    `location` VARCHAR(160) DEFAULT 'Kigali Convention Centre',
    `date` DATE DEFAULT NULL,
    `call_time` VARCHAR(32) DEFAULT '08:00',
    `project_manager` VARCHAR(120) DEFAULT 'Operations PM',
    `tech_lead` VARCHAR(120) DEFAULT 'Tech Lead',
    `assigned_technician` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `attendance_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `badge_code` VARCHAR(32) NOT NULL,
    `checkpoint_type` ENUM('stock_warehouse','event_venue','main_office') NOT NULL DEFAULT 'event_venue',
    `checkpoint_id` INT NOT NULL DEFAULT 1,
    `checkpoint_name` VARCHAR(150) NOT NULL,
    `scan_action` ENUM('check_in','check_out','access_verify') NOT NULL DEFAULT 'check_in',
    `access_status` ENUM('granted','denied') NOT NULL DEFAULT 'granted',
    `denial_reason` VARCHAR(255) DEFAULT NULL,
    `punctuality_status` ENUM('on_time','late','early','n/a') NOT NULL DEFAULT 'on_time',
    `scanned_by` INT DEFAULT 1,
    `notes` VARCHAR(255) DEFAULT NULL,
    `scanned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stock_movements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_number` VARCHAR(64) NOT NULL,
    `movement_type` VARCHAR(32) DEFAULT 'dispatch',
    `source_name` VARCHAR(120) DEFAULT 'Ndera Warehouse',
    `destination_name` VARCHAR(120) DEFAULT 'Kigali Convention Centre',
    `destination_room` VARCHAR(120) DEFAULT 'Main Auditorium',
    `technician_id` INT DEFAULT NULL,
    `submitted_by` VARCHAR(120) DEFAULT NULL,
    `stock_controller_name` VARCHAR(120) DEFAULT 'Mirene',
    `status` VARCHAR(32) DEFAULT 'approved',
    `approval_status` VARCHAR(32) DEFAULT 'approved',
    `event_name` VARCHAR(160) DEFAULT 'World Bank Summit',
    `job_sheet` VARCHAR(64) DEFAULT 'JS-2026-104',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `batch_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_id` INT NOT NULL,
    `item_name` VARCHAR(160) DEFAULT 'L-Acoustics Kara II Line Array',
    `quantity` INT NOT NULL DEFAULT 4
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
