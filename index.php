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
try {
    require_once __DIR__ . '/db.php';
    $activeDb = '';
    $pdo = getDbConnection($activeDb);
    $brandingHtml = renderBrandingHeadHtml($pdo);
    $bCfg = getBrandingConfig($pdo);
    if (!empty($bCfg['default_theme']) && in_array($bCfg['default_theme'], ['dark', 'light'], true)) {
        $defaultBrandingTheme = $bCfg['default_theme'];
    }
} catch (Throwable $e) {
    $brandingHtml = '';
}

$html = file_get_contents(__DIR__ . '/index.html');
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
