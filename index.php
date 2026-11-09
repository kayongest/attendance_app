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

// Prevent browser caching of app shell so script and styling changes reflect immediately
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Serve main app view with server-side theme preset if cookie exists
$html = file_get_contents(__DIR__ . '/index.html');
if (!empty($_COOKIE['ability_theme']) && in_array($_COOKIE['ability_theme'], ['dark', 'light'], true)) {
    $theme = htmlspecialchars($_COOKIE['ability_theme'], ENT_QUOTES, 'UTF-8');
    $html = str_replace('<html lang="en">', '<html lang="en" data-theme="' . $theme . '">', $html);
}
echo $html;
