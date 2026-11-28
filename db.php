<?php
/**
 * aBility Manager (id_badges.php#pane-kiosk) — Database Bridge & Auto-Fallback
 * Connects directly to `ability_db` on XAMPP when available, with automatic
 * standalone fallback in `attendance_app` so the repository also works standalone.
 */

declare(strict_types=1);

date_default_timezone_set('Africa/Kigali');

if (!function_exists('getSessionCsrfToken')) {
    function getSessionCsrfToken(): string
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return '';
        }
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return (string) $_SESSION['csrf_token'];
    }
}

if (!function_exists('resolveProfileImageUrl')) {
    function resolveProfileImageUrl(?string $profileImage): ?string
    {
        $rel = trim((string) $profileImage);
        if ($rel === '') {
            return null;
        }
        if (strpos($rel, 'http://') === 0 || strpos($rel, 'https://') === 0 || strpos($rel, 'assets/') === 0) {
            return $rel;
        }
        $cleanRel = ltrim(str_replace('\\', '/', $rel), '/');
        $abilityPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'ability_app_main' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $cleanRel);
        if (file_exists($abilityPath)) {
            return '/ability_app_main/' . $cleanRel;
        }
        $localPath = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $cleanRel);
        if (file_exists($localPath)) {
            return $cleanRel;
        }
        return null;
    }
}

if (!function_exists('computeInitials')) {
    function computeInitials(string $fullName): string
    {
        $parts = preg_split('/\s+/', trim($fullName)) ?: [];
        if (count($parts) >= 2) {
            return strtoupper(substr($parts[0], 0, 1) . substr($parts[count($parts) - 1], 0, 1));
        }
        return strtoupper(substr(trim($fullName), 0, 2) ?: 'CR');
    }
}

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
    try {
        $pdo->exec("SET time_zone = '+02:00'");
    } catch (Throwable $e) {}

    // Fast direct check if `ability_db` exists and has `users` table (avoids slow INFORMATION_SCHEMA scans)
    $hasAbilityDb = false;
    try {
        $pdo->exec("USE `ability_db`");
        $tblCheck = $pdo->query("SELECT 1 FROM `users` LIMIT 1");
        if ($tblCheck !== false) {
            $hasAbilityDb = true;
        }
    } catch (Throwable $e) {
        $hasAbilityDb = false;
    }

    if ($hasAbilityDb) {
        $activeDatabaseName = 'ability_db';
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
    static $schemaVerifiedDbs = [];
    $currentDb = 'default';
    try {
        $currentDb = (string) ($pdo->query("SELECT DATABASE()")->fetchColumn() ?: 'default');
    } catch (Throwable $e) {}

    if (!$forceReset && !empty($schemaVerifiedDbs[$currentDb])) {
        return;
    }
    if (!$forceReset) {
        try {
            $verSt = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'ability_schema_version' LIMIT 1");
            $verSt->execute();
            if ((string) ($verSt->fetchColumn() ?: '') === '20261123_v28') {
                $schemaVerifiedDbs[$currentDb] = true;
                return;
            }
        } catch (Throwable $e) {}
    }

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
            `start_date` DATE DEFAULT NULL,
            `end_date` DATE DEFAULT NULL,
            `duration_days` INT DEFAULT 1,
            `duration_label` VARCHAR(64) DEFAULT NULL,
            `call_time` VARCHAR(32) DEFAULT '08:00',
            `project_manager` VARCHAR(120) DEFAULT 'Operations PM',
            `tech_lead` VARCHAR(120) DEFAULT 'Tech Lead',
            `assigned_technician` TEXT DEFAULT NULL,
            `terminal_pin` VARCHAR(20) DEFAULT '1234',
            `image` VARCHAR(500) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    foreach ([
        "ALTER TABLE `events` ADD COLUMN `start_date` DATE DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `end_date` DATE DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `duration_days` INT DEFAULT 1",
        "ALTER TABLE `events` ADD COLUMN `duration_label` VARCHAR(64) DEFAULT NULL",
    ] as $alterSql) {
        try {
            $pdo->exec($alterSql);
        } catch (Throwable $e) {
            // Column already exists
        }
    }
    try {
        $pdo->exec("
            UPDATE `events`
            SET `start_date` = COALESCE(`start_date`, `date`),
                `end_date` = COALESCE(`end_date`, `start_date`, `date`),
                `duration_days` = CASE
                    WHEN `duration_days` IS NOT NULL AND `duration_days` > 0 THEN `duration_days`
                    WHEN COALESCE(`start_date`, `date`) IS NOT NULL AND COALESCE(`end_date`, `start_date`, `date`) IS NOT NULL
                        THEN GREATEST(1, DATEDIFF(COALESCE(`end_date`, `start_date`, `date`), COALESCE(`start_date`, `date`)) + 1)
                    ELSE 1
                END
            WHERE `date` IS NOT NULL AND (`start_date` IS NULL OR `end_date` IS NULL OR `duration_days` IS NULL OR `duration_days` < 1)
        ");
        $pdo->exec("
            UPDATE `events`
            SET `duration_label` = CASE
                WHEN COALESCE(`duration_days`, 1) = 1 THEN '1 day'
                ELSE CONCAT(COALESCE(`duration_days`, 1), ' days')
            END
            WHERE (`duration_label` IS NULL OR `duration_label` = '')
        ");
    } catch (Throwable $e) {}
    try {
        $emailColStmt = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'email'");
        $emailCol = $emailColStmt ? $emailColStmt->fetch(PDO::FETCH_ASSOC) : null;
        if ($emailCol && strtoupper((string) ($emailCol['Null'] ?? 'NO')) === 'NO') {
            $pdo->exec("ALTER TABLE `users` MODIFY COLUMN `email` VARCHAR(160) NULL DEFAULT NULL");
            $pdo->exec("UPDATE `users` SET `email` = NULL WHERE `email` = ''");
        }
    } catch (Throwable $e) {}

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
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `event_coordinator` VARCHAR(120) DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `assigned_roster_json` LONGTEXT DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `geofence_radius_m` INT NOT NULL DEFAULT 200");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `checkin_policy` VARCHAR(24) NOT NULL DEFAULT 'hybrid'");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `require_visual_match` TINYINT(1) NOT NULL DEFAULT 1");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `requirements_json` LONGTEXT DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `dispatch_status` VARCHAR(32) NOT NULL DEFAULT 'draft'");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `requirements_sent_by` INT DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `requirements_sent_at` DATETIME DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `tech_lead_approved` TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `tech_lead_approved_by` INT DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `tech_lead_approved_at` DATETIME DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `tech_lead_approval_note` VARCHAR(255) DEFAULT NULL");
    } catch (Throwable $e) {}
    foreach ([
        "ALTER TABLE `events` ADD COLUMN `security_manager` VARCHAR(120) DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `security_manager_approved` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `events` ADD COLUMN `security_manager_approved_by` INT DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `security_manager_approved_at` DATETIME DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `security_manager_approval_note` VARCHAR(255) DEFAULT NULL",
    ] as $evSmAlter) {
        try {
            $pdo->exec($evSmAlter);
        } catch (Throwable $e) {}
    }
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `created_by_id` INT DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (Throwable $e) {}
    foreach ([
        "ALTER TABLE `events` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1",
        "ALTER TABLE `events` ADD COLUMN `disabled_reason` TEXT DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `disabled_by_id` INT DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `disabled_by_name` VARCHAR(120) DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `disabled_by_role` VARCHAR(64) DEFAULT NULL",
        "ALTER TABLE `events` ADD COLUMN `disabled_at` DATETIME DEFAULT NULL",
    ] as $evDisableAlter) {
        try {
            $pdo->exec($evDisableAlter);
        } catch (Throwable $e) {}
    }
    try {
        $pdo->exec("UPDATE `events` SET `terminal_pin` = '1234' WHERE `terminal_pin` IS NULL OR `terminal_pin` = ''");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("
            UPDATE `events`
            SET `dispatch_status` = 'awaiting_approval_from_tech_lead'
            WHERE COALESCE(`tech_lead_approved`, 0) = 0
              AND `tech_lead` IS NOT NULL
              AND TRIM(`tech_lead`) != ''
              AND LOWER(TRIM(`tech_lead`)) != 'tech lead'
              AND (`dispatch_status` IS NULL OR `dispatch_status` IN ('', 'draft', 'request_sent_to_tech_lead', 'requirements_sent', 'staffing_in_progress', 'ready'))
        ");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `stock_locations` ADD COLUMN `geofence_radius_m` INT NOT NULL DEFAULT 200");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `stock_locations` ADD COLUMN `checkin_policy` VARCHAR(24) NOT NULL DEFAULT 'hybrid'");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE `stock_locations` ADD COLUMN `require_visual_match` TINYINT(1) NOT NULL DEFAULT 1");
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
            `relief_mode` VARCHAR(32) NOT NULL DEFAULT 'standard',
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
    try {
        $pdo->exec("ALTER TABLE `controller_shift_requests` ADD COLUMN `relief_mode` VARCHAR(32) NOT NULL DEFAULT 'standard'");
    } catch (Throwable $e) {}

    // 4c. Geo-Fenced QR Temporary Relief Tokens & TOTP Authenticator Secrets
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `relief_qr_tokens` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `shift_request_id` INT NOT NULL,
            `token_hash` CHAR(64) NOT NULL UNIQUE,
            `checkpoint_type` VARCHAR(30) NOT NULL DEFAULT 'stock_warehouse',
            `checkpoint_id` VARCHAR(64) NOT NULL,
            `checkpoint_name` VARCHAR(160) NOT NULL,
            `assigned_user_id` INT NOT NULL,
            `require_totp` TINYINT(1) NOT NULL DEFAULT 1,
            `require_geofence` TINYINT(1) NOT NULL DEFAULT 1,
            `geofence_radius_m` INT NOT NULL DEFAULT 200,
            `expires_at` DATETIME NOT NULL,
            `redeemed_at` DATETIME DEFAULT NULL,
            `redeemed_by_id` INT DEFAULT NULL,
            `verified_lat` DECIMAL(10,6) DEFAULT NULL,
            `verified_lng` DECIMAL(10,6) DEFAULT NULL,
            `distance_m` INT DEFAULT NULL,
            `override_used` TINYINT(1) NOT NULL DEFAULT 0,
            `created_by_id` INT NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `user_totp_secrets` (
            `user_id` INT PRIMARY KEY,
            `secret_base32` VARCHAR(64) NOT NULL,
            `is_enabled` TINYINT(1) NOT NULL DEFAULT 0,
            `verified_at` DATETIME DEFAULT NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 4d. Anti-Shadowing QR Access: Trusted Device Bindings, Rotating Venue Challenges & Single-Use Nonces
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `user_trusted_devices` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `device_token_hash` CHAR(64) NOT NULL UNIQUE,
            `device_label` VARCHAR(120) DEFAULT 'Mobile Device',
            `user_agent` VARCHAR(255) DEFAULT NULL,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `bound_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `last_seen_at` DATETIME DEFAULT NULL,
            `revoked_by_id` INT DEFAULT NULL,
            `revoked_at` DATETIME DEFAULT NULL,
            INDEX `idx_utd_user` (`user_id`, `is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `venue_qr_challenges` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `token_hash` CHAR(64) NOT NULL UNIQUE,
            `checkpoint_type` VARCHAR(30) NOT NULL DEFAULT 'event_venue',
            `checkpoint_id` VARCHAR(64) NOT NULL,
            `checkpoint_name` VARCHAR(160) NOT NULL,
            `issued_by_id` INT DEFAULT 0,
            `expires_at` DATETIME NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_vqc_exp` (`expires_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `qr_scan_nonces` (
            `nonce_hash` CHAR(64) PRIMARY KEY,
            `user_id` INT NOT NULL,
            `token_kind` VARCHAR(24) NOT NULL DEFAULT 'pass',
            `checkpoint_type` VARCHAR(30) DEFAULT NULL,
            `checkpoint_id` VARCHAR(64) DEFAULT NULL,
            `consumed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `expires_at` DATETIME NOT NULL,
            INDEX `idx_qsn_exp` (`expires_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 4e. Random Roll-Call Sessions & Entries
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `roll_call_sessions` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `checkpoint_type` VARCHAR(30) NOT NULL DEFAULT 'all',
            `checkpoint_id` VARCHAR(64) DEFAULT 'all',
            `checkpoint_name` VARCHAR(160) NOT NULL DEFAULT 'All Checkpoints',
            `triggered_by_id` INT NOT NULL,
            `selection_mode` VARCHAR(24) NOT NULL DEFAULT 'random_count',
            `sample_value` INT NOT NULL DEFAULT 5,
            `require_geo_or_qr` TINYINT(1) NOT NULL DEFAULT 1,
            `auto_checkout_on_miss` TINYINT(1) NOT NULL DEFAULT 1,
            `deadline_at` DATETIME NOT NULL,
            `status` VARCHAR(24) NOT NULL DEFAULT 'active',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `closed_at` DATETIME DEFAULT NULL,
            INDEX `idx_rcs_status` (`status`, `deadline_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `roll_call_entries` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `session_id` INT NOT NULL,
            `user_id` INT NOT NULL,
            `checkpoint_type` VARCHAR(30) NOT NULL,
            `checkpoint_id` VARCHAR(64) NOT NULL,
            `checkpoint_name` VARCHAR(160) NOT NULL,
            `status` VARCHAR(24) NOT NULL DEFAULT 'pending',
            `verification_method` VARCHAR(32) DEFAULT NULL,
            `verified_by_id` INT DEFAULT NULL,
            `verified_lat` DECIMAL(10,6) DEFAULT NULL,
            `verified_lng` DECIMAL(10,6) DEFAULT NULL,
            `distance_m` INT DEFAULT NULL,
            `auto_checkout_log_id` INT DEFAULT NULL,
            `verified_at` DATETIME DEFAULT NULL,
            `notes` VARCHAR(255) DEFAULT NULL,
            UNIQUE KEY `uniq_rc_session_user` (`session_id`, `user_id`),
            INDEX `idx_rce_user` (`user_id`, `status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 4f. Event Dispatch Handshake: Crew Confirmation, Support Staff Requests & Action Audit Logs
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `event_crew_assignments` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `event_id` VARCHAR(64) NOT NULL,
            `user_id` INT NOT NULL,
            `branch_dept` VARCHAR(48) NOT NULL DEFAULT 'Sound',
            `role_slot` VARCHAR(80) DEFAULT NULL,
            `assigned_by_id` INT DEFAULT 1,
            `confirmation_status` VARCHAR(24) NOT NULL DEFAULT 'pending',
            `decline_reason` VARCHAR(255) DEFAULT NULL,
            `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `responded_at` DATETIME DEFAULT NULL,
            UNIQUE KEY `uniq_eca_event_user` (`event_id`, `user_id`),
            INDEX `idx_eca_user` (`user_id`, `confirmation_status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `event_support_requests` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `event_id` VARCHAR(64) NOT NULL,
            `requested_by_id` INT NOT NULL,
            `requested_roles_json` TEXT NOT NULL,
            `notes` TEXT DEFAULT NULL,
            `status` VARCHAR(24) NOT NULL DEFAULT 'pending',
            `fulfilled_by_id` INT DEFAULT NULL,
            `assigned_user_ids_json` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `fulfilled_at` DATETIME DEFAULT NULL,
            INDEX `idx_esr_event` (`event_id`, `status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `event_dispatch_logs` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `event_id` VARCHAR(64) NOT NULL,
            `actor_id` INT NOT NULL,
            `actor_role` VARCHAR(50) NOT NULL,
            `action_type` VARCHAR(50) NOT NULL,
            `summary` VARCHAR(255) NOT NULL,
            `payload_json` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_edl_event` (`event_id`, `id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `event_dept_confirmations` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `event_id` VARCHAR(64) NOT NULL,
            `user_id` INT NOT NULL,
            `department` VARCHAR(64) NOT NULL DEFAULT 'General',
            `confirmation_status` VARCHAR(32) NOT NULL DEFAULT 'confirmed',
            `comment` TEXT NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_edc_event` (`event_id`, `id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    ensureDepartmentsTable($pdo);

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
            `checkin_method` VARCHAR(32) NOT NULL DEFAULT 'badge_scan',
            `verified_lat` DECIMAL(10,6) DEFAULT NULL,
            `verified_lng` DECIMAL(10,6) DEFAULT NULL,
            `distance_m` INT DEFAULT NULL,
            `device_id` INT DEFAULT NULL,
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
        if (!in_array('checkin_method', $cols, true)) {
            $pdo->exec("ALTER TABLE `attendance_logs` ADD COLUMN `checkin_method` VARCHAR(32) NOT NULL DEFAULT 'badge_scan' AFTER `override_reason`");
        }
        if (!in_array('verified_lat', $cols, true)) {
            $pdo->exec("ALTER TABLE `attendance_logs` ADD COLUMN `verified_lat` DECIMAL(10,6) NULL AFTER `checkin_method`");
        }
        if (!in_array('verified_lng', $cols, true)) {
            $pdo->exec("ALTER TABLE `attendance_logs` ADD COLUMN `verified_lng` DECIMAL(10,6) NULL AFTER `verified_lat`");
        }
        if (!in_array('distance_m', $cols, true)) {
            $pdo->exec("ALTER TABLE `attendance_logs` ADD COLUMN `distance_m` INT NULL AFTER `verified_lng`");
        }
        if (!in_array('device_id', $cols, true)) {
            $pdo->exec("ALTER TABLE `attendance_logs` ADD COLUMN `device_id` INT NULL AFTER `distance_m`");
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

    // Ensure app_settings exists so one-time event seed flags persist across full deletions
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `app_settings` (
                `setting_key` VARCHAR(64) PRIMARY KEY,
                `setting_value` TEXT DEFAULT NULL,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } catch (Throwable $e) {}

    $eventsSeededFlag = false;
    try {
        $sfStmt = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'events_seeded_v1' LIMIT 1");
        $sfStmt->execute();
        $eventsSeededFlag = ((string) $sfStmt->fetchColumn() === '1');
    } catch (Throwable $e) {}

    // Seed sample events ONLY once (or on explicit factory reset), never respawning after user deletes all events
    $eventCount = (int) $pdo->query("SELECT COUNT(*) FROM `events`")->fetchColumn();
    if ($eventCount > 0 && !$eventsSeededFlag && !$forceReset) {
        try {
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('events_seeded_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
            $eventsSeededFlag = true;
        } catch (Throwable $e) {}
    }
    if (($eventCount === 0 && !$eventsSeededFlag) || $forceReset) {
        $today = date('Y-m-d');
        $stmtEv = $pdo->prepare("
            INSERT IGNORE INTO `events` (`id`, `title`, `location`, `date`, `call_time`, `project_manager`, `tech_lead`, `assigned_technician`) VALUES
            ('1001', 'World Bank Summit — KCC', 'Kigali Convention Centre', ?, '08:00', 'Uwineza Gisele', 'Musirikare Leonce', '[6, 8, 9, 11]'),
            ('1002', 'Move Afrika Tour — BK Arena', 'BK Arena Main Stage', ?, '08:30', 'Diane Iradukunda', 'Hirwa Jean de Dieu', '[6, 12, 15]'),
            ('1003', 'African Leadership Forum', 'Intare Conference Arena', ?, '09:00', 'Uwineza Gisele', 'Musirikare Leonce', '[9, 11]'),
            ('1004', 'Gala Dinner — Marriott Hotel', 'Kigali Marriott Hotel', ?, '10:00', 'Diane Iradukunda', 'Hirwa Jean de Dieu', '[8, 19]')
        ");
        $stmtEv->execute([$today, $today, $today, $today]);
        try {
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('events_seeded_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        } catch (Throwable $e) {}
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
    try {
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('ability_schema_version', '20261123_v28') ON DUPLICATE KEY UPDATE `setting_value` = '20261123_v28'")->execute();
        $schemaVerifiedDbs[$currentDb] = true;
    } catch (Throwable $e) {}
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
                `best_for` TEXT DEFAULT NULL,
                `permissions_summary` TEXT DEFAULT NULL,
                `allow_scan` TINYINT(1) NOT NULL DEFAULT 1,
                `mask_phones` TINYINT(1) NOT NULL DEFAULT 0,
                `expires_at` DATETIME DEFAULT NULL,
                `max_sessions` INT DEFAULT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_system` TINYINT(1) NOT NULL DEFAULT 1,
                `sort_order` INT NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        foreach ([
            "ALTER TABLE `standalone_portals` ADD COLUMN `best_for` TEXT DEFAULT NULL",
            "ALTER TABLE `standalone_portals` ADD COLUMN `permissions_summary` TEXT DEFAULT NULL",
            "ALTER TABLE `standalone_portals` ADD COLUMN `allow_scan` TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE `standalone_portals` ADD COLUMN `mask_phones` TINYINT(1) NOT NULL DEFAULT 0",
            "ALTER TABLE `standalone_portals` ADD COLUMN `expires_at` DATETIME DEFAULT NULL",
            "ALTER TABLE `standalone_portals` ADD COLUMN `max_sessions` INT DEFAULT NULL",
        ] as $alterSql) {
            try {
                $pdo->exec($alterSql);
            } catch (Throwable $e) {}
        }

        $nderaRow = resolveStandaloneFacilityGate($pdo, 'ndera');
        $bkRow = resolveStandaloneFacilityGate($pdo, 'bk-arena');
        $kccRow = resolveStandaloneFacilityGate($pdo, 'kcc');

        $ins = $pdo->prepare("
            INSERT IGNORE INTO `standalone_portals`
            (`portal_key`, `portal_type`, `title`, `subtitle`, `entry_url`, `wh_id`, `background_image`, `overlay_opacity`, `best_for`, `permissions_summary`, `allow_scan`, `mask_phones`, `expires_at`, `max_sessions`, `is_active`, `is_system`, `sort_order`)
            VALUES (?, ?, ?, ?, ?, ?, NULL, 0.78, ?, ?, ?, ?, NULL, NULL, 1, 1, ?)
        ");
        $defaults = [
            [
                'ndera', 'facility_gate', 'Ndera Warehouse Gate',
                'Rwanda Events Gate Terminal · # Ndera Warehouse Gate', 'ndera-gate.php',
                $nderaRow ? (int) $nderaRow['id'] : null,
                'Dedicated loading-bay kiosk laptops/tablets manned by Ndera Gate Controllers.',
                'Can scan check-in/out & verify L2–L4 badges at Ndera only. Requires Ndera PIN; blocks L1 crew and user/role edits.',
                1, 0, 1
            ],
            [
                'bk-arena', 'facility_gate', 'BK Arena Gate',
                'Rwanda Events Gate Terminal · # BK Arena Gate', 'bk-arena-gate.php',
                $bkRow ? (int) $bkRow['id'] : null,
                'Arena backstage & technical vault gate desks during live load-in and show days.',
                'Can scan & transfer crew at BK Arena Gate only. Requires BK Arena PIN; isolated from admin dashboard.',
                1, 0, 2
            ],
            [
                'kcc', 'facility_gate', 'KCC Gate',
                'Rwanda Events Gate Terminal · # KCC Gate', 'kcc-gate.php',
                $kccRow ? (int) $kccRow['id'] : null,
                'Kigali Convention Centre production gate check-in & contractor verification desks.',
                'Can scan & verify L2–L4 badges at KCC Stock Gate only. Requires KCC PIN; cannot alter call-times or accounts.',
                1, 0, 3
            ],
            [
                'onsite', 'onsite_portal', 'Live On-Site Crew Portal',
                'Read-Only Live On-Site Directory · Stock Managers, Gate Controllers & Technicians', 'onsite.php',
                null,
                'Roaming supervisors, coordinators, and technicians checking who is currently on site and calling department peers.',
                'Strictly read-only live roster protected by shared crew password. Cannot scan badges, view admin logs, or edit staff.',
                0, 0, 4
            ],
        ];
        foreach ($defaults as $row) {
            $ins->execute($row);
        }
        $pdo->exec("UPDATE `standalone_portals` SET `allow_scan` = 0 WHERE `portal_type` = 'onsite_portal' AND `allow_scan` = 1");
        foreach ($defaults as $row) {
            $pdo->prepare("
                UPDATE `standalone_portals`
                SET `best_for` = COALESCE(NULLIF(`best_for`, ''), ?),
                    `permissions_summary` = COALESCE(NULLIF(`permissions_summary`, ''), ?)
                WHERE `portal_key` = ?
            ")->execute([$row[6], $row[7], $row[0]]);
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
            $expiresAt = !empty($r['expires_at']) ? (string) $r['expires_at'] : null;
            $isExpired = ($expiresAt !== null && strtotime($expiresAt) !== false && strtotime($expiresAt) < time());
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
                'best_for' => (string) ($r['best_for'] ?? ''),
                'permissions_summary' => (string) ($r['permissions_summary'] ?? ''),
                'allow_scan' => (int) ($r['allow_scan'] ?? (($r['portal_type'] ?? '') === 'onsite_portal' ? 0 : 1)),
                'mask_phones' => (int) ($r['mask_phones'] ?? 0),
                'expires_at' => $expiresAt,
                'is_expired' => $isExpired,
                'max_sessions' => $r['max_sessions'] !== null ? (int) $r['max_sessions'] : null,
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

function ensureDepartmentsTable(PDO $pdo): void
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `departments` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `code` VARCHAR(32) NOT NULL UNIQUE,
                `name` VARCHAR(100) NOT NULL,
                `description` TEXT DEFAULT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $seedDepts = [
            ['VID', 'Video', 'LED walls, SDI/fiber switching, cameras, and projection technicians.'],
            ['SND', 'Sound', 'FOH audio arrays, monitor consoles, wireless RF, and sound engineering.'],
            ['LGT', 'Lighting', 'DMX universes, moving fixtures, dimmers, and stage lighting control.'],
            ['ELC', 'Electrical', 'Three-phase power distribution, generators, UPS, and stage power safety.'],
            ['RIG', 'Rigging', 'Truss motors, overhead rigging, bridle loads, and fall-arrest safety.'],
            ['INT', 'Interpretation', 'Simultaneous interpretation booths, Bosch/IR receivers, and language channels.'],
            ['SUP', 'Support Staff', 'Stagehands, loaders, runners, and general event operations crew.'],
            ['OPS', 'Operations', 'Project Managers, Event Coordinators, and Technical Leads.'],
            ['WHS', 'Warehouse', 'Facility gate controllers, staging vaults, and logistics dispatch.'],
            ['SEC', 'Security', 'Perimeter control, badge verification, and venue access enforcement.'],
            ['EXC', 'Executive', 'Directors and executive all-access oversight.'],
            ['LOG', 'Logistics', 'Fleet drivers and cross-site crew transport coordination.'],
        ];
        $ins = $pdo->prepare("INSERT IGNORE INTO `departments` (`code`, `name`, `description`, `is_active`) VALUES (?, ?, ?, 1)");
        foreach ($seedDepts as $d) {
            $ins->execute($d);
        }
    } catch (Throwable $e) {}
}

function expireStaleShiftAssignments(PDO $pdo): void
{
    try {
        $pdo->exec("
            UPDATE `users`
            SET `assigned_checkpoint_type` = NULL,
                `assigned_checkpoint_id` = NULL,
                `assignment_expires_at` = NULL
            WHERE `assignment_expires_at` IS NOT NULL
              AND `assignment_expires_at` <= NOW()
        ");
    } catch (Throwable $e) {}
}

function getDefaultBrandingConfig(): array
{
    return [
        'brand_name' => 'aBility',
        'logo_path' => '',
        'favicon_path' => '',
        'logo_size_px' => 34,
        'primary_color' => '#4f46e5',
        'accent_color' => '#10b981',
        'neutral_color' => '#64748b',
        'light_primary' => '#4f46e5',
        'light_accent' => '#10b981',
        'dark_primary' => '#8b5cf6',
        'dark_accent' => '#38bdf8',
        'font_family' => 'Marvel',
        'font_scale' => 1.0,
        'text_align' => 'left',
        'default_theme' => 'system',
    ];
}

function getDefaultBrandingLogoPath(): string
{
    return is_file(__DIR__ . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'rwanda-events-logo.png')
        ? 'assets/rwanda-events-logo.png'
        : 'assets/brand-mark.svg';
}

function getDefaultBrandingFaviconPath(): string
{
    return is_file(__DIR__ . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'icons' . DIRECTORY_SEPARATOR . 'favicon-64.png')
        ? 'assets/icons/favicon-64.png'
        : 'assets/icons/icon-192.png';
}

function resolveBrandingLogoUrl(?string $rawPath): string
{
    $rel = ltrim(str_replace('\\', '/', trim((string) $rawPath)), '/');
    if ($rel === '' || strpos($rel, '..') !== false) {
        return getDefaultBrandingLogoPath();
    }
    $allowedExact = ['assets/rwanda-events-logo.png', 'assets/brand-mark.svg', 'reLogo.png', 'reTransparentLogo.png'];
    $allowedPrefix = (strpos($rel, 'uploads/branding/') === 0 || strpos($rel, 'assets/') === 0);
    if (!$allowedPrefix && !in_array($rel, $allowedExact, true)) {
        return getDefaultBrandingLogoPath();
    }
    $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    return is_file($abs) ? $rel : getDefaultBrandingLogoPath();
}

function resolveBrandingFaviconUrl(?string $rawFavPath, ?string $rawLogoPath = ''): string
{
    $fav = ltrim(str_replace('\\', '/', trim((string) $rawFavPath)), '/');
    if ($fav !== '' && strpos($fav, '..') === false) {
        $allowedPrefix = (strpos($fav, 'uploads/branding/') === 0 || strpos($fav, 'assets/') === 0);
        if ($allowedPrefix && is_file(__DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $fav))) {
            return $fav;
        }
    }
    $logo = trim((string) $rawLogoPath);
    if ($logo !== '') {
        return resolveBrandingLogoUrl($logo);
    }
    return getDefaultBrandingFaviconPath();
}

function normalizeBrandingFontUrl(string $rawUrl): string
{
    $url = trim($rawUrl);
    if ($url === '') {
        return '';
    }
    if (preg_match('#^https?://fonts\.google\.com/specimen/([^/?\#]+)#i', $url, $m)) {
        $family = trim(urldecode((string) $m[1]));
        if ($family !== '') {
            $encodedFamily = str_replace('%20', '+', rawurlencode(str_replace('+', ' ', $family)));
            return 'https://fonts.googleapis.com/css2?family=' . $encodedFamily . ':wght@400;500;600;700;800&display=swap';
        }
    }
    return $url;
}

/**
 * Single source of truth for built-in typography presets and their webfont CSS URLs.
 */
function getBuiltInBrandingFontPresetSpecs(): array
{
    return [
        'Marvel' => [
            'css_stack' => '"Marvel", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
            'font_url' => 'https://fonts.googleapis.com/css2?family=Marvel:ital,wght@0,400;0,700;1,400;1,700&display=swap',
        ],
        'Inter' => [
            'css_stack' => '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
            'font_url' => 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        ],
        'Plus Jakarta Sans' => [
            'css_stack' => '"Plus Jakarta Sans", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
            'font_url' => 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        ],
        'JetBrains Mono' => [
            'css_stack' => '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
            'font_url' => 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap',
        ],
        'Roboto' => [
            'css_stack' => '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
            'font_url' => 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap',
        ],
        'System UI' => [
            'css_stack' => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            'font_url' => null,
        ],
    ];
}

function getBuiltInBrandingFontPresets(): array
{
    $stacks = [];
    foreach (getBuiltInBrandingFontPresetSpecs() as $name => $spec) {
        $stacks[$name] = $spec['css_stack'];
    }
    return $stacks;
}

function ensureBrandingFontsTable(PDO $pdo): void
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `branding_fonts` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `font_name` VARCHAR(80) NOT NULL UNIQUE,
                `css_stack` VARCHAR(255) NOT NULL,
                `font_url` VARCHAR(512) DEFAULT NULL,
                `file_path` VARCHAR(255) DEFAULT NULL,
                `font_format` VARCHAR(32) DEFAULT NULL,
                `is_system` TINYINT(1) NOT NULL DEFAULT 0,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $chk = $pdo->prepare("SELECT `id`, `font_url` FROM `branding_fonts` WHERE `font_name` = ? LIMIT 1");
        $ins = $pdo->prepare("INSERT INTO `branding_fonts` (`font_name`, `css_stack`, `font_url`, `is_system`, `is_active`) VALUES (?, ?, ?, 1, 1)");
        $updUrl = $pdo->prepare("UPDATE `branding_fonts` SET `css_stack` = ?, `font_url` = ? WHERE `id` = ? AND `is_system` = 1");
        foreach (getBuiltInBrandingFontPresetSpecs() as $fName => $spec) {
            $stack = $spec['css_stack'];
            $fUrl = $spec['font_url'];
            $chk->execute([$fName]);
            $existingRow = $chk->fetch(PDO::FETCH_ASSOC);
            if (!$existingRow) {
                $ins->execute([$fName, $stack, $fUrl]);
            } elseif ((string) ($existingRow['font_url'] ?? '') === '' && $fUrl !== null) {
                $updUrl->execute([$stack, $fUrl, (int) $existingRow['id']]);
            }
        }
    } catch (Throwable $e) {}
}

function getBrandingFontsList(PDO $pdo, bool $onlyActive = false): array
{
    ensureBrandingFontsTable($pdo);
    $presetSpecs = getBuiltInBrandingFontPresetSpecs();
    $rows = [];
    try {
        $sql = "SELECT * FROM `branding_fonts`" . ($onlyActive ? " WHERE `is_active` = 1" : "") . " ORDER BY `is_system` DESC, `font_name` ASC, `id` ASC";
        foreach ($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $fName = (string) ($r['font_name'] ?? '');
            $fp = ltrim(str_replace('\\', '/', trim((string) ($r['file_path'] ?? ''))), '/');
            $fpValid = ($fp !== '' && strpos($fp, '..') === false && strpos($fp, 'uploads/branding/fonts/') === 0 && is_file(__DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $fp)));
            $rawUrl = trim((string) ($r['font_url'] ?? ''));
            if ($rawUrl === '' && (int) ($r['is_system'] ?? 0) === 1 && isset($presetSpecs[$fName]['font_url'])) {
                $rawUrl = (string) $presetSpecs[$fName]['font_url'];
            }
            $rows[] = [
                'id' => (int) ($r['id'] ?? 0),
                'font_name' => $fName,
                'css_stack' => (string) ($r['css_stack'] ?? ($presetSpecs[$fName]['css_stack'] ?? '')),
                'font_url' => normalizeBrandingFontUrl($rawUrl),
                'file_path' => $fpValid ? $fp : '',
                'font_format' => (string) ($r['font_format'] ?? ''),
                'is_system' => (int) ($r['is_system'] ?? 0),
                'is_active' => (int) ($r['is_active'] ?? 1),
            ];
        }
    } catch (Throwable $e) {}
    if (empty($rows)) {
        $idx = 1;
        foreach ($presetSpecs as $fName => $spec) {
            $rows[] = [
                'id' => $idx++,
                'font_name' => $fName,
                'css_stack' => $spec['css_stack'],
                'font_url' => (string) ($spec['font_url'] ?? ''),
                'file_path' => '',
                'font_format' => '',
                'is_system' => 1,
                'is_active' => 1,
            ];
        }
    }
    return $rows;
}

function getAllowedBrandingFonts(?PDO $pdo = null): array
{
    $map = getBuiltInBrandingFontPresets();
    if ($pdo !== null) {
        foreach (getBrandingFontsList($pdo, true) as $f) {
            if ($f['font_name'] !== '' && $f['css_stack'] !== '') {
                $map[$f['font_name']] = $f['css_stack'];
            }
        }
    }
    return $map;
}

function resolveAllowedBrandingFontKey(array $fonts, ?string $requested): ?string
{
    $req = trim((string) $requested);
    if ($req === '') {
        return null;
    }
    if (isset($fonts[$req])) {
        return $req;
    }
    foreach ($fonts as $name => $_stack) {
        if (strcasecmp((string) $name, $req) === 0) {
            return (string) $name;
        }
    }
    return null;
}

function getBrandingConfig(PDO $pdo): array
{
    $defaults = getDefaultBrandingConfig();
    try {
        $st = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'branding_config' LIMIT 1");
        $st->execute();
        $raw = $st->fetchColumn();
        if (is_string($raw) && $raw !== '') {
            $dec = json_decode($raw, true);
            if (is_array($dec)) {
                $fonts = getAllowedBrandingFonts($pdo);
                $safeHex = static fn($v, $fb) => (is_string($v) && preg_match('/^#[0-9a-fA-F]{6}$/', trim($v))) ? strtolower(trim($v)) : $fb;
                $matchedFont = resolveAllowedBrandingFontKey($fonts, isset($dec['font_family']) ? (string) $dec['font_family'] : null);
                $font = $matchedFont ?? $defaults['font_family'];
                $scale = max(0.88, min(1.2, round((float) ($dec['font_scale'] ?? 1.0), 2)));
                $align = in_array($dec['text_align'] ?? '', ['left', 'center', 'justify'], true) ? (string) $dec['text_align'] : 'left';
                $defTheme = in_array($dec['default_theme'] ?? '', ['light', 'dark', 'system'], true) ? (string) $dec['default_theme'] : 'system';
                $brandName = trim((string) ($dec['brand_name'] ?? $defaults['brand_name']));
                $primary = $safeHex($dec['primary_color'] ?? ($dec['light_primary'] ?? ''), $defaults['primary_color']);
                $accent = $safeHex($dec['accent_color'] ?? ($dec['light_accent'] ?? ''), $defaults['accent_color']);
                $neutral = $safeHex($dec['neutral_color'] ?? '', $defaults['neutral_color']);
                $logoPathRaw = trim((string) ($dec['logo_path'] ?? ''));
                $favPathRaw = trim((string) ($dec['favicon_path'] ?? ''));
                $logoSizePx = max(24, min(48, (int) ($dec['logo_size_px'] ?? 34)));
                $logoResolved = $logoPathRaw !== '' ? resolveBrandingLogoUrl($logoPathRaw) : getDefaultBrandingLogoPath();
                $favResolved = resolveBrandingFaviconUrl($favPathRaw, $logoPathRaw);
                return [
                    'brand_name' => $brandName !== '' ? substr($brandName, 0, 48) : $defaults['brand_name'],
                    'logo_path' => $logoPathRaw,
                    'logo_url' => $logoResolved,
                    'favicon_path' => $favPathRaw,
                    'favicon_url' => $favResolved,
                    'logo_size_px' => $logoSizePx,
                    'primary_color' => $primary,
                    'accent_color' => $accent,
                    'neutral_color' => $neutral,
                    'light_primary' => $safeHex($dec['light_primary'] ?? '', $primary),
                    'light_accent' => $safeHex($dec['light_accent'] ?? '', $accent),
                    'dark_primary' => $safeHex($dec['dark_primary'] ?? '', $defaults['dark_primary']),
                    'dark_accent' => $safeHex($dec['dark_accent'] ?? '', $defaults['dark_accent']),
                    'font_family' => $font,
                    'font_scale' => $scale,
                    'text_align' => $align,
                    'default_theme' => $defTheme,
                ];
            }
        }
    } catch (Throwable $e) {}
    $defaults['logo_url'] = getDefaultBrandingLogoPath();
    $defaults['favicon_url'] = getDefaultBrandingFaviconPath();
    return $defaults;
}

function saveBrandingConfig(PDO $pdo, array $in): array
{
    $cur = getBrandingConfig($pdo);
    $fonts = getAllowedBrandingFonts($pdo);
    $safeHex = static fn($v, $fb) => (is_string($v) && preg_match('/^#[0-9a-fA-F]{6}$/', trim($v))) ? strtolower(trim($v)) : $fb;

    $primary = $safeHex($in['primary_color'] ?? ($in['light_primary'] ?? ''), $cur['primary_color']);
    $accent = $safeHex($in['accent_color'] ?? ($in['light_accent'] ?? ''), $cur['accent_color']);
    $neutral = $safeHex($in['neutral_color'] ?? '', $cur['neutral_color']);
    $logoPath = array_key_exists('logo_path', $in) ? trim((string) $in['logo_path']) : ($cur['logo_path'] ?? '');
    if ($logoPath !== '') {
        $logoPath = resolveBrandingLogoUrl($logoPath);
        if ($logoPath === 'assets/rwanda-events-logo.png' && !array_key_exists('logo_path', $in)) {
            $logoPath = '';
        }
    }
    $favPath = array_key_exists('favicon_path', $in) ? trim((string) $in['favicon_path']) : ($cur['favicon_path'] ?? '');
    $logoSizePx = max(24, min(48, (int) ($in['logo_size_px'] ?? $cur['logo_size_px'] ?? 34)));

    $next = [
        'brand_name' => trim((string) ($in['brand_name'] ?? $cur['brand_name'])) ?: 'aBility',
        'logo_path' => $logoPath,
        'favicon_path' => $favPath,
        'logo_size_px' => $logoSizePx,
        'primary_color' => $primary,
        'accent_color' => $accent,
        'neutral_color' => $neutral,
        'light_primary' => $safeHex($in['light_primary'] ?? '', $primary),
        'light_accent' => $safeHex($in['light_accent'] ?? '', $accent),
        'dark_primary' => $safeHex($in['dark_primary'] ?? '', $cur['dark_primary']),
        'dark_accent' => $safeHex($in['dark_accent'] ?? '', $cur['dark_accent']),
        'font_family' => resolveAllowedBrandingFontKey($fonts, isset($in['font_family']) ? (string) $in['font_family'] : null) ?? $cur['font_family'],
        'font_scale' => max(0.88, min(1.2, round((float) ($in['font_scale'] ?? $cur['font_scale']), 2))),
        'text_align' => in_array($in['text_align'] ?? '', ['left', 'center', 'justify'], true) ? (string) $in['text_align'] : $cur['text_align'],
        'default_theme' => in_array($in['default_theme'] ?? '', ['light', 'dark', 'system'], true) ? (string) $in['default_theme'] : $cur['default_theme'],
    ];
    $next['brand_name'] = substr($next['brand_name'], 0, 48);

    try {
        $pdo->prepare("
            INSERT INTO `app_settings` (`setting_key`, `setting_value`)
            VALUES ('branding_config', ?)
            ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)
        ")->execute([json_encode($next)]);
    } catch (Throwable $e) {}

    $next['logo_url'] = resolveBrandingLogoUrl($next['logo_path']);
    $next['favicon_url'] = resolveBrandingFaviconUrl($next['favicon_path'], $next['logo_path']);
    return $next;
}

function renderBrandingHeadHtml(PDO $pdo): string
{
    $b = getBrandingConfig($pdo);
    $fontsList = getBrandingFontsList($pdo, true);
    $fonts = getAllowedBrandingFonts($pdo);
    $presetSpecs = getBuiltInBrandingFontPresetSpecs();
    $activeFontKey = resolveAllowedBrandingFontKey($fonts, (string) ($b['font_family'] ?? 'Marvel')) ?? 'Marvel';
    $fontStack = $fonts[$activeFontKey] ?? $fonts['Marvel'];
    $isMonoActive = (bool) preg_match('/\bmonospace\b|jetbrains|fira\s*code|ibm\s*plex\s*mono|source\s*code|consolas|menlo/i', $activeFontKey . ' ' . $fontStack);
    $monoStack = $isMonoActive
        ? $fontStack
        : ("'" . str_replace("'", "\\'", $activeFontKey) . "', " . $fontStack . ", ui-monospace, SFMono-Regular, 'Consolas', monospace");
    $scaleNum = number_format((float) $b['font_scale'], 2, '.', '');
    $primary = htmlspecialchars($b['primary_color'], ENT_QUOTES, 'UTF-8');
    $accent = htmlspecialchars($b['accent_color'], ENT_QUOTES, 'UTF-8');
    $neutral = htmlspecialchars($b['neutral_color'], ENT_QUOTES, 'UTF-8');
    $darkPrimary = htmlspecialchars($b['dark_primary'], ENT_QUOTES, 'UTF-8');
    $darkAccent = htmlspecialchars($b['dark_accent'], ENT_QUOTES, 'UTF-8');
    $align = htmlspecialchars($b['text_align'], ENT_QUOTES, 'UTF-8');
    $defTheme = htmlspecialchars($b['default_theme'], ENT_QUOTES, 'UTF-8');
    $brandNameJson = json_encode($b['brand_name']);
    $logoUrl = resolveBrandingLogoUrl($b['logo_path'] ?? '');
    $logoUrlJson = json_encode($logoUrl);
    $faviconUrl = resolveBrandingFaviconUrl($b['favicon_path'] ?? '', $b['logo_path'] ?? '');
    $faviconUrlJson = json_encode($faviconUrl);
    $logoSizePx = max(24, min(48, (int) ($b['logo_size_px'] ?? 34))) . 'px';

    $lines = [
        '  <link rel="manifest" href="manifest.webmanifest" />',
        '  <meta name="theme-color" content="' . $primary . '" />',
        '  <meta name="apple-mobile-web-app-capable" content="yes" />',
        '  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
        '  <meta name="apple-mobile-web-app-title" content="' . htmlspecialchars($b['brand_name'], ENT_QUOTES, 'UTF-8') . '" />',
        '  <link rel="icon" href="' . htmlspecialchars($faviconUrl, ENT_QUOTES, 'UTF-8') . '" />',
        '  <link rel="apple-touch-icon" href="' . htmlspecialchars($faviconUrl, ENT_QUOTES, 'UTF-8') . '" />',
    ];

    $fontFaceCss = '';
    $emittedUrls = [];
    foreach ($fontsList as $fItem) {
        $fUrl = normalizeBrandingFontUrl((string) ($fItem['font_url'] ?? ''));
        if ($fUrl === '' && isset($presetSpecs[$fItem['font_name']]['font_url'])) {
            $fUrl = (string) $presetSpecs[$fItem['font_name']]['font_url'];
        }
        if ($fUrl !== '' && !isset($emittedUrls[$fUrl]) && preg_match('#^https?://#i', $fUrl)) {
            $emittedUrls[$fUrl] = true;
            $lines[] = '  <link rel="stylesheet" href="' . htmlspecialchars($fUrl, ENT_QUOTES, 'UTF-8') . '" />';
        }
        $fp = trim((string) ($fItem['file_path'] ?? ''));
        if ($fp !== '') {
            $safeFamily = str_replace(['\'', '"', '\\'], '', trim((string) $fItem['font_name']));
            $fmt = in_array($fItem['font_format'], ['woff2', 'woff', 'truetype', 'opentype'], true) ? $fItem['font_format'] : 'woff2';
            $fontFaceCss .= "@font-face{font-family:'{$safeFamily}';src:url('" . htmlspecialchars($fp, ENT_QUOTES, 'UTF-8') . "') format('{$fmt}');font-weight:100 900;font-style:normal;font-display:swap;}\n";
        }
    }
    if (isset($presetSpecs[$activeFontKey]['font_url'])) {
        $activePresetUrl = (string) $presetSpecs[$activeFontKey]['font_url'];
        if ($activePresetUrl !== '' && !isset($emittedUrls[$activePresetUrl])) {
            $emittedUrls[$activePresetUrl] = true;
            $lines[] = '  <link rel="stylesheet" href="' . htmlspecialchars($activePresetUrl, ENT_QUOTES, 'UTF-8') . '" />';
        }
    }
    if ($fontFaceCss !== '') {
        $lines[] = '  <style id="ability-branding-fonts">' . "\n" . $fontFaceCss . '  </style>';
    }

    $lines[] = '  <style id="ability-branding-vars">';
    $lines[] = '    :root {';
    $lines[] = '      --brand-primary: ' . $primary . ';';
    $lines[] = '      --brand-accent: ' . $accent . ';';
    $lines[] = '      --brand-neutral: ' . $neutral . ';';
    $lines[] = '      --brand-purple: ' . $primary . ';';
    $lines[] = '      --brand-logo-size: ' . $logoSizePx . ';';
    $lines[] = '      --font-sans: ' . $fontStack . ';';
    $lines[] = '      --font-marvel: ' . $fontStack . ';';
    $lines[] = '      --font-mono: ' . $monoStack . ';';
    $lines[] = '      --brand-font-family: ' . $fontStack . ';';
    $lines[] = '      --brand-font-scale: ' . $scaleNum . ';';
    $lines[] = '      --app-font-scale: ' . $scaleNum . ';';
    $lines[] = '      --brand-text-align: ' . $align . ';';
    $lines[] = '      --app-text-align: ' . $align . ';';
    $lines[] = '    }';
    $lines[] = '    body, button, input, select, textarea {';
    $lines[] = '      font-family: var(--brand-font-family, var(--font-sans));';
    $lines[] = '    }';
    $lines[] = '    [data-theme="dark"] {';
    $lines[] = '      --brand-primary: ' . $darkPrimary . ';';
    $lines[] = '      --brand-accent: ' . $darkAccent . ';';
    $lines[] = '      --brand-purple: ' . $darkPrimary . ';';
    $lines[] = '    }';
    $lines[] = '  </style>';
    $lines[] = '  <script>';
    $lines[] = '    window.__ABILITY_BRANDING__ = ' . json_encode($b) . ';';
    $lines[] = '    window.__ABILITY_FONTS__ = ' . json_encode($fontsList) . ';';
    $lines[] = '    (function(){try{var d=' . json_encode($defTheme) . ';var s=localStorage.getItem("ability_theme");if(!s&&(d==="dark"||d==="light")){document.documentElement.setAttribute("data-theme",d);}document.documentElement.setAttribute("data-text-align",' . json_encode($align) . ');var n=' . $brandNameJson . ';var lg=' . $logoUrlJson . ';var fav=' . $faviconUrlJson . ';if(fav){document.querySelectorAll("link[rel*=\'icon\']").forEach(function(lk){lk.href=fav;});}document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll(".brand-name,.js-brand-name").forEach(function(el){if(n)el.textContent=n;});if(lg){document.querySelectorAll(".brand-mark-wrap img, img.js-brand-logo-img, img[data-brand-logo=\'1\']").forEach(function(img){img.src=lg;img.setAttribute("data-brand-logo","1");if(n)img.alt=n;});}});}catch(e){}})();';
    $lines[] = '  </script>';

    return implode("\n", $lines);
}

function calculateHaversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earthR = 6371000.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
        cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) * sin($dLng / 2);
    $c = 2 * atan2(sqrt($a), sqrt(max(0.0, 1.0 - $a)));
    return $earthR * $c;
}

function base32Encode(string $binary): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    $len = strlen($binary);
    for ($i = 0; $i < $len; $i++) {
        $bits .= str_pad(decbin(ord($binary[$i])), 8, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 5) as $chunk) {
        if (strlen($chunk) < 5) {
            $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
        }
        $out .= $alphabet[bindec($chunk)];
    }
    return $out;
}

function base32Decode(string $b32): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $clean = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32));
    $bits = '';
    $len = strlen($clean);
    for ($i = 0; $i < $len; $i++) {
        $pos = strpos($alphabet, $clean[$i]);
        if ($pos === false) continue;
        $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 8) as $byte) {
        if (strlen($byte) === 8) {
            $out .= chr(bindec($byte));
        }
    }
    return $out;
}

function computeTotpCode(string $secretB32, ?int $timeSlice = null): string
{
    $slice = $timeSlice ?? (int) floor(time() / 30);
    $secretKey = base32Decode($secretB32);
    if ($secretKey === '') {
        return '000000';
    }
    $timeBin = pack('N*', 0) . pack('N*', $slice);
    $hash = hash_hmac('sha1', $timeBin, $secretKey, true);
    $offset = ord($hash[strlen($hash) - 1]) & 0x0F;
    $truncated = (
        ((ord($hash[$offset]) & 0x7F) << 24) |
        ((ord($hash[$offset + 1]) & 0xFF) << 16) |
        ((ord($hash[$offset + 2]) & 0xFF) << 8) |
        (ord($hash[$offset + 3]) & 0xFF)
    );
    return str_pad((string) ($truncated % 1000000), 6, '0', STR_PAD_LEFT);
}

function verifyTotpCode(string $secretB32, string $code, int $window = 1): bool
{
    $cleanCode = preg_replace('/\D/', '', trim($code));
    if (strlen($cleanCode) !== 6) {
        return false;
    }
    $curSlice = (int) floor(time() / 30);
    for ($i = -$window; $i <= $window; $i++) {
        if (hash_equals(computeTotpCode($secretB32, $curSlice + $i), $cleanCode)) {
            return true;
        }
    }
    return false;
}

function maskPhoneNumber(string $phone): string
{
    $trim = trim($phone);
    if ($trim === '') return '';
    if (strlen($trim) <= 6) return '***';
    return substr($trim, 0, 4) . ' *** ' . substr($trim, -3);
}

/**
 * Retrieves or generates the server-side HMAC signing secret for rotating QR tokens.
 */
function getQrHmacSecret(PDO $pdo): string
{
    static $cached = null;
    if ($cached !== null && $cached !== '') {
        return $cached;
    }
    try {
        $st = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'qr_hmac_secret' LIMIT 1");
        $st->execute();
        $val = trim((string) ($st->fetchColumn() ?: ''));
        if ($val !== '') {
            $cached = $val;
            return $cached;
        }
        $secret = bin2hex(random_bytes(32));
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('qr_hmac_secret', ?) ON DUPLICATE KEY UPDATE `setting_value` = COALESCE(NULLIF(`setting_value`, ''), VALUES(`setting_value`))")
            ->execute([$secret]);
        $st->execute();
        $cached = trim((string) ($st->fetchColumn() ?: $secret));
        return $cached;
    } catch (Throwable $e) {
        return hash('sha256', __FILE__ . '::ability_qr_fallback');
    }
}

/**
 * Generates a short-lived HMAC-SHA256 signed personal pass token (`ABPASS1.<uid>.<slice>.<nonce>.<sig>`).
 */
function buildSignedDynamicPassToken(PDO $pdo, int $userId, int $ttlSlice = 30): array
{
    $ttlSlice = max(15, min(120, $ttlSlice));
    $now = time();
    $slice = (int) floor($now / $ttlSlice);
    $nonce = bin2hex(random_bytes(5)); // 10 hex chars
    $payload = "ABPASS1.{$userId}.{$slice}.{$nonce}";
    $secret = getQrHmacSecret($pdo);
    $sig = substr(hash_hmac('sha256', $payload, $secret), 0, 16);
    $expiresIn = $ttlSlice - ($now % $ttlSlice);
    return [
        'token' => "{$payload}.{$sig}",
        'slice' => $slice,
        'ttl_seconds' => $ttlSlice,
        'expires_in' => $expiresIn > 0 ? $expiresIn : $ttlSlice,
    ];
}

/**
 * Validates syntax, HMAC signature, and time window (±1 slice) of an `ABPASS1` QR pass token.
 */
function verifySignedDynamicPassToken(PDO $pdo, string $token, int $ttlSlice = 30): ?array
{
    $clean = trim($token);
    if (strpos($clean, 'ABPASS1.') !== 0) {
        return null;
    }
    $parts = explode('.', $clean);
    if (count($parts) !== 5) {
        return null;
    }
    [$prefix, $uidStr, $sliceStr, $nonce, $sig] = $parts;
    if ($prefix !== 'ABPASS1' || !ctype_digit($uidStr) || !ctype_digit($sliceStr) || !preg_match('/^[a-f0-9]{8,24}$/i', $nonce) || !preg_match('/^[a-f0-9]{16}$/i', $sig)) {
        return null;
    }
    $uid = (int) $uidStr;
    $slice = (int) $sliceStr;
    if ($uid <= 0) {
        return null;
    }
    $secret = getQrHmacSecret($pdo);
    $expected = substr(hash_hmac('sha256', "{$prefix}.{$uid}.{$slice}.{$nonce}", $secret), 0, 16);
    if (!hash_equals(strtolower($expected), strtolower($sig))) {
        return ['valid' => false, 'user_id' => $uid, 'error' => 'Forged or tampered QR pass signature.'];
    }
    $curSlice = (int) floor(time() / $ttlSlice);
    if (abs($curSlice - $slice) > 1) {
        return ['valid' => false, 'user_id' => $uid, 'error' => 'Dynamic Pass QR expired (screenshot > 60s old). Ask staff to refresh their live pass.'];
    }
    return [
        'valid' => true,
        'user_id' => $uid,
        'slice' => $slice,
        'nonce' => strtolower($nonce),
    ];
}

/**
 * Atomically consumes a single-use QR nonce to block screenshot replay inside the active TTL window.
 */
function consumeQrNonce(
    PDO $pdo,
    string $nonceRaw,
    int $userId,
    string $kind = 'pass',
    string $cpType = '',
    string $cpId = '',
    int $ttlSeconds = 120
): bool {
    try {
        $pdo->exec("DELETE FROM `qr_scan_nonces` WHERE `expires_at` < NOW()");
    } catch (Throwable $e) {}
    $hash = hash('sha256', $kind . ':' . $userId . ':' . strtolower(trim($nonceRaw)));
    $expSql = date('Y-m-d H:i:s', time() + max(30, $ttlSeconds));
    $st = $pdo->prepare("
        INSERT IGNORE INTO `qr_scan_nonces` (`nonce_hash`, `user_id`, `token_kind`, `checkpoint_type`, `checkpoint_id`, `expires_at`)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $st->execute([$hash, $userId, $kind, $cpType !== '' ? $cpType : null, $cpId !== '' ? $cpId : null, $expSql]);
    return $st->rowCount() === 1;
}

/**
 * Verifies or binds a user's physical device token to block proxy sign-ins from another user's phone.
 */
function verifyOrBindTrustedDevice(
    PDO $pdo,
    int $userId,
    string $rawDeviceToken,
    string $deviceLabel = 'Mobile / Browser',
    bool $allowAutoBindFirst = true
): array {
    $cleanTok = trim($rawDeviceToken);
    if ($cleanTok === '' || strlen($cleanTok) < 16) {
        return ['ok' => false, 'error' => 'Missing device identity token. Enable cookies/storage on your own phone and retry.'];
    }
    $tokHash = hash('sha256', $cleanTok);
    $ua = substr(trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 250);

    // Prevent a single physical device from simultaneously pretending to be multiple users in the last 12 hours
    $otherSt = $pdo->prepare("SELECT `user_id` FROM `user_trusted_devices` WHERE `device_token_hash` = ? AND `is_active` = 1 AND `user_id` != ? LIMIT 1");
    $otherSt->execute([$tokHash, $userId]);
    if ($otherSt->fetchColumn()) {
        return ['ok' => false, 'error' => 'Anti-shadowing lock: this device is already bound to another staff member. An Admin or Site Manager must reset device bindings to switch owners.'];
    }

    $activeSt = $pdo->prepare("SELECT `id`, `device_token_hash`, `device_label` FROM `user_trusted_devices` WHERE `user_id` = ? AND `is_active` = 1 ORDER BY `id` DESC");
    $activeSt->execute([$userId]);
    $activeDevices = $activeSt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($activeDevices as $dev) {
        if (hash_equals((string) $dev['device_token_hash'], $tokHash)) {
            $pdo->prepare("UPDATE `user_trusted_devices` SET `last_seen_at` = NOW(), `user_agent` = ? WHERE `id` = ?")
                ->execute([$ua, (int) $dev['id']]);
            return ['ok' => true, 'device_id' => (int) $dev['id'], 'newly_bound' => false];
        }
    }

    if (!empty($activeDevices)) {
        return [
            'ok' => false,
            'device_mismatch' => true,
            'error' => 'Device mismatch: your account is bound to another phone (' . ($activeDevices[0]['device_label'] ?: 'Registered Device') . '). Rebind using your 6-digit TOTP code or ask an Admin / Site Manager to reset your device lock.',
        ];
    }

    if (!$allowAutoBindFirst) {
        return ['ok' => false, 'error' => 'This device is not bound to your account yet.'];
    }

    $ins = $pdo->prepare("INSERT INTO `user_trusted_devices` (`user_id`, `device_token_hash`, `device_label`, `user_agent`, `is_active`, `last_seen_at`) VALUES (?, ?, ?, ?, 1, NOW())");
    $ins->execute([$userId, $tokHash, substr(trim($deviceLabel) ?: 'Mobile / Browser', 0, 120), $ua]);
    return ['ok' => true, 'device_id' => (int) $pdo->lastInsertId(), 'newly_bound' => true];
}

/**
 * Records an event dispatch workflow action so the Dispatch Tree can display live actions per role.
 */
function logEventDispatchAction(
    PDO $pdo,
    string $eventId,
    int $actorId,
    string $actorRole,
    string $actionType,
    string $summary,
    array $payload = []
): void {
    try {
        $st = $pdo->prepare("
            INSERT INTO `event_dispatch_logs` (`event_id`, `actor_id`, `actor_role`, `action_type`, `summary`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $st->execute([
            $eventId,
            $actorId,
            strtolower(trim($actorRole)),
            $actionType,
            substr($summary, 0, 250),
            !empty($payload) ? json_encode($payload) : null,
        ]);
    } catch (Throwable $e) {}
}

/**
 * Recomputes `events.dispatch_status` based on technical requirements and confirmed crew assignments.
 */
function recalculateEventDispatchStatus(PDO $pdo, string $eventId): string
{
    try {
        $evSt = $pdo->prepare("SELECT `id`, `tech_lead`, `tech_lead_approved`, `security_manager`, `security_manager_approved`, `requirements_json`, `dispatch_status` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
        $evSt->execute([$eventId, $eventId]);
        $ev = $evSt->fetch(PDO::FETCH_ASSOC);
        if (!$ev) {
            return 'draft';
        }
        $realId = (string) $ev['id'];
        $reqs = json_decode((string) ($ev['requirements_json'] ?? ''), true);
        $branchesReq = is_array($reqs) ? (array) ($reqs['branches'] ?? []) : [];
        $hasReq = !empty(array_filter($branchesReq, static fn($v) => (int) $v > 0));
        $tlClean = trim((string) ($ev['tech_lead'] ?? ''));
        $hasTechLead = ($tlClean !== '' && strtolower($tlClean) !== 'tech lead');
        $isTlApproved = ((int) ($ev['tech_lead_approved'] ?? 0) === 1);

        $smClean = trim((string) ($ev['security_manager'] ?? ''));
        $hasSecMgr = ($smClean !== '' && !in_array(strtolower($smClean), ['security manager', 'unassigned'], true));
        $isSmApproved = ((int) ($ev['security_manager_approved'] ?? 0) === 1);
        $supportNeed = max(0, (int) ($branchesReq['Support Staff'] ?? 0));

        $pendingSupReqs = 0;
        try {
            $srSt = $pdo->prepare("SELECT COUNT(*) FROM `event_support_requests` WHERE `event_id` = ? AND LOWER(`status`) = 'pending'");
            $srSt->execute([$realId]);
            $pendingSupReqs = (int) $srSt->fetchColumn();
        } catch (Throwable $e) {}

        $asgSt = $pdo->prepare("SELECT `branch_dept`, `confirmation_status` FROM `event_crew_assignments` WHERE `event_id` = ?");
        $asgSt->execute([$realId]);
        $rows = $asgSt->fetchAll(PDO::FETCH_ASSOC);

        $confirmedByBranch = [];
        $hasPendingOrDeclinedTech = false;
        $hasPendingOrDeclinedSupport = false;
        $techRowCount = 0;
        $supportRowCount = 0;
        $supportConfirmedCount = 0;
        foreach ($rows as $r) {
            $st = strtolower((string) ($r['confirmation_status'] ?? 'pending'));
            $brRaw = trim((string) ($r['branch_dept'] ?? 'Sound'));
            $isSupportRow = (strcasecmp($brRaw, 'Support Staff') === 0);
            if ($isSupportRow) {
                $supportRowCount++;
                if ($st === 'confirmed') {
                    $supportConfirmedCount++;
                    $confirmedByBranch['Support Staff'] = ($confirmedByBranch['Support Staff'] ?? 0) + 1;
                } else {
                    $hasPendingOrDeclinedSupport = true;
                }
                continue;
            }
            $techRowCount++;
            $branches = array_filter(array_map('trim', explode('/', $brRaw)));
            if (empty($branches)) {
                $branches = ['Sound'];
            }
            if ($st === 'confirmed') {
                foreach ($branches as $br) {
                    $confirmedByBranch[$br] = ($confirmedByBranch[$br] ?? 0) + 1;
                }
            } else {
                $hasPendingOrDeclinedTech = true;
            }
        }

        $hasSupportScope = ($hasSecMgr || $supportNeed > 0 || $pendingSupReqs > 0 || $supportRowCount > 0);
        $supportReady = true;
        if ($hasSupportScope) {
            $smGateOk = !$hasSecMgr || $isSmApproved;
            $supportCountOk = ($supportNeed > 0) ? ($supportConfirmedCount >= $supportNeed) : ($supportRowCount > 0 || $isSmApproved);
            $supportReady = $smGateOk && ($pendingSupReqs === 0) && !$hasPendingOrDeclinedSupport && $supportCountOk;
        }

        if ($hasTechLead && !$isTlApproved) {
            $next = 'awaiting_approval_from_tech_lead';
            $pdo->prepare("UPDATE `events` SET `dispatch_status` = ? WHERE `id` = ?")->execute([$next, $realId]);
            return $next;
        }

        if (empty($rows) && !$hasSupportScope) {
            if ($hasTechLead && $isTlApproved) {
                $next = 'approved_by_tech_lead';
            } elseif ($hasReq) {
                $next = 'requirements_sent';
            } else {
                $next = 'draft';
            }
            $pdo->prepare("UPDATE `events` SET `dispatch_status` = ? WHERE `id` = ?")->execute([$next, $realId]);
            return $next;
        }

        $techAllMet = !$hasPendingOrDeclinedTech;
        $hasTechBranchReq = false;
        foreach ($branchesReq as $brName => $needCnt) {
            if (strcasecmp((string) $brName, 'Support Staff') === 0) {
                continue;
            }
            if ((int) $needCnt > 0) {
                $hasTechBranchReq = true;
                if (($confirmedByBranch[$brName] ?? 0) < (int) $needCnt) {
                    $techAllMet = false;
                }
            }
        }
        if ($hasTechLead && $techRowCount === 0 && $hasTechBranchReq) {
            $techAllMet = false;
        }
        if ($hasTechLead && !$hasTechBranchReq && $techRowCount === 0) {
            $techAllMet = false;
        }

        if ($techAllMet && $supportReady) {
            $next = 'ready';
        } elseif ($techAllMet && $hasSupportScope && $hasSecMgr && !$isSmApproved) {
            $next = 'awaiting_approval_from_security_manager';
        } elseif ($hasTechLead && $isTlApproved && $techRowCount === 0 && $supportRowCount === 0) {
            $next = 'approved_by_tech_lead';
        } else {
            $next = 'staffing_in_progress';
        }

        $pdo->prepare("UPDATE `events` SET `dispatch_status` = ? WHERE `id` = ?")->execute([$next, $realId]);
        return $next;
    } catch (Throwable $e) {
        return 'draft';
    }
}
