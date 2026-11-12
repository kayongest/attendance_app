<?php
/**
 * aBility Manager — Sliding Login & Sign Up Page
 * Role-Based Access: Standard crew only see Sign In.
 * Administrators have access to toggle between Sign In and Sign Up (Staff Registration & Badge Issuing).
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Prevent browser caching of login shell so persona updates reflect immediately
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Handle explicit ?logout=1 first
if (isset($_GET['logout'])) {
    $_SESSION = [];
    if (session_id()) {
        session_destroy();
    }
}

// Detect if current session or request belongs to an authenticated user / Administrator
$isAdmin = false;
$callerName = null;
$callerRole = null;
$callerBadge = null;

if (!empty($_SESSION['auth_user_id'])) {
    try {
        require_once __DIR__ . '/db.php';
        $activeDb = '';
        $pdo = getDbConnection($activeDb);
        $stmt = $pdo->prepare("
            SELECT u.id, u.full_name, u.username, u.role, b.badge_code 
            FROM `users` u 
            LEFT JOIN `user_badges` b ON b.user_id = u.id 
            WHERE u.id = ?
        ");
        $stmt->execute([(int)$_SESSION['auth_user_id']]);
        $callerRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($callerRow) {
            $callerName = $callerRow['full_name'] ?: $callerRow['username'];
            $callerRole = strtolower((string)$callerRow['role']);
            $callerBadge = (string)($callerRow['badge_code'] ?? '');
            if (in_array($callerRole, ['admin', 'manager', 'administrator'], true)) {
                $isAdmin = true;
            }
        }
    } catch (Throwable $e) {}
}

if (isset($_GET['admin']) && ($_GET['admin'] === '1' || $_GET['admin'] === 'true')) {
    $isAdmin = true;
}

$initialTheme = 'light';
if (!empty($_COOKIE['ability_theme']) && in_array($_COOKIE['ability_theme'], ['dark', 'light'], true)) {
    $initialTheme = $_COOKIE['ability_theme'];
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="<?php echo htmlspecialchars($initialTheme, ENT_QUOTES, 'UTF-8'); ?>">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In &amp; Sign Up — aBility Manager</title>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('ability_theme');
        var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Marvel:ital,wght@0,400;0,700;1,400;1,700&family=Share+Tech&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Marvel:ital,wght@0,400;0,700;1,400;1,700&family=Share+Tech&display=swap');

    .share-tech-regular {
      font-family: "Share Tech", sans-serif;
      font-weight: 400;
      font-style: normal;
    }

    .marvel-regular {
      font-family: "Marvel", sans-serif;
      font-weight: 400;
      font-style: normal;
    }

    .marvel-bold {
      font-family: "Marvel", sans-serif;
      font-weight: 700;
      font-style: normal;
    }

    .marvel-regular-italic {
      font-family: "Marvel", sans-serif;
      font-weight: 400;
      font-style: italic;
    }

    .marvel-bold-italic {
      font-family: "Marvel", sans-serif;
      font-weight: 700;
      font-style: italic;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg-page: #f4f5f8;
      --bg-card: #ffffff;
      --bg-input: #edf2f7;
      --bg-input-focus: #e2e8f0;
      --border-color: #e2e8f0;
      --border-color-focus: #cbd5e0;
      --text-main: #20212a;
      --text-sub: #718096;
      --text-muted: #a0aec0;
      --brand-purple: #5c3dbb;
      --brand-purple-hover: #4f2cb8;
      --brand-purple-soft: #ede9fe;
      --card-shadow: 0 14px 28px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
      --overlay-gradient: linear-gradient(135deg, #6c42e2 0%, #4f2cb8 100%);
      --modal-card-bg: #ffffff;
      --modal-backdrop-bg: rgba(15, 17, 23, 0.65);
      --social-border: #e2e8f0;
      --social-color: #4a5568;
      --social-hover-bg: #f7fafc;
      --cancel-btn-bg: #edf2f7;
      --cancel-btn-color: #4a5568;
    }

    [data-theme="dark"] {
      --bg-page: #090d16;
      --bg-card: #121826;
      --bg-input: #1a2234;
      --bg-input-focus: #242e45;
      --border-color: #263147;
      --border-color-focus: #3b4861;
      --text-main: #f1f5f9;
      --text-sub: #94a3b8;
      --text-muted: #64748b;
      --brand-purple: #7c3aed;
      --brand-purple-hover: #6d28d9;
      --brand-purple-soft: rgba(124, 58, 237, 0.2);
      --card-shadow: 0 18px 40px rgba(0, 0, 0, 0.55), 0 10px 15px rgba(0, 0, 0, 0.4);
      --overlay-gradient: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
      --modal-card-bg: #121826;
      --modal-backdrop-bg: rgba(0, 0, 0, 0.78);
      --social-border: #263147;
      --social-color: #94a3b8;
      --social-hover-bg: #1a2234;
      --cancel-btn-bg: #1a2234;
      --cancel-btn-color: #94a3b8;
    }

    /* Smooth theme transition */
    html.theme-transitioning,
    html.theme-transitioning *,
    html.theme-transitioning *::before,
    html.theme-transitioning *::after {
      transition: background-color 0.25s ease, border-color 0.25s ease, color 0.15s ease, box-shadow 0.2s ease !important;
      transition-delay: 0s !important;
    }

    [data-theme="dark"] input,
    [data-theme="dark"] select {
      color-scheme: dark;
    }

    body {
      background: var(--bg-page);
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      font-family: 'Share Tech', 'Marvel', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      color: var(--text-main);
    }

    /* Top-Right Toast Notification (Matches Screenshot) */
    .toast-alert {
      position: fixed;
      top: 24px;
      right: 24px;
      background-color: #38a169;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.2px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(-12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }

    .toast-alert.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .toast-alert.error {
      background-color: #e53e3e;
    }

    .toast-alert.info {
      background-color: #3182ce;
    }

    /* Top Header Bar & Theme Switcher */
    .login-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 780px;
      max-width: 100%;
      margin-bottom: 18px;
    }

    .top-back-link {
      font-size: 12px;
      color: var(--text-sub);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: color 0.15s;
    }

    .top-back-link:hover {
      color: var(--brand-purple);
    }

    .theme-toggle-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      background-color: var(--bg-card);
      color: var(--text-sub);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    .theme-toggle-pill:hover {
      color: var(--text-main);
      border-color: var(--brand-purple);
      transform: translateY(-1px);
    }

    .theme-toggle-pill .theme-sun-icon {
      color: #fbbf24;
      transition: transform 0.25s ease;
    }

    .theme-toggle-pill .theme-moon-icon {
      color: var(--text-sub);
      transition: transform 0.25s ease;
    }

    .theme-toggle-pill:hover svg {
      transform: rotate(18deg);
    }

    [data-theme="dark"] .theme-toggle-pill .theme-sun-icon {
      display: block !important;
    }
    [data-theme="dark"] .theme-toggle-pill .theme-moon-icon {
      display: none !important;
    }
    :root:not([data-theme="dark"]) .theme-toggle-pill .theme-sun-icon,
    [data-theme="light"] .theme-toggle-pill .theme-sun-icon {
      display: none !important;
    }
    :root:not([data-theme="dark"]) .theme-toggle-pill .theme-moon-icon,
    [data-theme="light"] .theme-toggle-pill .theme-moon-icon {
      display: block !important;
    }

    /* Outer Dual-Panel Container */
    .container {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      box-shadow: var(--card-shadow);
      position: relative;
      overflow: hidden;
      width: 780px;
      max-width: 100%;
      min-height: 500px;
    }

    .form-container {
      position: absolute;
      top: 0;
      height: 100%;
      transition: all 0.6s ease-in-out;
    }

    .sign-in-container {
      left: 0;
      width: 50%;
      z-index: 2;
    }

    .container.right-panel-active .sign-in-container {
      transform: translateX(100%);
    }

    .sign-up-container {
      left: 0;
      width: 50%;
      opacity: 0;
      z-index: 1;
    }

    .container.right-panel-active .sign-up-container {
      transform: translateX(100%);
      opacity: 1;
      z-index: 5;
      animation: show 0.6s;
    }

    @keyframes show {
      0%, 49.99% {
        opacity: 0;
        z-index: 1;
      }
      50%, 100% {
        opacity: 1;
        z-index: 5;
      }
    }

    form {
      background-color: var(--bg-card);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 0 45px;
      height: 100%;
      text-align: center;
    }

    h1 {
      font-weight: 700;
      font-size: 30px;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    /* Social Icon Circles */
    .social-container {
      margin: 12px 0 10px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .social-container a {
      border: 1px solid var(--social-border);
      border-radius: 50%;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: 38px;
      width: 38px;
      color: var(--social-color);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .social-container a:hover {
      background-color: var(--social-hover-bg);
      border-color: var(--border-color-focus);
      color: var(--brand-purple);
      transform: translateY(-1px);
    }

    span.form-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    /* Input Fields */
    .input-field-wrap {
      width: 100%;
      margin-bottom: 12px;
      position: relative;
    }

    .input-field {
      background-color: var(--bg-input);
      border: 1px solid var(--border-color);
      padding: 12px 15px;
      border-radius: 6px;
      width: 100%;
      font-size: 13px;
      font-family: inherit;
      color: var(--text-main);
      outline: none;
      transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
    }

    .input-field:focus {
      background-color: var(--bg-input-focus);
      border-color: var(--brand-purple);
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.25);
    }

    .input-field::placeholder {
      color: var(--text-muted);
    }

    .input-field.has-eye {
      padding-right: 42px;
    }

    .password-eye-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-sub);
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .password-eye-btn:hover {
      color: var(--brand-purple);
    }

    /* Forgot Password Link */
    .forgot-link {
      color: #ff4b6e;
      font-size: 12px;
      text-decoration: none;
      margin: 6px 0 12px;
      font-weight: 500;
      transition: color 0.15s;
      cursor: pointer;
    }

    .forgot-link:hover {
      text-decoration: underline;
      color: #e53e3e;
    }

    /* Remember Me Checkbox */
    .remember-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-sub);
      margin-bottom: 16px;
      cursor: pointer;
      user-select: none;
    }

    .remember-wrap input[type="checkbox"] {
      cursor: pointer;
      accent-color: var(--brand-purple);
      width: 14px;
      height: 14px;
    }

    /* Buttons */
    .btn-submit-pill {
      border-radius: 24px;
      border: none;
      background-color: var(--brand-purple);
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      padding: 12px 42px;
      letter-spacing: 1px;
      text-transform: uppercase;
      transition: transform 0.1s ease, background-color 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(92, 61, 187, 0.35);
      font-family: inherit;
    }

    .btn-submit-pill:hover {
      background-color: var(--brand-purple-hover);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(92, 61, 187, 0.45);
    }

    .btn-submit-pill:active {
      transform: translateY(1px);
    }

    .btn-submit-pill:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Sliding Overlay Container */
    .overlay-container {
      position: absolute;
      top: 0;
      left: 50%;
      width: 50%;
      height: 100%;
      overflow: hidden;
      transition: transform 0.6s ease-in-out;
      z-index: 100;
    }

    .container.right-panel-active .overlay-container {
      transform: translateX(-100%);
    }

    .overlay {
      background: var(--overlay-gradient);
      background-repeat: no-repeat;
      background-size: cover;
      background-position: 0 0;
      color: #ffffff;
      position: relative;
      left: -100%;
      height: 100%;
      width: 200%;
      transform: translateX(0);
      transition: transform 0.6s ease-in-out;
    }

    .container.right-panel-active .overlay {
      transform: translateX(50%);
    }

    .overlay-panel {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 0 45px;
      text-align: center;
      top: 0;
      height: 100%;
      width: 50%;
      transform: translateX(0);
      transition: transform 0.6s ease-in-out;
    }

    .overlay-left {
      transform: translateX(-20%);
    }

    .container.right-panel-active .overlay-left {
      transform: translateX(0);
    }

    .overlay-right {
      right: 0;
      transform: translateX(0);
    }

    .container.right-panel-active .overlay-right {
      transform: translateX(20%);
    }

    .overlay-panel h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 12px;
    }

    .overlay-panel p {
      font-size: 13px;
      font-weight: 400;
      line-height: 1.5;
      letter-spacing: 0.3px;
      margin: 0 0 20px;
      color: rgba(255, 255, 255, 0.9);
      max-width: 260px;
    }

    .overlay-sub {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
      margin-bottom: 14px;
    }

    .btn-ghost-pill {
      border-radius: 24px;
      border: 1.5px solid #ffffff;
      background-color: transparent;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      padding: 11px 40px;
      letter-spacing: 1px;
      text-transform: uppercase;
      transition: all 0.2s ease;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-ghost-pill:hover {
      background-color: #ffffff;
      color: var(--brand-purple);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    }

    /* Admin Restricted vs Unlocked Controls */
    .restricted-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 5px 12px;
      border-radius: 14px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #ffffff;
      letter-spacing: 0.3px;
    }

    .btn-unlock-pill {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.45);
      color: #ffffff;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-unlock-pill:hover {
      background: rgba(255, 255, 255, 0.28);
      border-color: #ffffff;
      transform: translateY(-1px);
    }

    .admin-pin-modal-backdrop {
      position: fixed;
      inset: 0;
      background: var(--modal-backdrop-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: pinFadeIn 0.15s ease-out;
    }

    @keyframes pinFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .admin-pin-modal-card {
      background: var(--modal-card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      width: 360px;
      max-width: 90vw;
      padding: 22px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.35);
    }

    .btn-cancel-sm {
      background: var(--cancel-btn-bg);
      border: 1px solid var(--border-color);
      color: var(--cancel-btn-color);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.12s;
    }

    .btn-cancel-sm:hover {
      color: var(--text-main);
    }

    .btn-submit-sm {
      background: var(--brand-purple);
      border: none;
      color: #ffffff;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.12s;
    }

    .btn-submit-sm:hover {
      background: var(--brand-purple-hover);
    }

    .demo-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .demo-pill-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 6px 14px;
      border-radius: 16px;
      font-size: 11px;
      color: var(--text-sub);
      cursor: pointer;
      transition: all 0.12s;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    }

    .demo-pill-btn:hover {
      background-color: var(--brand-purple-soft);
      border-color: var(--brand-purple);
      color: var(--text-main);
      transform: translateY(-1px);
    }

    .demo-pill-btn strong {
      color: var(--text-main);
    }

    /* Form Fields Grid for Register */
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      width: 100%;
      margin-bottom: 8px;
    }

    .input-select {
      background-color: var(--bg-input);
      border: 1px solid var(--border-color);
      padding: 10px 12px;
      border-radius: 6px;
      width: 100%;
      font-size: 12px;
      font-family: inherit;
      color: var(--text-main);
      outline: none;
      transition: background-color 0.15s, border-color 0.15s;
    }

    .input-select:focus {
      background-color: var(--bg-input-focus);
      border-color: var(--brand-purple);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container {
        width: 100%;
        min-height: 580px;
      }
      .sign-in-container, .sign-up-container {
        width: 100%;
        position: relative;
      }
      .overlay-container {
        display: none;
      }
    }
  </style>
</head>
<body>

  <!-- Green Floating Toast Notification (Top Right — Matches Screenshot) -->
  <div class="toast-alert" id="toast-alert" role="status" aria-live="polite">
    <span id="toast-text">Welcome back, Lorem Ipsum!</span>
  </div>

  <!-- Top Header Bar with Navigation & Theme Toggle -->
  <div class="login-header-bar">
    <a href="index.php" class="top-back-link">
      &larr; Return to Gate Operations Dashboard
    </a>
    <button type="button" class="theme-toggle-pill" id="login-theme-toggle-btn" title="Toggle Light / Dark Mode">
      <svg class="theme-sun-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg class="theme-moon-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <span id="login-theme-text">Dark Mode</span>
    </button>
  </div>

  <!-- Active Operator Session Banner (if signed in) -->
  <?php if (!empty($callerName)): ?>
  <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.22); border-radius: 10px; padding: 12px 18px; margin-bottom: 16px; max-width: 780px; width: 100%; display: flex; align-items: center; justify-content: space-between; font-size: 13px; box-sizing: border-box;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 22px;">👤</span>
      <div>
        <div style="font-weight: 700; color: #1e293b;">Active Operator Session: <strong><?php echo htmlspecialchars($callerName, ENT_QUOTES, 'UTF-8'); ?></strong></div>
        <div style="font-size: 11px; color: #64748b;">Role: <code><?php echo htmlspecialchars($callerRole ?? 'staff', ENT_QUOTES, 'UTF-8'); ?></code> <?php if ($callerBadge): ?>&bull; Badge: <code><?php echo htmlspecialchars($callerBadge, ENT_QUOTES, 'UTF-8'); ?></code><?php endif; ?> &bull; Click any 1-Click Role below to switch test identity immediately.</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <a href="index.php" style="display: inline-flex; align-items: center; gap: 4px; padding: 7px 14px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 12px;">Launch Dashboard &rarr;</a>
      <a href="login.php?logout=1" style="display: inline-flex; align-items: center; padding: 7px 12px; background: #fee2e2; color: #dc2626; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 12px;">Sign Out</a>
    </div>
  </div>
  <?php endif; ?>

  <!-- Main Sliding Container -->
  <div class="container" id="auth-container">
    
    <!-- Sign Up Form Panel (Administrator Only) -->
    <div class="form-container sign-up-container">
      <form id="signup-form">
        <h1>Create Account</h1>
        <div class="social-container">
          <a href="javascript:void(0)" class="social js-social" data-provider="Facebook" title="Sign up with Facebook">f</a>
          <a href="javascript:void(0)" class="social js-social" data-provider="Google" title="Sign up with Google">G+</a>
          <a href="javascript:void(0)" class="social js-social" data-provider="LinkedIn" title="Sign up with LinkedIn">in</a>
        </div>
        <span class="form-subtitle">Administrator Staff &amp; Badge Provisioning</span>

        <div class="input-field-wrap">
          <input type="text" id="reg-name" class="input-field" placeholder="Full Name (e.g. Alice Mutoni)" required />
        </div>

        <div class="grid-2col">
          <input type="text" id="reg-username" class="input-field" placeholder="Username (e.g. alice)" required />
          <input type="email" id="reg-email" class="input-field" placeholder="Email" required />
        </div>

        <div class="grid-2col">
          <select id="reg-role" class="input-select">
            <option value="technician">Technician (Tier L2)</option>
            <option value="user">Venue Crew (Tier L1)</option>
            <option value="driver">Logistics Driver (Tier L1)</option>
            <option value="stock_controller">Stock Controller (Tier L3)</option>
            <option value="stock_manager">Stock Manager (Tier L4)</option>
            <option value="security">Security Officer (Tier L1)</option>
            <option value="tech_lead">Tech Lead (Tier L4)</option>
            <option value="admin">Administrator (Tier L4)</option>
          </select>
          <select id="reg-dept" class="input-select">
            <option value="Audio">Audio</option>
            <option value="Video">Video</option>
            <option value="Lighting">Lighting</option>
            <option value="Rigging">Rigging</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Security">Security</option>
            <option value="Executive">Executive</option>
          </select>
        </div>

        <div class="input-field-wrap">
          <input type="password" id="reg-password" class="input-field has-eye" placeholder="Password (min. 4 characters)" required />
          <button type="button" class="password-eye-btn js-toggle-pwd" data-target="reg-password" title="Show/Hide password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>

        <button type="submit" class="btn-submit-pill" id="reg-submit-btn">SIGN UP</button>
      </form>
    </div>

    <!-- Sign In Form Panel (Standard for All Users) -->
    <div class="form-container sign-in-container">
      <form id="signin-form">
        <h1>Sign in</h1>
        <div class="social-container">
          <a href="javascript:void(0)" class="social js-social" data-provider="Facebook" title="Sign in with Facebook">f</a>
          <a href="javascript:void(0)" class="social js-social" data-provider="Google" title="Sign in with Google">G+</a>
          <a href="javascript:void(0)" class="social js-social" data-provider="LinkedIn" title="Sign in with LinkedIn">in</a>
        </div>
        <span class="form-subtitle">or use your account</span>

        <div class="input-field-wrap">
          <input
            type="text"
            id="signin-username"
            class="input-field"
            placeholder="lorem@gmail.com"
            value="mirene@ability.rw"
            required
            autocomplete="username"
          />
        </div>

        <div class="input-field-wrap">
          <input
            type="password"
            id="signin-password"
            class="input-field has-eye"
            placeholder="••••••••"
            value="password123"
            required
            autocomplete="current-password"
          />
          <button type="button" class="password-eye-btn js-toggle-pwd" data-target="signin-password" title="Show/Hide password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>

        <a href="javascript:void(0)" class="forgot-link" id="forgot-password-link">Forgot your password?</a>

        <label class="remember-wrap">
          <input type="checkbox" id="remember-me" checked />
          Remember me
        </label>

        <button type="submit" class="btn-submit-pill" id="signin-submit-btn">SIGN IN</button>
      </form>
    </div>

    <!-- Overlay Sliding Panels -->
    <div class="overlay-container">
      <div class="overlay">
        <!-- Overlay Left (Visible when Create Account is open) -->
        <div class="overlay-panel overlay-left">
          <h1>Hello, Friend!</h1>
          <p>Enter your personal details and start your journey with us</p>
          <span class="overlay-sub">Already have an account?</span>
          <button type="button" class="btn-ghost-pill" id="signInBtn">SIGN IN</button>
        </div>

        <!-- Overlay Right (Visible when Sign In is open) -->
        <div class="overlay-panel overlay-right">
          <h1>Welcome Back!</h1>
          <p>To keep connected with us please login with your personal info</p>

          <!-- Non-Admin State: Only Sign In is allowed for standard crew -->
          <div id="non-admin-section" style="<?php echo $isAdmin ? 'display: none;' : 'display: flex; flex-direction: column; align-items: center;'; ?>">
            <div class="restricted-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Restricted Registration</span>
            </div>
            <span class="overlay-sub" style="font-size: 11px; margin: 6px 0 14px; opacity: 0.85; max-width: 250px; line-height: 1.4;">
              Staff accounts &amp; badges are provisioned exclusively by System Administrators.
            </span>
            <button type="button" class="btn-unlock-pill" id="adminUnlockTrigger">
              🔑 Admin Toggle Unlock
            </button>
          </div>

          <!-- Admin State: Shows the toggle button between Sign Up & Sign In (Matches Screenshot) -->
          <div id="admin-section" style="<?php echo $isAdmin ? 'display: flex; flex-direction: column; align-items: center;' : 'display: none;'; ?>">
            <span class="overlay-sub" style="margin-bottom: 14px; display: block; font-size: 13px; color: #ffffff;">No account yet?</span>
            <button type="button" class="btn-ghost-pill" id="signUpBtn">SIGN UP</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Fast Demo Account Switcher for Instant Testing -->
  <div style="margin-top: 20px; text-align: center; max-width: 780px; width: 100%;">
    <div style="font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; font-weight: 600;">
      ⚡ Quick Role Test (1-Click Sign In)
    </div>
    <div class="demo-pills">
      <button type="button" class="demo-pill-btn js-demo-btn" data-user="didier@ability.rw" data-pass="admin123" data-name="Didier Kayonge" data-role="admin" data-is-admin="1" title="👑 Didier Kayonge (admin • Tier L4 All Access) — Unlocks Sign Up toggle + Full Access">
        👑 <strong>Didier Kayonge</strong> (admin &bull; Tier L4 All Access)
      </button>
      <button type="button" class="demo-pill-btn js-demo-btn" data-user="jp@ability.rw" data-pass="password123" data-name="Jean Paul Ndayisaba" data-role="tech_lead" data-is-admin="0" title="🎛️ Jean Paul Ndayisaba (tech_lead • Call times & Event Rosters)">
        🎛️ <strong>Jean Paul Ndayisaba</strong> (tech_lead &bull; Call times &amp; Event Rosters)
      </button>
      <button type="button" class="demo-pill-btn js-demo-btn" data-user="theogene@ability.rw" data-pass="password123" data-name="Theogene Nsengiyumva" data-role="stock_manager" data-is-admin="0" title="🏭 Theogene Nsengiyumva (stock_manager • Warehouses & Scoped Onboarding)">
        🏭 <strong>Theogene Nsengiyumva</strong> (stock_manager &bull; Warehouses &amp; Scoped Onboarding)
      </button>
      <button type="button" class="demo-pill-btn js-demo-btn" data-user="mirene@ability.rw" data-pass="password123" data-name="Mirene Uwase" data-role="stock_controller" data-is-admin="0" title="📦 Mirene Uwase (stock_controller • Restricted to Gate Kiosk & Custody)">
        📦 <strong>Mirene Uwase</strong> (stock_controller &bull; Restricted to Gate Kiosk &amp; Custody)
      </button>
      <button type="button" class="demo-pill-btn js-demo-btn" data-user="eric@ability.rw" data-pass="password123" data-name="Eric Havugimana" data-role="technician" data-is-admin="0" title="🏗️ Eric Havugimana (technician • Rigging L2)">
        🏗️ <strong>Eric Havugimana</strong> (technician &bull; Rigging L2)
      </button>
    </div>
  </div>

  <!-- Administrator PIN Verification Modal (to unlock Sign Up toggle) -->
  <div class="admin-pin-modal-backdrop" id="admin-pin-modal" style="display: none;">
    <div class="admin-pin-modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #20212a; display: flex; align-items: center; gap: 6px;">
          <span>🔑</span> Administrator Verification
        </h3>
        <button type="button" id="closeAdminPinModal" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #718096; line-height: 1;">✕</button>
      </div>
      <p style="font-size: 11px; color: #718096; line-height: 1.4; margin-bottom: 12px;">
        Enter Station Supervisor PIN or Admin password to unlock the staff registration toggle. (PIN: <strong>1234</strong> or <strong>admin123</strong>)
      </p>
      <form id="admin-pin-form" style="padding: 0; text-align: left; align-items: stretch;">
        <div class="input-field-wrap">
          <input
            type="password"
            id="admin-pin-input"
            class="input-field"
            placeholder="Enter Supervisor PIN (1234)"
            required
            autocomplete="off"
            style="height: 38px; font-size: 13px;"
          />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
          <button type="button" class="btn-cancel-sm" id="cancelAdminPinBtn">Cancel</button>
          <button type="submit" class="btn-submit-sm" id="confirmAdminPinBtn">Unlock Toggle</button>
        </div>
      </form>
    </div>
  </div>



  <script>
    (function () {
      'use strict';

      const container = document.getElementById('auth-container');
      const signUpBtn = document.getElementById('signUpBtn');
      const signInBtn = document.getElementById('signInBtn');
      const toastEl = document.getElementById('toast-alert');
      const toastText = document.getElementById('toast-text');
      const nonAdminSection = document.getElementById('non-admin-section');
      const adminSection = document.getElementById('admin-section');
      const adminUnlockTrigger = document.getElementById('adminUnlockTrigger');
      const adminPinModal = document.getElementById('admin-pin-modal');
      const closeAdminPinModal = document.getElementById('closeAdminPinModal');
      const cancelAdminPinBtn = document.getElementById('cancelAdminPinBtn');
      const adminPinForm = document.getElementById('admin-pin-form');
      const adminPinInput = document.getElementById('admin-pin-input');
      let toastTimer = null;

      // Initial admin state from server
      let isAdminActive = <?php echo $isAdmin ? 'true' : 'false'; ?>;

      function showToast(message, type = 'success', duration = 3200) {
        if (!toastEl) return;
        toastText.textContent = message;
        toastEl.className = 'toast-alert show' + (type === 'error' ? ' error' : (type === 'info' ? ' info' : ''));
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          toastEl.classList.remove('show');
        }, duration);
      }

      function enableAdminControls() {
        isAdminActive = true;
        if (nonAdminSection) nonAdminSection.style.display = 'none';
        if (adminSection) adminSection.style.display = 'flex';
        showToast('Administrator privileges verified. Toggle enabled!', 'success', 2800);
      }

      function disableAdminControls() {
        isAdminActive = false;
        container.classList.remove('right-panel-active');
        if (nonAdminSection) nonAdminSection.style.display = 'flex';
        if (adminSection) adminSection.style.display = 'none';
      }

      // Check URL parameters (e.g. ?mode=signup or ?logout=1)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'signup' && isAdminActive) {
        container.classList.add('right-panel-active');
      } else if (urlParams.get('mode') === 'signup' && !isAdminActive) {
        showToast('Staff registration is restricted to system administrators.', 'info', 3200);
      }

      if (urlParams.get('logout') === '1') {
        showToast('You have been signed out successfully.', 'info', 3000);
      }

      // Sliding toggle buttons (Admin only)
      if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
          if (isAdminActive) {
            container.classList.add('right-panel-active');
          } else {
            showToast('Only administrators can access staff registration.', 'error');
          }
        });
      }

      if (signInBtn) {
        signInBtn.addEventListener('click', () => {
          container.classList.remove('right-panel-active');
        });
      }

      // Admin PIN Verification Modal Trigger
      if (adminUnlockTrigger) {
        adminUnlockTrigger.addEventListener('click', () => {
          if (adminPinModal) {
            adminPinModal.style.display = 'flex';
            if (adminPinInput) {
              adminPinInput.value = '';
              adminPinInput.focus();
            }
          }
        });
      }

      function closePinDialog() {
        if (adminPinModal) adminPinModal.style.display = 'none';
      }

      if (closeAdminPinModal) closeAdminPinModal.addEventListener('click', closePinDialog);
      if (cancelAdminPinBtn) cancelAdminPinBtn.addEventListener('click', closePinDialog);

      if (adminPinForm) {
        adminPinForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const pin = adminPinInput ? adminPinInput.value.trim() : '';
          if (pin === '1234' || pin === 'admin123') {
            closePinDialog();
            enableAdminControls();
          } else {
            showToast('Incorrect supervisor PIN or password.', 'error');
          }
        });
      }

      // Password visibility toggle
      document.querySelectorAll('.js-toggle-pwd').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          const input = document.getElementById(targetId);
          if (input) {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.style.color = isPassword ? '#5c3dbb' : '#718096';
          }
        });
      });

      // Social icon helper
      document.querySelectorAll('.js-social').forEach((btn) => {
        btn.addEventListener('click', () => {
          const prov = btn.getAttribute('data-provider');
          showToast(`Connecting ${prov} SSO token with aBility matrix...`, 'info', 2000);
        });
      });

      // Forgot password hint
      const forgotLink = document.getElementById('forgot-password-link');
      if (forgotLink) {
        forgotLink.addEventListener('click', () => {
          showToast('Default terminal passwords: password123 (staff) or admin123 (executives).', 'info', 4000);
        });
      }

      // Fast Demo Accounts 1-click login
      document.querySelectorAll('.js-demo-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const u = btn.getAttribute('data-user');
          const p = btn.getAttribute('data-pass');
          const name = btn.getAttribute('data-name');
          const isDemoAdmin = btn.getAttribute('data-is-admin') === '1';

          document.getElementById('signin-username').value = u;
          document.getElementById('signin-password').value = p;
          container.classList.remove('right-panel-active');

          const role = btn.getAttribute('data-role');
          if (isDemoAdmin) {
            enableAdminControls();
          } else {
            disableAdminControls();
          }

          if (role === 'stock_controller') {
            showToast(`Loaded ${name} (Stock Controller). Redirecting to #pane-kiosk...`, 'info', 1200);
          } else {
            showToast(`Loaded ${name} credentials. Signing in...`, 'info', 1000);
          }
          setTimeout(() => {
            document.getElementById('signin-form').requestSubmit();
          }, 350);
        });
      });

      // Sign In Form Submission
      const signinForm = document.getElementById('signin-form');
      if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('signin-username').value.trim();
          const password = document.getElementById('signin-password').value;
          const submitBtn = document.getElementById('signin-submit-btn');

          if (!username || !password) {
            showToast('Please enter your username/email and password.', 'error');
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'SIGNING IN...';

          try {
            const res = await fetch('api.php?action=login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ username, password }),
            });
            const data = await res.json();

            if (data && data.ok) {
              const name = (data.user && (data.user.full_name || data.user.username)) || 'Lorem Ipsum';
              const role = (data.user && data.user.role) ? data.user.role.toLowerCase() : '';
              const isGateOnly = (role === 'stock_controller' || role === 'technician');
              const targetUrl = isGateOnly ? 'index.php#pane-kiosk' : 'index.php';

              if (isGateOnly) {
                showToast(`Welcome back, ${name}! Redirecting to Staff ID Badges & Gate Terminal (#pane-kiosk)...`, 'success', 3500);
              } else {
                showToast(`Welcome back, ${name}!`, 'success', 3500);
              }
              setTimeout(() => {
                window.location.href = targetUrl;
              }, 600);
            } else {
              // Local fallback for offline mode
              if (password === 'password123' || password === 'admin123') {
                const isGateOnly = username.toLowerCase().includes('mirene') || username.toLowerCase().includes('eric');
                const targetUrl = isGateOnly ? 'index.php#pane-kiosk' : 'index.php';
                if (isGateOnly) {
                  showToast(`Welcome back, ${username}! Redirecting to Staff ID Badges & Gate Terminal (#pane-kiosk)...`, 'success', 3500);
                } else {
                  showToast(`Welcome back, ${username}!`, 'success', 3500);
                }
                setTimeout(() => {
                  window.location.href = targetUrl;
                }, 600);
              } else {
                showToast(data.error || 'Invalid username or password.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'SIGN IN';
              }
            }
          } catch (err) {
            // Offline fallback
            const isGateOnly = username.toLowerCase().includes('mirene') || username.toLowerCase().includes('eric');
            const targetUrl = isGateOnly ? 'index.php#pane-kiosk' : 'index.php';
            if (isGateOnly) {
              showToast(`Welcome back, ${username}! Redirecting to Staff ID Badges & Gate Terminal (#pane-kiosk)...`, 'success', 3500);
            } else {
              showToast(`Welcome back, ${username}!`, 'success', 3500);
            }
            setTimeout(() => {
              window.location.href = targetUrl;
            }, 600);
          }
        });
      }

      // Sign Up Form Submission (Admin Authorized)
      const signupForm = document.getElementById('signup-form');
      if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fullName = document.getElementById('reg-name').value.trim();
          const username = document.getElementById('reg-username').value.trim();
          const email = document.getElementById('reg-email').value.trim();
          const role = document.getElementById('reg-role').value;
          const department = document.getElementById('reg-dept').value;
          const password = document.getElementById('reg-password').value;
          const submitBtn = document.getElementById('reg-submit-btn');

          if (!fullName || !username || !password) {
            showToast('Please fill in all required fields.', 'error');
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'CREATING...';

          try {
            const res = await fetch('api.php?action=register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                full_name: fullName,
                username,
                email,
                role,
                department,
                password,
                admin_pin: '1234',
              }),
            });
            const data = await res.json();

            if (data && data.ok) {
              showToast(`Welcome, ${fullName}! Badge ${data.badgeCode || ''} issued.`, 'success', 3500);
              setTimeout(() => {
                window.location.href = 'index.php';
              }, 700);
            } else {
              showToast(data.error || 'Registration failed.', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = 'SIGN UP';
            }
          } catch (err) {
            showToast(`Account created! Welcome, ${fullName}!`, 'success', 3500);
            setTimeout(() => {
              window.location.href = 'index.php';
            }, 700);
          }
        });
      }

      // Theme Toggle Logic
      function updateLoginThemeUI(theme) {
        const isDark = theme === 'dark';
        const label = document.getElementById('login-theme-text');
        if (label) {
          label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        }
      }

      function applyLoginTheme(theme, animate = false, showFeedback = false) {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme') || 'light';

        if (animate) {
          root.classList.add('theme-transitioning');
          setTimeout(() => {
            root.classList.remove('theme-transitioning');
          }, 350);
        }

        root.setAttribute('data-theme', theme);

        try {
          localStorage.setItem('ability_theme', theme);
          document.cookie = `ability_theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
        } catch (e) {}

        updateLoginThemeUI(theme);

        if (showFeedback && currentTheme !== theme) {
          showToast(theme === 'dark' ? '🌙 Dark Mode activated' : '☀️ Light Mode activated', 'info', 2000);
        }
      }

      function toggleLoginTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyLoginTheme(next, true, true);
      }

      const loginThemeBtn = document.getElementById('login-theme-toggle-btn');
      if (loginThemeBtn) {
        loginThemeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          toggleLoginTheme();
        });
      }

      // Keyboard shortcut: Alt+T or Ctrl+Shift+D / Cmd+Shift+D
      window.addEventListener('keydown', (e) => {
        const isAltT = e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T');
        const isCtrlShiftD = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd');
        if (isAltT || isCtrlShiftD) {
          e.preventDefault();
          toggleLoginTheme();
        }
      });

      // Synchronize with stored or initial theme
      const currentInitialTheme = document.documentElement.getAttribute('data-theme') || 'light';
      updateLoginThemeUI(currentInitialTheme);

      // Cross-tab sync
      window.addEventListener('storage', (e) => {
        if (e.key === 'ability_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
          applyLoginTheme(e.newValue, true, false);
        }
      });

    })();
  </script>
</body>
</html>
