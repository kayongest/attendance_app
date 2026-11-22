<?php
/**
 * aBility Manager — Main Application Entry Point & Authentication Gatekeeper
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// If not authenticated, redirect to login page matching the dual-slider design
if (empty($_SESSION['auth_user_id'])) {
    header('Location: login.php');
    exit;
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Prevent browser caching of app shell so script and styling changes reflect immediately
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Serve main app view with server-side branding tokens, theme preset & per-session CSRF meta tag
$brandingHtml = '';
$defaultBrandingTheme = null;
$authUserPreload = null;
try {
    require_once __DIR__ . '/db.php';
    $activeDb = '';
    $pdo = getDbConnection($activeDb);
    $brandingHtml = renderBrandingHeadHtml($pdo);
    $bCfg = getBrandingConfig($pdo);
    if (!empty($bCfg['default_theme']) && in_array($bCfg['default_theme'], ['dark', 'light'], true)) {
        $defaultBrandingTheme = $bCfg['default_theme'];
    }
    $authUid = (int) ($_SESSION['auth_user_id'] ?? 0);
    if ($authUid > 0) {
        $uStmt = $pdo->prepare("
            SELECT u.`id`, u.`username`, u.`full_name`, u.`role`, u.`profile_image`,
                   ub.`badge_code`, ub.`clearance_level`
            FROM `users` u
            LEFT JOIN `user_badges` ub ON ub.`user_id` = u.`id`
            WHERE u.`id` = ?
            LIMIT 1
        ");
        $uStmt->execute([$authUid]);
        $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
        if ($uRow) {
            $displayName = trim((string) ($uRow['full_name'] ?: $uRow['username'] ?: 'Active Operator'));
            $roleKey = strtolower(trim((string) ($uRow['role'] ?? 'user')));
            $roleTitle = '';
            try {
                $rSt = $pdo->prepare("SELECT `title` FROM `roles` WHERE LOWER(`role_key`) = ? LIMIT 1");
                $rSt->execute([$roleKey]);
                $roleTitle = trim((string) ($rSt->fetchColumn() ?: ''));
            } catch (Throwable $e) {}
            if ($roleTitle === '') {
                $roleFallbackMap = [
                    'admin' => 'Administrator',
                    'administrator' => 'Administrator',
                    'manager' => 'Manager',
                    'project_manager' => 'Project Manager',
                    'event_coordinator' => 'Event Coordinator',
                    'tech_lead' => 'Technical Lead',
                    'technical_lead' => 'Technical Lead',
                    'stock_manager' => 'Site Manager',
                    'stock_controller' => 'Gate Controller',
                    'technician' => 'Technician',
                    'support_staff' => 'Support Staff',
                ];
                $roleTitle = $roleFallbackMap[$roleKey] ?? ucwords(str_replace('_', ' ', $roleKey));
            }
            $clrRaw = strtoupper(trim((string) ($uRow['clearance_level'] ?? '')));
            $clrCode = strpos($clrRaw, 'L4') === 0 ? 'L4'
                : (strpos($clrRaw, 'L3') === 0 ? 'L3'
                : (strpos($clrRaw, 'L2') === 0 ? 'L2'
                : (strpos($clrRaw, 'L1') === 0 ? 'L1'
                : (in_array($roleKey, ['admin', 'administrator', 'manager', 'project_manager', 'event_coordinator', 'tech_lead', 'technical_lead', 'stock_manager'], true) ? 'L4' : ($roleKey === 'stock_controller' ? 'L3' : 'L2')))));
            $avatarImgUrl = resolveProfileImageUrl($uRow['profile_image'] ?? null);
            $initials = computeInitials($displayName);
            $authUserPreload = [
                'displayName' => $displayName,
                'roleText' => $roleTitle . ' · ' . $clrCode,
                'badgeCode' => trim((string) ($uRow['badge_code'] ?? '')) ?: ('REW-BADGE-' . str_pad((string) $authUid, 4, '0', STR_PAD_LEFT)),
                'avatarHtml' => $avatarImgUrl
                    ? '<img src="' . htmlspecialchars($avatarImgUrl, ENT_QUOTES, 'UTF-8') . '" alt="' . htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8') . '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">'
                    : htmlspecialchars($initials, ENT_QUOTES, 'UTF-8'),
                'title' => $displayName . ' (' . $roleTitle . ' · ' . $clrCode . ') · Click for Account Menu',
            ];
        }
    }
} catch (Throwable $e) {
    $brandingHtml = '';
}

$html = file_get_contents(__DIR__ . '/index.html');
if (is_array($authUserPreload)) {
    $safeName = htmlspecialchars($authUserPreload['displayName'], ENT_QUOTES, 'UTF-8');
    $safeRole = htmlspecialchars($authUserPreload['roleText'], ENT_QUOTES, 'UTF-8');
    $safeBadge = htmlspecialchars($authUserPreload['badgeCode'], ENT_QUOTES, 'UTF-8');
    $safeTitle = htmlspecialchars($authUserPreload['title'], ENT_QUOTES, 'UTF-8');
    $avatarInner = $authUserPreload['avatarHtml'];
    $html = strtr($html, [
        'id="account-footer-avatar" data-node-id="2:3323">--</div>' => 'id="account-footer-avatar" data-node-id="2:3323">' . $avatarInner . '</div>',
        'id="account-footer-name" data-node-id="2:3326">Loading...</span>' => 'id="account-footer-name" data-node-id="2:3326">' . $safeName . '</span>',
        'id="account-footer-role" data-node-id="2:3327">Active Session</span>' => 'id="account-footer-role" data-node-id="2:3327">' . $safeRole . '</span>',
        'id="topbar-avatar" data-node-id="2:3345" title="User Account &amp; Access" style="cursor: pointer;">--</div>' => 'id="topbar-avatar" data-node-id="2:3345" title="' . $safeTitle . '" style="cursor: pointer;">' . $avatarInner . '</div>',
        'id="user-menu-avatar" style="width: 42px; height: 42px; font-size: 15px;">--</div>' => 'id="user-menu-avatar" style="width: 42px; height: 42px; font-size: 15px;">' . $avatarInner . '</div>',
        'id="user-menu-name">Loading...</div>' => 'id="user-menu-name">' . $safeName . '</div>',
        'id="user-menu-role">Active Session</div>' => 'id="user-menu-role">' . $safeRole . '</div>',
        'id="user-menu-badge">--</div>' => 'id="user-menu-badge">' . $safeBadge . '</div>',
    ]);
}
$csrfMeta = '<meta name="csrf-token" content="' . htmlspecialchars((string) $_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') . '" />';
$headInject = "  {$csrfMeta}\n";
if ($brandingHtml !== '') {
    $headInject .= "  {$brandingHtml}\n";
}
$html = str_replace('</head>', $headInject . '</head>', $html);
$cookieTheme = (!empty($_COOKIE['ability_theme']) && in_array($_COOKIE['ability_theme'], ['dark', 'light'], true))
    ? $_COOKIE['ability_theme']
    : $defaultBrandingTheme;
if ($cookieTheme !== null) {
    $theme = htmlspecialchars($cookieTheme, ENT_QUOTES, 'UTF-8');
    $html = str_replace('<html lang="en">', '<html lang="en" data-theme="' . $theme . '">', $html);
}
echo $html;
