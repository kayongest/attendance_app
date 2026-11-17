<?php
/**
 * aBility Manager (id_badges.php#pane-kiosk) — Database Bridge & Auto-Fallback
 * Connects directly to `ability_db` on XAMPP when available, with automatic
 * standalone fallback in `attendance_app` so the repository also works standalone.
 */

declare(strict_types=1);

function getDbConnection(string &$activeDatabaseName = ''): PDO
{
    $host = '127.0.0.1';
    $port = 3306;
    $user = 'root';
    $pass = '';

    $pdo = new PDO(
        "mysql:host={$host};port={$port};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    // Check if `ability_db` exists and has `users` table
    $hasAbilityDb = false;
    try {
        $stmt = $pdo->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'ability_db'");
        if ($stmt && $stmt->fetchColumn()) {
            $tblCheck = $pdo->query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'ability_db' AND TABLE_NAME = 'users'");
            if ($tblCheck && $tblCheck->fetchColumn()) {
                $hasAbilityDb = true;
            }
        }
    } catch (Throwable $e) {
        $hasAbilityDb = false;
    }

    if ($hasAbilityDb) {
        $activeDatabaseName = 'ability_db';
        $pdo->exec("USE `ability_db`");
        ensureAbilitySchemaAndSeed($pdo, false);
    } else {
        $activeDatabaseName = 'attendance_app';
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `attendance_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `attendance_app`");
        ensureAbilitySchemaAndSeed($pdo, false);
    }

    return $pdo;
}

function getFourTierMatrixSpec(): array
{
    return [
        'L1_VENUE_BASIC' => [
            'key' => 'L1_VENUE_BASIC',
            'code' => 'L1',
            'title' => 'Level 1 — Event Venue Crew',
            'short' => 'Event Venue Crew',
            'color' => '#16a34a',
            'badge_bg' => 'rgba(22, 163, 74, 0.14)',
            'default_roles' => ['user', 'driver', 'security'],
            'stock_access' => 'none',
            'venue_access' => 'assigned_or_all',
            'venue_Rule' => 'YES',
            'stock_rule' => 'NO',
        ],
        'L2_TECH_STAGE' => [
            'key' => 'L2_TECH_STAGE',
            'code' => 'L2',
            'title' => 'Level 2 — Technical & Stage',
            'short' => 'Technical & Stage',
            'color' => '#2563eb',
            'badge_bg' => 'rgba(37, 99, 235, 0.14)',
            'default_roles' => ['technician'],
            'stock_access' => 'assigned_or_all',
            'venue_access' => 'assigned_or_all',
            'venue_Rule' => 'YES',
            'stock_rule' => 'YES',
        ],
        'L3_STOCK_WAREHOUSE' => [
            'key' => 'L3_STOCK_WAREHOUSE',
            'code' => 'L3',
            'title' => 'Level 3 — Gate Controller & Operations',
            'short' => 'Gate Controller',
            'color' => '#d97706',
            'badge_bg' => 'rgba(217, 119, 6, 0.16)',
            'default_roles' => ['stock_controller'],
            'stock_access' => 'all',
            'venue_access' => 'all',
            'venue_Rule' => 'YES',
            'stock_rule' => 'FULL',
        ],
        'L3_STOCK_CTRL' => [
            'key' => 'L3_STOCK_CTRL',
            'code' => 'L3',
            'title' => 'Level 3 — Gate Controller & Operations',
            'short' => 'Gate Controller',
            'color' => '#d97706',
            'badge_bg' => 'rgba(217, 119, 6, 0.16)',
            'default_roles' => ['stock_controller'],
            'stock_access' => 'all',
            'venue_access' => 'all',
            'venue_Rule' => 'YES',
            'stock_rule' => 'FULL',
        ],
        'L4_ALL_ACCESS' => [
            'key' => 'L4_ALL_ACCESS',
            'code' => 'L4',
            'title' => 'Level 4 — Executive & All-Access',
            'short' => 'Executive & All-Access',
            'color' => '#dc2626',
            'badge_bg' => 'rgba(220, 38, 38, 0.15)',
            'default_roles' => ['admin', 'manager', 'stock_manager', 'tech_lead'],
            'stock_access' => 'all',
            'venue_access' => 'all',
            'venue_Rule' => 'ALL',
            'stock_rule' => 'ALL',
        ],
        'L4_EXEC_ALL' => [
            'key' => 'L4_EXEC_ALL',
            'code' => 'L4',
            'title' => 'Level 4 — Executive & All-Access',
            'short' => 'Executive & All-Access',
            'color' => '#dc2626',
            'badge_bg' => 'rgba(220, 38, 38, 0.15)',
            'default_roles' => ['admin', 'manager', 'stock_manager', 'tech_lead'],
            'stock_access' => 'all',
            'venue_access' => 'all',
            'venue_Rule' => 'ALL',
            'stock_rule' => 'ALL',
        ],
    ];
}

function ensureAbilitySchemaAndSeed(PDO $pdo, bool $forceReset = false): void
{
    // 1. Ensure `users` table exists (if running in standalone `attendance_app` DB)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `users` (
            `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `email` VARCHAR(100) NOT NULL UNIQUE,
            `password_hash` VARCHAR(255) DEFAULT NULL,
            `full_name` VARCHAR(100) DEFAULT NULL,
            `password` VARCHAR(255) NOT NULL DEFAULT '',
            `department` VARCHAR(50) DEFAULT NULL,
            `phone` VARCHAR(20) DEFAULT NULL,
            `bio` TEXT DEFAULT NULL,
            `profile_image` VARCHAR(500) DEFAULT NULL,
            `signature_image` VARCHAR(500) DEFAULT NULL,
            `hire_date` DATE DEFAULT NULL,
            `address` TEXT DEFAULT NULL,
            `role` VARCHAR(50) DEFAULT 'user',
            `is_active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `last_login` DATETIME DEFAULT NULL,
            `last_login_ip` VARCHAR(45) DEFAULT NULL,
            `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
            `assigned_checkpoint_type` VARCHAR(30) DEFAULT NULL,
            `assigned_checkpoint_id` VARCHAR(64) DEFAULT NULL,
            `assignment_expires_at` DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // Ensure `password_hash` column exists if table already existed without it
    try {
        $hasPasswordCol = false;
        $colStmt = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'");
        if ($colStmt && $colStmt->fetch()) {
            $hasPasswordCol = true;
        }
        if (!$hasPasswordCol) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) DEFAULT NULL AFTER `email`");
        }
    } catch (Throwable $e) {
    }

    // Backfill `password_hash` from legacy `password` column ONLY when `password_hash` is missing
    try {
        $pdo->exec("UPDATE `users` SET `password_hash` = `password` WHERE (`password_hash` IS NULL OR `password_hash` = '') AND `password` IS NOT NULL AND `password` != ''");
    } catch (Throwable $e) {
    }

    // 2. Ensure `user_badges` table exists
    $pdo->exec("
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
    ");

    // 3. Ensure `stock_locations` table exists
    $pdo->exec("
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
    ");

    // 4. Ensure `events` table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `events` (
            `id` VARCHAR(64) PRIMARY KEY,
            `title` VARCHAR(160) NOT NULL,
            `location` VARCHAR(160) DEFAULT 'Kigali Convention Centre',
            `date` DATE DEFAULT NULL,
            `call_time` VARCHAR(32) DEFAULT '08:00',
            `project_manager` VARCHAR(120) DEFAULT 'Operations PM',
            `tech_lead` VARCHAR(120) DEFAULT 'Tech Lead',
            `assigned_technician` TEXT DEFAULT NULL,
            `terminal_pin` VARCHAR(20) DEFAULT '1234',
            `image` VARCHAR(500) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `assigned_technician` TEXT DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `terminal_pin` VARCHAR(20) DEFAULT '1234'");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `image` VARCHAR(500) DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("UPDATE `events` SET `terminal_pin` = '1234' WHERE `terminal_pin` IS NULL OR `terminal_pin` = ''");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `assigned_checkpoint_type` VARCHAR(30) DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `assigned_checkpoint_id` VARCHAR(64) DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `assignment_expires_at` DATETIME DEFAULT NULL");
    } catch (Throwable $e) {}

    // 4b. Ensure `controller_shift_requests` table exists for on-demand relief & shift swap approvals
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `controller_shift_requests` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `checkpoint_type` VARCHAR(30) NOT NULL DEFAULT 'stock_warehouse',
            `checkpoint_id` VARCHAR(64) NOT NULL,
            `checkpoint_name` VARCHAR(160) NOT NULL,
            `requested_by_id` INT NOT NULL,
            `outgoing_controller_id` INT DEFAULT NULL,
            `replacement_controller_id` INT NOT NULL,
            `reason_type` VARCHAR(40) NOT NULL DEFAULT 'shift_swap',
            `notes` TEXT DEFAULT NULL,
            `shift_start` DATETIME DEFAULT NULL,
            `shift_end` DATETIME DEFAULT NULL,
            `status` VARCHAR(24) NOT NULL DEFAULT 'pending',
            `reviewed_by_id` INT DEFAULT NULL,
            `reviewed_at` DATETIME DEFAULT NULL,
            `review_notes` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 5. Ensure `attendance_logs` table exists
    $pdo->exec("
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
            `punctuality_status` VARCHAR(50) NOT NULL DEFAULT 'on_time',
            `scanned_by` INT DEFAULT 1,
            `override_by` INT DEFAULT NULL,
            `override_reason` VARCHAR(255) DEFAULT NULL,
            `notes` VARCHAR(255) DEFAULT NULL,
            `scanned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    try {
        $cols = $pdo->query("SHOW COLUMNS FROM `attendance_logs`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('override_by', $cols, true)) {
            $pdo->exec("ALTER TABLE `attendance_logs` ADD COLUMN `override_by` INT NULL AFTER `scanned_by`");
        }
        if (!in_array('override_reason', $cols, true)) {
            $pdo->exec("ALTER TABLE `attendance_logs` ADD COLUMN `override_reason` VARCHAR(255) NULL AFTER `override_by`");
        }
        $pdo->exec("ALTER TABLE `attendance_logs` MODIFY COLUMN `punctuality_status` VARCHAR(50) NOT NULL DEFAULT 'on_time'");
    } catch (Throwable $e) {}

    // 6. Ensure `access_clearance_levels` table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `access_clearance_levels` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `level_key` VARCHAR(64) NOT NULL UNIQUE,
            `code` VARCHAR(16) NOT NULL,
            `title` VARCHAR(255) NOT NULL,
            `short_name` VARCHAR(100) DEFAULT NULL,
            `color` VARCHAR(32) DEFAULT '#4f46e5',
            `bg` VARCHAR(64) DEFAULT '#f8fafc',
            `border` VARCHAR(64) DEFAULT '#e2e8f0',
            `badge_bg` VARCHAR(255) DEFAULT 'rgba(79, 70, 229, 0.15)',
            `icon` VARCHAR(64) DEFAULT 'fa-shield-halved',
            `description` TEXT DEFAULT NULL,
            `default_stock_access` VARCHAR(32) DEFAULT 'all',
            `default_venue_access` VARCHAR(32) DEFAULT 'all',
            `venue_rule` VARCHAR(50) DEFAULT 'YES',
            `stock_rule` VARCHAR(50) DEFAULT 'NO',
            `sort_order` INT DEFAULT 0,
            `is_system` TINYINT(1) DEFAULT 0,
            `is_active` TINYINT(1) DEFAULT 1,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    try { $pdo->exec("ALTER TABLE `access_clearance_levels` ADD COLUMN `venue_rule` VARCHAR(50) DEFAULT 'YES'"); } catch (Throwable $e) {}
    try { $pdo->exec("ALTER TABLE `access_clearance_levels` ADD COLUMN `stock_rule` VARCHAR(50) DEFAULT 'NO'"); } catch (Throwable $e) {}
    try { $pdo->exec("ALTER TABLE `access_clearance_levels` ADD COLUMN `is_system` TINYINT(1) DEFAULT 0"); } catch (Throwable $e) {}

    // 8b. Ensure `user_notification_reads` table exists for persistent topbar alert read state
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `user_notification_reads` (
            `user_id` INT NOT NULL,
            `notif_id` VARCHAR(160) NOT NULL,
            `read_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`user_id`, `notif_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 8c. Ensure `security_rate_limits` table exists for login & terminal PIN brute-force protection
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `security_rate_limits` (
            `rate_key` VARCHAR(160) PRIMARY KEY,
            `attempts` INT NOT NULL DEFAULT 0,
            `first_attempt_at` DATETIME NOT NULL,
            `blocked_until` DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 8d. Add composite/lookup indexes for scale on attendance_logs & user_badges
    $ensureIndex = static function (string $table, string $indexName, string $colsSql) use ($pdo): void {
        try {
            $chk = $pdo->prepare("SHOW INDEX FROM `{$table}` WHERE Key_name = ?");
            $chk->execute([$indexName]);
            if (!$chk->fetch()) {
                $pdo->exec("ALTER TABLE `{$table}` ADD INDEX `{$indexName}` ({$colsSql})");
            }
        } catch (Throwable $e) {}
    };
    $ensureIndex('attendance_logs', 'idx_att_scanned_cp', '`scanned_at`, `checkpoint_type`, `checkpoint_id`');
    $ensureIndex('attendance_logs', 'idx_att_user_scanned', '`user_id`, `scanned_at`');
    $ensureIndex('user_badges', 'idx_badge_code', '`badge_code`');

    // Seed default access_clearance_levels if empty
    $clrCount = (int) $pdo->query("SELECT COUNT(*) FROM `access_clearance_levels`")->fetchColumn();
    if ($clrCount === 0) {
        $pdo->exec("
            INSERT INTO `access_clearance_levels`
              (`level_key`, `code`, `title`, `short_name`, `color`, `bg`, `border`, `badge_bg`, `icon`, `description`, `default_stock_access`, `default_venue_access`, `venue_rule`, `stock_rule`, `sort_order`, `is_system`, `is_active`)
            VALUES
              ('L1_VENUE_BASIC', 'L1', 'Level 1 — Event Venue Crew', 'Event Venue Crew', '#16a34a', '#f8fafc', '#e2e8f0', 'rgba(22, 163, 74, 0.14)', 'fa-location-dot', 'Standard crew access restricted strictly to assigned Event Venues during scheduled calltimes.', 'none', 'assigned_or_all', 'YES', 'NO', 1, 1, 1),
              ('L2_TECH_STAGE', 'L2', 'Level 2 — Technical & Stage', 'Technical & Stage', '#2563eb', '#f8fafc', '#e2e8f0', 'rgba(37, 99, 235, 0.14)', 'fa-sliders', 'Access to Technical Stage areas, FOH/Backstage at assigned Event Venues, and designated Facility Gates.', 'assigned_or_all', 'assigned_or_all', 'YES', 'YES', 2, 1, 1),
              ('L3_STOCK_WAREHOUSE', 'L3', 'Level 3 — Gate Controller & Operations', 'Gate Controller', '#d97706', '#f8fafc', '#e2e8f0', 'rgba(217, 119, 6, 0.16)', 'fa-warehouse', 'Full access to authorized Facility Checkpoints, Gate Terminals, and Assigned Event Venues.', 'all', 'all', 'YES', 'FULL', 3, 1, 1),
              ('L4_ALL_ACCESS', 'L4', 'Level 4 — Executive & All-Access', 'Executive & All-Access', '#dc2626', '#fef2f2', '#fecaca', 'rgba(220, 38, 38, 0.15)', 'fa-shield-halved', 'Unrestricted 24/7 entry to all Facilities, Production Sites, Backstage Technical Zones, and Event Venues.', 'all', 'all', 'ALL', 'ALL', 4, 1, 1)
        ");
    }

    // Ensure `image` column exists on stock_locations if missing
    try {
        $pdo->exec("ALTER TABLE `stock_locations` ADD COLUMN `image` VARCHAR(500) DEFAULT NULL");
    } catch (Throwable $e) {}

    // Ensure `terminal_pin` and map coordinate columns exist on stock_locations & events
    foreach (['stock_locations', 'events'] as $geoTable) {
        try { $pdo->exec("ALTER TABLE `{$geoTable}` ADD COLUMN `lat` DECIMAL(10,6) DEFAULT NULL"); } catch (Throwable $e) {}
        try { $pdo->exec("ALTER TABLE `{$geoTable}` ADD COLUMN `lng` DECIMAL(10,6) DEFAULT NULL"); } catch (Throwable $e) {}
        try { $pdo->exec("ALTER TABLE `{$geoTable}` ADD COLUMN `map_x` DECIMAL(5,2) DEFAULT NULL"); } catch (Throwable $e) {}
        try { $pdo->exec("ALTER TABLE `{$geoTable}` ADD COLUMN `map_y` DECIMAL(5,2) DEFAULT NULL"); } catch (Throwable $e) {}
    }
    try {
        $pdo->exec("ALTER TABLE `stock_locations` ADD COLUMN `terminal_pin` VARCHAR(20) DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("UPDATE `stock_locations` SET `lat` = -1.9465, `lng` = 30.1585, `map_x` = 84.0, `map_y` = 20.0 WHERE `lat` IS NULL AND (`name` LIKE '%Ndera%' OR `code` = 'NDR-STK')");
        $pdo->exec("UPDATE `stock_locations` SET `lat` = -1.9516, `lng` = 30.1153, `map_x` = 74.0, `map_y` = 67.0 WHERE `lat` IS NULL AND (`name` LIKE '%BK Arena%' OR `code` = 'BKA-STK')");
        $pdo->exec("UPDATE `stock_locations` SET `lat` = -1.9547, `lng` = 30.0928, `map_x` = 42.5, `map_y` = 20.0 WHERE `lat` IS NULL AND (`name` LIKE '%KCC%' OR `name` LIKE '%Convention%' OR `code` = 'KCC-STK')");
        $pdo->exec("UPDATE `events` SET `lat` = -1.9546, `lng` = 30.0927, `map_x` = 48.0, `map_y` = 40.0 WHERE `lat` IS NULL AND (`title` LIKE '%KCC%' OR `location` LIKE '%Convention%')");
        $pdo->exec("UPDATE `events` SET `lat` = -1.9515, `lng` = 30.1151, `map_x` = 70.0, `map_y` = 44.0 WHERE `lat` IS NULL AND (`title` LIKE '%BK Arena%' OR `location` LIKE '%BK Arena%')");
        $pdo->exec("UPDATE `events` SET `lat` = -1.9332, `lng` = 30.2055, `map_x` = 87.0, `map_y` = 48.0 WHERE `lat` IS NULL AND (`title` LIKE '%Intare%' OR `location` LIKE '%Intare%')");
        $pdo->exec("UPDATE `events` SET `lat` = -1.9489, `lng` = 30.0628, `map_x` = 16.0, `map_y` = 66.0 WHERE `lat` IS NULL AND (`title` LIKE '%Marriott%' OR `location` LIKE '%Marriott%')");
    } catch (Throwable $e) {}

    // Seed stock_locations if empty
    $stockCount = (int) $pdo->query("SELECT COUNT(*) FROM `stock_locations`")->fetchColumn();
    if ($stockCount === 0 || $forceReset) {
        $pdo->exec("
            INSERT IGNORE INTO `stock_locations` (`id`, `name`, `code`, `location_code`, `location`, `open_time`, `close_time`, `is_active`, `terminal_pin`) VALUES
            (1, 'Ndera Warehouse', 'NDR-STK', 'NDR', 'Ndera Central Logistics Hub', '08:00:00', '18:00:00', 1, '247365'),
            (2, 'BK Arena Stock', 'BKA-STK', 'BKA', 'BK Arena Technical Vault', '08:00:00', '18:00:00', 1, '67890'),
            (3, 'KCC Stock', 'KCC-STK', 'KCC', 'Kigali Convention Centre Stock', '08:00:00', '18:00:00', 1, '12345')
        ");
    }

    // Backfill dedicated warehouse PINs when terminal_pin is unset
    try {
        $pdo->exec("UPDATE `stock_locations` SET `terminal_pin` = '247365' WHERE (`terminal_pin` IS NULL OR `terminal_pin` = '') AND (`code` = 'NDR-STK' OR `location_code` = 'NDR' OR `name` LIKE '%Ndera%')");
        $pdo->exec("UPDATE `stock_locations` SET `terminal_pin` = '67890' WHERE (`terminal_pin` IS NULL OR `terminal_pin` = '') AND (`code` = 'BKA-STK' OR `location_code` = 'BKA' OR `name` LIKE '%BK Arena%')");
        $pdo->exec("UPDATE `stock_locations` SET `terminal_pin` = '12345' WHERE (`terminal_pin` IS NULL OR `terminal_pin` = '') AND (`code` = 'KCC-STK' OR `location_code` = 'KCC' OR `name` LIKE '%KCC%' OR `name` LIKE '%Kigali Convention%')");
        $pdo->exec("UPDATE `stock_locations` SET `terminal_pin` = '1234' WHERE `terminal_pin` IS NULL OR `terminal_pin` = ''");
    } catch (Throwable $e) {}

    // Seed events if empty
    $eventCount = (int) $pdo->query("SELECT COUNT(*) FROM `events`")->fetchColumn();
    if ($eventCount === 0 || $forceReset) {
        $today = date('Y-m-d');
        $stmtEv = $pdo->prepare("
            INSERT IGNORE INTO `events` (`id`, `title`, `location`, `date`, `call_time`, `project_manager`, `tech_lead`, `assigned_technician`) VALUES
            ('1001', 'World Bank Summit — KCC', 'Kigali Convention Centre', ?, '08:00', 'Uwineza Gisele', 'Musirikare Leonce', '[6, 8, 9, 11]'),
            ('1002', 'Move Afrika Tour — BK Arena', 'BK Arena Main Stage', ?, '08:30', 'Diane Iradukunda', 'Hirwa Jean de Dieu', '[6, 12, 15]'),
            ('1003', 'African Leadership Forum', 'Intare Conference Arena', ?, '09:00', 'Uwineza Gisele', 'Musirikare Leonce', '[9, 11]'),
            ('1004', 'Gala Dinner — Marriott Hotel', 'Kigali Marriott Hotel', ?, '10:00', 'Diane Iradukunda', 'Hirwa Jean de Dieu', '[8, 19]')
        ");
        $stmtEv->execute([$today, $today, $today, $today]);
    }

    // Seed `users` ONLY when completely empty (never inject/overwrite existing `ability_db.users`)
    seedUsersTableIfEmpty($pdo);

    // Ensure every user has a `user_badges` row with `REW-BADGE-XXXX` format if missing
    $users = $pdo->query("SELECT `id`, `username`, `full_name`, `role`, `is_active` FROM `users` ORDER BY `id` ASC")->fetchAll();
    $stockIds = $pdo->query("SELECT `id` FROM `stock_locations` WHERE `is_active` = 1 ORDER BY `id` ASC")->fetchAll(PDO::FETCH_COLUMN);
    $stockIdsInt = array_map('intval', $stockIds ?: [1, 2, 3]);

    $badgeCheckStmt = $pdo->prepare("SELECT `id` FROM `user_badges` WHERE `user_id` = ?");
    $badgeInsStmt = $pdo->prepare("
        INSERT IGNORE INTO `user_badges`
          (`user_id`, `badge_code`, `rfid_uid`, `clearance_level`, `stock_access_mode`, `allowed_stock_ids`, `venue_access_mode`, `allowed_event_ids`, `badge_status`, `issued_at`, `expires_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($users as $u) {
        $uid = (int) $u['id'];
        $badgeCheckStmt->execute([$uid]);
        if ($badgeCheckStmt->fetchColumn()) {
            continue;
        }
        $role = strtolower(trim((string) ($u['role'] ?? 'user')));
        $badgeCode = 'REW-BADGE-' . str_pad((string) $uid, 4, '0', STR_PAD_LEFT);
        $rfid = 'RFID-88' . str_pad((string) $uid, 2, '0', STR_PAD_LEFT);

        if (in_array($role, ['admin', 'manager', 'project_manager', 'stock_manager', 'tech_lead'], true)) {
            $lvl = 'L4_ALL_ACCESS';
            $sMode = 'all';
            $vMode = 'all';
        } elseif ($role === 'stock_controller') {
            $lvl = 'L3_STOCK_WAREHOUSE';
            $sMode = 'all';
            $vMode = 'all';
        } elseif ($role === 'technician') {
            $lvl = 'L2_TECH_STAGE';
            $sMode = 'all';
            $vMode = 'all';
        } else {
            $lvl = 'L1_VENUE_BASIC';
            $sMode = 'none';
            $vMode = 'all';
        }

        $status = ((int) ($u['is_active'] ?? 1) === 1) ? 'active' : 'suspended';
        $badgeInsStmt->execute([
            $uid,
            $badgeCode,
            $rfid,
            $lvl,
            $sMode,
            json_encode($stockIdsInt),
            $vMode,
            json_encode([1001, 1002, 1003, 1004]),
            $status,
            date('Y-01-01'),
            date('Y-12-31', strtotime('+1 year')),
        ]);
    }

    if ($forceReset) {
        try {
            $pdo->exec("TRUNCATE TABLE `attendance_logs`");
        } catch (Throwable $e) {
            $pdo->exec("DELETE FROM `attendance_logs`");
        }
    }
    // Attendance logs are never auto-seeded on connection so resets persist permanently.
}

function seedSampleAttendanceLogs(PDO $pdo, array $users = []): void
{
    if (empty($users)) {
        $users = $pdo->query("SELECT `id`, `username`, `full_name`, `role`, `is_active` FROM `users` ORDER BY `id` ASC")->fetchAll();
    }
    if (empty($users)) {
        return;
    }

    $stocks = $pdo->query("SELECT `id`, `name` FROM `stock_locations` ORDER BY `id` ASC")->fetchAll();
    $firstStockId = (int) ($stocks[0]['id'] ?? 1);
    $firstStockName = (string) ($stocks[0]['name'] ?? 'Ndera Warehouse');

    $evts = $pdo->query("SELECT `id`, `title`, `location` FROM `events` ORDER BY `id` ASC LIMIT 4")->fetchAll();
    $firstVenueId = isset($evts[0]['id']) && is_numeric($evts[0]['id']) ? (int) $evts[0]['id'] : 1001;
    $firstVenueName = !empty($evts[0]['title']) ? $evts[0]['title'] : 'Kigali Convention Centre';

    $todayStr = date('Y-m-d');
    $logIns = $pdo->prepare("
        INSERT INTO `attendance_logs`
          (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `notes`, `scanned_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ");

    $seedScans = [
        [0, 'event_venue', $firstVenueId, $firstVenueName, 'check_in', 'granted', null, 'early', 'Executive inspection arrival', $todayStr . ' 07:45:12'],
        [1, 'stock_warehouse', $firstStockId, $firstStockName, 'check_in', 'granted', null, 'on_time', 'Stock controller shift open', $todayStr . ' 07:52:08'],
        [5, 'stock_warehouse', $firstStockId, $firstStockName, 'check_in', 'granted', null, 'on_time', 'Morning shift check-in & batch load at Ndera Warehouse', $todayStr . ' 08:14:22'],
        [2, 'event_venue', $firstVenueId, $firstVenueName, 'check_in', 'granted', null, 'on_time', 'Audio FOH setup call-time', $todayStr . ' 08:02:40'],
        [4, 'event_venue', $firstVenueId, $firstVenueName, 'check_in', 'granted', null, 'late', 'Video LED wall crew check-in', $todayStr . ' 08:27:19'],
        [5, 'stock_warehouse', $firstStockId, $firstStockName, 'check_out', 'granted', null, 'on_time', 'Transit departure → Transferred to ' . $firstVenueName, $todayStr . ' 11:30:15'],
        [3, 'stock_warehouse', $firstStockId, $firstStockName, 'access_verify', 'denied', 'Level 1 (Venue Crew) is not authorized for Stock Warehouses', 'n/a', 'Attempted entry at Ndera Warehouse gate', $todayStr . ' 08:41:05'],
        [2, 'event_venue', $firstVenueId, $firstVenueName, 'check_out', 'granted', null, 'on_time', 'Soundcheck wrap check-out', $todayStr . ' 12:18:44'],
        [5, 'event_venue', $firstVenueId, $firstVenueName, 'check_in', 'granted', null, 'on_time', 'Arrived on site from ' . $firstStockName, $todayStr . ' 12:45:00'],
    ];

    foreach ($seedScans as $s) {
        $uRow = $users[$s[0]] ?? $users[0];
        $uId = (int) $uRow['id'];
        $bStmt = $pdo->prepare("SELECT `badge_code` FROM `user_badges` WHERE `user_id` = ?");
        $bStmt->execute([$uId]);
        $bCode = (string) ($bStmt->fetchColumn() ?: ('REW-BADGE-' . str_pad((string) $uId, 4, '0', STR_PAD_LEFT)));

        $logIns->execute([
            $uId,
            $bCode,
            $s[1],
            $s[2],
            $s[3],
            $s[4],
            $s[5],
            $s[6],
            $s[7],
            $s[8],
            $s[9],
        ]);
    }
}

function seedUsersTableIfEmpty(PDO $pdo): void
{
    try {
        $existingCount = (int) $pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
        if ($existingCount > 0) {
            return;
        }
    } catch (Throwable $e) {
        return;
    }

    $seedRows = [
        [1, 'sys_admin', 'admin@ability.com', '$2y$10$r00fY4ABmJUGORsi6Mwf8OzMbvRBfLpJC0V3N1BGrfvfWHcv88XVq', 'System Administrator', '$2y$10$sB9Nb6XRK/r7y4GAh35IOeyQ0zUu84/zeFbydtrjZ3QKhFtIweT/6', 'Production', '+250 788 100 001', null, null, null, 'admin', 1, '2026-01-01 16:53:20', '2026-11-11 21:30:36', null, null, 0, null, null, null],
        [2, 'kayonga', 'kayonga70@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'kayonga', '$2y$10$sB9Nb6XRK/r7y4GAh35IOeyQ0zUu84/zeFbydtrjZ3QKhFtIweT/6', 'Video', 'kayonga', '', 'uploads/profiles/profile_2_1789409080.png', 'uploads/signatures/signature_2_1789408133.png', 'admin', 1, '2026-01-01 16:59:20', '2026-11-16 13:32:09', '2026-11-14 08:45:18', '127.0.0.1', 0, null, null, null],
        [3, 'prince_lorenzo', 'princen@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Niyonase Prince', '$2y$10$DgrY/mVGXeIbIcieqyzYsec.023.cCZWqN9N/XaJ.IUk2X4Z1CL.a', 'Warehouse', '+250 788 100 003', '', 'uploads/profiles/profile_3_1789409415.png', 'uploads/signatures/signature_3_1789409611.png', 'stock_controller', 1, '2026-01-03 13:46:54', '2026-11-16 13:18:00', null, null, 0, null, null, '2026-11-17 10:42:00'],
        [6, 'patricn', 'patrickn26@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Patrick NYIRIMBIBI', '$2y$10$B4X5Y.QnlDxAW85iU9fwE.N8AX3fTYjQ.0nSTvKLn8tqinpq69/fm', 'Video', '+250 788 100 006', null, 'uploads/profiles/profile_6_1793873223_6ddd8c4c.jpeg', 'uploads/signatures/signature_6_1793790752_d50986b4.png', 'technician', 1, '2026-01-14 08:55:42', '2026-11-16 13:32:06', '2026-11-03 18:59:36', '::1', 0, null, null, null],
        [7, 'kayongar', 'kayonga80@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', '', '$2y$10$6SYlge82L3jA6kbjV/s44usjesF9P4KUSbdYG48d3h/.1tZsAITLm', 'video', '', null, null, null, 'user', 1, '2026-10-25 13:16:27', '2026-11-14 23:33:57', '2026-10-25 15:20:07', '127.0.0.1', 0, null, null, null],
        [8, 'bembelezav', 'bembelezav@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Bembeleza Valentin', '$2y$10$DuEXnW11SWexuVP85FHHGOvuK0/Z3qZKBnqxkVUVRdJlzm4i7l7Sa', 'Warehouse', '+250 787 162 517', null, 'uploads/profiles/profile_8_1793868947_5f097523.jpg', null, 'driver', 1, '2026-11-03 16:18:43', '2026-11-16 13:18:00', '2026-11-04 15:02:12', '127.0.0.1', 0, null, null, null],
        [9, 'erich', 'havugimanaeric53@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Eric Havugimana', '$2y$10$CCP4kxlsVzDOMp37PctPC.s7SVSdAVK7Xo9YawunVxw.LU2/tmp52', 'rigging', '+250784837781', null, 'uploads/profiles/profile_9_1793869160_b78508e4.jpeg', 'uploads/signatures/signature_1793796778_48bc893b.png', 'technician', 1, '2026-11-04 12:52:58', '2026-11-16 13:24:38', null, null, 0, null, null, null],
        [10, 'apomus', 'mushimiyimanaappolinaire@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Appolinaire Mushimiyimana', '$2y$10$xXXwXc9J67KRvdVJid5yDuUebpUjnoFC95i6bYVFxdQ3uHvcx1.rO', 'scurt', '+250784980475', null, 'uploads/profiles/profile_10_1793883172_ff7c8b3f.png', 'uploads/signatures/signature_1793802364_e163c412.png', 'decorator', 1, '2026-11-04 14:26:04', '2026-11-15 21:12:19', null, null, 0, null, null, null],
        [11, 'gakizas', 'gakizasolo@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Solomon Gakiza', '$2y$10$p1Qz6jDTVoOzLYaXrYHdquul7cBZPRaKhebv2qYtx8jaA.QT6M7SS', 'lighting', '+250790903406', null, 'uploads/profiles/profile_11_1793871684_1a79610f.jpeg', null, 'technician', 1, '2026-11-05 09:18:39', '2026-11-15 21:12:19', null, null, 0, null, null, null],
        [12, 'jadeni', 'imanishimwejadon3@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Imanishimwe Jean de Dieu', '$2y$10$kR3ibYNpNfBGObZVFWBdYOhfNS6xWhMPIP6OVCdE5hCcS5OETwvtW', 'electrical', '+250788657257', null, 'uploads/profiles/profile_1793870542_bef11986.png', null, 'technician', 1, '2026-11-05 09:22:22', '2026-11-15 21:12:19', null, null, 0, null, null, null],
        [14, 'uwinezag', 'uwinezag@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Uwineza Gisele', '$2y$10$JColF77u.h0wWXRbHFSYtOvk3JjOy.wcIraLFv89XzGB34VK7gUaC', 'Operations', '+250 788 624 126', null, null, null, 'project_manager', 1, '2026-11-05 09:50:49', '2026-11-09 15:22:16', null, null, 0, null, null, null],
        [15, 'lucasi', 'lucasi@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Lucas Ishimwe', '$2y$10$I5DUp.G.1ceJBk7ZYk9k2eW3Ug5dy5zoALi2CHfK1vkmKJ8hX0L42', 'video', '+250 786 014 722', null, 'uploads/profiles/profile_1793872457_043b4c5c.jpeg', null, 'technician', 1, '2026-11-05 09:54:17', '2026-11-15 21:12:19', null, null, 0, null, null, null],
        [17, 'loencem', 'leomusirikare@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Musirikare Leonce', '$2y$10$ZjE3Xt/CJY0Mt0XX5rYbQOCmri3wkQpTNx3G8UbOALPkK0MgSl7Dy', 'Video', '+250 725 403 445', null, 'uploads/profiles/profile_1793875485_2b7cf840.jpg', null, 'tech_lead', 1, '2026-11-05 10:44:45', '2026-11-15 19:11:37', null, null, 0, null, null, null],
        [18, 'enockniyokwizera', 'enockniyokwizera68@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Enock Niyokwizera', '$2y$10$4yIWjtE/zZXzWdEIPiwvieNrpQitV7heje4egRslwsqdIAwJaREMW', 'Warehouse', '+250 791 747 844', null, 'uploads/profiles/profile_18_1793875874_20fa6a0c.jpeg', null, 'support_staff', 1, '2026-11-05 10:48:35', '2026-11-09 15:17:52', null, null, 0, null, null, null],
        [19, 'mugaboh', 'hubertmugabo@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Mugabo Hubert', '$2y$10$kB4VN2/G4TzlT093GXySwOCULZL6LHbdRAt3rhe1C6wUkbQ28.0Bm', 'int', '+250788746250', null, 'uploads/profiles/profile_19_1793999575_eced9ff2.jpeg', null, 'technician', 1, '2026-11-06 14:16:26', '2026-11-09 09:03:02', null, null, 0, null, null, null],
        [20, 'schadracki', 'schadrracknikiyiza@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Schadrack Niyikiza', '$2y$10$ehNyG40Lvtr4CYvTJho1TeVI08gnxxNdJUIiyosS6ffeKwdfjx85K', 'Warehouse', '+250 738 888 806', null, 'uploads/profiles/profile_1794058783_baab1041.jpeg', null, 'stock_manager', 1, '2026-11-07 13:39:43', '2026-11-14 10:02:06', '2026-11-07 15:50:30', '127.0.0.1', 0, null, null, null],
        [21, 'rwagacyara', 'rwagacyaryan@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Rwagacya Ryan', '$2y$10$UhNiGt6GoCf1GnNOK9/RhOg0w8rNioS4yHiorXR1DpP4fjMdlppHy', 'video', '+250 786 897 752', null, null, null, 'technician', 1, '2026-11-07 13:54:27', '2026-11-16 13:18:00', '2026-11-08 21:33:38', '127.0.0.1', 0, null, null, null],
        [22, 'jeandd', 'hirwaj10@gmail.com', '$2y$10$HRUrHfEl/mwI1CAJO/BSrebSl7g4FJlmPJ6elyKxSQ3Nn1yauy/zi', 'Hirwa Jean de Dieu', '', 'Video', '+250 781 260 613', null, 'uploads/profiles/profile_1794214613_ef6fe670.jpeg', null, 'tech_lead', 1, '2026-11-09 08:56:53', '2026-11-09 09:03:02', null, null, 0, null, null, null],
        [24, 'rrwibutso', 'rwibutsorobert134@gmail.com', '$2y$10$BedCCH3AQWM14yc3tKV24eyOQYSjI41tiYR1sdXYbWdm6q1NyIWf.', 'Robert Rwibutso', '', 'Warehouse', '+250783031227', null, 'uploads/profiles/profile_1794221574_71e68c25.jpeg', null, 'technician', 1, '2026-11-09 10:48:39', '2026-11-09 10:52:54', null, null, 0, null, null, null],
        [25, 'ayishakiyef', 'faustinayi@gmail.com', '$2y$10$rsR2LTmBJ9lwmPpEW9fnoehueD1i1M1YJtzmm5LeMsK2F6cTxnq2W', 'Faustin Ayishakiye', '', 'Warehouse', '+250785638202', null, 'uploads/profiles/profile_1794232103_345eb416.jpeg', null, 'support_staff', 1, '2026-11-09 13:48:23', '2026-11-09 13:48:23', null, null, 0, null, null, null],
        [26, 'ahirwa', '', '$2y$10$l9mz/VksOnCCkdW6Ybgplel7aqu1RARDM7uvb56yaQJuOtH7xWU5K', 'Hirwa Aubin', '', 'Audio', '', null, null, null, 'technician', 1, '2026-11-09 21:13:19', '2026-11-15 18:03:43', null, null, 0, null, null, null],
        [27, 'jmugisha', 'mugishajames100@gmail.com', '$2y$10$qvXaryC25aIQj95tKIVqGuifZxpu4q2QdRtoGuDwOZlfmpqDtyx7u', 'James Mugisha', '', 'Video', '+250788982366', null, 'uploads/profiles/profile_1794297499_f7467c6f.jpeg', null, 'technician', 1, '2026-11-10 07:58:19', '2026-11-10 07:58:20', null, null, 0, null, null, null],
        [34, 'dianei', 'diane.iradukunda@rwandaevents.com', '$2y$10$Bm9.ywfYV8H1YYRdw1ovcuogRIxfkhpWPs/YYQatIvQ2Dt4tQ0bXi', 'Diane Iradukunda', '', 'Executive', '+250 786 234 061', null, null, null, 'project_manager', 1, '2026-11-10 17:56:21', '2026-11-10 17:56:21', null, null, 0, null, null, null],
        [38, 'eric', 'eric@ability.rw', '$2y$10$HPpYyR.bUhXhpqx1hSe4GuPVPqAf3mNF0m99j4Ky3ypdn3vmh2QWi', 'Eric Havugimana', '', 'Rigging', '+250 788 100 006', null, null, null, 'technician', 1, '2026-11-11 10:11:26', '2026-11-11 10:11:26', null, null, 0, null, null, null],
        [53, '_verify_admin_6897', '_verify_admin_6897@local.test', '$2y$10$4amAG30uKeVuoUSC.i9seuEsHT/yxEz5EXBa1bDUR10J6FIw7Dsuu', 'Verify Bot', '', 'IT', '0780000000', null, null, null, 'admin', 1, '2026-11-15 21:40:41', '2026-11-15 21:40:41', null, null, 0, null, null, null],
    ];

    try {
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO `users`
              (`id`, `username`, `email`, `password_hash`, `full_name`, `password`, `department`, `phone`, `bio`, `profile_image`, `signature_image`, `role`, `is_active`, `created_at`, `updated_at`, `last_login`, `last_login_ip`, `must_change_password`, `assigned_checkpoint_type`, `assigned_checkpoint_id`, `assignment_expires_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($seedRows as $row) {
            $stmt->execute($row);
        }
    } catch (Throwable $e) {}
}

function resolveWarehouseTerminalPin(array $row): string
{
    return trim((string) ($row['terminal_pin'] ?? ''));
}

function resolveStandaloneFacilityGate(PDO $pdo, string $siteKey = '', int $whId = 0): ?array
{
    $norm = strtolower(trim($siteKey));
    if ($whId > 0) {
        $st = $pdo->prepare("SELECT * FROM `stock_locations` WHERE `id` = ? AND `is_active` = 1 LIMIT 1");
        $st->execute([$whId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }
    }

    if ($norm === 'ndera' || $norm === 'ndera-warehouse' || $norm === 'ndr') {
        $st = $pdo->query("SELECT * FROM `stock_locations` WHERE `is_active` = 1 AND (UPPER(`code`) = 'NDR-STK' OR UPPER(`location_code`) = 'NDR' OR LOWER(`name`) LIKE '%ndera%') ORDER BY `id` ASC LIMIT 1");
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row;
    } elseif ($norm === 'bk-arena' || $norm === 'bk_arena' || $norm === 'bkarena' || $norm === 'bka') {
        $st = $pdo->query("SELECT * FROM `stock_locations` WHERE `is_active` = 1 AND (UPPER(`code`) = 'BKA-STK' OR UPPER(`location_code`) = 'BKA' OR LOWER(`name`) LIKE '%bk arena%') ORDER BY `id` ASC LIMIT 1");
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row;
    } elseif ($norm === 'kcc' || $norm === 'kigali-convention-centre' || $norm === 'kcc-gate') {
        $st = $pdo->query("SELECT * FROM `stock_locations` WHERE `is_active` = 1 AND (UPPER(`code`) = 'KCC-STK' OR UPPER(`location_code`) = 'KCC' OR LOWER(`name`) LIKE '%kcc%' OR LOWER(`name`) LIKE '%convention%') ORDER BY `id` ASC LIMIT 1");
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row;
    }

    if ($norm !== '') {
        try {
            $pst = $pdo->prepare("SELECT `wh_id` FROM `standalone_portals` WHERE LOWER(`portal_key`) = ? AND `wh_id` IS NOT NULL LIMIT 1");
            $pst->execute([$norm]);
            $mappedWhId = (int) ($pst->fetchColumn() ?: 0);
            if ($mappedWhId > 0) {
                $wst = $pdo->prepare("SELECT * FROM `stock_locations` WHERE `id` = ? AND `is_active` = 1 LIMIT 1");
                $wst->execute([$mappedWhId]);
                $wrow = $wst->fetch(PDO::FETCH_ASSOC);
                if ($wrow) return $wrow;
            }
        } catch (Throwable $e) {}
    }

    return null;
}

function isStandaloneGateAuthorized(PDO $pdo, array $whRow): bool
{
    $wid = (int) ($whRow['id'] ?? 0);
    if ($wid <= 0) {
        return false;
    }
    $expectedPin = resolveWarehouseTerminalPin($whRow);
    if ($expectedPin === '') {
        return false;
    }
    $map = $_SESSION['standalone_gate_auth'] ?? [];
    if (!is_array($map) || empty($map[$wid])) {
        return false;
    }
    return hash_equals(sha1($expectedPin), (string) $map[$wid]);
}

function resolvePortalBackgroundUrl(?string $rawPath): ?string
{
    $rel = ltrim(str_replace('\\', '/', trim((string) $rawPath)), '/');
    if ($rel === '' || strpos($rel, '..') !== false) {
        return null;
    }
    $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    return is_file($abs) ? $rel : null;
}

function ensureStandalonePortalsTable(PDO $pdo): void
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `standalone_portals` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `portal_key` VARCHAR(64) NOT NULL UNIQUE,
                `portal_type` VARCHAR(32) NOT NULL DEFAULT 'facility_gate',
                `title` VARCHAR(140) NOT NULL,
                `subtitle` VARCHAR(255) DEFAULT NULL,
                `entry_url` VARCHAR(255) NOT NULL,
                `wh_id` INT DEFAULT NULL,
                `background_image` VARCHAR(255) DEFAULT NULL,
                `overlay_opacity` DECIMAL(3,2) NOT NULL DEFAULT 0.78,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_system` TINYINT(1) NOT NULL DEFAULT 1,
                `sort_order` INT NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $nderaRow = resolveStandaloneFacilityGate($pdo, 'ndera');
        $bkRow = resolveStandaloneFacilityGate($pdo, 'bk-arena');
        $kccRow = resolveStandaloneFacilityGate($pdo, 'kcc');

        $ins = $pdo->prepare("
            INSERT IGNORE INTO `standalone_portals`
            (`portal_key`, `portal_type`, `title`, `subtitle`, `entry_url`, `wh_id`, `background_image`, `overlay_opacity`, `is_active`, `is_system`, `sort_order`)
            VALUES (?, ?, ?, ?, ?, ?, NULL, 0.78, 1, 1, ?)
        ");
        $defaults = [
            ['ndera', 'facility_gate', 'Ndera Warehouse Gate', 'Rwanda Events Gate Terminal · # Ndera Warehouse Gate', 'ndera-gate.php', $nderaRow ? (int) $nderaRow['id'] : null, 1],
            ['bk-arena', 'facility_gate', 'BK Arena Gate', 'Rwanda Events Gate Terminal · # BK Arena Gate', 'bk-arena-gate.php', $bkRow ? (int) $bkRow['id'] : null, 2],
            ['kcc', 'facility_gate', 'KCC Gate', 'Rwanda Events Gate Terminal · # KCC Gate', 'kcc-gate.php', $kccRow ? (int) $kccRow['id'] : null, 3],
            ['onsite', 'onsite_portal', 'Live On-Site Crew Portal', 'Read-Only Live On-Site Directory · Stock Managers, Gate Controllers & Technicians', 'onsite.php', null, 4],
        ];
        foreach ($defaults as $row) {
            $ins->execute($row);
        }
    } catch (Throwable $e) {}
}

function getStandalonePortalsList(PDO $pdo, bool $includePin = false): array
{
    ensureStandalonePortalsTable($pdo);
    $rows = [];
    try {
        $sql = "
            SELECT p.*, s.`name` AS `wh_name`, s.`code` AS `wh_code`, s.`location` AS `wh_location`,
                   s.`open_time` AS `wh_open_time`, s.`close_time` AS `wh_close_time`, s.`terminal_pin` AS `wh_terminal_pin`
            FROM `standalone_portals` p
            LEFT JOIN `stock_locations` s ON s.`id` = p.`wh_id`
            ORDER BY p.`sort_order` ASC, p.`id` ASC
        ";
        foreach ($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $bgUrl = resolvePortalBackgroundUrl($r['background_image'] ?? null);
            $item = [
                'id' => (int) $r['id'],
                'portal_key' => (string) $r['portal_key'],
                'portal_type' => (string) ($r['portal_type'] ?? 'facility_gate'),
                'title' => (string) ($r['title'] ?? ''),
                'subtitle' => (string) ($r['subtitle'] ?? ''),
                'entry_url' => (string) ($r['entry_url'] ?? ''),
                'wh_id' => $r['wh_id'] !== null ? (int) $r['wh_id'] : null,
                'wh_name' => (string) ($r['wh_name'] ?? ''),
                'wh_code' => (string) ($r['wh_code'] ?? ''),
                'wh_location' => (string) ($r['wh_location'] ?? ''),
                'wh_open_time' => $r['wh_open_time'] ? substr((string) $r['wh_open_time'], 0, 5) : '08:00',
                'wh_close_time' => $r['wh_close_time'] ? substr((string) $r['wh_close_time'], 0, 5) : '18:00',
                'has_pin' => trim((string) ($r['wh_terminal_pin'] ?? '')) !== '',
                'background_image' => $bgUrl,
                'overlay_opacity' => (float) ($r['overlay_opacity'] ?? 0.78),
                'is_active' => (int) ($r['is_active'] ?? 1),
                'is_system' => (int) ($r['is_system'] ?? 0),
                'sort_order' => (int) ($r['sort_order'] ?? 1),
            ];
            if ($includePin && $item['wh_id'] !== null) {
                $item['terminal_pin'] = (string) ($r['wh_terminal_pin'] ?? '');
            }
            $rows[] = $item;
        }
    } catch (Throwable $e) {}
    return $rows;
}

function resolveStandalonePortalConfig(PDO $pdo, string $portalKey = '', int $whId = 0): ?array
{
    ensureStandalonePortalsTable($pdo);
    $key = strtolower(trim($portalKey));
    try {
        if ($key !== '') {
            $st = $pdo->prepare("SELECT * FROM `standalone_portals` WHERE LOWER(`portal_key`) = ? LIMIT 1");
            $st->execute([$key]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $row['background_image_url'] = resolvePortalBackgroundUrl($row['background_image'] ?? null);
                return $row;
            }
        }
        if ($whId > 0) {
            $st = $pdo->prepare("SELECT * FROM `standalone_portals` WHERE `wh_id` = ? ORDER BY `is_system` DESC, `id` ASC LIMIT 1");
            $st->execute([$whId]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $row['background_image_url'] = resolvePortalBackgroundUrl($row['background_image'] ?? null);
                return $row;
            }
        }
    } catch (Throwable $e) {}
    return null;
}
