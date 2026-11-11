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
            'title' => 'Level 3 — Stock & Logistics Controller',
            'short' => 'Stock Controller',
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
            'title' => 'Level 3 — Stock & Logistics Controller',
            'short' => 'Stock Controller',
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

    // Set default password hashes for users if null (admin: admin123, others: password123)
    try {
        $defaultHash = password_hash('password123', PASSWORD_BCRYPT);
        $adminHash = password_hash('admin123', PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE `users` SET `password_hash` = ? WHERE `username` = 'admin' AND (`password_hash` IS NULL OR `password_hash` = '')")->execute([$adminHash]);
        $pdo->prepare("UPDATE `users` SET `password_hash` = ? WHERE `username` != 'admin' AND (`password_hash` IS NULL OR `password_hash` = '')")->execute([$defaultHash]);
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
            `is_active` TINYINT(1) NOT NULL DEFAULT 1
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
            `assigned_technician` TEXT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `assigned_technician` TEXT DEFAULT NULL");
    } catch (Throwable $e) {}

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
            `punctuality_status` ENUM('on_time','late','early','n/a') NOT NULL DEFAULT 'on_time',
            `scanned_by` INT DEFAULT 1,
            `notes` VARCHAR(255) DEFAULT NULL,
            `scanned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 6. Ensure `stock_movements` and `batch_items` exist
    $pdo->exec("
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
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `batch_items` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `batch_id` INT NOT NULL,
            `item_name` VARCHAR(160) DEFAULT 'L-Acoustics Kara II Line Array',
            `quantity` INT NOT NULL DEFAULT 4
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 7. Ensure `items` table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `items` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `item_name` VARCHAR(255) NOT NULL,
            `serial_number` VARCHAR(100) NOT NULL UNIQUE,
            `category` VARCHAR(100) DEFAULT 'General',
            `brand` VARCHAR(100) DEFAULT NULL,
            `model` VARCHAR(100) DEFAULT NULL,
            `department` VARCHAR(50) DEFAULT 'Warehouse',
            `description` TEXT DEFAULT NULL,
            `specifications` TEXT DEFAULT NULL,
            `brand_model` VARCHAR(255) DEFAULT NULL,
            `condition` VARCHAR(20) DEFAULT 'good',
            `stock_location` VARCHAR(255) DEFAULT 'Ndera Warehouse',
            `storage_location` VARCHAR(255) DEFAULT NULL,
            `notes` TEXT DEFAULT NULL,
            `quantity` INT DEFAULT 1,
            `status` VARCHAR(20) DEFAULT 'available',
            `image` VARCHAR(500) DEFAULT NULL,
            `qr_code` VARCHAR(500) DEFAULT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `tags` VARCHAR(500) DEFAULT NULL,
            `last_scanned` TIMESTAMP NULL DEFAULT NULL,
            `current_location` VARCHAR(255) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 8. Ensure `access_clearance_levels` table exists
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

    // Seed default access_clearance_levels if empty
    $clrCount = (int) $pdo->query("SELECT COUNT(*) FROM `access_clearance_levels`")->fetchColumn();
    if ($clrCount === 0) {
        $pdo->exec("
            INSERT INTO `access_clearance_levels`
              (`level_key`, `code`, `title`, `short_name`, `color`, `bg`, `border`, `badge_bg`, `icon`, `description`, `default_stock_access`, `default_venue_access`, `venue_rule`, `stock_rule`, `sort_order`, `is_system`, `is_active`)
            VALUES
              ('L1_VENUE_BASIC', 'L1', 'Level 1 — Event Venue Crew', 'Event Venue Crew', '#16a34a', '#f8fafc', '#e2e8f0', 'rgba(22, 163, 74, 0.14)', 'fa-location-dot', 'Standard crew access restricted strictly to assigned Event Venues during scheduled calltimes.', 'none', 'assigned_or_all', 'YES', 'NO', 1, 1, 1),
              ('L2_TECH_STAGE', 'L2', 'Level 2 — Technical & Stage', 'Technical & Stage', '#2563eb', '#f8fafc', '#e2e8f0', 'rgba(37, 99, 235, 0.14)', 'fa-sliders', 'Access to Technical Stage areas, FOH/Backstage at assigned Event Venues, and designated Dispatch Stock Locations.', 'assigned_or_all', 'assigned_or_all', 'YES', 'YES', 2, 1, 1),
              ('L3_STOCK_WAREHOUSE', 'L3', 'Level 3 — Stock & Logistics Controller', 'Stock Controller', '#d97706', '#f8fafc', '#e2e8f0', 'rgba(217, 119, 6, 0.16)', 'fa-warehouse', 'Full access to authorized Stock Warehouses, Loading Bays, and Assigned Event Venues.', 'all', 'all', 'YES', 'FULL', 3, 1, 1),
              ('L4_ALL_ACCESS', 'L4', 'Level 4 — Executive & All-Access', 'Executive & All-Access', '#dc2626', '#fef2f2', '#fecaca', 'rgba(220, 38, 38, 0.15)', 'fa-shield-halved', 'Unrestricted 24/7 entry to all Stock Warehouses, Production Vaults, Backstage Technical Zones, and Event Venues.', 'all', 'all', 'ALL', 'ALL', 4, 1, 1)
        ");
    }

    // Ensure `image` column exists on stock_locations if missing
    try {
        $pdo->exec("ALTER TABLE `stock_locations` ADD COLUMN `image` VARCHAR(500) DEFAULT NULL");
    } catch (Throwable $e) {}

    // Seed items if empty
    $itemCount = (int) $pdo->query("SELECT COUNT(*) FROM `items`")->fetchColumn();
    if ($itemCount === 0) {
        $pdo->exec("
            INSERT INTO `items` (`item_name`, `serial_number`, `category`, `brand`, `model`, `department`, `stock_location`, `quantity`, `status`, `condition`, `image`) VALUES
            ('Soundcraft Vi3000 Digital Console', 'SN-AUD-VI3000-01', 'Audio', 'Soundcraft', 'Vi3000', 'Audio', 'Ndera Warehouse', 1, 'available', 'good', NULL),
            ('L-Acoustics Kara II Line Array (Pair)', 'SN-AUD-KARA-08', 'Audio', 'L-Acoustics', 'Kara II', 'Audio', 'Ndera Warehouse', 4, 'available', 'good', NULL),
            ('Robe Pointe 280W Beam Moving Head', 'SN-LGT-PNT-14', 'Lighting', 'Robe', 'Pointe 280W', 'Lighting', 'BK Arena Stock', 8, 'available', 'good', NULL),
            ('Blackmagic URSA Broadcast G2 4K', 'SN-VID-URSA-02', 'Video', 'Blackmagic', 'URSA G2', 'Video', 'KCC Stock', 2, 'available', 'good', NULL),
            ('Prolyte H40V Heavy Duty Truss 3m', 'SN-RIG-TRUSS-40', 'Rigging', 'Prolyte', 'H40V-3M', 'Rigging', 'Ndera Warehouse', 16, 'available', 'good', NULL)
        ");
    }

    // Seed stock_locations if empty
    $stockCount = (int) $pdo->query("SELECT COUNT(*) FROM `stock_locations`")->fetchColumn();
    if ($stockCount === 0) {
        $pdo->exec("
            INSERT INTO `stock_locations` (`id`, `name`, `code`, `location_code`, `location`, `open_time`, `close_time`, `is_active`) VALUES
            (1, 'Ndera Warehouse', 'NDR-STK', 'NDR', 'Ndera Central Logistics Hub', '08:00:00', '18:00:00', 1),
            (2, 'BK Arena Stock', 'BKA-STK', 'BKA', 'BK Arena Technical Vault', '08:00:00', '18:00:00', 1),
            (3, 'KCC Stock', 'KCC-STK', 'KCC', 'Kigali Convention Centre Stock', '08:00:00', '18:00:00', 1)
        ");
    }

    // Seed events if empty
    $eventCount = (int) $pdo->query("SELECT COUNT(*) FROM `events`")->fetchColumn();
    if ($eventCount === 0) {
        $today = date('Y-m-d');
        $stmtEv = $pdo->prepare("
            INSERT INTO `events` (`id`, `title`, `location`, `date`, `call_time`, `project_manager`, `tech_lead`, `assigned_technician`) VALUES
            ('1001', 'World Bank Summit — KCC', 'Kigali Convention Centre', ?, '08:00', 'Jean Paul', 'Eric Havugimana', '[3, 5, 6, 8, 11]'),
            ('1002', 'Move Afrika Tour — BK Arena', 'BK Arena Main Stage', ?, '08:30', 'Mirene', 'Patrick N.', '[5, 6, 8]'),
            ('1003', 'African Leadership Forum', 'Intare Conference Arena', ?, '09:00', 'didier', 'Olivier M.', '[3, 11]'),
            ('1004', 'Gala Dinner — Marriott Hotel', 'Kigali Marriott Hotel', ?, '10:00', 'Operations PM', 'Tech Lead', '[5, 8]')
        ");
        $stmtEv->execute([$today, $today, $today, $today]);
    } else {
        // Ensure Event 1001 (World Bank Summit) exists
        try {
            $stmt1001 = $pdo->query("SELECT id FROM `events` WHERE `id` = '1001'");
            if (!$stmt1001->fetch()) {
                $today = date('Y-m-d');
                $pdo->prepare("
                    INSERT INTO `events` (`id`, `title`, `location`, `date`, `call_time`, `project_manager`, `tech_lead`, `assigned_technician`)
                    VALUES ('1001', 'World Bank Summit — KCC', 'Kigali Convention Centre', ?, '08:00', 'Operations PM', 'Jean Paul Ndayisaba', '[36, 38, 9, 6]')
                ")->execute([$today]);
            }
            $pdo->exec("UPDATE `events` SET `assigned_technician` = '[3, 5, 6, 8, 11, 36, 38]' WHERE `id` = '1001' AND (`assigned_technician` IS NULL OR `assigned_technician` = '')");
            $pdo->exec("UPDATE `events` SET `assigned_technician` = '[5, 6, 8, 38]' WHERE `id` = '1002' AND (`assigned_technician` IS NULL OR `assigned_technician` = '')");
            $pdo->exec("UPDATE `events` SET `assigned_technician` = '[3, 11, 36]' WHERE `id` = '1003' AND (`assigned_technician` IS NULL OR `assigned_technician` = '')");
            $pdo->exec("UPDATE `events` SET `assigned_technician` = '[5, 8, 38]' WHERE `id` = '1004' AND (`assigned_technician` IS NULL OR `assigned_technician` = '')");
        } catch (Throwable $e) {}
    }

    // Ensure the 5 core demo personas exist and are ready for testing
    ensureCoreDemoPersonas($pdo);

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

        if (in_array($role, ['admin', 'manager', 'stock_manager', 'tech_lead'], true)) {
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

    // Ensure sample linked equipment batches exist in `stock_movements`
    $batchCount = (int) $pdo->query("SELECT COUNT(*) FROM `stock_movements`")->fetchColumn();
    if ($batchCount === 0) {
        $pdo->exec("
            INSERT INTO `stock_movements`
              (`id`, `batch_number`, `movement_type`, `source_name`, `destination_name`, `destination_room`, `technician_id`, `submitted_by`, `stock_controller_name`, `status`, `approval_status`, `event_name`, `job_sheet`)
            VALUES
              (14, 'BATCH-20261104-73E3EB', 'dispatch', 'Ndera Warehouse', 'Kigali Convention Centre', 'Main Auditorium', 6, 'Eric Havugimana', 'Mirene', 'approved', 'approved', 'World Bank Summit', 'JS-2026-104'),
              (15, 'BATCH-20261107-91A4FC', 'dispatch', 'BK Arena Stock', 'BK Arena Main Stage', 'FOH Rigging Grid', 5, 'Patrick Nshimiyimana', 'Mirene', 'approved', 'approved', 'Move Afrika Tour', 'JS-2026-108'),
              (16, 'BATCH-20261107-44C8BD', 'return', 'Intare Conference Arena', 'Ndera Warehouse', 'Bay B2', 3, 'Jean Paul Ndayisaba', 'Mirene', 'pending', 'pending', 'African Leadership Forum', 'JS-2026-112')
        ");
        $pdo->exec("
            INSERT IGNORE INTO `batch_items` (`batch_id`, `item_name`, `quantity`) VALUES
              (14, 'Chain Master D8+ 1T Hoist & Controller', 6),
              (14, 'Prolyte H40V Truss 3m Box Section', 12),
              (15, 'Brompton Tessera SX40 LED Processor', 2),
              (16, 'DiGiCo Quantum 338 Digital Console', 1)
        ");
    }

    if ($forceReset) {
        $todayStr = date('Y-m-d');
        $stmtDel = $pdo->prepare("DELETE FROM `attendance_logs` WHERE DATE(`scanned_at`) = ?");
        $stmtDel->execute([$todayStr]);
    }

    // Seed today's initial attendance_logs if today has zero logs so dashboard & roll-call are rich immediately
    $todayStr = date('Y-m-d');
    $todayCheckStmt = $pdo->prepare("SELECT COUNT(*) FROM `attendance_logs` WHERE DATE(`scanned_at`) = ?");
    $todayCheckStmt->execute([$todayStr]);
    $todayCount = (int) $todayCheckStmt->fetchColumn();

    if ($todayCount === 0 && !empty($users)) {
        $stocks = $pdo->query("SELECT `id`, `name` FROM `stock_locations` ORDER BY `id` ASC")->fetchAll();
        $firstStockId = (int) ($stocks[0]['id'] ?? 1);
        $firstStockName = (string) ($stocks[0]['name'] ?? 'Ndera Warehouse');

        $evts = $pdo->query("SELECT `id`, `title`, `location` FROM `events` ORDER BY `id` ASC LIMIT 4")->fetchAll();
        $firstVenueId = isset($evts[0]['id']) && is_numeric($evts[0]['id']) ? (int) $evts[0]['id'] : 1001;
        $firstVenueName = !empty($evts[0]['title']) ? $evts[0]['title'] : 'Kigali Convention Centre';

        $logIns = $pdo->prepare("
            INSERT INTO `attendance_logs`
              (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `notes`, `scanned_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ");

        $seedScans = [
            // [user_index, cp_type, cp_id, cp_name, action, status, denial, punctuality, notes, time_str]
            [0, 'event_venue', $firstVenueId, $firstVenueName, 'check_in', 'granted', null, 'early', 'Executive inspection arrival', $todayStr . ' 07:45:12'],
            [1, 'stock_warehouse', $firstStockId, $firstStockName, 'check_in', 'granted', null, 'on_time', 'Stock controller shift open', $todayStr . ' 07:52:08'],
            [5, 'stock_warehouse', $firstStockId, $firstStockName, 'check_in', 'granted', null, 'on_time', 'Batch BATCH-20261104-73E3EB verification', $todayStr . ' 08:14:22'],
            [2, 'event_venue', $firstVenueId, $firstVenueName, 'check_in', 'granted', null, 'on_time', 'Audio FOH setup call-time', $todayStr . ' 08:02:40'],
            [4, 'event_venue', $firstVenueId, $firstVenueName, 'check_in', 'granted', null, 'late', 'Video LED wall crew check-in', $todayStr . ' 08:27:19'],
            [3, 'stock_warehouse', $firstStockId, $firstStockName, 'access_verify', 'denied', 'Level 1 (Venue Crew) is not authorized for Stock Warehouses', 'n/a', 'Attempted entry at Ndera Warehouse gate', $todayStr . ' 08:41:05'],
            [2, 'event_venue', $firstVenueId, $firstVenueName, 'check_out', 'granted', null, 'on_time', 'Soundcheck wrap check-out', $todayStr . ' 12:18:44'],
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
}

function ensureCoreDemoPersonas(PDO $pdo): void
{
    $defaultPass = password_hash('password123', PASSWORD_BCRYPT);
    $adminPass = password_hash('admin123', PASSWORD_BCRYPT);

    $personas = [
        [
            'username' => 'didier',
            'full_name' => 'Didier Kayonge',
            'email' => 'didier@ability.rw',
            'phone' => '+250 788 100 001',
            'role' => 'admin',
            'department' => 'Executive',
            'pass' => $adminPass,
            'clearance' => 'L4_ALL_ACCESS',
        ],
        [
            'username' => 'jeanpaul',
            'full_name' => 'Jean Paul Ndayisaba',
            'email' => 'jp@ability.rw',
            'phone' => '+250 788 100 003',
            'role' => 'tech_lead',
            'department' => 'Audio',
            'pass' => $defaultPass,
            'clearance' => 'L4_ALL_ACCESS',
        ],
        [
            'username' => 'theogene',
            'full_name' => 'Theogene Nsengiyumva',
            'email' => 'theogene@ability.rw',
            'phone' => '+250 788 100 013',
            'role' => 'stock_manager',
            'department' => 'Warehouse',
            'pass' => $defaultPass,
            'clearance' => 'L4_ALL_ACCESS',
        ],
        [
            'username' => 'mirene',
            'full_name' => 'Mirene Uwase',
            'email' => 'mirene@ability.rw',
            'phone' => '+250 788 100 002',
            'role' => 'stock_controller',
            'department' => 'Warehouse',
            'pass' => $defaultPass,
            'clearance' => 'L3_STOCK_WAREHOUSE',
        ],
        [
            'username' => 'eric',
            'full_name' => 'Eric Havugimana',
            'email' => 'eric@ability.rw',
            'phone' => '+250 788 100 006',
            'role' => 'technician',
            'department' => 'Rigging',
            'pass' => $defaultPass,
            'clearance' => 'L2_TECH_STAGE',
        ],
    ];

    foreach ($personas as $p) {
        try {
            $stmt = $pdo->prepare("SELECT id FROM `users` WHERE email = ? OR username = ?");
            $stmt->execute([$p['email'], $p['username']]);
            $uid = $stmt->fetchColumn();

            if ($uid) {
                $uid = (int) $uid;
                $pdo->prepare("
                    UPDATE `users`
                    SET full_name = ?, email = ?, username = ?, role = ?, department = ?, is_active = 1
                    WHERE id = ?
                ")->execute([$p['full_name'], $p['email'], $p['username'], $p['role'], $p['department'], $uid]);
            } else {
                $pdo->prepare("
                    INSERT INTO `users` (`username`, `full_name`, `email`, `phone`, `role`, `department`, `password_hash`, `is_active`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                ")->execute([$p['username'], $p['full_name'], $p['email'], $p['phone'], $p['role'], $p['department'], $p['pass']]);
                $uid = (int) $pdo->lastInsertId();
            }

            // Ensure badge
            $bStmt = $pdo->prepare("SELECT id, badge_code FROM `user_badges` WHERE `user_id` = ?");
            $bStmt->execute([$uid]);
            $badgeRow = $bStmt->fetch();
            if ($badgeRow) {
                $pdo->prepare("UPDATE `user_badges` SET clearance_level = ?, badge_status = 'active' WHERE id = ?")
                    ->execute([$p['clearance'], (int)$badgeRow['id']]);
            } else {
                $bCode = 'ABL-BDG-' . str_pad((string)$uid, 4, '0', STR_PAD_LEFT);
                $pdo->prepare("
                    INSERT INTO `user_badges`
                      (`user_id`, `badge_code`, `rfid_uid`, `clearance_level`, `stock_access_mode`, `venue_access_mode`, `badge_status`, `issued_at`, `expires_at`)
                    VALUES (?, ?, ?, ?, 'all', 'all', 'active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
                ")->execute([$uid, $bCode, 'RFID-88' . str_pad((string)$uid, 2, '0', STR_PAD_LEFT), $p['clearance']]);
            }
        } catch (Throwable $e) {}
    }
}
