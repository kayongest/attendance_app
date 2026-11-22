<?php
/**
 * aBility Manager (id_badges.php#pane-kiosk) — Gate Terminal & Access Matrix API
 * Powers the 4-Tier Access Matrix (L1-L4), Dual Checkpoint Selector (Stock Warehouse vs Event Venue),
 * Paired Check-In / Check-Out State Machine, Shift Relief Coordination, and User Activity Timeline.
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

// resolveProfileImageUrl() and computeInitials() are provided by db.php

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
                ['project_manager', 'Project Manager', 'Project Manager', 'L4_ALL_ACCESS', 'Executive', 'End-to-end event orchestration, client liaison, call times, and department dispatch approvals.', 1],
                ['event_coordinator', 'Event Coordinator', 'Event Coordinator', 'L4_ALL_ACCESS', 'Production', 'Coordinates event schedules, Technical Lead assignments, and cross-department crew readiness.', 1],
                ['stock_manager', 'Stock Logistics Manager', 'Stock Logistics Manager', 'L4_ALL_ACCESS', 'Warehouse', 'Oversees warehouse hubs, inventory movement, and logistics personnel onboarding.', 1],
                ['stock_controller', 'Stock Controller', 'Stock Controller', 'L3_STOCK_WAREHOUSE', 'Warehouse', 'Gate terminal scanning (#pane-kiosk), facility gate custody, and shift relief coordination.', 1],
                ['tech_lead', 'Technical Lead', 'Technical Lead', 'L4_ALL_ACCESS', 'Production', 'Supervises Video, Sound, Lighting, Electrical, Rigging, and Interpretation operations.', 1],
                ['technician', 'Stage & Audio Technician', 'Stage & Audio Technician', 'L2_TECH_STAGE', 'Sound', 'Configures FOH audio arrays, monitor consoles, and mic systems on stage and FOH.', 1],
                ['sound_engineer', 'Lead Sound Engineer', 'Lead Sound Engineer', 'L2_TECH_STAGE', 'Sound', 'Lead acoustic calibration and sound engineering for live events and concert tours.', 0],
                ['lighting_tech', 'Lighting Technician', 'Lighting Technician', 'L2_TECH_STAGE', 'Lighting', 'DMX universes routing, moving-head fixtures, dimmer racks and stage wash fixtures.', 0],
                ['video_director', 'Video Director', 'Video Director', 'L2_TECH_STAGE', 'Video', 'Controls LED video walls, SDI fiber transmission, switchers, and live camera chains.', 0],
                ['electrical_tech', 'Electrical Technician', 'Electrical Technician', 'L2_TECH_STAGE', 'Electrical', 'Manages 3-phase distros, generator sync, power load balancing, and stage electrical safety.', 0],
                ['interpretation_tech', 'Interpretation Technician', 'Interpretation Technician', 'L2_TECH_STAGE', 'Interpretation', 'Sets up Bosch/IR interpretation booths, delegate receivers, and multilingual audio routing.', 0],
                ['stage_manager', 'Stage Manager', 'Stage Manager', 'L2_TECH_STAGE', 'Production', 'Directs stage crew, backstage call-time coordination, and cueing.', 0],
                ['rigging_lead', 'Rigging Lead', 'Rigging Lead', 'L2_TECH_STAGE', 'Rigging', 'Motors, truss rigging, load calculations and safety cable inspections overhead.', 0],
                ['support_staff', 'Support Staff', 'Support Staff', 'L1_VENUE_BASIC', 'Support Staff', 'Site runners, hospitality loaders, cable assistants, and rapid venue turnaround support.', 0],
                ['user', 'Venue Crew', 'Venue Crew', 'L1_VENUE_BASIC', 'Production', 'General event venue operations and support staff. Stock warehouse access restricted.', 0],
                ['security', 'Security Officer', 'Security Officer', 'L1_VENUE_BASIC', 'Security', 'Front of house and gate security perimeter verification.', 0],
                ['driver', 'Logistics Driver', 'Logistics Driver', 'L1_VENUE_BASIC', 'Logistics', 'Cross-facility crew shuttle, loading bay check-in, and transit logistics.', 0],
            ];
            $ins = $pdo->prepare("INSERT INTO `roles` (`role_key`, `role_name`, `title`, `clearance_level`, `department`, `description`, `is_system`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
            foreach ($seedRoles as $sr) {
                $ins->execute($sr);
            }
        } else {
            // Backfill required workflow & operational hierarchy roles on already-populated DBs
            $requiredRoles = [
                ['stock_manager', 'Stock Logistics Manager', 'Stock Logistics Manager', 'L4_ALL_ACCESS', 'Warehouse', 'Oversees warehouse hubs, inventory movement, and logistics personnel onboarding.', 1],
                ['project_manager', 'Project Manager', 'Project Manager', 'L4_ALL_ACCESS', 'Executive', 'End-to-end event orchestration, client liaison, call times, and department dispatch approvals.', 1],
                ['event_coordinator', 'Event Coordinator', 'Event Coordinator', 'L4_ALL_ACCESS', 'Production', 'Coordinates event schedules, Technical Lead assignments, and cross-department crew readiness.', 1],
                ['electrical_tech', 'Electrical Technician', 'Electrical Technician', 'L2_TECH_STAGE', 'Electrical', 'Manages 3-phase distros, generator sync, power load balancing, and stage electrical safety.', 0],
                ['interpretation_tech', 'Interpretation Technician', 'Interpretation Technician', 'L2_TECH_STAGE', 'Interpretation', 'Sets up Bosch/IR interpretation booths, delegate receivers, and multilingual audio routing.', 0],
                ['support_staff', 'Support Staff', 'Support Staff', 'L1_VENUE_BASIC', 'Support Staff', 'Site runners, hospitality loaders, cable assistants, and rapid venue turnaround support.', 0],
            ];
            $chkStmt = $pdo->prepare("SELECT COUNT(*) FROM `roles` WHERE `role_key` = ?");
            $insStmt = $pdo->prepare("INSERT INTO `roles` (`role_key`, `role_name`, `title`, `clearance_level`, `department`, `description`, `is_system`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
            foreach ($requiredRoles as $req) {
                try {
                    $chkStmt->execute([$req[0]]);
                    if ((int) $chkStmt->fetchColumn() === 0) {
                        $insStmt->execute($req);
                    }
                } catch (Throwable $e) {}
            }
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
            ['id' => 2, 'role_key' => 'stock_controller', 'title' => 'Stock Controller', 'clearance_level' => 'L3_STOCK_WAREHOUSE', 'department' => 'Warehouse', 'description' => 'Gate terminal scanning (#pane-kiosk), facility gate custody, and shift relief coordination.', 'is_system' => 1, 'is_active' => 1],
            ['id' => 3, 'role_key' => 'tech_lead', 'title' => 'Technical Lead', 'clearance_level' => 'L4_ALL_ACCESS', 'department' => 'Production', 'description' => 'Supervises audio, video, lighting and rigging operations across all checkpoints.', 'is_system' => 1, 'is_active' => 1],
            ['id' => 4, 'role_key' => 'technician', 'title' => 'Stage & Audio Technician', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Audio', 'description' => 'Configures FOH audio arrays, monitor consoles, and mic systems on stage and FOH.', 'is_system' => 1, 'is_active' => 1],
            ['id' => 5, 'role_key' => 'sound_engineer', 'title' => 'Lead Sound Engineer', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Audio', 'description' => 'Lead acoustic calibration and sound engineering for live events and concert tours.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 6, 'role_key' => 'lighting_tech', 'title' => 'Lighting Technician', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Lighting', 'description' => 'DMX universes routing, moving-head fixtures, dimmer racks and stage wash fixtures.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 7, 'role_key' => 'video_director', 'title' => 'Video Director', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Video', 'description' => 'Controls LED video walls, SDI fiber transmission, switchers, and live camera chains.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 8, 'role_key' => 'stage_manager', 'title' => 'Stage Manager', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Production', 'description' => 'Directs stage crew, backstage call-time coordination, and cueing.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 9, 'role_key' => 'rigging_lead', 'title' => 'Rigging Lead', 'clearance_level' => 'L2_TECH_STAGE', 'department' => 'Rigging', 'description' => 'Motors, truss rigging, load calculations and safety cable inspections overhead.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 10, 'role_key' => 'user', 'title' => 'Venue Crew', 'clearance_level' => 'L1_VENUE_BASIC', 'department' => 'Production', 'description' => 'General event venue operations and support staff. Stock warehouse access restricted.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 11, 'role_key' => 'security', 'title' => 'Security Officer', 'clearance_level' => 'L1_VENUE_BASIC', 'department' => 'Security', 'description' => 'Front of house and gate security perimeter verification.', 'is_system' => 0, 'is_active' => 1],
            ['id' => 12, 'role_key' => 'driver', 'title' => 'Logistics Driver', 'clearance_level' => 'L1_VENUE_BASIC', 'department' => 'Logistics', 'description' => 'Cross-facility crew shuttle, loading bay check-in, and transit logistics.', 'is_system' => 0, 'is_active' => 1],
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
    ensureDepartmentsTable($pdo);
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
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager',
            'sort_order' => 1,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'events',
            'label' => 'Checkpoints & Venues',
            'nav_target' => 'events',
            'dom_id' => '',
            'node_id' => '2:3288',
            'icon' => 'assets/nav-events-inactive.svg',
            'active_icon' => 'assets/nav-events-active.svg',
            'icon_id' => 'nav-icon-events',
            'badge_type' => 'events',
            'badge_id' => 'sidebar-events-count',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager,stock_controller',
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
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator',
            'sort_order' => 3,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_key' => 'attendees',
            'label' => 'Staff ID Badges',
            'nav_target' => 'attendees',
            'dom_id' => '',
            'node_id' => '2:3292',
            'icon' => 'assets/nav-attendees-inactive.svg',
            'active_icon' => 'assets/nav-attendees-active.svg',
            'icon_id' => 'nav-icon-attendees',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,stock_manager,stock_controller,technician,sound_engineer,lighting_tech,video_director,electrical_tech,interpretation_tech,stage_manager,rigging_lead,support_staff,user,security,driver',
            'sort_order' => 4,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'main',
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
            'nav_group' => 'main',
            'nav_key' => 'create_event',
            'label' => 'Create Event',
            'nav_target' => 'create-event',
            'dom_id' => 'nav-create-event-btn',
            'node_id' => '',
            'icon' => 'assets/calendar-days-15.svg',
            'active_icon' => 'assets/nav-events-active.svg',
            'icon_id' => 'nav-icon-create-event',
            'badge_type' => 'events',
            'badge_id' => 'sidebar-create-event-count',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead',
            'sort_order' => 6,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'main',
            'nav_key' => 'dispatch_flow',
            'label' => 'Operational Command & Department Dispatch Flow',
            'nav_target' => 'dispatch-flow',
            'dom_id' => 'nav-dispatch-flow-btn',
            'node_id' => '',
            'icon' => 'assets/send-15.svg',
            'active_icon' => 'assets/nav-analytics-active.svg',
            'icon_id' => 'nav-icon-dispatch-flow',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'all',
            'sort_order' => 7,
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
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,stock_manager,stock_controller',
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
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager',
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
            'allowed_roles' => 'all',
            'sort_order' => 3,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'standalone_portals',
            'label' => 'Gates & On-Site',
            'nav_target' => 'standalone-portals',
            'dom_id' => 'sidebar-onsite-share-btn',
            'node_id' => '',
            'icon' => 'assets/scan-line-13.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'standalone_portals',
            'badge_id' => 'sidebar-portals-count',
            'badge_text' => '04',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,stock_manager,tech_lead,technical_lead,stock_controller',
            'sort_order' => 4,
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
            'sort_order' => 5,
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
            'sort_order' => 6,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'system_settings',
            'label' => 'Settings & Flow',
            'nav_target' => 'settings',
            'dom_id' => 'sidebar-settings-btn',
            'node_id' => '',
            'icon' => 'assets/sliders-horizontal-13.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager,stock_controller',
            'sort_order' => 7,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_flow',
            'label' => 'Flow',
            'nav_target' => 'settings:flow',
            'dom_id' => 'sidebar-settings-sub-flow',
            'node_id' => '',
            'icon' => 'assets/sliders-horizontal-13.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager,stock_controller',
            'sort_order' => 8,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_relief',
            'label' => 'Relief & Geo-QR',
            'nav_target' => 'settings:relief',
            'dom_id' => 'sidebar-settings-sub-relief',
            'node_id' => '',
            'icon' => 'assets/refresh-cw.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager,stock_controller',
            'sort_order' => 9,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_dispatch',
            'label' => 'Dispatch Hierarchy',
            'nav_target' => 'settings:dispatch',
            'dom_id' => 'sidebar-settings-sub-dispatch',
            'node_id' => '',
            'icon' => 'assets/map-grid.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager',
            'sort_order' => 10,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_links',
            'label' => 'Shared Links',
            'nav_target' => 'settings:links',
            'dom_id' => 'sidebar-settings-sub-links',
            'node_id' => '',
            'icon' => 'assets/key-round-13.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,stock_manager',
            'sort_order' => 11,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_branding',
            'label' => 'Branding & Mode',
            'nav_target' => 'settings:branding',
            'dom_id' => 'sidebar-settings-sub-branding',
            'node_id' => '',
            'icon' => 'assets/sparkles.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator',
            'sort_order' => 12,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_accounts',
            'label' => 'Accounts & Offline',
            'nav_target' => 'settings:accounts',
            'dom_id' => 'sidebar-settings-sub-accounts',
            'node_id' => '',
            'icon' => 'assets/shield-lock.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,stock_manager',
            'sort_order' => 13,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_pwa',
            'label' => 'PWA (Android & iOS)',
            'nav_target' => 'settings:pwa',
            'dom_id' => 'sidebar-settings-sub-pwa',
            'node_id' => '',
            'icon' => 'assets/globe-12.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager,stock_controller',
            'sort_order' => 14,
            'is_enabled' => 1,
            'is_system' => 1,
        ],
        [
            'nav_group' => 'workspace',
            'nav_key' => 'settings_controls',
            'label' => 'Config Shortcuts',
            'nav_target' => 'settings:controls',
            'dom_id' => 'sidebar-settings-sub-controls',
            'node_id' => '',
            'icon' => 'assets/nav-settings.svg',
            'active_icon' => '',
            'icon_id' => '',
            'badge_type' => 'none',
            'badge_id' => '',
            'badge_text' => '',
            'allowed_roles' => 'admin,administrator',
            'sort_order' => 15,
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

        // One-time migration: enable read-only On-Site Roll-Call access for technicians and field crew
        $migChk = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_onsite_tech_v1' LIMIT 1");
        $migChk->execute();
        if (!$migChk->fetchColumn()) {
            $pdo->prepare("UPDATE `navigation_items` SET `allowed_roles` = 'all' WHERE `nav_key` = 'onsite_rollcall' AND `is_system` = 1")->execute();
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_onsite_tech_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: add Admin "Share On-Site Link" item to Checkpoint Controls sidebar
        $migShare = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_share_onsite_v1' LIMIT 1");
        $migShare->execute();
        if (!$migShare->fetchColumn()) {
            $pdo->prepare("
                INSERT IGNORE INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES ('workspace', 'share_onsite_link', 'Share On-Site Link', 'action:onsite-share', 'sidebar-onsite-share-btn', '', 'assets/key-round-13.svg', '', '', 'none', '', '', 'admin,administrator', 6, 1, 1)
            ")->execute();
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_share_onsite_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: add Ndera Warehouse, BK Arena, and KCC standalone gate links to Checkpoint Controls sidebar
        $migGates = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_standalone_gates_v1' LIMIT 1");
        $migGates->execute();
        if (!$migGates->fetchColumn()) {
            $gateRoles = 'admin,administrator,manager,project_manager,stock_manager,tech_lead,technical_lead,stock_controller';
            $gateIns = $pdo->prepare("
                INSERT IGNORE INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES ('workspace', ?, ?, ?, ?, '', 'assets/scan-line-13.svg', '', '', 'none', '', '', ?, ?, 1, 1)
            ");
            foreach ([
                ['gate_ndera', 'Ndera Warehouse Gate', 'ndera-gate.php', 'sidebar-gate-ndera-btn', $gateRoles, 7],
                ['gate_bk_arena', 'BK Arena Gate', 'bk-arena-gate.php', 'sidebar-gate-bk-arena-btn', $gateRoles, 8],
                ['gate_kcc', 'KCC Gate', 'kcc-gate.php', 'sidebar-gate-kcc-btn', $gateRoles, 9],
            ] as $gateRow) {
                $gateIns->execute($gateRow);
            }
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_standalone_gates_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: consolidate 3 standalone gates + onsite.php share link into ONE sidebar nav-item
        $migUnified = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_unified_portals_v1' LIMIT 1");
        $migUnified->execute();
        if (!$migUnified->fetchColumn()) {
            $pdo->prepare("DELETE FROM `navigation_items` WHERE `is_system` = 1 AND `nav_key` IN ('gate_ndera', 'gate_bk_arena', 'gate_kcc')")->execute();
            $unifiedRoles = 'admin,administrator,manager,project_manager,stock_manager,tech_lead,technical_lead,stock_controller';
            $upStmtUnified = $pdo->prepare("
                UPDATE `navigation_items`
                SET `nav_key` = 'standalone_portals',
                    `label` = 'Gates & On-Site',
                    `nav_target` = 'action:onsite-share',
                    `dom_id` = 'sidebar-onsite-share-btn',
                    `icon` = 'assets/scan-line-13.svg',
                    `badge_type` = 'custom',
                    `badge_text` = '04',
                    `allowed_roles` = ?
                WHERE `nav_key` = 'share_onsite_link'
            ");
            $upStmtUnified->execute([$unifiedRoles]);
            $pdo->prepare("
                INSERT IGNORE INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES ('workspace', 'standalone_portals', 'Gates & On-Site', 'action:onsite-share', 'sidebar-onsite-share-btn', '', 'assets/scan-line-13.svg', '', '', 'custom', '', '04', ?, 6, 1, 1)
            ")->execute([$unifiedRoles]);
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_unified_portals_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: route Gates & On-Site sidebar nav-item to dedicated standalone-portals page
        $migPortalsPage = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_portals_page_v2' LIMIT 1");
        $migPortalsPage->execute();
        if (!$migPortalsPage->fetchColumn()) {
            $pdo->prepare("
                UPDATE `navigation_items`
                SET `nav_target` = 'standalone-portals',
                    `badge_type` = 'standalone_portals',
                    `badge_id` = 'sidebar-portals-count'
                WHERE `nav_key` IN ('standalone_portals', 'share_onsite_link')
            ")->execute();
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_portals_page_v2', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: consolidate sidebar to 5 Main Nav items + 6 Checkpoint Controls
        $migConsolidated = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_consolidated_v3' LIMIT 1");
        $migConsolidated->execute();
        if (!$migConsolidated->fetchColumn()) {
            $pdo->prepare("
                DELETE FROM `navigation_items`
                WHERE `is_system` = 1
                  AND `nav_key` IN ('venue_security', 'stock-manager', 'access_matrix')
            ")->execute();

            $pdo->prepare("
                UPDATE `navigation_items`
                SET `label` = 'Checkpoints & Venues',
                    `nav_group` = 'main',
                    `sort_order` = 2,
                    `allowed_roles` = 'admin,administrator,manager,project_manager,stock_manager,stock_controller'
                WHERE `is_system` = 1 AND `nav_key` = 'events'
            ")->execute();

            $pdo->prepare("
                UPDATE `navigation_items`
                SET `label` = 'Staff ID Badges',
                    `nav_group` = 'main',
                    `sort_order` = 4
                WHERE `is_system` = 1 AND `nav_key` = 'attendees'
            ")->execute();

            $wsReorder = [
                'shift_relief' => 1,
                'set_calltime' => 2,
                'onsite_rollcall' => 3,
                'standalone_portals' => 4,
                'station_lock' => 5,
                'reset_today_scans' => 6,
            ];
            $wsStmt = $pdo->prepare("
                UPDATE `navigation_items`
                SET `nav_group` = 'workspace', `sort_order` = ?
                WHERE `is_system` = 1 AND `nav_key` = ?
            ");
            foreach ($wsReorder as $wsKey => $wsOrder) {
                $wsStmt->execute([$wsOrder, $wsKey]);
            }

            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_consolidated_v3', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: add Settings & System Flow Explorer item to Checkpoint Controls sidebar
        $migSettings = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_settings_flow_v1' LIMIT 1");
        $migSettings->execute();
        if (!$migSettings->fetchColumn()) {
            $settingsRoles = 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead,stock_manager,stock_controller';
            $pdo->prepare("
                INSERT IGNORE INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES ('workspace', 'system_settings', 'Settings & Flow', 'settings', 'sidebar-settings-btn', '', 'assets/sliders-horizontal-13.svg', '', '', 'none', '', '', ?, 7, 1, 1)
            ")->execute([$settingsRoles]);
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_settings_flow_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: ensure event_coordinator & tech_lead & electrical/interpretation/support roles have synced system nav visibility
        $migDispatch = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_dispatch_roles_v1' LIMIT 1");
        $migDispatch->execute();
        if (!$migDispatch->fetchColumn()) {
            $upNavRoles = $pdo->prepare("UPDATE `navigation_items` SET `allowed_roles` = ? WHERE `is_system` = 1 AND `nav_key` = ?");
            foreach (getDefaultNavigationItems() as $defNav) {
                $upNavRoles->execute([$defNav['allowed_roles'], $defNav['nav_key']]);
            }
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_dispatch_roles_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: add Main Navigation items for Create Event and Operational Command & Department Dispatch Flow
        $migCreateDispatch = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_dispatch_create_event_v1' LIMIT 1");
        $migCreateDispatch->execute();
        if (!$migCreateDispatch->fetchColumn()) {
            $insNavItem = $pdo->prepare("
                INSERT INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    `nav_group` = VALUES(`nav_group`),
                    `label` = VALUES(`label`),
                    `nav_target` = VALUES(`nav_target`),
                    `dom_id` = VALUES(`dom_id`),
                    `icon` = VALUES(`icon`),
                    `active_icon` = VALUES(`active_icon`),
                    `icon_id` = VALUES(`icon_id`),
                    `badge_type` = VALUES(`badge_type`),
                    `badge_id` = VALUES(`badge_id`),
                    `allowed_roles` = VALUES(`allowed_roles`),
                    `sort_order` = VALUES(`sort_order`),
                    `is_enabled` = VALUES(`is_enabled`),
                    `is_system` = VALUES(`is_system`)
            ");
            foreach (getDefaultNavigationItems() as $defNav) {
                if (in_array((string) ($defNav['nav_key'] ?? ''), ['create_event', 'dispatch_flow'], true)) {
                    $insNavItem->execute([
                        $defNav['nav_group'] ?? 'main',
                        $defNav['nav_key'],
                        $defNav['label'],
                        $defNav['nav_target'],
                        $defNav['dom_id'] ?? '',
                        $defNav['node_id'] ?? '',
                        $defNav['icon'] ?? '',
                        $defNav['active_icon'] ?? '',
                        $defNav['icon_id'] ?? '',
                        $defNav['badge_type'] ?? 'none',
                        $defNav['badge_id'] ?? '',
                        $defNav['badge_text'] ?? '',
                        $defNav['allowed_roles'] ?? 'all',
                        (int) ($defNav['sort_order'] ?? 10),
                        (int) ($defNav['is_enabled'] ?? 1),
                        (int) ($defNav['is_system'] ?? 1),
                    ]);
                }
            }
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_dispatch_create_event_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }

        // One-time migration: add Checkpoint Controls Settings submenu items for per-section access control
        $migSettingsSub = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'nav_migrated_settings_subitems_v1' LIMIT 1");
        $migSettingsSub->execute();
        if (!$migSettingsSub->fetchColumn()) {
            $insSubNav = $pdo->prepare("
                INSERT IGNORE INTO `navigation_items`
                (`nav_group`, `nav_key`, `label`, `nav_target`, `dom_id`, `node_id`, `icon`, `active_icon`, `icon_id`, `badge_type`, `badge_id`, `badge_text`, `allowed_roles`, `sort_order`, `is_enabled`, `is_system`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach (getDefaultNavigationItems() as $defNav) {
                if (strpos((string) ($defNav['nav_target'] ?? ''), 'settings:') === 0) {
                    $insSubNav->execute([
                        $defNav['nav_group'] ?? 'workspace',
                        $defNav['nav_key'],
                        $defNav['label'],
                        $defNav['nav_target'],
                        $defNav['dom_id'] ?? '',
                        $defNav['node_id'] ?? '',
                        $defNav['icon'] ?? '',
                        $defNav['active_icon'] ?? '',
                        $defNav['icon_id'] ?? '',
                        $defNav['badge_type'] ?? 'none',
                        $defNav['badge_id'] ?? '',
                        $defNav['badge_text'] ?? '',
                        $defNav['allowed_roles'] ?? 'all',
                        (int) ($defNav['sort_order'] ?? 10),
                        (int) ($defNav['is_enabled'] ?? 1),
                        (int) ($defNav['is_system'] ?? 1),
                    ]);
                }
            }
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('nav_migrated_settings_subitems_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }
    } catch (Throwable $e) {}
}

function classifyRollCallRoleCategory(string $roleKey): string
{
    $r = strtolower(trim($roleKey));
    if (in_array($r, ['stock_manager', 'admin', 'administrator', 'manager', 'project_manager', 'event_coordinator', 'tech_lead', 'technical_lead'], true)) {
        return 'supervisor';
    }
    if ($r === 'stock_controller') {
        return 'controller';
    }
    if (in_array($r, ['technician', 'sound_engineer', 'lighting_tech', 'video_director', 'electrical_tech', 'interpretation_tech', 'stage_manager', 'rigging_lead'], true)) {
        return 'technician';
    }
    return 'crew';
}

function getDefaultOnsiteTechnicianPassword(): string
{
    return 'TechSite@2026';
}

function ensureOnsiteShareSettings(PDO $pdo): array
{
    ensureNavigationTables($pdo);
    $keys = ['onsite_share_enabled', 'onsite_share_password_hash', 'onsite_share_session_ver', 'onsite_share_is_default'];
    $map = [];
    try {
        $inPlaceholders = implode(',', array_fill(0, count($keys), '?'));
        $st = $pdo->prepare("SELECT `setting_key`, `setting_value` FROM `app_settings` WHERE `setting_key` IN ({$inPlaceholders})");
        $st->execute($keys);
        while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
            $map[$row['setting_key']] = (string) ($row['setting_value'] ?? '');
        }

        if (!isset($map['onsite_share_enabled'])) {
            $pdo->prepare("INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_enabled', '1')")->execute();
            $map['onsite_share_enabled'] = '1';
        }
        if (empty($map['onsite_share_password_hash'])) {
            $defaultHash = password_hash(getDefaultOnsiteTechnicianPassword(), PASSWORD_DEFAULT);
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_password_hash', ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)")
                ->execute([$defaultHash]);
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_is_default', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")
                ->execute();
            $map['onsite_share_password_hash'] = $defaultHash;
            $map['onsite_share_is_default'] = '1';
        }
        if (empty($map['onsite_share_session_ver'])) {
            $pdo->prepare("INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_session_ver', '1')")->execute();
            $map['onsite_share_session_ver'] = '1';
        }
        if (!isset($map['onsite_share_is_default'])) {
            $map['onsite_share_is_default'] = '0';
        }
    } catch (Throwable $e) {
        $map['onsite_share_enabled'] = $map['onsite_share_enabled'] ?? '1';
        $map['onsite_share_session_ver'] = $map['onsite_share_session_ver'] ?? '1';
        $map['onsite_share_is_default'] = $map['onsite_share_is_default'] ?? '0';
    }

    return [
        'enabled' => ($map['onsite_share_enabled'] ?? '1') === '1',
        'password_hash' => (string) ($map['onsite_share_password_hash'] ?? ''),
        'session_ver' => max(1, (int) ($map['onsite_share_session_ver'] ?? 1)),
        'is_default' => ($map['onsite_share_is_default'] ?? '0') === '1',
    ];
}

function updateOnsiteSharePasswordConfig(PDO $pdo, ?bool $enabled, string $newPassword = '', bool $revokeSessions = false): array
{
    $cfg = ensureOnsiteShareSettings($pdo);
    if ($enabled !== null) {
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_enabled', ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)")
            ->execute([$enabled ? '1' : '0']);
    }

    $passwordUpdated = false;
    if ($newPassword !== '') {
        if (strlen($newPassword) < 6) {
            return ['ok' => false, 'status' => 400, 'error' => 'Shared technician password must be at least 6 characters.'];
        }
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_password_hash', ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)")
            ->execute([$hash]);
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_is_default', '0') ON DUPLICATE KEY UPDATE `setting_value` = '0'")
            ->execute();
        $passwordUpdated = true;
        $revokeSessions = true;
    }

    if ($revokeSessions) {
        $nextVer = $cfg['session_ver'] + 1;
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('onsite_share_session_ver', ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)")
            ->execute([(string) $nextVer]);
    }

    $updatedCfg = ensureOnsiteShareSettings($pdo);
    return [
        'ok' => true,
        'password_updated' => $passwordUpdated,
        'revoked' => $revokeSessions,
        'config' => $updatedCfg,
    ];
}

function isOnsiteViewerSessionAuthorized(PDO $pdo): bool
{
    if (empty($_SESSION['onsite_viewer_authorized'])) {
        return false;
    }
    $cfg = ensureOnsiteShareSettings($pdo);
    if (!$cfg['enabled']) {
        return false;
    }
    $sessVer = (int) ($_SESSION['onsite_viewer_ver'] ?? 0);
    return $sessVer === $cfg['session_ver'];
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

function getDefaultOverviewWidgetItems(): array
{
    return [
        [
            'parent_key' => '',
            'widget_key' => 'overview_page_intro',
            'label' => 'Page Header & Title Block',
            'selector' => '#screen-overview > .overview-top-block > .page-intro',
            'dom_id' => '',
            'node_id' => '2:3349',
            'category' => 'header',
            'allowed_roles' => 'all',
            'sort_order' => 1,
            'is_enabled' => 1,
            'description' => 'Gate Operations & Access Matrix title bar and action buttons',
        ],
        [
            'parent_key' => 'overview_page_intro',
            'widget_key' => 'overview_tour_btn',
            'label' => 'Header · Interactive Guided Tour',
            'selector' => '#screen-overview #topbar-menu-tour',
            'dom_id' => 'topbar-menu-tour',
            'node_id' => '',
            'category' => 'header',
            'allowed_roles' => 'all',
            'sort_order' => 2,
            'is_enabled' => 1,
            'description' => 'Guided workflow spotlight tour button',
        ],
        [
            'parent_key' => 'overview_page_intro',
            'widget_key' => 'overview_schedule_roster_btn',
            'label' => 'Header · Schedule Event Roster Button',
            'selector' => '#screen-overview #overview-schedule-roster-btn',
            'dom_id' => 'overview-schedule-roster-btn',
            'node_id' => '',
            'category' => 'header',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,tech_lead,technical_lead',
            'sort_order' => 3,
            'is_enabled' => 1,
            'description' => 'Quick button to open Schedule Event Roster modal',
        ],
        [
            'parent_key' => '',
            'widget_key' => 'overview_checkpoint_bar',
            'label' => 'Checkpoint Selector Bar (Master)',
            'selector' => '#screen-overview .checkpoint-controls-bar',
            'dom_id' => '',
            'node_id' => '2:3356',
            'category' => 'checkpoint',
            'allowed_roles' => 'all',
            'sort_order' => 4,
            'is_enabled' => 1,
            'description' => 'Dual Facility Gate / Event Venue selector and station status bar',
        ],
        [
            'parent_key' => 'overview_checkpoint_bar',
            'widget_key' => 'overview_cp_type_toggle',
            'label' => 'Checkpoint · Facility Gate / Event Venue Tabs',
            'selector' => '#screen-overview .checkpoint-controls-bar .cp-type-toggle',
            'dom_id' => '',
            'node_id' => '',
            'category' => 'checkpoint',
            'allowed_roles' => 'all',
            'sort_order' => 5,
            'is_enabled' => 1,
            'description' => 'Facility Gate (L2-L4) vs Event Venue (L1-L4) toggle pills',
        ],
        [
            'parent_key' => 'overview_checkpoint_bar',
            'widget_key' => 'overview_cp_select',
            'label' => 'Checkpoint · Active Checkpoint Dropdown',
            'selector' => '#screen-overview .checkpoint-controls-bar .js-checkpoint-select',
            'dom_id' => '',
            'node_id' => '',
            'category' => 'checkpoint',
            'allowed_roles' => 'all',
            'sort_order' => 6,
            'is_enabled' => 1,
            'description' => 'Active gate or event venue dropdown selector',
        ],
        [
            'parent_key' => 'overview_checkpoint_bar',
            'widget_key' => 'overview_station_lock_pill',
            'label' => 'Checkpoint · Multi-Checkpoint / Lock Station Pill',
            'selector' => '#screen-overview .checkpoint-controls-bar .js-station-lock-btn',
            'dom_id' => '',
            'node_id' => '2:3362',
            'category' => 'checkpoint',
            'allowed_roles' => 'all',
            'sort_order' => 7,
            'is_enabled' => 1,
            'description' => 'Station PIN lock mode indicator and quick lock trigger',
        ],
        [
            'parent_key' => 'overview_checkpoint_bar',
            'widget_key' => 'overview_cp_meta',
            'label' => 'Checkpoint · Call-Time & Clearance Meta',
            'selector' => '#screen-overview .checkpoint-controls-bar .checkpoint-right-group',
            'dom_id' => '',
            'node_id' => '2:3366',
            'category' => 'checkpoint',
            'allowed_roles' => 'all',
            'sort_order' => 8,
            'is_enabled' => 1,
            'description' => 'Active checkpoint call time and authorized tiers summary',
        ],
        [
            'parent_key' => '',
            'widget_key' => 'overview_metrics_grid',
            'label' => 'Gate Telemetry KPI Cards Grid (Master)',
            'selector' => '#screen-overview > .overview-top-block > .metrics-grid',
            'dom_id' => '',
            'node_id' => '2:3372',
            'category' => 'kpi',
            'allowed_roles' => 'all',
            'sort_order' => 9,
            'is_enabled' => 1,
            'description' => '4-card KPI telemetry strip with sparklines',
        ],
        [
            'parent_key' => 'overview_metrics_grid',
            'widget_key' => 'overview_kpi_badges',
            'label' => 'KPI Card 1 · Active ID Badges',
            'selector' => '#screen-overview .metrics-grid .metric-card[data-node-id="2:3373"]',
            'dom_id' => 'overview-tier-breakdown',
            'node_id' => '2:3373',
            'category' => 'kpi',
            'allowed_roles' => 'all',
            'sort_order' => 10,
            'is_enabled' => 1,
            'description' => 'Total active badges & L1-L8 tier breakdown card',
        ],
        [
            'parent_key' => 'overview_metrics_grid',
            'widget_key' => 'overview_kpi_onsite',
            'label' => 'KPI Card 2 · Currently On-Site (Roll-Call)',
            'selector' => '#screen-overview .metrics-grid .metric-card[data-node-id="2:3393"]',
            'dom_id' => '',
            'node_id' => '2:3393',
            'category' => 'kpi',
            'allowed_roles' => 'all',
            'sort_order' => 11,
            'is_enabled' => 1,
            'description' => 'Live checked-in roll-call count card',
        ],
        [
            'parent_key' => 'overview_metrics_grid',
            'widget_key' => 'overview_kpi_checkins',
            'label' => 'KPI Card 3 · Venue vs. Facility Check-Ins',
            'selector' => '#screen-overview .metrics-grid .metric-card[data-node-id="2:3413"]',
            'dom_id' => '',
            'node_id' => '2:3413',
            'category' => 'kpi',
            'allowed_roles' => 'all',
            'sort_order' => 12,
            'is_enabled' => 1,
            'description' => 'Today granted check-ins split by Venue vs Stock Gate',
        ],
        [
            'parent_key' => 'overview_metrics_grid',
            'widget_key' => 'overview_kpi_exceptions',
            'label' => 'KPI Card 4 · Late & Denied Scans',
            'selector' => '#screen-overview .metrics-grid .metric-card[data-node-id="2:3433"]',
            'dom_id' => '',
            'node_id' => '2:3433',
            'category' => 'kpi',
            'allowed_roles' => 'all',
            'sort_order' => 13,
            'is_enabled' => 1,
            'description' => 'Today late arrivals and access denied exceptions card',
        ],
        [
            'parent_key' => '',
            'widget_key' => 'overview_timeline_card',
            'label' => 'User Activity Timeline Widget (Master)',
            'selector' => '#screen-overview .timeline-card-overview',
            'dom_id' => 'timeline-feed-list',
            'node_id' => '2:3516',
            'category' => 'timeline',
            'allowed_roles' => 'all',
            'sort_order' => 14,
            'is_enabled' => 1,
            'description' => 'Live activity stream card with filters, reports, and feed',
        ],
        [
            'parent_key' => 'overview_timeline_card',
            'widget_key' => 'overview_timeline_clear_btn',
            'label' => 'Timeline · Reset Logs Button',
            'selector' => '#screen-overview #timeline-clear-btn',
            'dom_id' => 'timeline-clear-btn',
            'node_id' => '',
            'category' => 'timeline',
            'allowed_roles' => 'admin,administrator',
            'sort_order' => 15,
            'is_enabled' => 1,
            'description' => 'Reset today gate activity logs button',
        ],
        [
            'parent_key' => 'overview_timeline_card',
            'widget_key' => 'overview_timeline_add_btn',
            'label' => 'Timeline · + Add Log Button',
            'selector' => '#screen-overview .timeline-card-overview .js-open-create-timeline-btn',
            'dom_id' => '',
            'node_id' => '',
            'category' => 'timeline',
            'allowed_roles' => 'admin,administrator,stock_manager',
            'sort_order' => 16,
            'is_enabled' => 1,
            'description' => 'Manual gate log entry creation button',
        ],
        [
            'parent_key' => 'overview_timeline_card',
            'widget_key' => 'overview_timeline_filters',
            'label' => 'Timeline · Search & Scope Filter Bar',
            'selector' => '#screen-overview .timeline-card-overview .timeline-filter-bar',
            'dom_id' => 'timeline-search-input',
            'node_id' => '',
            'category' => 'timeline',
            'allowed_roles' => 'all',
            'sort_order' => 17,
            'is_enabled' => 1,
            'description' => 'Timeline text search and venue/status scope dropdown',
        ],
        [
            'parent_key' => 'overview_timeline_card',
            'widget_key' => 'overview_shift_report_toolbar',
            'label' => 'Timeline · Shift Report Toolbar',
            'selector' => '#screen-overview #shift-report-toolbar',
            'dom_id' => 'shift-report-toolbar',
            'node_id' => '',
            'category' => 'timeline',
            'allowed_roles' => 'all',
            'sort_order' => 18,
            'is_enabled' => 1,
            'description' => 'Date range selector and report export toolbar',
        ],
        [
            'parent_key' => 'overview_shift_report_toolbar',
            'widget_key' => 'overview_timeline_export_csv',
            'label' => 'Shift Report · Export CSV Button',
            'selector' => '#screen-overview #timeline-export-csv-btn',
            'dom_id' => 'timeline-export-csv-btn',
            'node_id' => '',
            'category' => 'timeline',
            'allowed_roles' => 'all',
            'sort_order' => 19,
            'is_enabled' => 1,
            'description' => 'Download shift attendance CSV button',
        ],
        [
            'parent_key' => 'overview_shift_report_toolbar',
            'widget_key' => 'overview_timeline_print_pdf',
            'label' => 'Shift Report · Client PDF / Sign-Off',
            'selector' => '#screen-overview #timeline-print-btn',
            'dom_id' => 'timeline-print-btn',
            'node_id' => '',
            'category' => 'timeline',
            'allowed_roles' => 'all',
            'sort_order' => 20,
            'is_enabled' => 1,
            'description' => 'Generate printable branded client shift sign-off report',
        ],
        [
            'parent_key' => 'overview_timeline_card',
            'widget_key' => 'overview_timeline_pagination',
            'label' => 'Timeline · Pagination Footer',
            'selector' => '#screen-overview .timeline-card-overview .timeline-pagination-bar',
            'dom_id' => 'timeline-prev-btn',
            'node_id' => '',
            'category' => 'timeline',
            'allowed_roles' => 'all',
            'sort_order' => 21,
            'is_enabled' => 1,
            'description' => 'Prev/Next pagination strip below the timeline feed',
        ],
        [
            'parent_key' => '',
            'widget_key' => 'overview_techlead_card',
            'label' => 'Tech Lead Assigned Crew Card (Master)',
            'selector' => '#screen-overview #tech-lead-roster-overview-card',
            'dom_id' => 'tech-lead-roster-overview-card',
            'node_id' => '',
            'category' => 'techlead',
            'allowed_roles' => 'tech_lead,technical_lead',
            'sort_order' => 22,
            'is_enabled' => 1,
            'description' => 'Assigned Crew & Locations telemetry card',
        ],
        [
            'parent_key' => 'overview_techlead_card',
            'widget_key' => 'overview_techlead_reset_all',
            'label' => 'Tech Lead Card · Reset All Button',
            'selector' => '#screen-overview #techlead-card-reset-all-btn',
            'dom_id' => 'techlead-card-reset-all-btn',
            'node_id' => '',
            'category' => 'techlead',
            'allowed_roles' => 'tech_lead,technical_lead',
            'sort_order' => 23,
            'is_enabled' => 1,
            'description' => 'Reset assigned crew back to standby action link',
        ],
        [
            'parent_key' => 'overview_techlead_card',
            'widget_key' => 'overview_techlead_open_roster',
            'label' => 'Tech Lead Card · Schedule Roster ↗',
            'selector' => '#screen-overview #techlead-card-open-roster-btn',
            'dom_id' => 'techlead-card-open-roster-btn',
            'node_id' => '',
            'category' => 'techlead',
            'allowed_roles' => 'tech_lead,technical_lead',
            'sort_order' => 24,
            'is_enabled' => 1,
            'description' => 'Quick Schedule Roster shortcut link inside Tech Lead card',
        ],
        [
            'parent_key' => 'overview_techlead_card',
            'widget_key' => 'overview_techlead_coordinates',
            'label' => 'Tech Lead Card · Last Located Telemetry',
            'selector' => '#screen-overview #tech-lead-roster-overview-card .metric-coordinates',
            'dom_id' => 'techlead-roster-last-location',
            'node_id' => '',
            'category' => 'techlead',
            'allowed_roles' => 'tech_lead,technical_lead',
            'sort_order' => 25,
            'is_enabled' => 1,
            'description' => 'Latest checkpoint & scan timestamp strip',
        ],
        [
            'parent_key' => 'overview_techlead_card',
            'widget_key' => 'overview_techlead_breakdown',
            'label' => 'Tech Lead Card · Location Crew Breakdown',
            'selector' => '#screen-overview #techlead-roster-breakdown',
            'dom_id' => 'techlead-roster-breakdown',
            'node_id' => '',
            'category' => 'techlead',
            'allowed_roles' => 'tech_lead,technical_lead',
            'sort_order' => 26,
            'is_enabled' => 1,
            'description' => 'Interactive location rows showing crew counts and reset buttons',
        ],
        [
            'parent_key' => '',
            'widget_key' => 'overview_allocation_card',
            'label' => 'Hourly Traffic & Currently On-Site Card (Master)',
            'selector' => '#screen-overview #overview-allocation-card',
            'dom_id' => 'overview-allocation-card',
            'node_id' => '2:3454',
            'category' => 'allocation',
            'allowed_roles' => 'all',
            'sort_order' => 27,
            'is_enabled' => 1,
            'description' => 'Right-hand analytics card holding Traffic Chart and Currently On-Site (COS) roster',
        ],
        [
            'parent_key' => 'overview_allocation_card',
            'widget_key' => 'overview_allocation_switcher',
            'label' => 'Traffic & COS · View Switcher Tabs',
            'selector' => '#screen-overview #overview-map-switcher',
            'dom_id' => 'overview-map-switcher',
            'node_id' => '',
            'category' => 'allocation',
            'allowed_roles' => 'all',
            'sort_order' => 28,
            'is_enabled' => 1,
            'description' => 'View toggle buttons between Traffic Chart and Currently On-Site',
        ],
        [
            'parent_key' => 'overview_allocation_card',
            'widget_key' => 'overview_traffic_chart_view',
            'label' => 'Traffic & COS · Hourly Traffic Chart View',
            'selector' => '#screen-overview #overview-traffic-chart-view',
            'dom_id' => 'overview-traffic-chart-view',
            'node_id' => '',
            'category' => 'allocation',
            'allowed_roles' => 'all',
            'sort_order' => 29,
            'is_enabled' => 1,
            'description' => 'Dual-bar hourly check-in chart for Venues vs Facility Gates',
        ],
        [
            'parent_key' => 'overview_allocation_card',
            'widget_key' => 'overview_cos_view',
            'label' => 'Traffic & COS · Currently On-Site (COS) View',
            'selector' => '#screen-overview #overview-cos-view',
            'dom_id' => 'overview-cos-view',
            'node_id' => '',
            'category' => 'allocation',
            'allowed_roles' => 'all',
            'sort_order' => 30,
            'is_enabled' => 1,
            'description' => 'Filterable grid of personnel currently checked in on-site',
        ],
        [
            'parent_key' => '',
            'widget_key' => 'overview_crew_roster',
            'label' => 'Production Crew & Staff Roster (Master)',
            'selector' => '#screen-overview > section.directory-card[data-node-id="2:3533"]',
            'dom_id' => 'overview-attendee-rows',
            'node_id' => '2:3533',
            'category' => 'roster',
            'allowed_roles' => 'admin,administrator,manager,project_manager,event_coordinator,stock_manager,stock_controller',
            'sort_order' => 31,
            'is_enabled' => 1,
            'description' => 'Full bottom crew directory & paired check-in/out table',
        ],
        [
            'parent_key' => 'overview_crew_roster',
            'widget_key' => 'overview_roster_actions',
            'label' => 'Crew Roster · Export & Open Kiosk Buttons',
            'selector' => '#screen-overview section.directory-card[data-node-id="2:3533"] .directory-actions',
            'dom_id' => '',
            'node_id' => '2:3541',
            'category' => 'roster',
            'allowed_roles' => 'all',
            'sort_order' => 32,
            'is_enabled' => 1,
            'description' => 'Export CSV, Export Audit Logs, and Open Kiosk Deck buttons',
        ],
        [
            'parent_key' => 'overview_crew_roster',
            'widget_key' => 'overview_roster_tabs',
            'label' => 'Crew Roster · Status Filter Tabs',
            'selector' => '#screen-overview #overview-attendee-tabs',
            'dom_id' => 'overview-attendee-tabs',
            'node_id' => '2:3548',
            'category' => 'roster',
            'allowed_roles' => 'all',
            'sort_order' => 33,
            'is_enabled' => 1,
            'description' => 'All Crew / Checked In / Checked Out / L2-L4 / L1 tabs',
        ],
        [
            'parent_key' => 'overview_crew_roster',
            'widget_key' => 'overview_roster_tools',
            'label' => 'Crew Roster · Search & Clearance Filters',
            'selector' => '#screen-overview section.directory-card[data-node-id="2:3533"] .table-tools',
            'dom_id' => 'overview-attendee-search',
            'node_id' => '2:3564',
            'category' => 'roster',
            'allowed_roles' => 'all',
            'sort_order' => 34,
            'is_enabled' => 1,
            'description' => 'Search box, clearance tier pill filter, and gate state filter',
        ],
        [
            'parent_key' => 'overview_crew_roster',
            'widget_key' => 'overview_roster_footer',
            'label' => 'Crew Roster · Pagination & Footer Link',
            'selector' => '#screen-overview section.directory-card[data-node-id="2:3533"] .table-footer',
            'dom_id' => 'overview-page-controls',
            'node_id' => '2:3783',
            'category' => 'roster',
            'allowed_roles' => 'all',
            'sort_order' => 35,
            'is_enabled' => 1,
            'description' => 'Roster pagination controls and Full Gate Terminal shortcut',
        ],
    ];
}

function ensureOverviewWidgetsTables(PDO $pdo, bool $forceReset = false): void
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `overview_widget_controls` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `parent_key` VARCHAR(64) NOT NULL DEFAULT '',
                `widget_key` VARCHAR(64) NOT NULL UNIQUE,
                `label` VARCHAR(120) NOT NULL,
                `selector` VARCHAR(190) NOT NULL,
                `dom_id` VARCHAR(100) NOT NULL DEFAULT '',
                `node_id` VARCHAR(32) NOT NULL DEFAULT '',
                `category` VARCHAR(48) NOT NULL DEFAULT 'general',
                `allowed_roles` TEXT DEFAULT NULL,
                `sort_order` INT NOT NULL DEFAULT 10,
                `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
                `description` VARCHAR(255) NOT NULL DEFAULT '',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        if ($forceReset) {
            $pdo->exec("DELETE FROM `overview_widget_controls`");
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('overview_widgets_enabled', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('overview_widgets_seeded_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        } else {
            $pdo->exec("INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('overview_widgets_enabled', '1')");
        }

        $mig = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'overview_widgets_seeded_v1' LIMIT 1");
        $mig->execute();
        $seededFlag = (string) ($mig->fetchColumn() ?: '');
        $cnt = (int) $pdo->query("SELECT COUNT(*) FROM `overview_widget_controls`")->fetchColumn();

        if ($forceReset || $cnt === 0 || $seededFlag !== '1') {
            $ins = $pdo->prepare("
                INSERT IGNORE INTO `overview_widget_controls`
                (`parent_key`, `widget_key`, `label`, `selector`, `dom_id`, `node_id`, `category`, `allowed_roles`, `sort_order`, `is_enabled`, `description`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach (getDefaultOverviewWidgetItems() as $it) {
                $ins->execute([
                    $it['parent_key'],
                    $it['widget_key'],
                    $it['label'],
                    $it['selector'],
                    $it['dom_id'],
                    $it['node_id'],
                    $it['category'],
                    $it['allowed_roles'],
                    (int) $it['sort_order'],
                    (int) $it['is_enabled'],
                    $it['description'],
                ]);
            }
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('overview_widgets_seeded_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        }
    } catch (Throwable $e) {}
}

function getOverviewWidgetsConfig(PDO $pdo): array
{
    ensureOverviewWidgetsTables($pdo);
    $enabled = true;
    $items = [];
    try {
        $st = $pdo->prepare("SELECT `setting_value` FROM `app_settings` WHERE `setting_key` = 'overview_widgets_enabled' LIMIT 1");
        $st->execute();
        $val = $st->fetchColumn();
        if ($val !== false) {
            $enabled = ((string) $val !== '0');
        }

        $rows = $pdo->query("SELECT * FROM `overview_widget_controls` ORDER BY `sort_order` ASC, `id` ASC")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $items[] = [
                'id' => (int) ($r['id'] ?? 0),
                'parent_key' => trim((string) ($r['parent_key'] ?? '')),
                'widget_key' => trim((string) ($r['widget_key'] ?? '')),
                'label' => trim((string) ($r['label'] ?? '')),
                'selector' => trim((string) ($r['selector'] ?? '')),
                'dom_id' => trim((string) ($r['dom_id'] ?? '')),
                'node_id' => trim((string) ($r['node_id'] ?? '')),
                'category' => trim((string) ($r['category'] ?? 'general')),
                'allowed_roles' => trim((string) ($r['allowed_roles'] ?? 'all')),
                'sort_order' => (int) ($r['sort_order'] ?? 10),
                'is_enabled' => (int) ($r['is_enabled'] ?? 1),
                'description' => trim((string) ($r['description'] ?? '')),
            ];
        }
    } catch (Throwable $e) {}

    if (empty($items)) {
        $defaults = getDefaultOverviewWidgetItems();
        foreach ($defaults as $idx => $d) {
            $d['id'] = $idx + 1;
            $items[] = $d;
        }
    }

    return [
        'enabled' => $enabled,
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

/**
 * Verifies a plaintext password against either `password_hash` or legacy `password` column on `users`.
 */
function verifyUserPasswordRow(array $userRow, string $plain): bool
{
    if ($plain === '') {
        return false;
    }
    foreach (['password_hash', 'password'] as $col) {
        $hash = trim((string) ($userRow[$col] ?? ''));
        if ($hash !== '' && password_verify($plain, $hash)) {
            return true;
        }
    }
    return false;
}

/**
 * Checks whether the `users` table defines the legacy NOT NULL `password` column.
 */
function usersTableHasPasswordCol(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    try {
        $st = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password'");
        $cached = (bool) ($st && $st->fetch());
    } catch (Throwable $e) {
        $cached = false;
    }
    return $cached;
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
        'event_coordinator' => 'Event Coordinator',
        'electrical_tech' => 'Electrical Technician',
        'interpretation_tech' => 'Interpretation Technician',
        'support_staff' => 'Support Staff',
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
    expireStaleShiftAssignments($pdo);
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
        case 'save_branding_config':
        case 'save_branding_font':
        case 'delete_branding_font':
        case 'upload_branding_logo':
        case 'reset_branding_logo':
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
                $disallowedRoles = ['admin', 'administrator', 'manager', 'project_manager', 'event_coordinator', 'tech_lead', 'stock_manager'];
                if (!in_array($targetTier, $allowedTiers, true) || in_array($targetRole, $disallowedRoles, true)) {
                    return ['ok' => false, 'error' => 'Permission denied: Site Managers can only manage facility crew (L1/L2) or Gate Controllers (L3).'];
                }
            }
            // 3. Technical Lead can onboard technical crew with L1/L2 clearance
            if ($role === 'tech_lead') {
                $targetTier = strtoupper(trim((string)($context['clearance_level'] ?? 'L2')));
                $targetRole = strtolower(trim((string)($context['role'] ?? 'technician')));
                $allowedTiers = ['L1_VENUE_BASIC', 'L2_TECH_STAGE', 'L1', 'L2'];
                $disallowedRoles = ['admin', 'administrator', 'manager', 'project_manager', 'event_coordinator', 'stock_manager'];
                if (!in_array($targetTier, $allowedTiers, true) || in_array($targetRole, $disallowedRoles, true)) {
                    return ['ok' => false, 'error' => 'Permission denied: Technical Leads can only onboard technical crew with Level 1 or Level 2 clearance.'];
                }
            }
            // 4. Standard crew cannot add users
            if (in_array($role, ['technician', 'sound_engineer', 'lighting_tech', 'video_director', 'electrical_tech', 'interpretation_tech', 'rigging_lead', 'support_staff', 'driver', 'security', 'user'], true)) {
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
        case 'delete_event':
        case 'assign_event_crew':
            // Tech Lead, Project Manager, Event Coordinator, Admin, and Stock Manager (for warehouses)
            if (!in_array($role, ['admin', 'administrator', 'manager', 'tech_lead', 'technical_lead', 'project_manager', 'event_coordinator'], true)) {
                if ($role === 'stock_manager' && ($context['checkpoint_type'] ?? '') === 'stock_warehouse') {
                    break;
                }
                return ['ok' => false, 'error' => 'Permission denied: Setting Call Times and managing event venues requires Tech Lead, Project Manager, Event Coordinator, or Administrator privileges.'];
            }
            break;

        case 'send_event_requirements':
            if (!in_array($role, ['admin', 'administrator', 'manager', 'project_manager', 'event_coordinator'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Sending Technical Requirements requires Project Manager, Event Coordinator, or Administrator privileges.'];
            }
            break;

        case 'save_event_dept_confirmation':
        case 'approve_event_tech_lead':
            if (!in_array($role, ['admin', 'administrator', 'manager', 'tech_lead', 'technical_lead'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Technical Lead approval and department confirmations require Technical Lead or Administrator privileges.'];
            }
            break;

        case 'request_support_staff':
            if (!in_array($role, ['admin', 'administrator', 'manager', 'project_manager', 'event_coordinator', 'tech_lead', 'technical_lead'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Requesting Support Staff requires Project Manager, Event Coordinator, Technical Lead, or Administrator privileges.'];
            }
            break;

        case 'fulfill_support_request':
            if (!in_array($role, ['admin', 'administrator', 'manager', 'stock_manager', 'project_manager', 'event_coordinator'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Fulfilling Support Staff requests requires Site Manager, Project Manager, Event Coordinator, or Administrator privileges.'];
            }
            break;

        case 'start_random_roll_call':
        case 'resolve_roll_call_entry':
            if (!in_array($role, ['admin', 'administrator', 'manager', 'stock_manager', 'tech_lead', 'technical_lead', 'project_manager', 'event_coordinator', 'stock_controller'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Managing Random Roll-Call checks requires Supervisor, Tech Lead, Gate Controller, or Administrator privileges.'];
            }
            break;

        case 'reset_user_trusted_device':
            if (!in_array($role, ['admin', 'administrator', 'manager', 'stock_manager'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Resetting bound user devices requires Site Manager or Administrator privileges.'];
            }
            break;

        case 'save_attendance_log':
        case 'delete_attendance_log':
            if (!in_array($role, ['admin', 'administrator', 'manager', 'stock_manager'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Activity Timeline CRUD requires Site Manager or Administrator privileges.'];
            }
            break;

        case 'save_warehouse':
        case 'save_warehouse_pin':
        case 'delete_warehouse':
        case 'save_standalone_portal':
        case 'delete_standalone_portal':
        case 'reset_portal_background':
            if (!in_array($role, ['admin', 'manager', 'administrator', 'stock_manager'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Facility checkpoint and gate portal management requires Site Manager or Administrator privileges.'];
            }
            break;

        case 'review_controller_shift':
        case 'generate_relief_qr':
            if (!in_array($role, ['admin', 'manager', 'administrator', 'stock_manager', 'project_manager', 'event_coordinator'], true)) {
                return ['ok' => false, 'error' => 'Permission denied: Only Administrators, Site Managers, or Event Leads can authorize Shift Relief assignments and Geo-Fenced Relief QRs.'];
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
 * Canonical role permission & flow metadata displayed in Settings -> Dispatch Flow & Roles Explorer.
 */
function getRoleCapabilitiesSpec(): array
{
    return [
        'tier1_command' => [
            'tier_key' => 'tier1_command',
            'tier_title' => 'Tier 1 · Command',
            'roles' => ['project_manager', 'event_coordinator'],
            'role_titles' => 'Project Manager / Event Coordinator',
            'clearance' => 'L4 · All-Access',
            'allowed_actions' => [
                'Create & edit event venues',
                'Send technical branch requirements to Tech Lead',
                'Request Tier 4 Support Staff',
                'Set shift call-times & venue PINs',
                'Approve controller shift relief & Geo-QR',
                'Trigger & review Random Roll-Call',
            ],
            'restricted_actions' => [
                'Cannot delete users or edit global L1–L4 matrix rules (Admin only)',
            ],
            'flow_steps' => [
                '1. Create Event Venue & leadership roster',
                '2. Send Technical Requirements (6 specialty counts + notes) to Tech Lead',
                '3. Submit Support Staff Request for runners / drivers / security',
                '4. Monitor confirmed readiness & oversee live gate roll-call',
            ],
        ],
        'tier2_tech_lead' => [
            'tier_key' => 'tier2_tech_lead',
            'tier_title' => 'Tier 2 · Technical Supervision',
            'roles' => ['tech_lead', 'technical_lead'],
            'role_titles' => 'Technical Lead',
            'clearance' => 'L4 · Technical Command',
            'allowed_actions' => [
                'Review event technical requirements from PM / Coordinator',
                'Assign Technicians across 6 specialty branches',
                'Adjust venue call-times & request Support Staff',
                'Onboard technical crew (L1 / L2 only)',
                'Operate gate terminals & run Random Roll-Call',
            ],
            'restricted_actions' => [
                'Cannot elevate staff to L3 / L4 or approve controller relief swaps',
            ],
            'flow_steps' => [
                '1. Receive event requirements brief from Tier 1 Command',
                '2. Assign technicians per branch (Video, Sound, Lighting, Electrical, Rigging, Interpretation)',
                '3. Track Technician confirmations & replace any declined slots',
                '4. Adjust call-times & verify crew on-site via Random Roll-Call',
            ],
        ],
        'tier3_technicians' => [
            'tier_key' => 'tier3_technicians',
            'tier_title' => 'Tier 3 · Technical Execution',
            'roles' => ['technician', 'sound_engineer', 'lighting_tech', 'video_director', 'electrical_tech', 'interpretation_tech', 'stage_manager', 'rigging_lead'],
            'role_titles' => 'Technicians (6 Specialty Branches)',
            'clearance' => 'L2 · Technical & Stage',
            'allowed_actions' => [
                'Confirm or decline assigned event deployments',
                'Present 30s rotating Pass QR or scan 20s Venue QR',
                'Respond to Random Roll-Call presence checks (GPS / QR)',
                'Enroll TOTP 2FA & view On-Site Roll-Call',
            ],
            'restricted_actions' => [
                'Cannot scan other staff at gates, edit rosters, or alter call-times',
            ],
            'flow_steps' => [
                '1. Receive assignment notification from Tech Lead',
                '2. Click Confirm Assignment (or Decline with reason)',
                '3. Check in at venue via Anti-Shadowing QR or Gate Terminal',
                '4. Answer Random Roll-Call check on premise & Check out at shift end',
            ],
        ],
        'tier4_support' => [
            'tier_key' => 'tier4_support',
            'tier_title' => 'Tier 4 · Operations Ground Support',
            'roles' => ['support_staff', 'driver', 'security', 'user'],
            'role_titles' => 'Support Staff (Runners, Drivers, Venue Crew)',
            'clearance' => 'L1 · Event Venue Only',
            'allowed_actions' => [
                'Confirm or decline support deployment slots',
                'Venue gate check-in / check-out via Anti-Shadowing QR',
                'Respond to Random Roll-Call presence checks',
                'View assigned venue status & personal Digital Crew Pass',
            ],
            'restricted_actions' => [
                'Blocked from Stock Warehouses (L1 perimeter rule) & admin endpoints',
            ],
            'flow_steps' => [
                '1. Fulfilled from Tier 1/2 Support Staff Request by Site Manager / Coordinator',
                '2. Confirm assigned venue support shift',
                '3. Check in at Event Venue gate (Warehouse gates auto-denied)',
                '4. Verify presence on Random Roll-Call & Check out on departure',
            ],
        ],
        'site_ops' => [
            'tier_key' => 'site_ops',
            'tier_title' => 'Site Operations · Gate & Logistics Governance',
            'roles' => ['admin', 'administrator', 'manager', 'stock_manager', 'stock_controller'],
            'role_titles' => 'Admin, Site Manager & Gate Controller',
            'clearance' => 'L3–L4 · Gate & Facility Ops',
            'allowed_actions' => [
                'Fulfill Tier 4 Support Staff Requests (Admin / Site Manager)',
                'Operate #pane-kiosk & standalone gate.php (Visual Match + Name Checkin)',
                'Approve Shift Relief & Geo-Fenced Relief QR (Admin / Site Manager)',
                'Reset bound device tokens & close Random Roll-Call sessions',
            ],
            'restricted_actions' => [
                'Gate Controller (L3) is locked server-side to 1 assigned checkpoint',
            ],
            'flow_steps' => [
                '1. Unlock Gate Terminal via site PIN',
                '2. Scan 30s ABPASS1 QR (with Face-Match) or Name + Checkin',
                '3. Display 20s Rotating Venue QR for bound-phone self-check-in',
                '4. Reconcile Random Roll-Call & export attendance CSV',
            ],
        ],
    ];
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

/**
 * Checks whether a user currently has an open check_in (today or within the 18h overnight shift lookback).
 */
function isUserCurrentlyCheckedInDb(PDO $pdo, int $userId): bool
{
    try {
        $cutoff = date('Y-m-d H:i:s', strtotime(date('Y-m-d') . ' 00:00:00') - 18 * 3600);
        $st = $pdo->prepare("
            SELECT `scan_action`
            FROM `attendance_logs`
            WHERE `user_id` = ? AND `scanned_at` >= ?
              AND `access_status` = 'granted'
              AND `scan_action` IN ('check_in', 'check_out')
            ORDER BY `scanned_at` DESC, `id` DESC
            LIMIT 1
        ");
        $st->execute([$userId, $cutoff]);
        $last = (string) ($st->fetchColumn() ?: '');
        return $last === 'check_in';
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Lazy deadline processor for active Random Roll-Call sessions:
 * closes expired sessions and optionally auto-checks out missing staff.
 */
function processExpiredRollCallSessions(PDO $pdo): void
{
    try {
        $expiredSt = $pdo->query("SELECT * FROM `roll_call_sessions` WHERE `status` = 'active' AND `deadline_at` < NOW()");
        $expiredSessions = $expiredSt ? $expiredSt->fetchAll(PDO::FETCH_ASSOC) : [];
        if (empty($expiredSessions)) {
            return;
        }
        foreach ($expiredSessions as $sess) {
            $sid = (int) $sess['id'];
            $autoOut = ((int) ($sess['auto_checkout_on_miss'] ?? 1) === 1);
            $deadlineSql = (string) ($sess['deadline_at'] ?: date('Y-m-d H:i:s'));

            $pendingSt = $pdo->prepare("SELECT * FROM `roll_call_entries` WHERE `session_id` = ? AND `status` = 'pending'");
            $pendingSt->execute([$sid]);
            $pendingRows = $pendingSt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($pendingRows as $ent) {
                $uid = (int) $ent['user_id'];
                $eid = (int) $ent['id'];
                if ($autoOut && isUserCurrentlyCheckedInDb($pdo, $uid)) {
                    $bSt = $pdo->prepare("SELECT `badge_code` FROM `user_badges` WHERE `user_id` = ? LIMIT 1");
                    $bSt->execute([$uid]);
                    $bCode = (string) ($bSt->fetchColumn() ?: formatRewBadgeCode($uid, null));

                    $cpType = in_array((string) $ent['checkpoint_type'], ['stock_warehouse', 'event_venue', 'main_office'], true)
                        ? (string) $ent['checkpoint_type']
                        : 'event_venue';
                    $cpId = is_numeric((string) $ent['checkpoint_id']) ? (int) $ent['checkpoint_id'] : 1;
                    $cpName = (string) ($ent['checkpoint_name'] ?: 'Site Checkpoint');
                    $outSql = $deadlineSql;
                    try {
                        $lastInSt = $pdo->prepare("SELECT MAX(`scanned_at`) FROM `attendance_logs` WHERE `user_id` = ? AND `scan_action` = 'check_in' AND `access_status` = 'granted'");
                        $lastInSt->execute([$uid]);
                        $lastInSql = (string) ($lastInSt->fetchColumn() ?: '');
                        if ($lastInSql !== '' && strtotime($deadlineSql) <= strtotime($lastInSql)) {
                            $outSql = date('Y-m-d H:i:s', max(time(), strtotime($lastInSql) + 1));
                        }
                    } catch (Throwable $e) {}

                    $insOut = $pdo->prepare("
                        INSERT INTO `attendance_logs`
                          (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `notes`, `scanned_at`)
                        VALUES (?, ?, ?, ?, ?, 'check_out', 'granted', NULL, 'rollcall_auto_out', ?, 'roll_call_auto_out', ?, ?)
                    ");
                    $insOut->execute([
                        $uid,
                        $bCode,
                        $cpType,
                        $cpId,
                        $cpName,
                        (int) ($sess['triggered_by_id'] ?: 1),
                        "Auto Check-Out: Missed Random Roll-Call #{$sid}",
                        $outSql,
                    ]);
                    $outLogId = (int) $pdo->lastInsertId();

                    $pdo->prepare("
                        UPDATE `roll_call_entries`
                        SET `status` = 'timed_out', `verification_method` = 'timeout_auto_out', `auto_checkout_log_id` = ?, `verified_at` = NOW(), `notes` = ?
                        WHERE `id` = ?
                    ")->execute([$outLogId, "No in-premise response before deadline ({$deadlineSql})", $eid]);
                } else {
                    $nextSt = $autoOut ? 'timed_out' : 'unaccounted';
                    $pdo->prepare("
                        UPDATE `roll_call_entries`
                        SET `status` = ?, `verification_method` = 'deadline_expired', `verified_at` = NOW(), `notes` = ?
                        WHERE `id` = ?
                    ")->execute([$nextSt, "Did not respond before {$deadlineSql}", $eid]);
                }
            }

            $nextSessStatus = $autoOut ? 'closed' : 'awaiting_review';
            $pdo->prepare("UPDATE `roll_call_sessions` SET `status` = ?, `closed_at` = CASE WHEN ? = 'closed' THEN NOW() ELSE NULL END WHERE `id` = ?")
                ->execute([$nextSessStatus, $nextSessStatus, $sid]);
        }
    } catch (Throwable $e) {}
}

function buildFullPayload(PDO $pdo, string $activeDb, string $reqCheckpointType = 'stock_warehouse', int $reqCheckpointId = 1): array
{
    expireStaleShiftAssignments($pdo);
    processExpiredRollCallSessions($pdo);
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
    $userIdToName = [];
    $userIdToRole = [];
    try {
        $uLkStmt = $pdo->query("SELECT `id`, `username`, `full_name`, `role`, `assigned_checkpoint_type`, `assigned_checkpoint_id` FROM `users`");
        while ($uLk = $uLkStmt->fetch(PDO::FETCH_ASSOC)) {
            $uIdLk = (int) $uLk['id'];
            $fnLk = strtolower(trim((string) ($uLk['full_name'] ?: $uLk['username'])));
            $unLk = strtolower(trim((string) $uLk['username']));
            if ($fnLk !== '') $userNameToId[$fnLk] = $uIdLk;
            if ($unLk !== '') $userNameToId[$unLk] = $uIdLk;
            $userIdToName[$uIdLk] = trim((string) ($uLk['full_name'] ?: $uLk['username'] ?: ''));
            $userIdToRole[$uIdLk] = strtolower(trim((string) ($uLk['role'] ?? '')));
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
            'geofence_radius_m' => (int) ($sr['geofence_radius_m'] ?? 200),
            'checkin_policy' => (string) ($sr['checkin_policy'] ?? 'hybrid'),
            'require_visual_match' => (int) ($sr['require_visual_match'] ?? 1),
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
    $eventRows = $pdo->query("SELECT * FROM `events` ORDER BY CASE WHEN `id` REGEXP '^[0-9]+$' THEN CAST(`id` AS UNSIGNED) ELSE 0 END DESC, COALESCE(`start_date`, `date`) DESC, `id` DESC LIMIT 50")->fetchAll();
    $eventVenues = [];
    $fallbackIdx = 1001;
    foreach ($eventRows as $er) {
        $rawId = (string) ($er['id'] ?? $fallbackIdx);
        $numId = is_numeric($rawId) ? (int) $rawId : crc32($rawId);
        $title = (string) ($er['title'] ?? 'Production Event');
        $loc = (string) ($er['location'] ?? 'Kigali Convention Centre');
        $callTime = substr((string) ($er['call_time'] ?? '08:00'), 0, 5) ?: '08:00';
        $pm = trim((string) ($er['project_manager'] ?? ''));
        $ec = trim((string) ($er['event_coordinator'] ?? ''));
        $tl = trim((string) ($er['tech_lead'] ?? ''));
        $leadName = $tl ?: ($pm ?: ($ec ?: 'Technical Lead'));
        $leadLabel = ($tl ? 'Tech Lead: ' . $tl : ($pm ? 'Project Manager: ' . $pm : ($ec ? 'Event Coordinator: ' . $ec : 'Tech Lead: ' . $leadName)));

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

        $rawStart = trim((string) ($er['start_date'] ?? ''));
        $rawDate = trim((string) ($er['date'] ?? $todayStr));
        $startDateVal = preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawStart) ? $rawStart : (preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDate) ? $rawDate : $todayStr);
        $rawEnd = trim((string) ($er['end_date'] ?? ''));
        $endDateVal = preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawEnd) ? $rawEnd : $startDateVal;
        if ($endDateVal < $startDateVal) {
            $endDateVal = $startDateVal;
        }
        $durDaysVal = (int) ($er['duration_days'] ?? 0);
        if ($durDaysVal < 1) {
            try {
                $d1 = new DateTimeImmutable($startDateVal);
                $d2 = new DateTimeImmutable($endDateVal);
                $durDaysVal = max(1, (int) $d1->diff($d2)->days + 1);
            } catch (Throwable $e) {
                $durDaysVal = 1;
            }
        }
        $durLabelVal = trim((string) ($er['duration_label'] ?? ''));
        if ($durLabelVal === '') {
            $durLabelVal = $durDaysVal === 1 ? '1 day' : ($durDaysVal . ' days');
        }

        $evItem = [
            'id' => $numId,
            'raw_id' => $rawId,
            'type' => 'event_venue',
            'name' => $title . ($loc && stripos($title, $loc) === false ? ' — ' . $loc : ''),
            'title' => $title,
            'location' => $loc,
            'date' => $startDateVal,
            'start_date' => $startDateVal,
            'end_date' => $endDateVal,
            'duration_days' => $durDaysVal,
            'duration_label' => $durLabelVal,
            'call_time' => $callTime,
            'project_manager' => $pm,
            'event_coordinator' => $ec,
            'tech_lead' => $tl,
            'lead_name' => $leadName,
            'lead_label' => $leadLabel,
            'min_clearance' => 'L1 / L2 / L3 / L4 Authorized',
            'assigned_technicians' => $assignedIds,
            'assigned_technician_names' => $assignedNames,
            'assigned_roster' => json_decode((string) ($er['assigned_roster_json'] ?? ''), true) ?: null,
            'assigned_count' => count($assignedIds),
            'geofence_radius_m' => (int) ($er['geofence_radius_m'] ?? 200),
            'checkin_policy' => (string) ($er['checkin_policy'] ?? 'hybrid'),
            'require_visual_match' => (int) ($er['require_visual_match'] ?? 1),
            'requirements' => json_decode((string) ($er['requirements_json'] ?? ''), true) ?: null,
            'dispatch_status' => (string) ($er['dispatch_status'] ?? 'draft'),
            'created_at' => $er['created_at'] ?? ($er['requirements_sent_at'] ?? null),
            'requirements_sent_at' => $er['requirements_sent_at'] ?? null,
            'requirements_sent_by' => !empty($er['requirements_sent_by']) ? (int) $er['requirements_sent_by'] : null,
            'requirements_sent_by_name' => !empty($er['requirements_sent_by']) ? ($userIdToName[(int) $er['requirements_sent_by']] ?? '') : '',
            'created_by_id' => !empty($er['created_by_id']) ? (int) $er['created_by_id'] : null,
            'created_by_name' => !empty($er['created_by_id']) ? ($userIdToName[(int) $er['created_by_id']] ?? '') : '',
            'created_by_role' => !empty($er['created_by_id']) ? ($userIdToRole[(int) $er['created_by_id']] ?? '') : '',
            'tech_lead_approved' => ((int) ($er['tech_lead_approved'] ?? 0) === 1),
            'tech_lead_approved_by' => !empty($er['tech_lead_approved_by']) ? (int) $er['tech_lead_approved_by'] : null,
            'tech_lead_approved_by_name' => !empty($er['tech_lead_approved_by']) ? ($userIdToName[(int) $er['tech_lead_approved_by']] ?? '') : '',
            'tech_lead_approved_at' => $er['tech_lead_approved_at'] ?? null,
            'tech_lead_approval_note' => trim((string) ($er['tech_lead_approval_note'] ?? '')),
            'image' => resolveProfileImageUrl(($er['image'] ?? '') !== '' ? $er['image'] : ($er['event_image'] ?? null)),
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
            'last_presence_verified_at' => (string) ($olog['scanned_at'] ?? ''),
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
                'last_presence_verified_at' => (string) ($log['scanned_at'] ?? ''),
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
            $userDailyMap[$uid]['last_presence_verified_at'] = (string) ($log['scanned_at'] ?? '');
        } elseif ($action === 'access_verify') {
            $userDailyMap[$uid]['last_presence_verified_at'] = (string) ($log['scanned_at'] ?? '');
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
            u.`must_change_password`,
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
    $trustedDeviceCounts = [];
    try {
        foreach ($pdo->query("SELECT `user_id`, COUNT(*) AS `cnt` FROM `user_trusted_devices` WHERE `is_active` = 1 GROUP BY `user_id`")->fetchAll(PDO::FETCH_ASSOC) as $tdRow) {
            $trustedDeviceCounts[(int) $tdRow['user_id']] = (int) $tdRow['cnt'];
        }
    } catch (Throwable $e) {}

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
            'must_change_password' => (int) ($ur['must_change_password'] ?? 0),
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
            'last_presence_verified_at' => $uDaily['last_presence_verified_at'] ?? null,
            'trusted_device_count' => $trustedDeviceCounts[$uid] ?? 0,
            'is_active' => (int) ($ur['is_active'] ?? 1),
            'allowed_stock_ids' => json_decode((string) ($ur['allowed_stock_ids'] ?? '[]'), true) ?: [],
            'allowed_event_ids' => json_decode((string) ($ur['allowed_event_ids'] ?? '[]'), true) ?: [],
        ];

        $crew[] = $member;
        $crewById[$uid] = $member;

        if ($dailyState === 'checked_in') {
            $rollCallList[] = [
                'user_id' => $uid,
                'full_name' => $fullName,
                'role' => $role,
                'role_category' => classifyRollCallRoleCategory($role),
                'role_display' => $member['role_display'],
                'department' => $dept,
                'phone' => $member['phone'],
                'badge_code' => $rewBadge,
                'staff_code' => $staffCode,
                'clearance_code' => $tier['code'],
                'clearance_color' => $tier['color'],
                'checkpoint_type' => $uDaily['last_checkpoint_type'] ?? 'event_venue',
                'checkpoint_id' => $uDaily['last_checkpoint_id'] ?? $activeCpId,
                'checkpoint_name' => $uDaily['last_checkpoint_name'] ?: $activeCpName,
                'check_in_time' => $uDaily['check_in_short'] ?? '08:00 AM',
                'last_presence_verified_at' => $uDaily['last_presence_verified_at'] ?? null,
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

    // 6. Build User Activity Timeline (from `attendance_logs` newest first)
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

    // 7. Build Default Verification Deck Payload (Prefer Eric `id=6` or first crew member)
    $featuredMember = $crewById[6] ?? ($crew[0] ?? null);

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
        $isEventCommand = in_array($cRole, ['project_manager', 'event_coordinator'], true) || $isAdmin;
        $isTechLead = in_array($cRole, ['tech_lead', 'technical_lead'], true) || $isAdmin;
        $isStockMgr = $cRole === 'stock_manager' || $isAdmin;
        $isStockCtrl = $cRole === 'stock_controller';

        $currentUser['permissions'] = [
            'is_admin' => $isAdmin,
            'is_event_command' => $isEventCommand,
            'is_tech_lead' => $isTechLead,
            'is_stock_manager' => $isStockMgr,
            'is_stock_controller' => $isStockCtrl,
            'can_add_user' => $isAdmin || $isEventCommand || $isTechLead || $isStockMgr,
            'can_delete_user' => $isAdmin,
            'can_edit_tiers' => $isAdmin,
            'can_assign_event_crew' => $isTechLead || $isEventCommand || $isAdmin,
            'can_send_event_requirements' => $isEventCommand || $isAdmin,
            'can_request_support_staff' => $isEventCommand || $isTechLead || $isAdmin,
            'can_fulfill_support_staff' => $isStockMgr || $isEventCommand || $isAdmin,
            'can_set_call_time' => $isTechLead || $isEventCommand || $isAdmin || $isStockMgr,
            'can_manage_warehouses' => $isStockMgr || $isAdmin,
            'can_approve_shift_requests' => $isAdmin || $isStockMgr || $isEventCommand,
            'can_request_shift_relief' => $isAdmin || $isEventCommand || $isStockMgr || $isStockCtrl || $isTechLead,
            'can_assign_controller_checkpoint' => $isAdmin || $isStockMgr,
            'can_trigger_random_rollcall' => $isAdmin || $isEventCommand || $isTechLead || $isStockMgr || $isStockCtrl,
            'max_assignable_tier' => $isAdmin ? 'L4' : ($isStockMgr ? 'L3' : ($isTechLead ? 'L2' : 'none')),
            'delegation_summary' => $isAdmin
                ? 'Full Administrator — All digital and physical systems unconstrained.'
                : ($isEventCommand
                    ? 'Event Command (PM / Coordinator) — Authorized to create events, send requirements to Tech Lead, request Support Staff, and manage rosters.'
                    : ($isTechLead
                        ? 'Technical Lead — Authorized to set Call Times, assign technicians across 6 branches, and onboard technical personnel (L1/L2).'
                        : ($isStockMgr
                            ? 'Site Manager — Authorized for facility gates, support fulfillment, controller relief approvals, and site crew onboarding.'
                            : ($isStockCtrl
                                ? 'Gate Controller — Strictly locked to one assigned Gate Terminal; cross-gate relief requires Administrator or Site Manager approval.'
                                : 'Standard Personnel — Confirm event assignments, present rotating pass QR / scan venue QR, and respond to roll-call checks.')))),
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
                'relief_mode' => (string) ($sr['relief_mode'] ?? 'standard'),
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

    $totpEnabled = false;
    if ($authUserId > 0) {
        try {
            $tSt = $pdo->prepare("SELECT `is_enabled` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
            $tSt->execute([$authUserId]);
            $totpEnabled = ((int) $tSt->fetchColumn() === 1);
        } catch (Throwable $e) {}
    }

    $reliefTokens = [];
    if ($canSeeTerminalPins || $sessionRole === 'stock_controller' || in_array($sessionRole, ['project_manager', 'event_coordinator'], true)) {
        try {
            $rtSql = "SELECT `id`, `shift_request_id`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `assigned_user_id`, `require_totp`, `require_geofence`, `geofence_radius_m`, `expires_at`, `redeemed_at`, `redeemed_by_id`, `distance_m`, `override_used`, `created_by_id`, `created_at` FROM `relief_qr_tokens` ORDER BY `id` DESC LIMIT 12";
            foreach ($pdo->query($rtSql)->fetchAll(PDO::FETCH_ASSOC) as $rt) {
                $tUid = (int) ($rt['assigned_user_id'] ?? 0);
                $rUid = (int) ($rt['created_by_id'] ?? 0);
                $cpRec = findCheckpointRecord($stockWarehouses, $eventVenues, (string) $rt['checkpoint_type'], (string) $rt['checkpoint_id']);
                $reliefTokens[] = [
                    'id' => (int) $rt['id'],
                    'shift_request_id' => (int) ($rt['shift_request_id'] ?? 0),
                    'assigned_user_id' => $tUid,
                    'target_user_id' => $tUid,
                    'target_name' => isset($crewById[$tUid]) ? $crewById[$tUid]['full_name'] : ('User #' . $tUid),
                    'created_by_id' => $rUid,
                    'requested_by_name' => isset($crewById[$rUid]) ? $crewById[$rUid]['full_name'] : 'Supervisor',
                    'checkpoint_type' => (string) $rt['checkpoint_type'],
                    'checkpoint_id' => (string) $rt['checkpoint_id'],
                    'checkpoint_name' => (string) ($rt['checkpoint_name'] ?: ($cpRec ? $cpRec['name'] : ($rt['checkpoint_type'] . ' #' . $rt['checkpoint_id']))),
                    'geofence_radius_m' => (int) ($rt['geofence_radius_m'] ?? 200),
                    'require_totp' => (int) ($rt['require_totp'] ?? 1),
                    'require_geofence' => (int) ($rt['require_geofence'] ?? 1),
                    'expires_at' => (string) ($rt['expires_at'] ?? ''),
                    'is_expired' => !empty($rt['expires_at']) && strtotime((string) $rt['expires_at']) < time(),
                    'redeemed_at' => $rt['redeemed_at'] ?: null,
                    'distance_m' => $rt['distance_m'] !== null ? (int) $rt['distance_m'] : null,
                    'override_used' => (int) ($rt['override_used'] ?? 0),
                    'created_at' => (string) ($rt['created_at'] ?? ''),
                ];
            }
        } catch (Throwable $e) {}
    }

    // 11. Load Random Roll-Call Sessions & Pending Challenge for Current User
    $rollCallSessions = [];
    $myPendingRollCall = null;
    try {
        $rcSessRows = $pdo->query("SELECT * FROM `roll_call_sessions` ORDER BY CASE WHEN `status` IN ('active','awaiting_review') THEN 0 ELSE 1 END, `id` DESC LIMIT 12")->fetchAll(PDO::FETCH_ASSOC);
        $entryStmt = $pdo->prepare("SELECT * FROM `roll_call_entries` WHERE `session_id` = ? ORDER BY `id` ASC");
        foreach ($rcSessRows as $rs) {
            $sid = (int) $rs['id'];
            $entryStmt->execute([$sid]);
            $eRows = $entryStmt->fetchAll(PDO::FETCH_ASSOC);
            $entriesOut = [];
            $counts = ['total' => 0, 'present' => 0, 'pending' => 0, 'absent' => 0, 'timed_out' => 0, 'unaccounted' => 0, 'excused' => 0];
            foreach ($eRows as $er) {
                $eUid = (int) ($er['user_id'] ?? 0);
                $eSt = strtolower((string) ($er['status'] ?? 'pending'));
                $counts['total']++;
                if (isset($counts[$eSt])) {
                    $counts[$eSt]++;
                }
                $uObj = $crewById[$eUid] ?? null;
                $eOut = [
                    'id' => (int) $er['id'],
                    'session_id' => $sid,
                    'user_id' => $eUid,
                    'full_name' => $uObj ? $uObj['full_name'] : ('User #' . $eUid),
                    'role_display' => $uObj ? $uObj['role_display'] : '',
                    'department' => $uObj ? $uObj['department'] : '',
                    'badge_code' => $uObj ? $uObj['badge_code'] : formatRewBadgeCode($eUid, null),
                    'initials' => $uObj ? $uObj['initials'] : 'CR',
                    'profile_image_url' => $uObj ? $uObj['profile_image_url'] : null,
                    'checkpoint_type' => (string) ($er['checkpoint_type'] ?? 'event_venue'),
                    'checkpoint_id' => (string) ($er['checkpoint_id'] ?? '1'),
                    'checkpoint_name' => (string) ($er['checkpoint_name'] ?? 'Site Checkpoint'),
                    'status' => $eSt,
                    'verification_method' => $er['verification_method'] ?: null,
                    'distance_m' => $er['distance_m'] !== null ? (int) $er['distance_m'] : null,
                    'verified_at' => $er['verified_at'] ?: null,
                    'notes' => (string) ($er['notes'] ?? ''),
                ];
                $entriesOut[] = $eOut;

                if ($authUserId > 0 && $eUid === $authUserId && $eSt === 'pending' && strtolower((string) $rs['status']) === 'active' && !$myPendingRollCall) {
                    $myPendingRollCall = [
                        'session_id' => $sid,
                        'entry_id' => (int) $er['id'],
                        'checkpoint_type' => (string) ($er['checkpoint_type'] ?? 'event_venue'),
                        'checkpoint_id' => (string) ($er['checkpoint_id'] ?? '1'),
                        'checkpoint_name' => (string) ($er['checkpoint_name'] ?? 'Site Checkpoint'),
                        'require_geo_or_qr' => (int) ($rs['require_geo_or_qr'] ?? 1),
                        'auto_checkout_on_miss' => (int) ($rs['auto_checkout_on_miss'] ?? 1),
                        'deadline_at' => (string) $rs['deadline_at'],
                        'seconds_left' => max(0, (strtotime((string) $rs['deadline_at']) ?: time()) - time()),
                    ];
                }
            }
            $trigUid = (int) ($rs['triggered_by_id'] ?? 0);
            $rollCallSessions[] = [
                'id' => $sid,
                'checkpoint_type' => (string) ($rs['checkpoint_type'] ?? 'all'),
                'checkpoint_id' => (string) ($rs['checkpoint_id'] ?? 'all'),
                'checkpoint_name' => (string) ($rs['checkpoint_name'] ?? 'All Checkpoints'),
                'triggered_by_id' => $trigUid,
                'triggered_by_name' => isset($crewById[$trigUid]) ? $crewById[$trigUid]['full_name'] : 'Supervisor',
                'selection_mode' => (string) ($rs['selection_mode'] ?? 'random_count'),
                'sample_value' => (int) ($rs['sample_value'] ?? 5),
                'require_geo_or_qr' => (int) ($rs['require_geo_or_qr'] ?? 1),
                'auto_checkout_on_miss' => (int) ($rs['auto_checkout_on_miss'] ?? 1),
                'deadline_at' => (string) ($rs['deadline_at'] ?? ''),
                'seconds_left' => max(0, (strtotime((string) ($rs['deadline_at'] ?? '')) ?: time()) - time()),
                'status' => strtolower((string) ($rs['status'] ?? 'active')),
                'created_at' => (string) ($rs['created_at'] ?? ''),
                'closed_at' => $rs['closed_at'] ?: null,
                'counts' => $counts,
                'entries' => $entriesOut,
            ];
        }
    } catch (Throwable $e) {}

    // 12. Load Event Crew Confirmations, Support Requests & Dispatch Action Logs
    $eventCrewAssignments = [];
    $myPendingAssignments = [];
    $evByAnyId = [];
    foreach ($eventVenues as $evObj) {
        $evByAnyId[(string) $evObj['raw_id']] = $evObj;
        $evByAnyId[(string) $evObj['id']] = $evObj;
    }
    try {
        $ecaRows = $pdo->query("SELECT * FROM `event_crew_assignments` ORDER BY `id` DESC")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($ecaRows as $eca) {
            $eId = (string) ($eca['event_id'] ?? '');
            $uId = (int) ($eca['user_id'] ?? 0);
            $uObj = $crewById[$uId] ?? null;
            $asgBy = (int) ($eca['assigned_by_id'] ?? 0);
            $rec = [
                'id' => (int) $eca['id'],
                'event_id' => $eId,
                'user_id' => $uId,
                'full_name' => $uObj ? $uObj['full_name'] : ('User #' . $uId),
                'role_display' => $uObj ? $uObj['role_display'] : '',
                'department' => $uObj ? $uObj['department'] : '',
                'branch_dept' => (string) ($eca['branch_dept'] ?? 'Sound'),
                'role_slot' => (string) ($eca['role_slot'] ?? ''),
                'assigned_by_id' => $asgBy,
                'assigned_by_name' => isset($crewById[$asgBy]) ? $crewById[$asgBy]['full_name'] : 'Supervisor',
                'confirmation_status' => strtolower((string) ($eca['confirmation_status'] ?? 'pending')),
                'decline_reason' => (string) ($eca['decline_reason'] ?? ''),
                'assigned_at' => (string) ($eca['assigned_at'] ?? ''),
                'responded_at' => $eca['responded_at'] ?: null,
            ];
            if (!isset($eventCrewAssignments[$eId])) {
                $eventCrewAssignments[$eId] = [];
            }
            $eventCrewAssignments[$eId][(string) $uId] = $rec;

            if ($authUserId > 0 && $uId === $authUserId) {
                $evMeta = $evByAnyId[$eId] ?? null;
                $myPendingAssignments[] = array_merge($rec, [
                    'event_title' => $evMeta ? $evMeta['title'] : ('Event #' . $eId),
                    'event_location' => $evMeta ? $evMeta['location'] : '',
                    'event_date' => $evMeta ? $evMeta['date'] : '',
                    'call_time' => $evMeta ? $evMeta['call_time'] : '08:00',
                    'tech_lead' => $evMeta ? $evMeta['tech_lead'] : '',
                    'project_manager' => $evMeta ? $evMeta['project_manager'] : '',
                ]);
            }
        }
    } catch (Throwable $e) {}

    $eventSupportRequests = [];
    try {
        $esrRows = $pdo->query("SELECT * FROM `event_support_requests` ORDER BY CASE WHEN `status` = 'pending' THEN 0 ELSE 1 END, `id` DESC LIMIT 40")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($esrRows as $esr) {
            $eId = (string) ($esr['event_id'] ?? '');
            $reqUid = (int) ($esr['requested_by_id'] ?? 0);
            $fulUid = (int) ($esr['fulfilled_by_id'] ?? 0);
            $evMeta = $evByAnyId[$eId] ?? null;
            $assignedUids = json_decode((string) ($esr['assigned_user_ids_json'] ?? '[]'), true) ?: [];
            $assignedNames = [];
            foreach ($assignedUids as $auid) {
                if (isset($crewById[(int) $auid])) {
                    $assignedNames[] = $crewById[(int) $auid]['full_name'];
                }
            }
            $eventSupportRequests[] = [
                'id' => (int) $esr['id'],
                'event_id' => $eId,
                'event_title' => $evMeta ? $evMeta['title'] : ('Event #' . $eId),
                'requested_by_id' => $reqUid,
                'requested_by_name' => isset($crewById[$reqUid]) ? $crewById[$reqUid]['full_name'] : 'Coordinator',
                'requested_roles' => json_decode((string) ($esr['requested_roles_json'] ?? '{}'), true) ?: [],
                'notes' => (string) ($esr['notes'] ?? ''),
                'status' => strtolower((string) ($esr['status'] ?? 'pending')),
                'fulfilled_by_id' => $fulUid > 0 ? $fulUid : null,
                'fulfilled_by_name' => ($fulUid > 0 && isset($crewById[$fulUid])) ? $crewById[$fulUid]['full_name'] : null,
                'assigned_user_ids' => array_map('intval', $assignedUids),
                'assigned_names' => $assignedNames,
                'created_at' => (string) ($esr['created_at'] ?? ''),
                'fulfilled_at' => $esr['fulfilled_at'] ?: null,
            ];
        }
    } catch (Throwable $e) {}

    $eventDispatchLogs = [];
    try {
        $edlRows = $pdo->query("SELECT * FROM `event_dispatch_logs` ORDER BY `id` DESC LIMIT 80")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($edlRows as $edl) {
            $aUid = (int) ($edl['actor_id'] ?? 0);
            $eId = (string) ($edl['event_id'] ?? '');
            $evMeta = $evByAnyId[$eId] ?? null;
            $eventDispatchLogs[] = [
                'id' => (int) $edl['id'],
                'event_id' => $eId,
                'event_title' => $evMeta ? $evMeta['title'] : ('Event #' . $eId),
                'actor_id' => $aUid,
                'actor_name' => isset($crewById[$aUid]) ? $crewById[$aUid]['full_name'] : 'System',
                'actor_role' => (string) ($edl['actor_role'] ?? ''),
                'actor_role_display' => formatRoleDisplay((string) ($edl['actor_role'] ?? '')),
                'action_type' => (string) ($edl['action_type'] ?? ''),
                'summary' => (string) ($edl['summary'] ?? ''),
                'payload' => json_decode((string) ($edl['payload_json'] ?? 'null'), true),
                'created_at' => (string) ($edl['created_at'] ?? ''),
            ];
        }
    } catch (Throwable $e) {}

    $eventDeptConfirmations = [];
    try {
        $edcRows = $pdo->query("SELECT * FROM `event_dept_confirmations` ORDER BY `id` DESC LIMIT 200")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($edcRows as $edc) {
            $eId = (string) ($edc['event_id'] ?? '');
            $uId = (int) ($edc['user_id'] ?? 0);
            $uObj = $crewById[$uId] ?? null;
            if (!isset($eventDeptConfirmations[$eId])) {
                $eventDeptConfirmations[$eId] = [];
            }
            $eventDeptConfirmations[$eId][] = [
                'id' => (int) $edc['id'],
                'event_id' => $eId,
                'user_id' => $uId,
                'full_name' => $uObj ? $uObj['full_name'] : 'Tech Lead',
                'role_display' => $uObj ? $uObj['role_display'] : 'Technical Lead',
                'user_department' => $uObj ? $uObj['department'] : '',
                'department' => (string) ($edc['department'] ?? 'General'),
                'confirmation_status' => strtolower((string) ($edc['confirmation_status'] ?? 'confirmed')),
                'comment' => (string) ($edc['comment'] ?? ''),
                'created_at' => (string) ($edc['created_at'] ?? ''),
            ];
        }
    } catch (Throwable $e) {}

    return [
        'ok' => true,
        'dbSource' => $activeDb,
        'csrfToken' => getSessionCsrfToken(),
        'currentUser' => $currentUser,
        'totpEnabled' => $totpEnabled,
        'reliefTokens' => $reliefTokens,
        'roleCapabilities' => getRoleCapabilitiesSpec(),
        'rollCallSessions' => $rollCallSessions,
        'myPendingRollCall' => $myPendingRollCall,
        'eventCrewAssignments' => $eventCrewAssignments,
        'eventSupportRequests' => $eventSupportRequests,
        'myPendingAssignments' => $myPendingAssignments,
        'eventDispatchLogs' => $eventDispatchLogs,
        'eventDeptConfirmations' => $eventDeptConfirmations,
        'brandingConfig' => getBrandingConfig($pdo),
        'brandingFonts' => getBrandingFontsList($pdo),
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
        'shiftRequests' => $shiftRequests,
        'pendingShiftRequestCount' => $pendingShiftRequestCount,
        'defaultVerification' => $defaultVerification,
        'roles' => getRolesList($pdo, $crew),
        'departments' => getDepartmentsList($pdo, $crew),
        'navigationConfig' => getNavigationConfig($pdo),
        'overviewWidgetsConfig' => getOverviewWidgetsConfig($pdo),
        'standalonePortals' => getStandalonePortalsList($pdo, $canSeeTerminalPins),
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

function resolveScanInputWithAntiShadowing(
    PDO $pdo,
    array $crew,
    array $activeCp,
    string $scanInput,
    string $scanMode,
    bool $visualConfirmed = false,
    bool $hasManualUserId = false,
    bool $hasSupervisorPin = false
): array {
    $cleanInput = trim($scanInput);
    $cpType = (string) ($activeCp['type'] ?? 'stock_warehouse');
    $cpId = (string) ($activeCp['raw_id'] ?? $activeCp['id'] ?? '1');
    $cpPolicy = strtolower((string) ($activeCp['checkin_policy'] ?? 'hybrid'));
    $reqVisual = ((int) ($activeCp['require_visual_match'] ?? 1) === 1);

    // 1. Dynamic Anti-Shadowing Pass QR (`ABPASS1.<uid>.<slice>.<nonce>.<sig>`)
    if (strpos($cleanInput, 'ABPASS1.') === 0) {
        $parsed = verifySignedDynamicPassToken($pdo, $cleanInput, 30);
        if (!$parsed || empty($parsed['valid'])) {
            return [
                'ok' => false,
                'allowed' => false,
                'error' => ($parsed['error'] ?? 'Invalid or expired Dynamic Pass QR.'),
                'reason' => 'Dynamic Pass QR rejected',
            ];
        }
        $targetUid = (int) $parsed['user_id'];
        $targetMember = null;
        foreach ($crew as $cm) {
            if ((int) $cm['id'] === $targetUid) {
                $targetMember = $cm;
                break;
            }
        }
        if (!$targetMember) {
            return [
                'ok' => false,
                'allowed' => false,
                'error' => 'Dynamic QR belongs to an unknown or inactive staff member.',
            ];
        }

        // If gate requires visual face-match confirmation before committing Check-In/Out
        if ($reqVisual && !$visualConfirmed && $scanMode !== 'verify_only') {
            $eval = evaluateCheckpointAccess($targetMember, $cpType, (int) ($activeCp['id'] ?? 1));
            $wouldAction = ($scanMode === 'check_in' || $scanMode === 'check_out')
                ? $scanMode
                : (($targetMember['daily_state'] ?? 'ready') === 'checked_in' ? 'check_out' : 'check_in');
            $preview = buildVerificationCardPayload($pdo, $targetMember, $cpType, (int) ($activeCp['id'] ?? 1), (string) ($activeCp['name'] ?? 'Gate'), [
                'allowed' => (bool) $eval['allowed'],
                'reason' => $eval['allowed']
                    ? 'Live 30s QR verified — confirm presenter face matches photo to complete ' . strtoupper(str_replace('_', ' ', $wouldAction))
                    : (string) $eval['reason'],
                'action' => $wouldAction,
            ]);
            $preview['visual_confirm_required'] = (bool) $eval['allowed'];
            $preview['pending_pass_token'] = $cleanInput;
            $preview['checkin_method'] = 'dynamic_pass_qr';
            return ['ok' => true, 'hold_preview' => $preview];
        }

        if ($scanMode !== 'verify_only') {
            $consumed = consumeQrNonce($pdo, (string) $parsed['nonce'], $targetUid, 'pass', $cpType, $cpId, 120);
            if (!$consumed) {
                return [
                    'ok' => false,
                    'allowed' => false,
                    'error' => 'Anti-shadowing lock: This 30-second Pass QR was already scanned. Ask the presenter to show their newly rotated QR.',
                    'reason' => 'Duplicate QR screenshot replay blocked',
                ];
            }
        }

        return [
            'ok' => true,
            'member' => $targetMember,
            'checkin_method' => 'dynamic_pass_qr',
        ];
    }

    // 2. Manual Name / Static Badge Lookup ("Enter Name + Click Checkin" or RFID/Barcode)
    $targetMember = findCrewMemberByScanInput($crew, $cleanInput);
    if (!$targetMember) {
        return [
            'ok' => false,
            'allowed' => false,
            'error' => "No staff badge or crew member matched '{$cleanInput}'. Try scanning a live QR, REW-BADGE-0006, or staff name.",
            'reason' => "Unrecognized Badge Code ({$cleanInput})",
        ];
    }

    $looksLikeBadge = (stripos($cleanInput, 'REW-BADGE-') === 0 || stripos($cleanInput, 'RFID-') === 0 || stripos($cleanInput, 'ABL-') === 0);
    $methodUsed = ($hasManualUserId || !$looksLikeBadge) ? 'manual_name' : 'badge_scan';

    if ($cpPolicy === 'qr_strict' && !$hasSupervisorPin && $scanMode !== 'verify_only') {
        return [
            'ok' => false,
            'allowed' => false,
            'error' => "Strict QR Policy active at {$activeCp['name']}: scan the live anti-shadowing QR or provide a Supervisor Override PIN for manual Name Check-In.",
            'reason' => 'Manual Name Check-In blocked under QR Strict policy',
        ];
    }

    return [
        'ok' => true,
        'member' => $targetMember,
        'checkin_method' => $methodUsed,
    ];
}

function executeGateScan(
    PDO $pdo,
    string $activeDb,
    array $activeCp,
    array $targetMember,
    string $scanMode = 'auto',
    int $scannedBy = 0,
    ?int $effectiveTs = null,
    bool $isOfflineSync = false,
    array $auditMeta = []
): array {
    $effectiveTs = $effectiveTs ?? time();
    $effectiveScannedAtSql = date('Y-m-d H:i:s', $effectiveTs);
    $effectiveDateStr = date('Y-m-d', $effectiveTs);
    $checkinMethod = trim((string) ($auditMeta['checkin_method'] ?? ($isOfflineSync ? 'offline_operator_visual' : 'badge_scan')));
    $verifiedLat = isset($auditMeta['verified_lat']) && $auditMeta['verified_lat'] !== null ? (float) $auditMeta['verified_lat'] : null;
    $verifiedLng = isset($auditMeta['verified_lng']) && $auditMeta['verified_lng'] !== null ? (float) $auditMeta['verified_lng'] : null;
    $distanceM = isset($auditMeta['distance_m']) && $auditMeta['distance_m'] !== null ? (int) $auditMeta['distance_m'] : null;
    $deviceId = isset($auditMeta['device_id']) && $auditMeta['device_id'] !== null ? (int) $auditMeta['device_id'] : null;

    $cpType = (string) ($activeCp['type'] ?? 'stock_warehouse');
    $cpId = (int) ($activeCp['id'] ?? 1);
    $cpName = (string) ($activeCp['name'] ?? 'Facility Gate');
    $callTime = (string) ($activeCp['call_time'] ?? '08:00');

    $eval = evaluateCheckpointAccess($targetMember, $cpType, $cpId);
    $allowed = (bool) $eval['allowed'];
    $reason = (string) $eval['reason'];

    $isCrossFacilityTransfer = false;
    $prevFacilityName = null;

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

        $isCrossFacilityTransfer = $isCurrentlyCheckedIn && (
            ($prevCpType !== '' && $prevCpType !== $cpType) ||
            ($prevCpId > 0 && $prevCpId !== $cpId)
        );

        if ($scanMode === 'check_out' && !$isCurrentlyCheckedIn) {
            return [
                'ok' => false,
                'allowed' => false,
                'error' => "{$targetMember['full_name']} is already checked out (not currently checked in).",
            ];
        }
        if ($scanMode === 'check_in' && $isCurrentlyCheckedIn && !$isCrossFacilityTransfer) {
            return [
                'ok' => false,
                'allowed' => false,
                'error' => "{$targetMember['full_name']} is already checked in at {$cpName}.",
            ];
        }

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
                $currentPayload = buildFullPayload($pdo, $activeDb, $cpType, $cpId);
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
                return $verification;
            }
        }

        if ($isCrossFacilityTransfer) {
            $prevFacilityName = $prevCpName ?: ($prevCpType === 'stock_warehouse' ? 'Ndera Warehouse' : 'Kigali Convention Centre');
            $transitOutNotes = "Transit departure → Transferred to {$cpName}";

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

            $resolvedAction = 'check_in';
            $reason = "Authorized for {$cpName} — Arrived on site from {$prevFacilityName}";
        } elseif ($scanMode === 'verify_only') {
            $resolvedAction = 'access_verify';
        } elseif ($scanMode === 'check_in') {
            $resolvedAction = 'check_in';
        } elseif ($scanMode === 'check_out') {
            $resolvedAction = 'check_out';
        } else {
            $resolvedAction = $isCurrentlyCheckedIn ? 'check_out' : 'check_in';
        }
    }

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

    $insStmt = $pdo->prepare("
        INSERT INTO `attendance_logs`
          (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `verified_lat`, `verified_lng`, `distance_m`, `device_id`, `notes`, `scanned_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        $checkinMethod,
        $verifiedLat,
        $verifiedLng,
        $distanceM,
        $deviceId,
        $noteText,
        $effectiveScannedAtSql,
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
    return $verification;
}

function buildStandaloneGateFeedPayload(array $fullPayload, array $whRow): array
{
    $wid = (int) ($whRow['id'] ?? 1);
    $gateMeta = null;
    foreach (($fullPayload['checkpoints']['stock_warehouses'] ?? []) as $sw) {
        if ((int) ($sw['id'] ?? 0) === $wid) {
            $gateMeta = $sw;
            break;
        }
    }
    if (!$gateMeta) {
        $gateMeta = [
            'id' => $wid,
            'type' => 'stock_warehouse',
            'name' => (string) ($whRow['name'] ?? 'Facility Gate'),
            'code' => (string) ($whRow['code'] ?? 'STK'),
            'location' => (string) ($whRow['location'] ?? 'Kigali'),
            'open_time' => substr((string) ($whRow['open_time'] ?? '08:00:00'), 0, 5),
            'close_time' => substr((string) ($whRow['close_time'] ?? '18:00:00'), 0, 5),
            'call_time' => substr((string) ($whRow['open_time'] ?? '08:00:00'), 0, 5),
            'controller_name' => (string) ($whRow['controller_name'] ?? ''),
            'geofence_radius_m' => (int) ($whRow['geofence_radius_m'] ?? 200),
            'checkin_policy' => (string) ($whRow['checkin_policy'] ?? 'hybrid'),
            'require_visual_match' => (int) ($whRow['require_visual_match'] ?? 1),
            'on_site_now' => 0,
            'checked_in_today' => 0,
            'denied_today' => 0,
        ];
    }
    unset($gateMeta['terminal_pin']);

    $crew = [];
    foreach (($fullPayload['crew'] ?? []) as $c) {
        if ((int) ($c['is_active'] ?? 1) === 0) {
            continue;
        }
        $crew[] = [
            'id' => (int) ($c['id'] ?? 0),
            'full_name' => (string) ($c['full_name'] ?? ''),
            'username' => (string) ($c['username'] ?? ''),
            'role' => (string) ($c['role'] ?? 'user'),
            'role_display' => (string) ($c['role_display'] ?? ''),
            'department' => (string) ($c['department'] ?? ''),
            'phone' => (string) ($c['phone'] ?? ''),
            'initials' => (string) ($c['initials'] ?? 'U'),
            'profile_image_url' => $c['profile_image_url'] ?? null,
            'badge_code' => (string) ($c['badge_code'] ?? ''),
            'rfid_uid' => (string) ($c['rfid_uid'] ?? ''),
            'clearance_code' => (string) ($c['clearance_code'] ?? 'L1'),
            'clearance_color' => (string) ($c['clearance_color'] ?? '#64748b'),
            'badge_status' => (string) ($c['badge_status'] ?? 'active'),
            'stock_authorized' => (bool) ($c['stock_authorized'] ?? false),
            'checkpoint_authorized' => (bool) ($c['checkpoint_authorized'] ?? false),
            'checkpoint_auth_reason' => (string) ($c['checkpoint_auth_reason'] ?? ''),
            'daily_state' => (string) ($c['daily_state'] ?? 'ready'),
            'check_in_time' => $c['check_in_time'] ?? null,
            'check_out_time' => $c['check_out_time'] ?? null,
            'last_checkpoint_type' => $c['last_checkpoint_type'] ?? null,
            'last_checkpoint_id' => $c['last_checkpoint_id'] ?? null,
            'last_checkpoint_name' => $c['last_checkpoint_name'] ?? null,
            'trusted_device_count' => (int) ($c['trusted_device_count'] ?? 0),
            'punctuality' => (string) ($c['punctuality'] ?? 'READY'),
        ];
    }

    $recentLogs = [];
    foreach (($fullPayload['activityTimeline'] ?? []) as $tl) {
        if (($tl['checkpoint_type'] ?? '') === 'stock_warehouse' && (int) ($tl['checkpoint_id'] ?? 0) === $wid) {
            $recentLogs[] = [
                'id' => (int) ($tl['id'] ?? 0),
                'full_name' => (string) ($tl['full_name'] ?? ''),
                'badge_code' => (string) ($tl['badge_code'] ?? ''),
                'clearance_code' => (string) ($tl['clearance_code'] ?? ''),
                'action_title' => (string) ($tl['action_title'] ?? ''),
                'access_status' => (string) ($tl['access_status'] ?? 'granted'),
                'formatted_time' => (string) ($tl['formatted_time'] ?? ''),
            ];
            if (count($recentLogs) >= 8) break;
        }
    }

    return [
        'ok' => true,
        'authorized' => true,
        'generated_at' => date('h:i:s A'),
        'gate' => $gateMeta,
        'crew' => $crew,
        'recentLogs' => $recentLogs,
    ];
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
    $publicActions = [
        'login',
        'logout',
        'auth_status',
        'get_current_user',
        'onsite_portal_login',
        'onsite_portal_logout',
        'onsite_public_feed',
        'standalone_gate_unlock',
        'standalone_gate_lock',
        'standalone_gate_feed',
        'standalone_gate_scan',
        'issue_venue_checkin_qr',
        'get_venue_checkin_info',
        'redeem_venue_checkin_qr',
        'get_relief_token_info',
        'redeem_relief_qr',
    ];
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
        && !in_array($action, ['login', 'logout', 'onsite_portal_login', 'onsite_portal_logout', 'standalone_gate_unlock', 'standalone_gate_lock'], true)
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

    if ($action === 'onsite_portal_login') {
        $cfg = ensureOnsiteShareSettings($pdo);
        if (!$cfg['enabled']) {
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'error' => 'The shared Technician On-Site link is currently disabled by an Administrator.',
            ]);
            exit;
        }
        $clientIp = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'local'));
        $rateKey = 'onsite_portal:' . sha1(strtolower($clientIp));
        $rateCheck = checkSecurityRateLimit($pdo, $rateKey, 5, 600);
        if (!$rateCheck['allowed']) {
            http_response_code(429);
            echo json_encode([
                'ok' => false,
                'error' => "Too many failed attempts. Please wait {$rateCheck['retry_after']}s and try again.",
            ]);
            exit;
        }

        $password = (string) ($_POST['password'] ?? $jsonBody['password'] ?? '');
        if ($password === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Please enter the shared technician access password.']);
            exit;
        }
        if ($cfg['password_hash'] === '' || !password_verify($password, $cfg['password_hash'])) {
            recordFailedRateLimit($pdo, $rateKey, 5, 600, 60);
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Incorrect shared technician password.']);
            exit;
        }

        clearSecurityRateLimit($pdo, $rateKey);
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_regenerate_id(true);
        }
        $_SESSION['onsite_viewer_authorized'] = true;
        $_SESSION['onsite_viewer_ver'] = (int) $cfg['session_ver'];
        echo json_encode(['ok' => true, 'authorized' => true]);
        exit;
    }

    if ($action === 'onsite_portal_logout') {
        unset($_SESSION['onsite_viewer_authorized'], $_SESSION['onsite_viewer_ver']);
        echo json_encode(['ok' => true, 'authorized' => false]);
        exit;
    }

    if ($action === 'onsite_public_feed') {
        $cfg = ensureOnsiteShareSettings($pdo);
        $portalCfg = resolveStandalonePortalConfig($pdo, 'onsite');
        $hasSharedViewer = isOnsiteViewerSessionAuthorized($pdo);
        $hasOperatorSession = !empty($_SESSION['auth_user_id']);
        if (!$hasSharedViewer && !$hasOperatorSession) {
            http_response_code(401);
            echo json_encode([
                'ok' => false,
                'authorized' => false,
                'enabled' => (bool) $cfg['enabled'],
                'error' => 'Technician access password required to view who is on site.',
            ]);
            exit;
        }
        $portalExpired = ($portalCfg && !empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time());
        $portalDisabled = ($portalCfg && (int) ($portalCfg['is_active'] ?? 1) === 0);
        if (($hasSharedViewer && !$cfg['enabled'] && !$hasOperatorSession) || (($portalExpired || $portalDisabled) && !$hasOperatorSession)) {
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'authorized' => false,
                'enabled' => false,
                'expired' => $portalExpired,
                'error' => $portalExpired
                    ? ('This shared link expired on ' . $portalCfg['expires_at'] . '. Contact an Administrator to extend access.')
                    : 'Shared link has been disabled by Administrator.',
            ]);
            exit;
        }

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $rc = $full['rollCallList'] ?? [];
        if ($portalCfg && (int) ($portalCfg['mask_phones'] ?? 0) === 1) {
            foreach ($rc as &$rcItem) {
                if (!empty($rcItem['phone'])) {
                    $rcItem['phone'] = maskPhoneNumber((string) $rcItem['phone']);
                }
            }
            unset($rcItem);
        }
        $cpSummaries = [];
        foreach (($full['checkpoints']['directory'] ?? []) as $cp) {
            $cpSummaries[] = [
                'type' => (string) ($cp['type'] ?? 'event_venue'),
                'id' => (int) ($cp['id'] ?? 0),
                'name' => (string) ($cp['name'] ?? ''),
                'location' => (string) ($cp['location'] ?? ''),
                'call_time' => (string) ($cp['call_time'] ?? '08:00'),
                'on_site_now' => (int) ($cp['on_site_now'] ?? 0),
            ];
        }

        echo json_encode([
            'ok' => true,
            'authorized' => true,
            'enabled' => (bool) $cfg['enabled'],
            'generated_at' => date('h:i:s A'),
            'rollCallList' => $rc,
            'checkpoints' => $cpSummaries,
            'portal' => $portalCfg ? [
                'best_for' => (string) ($portalCfg['best_for'] ?? ''),
                'permissions_summary' => (string) ($portalCfg['permissions_summary'] ?? ''),
                'allow_scan' => (int) ($portalCfg['allow_scan'] ?? 0),
                'mask_phones' => (int) ($portalCfg['mask_phones'] ?? 0),
                'expires_at' => $portalCfg['expires_at'] ?? null,
            ] : null,
        ]);
        exit;
    }

    if ($action === 'standalone_gate_unlock') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $siteKey = trim((string) ($_POST['site_key'] ?? $jsonBody['site_key'] ?? $_GET['site_key'] ?? ''));
        $whId = (int) ($_POST['wh_id'] ?? $jsonBody['wh_id'] ?? $_GET['wh_id'] ?? 0);
        $pin = trim((string) ($_POST['pin'] ?? $jsonBody['pin'] ?? ''));

        $whRow = resolveStandaloneFacilityGate($pdo, $siteKey, $whId);
        if (!$whRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Facility gate terminal was not found or is inactive.']);
            exit;
        }
        $portalCfg = resolveStandalonePortalConfig($pdo, $siteKey, (int) $whRow['id']);
        if ($portalCfg && (int) ($portalCfg['is_active'] ?? 1) === 0) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'This gate portal link is disabled by an Administrator.']);
            exit;
        }
        if ($portalCfg && !empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time()) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'expired' => true, 'error' => 'This gate portal link expired on ' . $portalCfg['expires_at'] . '.']);
            exit;
        }
        $wid = (int) $whRow['id'];
        $expectedPin = resolveWarehouseTerminalPin($whRow);
        if ($expectedPin === '') {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'No Station Lock PIN is configured for this gate terminal.']);
            exit;
        }

        $clientIp = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'local'));
        $rateKey = 'standalone_gate:' . $wid . ':' . sha1(strtolower($clientIp));
        $rateCheck = checkSecurityRateLimit($pdo, $rateKey, 5, 600);
        if (!$rateCheck['allowed']) {
            http_response_code(429);
            echo json_encode([
                'ok' => false,
                'error' => "Too many failed PIN attempts. Wait {$rateCheck['retry_after']}s and try again.",
            ]);
            exit;
        }

        if ($pin === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Enter the Gate Terminal PIN to unlock.']);
            exit;
        }
        if (!verifyTerminalPinSecret($pin, $expectedPin)) {
            recordFailedRateLimit($pdo, $rateKey, 5, 600, 60);
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => "Incorrect Gate PIN for {$whRow['name']}."]);
            exit;
        }

        clearSecurityRateLimit($pdo, $rateKey);
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_regenerate_id(true);
        }
        if (!isset($_SESSION['standalone_gate_auth']) || !is_array($_SESSION['standalone_gate_auth'])) {
            $_SESSION['standalone_gate_auth'] = [];
        }
        $_SESSION['standalone_gate_auth'][$wid] = sha1($expectedPin);

        echo json_encode([
            'ok' => true,
            'authorized' => true,
            'csrf_token' => getSessionCsrfToken(),
            'gate_id' => $wid,
            'gate_name' => (string) ($whRow['name'] ?? 'Facility Gate'),
        ]);
        exit;
    }

    if ($action === 'standalone_gate_lock') {
        $siteKey = trim((string) ($_POST['site_key'] ?? $jsonBody['site_key'] ?? $_GET['site_key'] ?? ''));
        $whId = (int) ($_POST['wh_id'] ?? $jsonBody['wh_id'] ?? $_GET['wh_id'] ?? 0);
        $whRow = resolveStandaloneFacilityGate($pdo, $siteKey, $whId);
        if ($whRow && isset($_SESSION['standalone_gate_auth']) && is_array($_SESSION['standalone_gate_auth'])) {
            unset($_SESSION['standalone_gate_auth'][(int) $whRow['id']]);
        }
        echo json_encode(['ok' => true, 'authorized' => false]);
        exit;
    }

    if ($action === 'standalone_gate_feed') {
        $siteKey = trim((string) ($_GET['site_key'] ?? $_POST['site_key'] ?? $jsonBody['site_key'] ?? ''));
        $whId = (int) ($_GET['wh_id'] ?? $_POST['wh_id'] ?? $jsonBody['wh_id'] ?? 0);
        $whRow = resolveStandaloneFacilityGate($pdo, $siteKey, $whId);
        if (!$whRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'authorized' => false, 'error' => 'Facility gate location not found.']);
            exit;
        }
        if (!isStandaloneGateAuthorized($pdo, $whRow)) {
            http_response_code(401);
            echo json_encode([
                'ok' => false,
                'authorized' => false,
                'error' => "Enter Gate PIN to unlock {$whRow['name']}.",
            ]);
            exit;
        }

        $portalCfg = resolveStandalonePortalConfig($pdo, $siteKey, (int) $whRow['id']);
        if ($portalCfg && (((int) ($portalCfg['is_active'] ?? 1) === 0) || (!empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time()))) {
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'authorized' => false,
                'expired' => !empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time(),
                'error' => 'This shared gate portal link is expired or disabled.',
            ]);
            exit;
        }

        $full = buildFullPayload($pdo, $activeDb, 'stock_warehouse', (int) $whRow['id']);
        $feed = buildStandaloneGateFeedPayload($full, $whRow);
        if ($portalCfg) {
            if ((int) ($portalCfg['mask_phones'] ?? 0) === 1 && !empty($feed['crew'])) {
                foreach ($feed['crew'] as &$fc) {
                    if (!empty($fc['phone'])) {
                        $fc['phone'] = maskPhoneNumber((string) $fc['phone']);
                    }
                }
                unset($fc);
            }
            $feed['portal'] = [
                'best_for' => (string) ($portalCfg['best_for'] ?? ''),
                'permissions_summary' => (string) ($portalCfg['permissions_summary'] ?? ''),
                'allow_scan' => (int) ($portalCfg['allow_scan'] ?? 1),
                'mask_phones' => (int) ($portalCfg['mask_phones'] ?? 0),
                'expires_at' => $portalCfg['expires_at'] ?? null,
            ];
        }
        $feed['csrf_token'] = getSessionCsrfToken();
        echo json_encode($feed);
        exit;
    }

    if ($action === 'standalone_gate_scan') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'allowed' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        if (!validateCsrfForAuthenticatedPost($jsonBody)) {
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'allowed' => false,
                'error' => 'Invalid or expired terminal token. Refresh the gate page and try again.',
            ]);
            exit;
        }

        $siteKey = trim((string) ($_POST['site_key'] ?? $jsonBody['site_key'] ?? $_GET['site_key'] ?? ''));
        $whId = (int) ($_POST['wh_id'] ?? $jsonBody['wh_id'] ?? $_GET['wh_id'] ?? 0);
        $whRow = resolveStandaloneFacilityGate($pdo, $siteKey, $whId);
        if (!$whRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'allowed' => false, 'error' => 'Facility gate location not found.']);
            exit;
        }
        $portalCfg = resolveStandalonePortalConfig($pdo, $siteKey, (int) $whRow['id']);
        if ($portalCfg && (((int) ($portalCfg['is_active'] ?? 1) === 0) || (!empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time()))) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'allowed' => false, 'error' => 'This gate portal link is expired or disabled.']);
            exit;
        }
        if ($portalCfg && (int) ($portalCfg['allow_scan'] ?? 1) === 0) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'allowed' => false, 'error' => 'Scanning disabled: this portal link is Read-Only under Permissions & Limitations.']);
            exit;
        }
        if (!isStandaloneGateAuthorized($pdo, $whRow)) {
            http_response_code(401);
            echo json_encode([
                'ok' => false,
                'authorized' => false,
                'allowed' => false,
                'error' => "Gate session locked. Enter PIN to unlock {$whRow['name']}.",
            ]);
            exit;
        }

        $wid = (int) $whRow['id'];
        $scanInput = trim((string) ($_POST['scan_input'] ?? $jsonBody['scan_input'] ?? ''));
        $reqUserId = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        $scanMode = strtolower(trim((string) ($_POST['scan_mode'] ?? $jsonBody['scan_mode'] ?? 'auto')));
        if (!in_array($scanMode, ['auto', 'check_in', 'check_out', 'verify_only'], true)) {
            $scanMode = 'auto';
        }
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

        $currentPayload = buildFullPayload($pdo, $activeDb, 'stock_warehouse', $wid);
        $activeCp = $currentPayload['activeCheckpoint'];
        $visualConfirmed = !empty($_POST['visual_confirmed']) || !empty($jsonBody['visual_confirmed']);
        $lookupKey = $reqUserId > 0 ? (string) $reqUserId : $scanInput;

        $resolved = resolveScanInputWithAntiShadowing(
            $pdo,
            $currentPayload['crew'],
            $activeCp,
            $lookupKey,
            $scanMode,
            $visualConfirmed,
            $reqUserId > 0,
            false
        );
        if (empty($resolved['ok'])) {
            echo json_encode($resolved);
            exit;
        }
        if (!empty($resolved['hold_preview'])) {
            $preview = $resolved['hold_preview'];
            $preview['feed'] = buildStandaloneGateFeedPayload($currentPayload, $whRow);
            echo json_encode($preview);
            exit;
        }
        $targetMember = $resolved['member'];

        $scannedBy = !empty($_SESSION['auth_user_id']) ? (int) $_SESSION['auth_user_id'] : 1;
        $result = executeGateScan(
            $pdo,
            $activeDb,
            $activeCp,
            $targetMember,
            $scanMode,
            $scannedBy,
            $effectiveTs,
            $isOfflineSync,
            ['checkin_method' => $isOfflineSync ? 'offline_operator_visual' : ($resolved['checkin_method'] ?? 'badge_scan')]
        );

        if (isset($result['bootstrap']) && is_array($result['bootstrap'])) {
            $result['feed'] = buildStandaloneGateFeedPayload($result['bootstrap'], $whRow);
            unset($result['bootstrap']);
        }
        echo json_encode($result);
        exit;
    }

    if ($action === 'get_onsite_share_config') {
        $caller = requireAuthorizedCaller(
            $pdo,
            ['admin', 'administrator', 'manager', 'project_manager', 'stock_manager', 'tech_lead', 'technical_lead'],
            'Permission denied: Viewing technician on-site share settings requires Supervisor or Administrator privileges.'
        );
        $cfg = ensureOnsiteShareSettings($pdo);
        $cRole = strtolower(trim((string) ($caller['role'] ?? '')));
        $canManage = in_array($cRole, ['admin', 'administrator', 'manager', 'stock_manager'], true);
        echo json_encode([
            'ok' => true,
            'enabled' => (bool) $cfg['enabled'],
            'session_ver' => (int) $cfg['session_ver'],
            'is_default_password' => (bool) $cfg['is_default'],
            'default_password_preview' => $cfg['is_default'] ? getDefaultOnsiteTechnicianPassword() : null,
            'can_manage' => $canManage,
            'share_path' => 'onsite.php',
        ]);
        exit;
    }

    if ($action === 'save_onsite_share_config') {
        requireAuthorizedCaller(
            $pdo,
            ['admin', 'administrator', 'manager', 'stock_manager'],
            'Permission denied: Updating the technician on-site link or password requires Site Manager or Administrator privileges.'
        );
        $enabledInput = $_POST['enabled'] ?? $jsonBody['enabled'] ?? null;
        $newPassword = trim((string) ($_POST['password'] ?? $jsonBody['password'] ?? ''));
        $revokeSessions = !empty($_POST['revoke_sessions']) || !empty($jsonBody['revoke_sessions']);
        $enabledArg = $enabledInput !== null
            ? ($enabledInput === true || $enabledInput === 1 || $enabledInput === '1' || $enabledInput === 'true')
            : null;

        $upd = updateOnsiteSharePasswordConfig($pdo, $enabledArg, $newPassword, $revokeSessions);
        if (!$upd['ok']) {
            http_response_code((int) ($upd['status'] ?? 400));
            echo json_encode(['ok' => false, 'error' => $upd['error']]);
            exit;
        }
        $updatedCfg = $upd['config'];
        $passwordUpdated = (bool) $upd['password_updated'];
        $revoked = (bool) $upd['revoked'];

        echo json_encode([
            'ok' => true,
            'message' => $passwordUpdated
                ? 'Technician portal password updated and active viewer sessions rotated.'
                : ($revoked ? 'All active technician viewer sessions revoked.' : 'Technician on-site link settings saved.'),
            'enabled' => (bool) $updatedCfg['enabled'],
            'session_ver' => (int) $updatedCfg['session_ver'],
            'is_default_password' => (bool) $updatedCfg['is_default'],
            'default_password_preview' => $updatedCfg['is_default'] ? getDefaultOnsiteTechnicianPassword() : null,
            'share_path' => 'onsite.php',
        ]);
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

        $passValid = verifyUserPasswordRow($userRow, $password);

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

        $requiresPwdChange = ((int) ($userRow['must_change_password'] ?? 0) === 1);
        echo json_encode([
            'ok' => true,
            'message' => "Welcome back, {$userRow['full_name']}!",
            'user' => $matchedMember ?: $userRow,
            'requires_password_change' => $requiresPwdChange,
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

        if (usersTableHasPasswordCol($pdo)) {
            $insUser = $pdo->prepare("
                INSERT INTO `users` (`username`, `full_name`, `email`, `password_hash`, `password`, `phone`, `role`, `department`, `is_active`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $insUser->execute([$username, $fullName, $email, $passwordHash, $passwordHash, $phone, $role, $department]);
        } else {
            $insUser = $pdo->prepare("
                INSERT INTO `users` (`username`, `full_name`, `email`, `password_hash`, `phone`, `role`, `department`, `is_active`)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $insUser->execute([$username, $fullName, $email, $passwordHash, $phone, $role, $department]);
        }
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

        $lockCheck = assertControllerCheckpointLock($pdo, (string) $reqCpType, (string) $reqCpId);
        if (!$lockCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'allowed' => false, 'error' => $lockCheck['error']]);
            exit;
        }

        $currentPayload = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $activeCp = $currentPayload['activeCheckpoint'];
        $visualConfirmed = !empty($_POST['visual_confirmed']) || !empty($jsonBody['visual_confirmed']);
        $reqUserId = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        $lookupKey = $reqUserId > 0 ? (string) $reqUserId : $scanInput;
        $supOverridePin = trim((string) ($_POST['supervisor_pin'] ?? $jsonBody['supervisor_pin'] ?? ''));

        $resolved = resolveScanInputWithAntiShadowing(
            $pdo,
            $currentPayload['crew'],
            $activeCp,
            $lookupKey,
            $scanMode,
            $visualConfirmed,
            $reqUserId > 0,
            $supOverridePin !== ''
        );
        if (empty($resolved['ok'])) {
            echo json_encode($resolved);
            exit;
        }
        if (!empty($resolved['hold_preview'])) {
            echo json_encode($resolved['hold_preview']);
            exit;
        }
        $targetMember = $resolved['member'];

        $scannedBy = (int) ($caller['id'] ?? $_SESSION['auth_user_id'] ?? 1);
        $result = executeGateScan(
            $pdo,
            $activeDb,
            $activeCp,
            $targetMember,
            $scanMode,
            $scannedBy,
            $effectiveTs,
            $isOfflineSync,
            ['checkin_method' => $isOfflineSync ? 'offline_operator_visual' : ($resolved['checkin_method'] ?? 'badge_scan')]
        );

        echo json_encode($result);
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

                $chkSup = $pdo->prepare("SELECT `id`, `full_name`, `password_hash`, `password`, `role` FROM `users` WHERE `id` = ? AND `is_active` = 1");
                foreach ($candidateIds as $candId) {
                    $chkSup->execute([$candId]);
                    $supRow = $chkSup->fetch(PDO::FETCH_ASSOC);
                    if ($supRow && in_array(strtolower(trim((string)$supRow['role'])), $supervisorRoles, true)) {
                        if (verifyUserPasswordRow($supRow, $supervisorPin)) {
                            $authOk = true;
                            $overrideById = (int) $supRow['id'];
                            $authSupervisorName = $supRow['full_name'] ?: 'Supervisor';
                            break;
                        }
                    }
                }

                // 2. Allow any active Supervisor/Administrator password (UI has a single credential prompt with no user selector)
                if (!$authOk) {
                    $supStmt = $pdo->query("SELECT `id`, `full_name`, `password_hash`, `password`, `role` FROM `users` WHERE `is_active` = 1");
                    while ($supRow = $supStmt->fetch(PDO::FETCH_ASSOC)) {
                        if (!in_array(strtolower(trim((string)$supRow['role'])), $supervisorRoles, true)) {
                            continue;
                        }
                        if (verifyUserPasswordRow($supRow, $supervisorPin)) {
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
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, 'check_out', 'granted', NULL, 'on_time', ?, 'transit_transfer', ?, NOW())
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

        $confirmMethod = ($decision === 'supervisor_override')
            ? 'supervisor_override'
            : (($decision === 'decline_in') ? 'manual_decline' : 'manual_confirm');

        $insStmt = $pdo->prepare("
            INSERT INTO `attendance_logs`
              (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `override_by`, `override_reason`, `checkin_method`, `notes`, `scanned_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
            $confirmMethod,
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

    if (in_array($action, ['approve_batch', 'save_batch', 'delete_batch', 'get_batch'], true)) {
        http_response_code(410);
        echo json_encode([
            'ok' => false,
            'error' => 'Equipment batch workflows have been omitted in Attendance-Only Deployment.',
        ]);
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

        $eventId = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? $_POST['id'] ?? $jsonBody['id'] ?? ''));
        if ($eventId === '0') {
            $eventId = '';
        }
        $titleIn = trim((string) ($_POST['title'] ?? $jsonBody['title'] ?? ''));
        $locationIn = trim((string) ($_POST['location'] ?? $jsonBody['location'] ?? ''));
        $dateIn = trim((string) ($_POST['date'] ?? $jsonBody['date'] ?? ''));
        $startDateIn = trim((string) ($_POST['start_date'] ?? $jsonBody['start_date'] ?? ''));
        $endDateIn = trim((string) ($_POST['end_date'] ?? $jsonBody['end_date'] ?? ''));
        if ($startDateIn === '' && $dateIn !== '') {
            $startDateIn = $dateIn;
        }
        $validStartIn = preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDateIn) ? $startDateIn : '';
        $validEndIn = preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDateIn) ? $endDateIn : '';
        if ($validStartIn !== '' && $validEndIn !== '' && $validEndIn < $validStartIn) {
            echo json_encode(['ok' => false, 'error' => 'Event end date cannot be earlier than the start date.']);
            exit;
        }
        $facilityName = trim((string) ($_POST['facility_name'] ?? $jsonBody['facility_name'] ?? $_POST['checkpoint_name'] ?? $jsonBody['checkpoint_name'] ?? ''));
        $rawCallTime = trim((string) ($_POST['call_time'] ?? $jsonBody['call_time'] ?? '08:00'));
        $techLead = trim((string) ($_POST['tech_lead'] ?? $jsonBody['tech_lead'] ?? ''));
        $projectManager = trim((string) ($_POST['project_manager'] ?? $jsonBody['project_manager'] ?? ''));
        $eventCoordinator = trim((string) ($_POST['event_coordinator'] ?? $jsonBody['event_coordinator'] ?? ''));
        $callerRoleLower = strtolower(trim((string) ($caller['role'] ?? '')));
        $callerDisplayName = trim((string) ($caller['full_name'] ?? $caller['username'] ?? ''));
        $isCallerAdmin = in_array($callerRoleLower, ['admin', 'administrator', 'manager'], true);
        if ($eventId === '' && $projectManager === '' && $callerRoleLower === 'project_manager' && $callerDisplayName !== '') {
            $projectManager = $callerDisplayName;
        }
        if ($eventId === '' && $eventCoordinator === '' && $callerRoleLower === 'event_coordinator' && $callerDisplayName !== '') {
            $eventCoordinator = $callerDisplayName;
        }
        $eventPinRaw = trim((string) ($_POST['terminal_pin'] ?? $jsonBody['terminal_pin'] ?? ''));
        $assignedTechs = $_POST['assigned_technicians'] ?? $jsonBody['assigned_technicians'] ?? [];
        $hasRosterIn = array_key_exists('assigned_roster', $_POST) || array_key_exists('assigned_roster', $jsonBody);
        $hasAssignedTechsIn = array_key_exists('assigned_technicians', $_POST) || array_key_exists('assigned_technicians', $jsonBody) || $hasRosterIn;
        $removeImageIn = ((string) ($_POST['remove_image'] ?? $jsonBody['remove_image'] ?? '0')) === '1';
        $assignedRosterIn = $_POST['assigned_roster'] ?? $jsonBody['assigned_roster'] ?? null;
        if (is_string($assignedRosterIn) && $assignedRosterIn !== '') {
            $decodedRoster = json_decode($assignedRosterIn, true);
            $assignedRosterIn = is_array($decodedRoster) ? $decodedRoster : null;
        }
        $hasRadiusIn = isset($_POST['geofence_radius_m']) || isset($jsonBody['geofence_radius_m']);
        $geofenceRadiusM = max(50, min(5000, (int) ($_POST['geofence_radius_m'] ?? $jsonBody['geofence_radius_m'] ?? 200)));
        $latIn = $_POST['lat'] ?? $jsonBody['lat'] ?? null;
        $lngIn = $_POST['lng'] ?? $jsonBody['lng'] ?? null;
        $hasCoords = ($latIn !== null && $latIn !== '' && $lngIn !== null && $lngIn !== '' && is_numeric($latIn) && is_numeric($lngIn));
        $hasPolicyIn = $isCallerAdmin && (isset($_POST['checkin_policy']) || isset($jsonBody['checkin_policy']));
        $checkinPolicyIn = strtolower(trim((string) ($_POST['checkin_policy'] ?? $jsonBody['checkin_policy'] ?? 'hybrid')));
        if (!in_array($checkinPolicyIn, ['hybrid', 'qr_strict', 'manual_allowed'], true)) {
            $checkinPolicyIn = 'hybrid';
        }
        $hasVisualIn = $isCallerAdmin && (isset($_POST['require_visual_match']) || isset($jsonBody['require_visual_match']));
        $reqVisualIn = ((int) ($_POST['require_visual_match'] ?? $jsonBody['require_visual_match'] ?? 1) === 1) ? 1 : 0;
        $hasReqsIn = array_key_exists('requirements', $_POST) || array_key_exists('requirements', $jsonBody);
        $reqsRawIn = $_POST['requirements'] ?? $jsonBody['requirements'] ?? null;
        $reqsJsonIn = null;
        if ($hasReqsIn) {
            if (is_string($reqsRawIn)) {
                $decReq = json_decode($reqsRawIn, true);
                $reqsRawIn = is_array($decReq) ? $decReq : null;
            }
            if (is_array($reqsRawIn)) {
                $cleanBranches = [];
                foreach (['Video', 'Sound', 'Lighting', 'Electrical', 'Rigging', 'Interpretation', 'Support Staff'] as $bk) {
                    $cleanBranches[$bk] = max(0, min(99, (int) ($reqsRawIn['branches'][$bk] ?? 0)));
                }
                $reqsJsonIn = json_encode([
                    'branches' => $cleanBranches,
                    'notes' => trim((string) ($reqsRawIn['notes'] ?? '')),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
            }
        }

        if ($eventPinRaw !== '' && !preg_match('/^[A-Za-z0-9]{4,12}$/', $eventPinRaw)) {
            echo json_encode(['ok' => false, 'error' => 'Venue Terminal PIN must be 4–12 letters or digits']);
            exit;
        }

        if ($eventId === '' && $facilityName !== '' && $titleIn === '') {
            $resolvedEv = resolveCheckpointByName($pdo, $facilityName);
            if ($resolvedEv && $resolvedEv['type'] === 'event_venue') {
                $eventId = $resolvedEv['id'];
            }
        }

        if (!is_array($assignedTechs)) {
            $assignedTechs = json_decode((string)$assignedTechs, true) ?: [];
        }
        $assignedTechsInt = array_values(array_unique(array_filter(array_map('intval', (array)$assignedTechs))));
        $assignedRosterJson = null;
        if (is_array($assignedRosterIn)) {
            $normDepts = [];
            foreach (['Video', 'Sound', 'Lighting', 'Electrical', 'Rigging', 'Interpretation'] as $dk) {
                $dIds = array_values(array_unique(array_filter(array_map('intval', (array) ($assignedRosterIn['departments'][$dk] ?? [])))));
                $normDepts[$dk] = $dIds;
                $assignedTechsInt = array_merge($assignedTechsInt, $dIds);
            }
            $supportIds = array_values(array_unique(array_filter(array_map('intval', (array) ($assignedRosterIn['support_staff'] ?? [])))));
            $assignedTechsInt = array_values(array_unique(array_merge($assignedTechsInt, $supportIds)));
            $assignedRosterJson = json_encode([
                'project_manager' => trim((string) ($assignedRosterIn['project_manager'] ?? $projectManager)),
                'event_coordinator' => trim((string) ($assignedRosterIn['event_coordinator'] ?? $eventCoordinator)),
                'tech_lead' => trim((string) ($assignedRosterIn['tech_lead'] ?? $techLead)),
                'departments' => $normDepts,
                'support_staff' => $supportIds,
            ]);
        }

        // Normalize call time
        $timeParts = explode(':', $rawCallTime);
        $hRaw = preg_replace('/\D/', '', $timeParts[0] ?? '08');
        $mRaw = preg_replace('/\D/', '', $timeParts[1] ?? '00');
        $formattedTime = str_pad($hRaw !== '' ? $hRaw : '08', 2, '0', STR_PAD_LEFT) . ':' . str_pad(substr($mRaw !== '' ? $mRaw : '00', 0, 2), 2, '0', STR_PAD_LEFT);

        $eventDateSafe = $validStartIn !== '' ? $validStartIn : (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateIn) ? $dateIn : date('Y-m-d'));
        $eventEndDateSafe = $validEndIn !== '' ? $validEndIn : $eventDateSafe;
        if ($eventEndDateSafe < $eventDateSafe) {
            $eventEndDateSafe = $eventDateSafe;
        }
        $computeEventDuration = static function (string $sDate, string $eDate): array {
            $days = 1;
            try {
                $d1 = new DateTimeImmutable($sDate);
                $d2 = new DateTimeImmutable($eDate);
                $days = max(1, (int) $d1->diff($d2)->days + 1);
            } catch (Throwable $e) {
                $days = 1;
            }
            $label = $days === 1 ? '1 day' : ($days . ' days');
            return [$days, $label];
        };
        [$durationDaysVal, $durationLabelVal] = $computeEventDuration($eventDateSafe, $eventEndDateSafe);
        $syncAssignedUsers = static function (string $realEventId, array $techIds) use ($pdo): void {
            try {
                $crcVal = (string) (is_numeric($realEventId) ? (int) $realEventId : crc32($realEventId));
                $clrStmt = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL WHERE `assigned_checkpoint_type` = 'event_venue' AND (`assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ?)");
                $clrStmt->execute([$realEventId, $crcVal]);
                if (!empty($techIds)) {
                    $setStmt = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = 'event_venue', `assigned_checkpoint_id` = ? WHERE `id` = ?");
                    foreach ($techIds as $uid) {
                        $setStmt->execute([$realEventId, $uid]);
                    }
                }
            } catch (Throwable $e) {}
        };

        $syncDispatchAssignments = static function (string $realEventId, ?array $rosterArr, array $flatIds, int $actorId, string $actorRole, string $eventTitle) use ($pdo): void {
            try {
                // Build map user_id => list of branches from roster
                $userBranches = [];
                if (is_array($rosterArr)) {
                    foreach (['Video', 'Sound', 'Lighting', 'Electrical', 'Rigging', 'Interpretation'] as $dk) {
                        foreach ((array) ($rosterArr['departments'][$dk] ?? []) as $uRaw) {
                            $uid = (int) $uRaw;
                            if ($uid > 0) {
                                $userBranches[$uid][] = $dk;
                            }
                        }
                    }
                    foreach ((array) ($rosterArr['support_staff'] ?? []) as $uRaw) {
                        $uid = (int) $uRaw;
                        if ($uid > 0 && empty($userBranches[$uid])) {
                            $userBranches[$uid][] = 'Support Staff';
                        }
                    }
                }
                foreach ($flatIds as $fUid) {
                    $uid = (int) $fUid;
                    if ($uid > 0 && empty($userBranches[$uid])) {
                        $dSt = $pdo->prepare("SELECT `department`, `role` FROM `users` WHERE `id` = ? LIMIT 1");
                        $dSt->execute([$uid]);
                        $uRow = $dSt->fetch(PDO::FETCH_ASSOC);
                        $uDept = trim((string) ($uRow['department'] ?? ''));
                        $uDeptLow = strtolower($uDept);
                        $uRole = strtolower(trim((string) ($uRow['role'] ?? '')));
                        if (in_array($uRole, ['driver', 'operations_crew', 'operations', 'runner', 'venue_crew', 'security', 'cleaning', 'catering', 'logistics', 'support_staff', 'support', 'decorator'], true) || str_contains($uDeptLow, 'support') || $uDeptLow === 'scurt') {
                            $userBranches[$uid][] = 'Support Staff';
                        } elseif (str_contains($uDeptLow, 'video') || $uDeptLow === 'vid') {
                            $userBranches[$uid][] = 'Video';
                        } elseif (str_contains($uDeptLow, 'sound') || str_contains($uDeptLow, 'audio') || $uDeptLow === 'snd') {
                            $userBranches[$uid][] = 'Sound';
                        } elseif (str_contains($uDeptLow, 'light') || $uDeptLow === 'lgt') {
                            $userBranches[$uid][] = 'Lighting';
                        } elseif (str_contains($uDeptLow, 'elect') || $uDeptLow === 'elc') {
                            $userBranches[$uid][] = 'Electrical';
                        } elseif (str_contains($uDeptLow, 'rig')) {
                            $userBranches[$uid][] = 'Rigging';
                        } elseif (str_contains($uDeptLow, 'interp') || $uDeptLow === 'int') {
                            $userBranches[$uid][] = 'Interpretation';
                        } else {
                            $userBranches[$uid][] = $uDept !== '' ? $uDept : 'Sound';
                        }
                    }
                }

                $targetIds = array_map('intval', array_keys($userBranches));
                $existingSt = $pdo->prepare("SELECT `user_id` FROM `event_crew_assignments` WHERE `event_id` = ?");
                $existingSt->execute([$realEventId]);
                $existingIds = array_map('intval', $existingSt->fetchAll(PDO::FETCH_COLUMN));

                $removedIds = array_diff($existingIds, $targetIds);
                if (!empty($removedIds)) {
                    $delSt = $pdo->prepare("DELETE FROM `event_crew_assignments` WHERE `event_id` = ? AND `user_id` = ?");
                    foreach ($removedIds as $remId) {
                        $delSt->execute([$realEventId, $remId]);
                    }
                }

                $upsertSt = $pdo->prepare("
                    INSERT INTO `event_crew_assignments` (`event_id`, `user_id`, `branch_dept`, `assigned_by_id`, `confirmation_status`)
                    VALUES (?, ?, ?, ?, 'pending')
                    ON DUPLICATE KEY UPDATE `branch_dept` = VALUES(`branch_dept`)
                ");
                $newlyAddedCount = 0;
                foreach ($targetIds as $uid) {
                    $brLabel = substr(implode(' / ', array_values(array_unique($userBranches[$uid]))), 0, 48);
                    if (!in_array($uid, $existingIds, true)) {
                        $newlyAddedCount++;
                    }
                    $upsertSt->execute([$realEventId, $uid, $brLabel, $actorId]);
                }

                if ($newlyAddedCount > 0) {
                    logEventDispatchAction(
                        $pdo,
                        $realEventId,
                        $actorId,
                        $actorRole,
                        'crew_assigned',
                        "Assigned {$newlyAddedCount} crew member(s) to {$eventTitle} (awaiting confirmation)",
                        ['assigned_count' => count($targetIds), 'newly_added' => $newlyAddedCount]
                    );
                } else {
                    logEventDispatchAction(
                        $pdo,
                        $realEventId,
                        $actorId,
                        $actorRole,
                        'event_updated',
                        "Updated event roster/settings for {$eventTitle}",
                        ['assigned_count' => count($targetIds)]
                    );
                }
                recalculateEventDispatchStatus($pdo, $realEventId);
            } catch (Throwable $e) {}
        };

        // Handle Event Venue Image Upload
        $uploadedEventImagePath = null;
        if (!empty($_FILES['image']['tmp_name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                $dir = __DIR__ . '/uploads/events';
                if (!is_dir($dir)) mkdir($dir, 0777, true);
                $fileName = 'ev_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
                $dest = $dir . '/' . $fileName;
                if (move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
                    $uploadedEventImagePath = 'uploads/events/' . $fileName;
                }
            }
        }

        $msg = 'Event updated successfully';
        if ($eventId !== '') {
            $chk = $pdo->prepare("SELECT `id`, `title`, `date`, `start_date`, `end_date`, `image`, `tech_lead`, `tech_lead_approved`, `dispatch_status` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $chk->execute([$eventId, $eventId]);
            $existingEvRow = $chk->fetch(PDO::FETCH_ASSOC);
            if (!$existingEvRow) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Event not found or already deleted.']);
                exit;
            }
            $realEventId = (string) $existingEvRow['id'];
            $evTitleFinal = $titleIn !== '' ? $titleIn : (string) ($existingEvRow['title'] ?? ('Event #' . $realEventId));
            $existingStart = trim((string) ($existingEvRow['start_date'] ?? $existingEvRow['date'] ?? ''));
            $existingEnd = trim((string) ($existingEvRow['end_date'] ?? ''));
            $effStart = $validStartIn !== '' ? $validStartIn : (preg_match('/^\d{4}-\d{2}-\d{2}$/', $existingStart) ? $existingStart : $eventDateSafe);
            $effEnd = $validEndIn !== '' ? $validEndIn : (preg_match('/^\d{4}-\d{2}-\d{2}$/', $existingEnd) ? $existingEnd : $effStart);
            if ($validEndIn !== '' && $effEnd < $effStart) {
                echo json_encode(['ok' => false, 'error' => 'Event end date cannot be earlier than the start date.']);
                exit;
            }
            if ($effEnd < $effStart) {
                $effEnd = $effStart;
            }
            [$effDurDays, $effDurLabel] = $computeEventDuration($effStart, $effEnd);
            $setClauses = [
                "`title` = CASE WHEN ? != '' THEN ? ELSE `title` END",
                "`location` = CASE WHEN ? != '' THEN ? ELSE `location` END",
                "`date` = ?",
                "`start_date` = ?",
                "`end_date` = ?",
                "`duration_days` = ?",
                "`duration_label` = ?",
                "`call_time` = ?",
                "`tech_lead` = CASE WHEN ? != '' THEN ? ELSE `tech_lead` END",
                "`project_manager` = CASE WHEN ? != '' THEN ? ELSE `project_manager` END",
                "`event_coordinator` = CASE WHEN ? != '' THEN ? ELSE `event_coordinator` END",
                "`terminal_pin` = CASE WHEN ? != '' THEN ? ELSE `terminal_pin` END",
            ];
            $updParams = [
                $titleIn, $titleIn,
                $locationIn, $locationIn,
                $effStart,
                $effStart,
                $effEnd,
                $effDurDays,
                $effDurLabel,
                $formattedTime,
                $techLead, $techLead,
                $projectManager, $projectManager,
                $eventCoordinator, $eventCoordinator,
                $eventPinRaw, $eventPinRaw,
            ];
            if ($hasAssignedTechsIn) {
                $setClauses[] = "`assigned_technician` = ?";
                $updParams[] = json_encode($assignedTechsInt);
            }
            if ($hasRosterIn && $assignedRosterJson !== null) {
                $setClauses[] = "`assigned_roster_json` = ?";
                $updParams[] = $assignedRosterJson;
            }
            if ($hasRadiusIn) {
                $setClauses[] = "`geofence_radius_m` = ?";
                $updParams[] = $geofenceRadiusM;
            }
            if ($hasCoords) {
                $setClauses[] = "`lat` = ?, `lng` = ?";
                $updParams[] = (float) $latIn;
                $updParams[] = (float) $lngIn;
            }
            if ($hasPolicyIn) {
                $setClauses[] = "`checkin_policy` = ?";
                $updParams[] = $checkinPolicyIn;
            }
            if ($hasVisualIn) {
                $setClauses[] = "`require_visual_match` = ?";
                $updParams[] = $reqVisualIn;
            }
            if ($hasReqsIn && $reqsJsonIn !== null) {
                $setClauses[] = "`requirements_json` = ?, `requirements_sent_by` = ?, `requirements_sent_at` = NOW()";
                $updParams[] = $reqsJsonIn;
                $updParams[] = (int) ($caller['id'] ?? 1);
            }
            $oldTechLead = trim((string) ($existingEvRow['tech_lead'] ?? ''));
            $effTechLead = $techLead !== '' ? $techLead : $oldTechLead;
            $curDispatchStatus = strtolower(trim((string) ($existingEvRow['dispatch_status'] ?? 'draft')));
            $hasEffTechLead = ($effTechLead !== '' && strtolower($effTechLead) !== 'tech lead');
            $techLeadChanged = ($techLead !== '' && strcasecmp($techLead, $oldTechLead) !== 0);
            $isTlOrAdminCaller = in_array($callerRoleLower, ['admin', 'administrator', 'manager', 'tech_lead', 'technical_lead'], true);
            $callerMatchesTl = $isCallerAdmin
                || !$hasEffTechLead
                || ($callerDisplayName !== '' && strcasecmp($callerDisplayName, $effTechLead) === 0);
            $crewAssignedNow = ($hasRosterIn || ($hasAssignedTechsIn && !empty($assignedTechsInt)) || $action === 'assign_event_crew')
                && !empty($assignedTechsInt);

            if ($techLeadChanged && !($isTlOrAdminCaller && $crewAssignedNow && $callerMatchesTl)) {
                $setClauses[] = "`tech_lead_approved` = 0, `tech_lead_approved_by` = NULL, `tech_lead_approved_at` = NULL, `tech_lead_approval_note` = NULL";
            } elseif ($isTlOrAdminCaller && $crewAssignedNow && $callerMatchesTl && ((int) ($existingEvRow['tech_lead_approved'] ?? 0) !== 1)) {
                $setClauses[] = "`tech_lead_approved` = 1, `tech_lead_approved_by` = ?, `tech_lead_approved_at` = NOW()";
                $updParams[] = (int) ($caller['id'] ?? 1);
            }

            if ($hasEffTechLead && ((int) ($existingEvRow['tech_lead_approved'] ?? 0) !== 1) && !($isTlOrAdminCaller && $crewAssignedNow && $callerMatchesTl)) {
                $setClauses[] = "`dispatch_status` = 'awaiting_approval_from_tech_lead'";
            } elseif ($hasReqsIn && $reqsJsonIn !== null && !$hasEffTechLead && ($curDispatchStatus === '' || $curDispatchStatus === 'draft')) {
                $setClauses[] = "`dispatch_status` = 'requirements_sent'";
            }
            if ($uploadedEventImagePath !== null) {
                $oldImg = trim((string) ($existingEvRow['image'] ?? ''));
                if ($oldImg !== '' && str_starts_with($oldImg, 'uploads/events/') && is_file(__DIR__ . '/' . $oldImg)) {
                    @unlink(__DIR__ . '/' . $oldImg);
                }
                $setClauses[] = "`image` = ?";
                $updParams[] = $uploadedEventImagePath;
            } elseif ($removeImageIn) {
                $oldImg = trim((string) ($existingEvRow['image'] ?? ''));
                if ($oldImg !== '' && str_starts_with($oldImg, 'uploads/events/') && is_file(__DIR__ . '/' . $oldImg)) {
                    @unlink(__DIR__ . '/' . $oldImg);
                }
                $setClauses[] = "`image` = NULL";
            }
            $updParams[] = $realEventId;
            $stmtUpd = $pdo->prepare("UPDATE `events` SET " . implode(', ', $setClauses) . " WHERE `id` = ?");
            $stmtUpd->execute($updParams);
            if ($hasAssignedTechsIn) {
                $syncAssignedUsers($realEventId, $assignedTechsInt);
            }
            if ($hasRosterIn || ($hasAssignedTechsIn && !empty($assignedTechsInt)) || $action === 'assign_event_crew') {
                $syncDispatchAssignments(
                    $realEventId,
                    is_array($assignedRosterIn) ? $assignedRosterIn : null,
                    $assignedTechsInt,
                    (int) ($caller['id'] ?? 1),
                    (string) ($caller['role'] ?? 'admin'),
                    $evTitleFinal
                );
            } else {
                recalculateEventDispatchStatus($pdo, $realEventId);
                try {
                    logEventDispatchAction(
                        $pdo,
                        $realEventId,
                        (int) ($caller['id'] ?? 1),
                        (string) ($caller['role'] ?? 'admin'),
                        'event_updated',
                        "Updated event \"{$evTitleFinal}\" ({$effStart} → {$effEnd}, {$effDurLabel})",
                        ['start_date' => $effStart, 'end_date' => $effEnd, 'duration_days' => $effDurDays]
                    );
                } catch (Throwable $e) {}
            }
            $eventId = $realEventId;
            $msg = "Event \"{$evTitleFinal}\" updated successfully.";
        } else {
            if ($titleIn === '') {
                echo json_encode(['ok' => false, 'error' => 'Event Venue title is required.']);
                exit;
            }
            $maxId = 1004;
            try {
                foreach (['events' => 'id', 'event_dept_confirmations' => 'event_id', 'event_crew_assignments' => 'event_id', 'event_support_requests' => 'event_id', 'event_dispatch_logs' => 'event_id'] as $tbl => $col) {
                    foreach ($pdo->query("SELECT DISTINCT `{$col}` FROM `{$tbl}`")->fetchAll(PDO::FETCH_COLUMN) as $existingEvId) {
                        if (is_numeric($existingEvId)) {
                            $maxId = max($maxId, (int) $existingEvId);
                        }
                    }
                }
            } catch (Throwable $e) {}
            $newEventId = (string) ($maxId + 1);
            try {
                $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('events_seeded_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
            } catch (Throwable $e) {}
            $newLoc = $locationIn !== '' ? $locationIn : 'Kigali Event Venue';
            $newPin = $eventPinRaw !== '' ? $eventPinRaw : '1234';
            $hasAssignedTechLead = ($techLead !== '' && strtolower($techLead) !== 'tech lead');
            $isTlOrAdminCreator = in_array($callerRoleLower, ['admin', 'administrator', 'manager', 'tech_lead', 'technical_lead'], true);
            $creatorMatchesTl = $isCallerAdmin
                || !$hasAssignedTechLead
                || ($callerDisplayName !== '' && strcasecmp($callerDisplayName, $techLead) === 0);
            $initTechLeadApproved = ($hasAssignedTechLead && $isTlOrAdminCreator && !empty($assignedTechsInt) && $creatorMatchesTl) ? 1 : 0;
            if ($hasAssignedTechLead) {
                $initDispatchStatus = $initTechLeadApproved === 1 ? 'staffing_in_progress' : 'awaiting_approval_from_tech_lead';
            } elseif ($hasReqsIn && $reqsJsonIn !== null) {
                $initDispatchStatus = 'requirements_sent';
            } else {
                $initDispatchStatus = 'draft';
            }
            $stmtIns = $pdo->prepare("
                INSERT INTO `events` (`id`, `title`, `location`, `date`, `start_date`, `end_date`, `duration_days`, `duration_label`, `call_time`, `project_manager`, `event_coordinator`, `tech_lead`, `assigned_technician`, `assigned_roster_json`, `geofence_radius_m`, `lat`, `lng`, `terminal_pin`, `image`, `checkin_policy`, `require_visual_match`, `requirements_json`, `dispatch_status`, `requirements_sent_by`, `requirements_sent_at`, `tech_lead_approved`, `tech_lead_approved_by`, `tech_lead_approved_at`, `created_by_id`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtIns->execute([
                $newEventId,
                $titleIn,
                $newLoc,
                $eventDateSafe,
                $eventDateSafe,
                $eventEndDateSafe,
                $durationDaysVal,
                $durationLabelVal,
                $formattedTime,
                $projectManager !== '' ? $projectManager : (($eventCoordinator !== '' || $isCallerAdmin) ? '' : 'Operations PM'),
                $eventCoordinator,
                $techLead !== '' ? $techLead : 'Tech Lead',
                json_encode($assignedTechsInt),
                $assignedRosterJson,
                $geofenceRadiusM,
                $hasCoords ? (float) $latIn : null,
                $hasCoords ? (float) $lngIn : null,
                $newPin,
                $uploadedEventImagePath,
                $checkinPolicyIn,
                $reqVisualIn,
                $reqsJsonIn,
                $initDispatchStatus,
                ($hasReqsIn && $reqsJsonIn !== null) ? (int) ($caller['id'] ?? 1) : null,
                ($hasReqsIn && $reqsJsonIn !== null) ? date('Y-m-d H:i:s') : null,
                $initTechLeadApproved,
                $initTechLeadApproved === 1 ? (int) ($caller['id'] ?? 1) : null,
                $initTechLeadApproved === 1 ? date('Y-m-d H:i:s') : null,
                (int) ($caller['id'] ?? 1),
            ]);
            $eventId = $newEventId;
            $syncAssignedUsers($newEventId, $assignedTechsInt);
            $createdSummary = "Created event venue \"{$titleIn}\" ({$newLoc}) at {$formattedTime}";
            if ($initDispatchStatus === 'awaiting_approval_from_tech_lead') {
                $createdSummary .= " — Awaiting approval from Tech Lead ({$techLead})";
            } elseif ($initTechLeadApproved === 1 && $hasAssignedTechLead) {
                $createdSummary .= " — Approved & staffed by Tech Lead ({$techLead})";
            }
            logEventDispatchAction(
                $pdo,
                $newEventId,
                (int) ($caller['id'] ?? 1),
                (string) ($caller['role'] ?? 'project_manager'),
                'event_created',
                $createdSummary,
                ['checkin_policy' => $checkinPolicyIn, 'has_requirements' => ($reqsJsonIn !== null), 'dispatch_status' => $initDispatchStatus]
            );
            if (!empty($assignedTechsInt) || is_array($assignedRosterIn)) {
                $syncDispatchAssignments(
                    $newEventId,
                    is_array($assignedRosterIn) ? $assignedRosterIn : null,
                    $assignedTechsInt,
                    (int) ($caller['id'] ?? 1),
                    (string) ($caller['role'] ?? 'project_manager'),
                    $titleIn
                );
            }
            $msg = "Event Venue \"{$titleIn}\" created successfully.";
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => $msg,
                'event_id' => $eventId,
                'call_time' => $formattedTime,
                'assigned_technicians' => $assignedTechsInt,
                'assigned_count' => count($assignedTechsInt),
            ]
        ));
        exit;
    }

    if ($action === 'delete_event') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_event', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $eventId = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? $_POST['id'] ?? $jsonBody['id'] ?? ''));
        if ($eventId === '') {
            echo json_encode(['ok' => false, 'error' => 'Event Venue ID is required.']);
            exit;
        }
        $chk = $pdo->prepare("SELECT `id`, `title`, `image` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
        $chk->execute([$eventId, $eventId]);
        $row = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Event Venue not found.']);
            exit;
        }
        $realId = (string) $row['id'];
        $oldImg = trim((string) ($row['image'] ?? ''));
        if ($oldImg !== '' && str_starts_with($oldImg, 'uploads/events/') && is_file(__DIR__ . '/' . $oldImg)) {
            @unlink(__DIR__ . '/' . $oldImg);
        }
        $crcVal = (string) (is_numeric($realId) ? (int) $realId : crc32($realId));
        try {
            $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = NULL, `assigned_checkpoint_id` = NULL WHERE `assigned_checkpoint_type` = 'event_venue' AND (`assigned_checkpoint_id` = ? OR `assigned_checkpoint_id` = ?)")->execute([$realId, $crcVal]);
            $pdo->prepare("DELETE FROM `event_dept_confirmations` WHERE `event_id` = ?")->execute([$realId]);
            $pdo->prepare("DELETE FROM `event_crew_assignments` WHERE `event_id` = ?")->execute([$realId]);
            $pdo->prepare("DELETE FROM `event_support_requests` WHERE `event_id` = ?")->execute([$realId]);
            $pdo->prepare("DELETE FROM `event_dispatch_logs` WHERE `event_id` = ?")->execute([$realId]);
            $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('events_seeded_v1', '1') ON DUPLICATE KEY UPDATE `setting_value` = '1'")->execute();
        } catch (Throwable $e) {}
        $pdo->prepare("DELETE FROM `events` WHERE `id` = ?")->execute([$realId]);

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'deleted_event_id' => $realId,
                'message' => 'Deleted Event "' . (string) ($row['title'] ?? $realId) . '".',
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
        // Fetch Warehouses / Facility Gates
        $whRows = $pdo->query("SELECT * FROM `stock_locations` ORDER BY `id` ASC")->fetchAll();
        $warehouses = [];
        foreach ($whRows as $wr) {
            $wid = (int) $wr['id'];
            $locName = (string) ($wr['name'] ?? 'Facility Gate');
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
                'controller_name' => (string) ($wr['controller_name'] ?? ''),
                'controller_phone' => (string) ($wr['controller_phone'] ?? ''),
                'controller_email' => (string) ($wr['controller_email'] ?? ''),
                'is_active' => (int) ($wr['is_active'] ?? 1),
                'image' => resolveProfileImageUrl($wr['image'] ?? null),
                'terminal_pin' => resolveWarehouseTerminalPin($wr),
            ];
        }

        echo json_encode([
            'ok' => true,
            'warehouses' => $warehouses,
            'stats' => [
                'total_warehouses' => count($warehouses),
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
        $controllerName = trim((string) ($_POST['controller_name'] ?? $jsonBody['controller_name'] ?? ''));
        $controllerPhone = trim((string) ($_POST['controller_phone'] ?? $jsonBody['controller_phone'] ?? ''));
        $isActive = isset($_POST['is_active']) ? (int) $_POST['is_active'] : (int) ($jsonBody['is_active'] ?? 1);
        $terminalPinRaw = trim((string) ($_POST['terminal_pin'] ?? $jsonBody['terminal_pin'] ?? ''));
        $hasRadiusIn = isset($_POST['geofence_radius_m']) || isset($jsonBody['geofence_radius_m']);
        $geofenceRadiusM = max(50, min(5000, (int) ($_POST['geofence_radius_m'] ?? $jsonBody['geofence_radius_m'] ?? 200)));
        $latIn = $_POST['lat'] ?? $jsonBody['lat'] ?? null;
        $lngIn = $_POST['lng'] ?? $jsonBody['lng'] ?? null;
        $hasCoords = ($latIn !== null && $latIn !== '' && $lngIn !== null && $lngIn !== '' && is_numeric($latIn) && is_numeric($lngIn));
        $hasPolicyIn = isset($_POST['checkin_policy']) || isset($jsonBody['checkin_policy']);
        $checkinPolicyIn = strtolower(trim((string) ($_POST['checkin_policy'] ?? $jsonBody['checkin_policy'] ?? 'hybrid')));
        if (!in_array($checkinPolicyIn, ['hybrid', 'qr_strict', 'manual_allowed'], true)) {
            $checkinPolicyIn = 'hybrid';
        }
        $hasVisualIn = isset($_POST['require_visual_match']) || isset($jsonBody['require_visual_match']);
        $reqVisualIn = ((int) ($_POST['require_visual_match'] ?? $jsonBody['require_visual_match'] ?? 1) === 1) ? 1 : 0;

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
            $whSets = [
                '`name` = ?', '`code` = ?', '`location_code` = ?', '`location` = ?',
                '`open_time` = ?', '`close_time` = ?', '`controller_name` = ?',
                '`controller_phone` = ?', '`is_active` = ?'
            ];
            $whParams = [$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive];
            if ($uploadedImagePath) {
                $whSets[] = '`image` = ?';
                $whParams[] = $uploadedImagePath;
            }
            if ($terminalPinRaw !== '') {
                $whSets[] = '`terminal_pin` = ?';
                $whParams[] = $terminalPinRaw;
            }
            if ($hasRadiusIn) {
                $whSets[] = '`geofence_radius_m` = ?';
                $whParams[] = $geofenceRadiusM;
            }
            if ($hasCoords) {
                $whSets[] = '`lat` = ?, `lng` = ?';
                $whParams[] = (float) $latIn;
                $whParams[] = (float) $lngIn;
            }
            if ($hasPolicyIn) {
                $whSets[] = '`checkin_policy` = ?';
                $whParams[] = $checkinPolicyIn;
            }
            if ($hasVisualIn) {
                $whSets[] = '`require_visual_match` = ?';
                $whParams[] = $reqVisualIn;
            }
            $whParams[] = $id;
            $pdo->prepare("UPDATE `stock_locations` SET " . implode(', ', $whSets) . " WHERE `id` = ?")->execute($whParams);
        } else {
            $pinToInsert = $terminalPinRaw !== '' ? $terminalPinRaw : str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            $stmt = $pdo->prepare("
                INSERT INTO `stock_locations`
                (`name`, `code`, `location_code`, `location`, `open_time`, `close_time`, `controller_name`, `controller_phone`, `is_active`, `geofence_radius_m`, `lat`, `lng`, `image`, `terminal_pin`, `checkin_policy`, `require_visual_match`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $geofenceRadiusM, $hasCoords ? (float) $latIn : null, $hasCoords ? (float) $lngIn : null, $uploadedImagePath, $pinToInsert, $checkinPolicyIn, $reqVisualIn]);
            $id = (int) $pdo->lastInsertId();
        }

        echo json_encode([
            'ok' => true,
            'message' => 'Warehouse saved successfully',
            'warehouse_id' => $id,
        ]);
        exit;
    }

    if ($action === 'save_standalone_portal') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_standalone_portal', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureStandalonePortalsTable($pdo);

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $title = trim((string) ($_POST['title'] ?? $jsonBody['title'] ?? ''));
        $subtitle = trim((string) ($_POST['subtitle'] ?? $jsonBody['subtitle'] ?? ''));
        $portalType = strtolower(trim((string) ($_POST['portal_type'] ?? $jsonBody['portal_type'] ?? 'facility_gate')));
        if (!in_array($portalType, ['facility_gate', 'onsite_portal'], true)) {
            $portalType = 'facility_gate';
        }
        $rawKey = trim((string) ($_POST['portal_key'] ?? $jsonBody['portal_key'] ?? ''));
        $portalKey = trim((string) preg_replace('/[^a-z0-9_-]+/', '-', strtolower($rawKey !== '' ? $rawKey : $title)), '-_');
        $whIdRaw = $_POST['wh_id'] ?? $jsonBody['wh_id'] ?? '';
        $whId = ($portalType === 'facility_gate' && $whIdRaw !== '' && (int) $whIdRaw > 0) ? (int) $whIdRaw : null;
        $entryUrlIn = trim((string) ($_POST['entry_url'] ?? $jsonBody['entry_url'] ?? ''));
        $overlayRaw = (float) ($_POST['overlay_opacity'] ?? $jsonBody['overlay_opacity'] ?? 0.78);
        $overlayOpacity = max(0.20, min(0.95, round($overlayRaw, 2)));
        $isActive = isset($_POST['is_active']) ? ((int) $_POST['is_active'] ? 1 : 0) : ((int) ($jsonBody['is_active'] ?? 1) ? 1 : 0);
        $sortOrder = max(1, (int) ($_POST['sort_order'] ?? $jsonBody['sort_order'] ?? 10));
        $removeBg = !empty($_POST['remove_background']) || !empty($jsonBody['remove_background']);
        $terminalPinRaw = trim((string) ($_POST['terminal_pin'] ?? $jsonBody['terminal_pin'] ?? ''));
        $onsitePwdRaw = trim((string) ($_POST['onsite_password'] ?? $jsonBody['onsite_password'] ?? ''));
        $hasBestFor = isset($_POST['best_for']) || isset($jsonBody['best_for']);
        $bestFor = trim((string) ($_POST['best_for'] ?? $jsonBody['best_for'] ?? ''));
        $hasPerms = isset($_POST['permissions_summary']) || isset($jsonBody['permissions_summary']);
        $permissionsSummary = trim((string) ($_POST['permissions_summary'] ?? $jsonBody['permissions_summary'] ?? ''));
        $allowScan = isset($_POST['allow_scan'])
            ? ((int) $_POST['allow_scan'] ? 1 : 0)
            : (isset($jsonBody['allow_scan']) ? ((int) $jsonBody['allow_scan'] ? 1 : 0) : ($portalType === 'onsite_portal' ? 0 : 1));
        $maskPhones = isset($_POST['mask_phones'])
            ? ((int) $_POST['mask_phones'] ? 1 : 0)
            : ((int) ($jsonBody['mask_phones'] ?? 0) ? 1 : 0);
        $hasExpires = array_key_exists('expires_at', $_POST) || array_key_exists('expires_at', $jsonBody);
        $expiresAtRaw = trim((string) ($_POST['expires_at'] ?? $jsonBody['expires_at'] ?? ''));
        $expiresAt = ($expiresAtRaw !== '' && strtotime($expiresAtRaw) !== false) ? date('Y-m-d H:i:s', strtotime($expiresAtRaw)) : null;
        $hasMaxSess = array_key_exists('max_sessions', $_POST) || array_key_exists('max_sessions', $jsonBody);
        $maxSessionsRaw = $_POST['max_sessions'] ?? $jsonBody['max_sessions'] ?? '';
        $maxSessions = ($maxSessionsRaw !== '' && (int) $maxSessionsRaw > 0) ? (int) $maxSessionsRaw : null;

        if ($title === '') {
            echo json_encode(['ok' => false, 'error' => 'Portal title is required.']);
            exit;
        }
        if ($portalKey === '') {
            $portalKey = 'gate-' . time();
        }
        if ($portalType === 'facility_gate' && !$whId) {
            echo json_encode(['ok' => false, 'error' => 'Please select a Facility Gate location for this standalone terminal.']);
            exit;
        }
        if ($terminalPinRaw !== '' && !preg_match('/^[A-Za-z0-9]{4,12}$/', $terminalPinRaw)) {
            echo json_encode(['ok' => false, 'error' => 'Gate Station PIN must be 4–12 letters or digits.']);
            exit;
        }
        if ($portalType === 'onsite_portal' && $onsitePwdRaw !== '' && strlen($onsitePwdRaw) < 6) {
            echo json_encode(['ok' => false, 'error' => 'Shared On-Site portal password must be at least 6 characters.']);
            exit;
        }

        $existing = null;
        if ($id > 0) {
            $exSt = $pdo->prepare("SELECT * FROM `standalone_portals` WHERE `id` = ? LIMIT 1");
            $exSt->execute([$id]);
            $existing = $exSt->fetch(PDO::FETCH_ASSOC);
            if (!$existing) {
                echo json_encode(['ok' => false, 'error' => 'Portal entry not found.']);
                exit;
            }
            if ((int) ($existing['is_system'] ?? 0) === 1) {
                $portalKey = (string) $existing['portal_key'];
                $portalType = (string) $existing['portal_type'];
                $entryUrl = (string) $existing['entry_url'];
            } else {
                $entryUrl = $entryUrlIn !== '' ? $entryUrlIn : ($portalType === 'onsite_portal' ? 'onsite.php' : ('gate.php?site=' . rawurlencode($portalKey)));
            }
        } else {
            $chk = $pdo->prepare("SELECT `id` FROM `standalone_portals` WHERE `portal_key` = ? LIMIT 1");
            $chk->execute([$portalKey]);
            if ($chk->fetch()) {
                $portalKey .= '-' . substr((string) time(), -4);
            }
            $entryUrl = $entryUrlIn !== '' ? $entryUrlIn : ($portalType === 'onsite_portal' ? 'onsite.php' : ('gate.php?site=' . rawurlencode($portalKey)));
        }

        $deleteManagedBgFile = static function (?string $rel): void {
            $clean = ltrim(str_replace('\\', '/', trim((string) $rel)), '/');
            if ($clean === '' || strpos($clean, 'uploads/portals/') !== 0 || strpos($clean, '..') !== false) {
                return;
            }
            $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $clean);
            if (is_file($abs)) {
                @unlink($abs);
            }
        };

        $finalBgPath = $existing ? ($existing['background_image'] ?? null) : null;
        if ($removeBg) {
            $deleteManagedBgFile($finalBgPath);
            $finalBgPath = null;
        }

        if (!empty($_FILES['background_image']['tmp_name']) && is_uploaded_file($_FILES['background_image']['tmp_name'])) {
            $tmpFile = (string) $_FILES['background_image']['tmp_name'];
            $fileSize = (int) ($_FILES['background_image']['size'] ?? 0);
            if ($fileSize <= 0 || $fileSize > 5 * 1024 * 1024) {
                echo json_encode(['ok' => false, 'error' => 'Background image must be smaller than 5 MB.']);
                exit;
            }
            $ext = strtolower(pathinfo((string) ($_FILES['background_image']['name'] ?? ''), PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                echo json_encode(['ok' => false, 'error' => 'Unsupported image format. Upload JPG, PNG, WEBP, or GIF.']);
                exit;
            }
            $imgInfo = @getimagesize($tmpFile);
            if ($imgInfo === false) {
                echo json_encode(['ok' => false, 'error' => 'Uploaded file is not a valid image.']);
                exit;
            }
            $dir = __DIR__ . '/uploads/portals';
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            $safeName = preg_replace('/[^a-z0-9_-]+/', '_', $portalKey);
            $fileName = 'portal_' . $safeName . '_' . time() . '_' . substr(md5(uniqid('', true)), 0, 6) . '.' . $ext;
            $dest = $dir . '/' . $fileName;
            if (!move_uploaded_file($tmpFile, $dest)) {
                echo json_encode(['ok' => false, 'error' => 'Failed to save background image file on server.']);
                exit;
            }
            $deleteManagedBgFile($finalBgPath);
            $finalBgPath = 'uploads/portals/' . $fileName;
        }

        if ($id > 0) {
            if (!$hasBestFor) {
                $bestFor = (string) ($existing['best_for'] ?? '');
            }
            if (!$hasPerms) {
                $permissionsSummary = (string) ($existing['permissions_summary'] ?? '');
            }
            if (!$hasExpires) {
                $expiresAt = $existing['expires_at'] ?? null;
            }
            if (!$hasMaxSess) {
                $maxSessions = isset($existing['max_sessions']) && $existing['max_sessions'] !== null ? (int) $existing['max_sessions'] : null;
            }
            $stmt = $pdo->prepare("
                UPDATE `standalone_portals`
                SET `portal_key` = ?, `portal_type` = ?, `title` = ?, `subtitle` = ?, `entry_url` = ?,
                    `wh_id` = ?, `background_image` = ?, `overlay_opacity` = ?, `best_for` = ?,
                    `permissions_summary` = ?, `allow_scan` = ?, `mask_phones` = ?, `expires_at` = ?,
                    `max_sessions` = ?, `is_active` = ?, `sort_order` = ?
                WHERE `id` = ?
            ");
            $stmt->execute([
                $portalKey, $portalType, $title, $subtitle, $entryUrl,
                $whId, $finalBgPath, $overlayOpacity, $bestFor,
                $permissionsSummary, $allowScan, $maskPhones, $expiresAt,
                $maxSessions, $isActive, $sortOrder, $id
            ]);
            $msg = "Updated portal '{$title}'.";
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO `standalone_portals`
                (`portal_key`, `portal_type`, `title`, `subtitle`, `entry_url`, `wh_id`, `background_image`, `overlay_opacity`, `best_for`, `permissions_summary`, `allow_scan`, `mask_phones`, `expires_at`, `max_sessions`, `is_active`, `is_system`, `sort_order`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            ");
            $stmt->execute([
                $portalKey, $portalType, $title, $subtitle, $entryUrl, $whId, $finalBgPath, $overlayOpacity,
                $bestFor, $permissionsSummary, $allowScan, $maskPhones, $expiresAt, $maxSessions, $isActive, $sortOrder
            ]);
            $id = (int) $pdo->lastInsertId();
            $msg = "Created portal '{$title}'.";
        }

        if ($portalType === 'facility_gate' && $whId && $terminalPinRaw !== '') {
            $pdo->prepare("UPDATE `stock_locations` SET `terminal_pin` = ? WHERE `id` = ?")->execute([$terminalPinRaw, $whId]);
        }
        if ($portalType === 'onsite_portal' && $onsitePwdRaw !== '') {
            $pwdRes = updateOnsiteSharePasswordConfig($pdo, (bool) $isActive, $onsitePwdRaw, true);
            if (!$pwdRes['ok']) {
                echo json_encode(['ok' => false, 'error' => $pwdRes['error']]);
                exit;
            }
        }

        echo json_encode([
            'ok' => true,
            'message' => $msg,
            'portal_id' => $id,
            'standalonePortals' => getStandalonePortalsList($pdo, true),
        ]);
        exit;
    }

    if ($action === 'reset_portal_background') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('reset_portal_background', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureStandalonePortalsTable($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $st = $pdo->prepare("SELECT `id`, `title`, `background_image` FROM `standalone_portals` WHERE `id` = ? LIMIT 1");
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            echo json_encode(['ok' => false, 'error' => 'Portal not found.']);
            exit;
        }
        $clean = ltrim(str_replace('\\', '/', trim((string) ($row['background_image'] ?? ''))), '/');
        if ($clean !== '' && strpos($clean, 'uploads/portals/') === 0 && strpos($clean, '..') === false) {
            $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $clean);
            if (is_file($abs)) {
                @unlink($abs);
            }
        }
        $pdo->prepare("UPDATE `standalone_portals` SET `background_image` = NULL WHERE `id` = ?")->execute([$id]);
        echo json_encode([
            'ok' => true,
            'message' => "Reset custom background image for '{$row['title']}'.",
            'standalonePortals' => getStandalonePortalsList($pdo, true),
        ]);
        exit;
    }

    if ($action === 'delete_standalone_portal') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_standalone_portal', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureStandalonePortalsTable($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $st = $pdo->prepare("SELECT * FROM `standalone_portals` WHERE `id` = ? LIMIT 1");
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            echo json_encode(['ok' => false, 'error' => 'Portal not found.']);
            exit;
        }
        if ((int) ($row['is_system'] ?? 0) === 1) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Built-in core gates and On-Site portal cannot be deleted (you can customize, pause, or reset their background).']);
            exit;
        }
        $clean = ltrim(str_replace('\\', '/', trim((string) ($row['background_image'] ?? ''))), '/');
        if ($clean !== '' && strpos($clean, 'uploads/portals/') === 0 && strpos($clean, '..') === false) {
            $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $clean);
            if (is_file($abs)) {
                @unlink($abs);
            }
        }
        $pdo->prepare("DELETE FROM `standalone_portals` WHERE `id` = ?")->execute([$id]);
        echo json_encode([
            'ok' => true,
            'message' => "Deleted custom portal '{$row['title']}'.",
            'standalonePortals' => getStandalonePortalsList($pdo, true),
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
                'standalonePortals' => getStandalonePortalsList($pdo, true),
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

    if (in_array($action, ['save_stock_item', 'sync_all_stock_images', 'delete_stock_item'], true)) {
        http_response_code(410);
        echo json_encode([
            'ok' => false,
            'error' => 'Equipment inventory endpoints have been omitted in Attendance-Only Deployment.',
        ]);
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

        // Normalize email (NULL when empty to avoid UNIQUE index collision on '')
        $hasEmailField = array_key_exists('email', $_POST) || array_key_exists('email', $jsonBody);
        $emailDb = $email !== '' ? $email : null;
        if ($id > 0 && !$hasEmailField) {
            $existingEmailStmt = $pdo->prepare("SELECT `email` FROM `users` WHERE `id` = ? LIMIT 1");
            $existingEmailStmt->execute([$id]);
            $prevEmail = $existingEmailStmt->fetchColumn();
            if ($prevEmail !== false && trim((string) $prevEmail) !== '') {
                $emailDb = trim((string) $prevEmail);
            }
        }
        if ($emailDb !== null) {
            $checkEmail = $pdo->prepare("SELECT `id` FROM `users` WHERE `email` = ? AND `id` != ? LIMIT 1");
            $checkEmail->execute([$emailDb, $id]);
            if ($checkEmail->fetch()) {
                echo json_encode(['ok' => false, 'error' => "Email '{$emailDb}' is already registered to another personnel account."]);
                exit;
            }
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
                $stmt->execute([$username, $fullName, $emailDb, $phone, $role, $department, $uploadedImagePath, $isActive, $id]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE `users`
                    SET `username` = ?, `full_name` = ?, `email` = ?, `phone` = ?, `role` = ?, `department` = ?, `is_active` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$username, $fullName, $emailDb, $phone, $role, $department, $isActive, $id]);
            }
            if ($userPass !== '') {
                $pHash = password_hash($userPass, PASSWORD_BCRYPT);
                if (usersTableHasPasswordCol($pdo)) {
                    $pdo->prepare("UPDATE `users` SET `password_hash` = ?, `password` = ? WHERE `id` = ?")->execute([$pHash, $pHash, $id]);
                } else {
                    $pdo->prepare("UPDATE `users` SET `password_hash` = ? WHERE `id` = ?")->execute([$pHash, $id]);
                }
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
            if (usersTableHasPasswordCol($pdo)) {
                $stmt = $pdo->prepare("
                    INSERT INTO `users`
                    (`username`, `full_name`, `email`, `password_hash`, `password`, `phone`, `role`, `department`, `profile_image`, `assigned_checkpoint_type`, `assigned_checkpoint_id`, `is_active`, `must_change_password`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([$username, $fullName, $emailDb, $pHash, $pHash, $phone, $role, $department, $uploadedImagePath, $insCpType, $insCpId, $isActive]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO `users`
                    (`username`, `full_name`, `email`, `password_hash`, `phone`, `role`, `department`, `profile_image`, `assigned_checkpoint_type`, `assigned_checkpoint_id`, `is_active`, `must_change_password`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([$username, $fullName, $emailDb, $pHash, $phone, $role, $department, $uploadedImagePath, $insCpType, $insCpId, $isActive]);
            }
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
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_department', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
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
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_department', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
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
            'standalone_portals' => 'sidebar-portals-count',
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

    if ($action === 'get_overview_widgets') {
        echo json_encode([
            'ok' => true,
            'overviewWidgetsConfig' => getOverviewWidgetsConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'toggle_overview_widgets_master') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureOverviewWidgetsTables($pdo);
        $enabledRaw = $_POST['enabled'] ?? $jsonBody['enabled'] ?? 1;
        $enabledStr = ((int) $enabledRaw === 1 || $enabledRaw === true || $enabledRaw === 'true') ? '1' : '0';
        $pdo->prepare("INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('overview_widgets_enabled', ?) ON DUPLICATE KEY UPDATE `setting_value` = ?")
            ->execute([$enabledStr, $enabledStr]);
        echo json_encode([
            'ok' => true,
            'message' => $enabledStr === '1' ? 'Gate Dashboard custom layout controls active.' : 'Gate Dashboard sections temporarily disabled.',
            'overviewWidgetsConfig' => getOverviewWidgetsConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'toggle_overview_widget') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureOverviewWidgetsTables($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $widgetKey = trim((string) ($_POST['widget_key'] ?? $jsonBody['widget_key'] ?? ''));
        $isEnabled = isset($_POST['is_enabled']) ? ((int) $_POST['is_enabled'] ? 1 : 0) : ((int) ($jsonBody['is_enabled'] ?? 1) ? 1 : 0);

        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT `id`, `label`, `widget_key` FROM `overview_widget_controls` WHERE `id` = ?");
            $stmt->execute([$id]);
        } else {
            $stmt = $pdo->prepare("SELECT `id`, `label`, `widget_key` FROM `overview_widget_controls` WHERE `widget_key` = ?");
            $stmt->execute([$widgetKey]);
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            echo json_encode(['ok' => false, 'error' => 'Dashboard widget item not found.']);
            exit;
        }
        $pdo->prepare("UPDATE `overview_widget_controls` SET `is_enabled` = ? WHERE `id` = ?")->execute([$isEnabled, (int) $row['id']]);
        echo json_encode([
            'ok' => true,
            'message' => ($isEnabled ? 'Enabled' : 'Disabled') . " '{$row['label']}'.",
            'overviewWidgetsConfig' => getOverviewWidgetsConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'save_overview_widget') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureOverviewWidgetsTables($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $label = trim((string) ($_POST['label'] ?? $jsonBody['label'] ?? ''));
        $allowedRoles = trim((string) ($_POST['allowed_roles'] ?? $jsonBody['allowed_roles'] ?? 'all'));
        $isEnabled = isset($_POST['is_enabled']) ? ((int) $_POST['is_enabled'] ? 1 : 0) : ((int) ($jsonBody['is_enabled'] ?? 1) ? 1 : 0);
        if ($allowedRoles === '') {
            $allowedRoles = 'all';
        }
        if ($id <= 0 || $label === '') {
            echo json_encode(['ok' => false, 'error' => 'Valid widget ID and label are required.']);
            exit;
        }
        $chk = $pdo->prepare("SELECT `id` FROM `overview_widget_controls` WHERE `id` = ?");
        $chk->execute([$id]);
        if (!$chk->fetch()) {
            echo json_encode(['ok' => false, 'error' => 'Dashboard widget item not found.']);
            exit;
        }
        $pdo->prepare("UPDATE `overview_widget_controls` SET `label` = ?, `allowed_roles` = ?, `is_enabled` = ? WHERE `id` = ?")
            ->execute([$label, $allowedRoles, $isEnabled, $id]);
        echo json_encode([
            'ok' => true,
            'message' => "Saved settings for '{$label}'.",
            'overviewWidgetsConfig' => getOverviewWidgetsConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'reset_overview_widgets_defaults') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('manage_navigation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureOverviewWidgetsTables($pdo, true);
        echo json_encode([
            'ok' => true,
            'message' => 'Gate Dashboard widget defaults restored.',
            'overviewWidgetsConfig' => getOverviewWidgetsConfig($pdo),
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
        if ($confirmPassword === '' || !verifyUserPasswordRow($caller, $confirmPassword)) {
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

    if ($action === 'save_attendance_log') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_attendance_log', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $inLogId = (int) ($_POST['in_log_id'] ?? $jsonBody['in_log_id'] ?? 0);
        $outLogId = (int) ($_POST['out_log_id'] ?? $jsonBody['out_log_id'] ?? 0);
        $userId = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'stock_warehouse'));
        $cpIdRaw = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? '1'));
        $mode = strtolower(trim((string) ($_POST['scan_action'] ?? $jsonBody['scan_action'] ?? 'check_in')));
        $accessStatus = strtolower(trim((string) ($_POST['access_status'] ?? $jsonBody['access_status'] ?? 'granted')));
        $punctuality = strtolower(trim((string) ($_POST['punctuality_status'] ?? $jsonBody['punctuality_status'] ?? 'on_time')));
        $inTimeRaw = trim((string) ($_POST['scanned_at'] ?? $jsonBody['scanned_at'] ?? ''));
        $outTimeRaw = trim((string) ($_POST['check_out_at'] ?? $jsonBody['check_out_at'] ?? ''));
        $notes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? ''));
        $denialReason = trim((string) ($_POST['denial_reason'] ?? $jsonBody['denial_reason'] ?? ''));

        if ($userId <= 0) {
            echo json_encode(['ok' => false, 'error' => 'Please select a staff member.']);
            exit;
        }
        if (!in_array($cpType, ['stock_warehouse', 'event_venue'], true)) {
            $cpType = 'stock_warehouse';
        }
        if (!in_array($mode, ['check_in', 'check_out', 'access_verify', 'session_complete'], true)) {
            $mode = 'check_in';
        }
        if (!in_array($accessStatus, ['granted', 'denied'], true)) {
            $accessStatus = 'granted';
        }
        if (!in_array($punctuality, ['early', 'on_time', 'late', 'n/a'], true)) {
            $punctuality = 'on_time';
        }

        $uStmt = $pdo->prepare("
            SELECT u.`id`, u.`full_name`, u.`username`, b.`badge_code`
            FROM `users` u
            LEFT JOIN `user_badges` b ON b.`user_id` = u.`id`
            WHERE u.`id` = ? LIMIT 1
        ");
        $uStmt->execute([$userId]);
        $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
        if (!$uRow) {
            echo json_encode(['ok' => false, 'error' => 'Staff member not found.']);
            exit;
        }
        $badgeCode = formatRewBadgeCode($userId, $uRow['badge_code'] ?? null);

        $lookup = loadCheckpointsLookup($pdo);
        $cpRec = findCheckpointRecord($lookup['stock_warehouses'], $lookup['event_venues'], $cpType, $cpIdRaw);
        $cpIdNum = $cpRec ? (int) $cpRec['id'] : (is_numeric($cpIdRaw) ? (int) $cpIdRaw : crc32($cpIdRaw));
        $cpName = $cpRec ? $cpRec['name'] : ($cpType === 'stock_warehouse' ? 'Facility Gate' : 'Event Venue');

        $normalizeTs = static function (string $raw): string {
            if ($raw === '') {
                return date('Y-m-d H:i:s');
            }
            $ts = strtotime(str_replace('T', ' ', $raw));
            return $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');
        };
        $inTsFormatted = $normalizeTs($inTimeRaw);
        $scannedBy = (int) ($caller['id'] ?? 1);

        $upsertSingle = static function (int $rowId, string $scanAct, string $scanTs) use (
            $pdo, $userId, $badgeCode, $cpType, $cpIdNum, $cpName, $accessStatus, $denialReason, $punctuality, $scannedBy, $notes
        ): void {
            $denialSafe = ($accessStatus === 'denied') ? ($denialReason !== '' ? $denialReason : 'Denied via Timeline Audit') : null;
            if ($rowId > 0) {
                $upd = $pdo->prepare("
                    UPDATE `attendance_logs`
                    SET `user_id` = ?, `badge_code` = ?, `checkpoint_type` = ?, `checkpoint_id` = ?, `checkpoint_name` = ?,
                        `scan_action` = ?, `access_status` = ?, `denial_reason` = ?, `punctuality_status` = ?, `notes` = ?, `scanned_at` = ?
                    WHERE `id` = ?
                ");
                $upd->execute([$userId, $badgeCode, $cpType, $cpIdNum, $cpName, $scanAct, $accessStatus, $denialSafe, $punctuality, $notes, $scanTs, $rowId]);
            } else {
                $ins = $pdo->prepare("
                    INSERT INTO `attendance_logs`
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $ins->execute([$userId, $badgeCode, $cpType, $cpIdNum, $cpName, $scanAct, $accessStatus, $denialSafe, $punctuality, $scannedBy, $notes, $scanTs]);
            }
        };

        if ($mode === 'session_complete' && $accessStatus === 'granted') {
            $outTsFormatted = $normalizeTs($outTimeRaw !== '' ? $outTimeRaw : $inTsFormatted);
            $targetInId = $inLogId > 0 ? $inLogId : ($id > 0 && $outLogId <= 0 ? $id : 0);
            $upsertSingle($targetInId, 'check_in', $inTsFormatted);
            $upsertSingle($outLogId, 'check_out', $outTsFormatted);
        } else {
            $targetId = $id > 0 ? $id : ($inLogId > 0 ? $inLogId : $outLogId);
            $singleAct = ($mode === 'session_complete') ? 'check_in' : $mode;
            $upsertSingle($targetId, $singleAct, $inTsFormatted);
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => ($id > 0 || $inLogId > 0 || $outLogId > 0)
                    ? 'Activity timeline log updated.'
                    : 'Activity timeline log recorded.',
            ]
        ));
        exit;
    }

    if ($action === 'delete_attendance_log') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_attendance_log', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $singleId = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $rawIds = $_POST['ids'] ?? $jsonBody['ids'] ?? [];
        if (!is_array($rawIds)) {
            $rawIds = json_decode((string) $rawIds, true) ?: [];
        }
        $ids = array_values(array_unique(array_filter(array_map('intval', $rawIds))));
        if ($singleId > 0 && !in_array($singleId, $ids, true)) {
            $ids[] = $singleId;
        }
        if (empty($ids)) {
            echo json_encode(['ok' => false, 'error' => 'Log ID is required.']);
            exit;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $del = $pdo->prepare("DELETE FROM `attendance_logs` WHERE `id` IN ({$placeholders})");
        $del->execute($ids);

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'message' => count($ids) > 1 ? 'Deleted attendance session (Check-In & Check-Out).' : 'Deleted activity timeline log.',
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
        if (!in_array($callerRole, ['admin', 'manager', 'administrator', 'project_manager', 'event_coordinator', 'stock_manager', 'tech_lead', 'stock_controller'], true)) {
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
        $reliefMode = strtolower(trim((string) ($_POST['relief_mode'] ?? $jsonBody['relief_mode'] ?? 'standard')));
        if (!in_array($reliefMode, ['standard', 'geo_qr', 'geo_qr_totp'], true)) {
            $reliefMode = 'standard';
        }
        $shiftStartRaw = trim((string) ($_POST['shift_start'] ?? $jsonBody['shift_start'] ?? ''));
        $shiftEndRaw = trim((string) ($_POST['shift_end'] ?? $jsonBody['shift_end'] ?? ''));
        $shiftStart = $shiftStartRaw !== '' ? date('Y-m-d H:i:s', strtotime($shiftStartRaw)) : null;
        $shiftEnd = $shiftEndRaw !== '' ? date('Y-m-d H:i:s', strtotime($shiftEndRaw)) : null;

        $ins = $pdo->prepare("
            INSERT INTO `controller_shift_requests`
            (`checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `requested_by_id`, `outgoing_controller_id`, `replacement_controller_id`, `reason_type`, `relief_mode`, `notes`, `shift_start`, `shift_end`, `status`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $ins->execute([
            $cpMeta['type'],
            (string) $cpMeta['id'],
            $cpMeta['name'],
            (int) $caller['id'],
            $outId,
            $repId,
            $reasonType,
            $reliefMode,
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

    if ($action === 'get_branding_config') {
        echo json_encode([
            'ok' => true,
            'brandingConfig' => getBrandingConfig($pdo),
            'brandingFonts' => getBrandingFontsList($pdo),
        ]);
        exit;
    }

    if ($action === 'save_branding_config') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_branding_config', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $payloadIn = !empty($jsonBody) ? $jsonBody : $_POST;
        $saved = saveBrandingConfig($pdo, $payloadIn);
        echo json_encode([
            'ok' => true,
            'message' => 'Branding theme configuration saved and applied.',
            'brandingConfig' => $saved,
            'brandingFonts' => getBrandingFontsList($pdo),
        ]);
        exit;
    }

    if ($action === 'list_branding_fonts') {
        echo json_encode([
            'ok' => true,
            'brandingFonts' => getBrandingFontsList($pdo),
        ]);
        exit;
    }

    if ($action === 'save_branding_font') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_branding_font', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureBrandingFontsTable($pdo);

        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $fontNameRaw = trim((string) ($_POST['font_name'] ?? $jsonBody['font_name'] ?? ''));
        $fontName = trim((string) preg_replace('/[^A-Za-z0-9 _-]+/', '', $fontNameRaw));
        $cssStackIn = trim((string) ($_POST['css_stack'] ?? $jsonBody['css_stack'] ?? ''));
        $cssStack = trim((string) preg_replace('/[<>;{}]/', '', $cssStackIn));
        $fontUrl = trim((string) ($_POST['font_url'] ?? $jsonBody['font_url'] ?? ''));
        $isActive = isset($_POST['is_active']) ? ((int) $_POST['is_active'] ? 1 : 0) : ((int) ($jsonBody['is_active'] ?? 1) ? 1 : 0);
        $activateAfterSave = !empty($_POST['activate']) || !empty($jsonBody['activate']);

        if ($fontName === '' || strlen($fontName) < 2) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Enter a valid font name (letters, numbers, spaces, hyphen).']);
            exit;
        }
        if ($fontUrl !== '' && !preg_match('#^https://[^\s<>"\']+$#i', $fontUrl)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'External font stylesheet URL must start with https://.']);
            exit;
        }
        if ($cssStack === '') {
            $cssStack = '"' . $fontName . '", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';
        }

        $existing = null;
        if ($id > 0) {
            $exSt = $pdo->prepare("SELECT * FROM `branding_fonts` WHERE `id` = ? LIMIT 1");
            $exSt->execute([$id]);
            $existing = $exSt->fetch(PDO::FETCH_ASSOC);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Font entry not found.']);
                exit;
            }
        }

        $finalFilePath = $existing ? (string) ($existing['file_path'] ?? '') : '';
        $finalFormat = $existing ? (string) ($existing['font_format'] ?? '') : '';

        $deleteManagedFontFile = static function (?string $rel): void {
            $clean = ltrim(str_replace('\\', '/', trim((string) $rel)), '/');
            if ($clean === '' || strpos($clean, 'uploads/branding/fonts/') !== 0 || strpos($clean, '..') !== false) {
                return;
            }
            $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $clean);
            if (is_file($abs)) {
                @unlink($abs);
            }
        };

        if (!empty($_FILES['font_file']['tmp_name']) && is_uploaded_file($_FILES['font_file']['tmp_name'])) {
            $tmpFile = (string) $_FILES['font_file']['tmp_name'];
            $fileSize = (int) ($_FILES['font_file']['size'] ?? 0);
            if ($fileSize <= 0 || $fileSize > 5 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Font file must be under 5 MB.']);
                exit;
            }
            $ext = strtolower(pathinfo((string) ($_FILES['font_file']['name'] ?? ''), PATHINFO_EXTENSION));
            $fmtMap = ['woff2' => 'woff2', 'woff' => 'woff', 'ttf' => 'truetype', 'otf' => 'opentype'];
            if (!isset($fmtMap[$ext])) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Supported font files: .woff2, .woff, .ttf, .otf.']);
                exit;
            }
            $dir = __DIR__ . '/uploads/branding/fonts';
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            $slug = strtolower((string) preg_replace('/[^a-z0-9_-]+/', '_', $fontName));
            $fileName = 'font_' . $slug . '_' . time() . '.' . $ext;
            if (!move_uploaded_file($tmpFile, $dir . '/' . $fileName)) {
                http_response_code(500);
                echo json_encode(['ok' => false, 'error' => 'Unable to store uploaded font file.']);
                exit;
            }
            $deleteManagedFontFile($finalFilePath);
            $finalFilePath = 'uploads/branding/fonts/' . $fileName;
            $finalFormat = $fmtMap[$ext];
        }

        try {
            if ($id > 0) {
                $oldName = (string) ($existing['font_name'] ?? '');
                $pdo->prepare("
                    UPDATE `branding_fonts`
                    SET `font_name` = ?, `css_stack` = ?, `font_url` = ?, `file_path` = ?, `font_format` = ?, `is_active` = ?
                    WHERE `id` = ?
                ")->execute([$fontName, $cssStack, $fontUrl !== '' ? $fontUrl : null, $finalFilePath !== '' ? $finalFilePath : null, $finalFormat !== '' ? $finalFormat : null, $isActive, $id]);

                $curBrand = getBrandingConfig($pdo);
                if ($oldName !== '' && $oldName === ($curBrand['font_family'] ?? '') && $oldName !== $fontName) {
                    saveBrandingConfig($pdo, ['font_family' => $fontName]);
                }
                $msg = "Font '{$fontName}' updated.";
            } else {
                $pdo->prepare("
                    INSERT INTO `branding_fonts` (`font_name`, `css_stack`, `font_url`, `file_path`, `font_format`, `is_system`, `is_active`)
                    VALUES (?, ?, ?, ?, ?, 0, ?)
                ")->execute([$fontName, $cssStack, $fontUrl !== '' ? $fontUrl : null, $finalFilePath !== '' ? $finalFilePath : null, $finalFormat !== '' ? $finalFormat : null, $isActive]);
                $id = (int) $pdo->lastInsertId();
                $msg = "Font '{$fontName}' created.";
            }
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'A font with that name already exists or could not be saved.']);
            exit;
        }

        if ($activateAfterSave && $isActive === 1) {
            saveBrandingConfig($pdo, ['font_family' => $fontName]);
        }

        echo json_encode([
            'ok' => true,
            'message' => $msg,
            'font_id' => $id,
            'brandingFonts' => getBrandingFontsList($pdo),
            'brandingConfig' => getBrandingConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'delete_branding_font') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('delete_branding_font', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        ensureBrandingFontsTable($pdo);
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $st = $pdo->prepare("SELECT * FROM `branding_fonts` WHERE `id` = ? LIMIT 1");
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Font not found.']);
            exit;
        }
        if ((int) ($row['is_system'] ?? 0) === 1) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'System preset fonts cannot be deleted. You can disable or add custom fonts instead.']);
            exit;
        }

        $rel = ltrim(str_replace('\\', '/', trim((string) ($row['file_path'] ?? ''))), '/');
        if ($rel !== '' && strpos($rel, 'uploads/branding/fonts/') === 0 && strpos($rel, '..') === false) {
            $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
            if (is_file($abs)) {
                @unlink($abs);
            }
        }

        $pdo->prepare("DELETE FROM `branding_fonts` WHERE `id` = ?")->execute([$id]);
        $curBrand = getBrandingConfig($pdo);
        if (($curBrand['font_family'] ?? '') === ($row['font_name'] ?? '')) {
            saveBrandingConfig($pdo, ['font_family' => 'Marvel']);
        }

        echo json_encode([
            'ok' => true,
            'message' => "Deleted font '{$row['font_name']}'.",
            'brandingFonts' => getBrandingFontsList($pdo),
            'brandingConfig' => getBrandingConfig($pdo),
        ]);
        exit;
    }

    if ($action === 'upload_branding_logo') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('upload_branding_logo', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $curBrand = getBrandingConfig($pdo);
        $oldLogo = trim((string) ($curBrand['logo_path'] ?? ''));
        $oldFavicon = trim((string) ($curBrand['favicon_path'] ?? ''));
        $deleteManagedBrandingAsset = static function (string $rel): void {
            $clean = ltrim(str_replace('\\', '/', $rel), '/');
            if ($clean !== '' && strpos($clean, 'uploads/branding/') === 0 && strpos($clean, 'uploads/branding/fonts/') !== 0 && strpos($clean, '..') === false) {
                $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $clean);
                if (is_file($abs)) {
                    @unlink($abs);
                }
            }
        };

        $generateSquareFaviconFromFile = static function (string $srcRel, string $dir): string {
            $absSrc = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $srcRel);
            if (!is_file($absSrc) || !function_exists('imagecreatetruecolor')) {
                return $srcRel;
            }
            $ext = strtolower(pathinfo($absSrc, PATHINFO_EXTENSION));
            if ($ext === 'svg') {
                return $srcRel;
            }
            $rawData = @file_get_contents($absSrc);
            $srcImg = $rawData ? @imagecreatefromstring($rawData) : false;
            if (!$srcImg) {
                return $srcRel;
            }
            $sw = imagesx($srcImg);
            $sh = imagesy($srcImg);
            if ($sw <= 0 || $sh <= 0) {
                imagedestroy($srcImg);
                return $srcRel;
            }
            $size = 64;
            $dst = imagecreatetruecolor($size, $size);
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $trans = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefilledrectangle($dst, 0, 0, $size, $size, $trans);
            imagealphablending($dst, true);
            $maxInner = 58.0;
            $scale = min($maxInner / $sw, $maxInner / $sh);
            $dw = max(1, (int) round($sw * $scale));
            $dh = max(1, (int) round($sh * $scale));
            $dx = (int) floor(($size - $dw) / 2);
            $dy = (int) floor(($size - $dh) / 2);
            imagecopyresampled($dst, $srcImg, $dx, $dy, 0, 0, $dw, $dh, $sw, $sh);
            $favName = 'favicon_' . time() . '_' . substr(md5(uniqid('', true)), 0, 5) . '.png';
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            $savedOk = @imagepng($dst, $dir . '/' . $favName);
            imagedestroy($dst);
            imagedestroy($srcImg);
            return $savedOk ? ('uploads/branding/' . $favName) : $srcRel;
        };

        $presetPath = trim((string) ($_POST['preset_path'] ?? $jsonBody['preset_path'] ?? ''));
        $newLogoPath = '';
        $newFavPath = '';
        $dir = __DIR__ . '/uploads/branding';
        if ($presetPath !== '') {
            $allowedPresets = ['assets/rwanda-events-logo.png', 'assets/brand-mark.svg', 'reLogo.png', 'reTransparentLogo.png'];
            if (!in_array($presetPath, $allowedPresets, true) || !is_file(__DIR__ . '/' . $presetPath)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Selected preset logo file does not exist.']);
                exit;
            }
            $deleteManagedBrandingAsset($oldLogo);
            $deleteManagedBrandingAsset($oldFavicon);
            if ($presetPath === 'assets/rwanda-events-logo.png') {
                $newLogoPath = '';
                $newFavPath = '';
            } else {
                $newLogoPath = $presetPath;
                $newFavPath = $presetPath === 'assets/brand-mark.svg' ? $presetPath : $generateSquareFaviconFromFile($presetPath, $dir);
            }
        } elseif (!empty($_FILES['logo']['tmp_name']) && is_uploaded_file($_FILES['logo']['tmp_name'])) {
            $tmpFile = (string) $_FILES['logo']['tmp_name'];
            $fileSize = (int) ($_FILES['logo']['size'] ?? 0);
            if ($fileSize <= 0 || $fileSize > 5 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Logo image must be smaller than 5 MB.']);
                exit;
            }
            $ext = strtolower(pathinfo((string) ($_FILES['logo']['name'] ?? ''), PATHINFO_EXTENSION));
            if (!in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'], true)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Unsupported logo format. Upload PNG, JPG, WEBP, GIF, or clean SVG.']);
                exit;
            }
            if ($ext === 'svg') {
                $svgContent = (string) file_get_contents($tmpFile);
                if (stripos($svgContent, '<svg') === false || preg_match('/<\s*script|on[a-z]+\s*=|javascript:/i', $svgContent)) {
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'error' => 'Invalid or unsafe SVG logo file.']);
                    exit;
                }
            } elseif (@getimagesize($tmpFile) === false) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Uploaded logo is not a valid image file.']);
                exit;
            }
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            $fileName = 'logo_' . time() . '_' . substr(md5(uniqid('', true)), 0, 6) . '.' . $ext;
            if (!move_uploaded_file($tmpFile, $dir . '/' . $fileName)) {
                http_response_code(500);
                echo json_encode(['ok' => false, 'error' => 'Failed to save logo image on server.']);
                exit;
            }
            $deleteManagedBrandingAsset($oldLogo);
            $deleteManagedBrandingAsset($oldFavicon);
            $newLogoPath = 'uploads/branding/' . $fileName;
            $newFavPath = ($ext === 'svg') ? $newLogoPath : $generateSquareFaviconFromFile($newLogoPath, $dir);
        } else {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Select a logo image or preset to apply.']);
            exit;
        }

        $brandNameIn = trim((string) ($_POST['brand_name'] ?? $jsonBody['brand_name'] ?? ''));
        $savePayload = ['logo_path' => $newLogoPath, 'favicon_path' => $newFavPath];
        if ($brandNameIn !== '') {
            $savePayload['brand_name'] = $brandNameIn;
        }
        $saved = saveBrandingConfig($pdo, $savePayload);
        echo json_encode([
            'ok' => true,
            'message' => 'Brand logo and favicon updated across portals.',
            'brandingConfig' => $saved,
        ]);
        exit;
    }

    if ($action === 'reset_branding_logo') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('reset_branding_logo', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $curBrand = getBrandingConfig($pdo);
        foreach (['logo_path', 'favicon_path'] as $key) {
            $oldAsset = ltrim(str_replace('\\', '/', trim((string) ($curBrand[$key] ?? ''))), '/');
            if ($oldAsset !== '' && strpos($oldAsset, 'uploads/branding/') === 0 && strpos($oldAsset, 'uploads/branding/fonts/') !== 0 && strpos($oldAsset, '..') === false) {
                $abs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $oldAsset);
                if (is_file($abs)) {
                    @unlink($abs);
                }
            }
        }
        $saved = saveBrandingConfig($pdo, ['logo_path' => '', 'favicon_path' => '']);
        echo json_encode([
            'ok' => true,
            'message' => 'Brand logo and favicon reset to default.',
            'brandingConfig' => $saved,
        ]);
        exit;
    }

    if ($action === 'change_own_password') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        if (!$caller) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Authentication required.']);
            exit;
        }
        $curPwd = (string) ($_POST['current_password'] ?? $jsonBody['current_password'] ?? '');
        $newPwd = (string) ($_POST['new_password'] ?? $jsonBody['new_password'] ?? '');
        $confPwd = (string) ($_POST['confirm_password'] ?? $jsonBody['confirm_password'] ?? '');

        if (!verifyUserPasswordRow($caller, $curPwd)) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Current password is incorrect.']);
            exit;
        }
        if (strlen($newPwd) < 8) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'New password must be at least 8 characters long.']);
            exit;
        }
        if ($confPwd !== '' && $newPwd !== $confPwd) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'New password and confirmation do not match.']);
            exit;
        }
        if ($curPwd === $newPwd) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'New password must differ from your current password.']);
            exit;
        }

        $newHash = password_hash($newPwd, PASSWORD_DEFAULT);
        if (usersTableHasPasswordCol($pdo)) {
            $pdo->prepare("UPDATE `users` SET `password_hash` = ?, `password` = ?, `must_change_password` = 0 WHERE `id` = ?")
                ->execute([$newHash, $newHash, (int) $caller['id']]);
        } else {
            $pdo->prepare("UPDATE `users` SET `password_hash` = ?, `must_change_password` = 0 WHERE `id` = ?")
                ->execute([$newHash, (int) $caller['id']]);
        }
        echo json_encode([
            'ok' => true,
            'message' => 'Your password has been updated cleanly.',
            'must_change_password' => 0,
        ]);
        exit;
    }

    if ($action === 'totp_status') {
        $caller = getCallerUser($pdo);
        if (!$caller) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Authentication required.']);
            exit;
        }
        $st = $pdo->prepare("SELECT `is_enabled`, `verified_at`, `updated_at` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
        $st->execute([(int) $caller['id']]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        echo json_encode([
            'ok' => true,
            'enabled' => $row ? ((int) $row['is_enabled'] === 1) : false,
            'has_pending_secret' => ($row && (int) $row['is_enabled'] === 0),
            'verified_at' => $row['verified_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ]);
        exit;
    }

    if ($action === 'totp_setup') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        if (!$caller) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Authentication required.']);
            exit;
        }
        $secret = base32Encode(random_bytes(20));
        $pdo->prepare("
            INSERT INTO `user_totp_secrets` (`user_id`, `secret_base32`, `is_enabled`, `verified_at`)
            VALUES (?, ?, 0, NULL)
            ON DUPLICATE KEY UPDATE `secret_base32` = VALUES(`secret_base32`), `is_enabled` = 0, `verified_at` = NULL
        ")->execute([(int) $caller['id'], $secret]);

        $account = (string) ($caller['username'] ?: ($caller['email'] ?: ('user' . $caller['id'])));
        $issuer = 'aBility Manager';
        $label = rawurlencode($issuer) . ':' . rawurlencode($account);
        $otpauthUri = "otpauth://totp/{$label}?secret={$secret}&issuer=" . rawurlencode($issuer) . "&digits=6&period=30";

        echo json_encode([
            'ok' => true,
            'secret' => $secret,
            'otpauth_uri' => $otpauthUri,
            'account' => $account,
            'issuer' => $issuer,
            'message' => 'Scan the QR code in Google Authenticator / Authy and enter the 6-digit code to enable.',
        ]);
        exit;
    }

    if ($action === 'totp_verify_enable') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        if (!$caller) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Authentication required.']);
            exit;
        }
        $code = preg_replace('/\D+/', '', (string) ($_POST['code'] ?? $jsonBody['code'] ?? ''));
        $st = $pdo->prepare("SELECT `secret_base32` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
        $st->execute([(int) $caller['id']]);
        $secret = (string) ($st->fetchColumn() ?: '');
        if ($secret === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'No Authenticator setup found. Click Setup Authenticator first.']);
            exit;
        }
        if (!verifyTotpCode($secret, $code, 1)) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Invalid 6-digit Authenticator code. Check device time sync and try again.']);
            exit;
        }
        $pdo->prepare("UPDATE `user_totp_secrets` SET `is_enabled` = 1, `verified_at` = NOW() WHERE `user_id` = ?")
            ->execute([(int) $caller['id']]);
        echo json_encode([
            'ok' => true,
            'enabled' => true,
            'message' => 'Authenticator (TOTP) 2FA verified and active on your account.',
        ]);
        exit;
    }

    if ($action === 'totp_disable') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        if (!$caller) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Authentication required.']);
            exit;
        }
        $pwd = (string) ($_POST['password'] ?? $jsonBody['password'] ?? '');
        if (!verifyUserPasswordRow($caller, $pwd)) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Account password required to disable Authenticator 2FA.']);
            exit;
        }
        $pdo->prepare("DELETE FROM `user_totp_secrets` WHERE `user_id` = ?")->execute([(int) $caller['id']]);
        echo json_encode([
            'ok' => true,
            'enabled' => false,
            'message' => 'Authenticator (TOTP) 2FA disabled.',
        ]);
        exit;
    }

    if ($action === 'generate_relief_qr') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('generate_relief_qr', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }

        $shiftRequestId = (int) ($_POST['shift_request_id'] ?? $jsonBody['shift_request_id'] ?? 0);
        $assignedUserId = (int) ($_POST['assigned_user_id'] ?? $jsonBody['assigned_user_id'] ?? $_POST['replacement_controller_id'] ?? $jsonBody['replacement_controller_id'] ?? 0);
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'stock_warehouse'));
        $cpIdRaw = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? ''));
        $durationHours = max(1, min(72, (int) ($_POST['duration_hours'] ?? $jsonBody['duration_hours'] ?? 8)));
        $expiresMinutes = max(5, min(1440, (int) ($_POST['expires_minutes'] ?? $jsonBody['expires_minutes'] ?? 60)));
        $requireTotp = isset($_POST['require_totp'])
            ? ((int) $_POST['require_totp'] ? 1 : 0)
            : (isset($jsonBody['require_totp']) ? ((int) $jsonBody['require_totp'] ? 1 : 0) : 1);
        $requireGeofence = isset($_POST['require_geofence'])
            ? ((int) $_POST['require_geofence'] ? 1 : 0)
            : (isset($jsonBody['require_geofence']) ? ((int) $jsonBody['require_geofence'] ? 1 : 0) : 1);
        $notes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? 'Geo-Fenced Temporary Relief QR'));

        if ($shiftRequestId > 0) {
            $srSt = $pdo->prepare("SELECT * FROM `controller_shift_requests` WHERE `id` = ? LIMIT 1");
            $srSt->execute([$shiftRequestId]);
            $srRow = $srSt->fetch(PDO::FETCH_ASSOC);
            if ($srRow) {
                if ($assignedUserId <= 0) {
                    $assignedUserId = (int) ($srRow['replacement_controller_id'] ?? 0);
                }
                if ($cpIdRaw === '') {
                    $cpType = (string) ($srRow['checkpoint_type'] ?? 'stock_warehouse');
                    $cpIdRaw = (string) ($srRow['checkpoint_id'] ?? '');
                }
            } else {
                $shiftRequestId = 0;
            }
        }

        if ($assignedUserId <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Select a Relief Gate Controller before generating a Geo-Fenced QR token.']);
            exit;
        }

        $uSt = $pdo->prepare("SELECT `id`, `full_name`, `username`, `role` FROM `users` WHERE `id` = ? LIMIT 1");
        $uSt->execute([$assignedUserId]);
        $targetUser = $uSt->fetch(PDO::FETCH_ASSOC);
        if (!$targetUser) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Target controller account not found.']);
            exit;
        }

        $lookup = loadCheckpointsLookup($pdo);
        $cpMeta = findCheckpointRecord($lookup['stock_warehouses'], $lookup['event_venues'], $cpType, $cpIdRaw);
        if (!$cpMeta) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Select a valid checkpoint terminal.']);
            exit;
        }

        $cpDbRadius = 200;
        $cpHasCoords = false;
        try {
            if ($cpMeta['type'] === 'event_venue') {
                $cSt = $pdo->prepare("SELECT `lat`, `lng`, `geofence_radius_m` FROM `events` WHERE `id` = ? LIMIT 1");
                $cSt->execute([(string) $cpMeta['raw_id']]);
            } else {
                $cSt = $pdo->prepare("SELECT `lat`, `lng`, `geofence_radius_m` FROM `stock_locations` WHERE `id` = ? LIMIT 1");
                $cSt->execute([(int) $cpMeta['id']]);
            }
            $cRow = $cSt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) {
                $cpDbRadius = max(50, min(5000, (int) ($cRow['geofence_radius_m'] ?? 200)));
                $cpHasCoords = ($cRow['lat'] !== null && $cRow['lng'] !== null);
            }
        } catch (Throwable $e) {}

        $radiusM = isset($_POST['geofence_radius_m']) || isset($jsonBody['geofence_radius_m'])
            ? max(50, min(5000, (int) ($_POST['geofence_radius_m'] ?? $jsonBody['geofence_radius_m'] ?? $cpDbRadius)))
            : $cpDbRadius;

        $totpCheck = $pdo->prepare("SELECT `is_enabled` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
        $totpCheck->execute([$assignedUserId]);
        $targetTotpEnabled = ((int) $totpCheck->fetchColumn() === 1);

        $shiftStartStr = date('Y-m-d H:i:s');
        $shiftEndStr = date('Y-m-d H:i:s', time() + $durationHours * 3600);
        $qrExpiresAt = date('Y-m-d H:i:s', time() + $expiresMinutes * 60);
        $reliefModeVal = $requireTotp ? 'geo_qr_totp' : 'geo_qr';

        if ($shiftRequestId <= 0) {
            $insSr = $pdo->prepare("
                INSERT INTO `controller_shift_requests`
                (`checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `requested_by_id`, `replacement_controller_id`, `reason_type`, `relief_mode`, `notes`, `shift_start`, `shift_end`, `status`)
                VALUES (?, ?, ?, ?, ?, 'shift_swap', ?, ?, ?, ?, 'pending')
            ");
            $insSr->execute([
                $cpMeta['type'],
                (string) $cpMeta['id'],
                $cpMeta['name'],
                (int) $caller['id'],
                $assignedUserId,
                $reliefModeVal,
                $notes,
                $shiftStartStr,
                $shiftEndStr,
            ]);
            $shiftRequestId = (int) $pdo->lastInsertId();
        } else {
            $pdo->prepare("UPDATE `controller_shift_requests` SET `relief_mode` = ?, `shift_end` = COALESCE(`shift_end`, ?) WHERE `id` = ?")
                ->execute([$reliefModeVal, $shiftEndStr, $shiftRequestId]);
        }

        $rawToken = bin2hex(random_bytes(24));
        $tokenHash = hash('sha256', $rawToken);
        $insTok = $pdo->prepare("
            INSERT INTO `relief_qr_tokens`
            (`shift_request_id`, `token_hash`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `assigned_user_id`, `require_totp`, `require_geofence`, `geofence_radius_m`, `expires_at`, `created_by_id`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insTok->execute([
            $shiftRequestId,
            $tokenHash,
            $cpMeta['type'],
            (string) $cpMeta['id'],
            $cpMeta['name'],
            $assignedUserId,
            $requireTotp,
            $requireGeofence,
            $radiusM,
            $qrExpiresAt,
            (int) $caller['id'],
        ]);
        $tokenId = (int) $pdo->lastInsertId();

        $full = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        echo json_encode(array_merge($full, [
            'ok' => true,
            'token' => $rawToken,
            'token_id' => $tokenId,
            'shift_request_id' => $shiftRequestId,
            'relief_url' => 'relief.php?token=' . $rawToken,
            'checkpoint_name' => $cpMeta['name'],
            'assigned_user_name' => (string) ($targetUser['full_name'] ?: $targetUser['username']),
            'geofence_radius_m' => $radiusM,
            'checkpoint_has_coords' => $cpHasCoords,
            'require_totp' => $requireTotp,
            'require_geofence' => $requireGeofence,
            'target_totp_enabled' => $targetTotpEnabled,
            'expires_at' => $qrExpiresAt,
            'shift_end' => $shiftEndStr,
            'message' => "Geo-Fenced Relief QR generated for {$targetUser['full_name']} at {$cpMeta['name']}.",
        ]));
        exit;
    }

    if ($action === 'get_relief_token_info') {
        $rawToken = trim((string) ($_GET['token'] ?? $_POST['token'] ?? $jsonBody['token'] ?? ''));
        if ($rawToken === '' || !preg_match('/^[a-f0-9]{16,128}$/i', $rawToken)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Invalid or missing Relief QR token.']);
            exit;
        }
        $tokenHash = hash('sha256', $rawToken);
        $st = $pdo->prepare("SELECT * FROM `relief_qr_tokens` WHERE `token_hash` = ? LIMIT 1");
        $st->execute([$tokenHash]);
        $tok = $st->fetch(PDO::FETCH_ASSOC);
        if (!$tok) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Relief QR token was not found.']);
            exit;
        }

        $uSt = $pdo->prepare("SELECT `id`, `username`, `full_name`, `role` FROM `users` WHERE `id` = ? LIMIT 1");
        $uSt->execute([(int) $tok['assigned_user_id']]);
        $targetUser = $uSt->fetch(PDO::FETCH_ASSOC) ?: null;

        $tSt = $pdo->prepare("SELECT `is_enabled` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
        $tSt->execute([(int) $tok['assigned_user_id']]);
        $targetTotpEnabled = ((int) $tSt->fetchColumn() === 1);

        $cpLat = null;
        $cpLng = null;
        $cpLoc = '';
        if ($tok['checkpoint_type'] === 'event_venue') {
            $cSt = $pdo->prepare("SELECT `lat`, `lng`, `location` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $cSt->execute([(string) $tok['checkpoint_id'], (string) $tok['checkpoint_id']]);
        } else {
            $cSt = $pdo->prepare("SELECT `lat`, `lng`, `location` FROM `stock_locations` WHERE `id` = ? LIMIT 1");
            $cSt->execute([(int) $tok['checkpoint_id']]);
        }
        $cpRow = $cSt->fetch(PDO::FETCH_ASSOC);
        if ($cpRow) {
            $cpLat = $cpRow['lat'] !== null ? (float) $cpRow['lat'] : null;
            $cpLng = $cpRow['lng'] !== null ? (float) $cpRow['lng'] : null;
            $cpLoc = (string) ($cpRow['location'] ?? '');
        }

        $shiftEnd = null;
        if ((int) $tok['shift_request_id'] > 0) {
            $sSt = $pdo->prepare("SELECT `shift_end` FROM `controller_shift_requests` WHERE `id` = ? LIMIT 1");
            $sSt->execute([(int) $tok['shift_request_id']]);
            $shiftEnd = $sSt->fetchColumn() ?: null;
        }

        $isRedeemed = !empty($tok['redeemed_at']);
        $isExpired = !empty($tok['expires_at']) && strtotime((string) $tok['expires_at']) < time();
        $sessionUserId = (int) ($_SESSION['auth_user_id'] ?? 0);

        echo json_encode([
            'ok' => true,
            'csrf_token' => getSessionCsrfToken(),
            'session_user_id' => $sessionUserId,
            'token_info' => [
                'id' => (int) $tok['id'],
                'status' => $isRedeemed ? 'redeemed' : ($isExpired ? 'expired' : 'active'),
                'checkpoint_type' => (string) $tok['checkpoint_type'],
                'checkpoint_id' => (string) $tok['checkpoint_id'],
                'checkpoint_name' => (string) $tok['checkpoint_name'],
                'checkpoint_location' => $cpLoc,
                'checkpoint_lat' => $cpLat,
                'checkpoint_lng' => $cpLng,
                'geofence_radius_m' => (int) $tok['geofence_radius_m'],
                'require_geofence' => (int) $tok['require_geofence'],
                'require_totp' => (int) $tok['require_totp'],
                'assigned_user_id' => (int) $tok['assigned_user_id'],
                'assigned_user_name' => $targetUser ? (string) ($targetUser['full_name'] ?: $targetUser['username']) : 'Relief Controller',
                'assigned_username' => $targetUser ? (string) $targetUser['username'] : '',
                'target_totp_enabled' => $targetTotpEnabled,
                'expires_at' => (string) $tok['expires_at'],
                'redeemed_at' => $tok['redeemed_at'] ?: null,
                'shift_end' => $shiftEnd,
            ],
        ]);
        exit;
    }

    if ($action === 'redeem_relief_qr') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        if (!validateCsrfForAuthenticatedPost($jsonBody)) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'Invalid or expired security token. Refresh the page and retry.']);
            exit;
        }

        $rawToken = trim((string) ($_POST['token'] ?? $jsonBody['token'] ?? ''));
        $totpCode = preg_replace('/\D+/', '', (string) ($_POST['totp_code'] ?? $jsonBody['totp_code'] ?? ''));
        $supervisorPin = trim((string) ($_POST['supervisor_pin'] ?? $jsonBody['supervisor_pin'] ?? ''));
        $latIn = $_POST['lat'] ?? $jsonBody['lat'] ?? null;
        $lngIn = $_POST['lng'] ?? $jsonBody['lng'] ?? null;
        $hasGps = ($latIn !== null && $latIn !== '' && $lngIn !== null && $lngIn !== '' && is_numeric($latIn) && is_numeric($lngIn));
        $loginUsername = trim((string) ($_POST['username'] ?? $jsonBody['username'] ?? ''));
        $loginPassword = (string) ($_POST['password'] ?? $jsonBody['password'] ?? '');

        if ($rawToken === '' || !preg_match('/^[a-f0-9]{16,128}$/i', $rawToken)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Invalid Relief QR token.']);
            exit;
        }

        $tokenHash = hash('sha256', $rawToken);
        $clientIp = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'local'));
        $rateKey = 'relief_redeem:' . substr($tokenHash, 0, 16) . ':' . sha1(strtolower($clientIp));
        $rateCheck = checkSecurityRateLimit($pdo, $rateKey, 6, 600);
        if (!$rateCheck['allowed']) {
            http_response_code(429);
            echo json_encode(['ok' => false, 'error' => "Too many attempts. Wait {$rateCheck['retry_after']}s and retry."]);
            exit;
        }

        $st = $pdo->prepare("SELECT * FROM `relief_qr_tokens` WHERE `token_hash` = ? LIMIT 1");
        $st->execute([$tokenHash]);
        $tok = $st->fetch(PDO::FETCH_ASSOC);
        if (!$tok) {
            recordFailedRateLimit($pdo, $rateKey, 6, 600, 60);
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Relief QR token not found.']);
            exit;
        }
        if (!empty($tok['redeemed_at'])) {
            http_response_code(409);
            echo json_encode(['ok' => false, 'error' => 'This Relief QR code was already redeemed at ' . $tok['redeemed_at'] . '. Request a fresh QR code from a Supervisor.']);
            exit;
        }
        if (!empty($tok['expires_at']) && strtotime((string) $tok['expires_at']) < time()) {
            http_response_code(410);
            echo json_encode(['ok' => false, 'error' => 'This Relief QR code expired at ' . $tok['expires_at'] . '. Request a fresh QR code.']);
            exit;
        }

        $assignedUserId = (int) $tok['assigned_user_id'];
        $uSt = $pdo->prepare("SELECT * FROM `users` WHERE `id` = ? LIMIT 1");
        $uSt->execute([$assignedUserId]);
        $targetUser = $uSt->fetch(PDO::FETCH_ASSOC);
        if (!$targetUser) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Assigned relief controller account no longer exists.']);
            exit;
        }

        // Verify caller identity (active matching/supervisor session OR target user's login credentials)
        $sessionUserId = (int) ($_SESSION['auth_user_id'] ?? 0);
        $caller = $sessionUserId > 0 ? getCallerUser($pdo) : null;
        $callerRole = strtolower(trim((string) ($caller['role'] ?? '')));
        $isSupervisorSession = ($caller && in_array($callerRole, ['admin', 'administrator', 'manager', 'stock_manager', 'project_manager', 'event_coordinator'], true));

        if ($sessionUserId > 0 && $sessionUserId !== $assignedUserId && !$isSupervisorSession) {
            recordFailedRateLimit($pdo, $rateKey, 6, 600, 60);
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => "This Relief QR is issued for {$targetUser['full_name']}. Sign in with their account or ask an Administrator to activate it."]);
            exit;
        }
        if ($sessionUserId <= 0) {
            if ($loginUsername === '' || $loginPassword === '') {
                http_response_code(401);
                echo json_encode(['ok' => false, 'error' => "Enter {$targetUser['username']}'s username and password to verify your identity before activating relief."]);
                exit;
            }
            $uMatch = (strtolower($loginUsername) === strtolower((string) $targetUser['username']) || strtolower($loginUsername) === strtolower((string) ($targetUser['email'] ?? '')));
            if (!$uMatch || !verifyUserPasswordRow($targetUser, $loginPassword)) {
                recordFailedRateLimit($pdo, $rateKey, 6, 600, 60);
                http_response_code(401);
                echo json_encode(['ok' => false, 'error' => 'Incorrect username or password for this Relief QR assignee.']);
                exit;
            }
        }

        // Lookup checkpoint coordinates & terminal PIN
        $cpLat = null;
        $cpLng = null;
        $expectedPin = '';
        if ($tok['checkpoint_type'] === 'event_venue') {
            $cSt = $pdo->prepare("SELECT `lat`, `lng`, `terminal_pin` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $cSt->execute([(string) $tok['checkpoint_id'], (string) $tok['checkpoint_id']]);
            $cRow = $cSt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) {
                $cpLat = $cRow['lat'] !== null ? (float) $cRow['lat'] : null;
                $cpLng = $cRow['lng'] !== null ? (float) $cRow['lng'] : null;
                $expectedPin = trim((string) ($cRow['terminal_pin'] ?? ''));
            }
        } else {
            $cSt = $pdo->prepare("SELECT * FROM `stock_locations` WHERE `id` = ? LIMIT 1");
            $cSt->execute([(int) $tok['checkpoint_id']]);
            $cRow = $cSt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) {
                $cpLat = $cRow['lat'] !== null ? (float) $cRow['lat'] : null;
                $cpLng = $cRow['lng'] !== null ? (float) $cRow['lng'] : null;
                $expectedPin = resolveWarehouseTerminalPin($cRow);
            }
        }

        // Check Geo-Fence OR Supervisor Override PIN
        $overrideUsed = 0;
        $distanceM = null;
        if ($hasGps && $cpLat !== null && $cpLng !== null) {
            $distanceM = (int) round(calculateHaversineMeters($cpLat, $cpLng, (float) $latIn, (float) $lngIn));
        }

        if ($supervisorPin !== '') {
            if ($expectedPin === '' || !verifyTerminalPinSecret($supervisorPin, $expectedPin)) {
                recordFailedRateLimit($pdo, $rateKey, 6, 600, 60);
                http_response_code(401);
                echo json_encode(['ok' => false, 'error' => 'Incorrect Supervisor Override PIN for this checkpoint.']);
                exit;
            }
            $overrideUsed = 1;
        } elseif ((int) $tok['require_geofence'] === 1) {
            if ($cpLat === null || $cpLng === null) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Checkpoint GPS coordinates are not configured yet. Enter Supervisor Override PIN or configure Lat/Lng in Settings > Relief & Geo-QR.']);
                exit;
            }
            if (!$hasGps) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'GPS location permission is required to verify you are within ' . (int) $tok['geofence_radius_m'] . 'm of the gate, or enter Supervisor Override PIN.']);
                exit;
            }
            if ($distanceM > (int) $tok['geofence_radius_m']) {
                recordFailedRateLimit($pdo, $rateKey, 6, 600, 60);
                http_response_code(403);
                echo json_encode(['ok' => false, 'distance_m' => $distanceM, 'error' => "Outside Geo-Fence: {$distanceM}m away from {$tok['checkpoint_name']} (max {$tok['geofence_radius_m']}m)."]);
                exit;
            }
        }

        // Check Authenticator (TOTP)
        $tSt = $pdo->prepare("SELECT `secret_base32`, `is_enabled` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
        $tSt->execute([$assignedUserId]);
        $totpRow = $tSt->fetch(PDO::FETCH_ASSOC);
        $totpIsEnabled = ($totpRow && (int) $totpRow['is_enabled'] === 1);

        if ((int) $tok['require_totp'] === 1 || $totpIsEnabled) {
            if (!$totpIsEnabled) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Authenticator (TOTP) is required for this Relief QR, but is not yet enabled for this controller. Open Settings > Relief & Geo-QR to enroll TOTP.']);
                exit;
            }
            if (!verifyTotpCode((string) $totpRow['secret_base32'], $totpCode, 1)) {
                recordFailedRateLimit($pdo, $rateKey, 6, 600, 60);
                http_response_code(401);
                echo json_encode(['ok' => false, 'error' => 'Invalid or expired 6-digit Authenticator (TOTP) code.']);
                exit;
            }
        }

        // Atomic single-use redemption & temporary checkpoint activation
        $pdo->beginTransaction();
        try {
            $redeemStmt = $pdo->prepare("
                UPDATE `relief_qr_tokens`
                SET `redeemed_at` = NOW(), `redeemed_by_id` = ?, `verified_lat` = ?, `verified_lng` = ?, `distance_m` = ?, `override_used` = ?
                WHERE `id` = ? AND `redeemed_at` IS NULL
            ");
            $redeemStmt->execute([
                $assignedUserId,
                $hasGps ? (float) $latIn : null,
                $hasGps ? (float) $lngIn : null,
                $distanceM,
                $overrideUsed,
                (int) $tok['id'],
            ]);
            if ($redeemStmt->rowCount() !== 1) {
                $pdo->rollBack();
                http_response_code(409);
                echo json_encode(['ok' => false, 'error' => 'This Relief QR code was already redeemed.']);
                exit;
            }

            $assignmentExpiresAt = date('Y-m-d H:i:s', time() + 8 * 3600);
            if ((int) $tok['shift_request_id'] > 0) {
                $sSt = $pdo->prepare("SELECT `shift_end` FROM `controller_shift_requests` WHERE `id` = ? LIMIT 1");
                $sSt->execute([(int) $tok['shift_request_id']]);
                $srEnd = $sSt->fetchColumn();
                if ($srEnd) {
                    $assignmentExpiresAt = (string) $srEnd;
                }
                $pdo->prepare("
                    UPDATE `controller_shift_requests`
                    SET `status` = 'approved', `reviewed_by_id` = COALESCE(`reviewed_by_id`, ?), `reviewed_at` = NOW(),
                        `review_notes` = CONCAT(COALESCE(`review_notes`, ''), CASE WHEN COALESCE(`review_notes`, '') != '' THEN ' · ' ELSE '' END, ?)
                    WHERE `id` = ?
                ")->execute([
                    (int) $tok['created_by_id'],
                    ($overrideUsed ? 'Redeemed via Supervisor PIN Override' : 'Redeemed via Geo-Fenced QR') . ($distanceM !== null ? " ({$distanceM}m)" : ''),
                    (int) $tok['shift_request_id'],
                ]);
            }

            $pdo->prepare("
                UPDATE `users`
                SET `assigned_checkpoint_type` = ?, `assigned_checkpoint_id` = ?, `assignment_expires_at` = ?
                WHERE `id` = ?
            ")->execute([
                (string) $tok['checkpoint_type'],
                (string) $tok['checkpoint_id'],
                $assignmentExpiresAt,
                $assignedUserId,
            ]);

            if ($tok['checkpoint_type'] === 'stock_warehouse' && ctype_digit((string) $tok['checkpoint_id']) && !empty($targetUser['full_name'])) {
                try {
                    $pdo->prepare("UPDATE `stock_locations` SET `controller_name` = ? WHERE `id` = ?")
                        ->execute([(string) $targetUser['full_name'], (int) $tok['checkpoint_id']]);
                } catch (Throwable $e) {}
            }

            $pdo->commit();
        } catch (Throwable $txErr) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $txErr;
        }

        clearSecurityRateLimit($pdo, $rateKey);
        if ($sessionUserId <= 0) {
            if (session_status() === PHP_SESSION_ACTIVE) {
                @session_regenerate_id(true);
            }
            $_SESSION['auth_user_id'] = $assignedUserId;
            $_SESSION['auth_user_role'] = strtolower((string) ($targetUser['role'] ?? 'stock_controller'));
        }

        echo json_encode([
            'ok' => true,
            'message' => "Temporary relief activated for {$tok['checkpoint_name']} until {$assignmentExpiresAt}.",
            'checkpoint_type' => (string) $tok['checkpoint_type'],
            'checkpoint_id' => (string) $tok['checkpoint_id'],
            'checkpoint_name' => (string) $tok['checkpoint_name'],
            'assignment_expires_at' => $assignmentExpiresAt,
            'distance_m' => $distanceM,
            'override_used' => $overrideUsed,
            'redirect_url' => 'index.php',
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // MODULE A: Anti-Shadowing Dynamic Pass QR, Rotating Gate QR & Device Lock
    // -------------------------------------------------------------------------
    if ($action === 'get_dynamic_pass_qr') {
        $caller = requireAuthorizedCaller($pdo, [], 'Sign in required to load your personal pass.');
        $uid = (int) $caller['id'];
        $passTok = buildSignedDynamicPassToken($pdo, $uid, 30);

        $bSt = $pdo->prepare("SELECT `badge_code` FROM `user_badges` WHERE `user_id` = ? LIMIT 1");
        $bSt->execute([$uid]);
        $badgeCode = (string) ($bSt->fetchColumn() ?: formatRewBadgeCode($uid, $caller['staff_code'] ?? null));

        $devSt = $pdo->prepare("SELECT `id`, `device_label`, `last_seen_at`, `bound_at` FROM `user_trusted_devices` WHERE `user_id` = ? AND `is_active` = 1 ORDER BY `id` DESC");
        $devSt->execute([$uid]);
        $devices = $devSt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'ok' => true,
            'user_id' => $uid,
            'full_name' => (string) ($caller['full_name'] ?? ''),
            'badge_code' => $badgeCode,
            'token' => $passTok['token'],
            'slice' => $passTok['slice'],
            'ttl_seconds' => $passTok['ttl_seconds'],
            'expires_in' => $passTok['expires_in'],
            'trusted_device_count' => count($devices),
            'trusted_devices' => $devices,
        ]);
        exit;
    }

    if ($action === 'issue_venue_checkin_qr') {
        $siteKey = trim((string) ($_GET['site_key'] ?? $_POST['site_key'] ?? $jsonBody['site_key'] ?? ''));
        $whIdIn = (int) ($_GET['wh_id'] ?? $_POST['wh_id'] ?? $jsonBody['wh_id'] ?? 0);
        $caller = !empty($_SESSION['auth_user_id']) ? getCallerUser($pdo) : null;
        $isStandaloneMode = ($siteKey !== '' || $whIdIn > 0);

        $cpType = strtolower(trim((string) ($_GET['checkpoint_type'] ?? $_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? $reqCpType)));
        if (!in_array($cpType, ['stock_warehouse', 'event_venue', 'main_office'], true)) {
            $cpType = 'stock_warehouse';
        }
        $cpIdRaw = trim((string) ($_GET['checkpoint_id'] ?? $_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? $reqCpId));
        $issuedById = 0;

        if ($isStandaloneMode) {
            $whRow = resolveStandaloneFacilityGate($pdo, $siteKey, $whIdIn);
            if (!$whRow) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Facility gate location not found.']);
                exit;
            }
            $portalCfg = resolveStandalonePortalConfig($pdo, $siteKey, (int) $whRow['id']);
            if ($portalCfg && (((int) ($portalCfg['is_active'] ?? 1) === 0) || (!empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time()))) {
                http_response_code(403);
                echo json_encode(['ok' => false, 'error' => 'This gate portal link is expired or disabled.']);
                exit;
            }
            if (!isStandaloneGateAuthorized($pdo, $whRow)) {
                http_response_code(401);
                echo json_encode(['ok' => false, 'authorized' => false, 'error' => 'Unlock gate PIN to display the rotating Check-In QR.']);
                exit;
            }
            $cpType = 'stock_warehouse';
            $cpIdRaw = (string) ((int) $whRow['id']);
            $issuedById = $caller ? (int) $caller['id'] : 0;
        } else {
            $caller = requireAuthorizedCaller(
                $pdo,
                ['admin', 'administrator', 'manager', 'project_manager', 'event_coordinator', 'stock_manager', 'tech_lead', 'technical_lead', 'stock_controller'],
                'Permission denied: Displaying a rotating gate Check-In QR requires Gate Operator or Supervisor clearance.'
            );
            $lockCheck = assertControllerCheckpointLock($pdo, $cpType, $cpIdRaw);
            if (!$lockCheck['ok']) {
                http_response_code(403);
                echo json_encode(['ok' => false, 'error' => $lockCheck['error']]);
                exit;
            }
            $issuedById = (int) $caller['id'];
        }

        $cpName = 'Facility Gate';
        $cpLat = null;
        $cpLng = null;
        $geoRadius = 200;
        $storedCpId = $cpIdRaw;

        if ($cpType === 'event_venue') {
            $eSt = $pdo->prepare("SELECT `id`, `title`, `lat`, `lng`, `geofence_radius_m` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $eSt->execute([$cpIdRaw, $cpIdRaw]);
            $eRow = $eSt->fetch(PDO::FETCH_ASSOC);
            if (!$eRow) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Event venue checkpoint not found.']);
                exit;
            }
            $storedCpId = (string) $eRow['id'];
            $cpName = (string) ($eRow['title'] ?: 'Event Venue');
            $cpLat = $eRow['lat'] !== null ? (float) $eRow['lat'] : null;
            $cpLng = $eRow['lng'] !== null ? (float) $eRow['lng'] : null;
            $geoRadius = (int) ($eRow['geofence_radius_m'] ?? 200);
        } elseif ($cpType === 'main_office') {
            $storedCpId = '1';
            $cpName = 'Main Office HQ';
        } else {
            $wSt = $pdo->prepare("SELECT `id`, `name`, `lat`, `lng`, `geofence_radius_m` FROM `stock_locations` WHERE `id` = ? LIMIT 1");
            $wSt->execute([(int) $cpIdRaw]);
            $wRow = $wSt->fetch(PDO::FETCH_ASSOC);
            if (!$wRow) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Warehouse gate not found.']);
                exit;
            }
            $storedCpId = (string) ((int) $wRow['id']);
            $cpName = (string) ($wRow['name'] ?: 'Warehouse Gate');
            $cpLat = $wRow['lat'] !== null ? (float) $wRow['lat'] : null;
            $cpLng = $wRow['lng'] !== null ? (float) $wRow['lng'] : null;
            $geoRadius = (int) ($wRow['geofence_radius_m'] ?? 200);
        }

        try {
            $pdo->exec("DELETE FROM `venue_qr_challenges` WHERE `expires_at` < DATE_SUB(NOW(), INTERVAL 2 MINUTE)");
        } catch (Throwable $e) {}

        $rawChallenge = bin2hex(random_bytes(16));
        $tokHash = hash('sha256', $rawChallenge);
        $validTtl = 45; // Rotates on screen every 20s; valid 45s so mobile phone open + GPS permission completes cleanly
        $expSql = date('Y-m-d H:i:s', time() + $validTtl);

        $insCh = $pdo->prepare("
            INSERT INTO `venue_qr_challenges` (`token_hash`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `issued_by_id`, `expires_at`)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $insCh->execute([$tokHash, $cpType, $storedCpId, $cpName, $issuedById, $expSql]);

        echo json_encode([
            'ok' => true,
            'token' => $rawChallenge,
            'checkin_url' => 'venue-checkin.php?c=' . $rawChallenge,
            'checkpoint_type' => $cpType,
            'checkpoint_id' => $storedCpId,
            'checkpoint_name' => $cpName,
            'geofence_radius_m' => $geoRadius,
            'has_geofence' => ($cpLat !== null && $cpLng !== null),
            'ttl_seconds' => $validTtl,
            'rotate_seconds' => 20,
            'expires_at' => $expSql,
            'csrf_token' => getSessionCsrfToken(),
        ]);
        exit;
    }

    if ($action === 'get_venue_checkin_info') {
        $rawTok = trim((string) ($_GET['c'] ?? $_GET['token'] ?? $_POST['token'] ?? $jsonBody['token'] ?? ''));
        if ($rawTok === '' || !preg_match('/^[a-f0-9]{16,64}$/i', $rawTok)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Invalid or missing rotating Gate QR token.']);
            exit;
        }
        $tokHash = hash('sha256', $rawTok);
        $st = $pdo->prepare("SELECT * FROM `venue_qr_challenges` WHERE `token_hash` = ? LIMIT 1");
        $st->execute([$tokHash]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Venue Check-In QR not found or expired. Rescan the live gate screen.']);
            exit;
        }
        $secondsLeft = max(0, (strtotime((string) $row['expires_at']) ?: 0) - time());

        $cpLat = null;
        $cpLng = null;
        $geoRadius = 200;
        if ($row['checkpoint_type'] === 'event_venue') {
            $cSt = $pdo->prepare("SELECT `lat`, `lng`, `geofence_radius_m` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $cSt->execute([(string) $row['checkpoint_id'], (string) $row['checkpoint_id']]);
            if ($cr = $cSt->fetch(PDO::FETCH_ASSOC)) {
                $cpLat = $cr['lat'] !== null ? (float) $cr['lat'] : null;
                $cpLng = $cr['lng'] !== null ? (float) $cr['lng'] : null;
                $geoRadius = (int) ($cr['geofence_radius_m'] ?? 200);
            }
        } elseif ($row['checkpoint_type'] === 'stock_warehouse') {
            $cSt = $pdo->prepare("SELECT `lat`, `lng`, `geofence_radius_m` FROM `stock_locations` WHERE `id` = ? LIMIT 1");
            $cSt->execute([(int) $row['checkpoint_id']]);
            if ($cr = $cSt->fetch(PDO::FETCH_ASSOC)) {
                $cpLat = $cr['lat'] !== null ? (float) $cr['lat'] : null;
                $cpLng = $cr['lng'] !== null ? (float) $cr['lng'] : null;
                $geoRadius = (int) ($cr['geofence_radius_m'] ?? 200);
            }
        }

        $sessionUser = !empty($_SESSION['auth_user_id']) ? getCallerUser($pdo) : null;
        $sessionUserSummary = null;
        if ($sessionUser) {
            $suId = (int) $sessionUser['id'];
            $totpOn = false;
            try {
                $tSt = $pdo->prepare("SELECT `is_enabled` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
                $tSt->execute([$suId]);
                $totpOn = ((int) $tSt->fetchColumn() === 1);
            } catch (Throwable $e) {}
            $devCnt = 0;
            try {
                $dSt = $pdo->prepare("SELECT COUNT(*) FROM `user_trusted_devices` WHERE `user_id` = ? AND `is_active` = 1");
                $dSt->execute([$suId]);
                $devCnt = (int) $dSt->fetchColumn();
            } catch (Throwable $e) {}
            $sessionUserSummary = [
                'id' => $suId,
                'full_name' => (string) $sessionUser['full_name'],
                'username' => (string) $sessionUser['username'],
                'role' => (string) $sessionUser['role'],
                'department' => (string) ($sessionUser['department'] ?? ''),
                'checked_in' => isUserCurrentlyCheckedInDb($pdo, $suId),
                'totp_enabled' => $totpOn,
                'trusted_device_count' => $devCnt,
            ];
        }

        echo json_encode([
            'ok' => true,
            'expired' => $secondsLeft <= 0,
            'seconds_left' => $secondsLeft,
            'checkpoint_type' => (string) $row['checkpoint_type'],
            'checkpoint_id' => (string) $row['checkpoint_id'],
            'checkpoint_name' => (string) $row['checkpoint_name'],
            'geofence_radius_m' => $geoRadius,
            'has_geofence' => ($cpLat !== null && $cpLng !== null),
            'session_user' => $sessionUserSummary,
            'csrf_token' => getSessionCsrfToken(),
        ]);
        exit;
    }

    if ($action === 'redeem_venue_checkin_qr') {
        if (strtoupper((string) $method) !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
            exit;
        }
        $clientIp = trim((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
        $rateKey = 'venue_qr_' . $clientIp;
        $rateCheck = checkSecurityRateLimit($pdo, $rateKey, 12, 600);
        if (!$rateCheck['allowed']) {
            http_response_code(429);
            echo json_encode(['ok' => false, 'error' => $rateCheck['error']]);
            exit;
        }

        $rawTok = trim((string) ($_POST['token'] ?? $_POST['c'] ?? $jsonBody['token'] ?? $jsonBody['c'] ?? ''));
        $deviceToken = trim((string) ($_POST['device_token'] ?? $jsonBody['device_token'] ?? ($_COOKIE['ability_device_tok'] ?? '')));
        $deviceLabel = trim((string) ($_POST['device_label'] ?? $jsonBody['device_label'] ?? 'Mobile Browser'));
        $loginUsername = trim((string) ($_POST['username'] ?? $jsonBody['username'] ?? ''));
        $loginPassword = (string) ($_POST['password'] ?? $jsonBody['password'] ?? '');
        $latIn = $_POST['lat'] ?? $jsonBody['lat'] ?? null;
        $lngIn = $_POST['lng'] ?? $jsonBody['lng'] ?? null;
        $totpCode = trim((string) ($_POST['totp_code'] ?? $jsonBody['totp_code'] ?? ''));
        $rebindWithTotp = !empty($_POST['rebind_with_totp']) || !empty($jsonBody['rebind_with_totp']);
        $supervisorPin = trim((string) ($_POST['supervisor_pin'] ?? $jsonBody['supervisor_pin'] ?? ''));
        $scanMode = strtolower(trim((string) ($_POST['scan_mode'] ?? $jsonBody['scan_mode'] ?? 'auto')));
        if (!in_array($scanMode, ['auto', 'check_in', 'check_out'], true)) {
            $scanMode = 'auto';
        }

        if ($rawTok === '' || !preg_match('/^[a-f0-9]{16,64}$/i', $rawTok)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Invalid rotating Venue QR token. Scan the live QR at the gate screen.']);
            exit;
        }

        $tokHash = hash('sha256', $rawTok);
        $chSt = $pdo->prepare("SELECT * FROM `venue_qr_challenges` WHERE `token_hash` = ? LIMIT 1");
        $chSt->execute([$tokHash]);
        $challenge = $chSt->fetch(PDO::FETCH_ASSOC);
        if (!$challenge) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Gate Check-In QR expired or missing. Point your camera at the current QR on the gate screen.']);
            exit;
        }
        if ((strtotime((string) $challenge['expires_at']) ?: 0) < time()) {
            http_response_code(410);
            echo json_encode(['ok' => false, 'error' => 'This 45s Gate QR snapshot has expired (anti-shadowing timeout). Scan the fresh QR currently displayed at the gate.']);
            exit;
        }

        // Authenticate target staff user (either active login session or submitted credentials)
        $targetUser = null;
        $sessionUid = (int) ($_SESSION['auth_user_id'] ?? 0);
        if ($loginUsername !== '' && $loginPassword !== '') {
            $uSt = $pdo->prepare("SELECT * FROM `users` WHERE (LOWER(`username`) = LOWER(?) OR LOWER(`email`) = LOWER(?)) AND `is_active` = 1 LIMIT 1");
            $uSt->execute([$loginUsername, $loginUsername]);
            $cand = $uSt->fetch(PDO::FETCH_ASSOC);
            if (!$cand || !verifyUserPasswordRow($cand, $loginPassword)) {
                recordFailedRateLimit($pdo, $rateKey, 12, 600, 60);
                http_response_code(401);
                echo json_encode(['ok' => false, 'error' => 'Incorrect username or password.']);
                exit;
            }
            $targetUser = $cand;
        } elseif ($sessionUid > 0) {
            $targetUser = getCallerUser($pdo);
            if (!$targetUser || (int) ($targetUser['is_active'] ?? 1) === 0) {
                http_response_code(401);
                echo json_encode(['ok' => false, 'error' => 'Signed-in account is inactive.']);
                exit;
            }
        } else {
            http_response_code(401);
            echo json_encode(['ok' => false, 'auth_required' => true, 'error' => 'Sign in with your Ability staff username and password to verify your identity.']);
            exit;
        }
        $targetUid = (int) $targetUser['id'];

        // Check TOTP if user has 2FA enrolled
        $tSt = $pdo->prepare("SELECT `secret_base32`, `is_enabled` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
        $tSt->execute([$targetUid]);
        $totpRow = $tSt->fetch(PDO::FETCH_ASSOC);
        $totpEnabled = ($totpRow && (int) $totpRow['is_enabled'] === 1);
        if ($totpEnabled) {
            if ($totpCode === '' || !verifyTotpCode((string) $totpRow['secret_base32'], $totpCode, 1)) {
                recordFailedRateLimit($pdo, $rateKey, 12, 600, 60);
                http_response_code(401);
                echo json_encode(['ok' => false, 'totp_required' => true, 'error' => 'Valid 6-digit Authenticator (TOTP) code is required for your account.']);
                exit;
            }
        }

        // Physical Device Lock verification (or TOTP self-rebind if previously checked)
        $devCheck = verifyOrBindTrustedDevice($pdo, $targetUid, $deviceToken, $deviceLabel, true);
        if (!$devCheck['ok']) {
            if (!empty($devCheck['device_mismatch']) && $rebindWithTotp && $totpEnabled) {
                // TOTP already verified above -> revoke old device(s) and bind this one safely
                $tokDeviceHash = hash('sha256', trim($deviceToken));
                $otherDev = $pdo->prepare("SELECT `user_id` FROM `user_trusted_devices` WHERE `device_token_hash` = ? AND `is_active` = 1 AND `user_id` != ? LIMIT 1");
                $otherDev->execute([$tokDeviceHash, $targetUid]);
                if ($otherDev->fetchColumn()) {
                    http_response_code(403);
                    echo json_encode(['ok' => false, 'error' => 'This phone is currently bound to another staff member and cannot be rebound without Admin reset.']);
                    exit;
                }
                $pdo->prepare("UPDATE `user_trusted_devices` SET `is_active` = 0, `revoked_by_id` = ?, `revoked_at` = NOW() WHERE `user_id` = ? AND `is_active` = 1")
                    ->execute([$targetUid, $targetUid]);
                $devCheck = verifyOrBindTrustedDevice($pdo, $targetUid, $deviceToken, $deviceLabel, true);
            }
        }
        if (!$devCheck['ok']) {
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'device_mismatch' => !empty($devCheck['device_mismatch']),
                'totp_enabled' => $totpEnabled,
                'error' => $devCheck['error'],
            ]);
            exit;
        }

        // Lookup checkpoint lat/lng/geofence_radius_m/pin
        $cpType = (string) $challenge['checkpoint_type'];
        $cpIdStr = (string) $challenge['checkpoint_id'];
        $cpLat = null;
        $cpLng = null;
        $geoRadius = 200;
        $expectedPin = '';
        if ($cpType === 'event_venue') {
            $cSt = $pdo->prepare("SELECT `id`, `lat`, `lng`, `geofence_radius_m`, `terminal_pin` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $cSt->execute([$cpIdStr, $cpIdStr]);
            if ($cr = $cSt->fetch(PDO::FETCH_ASSOC)) {
                $cpLat = $cr['lat'] !== null ? (float) $cr['lat'] : null;
                $cpLng = $cr['lng'] !== null ? (float) $cr['lng'] : null;
                $geoRadius = (int) ($cr['geofence_radius_m'] ?? 200);
                $expectedPin = trim((string) ($cr['terminal_pin'] ?? ''));
            }
        } elseif ($cpType === 'stock_warehouse') {
            $cSt = $pdo->prepare("SELECT * FROM `stock_locations` WHERE `id` = ? LIMIT 1");
            $cSt->execute([(int) $cpIdStr]);
            if ($cr = $cSt->fetch(PDO::FETCH_ASSOC)) {
                $cpLat = $cr['lat'] !== null ? (float) $cr['lat'] : null;
                $cpLng = $cr['lng'] !== null ? (float) $cr['lng'] : null;
                $geoRadius = (int) ($cr['geofence_radius_m'] ?? 200);
                $expectedPin = resolveWarehouseTerminalPin($cr);
            }
        }

        $hasGps = ($latIn !== null && $latIn !== '' && $lngIn !== null && $lngIn !== '' && is_numeric($latIn) && is_numeric($lngIn));
        $distanceM = null;
        if ($hasGps && $cpLat !== null && $cpLng !== null) {
            $distanceM = (int) round(calculateHaversineMeters($cpLat, $cpLng, (float) $latIn, (float) $lngIn));
        }

        $overrideUsed = false;
        if ($supervisorPin !== '') {
            if ($expectedPin === '' || !verifyTerminalPinSecret($supervisorPin, $expectedPin)) {
                recordFailedRateLimit($pdo, $rateKey, 12, 600, 60);
                http_response_code(401);
                echo json_encode(['ok' => false, 'error' => 'Incorrect Supervisor Override PIN for this gate.']);
                exit;
            }
            $overrideUsed = true;
        } elseif ($cpLat !== null && $cpLng !== null) {
            if (!$hasGps) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => "GPS permission is required to confirm you are within {$geoRadius}m of {$challenge['checkpoint_name']}, or enter Gate Override PIN."]);
                exit;
            }
            if ($distanceM > $geoRadius) {
                recordFailedRateLimit($pdo, $rateKey, 12, 600, 60);
                http_response_code(403);
                echo json_encode(['ok' => false, 'distance_m' => $distanceM, 'error' => "Geo-Fence blocked ({$distanceM}m away from {$challenge['checkpoint_name']}, max {$geoRadius}m). You must be physically at the gate."]);
                exit;
            }
        }

        // Single-use per user on this rotating Gate QR challenge
        if (!consumeQrNonce($pdo, $tokHash, $targetUid, 'venue', $cpType, $cpIdStr, 180)) {
            http_response_code(409);
            echo json_encode(['ok' => false, 'error' => 'This Gate QR snapshot was already redeemed for your account. Wait 20s for the next rotating QR if checking out.']);
            exit;
        }

        $numericCpId = is_numeric($cpIdStr) ? (int) $cpIdStr : crc32($cpIdStr);
        $fullPayload = buildFullPayload($pdo, $activeDb, $cpType, $numericCpId);
        $activeCp = $fullPayload['activeCheckpoint'];
        $targetMember = findCrewMemberByScanInput($fullPayload['crew'], (string) $targetUid);
        if (!$targetMember) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Staff profile not active in crew roster.']);
            exit;
        }

        $scanResult = executeGateScan(
            $pdo,
            $activeDb,
            $activeCp,
            $targetMember,
            $scanMode,
            $targetUid,
            time(),
            false,
            [
                'checkin_method' => $overrideUsed ? 'supervisor_override' : 'dynamic_gate_qr',
                'verified_lat' => $hasGps ? (float) $latIn : null,
                'verified_lng' => $hasGps ? (float) $lngIn : null,
                'distance_m' => $distanceM,
                'device_id' => (int) ($devCheck['device_id'] ?? 0) ?: null,
            ]
        );
        unset($scanResult['bootstrap']);
        clearSecurityRateLimit($pdo, $rateKey);

        if ($sessionUid <= 0 && !empty($scanResult['allowed'])) {
            if (session_status() === PHP_SESSION_ACTIVE) {
                @session_regenerate_id(true);
            }
            $_SESSION['auth_user_id'] = $targetUid;
            $_SESSION['auth_user_role'] = strtolower((string) ($targetUser['role'] ?? 'user'));
        }

        $scanResult['distance_m'] = $distanceM;
        $scanResult['newly_bound_device'] = !empty($devCheck['newly_bound']);
        $scanResult['device_id'] = (int) ($devCheck['device_id'] ?? 0) ?: null;
        $scanResult['checkpoint_name'] = (string) $challenge['checkpoint_name'];
        echo json_encode($scanResult);
        exit;
    }

    if ($action === 'rebind_trusted_device_totp') {
        $caller = requireAuthorizedCaller($pdo, [], 'Sign in required to rebind your trusted device.');
        $uid = (int) $caller['id'];
        $deviceToken = trim((string) ($_POST['device_token'] ?? $jsonBody['device_token'] ?? ($_COOKIE['ability_device_tok'] ?? '')));
        $deviceLabel = trim((string) ($_POST['device_label'] ?? $jsonBody['device_label'] ?? 'Verified Browser / Phone'));
        $totpCode = trim((string) ($_POST['totp_code'] ?? $jsonBody['totp_code'] ?? ''));

        if (strlen($deviceToken) < 16) {
            echo json_encode(['ok' => false, 'error' => 'Missing device identity token.']);
            exit;
        }
        $tSt = $pdo->prepare("SELECT `secret_base32`, `is_enabled` FROM `user_totp_secrets` WHERE `user_id` = ? LIMIT 1");
        $tSt->execute([$uid]);
        $totpRow = $tSt->fetch(PDO::FETCH_ASSOC);
        if (!$totpRow || (int) $totpRow['is_enabled'] !== 1) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Authenticator (TOTP) is not enabled on your account. Ask an Admin or Site Manager to reset your device lock instead.']);
            exit;
        }
        if (!verifyTotpCode((string) $totpRow['secret_base32'], $totpCode, 1)) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Invalid or expired 6-digit Authenticator (TOTP) code.']);
            exit;
        }

        $tokHash = hash('sha256', $deviceToken);
        $otherSt = $pdo->prepare("SELECT `user_id` FROM `user_trusted_devices` WHERE `device_token_hash` = ? AND `is_active` = 1 AND `user_id` != ? LIMIT 1");
        $otherSt->execute([$tokHash, $uid]);
        if ($otherSt->fetchColumn()) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'This device is already bound to a different user. Admin reset required.']);
            exit;
        }

        $pdo->prepare("UPDATE `user_trusted_devices` SET `is_active` = 0, `revoked_by_id` = ?, `revoked_at` = NOW() WHERE `user_id` = ? AND `is_active` = 1")
            ->execute([$uid, $uid]);
        $devRes = verifyOrBindTrustedDevice($pdo, $uid, $deviceToken, $deviceLabel, true);
        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => !empty($devRes['ok']), 'message' => !empty($devRes['ok']) ? 'Trusted device rebound via TOTP.' : ($devRes['error'] ?? 'Could not bind device.')]
        ));
        exit;
    }

    if ($action === 'reset_user_trusted_device') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('reset_user_trusted_device', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $targetUid = (int) ($_POST['user_id'] ?? $jsonBody['user_id'] ?? 0);
        if ($targetUid <= 0) {
            echo json_encode(['ok' => false, 'error' => 'Target user_id is required.']);
            exit;
        }
        $upd = $pdo->prepare("UPDATE `user_trusted_devices` SET `is_active` = 0, `revoked_by_id` = ?, `revoked_at` = NOW() WHERE `user_id` = ? AND `is_active` = 1");
        $upd->execute([(int) $caller['id'], $targetUid]);
        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'revoked_count' => $upd->rowCount(), 'message' => 'Trusted device lock reset. Next phone scan will bind the staff member\'s current device.']
        ));
        exit;
    }

    // -------------------------------------------------------------------------
    // MODULE B: Random Roll-Call (Check-In & Check-Out Reconciliation)
    // -------------------------------------------------------------------------
    if ($action === 'start_random_roll_call') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('start_random_roll_call', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $scopeCpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? 'all'));
        $scopeCpId = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? 'all'));
        if ($scopeCpType !== 'all' && $scopeCpId !== 'all') {
            $lockCheck = assertControllerCheckpointLock($pdo, $scopeCpType, $scopeCpId);
            if (!$lockCheck['ok']) {
                http_response_code(403);
                echo json_encode(['ok' => false, 'error' => $lockCheck['error']]);
                exit;
            }
        }

        $selMode = strtolower(trim((string) ($_POST['selection_mode'] ?? $jsonBody['selection_mode'] ?? 'random_count')));
        if (!in_array($selMode, ['random_count', 'random_percent'], true)) {
            $selMode = 'random_count';
        }
        $sampleVal = max(1, min(100, (int) ($_POST['sample_value'] ?? $jsonBody['sample_value'] ?? 5)));
        $deadlineMinutes = max(2, min(120, (int) ($_POST['deadline_minutes'] ?? $jsonBody['deadline_minutes'] ?? 10)));
        $reqGeoOrQr = isset($_POST['require_geo_or_qr']) || isset($jsonBody['require_geo_or_qr'])
            ? (((int) ($_POST['require_geo_or_qr'] ?? $jsonBody['require_geo_or_qr']) === 1) ? 1 : 0)
            : 1;
        $autoOutOnMiss = isset($_POST['auto_checkout_on_miss']) || isset($jsonBody['auto_checkout_on_miss'])
            ? (((int) ($_POST['auto_checkout_on_miss'] ?? $jsonBody['auto_checkout_on_miss']) === 1) ? 1 : 0)
            : 1;
        $deptFilter = trim((string) ($_POST['department_filter'] ?? $jsonBody['department_filter'] ?? ''));

        $payloadBefore = buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId);
        $alreadyPendingUids = [];
        try {
            $pRows = $pdo->query("
                SELECT e.`user_id`
                FROM `roll_call_entries` e
                INNER JOIN `roll_call_sessions` s ON s.`id` = e.`session_id`
                WHERE s.`status` = 'active' AND e.`status` = 'pending'
            ")->fetchAll(PDO::FETCH_COLUMN);
            $alreadyPendingUids = array_map('intval', $pRows);
        } catch (Throwable $e) {}

        $scopeCpName = 'All Checkpoints';
        $normScopeEventId = '';
        if ($scopeCpType !== 'all' && $scopeCpId !== 'all') {
            foreach (($payloadBefore['checkpoints']['all'] ?? []) as $cpItem) {
                if ((string) $cpItem['type'] === $scopeCpType && ((string) $cpItem['id'] === $scopeCpId || (string) ($cpItem['raw_id'] ?? '') === $scopeCpId)) {
                    $scopeCpName = (string) $cpItem['name'];
                    $normScopeEventId = (string) ($cpItem['id'] ?? $scopeCpId);
                    break;
                }
            }
        }

        $candidates = [];
        foreach (($payloadBefore['rollCallList'] ?? []) as $rc) {
            $rcUid = (int) ($rc['user_id'] ?? 0);
            if ($rcUid <= 0 || in_array($rcUid, $alreadyPendingUids, true)) {
                continue;
            }
            if ($scopeCpType !== 'all' && $scopeCpId !== 'all') {
                $rcCpType = (string) ($rc['checkpoint_type'] ?? '');
                $rcCpId = (string) ($rc['checkpoint_id'] ?? '');
                if ($rcCpType !== $scopeCpType || ($rcCpId !== $scopeCpId && $rcCpId !== $normScopeEventId && (string) ((int) $rcCpId) !== (string) ((int) $scopeCpId))) {
                    continue;
                }
            }
            if ($deptFilter !== '' && strcasecmp((string) ($rc['department'] ?? ''), $deptFilter) !== 0) {
                continue;
            }
            $lastVerTs = !empty($rc['last_presence_verified_at']) ? (strtotime((string) $rc['last_presence_verified_at']) ?: time()) : (time() - 7200);
            $hoursSince = max(0.0, (time() - $lastVerTs) / 3600.0);
            $weight = max(1, min(20, 1 + (int) floor($hoursSince * 3)));
            $candidates[] = ['row' => $rc, 'weight' => $weight];
        }

        if (empty($candidates)) {
            echo json_encode(['ok' => false, 'error' => 'No eligible checked-in personnel found for this Roll-Call scope (or they already have an active challenge).']);
            exit;
        }

        $desiredCount = ($selMode === 'random_percent')
            ? max(1, (int) ceil(count($candidates) * ($sampleVal / 100.0)))
            : max(1, min(count($candidates), $sampleVal));
        $desiredCount = min($desiredCount, count($candidates));

        // Weighted random sampling without replacement using CSPRNG random_int()
        $selected = [];
        $pool = $candidates;
        while (count($selected) < $desiredCount && !empty($pool)) {
            $totalWeight = 0;
            foreach ($pool as $item) {
                $totalWeight += $item['weight'];
            }
            $pick = random_int(1, max(1, $totalWeight));
            $running = 0;
            $pickedIdx = 0;
            foreach ($pool as $idx => $item) {
                $running += $item['weight'];
                if ($pick <= $running) {
                    $pickedIdx = $idx;
                    break;
                }
            }
            $selected[] = $pool[$pickedIdx]['row'];
            array_splice($pool, $pickedIdx, 1);
        }

        $deadlineAt = date('Y-m-d H:i:s', time() + ($deadlineMinutes * 60));
        $insSess = $pdo->prepare("
            INSERT INTO `roll_call_sessions` (`checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `triggered_by_id`, `selection_mode`, `sample_value`, `require_geo_or_qr`, `auto_checkout_on_miss`, `deadline_at`, `status`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ");
        $insSess->execute([
            $scopeCpType,
            $scopeCpId,
            $scopeCpName,
            (int) $caller['id'],
            $selMode,
            $sampleVal,
            $reqGeoOrQr,
            $autoOutOnMiss,
            $deadlineAt,
        ]);
        $sessionId = (int) $pdo->lastInsertId();

        $insEntry = $pdo->prepare("
            INSERT INTO `roll_call_entries` (`session_id`, `user_id`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `status`)
            VALUES (?, ?, ?, ?, ?, 'pending')
        ");
        foreach ($selected as $sel) {
            $insEntry->execute([
                $sessionId,
                (int) $sel['user_id'],
                (string) ($sel['checkpoint_type'] ?? 'event_venue'),
                (string) ($sel['checkpoint_id'] ?? '1'),
                (string) ($sel['checkpoint_name'] ?: $scopeCpName),
            ]);
        }

        if ($scopeCpType === 'event_venue' && $scopeCpId !== 'all') {
            logEventDispatchAction(
                $pdo,
                $scopeCpId,
                (int) $caller['id'],
                (string) ($caller['role'] ?? 'supervisor'),
                'roll_call_started',
                "Started Random Roll-Call #{$sessionId} for " . count($selected) . " crew ({$deadlineMinutes}m window)",
                ['session_id' => $sessionId, 'selected_count' => count($selected)]
            );
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'session_id' => $sessionId,
                'selected_count' => count($selected),
                'deadline_at' => $deadlineAt,
                'message' => 'Random Roll-Call #' . $sessionId . ' dispatched to ' . count($selected) . ' checked-in crew member(s) (' . $deadlineMinutes . ' min window).',
            ]
        ));
        exit;
    }

    if ($action === 'respond_roll_call') {
        $caller = requireAuthorizedCaller($pdo, [], 'Sign in required to answer your Roll-Call verification.');
        $uid = (int) $caller['id'];
        $entryId = (int) ($_POST['entry_id'] ?? $jsonBody['entry_id'] ?? 0);
        $deviceToken = trim((string) ($_POST['device_token'] ?? $jsonBody['device_token'] ?? ($_COOKIE['ability_device_tok'] ?? '')));
        $deviceLabel = trim((string) ($_POST['device_label'] ?? $jsonBody['device_label'] ?? 'Mobile Browser'));
        $venueQrTok = trim((string) ($_POST['venue_qr_token'] ?? $jsonBody['venue_qr_token'] ?? ''));
        $latIn = $_POST['lat'] ?? $jsonBody['lat'] ?? null;
        $lngIn = $_POST['lng'] ?? $jsonBody['lng'] ?? null;

        processExpiredRollCallSessions($pdo);

        if ($entryId > 0) {
            $eSt = $pdo->prepare("SELECT e.*, s.`require_geo_or_qr`, s.`deadline_at`, s.`status` AS `sess_status` FROM `roll_call_entries` e INNER JOIN `roll_call_sessions` s ON s.`id` = e.`session_id` WHERE e.`id` = ? AND e.`user_id` = ? LIMIT 1");
            $eSt->execute([$entryId, $uid]);
        } else {
            $eSt = $pdo->prepare("SELECT e.*, s.`require_geo_or_qr`, s.`deadline_at`, s.`status` AS `sess_status` FROM `roll_call_entries` e INNER JOIN `roll_call_sessions` s ON s.`id` = e.`session_id` WHERE e.`user_id` = ? AND e.`status` = 'pending' AND s.`status` = 'active' ORDER BY e.`id` DESC LIMIT 1");
            $eSt->execute([$uid]);
        }
        $entry = $eSt->fetch(PDO::FETCH_ASSOC);
        if (!$entry) {
            echo json_encode(['ok' => false, 'error' => 'No active pending Roll-Call ping found for your account.']);
            exit;
        }
        if (strtolower((string) $entry['sess_status']) !== 'active' || strtolower((string) $entry['status']) !== 'pending') {
            echo json_encode(['ok' => false, 'error' => 'This Roll-Call challenge has already been closed or resolved.']);
            exit;
        }

        // Device lock check
        $devCheck = verifyOrBindTrustedDevice($pdo, $uid, $deviceToken, $deviceLabel, true);
        if (!$devCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'device_mismatch' => !empty($devCheck['device_mismatch']), 'error' => $devCheck['error']]);
            exit;
        }

        $cpType = (string) ($entry['checkpoint_type'] ?? 'event_venue');
        $cpIdStr = (string) ($entry['checkpoint_id'] ?? '1');
        $cpName = (string) ($entry['checkpoint_name'] ?? 'Site Checkpoint');
        $reqProof = ((int) ($entry['require_geo_or_qr'] ?? 1) === 1);

        $cpLat = null;
        $cpLng = null;
        $geoRadius = 200;
        if ($cpType === 'event_venue') {
            $cSt = $pdo->prepare("SELECT `lat`, `lng`, `geofence_radius_m` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
            $cSt->execute([$cpIdStr, $cpIdStr]);
            if ($cr = $cSt->fetch(PDO::FETCH_ASSOC)) {
                $cpLat = $cr['lat'] !== null ? (float) $cr['lat'] : null;
                $cpLng = $cr['lng'] !== null ? (float) $cr['lng'] : null;
                $geoRadius = (int) ($cr['geofence_radius_m'] ?? 200);
            }
        } elseif ($cpType === 'stock_warehouse') {
            $cSt = $pdo->prepare("SELECT `lat`, `lng`, `geofence_radius_m` FROM `stock_locations` WHERE `id` = ? LIMIT 1");
            $cSt->execute([(int) $cpIdStr]);
            if ($cr = $cSt->fetch(PDO::FETCH_ASSOC)) {
                $cpLat = $cr['lat'] !== null ? (float) $cr['lat'] : null;
                $cpLng = $cr['lng'] !== null ? (float) $cr['lng'] : null;
                $geoRadius = (int) ($cr['geofence_radius_m'] ?? 200);
            }
        }

        $hasGps = ($latIn !== null && $latIn !== '' && $lngIn !== null && $lngIn !== '' && is_numeric($latIn) && is_numeric($lngIn));
        $distanceM = ($hasGps && $cpLat !== null && $cpLng !== null)
            ? (int) round(calculateHaversineMeters($cpLat, $cpLng, (float) $latIn, (float) $lngIn))
            : null;

        $verMethod = 'self_geo_device';
        if ($venueQrTok !== '') {
            // Accept either raw challenge hash URL query or challenge token directly
            $extractedTok = $venueQrTok;
            if (preg_match('/[?&]c=([a-f0-9]{16,64})/i', $venueQrTok, $m)) {
                $extractedTok = $m[1];
            }
            $chHash = hash('sha256', trim($extractedTok));
            $vSt = $pdo->prepare("SELECT * FROM `venue_qr_challenges` WHERE `token_hash` = ? AND `expires_at` >= NOW() LIMIT 1");
            $vSt->execute([$chHash]);
            $chRow = $vSt->fetch(PDO::FETCH_ASSOC);
            if (!$chRow) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Scanned Gate QR token is expired or invalid. Scan the live gate QR screen.']);
                exit;
            }
            $verMethod = 'venue_qr';
            $cpType = (string) $chRow['checkpoint_type'];
            $cpIdStr = (string) $chRow['checkpoint_id'];
            $cpName = (string) $chRow['checkpoint_name'];
        } elseif ($reqProof) {
            if ($cpLat !== null && $cpLng !== null) {
                if (!$hasGps) {
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'error' => "Enable GPS location to prove you are within {$geoRadius}m of {$cpName}, or show your Digital Pass QR to the gate supervisor."]);
                    exit;
                }
                if ($distanceM > $geoRadius) {
                    http_response_code(403);
                    echo json_encode(['ok' => false, 'distance_m' => $distanceM, 'error' => "Outside premise geo-fence ({$distanceM}m from {$cpName}, max {$geoRadius}m). Return on-site or check out."]);
                    exit;
                }
            }
        }

        $pdo->prepare("
            UPDATE `roll_call_entries`
            SET `status` = 'present', `verification_method` = ?, `verified_by_id` = ?, `verified_lat` = ?, `verified_lng` = ?, `distance_m` = ?, `verified_at` = NOW(), `notes` = ?
            WHERE `id` = ?
        ")->execute([
            $verMethod,
            $uid,
            $hasGps ? (float) $latIn : null,
            $hasGps ? (float) $lngIn : null,
            $distanceM,
            ($distanceM !== null ? "Verified on-premise ({$distanceM}m via {$verMethod})" : "Verified on-premise via {$verMethod}"),
            (int) $entry['id'],
        ]);

        $bSt = $pdo->prepare("SELECT `badge_code` FROM `user_badges` WHERE `user_id` = ? LIMIT 1");
        $bSt->execute([$uid]);
        $bCode = (string) ($bSt->fetchColumn() ?: formatRewBadgeCode($uid, $caller['staff_code'] ?? null));
        $numCpId = is_numeric($cpIdStr) ? (int) $cpIdStr : crc32($cpIdStr);

        $pdo->prepare("
            INSERT INTO `attendance_logs`
              (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `verified_lat`, `verified_lng`, `distance_m`, `device_id`, `notes`, `scanned_at`)
            VALUES (?, ?, ?, ?, ?, 'access_verify', 'granted', NULL, 'on_time', ?, 'roll_call_verify', ?, ?, ?, ?, ?, NOW())
        ")->execute([
            $uid,
            $bCode,
            in_array($cpType, ['stock_warehouse', 'event_venue', 'main_office'], true) ? $cpType : 'event_venue',
            $numCpId,
            $cpName,
            $uid,
            $hasGps ? (float) $latIn : null,
            $hasGps ? (float) $lngIn : null,
            $distanceM,
            (int) ($devCheck['device_id'] ?? 0) ?: null,
            "Random Roll-Call #{$entry['session_id']} verified present" . ($distanceM !== null ? " ({$distanceM}m)" : ''),
        ]);

        // Auto-close session if no remaining pending/unaccounted entries
        $remSt = $pdo->prepare("SELECT COUNT(*) FROM `roll_call_entries` WHERE `session_id` = ? AND `status` IN ('pending', 'unaccounted')");
        $remSt->execute([(int) $entry['session_id']]);
        if ((int) $remSt->fetchColumn() === 0) {
            $pdo->prepare("UPDATE `roll_call_sessions` SET `status` = 'closed', `closed_at` = NOW() WHERE `id` = ?")
                ->execute([(int) $entry['session_id']]);
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'message' => "Presence verified at {$cpName}" . ($distanceM !== null ? " ({$distanceM}m)" : '') . '.']
        ));
        exit;
    }

    if ($action === 'resolve_roll_call_entry') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('resolve_roll_call_entry', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $entryId = (int) ($_POST['entry_id'] ?? $jsonBody['entry_id'] ?? 0);
        $decision = strtolower(trim((string) ($_POST['decision'] ?? $jsonBody['decision'] ?? 'present')));
        $passQrTok = trim((string) ($_POST['pass_qr_token'] ?? $jsonBody['pass_qr_token'] ?? ''));
        $notesIn = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? ''));
        if (!in_array($decision, ['present', 'absent', 'excused'], true) || $entryId <= 0) {
            echo json_encode(['ok' => false, 'error' => 'Valid entry_id and decision (present/absent/excused) are required.']);
            exit;
        }

        $eSt = $pdo->prepare("SELECT * FROM `roll_call_entries` WHERE `id` = ? LIMIT 1");
        $eSt->execute([$entryId]);
        $entry = $eSt->fetch(PDO::FETCH_ASSOC);
        if (!$entry) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Roll-Call entry not found.']);
            exit;
        }
        $targetUid = (int) $entry['user_id'];
        $sid = (int) $entry['session_id'];
        $cpType = in_array((string) $entry['checkpoint_type'], ['stock_warehouse', 'event_venue', 'main_office'], true)
            ? (string) $entry['checkpoint_type']
            : 'event_venue';
        $cpIdStr = (string) ($entry['checkpoint_id'] ?? '1');
        $numCpId = is_numeric($cpIdStr) ? (int) $cpIdStr : crc32($cpIdStr);
        $cpName = (string) ($entry['checkpoint_name'] ?? 'Site Checkpoint');

        $bSt = $pdo->prepare("SELECT `badge_code` FROM `user_badges` WHERE `user_id` = ? LIMIT 1");
        $bSt->execute([$targetUid]);
        $bCode = (string) ($bSt->fetchColumn() ?: formatRewBadgeCode($targetUid, null));

        $verMethod = 'supervisor_spot';
        if ($decision === 'present') {
            if ($passQrTok !== '') {
                $parsed = verifySignedDynamicPassToken($pdo, $passQrTok, 30);
                if (!$parsed || empty($parsed['valid']) || (int) $parsed['user_id'] !== $targetUid) {
                    echo json_encode(['ok' => false, 'error' => 'Scanned QR does not match this staff member\'s live 30s Pass QR.']);
                    exit;
                }
                if (!consumeQrNonce($pdo, (string) $parsed['nonce'], $targetUid, 'rollcall', $cpType, $cpIdStr, 120)) {
                    echo json_encode(['ok' => false, 'error' => 'Replay blocked: this 30s QR snapshot was already used. Ask the staff member for their fresh live pass.']);
                    exit;
                }
                $verMethod = 'supervisor_qr';
            }
            $pdo->prepare("UPDATE `roll_call_entries` SET `status` = 'present', `verification_method` = ?, `verified_by_id` = ?, `verified_at` = NOW(), `notes` = ? WHERE `id` = ?")
                ->execute([$verMethod, (int) $caller['id'], $notesIn ?: "Supervisor spot-verified via {$verMethod}", $entryId]);

            $pdo->prepare("
                INSERT INTO `attendance_logs`
                  (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `notes`, `scanned_at`)
                VALUES (?, ?, ?, ?, ?, 'access_verify', 'granted', NULL, 'on_time', ?, 'roll_call_verify', ?, NOW())
            ")->execute([$targetUid, $bCode, $cpType, $numCpId, $cpName, (int) $caller['id'], "Roll-Call #{$sid} verified on-site ({$verMethod})"]);

            if (!empty($entry['auto_checkout_log_id']) && !isUserCurrentlyCheckedInDb($pdo, $targetUid)) {
                $pdo->prepare("
                    INSERT INTO `attendance_logs`
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, 'check_in', 'granted', NULL, 'rollcall_reinstated', ?, 'roll_call_restore', ?, NOW())
                ")->execute([$targetUid, $bCode, $cpType, $numCpId, $cpName, (int) $caller['id'], "Reinstated on-site after Roll-Call #{$sid} confirmation"]);
            }
        } elseif ($decision === 'absent') {
            $outLogId = $entry['auto_checkout_log_id'] ? (int) $entry['auto_checkout_log_id'] : null;
            if (isUserCurrentlyCheckedInDb($pdo, $targetUid)) {
                $insOut = $pdo->prepare("
                    INSERT INTO `attendance_logs`
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, 'check_out', 'granted', NULL, 'rollcall_manual_out', ?, 'roll_call_manual_out', ?, NOW())
                ");
                $insOut->execute([$targetUid, $bCode, $cpType, $numCpId, $cpName, (int) $caller['id'], $notesIn ?: "Checked Out: Confirmed absent during Roll-Call #{$sid}"]);
                $outLogId = (int) $pdo->lastInsertId();
            }
            $pdo->prepare("UPDATE `roll_call_entries` SET `status` = 'absent', `verification_method` = 'supervisor_absent', `verified_by_id` = ?, `auto_checkout_log_id` = ?, `verified_at` = NOW(), `notes` = ? WHERE `id` = ?")
                ->execute([(int) $caller['id'], $outLogId, $notesIn ?: 'Marked absent off-premise & checked out', $entryId]);
        } else {
            // excused
            $pdo->prepare("UPDATE `roll_call_entries` SET `status` = 'excused', `verification_method` = 'supervisor_excused', `verified_by_id` = ?, `verified_at` = NOW(), `notes` = ? WHERE `id` = ?")
                ->execute([(int) $caller['id'], $notesIn ?: 'Excused by Supervisor', $entryId]);
            if (!empty($entry['auto_checkout_log_id']) && !isUserCurrentlyCheckedInDb($pdo, $targetUid)) {
                $pdo->prepare("
                    INSERT INTO `attendance_logs`
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, 'check_in', 'granted', NULL, 'rollcall_excused_restore', ?, 'roll_call_restore', ?, NOW())
                ")->execute([$targetUid, $bCode, $cpType, $numCpId, $cpName, (int) $caller['id'], "Check-in restored: Roll-Call #{$sid} excused"]);
            }
        }

        $remSt = $pdo->prepare("SELECT COUNT(*) FROM `roll_call_entries` WHERE `session_id` = ? AND `status` IN ('pending', 'unaccounted')");
        $remSt->execute([$sid]);
        if ((int) $remSt->fetchColumn() === 0) {
            $pdo->prepare("UPDATE `roll_call_sessions` SET `status` = 'closed', `closed_at` = NOW() WHERE `id` = ?")->execute([$sid]);
        }

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'message' => 'Roll-Call entry updated (' . strtoupper($decision) . ').']
        ));
        exit;
    }

    if ($action === 'close_roll_call_session') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('resolve_roll_call_entry', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $sid = (int) ($_POST['session_id'] ?? $jsonBody['session_id'] ?? 0);
        $autoOutRemaining = !empty($_POST['auto_checkout_remaining']) || !empty($jsonBody['auto_checkout_remaining']);
        if ($sid <= 0) {
            echo json_encode(['ok' => false, 'error' => 'session_id is required.']);
            exit;
        }
        $pendingSt = $pdo->prepare("SELECT * FROM `roll_call_entries` WHERE `session_id` = ? AND `status` IN ('pending', 'unaccounted')");
        $pendingSt->execute([$sid]);
        foreach ($pendingSt->fetchAll(PDO::FETCH_ASSOC) as $ent) {
            $uid = (int) $ent['user_id'];
            $eid = (int) $ent['id'];
            $cpType = in_array((string) $ent['checkpoint_type'], ['stock_warehouse', 'event_venue', 'main_office'], true) ? (string) $ent['checkpoint_type'] : 'event_venue';
            $numCpId = is_numeric((string) $ent['checkpoint_id']) ? (int) $ent['checkpoint_id'] : crc32((string) $ent['checkpoint_id']);
            $cpName = (string) ($ent['checkpoint_name'] ?? 'Site Checkpoint');
            if ($autoOutRemaining && isUserCurrentlyCheckedInDb($pdo, $uid)) {
                $bSt = $pdo->prepare("SELECT `badge_code` FROM `user_badges` WHERE `user_id` = ? LIMIT 1");
                $bSt->execute([$uid]);
                $bCode = (string) ($bSt->fetchColumn() ?: formatRewBadgeCode($uid, null));
                $insOut = $pdo->prepare("
                    INSERT INTO `attendance_logs`
                      (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `checkin_method`, `notes`, `scanned_at`)
                    VALUES (?, ?, ?, ?, ?, 'check_out', 'granted', NULL, 'rollcall_auto_out', ?, 'roll_call_auto_out', ?, NOW())
                ");
                $insOut->execute([$uid, $bCode, $cpType, $numCpId, $cpName, (int) $caller['id'], "Checked Out when closing Roll-Call #{$sid}"]);
                $pdo->prepare("UPDATE `roll_call_entries` SET `status` = 'timed_out', `verification_method` = 'session_closed_out', `auto_checkout_log_id` = ?, `verified_by_id` = ?, `verified_at` = NOW(), `notes` = 'Auto checked out on session close' WHERE `id` = ?")
                    ->execute([(int) $pdo->lastInsertId(), (int) $caller['id'], $eid]);
            } else {
                $pdo->prepare("UPDATE `roll_call_entries` SET `status` = 'absent', `verification_method` = 'session_closed', `verified_by_id` = ?, `verified_at` = NOW(), `notes` = 'Marked absent when Roll-Call closed' WHERE `id` = ?")
                    ->execute([(int) $caller['id'], $eid]);
            }
        }
        $pdo->prepare("UPDATE `roll_call_sessions` SET `status` = 'closed', `closed_at` = NOW() WHERE `id` = ?")->execute([$sid]);
        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'message' => "Roll-Call #{$sid} closed."]
        ));
        exit;
    }

    // -------------------------------------------------------------------------
    // MODULE C/D: Event Requirements -> Support Staff Requests -> Tech Confirm
    // -------------------------------------------------------------------------
    if ($action === 'send_event_requirements') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('send_event_requirements', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $evIdIn = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? ''));
        $branchesIn = $_POST['branches'] ?? $jsonBody['branches'] ?? [];
        if (is_string($branchesIn)) {
            $branchesIn = json_decode($branchesIn, true) ?: [];
        }
        $reqNotes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? ''));
        if ($evIdIn === '') {
            echo json_encode(['ok' => false, 'error' => 'event_id is required.']);
            exit;
        }

        $chk = $pdo->prepare("SELECT `id`, `title`, `tech_lead` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
        $chk->execute([$evIdIn, $evIdIn]);
        $evRow = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$evRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Event Venue not found.']);
            exit;
        }
        $realId = (string) $evRow['id'];

        $cleanBranches = [];
        $summaryParts = [];
        foreach (['Video', 'Sound', 'Lighting', 'Electrical', 'Rigging', 'Interpretation', 'Support Staff'] as $bk) {
            $cnt = max(0, min(99, (int) ($branchesIn[$bk] ?? 0)));
            $cleanBranches[$bk] = $cnt;
            if ($cnt > 0) {
                $summaryParts[] = "{$bk}:{$cnt}";
            }
        }
        $reqObj = [
            'branches' => $cleanBranches,
            'notes' => $reqNotes,
            'sent_by_name' => (string) ($caller['full_name'] ?? 'PM / Coordinator'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $pdo->prepare("UPDATE `events` SET `requirements_json` = ?, `dispatch_status` = 'requirements_sent', `requirements_sent_by` = ?, `requirements_sent_at` = NOW() WHERE `id` = ?")
            ->execute([json_encode($reqObj), (int) $caller['id'], $realId]);
        recalculateEventDispatchStatus($pdo, $realId);

        $briefSummary = !empty($summaryParts) ? implode(', ', $summaryParts) : 'Technical brief updated';
        logEventDispatchAction(
            $pdo,
            $realId,
            (int) $caller['id'],
            (string) ($caller['role'] ?? 'project_manager'),
            'requirements_sent',
            "Sent branch requirements for {$evRow['title']} to Tech Lead ({$briefSummary})",
            $reqObj
        );

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'message' => "Technical branch requirements sent to Tech Lead ({$evRow['tech_lead']})."]
        ));
        exit;
    }

    if ($action === 'request_support_staff') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('request_support_staff', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $evIdIn = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? ''));
        $rolesIn = $_POST['requested_roles'] ?? $jsonBody['requested_roles'] ?? [];
        if (is_string($rolesIn)) {
            $rolesIn = json_decode($rolesIn, true) ?: [];
        }
        $reqNotes = trim((string) ($_POST['notes'] ?? $jsonBody['notes'] ?? ''));
        if ($evIdIn === '') {
            echo json_encode(['ok' => false, 'error' => 'event_id is required.']);
            exit;
        }
        $chk = $pdo->prepare("SELECT `id`, `title` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
        $chk->execute([$evIdIn, $evIdIn]);
        $evRow = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$evRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Event Venue not found.']);
            exit;
        }
        $realId = (string) $evRow['id'];

        $cleanRoles = [];
        $summaryParts = [];
        foreach ((array) $rolesIn as $rKey => $rCnt) {
            $kClean = trim((string) $rKey);
            $vInt = max(0, min(50, (int) $rCnt));
            if ($kClean !== '' && $vInt > 0) {
                $cleanRoles[$kClean] = $vInt;
                $summaryParts[] = "{$vInt}x {$kClean}";
            }
        }
        if (empty($cleanRoles)) {
            $cleanRoles = ['Support Crew' => 2];
            $summaryParts[] = '2x Support Crew';
        }

        $ins = $pdo->prepare("
            INSERT INTO `event_support_requests` (`event_id`, `requested_by_id`, `requested_roles_json`, `notes`, `status`)
            VALUES (?, ?, ?, ?, 'pending')
        ");
        $ins->execute([$realId, (int) $caller['id'], json_encode($cleanRoles), $reqNotes]);
        $reqId = (int) $pdo->lastInsertId();

        logEventDispatchAction(
            $pdo,
            $realId,
            (int) $caller['id'],
            (string) ($caller['role'] ?? 'project_manager'),
            'support_requested',
            "Requested Tier 4 Support Staff for {$evRow['title']}: " . implode(', ', $summaryParts),
            ['request_id' => $reqId, 'requested_roles' => $cleanRoles]
        );

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'request_id' => $reqId, 'message' => 'Support staff request submitted (' . implode(', ', $summaryParts) . ').']
        ));
        exit;
    }

    if ($action === 'fulfill_support_request') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('fulfill_support_request', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $reqId = (int) ($_POST['request_id'] ?? $jsonBody['request_id'] ?? 0);
        $uIdsRaw = $_POST['user_ids'] ?? $jsonBody['user_ids'] ?? [];
        if (is_string($uIdsRaw)) {
            $uIdsRaw = json_decode($uIdsRaw, true) ?: [];
        }
        $uIds = array_values(array_unique(array_filter(array_map('intval', (array) $uIdsRaw))));
        if ($reqId <= 0 || empty($uIds)) {
            echo json_encode(['ok' => false, 'error' => 'Select at least one Tier 4 Support Staff member to fulfill this request.']);
            exit;
        }

        $rSt = $pdo->prepare("SELECT * FROM `event_support_requests` WHERE `id` = ? LIMIT 1");
        $rSt->execute([$reqId]);
        $reqRow = $rSt->fetch(PDO::FETCH_ASSOC);
        if (!$reqRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Support staff request not found.']);
            exit;
        }
        $realEventId = (string) $reqRow['event_id'];

        $evSt = $pdo->prepare("SELECT * FROM `events` WHERE `id` = ? LIMIT 1");
        $evSt->execute([$realEventId]);
        $evRow = $evSt->fetch(PDO::FETCH_ASSOC);
        if (!$evRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Linked event venue no longer exists.']);
            exit;
        }

        $pdo->prepare("UPDATE `event_support_requests` SET `status` = 'fulfilled', `fulfilled_by_id` = ?, `assigned_user_ids_json` = ?, `fulfilled_at` = NOW() WHERE `id` = ?")
            ->execute([(int) $caller['id'], json_encode($uIds), $reqId]);

        $rosterArr = json_decode((string) ($evRow['assigned_roster_json'] ?? ''), true);
        if (!is_array($rosterArr)) {
            $rosterArr = [
                'project_manager' => (string) ($evRow['project_manager'] ?? ''),
                'event_coordinator' => (string) ($evRow['event_coordinator'] ?? ''),
                'tech_lead' => (string) ($evRow['tech_lead'] ?? ''),
                'departments' => ['Video' => [], 'Sound' => [], 'Lighting' => [], 'Electrical' => [], 'Rigging' => [], 'Interpretation' => []],
                'support_staff' => [],
            ];
        }
        $rosterArr['support_staff'] = array_values(array_unique(array_merge(array_map('intval', (array) ($rosterArr['support_staff'] ?? [])), $uIds)));
        $flatTechs = json_decode((string) ($evRow['assigned_technician'] ?? '[]'), true) ?: [];
        $flatTechs = array_values(array_unique(array_merge(array_map('intval', (array) $flatTechs), $uIds)));

        $pdo->prepare("UPDATE `events` SET `assigned_technician` = ?, `assigned_roster_json` = ? WHERE `id` = ?")
            ->execute([json_encode($flatTechs), json_encode($rosterArr), $realEventId]);

        $uUpd = $pdo->prepare("UPDATE `users` SET `assigned_checkpoint_type` = 'event_venue', `assigned_checkpoint_id` = ? WHERE `id` = ?");
        $ecaUpsert = $pdo->prepare("
            INSERT INTO `event_crew_assignments` (`event_id`, `user_id`, `branch_dept`, `role_slot`, `assigned_by_id`, `confirmation_status`)
            VALUES (?, ?, 'Support Staff', 'Support Crew', ?, 'pending')
            ON DUPLICATE KEY UPDATE `branch_dept` = IF(`branch_dept` = '', 'Support Staff', `branch_dept`)
        ");
        foreach ($uIds as $suid) {
            $uUpd->execute([$realEventId, $suid]);
            $ecaUpsert->execute([$realEventId, $suid, (int) $caller['id']]);
        }

        recalculateEventDispatchStatus($pdo, $realEventId);
        logEventDispatchAction(
            $pdo,
            $realEventId,
            (int) $caller['id'],
            (string) ($caller['role'] ?? 'stock_manager'),
            'support_fulfilled',
            "Assigned " . count($uIds) . " Tier 4 Support Staff member(s) to {$evRow['title']} (Request #{$reqId})",
            ['request_id' => $reqId, 'assigned_user_ids' => $uIds]
        );

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'message' => 'Support request #' . $reqId . ' fulfilled with ' . count($uIds) . ' support staff member(s).']
        ));
        exit;
    }

    if ($action === 'respond_event_assignment') {
        $caller = requireAuthorizedCaller($pdo, [], 'Sign in required to confirm your event assignment.');
        $uid = (int) $caller['id'];
        $evIdIn = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? ''));
        $decision = strtolower(trim((string) ($_POST['decision'] ?? $jsonBody['decision'] ?? 'confirmed')));
        $declineReason = trim((string) ($_POST['decline_reason'] ?? $jsonBody['decline_reason'] ?? ''));
        if (!in_array($decision, ['confirmed', 'declined'], true) || $evIdIn === '') {
            echo json_encode(['ok' => false, 'error' => 'Valid event_id and decision (confirmed/declined) are required.']);
            exit;
        }

        $evChk = $pdo->prepare("SELECT `id`, `title` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
        $evChk->execute([$evIdIn, $evIdIn]);
        $evRow = $evChk->fetch(PDO::FETCH_ASSOC);
        $realEventId = $evRow ? (string) $evRow['id'] : $evIdIn;
        $evTitle = $evRow ? (string) $evRow['title'] : ('Event #' . $evIdIn);

        $asgChk = $pdo->prepare("SELECT * FROM `event_crew_assignments` WHERE `event_id` = ? AND `user_id` = ? LIMIT 1");
        $asgChk->execute([$realEventId, $uid]);
        $asgRow = $asgChk->fetch(PDO::FETCH_ASSOC);
        if (!$asgRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'You do not have an active assignment row for this event.']);
            exit;
        }

        $pdo->prepare("UPDATE `event_crew_assignments` SET `confirmation_status` = ?, `decline_reason` = ?, `responded_at` = NOW() WHERE `id` = ?")
            ->execute([$decision, $decision === 'declined' ? ($declineReason ?: 'Unavailable for event schedule') : null, (int) $asgRow['id']]);

        $newStatus = recalculateEventDispatchStatus($pdo, $realEventId);
        logEventDispatchAction(
            $pdo,
            $realEventId,
            $uid,
            (string) ($caller['role'] ?? 'technician'),
            $decision === 'confirmed' ? 'crew_confirmed' : 'crew_declined',
            "{$caller['full_name']} ({$asgRow['branch_dept']}) {$decision} dispatch for {$evTitle}" . ($decision === 'declined' && $declineReason !== '' ? ": {$declineReason}" : ''),
            ['branch_dept' => $asgRow['branch_dept'], 'decision' => $decision, 'dispatch_status' => $newStatus]
        );

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'decision' => $decision, 'dispatch_status' => $newStatus, 'message' => $decision === 'confirmed' ? "Assignment confirmed for {$evTitle}." : "Declined assignment for {$evTitle} — Tech Lead notified."]
        ));
        exit;
    }

    if ($action === 'approve_event_tech_lead') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('approve_event_tech_lead', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $evIdIn = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? ''));
        $noteIn = trim((string) ($_POST['note'] ?? $jsonBody['note'] ?? ''));
        if ($evIdIn === '') {
            echo json_encode(['ok' => false, 'error' => 'event_id is required.']);
            exit;
        }
        $evChk = $pdo->prepare("SELECT `id`, `title`, `tech_lead`, `tech_lead_approved` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
        $evChk->execute([$evIdIn, $evIdIn]);
        $evRow = $evChk->fetch(PDO::FETCH_ASSOC);
        if (!$evRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Event not found.']);
            exit;
        }
        $callerRole = strtolower(trim((string) ($caller['role'] ?? '')));
        $isAdminApprover = in_array($callerRole, ['admin', 'administrator', 'manager'], true);
        $assignedTl = trim((string) ($evRow['tech_lead'] ?? ''));
        $hasSpecificTl = ($assignedTl !== '' && strtolower($assignedTl) !== 'tech lead');
        $callerFull = trim((string) ($caller['full_name'] ?? ''));
        $callerUser = trim((string) ($caller['username'] ?? ''));
        if (!$isAdminApprover && $hasSpecificTl && strcasecmp($callerFull, $assignedTl) !== 0 && strcasecmp($callerUser, $assignedTl) !== 0) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => "Only the assigned Technical Lead ({$assignedTl}) or an Administrator can approve this request."]);
            exit;
        }
        $realEventId = (string) $evRow['id'];
        $evTitle = (string) ($evRow['title'] ?? ('Event #' . $realEventId));
        $approverName = $callerFull !== '' ? $callerFull : ($callerUser !== '' ? $callerUser : 'Technical Lead');
        $updTl = $hasSpecificTl ? $assignedTl : $approverName;

        $pdo->prepare("
            UPDATE `events`
            SET `tech_lead` = ?, `tech_lead_approved` = 1, `tech_lead_approved_by` = ?, `tech_lead_approved_at` = NOW(), `tech_lead_approval_note` = ?
            WHERE `id` = ?
        ")->execute([
            $updTl,
            (int) ($caller['id'] ?? 1),
            $noteIn !== '' ? substr($noteIn, 0, 255) : null,
            $realEventId,
        ]);

        $newStatus = recalculateEventDispatchStatus($pdo, $realEventId);
        logEventDispatchAction(
            $pdo,
            $realEventId,
            (int) ($caller['id'] ?? 1),
            (string) ($caller['role'] ?? 'tech_lead'),
            'tech_lead_approved',
            "Approved Tier 1 dispatch request for {$evTitle} ({$approverName}) — Tier 2 Tech Lead unlocked" . ($noteIn !== '' ? ": {$noteIn}" : ''),
            ['dispatch_status' => $newStatus, 'tech_lead_approved' => true]
        );

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            [
                'ok' => true,
                'dispatch_status' => $newStatus,
                'tech_lead_approved' => true,
                'message' => "Request approved by {$approverName} — Tier 2 · Tech Lead is now unlocked.",
            ]
        ));
        exit;
    }

    if ($action === 'save_event_dept_confirmation') {
        $caller = getCallerUser($pdo);
        $authCheck = canCallerPerformAction('save_event_dept_confirmation', $caller);
        if (!$authCheck['ok']) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => $authCheck['error']]);
            exit;
        }
        $evIdIn = trim((string) ($_POST['event_id'] ?? $jsonBody['event_id'] ?? ''));
        $deptIn = trim((string) ($_POST['department'] ?? $jsonBody['department'] ?? ''));
        $statusIn = strtolower(trim((string) ($_POST['confirmation_status'] ?? $jsonBody['confirmation_status'] ?? 'confirmed')));
        $commentIn = trim((string) ($_POST['comment'] ?? $jsonBody['comment'] ?? ''));
        if ($evIdIn === '') {
            echo json_encode(['ok' => false, 'error' => 'event_id is required.']);
            exit;
        }
        if (!in_array($statusIn, ['confirmed', 'needs_adjustment', 'commented'], true)) {
            $statusIn = 'commented';
        }
        if ($commentIn === '') {
            if ($statusIn === 'confirmed') {
                $commentIn = 'Confirmed department staffing readiness.';
            } else {
                echo json_encode(['ok' => false, 'error' => 'Please enter a comment or confirmation note.']);
                exit;
            }
        }
        if ($deptIn === '') {
            $deptIn = trim((string) ($caller['department'] ?? 'General')) ?: 'General';
        }
        $evChk = $pdo->prepare("SELECT `id`, `title` FROM `events` WHERE `id` = ? OR CRC32(`id`) = ? LIMIT 1");
        $evChk->execute([$evIdIn, $evIdIn]);
        $evRow = $evChk->fetch(PDO::FETCH_ASSOC);
        if (!$evRow) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Event not found.']);
            exit;
        }
        $realEventId = (string) $evRow['id'];
        $evTitle = (string) ($evRow['title'] ?? ('Event #' . $realEventId));

        $insEdc = $pdo->prepare("
            INSERT INTO `event_dept_confirmations` (`event_id`, `user_id`, `department`, `confirmation_status`, `comment`)
            VALUES (?, ?, ?, ?, ?)
        ");
        $insEdc->execute([$realEventId, (int) $caller['id'], substr($deptIn, 0, 64), $statusIn, $commentIn]);

        $statusLabel = $statusIn === 'confirmed' ? 'Confirmed' : ($statusIn === 'needs_adjustment' ? 'Needs Adjustment' : 'Commented');
        logEventDispatchAction(
            $pdo,
            $realEventId,
            (int) $caller['id'],
            (string) ($caller['role'] ?? 'tech_lead'),
            'dept_techlead_confirmation',
            "{$caller['full_name']} ({$deptIn} Tech Lead) [{$statusLabel}] on {$evTitle}: " . substr($commentIn, 0, 120),
            ['department' => $deptIn, 'confirmation_status' => $statusIn]
        );

        echo json_encode(array_merge(
            buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId),
            ['ok' => true, 'message' => "{$deptIn} confirmation & comment saved."]
        ));
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
