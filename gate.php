<?php
/**
 * Rwanda Events — Standalone Facility Gate Terminal
 * Reusable location-locked kiosk terminal UI shared by:
 *   - ndera-gate.php    (Ndera Warehouse Gate)
 *   - bk-arena-gate.php (BK Arena Gate)
 *   - kcc-gate.php      (KCC Gate)
 * Protected per-location via `stock_locations.terminal_pin`.
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$siteKey = trim((string) ($standaloneGateKey ?? $_GET['site'] ?? ''));
$whIdParam = (int) ($standaloneGateWhId ?? $_GET['wh_id'] ?? 0);
if ($siteKey === '' && $whIdParam <= 0) {
    $siteKey = 'kcc';
}

$whRow = null;
$portalCfg = null;
$isAuthorized = false;
$activeDb = '';
$dbError = '';
$brandingHtml = '';
$defaultBrandingTheme = null;

try {
    require_once __DIR__ . '/db.php';
    $pdo = getDbConnection($activeDb);
    $brandingHtml = renderBrandingHeadHtml($pdo);
    $bCfg = getBrandingConfig($pdo);
    if (!empty($bCfg['default_theme']) && in_array($bCfg['default_theme'], ['dark', 'light'], true)) {
        $defaultBrandingTheme = $bCfg['default_theme'];
    }
    $whRow = resolveStandaloneFacilityGate($pdo, $siteKey, $whIdParam);
    if ($whRow) {
        $isAuthorized = isStandaloneGateAuthorized($pdo, $whRow);
    }
    $portalCfg = resolveStandalonePortalConfig($pdo, $siteKey, $whRow ? (int) $whRow['id'] : $whIdParam);
} catch (Throwable $e) {
    $dbError = 'Unable to connect to the attendance database.';
}

$gateTitleMap = [
    'ndera'    => 'Ndera Warehouse Gate',
    'bk-arena' => 'BK Arena Gate',
    'kcc'      => 'KCC Gate',
];

$normalizedKey = strtolower($siteKey);
if ($whRow) {
    $whCode = strtoupper(trim((string) ($whRow['code'] ?? '')));
    if ($whCode === 'NDR-STK' || stripos((string) $whRow['name'], 'ndera') !== false) {
        $normalizedKey = 'ndera';
    } elseif ($whCode === 'BKA-STK' || stripos((string) $whRow['name'], 'bk arena') !== false) {
        $normalizedKey = 'bk-arena';
    } elseif ($whCode === 'KCC-STK' || stripos((string) $whRow['name'], 'kcc') !== false) {
        $normalizedKey = 'kcc';
    }
}

$rawWhName = $whRow ? trim((string) ($whRow['name'] ?? 'Facility')) : '';
$fallbackGateLabel = $rawWhName !== ''
    ? (preg_match('/gate$/i', $rawWhName) ? $rawWhName : ($rawWhName . ' Gate'))
    : 'Facility Gate';
$customPortalTitle = $portalCfg ? trim((string) ($portalCfg['title'] ?? '')) : '';
$gateDisplayLabel = $customPortalTitle !== '' ? $customPortalTitle : ($gateTitleMap[$normalizedKey] ?? $fallbackGateLabel);
$gateHashtagLabel = '# ' . $gateDisplayLabel;
$portalBgUrl = $portalCfg ? ($portalCfg['background_image_url'] ?? null) : null;
$portalOverlayOpacity = $portalCfg ? max(0.15, min(0.95, (float) ($portalCfg['overlay_opacity'] ?? 0.78))) : 0.78;
$portalPaused = $portalCfg ? ((int) ($portalCfg['is_active'] ?? 1) === 0) : false;
$portalExpired = ($portalCfg && !empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time());
$portalBestFor = $portalCfg ? trim((string) ($portalCfg['best_for'] ?? '')) : '';
$portalPermsSummary = $portalCfg ? trim((string) ($portalCfg['permissions_summary'] ?? '')) : '';
$portalAllowScan = $portalCfg ? ((int) ($portalCfg['allow_scan'] ?? 1) === 1) : true;
$gateIdResolved = $whRow ? (int) $whRow['id'] : $whIdParam;
$gateCodeResolved = $whRow ? (string) ($whRow['code'] ?? 'STK') : '';
$gateLocationResolved = $whRow ? (string) ($whRow['location'] ?? 'Kigali') : '';
$gateHoursResolved = $whRow
    ? (substr((string) ($whRow['open_time'] ?? '08:00:00'), 0, 5) . ' – ' . substr((string) ($whRow['close_time'] ?? '18:00:00'), 0, 5))
    : '08:00 – 18:00';
$gatePinConfigured = $whRow ? (resolveWarehouseTerminalPin($whRow) !== '') : false;

$initialTheme = $defaultBrandingTheme ?: 'light';
if (!empty($_COOKIE['ability_theme']) && in_array($_COOKIE['ability_theme'], ['dark', 'light'], true)) {
    $initialTheme = $_COOKIE['ability_theme'];
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="<?php echo htmlspecialchars($initialTheme, ENT_QUOTES, 'UTF-8'); ?>">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="csrf-token" content="<?php echo htmlspecialchars((string) $_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8'); ?>" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="aBility Gate" />
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon-180.png" />
  <link rel="icon" type="image/png" href="assets/icons/favicon-64.png" />
  <?php echo $brandingHtml . "\n"; ?>
  <title>Rwanda Events Gate Terminal · <?php echo htmlspecialchars($gateDisplayLabel, ENT_QUOTES, 'UTF-8'); ?></title>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('ability_theme');
        var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })();
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-canvas: #f4f5f8;
      --bg-surface: #ffffff;
      --bg-subtle: #f8fafc;
      --bg-input: #ffffff;
      --border-color: #dbe2ec;
      --border-strong: #94a3b8;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --brand-primary: #134c80;
      --brand-accent: #4f46e5;
      --brand-hover: #4338ca;
      --card-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
      --green-bg: #dcfce7;
      --green-text: #15803d;
      --green-border: #86efac;
      --red-bg: #fee2e2;
      --red-text: #b91c1c;
      --red-border: #fca5a5;
      --amber-bg: #fef3c7;
      --amber-text: #b45309;
      --amber-border: #fcd34d;
      --blue-bg: #dbeafe;
      --blue-text: #1d4ed8;
      --purple-bg: #ede9fe;
      --purple-text: #6d28d9;
    }

    [data-theme="dark"] {
      --bg-canvas: #090d16;
      --bg-surface: #121826;
      --bg-subtle: #182032;
      --bg-input: #141c2c;
      --border-color: #263147;
      --border-strong: #475569;
      --text-primary: #f1f5f9;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --brand-primary: #38bdf8;
      --brand-accent: #6366f1;
      --brand-hover: #4f46e5;
      --card-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
      --green-bg: rgba(22, 163, 74, 0.22);
      --green-text: #4ade80;
      --green-border: rgba(74, 222, 128, 0.35);
      --red-bg: rgba(220, 38, 38, 0.22);
      --red-text: #fca5a5;
      --red-border: rgba(248, 113, 113, 0.35);
      --amber-bg: rgba(217, 119, 6, 0.22);
      --amber-text: #fbbf24;
      --amber-border: rgba(251, 191, 36, 0.35);
      --blue-bg: rgba(37, 99, 235, 0.22);
      --blue-text: #93c5fd;
      --purple-bg: rgba(139, 92, 246, 0.22);
      --purple-text: #c4b5fd;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg-canvas);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.45;
      position: relative;
    }

    .portal-custom-bg {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      overflow: hidden;
    }
    .portal-custom-bg-img {
      position: absolute;
      inset: -12px;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    .portal-custom-bg-scrim {
      position: absolute;
      inset: 0;
      background: var(--bg-canvas);
    }

    /* Top Minimal Bar */
    .utility-bar {
      max-width: 960px;
      margin: 0 auto;
      padding: 14px 18px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    .gate-locked-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-secondary);
    }
    .utility-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--green-bg);
      color: var(--green-text);
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      animation: pulseDot 1.8s infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.45; transform: scale(0.8); }
    }
    .btn-chip {
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-primary);
      border-radius: 8px;
      padding: 6px 11px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-chip:hover {
      border-color: var(--brand-accent);
    }

    /* Wireframe Centered Header */
    .hero-header {
      text-align: center;
      padding: 28px 18px 20px;
      max-width: 960px;
      margin: 0 auto;
    }
    .hero-title {
      font-size: clamp(24px, 3.6vw, 34px);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }
    .hero-subtitle {
      margin-top: 6px;
      font-size: clamp(17px, 2.2vw, 22px);
      font-weight: 700;
      color: var(--brand-accent);
      letter-spacing: -0.01em;
    }
    .hero-meta {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
      font-size: 12px;
      color: var(--text-secondary);
    }
    .meta-tag {
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      font-weight: 600;
    }

    /* PIN Lock Screen */
    .lock-wrap {
      max-width: 440px;
      margin: 12px auto 48px;
      padding: 0 18px;
    }
    .lock-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 18px;
      box-shadow: var(--card-shadow);
      padding: 30px 26px;
      text-align: center;
    }
    .lock-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--purple-bg);
      color: var(--purple-text);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 14px;
    }
    .lock-title {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .lock-desc {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }
    .pin-group {
      position: relative;
      margin-bottom: 14px;
    }
    .pin-input {
      width: 100%;
      padding: 13px 44px 13px 16px;
      border-radius: 12px;
      border: 1.5px solid var(--border-color);
      background: var(--bg-subtle);
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 3px;
      text-align: center;
      outline: none;
    }
    .pin-input:focus {
      border-color: var(--brand-accent);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.16);
    }
    .pin-eye {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
    }
    .btn-primary-full {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      border: none;
      background: var(--brand-accent);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-primary-full:hover { background: var(--brand-hover); }
    .btn-primary-full:disabled { opacity: 0.6; cursor: not-allowed; }
    .lock-error {
      margin-top: 12px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--red-text);
      min-height: 18px;
    }
    .lock-footer {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted);
    }
    .lock-footer a {
      color: var(--brand-accent);
      text-decoration: none;
      font-weight: 600;
    }

    /* Main Terminal Container */
    .terminal-shell {
      max-width: 960px;
      margin: 0 auto 48px;
      padding: 0 18px;
    }

    /* Wireframe Hero Wide Auto-Search Pill Bar */
    .auto-search-wrap {
      max-width: 780px;
      margin: 4px auto 18px;
    }
    .auto-search-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-input);
      border: 2px solid var(--border-color);
      border-radius: 999px;
      padding: 7px 10px 7px 20px;
      box-shadow: var(--card-shadow);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .auto-search-pill:focus-within {
      border-color: var(--brand-accent);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.14);
    }
    .search-icon {
      font-size: 16px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .auto-search-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--text-primary);
      font-size: 15px;
      font-weight: 500;
      outline: none;
      padding: 6px 0;
    }
    .auto-search-input::placeholder {
      color: var(--text-muted);
    }
    .btn-clear-search {
      border: none;
      background: var(--bg-subtle);
      color: var(--text-secondary);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .btn-clear-search.visible { display: inline-flex; }
    .auto-search-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--purple-bg);
      color: var(--purple-text);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .search-helper-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 18px 0;
      font-size: 12px;
      color: var(--text-muted);
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Verification Feedback Banner */
    .scan-feedback {
      max-width: 780px;
      margin: 0 auto 18px;
      border-radius: 14px;
      padding: 14px 18px;
      border: 1.5px solid var(--border-color);
      background: var(--bg-surface);
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      box-shadow: var(--card-shadow);
    }
    .scan-feedback.visible { display: flex; }
    .scan-feedback.status-granted {
      background: var(--green-bg);
      border-color: var(--green-border);
      color: var(--green-text);
    }
    .scan-feedback.status-denied,
    .scan-feedback.status-error {
      background: var(--red-bg);
      border-color: var(--red-border);
      color: var(--red-text);
    }
    .scan-feedback.status-info {
      background: var(--amber-bg);
      border-color: var(--amber-border);
      color: var(--amber-text);
    }
    .fb-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .fb-badge {
      font-size: 12px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      color: inherit;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    [data-theme="dark"] .fb-badge { background: rgba(15, 23, 42, 0.55); }
    .fb-title { font-size: 14px; font-weight: 800; }
    .fb-sub { font-size: 12.5px; opacity: 0.92; margin-top: 2px; }

    /* KPI + Filter Toolbar */
    .roster-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
    }
    .roster-toolbar {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-pills {
      display: inline-flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .filter-pill {
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-secondary);
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-pill.active {
      background: var(--brand-accent);
      border-color: var(--brand-accent);
      color: #ffffff;
    }
    .stats-strip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .stat-chip {
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
    }

    /* 5-Per-Page Crew List */
    .crew-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-color);
      transition: background 0.12s;
    }
    .crew-row:last-child { border-bottom: none; }
    .crew-row:hover { background: var(--bg-subtle); }

    .crew-identity {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }
    .crew-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--brand-accent);
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .crew-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .crew-text { min-width: 0; }
    .crew-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .crew-name {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .tier-badge {
      font-size: 10.5px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 6px;
      color: #ffffff;
    }
    .state-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .state-onsite { background: var(--green-bg); color: var(--green-text); }
    .state-elsewhere { background: var(--blue-bg); color: var(--blue-text); }
    .state-out { background: var(--amber-bg); color: var(--amber-text); }
    .state-ready { background: var(--bg-subtle); color: var(--text-muted); border: 1px solid var(--border-color); }
    .state-denied { background: var(--red-bg); color: var(--red-text); }

    .crew-meta {
      margin-top: 3px;
      font-size: 12px;
      color: var(--text-secondary);
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .badge-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: var(--text-primary);
    }

    .crew-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .btn-gate {
      border: 1px solid transparent;
      border-radius: 9px;
      padding: 7px 13px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.08s, opacity 0.15s;
      white-space: nowrap;
    }
    .btn-gate:active { transform: scale(0.98); }
    .btn-gate:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-checkin {
      background: #16a34a;
      color: #ffffff;
    }
    .btn-checkin:hover { background: #15803d; }
    .btn-checkout {
      background: #d97706;
      color: #ffffff;
    }
    .btn-checkout:hover { background: #b45309; }
    .btn-verify {
      background: var(--bg-subtle);
      border-color: var(--border-color);
      color: var(--text-secondary);
    }
    .btn-verify:hover {
      border-color: var(--brand-accent);
      color: var(--brand-accent);
    }
    .btn-restricted {
      background: var(--red-bg);
      border-color: var(--red-border);
      color: var(--red-text);
    }

    /* Pagination Footer — Strictly 5 Items Per Page */
    .pagination-bar {
      padding: 13px 18px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .page-info {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .page-controls {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .page-btn {
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-primary);
      border-radius: 8px;
      min-width: 34px;
      height: 32px;
      padding: 0 10px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
    }
    .page-btn.active {
      background: var(--brand-accent);
      border-color: var(--brand-accent);
      color: #ffffff;
    }
    .page-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    /* Recent Gate Activity Strip */
    .recent-panel {
      margin-top: 18px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 14px 18px;
    }
    .recent-title {
      font-size: 12.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    .recent-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 8px;
    }
    .recent-item {
      padding: 8px 11px;
      border-radius: 10px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .empty-state {
      padding: 36px 18px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13.5px;
    }

    @media (max-width: 680px) {
      .crew-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .crew-actions {
        width: 100%;
        justify-content: flex-end;
      }
      .auto-search-tag { display: none; }
    }
  </style>
</head>
<body>
  <?php if (!empty($portalBgUrl)): ?>
  <div class="portal-custom-bg" aria-hidden="true">
    <div class="portal-custom-bg-img" style="background-image: url('<?php echo htmlspecialchars((string) $portalBgUrl, ENT_QUOTES, 'UTF-8'); ?>');"></div>
    <div class="portal-custom-bg-scrim" style="opacity: <?php echo htmlspecialchars(number_format((float) $portalOverlayOpacity, 2, '.', ''), ENT_QUOTES, 'UTF-8'); ?>;"></div>
  </div>
  <?php endif; ?>

  <!-- Top Utility Bar -->
  <div class="utility-bar">
    <span class="gate-locked-pill">Location Locked · <?php echo htmlspecialchars($gateDisplayLabel, ENT_QUOTES, 'UTF-8'); ?></span>
    <div class="utility-actions">
      <span class="live-pill" id="gate-live-pill" style="<?php echo $isAuthorized ? '' : 'display:none;'; ?>">
        <span class="live-dot"></span>
        <span id="gate-sync-label">Live</span>
      </span>
      <button type="button" class="btn-chip" id="gate-refresh-btn" style="<?php echo $isAuthorized ? '' : 'display:none;'; ?>">↻ Refresh</button>
      <button type="button" class="btn-chip" id="gate-theme-btn">◐ Theme</button>
      <button type="button" class="btn-chip" id="gate-lock-btn" style="<?php echo $isAuthorized ? '' : 'display:none;'; ?>">🔒 Lock Gate</button>
    </div>
  </div>

  <!-- Centered Wireframe Header -->
  <header class="hero-header">
    <div style="display:inline-flex;align-items:center;justify-content:center;gap:10px;margin-bottom:4px;">
      <img class="js-brand-logo-img" data-brand-logo="1" src="assets/rwanda-events-logo.png" alt="aBility" style="width:32px;height:32px;border-radius:8px;object-fit:contain;" />
      <h1 class="hero-title" style="margin:0;">Rwanda Events Gate Terminal</h1>
    </div>
    <div class="hero-subtitle" id="gate-hashtag-subtitle"><?php echo htmlspecialchars($gateHashtagLabel, ENT_QUOTES, 'UTF-8'); ?></div>
    <div class="hero-meta">
      <span class="meta-tag"><?php echo htmlspecialchars($gateCodeResolved !== '' ? $gateCodeResolved : 'GATE', ENT_QUOTES, 'UTF-8'); ?> · <?php echo htmlspecialchars($gateLocationResolved !== '' ? $gateLocationResolved : 'Kigali', ENT_QUOTES, 'UTF-8'); ?></span>
      <span class="meta-tag">Hours: <?php echo htmlspecialchars($gateHoursResolved, ENT_QUOTES, 'UTF-8'); ?></span>
      <?php if ($portalBestFor !== ''): ?>
      <span class="meta-tag" title="Best For"><?php echo htmlspecialchars('Best For: ' . $portalBestFor, ENT_QUOTES, 'UTF-8'); ?></span>
      <?php endif; ?>
      <?php if ($portalPermsSummary !== ''): ?>
      <span class="meta-tag" title="Permissions &amp; Limitations"><?php echo htmlspecialchars($portalPermsSummary, ENT_QUOTES, 'UTF-8'); ?></span>
      <?php endif; ?>
      <?php if (!$portalAllowScan): ?>
      <span class="meta-tag" style="border-color:rgba(245,158,11,0.5);color:#f59e0b;">Read-Only Mode</span>
      <?php endif; ?>
    </div>
  </header>

  <?php if (!$whRow || $dbError !== '' || !empty($portalPaused) || !empty($portalExpired)): ?>
    <div class="lock-wrap">
      <div class="lock-card">
        <div class="lock-badge"><?php echo !empty($portalExpired) ? 'Link Expired' : 'Gate Unavailable'; ?></div>
        <h2 class="lock-title"><?php echo !empty($portalExpired) ? 'Gate Link Expired' : (!empty($portalPaused) ? 'Gate Terminal Paused' : 'Facility Gate Not Found'); ?></h2>
        <p class="lock-desc"><?php echo htmlspecialchars(!empty($portalExpired) ? ('This standalone gate link expired on ' . ($portalCfg['expires_at'] ?? '') . '. Contact an Administrator to extend it.') : (!empty($portalPaused) ? 'This standalone gate terminal has been temporarily paused by an Administrator.' : ($dbError !== '' ? $dbError : 'This facility gate location is missing or marked inactive.')), ENT_QUOTES, 'UTF-8'); ?></p>
        <div class="lock-footer">
          <span>Standalone Gate Terminal</span>
          <a href="index.html">Main Dashboard →</a>
        </div>
      </div>
    </div>
  <?php else: ?>

  <!-- PIN UNLOCK SCREEN (Strict Location Isolation) -->
  <div id="gate-lock-view" class="lock-wrap" style="display: <?php echo $isAuthorized ? 'none' : 'block'; ?>;">
    <div class="lock-card">
      <div class="lock-badge">Location PIN Required</div>
      <h2 class="lock-title">Unlock <?php echo htmlspecialchars($gateDisplayLabel, ENT_QUOTES, 'UTF-8'); ?></h2>
      <p class="lock-desc">
        Enter the dedicated Station Lock PIN for <strong><?php echo htmlspecialchars((string) $whRow['name'], ENT_QUOTES, 'UTF-8'); ?></strong> to activate gate scanning.
      </p>

      <?php if (!$gatePinConfigured): ?>
        <div class="lock-error" style="min-height:auto; margin-bottom:14px;">No Terminal PIN is configured for this facility yet. Ask an Administrator to set it under Warehouses → Station Lock.</div>
      <?php else: ?>
        <form id="gate-unlock-form" autocomplete="off">
          <div class="pin-group">
            <input
              type="password"
              id="gate-pin-input"
              class="pin-input"
              inputmode="numeric"
              placeholder="Enter Gate PIN"
              autocomplete="one-time-code"
              required
            />
            <button type="button" class="pin-eye" id="gate-pin-eye" title="Show/Hide PIN" aria-label="Show PIN">👁</button>
          </div>
          <button type="submit" class="btn-primary-full" id="gate-unlock-submit">Unlock <?php echo htmlspecialchars($gateDisplayLabel, ENT_QUOTES, 'UTF-8'); ?></button>
          <div class="lock-error" id="gate-unlock-error" role="alert"></div>
        </form>
      <?php endif; ?>

      <div class="lock-footer">
        <span>Standalone Terminal</span>
        <a href="index.html">Main Dashboard →</a>
      </div>
    </div>
  </div>

  <!-- ACTIVE STANDALONE TERMINAL -->
  <main id="gate-terminal-view" class="terminal-shell" style="display: <?php echo $isAuthorized ? 'block' : 'none'; ?>;">
    <!-- Wide Pill Auto Search -->
    <div class="auto-search-wrap">
      <div class="auto-search-pill">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input
          type="text"
          id="gate-auto-search"
          class="auto-search-input"
          placeholder="Auto Search by name, badge (REW-BADGE-0006), RFID, department, or phone..."
          autocomplete="off"
          aria-label="Auto Search Crew and Badges"
        />
        <button type="button" id="gate-clear-search" class="btn-clear-search" title="Clear search" aria-label="Clear search">×</button>
        <span class="auto-search-tag">Auto Search · Enter to Scan</span>
      </div>
      <div class="search-helper-row">
        <span id="gate-search-hint">Typing filters instantly. Hardware RFID/Barcode readers or pressing <strong>Enter</strong> triggers Check In / Check Out.</span>
        <span><strong>5 items per page</strong></span>
      </div>
    </div>

    <!-- Verification Banner -->
    <div id="gate-scan-feedback" class="scan-feedback" role="status" aria-live="polite">
      <div class="fb-main">
        <span class="fb-badge" id="fb-status-pill">VERIFIED</span>
        <div>
          <div class="fb-title" id="fb-title">Ready</div>
          <div class="fb-sub" id="fb-sub"></div>
        </div>
      </div>
      <button type="button" class="btn-chip" id="fb-dismiss-btn">Dismiss</button>
    </div>

    <!-- Roster Panel (5 Items Per Page) -->
    <section class="roster-panel">
      <div class="roster-toolbar">
        <div class="filter-pills" id="gate-filter-pills">
          <button type="button" class="filter-pill active" data-filter="all">All Crew (<span id="cnt-all">0</span>)</button>
          <button type="button" class="filter-pill" data-filter="onsite_here">On-Site Here (<span id="cnt-here">0</span>)</button>
          <button type="button" class="filter-pill" data-filter="authorized">Authorized (<span id="cnt-auth">0</span>)</button>
        </div>

        <div class="stats-strip">
          <span class="stat-chip">On-Site Now: <strong id="kpi-onsite-now">0</strong></span>
          <span class="stat-chip">Checked In Today: <strong id="kpi-checked-today">0</strong></span>
          <span class="stat-chip">Denied Today: <strong id="kpi-denied-today">0</strong></span>
        </div>
      </div>

      <div id="gate-crew-list" class="crew-list">
        <div class="empty-state">Loading crew directory for <?php echo htmlspecialchars($gateDisplayLabel, ENT_QUOTES, 'UTF-8'); ?>...</div>
      </div>

      <div class="pagination-bar">
        <div class="page-info" id="gate-page-info">Showing 0 of 0 (5 items per page)</div>
        <div class="page-controls" id="gate-page-controls"></div>
      </div>
    </section>

    <!-- Recent Scans Strictly For This Gate -->
    <section class="recent-panel">
      <div class="recent-title">Recent Gate Scans · <?php echo htmlspecialchars($gateDisplayLabel, ENT_QUOTES, 'UTF-8'); ?></div>
      <div class="recent-list" id="gate-recent-list">
        <div style="font-size:12px; color:var(--text-muted);">No scans logged at this gate today.</div>
      </div>
    </section>
  </main>

  <script>
    (function () {
      const SITE_KEY = <?php echo json_encode($normalizedKey); ?>;
      const WH_ID = <?php echo json_encode($gateIdResolved); ?>;
      const GATE_LABEL = <?php echo json_encode($gateDisplayLabel); ?>;
      const PAGE_SIZE = 5;

      let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      let isAuthorized = <?php echo $isAuthorized ? 'true' : 'false'; ?>;
      let allCrew = [];
      let recentLogs = [];
      let gateMeta = {};
      let activeFilter = 'all';
      let currentPage = 1;
      let scanBusy = false;
      let pollTimer = null;

      // Offline-First IndexedDB Cache & Queued Scan Sync (`ability_offline_v1`)
      const AbilityGateOffline = (() => {
        const DB_NAME = 'ability_offline_v1';
        const DB_VER = 1;
        function openDb() {
          return new Promise((resolve, reject) => {
            if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
            const req = window.indexedDB.open(DB_NAME, DB_VER);
            req.onupgradeneeded = (ev) => {
              const db = ev.target.result;
              if (!db.objectStoreNames.contains('rosters')) {
                db.createObjectStore('rosters', { keyPath: 'key' });
              }
              if (!db.objectStoreNames.contains('scan_queue')) {
                db.createObjectStore('scan_queue', { keyPath: 'id', autoIncrement: true });
              }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
        }
        async function saveRoster(crewList) {
          try {
            const db = await openDb();
            const sanitized = (crewList || []).map((c) => ({
              id: c.id,
              full_name: c.full_name,
              badge_code: c.badge_code,
              rfid_uid: c.rfid_uid,
              role_display: c.role_display,
              department: c.department,
              clearance_code: c.clearance_code,
              clearance_color: c.clearance_color,
              badge_status: c.badge_status,
              stock_authorized: !!c.stock_authorized,
              checkpoint_authorized: !!c.checkpoint_authorized,
              checkpoint_auth_reason: c.checkpoint_auth_reason || '',
              daily_state: c.daily_state || 'ready',
              check_in_time: c.check_in_time || null,
              check_out_time: c.check_out_time || null,
              last_checkpoint_type: c.last_checkpoint_type || null,
              last_checkpoint_id: c.last_checkpoint_id || null,
              initials: c.initials || 'U'
            }));
            const tx = db.transaction('rosters', 'readwrite');
            tx.objectStore('rosters').put({ key: 'gate_' + WH_ID, crew: sanitized, updated_at: new Date().toISOString() });
          } catch (_) {}
        }
        async function getRoster() {
          try {
            const db = await openDb();
            return await new Promise((resolve) => {
              const req = db.transaction('rosters', 'readonly').objectStore('rosters').get('gate_' + WH_ID);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
          } catch (_) { return null; }
        }
        async function clearRoster() {
          try {
            const db = await openDb();
            const tx = db.transaction('rosters', 'readwrite');
            tx.objectStore('rosters').delete('gate_' + WH_ID);
          } catch (_) {}
        }
        async function queueScan(payload) {
          try {
            const db = await openDb();
            return await new Promise((resolve) => {
              const tx = db.transaction('scan_queue', 'readwrite');
              const req = tx.objectStore('scan_queue').add({
                site_key: SITE_KEY,
                wh_id: WH_ID,
                payload,
                offline_scanned_at: new Date().toISOString()
              });
              req.onsuccess = () => resolve(true);
              req.onerror = () => resolve(false);
            });
          } catch (_) { return false; }
        }
        async function listQueued() {
          try {
            const db = await openDb();
            return await new Promise((resolve) => {
              const req = db.transaction('scan_queue', 'readonly').objectStore('scan_queue').getAll();
              req.onsuccess = () => resolve(req.result || []);
              req.onerror = () => resolve([]);
            });
          } catch (_) { return []; }
        }
        async function removeQueued(id) {
          try {
            const db = await openDb();
            db.transaction('scan_queue', 'readwrite').objectStore('scan_queue').delete(id);
          } catch (_) {}
        }
        return { saveRoster, getRoster, clearRoster, queueScan, listQueued, removeQueued };
      })();

      const lockView = document.getElementById('gate-lock-view');
      const termView = document.getElementById('gate-terminal-view');
      const livePill = document.getElementById('gate-live-pill');
      const syncLabel = document.getElementById('gate-sync-label');
      const refreshBtn = document.getElementById('gate-refresh-btn');
      const lockBtn = document.getElementById('gate-lock-btn');
      const themeBtn = document.getElementById('gate-theme-btn');

      const unlockForm = document.getElementById('gate-unlock-form');
      const pinInput = document.getElementById('gate-pin-input');
      const pinEye = document.getElementById('gate-pin-eye');
      const unlockSubmit = document.getElementById('gate-unlock-submit');
      const unlockError = document.getElementById('gate-unlock-error');

      const searchInput = document.getElementById('gate-auto-search');
      const clearSearchBtn = document.getElementById('gate-clear-search');
      const feedbackBox = document.getElementById('gate-scan-feedback');
      const fbPill = document.getElementById('fb-status-pill');
      const fbTitle = document.getElementById('fb-title');
      const fbSub = document.getElementById('fb-sub');
      const fbDismiss = document.getElementById('fb-dismiss-btn');

      const crewListEl = document.getElementById('gate-crew-list');
      const pageInfoEl = document.getElementById('gate-page-info');
      const pageCtrlsEl = document.getElementById('gate-page-controls');
      const recentListEl = document.getElementById('gate-recent-list');

      function escapeHtml(val) {
        return String(val == null ? '' : val)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function playTone(kind) {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = kind === 'ok' ? 'sine' : 'triangle';
          osc.frequency.value = kind === 'ok' ? 880 : 240;
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.17);
        } catch (e) {}
      }

      function setTerminalUnlocked(unlocked) {
        isAuthorized = unlocked;
        if (lockView) lockView.style.display = unlocked ? 'none' : 'block';
        if (termView) termView.style.display = unlocked ? 'block' : 'none';
        if (livePill) livePill.style.display = unlocked ? 'inline-flex' : 'none';
        if (refreshBtn) refreshBtn.style.display = unlocked ? 'inline-flex' : 'none';
        if (lockBtn) lockBtn.style.display = unlocked ? 'inline-flex' : 'none';
        if (unlocked && searchInput) {
          setTimeout(() => searchInput.focus(), 60);
        }
      }

      function showFeedback(type, badgeText, title, subtitle) {
        if (!feedbackBox) return;
        feedbackBox.className = 'scan-feedback visible status-' + type;
        fbPill.textContent = badgeText;
        fbTitle.textContent = title;
        fbSub.textContent = subtitle || '';
      }

      if (fbDismiss) {
        fbDismiss.addEventListener('click', () => {
          feedbackBox.classList.remove('visible');
        });
      }

      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
          const next = cur === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          try {
            localStorage.setItem('ability_theme', next);
            document.cookie = 'ability_theme=' + next + '; path=/; max-age=31536000';
          } catch (e) {}
        });
      }

      if (pinEye && pinInput) {
        pinEye.addEventListener('click', () => {
          const isPwd = pinInput.type === 'password';
          pinInput.type = isPwd ? 'text' : 'password';
          pinInput.focus();
        });
      }

      async function apiPost(action, payload) {
        const res = await fetch('api.php?action=' + encodeURIComponent(action), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(Object.assign({
            site_key: SITE_KEY,
            wh_id: WH_ID,
            csrf_token: csrfToken,
          }, payload || {})),
        });
        const data = await res.json().catch(() => ({ ok: false, error: 'Invalid server response.' }));
        if (data && data.csrf_token) {
          csrfToken = data.csrf_token;
        }
        return { status: res.status, data };
      }

      if (unlockForm) {
        unlockForm.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          unlockError.textContent = '';
          const pinVal = (pinInput?.value || '').trim();
          if (!pinVal) {
            unlockError.textContent = 'Please enter the Gate Terminal PIN.';
            return;
          }
          unlockSubmit.disabled = true;
          unlockSubmit.textContent = 'Verifying PIN...';
          try {
            const { data } = await apiPost('standalone_gate_unlock', { pin: pinVal });
            if (data && data.ok && data.authorized) {
              pinInput.value = '';
              setTerminalUnlocked(true);
              await loadFeed();
            } else {
              unlockError.textContent = (data && data.error) || 'Incorrect PIN.';
              pinInput.select();
            }
          } catch (err) {
            unlockError.textContent = 'Network error verifying Gate PIN.';
          } finally {
            unlockSubmit.disabled = false;
            unlockSubmit.textContent = 'Unlock ' + GATE_LABEL;
          }
        });
      }

      if (lockBtn) {
        lockBtn.addEventListener('click', async () => {
          await AbilityGateOffline.clearRoster();
          try {
            await apiPost('standalone_gate_lock', {});
          } catch (e) {}
          allCrew = [];
          recentLogs = [];
          setTerminalUnlocked(false);
          if (pinInput) {
            setTimeout(() => pinInput.focus(), 60);
          }
        });
      }

      async function syncQueuedGateScans() {
        if (!isAuthorized || !navigator.onLine) return;
        const queued = await AbilityGateOffline.listQueued();
        if (!queued.length) return;
        let synced = 0;
        for (const item of queued) {
          if (Number(item.wh_id) !== Number(WH_ID)) continue;
          try {
            const body = Object.assign({}, item.payload || {}, { offline_scanned_at: item.offline_scanned_at });
            const { status } = await apiPost('standalone_gate_scan', body);
            if (status >= 200 && status < 500 && status !== 401) {
              await AbilityGateOffline.removeQueued(item.id);
              synced++;
            }
          } catch (_) {
            break;
          }
        }
        if (synced > 0) {
          if (syncLabel) syncLabel.textContent = `Synced ${synced} offline scan(s)`;
        }
      }

      function applyFeedData(data) {
        if (!data || !data.ok) return;
        if (data.csrf_token) csrfToken = data.csrf_token;
        gateMeta = data.gate || {};
        allCrew = Array.isArray(data.crew) ? data.crew : [];
        recentLogs = Array.isArray(data.recentLogs) ? data.recentLogs : [];

        const kpiHere = document.getElementById('kpi-onsite-now');
        const kpiToday = document.getElementById('kpi-checked-today');
        const kpiDenied = document.getElementById('kpi-denied-today');
        if (kpiHere) kpiHere.textContent = String(gateMeta.on_site_now ?? 0);
        if (kpiToday) kpiToday.textContent = String(gateMeta.checked_in_today ?? 0);
        if (kpiDenied) kpiDenied.textContent = String(gateMeta.denied_today ?? 0);

        const cntAll = document.getElementById('cnt-all');
        const cntHere = document.getElementById('cnt-here');
        const cntAuth = document.getElementById('cnt-auth');
        if (cntAll) cntAll.textContent = String(allCrew.length);
        if (cntHere) {
          cntHere.textContent = String(allCrew.filter(c => isOnSiteHere(c)).length);
        }
        if (cntAuth) {
          cntAuth.textContent = String(allCrew.filter(c => !!c.checkpoint_authorized).length);
        }

        if (syncLabel && data.generated_at) {
          syncLabel.textContent = 'Live · ' + data.generated_at;
        }
        renderList();
        renderRecentLogs();
        AbilityGateOffline.saveRoster(allCrew);
      }

      async function loadFeed() {
        if (!isAuthorized) return;
        await syncQueuedGateScans();
        try {
          const url = 'api.php?action=standalone_gate_feed&site_key=' + encodeURIComponent(SITE_KEY) + '&wh_id=' + encodeURIComponent(String(WH_ID));
          const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
          const data = await res.json().catch(() => null);
          if (res.status === 401 || (data && data.authorized === false)) {
            await AbilityGateOffline.clearRoster();
            setTerminalUnlocked(false);
            return;
          }
          if (data && data.ok) {
            applyFeedData(data);
          }
        } catch (err) {
          const cached = await AbilityGateOffline.getRoster();
          if (cached && Array.isArray(cached.crew) && cached.crew.length) {
            allCrew = cached.crew;
            renderList();
            if (syncLabel) syncLabel.textContent = 'Offline · Cached Roster';
          } else if (syncLabel) {
            syncLabel.textContent = 'Offline';
          }
        }
      }

      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadFeed());
      }

      function isOnSiteHere(member) {
        return member.daily_state === 'checked_in'
          && member.last_checkpoint_type === 'stock_warehouse'
          && Number(member.last_checkpoint_id) === Number(WH_ID);
      }

      function getFilteredCrew() {
        const q = (searchInput?.value || '').trim().toLowerCase();
        return allCrew.filter((c) => {
          if (activeFilter === 'onsite_here' && !isOnSiteHere(c)) return false;
          if (activeFilter === 'authorized' && !c.checkpoint_authorized) return false;
          if (!q) return true;
          const haystack = [
            c.full_name,
            c.username,
            c.badge_code,
            c.rfid_uid,
            c.department,
            c.role_display,
            c.phone,
            c.clearance_code,
          ].join(' ').toLowerCase();
          return haystack.includes(q);
        });
      }

      function renderStateBadge(c) {
        if (!c.checkpoint_authorized) {
          return '<span class="state-badge state-denied">Not Authorized Here</span>';
        }
        if (isOnSiteHere(c)) {
          return '<span class="state-badge state-onsite">On-Site Here · ' + escapeHtml(c.check_in_time || '') + '</span>';
        }
        if (c.daily_state === 'checked_in') {
          return '<span class="state-badge state-elsewhere">At ' + escapeHtml(c.last_checkpoint_name || 'Other Site') + '</span>';
        }
        if (c.daily_state === 'checked_out') {
          return '<span class="state-badge state-out">Checked Out' + (c.check_out_time ? ' · ' + escapeHtml(c.check_out_time) : '') + '</span>';
        }
        return '<span class="state-badge state-ready">Ready to Scan</span>';
      }

      function renderList() {
        const filtered = getFilteredCrew();
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIdx = (currentPage - 1) * PAGE_SIZE;
        const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

        if (total === 0) {
          crewListEl.innerHTML = '<div class="empty-state">No crew matched your Auto Search query. Try clearing the search box or switching filter tabs.</div>';
        } else {
          crewListEl.innerHTML = pageRows.map((c) => {
            const avatar = c.profile_image_url
              ? '<img src="' + escapeHtml(c.profile_image_url) + '" alt="" />'
              : escapeHtml(c.initials || 'CR');
            const tierBg = /^#[0-9a-fA-F]{3,6}$/.test(c.clearance_color || '') ? c.clearance_color : '#64748b';
            const onHere = isOnSiteHere(c);
            const atOtherSite = c.daily_state === 'checked_in' && !onHere;

            let primaryBtn = '';
            if (!c.checkpoint_authorized) {
              primaryBtn = '<button type="button" class="btn-gate btn-restricted js-row-scan" data-uid="' + c.id + '" data-mode="verify_only">Verify Access</button>';
            } else if (onHere) {
              primaryBtn = '<button type="button" class="btn-gate btn-checkout js-row-scan" data-uid="' + c.id + '" data-mode="check_out">Check Out</button>';
            } else if (atOtherSite) {
              primaryBtn = '<button type="button" class="btn-gate btn-checkin js-row-scan" data-uid="' + c.id + '" data-mode="check_in">Transfer In</button>';
            } else {
              primaryBtn = '<button type="button" class="btn-gate btn-checkin js-row-scan" data-uid="' + c.id + '" data-mode="check_in">Check In</button>';
            }

            const verifyBtn = c.checkpoint_authorized
              ? '<button type="button" class="btn-gate btn-verify js-row-scan" data-uid="' + c.id + '" data-mode="verify_only">Verify</button>'
              : '';

            return (
              '<div class="crew-row">' +
                '<div class="crew-identity">' +
                  '<div class="crew-avatar">' + avatar + '</div>' +
                  '<div class="crew-text">' +
                    '<div class="crew-name-row">' +
                      '<span class="crew-name">' + escapeHtml(c.full_name) + '</span>' +
                      '<span class="tier-badge" style="background:' + escapeHtml(tierBg) + ';">' + escapeHtml(c.clearance_code || 'L1') + '</span>' +
                      renderStateBadge(c) +
                    '</div>' +
                    '<div class="crew-meta">' +
                      '<span class="badge-mono">' + escapeHtml(c.badge_code || 'NO-BADGE') + '</span>' +
                      (c.rfid_uid ? '<span>RFID: <span class="badge-mono">' + escapeHtml(c.rfid_uid) + '</span></span>' : '') +
                      '<span>' + escapeHtml(c.role_display || c.role) + (c.department ? ' · ' + escapeHtml(c.department) : '') + '</span>' +
                      (c.phone ? '<span>' + escapeHtml(c.phone) + '</span>' : '') +
                    '</div>' +
                  '</div>' +
                '</div>' +
                '<div class="crew-actions">' + primaryBtn + verifyBtn + '</div>' +
              '</div>'
            );
          }).join('');
        }

        const showFrom = total === 0 ? 0 : startIdx + 1;
        const showTo = Math.min(startIdx + pageRows.length, total);
        pageInfoEl.textContent = 'Showing ' + showFrom + '–' + showTo + ' of ' + total + ' (5 items per page)';
        renderPaginationControls(totalPages);
      }

      function renderPaginationControls(totalPages) {
        if (totalPages <= 1) {
          pageCtrlsEl.innerHTML = '<button type="button" class="page-btn active" disabled>1</button>';
          return;
        }
        let html = '<button type="button" class="page-btn" data-page="' + (currentPage - 1) + '"' + (currentPage <= 1 ? ' disabled' : '') + '>← Prev</button>';
        const windowStart = Math.max(1, currentPage - 2);
        const windowEnd = Math.min(totalPages, windowStart + 4);
        for (let p = windowStart; p <= windowEnd; p++) {
          html += '<button type="button" class="page-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
        }
        html += '<button type="button" class="page-btn" data-page="' + (currentPage + 1) + '"' + (currentPage >= totalPages ? ' disabled' : '') + '>Next →</button>';
        pageCtrlsEl.innerHTML = html;
      }

      function renderRecentLogs() {
        if (!recentLogs.length) {
          recentListEl.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">No scans logged at ' + escapeHtml(GATE_LABEL) + ' today.</div>';
          return;
        }
        recentListEl.innerHTML = recentLogs.map((log) => {
          const denied = log.access_status === 'denied';
          const pillBg = denied ? 'var(--red-bg)' : 'var(--green-bg)';
          const pillColor = denied ? 'var(--red-text)' : 'var(--green-text)';
          return (
            '<div class="recent-item">' +
              '<div>' +
                '<div style="font-weight:700;">' + escapeHtml(log.full_name) + '</div>' +
                '<div style="color:var(--text-muted);">' + escapeHtml(log.action_title) + ' · ' + escapeHtml(log.badge_code) + '</div>' +
              '</div>' +
              '<span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:999px; background:' + pillBg + '; color:' + pillColor + '; white-space:nowrap;">' +
                escapeHtml(log.formatted_time || '') +
              '</span>' +
            '</div>'
          );
        }).join('');
      }

      async function performGateScan(payload, fromAutoSearchInput) {
        if (scanBusy) return;
        scanBusy = true;
        try {
          const { status, data } = await apiPost('standalone_gate_scan', payload);
          if (status === 401 || (data && data.authorized === false)) {
            setTerminalUnlocked(false);
            return;
          }
          if (!data || data.ok === false) {
            playTone('err');
            showFeedback(
              data && data.allowed === false ? 'denied' : 'error',
              data && data.allowed === false ? 'ACCESS DENIED' : 'SCAN NOTICE',
              (data && (data.badge?.full_name || data.reason || 'Unable to process scan')) || 'Unable to process scan',
              (data && (data.error || data.reason)) || ''
            );
            if (data && data.feed) applyFeedData(data.feed);
            return;
          }

          const allowed = !!data.allowed;
          playTone(allowed ? 'ok' : 'err');
          const mName = data.badge?.full_name || 'Crew Member';
          const badgeCode = data.badge?.badge_code || '';
          const actionText = data.action === 'check_out'
            ? 'Checked Out'
            : (data.action === 'access_verify' ? 'Clearance Verified' : 'Checked In');
          const statusDetail = [data.punctuality_label || '', data.reason || '', data.scanned_at ? '(' + data.scanned_at + ')' : '']
            .filter(Boolean)
            .join(' · ');
          showFeedback(
            allowed ? 'granted' : 'denied',
            allowed ? actionText.toUpperCase() : 'ACCESS DENIED',
            badgeCode ? (mName + ' · ' + badgeCode) : mName,
            statusDetail
          );

          if (data.feed) {
            applyFeedData(data.feed);
          } else {
            await loadFeed();
          }

          if (fromAutoSearchInput && searchInput) {
            searchInput.value = '';
            clearSearchBtn.classList.remove('visible');
            currentPage = 1;
            renderList();
          }
        } catch (err) {
          const saved = await AbilityGateOffline.queueScan(payload);
          if (saved) {
            playTone('ok');
            showFeedback('granted', 'QUEUED OFFLINE', 'Scan stored safely in IndexedDB', 'Will automatically replay to server once connection restores.');
            if (syncLabel) syncLabel.textContent = 'Offline · Queued';
          } else {
            playTone('err');
            showFeedback('error', 'ERROR', 'Network error recording scan', 'Check server connection and retry.');
          }
        } finally {
          scanBusy = false;
        }
      }

      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const val = searchInput.value;
          clearSearchBtn.classList.toggle('visible', val.trim().length > 0);
          currentPage = 1;
          renderList();
        });

        searchInput.addEventListener('keydown', (ev) => {
          if (ev.key !== 'Enter') return;
          ev.preventDefault();
          const raw = searchInput.value.trim();
          if (!raw) return;

          const lower = raw.toLowerCase();
          const upper = raw.toUpperCase();
          const exactMatch = allCrew.find((c) =>
            (c.badge_code || '').toUpperCase() === upper ||
            (c.rfid_uid || '').toUpperCase() === upper ||
            (c.username || '').toLowerCase() === lower
          );
          if (exactMatch) {
            performGateScan({ user_id: exactMatch.id, scan_input: exactMatch.badge_code, scan_mode: 'auto' }, true);
            return;
          }

          const filtered = getFilteredCrew();
          if (filtered.length === 1) {
            const single = filtered[0];
            performGateScan({ user_id: single.id, scan_input: single.badge_code, scan_mode: 'auto' }, true);
          } else if (filtered.length > 1) {
            showFeedback('info', 'MULTIPLE MATCHES', filtered.length + ' crew members match "' + raw + '"', 'Keep typing to narrow to 1 person, scan a badge code, or click Check In / Check Out on the list below.');
          } else {
            performGateScan({ scan_input: raw, scan_mode: 'auto' }, false);
          }
        });
      }

      if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearSearchBtn.classList.remove('visible');
          currentPage = 1;
          renderList();
          searchInput.focus();
        });
      }

      document.getElementById('gate-filter-pills')?.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.filter-pill');
        if (!btn) return;
        document.querySelectorAll('#gate-filter-pills .filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        currentPage = 1;
        renderList();
      });

      pageCtrlsEl?.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.page-btn');
        if (!btn || btn.disabled) return;
        const p = parseInt(btn.getAttribute('data-page') || '1', 10);
        if (!Number.isNaN(p) && p >= 1) {
          currentPage = p;
          renderList();
        }
      });

      crewListEl?.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.js-row-scan');
        if (!btn || btn.disabled) return;
        const uid = parseInt(btn.getAttribute('data-uid') || '0', 10);
        const mode = btn.getAttribute('data-mode') || 'auto';
        if (uid > 0) {
          performGateScan({ user_id: uid, scan_mode: mode }, false);
        }
      });

      if (isAuthorized) {
        setTerminalUnlocked(true);
        loadFeed();
      } else if (pinInput) {
        setTimeout(() => pinInput.focus(), 60);
      }

      pollTimer = setInterval(() => {
        if (isAuthorized && !document.hidden) {
          loadFeed();
        }
      }, 20000);

      window.addEventListener('online', () => {
        syncQueuedGateScans().then(() => loadFeed());
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    })();
  </script>
  <?php endif; ?>
</body>
</html>
