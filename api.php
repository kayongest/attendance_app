<?php
/**
 * aBility Manager (id_badges.php#pane-kiosk) — Gate Terminal & Access Matrix API
 * Powers the 4-Tier Access Matrix (L1-L4), Dual Checkpoint Selector (Stock Warehouse vs Event Venue),
 * Paired Check-In / Check-Out State Machine, Linked Equipment Batches, and User Activity Timeline.
 */

declare(strict_types=1);

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
$reqOrigin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
$serverHost = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
if ($reqOrigin !== '' && $serverHost !== '') {
    $originHost = (string) (parse_url($reqOrigin, PHP_URL_HOST) ?? '');
    $originPort = parse_url($reqOrigin, PHP_URL_PORT);
    $originHostPort = $originHost . ($originPort ? ':' . $originPort : '');
    if (strcasecmp($originHostPort, $serverHost) === 0 || strcasecmp($originHost, explode(':', $serverHost)[0]) === 0) {
        header('Access-Control-Allow-Origin: ' . $reqOrigin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

function hexToRgbString(string $hex): string
{
    $clean = ltrim($hex, '#');
    if (strlen($clean) === 3) {
        $r = hexdec(substr($clean, 0, 1) . substr($clean, 0, 1));
        $g = hexdec(substr($clean, 1, 1) . substr($clean, 1, 1));
        $b = hexdec(substr($clean, 2, 1) . substr($clean, 2, 1));
    } elseif (strlen($clean) >= 6) {
        $r = hexdec(substr($clean, 0, 2));
        $g = hexdec(substr($clean, 2, 2));
        $b = hexdec(substr($clean, 4, 2));
    } else {
        return '37, 99, 235';
    }
    return "{$r}, {$g}, {$b}";
}

function getClearanceMatrixFromDb(PDO $pdo, array $tierCounts = []): array
{
    try {
        $stmt = $pdo->query("SELECT * FROM `access_clearance_levels` ORDER BY `sort_order` ASC, `id` ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($rows)) {
            $list = [];
            foreach ($rows as $r) {
                $code = strtoupper(trim((string)$r['code']));
                $color = trim((string)($r['color'] ?: '#2563eb'));
                $venueRule = strtoupper(trim((string)($r['venue_rule'] ?: 'YES')));
                $stockRule = strtoupper(trim((string)($r['stock_rule'] ?: 'NO')));
                $title = trim((string)$r['title']);
                $short = trim((string)($r['short_name'] ?: $title));
                $key = trim((string)$r['level_key']);

                $list[] = [
                    'id' => (int) $r['id'],
                    'key' => $key,
                    'level_key' => $key,
                    'code' => $code,
                    'title' => $title,
                    'short' => $short,
                    'short_name' => $short,
                    'color' => $color,
                    'bg' => $r['bg'] ?: '#f8fafc',
                    'border' => $r['border'] ?: '#e2e8f0',
                    'badge_bg' => $r['badge_bg'] ?: ('rgba(' . hexToRgbString($color) . ', 0.14)'),
                    'icon' => $r['icon'] ?: 'fa-shield-halved',
                    'description' => trim((string)($r['description'] ?? '')),
                    'venue_rule' => $venueRule,
                    'venue_Rule' => $venueRule,
                    'stock_rule' => $stockRule,
                    'is_system' => (int) ($r['is_system'] ?? 0),
                    'is_active' => (int) ($r['is_active'] ?? 1),
                    'sort_order' => (int) ($r['sort_order'] ?? 0),
                    'member_count' => $tierCounts[$code] ?? 0,
                ];
            }
            return $list;
        }
    } catch (Throwable $e) {}

    // Fallback if table query fails
    $rawMatrix = getFourTierMatrixSpec();
    $clearanceMatrix = [];
    foreach (['L1_VENUE_BASIC', 'L2_TECH_STAGE', 'L3_STOCK_WAREHOUSE', 'L4_ALL_ACCESS'] as $mKey) {
        $m = $rawMatrix[$mKey];
        $m['id'] = 0;
        $m['level_key'] = $mKey;
        $m['short_name'] = $m['short'] ?? $m['title'];
        $m['is_system'] = 1;
        $m['is_active'] = 1;
        $m['member_count'] = $tierCounts[$m['code']] ?? 0;
        $clearanceMatrix[] = $m;
    }
    return $clearanceMatrix;
}

function normalizeClearanceTier(string $rawLevel, string $role = 'user'): array
{
    static $cachedMatrix = null;
    if ($cachedMatrix === null) {
        $cachedMatrix = [];
        try {
            $dummy = '';
            $pdo = getDbConnection($dummy);
            $stmt = $pdo->query("SELECT * FROM `access_clearance_levels` ORDER BY `sort_order` ASC, `id` ASC");
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $code = strtoupper(trim((string)$r['code']));
                $key = strtoupper(trim((string)$r['level_key']));
                $color = trim((string)($r['color'] ?: '#2563eb'));
                $venueRule = strtoupper(trim((string)($r['venue_rule'] ?: 'YES')));
                $stockRule = strtoupper(trim((string)($r['stock_rule'] ?: 'NO')));
                $spec = [
                    'id' => (int)$r['id'],
                    'key' => $key,
                    'level_key' => $key,
                    'code' => $code,
                    'title' => trim((string)$r['title']),
                    'short' => trim((string)($r['short_name'] ?: $r['title'])),
                    'short_name' => trim((string)($r['short_name'] ?: $r['title'])),
                    'color' => $color,
                    'bg' => $r['bg'] ?: '#f8fafc',
                    'border' => $r['border'] ?: '#e2e8f0',
                    'badge_bg' => $r['badge_bg'] ?: ('rgba(' . hexToRgbString($color) . ', 0.14)'),
                    'icon' => $r['icon'] ?: 'fa-shield-halved',
                    'description' => trim((string)($r['description'] ?? '')),
                    'venue_rule' => $venueRule,
                    'venue_Rule' => $venueRule,
                    'stock_rule' => $stockRule,
                    'stock_access' => in_array(strtolower($stockRule), ['all', 'full']) ? 'all' : (strtolower($stockRule) === 'yes' ? 'assigned_or_all' : 'none'),
                    'venue_access' => strtolower($venueRule) === 'all' ? 'all' : 'assigned_or_all',
                    'is_system' => (int)($r['is_system'] ?? 0),
                    'is_active' => (int)($r['is_active'] ?? 1),
                ];
                $cachedMatrix[$key] = $spec;
                $cachedMatrix[$code] = $spec;
            }
        } catch (Throwable $e) {}

        if (empty($cachedMatrix)) {
            $cachedMatrix = getFourTierMatrixSpec();
        }
    }

    $upper = strtoupper(trim($rawLevel));
    if (isset($cachedMatrix[$upper])) {
        return $cachedMatrix[$upper];
    }
    // Check prefix
    foreach ($cachedMatrix as $k => $spec) {
        if ($k === $upper || (strlen($k) >= 2 && strpos($upper, $k) === 0)) {
            return $spec;
        }
    }

    $r = strtolower(trim($role));
    if (in_array($r, ['admin', 'manager', 'stock_manager', 'tech_lead'], true)) {
        return $cachedMatrix['L4_ALL_ACCESS'] ?? $cachedMatrix['L4'] ?? reset($cachedMatrix);
    }
    if ($r === 'stock_controller') {
        return $cachedMatrix['L3_STOCK_WAREHOUSE'] ?? $cachedMatrix['L3'] ?? reset($cachedMatrix);
    }
    if ($r === 'technician') {
        return $cachedMatrix['L2_TECH_STAGE'] ?? $cachedMatrix['L2'] ?? reset($cachedMatrix);
    }
    return $cachedMatrix['L1_VENUE_BASIC'] ?? $cachedMatrix['L1'] ?? reset($cachedMatrix);
}

function formatRewBadgeCode(int $userId, ?string $dbBadgeCode = null): string
{
    $trimmed = strtoupper(trim((string) $dbBadgeCode));
    if (strpos($trimmed, 'REW-BADGE-') === 0) {
        return $trimmed;
    }
    return 'REW-BADGE-' . str_pad((string) $userId, 4, '0', STR_PAD_LEFT);
}

function formatStaffCode(int $userId): string
{
    return 'ABL-' . str_pad((string) $userId, 3, '0', STR_PAD_LEFT);
}

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

function computeInitials(string $fullName): string
{
    $parts = preg_split('/\s+/', trim($fullName)) ?: [];
    if (count($parts) >= 2) {
        return strtoupper(substr($parts[0], 0, 1) . substr($parts[count($parts) - 1], 0, 1));
    }
    return strtoupper(substr(trim($fullName), 0, 2) ?: 'CR');
}

function evaluateCheckpointAccess(array $userBadgeRow, string $checkpointType, int $checkpointId): array
{
    $badgeStatus = strtolower(trim((string) ($userBadgeRow['badge_status'] ?? 'active')));
    $tier = normalizeClearanceTier(
        (string) ($userBadgeRow['clearance_level'] ?? ''),
        (string) ($userBadgeRow['role'] ?? 'user')
    );

    if ($badgeStatus !== 'active') {
        return [
            'allowed' => false,
            'reason' => 'ID Badge is currently ' . strtoupper($badgeStatus) . ' — Contact System Admin',
            'tier' => $tier,
        ];
    }

    if ($checkpointType === 'stock_warehouse') {
        $stockMode = strtolower(trim((string) ($userBadgeRow['stock_access_mode'] ?? '')));
        if ($tier['code'] === 'L1' || $stockMode === 'none') {
            return [
                'allowed' => false,
                'reason' => 'Level 1 (Venue Crew) is not authorized for Stock Warehouses',
                'tier' => $tier,
            ];
        }
        if ($stockMode === 'selected') {
            $allowedIds = json_decode((string) ($userBadgeRow['allowed_stock_ids'] ?? '[]'), true);
            if (is_array($allowedIds) && !empty($allowedIds) && !in_array($checkpointId, array_map('intval', $allowedIds), true)) {
                return [
                    'allowed' => false,
                    'reason' => 'Badge restricted to specific Stock Warehouses only',
                    'tier' => $tier,
                ];
            }
        }
        return [
            'allowed' => true,
            'reason' => 'Authorized for Stock Warehouse access (' . $tier['code'] . ' — ' . $tier['short'] . ')',
            'tier' => $tier,
        ];
    }

    // Event Venue access
    $venueMode = strtolower(trim((string) ($userBadgeRow['venue_access_mode'] ?? 'all')));
    if ($venueMode === 'none' && $tier['code'] !== 'L4') {
        return [
            'allowed' => false,
            'reason' => 'Badge has Venue Access disabled',
            'tier' => $tier,
        ];
    }

    return [
        'allowed' => true,
        'reason' => 'Authorized for Event Venue access (' . $tier['code'] . ' — ' . $tier['short'] . ')',
        'tier' => $tier,
    ];
}

function getLinkedBatchesForUser(PDO $pdo, int $userId, string $fullName = '', string $username = ''): array
{
    $batches = [];
    try {
        $sql = "
            SELECT
                sm.`id`,
                sm.`batch_number`,
                sm.`movement_type`,
                sm.`source_name`,
                sm.`destination_name`,
                sm.`destination_room`,
                sm.`technician_id`,
                sm.`submitted_by`,
                sm.`stock_controller_name`,
                sm.`status`,
                sm.`approval_status`,
                sm.`event_name`,
                sm.`job_sheet`,
                sm.`created_at`
            FROM `stock_movements` sm
            WHERE sm.`technician_id` = :uid
               OR (sm.`submitted_by` IS NOT NULL AND sm.`submitted_by` != '' AND (LOWER(sm.`submitted_by`) = LOWER(:fname) OR LOWER(sm.`submitted_by`) = LOWER(:uname)))
            ORDER BY sm.`id` DESC
            LIMIT 5
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $userId,
            ':fname' => $fullName,
            ':uname' => $username,
        ]);
        $rows = $stmt->fetchAll();

        $itemStmt = $pdo->prepare("SELECT `item_name`, `quantity` FROM `batch_items` WHERE `batch_id` = ? LIMIT 10");
        foreach ($rows as $r) {
            $bid = (int) $r['id'];
            $items = [];
            try {
                $itemStmt->execute([$bid]);
                $items = $itemStmt->fetchAll();
            } catch (Throwable $e) {
                $items = [];
            }
            $batches[] = [
                'id' => $bid,
                'batch_number' => (string) ($r['batch_number'] ?? ('BATCH-' . $bid)),
                'movement_type' => (string) ($r['movement_type'] ?? 'dispatch'),
                'source_name' => (string) ($r['source_name'] ?? 'Ndera Warehouse'),
                'destination_name' => (string) ($r['destination_name'] ?? 'Kigali Convention Centre'),
                'destination_room' => (string) ($r['destination_room'] ?? 'Main Stage'),
                'technician_id' => (int) ($r['technician_id'] ?? $userId),
                'submitted_by' => (string) ($r['submitted_by'] ?? $fullName),
                'stock_controller_name' => (string) ($r['stock_controller_name'] ?? 'Mirene'),
                'status' => (string) ($r['status'] ?? $r['approval_status'] ?? 'approved'),
                'event_name' => (string) ($r['event_name'] ?? 'World Bank Summit'),
                'job_sheet' => (string) ($r['job_sheet'] ?? 'JS-2026-104'),
                'created_at' => (string) ($r['created_at'] ?? date('Y-m-d H:i:s')),
                'items' => $items,
            ];
        }
    } catch (Throwable $e) {
        // Fallback if stock_movements in ability_db has slightly different columns
        try {
            $stmt = $pdo->prepare("SELECT * FROM `stock_movements` WHERE `technician_id` = ? ORDER BY `id` DESC LIMIT 5");
            $stmt->execute([$userId]);
            foreach ($stmt->fetchAll() as $r) {
                $batches[] = [
                    'id' => (int) $r['id'],
                    'batch_number' => (string) ($r['batch_number'] ?? ('BATCH-' . $r['id'])),
                    'movement_type' => (string) ($r['movement_type'] ?? 'dispatch'),
                    'source_name' => (string) ($r['source_name'] ?? 'Ndera Warehouse'),
                    'destination_name' => (string) ($r['destination_name'] ?? 'Kigali Convention Centre'),
                    'destination_room' => (string) ($r['destination_room'] ?? ''),
                    'technician_id' => $userId,
                    'submitted_by' => (string) ($r['submitted_by'] ?? $fullName),
                    'stock_controller_name' => (string) ($r['stock_controller_name'] ?? 'Mirene'),
                    'status' => (string) ($r['status'] ?? $r['approval_status'] ?? 'approved'),
                    'event_name' => (string) ($r['event_name'] ?? 'Active Production'),
                    'job_sheet' => (string) ($r['job_sheet'] ?? ''),
                    'created_at' => (string) ($r['created_at'] ?? ''),
                    'items' => [],
                ];
            }
        } catch (Throwable $e2) {
        }
    }

    return $batches;
}

function buildVerificationCardPayload(
    PDO $pdo,
    array $crewMember,
    string $checkpointType,
    int $checkpointId,
    string $checkpointName,
    ?array $overrideScanResult = null
): array {
    $eval = evaluateCheckpointAccess($crewMember, $checkpointType, $checkpointId);
    $allowed = $overrideScanResult['allowed'] ?? $eval['allowed'];
    $reason = $overrideScanResult['reason'] ?? $eval['reason'];
    $action = $overrideScanResult['action'] ?? ($crewMember['daily_state'] === 'checked_out' ? 'check_out' : 'check_in');
    $punctuality = $overrideScanResult['punctuality'] ?? strtolower((string) ($crewMember['punctuality_code'] ?? 'on_time'));
    $punctualityLabel = $overrideScanResult['punctuality_label'] ?? (string) ($crewMember['punctuality'] ?? 'ON TIME');

    $checkInFull = $overrideScanResult['check_in_time'] ?? ($crewMember['check_in_full'] ?? null);
    $checkOutFull = $overrideScanResult['check_out_time'] ?? ($crewMember['check_out_full'] ?? null);

    $roleUpper = strtoupper(str_replace('_', ' ', (string) ($crewMember['role'] ?? 'TECHNICIAN')));
    $deptUpper = strtoupper(trim((string) ($crewMember['department'] ?? 'OPERATIONS')));
    $rolePill = $roleUpper . ' - ' . $deptUpper;

    $callTime = $overrideScanResult['call_time'] ?? '08:00';
    $nowTs = time();
    $schedTs = strtotime(date('Y-m-d') . ' ' . $callTime . ':00') ?: strtotime(date('Y-m-d 08:00:00'));
    $diffMinutes = (int) round(($nowTs - $schedTs) / 60);

    return [
        'ok' => true,
        'allowed' => (bool) $allowed,
        'reason' => (string) $reason,
        'action' => (string) $action,
        'punctuality' => (string) $punctuality,
        'punctuality_label' => (string) $punctualityLabel,
        'call_time' => $callTime,
        'diff_minutes' => $diffMinutes,
        'checkpoint_type' => $checkpointType,
        'checkpoint_id' => $checkpointId,
        'checkpoint_name' => $checkpointName,
        'scanned_at' => $overrideScanResult['scanned_at'] ?? date('H:i:s'),
        'check_in_time' => $checkInFull,
        'check_out_time' => $checkOutFull,
        'linked_batches' => $crewMember['linked_batches'] ?? [],
        'badge' => [
            'user_id' => (int) $crewMember['id'],
            'full_name' => (string) $crewMember['full_name'],
            'username' => (string) $crewMember['username'],
            'role' => (string) $crewMember['role'],
            'role_pill' => $rolePill,
            'department' => (string) $crewMember['department'],
            'phone' => (string) $crewMember['phone'],
            'profile_image' => $crewMember['profile_image_url'],
            'initials' => (string) $crewMember['initials'],
            'badge_code' => (string) $crewMember['badge_code'],
            'raw_badge_code' => (string) $crewMember['raw_badge_code'],
            'staff_code' => (string) $crewMember['staff_code'],
            'clearance_level' => (string) $crewMember['clearance_level'],
            'clearance_code' => (string) $crewMember['clearance_code'],
            'clearance_title' => (string) $crewMember['clearance_title'],
            'clearance_short' => (string) $crewMember['clearance_short'],
            'clearance_color' => (string) $crewMember['clearance_color'],
            'badge_status' => (string) $crewMember['badge_status'],
            'daily_state' => (string) $crewMember['daily_state'],
        ],
    ];
}


function ensureRolesTable(PDO $pdo): void
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `roles` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `role_key` VARCHAR(64) NOT NULL UNIQUE,
                `role_name` VARCHAR(120) DEFAULT NULL,
                `title` VARCHAR(120) DEFAULT NULL,
                `clearance_level` VARCHAR(50) DEFAULT NULL,
                `department` VARCHAR(80) DEFAULT 'Production',
                `description` TEXT DEFAULT NULL,
                `is_system` TINYINT(1) NOT NULL DEFAULT 0,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        $cols = $pdo->query("SHOW COLUMNS FROM `roles`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('title', $cols, true)) {
            $pdo->exec("ALTER TABLE `roles` ADD `title` VARCHAR(120) NULL");
            $pdo->exec("UPDATE `roles` SET `title` = `role_name` WHERE `title` IS NULL OR `title` = ''");
        }
        if (!in_array('role_name', $cols, true)) {
            $pdo->exec("ALTER TABLE `roles` ADD `role_name` VARCHAR(120) NULL");
            $pdo->exec("UPDATE `roles` SET `role_name` = `title` WHERE `role_name` IS NULL OR `role_name` = ''");
        }
        if (!in_array('clearance_level', $cols, true)) {
            $pdo->exec("ALTER TABLE `roles` ADD `clearance_level` VARCHAR(50) NULL");
        }
        if (!in_array('department', $cols, true)) {
            $pdo->exec("ALTER TABLE `roles` ADD `department` VARCHAR(80) DEFAULT 'Production'");
        }
        if (!in_array('is_system', $cols, true)) {
            $pdo->exec("ALTER TABLE `roles` ADD `is_system` TINYINT(1) DEFAULT 0");
        }
        $cnt = (int) $pdo->query("SELECT COUNT(*) FROM `roles`")->fetchColumn();
        if ($cnt === 0) {
            $seedRoles = [
                ['admin', 'Administrator', 'Administrator', 'L4_ALL_ACCESS', 'Executive', 'Full operational control, security matrix management, user provision and badge issuance.', 1],
                ['stock_manager', 'Stock Logistics Manager', 'Stock Logistics Manager', 'L4_ALL_ACCESS', 'Warehouse', 'Oversees warehouse hubs, inventory movement, and logistics personnel onboarding.', 1],
                ['stock_controller', 'Stock Controller', 'Stock Controller', 'L3_STOCK_WAREHOUSE', 'Warehouse', 'Gate terminal scanning (#pane-kiosk), equipment batch dispatch and return custody authorizations.', 1],
                ['tech_lead', 'Technical Lead', 'Technical Lead', 'L4_ALL_ACCESS', 'Production', 'Supervises audio, video, lighting and rigging operations across all checkpoints.', 1],
                ['technician', 'Stage & Audio Technician', 'Stage & Audio Technician', 'L2_TECH_STAGE', 'Audio', 'Configures FOH audio arrays, monitor consoles, and mic systems on stage and FOH.', 1],
                ['sound_engineer', 'Lead Sound Engineer', 'Lead Sound Engineer', 'L2_TECH_STAGE', 'Audio', 'Lead acoustic calibration and sound engineering for live events and concert tours.', 0],
                ['lighting_tech', 'Lighting Technician', 'Lighting Technician', 'L2_TECH_STAGE', 'Lighting', 'DMX universes routing, moving-head fixtures, dimmer racks and stage wash fixtures.', 0],
                ['video_director', 'Video Director', 'Video Director', 'L2_TECH_STAGE', 'Video', 'Controls LED video walls, SDI fiber transmission, switchers, and live camera chains.', 0],
                ['stage_manager', 'Stage Manager', 'Stage Manager', 'L2_TECH_STAGE', 'Production', 'Directs stage crew, backstage call-time coordination, and cueing.', 0],
                ['rigging_lead', 'Rigging Lead', 'Rigging Lead', 'L2_TECH_STAGE', 'Rigging', 'Motors, truss rigging, load calculations and safety cable inspections overhead.', 0],
                ['user', 'Venue Crew', 'Venue Crew', 'L1_VENUE_BASIC', 'Production', 'General event venue operations and support staff. Stock warehouse access restricted.', 0],
                ['security', 'Security Officer', 'Security Officer', 'L1_VENUE_BASIC', 'Security', 'Front of house and gate security perimeter verification.', 0],
                ['driver', 'Logistics Driver', 'Logistics Driver', 'L1_VENUE_BASIC', 'Logistics', 'Equipment transport, loading bay check-in, and transit logistics.', 0],
            ];
            $ins = $pdo->prepare("INSERT INTO `roles` (`role_key`, `role_name`, `title`, `clearance_level`, `department`, `description`, `is_system`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
            foreach ($seedRoles as $sr) {
                $ins->execute($sr);
            }
        } else {
            // Ensure stock_manager role exists in roles table
            try {
                $hasSm = (int)$pdo->query("SELECT COUNT(*) FROM `roles` WHERE `role_key` = 'stock_manager'")->fetchColumn();
                if ($hasSm === 0) {
                    $pdo->prepare("INSERT INTO `roles` (`role_key`, `role_name`, `title`, `clearance_level`, `department`, `description`, `is_system`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, 1, 1)")
                        ->execute(['stock_manager', 'Stock Logistics Manager', 'Stock Logistics Manager', 'L4_ALL_ACCESS', 'Warehouse', 'Oversees warehouse hubs, inventory movement, and logistics personnel onboarding.']);
                }
            } catch (Throwable $e) {}
        }
    } catch (Throwable $e) {}
}

function getRolesList(PDO $pdo, array $crew = []): array
{
    ensureRolesTable($pdo);
    $roles = [];
    try {
        $rows = $pdo->query("SELECT * FROM `roles` ORDER BY `id` ASC")->fetchAll();
        foreach ($rows as $r) {
            $rKey = strtolower(trim((string)($r['role_key'] ?? '')));
            if ($rKey === '') continue;
            $rawTitle = trim((string)($r['title'] ?? $r['role_name'] ?? ''));
            if ($rawTitle === '') {
                $rawTitle = ucwords(str_replace('_', ' ', $rKey));
            }
            $rawClearance = trim((string)($r['clearance_level'] ?? ''));
            $tier = normalizeClearanceTier($rawClearance, $rKey);
            $staffCount = 0;
            foreach ($crew as $c) {
                if (strtolower((string)($c['role'] ?? '')) === $rKey) {
                    $staffCount++;
                }
            }
            $roles[] = [
                'id' => (int) ($r['id'] ?? 0),
                'role_key' => $rKey,
                'title' => $rawTitle,
                'clearance_level' => $tier['key'],
                'clearance_code' => $tier['code'],
                'clearance_title' => $tier['title'],
                'clearance_short' => $tier['short'],
                'clearance_color' => $tier['color'],
                'department' => (string) ($r['department'] ?? 'Production'),
                'description' => (string) ($r['description'] ?? ''),
                'is_system' => (int) ($r['is_system'] ?? (in_array($rKey, ['admin', 'manager', 'stock_controller', 'user'], true) ? 1 : 0)),
                'is_active' => (int) ($r['is_active'] ?? 1),
                'staff_count' => $staffCount,
            ];
        }
    } catch (Throwable $e) {}

    if (empty($roles)) {
        $defaultKeys = [
            ['id' => 1, 'role_key' => 'admin', 'title' => 'Administrator', 'clearance_level' => 'L4_ALL_ACCESS', 'department' => 'Executive', 'description' => 'Full operational control, security matrix management, user provision and badge issuance.', 'is_system' => 1, 'is_active' => 1],
            ['id' => 2, 'role_key' => 'stock_controller', 'title' => 'Stock Controller', 'clearance_level' => 'L3_STOCK_WAREHOUSE', 'department' => 'Warehouse', 'description' => 'Gate terminal scanning (#pane-kiosk), equipment batch dispatch and return custody authorizations.', 'is_system' => 1, 'is_active' => 1],
            ['id' => 3, 'role_key' => 'tech_lead', 'title' => 'Technical Lead', 'clearance_level' => 'L4_ALL_ACCESS', 'department' => 'Production', 'description' => 'Supervises audio, video, lighting and rigging operations across all checkpoints.', 'is_system' => 1, 'is_active' => 1],
            ['id' => 4, 'role_key' => 'technician', 'title' => 'Stage & Audio Technician', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Audio', 'description' => 'Configures FOH audio arrays, monitor consoles, and mic systems on stage and FOH.', 'is_system' => 1, 'is_active' => 1],
            ['id' => 5, 'role_key' => 'sound_engineer', 'title' => 'Lead Sound Engineer', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Audio', 'description' => 'Lead acoustic calibration and sound engineering for live events and concert tours.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 6, 'role_key' => 'lighting_tech', 'title' => 'Lighting Technician', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Lighting', 'description' => 'DMX universes routing, moving-head fixtures, dimmer racks and stage wash fixtures.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 7, 'role_key' => 'video_director', 'title' => 'Video Director', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Video', 'description' => 'Controls LED video walls, SDI fiber transmission, switchers, and live camera chains.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 8, 'role_key' => 'stage_manager', 'title' => 'Stage Manager', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Production', 'description' => 'Directs stage crew, backstage call-time coordination, and cueing.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 9, 'role_key' => 'rigging_lead', 'title' => 'Rigging Lead', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Rigging', 'description' => 'Motors, truss rigging, load calculations and safety cable inspections overhead.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 10, 'role_key' => 'user', 'title' => 'Venue Crew', 'clearance_level' => 'L1_VENUE_BASIC', 'department' => 'Production', 'description' => 'General event venue operations and support staff. Stock warehouse access restricted.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 11, 'role_key' => 'security', 'title' => 'Security Officer', 'clearance_level' => 'L1_VENUE_BASIC', 'department' => 'Security', 'description' => 'Front of house and gate security perimeter verification.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 12, 'role_key' => 'driver', 'title' => 'Logistics Driver', 'clearance_level' => 'L1_VENUE_BASIC', 'department' => 'Logistics', 'description' => 'Equipment transport, loading bay check-in, and transit logistics.', 'is_system' => 0, 'is_active' => 1],
        ];
        foreach ($defaultKeys as $dk) {
            $tier = normalizeClearanceTier($dk['clearance_level'], $dk['role_key']);
            $staffCount = 0;
            foreach ($crew as $c) {
                if (strtolower((string)($c['role'] ?? '')) === $dk['role_key']) {
                    $staffCount++;
                }
            }
            $roles[] = array_merge($dk, [
                'clearance_code' => $tier['code'],
                'clearance_title' => $tier['title'],
                'clearance_short' => $tier['short'],
                'clearance_color' => $tier['color'],
                'staff_count' => $staffCount,
            ]);
        }
    }
    return $roles;
}

function getDepartmentsList(PDO $pdo, array $crew = []): array
{
    try {
        $stmt = $pdo->query("SELECT * FROM `departments` ORDER BY `name` ASC, `id` ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($rows)) {
            $deptCounts = [];
            foreach ($crew as $c) {
                $d = strtolower(trim((string)($c['department'] ?? '')));
                if ($d !== '') {
                    $deptCounts[$d] = ($deptCounts[$d] ?? 0) + 1;
                }
            }

            $list = [];
            foreach ($rows as $r) {
                $nameLower = strtolower(trim((string)$r['name']));
                $codeLower = strtolower(trim((string)$r['code']));
                $staffCount = $deptCounts[$nameLower] ?? $deptCounts[$codeLower] ?? 0;

                $rolesCount = 0;
                try {
                    $rStmt = $pdo->prepare("SELECT COUNT(*) FROM `roles` WHERE LOWER(`department`) = ? OR LOWER(`department`) = ?");
                    $rStmt->execute([$nameLower, $codeLower]);
                    $rolesCount = (int) $rStmt->fetchColumn();
                } catch (Throwable $e) {}

                $list[] = [
                    'id' => (int) $r['id'],
                    'code' => strtoupper(trim((string)$r['code'])),
                    'name' => trim((string)$r['name']),
                    'description' => trim((string)($r['description'] ?? '')),
                    'is_active' => (int) ($r['is_active'] ?? 1),
                    'staff_count' => $staffCount,
                    'roles_count' => $rolesCount,
                    'created_at' => $r['created_at'] ?? null,
                ];
            }
            return $list;
        }
    } catch (Throwable $e) {}
    return [];
}

function getDefaultNavigationItems(): array
{
    return [
        [
            'nav_group' => 'main',
            'nav_key' => 'overview',
            'label' => 'Gate Dashboard',
            'nav_target' => 'overview',
            'dom_id' => '',
            'node_id' => '2:3285',
            'icon' => 'assets/nav-overview-inactive.svg',
            'active_icon' => 'assets/nav-overview-active.svg',
            'icon_id' => 'nav-icon-overview',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,tech_lead,technical_lead,stock_manager',
            'sort_order' => 1,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'events',
            'label' => 'Venues & Facility Gates',
            'nav_target' => 'events',
            'dom_id' => '',
            'node_id' => '2:3288',
            'icon' => 'assets/nav-events-inactive.svg',
            'active_icon' => 'assets/nav-events-active.svg',
            'icon_id' => 'nav-icon-events',
            'badge_type' => 'events',
            'badge_id' => 'sidebar-events-count',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,stock_manager',
            'sort_order' => 2,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'users',
            'label' => 'Users & Roles',
            'nav_target' => 'users',
            'dom_id' => 'nav-users-btn',
            'node_id' => '',
            'icon' => 'assets/nav-team-members.svg',
            'active_icon' => '',
            'icon_id' => 'nav-icon-users',
            'badge_type' => 'users',
            'badge_id' => 'sidebar-users-count',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager',
            'sort_order' => 3,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'attendees',
            'label' => 'ID Badges & Kiosk',
            'nav_target' => 'attendees',
            'dom_id' => '',
            'node_id' => '2:3292',
            'icon' => 'assets/nav-attendees-inactive.svg',
            'active_icon' => 'assets/nav-attendees-active.svg',
            'icon_id' => 'nav-icon-attendees',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,stock_manager,stock_controller,technician,sound_engineer,lighting_tech,video_director,stage_manager,rigging_lead,user,security,driver',
            'sort_order' => 4,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'terminals',
            'label' => 'Terminals',
            'nav_target' => 'terminals',
            'dom_id' => 'nav-terminals-btn',
            'node_id' => '',
            'icon' => 'assets/scan-line-13.svg',
            'active_icon' => '',
            'icon_id' => 'nav-icon-terminals',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'all',
            'sort_order' => 5,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'venue_security',
            'label' => 'Venue Security Portal',
            'nav_target' => 'venue-security',
            'dom_id' => 'nav-venue-security-btn',
            'node_id' => '2:3295',
            'icon' => 'assets/nav-campaigns.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager',
            'sort_order' => 6,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'stock-manager',
            'label' => 'Facilities & Gates',
            'nav_target' => 'stock-manager',
            'dom_id' => 'nav-stock-manager-btn',
            'node_id' => '',
            'icon' => 'svg:warehouse',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'stock',
            'badge_id' => 'sidebar-stock-count',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,stock_manager,stock_controller',
            'sort_order' => 7,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'access_matrix',
            'label' => 'Clearance Matrix',
            'nav_target' => 'access-matrix',
            'dom_id' => 'nav-access-matrix-btn',
            'node_id' => '2:3301',
            'icon' => 'assets/nav-payments.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator',
            'sort_order' => 8,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'shift_relief',
            'label' => 'Shift Relief & Swaps',
            'nav_target' => 'shift-relief',
            'dom_id' => 'sidebar-shift-relief-btn',
            'node_id' => '',
            'icon' => 'assets/refresh-cw.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'shift_relief',
            'badge_id' => 'sidebar-shift-relief-badge',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,stock_manager,stock_controller',
            'sort_order' => 1,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'set_calltime',
            'label' => 'Set Call Time',
            'nav_target' => 'calltime',
            'dom_id' => 'sidebar-calltime-btn',
            'node_id' => '',
            'icon' => 'assets/metric-calendar-clock.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'calltime',
            'badge_id' => 'sidebar-active-calltime-pill',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,stock_manager',
            'sort_order' => 2,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'onsite_rollcall',
            'label' => 'On-Site Roll-Call',
            'nav_target' => 'rollcall',
            'dom_id' => 'sidebar-rollcall-btn',
            'node_id' => '2:3307',
            'icon' => 'assets/nav-team-members.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'onsite',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,stock_manager',
            'sort_order' => 3,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'station_lock',
            'label' => 'Station Lock (PIN)',
            'nav_target' => 'station-lock',
            'dom_id' => 'sidebar-station-lock-btn',
            'node_id' => '2:3310',
            'icon' => 'assets/nav-integrations.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator',
            'sort_order' => 4,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'reset_today_scans',
            'label' => "Reset Today’s Scans",
            'nav_target' => 'reset-scans',
            'dom_id' => 'sidebar-reset-demo-btn',
            'node_id' => '2:3313',
            'icon' => 'assets/nav-settings.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator',
            'sort_order' => 5,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
    ];
}

function ensureNavigationTables(PDO $pdo, bool $forceReset = false): void
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `app_settings` (
                `setting_key` VARCHAR(64) PRIMARY KEY,
                `setting_value` TEXT DEFAULT NULL,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        if ($forceReset) {
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('main_nav_enabled', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('workspace_nav_enabled', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        } else {
            $pdo->exec("INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('main_nav_enabled', '1')");
            $pdo->exec("INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('workspace_nav_enabled', '1')");
        }

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `navigation_items` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `nav_group` VARCHAR(32) NOT NULL DEFAULT 'main',
                `nav_key` VARCHAR(64) NOT NULL UNIQUE,
                `label` VARCHAR(120) NOT NULL,
                `nav_target` VARCHAR(160) NOT NULL DEFAULT 'overview',
                `dom_id` VARCHAR(80) DEFAULT NULL,
                `node_id` VARCHAR(40) DEFAULT NULL,
                `icon` VARCHAR(255) DEFAULT 'assets/nav-overview-inactive.svg',
                `active_icon` VARCHAR(255) DEFAULT NULL,
                `icon_id` VARCHAR(80) DEFAULT NULL,
                `badge_type` VARCHAR(40) DEFAULT 'none',
                `badge_id` VARCHAR(80) DEFAULT NULL,
                `badge_text` VARCHAR(32) DEFAULT NULL,
                `allowed_roles` TEXT DEFAULT NULL,
                `sort_order` INT NOT NULL DEFAULT 10,
                `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
                `is_system` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $navCols = $pdo->query("SHOW COLUMNS FROM `navigation_items`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('nav_group', $navCols, true)) {
            $pdo->exec("ALTER TABLE `navigation_items` ADD `nav_group` VARCHAR(32) NOT NULL DEFAULT 'main' AFTER `id`");
        }

        if ($forceReset) {
            $pdo->exec("DELETE FROM `navigation_items`");
        }
        $cnt = (int) $pdo->query("SELECT COUNT(*) FROM `navigation_items`")->fetchColumn();
        $wsCnt = (int) $pdo->query("SELECT COUNT(*) FROM `navigation_items` WHERE `nav_group` = 'workspace'")->fetchColumn();
        if ($cnt === 0 || ($wsCnt === 0 && !$forceReset)) {
            $ins = $pdo->prepare("
                INSERT IGNORE INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach (getDefaultNavigationItems() as $it) {
                $grp = (string) ($it['nav_group'] ?? 'main');
                if ($cnt > 0 && $grp !== 'workspace') {
                    continue;
                }
                $ins->execute([
                    $grp,
                    $it['nav_key'],
                    $it['label'],
                    $it['nav_target'],
                    $it['dom_id'],
                    $it['node_id'],
                    $it['icon'],
                    $it['active_icon'],
                    $it['icon_id'],
                    $it['badge_type'],
                    $it['badge_id'],
                    $it['badge_text'],
                    $it['allowed_roles'],
                    $it['sort_order'],
                    $it['is_enabled'],
                    $it['is_system'],
                ]);
            }
        }

        // Upgrade legacy modal-only workspace targets on system items to their dedicated pages
        $pageTargetUpgrades = [
            'action:shift-relief' => 'shift-relief',
            'action:calltime' => 'calltime',
            'action:rollcall' => 'rollcall',
            'action:station-lock' => 'station-lock',
            'action:reset-scans' => 'reset-scans',
        ];
        $upStmt = $pdo->prepare("UPDATE `navigation_items` SET `nav_target` = ? WHERE `is_system` = 1 AND `nav_target` = ?");
        foreach ($pageTargetUpgrades as $oldTgt => $newTgt) {
            $upStmt->execute([$newTgt, $oldTgt]);
        }
    } catch (Throwable $e) {}
}

function getNavigationConfig(PDO $pdo): array
{
    ensureNavigationTables($pdo);
    $mainNavEnabled = true;
    $workspaceNavEnabled = true;
    $items = [];
    try {
        $st = $pdo->query("SELECT `setting_key`, `setting_value` FROM `app_settings` WHERE `setting_key` IN ('main_nav_enabled', 'workspace_nav_enabled')");
        while ($sRow = $st->fetch(PDO::FETCH_ASSOC)) {
            if ($sRow['setting_key'] === 'main_nav_enabled') {
                $mainNavEnabled = ((string) $sRow['setting_value'] !== '0');
            } elseif ($sRow['setting_key'] === 'workspace_nav_enabled') {
                $workspaceNavEnabled = ((string) $sRow['setting_value'] !== '0');
            }
        }

        $rows = $pdo->query("SELECT * FROM `navigation_items` ORDER BY `nav_group` ASC, `sort_order` ASC, `id` ASC")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $items[] = [
                'id' => (int) ($r['id'] ?? 0),
                'nav_group' => trim((string) ($r['nav_group'] ?? 'main')) === 'workspace' ? 'workspace' : 'main',
                'nav_key' => trim((string) ($r['nav_key'] ?? '')),
                'label' => trim((string) ($r['label'] ?? '')),
                'nav_target' => trim((string) ($r['nav_target'] ?? 'overview')),
                'dom_id' => trim((string) ($r['dom_id'] ?? '')),
                'node_id' => trim((string) ($r['node_id'] ?? '')),
                'icon' => trim((string) ($r['icon'] ?? 'assets/nav-overview-inactive.svg')),
                'active_icon' => trim((string) ($r['active_icon'] ?? '')),
                'icon_id' => trim((string) ($r['icon_id'] ?? '')),
                'badge_type' => trim((string) ($r['badge_type'] ?? 'none')),
                'badge_id' => trim((string) ($r['badge_id'] ?? '')),
                'badge_text' => trim((string) ($r['badge_text'] ?? '')),
                'allowed_roles' => trim((string) ($r['allowed_roles'] ?? 'all')),
                'sort_order' => (int) ($r['sort_order'] ?? 10),
                'is_enabled' => (int) ($r['is_enabled'] ?? 1),
                'is_system' => (int) ($r['is_system'] ?? 0),
            ];
        }
    } catch (Throwable $e) {}

    if (empty($items)) {
        $defaults = getDefaultNavigationItems();
        foreach ($defaults as $idx => $d) {
            $d['id'] = $idx + 1;
            $d['nav_group'] = $d['nav_group'] ?? 'main';
            $items[] = $d;
        }
    }

    return [
        'main_nav_enabled' => $mainNavEnabled,
        'workspace_nav_enabled' => $workspaceNavEnabled,
        'items' => $items,
    ];
}

function getCallerUser(PDO $pdo): ?array
{
    $authId = (int) ($_SESSION['auth_user_id'] ?? 0);
    if ($authId <= 0) {
        return null;
    }
    try {
        $stmt = $pdo->prepare("SELECT u.*, b.clearance_level, b.badge_code FROM `users` u LEFT JOIN `user_badges` b ON u.id = b.user_id WHERE u.id = ?");
        $stmt->execute([$authId]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        return $u ?: null;
    } catch (Throwable $e) {
        return null;
    }
}

function formatRoleDisplay(string $role): string
{
    $r = strtolower(trim($role));
    $map = [
        'admin' => 'Administrator',
        'administrator' => 'Administrator',
        'manager' => 'Operations Manager',
        'stock_controller' => 'Gate Controller',
        'stock_manager' => 'Site Manager',
        'tech_lead' => 'Technical Lead',
        'project_manager' => 'Project Manager',
    ];
    if (isset($map[$r])) {
        return $map[$r];
    }
    return ucwords(str_replace('_', ' ', $r));
}

function findCheckpointRecord(array $stockWarehouses, array $eventVenues, string $cpType, string $cpId): ?array
{
    $cpType = trim($cpType);
    $cpId = trim($cpId);
    if ($cpType === '' || $cpId === '') {
        return null;
    }
    $list = ($cpType === 'event_venue') ? $eventVenues : $stockWarehouses;
    foreach ($list as $cp) {
        $idMatch = ((string) ($cp['id'] ?? '') === $cpId);
        $rawMatch = isset($cp['raw_id']) && ((string) $cp['raw_id'] === $cpId);
        if ($idMatch || $rawMatch) {
            return $cp;
        }
    }
    return null;
}

function loadCheckpointsLookup(PDO $pdo): array
{
    $warehouses = [];
    try {
        foreach ($pdo->query("SELECT `id`, `name`, `code`, `location_code` FROM `stock_locations` WHERE `is_active` = 1 ORDER BY `id` ASC")->fetchAll() as $sr) {
            $warehouses[] = [
                'id' => (int) $sr['id'],
                'raw_id' => (string) $sr['id'],
                'type' => 'stock_warehouse',
                'name' => (string) ($sr['name'] ?? 'Facility Gate'),
            ];
        }
    } catch (Throwable $e) {}

    $venues = [];
    try {
        foreach ($pdo->query("SELECT `id`, `title`, `location` FROM `events` ORDER BY `date` DESC, `id` DESC LIMIT 20")->fetchAll() as $er) {
            $rawId = (string) ($er['id'] ?? '');
            $numId = is_numeric($rawId) ? (int) $rawId : crc32($rawId);
            $title = (string) ($er['title'] ?? 'Event Venue');
            $loc = (string) ($er['location'] ?? '');
            $venues[] = [
                'id' => $numId,
                'raw_id' => $rawId,
                'type' => 'event_venue',
                'name' => $title . ($loc && stripos($title, $loc) === false ? ' — ' . $loc : ''),
            ];
        }
    } catch (Throwable $e) {}

    return ['stock_warehouses' => $warehouses, 'event_venues' => $venues];
}

function assertControllerCheckpointLock(PDO $pdo, string $targetType, string $targetId): array
{
    $caller = getCallerUser($pdo);
    if (!$caller) {
        return ['ok' => false, 'error' => 'Authentication required.'];
    }
    $role = strtolower(trim((string) ($caller['role'] ?? '')));
    if ($role !== 'stock_controller') {
        return ['ok' => true, 'caller' => $caller];
    }

    $assignedType = trim((string) ($caller['assigned_checkpoint_type'] ?? ''));
    $assignedId = trim((string) ($caller['assigned_checkpoint_id'] ?? ''));
    if ($assignedType === '' || $assignedId === '') {
        return [
            'ok' => false,
            'error' => 'Terminal unassigned: Your Gate Controller account has no assigned checkpoint yet. Submit a Shift / Terminal Assignment request for Administrator or Site Manager approval.',
        ];
    }

    $lookup = loadCheckpointsLookup($pdo);
    $assignedCp = findCheckpointRecord($lookup['stock_warehouses'], $lookup['event_venues'], $assignedType, $assignedId);
    $targetCp = findCheckpointRecord($lookup['stock_warehouses'], $lookup['event_venues'], $targetType, $targetId);

    $sameType = ($assignedType === $targetType);
    $sameDirect = ($assignedId === trim($targetId));
    $sameResolved = ($assignedCp && $targetCp && $assignedCp['type'] === $targetCp['type'] && (string) $assignedCp['id'] === (string) $targetCp['id']);

    if (!($sameType && ($sameDirect || $sameResolved))) {
        $assignedName = $assignedCp ? $assignedCp['name'] : ($assignedType . ' #' . $assignedId);
        return [
            'ok' => false,
            'error' => "Checkpoint locked: Your Gate Controller account is strictly assigned to {$assignedName}. Request an approved Shift Relief or Terminal Assignment from an Administrator or Site Manager to operate another gate.",
        ];
    }

    return ['ok' => true, 'caller' => $caller, 'assigned' => $assignedCp];
}

function canCallerPerformAction(string $action, ?array $caller, array $context = []): array
{
    if ($caller === null) {
        return ['ok' => false, 'error' => 'Authentication required. Please sign in to continue.'];
    }

    $role = strtolower(trim((string)($caller['role'] ?? 'user')));
    $clearance = strtoupper(trim((string)($caller['clearance_level'] ?? 'L1_VENUE_BASIC')));
    $isAdmin = in_array($role, ['admin', 'manager', 'administrator'], true);

    switch ($action) {
        case 'switch_user':
        case 'reset_logs':
        case 'save_clearance_tier':
        case 'delete_clearance_tier':
        case 'save_role':
        case 'delete_role':
        case 'save_department':
        case 'delete_department':
        case 'manage_navigation':
            if (!$isAdmin) {
                return ['ok' => false, 'error' => 'Permission denied: This action requires Administrator privileges.'];
            }
            break;

        case 'save_user':
            // 1. Gate Controller cannot add/edit users
            if ($role === 'stock_controller') {
                return ['ok' => false, 'error' => 'Permission denied: Gate Controllers are assigned exclusively to gate terminal scanning and cannot create or modify personnel accounts.'];
            }
            // 2. Site Manager can onboard facility crew (L1/L2) and Gate Controllers (L3)
            if ($role === 'stock_manager') {
                $targetTier = strtoupper(trim((string)($context['clearance_level'] ?? 'L1')));
                $targetRole = strtolower(trim((string)($context['role'] ?? 'user')));
                $allowedTiers = ['L1_VENUE_BASIC', 'L2_TECH_STAGE', 'L1', 'L2'];
                if ($targetRole === 'stock_controller') {
                    $allowedTiers[] = 'L3_STOCK_WAREHOUSE';
                    $allowedTiers[] = 'L3_STOCK_CTRL';
                    $allowedTiers[] = 'L3';
                }
                $disallowedRoles = ['admin', 'administrator', 'manager', 'project_manager', 'tech_lead', 'stock_manager'];
                if (!in_array($targetTier, $allowedTiers, true) || in_array($targetRole, $disallowedRoles, true)) {
                    return ['ok' => false, 'error' => 'Permission denied: Site Managers can only manage facility crew (L1/L2) or Gate Controllers (L3).'];
                }
            }
            // 3. Technical Lead can onboard technical crew with L1/L2 clearance
            if ($role === 'tech_lead') {
                $targetTier = strtoupper(trim((string)($context['clearance_level'] ?? 'L2')));
                $targetRole = strtolower(trim((string)($context['role'] ?? 'technician')));
                $allowedTiers = ['L1_VENUE_BASIC', 'L2_TECH_STAGE', 'L1', 'L2'];
                $disallowedRoles = ['admin', 'administrator', 'manager', 'project_manager', 'stock_manager'];
                if (!in_array($targetTier, $allowedTiers, true) || in_array($targetRole, $disallowedRoles, true)) {
                    return ['ok' => false, 'error' => 'Permission denied: Technical Leads can only onboard technical crew with Level 1 or Level 2 clearance.'];
                }
            }
            // 4. Standard crew cannot add users
            if (in_array($role, ['technician', 'driver', 'security', 'user'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: User provisioning requires Supervisor, Tech Lead, or Administrator privileges.'];
            }
            break;

        case 'delete_user':
            if (!$isAdmin) {
                return ['ok' => false, 'error' => 'Permission denied: Deleting personnel accounts requires Administrator privileges.'];
            }
            break;

        case 'update_call_time':
        case 'save_event':
        case 'assign_event_crew':
            // Tech Lead, Project Manager, Admin, and Stock Manager (for warehouses)
            if (!in_array($role, ['admin', 'administrator', 'manager', 'tech_lead', 'technical_lead', 'project_manager'], true)) {
                if ($role === 'stock_manager' && ($context['checkpoint_type'] ?? '') === 'stock_warehouse') {
                    break;
                }
                return ['ok' => false, 'error' => 'Permission denied: Setting Call Times and assigning event crew requires Tech Lead, Project Manager, or Administrator privileges.'];
            }
            break;

        case 'save_warehouse':
        case 'save_warehouse_pin':
        case 'delete_warehouse':
            if (!in_array($role, ['admin', 'manager', 'administrator', 'stock_manager'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Facility checkpoint management requires Site Manager or Administrator privileges.'];
            }
            break;

        case 'review_controller_shift':
            if (!in_array($role, ['admin', 'manager', 'administrator', 'stock_manager'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Only Administrators and Site Managers can approve or reject Gate Controller assignments and shift relief requests.'];
            }
            break;

        case 'update_clearance':
            if (!$isAdmin) {
                return ['ok' => false, 'error' => 'Permission denied: Modifying badge clearance levels requires Administrator privileges.'];
            }
            break;
    }

    return ['ok' => true];
}

/**
 * Ensures an authenticated session exists and optionally checks the caller's role.
 * Emits a 401 or 403 JSON response and exits immediately when unauthorized.
 */
function requireAuthorizedCaller(PDO $pdo, array $allowedRoles = [], string $deniedMessage = 'Permission denied for this operation.'): array
{
    $caller = getCallerUser($pdo);
    if ($caller === null) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Authentication required. Please sign in to continue.']);
        exit;
    }
    if (!empty($allowedRoles)) {
        $callerRole = strtolower(trim((string) ($caller['role'] ?? 'user')));
        if (!in_array($callerRole, $allowedRoles, true)) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $deniedMessage]);
            exit;
        }
    }
    return $caller;
}

/**
 * Verifies a submitted terminal PIN against either a password_hash() digest or a constant-time DB string.
 */
function verifyTerminalPinSecret(string $inputPin, string $storedSecret): bool
{
    $candidate = trim($inputPin);
    $expected = trim($storedSecret);
    if ($candidate === '' || $expected === '') {
        return false;
    }
    if (str_starts_with($expected, '$2y$') || str_starts_with($expected, '$2a$') || str_starts_with($expected, '$argon2')) {
        return password_verify($candidate, $expected);
    }
    return hash_equals($expected, $candidate);
}

function resolveWarehouseTerminalPin(array $row): string
{
    return trim((string) ($row['terminal_pin'] ?? ''));
}

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

function validateCsrfForAuthenticatedPost(array $jsonBody): bool
{
    $sessionToken = getSessionCsrfToken();
    if ($sessionToken === '') {
        return false;
    }
    $headerToken = trim((string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
    $bodyToken = trim((string) ($_POST['csrf_token'] ?? $jsonBody['csrf_token'] ?? ''));
    $candidate = $headerToken !== '' ? $headerToken : $bodyToken;
    return $candidate !== '' && hash_equals($sessionToken, $candidate);
}

function checkSecurityRateLimit(PDO $pdo, string $rateKey, int $maxAttempts = 5, int $windowSeconds = 600): array
{
    try {
        $stmt = $pdo->prepare("SELECT `attempts`, `first_attempt_at`, `blocked_until` FROM `security_rate_limits` WHERE `rate_key` = ? LIMIT 1");
        $stmt->execute([$rateKey]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['allowed' => true, 'retry_after' => 0];
        }
        $now = time();
        $blockedUntilTs = !empty($row['blocked_until']) ? strtotime((string) $row['blocked_until']) : false;
        if ($blockedUntilTs !== false && $blockedUntilTs > $now) {
            return ['allowed' => false, 'retry_after' => max(1, $blockedUntilTs - $now)];
        }
        $firstTs = strtotime((string) $row['first_attempt_at']) ?: $now;
        if (($now - $firstTs) > $windowSeconds) {
            $pdo->prepare("DELETE FROM `security_rate_limits` WHERE `rate_key` = ?")->execute([$rateKey]);
        }
    } catch (Throwable $e) {}
    return ['allowed' => true, 'retry_after' => 0];
}

function recordFailedRateLimit(PDO $pdo, string $rateKey, int $maxAttempts = 5, int $windowSeconds = 600, int $blockSeconds = 60): int
{
    try {
        $nowTs = time();
        $nowSql = date('Y-m-d H:i:s', $nowTs);
        $stmt = $pdo->prepare("SELECT `attempts`, `first_attempt_at` FROM `security_rate_limits` WHERE `rate_key` = ? LIMIT 1");
        $stmt->execute([$rateKey]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $pdo->prepare("INSERT INTO `security_rate_limits` (`rate_key`, `attempts`, `first_attempt_at`, `blocked_until`) VALUES (?, 1, ?, NULL)")
                ->execute([$rateKey, $nowSql]);
            return 1;
        }

        $firstTs = strtotime((string) $row['first_attempt_at']) ?: $nowTs;
        $attempts = (($nowTs - $firstTs) > $windowSeconds) ? 1 : ((int) $row['attempts'] + 1);
        $firstSql = ($attempts === 1) ? $nowSql : (string) $row['first_attempt_at'];
        $blockedUntilSql = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', $nowTs + $blockSeconds) : null;

        $pdo->prepare("UPDATE `security_rate_limits` SET `attempts` = ?, `first_attempt_at` = ?, `blocked_until` = ? WHERE `rate_key` = ?")
            ->execute([$attempts, $firstSql, $blockedUntilSql, $rateKey]);
        return $attempts;
    } catch (Throwable $e) {}
    return 0;
}

function clearSecurityRateLimit(PDO $pdo, string $rateKey): void
{
    try {
        $pdo->prepare("DELETE FROM `security_rate_limits` WHERE `rate_key` = ?")->execute([$rateKey]);
    } catch (Throwable $e) {}
}

function buildFullPayload(PDO $pdo, string $activeDb, string $reqCheckpointType = 'stock_warehouse', int $reqCheckpointId = 1): array
{
    $todayStr = date('Y-m-d');
    $sessionRole = strtolower(trim((string) ($_SESSION['auth_user_role'] ?? '')));
    if ($sessionRole === '' && !empty($_SESSION['auth_user_id'])) {
        try {
            $rSt = $pdo->prepare("SELECT `role` FROM `users` WHERE `id` = ? LIMIT 1");
            $rSt->execute([(int) $_SESSION['auth_user_id']]);
            $sessionRole = strtolower(trim((string) $rSt->fetchColumn()));
        } catch (Throwable $e) {}
    }
    $canSeeTerminalPins = in_array($sessionRole, ['admin', 'manager', 'administrator', 'stock_manager'], true);

    // 0. Preload Users Lookup for Name/ID resolution across warehouses and events
    $usersLookup = [];
    $userNameToId = [];
    try {
        $uLkStmt = $pdo->query("SELECT `id`, `username`, `full_name`, `role`, `assigned_checkpoint_type`, `assigned_checkpoint_id` FROM `users`");
        while ($uLk = $uLkStmt->fetch(PDO::FETCH_ASSOC)) {
            $uIdLk = (int) $uLk['id'];
            $fnLk = strtolower(trim((string) ($uLk['full_name'] ?: $uLk['username'])));
            $unLk = strtolower(trim((string) $uLk['username']));
            if ($fnLk !== '') $userNameToId[$fnLk] = $uIdLk;
            if ($unLk !== '') $userNameToId[$unLk] = $uIdLk;
            $usersLookup[] = $uLk;
        }
    } catch (Throwable $e) {}

    // 1. Load Stock Warehouses
    $stockRows = $pdo->query("SELECT * FROM `stock_locations` WHERE `is_active` = 1 ORDER BY `id` ASC")->fetchAll();
    $stockWarehouses = [];
    foreach ($stockRows as $sr) {
        $sid = (int) $sr['id'];
        $ctrl = trim((string)($sr['controller_name'] ?? ''));
        if ($ctrl === '') {
            $ctrl = ($sid === 1) ? 'Schadrack Niyikiza' : (($sid === 2) ? 'Niyonase Prince' : 'Irene Mudacumura');
        }

        $whAssignedIds = [];
        foreach ($usersLookup as $uLk) {
            if (($uLk['assigned_checkpoint_type'] ?? '') === 'stock_warehouse' && (int) ($uLk['assigned_checkpoint_id'] ?? 0) === $sid) {
                $whAssignedIds[] = (int) $uLk['id'];
            }
        }
        $whAssignedIds = array_values(array_unique($whAssignedIds));

        $whRow = [
            'id' => $sid,
            'raw_id' => (string) $sid,
            'type' => 'stock_warehouse',
            'name' => (string) ($sr['name'] ?? 'Stock Warehouse'),
            'code' => (string) ($sr['code'] ?? $sr['location_code'] ?? 'STK-0' . $sid),
            'location' => (string) ($sr['location'] ?? 'Kigali Logistics Hub'),
            'open_time' => substr((string) ($sr['open_time'] ?? '08:00:00'), 0, 5),
            'close_time' => substr((string) ($sr['close_time'] ?? '18:00:00'), 0, 5),
            'call_time' => substr((string) ($sr['open_time'] ?? '08:00:00'), 0, 5),
            'controller_name' => $ctrl,
            'lead_name' => $ctrl,
            'lead_label' => 'Gate Controller: ' . $ctrl,
            'min_clearance' => 'L2 / L3 / L4 Required (L1 Blocked)',
            'assigned_technicians' => $whAssignedIds,
            'assigned_count' => count($whAssignedIds),
            'lat' => isset($sr['lat']) && $sr['lat'] !== null ? (float) $sr['lat'] : null,
            'lng' => isset($sr['lng']) && $sr['lng'] !== null ? (float) $sr['lng'] : null,
            'map_x' => isset($sr['map_x']) && $sr['map_x'] !== null ? (float) $sr['map_x'] : null,
            'map_y' => isset($sr['map_y']) && $sr['map_y'] !== null ? (float) $sr['map_y'] : null,
        ];
        if ($canSeeTerminalPins) {
            $whRow['terminal_pin'] = resolveWarehouseTerminalPin($sr);
        }
        $stockWarehouses[] = $whRow;
    }

    // 2. Load Event Venues
    $eventRows = $pdo->query("SELECT * FROM `events` ORDER BY `date` DESC, `id` DESC LIMIT 12")->fetchAll();
    $eventVenues = [];
    $fallbackIdx = 1001;
    foreach ($eventRows as $er) {
        $rawId = (string) ($er['id'] ?? $fallbackIdx);
        $numId = is_numeric($rawId) ? (int) $rawId : crc32($rawId);
        $title = (string) ($er['title'] ?? 'Production Event');
        $loc = (string) ($er['location'] ?? 'Kigali Convention Centre');
        $callTime = substr((string) ($er['call_time'] ?? '08:00'), 0, 5) ?: '08:00';
        $pm = trim((string) ($er['project_manager'] ?? ''));
        $tl = trim((string) ($er['tech_lead'] ?? ''));
        $leadName = $tl ?: ($pm ?: 'Jean Paul Ndayisaba');
        $leadLabel = ($tl ? 'Tech Lead: ' . $tl : ($pm ? 'Project Manager: ' . $pm : 'Tech Lead: ' . $leadName));

        $assignedRaw = trim((string) ($er['assigned_technician'] ?? ''));
        $assignedIds = [];
        $assignedNames = [];
        $isExplicitJson = false;
        if (!empty($assignedRaw)) {
            $dec = json_decode($assignedRaw, true);
            if (is_array($dec)) {
                $assignedIds = array_values(array_unique(array_filter(array_map('intval', $dec))));
                $isExplicitJson = true;
            } else {
                $parts = explode(',', $assignedRaw);
                foreach ($parts as $p) {
                    $pTrim = trim($p);
                    if ($pTrim === '') continue;
                    $assignedNames[] = $pTrim;
                    $pLower = strtolower($pTrim);
                    if (isset($userNameToId[$pLower])) {
                        $assignedIds[] = $userNameToId[$pLower];
                    } else {
                        foreach ($userNameToId as $nameKey => $uidVal) {
                            if (stripos($nameKey, $pLower) !== false || stripos($pLower, $nameKey) !== false) {
                                $assignedIds[] = $uidVal;
                                break;
                            }
                        }
                    }
                }
            }
        }
        $assignedIds = array_values(array_unique($assignedIds));

        $evItem = [
            'id' => $numId,
            'raw_id' => $rawId,
            'type' => 'event_venue',
            'name' => $title . ($loc && stripos($title, $loc) === false ? ' — ' . $loc : ''),
            'title' => $title,
            'location' => $loc,
            'date' => (string) ($er['date'] ?? $todayStr),
            'call_time' => $callTime,
            'project_manager' => $pm,
            'tech_lead' => $tl,
            'lead_name' => $leadName,
            'lead_label' => $leadLabel,
            'min_clearance' => 'L1 / L2 / L3 / L4 Authorized',
            'assigned_technicians' => $assignedIds,
            'assigned_technician_names' => $assignedNames,
            'assigned_count' => count($assignedIds),
            'lat' => isset($er['lat']) && $er['lat'] !== null ? (float) $er['lat'] : null,
            'lng' => isset($er['lng']) && $er['lng'] !== null ? (float) $er['lng'] : null,
            'map_x' => isset($er['map_x']) && $er['map_x'] !== null ? (float) $er['map_x'] : null,
            'map_y' => isset($er['map_y']) && $er['map_y'] !== null ? (float) $er['map_y'] : null,
        ];
        if ($canSeeTerminalPins) {
            $evItem['terminal_pin'] = trim((string) ($er['terminal_pin'] ?? ''));
        }
        $eventVenues[] = $evItem;
        $fallbackIdx++;
    }

    // Resolve Active Checkpoint (enforcing strict single-checkpoint lock for Gate Controllers)
    $callerLockRow = getCallerUser($pdo);
    $callerLockRole = strtolower(trim((string) ($callerLockRow['role'] ?? '')));
    $lockedAssignedCp = null;
    if ($callerLockRole === 'stock_controller') {
        $lockedAssignedCp = findCheckpointRecord(
            $stockWarehouses,
            $eventVenues,
            (string) ($callerLockRow['assigned_checkpoint_type'] ?? ''),
            (string) ($callerLockRow['assigned_checkpoint_id'] ?? '')
        );
    }

    $checkpointType = in_array($reqCheckpointType, ['stock_warehouse', 'event_venue'], true)
        ? $reqCheckpointType
        : 'stock_warehouse';

    $activeCheckpoint = null;
    if ($lockedAssignedCp) {
        $activeCheckpoint = $lockedAssignedCp;
    } elseif ($checkpointType === 'stock_warehouse') {
        foreach ($stockWarehouses as $sw) {
            if ($sw['id'] === $reqCheckpointId) {
                $activeCheckpoint = $sw;
                break;
            }
        }
        if (!$activeCheckpoint && !empty($stockWarehouses)) {
            $activeCheckpoint = $stockWarehouses[0];
        }
    } else {
        foreach ($eventVenues as $ev) {
            if ($ev['id'] === $reqCheckpointId) {
                $activeCheckpoint = $ev;
                break;
            }
        }
        if (!$activeCheckpoint && !empty($eventVenues)) {
            $activeCheckpoint = $eventVenues[0];
        }
    }

    if (!$activeCheckpoint) {
        $activeCheckpoint = [
            'id' => 1,
            'type' => 'stock_warehouse',
            'name' => 'Ndera Warehouse',
            'location' => 'Ndera Central Logistics Hub',
            'call_time' => '08:00',
            'lead_name' => 'Schadrack Niyikiza',
            'lead_label' => 'Gate Controller: Schadrack Niyikiza',
            'min_clearance' => 'L2 / L3 / L4 Required',
        ];
    }

    $activeCpType = (string) $activeCheckpoint['type'];
    $activeCpId = (int) $activeCheckpoint['id'];
    $activeCpName = (string) $activeCheckpoint['name'];

    // 3. Load Today's Attendance Logs + Prior-Evening Overnight Open Check-Ins
    $todayLogsStmt = $pdo->prepare("
        SELECT * FROM `attendance_logs`
        WHERE DATE(`scanned_at`) = ?
        ORDER BY `scanned_at` ASC, `id` ASC
    ");
    $todayLogsStmt->execute([$todayStr]);
    $todayLogs = $todayLogsStmt->fetchAll();

    // Look back 18 hours before midnight so active night-shift check-ins stay checked_in past 00:00
    $overnightCutoff = date('Y-m-d H:i:s', strtotime($todayStr . ' 00:00:00') - 18 * 3600);
    $todayMidnight = $todayStr . ' 00:00:00';
    $overnightStmt = $pdo->prepare("
        SELECT * FROM `attendance_logs`
        WHERE `scanned_at` >= ? AND `scanned_at` < ?
          AND `access_status` = 'granted'
          AND `scan_action` IN ('check_in', 'check_out')
        ORDER BY `scanned_at` ASC, `id` ASC
    ");
    $overnightStmt->execute([$overnightCutoff, $todayMidnight]);
    $overnightLogs = $overnightStmt->fetchAll();

    // Compute per-user daily state and timestamps
    $userDailyMap = [];
    $checkpointStats = [];
    $hourlyBuckets = [
        '07:00' => ['hour' => '07:00', 'label' => '07:00 AM', 'venueCount' => 0, 'stockCount' => 0],
        '08:00' => ['hour' => '08:00', 'label' => '08:00 AM', 'venueCount' => 0, 'stockCount' => 0],
        '09:00' => ['hour' => '09:00', 'label' => '09:00 AM', 'venueCount' => 0, 'stockCount' => 0],
        '10:00' => ['hour' => '10:00', 'label' => '10:00 AM', 'venueCount' => 0, 'stockCount' => 0],
        '11:00' => ['hour' => '11:00', 'label' => '11:00 AM', 'venueCount' => 0, 'stockCount' => 0],
        '12:00' => ['hour' => '12:00', 'label' => '12:00 PM', 'venueCount' => 0, 'stockCount' => 0],
        '14:00' => ['hour' => '14:00', 'label' => '02:00 PM', 'venueCount' => 0, 'stockCount' => 0],
        '16:00' => ['hour' => '16:00', 'label' => '04:00 PM', 'venueCount' => 0, 'stockCount' => 0],
    ];

    $overnightOpenMap = [];
    foreach ($overnightLogs as $olog) {
        $ouid = (int) $olog['user_id'];
        $oAction = (string) ($olog['scan_action'] ?? '');
        if ($oAction === 'check_in') {
            $overnightOpenMap[$ouid] = $olog;
        } elseif ($oAction === 'check_out') {
            unset($overnightOpenMap[$ouid]);
        }
    }

    foreach ($overnightOpenMap as $ouid => $olog) {
        $oTs = strtotime((string) $olog['scanned_at']) ?: time();
        $oCpType = (string) ($olog['checkpoint_type'] ?? 'event_venue');
        $oCpId = (int) ($olog['checkpoint_id'] ?? 1);
        $oCpKey = $oCpType . ':' . $oCpId;
        $oPunct = strtolower((string) ($olog['punctuality_status'] ?? 'on_time'));

        if (!isset($checkpointStats[$oCpKey])) {
            $checkpointStats[$oCpKey] = [
                'checked_in_today' => 0,
                'checked_out_today' => 0,
                'denied_today' => 0,
                'active_users' => [],
            ];
        }
        $checkpointStats[$oCpKey]['active_users'][$ouid] = true;

        $userDailyMap[$ouid] = [
            'state' => 'checked_in',
            'overnight_shift' => true,
            'check_in_short' => 'Prev ' . date('h:i A', $oTs),
            'check_in_full' => date('M j, h:i:s A', $oTs),
            'check_out_short' => null,
            'check_out_full' => null,
            'punctuality_code' => $oPunct,
            'punctuality_label' => 'NIGHT SHIFT ACTIVE',
            'last_checkpoint_type' => $oCpType,
            'last_checkpoint_id' => $oCpId,
            'last_checkpoint_name' => (string) ($olog['checkpoint_name'] ?? ''),
            'last_scanned_at' => (string) ($olog['scanned_at'] ?? ''),
            'denied_count' => 0,
            'last_denial_reason' => null,
        ];
    }

    $venueCheckinsToday = 0;
    $stockCheckinsToday = 0;
    $lateArrivalsToday = 0;
    $deniedScansToday = 0;

    foreach ($todayLogs as $log) {
        $uid = (int) $log['user_id'];
        $cpType = (string) ($log['checkpoint_type'] ?? 'event_venue');
        $cpId = (int) ($log['checkpoint_id'] ?? 1);
        $cpKey = $cpType . ':' . $cpId;
        $action = (string) ($log['scan_action'] ?? 'check_in');
        $status = (string) ($log['access_status'] ?? 'granted');
        $punct = strtolower((string) ($log['punctuality_status'] ?? 'on_time'));
        $ts = strtotime((string) $log['scanned_at']) ?: time();

        if (!isset($checkpointStats[$cpKey])) {
            $checkpointStats[$cpKey] = [
                'checked_in_today' => 0,
                'checked_out_today' => 0,
                'denied_today' => 0,
                'active_users' => [],
            ];
        }

        if ($status === 'denied') {
            $deniedScansToday++;
            $checkpointStats[$cpKey]['denied_today']++;
        } else {
            if ($action === 'check_in') {
                if ($cpType === 'stock_warehouse') {
                    $stockCheckinsToday++;
                } else {
                    $venueCheckinsToday++;
                }
                if ($punct === 'late') {
                    $lateArrivalsToday++;
                }
                $checkpointStats[$cpKey]['checked_in_today']++;
                $checkpointStats[$cpKey]['active_users'][$uid] = true;

                // Map to hourly bucket
                $h = (int) date('G', $ts);
                if ($h <= 7) {
                    $bKey = '07:00';
                } elseif ($h === 8) {
                    $bKey = '08:00';
                } elseif ($h === 9) {
                    $bKey = '09:00';
                } elseif ($h === 10) {
                    $bKey = '10:00';
                } elseif ($h === 11) {
                    $bKey = '11:00';
                } elseif ($h <= 13) {
                    $bKey = '12:00';
                } elseif ($h <= 15) {
                    $bKey = '14:00';
                } else {
                    $bKey = '16:00';
                }
                if ($cpType === 'stock_warehouse') {
                    $hourlyBuckets[$bKey]['stockCount']++;
                } else {
                    $hourlyBuckets[$bKey]['venueCount']++;
                }
            } elseif ($action === 'check_out') {
                $checkpointStats[$cpKey]['checked_out_today']++;
                unset($checkpointStats[$cpKey]['active_users'][$uid]);
            }
        }

        if (!isset($userDailyMap[$uid])) {
            $userDailyMap[$uid] = [
                'state' => 'ready',
                'overnight_shift' => false,
                'check_in_short' => null,
                'check_in_full' => null,
                'check_out_short' => null,
                'check_out_full' => null,
                'punctuality_code' => 'on_time',
                'punctuality_label' => 'READY',
                'last_checkpoint_type' => $cpType,
                'last_checkpoint_id' => $cpId,
                'last_checkpoint_name' => (string) ($log['checkpoint_name'] ?? ''),
                'last_scanned_at' => (string) ($log['scanned_at'] ?? ''),
                'denied_count' => 0,
                'last_denial_reason' => null,
            ];
        }

        if ($status === 'denied') {
            $userDailyMap[$uid]['denied_count']++;
            $userDailyMap[$uid]['last_denial_reason'] = (string) ($log['denial_reason'] ?? 'Access Denied');
        } elseif ($action === 'check_in') {
            $userDailyMap[$uid]['state'] = 'checked_in';
            $userDailyMap[$uid]['overnight_shift'] = false;
            $userDailyMap[$uid]['check_in_short'] = date('h:i A', $ts);
            $userDailyMap[$uid]['check_in_full'] = date('h:i:s A', $ts);
            $userDailyMap[$uid]['check_out_short'] = null;
            $userDailyMap[$uid]['check_out_full'] = null;
            $userDailyMap[$uid]['punctuality_code'] = $punct;
            $userDailyMap[$uid]['punctuality_label'] = $punct === 'late'
                ? 'LATE CALL-TIME'
                : ($punct === 'early' ? 'EARLY ARRIVAL' : 'ON TIME');
            $userDailyMap[$uid]['last_checkpoint_type'] = $cpType;
            $userDailyMap[$uid]['last_checkpoint_id'] = $cpId;
            $userDailyMap[$uid]['last_checkpoint_name'] = (string) ($log['checkpoint_name'] ?? '');
            $userDailyMap[$uid]['last_scanned_at'] = (string) ($log['scanned_at'] ?? '');
        } elseif ($action === 'check_out') {
            $userDailyMap[$uid]['state'] = 'checked_out';
            $userDailyMap[$uid]['check_out_short'] = date('h:i A', $ts);
            $userDailyMap[$uid]['check_out_full'] = date('h:i:s A', $ts);
            $userDailyMap[$uid]['last_checkpoint_type'] = $cpType;
            $userDailyMap[$uid]['last_checkpoint_id'] = $cpId;
            $userDailyMap[$uid]['last_checkpoint_name'] = (string) ($log['checkpoint_name'] ?? '');
            $userDailyMap[$uid]['last_scanned_at'] = (string) ($log['scanned_at'] ?? '');
        }
    }

    // 4. Load Users & Badges
    $usersSql = "
        SELECT
            u.`id`,
            u.`username`,
            u.`full_name`,
            u.`email`,
            u.`phone`,
            u.`role`,
            u.`department`,
            u.`profile_image`,
            u.`assigned_checkpoint_type`,
            u.`assigned_checkpoint_id`,
            u.`assignment_expires_at`,
            u.`is_active`,
            ub.`badge_code` AS `raw_badge_code`,
            ub.`rfid_uid`,
            ub.`clearance_level`,
            ub.`stock_access_mode`,
            ub.`allowed_stock_ids`,
            ub.`venue_access_mode`,
            ub.`allowed_event_ids`,
            ub.`badge_status`,
            ub.`emergency_contact`,
            ub.`blood_group`,
            ub.`issued_at`,
            ub.`expires_at`
        FROM `users` u
        LEFT JOIN `user_badges` ub ON ub.`user_id` = u.`id`
        ORDER BY u.`id` ASC
    ";
    $userRows = $pdo->query($usersSql)->fetchAll();

    $crew = [];
    $crewById = [];
    $rollCallList = [];
    $tierCounts = [];
    try {
        $lvlStmt = $pdo->query("SELECT `code` FROM `access_clearance_levels` WHERE `is_active` = 1 ORDER BY `sort_order` ASC, `id` ASC");
        while ($lvlRow = $lvlStmt->fetch(PDO::FETCH_ASSOC)) {
            $c = strtoupper(trim((string)$lvlRow['code']));
            if ($c !== '') {
                $tierCounts[$c] = 0;
            }
        }
    } catch (Throwable $e) {}
    if (empty($tierCounts)) {
        $tierCounts = ['L1' => 0, 'L2' => 0, 'L3' => 0, 'L4' => 0];
    }
    $activeBadgesCount = 0;

    foreach ($userRows as $ur) {
        $uid = (int) $ur['id'];
        $fullName = trim((string) ($ur['full_name'] ?: $ur['username']));
        $username = (string) ($ur['username'] ?? ('user' . $uid));
        $role = strtolower(trim((string) ($ur['role'] ?? 'technician')));
        $dept = trim((string) ($ur['department'] ?: 'Production'));
        $tier = normalizeClearanceTier((string) ($ur['clearance_level'] ?? ''), $role);
        $tierCode = $tier['code'];
        $tierCounts[$tierCode] = ($tierCounts[$tierCode] ?? 0) + 1;

        $badgeStatus = strtolower(trim((string) ($ur['badge_status'] ?? 'active')));
        if ($badgeStatus === 'active') {
            $activeBadgesCount++;
        }

        $rewBadge = formatRewBadgeCode($uid, $ur['raw_badge_code'] ?? null);
        $staffCode = formatStaffCode($uid);

        $cpEval = evaluateCheckpointAccess(array_merge($ur, ['clearance_level' => $tier['key']]), $activeCpType, $activeCpId);
        $uDaily = $userDailyMap[$uid] ?? null;
        $dailyState = $uDaily['state'] ?? 'ready';

        $linkedBatches = getLinkedBatchesForUser($pdo, $uid, $fullName, $username);

        $assignedCpObj = findCheckpointRecord(
            $stockWarehouses,
            $eventVenues,
            (string) ($ur['assigned_checkpoint_type'] ?? ''),
            (string) ($ur['assigned_checkpoint_id'] ?? '')
        );

        $member = [
            'id' => $uid,
            'username' => $username,
            'full_name' => $fullName,
            'email' => (string) ($ur['email'] ?? ($username . '@ability.rw')),
            'phone' => (string) ($ur['phone'] ?: '+250 788 100 ' . str_pad((string) $uid, 3, '0', STR_PAD_LEFT)),
            'role' => $role,
            'role_display' => formatRoleDisplay($role),
            'department' => $dept,
            'profile_image_url' => resolveProfileImageUrl($ur['profile_image'] ?? null),
            'assigned_checkpoint_type' => $assignedCpObj ? $assignedCpObj['type'] : ($ur['assigned_checkpoint_type'] ?: null),
            'assigned_checkpoint_id' => $assignedCpObj ? (string) $assignedCpObj['id'] : ($ur['assigned_checkpoint_id'] ?: null),
            'assigned_checkpoint_name' => $assignedCpObj ? $assignedCpObj['name'] : null,
            'assignment_expires_at' => $ur['assignment_expires_at'] ?: null,
            'initials' => computeInitials($fullName),
            'badge_code' => $rewBadge,
            'raw_badge_code' => (string) ($ur['raw_badge_code'] ?: $rewBadge),
            'staff_code' => $staffCode,
            'rfid_uid' => (string) ($ur['rfid_uid'] ?: ('RFID-88' . str_pad((string) $uid, 2, '0', STR_PAD_LEFT))),
            'badge_status' => $badgeStatus,
            'clearance_level' => $tier['key'],
            'clearance_code' => $tier['code'],
            'clearance_title' => $tier['title'],
            'clearance_short' => $tier['short'],
            'clearance_color' => $tier['color'],
            'stock_access_mode' => (string) ($ur['stock_access_mode'] ?? ($tier['code'] === 'L1' ? 'none' : 'all')),
            'venue_access_mode' => (string) ($ur['venue_access_mode'] ?? 'all'),
            'stock_authorized' => $tier['code'] !== 'L1' && $badgeStatus === 'active',
            'checkpoint_authorized' => (bool) $cpEval['allowed'],
            'checkpoint_auth_reason' => (string) $cpEval['reason'],
            'daily_state' => $dailyState,
            'overnight_shift' => (bool) ($uDaily['overnight_shift'] ?? false),
            'check_in_time' => $uDaily['check_in_short'] ?? null,
            'check_in_full' => $uDaily['check_in_full'] ?? null,
            'check_out_time' => $uDaily['check_out_short'] ?? null,
            'check_out_full' => $uDaily['check_out_full'] ?? null,
            'punctuality_code' => $uDaily['punctuality_code'] ?? 'on_time',
            'punctuality' => $uDaily['punctuality_label'] ?? 'READY',
            'checkpoint_type' => $uDaily['last_checkpoint_type'] ?? null,
            'checkpoint_id' => $uDaily['last_checkpoint_id'] ?? null,
            'checkpoint_name' => $uDaily['last_checkpoint_name'] ?? null,
            'last_checkpoint_type' => $uDaily['last_checkpoint_type'] ?? null,
            'last_checkpoint_id' => $uDaily['last_checkpoint_id'] ?? null,
            'last_checkpoint_name' => $uDaily['last_checkpoint_name'] ?? null,
            'is_active' => (int) ($ur['is_active'] ?? 1),
            'allowed_stock_ids' => json_decode((string) ($ur['allowed_stock_ids'] ?? '[]'), true) ?: [],
            'allowed_event_ids' => json_decode((string) ($ur['allowed_event_ids'] ?? '[]'), true) ?: [],
            'linked_batches' => $linkedBatches,
        ];

        $crew[] = $member;
        $crewById[$uid] = $member;

        if ($dailyState === 'checked_in') {
            $rollCallList[] = [
                'user_id' => $uid,
                'full_name' => $fullName,
                'role_display' => $member['role_display'],
                'department' => $dept,
                'badge_code' => $rewBadge,
                'staff_code' => $staffCode,
                'clearance_code' => $tier['code'],
                'clearance_color' => $tier['color'],
                'checkpoint_type' => $uDaily['last_checkpoint_type'] ?? 'event_venue',
                'checkpoint_name' => $uDaily['last_checkpoint_name'] ?: $activeCpName,
                'check_in_time' => $uDaily['check_in_short'] ?? '08:00 AM',
                'punctuality' => $uDaily['punctuality_label'] ?? 'ON TIME',
                'initials' => $member['initials'],
                'profile_image_url' => $member['profile_image_url'],
            ];
        }
    }

    // 5. Enrich Checkpoints Directory (for Frame 2: Venues & Stock Gates)
    $allCheckpointsDirectory = [];
    foreach ($stockWarehouses as &$sw) {
        $cpKey = 'stock_warehouse:' . $sw['id'];
        $st = $checkpointStats[$cpKey] ?? ['checked_in_today' => 0, 'checked_out_today' => 0, 'denied_today' => 0, 'active_users' => []];
        $sw['checked_in_today'] = (int) $st['checked_in_today'];
        $sw['on_site_now'] = count($st['active_users']);
        $sw['denied_today'] = (int) $st['denied_today'];
        $sw['station_mode'] = 'Gate Controller Terminal';
        $allCheckpointsDirectory[] = $sw;
    }
    unset($sw);

    foreach ($eventVenues as &$ev) {
        $cpKey = 'event_venue:' . $ev['id'];
        $st = $checkpointStats[$cpKey] ?? ['checked_in_today' => 0, 'checked_out_today' => 0, 'denied_today' => 0, 'active_users' => []];
        $ev['checked_in_today'] = (int) $st['checked_in_today'];
        $ev['on_site_now'] = count($st['active_users']);
        $ev['denied_today'] = (int) $st['denied_today'];
        $ev['station_mode'] = 'PIN-Locked Entrance Station';
        $allCheckpointsDirectory[] = $ev;
    }
    unset($ev);

    // 6. Load All Equipment Batches (`stock_movements`)
    $allBatches = [];
    try {
        $bRows = $pdo->query("SELECT * FROM `stock_movements` ORDER BY `id` DESC LIMIT 50")->fetchAll();
        $itemStmt = $pdo->prepare("SELECT `id`, `item_name`, `quantity`, `serial_number`, `status` FROM `batch_items` WHERE `batch_id` = ? ORDER BY `id` ASC LIMIT 50");
        foreach ($bRows as $br) {
            $bid = (int) $br['id'];
            $techId = (int) ($br['technician_id'] ?? 0);
            $techMember = $crewById[$techId] ?? null;
            $items = [];
            try {
                $itemStmt->execute([$bid]);
                $items = $itemStmt->fetchAll();
            } catch (Throwable $e) {
                $items = [];
            }
            $allBatches[] = [
                'id' => $bid,
                'batch_number' => (string) ($br['batch_number'] ?? ('BATCH-' . $bid)),
                'movement_type' => (string) ($br['movement_type'] ?? 'stock_to_venue_room'),
                'source_name' => (string) ($br['source_name'] ?? 'Ndera Warehouse'),
                'destination_name' => (string) ($br['destination_name'] ?? 'Kigali Convention Centre'),
                'destination_room' => (string) ($br['destination_room'] ?? 'Main Auditorium'),
                'technician_id' => $techId,
                'technician_name' => $techMember ? $techMember['full_name'] : (string) ($br['submitted_by'] ?: 'Eric Havugimana'),
                'technician_badge' => $techMember ? $techMember['badge_code'] : 'REW-BADGE-0006',
                'technician_clearance' => $techMember ? $techMember['clearance_code'] : 'L2',
                'stock_controller_id' => (int) ($br['stock_controller_id'] ?? 0),
                'stock_controller_name' => (string) ($br['stock_controller_name'] ?: 'Mirene Uwase'),
                'submitted_by' => (string) ($br['submitted_by'] ?? ''),
                'notes' => (string) ($br['notes'] ?? ''),
                'status' => strtolower((string) ($br['status'] ?? $br['approval_status'] ?? 'approved')),
                'event_name' => (string) ($br['event_name'] ?: 'World Bank Summit'),
                'job_sheet' => (string) ($br['job_sheet'] ?: 'JS-2026-104'),
                'created_at' => (string) ($br['created_at'] ?: date('Y-m-d H:i:s')),
                'items' => $items,
            ];
        }
    } catch (Throwable $e) {
    }

    // 7. Build User Activity Timeline (from `attendance_logs` newest first)
    $timelineRows = $pdo->query("SELECT * FROM `attendance_logs` ORDER BY `scanned_at` DESC, `id` DESC LIMIT 60")->fetchAll();
    $activityTimeline = [];
    foreach ($timelineRows as $tr) {
        $uid = (int) $tr['user_id'];
        $member = $crewById[$uid] ?? ($crew[0] ?? null);
        $cpType = (string) ($tr['checkpoint_type'] ?? 'event_venue');
        $cpName = (string) ($tr['checkpoint_name'] ?: ($cpType === 'stock_warehouse' ? 'Ndera Warehouse' : 'Kigali Convention Centre'));
        $scanAction = (string) ($tr['scan_action'] ?? 'check_in');
        $accessStatus = (string) ($tr['access_status'] ?? 'granted');
        $ts = strtotime((string) $tr['scanned_at']) ?: time();

        $notes = (string) ($tr['notes'] ?? '');
        $isTransit = (stripos($notes, 'Transit departure') !== false || stripos($notes, 'Transferred') !== false || stripos($notes, 'Arrived on site from') !== false);

        if ($accessStatus === 'denied') {
            $actionTitle = 'Access Denied at ' . ($cpType === 'stock_warehouse' ? 'Stock — ' : 'Venue — ') . $cpName;
        } elseif ($scanAction === 'check_out') {
            if (stripos($notes, 'Transit departure') !== false) {
                $actionTitle = 'Transit Departure from ' . $cpName;
            } else {
                $actionTitle = ($cpType === 'stock_warehouse' ? 'Signed out from stock — ' : 'Checked out from Venue — ') . $cpName;
            }
        } elseif ($scanAction === 'access_verify') {
            $actionTitle = 'Verified clearance at ' . $cpName;
        } else {
            if (stripos($notes, 'Arrived on site from') !== false) {
                $actionTitle = 'Arrived at Venue — ' . $cpName . ' (Transferred from Stock)';
            } else {
                $actionTitle = ($cpType === 'stock_warehouse' ? 'Checked in to Stock — ' : 'Entered Venue — ') . $cpName;
            }
        }

        $uDaily = $userDailyMap[$uid] ?? null;
        $inTime = $scanAction === 'check_in' ? date('h:i A', $ts) : ($uDaily['check_in_short'] ?? date('h:i A', $ts));
        $outTime = $scanAction === 'check_out' ? date('h:i A', $ts) : ($uDaily['check_out_short'] ?? null);

        $activityTimeline[] = [
            'id' => (int) $tr['id'],
            'user_id' => $uid,
            'full_name' => $member ? $member['full_name'] : 'Production Crew',
            'role_display' => $member ? $member['role_display'] : 'Technician',
            'department' => $member ? $member['department'] : 'Audio',
            'badge_code' => $member ? $member['badge_code'] : (string) $tr['badge_code'],
            'staff_code' => $member ? $member['staff_code'] : formatStaffCode($uid),
            'clearance_code' => $member ? $member['clearance_code'] : 'L2',
            'clearance_color' => $member ? $member['clearance_color'] : '#2563eb',
            'profile_image_url' => $member ? $member['profile_image_url'] : null,
            'initials' => $member ? $member['initials'] : 'CR',
            'checkpoint_type' => $cpType,
            'checkpoint_id' => (int) ($tr['checkpoint_id'] ?? 1),
            'checkpoint_name' => $cpName,
            'scan_action' => $scanAction,
            'access_status' => $accessStatus,
            'denial_reason' => (string) ($tr['denial_reason'] ?? ''),
            'punctuality_status' => (string) ($tr['punctuality_status'] ?? 'on_time'),
            'notes' => $notes,
            'is_transit' => $isTransit,
            'action_title' => $actionTitle,
            'scanned_at' => (string) $tr['scanned_at'],
            'formatted_time' => date('M j, Y • h:i:s A', $ts),
            'in_pill' => $inTime ? ('In: ' . $inTime) : null,
            'out_pill' => $outTime ? ('Out: ' . $outTime) : null,
        ];
    }

    // 8. Build Default Verification Deck Payload (Prefer Eric `id=6` or first technician with a linked batch)
    $featuredMember = $crewById[6] ?? null;
    if (!$featuredMember) {
        foreach ($crew as $cm) {
            if (!empty($cm['linked_batches'])) {
                $featuredMember = $cm;
                break;
            }
        }
    }
    if (!$featuredMember && !empty($crew)) {
        $featuredMember = $crew[0];
    }

    $defaultVerification = $featuredMember
        ? buildVerificationCardPayload($pdo, $featuredMember, $activeCpType, $activeCpId, $activeCpName)
        : null;

    // 9. Build Clearance Matrix Summary (Dynamic from MySQL `access_clearance_levels`)
    $clearanceMatrix = getClearanceMatrixFromDb($pdo, $tierCounts);

    $authUserId = (int) ($_SESSION['auth_user_id'] ?? 0);
    $currentUser = ($authUserId > 0 && isset($crewById[$authUserId])) ? $crewById[$authUserId] : null;
    if ($currentUser) {
        $cRole = strtolower(trim((string)($currentUser['role'] ?? 'user')));
        $cClearance = strtoupper(trim((string)($currentUser['clearance_code'] ?? 'L1')));
        $isAdmin = in_array($cRole, ['admin', 'manager', 'administrator'], true);
        $isTechLead = $cRole === 'tech_lead' || $isAdmin;
        $isStockMgr = $cRole === 'stock_manager' || $isAdmin;
        $isStockCtrl = $cRole === 'stock_controller';

        $currentUser['permissions'] = [
            'is_admin' => $isAdmin,
            'is_tech_lead' => $isTechLead,
            'is_stock_manager' => $isStockMgr,
            'is_stock_controller' => $isStockCtrl,
            'can_add_user' => $isAdmin || $isTechLead || $isStockMgr,
            'can_delete_user' => $isAdmin,
            'can_edit_tiers' => $isAdmin,
            'can_assign_event_crew' => $isTechLead || $isAdmin,
            'can_set_call_time' => $isTechLead || $isAdmin || $isStockMgr,
            'can_manage_warehouses' => $isStockMgr || $isAdmin,
            'can_approve_shift_requests' => $isAdmin || $isStockMgr,
            'can_request_shift_relief' => $isAdmin || $isStockMgr || $isStockCtrl || $isTechLead,
            'can_assign_controller_checkpoint' => $isAdmin || $isStockMgr,
            'max_assignable_tier' => $isAdmin ? 'L4' : ($isStockMgr ? 'L3' : ($isTechLead ? 'L2' : 'none')),
            'delegation_summary' => $isAdmin
                ? 'Full Administrator — All digital and physical systems unconstrained.'
                : ($isTechLead
                    ? 'Technical Lead — Authorized to set Call Times, assign event crew, and onboard technical personnel (L1/L2).'
                    : ($isStockMgr
                        ? 'Site Manager — Authorized for facility gates, controller relief approvals, and site crew/controller onboarding.'
                        : ($isStockCtrl
                            ? 'Gate Controller — Strictly locked to one assigned Gate Terminal; cross-gate relief requires Administrator or Site Manager approval.'
                            : 'Standard Personnel — View personal profile and attendance.')))
        ];
    }

    // 10. Load Gate Controller Shift / Relief Requests
    $shiftRequests = [];
    $pendingShiftRequestCount = 0;
    try {
        $srRows = $pdo->query("SELECT * FROM `controller_shift_requests` ORDER BY CASE WHEN `status` = 'pending' THEN 0 ELSE 1 END, `id` DESC LIMIT 60")->fetchAll();
        foreach ($srRows as $sr) {
            $reqBy = $crewById[(int) ($sr['requested_by_id'] ?? 0)] ?? null;
            $outCtrl = $crewById[(int) ($sr['outgoing_controller_id'] ?? 0)] ?? null;
            $repCtrl = $crewById[(int) ($sr['replacement_controller_id'] ?? 0)] ?? null;
            $revBy = $crewById[(int) ($sr['reviewed_by_id'] ?? 0)] ?? null;
            $st = strtolower((string) ($sr['status'] ?? 'pending'));
            if ($st === 'pending') {
                $pendingShiftRequestCount++;
            }
            $shiftRequests[] = [
                'id' => (int) $sr['id'],
                'checkpoint_type' => (string) ($sr['checkpoint_type'] ?? 'stock_warehouse'),
                'checkpoint_id' => (string) ($sr['checkpoint_id'] ?? ''),
                'checkpoint_name' => (string) ($sr['checkpoint_name'] ?? 'Assigned Gate'),
                'requested_by_id' => (int) ($sr['requested_by_id'] ?? 0),
                'requested_by_name' => $reqBy ? $reqBy['full_name'] : 'Staff Member',
                'requested_by_role' => $reqBy ? $reqBy['role_display'] : '',
                'outgoing_controller_id' => $sr['outgoing_controller_id'] ? (int) $sr['outgoing_controller_id'] : null,
                'outgoing_controller_name' => $outCtrl ? $outCtrl['full_name'] : null,
                'replacement_controller_id' => (int) ($sr['replacement_controller_id'] ?? 0),
                'replacement_controller_name' => $repCtrl ? $repCtrl['full_name'] : 'Unassigned',
                'replacement_controller_badge' => $repCtrl ? $repCtrl['badge_code'] : '',
                'reason_type' => (string) ($sr['reason_type'] ?? 'shift_swap'),
                'notes' => (string) ($sr['notes'] ?? ''),
                'shift_start' => $sr['shift_start'] ?? null,
                'shift_end' => $sr['shift_end'] ?? null,
                'status' => $st,
                'reviewed_by_id' => $sr['reviewed_by_id'] ? (int) $sr['reviewed_by_id'] : null,
                'reviewed_by_name' => $revBy ? $revBy['full_name'] : null,
                'reviewed_by_role' => $revBy ? $revBy['role_display'] : null,
                'reviewed_at' => $sr['reviewed_at'] ?? null,
                'review_notes' => (string) ($sr['review_notes'] ?? ''),
                'created_at' => (string) ($sr['created_at'] ?? ''),
            ];
        }
    } catch (Throwable $e) {}

    $readNotifIds = [];
    if ($authUserId > 0) {
        try {
            $notifStmt = $pdo->prepare("SELECT `notif_id` FROM `user_notification_reads` WHERE `user_id` = ? ORDER BY `read_at` DESC LIMIT 500");
            $notifStmt->execute([$authUserId]);
            $readNotifIds = array_values(array_filter(array_map('strval', $notifStmt->fetchAll(PDO::FETCH_COLUMN))));
        } catch (Throwable $e) {}
    }

    return [
        'ok' => true,
        'dbSource' => $activeDb,
        'csrfToken' => getSessionCsrfToken(),
        'currentUser' => $currentUser,
        'read_notif_ids' => $readNotifIds,
        'clearanceMatrix' => $clearanceMatrix,
        'checkpoints' => [
            'stock_warehouses' => $stockWarehouses,
            'event_venues' => $eventVenues,
            'directory' => $allCheckpointsDirectory,
        ],
        'activeCheckpoint' => $activeCheckpoint,
        'kpis' => [
            'activeBadges' => $activeBadgesCount,
            'totalStaff' => count($crew),
            'tierCounts' => $tierCounts,
            'currentlyOnSite' => count($rollCallList),
            'venueCheckinsToday' => $venueCheckinsToday,
            'stockCheckinsToday' => $stockCheckinsToday,
            'totalGrantedToday' => $venueCheckinsToday + $stockCheckinsToday,
            'lateArrivalsToday' => $lateArrivalsToday,
            'deniedScansToday' => $deniedScansToday,
        ],
        'rollCallList' => $rollCallList,
        'crew' => $crew,
        'hourlyTraffic' => array_values($hourlyBuckets),
        'activityTimeline' => $activityTimeline,
        'batches' => $allBatches,
        'shiftRequests' => $shiftRequests,
        'pendingShiftRequestCount' => $pendingShiftRequestCount,
        'defaultVerification' => $defaultVerification,
        'roles' => getRolesList($pdo, $crew),
        'departments' => getDepartmentsList($pdo, $crew),
        'navigationConfig' => getNavigationConfig($pdo),
    ];
}

function findCrewMemberByScanInput(array $crew, string $scanInput): ?array
{
    $needle = trim($scanInput);
    if ($needle === '') {
        return null;
    }
    $upper = strtoupper($needle);
    $lower = strtolower($needle);

    // 1. Exact badge_code, raw_badge_code, staff_code, rfid_uid, or numeric user_id
    foreach ($crew as $cm) {
        if (
            strtoupper($cm['badge_code']) === $upper ||
            strtoupper($cm['raw_badge_code']) === $upper ||
            strtoupper($cm['staff_code']) === $upper ||
            strtoupper($cm['rfid_uid']) === $upper ||
            (is_numeric($needle) && (int) $needle === (int) $cm['id'])
        ) {
            return $cm;
        }
    }

    // 2. Match trailing digits on REW-BADGE-XXXX / ABL-BDG-XXXX / ABL-XXX
    if (preg_match('/(\d{1,4})$/', $upper, $m)) {
        $parsedId = (int) $m[1];
        foreach ($crew as $cm) {
            if ((int) $cm['id'] === $parsedId) {
                return $cm;
            }
        }
    }

    // 3. Exact or partial username / full_name match
    foreach ($crew as $cm) {
        if (strtolower($cm['username']) === $lower || strtolower($cm['full_name']) === $lower) {
            return $cm;
        }
    }
    foreach ($crew as $cm) {
        if (
            strpos(strtolower($cm['full_name']), $lower) !== false ||
            strpos(strtolower($cm['username']), $lower) !== false ||
            strpos(strtoupper($cm['badge_code']), $upper) !== false
        ) {
            return $cm;
        }
    }

    return null;
}

try {
    $activeDb = '';
    $pdo = getDbConnection($activeDb);

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $rawBody = file_get_contents('php://input');
    $jsonBody = ($rawBody !== false && $rawBody !== '') ? json_decode($rawBody, true) : [];
    if (!is_array($jsonBody)) {
        $jsonBody = [];
    }

    $action = (string) ($_GET['action'] ?? $_POST['action'] ?? $_POST['ajax_action'] ?? $jsonBody['action'] ?? $jsonBody['ajax_action'] ?? 'bootstrap');
    $reqCpType = (string) ($_GET['checkpoint_type'] ?? $_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'stock_warehouse');
    $reqCpId = (int) ($_GET['checkpoint_id'] ?? $_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? 1);

    // P0 Security Gate: Require active authenticated session for all protected endpoints
    $publicActions = ['login', 'logout', 'auth_status', 'get_current_user'];
    if (!in_array($action, $publicActions, true) && empty($_SESSION['auth_user_id'])) {
        http_response_code(401);
        echo json_encode([
            'ok' => false,
            'authenticated' => false,
            'error' => 'Authentication required. Please sign in.',
        ]);
        exit;
    }

    // CSRF validation on authenticated mutating POST requests
    if (
        strtoupper((string) $method) === 'POST'
        && !empty($_SESSION['auth_user_id'])
        && !in_array($action, ['login', 'logout'], true)
        && !validateCsrfForAuthenticatedPost($jsonBody)
    ) {
        http_response_code(403);
        echo json_encode([
            'ok' => false,
            'error' => 'Invalid or expired security token. Refresh the page and try again.',
        ]);
        exit;
    }

    if ($action === 'bootstrap') {
        echo json_encode(buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId));
        exit;
    }

    if ($action === 'auth_status' || $action === 'get_current_user') {
        $authId = (int) ($_SESSION['auth_user_id'] ?? 0);
        if ($authId <= 0) {
            echo json_encode([
                'ok' => true,
                'authenticated' => false,
                'user' => null,
                'dbSource' => $activeDb,
            ]);
            exit;
        }
        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $curr = null;
        if (isset($full['crew'])) {
            foreach ($full['crew'] as $c) {
                if ((int)$c['id'] === $authId) {
                    $curr = $c;
                    break;
                }
            }
        }
        echo json_encode([
            'ok' => true,
            'authenticated' => ($curr !== null),
            'user' => $curr,
            'dbSource' => $activeDb,
        ]);
        exit;
    }

    if ($action === 'login') {
        $username = trim((string) ($_POST['username'] ?? $jsonBody['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? $jsonBody['password'] ?? '');

        if ($username === '') {
            echo json_encode(['ok' => false, 'error' => 'Please enter your username, email, or badge code.']);
            exit;
        }
        if ($password === '') {
            echo json_encode(['ok' => false, 'error' => 'Please enter your password.']);
            exit;
        }

        $clientIp = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'local'));
        $loginRateKey = 'login:' . sha1(strtolower($clientIp) . '|' . strtolower($username));
        $rateCheck = checkSecurityRateLimit($pdo, $loginRateKey, 5, 600);
        if (!$rateCheck['allowed']) {
            http_response_code(429);
            echo json_encode([
                'ok' => false,
                'error' => "Too many failed login attempts. Try again in {$rateCheck['retry_after']}s.",
            ]);
            exit;
        }

        // Search user by username, email, or badge code
        $stmt = $pdo->prepare("
            SELECT u.*, b.badge_code, b.clearance_level, b.badge_status
            FROM `users` u
            LEFT JOIN `user_badges` b ON b.user_id = u.id
            WHERE LOWER(u.username) = LOWER(?)
               OR LOWER(u.email) = LOWER(?)
               OR UPPER(b.badge_code) = UPPER(?)
            LIMIT 1
        ");
        $stmt->execute([$username, $username, $username]);
        $userRow = $stmt->fetch();

        if (!$userRow) {
            recordFailedRateLimit($pdo, $loginRateKey, 5, 600, 60);
            echo json_encode(['ok' => false, 'error' => "No account found matching '{$username}'."]);
            exit;
        }

        if ((int) ($userRow['is_active'] ?? 1) === 0) {
            echo json_encode(['ok' => false, 'error' => 'This account has been deactivated. Please contact an administrator.']);
            exit;
        }

        $storedHash = (string) ($userRow['password_hash'] ?? '');
        $passValid = ($storedHash !== '' && password_verify($password, $storedHash));

        if (!$passValid) {
            recordFailedRateLimit($pdo, $loginRateKey, 5, 600, 60);
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Invalid username or password.']);
            exit;
        }

        clearSecurityRateLimit($pdo, $loginRateKey);
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_regenerate_id(true);
        }
        $_SESSION['auth_user_id'] = (int) $userRow['id'];
        $_SESSION['auth_user_role'] = strtolower((string)$userRow['role']);
        $freshCsrf = getSessionCsrfToken();

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $matchedMember = $full['currentUser'] ?? null;
        if (!$matchedMember) {
            foreach ($full['crew'] as $c) {
                if ((int)$c['id'] === (int)$userRow['id']) {
                    $matchedMember = $c;
                    break;
                }
            }
        }

        echo json_encode([
            'ok' => true,
            'message' => "Welcome back, {$userRow['full_name']}!",
            'user' => $matchedMember ?: $userRow,
            'csrfToken' => $freshCsrf,
            'dbSource' => $activeDb,
        ]);
        exit;
    }

    if ($action === 'register') {
        // Enforce strict Administrator-Only Registration Control
        $caller = getCallerUser($pdo);
        $callerRole = strtolower(trim((string)($caller['role'] ?? '')));
        $isAdminAuthorized = ($caller !== null && in_array($callerRole, ['admin', 'manager', 'administrator'], true));

        if (!$isAdminAuthorized) {
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'error' => 'Staff registration is restricted. Only authenticated System Administrators can provision new accounts.',
            ]);
            exit;
        }

        $fullName = trim((string) ($_POST['full_name'] ?? $jsonBody['full_name'] ?? ''));
        $username = strtolower(trim((string) ($_POST['username'] ?? $jsonBody['username'] ?? '')));
        $email = strtolower(trim((string) ($_POST['email'] ?? $jsonBody['email'] ?? '')));
        $phone = trim((string) ($_POST['phone'] ?? $jsonBody['phone'] ?? '+250 788 100 200'));
        $password = (string) ($_POST['password'] ?? $jsonBody['password'] ?? '');
        $role = strtolower(trim((string) ($_POST['role'] ?? $jsonBody['role'] ?? 'technician')));
        $department = trim((string) ($_POST['department'] ?? $jsonBody['department'] ?? 'Production'));

        if ($fullName === '') {
            echo json_encode(['ok' => false, 'error' => 'Full Name is required.']);
            exit;
        }
        if (strlen($username) < 3) {
            echo json_encode(['ok' => false, 'error' => 'Username must be at least 3 characters.']);
            exit;
        }
        if (!preg_match('/^[a-z0-9_.-]+$/', $username)) {
            echo json_encode(['ok' => false, 'error' => 'Username can only contain letters, numbers, dots, and underscores.']);
            exit;
        }
        if (strlen($password) < 4) {
            echo json_encode(['ok' => false, 'error' => 'Password must be at least 4 characters.']);
            exit;
        }

        $uCheck = $pdo->prepare("SELECT id FROM `users` WHERE LOWER(username) = ? LIMIT 1");
        $uCheck->execute([$username]);
        if ($uCheck->fetch()) {
            echo json_encode(['ok' => false, 'error' => "The username '{$username}' is already taken. Please choose another."]);
            exit;
        }

        if ($email !== '') {
            $eCheck = $pdo->prepare("SELECT id FROM `users` WHERE LOWER(email) = ? LIMIT 1");
            $eCheck->execute([$email]);
            if ($eCheck->fetch()) {
                echo json_encode(['ok' => false, 'error' => "An account with email '{$email}' already exists."]);
                exit;
            }
        } else {
            $email = $username . '@ability.rw';
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $insUser = $pdo->prepare("
            INSERT INTO `users` (`username`, `full_name`, `email`, `password_hash`, `phone`, `role`, `department`, `is_active`)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $insUser->execute([$username, $fullName, $email, $passwordHash, $phone, $role, $department]);
        $newUserId = (int) $pdo->lastInsertId();

        $tier = normalizeClearanceTier('', $role);
        $badgeCode = 'REW-BADGE-' . str_pad((string)$newUserId, 4, '0', STR_PAD_LEFT);
        $rfidUid = 'RFID-88' . str_pad((string)$newUserId, 2, '0', STR_PAD_LEFT);
        $stockMode = ($tier['code'] === 'L1') ? 'none' : 'all';
        $venueMode = 'all';

        $insBadge = $pdo->prepare("
            INSERT INTO `user_badges`
            (`user_id`, `badge_code`, `rfid_uid`, `clearance_level`, `stock_access_mode`, `venue_access_mode`, `badge_status`, `issued_at`, `expires_at`)
            VALUES (?, ?, ?, ?, ?, ?, 'active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
        ");
        $insBadge->execute([$newUserId, $badgeCode, $rfidUid, $tier['key'], $stockMode, $venueMode]);

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $newUserMember = null;
        foreach ($full['crew'] as $c) {
            if ((int)$c['id'] === $newUserId) {
                $newUserMember = $c;
                break;
            }
        }

        echo json_encode([
            'ok' => true,
            'message' => "Registration complete! Digital Badge {$badgeCode} ({$tier['code']}) generated.",
            'user' => $newUserMember,
            'badgeCode' => $badgeCode,
        ]);
        exit;
    }

    if ($action === 'logout') {
        $_SESSION = [];
        if (session_id()) {
            session_destroy();
        }
        echo json_encode([
            'ok' => true,
            'message' => 'Signed out successfully.',
        ]);
        exit;
    }

    if ($action === 'switch_user') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('switch_user', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $targetId = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        $targetBadge = trim((string) ($_POST['badge_code'] ?? $jsonBody['badge_code'] ?? ''));
        $targetEmail = strtolower(trim((string) ($_POST['email'] ?? $jsonBody['email'] ?? '')));
        $targetUsername = strtolower(trim((string) ($_POST['username'] ?? $jsonBody['username'] ?? '')));
        $targetRole = strtolower(trim((string) ($_POST['role'] ?? $jsonBody['role'] ?? '')));

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $found = null;

        // 1. Explicit ID
        if ($targetId > 0) {
            foreach ($full['crew'] as $c) {
                if ((int)$c['id'] === $targetId) {
                    $found = $c;
                    break;
                }
            }
        }
        // 2. Email
        if (!$found && $targetEmail !== '') {
            foreach ($full['crew'] as $c) {
                if (strtolower((string)($c['email'] ?? '')) === $targetEmail) {
                    $found = $c;
                    break;
                }
            }
        }
        // 3. Username
        if (!$found && $targetUsername !== '') {
            foreach ($full['crew'] as $c) {
                if (strtolower((string)($c['username'] ?? '')) === $targetUsername) {
                    $found = $c;
                    break;
                }
            }
        }
        // 4. Badge code
        if (!$found && $targetBadge !== '') {
            foreach ($full['crew'] as $c) {
                if (strtoupper($c['badge_code']) === strtoupper($targetBadge) || strtoupper($c['raw_badge_code']) === strtoupper($targetBadge)) {
                    $found = $c;
                    break;
                }
            }
        }
        // 5. Role match
        if (!$found && $targetRole !== '') {
            foreach ($full['crew'] as $c) {
                if (strtolower((string)($c['role'] ?? '')) === $targetRole) {
                    $found = $c;
                    break;
                }
            }
        }

        if (!$found) {
            echo json_encode(['ok' => false, 'error' => 'Target user or persona not found.']);
            exit;
        }

        $_SESSION['auth_user_id'] = (int) $found['id'];
        $_SESSION['auth_user_role'] = strtolower((string)($found['role'] ?? ''));

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $found = $full['currentUser'] ?: $found;

        echo json_encode([
            'ok' => true,
            'message' => "Switched active operator to {$found['full_name']} ({$found['role_display']}).",
            'user' => $found,
        ]);
        exit;
    }

    if ($action === 'sync_db') {
        requireAuthorizedCaller($pdo);
        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $stats = [
            'database' => $activeDb,
            'status' => 'connected',
            'server_time' => date('Y-m-d H:i:s'),
            'total_users' => count($full['crew']),
            'active_checkpoints' => count($full['checkpoints']['directory']),
            'attendance_logs_count' => count($full['activityTimeline']),
        ];
        echo json_encode([
            'ok' => true,
            'message' => "Database connection active ({$activeDb}). All tables and credentials in sync.",
            'stats' => $stats,
            'payload' => $full,
        ]);
        exit;
    }

    if ($action === 'process_gate_scan') {
        $caller = requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager', 'tech_lead', 'stock_controller'],
            'Permission denied: Gate scanning requires an authorized Gate Controller, Technical Lead, Site Manager, or Administrator.'
        );
        $scanInput = trim((string) ($_POST['scan_input'] ?? $jsonBody['scan_input'] ?? ''));
        $scanMode = strtolower(trim((string) ($_POST['scan_mode'] ?? $jsonBody['scan_mode'] ?? 'auto')));
        $rawOfflineAt = trim((string) ($_POST['offline_scanned_at'] ?? $jsonBody['offline_scanned_at'] ?? ''));

        $nowServerTs = time();
        $effectiveTs = $nowServerTs;
        $isOfflineSync = false;
        if ($rawOfflineAt !== '') {
            $parsedOfflineTs = strtotime($rawOfflineAt);
            if ($parsedOfflineTs !== false && $parsedOfflineTs >= ($nowServerTs - 72 * 3600) && $parsedOfflineTs <= ($nowServerTs + 300)) {
                $effectiveTs = min($parsedOfflineTs, $nowServerTs);
                $isOfflineSync = true;
            }
        }
        $effectiveScannedAtSql = date('Y-m-d H:i:s', $effectiveTs);
        $effectiveDateStr = date('Y-m-d', $effectiveTs);

        $lockCheck = assertControllerCheckpointLock($pdo, (string) $reqCpType, (string) $reqCpId);
        if (!$lockCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'allowed' => false, 'error' => $lockCheck['error']]);
            exit;
        }

        $currentPayload = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $activeCp = $currentPayload['activeCheckpoint'];
        $cpType = (string) $activeCp['type'];
        $cpId = (int) $activeCp['id'];
        $cpName = (string) $activeCp['name'];
        $callTime = (string) ($activeCp['call_time'] ?? '08:00');

        $targetMember = findCrewMemberByScanInput($currentPayload['crew'], $scanInput);
        if (!$targetMember) {
            echo json_encode([
                'ok' => false,
                'allowed' => false,
                'error' => "No staff badge or crew member matched '{$scanInput}'. Try REW-BADGE-0006, REW-BADGE-0004, or a staff name.",
                'reason' => "Unrecognized Badge Code ({$scanInput})",
            ]);
            exit;
        }

        $eval = evaluateCheckpointAccess($targetMember, $cpType, $cpId);
        $allowed = (bool) $eval['allowed'];
        $reason = (string) $eval['reason'];

        $scannedBy = (int) ($caller['id'] ?? $_SESSION['auth_user_id'] ?? 1);

        $isCrossFacilityTransfer = false;
        $prevFacilityName = null;

        // Determine scan_action
        if (!$allowed) {
            $resolvedAction = 'access_verify';
            $accessStatus = 'denied';
            $denialReason = $reason;
        } else {
            $accessStatus = 'granted';
            $denialReason = null;

            $isCurrentlyCheckedIn = ($targetMember['daily_state'] === 'checked_in');
            $prevCpType = (string) ($targetMember['last_checkpoint_type'] ?? '');
            $prevCpId = (int) ($targetMember['last_checkpoint_id'] ?? 0);
            $prevCpName = (string) ($targetMember['last_checkpoint_name'] ?? '');

            // Option B: Smart Cross-Facility Transit Transfer
            // If technician is currently checked in at another facility (e.g. Ndera Warehouse) and scans at this facility (e.g. KCC),
            // auto-checkout from previous facility with transit note, and check-in to current facility.
            $isCrossFacilityTransfer = $isCurrentlyCheckedIn && (
                ($prevCpType !== '' && $prevCpType !== $cpType) ||
                ($prevCpId > 0 && $prevCpId !== $cpId)
            );

            // Prevent duplicate/invalid explicit check-in or check-out scans
            if ($scanMode === 'check_out' && !$isCurrentlyCheckedIn) {
                echo json_encode([
                    'ok' => false,
                    'allowed' => false,
                    'error' => "{$targetMember['full_name']} is already checked out (not currently checked in).",
                ]);
                exit;
            }
            if ($scanMode === 'check_in' && $isCurrentlyCheckedIn && !$isCrossFacilityTransfer) {
                echo json_encode([
                    'ok' => false,
                    'allowed' => false,
                    'error' => "{$targetMember['full_name']} is already checked in at {$cpName}.",
                ]);
                exit;
            }

            // Debounce rapid repeat scans (< 5s) at the same checkpoint so hardware scanner bounces and offline sync retries don't create duplicate logs
            if ($scanMode !== 'verify_only') {
                $recentStmt = $pdo->prepare("
                    SELECT `scan_action`, `punctuality_status`, `notes`, `scanned_at`
                    FROM `attendance_logs`
                    WHERE `user_id` = ? AND `checkpoint_type` = ? AND `checkpoint_id` = ?
                      AND `access_status` = 'granted'
                      AND `scan_action` IN ('check_in', 'check_out')
                      AND ABS(TIMESTAMPDIFF(SECOND, `scanned_at`, ?)) <= 5
                    ORDER BY `id` DESC
                    LIMIT 1
                ");
                $recentStmt->execute([(int) $targetMember['id'], $cpType, $cpId, $effectiveScannedAtSql]);
                $recentScan = $recentStmt->fetch(PDO::FETCH_ASSOC);
                if ($recentScan) {
                    $recentAction = (string) $recentScan['scan_action'];
                    $verification = buildVerificationCardPayload(
                        $pdo,
                        $targetMember,
                        $cpType,
                        $cpId,
                        $cpName,
                        [
                            'allowed' => true,
                            'reason' => ($recentAction === 'check_out' ? 'Already checked out' : 'Already checked in') . " at {$cpName} (recent scan preserved)",
                            'action' => $recentAction,
                            'punctuality' => (string) ($recentScan['punctuality_status'] ?? 'on_time'),
                            'punctuality_label' => $recentAction === 'check_out' ? 'SHIFT CHECK-OUT' : ($targetMember['punctuality'] ?? 'ON TIME'),
                            'scanned_at' => date('H:i:s', strtotime((string) $recentScan['scanned_at']) ?: $effectiveTs),
                            'check_in_time' => $targetMember['check_in_full'] ?? null,
                            'check_out_time' => $targetMember['check_out_full'] ?? null,
                        ]
                    );
                    $verification['duplicate_prevented'] = true;
                    $verification['bootstrap'] = $currentPayload;
                    echo json_encode($verification);
                    exit;
                }
            }

            if ($isCrossFacilityTransfer) {
                $prevFacilityName = $prevCpName ?: ($prevCpType === 'stock_warehouse' ? 'Ndera Warehouse' : 'Kigali Convention Centre');
                $transitOutNotes = "Transit departure → Transferred to {$cpName}";

                // 1. Auto-log checkout at previous facility
                $transitOutStmt = $pdo->prepare("
                    INSERT INTO `attendance_logs`
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, 'check_out', 'granted', NULL, 'on_time', ?, ?, ?)
                ");
                $transitOutStmt->execute([
                    (int) $targetMember['id'],
                    (string) $targetMember['badge_code'],
                    $prevCpType ?: ($cpType === 'event_venue' ? 'stock_warehouse' : 'event_venue'),
                    $prevCpId ?: 1,
                    $prevFacilityName,
                    $scannedBy,
                    $transitOutNotes,
                    $effectiveScannedAtSql,
                ]);

                // 2. Resolve current scan as check_in at the new facility
                $resolvedAction = 'check_in';
                $reason = "Authorized for {$cpName} — Arrived on site from {$prevFacilityName}";
            } elseif ($scanMode === 'verify_only') {
                $resolvedAction = 'access_verify';
            } elseif ($scanMode === 'check_in') {
                $resolvedAction = 'check_in';
            } elseif ($scanMode === 'check_out') {
                $resolvedAction = 'check_out';
            } else {
                // Auto Smart Check-In / Check-Out
                $resolvedAction = $isCurrentlyCheckedIn ? 'check_out' : 'check_in';
            }
        }

        // Calculate call-time punctuality against scan date
        $scheduledTs = strtotime($effectiveDateStr . ' ' . $callTime . ':00') ?: strtotime($effectiveDateStr . ' 08:00:00');
        if (!$allowed) {
            $punctuality = 'n/a';
            $punctualityLabel = 'ACCESS RESTRICTED';
        } elseif ($resolvedAction === 'check_out') {
            $punctuality = 'on_time';
            $punctualityLabel = 'SHIFT CHECK-OUT';
        } else {
            $diffMinutes = ($effectiveTs - $scheduledTs) / 60;
            if ($diffMinutes < -10) {
                $punctuality = 'early';
                $punctualityLabel = 'EARLY ARRIVAL';
            } elseif ($diffMinutes <= 15) {
                $punctuality = 'on_time';
                $punctualityLabel = 'ON TIME';
            } else {
                $punctuality = 'late';
                $punctualityLabel = 'LATE CALL-TIME';
            }
        }

        $noteText = $allowed
            ? ($isCrossFacilityTransfer
                ? "Arrived on site from {$prevFacilityName}"
                : ($resolvedAction === 'check_out'
                    ? "Gate Check-Out recorded at {$cpName}"
                    : ($resolvedAction === 'access_verify'
                        ? "Clearance verified at {$cpName}"
                        : "Gate Check-In recorded at {$cpName}")))
            : "Denied at {$cpName}: {$reason}";
        if ($isOfflineSync) {
            $noteText .= ' [Synced Offline]';
        }

        $isAssignedToEvent = false;
        $eventAssignedCount = 0;
        if ($cpType === 'event_venue' && !empty($activeCp['assigned_technicians'])) {
            $eventAssignedCount = (int) ($activeCp['assigned_count'] ?? count($activeCp['assigned_technicians']));
            $isAssignedToEvent = in_array((int)$targetMember['id'], $activeCp['assigned_technicians'], true);
        } else {
            $isAssignedToEvent = true;
        }

        $scannedBy = !empty($_SESSION['auth_user_id']) ? (int) $_SESSION['auth_user_id'] : 1;

        $insStmt = $pdo->prepare("
            INSERT INTO `attendance_logs`
              (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `notes`, `scanned_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insStmt->execute([
            (int) $targetMember['id'],
            (string) $targetMember['badge_code'],
            $cpType,
            $cpId,
            $cpName,
            $resolvedAction,
            $accessStatus,
            $denialReason,
            $punctuality,
            $scannedBy,
            $noteText,
            $effectiveScannedAtSql,
        ]);

        // Rebuild full payload so all KPIs, crew states, and timeline reflect the new scan
        $updatedPayload = buildFullPayload($pdo, $activeDb, $cpType, $cpId);
        $updatedMember = findCrewMemberByScanInput($updatedPayload['crew'], (string) $targetMember['id']) ?? $targetMember;

        $verification = buildVerificationCardPayload(
            $pdo,
            $updatedMember,
            $cpType,
            $cpId,
            $cpName,
            [
                'allowed' => $allowed,
                'reason' => $reason,
                'action' => $resolvedAction,
                'punctuality' => $punctuality,
                'punctuality_label' => $punctualityLabel,
                'scanned_at' => date('H:i:s', $effectiveTs),
                'is_transit_transfer' => $isCrossFacilityTransfer,
                'transit_from' => $isCrossFacilityTransfer ? $prevFacilityName : null,
                'transit_to' => $isCrossFacilityTransfer ? $cpName : null,
                'check_in_time' => $updatedMember['check_in_full'] ?? ($resolvedAction === 'check_in' ? date('h:i:s A', $effectiveTs) : null),
                'check_out_time' => $updatedMember['check_out_full'] ?? ($resolvedAction === 'check_out' ? date('h:i:s A', $effectiveTs) : null),
            ]
        );

        $verification['bootstrap'] = $updatedPayload;
        echo json_encode($verification);
        exit;
    }

    if ($action === 'confirm_gate_action') {
        $caller = requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager', 'tech_lead', 'stock_controller'],
            'Permission denied: Confirming gate actions requires an authorized Gate Controller, Technical Lead, Site Manager, or Administrator.'
        );
        $lockCheck = assertControllerCheckpointLock($pdo, (string) $reqCpType, (string) $reqCpId);
        if (!$lockCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $lockCheck['error']]);
            exit;
        }
        $userId = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        $badgeCode = trim((string) ($_POST['badge_code'] ?? $jsonBody['badge_code'] ?? ''));
        $decision = trim((string) ($_POST['decision'] ?? $jsonBody['decision'] ?? 'approve_in'));
        $declineReason = trim((string) ($_POST['decline_reason'] ?? $jsonBody['decline_reason'] ?? ''));
        $supervisorId = (int) ($_POST['supervisor_id'] ?? $jsonBody['supervisor_id'] ?? 0);
        $supervisorPin = trim((string) ($_POST['supervisor_pin'] ?? $jsonBody['supervisor_pin'] ?? ''));
        $overrideReason = trim((string) ($_POST['override_reason'] ?? $jsonBody['override_reason'] ?? ''));

        $currentPayload = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $activeCp = $currentPayload['activeCheckpoint'];
        $cpType = (string) $activeCp['type'];
        $cpId = (int) $activeCp['id'];
        $cpName = (string) $activeCp['name'];
        $callTime = (string) ($activeCp['call_time'] ?? '08:00');

        $targetMember = null;
        if ($userId > 0) {
            foreach ($currentPayload['crew'] as $c) {
                if ((int)$c['id'] === $userId) {
                    $targetMember = $c;
                    break;
                }
            }
        }
        if (!$targetMember && $badgeCode !== '') {
            $targetMember = findCrewMemberByScanInput($currentPayload['crew'], $badgeCode);
        }

        if (!$targetMember) {
            echo json_encode(['ok' => false, 'error' => 'Attendee record not found']);
            exit;
        }

        $nowTs = time();
        $scheduledTs = strtotime(date('Y-m-d') . ' ' . $callTime . ':00') ?: strtotime(date('Y-m-d 08:00:00'));
        $diffMinutes = (int) round(($nowTs - $scheduledTs) / 60);

        $scannedBy = (int) ($caller['id'] ?? $_SESSION['auth_user_id'] ?? 1);
        $overrideById = null;
        $savedOverrideReason = null;

        if ($decision === 'decline_in') {
            $accessStatus = 'denied';
            $resolvedAction = 'check_in';
            $punctuality = 'n/a';
            $punctualityLabel = 'ACCESS DECLINED';
            $denialReason = $declineReason ?: 'Declined by Gate Operator';
            $noteText = "Gate Check-In Declined at {$cpName}: {$denialReason}";
            $allowed = false;

            if (stripos($denialReason, 'late') !== false) {
                try {
                    $pdo->prepare("UPDATE `user_badges` SET `badge_status` = 'disabled_late' WHERE `user_id` = ?")->execute([$targetMember['id']]);
                } catch (Throwable $e) {}
            }
        } elseif ($decision === 'approve_out') {
            if (($targetMember['daily_state'] ?? 'ready') !== 'checked_in') {
                echo json_encode(['ok' => false, 'error' => "{$targetMember['full_name']} is already checked out."]);
                exit;
            }
            $accessStatus = 'granted';
            $resolvedAction = 'check_out';
            $denialReason = null;
            $punctuality = 'on_time';
            $punctualityLabel = 'SHIFT CHECK-OUT';
            $noteText = "Gate Check-Out approved at {$cpName}";
            $allowed = true;
        } elseif ($decision === 'supervisor_override') {
            // Verify supervisor authentication via supervisor/admin password or (for authenticated supervisors) checkpoint PIN
            $authOk = false;
            $authSupervisorName = 'Supervisor';
            $caller = getCallerUser($pdo);
            $callerRole = strtolower(trim((string)($caller['role'] ?? '')));
            $supervisorRoles = ['admin', 'manager', 'administrator', 'tech_lead', 'technical_lead', 'stock_manager', 'project_manager'];

            if ($supervisorPin !== '') {
                // 1. Check explicitly targeted supervisor_id first, then authenticated caller if supervisor
                $candidateIds = [];
                if ($supervisorId > 0) {
                    $candidateIds[] = $supervisorId;
                }
                if ($caller !== null && !empty($caller['id']) && !in_array((int)$caller['id'], $candidateIds, true)) {
                    $candidateIds[] = (int)$caller['id'];
                }

                $chkSup = $pdo->prepare("SELECT `id`, `full_name`, `password_hash`, `role` FROM `users` WHERE `id` = ? AND `is_active` = 1");
                foreach ($candidateIds as $candId) {
                    $chkSup->execute([$candId]);
                    $supRow = $chkSup->fetch(PDO::FETCH_ASSOC);
                    if ($supRow && in_array(strtolower(trim((string)$supRow['role'])), $supervisorRoles, true)) {
                        $supHash = (string) ($supRow['password_hash'] ?? '');
                        if ($supHash !== '' && password_verify($supervisorPin, $supHash)) {
                            $authOk = true;
                            $overrideById = (int) $supRow['id'];
                            $authSupervisorName = $supRow['full_name'] ?: 'Supervisor';
                            break;
                        }
                    }
                }

                // 2. Allow any active Supervisor/Administrator password (UI has a single credential prompt with no user selector)
                if (!$authOk) {
                    $supStmt = $pdo->query("SELECT `id`, `full_name`, `password_hash`, `role` FROM `users` WHERE `is_active` = 1");
                    while ($supRow = $supStmt->fetch(PDO::FETCH_ASSOC)) {
                        if (!in_array(strtolower(trim((string)$supRow['role'])), $supervisorRoles, true)) {
                            continue;
                        }
                        $supHash = (string) ($supRow['password_hash'] ?? '');
                        if ($supHash !== '' && password_verify($supervisorPin, $supHash)) {
                            $authOk = true;
                            $overrideById = (int) $supRow['id'];
                            $authSupervisorName = $supRow['full_name'] ?: 'Supervisor';
                            break;
                        }
                    }
                }

                // 3. When caller is already an authenticated Supervisor/Administrator, also allow the checkpoint's configured Terminal PIN
                if (!$authOk && $caller !== null && in_array($callerRole, $supervisorRoles, true)) {
                    $expectedCpPin = '';
                    try {
                        if ($cpType === 'stock_warehouse') {
                            $pinStmt = $pdo->prepare("SELECT `terminal_pin` FROM `stock_locations` WHERE `id` = ? LIMIT 1");
                            $pinStmt->execute([$cpId]);
                            $expectedCpPin = trim((string) ($pinStmt->fetchColumn() ?: ''));
                        } else {
                            $rawCpId = (string) ($activeCp['raw_id'] ?? $cpId);
                            $pinStmt = $pdo->prepare("SELECT `terminal_pin` FROM `events` WHERE `id` = ? LIMIT 1");
                            $pinStmt->execute([$rawCpId]);
                            $expectedCpPin = trim((string) ($pinStmt->fetchColumn() ?: ''));
                        }
                    } catch (Throwable $e) {}

                    if ($expectedCpPin !== '' && verifyTerminalPinSecret($supervisorPin, $expectedCpPin)) {
                        $authOk = true;
                        $overrideById = (int) $caller['id'];
                        $authSupervisorName = (string) ($caller['full_name'] ?: 'Supervisor');
                    }
                }
            } elseif ($caller !== null && in_array($callerRole, $supervisorRoles, true)) {
                $authOk = true;
                $overrideById = (int) $caller['id'];
                $authSupervisorName = (string) ($caller['full_name'] ?: 'Supervisor');
            }

            if (!$authOk) {
                http_response_code(403);
                echo json_encode(['ok' => false, 'error' => 'Invalid Supervisor credentials or unauthorized role']);
                exit;
            }

            $accessStatus = 'granted';
            $resolvedAction = 'check_in';
            $denialReason = null;
            $punctuality = 'late_override';
            $punctualityLabel = 'LATE (OVERRIDE)';
            $savedOverrideReason = $overrideReason ?: "Authorized by Supervisor ({$authSupervisorName})";
            $noteText = "Supervisor Late Override at {$cpName}: {$savedOverrideReason}";
            $allowed = true;

            try {
                $pdo->prepare("UPDATE `user_badges` SET `badge_status` = 'active' WHERE `user_id` = ?")->execute([$targetMember['id']]);
            } catch (Throwable $e) {}
        } else {
            // Standard approve_in
            $eval = evaluateCheckpointAccess($targetMember, $cpType, $cpId);
            $allowed = (bool) $eval['allowed'];
            $reason = (string) $eval['reason'];

            if (!$allowed) {
                echo json_encode(['ok' => false, 'error' => "Clearance denied: {$reason}"]);
                exit;
            }

            $accessStatus = 'granted';
            $resolvedAction = 'check_in';
            $denialReason = null;

            if ($diffMinutes < -10) {
                $punctuality = 'early';
                $punctualityLabel = 'EARLY ARRIVAL';
            } elseif ($diffMinutes <= 15) {
                $punctuality = 'on_time';
                $punctualityLabel = 'ON TIME';
            } else {
                $punctuality = 'late';
                $punctualityLabel = 'LATE CALL-TIME';
            }

            // Option B: Cross-Facility Transit Transfer on approve_in
            $isCurrentlyCheckedIn = ($targetMember['daily_state'] === 'checked_in');
            $prevCpType = (string) ($targetMember['last_checkpoint_type'] ?? '');
            $prevCpId = (int) ($targetMember['last_checkpoint_id'] ?? 0);
            $prevCpName = (string) ($targetMember['last_checkpoint_name'] ?? '');

            $isCrossFacilityTransfer = $isCurrentlyCheckedIn && (
                ($prevCpType !== '' && $prevCpType !== $cpType) ||
                ($prevCpId > 0 && $prevCpId !== $cpId)
            );

            if ($isCurrentlyCheckedIn && !$isCrossFacilityTransfer) {
                echo json_encode(['ok' => false, 'error' => "{$targetMember['full_name']} is already checked in at {$cpName}."]);
                exit;
            }

            if ($isCrossFacilityTransfer) {
                $prevFacilityName = $prevCpName ?: ($prevCpType === 'stock_warehouse' ? 'Ndera Warehouse' : 'Kigali Convention Centre');
                $transitOutNotes = "Transit departure → Transferred to {$cpName}";
                $transitOutStmt = $pdo->prepare("
                    INSERT INTO `attendance_logs`
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, 'check_out', 'granted', NULL, 'on_time', ?, ?, NOW())
                ");
                $transitOutStmt->execute([
                    (int) $targetMember['id'],
                    (string) $targetMember['badge_code'],
                    $prevCpType ?: ($cpType === 'event_venue' ? 'stock_warehouse' : 'event_venue'),
                    $prevCpId ?: 1,
                    $prevFacilityName,
                    $scannedBy,
                    $transitOutNotes,
                ]);
                $noteText = "Arrived on site from {$prevFacilityName}";
            } else {
                $noteText = "Gate Check-In approved at {$cpName}";
            }

            try {
                $pdo->prepare("UPDATE `user_badges` SET `badge_status` = 'active' WHERE `user_id` = ?")->execute([$targetMember['id']]);
            } catch (Throwable $e) {}
        }

        $insStmt = $pdo->prepare("
            INSERT INTO `attendance_logs`
              (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `override_by`, `override_reason`, `notes`, `scanned_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $insStmt->execute([
            (int) $targetMember['id'],
            (string) $targetMember['badge_code'],
            $cpType,
            $cpId,
            $cpName,
            $resolvedAction,
            $accessStatus,
            $denialReason,
            $punctuality,
            $scannedBy,
            $overrideById,
            $savedOverrideReason,
            $noteText,
        ]);

        $updatedPayload = buildFullPayload($pdo, $activeDb, $cpType, $cpId);
        $updatedMember = findCrewMemberByScanInput($updatedPayload['crew'], (string) $targetMember['id']) ?? $targetMember;

        $verification = buildVerificationCardPayload(
            $pdo,
            $updatedMember,
            $cpType,
            $cpId,
            $cpName,
            [
                'allowed' => $allowed,
                'reason' => $denialReason ?: $noteText,
                'action' => $resolvedAction,
                'punctuality' => $punctuality,
                'punctuality_label' => $punctualityLabel,
                'call_time' => $callTime,
                'scanned_at' => date('H:i:s'),
                'check_in_time' => $updatedMember['check_in_full'] ?? ($resolvedAction === 'check_in' && $allowed ? date('h:i:s A') : null),
                'check_out_time' => $updatedMember['check_out_full'] ?? ($resolvedAction === 'check_out' && $allowed ? date('h:i:s A') : null),
            ]
        );

        $verification['bootstrap'] = $updatedPayload;
        $verification['decision'] = $decision;
        $verification['diff_minutes'] = $diffMinutes;
        echo json_encode($verification);
        exit;
    }

    if ($action === 'update_clearance') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('update_clearance', $caller);
        if (!$authCheck['ok']) {
            http_response_code($caller === null ? 401 : 403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $userId = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        $newLevel = trim((string) ($_POST['clearance_level'] ?? $jsonBody['clearance_level'] ?? 'L2_TECH_STAGE'));
        $badgeStatus = trim((string) ($_POST['badge_status'] ?? $jsonBody['badge_status'] ?? 'active'));

        if ($userId > 0) {
            $tier = normalizeClearanceTier($newLevel);
            $stockMode = ($tier['code'] === 'L1') ? 'none' : 'all';
            $upd = $pdo->prepare("
                UPDATE `user_badges`
                SET `clearance_level` = ?, `stock_access_mode` = ?, `badge_status` = ?
                WHERE `user_id` = ?
            ");
            $upd->execute([$tier['key'], $stockMode, $badgeStatus, $userId]);
        }

        echo json_encode(buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId));
        exit;
    }

    if ($action === 'approve_batch') {
        requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager', 'tech_lead', 'stock_controller'],
            'Permission denied: Approving stock batches requires Site Operations, Site Manager, or Administrator privileges.'
        );
        $batchId = (int) ($_POST['batch_id'] ?? $jsonBody['batch_id'] ?? 0);
        $newStatus = trim((string) ($_POST['status'] ?? $jsonBody['status'] ?? 'approved'));
        if ($batchId > 0) {
            try {
                $upd = $pdo->prepare("UPDATE `stock_movements` SET `status` = ?, `approval_status` = ? WHERE `id` = ?");
                $upd->execute([$newStatus, $newStatus, $batchId]);
            } catch (Throwable $e) {
                $upd = $pdo->prepare("UPDATE `stock_movements` SET `status` = ? WHERE `id` = ?");
                $upd->execute([$newStatus, $batchId]);
            }
        }
        echo json_encode(buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId));
        exit;
    }

    if ($action === 'save_batch') {
        requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager', 'tech_lead', 'stock_controller'],
            'Permission denied: Managing stock batches requires Site Operations, Site Manager, or Administrator privileges.'
        );
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $batchNumber = trim((string) ($_POST['batch_number'] ?? $jsonBody['batch_number'] ?? ''));
        if ($batchNumber === '') {
            $batchNumber = 'BATCH-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        }
        $techId = (int) ($_POST['technician_id'] ?? $jsonBody['technician_id'] ?? 0);
        $submittedBy = trim((string) ($_POST['submitted_by'] ?? $jsonBody['submitted_by'] ?? ''));
        $controllerId = (int) ($_POST['stock_controller_id'] ?? $jsonBody['stock_controller_id'] ?? 0);
        $controllerName = trim((string) ($_POST['stock_controller_name'] ?? $jsonBody['stock_controller_name'] ?? 'Mirene Uwase'));
        $movementType = trim((string) ($_POST['movement_type'] ?? $jsonBody['movement_type'] ?? 'stock_to_venue_room'));
        $sourceName = trim((string) ($_POST['source_name'] ?? $jsonBody['source_name'] ?? 'Ndera Warehouse'));
        $destinationName = trim((string) ($_POST['destination_name'] ?? $jsonBody['destination_name'] ?? 'Kigali Convention Centre'));
        $destinationRoom = trim((string) ($_POST['destination_room'] ?? $jsonBody['destination_room'] ?? 'Main Stage'));
        $eventName = trim((string) ($_POST['event_name'] ?? $jsonBody['event_name'] ?? 'Production Event'));
        $jobSheet = trim((string) ($_POST['job_sheet'] ?? $jsonBody['job_sheet'] ?? 'JS-' . date('Ymd')));
        $notes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? ''));
        $status = strtolower(trim((string) ($_POST['status'] ?? $jsonBody['status'] ?? 'pending')));
        if (!in_array($status, ['pending', 'approved', 'in_transit', 'completed', 'rejected'], true)) {
            $status = 'pending';
        }

        if ($techId > 0 && $submittedBy === '') {
            $uStmt = $pdo->prepare("SELECT `username`, `full_name` FROM `users` WHERE `id` = ?");
            $uStmt->execute([$techId]);
            $uRow = $uStmt->fetch();
            if ($uRow) {
                $submittedBy = (string) ($uRow['full_name'] ?: $uRow['username']);
            }
        }

        if ($id > 0) {
            $upd = $pdo->prepare("
                UPDATE `stock_movements`
                SET `batch_number` = ?,
                    `technician_id` = ?,
                    `submitted_by` = ?,
                    `stock_controller_id` = ?,
                    `stock_controller_name` = ?,
                    `movement_type` = ?,
                    `source_name` = ?,
                    `destination_name` = ?,
                    `destination_room` = ?,
                    `event_name` = ?,
                    `job_sheet` = ?,
                    `notes` = ?,
                    `status` = ?,
                    `approval_status` = ?,
                    `updated_at` = NOW()
                WHERE `id` = ?
            ");
            $upd->execute([
                $batchNumber, $techId, $submittedBy, $controllerId, $controllerName,
                $movementType, $sourceName, $destinationName, $destinationRoom,
                $eventName, $jobSheet, $notes, $status, $status, $id
            ]);
            $batchId = $id;
        } else {
            $ins = $pdo->prepare("
                INSERT INTO `stock_movements` (
                    `batch_number`, `technician_id`, `submitted_by`, `stock_controller_id`,
                    `stock_controller_name`, `movement_type`, `source_name`, `destination_name`,
                    `destination_room`, `event_name`, `job_sheet`, `notes`, `status`,
                    `approval_status`, `created_at`
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, NOW()
                )
            ");
            $ins->execute([
                $batchNumber, $techId, $submittedBy, $controllerId,
                $controllerName, $movementType, $sourceName, $destinationName,
                $destinationRoom, $eventName, $jobSheet, $notes, $status,
                $status
            ]);
            $batchId = (int) $pdo->lastInsertId();
        }

        $rawItems = $_POST['items'] ?? $jsonBody['items'] ?? null;
        if (is_string($rawItems)) {
            $decoded = json_decode($rawItems, true);
            if (is_array($decoded)) $rawItems = $decoded;
        }
        if (is_array($rawItems)) {
            $delItems = $pdo->prepare("DELETE FROM `batch_items` WHERE `batch_id` = ?");
            $delItems->execute([$batchId]);

            $insItem = $pdo->prepare("
                INSERT INTO `batch_items` (`batch_id`, `item_name`, `quantity`, `serial_number`, `status`, `item_status`, `created_at`)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            foreach ($rawItems as $item) {
                $iName = trim((string) ($item['item_name'] ?? ''));
                if ($iName === '') continue;
                $iQty = max(1, (int) ($item['quantity'] ?? 1));
                $iSerial = trim((string) ($item['serial_number'] ?? ''));
                $iStatus = trim((string) ($item['status'] ?? $status));
                $insItem->execute([$batchId, $iName, $iQty, $iSerial, $iStatus, $iStatus]);
            }
        }

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => 'Equipment batch ' . ($id > 0 ? 'updated' : 'created') . ' successfully.',
            'batch_id' => $batchId,
            'batches' => $full['batches'],
            'full' => $full,
        ]);
        exit;
    }

    if ($action === 'delete_batch') {
        requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager'],
            'Permission denied: Deleting stock batches requires Site Manager or Administrator privileges.'
        );
        $batchId = (int) ($_POST['batch_id'] ?? $jsonBody['batch_id'] ?? $_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($batchId > 0) {
            $pdo->prepare("DELETE FROM `batch_items` WHERE `batch_id` = ?")->execute([$batchId]);
            $pdo->prepare("DELETE FROM `stock_movements` WHERE `id` = ?")->execute([$batchId]);
        }
        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => 'Equipment batch deleted successfully.',
            'batches' => $full['batches'],
            'full' => $full,
        ]);
        exit;
    }

    if ($action === 'get_batch') {
        $batchId = (int) ($_GET['id'] ?? $_POST['batch_id'] ?? $jsonBody['batch_id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM `stock_movements` WHERE `id` = ?");
        $stmt->execute([$batchId]);
        $batch = $stmt->fetch();
        if (!$batch) {
            echo json_encode(['ok' => false, 'error' => 'Batch not found.']);
            exit;
        }
        $itemStmt = $pdo->prepare("SELECT `id`, `item_name`, `quantity`, `serial_number`, `status` FROM `batch_items` WHERE `batch_id` = ? ORDER BY `id` ASC");
        $itemStmt->execute([$batchId]);
        $items = $itemStmt->fetchAll();
        $batch['items'] = $items;
        echo json_encode(['ok' => true, 'batch' => $batch]);
        exit;
    }

    if ($action === 'save_clearance_tier') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_clearance_tier', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $code = strtoupper(trim((string) ($_POST['code'] ?? $jsonBody['code'] ?? '')));
        $title = trim((string) ($_POST['title'] ?? $jsonBody['title'] ?? ''));
        $shortName = trim((string) ($_POST['short_name'] ?? $jsonBody['short_name'] ?? ''));
        $levelKey = strtoupper(trim((string) ($_POST['level_key'] ?? $jsonBody['level_key'] ?? '')));
        $color = trim((string) ($_POST['color'] ?? $jsonBody['color'] ?? '#2563eb'));
        $venueRule = strtoupper(trim((string) ($_POST['venue_rule'] ?? $jsonBody['venue_rule'] ?? 'YES')));
        $stockRule = strtoupper(trim((string) ($_POST['stock_rule'] ?? $jsonBody['stock_rule'] ?? 'NO')));
        $description = trim((string) ($_POST['description'] ?? $jsonBody['description'] ?? ''));
        $sortOrder = (int) ($_POST['sort_order'] ?? $jsonBody['sort_order'] ?? 0);
        $isActive = isset($_POST['is_active']) ? (int) $_POST['is_active'] : (isset($jsonBody['is_active']) ? (int) $jsonBody['is_active'] : 1);
        $isSystem = isset($_POST['is_system']) ? (int) $_POST['is_system'] : (isset($jsonBody['is_system']) ? (int) $jsonBody['is_system'] : 0);

        if ($code === '' || $title === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Tier Code (e.g. L5) and Title are required.']);
            exit;
        }

        if ($levelKey === '') {
            $cleanTitle = preg_replace('/[^A-Z0-9]+/', '_', strtoupper($title));
            $levelKey = $code . '_' . trim($cleanTitle, '_');
        }

        if ($shortName === '') {
            $shortName = $title;
        }

        $badgeBg = 'rgba(' . hexToRgbString($color) . ', 0.16)';

        if ($id > 0) {
            $checkStmt = $pdo->prepare("SELECT * FROM `access_clearance_levels` WHERE `id` = ?");
            $checkStmt->execute([$id]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Clearance tier not found.']);
                exit;
            }

            // Protect code and level_key for foundational core system tiers (L1..L4)
            if (in_array($existing['code'], ['L1', 'L2', 'L3', 'L4'], true)) {
                $code = $existing['code'];
                $levelKey = $existing['level_key'];
                $isSystem = 1;
            }

            $upd = $pdo->prepare("
                UPDATE `access_clearance_levels`
                SET `code` = ?,
                    `level_key` = ?,
                    `title` = ?,
                    `short_name` = ?,
                    `color` = ?,
                    `badge_bg` = ?,
                    `venue_rule` = ?,
                    `stock_rule` = ?,
                    `description` = ?,
                    `sort_order` = ?,
                    `is_system` = ?,
                    `is_active` = ?,
                    `updated_at` = NOW()
                WHERE `id` = ?
            ");
            $upd->execute([
                $code, $levelKey, $title, $shortName, $color, $badgeBg,
                $venueRule, $stockRule, $description, $sortOrder, $isSystem, $isActive, $id
            ]);
            $tierId = $id;
        } else {
            // Check uniqueness of code or key
            $dupStmt = $pdo->prepare("SELECT `id` FROM `access_clearance_levels` WHERE `code` = ? OR `level_key` = ?");
            $dupStmt->execute([$code, $levelKey]);
            if ($dupStmt->fetchColumn()) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => "Clearance tier with Code '{$code}' or Key '{$levelKey}' already exists."]);
                exit;
            }

            $ins = $pdo->prepare("
                INSERT INTO `access_clearance_levels`
                (`level_key`, `code`, `title`, `short_name`, `color`, `bg`, `border`, `badge_bg`, `icon`, `description`, `default_stock_access`, `default_venue_access`, `venue_rule`, `stock_rule`, `sort_order`, `is_system`, `is_active`, `created_at`, `updated_at`)
                VALUES (?, ?, ?, ?, ?, '#f8fafc', '#e2e8f0', ?, 'fa-shield-halved', ?, 'all', 'all', ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $ins->execute([
                $levelKey, $code, $title, $shortName, $color, $badgeBg,
                $description, $venueRule, $stockRule, $sortOrder, $isSystem, $isActive
            ]);
            $tierId = (int) $pdo->lastInsertId();
        }

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => "Clearance tier {$code} " . ($id > 0 ? 'updated' : 'created') . ' successfully.',
            'tier_id' => $tierId,
            'clearanceMatrix' => $full['clearanceMatrix'],
            'full' => $full,
        ]);
        exit;
    }

    if ($action === 'delete_clearance_tier') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_clearance_tier', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $tierId = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($tierId <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Invalid clearance tier ID.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT * FROM `access_clearance_levels` WHERE `id` = ?");
        $stmt->execute([$tierId]);
        $tier = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tier) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Clearance tier not found.']);
            exit;
        }

        if ((int)($tier['is_system'] ?? 0) === 1) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => "System core clearance tier {$tier['code']} (L1–L4) is protected and cannot be deleted."]);
            exit;
        }

        $code = strtoupper(trim((string)$tier['code']));
        $key = strtoupper(trim((string)$tier['level_key']));

        $badgeCheck = $pdo->prepare("
            SELECT COUNT(*) FROM `user_badges`
            WHERE `clearance_level` = ? OR `clearance_level` = ? OR `clearance_level` LIKE ?
        ");
        $badgeCheck->execute([$key, $code, $code . '%']);
        $assignedCount = (int) $badgeCheck->fetchColumn();

        if ($assignedCount > 0) {
            http_response_code(400);
            echo json_encode([
                'ok' => false,
                'error' => "Cannot delete tier {$code}: {$assignedCount} staff member(s) are currently assigned to this clearance tier. Please reassign them first."
            ]);
            exit;
        }

        $del = $pdo->prepare("DELETE FROM `access_clearance_levels` WHERE `id` = ?");
        $del->execute([$tierId]);

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => "Clearance tier {$code} deleted successfully.",
            'clearanceMatrix' => $full['clearanceMatrix'],
            'full' => $full,
        ]);
        exit;
    }

    if ($action === 'get_clearance_tier') {
        $tierId = (int) ($_GET['id'] ?? $_POST['id'] ?? $jsonBody['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM `access_clearance_levels` WHERE `id` = ?");
        $stmt->execute([$tierId]);
        $tier = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$tier) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Clearance tier not found.']);
            exit;
        }
        echo json_encode(['ok' => true, 'tier' => $tier]);
        exit;
    }

    if ($action === 'update_call_time') {
        $caller = getCallerUser($pdo);
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? ''));
        $authCheck = canCallerPerformAction('update_call_time', $caller, ['checkpoint_type' => $cpType]);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $rawCpId = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? ''));
        $rawCallTime = trim((string) ($_POST['call_time'] ?? $jsonBody['call_time'] ?? ''));
        $extendMinutes = isset($_POST['extend_minutes']) ? (int) $_POST['extend_minutes'] : (isset($jsonBody['extend_minutes']) ? (int) $jsonBody['extend_minutes'] : 0);
        $resetToDefault = !empty($_POST['reset_to_default']) || !empty($jsonBody['reset_to_default']);

        if ($resetToDefault) {
            $formattedTime = '08:00';
            $formattedTimeFull = '08:00:00';
        } elseif ($extendMinutes > 0) {
            $currentCallTime = '08:00';
            if ($cpType === 'stock_warehouse') {
                try {
                    $st = $pdo->prepare("SELECT `open_time` FROM `stock_locations` WHERE `id` = ?");
                    $st->execute([(int)$rawCpId]);
                    $r = $st->fetch(PDO::FETCH_ASSOC);
                    if (!empty($r['open_time'])) $currentCallTime = substr($r['open_time'], 0, 5);
                } catch (Throwable $e) {}
            } elseif ($cpType === 'event_venue') {
                try {
                    $st = $pdo->prepare("SELECT `call_time` FROM `events` WHERE `id` = ?");
                    $st->execute([$rawCpId]);
                    $r = $st->fetch(PDO::FETCH_ASSOC);
                    if (!empty($r['call_time'])) $currentCallTime = substr($r['call_time'], 0, 5);
                } catch (Throwable $e) {}
            }
            $baseTs = strtotime("2026-01-01 {$currentCallTime}:00") ?: strtotime("2026-01-01 08:00:00");
            $newTs = $baseTs + ($extendMinutes * 60);
            $formattedTime = date('H:i', $newTs);
            $formattedTimeFull = date('H:i:s', $newTs);
        } else {
            if ($rawCallTime === '') $rawCallTime = '08:00';
            // Normalize time to HH:MM format
            $timeParts = explode(':', $rawCallTime);
            $hRaw = preg_replace('/\D/', '', $timeParts[0] ?? '08');
            $mRaw = preg_replace('/\D/', '', $timeParts[1] ?? '00');
            $hour = str_pad($hRaw !== '' ? $hRaw : '08', 2, '0', STR_PAD_LEFT);
            $min = str_pad(substr($mRaw !== '' ? $mRaw : '00', 0, 2), 2, '0', STR_PAD_LEFT);
            $formattedTime = "{$hour}:{$min}";
            $formattedTimeFull = "{$hour}:{$min}:00";
        }

        if ($cpType === 'stock_warehouse') {
            $numId = (int) $rawCpId;
            if ($numId > 0) {
                try {
                    $upd = $pdo->prepare("UPDATE `stock_locations` SET `open_time` = ? WHERE `id` = ?");
                    $upd->execute([$formattedTimeFull, $numId]);
                } catch (Throwable $e) {
                    // Ignore column error if schema differs
                }
            }
        } elseif ($cpType === 'event_venue') {
            try {
                $upd = $pdo->prepare("UPDATE `events` SET `call_time` = ? WHERE `id` = ?");
                $upd->execute([$formattedTime, $rawCpId]);
            } catch (Throwable $e) {
                // Ignore error if schema differs
            }
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'call_time_updated' => true,
                'updated_call_time' => $formattedTime,
                'updated_cp_type' => $cpType,
                'updated_cp_id' => $rawCpId,
                'is_extended' => ($extendMinutes > 0),
                'extended_by' => $extendMinutes,
                'is_reset' => $resetToDefault,
            ]
        ));
        exit;
    }

function resolveCheckpointByName(PDO $pdo, string $rawName): ?array
{
    $name = trim($rawName);
    if ($name === '') {
        return null;
    }

    // 1. Match Stock Warehouse by exact name or code (case-insensitive)
    $stStmt = $pdo->prepare("
        SELECT `id`, `name`
        FROM `stock_locations`
        WHERE `is_active` = 1
          AND (LOWER(TRIM(`name`)) = LOWER(?) OR LOWER(TRIM(`code`)) = LOWER(?))
        LIMIT 1
    ");
    $stStmt->execute([$name, $name]);
    $stRow = $stStmt->fetch(PDO::FETCH_ASSOC);
    if ($stRow) {
        return [
            'type' => 'stock_warehouse',
            'id' => (string) $stRow['id'],
            'name' => (string) $stRow['name'],
        ];
    }

    // 2. Match Event Venue by title, "title — location", or location (case-insensitive)
    $evStmt = $pdo->prepare("
        SELECT `id`, `title`, `location`
        FROM `events`
        WHERE LOWER(TRIM(`title`)) = LOWER(?)
           OR LOWER(TRIM(CONCAT(`title`, ' — ', COALESCE(`location`, '')))) = LOWER(?)
           OR LOWER(TRIM(CONCAT(`title`, ' - ', COALESCE(`location`, '')))) = LOWER(?)
           OR LOWER(TRIM(COALESCE(`location`, ''))) = LOWER(?)
        ORDER BY `date` DESC, `id` DESC
        LIMIT 1
    ");
    $evStmt->execute([$name, $name, $name, $name]);
    $evRow = $evStmt->fetch(PDO::FETCH_ASSOC);
    if ($evRow) {
        return [
            'type' => 'event_venue',
            'id' => (string) $evRow['id'],
            'name' => (string) $evRow['title'],
        ];
    }

    return null;
}

    if ($action === 'save_event' || $action === 'assign_event_crew') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_event', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $eventId = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? ''));
        $facilityName = trim((string) ($_POST['facility_name'] ?? $jsonBody['facility_name'] ?? $_POST['checkpoint_name'] ?? $jsonBody['checkpoint_name'] ?? ''));
        $rawCallTime = trim((string) ($_POST['call_time'] ?? $jsonBody['call_time'] ?? '08:00'));
        $techLead = trim((string) ($_POST['tech_lead'] ?? $jsonBody['tech_lead'] ?? ''));
        $projectManager = trim((string) ($_POST['project_manager'] ?? $jsonBody['project_manager'] ?? ''));
        $eventPinRaw = trim((string) ($_POST['terminal_pin'] ?? $jsonBody['terminal_pin'] ?? ''));
        $assignedTechs = $_POST['assigned_technicians'] ?? $jsonBody['assigned_technicians'] ?? [];

        if ($eventPinRaw !== '' && !preg_match('/^[A-Za-z0-9]{4,12}$/', $eventPinRaw)) {
            echo json_encode(['ok' => false, 'error' => 'Venue Terminal PIN must be 4–12 letters or digits']);
            exit;
        }

        if ($eventId === '' && $facilityName !== '') {
            $resolvedEv = resolveCheckpointByName($pdo, $facilityName);
            if ($resolvedEv && $resolvedEv['type'] === 'event_venue') {
                $eventId = $resolvedEv['id'];
            }
        }

        if (!is_array($assignedTechs)) {
            $assignedTechs = json_decode((string)$assignedTechs, true) ?: [];
        }
        $assignedTechsInt = array_values(array_unique(array_filter(array_map('intval', (array)$assignedTechs))));

        // Normalize call time
        $timeParts = explode(':', $rawCallTime);
        $hRaw = preg_replace('/\D/', '', $timeParts[0] ?? '08');
        $mRaw = preg_replace('/\D/', '', $timeParts[1] ?? '00');
        $formattedTime = str_pad($hRaw !== '' ? $hRaw : '08', 2, '0', STR_PAD_LEFT) . ':' . str_pad(substr($mRaw !== '' ? $mRaw : '00', 0, 2), 2, '0', STR_PAD_LEFT);

        if ($eventId !== '') {
            $chk = $pdo->prepare("SELECT `id` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $chk->execute([$eventId, $eventId]);
            $realEventId = $chk->fetchColumn();
            if ($realEventId !== false && $realEventId !== null) {
                $realEventId = (string) $realEventId;
                $stmtUpd = $pdo->prepare("
                    UPDATE `events`
                    SET `call_time` = ?,
                        `tech_lead` = CASE WHEN ? != '' THEN ? ELSE `tech_lead` END,
                        `project_manager` = CASE WHEN ? != '' THEN ? ELSE `project_manager` END,
                        `terminal_pin` = CASE WHEN ? != '' THEN ? ELSE `terminal_pin` END,
                        `assigned_technician` = ?
                    WHERE `id` = ?
                ");
                $stmtUpd->execute([
                    $formattedTime,
                    $techLead, $techLead,
                    $projectManager, $projectManager,
                    $eventPinRaw, $eventPinRaw,
                    json_encode($assignedTechsInt),
                    $realEventId
                ]);

                // Sync users whose assigned_checkpoint points to this event
                try {
                    $crcVal = (string) (is_numeric($realEventId) ? (int)$realEventId : crc32($realEventId));
                    $clrStmt = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL WHERE `assigned_checkpoint_type` = 'event_venue' AND (`assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ?)");
                    $clrStmt->execute([$realEventId, $crcVal]);
                    if (!empty($assignedTechsInt)) {
                        $setStmt = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = 'event_venue', `assigned_checkpoint_id` = ? WHERE `id` = ?");
                        foreach ($assignedTechsInt as $uid) {
                            $setStmt->execute([$realEventId, $uid]);
                        }
                    }
                } catch (Throwable $e) {}
            }
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => 'Event roster and call time updated successfully by Tech Lead',
                'event_id' => $eventId,
                'call_time' => $formattedTime,
                'assigned_technicians' => $assignedTechsInt,
                'assigned_count' => count($assignedTechsInt),
            ]
        ));
        exit;
    }

    if ($action === 'allocate_personnel') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_event', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $facilityName = trim((string) ($_POST['facility_name'] ?? $jsonBody['facility_name'] ?? $_POST['checkpoint_name'] ?? $jsonBody['checkpoint_name'] ?? $_POST['target_name'] ?? $jsonBody['target_name'] ?? ''));
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'event_venue'));
        $cpId = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? '1'));

        if ($facilityName !== '') {
            $resolved = resolveCheckpointByName($pdo, $facilityName);
            if (!$resolved) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => "No stock warehouse or event venue found matching '{$facilityName}'."]);
                exit;
            }
            $cpType = $resolved['type'];
            $cpId = $resolved['id'];
        }

        $userIds = $_POST['user_ids'] ?? $jsonBody['user_ids'] ?? [];
        if (!is_array($userIds)) {
            $userIds = json_decode((string)$userIds, true) ?: [];
        }
        $userIds = array_values(array_unique(array_filter(array_map('intval', (array)$userIds))));
        $notes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? 'Real-time allocation via Map Radar'));

        if ($cpType === 'event_venue' && !empty($userIds)) {
            try {
                $realEventId = $cpId;
                $chkEv = $pdo->prepare("SELECT `id`, `assigned_technician` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
                $chkEv->execute([$cpId, $cpId]);
                $ev = $chkEv->fetch(PDO::FETCH_ASSOC);
                $existing = [];
                if ($ev) {
                    $realEventId = (string) $ev['id'];
                    $rawAssigned = trim((string)($ev['assigned_technician'] ?? ''));
                    if ($rawAssigned !== '') {
                        $dec = json_decode($rawAssigned, true);
                        if (is_array($dec)) {
                            $existing = $dec;
                        }
                    }
                }
                $merged = array_values(array_unique(array_merge($existing, $userIds)));
                $upd = $pdo->prepare("UPDATE `events` SET `assigned_technician` = ? WHERE `id` = ?");
                $upd->execute([json_encode($merged), $realEventId]);

                $crcVal = (string) (is_numeric($realEventId) ? (int)$realEventId : crc32($realEventId));
                $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = 'event_venue', `assigned_checkpoint_id` = ? WHERE `id` = ?");
                foreach ($userIds as $uid) {
                    $updUser->execute([$realEventId, $uid]);
                }
            } catch (Throwable $e) {}
        } elseif ($cpType === 'stock_warehouse' && !empty($userIds)) {
            try {
                $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = 'stock_warehouse', `assigned_checkpoint_id` = ? WHERE `id` = ?");
                foreach ($userIds as $uid) {
                    $updUser->execute([$cpId, $uid]);
                }
            } catch (Throwable $e) {}
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => 'Personnel allocated successfully in real time',
                'allocated_count' => count($userIds),
                'checkpoint_type' => $cpType,
                'checkpoint_id' => $cpId,
            ]
        ));
        exit;
    }

    if ($action === 'reset_facility_crew') {
        $caller = getCallerUser($pdo);
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'event_venue'));
        $cpId = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? '1'));
        $facilityName = trim((string) ($_POST['facility_name'] ?? $jsonBody['facility_name'] ?? $_POST['checkpoint_name'] ?? $jsonBody['checkpoint_name'] ?? $_POST['target_name'] ?? $jsonBody['target_name'] ?? ''));

        if ($facilityName !== '') {
            $resolved = resolveCheckpointByName($pdo, $facilityName);
            if ($resolved === null) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Stock or venue "' . $facilityName . '" was not found']);
                exit;
            }
            $cpType = $resolved['type'];
            $cpId = $resolved['id'];
        }

        $authCheck = canCallerPerformAction('assign_event_crew', $caller, ['checkpoint_type' => $cpType]);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        if ($cpType === 'event_venue') {
            try {
                // Resolve real event ID (handles numeric IDs, UUIDs, or CRC32 hashes)
                $realEventId = $cpId;
                $chkEv = $pdo->prepare("SELECT `id` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
                $chkEv->execute([$cpId, $cpId]);
                $fId = $chkEv->fetchColumn();
                if ($fId) {
                    $realEventId = (string) $fId;
                }

                $upd = $pdo->prepare("UPDATE `events` SET `assigned_technician` = '[]' WHERE `id` = ? OR CRC32(`id`) = ?");
                $upd->execute([$realEventId, $cpId]);

                $crcVal = (string) (is_numeric($realEventId) ? (int)$realEventId : crc32($realEventId));
                $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL WHERE `assigned_checkpoint_type` = 'event_venue' AND (`assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ?)");
                $updUser->execute([$realEventId, $cpId, $crcVal]);
            } catch (Throwable $e) {}
        } elseif ($cpType === 'stock_warehouse') {
            try {
                if (is_numeric($cpId)) {
                    $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL WHERE `assigned_checkpoint_type` = 'stock_warehouse' AND (`assigned_checkpoint_id` = ? OR CAST(`assigned_checkpoint_id` AS UNSIGNED) = ?)");
                    $updUser->execute([$cpId, (int)$cpId]);
                } else {
                    $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL WHERE `assigned_checkpoint_type` = 'stock_warehouse' AND `assigned_checkpoint_id` = ?");
                    $updUser->execute([$cpId]);
                }
            } catch (Throwable $e) {}
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => 'Facility roster reset successfully. All crew members returned to Standby.',
                'checkpoint_type' => $cpType,
                'checkpoint_id' => $cpId,
            ]
        ));
        exit;
    }

    if ($action === 'unassign_personnel') {
        $caller = getCallerUser($pdo);
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'event_venue'));
        $cpId = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? '1'));
        $targetUid = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        $facilityName = trim((string) ($_POST['facility_name'] ?? $jsonBody['facility_name'] ?? $_POST['checkpoint_name'] ?? $jsonBody['checkpoint_name'] ?? $_POST['target_name'] ?? $jsonBody['target_name'] ?? ''));

        if ($facilityName !== '') {
            $resolved = resolveCheckpointByName($pdo, $facilityName);
            if ($resolved === null) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Stock or venue "' . $facilityName . '" was not found']);
                exit;
            }
            $cpType = $resolved['type'];
            $cpId = $resolved['id'];
        }

        $authCheck = canCallerPerformAction('assign_event_crew', $caller, ['checkpoint_type' => $cpType]);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        if ($targetUid > 0) {
            $uInfo = $pdo->prepare("SELECT `id`, `full_name`, `username` FROM `users` WHERE `id` = ?");
            $uInfo->execute([$targetUid]);
            $targetUser = $uInfo->fetch(PDO::FETCH_ASSOC);
            $targetName = strtolower(trim((string)($targetUser['full_name'] ?? '')));
            $targetUsern = strtolower(trim((string)($targetUser['username'] ?? '')));

            if ($cpType === 'event_venue') {
                try {
                    $realEventId = $cpId;
                    $chkEv = $pdo->prepare("SELECT `id`, `assigned_technician` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
                    $chkEv->execute([$cpId, $cpId]);
                    $ev = $chkEv->fetch(PDO::FETCH_ASSOC);
                    if ($ev) {
                        $realEventId = (string) $ev['id'];
                        $rawAssigned = trim((string)($ev['assigned_technician'] ?? ''));
                        if ($rawAssigned !== '') {
                            $dec = json_decode($rawAssigned, true);
                            if (is_array($dec)) {
                                $filtered = array_values(array_filter($dec, function($id) use ($targetUid) {
                                    return (int)$id !== $targetUid;
                                }));
                                $upd = $pdo->prepare("UPDATE `events` SET `assigned_technician` = ? WHERE `id` = ?");
                                $upd->execute([json_encode($filtered), $realEventId]);
                            } else {
                                $parts = array_map('trim', explode(',', $rawAssigned));
                                $newParts = [];
                                foreach ($parts as $p) {
                                    $pLow = strtolower($p);
                                    if ($p === '' || (int)$p === $targetUid) continue;
                                    if ($targetName !== '' && ($pLow === $targetName || stripos($pLow, $targetName) !== false)) continue;
                                    if ($targetUsern !== '' && ($pLow === $targetUsern || stripos($pLow, $targetUsern) !== false)) continue;
                                    $newParts[] = $p;
                                }
                                $upd = $pdo->prepare("UPDATE `events` SET `assigned_technician` = ? WHERE `id` = ?");
                                $upd->execute([implode(', ', $newParts), $realEventId]);
                            }
                        }
                    }
                    $crcVal = (string) (is_numeric($realEventId) ? (int)$realEventId : crc32($realEventId));
                    $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL WHERE `id` = ? AND `assigned_checkpoint_type` = 'event_venue' AND (`assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ?)");
                    $updUser->execute([$targetUid, $realEventId, $cpId, $crcVal]);
                } catch (Throwable $e) {}
            } elseif ($cpType === 'stock_warehouse') {
                try {
                    if (is_numeric($cpId)) {
                        $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL WHERE `id` = ? AND `assigned_checkpoint_type` = 'stock_warehouse' AND (`assigned_checkpoint_id` = ? OR CAST(`assigned_checkpoint_id` AS UNSIGNED) = ?)");
                        $updUser->execute([$targetUid, $cpId, (int)$cpId]);
                    } else {
                        $updUser = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL WHERE `id` = ? AND `assigned_checkpoint_type` = 'stock_warehouse' AND `assigned_checkpoint_id` = ?");
                        $updUser->execute([$targetUid, $cpId]);
                    }
                } catch (Throwable $e) {}
            }
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => 'Personnel unassigned successfully',
                'checkpoint_type' => $cpType,
                'checkpoint_id' => $cpId,
                'unassigned_user_id' => $targetUid,
            ]
        ));
        exit;
    }

    if ($action === 'list_stock_manager') {
        // 1. Fetch Warehouses
        $whRows = $pdo->query("SELECT * FROM `stock_locations` ORDER BY `id` ASC")->fetchAll();
        $warehouses = [];
        foreach ($whRows as $wr) {
            $wid = (int) $wr['id'];
            $locName = (string) ($wr['name'] ?? 'Warehouse');
            $itemCount = 0;
            try {
                $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM `items` WHERE `stock_location` = ? OR `stock_location` = ?");
                $cntStmt->execute([$locName, (string) ($wr['code'] ?? '')]);
                $itemCount = (int) $cntStmt->fetchColumn();
            } catch (Throwable $e) {}

            $warehouses[] = [
                'id' => $wid,
                'name' => $locName,
                'code' => (string) ($wr['code'] ?? $wr['location_code'] ?? 'STK-0' . $wid),
                'location_code' => (string) ($wr['location_code'] ?? ''),
                'location' => (string) ($wr['location'] ?? $wr['address'] ?? 'Kigali Hub'),
                'address' => (string) ($wr['address'] ?? ''),
                'description' => (string) ($wr['description'] ?? ''),
                'open_time' => substr((string) ($wr['open_time'] ?? '08:00:00'), 0, 5),
                'close_time' => substr((string) ($wr['close_time'] ?? '18:00:00'), 0, 5),
                'controller_name' => (string) ($wr['controller_name'] ?? 'Mirene Uwase'),
                'controller_phone' => (string) ($wr['controller_phone'] ?? '+250 788 100 002'),
                'controller_email' => (string) ($wr['controller_email'] ?? 'mirene@ability.rw'),
                'is_active' => (int) ($wr['is_active'] ?? 1),
                'image' => resolveProfileImageUrl($wr['image'] ?? null),
                'item_count' => $itemCount,
                'terminal_pin' => resolveWarehouseTerminalPin($wr),
            ];
        }

        // 2. Fetch Stock Items
        $items = [];
        try {
            $itemRows = $pdo->query("SELECT * FROM `items` ORDER BY `id` DESC LIMIT 200")->fetchAll();
            foreach ($itemRows as $ir) {
                $items[] = [
                    'id' => (int) $ir['id'],
                    'item_name' => (string) ($ir['item_name'] ?? 'Equipment Item'),
                    'serial_number' => (string) ($ir['serial_number'] ?? 'N/A'),
                    'category' => (string) ($ir['category'] ?? 'General'),
                    'brand' => (string) ($ir['brand'] ?? ''),
                    'model' => (string) ($ir['model'] ?? ''),
                    'department' => (string) ($ir['department'] ?? 'Warehouse'),
                    'stock_location' => (string) ($ir['stock_location'] ?? 'Ndera Warehouse'),
                    'quantity' => (int) ($ir['quantity'] ?? 1),
                    'condition' => (string) ($ir['condition'] ?? 'good'),
                    'status' => (string) ($ir['status'] ?? 'available'),
                    'notes' => (string) ($ir['notes'] ?? ''),
                    'image' => resolveProfileImageUrl($ir['image'] ?? null),
                    'created_at' => (string) ($ir['created_at'] ?? ''),
                ];
            }
        } catch (Throwable $e) {}

        // 3. Categories & Stats
        $rawCats = array_values(array_unique(array_filter(array_column($items, 'category'))));
        $categories = !empty($rawCats) ? $rawCats : ['Audio', 'Video', 'Lighting', 'Rigging', 'Power', 'General'];

        $totalAvailable = 0;
        foreach ($items as $it) {
            if ($it['status'] === 'available') {
                $totalAvailable += (int) $it['quantity'];
            }
        }

        echo json_encode([
            'ok' => true,
            'warehouses' => $warehouses,
            'stock_items' => $items,
            'categories' => $categories,
            'stats' => [
                'total_warehouses' => count($warehouses),
                'total_items' => count($items),
                'available_count' => $totalAvailable,
                'in_use_count' => max(0, count($items) - $totalAvailable),
            ],
        ]);
        exit;
    }

    if ($action === 'save_warehouse') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_warehouse', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $name = trim((string) ($_POST['name'] ?? $jsonBody['name'] ?? ''));
        $code = trim((string) ($_POST['code'] ?? $jsonBody['code'] ?? ''));
        $location = trim((string) ($_POST['location'] ?? $jsonBody['location'] ?? ''));
        $openTime = trim((string) ($_POST['open_time'] ?? $jsonBody['open_time'] ?? '08:00'));
        $closeTime = trim((string) ($_POST['close_time'] ?? $jsonBody['close_time'] ?? '18:00'));
        $controllerName = trim((string) ($_POST['controller_name'] ?? $jsonBody['controller_name'] ?? 'Mirene Uwase'));
        $controllerPhone = trim((string) ($_POST['controller_phone'] ?? $jsonBody['controller_phone'] ?? ''));
        $isActive = isset($_POST['is_active']) ? (int) $_POST['is_active'] : (int) ($jsonBody['is_active'] ?? 1);
        $terminalPinRaw = trim((string) ($_POST['terminal_pin'] ?? $jsonBody['terminal_pin'] ?? ''));

        if ($name === '') {
            echo json_encode(['ok' => false, 'error' => 'Warehouse name is required']);
            exit;
        }

        if ($terminalPinRaw !== '' && !preg_match('/^[A-Za-z0-9]{4,12}$/', $terminalPinRaw)) {
            echo json_encode(['ok' => false, 'error' => 'Terminal PIN must be 4–12 alphanumeric characters or digits']);
            exit;
        }

        if (strlen($openTime) === 5) $openTime .= ':00';
        if (strlen($closeTime) === 5) $closeTime .= ':00';

        // Handle Image Upload
        $uploadedImagePath = null;
        if (!empty($_FILES['image']['tmp_name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                $dir = __DIR__ . '/uploads/warehouses';
                if (!is_dir($dir)) mkdir($dir, 0777, true);
                $fileName = 'wh_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
                $dest = $dir . '/' . $fileName;
                if (move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
                    $uploadedImagePath = 'uploads/warehouses/' . $fileName;
                }
            }
        }

        if ($id > 0) {
            if ($uploadedImagePath && $terminalPinRaw !== '') {
                $stmt = $pdo->prepare("
                    UPDATE `stock_locations`
                    SET `name` = ?, `code` = ?, `location_code` = ?, `location` = ?, `open_time` = ?, `close_time` = ?,
                        `controller_name` = ?, `controller_phone` = ?, `is_active` = ?, `image` = ?, `terminal_pin` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $uploadedImagePath, $terminalPinRaw, $id]);
            } elseif ($uploadedImagePath) {
                $stmt = $pdo->prepare("
                    UPDATE `stock_locations`
                    SET `name` = ?, `code` = ?, `location_code` = ?, `location` = ?, `open_time` = ?, `close_time` = ?,
                        `controller_name` = ?, `controller_phone` = ?, `is_active` = ?, `image` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $uploadedImagePath, $id]);
            } elseif ($terminalPinRaw !== '') {
                $stmt = $pdo->prepare("
                    UPDATE `stock_locations`
                    SET `name` = ?, `code` = ?, `location_code` = ?, `location` = ?, `open_time` = ?, `close_time` = ?,
                        `controller_name` = ?, `controller_phone` = ?, `is_active` = ?, `terminal_pin` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $terminalPinRaw, $id]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE `stock_locations`
                    SET `name` = ?, `code` = ?, `location_code` = ?, `location` = ?, `open_time` = ?, `close_time` = ?,
                        `controller_name` = ?, `controller_phone` = ?, `is_active` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $id]);
            }
        } else {
            $pinToInsert = $terminalPinRaw !== '' ? $terminalPinRaw : str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            $stmt = $pdo->prepare("
                INSERT INTO `stock_locations`
                (`name`, `code`, `location_code`, `location`, `open_time`, `close_time`, `controller_name`, `controller_phone`, `is_active`, `image`, `terminal_pin`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $uploadedImagePath, $pinToInsert]);
            $id = (int) $pdo->lastInsertId();
        }

        echo json_encode([
            'ok' => true,
            'message' => 'Warehouse saved successfully',
            'warehouse_id' => $id,
        ]);
        exit;
    }

    if ($action === 'save_warehouse_pin' || $action === 'save_checkpoint_pin') {
        $caller = getCallerUser($pdo);
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'stock_warehouse'));
        if ($cpType !== 'event_venue') {
            $cpType = 'stock_warehouse';
        }

        if ($cpType === 'stock_warehouse') {
            $authCheck = canCallerPerformAction('save_warehouse_pin', $caller);
            if (!$authCheck['ok']) {
                http_response_code(403);
                echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
                exit;
            }
        } else {
            requireAuthorizedCaller(
                $pdo,
                ['admin', 'manager', 'administrator', 'tech_lead', 'technical_lead', 'project_manager', 'stock_manager'],
                'Permission denied: Updating Event Venue Terminal PINs requires Technical Lead, Site Manager, or Administrator privileges.'
            );
        }

        $cpIdRaw = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? $_POST['warehouse_id'] ?? $jsonBody['warehouse_id'] ?? '0'));
        $pin = trim((string) ($_POST['terminal_pin'] ?? $jsonBody['terminal_pin'] ?? ''));

        if ($cpIdRaw === '' || $cpIdRaw === '0') {
            echo json_encode(['ok' => false, 'error' => 'Valid checkpoint ID is required']);
            exit;
        }
        if (!preg_match('/^[A-Za-z0-9]{4,12}$/', $pin)) {
            echo json_encode(['ok' => false, 'error' => 'PIN must be 4–12 digits or alphanumeric characters']);
            exit;
        }

        if ($cpType === 'stock_warehouse') {
            $warehouseId = (int) $cpIdRaw;
            $upd = $pdo->prepare("UPDATE `stock_locations` SET `terminal_pin` = ? WHERE `id` = ?");
            $upd->execute([$pin, $warehouseId]);

            $whStmt = $pdo->prepare("SELECT `name` FROM `stock_locations` WHERE `id` = ?");
            $whStmt->execute([$warehouseId]);
            $whName = (string) ($whStmt->fetchColumn() ?: 'Stock Warehouse');

            echo json_encode([
                'ok' => true,
                'checkpoint_type' => 'stock_warehouse',
                'checkpoint_id' => $warehouseId,
                'warehouse_id' => $warehouseId,
                'checkpoint_name' => $whName,
                'warehouse_name' => $whName,
                'terminal_pin' => $pin,
                'message' => "Dedicated Terminal PIN updated for {$whName}",
            ]);
            exit;
        }

        $evIdNumeric = (int) $cpIdRaw;
        $evRow = null;
        $evStmt = $pdo->query("SELECT `id`, `title` FROM `events`");
        while ($candidate = $evStmt->fetch()) {
            $cidRaw = (string) ($candidate['id'] ?? '');
            $cidNum = is_numeric($cidRaw) ? (int) $cidRaw : crc32($cidRaw);
            if ($cidRaw === $cpIdRaw || ($evIdNumeric > 0 && $cidNum === $evIdNumeric)) {
                $evRow = $candidate;
                break;
            }
        }
        if (!$evRow) {
            echo json_encode(['ok' => false, 'error' => 'Event Venue checkpoint not found']);
            exit;
        }
        $pdo->prepare("UPDATE `events` SET `terminal_pin` = ? WHERE `id` = ?")->execute([$pin, (string) $evRow['id']]);
        $evName = (string) ($evRow['title'] ?? 'Event Venue');
        echo json_encode([
            'ok' => true,
            'checkpoint_type' => 'event_venue',
            'checkpoint_id' => is_numeric($evRow['id']) ? (int) $evRow['id'] : crc32((string) $evRow['id']),
            'raw_id' => (string) $evRow['id'],
            'checkpoint_name' => $evName,
            'terminal_pin' => $pin,
            'message' => "Dedicated Terminal PIN updated for {$evName}",
        ]);
        exit;
    }

    if ($action === 'verify_terminal_pin') {
        $caller = requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager', 'tech_lead', 'stock_controller'],
            'Permission denied: Unlocking a Gate Terminal requires an authorized operator session.'
        );
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'stock_warehouse'));
        $cpIdRaw = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? '0'));
        $cpId = (int) $cpIdRaw;
        $pin = trim((string) ($_POST['pin'] ?? $jsonBody['pin'] ?? ''));

        $lockCheck = assertControllerCheckpointLock($pdo, $cpType, $cpIdRaw);
        if (!$lockCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $lockCheck['error']]);
            exit;
        }

        if ($pin === '') {
            echo json_encode(['ok' => false, 'error' => 'Please enter a Terminal PIN']);
            exit;
        }

        $pinRateKey = 'pin:' . (int) ($caller['id'] ?? 0) . ':' . $cpType . ':' . $cpIdRaw;
        $pinRateCheck = checkSecurityRateLimit($pdo, $pinRateKey, 5, 600);
        if (!$pinRateCheck['allowed']) {
            http_response_code(429);
            echo json_encode([
                'ok' => false,
                'error' => "Too many invalid PIN attempts. Terminal PIN entry paused for {$pinRateCheck['retry_after']}s.",
            ]);
            exit;
        }

        if ($cpType === 'stock_warehouse') {
            $stmt = $pdo->prepare("SELECT * FROM `stock_locations` WHERE `id` = ? LIMIT 1");
            $stmt->execute([$cpId]);
            $row = $stmt->fetch();
            if (!$row) {
                echo json_encode(['ok' => false, 'error' => 'Facility checkpoint not found']);
                exit;
            }
            $expectedPin = resolveWarehouseTerminalPin($row);
            $cpName = (string) ($row['name'] ?? 'Facility Terminal');
            if ($expectedPin === '') {
                echo json_encode([
                    'ok' => false,
                    'error' => "No Terminal PIN is configured for {$cpName}. Ask an Administrator or Site Manager to configure one.",
                ]);
                exit;
            }
            if (!verifyTerminalPinSecret($pin, $expectedPin)) {
                recordFailedRateLimit($pdo, $pinRateKey, 5, 600, 60);
                echo json_encode([
                    'ok' => false,
                    'error' => "Invalid PIN for {$cpName}",
                ]);
                exit;
            }
            clearSecurityRateLimit($pdo, $pinRateKey);
            echo json_encode([
                'ok' => true,
                'checkpoint_type' => 'stock_warehouse',
                'checkpoint_id' => $cpId,
                'checkpoint_name' => $cpName,
                'message' => "PIN verified for {$cpName}",
            ]);
            exit;
        }

        // Event Venue PIN validation against DB `events.terminal_pin` (supports numeric IDs and UUIDs)
        $evRow = null;
        try {
            $evStmt = $pdo->query("SELECT `id`, `title`, `terminal_pin` FROM `events`");
            while ($candidate = $evStmt->fetch()) {
                $cidRaw = (string) ($candidate['id'] ?? '');
                $cidNum = is_numeric($cidRaw) ? (int) $cidRaw : crc32($cidRaw);
                if ($cidRaw === $cpIdRaw || ($cpId > 0 && $cidNum === $cpId)) {
                    $evRow = $candidate;
                    break;
                }
            }
        } catch (Throwable $e) {}

        if (!$evRow) {
            echo json_encode(['ok' => false, 'error' => 'Event Venue checkpoint not found']);
            exit;
        }

        $expectedEvPin = trim((string) ($evRow['terminal_pin'] ?? ''));
        $evName = (string) ($evRow['title'] ?? 'Event Venue');
        if ($expectedEvPin === '') {
            echo json_encode([
                'ok' => false,
                'error' => "No Terminal PIN is configured for {$evName}. Ask an Administrator or Technical Lead to configure one.",
            ]);
            exit;
        }

        if (!verifyTerminalPinSecret($pin, $expectedEvPin)) {
            recordFailedRateLimit($pdo, $pinRateKey, 5, 600, 60);
            echo json_encode(['ok' => false, 'error' => "Invalid PIN for {$evName}"]);
            exit;
        }
        clearSecurityRateLimit($pdo, $pinRateKey);
        echo json_encode([
            'ok' => true,
            'checkpoint_type' => 'event_venue',
            'checkpoint_id' => $cpId,
            'checkpoint_name' => $evName,
            'message' => "PIN verified for {$evName}",
        ]);
        exit;
    }

    if ($action === 'delete_warehouse') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_warehouse', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($id > 0) {
            $del = $pdo->prepare("DELETE FROM `stock_locations` WHERE `id` = ?");
            $del->execute([$id]);
        }
        echo json_encode(['ok' => true, 'message' => 'Warehouse deleted']);
        exit;
    }

    if ($action === 'save_stock_item') {
        requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager'],
            'Permission denied: Managing equipment items requires Site Manager or Administrator privileges.'
        );
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $itemName = trim((string) ($_POST['item_name'] ?? $jsonBody['item_name'] ?? ''));
        $serialNumber = trim((string) ($_POST['serial_number'] ?? $jsonBody['serial_number'] ?? ''));
        $category = trim((string) ($_POST['category'] ?? $jsonBody['category'] ?? 'General'));
        $brand = trim((string) ($_POST['brand'] ?? $jsonBody['brand'] ?? ''));
        $model = trim((string) ($_POST['model'] ?? $jsonBody['model'] ?? ''));
        $department = trim((string) ($_POST['department'] ?? $jsonBody['department'] ?? 'Warehouse'));
        $stockLocation = trim((string) ($_POST['stock_location'] ?? $jsonBody['stock_location'] ?? 'Ndera Warehouse'));
        $quantity = (int) ($_POST['quantity'] ?? $jsonBody['quantity'] ?? 1);
        $condition = trim((string) ($_POST['condition'] ?? $jsonBody['condition'] ?? 'good'));
        $status = trim((string) ($_POST['status'] ?? $jsonBody['status'] ?? 'available'));
        $notes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? ''));

        if ($itemName === '') {
            echo json_encode(['ok' => false, 'error' => 'Item name is required']);
            exit;
        }

        if ($serialNumber === '') {
            $serialNumber = 'SN-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $category), 0, 3) ?: 'GEN') . '-' . date('ymd') . '-' . rand(100, 999);
        }

        // Handle Image Upload
        $uploadedImagePath = null;
        if (!empty($_FILES['image']['tmp_name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                $dir = __DIR__ . '/uploads/items';
                if (!is_dir($dir)) mkdir($dir, 0777, true);
                $fileName = 'item_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
                $dest = $dir . '/' . $fileName;
                if (move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
                    $uploadedImagePath = 'uploads/items/' . $fileName;
                }
            }
        }

        // Check whether image sync to identical items is active (default true)
        $syncIdentical = !isset($_POST['sync_identical']) || $_POST['sync_identical'] === '1' || $_POST['sync_identical'] === 'true';

        $syncedCount = 0;

        if ($id > 0) {
            // If no new image was uploaded in this request, preserve existing image or inherit from identical sibling
            if (!$uploadedImagePath) {
                $chk = $pdo->prepare("SELECT `image` FROM `items` WHERE `id` = ?");
                $chk->execute([$id]);
                $uploadedImagePath = $chk->fetchColumn() ?: null;
            }

            // If item has no image at all, check if an identical unit already has an image
            if (!$uploadedImagePath) {
                $findSibling = $pdo->prepare("
                    SELECT `image` FROM `items`
                    WHERE `id` != ?
                      AND `image` IS NOT NULL AND `image` != ''
                      AND TRIM(LOWER(`item_name`)) = TRIM(LOWER(?))
                      AND (? = '' OR `model` IS NULL OR `model` = '' OR TRIM(LOWER(`model`)) = TRIM(LOWER(?)))
                      AND (? = '' OR `brand` IS NULL OR `brand` = '' OR TRIM(LOWER(`brand`)) = TRIM(LOWER(?)))
                    ORDER BY `id` DESC LIMIT 1
                ");
                $findSibling->execute([$id, $itemName, $model, $model, $brand, $brand]);
                $inherited = $findSibling->fetchColumn();
                if ($inherited) {
                    $uploadedImagePath = $inherited;
                }
            }

            $stmt = $pdo->prepare("
                UPDATE `items`
                SET `item_name` = ?, `serial_number` = ?, `category` = ?, `brand` = ?, `model` = ?, `department` = ?,
                    `stock_location` = ?, `quantity` = ?, `condition` = ?, `status` = ?, `notes` = ?, `image` = ?
                WHERE `id` = ?
            ");
            $stmt->execute([$itemName, $serialNumber, $category, $brand, $model, $department, $stockLocation, $quantity, $condition, $status, $notes, $uploadedImagePath, $id]);
        } else {
            // If creating a new item without photo, check if an identical unit already has one
            if (!$uploadedImagePath) {
                $findSibling = $pdo->prepare("
                    SELECT `image` FROM `items`
                    WHERE `image` IS NOT NULL AND `image` != ''
                      AND TRIM(LOWER(`item_name`)) = TRIM(LOWER(?))
                      AND (? = '' OR `model` IS NULL OR `model` = '' OR TRIM(LOWER(`model`)) = TRIM(LOWER(?)))
                      AND (? = '' OR `brand` IS NULL OR `brand` = '' OR TRIM(LOWER(`brand`)) = TRIM(LOWER(?)))
                    ORDER BY `id` DESC LIMIT 1
                ");
                $findSibling->execute([$itemName, $model, $model, $brand, $brand]);
                $inherited = $findSibling->fetchColumn();
                if ($inherited) {
                    $uploadedImagePath = $inherited;
                }
            }

            $stmt = $pdo->prepare("
                INSERT INTO `items`
                (`item_name`, `serial_number`, `category`, `brand`, `model`, `department`, `stock_location`, `quantity`, `condition`, `status`, `notes`, `image`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$itemName, $serialNumber, $category, $brand, $model, $department, $stockLocation, $quantity, $condition, $status, $notes, $uploadedImagePath]);
            $id = (int) $pdo->lastInsertId();
        }

        // SYNC IMAGE TO ALL IDENTICAL EQUIPMENT UNITS
        if ($uploadedImagePath && $syncIdentical) {
            $syncStmt = $pdo->prepare("
                UPDATE `items`
                SET `image` = ?
                WHERE `id` != ?
                  AND TRIM(LOWER(`item_name`)) = TRIM(LOWER(?))
                  AND (? = '' OR `model` IS NULL OR `model` = '' OR TRIM(LOWER(`model`)) = TRIM(LOWER(?)))
                  AND (? = '' OR `brand` IS NULL OR `brand` = '' OR TRIM(LOWER(`brand`)) = TRIM(LOWER(?)))
            ");
            $syncStmt->execute([
                $uploadedImagePath,
                $id,
                $itemName,
                $model,
                $model,
                $brand,
                $brand,
            ]);
            $syncedCount = $syncStmt->rowCount();
        }

        $msg = 'Stock item saved successfully';
        if ($syncedCount > 0) {
            $msg = "Stock item saved and photo synced to {$syncedCount} identical equipment units ({$itemName})";
        }

        echo json_encode([
            'ok' => true,
            'message' => $msg,
            'item_id' => $id,
            'synced_count' => $syncedCount,
            'image' => $uploadedImagePath,
        ]);
        exit;
    }

    if ($action === 'sync_all_stock_images') {
        requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager'],
            'Permission denied: Syncing equipment photos requires Site Manager or Administrator privileges.'
        );
        // Collect latest image per identical equipment group (item_name, brand, model)
        $stmt = $pdo->query("
            SELECT `item_name`, `brand`, `model`, `image`, MAX(`id`) as latest_id
            FROM `items`
            WHERE `image` IS NOT NULL AND `image` != ''
            GROUP BY `item_name`, `brand`, `model`, `image`
            ORDER BY latest_id DESC
        ");
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalSynced = 0;
        $updatedGroups = 0;
        $seen = [];

        foreach ($groups as $g) {
            $key = strtolower(trim($g['item_name'])) . '||' . strtolower(trim((string)$g['brand'])) . '||' . strtolower(trim((string)$g['model']));
            if (isset($seen[$key])) continue;
            $seen[$key] = true;

            $img = $g['image'];
            $syncStmt = $pdo->prepare("
                UPDATE `items`
                SET `image` = ?
                WHERE (`image` IS NULL OR `image` = '' OR `image` != ?)
                  AND TRIM(LOWER(`item_name`)) = TRIM(LOWER(?))
                  AND (? = '' OR `model` IS NULL OR `model` = '' OR TRIM(LOWER(`model`)) = TRIM(LOWER(?)))
                  AND (? = '' OR `brand` IS NULL OR `brand` = '' OR TRIM(LOWER(`brand`)) = TRIM(LOWER(?)))
            ");
            $syncStmt->execute([
                $img,
                $img,
                $g['item_name'],
                $g['model'] ?? '',
                $g['model'] ?? '',
                $g['brand'] ?? '',
                $g['brand'] ?? '',
            ]);
            $cnt = $syncStmt->rowCount();
            if ($cnt > 0) {
                $totalSynced += $cnt;
                $updatedGroups++;
            }
        }

        echo json_encode([
            'ok' => true,
            'message' => "Synced equipment photos across {$updatedGroups} groups ({$totalSynced} units updated)",
            'total_synced' => $totalSynced,
            'updated_groups' => $updatedGroups,
        ]);
        exit;
    }

    if ($action === 'delete_stock_item') {
        requireAuthorizedCaller(
            $pdo,
            ['admin', 'manager', 'administrator', 'stock_manager'],
            'Permission denied: Deleting equipment items requires Site Manager or Administrator privileges.'
        );
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($id > 0) {
            $del = $pdo->prepare("DELETE FROM `items` WHERE `id` = ?");
            $del->execute([$id]);
        }
        echo json_encode(['ok' => true, 'message' => 'Stock item deleted']);
        exit;
    }

    if ($action === 'save_user') {
        $caller = getCallerUser($pdo);
        $reqClearance = trim((string) ($_POST['clearance_level'] ?? $jsonBody['clearance_level'] ?? 'L2_TECH_STAGE'));
        $reqRole = trim((string) ($_POST['role'] ?? $jsonBody['role'] ?? 'technician'));
        $authCheck = canCallerPerformAction('save_user', $caller, [
            'clearance_level' => $reqClearance,
            'role' => $reqRole,
        ]);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $fullName = trim((string) ($_POST['full_name'] ?? $jsonBody['full_name'] ?? ''));
        $username = trim((string) ($_POST['username'] ?? $jsonBody['username'] ?? ''));
        $email = trim((string) ($_POST['email'] ?? $jsonBody['email'] ?? ''));
        $phone = trim((string) ($_POST['phone'] ?? $jsonBody['phone'] ?? ''));
        $role = trim((string) ($_POST['role'] ?? $jsonBody['role'] ?? 'technician'));
        $department = trim((string) ($_POST['department'] ?? $jsonBody['department'] ?? 'Audio'));
        $clearanceLevel = trim((string) ($_POST['clearance_level'] ?? $jsonBody['clearance_level'] ?? 'L2_TECH_STAGE'));
        $stockAccessMode = trim((string) ($_POST['stock_access_mode'] ?? $jsonBody['stock_access_mode'] ?? 'assigned_only'));
        $venueAccessMode = trim((string) ($_POST['venue_access_mode'] ?? $jsonBody['venue_access_mode'] ?? 'all'));
        $badgeCode = trim((string) ($_POST['badge_code'] ?? $jsonBody['badge_code'] ?? ''));
        $rfidUid = trim((string) ($_POST['rfid_uid'] ?? $jsonBody['rfid_uid'] ?? ''));
        $badgeStatus = trim((string) ($_POST['badge_status'] ?? $jsonBody['badge_status'] ?? 'active'));
        $isActive = isset($_POST['is_active']) ? (int) $_POST['is_active'] : (int) ($jsonBody['is_active'] ?? 1);

        $assignedCpType = trim((string) ($_POST['assigned_checkpoint_type'] ?? $jsonBody['assigned_checkpoint_type'] ?? ''));
        $assignedCpId = trim((string) ($_POST['assigned_checkpoint_id'] ?? $jsonBody['assigned_checkpoint_id'] ?? ''));
        $hasAssignedCpField = array_key_exists('assigned_checkpoint_id', $_POST) || array_key_exists('assigned_checkpoint_id', $jsonBody);
        $callerRole = strtolower(trim((string) ($caller['role'] ?? '')));
        $canAssignCp = in_array($callerRole, ['admin', 'manager', 'administrator', 'stock_manager'], true);

        if ($fullName === '') {
            echo json_encode(['ok' => false, 'error' => 'Full name is required']);
            exit;
        }

        if ($username === '') {
            $username = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $fullName));
            if ($username === '') $username = 'user' . time();
        }

        // Check for duplicate username
        $checkUser = $pdo->prepare("SELECT `id` FROM `users` WHERE `username` = ? AND `id` != ?");
        $checkUser->execute([$username, $id]);
        if ($checkUser->fetch()) {
            $username .= '_' . rand(10, 99);
        }

        // Handle profile photo upload
        $uploadedImagePath = null;
        if (!empty($_FILES['profile_image']['tmp_name']) && is_uploaded_file($_FILES['profile_image']['tmp_name'])) {
            $ext = strtolower(pathinfo($_FILES['profile_image']['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                $dir = __DIR__ . '/uploads/profiles';
                if (!is_dir($dir)) mkdir($dir, 0777, true);
                $fileName = 'profile_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
                $dest = $dir . '/' . $fileName;
                if (move_uploaded_file($_FILES['profile_image']['tmp_name'], $dest)) {
                    $uploadedImagePath = 'uploads/profiles/' . $fileName;
                }
            }
        }

        $userPass = trim((string) ($_POST['password'] ?? $jsonBody['password'] ?? ''));
        $isNewRecord = ($id <= 0);
        if ($isNewRecord && strlen($userPass) < 6) {
            echo json_encode(['ok' => false, 'error' => 'Please set an initial password (minimum 6 characters) for new personnel accounts.']);
            exit;
        }
        if ($userPass !== '' && strlen($userPass) < 6) {
            echo json_encode(['ok' => false, 'error' => 'Password must be at least 6 characters.']);
            exit;
        }

        if ($id > 0) {
            if ($uploadedImagePath) {
                $stmt = $pdo->prepare("
                    UPDATE `users`
                    SET `username` = ?, `full_name` = ?, `email` = ?, `phone` = ?, `role` = ?, `department` = ?, `profile_image` = ?, `is_active` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$username, $fullName, $email, $phone, $role, $department, $uploadedImagePath, $isActive, $id]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE `users`
                    SET `username` = ?, `full_name` = ?, `email` = ?, `phone` = ?, `role` = ?, `department` = ?, `is_active` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$username, $fullName, $email, $phone, $role, $department, $isActive, $id]);
            }
            if ($userPass !== '') {
                $pHash = password_hash($userPass, PASSWORD_BCRYPT);
                $pdo->prepare("UPDATE `users` SET `password_hash` = ? WHERE `id` = ?")->execute([$pHash, $id]);
            }
            if ($canAssignCp && $hasAssignedCpField) {
                if (strtolower($role) === 'stock_controller' && $assignedCpId !== '') {
                    $cpTypeSafe = in_array($assignedCpType, ['stock_warehouse', 'event_venue'], true) ? $assignedCpType : 'stock_warehouse';
                    $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = ?, `assigned_checkpoint_id` = ? WHERE `id` = ?")->execute([$cpTypeSafe, $assignedCpId, $id]);
                } else {
                    $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL WHERE `id` = ?")->execute([$id]);
                }
            }
        } else {
            $pHash = password_hash($userPass, PASSWORD_BCRYPT);
            $insCpType = ($canAssignCp && strtolower($role) === 'stock_controller' && $assignedCpId !== '')
                ? (in_array($assignedCpType, ['stock_warehouse', 'event_venue'], true) ? $assignedCpType : 'stock_warehouse')
                : null;
            $insCpId = $insCpType ? $assignedCpId : null;
            $stmt = $pdo->prepare("
                INSERT INTO `users`
                (`username`, `full_name`, `email`, `password_hash`, `phone`, `role`, `department`, `profile_image`, `assigned_checkpoint_type`, `assigned_checkpoint_id`, `is_active`, `must_change_password`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt->execute([$username, $fullName, $email, $pHash, $phone, $role, $department, $uploadedImagePath, $insCpType, $insCpId, $isActive]);
            $id = (int) $pdo->lastInsertId();
        }

        // Ensure badge values
        if ($badgeCode === '') {
            $badgeCode = 'REW-BADGE-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
        }
        if ($rfidUid === '') {
            $rfidUid = 'RFID-88' . str_pad((string) $id, 2, '0', STR_PAD_LEFT);
        }

        // Prevent duplicate badge_code
        $checkBadge = $pdo->prepare("SELECT `id` FROM `user_badges` WHERE `badge_code` = ? AND `user_id` != ?");
        $checkBadge->execute([$badgeCode, $id]);
        if ($checkBadge->fetch()) {
            $badgeCode .= '-' . rand(10, 99);
        }

        // Normalize clearance level
        $tier = normalizeClearanceTier($clearanceLevel, $role);
        $normClearance = $tier['key'];

        // Save or update user_badges
        $badgeCheck = $pdo->prepare("SELECT `id` FROM `user_badges` WHERE `user_id` = ?");
        $badgeCheck->execute([$id]);
        $existingBadge = $badgeCheck->fetch();

        if ($existingBadge) {
            $stmtB = $pdo->prepare("
                UPDATE `user_badges`
                SET `badge_code` = ?, `rfid_uid` = ?, `clearance_level` = ?, `stock_access_mode` = ?, `venue_access_mode` = ?, `badge_status` = ?
                WHERE `user_id` = ?
            ");
            $stmtB->execute([$badgeCode, $rfidUid, $normClearance, $stockAccessMode, $venueAccessMode, $badgeStatus, $id]);
        } else {
            $stmtB = $pdo->prepare("
                INSERT INTO `user_badges`
                (`user_id`, `badge_code`, `rfid_uid`, `clearance_level`, `stock_access_mode`, `venue_access_mode`, `badge_status`, `issued_at`, `expires_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
            ");
            $stmtB->execute([$id, $badgeCode, $rfidUid, $normClearance, $stockAccessMode, $venueAccessMode, $badgeStatus]);
        }

        echo json_encode([
            'ok' => true,
            'message' => 'Personnel profile & permissions saved successfully',
            'user_id' => $id,
        ]);
        exit;
    }

    
    if ($action === 'get_roles') {
        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode(['ok' => true, 'roles' => $full['roles']]);
        exit;
    }

    if ($action === 'save_role') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_role', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        ensureRolesTable($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $title = trim((string) ($_POST['title'] ?? $jsonBody['title'] ?? ''));
        $roleKey = strtolower(trim((string) ($_POST['role_key'] ?? $jsonBody['role_key'] ?? '')));
        $clearanceLevel = trim((string) ($_POST['clearance_level'] ?? $jsonBody['clearance_level'] ?? 'L2_TECH_STAGE'));
        $department = trim((string) ($_POST['department'] ?? $jsonBody['department'] ?? 'Audio'));
        $description = trim((string) ($_POST['description'] ?? $jsonBody['description'] ?? ''));
        $isActive = isset($_POST['is_active']) ? (int) $_POST['is_active'] : (int) ($jsonBody['is_active'] ?? 1);

        if ($title === '') {
            echo json_encode(['ok' => false, 'error' => 'Role title is required.']);
            exit;
        }
        if ($roleKey === '') {
            $roleKey = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $title));
        }

        $tier = normalizeClearanceTier($clearanceLevel, $roleKey);
        $normClearance = $tier['key'];

        if ($id > 0) {
            $upd = $pdo->prepare("
                UPDATE `roles`
                SET `title` = ?, `role_name` = ?, `role_key` = ?, `clearance_level` = ?, `department` = ?, `description` = ?, `is_active` = ?
                WHERE `id` = ?
            ");
            $upd->execute([$title, $title, $roleKey, $normClearance, $department, $description, $isActive, $id]);
        } else {
            $dup = $pdo->prepare("SELECT `id` FROM `roles` WHERE `role_key` = ?");
            $dup->execute([$roleKey]);
            if ($dup->fetch()) {
                $roleKey .= '_' . rand(10, 99);
            }
            $ins = $pdo->prepare("
                INSERT INTO `roles` (`role_key`, `role_name`, `title`, `clearance_level`, `department`, `description`, `is_system`, `is_active`)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            ");
            $ins->execute([$roleKey, $title, $title, $normClearance, $department, $description, $isActive]);
            $id = (int) $pdo->lastInsertId();
        }

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => 'Role definition saved successfully.',
            'role_id' => $id,
            'roles' => $full['roles'],
        ]);
        exit;
    }

    if ($action === 'delete_role') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_role', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        ensureRolesTable($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $roleKey = strtolower(trim((string) ($_POST['role_key'] ?? $jsonBody['role_key'] ?? '')));

        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT * FROM `roles` WHERE `id` = ?");
            $stmt->execute([$id]);
            $r = $stmt->fetch();
        } elseif ($roleKey !== '') {
            $stmt = $pdo->prepare("SELECT * FROM `roles` WHERE `role_key` = ?");
            $stmt->execute([$roleKey]);
            $r = $stmt->fetch();
        } else {
            $r = null;
        }

        if (!$r) {
            echo json_encode(['ok' => false, 'error' => 'Role not found.']);
            exit;
        }

        $rKey = strtolower((string)$r['role_key']);
        if ((int)$r['is_system'] === 1 || in_array($rKey, ['admin', 'stock_controller'], true)) {
            echo json_encode(['ok' => false, 'error' => "System core role '{$r['title']}' is protected and cannot be deleted."]);
            exit;
        }

        $checkUsers = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `role` = ?");
        $checkUsers->execute([$rKey]);
        $assignedCount = (int) $checkUsers->fetchColumn();
        if ($assignedCount > 0) {
            echo json_encode([
                'ok' => false,
                'error' => "Cannot delete '{$r['title']}': {$assignedCount} personnel members are currently assigned to this role. Please reassign them first.",
            ]);
            exit;
        }

        $del = $pdo->prepare("DELETE FROM `roles` WHERE `id` = ?");
        $del->execute([(int)$r['id']]);

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => "Role '{$r['title']}' deleted successfully.",
            'roles' => $full['roles'],
        ]);
        exit;
    }

    if ($action === 'get_departments') {
        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode(['ok' => true, 'departments' => $full['departments']]);
        exit;
    }

    if ($action === 'save_department') {
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $name = trim((string) ($_POST['name'] ?? $jsonBody['name'] ?? ''));
        $code = strtoupper(trim((string) ($_POST['code'] ?? $jsonBody['code'] ?? '')));
        $description = trim((string) ($_POST['description'] ?? $jsonBody['description'] ?? ''));
        $isActive = isset($_POST['is_active']) ? (int) $_POST['is_active'] : (int) ($jsonBody['is_active'] ?? 1);

        if ($name === '') {
            echo json_encode(['ok' => false, 'error' => 'Department name is required.']);
            exit;
        }
        if ($code === '') {
            $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $name), 0, 6));
        }

        if ($id > 0) {
            $chk = $pdo->prepare("SELECT `id` FROM `departments` WHERE `code` = ? AND `id` != ?");
            $chk->execute([$code, $id]);
            if ($chk->fetch()) {
                echo json_encode(['ok' => false, 'error' => "Department code '{$code}' is already in use by another department."]);
                exit;
            }
            $stmt = $pdo->prepare("UPDATE `departments` SET `name` = ?, `code` = ?, `description` = ?, `is_active` = ? WHERE `id` = ?");
            $stmt->execute([$name, $code, $description, $isActive, $id]);
            $msg = "Department '{$name}' updated successfully.";
        } else {
            $chk = $pdo->prepare("SELECT `id` FROM `departments` WHERE `code` = ?");
            $chk->execute([$code]);
            if ($chk->fetch()) {
                echo json_encode(['ok' => false, 'error' => "Department code '{$code}' already exists."]);
                exit;
            }
            $stmt = $pdo->prepare("INSERT INTO `departments` (`name`, `code`, `description`, `is_active`) VALUES (?, ?, ?, ?)");
            $stmt->execute([$name, $code, $description, $isActive]);
            $id = (int) $pdo->lastInsertId();
            $msg = "Department '{$name}' created successfully.";
        }

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => $msg,
            'department_id' => $id,
            'departments' => $full['departments'],
        ]);
        exit;
    }

    if ($action === 'delete_department') {
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM `departments` WHERE `id` = ?");
        $stmt->execute([$id]);
        $dept = $stmt->fetch();
        if (!$dept) {
            echo json_encode(['ok' => false, 'error' => 'Department not found.']);
            exit;
        }

        $deptName = $dept['name'];
        $deptCode = $dept['code'];
        $chkUsers = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE LOWER(`department`) = ? OR LOWER(`department`) = ?");
        $chkUsers->execute([strtolower($deptName), strtolower($deptCode)]);
        $userCount = (int) $chkUsers->fetchColumn();

        if ($userCount > 0) {
            echo json_encode([
                'ok' => false,
                'error' => "Cannot delete department '{$deptName}': {$userCount} staff members are currently assigned to it. Please reassign them first.",
            ]);
            exit;
        }

        $pdo->prepare("DELETE FROM `departments` WHERE `id` = ?")->execute([$id]);
        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode([
            'ok' => true,
            'message' => "Department '{$deptName}' deleted successfully.",
            'departments' => $full['departments'],
        ]);
        exit;
    }

    if ($action === 'get_navigation') {
        echo json_encode([
            'ok' => true,
            'navigationConfig' => getNavigationConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'toggle_main_nav') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureNavigationTables($pdo);
        $group = trim((string) ($_POST['group'] ?? $jsonBody['group'] ?? 'main'));
        $settingKey = ($group === 'workspace') ? 'workspace_nav_enabled' : 'main_nav_enabled';
        $enabledRaw = $_POST['enabled'] ?? $jsonBody['enabled'] ?? 1;
        $enabledStr = ((int) $enabledRaw === 1 || $enabledRaw === true || $enabledRaw === 'true') ? '1' : '0';
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `setting_value` = ?")
            ->execute([$settingKey, $enabledStr, $enabledStr]);

        $navCfg = getNavigationConfig($pdo);
        $labelTxt = ($group === 'workspace') ? 'Checkpoint Controls bar' : 'Main navigation bar';
        echo json_encode([
            'ok' => true,
            'message' => $enabledStr === '1' ? "{$labelTxt} enabled." : "{$labelTxt} disabled.",
            'navigationConfig' => $navCfg,
        ]);
        exit;
    }

    if ($action === 'save_nav_item') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureNavigationTables($pdo);

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $navGroup = trim((string) ($_POST['nav_group'] ?? $jsonBody['nav_group'] ?? 'main'));
        $navGroup = ($navGroup === 'workspace') ? 'workspace' : 'main';
        $label = trim((string) ($_POST['label'] ?? $jsonBody['label'] ?? ''));
        $navKeyRaw = trim((string) ($_POST['nav_key'] ?? $jsonBody['nav_key'] ?? ''));
        $navTarget = trim((string) ($_POST['nav_target'] ?? $jsonBody['nav_target'] ?? 'overview'));
        $icon = trim((string) ($_POST['icon'] ?? $jsonBody['icon'] ?? 'assets/nav-overview-inactive.svg'));
        $activeIcon = trim((string) ($_POST['active_icon'] ?? $jsonBody['active_icon'] ?? ''));
        $badgeType = trim((string) ($_POST['badge_type'] ?? $jsonBody['badge_type'] ?? 'none'));
        $badgeText = trim((string) ($_POST['badge_text'] ?? $jsonBody['badge_text'] ?? ''));
        $allowedRoles = trim((string) ($_POST['allowed_roles'] ?? $jsonBody['allowed_roles'] ?? 'all'));
        $sortOrder = (int) ($_POST['sort_order'] ?? $jsonBody['sort_order'] ?? 10);
        $isEnabled = isset($_POST['is_enabled']) ? ((int) $_POST['is_enabled'] ? 1 : 0) : ((int) ($jsonBody['is_enabled'] ?? 1) ? 1 : 0);

        if ($label === '') {
            echo json_encode(['ok' => false, 'error' => 'Navigation item label is required.']);
            exit;
        }
        if ($navTarget === '') {
            echo json_encode(['ok' => false, 'error' => 'Navigation target screen or action is required.']);
            exit;
        }

        $navKey = strtolower(preg_replace('/[^a-zA-Z0-9_-]/', '_', $navKeyRaw !== '' ? $navKeyRaw : $label));
        $navKey = trim($navKey, '_');
        if ($navKey === '') {
            $navKey = 'nav_' . time();
        }
        if ($allowedRoles === '') {
            $allowedRoles = 'all';
        }

        $badgeIdMap = [
            'events' => 'sidebar-events-count',
            'users' => 'sidebar-users-count',
            'stock' => 'sidebar-stock-count',
            'shift_relief' => 'sidebar-shift-relief-badge',
            'calltime' => 'sidebar-active-calltime-pill',
        ];
        $badgeId = $badgeIdMap[$badgeType] ?? '';

        if ($id > 0) {
            $chk = $pdo->prepare("SELECT `id` FROM `navigation_items` WHERE `nav_key` = ? AND `id` != ?");
            $chk->execute([$navKey, $id]);
            if ($chk->fetch()) {
                echo json_encode(['ok' => false, 'error' => "Navigation key '{$navKey}' is already used by another item."]);
                exit;
            }
            $stmt = $pdo->prepare("
                UPDATE `navigation_items`
                SET `nav_group` = ?, `nav_key` = ?, `label` = ?, `nav_target` = ?, `icon` = ?, `active_icon` = ?, `badge_type` = ?, `badge_id` = ?, `badge_text` = ?, `allowed_roles` = ?, `sort_order` = ?, `is_enabled` = ?
                WHERE `id` = ?
            ");
            $stmt->execute([$navGroup, $navKey, $label, $navTarget, $icon, $activeIcon, $badgeType, $badgeId, $badgeText, $allowedRoles, $sortOrder, $isEnabled, $id]);
            $msg = "Navigation item '{$label}' updated.";
        } else {
            $chk = $pdo->prepare("SELECT `id` FROM `navigation_items` WHERE `nav_key` = ?");
            $chk->execute([$navKey]);
            if ($chk->fetch()) {
                $navKey .= '_' . rand(10, 99);
            }
            $domId = 'nav-custom-' . $navKey;
            $stmt = $pdo->prepare("
                INSERT INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES (?, ?, ?, ?, ?, '', ?, ?, '', ?, ?, ?, ?, ?, ?, 0)
            ");
            $stmt->execute([$navGroup, $navKey, $label, $navTarget, $domId, $icon, $activeIcon, $badgeType, $badgeId, $badgeText, $allowedRoles, $sortOrder, $isEnabled]);
            $id = (int) $pdo->lastInsertId();
            $msg = "Navigation item '{$label}' created.";
        }

        echo json_encode([
            'ok' => true,
            'message' => $msg,
            'item_id' => $id,
            'navigationConfig' => getNavigationConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'toggle_nav_item') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureNavigationTables($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $isEnabled = isset($_POST['is_enabled']) ? ((int) $_POST['is_enabled'] ? 1 : 0) : ((int) ($jsonBody['is_enabled'] ?? 1) ? 1 : 0);
        $stmt = $pdo->prepare("SELECT `label` FROM `navigation_items` WHERE `id` = ?");
        $stmt->execute([$id]);
        $lbl = $stmt->fetchColumn();
        if ($lbl === false) {
            echo json_encode(['ok' => false, 'error' => 'Navigation item not found.']);
            exit;
        }
        $pdo->prepare("UPDATE `navigation_items` SET `is_enabled` = ? WHERE `id` = ?")->execute([$isEnabled, $id]);
        echo json_encode([
            'ok' => true,
            'message' => ($isEnabled ? "Enabled" : "Disabled") . " '{$lbl}'.",
            'navigationConfig' => getNavigationConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'delete_nav_item') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureNavigationTables($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT `label` FROM `navigation_items` WHERE `id` = ?");
        $stmt->execute([$id]);
        $lbl = $stmt->fetchColumn();
        if ($lbl === false) {
            echo json_encode(['ok' => false, 'error' => 'Navigation item not found.']);
            exit;
        }
        $pdo->prepare("DELETE FROM `navigation_items` WHERE `id` = ?")->execute([$id]);
        echo json_encode([
            'ok' => true,
            'message' => "Deleted navigation item '{$lbl}'.",
            'navigationConfig' => getNavigationConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'reset_navigation_defaults') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureNavigationTables($pdo, true);
        echo json_encode([
            'ok' => true,
            'message' => 'Main navigation restored to default items and enabled.',
            'navigationConfig' => getNavigationConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'delete_user') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_user', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($id > 0) {
            $pdo->prepare("DELETE FROM `attendance_logs` WHERE `user_id` = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM `user_badges` WHERE `user_id` = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM `users` WHERE `id` = ?")->execute([$id]);
        }
        echo json_encode(['ok' => true, 'message' => 'User deleted successfully']);
        exit;
    }

    if ($action === 'reset_today_scans' || $action === 'reset_demo' || $action === 'reset_activity_logs' || $action === 'reset_timeline_logs') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('reset_logs', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $confirmPassword = (string) ($_POST['confirm_password'] ?? $jsonBody['confirm_password'] ?? '');
        $callerHash = (string) ($caller['password_hash'] ?? '');
        if ($confirmPassword === '' || $callerHash === '' || !password_verify($confirmPassword, $callerHash)) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'Administrator password confirmation required to reset attendance logs.']);
            exit;
        }
        try {
            $pdo->exec("TRUNCATE TABLE `attendance_logs`");
        } catch (Throwable $e) {
            $pdo->exec("DELETE FROM `attendance_logs`");
        }
        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => "All gate attendance and activity timeline logs have been successfully reset. All crew members are now Ready (0 on-site).",
                'today_reset' => true,
            ]
        ));
        exit;
    }

    if ($action === 'seed_demo_scans') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('reset_logs', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        seedSampleAttendanceLogs($pdo);
        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => "Sample demo scans have been loaded.",
            ]
        ));
        exit;
    }

    if ($action === 'mark_notifications_read') {
        $caller = getCallerUser($pdo);
        if (!$caller) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Authentication required.']);
            exit;
        }
        $callerId = (int) ($caller['id'] ?? 0);
        $rawIds = $jsonBody['notif_ids'] ?? $_POST['notif_ids'] ?? [];
        if (is_string($rawIds)) {
            $decoded = json_decode($rawIds, true);
            $rawIds = is_array($decoded) ? $decoded : explode(',', $rawIds);
        }
        $cleanIds = [];
        if (is_array($rawIds)) {
            foreach ($rawIds as $nid) {
                $nidStr = trim((string) $nid);
                if ($nidStr !== '' && strlen($nidStr) <= 160) {
                    $cleanIds[] = $nidStr;
                }
                if (count($cleanIds) >= 200) {
                    break;
                }
            }
        }
        $cleanIds = array_values(array_unique($cleanIds));
        if (!empty($cleanIds) && $callerId > 0) {
            $insStmt = $pdo->prepare("INSERT IGNORE INTO `user_notification_reads` (`user_id`, `notif_id`) VALUES (?, ?)");
            foreach ($cleanIds as $cid) {
                $insStmt->execute([$callerId, $cid]);
            }
        }
        $readStmt = $pdo->prepare("SELECT `notif_id` FROM `user_notification_reads` WHERE `user_id` = ? ORDER BY `read_at` DESC LIMIT 500");
        $readStmt->execute([$callerId]);
        $savedIds = array_values(array_filter(array_map('strval', $readStmt->fetchAll(PDO::FETCH_COLUMN))));
        echo json_encode([
            'ok' => true,
            'read_notif_ids' => $savedIds,
        ]);
        exit;
    }

    if ($action === 'request_controller_shift') {
        $caller = getCallerUser($pdo);
        if (!$caller) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Authentication required.']);
            exit;
        }
        $callerRole = strtolower(trim((string) ($caller['role'] ?? '')));
        if (!in_array($callerRole, ['admin', 'manager', 'administrator', 'stock_manager', 'tech_lead', 'stock_controller'], true)) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'Permission denied: Submitting gate controller relief requests requires Gate Controller, Technical Lead, Site Manager, or Administrator access.']);
            exit;
        }

        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'stock_warehouse'));
        $cpIdRaw = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? ''));
        $lookup = loadCheckpointsLookup($pdo);
        $cpMeta = findCheckpointRecord($lookup['stock_warehouses'], $lookup['event_venues'], $cpType, $cpIdRaw);
        if (!$cpMeta) {
            echo json_encode(['ok' => false, 'error' => 'Please select a valid target terminal/checkpoint.']);
            exit;
        }

        $repId = (int) ($_POST['replacement_controller_id'] ?? $jsonBody['replacement_controller_id'] ?? 0);
        if ($repId <= 0 && $callerRole === 'stock_controller') {
            $repId = (int) $caller['id'];
        }
        if ($repId <= 0) {
            echo json_encode(['ok' => false, 'error' => 'Please select a Gate Controller for this assignment/relief request.']);
            exit;
        }

        $repStmt = $pdo->prepare("SELECT `id`, `full_name`, `role` FROM `users` WHERE `id` = ? LIMIT 1");
        $repStmt->execute([$repId]);
        $repUser = $repStmt->fetch();
        $repRole = strtolower(trim((string) ($repUser['role'] ?? '')));
        $eligibleShiftRoles = ['stock_controller', 'stock_manager', 'tech_lead', 'support_staff', 'admin', 'administrator', 'manager'];
        if (!$repUser || !in_array($repRole, $eligibleShiftRoles, true)) {
            echo json_encode(['ok' => false, 'error' => 'Selected personnel must be an eligible Gate Controller, Site Manager, Technical Lead, or Operations Support member.']);
            exit;
        }

        $outIdRaw = (int) ($_POST['outgoing_controller_id'] ?? $jsonBody['outgoing_controller_id'] ?? 0);
        $outId = $outIdRaw > 0 ? $outIdRaw : null;
        if ($outId === null) {
            $curHolder = $pdo->prepare("SELECT `id` FROM `users` WHERE `assigned_checkpoint_type` = ? AND (`assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ?) AND `id` != ? ORDER BY (`role` = 'stock_controller') DESC, `id` ASC LIMIT 1");
            $curHolder->execute([$cpMeta['type'], (string) $cpMeta['id'], (string) $cpMeta['raw_id'], $repId]);
            $foundHolder = $curHolder->fetchColumn();
            if ($foundHolder) {
                $outId = (int) $foundHolder;
            }
        }

        $reasonType = strtolower(trim((string) ($_POST['reason_type'] ?? $jsonBody['reason_type'] ?? 'shift_swap')));
        $allowedReasons = ['sick_leave', 'shift_swap', 'high_volume', 'night_shift', 'new_assignment'];
        if (!in_array($reasonType, $allowedReasons, true)) {
            $reasonType = 'shift_swap';
        }
        $notes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? ''));
        $shiftStartRaw = trim((string) ($_POST['shift_start'] ?? $jsonBody['shift_start'] ?? ''));
        $shiftEndRaw = trim((string) ($_POST['shift_end'] ?? $jsonBody['shift_end'] ?? ''));
        $shiftStart = $shiftStartRaw !== '' ? date('Y-m-d H:i:s', strtotime($shiftStartRaw)) : null;
        $shiftEnd = $shiftEndRaw !== '' ? date('Y-m-d H:i:s', strtotime($shiftEndRaw)) : null;

        $ins = $pdo->prepare("
            INSERT INTO `controller_shift_requests`
            (`checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `requested_by_id`, `outgoing_controller_id`, `replacement_controller_id`, `reason_type`, `notes`, `shift_start`, `shift_end`, `status`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $ins->execute([
            $cpMeta['type'],
            (string) $cpMeta['id'],
            $cpMeta['name'],
            (int) $caller['id'],
            $outId,
            $repId,
            $reasonType,
            $notes,
            $shiftStart,
            $shiftEnd,
        ]);
        $reqId = (int) $pdo->lastInsertId();

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode(array_merge($full, [
            'ok' => true,
            'request_id' => $reqId,
            'message' => "Shift relief request #{$reqId} submitted for {$cpMeta['name']}. Pending Administrator or Site Manager approval.",
        ]));
        exit;
    }

    if ($action === 'review_controller_shift') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('review_controller_shift', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $requestId = (int) ($_POST['request_id'] ?? $jsonBody['request_id'] ?? 0);
        $decision = strtolower(trim((string) ($_POST['decision'] ?? $jsonBody['decision'] ?? '')));
        if ($decision === 'approve') $decision = 'approved';
        if ($decision === 'reject') $decision = 'rejected';
        $reviewNotes = trim((string) ($_POST['review_notes'] ?? $jsonBody['review_notes'] ?? ''));

        if ($requestId <= 0 || !in_array($decision, ['approved', 'rejected'], true)) {
            echo json_encode(['ok' => false, 'error' => 'Invalid request ID or decision.']);
            exit;
        }

        $reqStmt = $pdo->prepare("SELECT * FROM `controller_shift_requests` WHERE `id` = ? LIMIT 1");
        $reqStmt->execute([$requestId]);
        $sr = $reqStmt->fetch();
        if (!$sr) {
            echo json_encode(['ok' => false, 'error' => 'Shift relief request not found.']);
            exit;
        }
        if (strtolower((string) ($sr['status'] ?? '')) !== 'pending') {
            echo json_encode(['ok' => false, 'error' => 'This request has already been processed.']);
            exit;
        }

        $upd = $pdo->prepare("
            UPDATE `controller_shift_requests`
            SET `status` = ?, `reviewed_by_id` = ?, `reviewed_at` = NOW(), `review_notes` = ?
            WHERE `id` = ?
        ");
        $upd->execute([$decision, (int) $caller['id'], $reviewNotes, $requestId]);

        if ($decision === 'approved') {
            $repId = (int) ($sr['replacement_controller_id'] ?? 0);
            $outId = (int) ($sr['outgoing_controller_id'] ?? 0);
            $cpType = (string) ($sr['checkpoint_type'] ?? 'stock_warehouse');
            $cpId = (string) ($sr['checkpoint_id'] ?? '');
            $expiresAt = !empty($sr['shift_end']) ? $sr['shift_end'] : null;

            if ($repId > 0) {
                $pdo->prepare("
                    UPDATE `users`
                    SET `assigned_checkpoint_type` = ?, `assigned_checkpoint_id` = ?, `assignment_expires_at` = ?
                    WHERE `id` = ?
                ")->execute([$cpType, $cpId, $expiresAt, $repId]);

                if ($cpType === 'stock_warehouse' && ctype_digit($cpId)) {
                    try {
                        $repNameStmt = $pdo->prepare("SELECT `full_name` FROM `users` WHERE `id` = ? LIMIT 1");
                        $repNameStmt->execute([$repId]);
                        $repFullName = trim((string) ($repNameStmt->fetchColumn() ?: ''));
                        if ($repFullName !== '') {
                            $pdo->prepare("UPDATE `stock_locations` SET `controller_name` = ? WHERE `id` = ?")
                                ->execute([$repFullName, (int) $cpId]);
                        }
                    } catch (Throwable $e) {}
                }
            }

            if ($outId > 0 && $outId !== $repId && in_array((string) ($sr['reason_type'] ?? ''), ['sick_leave', 'shift_swap'], true)) {
                $pdo->prepare("
                    UPDATE `users`
                    SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL, `assignment_expires_at` = NULL
                    WHERE `id` = ? AND `assigned_checkpoint_type` = ? AND `assigned_checkpoint_id` = ?
                ")->execute([$outId, $cpType, $cpId]);
            }
        }

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $verb = $decision === 'approved' ? 'Approved' : 'Rejected';
        echo json_encode(array_merge($full, [
            'ok' => true,
            'message' => "{$verb} shift relief request #{$requestId} for {$sr['checkpoint_name']}.",
        ]));
        exit;
    }

    if ($action === 'attendance_report') {
        $range = strtolower(trim((string) ($_GET['range'] ?? $_POST['range'] ?? $jsonBody['range'] ?? 'today')));
        $dateFromIn = trim((string) ($_GET['date_from'] ?? $_POST['date_from'] ?? $jsonBody['date_from'] ?? ''));
        $dateToIn = trim((string) ($_GET['date_to'] ?? $_POST['date_to'] ?? $jsonBody['date_to'] ?? ''));
        $filterCpType = trim((string) ($_GET['checkpoint_type'] ?? $_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'all'));
        $filterCpIdRaw = trim((string) ($_GET['checkpoint_id'] ?? $_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? ''));

        $caller = getCallerUser($pdo);
        $callerRole = strtolower(trim((string) ($caller['role'] ?? '')));
        $lookup = loadCheckpointsLookup($pdo);

        $scopedCpType = ($filterCpType !== '' && $filterCpType !== 'all') ? $filterCpType : 'all';
        $scopedCpId = ($filterCpIdRaw !== '' && $filterCpIdRaw !== '0' && $filterCpIdRaw !== 'all') ? (int) $filterCpIdRaw : 0;

        if ($callerRole === 'stock_controller') {
            $assignedType = trim((string) ($caller['assigned_checkpoint_type'] ?? ''));
            $assignedId = trim((string) ($caller['assigned_checkpoint_id'] ?? ''));
            if ($assignedType === '' || $assignedId === '') {
                http_response_code(403);
                echo json_encode([
                    'ok' => false,
                    'error' => 'Terminal unassigned: Gate Controller must be assigned to a checkpoint to view attendance reports.',
                ]);
                exit;
            }
            $assignedCp = findCheckpointRecord($lookup['stock_warehouses'], $lookup['event_venues'], $assignedType, $assignedId);
            $resolvedAssignedId = $assignedCp ? (int) $assignedCp['id'] : (int) $assignedId;
            if ($scopedCpType !== 'all' || $scopedCpId > 0) {
                $targetCheckType = $scopedCpType !== 'all' ? $scopedCpType : $assignedType;
                $targetCheckId = $scopedCpId > 0 ? (string) $scopedCpId : (string) $resolvedAssignedId;
                $lockCheck = assertControllerCheckpointLock($pdo, $targetCheckType, $targetCheckId);
                if (!$lockCheck['ok']) {
                    http_response_code(403);
                    echo json_encode(['ok' => false, 'error' => $lockCheck['error']]);
                    exit;
                }
            }
            $scopedCpType = $assignedType;
            $scopedCpId = $resolvedAssignedId;
        }

        $todayStr = date('Y-m-d');
        $nowHour = (int) date('G');
        $isNightFilter = false;

        if ($range === 'night_shift') {
            $isNightFilter = true;
            if ($dateFromIn !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFromIn)) {
                $startDate = $dateFromIn;
                $endDate = date('Y-m-d', strtotime($startDate . ' +1 day'));
            } elseif ($nowHour < 14) {
                $startDate = date('Y-m-d', strtotime('-1 day'));
                $endDate = $todayStr;
            } else {
                $startDate = $todayStr;
                $endDate = date('Y-m-d', strtotime('+1 day'));
            }
            $fromDt = $startDate . ' 18:00:00';
            $toDt = $endDate . ' 09:00:00';
            $windowLabel = 'Night Shift (' . date('M j', strtotime($startDate)) . ' 18:00 → ' . date('M j', strtotime($endDate)) . ' 09:00)';
        } elseif ($range === '7d') {
            $startDate = date('Y-m-d', strtotime('-6 days'));
            $endDate = $todayStr;
            $fromDt = $startDate . ' 00:00:00';
            $toDt = $endDate . ' 23:59:59';
            $windowLabel = 'Last 7 Days (' . date('M j', strtotime($startDate)) . ' – ' . date('M j, Y', strtotime($endDate)) . ')';
        } elseif ($range === 'custom' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFromIn)) {
            $startDate = $dateFromIn;
            $endDate = (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateToIn) && $dateToIn >= $startDate) ? $dateToIn : $startDate;
            $fromDt = $startDate . ' 00:00:00';
            $toDt = $endDate . ' 23:59:59';
            $windowLabel = $startDate === $endDate
                ? date('M j, Y', strtotime($startDate))
                : (date('M j', strtotime($startDate)) . ' – ' . date('M j, Y', strtotime($endDate)));
        } else {
            $range = 'today';
            $startDate = $todayStr;
            $endDate = $todayStr;
            $fromDt = $todayStr . ' 00:00:00';
            $toDt = $todayStr . ' 23:59:59';
            $windowLabel = 'Today (' . date('M j, Y') . ')';
        }

        $where = ["al.`scanned_at` >= ?", "al.`scanned_at` <= ?"];
        $params = [$fromDt, $toDt];
        if ($scopedCpType !== 'all') {
            $where[] = "al.`checkpoint_type` = ?";
            $params[] = $scopedCpType;
        }
        if ($scopedCpId > 0) {
            $where[] = "al.`checkpoint_id` = ?";
            $params[] = $scopedCpId;
        }

        $rptSql = "
            SELECT
                al.`id`,
                al.`user_id`,
                al.`badge_code`,
                al.`checkpoint_type`,
                al.`checkpoint_id`,
                al.`checkpoint_name`,
                al.`scan_action`,
                al.`access_status`,
                al.`denial_reason`,
                al.`punctuality_status`,
                al.`notes`,
                al.`scanned_at`,
                u.`full_name`,
                u.`username`,
                u.`role`,
                u.`department`
            FROM `attendance_logs` al
            LEFT JOIN `users` u ON u.`id` = al.`user_id`
            WHERE " . implode(' AND ', $where) . "
            ORDER BY al.`scanned_at` ASC, al.`id` ASC
            LIMIT 1000
        ";
        $rptStmt = $pdo->prepare($rptSql);
        $rptStmt->execute($params);
        $rawLogs = $rptStmt->fetchAll(PDO::FETCH_ASSOC);

        // Pair check_in -> check_out durations chronologically per staff member
        $openCheckins = [];
        $uniqueStaff = [];
        $totalCheckIns = 0;
        $totalCheckOuts = 0;
        $lateCount = 0;
        $deniedCount = 0;
        $totalClosedMinutes = 0;
        $enrichedRows = [];

        foreach ($rawLogs as $r) {
            $uid = (int) ($r['user_id'] ?? 0);
            $actionType = (string) ($r['scan_action'] ?? 'check_in');
            $accessSt = (string) ($r['access_status'] ?? 'granted');
            $punctSt = strtolower((string) ($r['punctuality_status'] ?? 'on_time'));
            $scanTs = strtotime((string) $r['scanned_at']) ?: time();
            $scanHour = (int) date('G', $scanTs);
            $cpNameRow = (string) ($r['checkpoint_name'] ?? 'Gate Checkpoint');
            $durationMinutes = null;
            $durationLabel = '—';
            $isOvernightLog = ($scanHour >= 18 || $scanHour < 8);

            if ($uid > 0) {
                $uniqueStaff[$uid] = true;
            }

            if ($accessSt === 'denied') {
                $deniedCount++;
            } elseif ($actionType === 'check_in') {
                $totalCheckIns++;
                if ($punctSt === 'late') {
                    $lateCount++;
                }
                $openCheckins[$uid] = [
                    'ts' => $scanTs,
                    'hour' => $scanHour,
                    'date' => date('Y-m-d', $scanTs),
                    'checkpoint' => $cpNameRow,
                ];
            } elseif ($actionType === 'check_out') {
                $totalCheckOuts++;
                if (isset($openCheckins[$uid])) {
                    $inInfo = $openCheckins[$uid];
                    $mins = max(1, (int) round(($scanTs - $inInfo['ts']) / 60));
                    $durationMinutes = $mins;
                    $hrs = intdiv($mins, 60);
                    $rem = $mins % 60;
                    $durationLabel = $hrs > 0 ? "{$hrs}h {$rem}m" : "{$rem}m";
                    $totalClosedMinutes += $mins;
                    if ($inInfo['hour'] >= 18 || $inInfo['hour'] < 6 || $inInfo['date'] !== date('Y-m-d', $scanTs)) {
                        $isOvernightLog = true;
                    }
                    unset($openCheckins[$uid]);
                }
            }

            $enrichedRows[] = [
                'id' => (int) $r['id'],
                'user_id' => $uid,
                'full_name' => trim((string) ($r['full_name'] ?: $r['username'] ?: 'Staff #' . $uid)),
                'role' => formatRoleDisplay((string) ($r['role'] ?? 'technician')),
                'department' => (string) ($r['department'] ?? 'Operations'),
                'badge_code' => formatRewBadgeCode($uid, $r['badge_code'] ?? null),
                'checkpoint_type' => (string) ($r['checkpoint_type'] ?? 'event_venue'),
                'checkpoint_id' => (int) ($r['checkpoint_id'] ?? 1),
                'checkpoint_name' => $cpNameRow,
                'scan_action' => $actionType,
                'access_status' => $accessSt,
                'denial_reason' => $r['denial_reason'] ?? null,
                'punctuality_status' => $punctSt,
                'notes' => (string) ($r['notes'] ?? ''),
                'scanned_at' => (string) $r['scanned_at'],
                'scanned_date' => date('Y-m-d', $scanTs),
                'scanned_time' => date('h:i:s A', $scanTs),
                'duration_minutes' => $durationMinutes,
                'duration_label' => $durationLabel,
                'is_night_shift' => $isOvernightLog,
            ];
        }

        // Reverse for newest-first display in timeline/report views
        $enrichedRows = array_reverse($enrichedRows);

        echo json_encode([
            'ok' => true,
            'range' => $range,
            'is_night_shift_filter' => $isNightFilter,
            'window_label' => $windowLabel,
            'date_from' => $startDate,
            'date_to' => $endDate,
            'checkpoint_type' => $scopedCpType,
            'checkpoint_id' => $scopedCpId,
            'summary' => [
                'total_scans' => count($enrichedRows),
                'total_check_ins' => $totalCheckIns,
                'total_check_outs' => $totalCheckOuts,
                'active_open_shifts' => count($openCheckins),
                'late_count' => $lateCount,
                'denied_count' => $deniedCount,
                'unique_staff_count' => count($uniqueStaff),
                'total_hours_worked' => round($totalClosedMinutes / 60, 1),
            ],
            'rows' => $enrichedRows,
        ]);
        exit;
    }

    echo json_encode(buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId));
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ]);
}
