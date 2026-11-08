<?php
/**
 * aBility Manager (id_badges.php#pane-kiosk) — Gate Terminal & Access Matrix API
 * Powers the 4-Tier Access Matrix (L1-L4), Dual Checkpoint Selector (Stock Warehouse vs Event Venue),
 * Paired Check-In / Check-Out State Machine, Linked Equipment Batches, and User Activity Timeline.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

function normalizeClearanceTier(string $rawLevel, string $role = 'user'): array
{
    $matrix = getFourTierMatrixSpec();
    $upper = strtoupper(trim($rawLevel));
    if (isset($matrix[$upper])) {
        return $matrix[$upper];
    }
    if (strpos($upper, 'L4') === 0) {
        return $matrix['L4_ALL_ACCESS'];
    }
    if (strpos($upper, 'L3') === 0) {
        return $matrix['L3_STOCK_WAREHOUSE'];
    }
    if (strpos($upper, 'L2') === 0) {
        return $matrix['L2_TECH_STAGE'];
    }
    if (strpos($upper, 'L1') === 0) {
        return $matrix['L1_VENUE_BASIC'];
    }

    $r = strtolower(trim($role));
    if (in_array($r, ['admin', 'manager', 'stock_manager', 'tech_lead'], true)) {
        return $matrix['L4_ALL_ACCESS'];
    }
    if ($r === 'stock_controller') {
        return $matrix['L3_STOCK_WAREHOUSE'];
    }
    if ($r === 'technician') {
        return $matrix['L2_TECH_STAGE'];
    }
    return $matrix['L1_VENUE_BASIC'];
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

    return [
        'ok' => true,
        'allowed' => (bool) $allowed,
        'reason' => (string) $reason,
        'action' => (string) $action,
        'punctuality' => (string) $punctuality,
        'punctuality_label' => (string) $punctualityLabel,
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

function buildFullPayload(PDO $pdo, string $activeDb, string $reqCheckpointType = 'stock_warehouse', int $reqCheckpointId = 1): array
{
    $todayStr = date('Y-m-d');

    // 1. Load Stock Warehouses
    $stockRows = $pdo->query("SELECT * FROM `stock_locations` WHERE `is_active` = 1 ORDER BY `id` ASC")->fetchAll();
    $stockWarehouses = [];
    foreach ($stockRows as $sr) {
        $sid = (int) $sr['id'];
        $stockWarehouses[] = [
            'id' => $sid,
            'type' => 'stock_warehouse',
            'name' => (string) ($sr['name'] ?? 'Stock Warehouse'),
            'code' => (string) ($sr['code'] ?? $sr['location_code'] ?? 'STK-0' . $sid),
            'location' => (string) ($sr['location'] ?? 'Kigali Logistics Hub'),
            'open_time' => substr((string) ($sr['open_time'] ?? '08:00:00'), 0, 5),
            'close_time' => substr((string) ($sr['close_time'] ?? '18:00:00'), 0, 5),
            'call_time' => substr((string) ($sr['open_time'] ?? '08:00:00'), 0, 5),
            'lead_label' => 'Stock Controller: Mirene Uwase',
            'min_clearance' => 'L2 / L3 / L4 Required (L1 Blocked)',
        ];
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
        $pm = (string) ($er['project_manager'] ?? 'Operations PM');
        $tl = (string) ($er['tech_lead'] ?? 'Tech Lead');
        $eventVenues[] = [
            'id' => $numId,
            'raw_id' => $rawId,
            'type' => 'event_venue',
            'name' => $title . ($loc && stripos($title, $loc) === false ? ' — ' . $loc : ''),
            'title' => $title,
            'location' => $loc,
            'date' => (string) ($er['date'] ?? $todayStr),
            'call_time' => $callTime,
            'lead_label' => 'Tech Lead: ' . ($tl ?: $pm ?: 'Jean Paul'),
            'min_clearance' => 'L1 / L2 / L3 / L4 Authorized',
        ];
        $fallbackIdx++;
    }

    // Resolve Active Checkpoint
    $checkpointType = in_array($reqCheckpointType, ['stock_warehouse', 'event_venue'], true)
        ? $reqCheckpointType
        : 'stock_warehouse';

    $activeCheckpoint = null;
    if ($checkpointType === 'stock_warehouse') {
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
            'lead_label' => 'Stock Controller: Mirene Uwase',
            'min_clearance' => 'L2 / L3 / L4 Required',
        ];
    }

    $activeCpType = (string) $activeCheckpoint['type'];
    $activeCpId = (int) $activeCheckpoint['id'];
    $activeCpName = (string) $activeCheckpoint['name'];

    // 3. Load Today's Attendance Logs
    $todayLogsStmt = $pdo->prepare("
        SELECT * FROM `attendance_logs`
        WHERE DATE(`scanned_at`) = ?
        ORDER BY `scanned_at` ASC, `id` ASC
    ");
    $todayLogsStmt->execute([$todayStr]);
    $todayLogs = $todayLogsStmt->fetchAll();

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
    $tierCounts = ['L1' => 0, 'L2' => 0, 'L3' => 0, 'L4' => 0];
    $activeBadgesCount = 0;

    foreach ($userRows as $ur) {
        $uid = (int) $ur['id'];
        $fullName = trim((string) ($ur['full_name'] ?: $ur['username']));
        $username = (string) ($ur['username'] ?? ('user' . $uid));
        $role = strtolower(trim((string) ($ur['role'] ?? 'technician')));
        $dept = trim((string) ($ur['department'] ?: 'Production'));
        $tier = normalizeClearanceTier((string) ($ur['clearance_level'] ?? ''), $role);
        $tierCode = $tier['code'];
        if (isset($tierCounts[$tierCode])) {
            $tierCounts[$tierCode]++;
        }

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

        $member = [
            'id' => $uid,
            'username' => $username,
            'full_name' => $fullName,
            'email' => (string) ($ur['email'] ?? ($username . '@ability.rw')),
            'phone' => (string) ($ur['phone'] ?: '+250 788 100 ' . str_pad((string) $uid, 3, '0', STR_PAD_LEFT)),
            'role' => $role,
            'role_display' => ucwords(str_replace('_', ' ', $role)),
            'department' => $dept,
            'profile_image_url' => resolveProfileImageUrl($ur['profile_image'] ?? null),
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
            'check_in_time' => $uDaily['check_in_short'] ?? null,
            'check_in_full' => $uDaily['check_in_full'] ?? null,
            'check_out_time' => $uDaily['check_out_short'] ?? null,
            'check_out_full' => $uDaily['check_out_full'] ?? null,
            'punctuality_code' => $uDaily['punctuality_code'] ?? 'on_time',
            'punctuality' => $uDaily['punctuality_label'] ?? 'READY',
            'last_checkpoint_type' => $uDaily['last_checkpoint_type'] ?? null,
            'last_checkpoint_name' => $uDaily['last_checkpoint_name'] ?? null,
            'is_active' => (int) ($ur['is_active'] ?? 1),
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
        $sw['station_mode'] = 'Stock Controller Gate';
        $allCheckpointsDirectory[] = $sw;
    }
    unset($sw);

    foreach ($eventVenues as &$ev) {
        $cpKey = 'event_venue:' . $ev['id'];
        $st = $checkpointStats[$cpKey] ?? ['checked_in_today' => 0, 'checked_out_today' => 0, 'denied_today' => 0, 'active_users' => []];
        $ev['checked_in_today'] = (int) $st['checked_in_today'];
        $ev['on_site_now'] = count($st['active_users']);
        $ev['denied_today'] = (int) $st['denied_today'];
        $ev['station_mode'] = 'Locked Entrance Station (PIN: 1234)';
        $allCheckpointsDirectory[] = $ev;
    }
    unset($ev);

    // 6. Load All Equipment Batches (`stock_movements`)
    $allBatches = [];
    try {
        $bRows = $pdo->query("SELECT * FROM `stock_movements` ORDER BY `id` DESC LIMIT 25")->fetchAll();
        $itemStmt = $pdo->prepare("SELECT `item_name`, `quantity` FROM `batch_items` WHERE `batch_id` = ? LIMIT 10");
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
                'movement_type' => (string) ($br['movement_type'] ?? 'dispatch'),
                'source_name' => (string) ($br['source_name'] ?? 'Ndera Warehouse'),
                'destination_name' => (string) ($br['destination_name'] ?? 'Kigali Convention Centre'),
                'destination_room' => (string) ($br['destination_room'] ?? 'Main Auditorium'),
                'technician_id' => $techId,
                'technician_name' => $techMember ? $techMember['full_name'] : (string) ($br['submitted_by'] ?: 'Eric Havugimana'),
                'technician_badge' => $techMember ? $techMember['badge_code'] : 'REW-BADGE-0006',
                'technician_clearance' => $techMember ? $techMember['clearance_code'] : 'L2',
                'stock_controller_name' => (string) ($br['stock_controller_name'] ?: 'Mirene Uwase'),
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

        if ($accessStatus === 'denied') {
            $actionTitle = 'Access Denied at ' . ($cpType === 'stock_warehouse' ? 'Stock — ' : 'Venue — ') . $cpName;
        } elseif ($scanAction === 'check_out') {
            $actionTitle = ($cpType === 'stock_warehouse' ? 'Signed out from stock — ' : 'Checked out from Venue — ') . $cpName;
        } elseif ($scanAction === 'access_verify') {
            $actionTitle = 'Verified clearance at ' . $cpName;
        } else {
            $actionTitle = ($cpType === 'stock_warehouse' ? 'Checked in to Stock — ' : 'Entered Venue — ') . $cpName;
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
            'notes' => (string) ($tr['notes'] ?? ''),
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

    // 9. Build 4-Tier Matrix Summary
    $rawMatrix = getFourTierMatrixSpec();
    $clearanceMatrix = [];
    foreach (['L1_VENUE_BASIC', 'L2_TECH_STAGE', 'L3_STOCK_WAREHOUSE', 'L4_ALL_ACCESS'] as $mKey) {
        $m = $rawMatrix[$mKey];
        $m['member_count'] = $tierCounts[$m['code']] ?? 0;
        $clearanceMatrix[] = $m;
    }

    return [
        'ok' => true,
        'dbSource' => $activeDb,
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
        'defaultVerification' => $defaultVerification,
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

    if ($action === 'bootstrap') {
        echo json_encode(buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId));
        exit;
    }

    if ($action === 'process_gate_scan') {
        $scanInput = trim((string) ($_POST['scan_input'] ?? $jsonBody['scan_input'] ?? ''));
        $scanMode = strtolower(trim((string) ($_POST['scan_mode'] ?? $jsonBody['scan_mode'] ?? 'auto')));

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

        // Determine scan_action
        if (!$allowed) {
            $resolvedAction = 'access_verify';
            $accessStatus = 'denied';
            $denialReason = $reason;
        } else {
            $accessStatus = 'granted';
            $denialReason = null;
            if ($scanMode === 'verify_only') {
                $resolvedAction = 'access_verify';
            } elseif ($scanMode === 'check_in') {
                $resolvedAction = 'check_in';
            } elseif ($scanMode === 'check_out') {
                $resolvedAction = 'check_out';
            } else {
                // Auto Smart Check-In / Check-Out
                $resolvedAction = ($targetMember['daily_state'] === 'checked_in') ? 'check_out' : 'check_in';
            }
        }

        // Calculate call-time punctuality
        $nowTs = time();
        $scheduledTs = strtotime(date('Y-m-d') . ' ' . $callTime . ':00') ?: strtotime(date('Y-m-d 08:00:00'));
        if (!$allowed) {
            $punctuality = 'n/a';
            $punctualityLabel = 'ACCESS RESTRICTED';
        } elseif ($resolvedAction === 'check_out') {
            $punctuality = 'on_time';
            $punctualityLabel = 'SHIFT CHECK-OUT';
        } else {
            $diffMinutes = ($nowTs - $scheduledTs) / 60;
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
            ? ($resolvedAction === 'check_out'
                ? "Gate Check-Out recorded at {$cpName}"
                : ($resolvedAction === 'access_verify'
                    ? "Clearance verified at {$cpName}"
                    : "Gate Check-In recorded at {$cpName}"))
            : "Denied at {$cpName}: {$reason}";

        $insStmt = $pdo->prepare("
            INSERT INTO `attendance_logs`
              (`user_id`, `badge_code`, `checkpoint_type`, `checkpoint_id`, `checkpoint_name`, `scan_action`, `access_status`, `denial_reason`, `punctuality_status`, `scanned_by`, `notes`, `scanned_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
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
            $noteText,
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
                'scanned_at' => date('H:i:s'),
                'check_in_time' => $updatedMember['check_in_full'] ?? ($resolvedAction === 'check_in' ? date('h:i:s A') : null),
                'check_out_time' => $updatedMember['check_out_full'] ?? ($resolvedAction === 'check_out' ? date('h:i:s A') : null),
            ]
        );

        $verification['bootstrap'] = $updatedPayload;
        echo json_encode($verification);
        exit;
    }

    if ($action === 'update_clearance') {
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

    if ($action === 'update_call_time') {
        $cpType = trim((string) ($_POST['checkpoint_type'] ?? $jsonBody['checkpoint_type'] ?? ''));
        $rawCpId = trim((string) ($_POST['checkpoint_id'] ?? $jsonBody['checkpoint_id'] ?? ''));
        $rawCallTime = trim((string) ($_POST['call_time'] ?? $jsonBody['call_time'] ?? '08:00'));

        // Normalize time to HH:MM format
        $timeParts = explode(':', $rawCallTime);
        $hRaw = preg_replace('/\D/', '', $timeParts[0] ?? '08');
        $mRaw = preg_replace('/\D/', '', $timeParts[1] ?? '00');
        $hour = str_pad($hRaw !== '' ? $hRaw : '08', 2, '0', STR_PAD_LEFT);
        $min = str_pad(substr($mRaw !== '' ? $mRaw : '00', 0, 2), 2, '0', STR_PAD_LEFT);
        $formattedTime = "{$hour}:{$min}";
        $formattedTimeFull = "{$hour}:{$min}:00";

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
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        $name = trim((string) ($_POST['name'] ?? $jsonBody['name'] ?? ''));
        $code = trim((string) ($_POST['code'] ?? $jsonBody['code'] ?? ''));
        $location = trim((string) ($_POST['location'] ?? $jsonBody['location'] ?? ''));
        $openTime = trim((string) ($_POST['open_time'] ?? $jsonBody['open_time'] ?? '08:00'));
        $closeTime = trim((string) ($_POST['close_time'] ?? $jsonBody['close_time'] ?? '18:00'));
        $controllerName = trim((string) ($_POST['controller_name'] ?? $jsonBody['controller_name'] ?? 'Mirene Uwase'));
        $controllerPhone = trim((string) ($_POST['controller_phone'] ?? $jsonBody['controller_phone'] ?? ''));
        $isActive = isset($_POST['is_active']) ? (int) $_POST['is_active'] : (int) ($jsonBody['is_active'] ?? 1);

        if ($name === '') {
            echo json_encode(['ok' => false, 'error' => 'Warehouse name is required']);
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
            if ($uploadedImagePath) {
                $stmt = $pdo->prepare("
                    UPDATE `stock_locations`
                    SET `name` = ?, `code` = ?, `location_code` = ?, `location` = ?, `open_time` = ?, `close_time` = ?,
                        `controller_name` = ?, `controller_phone` = ?, `is_active` = ?, `image` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $uploadedImagePath, $id]);
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
            $stmt = $pdo->prepare("
                INSERT INTO `stock_locations`
                (`name`, `code`, `location_code`, `location`, `open_time`, `close_time`, `controller_name`, `controller_phone`, `is_active`, `image`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $code, $code, $location, $openTime, $closeTime, $controllerName, $controllerPhone, $isActive, $uploadedImagePath]);
            $id = (int) $pdo->lastInsertId();
        }

        echo json_encode([
            'ok' => true,
            'message' => 'Warehouse saved successfully',
            'warehouse_id' => $id,
        ]);
        exit;
    }

    if ($action === 'delete_warehouse') {
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($id > 0) {
            $del = $pdo->prepare("DELETE FROM `stock_locations` WHERE `id` = ?");
            $del->execute([$id]);
        }
        echo json_encode(['ok' => true, 'message' => 'Warehouse deleted']);
        exit;
    }

    if ($action === 'save_stock_item') {
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

        if ($id > 0) {
            if ($uploadedImagePath) {
                $stmt = $pdo->prepare("
                    UPDATE `items`
                    SET `item_name` = ?, `serial_number` = ?, `category` = ?, `brand` = ?, `model` = ?, `department` = ?,
                        `stock_location` = ?, `quantity` = ?, `condition` = ?, `status` = ?, `notes` = ?, `image` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$itemName, $serialNumber, $category, $brand, $model, $department, $stockLocation, $quantity, $condition, $status, $notes, $uploadedImagePath, $id]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE `items`
                    SET `item_name` = ?, `serial_number` = ?, `category` = ?, `brand` = ?, `model` = ?, `department` = ?,
                        `stock_location` = ?, `quantity` = ?, `condition` = ?, `status` = ?, `notes` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$itemName, $serialNumber, $category, $brand, $model, $department, $stockLocation, $quantity, $condition, $status, $notes, $id]);
            }
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO `items`
                (`item_name`, `serial_number`, `category`, `brand`, `model`, `department`, `stock_location`, `quantity`, `condition`, `status`, `notes`, `image`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$itemName, $serialNumber, $category, $brand, $model, $department, $stockLocation, $quantity, $condition, $status, $notes, $uploadedImagePath]);
            $id = (int) $pdo->lastInsertId();
        }

        echo json_encode([
            'ok' => true,
            'message' => 'Stock item saved successfully',
            'item_id' => $id,
        ]);
        exit;
    }

    if ($action === 'delete_stock_item') {
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($id > 0) {
            $del = $pdo->prepare("DELETE FROM `items` WHERE `id` = ?");
            $del->execute([$id]);
        }
        echo json_encode(['ok' => true, 'message' => 'Stock item deleted']);
        exit;
    }

    if ($action === 'save_user') {
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
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO `users`
                (`username`, `full_name`, `email`, `phone`, `role`, `department`, `profile_image`, `is_active`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$username, $fullName, $email, $phone, $role, $department, $uploadedImagePath, $isActive]);
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

    if ($action === 'delete_user') {
        $id = (int) ($_POST['id'] ?? $jsonBody['id'] ?? 0);
        if ($id > 0) {
            $pdo->prepare("DELETE FROM `attendance_logs` WHERE `user_id` = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM `user_badges` WHERE `user_id` = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM `users` WHERE `id` = ?")->execute([$id]);
        }
        echo json_encode(['ok' => true, 'message' => 'User deleted successfully']);
        exit;
    }

    if ($action === 'reset_demo') {
        ensureAbilitySchemaAndSeed($pdo, true);
        echo json_encode(buildFullPayload($pdo, $activeDb, $reqCpType, $reqCpId));
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
