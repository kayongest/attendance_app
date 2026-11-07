-- Identity AttendanceApp — MySQL Schema & Seed Data (XAMPP)
CREATE DATABASE IF NOT EXISTS `attendance_app`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `attendance_app`;

-- 1. Workspace & Live Event Summary Metrics
CREATE TABLE IF NOT EXISTS `workspace_metrics` (
  `id` INT PRIMARY KEY,
  `event_name` VARCHAR(160) NOT NULL DEFAULT 'Form & Future Summit 2026',
  `total_people` INT NOT NULL DEFAULT 1338,
  `registered` INT NOT NULL DEFAULT 1284,
  `checked_in` INT NOT NULL DEFAULT 964,
  `waitlist` INT NOT NULL DEFAULT 42,
  `cancelled` INT NOT NULL DEFAULT 12,
  `checked_in_delta` INT NOT NULL DEFAULT 186,
  `ticket_revenue` INT NOT NULL DEFAULT 128400,
  `last_arrival_time` VARCHAR(32) NOT NULL DEFAULT '10:06 AM',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Attendees Directory Table
CREATE TABLE IF NOT EXISTS `attendees` (
  `id` VARCHAR(64) PRIMARY KEY,
  `initials` VARCHAR(8) NOT NULL,
  `bg_overview` VARCHAR(16) NOT NULL,
  `bg_directory` VARCHAR(16) NOT NULL,
  `color` VARCHAR(16) NOT NULL,
  `color_directory` VARCHAR(16) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `company` VARCHAR(120) NOT NULL,
  `role` VARCHAR(120) NOT NULL,
  `ticket` VARCHAR(64) NOT NULL,
  `ticket_price` INT NOT NULL DEFAULT 100,
  `ticket_highlight` TINYINT(1) NOT NULL DEFAULT 0,
  `registered_date` VARCHAR(32) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Registered',
  `checked_in` TINYINT(1) NOT NULL DEFAULT 0,
  `checkin_time` VARCHAR(32) DEFAULT NULL,
  `checkin_station` VARCHAR(64) DEFAULT 'North Foyer Kiosk 01',
  `sort_order` INT NOT NULL DEFAULT 100,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Events Directory Table
CREATE TABLE IF NOT EXISTS `events` (
  `id` VARCHAR(64) PRIMARY KEY,
  `month_label` VARCHAR(8) NOT NULL,
  `day_label` VARCHAR(8) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `type` VARCHAR(80) NOT NULL,
  `date_label` VARCHAR(64) NOT NULL,
  `time_label` VARCHAR(64) NOT NULL,
  `venue` VARCHAR(120) NOT NULL,
  `city` VARCHAR(120) NOT NULL,
  `registered_count` INT NOT NULL DEFAULT 0,
  `capacity_count` INT NOT NULL DEFAULT 100,
  `bar_width_px` INT NOT NULL DEFAULT 0,
  `is_past_bar` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Upcoming',
  `action_label` VARCHAR(64) NOT NULL DEFAULT 'Manage event →',
  `action_target` VARCHAR(32) NOT NULL DEFAULT 'attendees',
  `sort_order` INT NOT NULL DEFAULT 100,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 30-Minute Check-in Velocity Intervals
CREATE TABLE IF NOT EXISTS `checkin_intervals` (
  `id` INT PRIMARY KEY,
  `slot_label` VARCHAR(16) NOT NULL,
  `guest_count` INT NOT NULL,
  `bar_height_px` DECIMAL(5,1) NOT NULL,
  `is_peak` TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Real-time Check-in Activity Logs (for Analytics Live Feed & Kiosk Telemetry)
CREATE TABLE IF NOT EXISTS `checkin_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `attendee_id` VARCHAR(64) NOT NULL,
  `attendee_name` VARCHAR(120) NOT NULL,
  `initials` VARCHAR(8) NOT NULL,
  `avatar_bg` VARCHAR(16) NOT NULL,
  `avatar_color` VARCHAR(16) NOT NULL,
  `company` VARCHAR(120) NOT NULL,
  `ticket` VARCHAR(64) NOT NULL,
  `station` VARCHAR(64) NOT NULL,
  `checkin_time` VARCHAR(32) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
