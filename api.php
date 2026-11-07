<?php
/**
 * Identity AttendanceApp — REST JSON API (PHP + MySQL on XAMPP)
 * Endpoints:
 *   GET  api.php?action=bootstrap
 *   POST api.php?action=checkin
 *   POST api.php?action=undo_checkin
 *   POST api.php?action=add_attendee
 *   POST api.php?action=add_event
 *   POST api.php?action=reset_demo
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/db.php';

function buildFullPayload(PDO $pdo): array
{
    // 1. Workspace metrics
    $metricsRow = $pdo->query("SELECT * FROM `workspace_metrics` WHERE `id` = 1")->fetch();
    $totalPeople = (int) ($metricsRow['total_people'] ?? 1338);
    $registered = (int) ($metricsRow['registered'] ?? 1284);
    $checkedIn = (int) ($metricsRow['checked_in'] ?? 964);
    $waitlist = (int) ($metricsRow['waitlist'] ?? 42);
    $cancelled = (int) ($metricsRow['cancelled'] ?? 12);
    $checkedInDelta = (int) ($metricsRow['checked_in_delta'] ?? 186);
    $ticketRevenue = (int) ($metricsRow['ticket_revenue'] ?? 128400);
    $lastArrivalTime = (string) ($metricsRow['last_arrival_time'] ?? '10:06 AM');

    // 2. Attendees list
    $attendeeRows = $pdo->query("SELECT * FROM `attendees` ORDER BY `sort_order` ASC, `created_at` DESC")->fetchAll();
    $attendees = [];
    foreach ($attendeeRows as $row) {
        $attendees[] = [
            'id' => $row['id'],
            'initials' => $row['initials'],
            'bgOverview' => $row['bg_overview'],
            'bgDirectory' => $row['bg_directory'],
            'color' => $row['color'],
            'colorDirectory' => $row['color_directory'],
            'name' => $row['name'],
            'email' => $row['email'],
            'company' => $row['company'],
            'role' => $row['role'],
            'ticket' => $row['ticket'],
            'ticketPrice' => (int) $row['ticket_price'],
            'ticketHighlight' => ((int) $row['ticket_highlight']) === 1,
            'registeredDate' => $row['registered_date'],
            'status' => $row['status'],
            'checkedIn' => ((int) $row['checked_in']) === 1,
            'checkinTime' => $row['checkin_time'],
            'checkinStation' => $row['checkin_station'] ?? 'North Foyer Kiosk 01',
            'selected' => false,
        ];
    }

    // 3. Events list
    $eventRows = $pdo->query("SELECT * FROM `events` ORDER BY `sort_order` ASC, `created_at` DESC")->fetchAll();
    $events = [];
    foreach ($eventRows as $row) {
        $regCount = (int) $row['registered_count'];
        $capCount = (int) $row['capacity_count'];
        $events[] = [
            'id' => $row['id'],
            'month' => $row['month_label'],
            'day' => $row['day_label'],
            'name' => $row['name'],
            'type' => $row['type'],
            'date' => $row['date_label'],
            'time' => $row['time_label'],
            'venue' => $row['venue'],
            'city' => $row['city'],
            'registeredCount' => $regCount,
            'capacityCount' => $capCount,
            'registeredText' => number_format($regCount),
            'capacityText' => ' / ' . number_format($capCount),
            'barWidthPx' => (int) $row['bar_width_px'],
            'isPastBar' => ((int) $row['is_past_bar']) === 1,
            'status' => $row['status'],
            'actionLabel' => $row['action_label'],
            'actionTarget' => $row['action_target'],
            'selected' => false,
        ];
    }

    // 4. 30-Minute Check-in Intervals
    $intervalRows = $pdo->query("SELECT * FROM `checkin_intervals` ORDER BY `id` ASC")->fetchAll();
    $intervals = [];
    $peakCount = 0;
    $peakLabel = '09:30 AM';
    foreach ($intervalRows as $row) {
        $gCount = (int) $row['guest_count'];
        if ($gCount >= $peakCount) {
            $peakCount = $gCount;
            $peakLabel = $row['slot_label'] . ' AM';
        }
        $intervals[] = [
            'id' => (int) $row['id'],
            'slotLabel' => $row['slot_label'],
            'guestCount' => $gCount,
            'barHeightPx' => (float) $row['bar_height_px'],
            'isPeak' => ((int) $row['is_peak']) === 1,
        ];
    }

    // 5. Recent Check-in Logs (latest 8)
    $logRows = $pdo->query("SELECT * FROM `checkin_logs` ORDER BY `id` DESC LIMIT 8")->fetchAll();
    $recentLogs = [];
    foreach ($logRows as $row) {
        $recentLogs[] = [
            'id' => (int) $row['id'],
            'attendeeId' => $row['attendee_id'],
            'name' => $row['attendee_name'],
            'initials' => $row['initials'],
            'avatarBg' => $row['avatar_bg'],
            'avatarColor' => $row['avatar_color'],
            'company' => $row['company'],
            'ticket' => $row['ticket'],
            'station' => $row['station'],
            'checkinTime' => $row['checkin_time'],
        ];
    }

    // 6. Compute Live Analytics Breakdown from MySQL
    // Scale sample tier counts proportionally with live check-ins
    $extraCheckins = max(0, $checkedIn - 964);
    $extraReg = max(0, $registered - 1284);

    // Count VIP vs General vs Speaker in the live DB directory
    $vipCheckedDb = (int) $pdo->query("SELECT COUNT(*) FROM `attendees` WHERE `ticket` = 'VIP pass' AND `checked_in` = 1")->fetchColumn();
    $genCheckedDb = (int) $pdo->query("SELECT COUNT(*) FROM `attendees` WHERE `ticket` = 'General admission' AND `checked_in` = 1")->fetchColumn();
    $spkCheckedDb = (int) $pdo->query("SELECT COUNT(*) FROM `attendees` WHERE `ticket` = 'Speaker' AND `checked_in` = 1")->fetchColumn();

    $vipExtra = max(0, $vipCheckedDb - 2);
    $genExtra = max(0, $genCheckedDb - 4);
    $spkExtra = max(0, $spkCheckedDb - 1);

    $genTotal = 912 + $extraReg;
    $genChecked = 689 + $genExtra;
    $vipTotal = 310;
    $vipChecked = 221 + $vipExtra;
    $spkTotal = 62;
    $spkChecked = 54 + $spkExtra;

    $ticketTiers = [
        [
            'tier' => 'General admission',
            'registered' => $genTotal,
            'checkedIn' => $genChecked,
            'rate' => round(($genChecked / max(1, $genTotal)) * 100, 1),
            'revenue' => 86640 + ($extraReg * 95),
            'priceLabel' => '$95',
            'badgeType' => 'neutral',
        ],
        [
            'tier' => 'VIP pass',
            'registered' => $vipTotal,
            'checkedIn' => $vipChecked,
            'rate' => round(($vipChecked / max(1, $vipTotal)) * 100, 1),
            'revenue' => 41760,
            'priceLabel' => '$240',
            'badgeType' => 'purple',
        ],
        [
            'tier' => 'Speaker & Press',
            'registered' => $spkTotal,
            'checkedIn' => $spkChecked,
            'rate' => round(($spkChecked / max(1, $spkTotal)) * 100, 1),
            'revenue' => 0,
            'priceLabel' => 'Comp',
            'badgeType' => 'green',
        ],
    ];

    // Station telemetry computed from checkin_logs
    $stationCountsStmt = $pdo->query("SELECT `station`, COUNT(*) AS `cnt` FROM `checkin_logs` GROUP BY `station`")->fetchAll();
    $stationBoost = [];
    foreach ($stationCountsStmt as $stRow) {
        $stationBoost[$stRow['station']] = (int) $stRow['cnt'];
    }

    $stations = [
        [
            'name' => 'North Foyer Kiosk 01',
            'location' => 'Main Entrance · Terminal A',
            'processed' => 342 + max(0, ($stationBoost['North Foyer Kiosk 01'] ?? 3) - 3),
            'avgSpeed' => '4.1s',
            'status' => 'Online',
            'sharePct' => 36,
        ],
        [
            'name' => 'North Foyer Kiosk 02',
            'location' => 'Main Entrance · Terminal B',
            'processed' => 318 + max(0, ($stationBoost['North Foyer Kiosk 02'] ?? 3) - 3),
            'avgSpeed' => '4.4s',
            'status' => 'Online',
            'sharePct' => 33,
        ],
        [
            'name' => 'VIP Express Desk 03',
            'location' => 'West Lounge · Fast Track',
            'processed' => 221 + max(0, ($stationBoost['VIP Express Desk 03'] ?? 2) - 2),
            'avgSpeed' => '3.6s',
            'status' => 'Online',
            'sharePct' => 23,
        ],
        [
            'name' => 'Speaker & Press Desk 04',
            'location' => 'Green Room · Backstage',
            'processed' => 83 + max(0, ($stationBoost['Speaker & Press Desk 04'] ?? 1) - 1),
            'avgSpeed' => '3.2s',
            'status' => 'Online',
            'sharePct' => 8,
        ],
    ];

    // Role distribution
    $roleDistribution = [
        ['role' => 'Product & UX Designers', 'count' => 540 + $extraCheckins, 'pct' => 42],
        ['role' => 'Design Directors & Heads', 'count' => 334, 'pct' => 26],
        ['role' => 'Founders & Executives', 'count' => 244, 'pct' => 19],
        ['role' => 'Design Engineers & PMs', 'count' => 166, 'pct' => 13],
    ];

    return [
        'ok' => true,
        'dbEngine' => 'MySQL / MariaDB (XAMPP)',
        'stats' => [
            'totalPeople' => $totalPeople,
            'registered' => $registered,
            'checkedIn' => $checkedIn,
            'waitlist' => $waitlist,
            'cancelled' => $cancelled,
            'checkedInDelta' => $checkedInDelta,
            'ticketRevenue' => $ticketRevenue,
            'lastArrivalTime' => $lastArrivalTime,
        ],
        'attendees' => $attendees,
        'events' => $events,
        'intervals' => $intervals,
        'analytics' => [
            'peakGuests' => $peakCount,
            'peakTime' => $peakLabel,
            'avgCheckinSeconds' => '4.2s',
            'vipRemaining' => max(0, 25 - $vipExtra),
            'ticketTiers' => $ticketTiers,
            'stations' => $stations,
            'roleDistribution' => $roleDistribution,
            'recentLogs' => $recentLogs,
        ],
    ];
}

try {
    $pdo = getDbConnection();
    $action = $_GET['action'] ?? 'bootstrap';
    $rawBody = file_get_contents('php://input');
    $input = $rawBody ? (json_decode($rawBody, true) ?? []) : [];

    if ($action === 'bootstrap') {
        echo json_encode(buildFullPayload($pdo));
        exit;
    }

    if ($action === 'checkin' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $attendeeId = trim((string) ($input['attendeeId'] ?? ''));
        $checkinTime = trim((string) ($input['checkinTime'] ?? date('h:i A')));

        $stmt = $pdo->prepare("SELECT * FROM `attendees` WHERE `id` = ?");
        $stmt->execute([$attendeeId]);
        $att = $stmt->fetch();

        if ($att && (int) $att['checked_in'] === 0 && $att['status'] === 'Registered') {
            $station = $att['ticket'] === 'VIP pass'
                ? 'VIP Express Desk 03'
                : ($att['ticket'] === 'Speaker' ? 'Speaker & Press Desk 04' : 'North Foyer Kiosk 01');

            $pdo->beginTransaction();

            $upd = $pdo->prepare("UPDATE `attendees` SET `checked_in` = 1, `checkin_time` = ?, `checkin_station` = ? WHERE `id` = ?");
            $upd->execute([$checkinTime, $station, $attendeeId]);

            $pdo->prepare("
                UPDATE `workspace_metrics`
                SET `checked_in` = `checked_in` + 1,
                    `checked_in_delta` = `checked_in_delta` + 1,
                    `last_arrival_time` = ?
                WHERE `id` = 1
            ")->execute([$checkinTime]);

            // Increment the 10:30 interval bucket so the chart reflects real-time check-ins
            $pdo->exec("
                UPDATE `checkin_intervals`
                SET `guest_count` = `guest_count` + 1,
                    `bar_height_px` = LEAST(120.0, ROUND((`guest_count` + 1) * 0.6, 1))
                WHERE `id` = 6
            ");

            // Insert into checkin_logs
            $logIns = $pdo->prepare("
                INSERT INTO `checkin_logs`
                  (`attendee_id`, `attendee_name`, `initials`, `avatar_bg`, `avatar_color`, `company`, `ticket`, `station`, `checkin_time`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $logIns->execute([
                $att['id'],
                $att['name'],
                $att['initials'],
                $att['bg_overview'],
                $att['color'],
                $att['company'],
                $att['ticket'],
                $station,
                $checkinTime,
            ]);

            $pdo->commit();
        }

        echo json_encode(buildFullPayload($pdo));
        exit;
    }

    if ($action === 'undo_checkin' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $attendeeId = trim((string) ($input['attendeeId'] ?? ''));

        $stmt = $pdo->prepare("SELECT * FROM `attendees` WHERE `id` = ?");
        $stmt->execute([$attendeeId]);
        $att = $stmt->fetch();

        if ($att && (int) $att['checked_in'] === 1) {
            $pdo->beginTransaction();

            $pdo->prepare("UPDATE `attendees` SET `checked_in` = 0, `checkin_time` = NULL WHERE `id` = ?")->execute([$attendeeId]);
            $pdo->exec("
                UPDATE `workspace_metrics`
                SET `checked_in` = GREATEST(0, `checked_in` - 1),
                    `checked_in_delta` = GREATEST(0, `checked_in_delta` - 1)
                WHERE `id` = 1
            ");
            $pdo->prepare("DELETE FROM `checkin_logs` WHERE `attendee_id` = ?")->execute([$attendeeId]);

            $pdo->commit();
        }

        echo json_encode(buildFullPayload($pdo));
        exit;
    }

    if ($action === 'add_attendee' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = trim((string) ($input['name'] ?? ''));
        $email = trim((string) ($input['email'] ?? ''));
        $company = trim((string) ($input['company'] ?? 'Independent'));
        $role = trim((string) ($input['role'] ?? 'Guest'));
        $ticket = trim((string) ($input['ticket'] ?? 'General admission'));

        if ($name !== '' && $email !== '') {
            $parts = preg_split('/\s+/', $name) ?: [$name];
            $initials = count($parts) >= 2
                ? strtoupper(substr($parts[0], 0, 1) . substr($parts[count($parts) - 1], 0, 1))
                : strtoupper(substr($name, 0, 2));

            $id = 'att-' . time() . '-' . random_int(100, 999);
            $price = $ticket === 'VIP pass' ? 240 : ($ticket === 'Speaker' ? 0 : 95);
            $highlight = $ticket !== 'General admission' ? 1 : 0;

            $pdo->beginTransaction();

            $minSort = (int) $pdo->query("SELECT COALESCE(MIN(`sort_order`), 1) FROM `attendees`")->fetchColumn();
            $ins = $pdo->prepare("
                INSERT INTO `attendees`
                  (`id`, `initials`, `bg_overview`, `bg_directory`, `color`, `color_directory`, `name`, `email`, `company`, `role`, `ticket`, `ticket_price`, `ticket_highlight`, `registered_date`, `status`, `checked_in`, `checkin_time`, `checkin_station`, `sort_order`)
                VALUES
                  (?, ?, '#f0eafa', '#f0ebff', '#8862b4', '#8862b4', ?, ?, ?, ?, ?, ?, ?, 'Nov 7, 2026', 'Registered', 0, NULL, 'North Foyer Kiosk 01', ?)
            ");
            $ins->execute([$id, $initials, $name, $email, $company, $role, $ticket, $price, $highlight, $minSort - 1]);

            $pdo->prepare("
                UPDATE `workspace_metrics`
                SET `total_people` = `total_people` + 1,
                    `registered` = `registered` + 1,
                    `ticket_revenue` = `ticket_revenue` + ?
                WHERE `id` = 1
            ")->execute([$price]);

            $pdo->exec("
                UPDATE `events`
                SET `registered_count` = `registered_count` + 1
                WHERE `id` = 'evt-1'
            ");

            $pdo->commit();
        }

        echo json_encode(buildFullPayload($pdo));
        exit;
    }

    if ($action === 'add_event' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $title = trim((string) ($input['name'] ?? ''));
        $type = trim((string) ($input['type'] ?? 'Conference'));
        $venue = trim((string) ($input['venue'] ?? 'Forma studio'));
        $capacity = max(10, (int) ($input['capacity'] ?? 250));

        if ($title !== '') {
            $id = 'evt-' . time();
            $minSort = (int) $pdo->query("SELECT COALESCE(MIN(`sort_order`), 1) FROM `events`")->fetchColumn();
            $ins = $pdo->prepare("
                INSERT INTO `events`
                  (`id`, `month_label`, `day_label`, `name`, `type`, `date_label`, `time_label`, `venue`, `city`, `registered_count`, `capacity_count`, `bar_width_px`, `is_past_bar`, `status`, `action_label`, `action_target`, `sort_order`)
                VALUES
                  (?, 'DEC', '18', ?, ?, 'Dec 18, 2026', '6:00 PM – 9:00 PM', ?, 'San Francisco, CA', 1, ?, 6, 0, 'Upcoming', 'Manage event →', 'attendees', ?)
            ");
            $ins->execute([$id, $title, $type, $venue, $capacity, $minSort - 1]);
        }

        echo json_encode(buildFullPayload($pdo));
        exit;
    }

    if ($action === 'reset_demo' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        ensureSchemaAndSeed($pdo, true);
        echo json_encode(buildFullPayload($pdo));
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Unknown action']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ]);
}
