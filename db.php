<?php
/**
 * Identity AttendanceApp — MySQL Connection & Auto-Initializer (XAMPP)
 */

declare(strict_types=1);

function getDbConnection(): PDO
{
    $host = '127.0.0.1';
    $port = 3306;
    $user = 'root';
    $pass = '';
    $dbName = 'attendance_app';

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

    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$dbName}`");

    ensureSchemaAndSeed($pdo, false);

    return $pdo;
}

function ensureSchemaAndSeed(PDO $pdo, bool $forceReset = false): void
{
    // 1. Create tables if not exist
    $pdo->exec("
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
    ");

    $pdo->exec("
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
    ");

    $pdo->exec("
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
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `checkin_intervals` (
          `id` INT PRIMARY KEY,
          `slot_label` VARCHAR(16) NOT NULL,
          `guest_count` INT NOT NULL,
          `bar_height_px` DECIMAL(5,1) NOT NULL,
          `is_peak` TINYINT(1) NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
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
    ");

    if ($forceReset) {
        $pdo->exec("TRUNCATE TABLE `workspace_metrics`");
        $pdo->exec("TRUNCATE TABLE `attendees`");
        $pdo->exec("TRUNCATE TABLE `events`");
        $pdo->exec("TRUNCATE TABLE `checkin_intervals`");
        $pdo->exec("TRUNCATE TABLE `checkin_logs`");
    }

    // Check if already seeded
    $count = (int) $pdo->query("SELECT COUNT(*) FROM `workspace_metrics`")->fetchColumn();
    if ($count > 0) {
        return;
    }

    // Seed workspace_metrics
    $pdo->exec("
        INSERT INTO `workspace_metrics`
          (`id`, `event_name`, `total_people`, `registered`, `checked_in`, `waitlist`, `cancelled`, `checked_in_delta`, `ticket_revenue`, `last_arrival_time`)
        VALUES
          (1, 'Form & Future Summit 2026', 1338, 1284, 964, 42, 12, 186, 128400, '10:06 AM')
    ");

    // Seed 12 Figma attendees
    $attendees = [
        ['att-1', 'OR', '#f0eafa', '#f0ebff', '#8862b4', '#8862b4', 'Olivia Rhye', 'olivia@layers.design', 'Layers', 'Product Designer', 'General admission', 95, 0, 'Oct 12, 2026', 'Registered', 1, '09:12 AM', 'North Foyer Kiosk 01', 1],
        ['att-2', 'PB', '#eaf0f8', '#eaf0fa', '#5578a1', '#517eaf', 'Phoenix Baker', 'phoenix@sisyphus.com', 'Sisyphus', 'Design Director', 'VIP pass', 240, 1, 'Oct 13, 2026', 'Registered', 1, '08:54 AM', 'VIP Express Desk 03', 2],
        ['att-3', 'LS', '#f5ece5', '#f5ede5', '#ac7b53', '#b67f51', 'Lana Steiner', 'lana@catalog.studio', 'Catalog', 'Creative Director', 'General admission', 95, 0, 'Oct 14, 2026', 'Registered', 1, '10:06 AM', 'North Foyer Kiosk 02', 3],
        ['att-4', 'DW', '#e8f1eb', '#e7f1ec', '#59856a', '#53856a', 'Demi Wilkinson', 'demi@circooles.io', 'Circooles', 'Co-founder', 'VIP pass', 240, 1, 'Oct 15, 2026', 'Registered', 0, null, 'VIP Express Desk 03', 4],
        ['att-5', 'DC', '#ececf3', '#ececf6', '#797a94', '#787b9d', 'Drew Cano', 'drew@hourglass.app', 'Hourglass', 'Product Manager', 'General admission', 95, 0, 'Oct 18, 2026', 'Registered', 1, '09:38 AM', 'North Foyer Kiosk 01', 5],
        ['att-6', 'NC', '#f0eafa', '#f0ebff', '#8862b4', '#8862b4', 'Natali Craig', 'natali@command.design', 'Command', 'Brand Designer', 'General admission', 95, 0, 'Oct 22, 2026', 'Waitlisted', 0, null, 'North Foyer Kiosk 01', 6],
        ['att-7', 'OD', '#eaf0f8', '#eaf0fa', '#5578a1', '#517eaf', 'Orlando Diggs', 'orlando@feather.co', 'Feather', 'Head of Design', 'VIP pass', 240, 1, 'Oct 24, 2026', 'Registered', 0, null, 'VIP Express Desk 03', 7],
        ['att-8', 'AL', '#f5ece5', '#f5ede5', '#ac7b53', '#b67f51', 'Andi Lane', 'andi@quotient.co', 'Quotient', 'UX Researcher', 'General admission', 95, 0, 'Oct 28, 2026', 'Cancelled', 0, null, 'North Foyer Kiosk 02', 8],
        ['att-9', 'AT', '#e7f1ec', '#e7f1ec', '#53856a', '#53856a', 'Ava Thompson', 'ava@linear.app', 'Linear', 'Product Designer', 'General admission', 95, 0, 'Oct 29, 2026', 'Registered', 1, '09:26 AM', 'North Foyer Kiosk 02', 9],
        ['att-10', 'NW', '#ececf6', '#ececf6', '#787b9d', '#787b9d', 'Noah Williams', 'noah@notion.so', 'Notion', 'Design Engineer', 'VIP pass', 240, 1, 'Nov 1, 2026', 'Registered', 1, '09:45 AM', 'VIP Express Desk 03', 10],
        ['att-11', 'MC', '#f0ebff', '#f0ebff', '#8862b4', '#8862b4', 'Mia Chen', 'mia@figma.com', 'Figma', 'Design Advocate', 'Speaker', 0, 1, 'Nov 2, 2026', 'Registered', 1, '08:32 AM', 'Speaker & Press Desk 04', 11],
        ['att-12', 'EP', '#eaf0fa', '#eaf0fa', '#517eaf', '#517eaf', 'Ethan Park', 'ethan@read.cv', 'Read.cv', 'Co-founder', 'General admission', 95, 0, 'Nov 4, 2026', 'Registered', 0, null, 'North Foyer Kiosk 01', 12],
    ];

    $attStmt = $pdo->prepare("
        INSERT INTO `attendees`
          (`id`, `initials`, `bg_overview`, `bg_directory`, `color`, `color_directory`, `name`, `email`, `company`, `role`, `ticket`, `ticket_price`, `ticket_highlight`, `registered_date`, `status`, `checked_in`, `checkin_time`, `checkin_station`, `sort_order`)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($attendees as $row) {
        $attStmt->execute($row);
    }

    // Seed 8 Figma events
    $events = [
        ['evt-1', 'NOV', '07', 'Form & Future Summit 2026', 'Conference', 'Nov 7, 2026', '8:00 AM – 6:00 PM', 'Fort Mason Center', 'San Francisco, CA', 1284, 1500, 86, 0, 'Live', 'Manage event →', 'overview', 1],
        ['evt-2', 'NOV', '19', 'Design Leaders Dinner', 'Networking dinner', 'Nov 19, 2026', '6:30 PM – 9:30 PM', 'The Pearl', 'San Francisco, CA', 48, 60, 80, 0, 'Upcoming', 'Manage event →', 'attendees', 2],
        ['evt-3', 'DEC', '03', 'Design Systems Workshop', 'Workshop', 'Dec 3, 2026', '9:00 AM – 4:00 PM', 'Forma studio', 'San Francisco, CA', 86, 120, 72, 0, 'Upcoming', 'Manage event →', 'attendees', 3],
        ['evt-4', 'DEC', '10', 'Creative Community Meetup', 'Community meetup', 'Dec 10, 2026', '5:30 PM – 8:00 PM', 'The Assembly', 'San Francisco, CA', 128, 200, 64, 0, 'Upcoming', 'Manage event →', 'attendees', 4],
        ['evt-5', 'OCT', '22', 'Product Futures Forum', 'Conference', 'Oct 22, 2026', '9:00 AM – 5:00 PM', 'Pier 27', 'San Francisco, CA', 642, 700, 92, 1, 'Past', 'View report →', 'analytics', 5],
        ['evt-6', 'SEP', '24', 'The Shape of AI', 'Panel & networking', 'Sep 24, 2026', '5:00 PM – 8:00 PM', 'Gray Area', 'San Francisco, CA', 286, 300, 95, 1, 'Past', 'View report →', 'analytics', 6],
        ['evt-7', 'AUG', '20', 'Summer Studio Social', 'Community meetup', 'Aug 20, 2026', '4:00 PM – 7:00 PM', 'Forma studio', 'San Francisco, CA', 158, 180, 88, 1, 'Past', 'View report →', 'analytics', 7],
        ['evt-8', 'FEB', '18', 'Form & Future: New York', 'Conference', 'Feb 18, 2027', 'Schedule not published', 'Venue to be confirmed', 'New York, NY', 0, 800, 0, 0, 'Draft', 'Continue setup →', 'events', 8],
    ];

    $evtStmt = $pdo->prepare("
        INSERT INTO `events`
          (`id`, `month_label`, `day_label`, `name`, `type`, `date_label`, `time_label`, `venue`, `city`, `registered_count`, `capacity_count`, `bar_width_px`, `is_past_bar`, `status`, `action_label`, `action_target`, `sort_order`)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($events as $row) {
        $evtStmt->execute($row);
    }

    // Seed 11 check-in velocity intervals matching Figma Node 2:3484
    $intervals = [
        [1, '08:00', 18, 10.8, 0],
        [2, '08:30', 46, 27.6, 0],
        [3, '09:00', 112, 67.2, 0],
        [4, '09:30', 176, 105.6, 1],
        [5, '10:00', 154, 92.4, 0],
        [6, '10:30', 113, 67.8, 0],
        [7, '11:00', 89, 53.4, 0],
        [8, '11:30', 62, 37.2, 0],
        [9, '12:00', 42, 25.2, 0],
        [10, '12:30', 28, 16.8, 0],
        [11, '13:00', 24, 14.4, 0],
    ];

    $intStmt = $pdo->prepare("
        INSERT INTO `checkin_intervals` (`id`, `slot_label`, `guest_count`, `bar_height_px`, `is_peak`)
        VALUES (?, ?, ?, ?, ?)
    ");
    foreach ($intervals as $row) {
        $intStmt->execute($row);
    }

    // Seed initial check-in activity logs
    $logs = [
        ['att-11', 'Mia Chen', 'MC', '#f0ebff', '#8862b4', 'Figma', 'Speaker', 'Speaker & Press Desk 04', '08:32 AM'],
        ['att-2', 'Phoenix Baker', 'PB', '#eaf0f8', '#5578a1', 'Sisyphus', 'VIP pass', 'VIP Express Desk 03', '08:54 AM'],
        ['att-1', 'Olivia Rhye', 'OR', '#f0eafa', '#8862b4', 'Layers', 'General admission', 'North Foyer Kiosk 01', '09:12 AM'],
        ['att-9', 'Ava Thompson', 'AT', '#e7f1ec', '#53856a', 'Linear', 'General admission', 'North Foyer Kiosk 02', '09:26 AM'],
        ['att-5', 'Drew Cano', 'DC', '#ececf3', '#797a94', 'Hourglass', 'General admission', 'North Foyer Kiosk 01', '09:38 AM'],
        ['att-10', 'Noah Williams', 'NW', '#ececf6', '#787b9d', 'Notion', 'VIP pass', 'VIP Express Desk 03', '09:45 AM'],
        ['att-3', 'Lana Steiner', 'LS', '#f5ece5', '#ac7b53', 'Catalog', 'General admission', 'North Foyer Kiosk 02', '10:06 AM'],
    ];

    $logStmt = $pdo->prepare("
        INSERT INTO `checkin_logs`
          (`attendee_id`, `attendee_name`, `initials`, `avatar_bg`, `avatar_color`, `company`, `ticket`, `station`, `checkin_time`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($logs as $row) {
        $logStmt->execute($row);
    }
}
