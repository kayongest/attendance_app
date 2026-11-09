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

// Serve main app view
readfile(__DIR__ . '/index.html');
