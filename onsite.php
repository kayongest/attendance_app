<?php
/**
 * aBility Manager — Shareable Technician On-Site & Duty Directory Portal (Read-Only)
 * Protected by a configurable shared technician passcode (hashed in `app_settings`).
 * Strictly isolated from operator/admin/kiosk sessions: never sets `auth_user_id`.
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

$portalEnabled = true;
$portalExpired = false;
$isAuthorized = false;
$activeDb = '';
$portalCfg = null;
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
    $st = $pdo->query("SELECT `setting_key`, `setting_value` FROM `app_settings` WHERE `setting_key` IN ('onsite_share_enabled', 'onsite_share_session_ver')");
    $settings = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['setting_key']] = (string) ($row['setting_value'] ?? '');
    }
    $portalCfg = resolveStandalonePortalConfig($pdo, 'onsite');
    $portalCfgActive = $portalCfg ? ((int) ($portalCfg['is_active'] ?? 1) === 1) : true;
    $portalExpired = ($portalCfg && !empty($portalCfg['expires_at']) && strtotime((string) $portalCfg['expires_at']) < time());
    $portalEnabled = (($settings['onsite_share_enabled'] ?? '1') === '1') && $portalCfgActive && !$portalExpired;
    $curVer = max(1, (int) ($settings['onsite_share_session_ver'] ?? 1));
    $isAuthorized = $portalEnabled
        && !empty($_SESSION['onsite_viewer_authorized'])
        && ((int) ($_SESSION['onsite_viewer_ver'] ?? 0) === $curVer);
} catch (Throwable $e) {
    $portalEnabled = true;
    $isAuthorized = false;
}

$portalTitleResolved = ($portalCfg && trim((string) ($portalCfg['title'] ?? '')) !== '')
    ? trim((string) $portalCfg['title'])
    : 'Live On-Site Crew Directory';
$portalBestFor = $portalCfg ? trim((string) ($portalCfg['best_for'] ?? '')) : '';
$portalPermsSummary = $portalCfg ? trim((string) ($portalCfg['permissions_summary'] ?? '')) : '';
$portalBgUrl = $portalCfg ? ($portalCfg['background_image_url'] ?? null) : null;
$portalOverlayOpacity = $portalCfg ? max(0.15, min(0.95, (float) ($portalCfg['overlay_opacity'] ?? 0.78))) : 0.78;

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
  <meta name="apple-mobile-web-app-title" content="aBility OnSite" />
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon-180.png" />
  <link rel="icon" type="image/png" href="assets/icons/icon-192.png" />
  <?php echo $brandingHtml . "\n"; ?>
  <title>Live On-Site Crew Directory — aBility Tech</title>
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
      --bg-input: #edf2f7;
      --border-color: #e2e8f0;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --brand-primary: #134c80;
      --brand-accent: #7147eb;
      --card-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      --green-bg: #dcfce7;
      --green-text: #15803d;
      --purple-bg: #ede9fe;
      --purple-text: #6d28d9;
      --amber-bg: #fef3c7;
      --amber-text: #b45309;
      --blue-bg: #dbeafe;
      --blue-text: #1d4ed8;
    }

    [data-theme="dark"] {
      --bg-canvas: #090d16;
      --bg-surface: #121826;
      --bg-subtle: #182032;
      --bg-input: #1a2234;
      --border-color: #263147;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --brand-primary: #38bdf8;
      --brand-accent: #8b5cf6;
      --card-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
      --green-bg: rgba(22, 163, 74, 0.2);
      --green-text: #4ade80;
      --purple-bg: rgba(139, 92, 246, 0.2);
      --purple-text: #c4b5fd;
      --amber-bg: rgba(217, 119, 6, 0.2);
      --amber-text: #fbbf24;
      --blue-bg: rgba(37, 99, 235, 0.2);
      --blue-text: #93c5fd;
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

    /* Lock Gate Card */
    .lock-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .lock-card {
      width: 100%;
      max-width: 420px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: var(--card-shadow);
      padding: 32px 28px;
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
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .lock-sub {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 22px;
    }
    .pwd-wrap {
      position: relative;
      margin-bottom: 14px;
      text-align: left;
    }
    .pwd-input {
      width: 100%;
      padding: 12px 44px 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: 14px;
      outline: none;
    }
    .pwd-input:focus {
      border-color: var(--brand-accent);
      box-shadow: 0 0 0 3px rgba(113, 71, 235, 0.16);
    }
    .pwd-eye {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }
    .btn-primary {
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      background: linear-gradient(135deg, #134c80 0%, #7147eb 100%);
      cursor: pointer;
      transition: opacity 0.15s ease, transform 0.08s ease;
    }
    .btn-primary:hover { opacity: 0.94; }
    .btn-primary:active { transform: scale(0.99); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .lock-error {
      margin-top: 12px;
      font-size: 12.5px;
      font-weight: 600;
      color: #dc2626;
      min-height: 18px;
    }
    .lock-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .link-muted {
      color: var(--brand-accent);
      text-decoration: none;
      font-weight: 600;
    }
    .link-muted:hover { text-decoration: underline; }

    /* Live Directory App View */
    .portal-shell {
      max-width: 1240px;
      margin: 0 auto;
      padding: 20px 18px 48px;
    }
    .topbar {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      box-shadow: var(--card-shadow);
      margin-bottom: 18px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-mark {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #134c80 0%, #7147eb 100%);
      color: #fff;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-chip {
      border: 1px solid var(--border-color);
      background: var(--bg-subtle);
      color: var(--text-primary);
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-chip:hover { border-color: var(--brand-accent); }
    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--green-bg);
      color: var(--green-text);
      font-size: 11px;
      font-weight: 700;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    @media (max-width: 820px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 14px 16px;
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.1s ease;
      text-align: left;
    }
    .kpi-card:hover { border-color: var(--brand-accent); }
    .kpi-card.active {
      border-color: var(--brand-accent);
      box-shadow: 0 0 0 2px rgba(113, 71, 235, 0.16);
    }
    .kpi-label { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .kpi-val { font-size: 26px; font-weight: 800; color: var(--text-primary); line-height: 1.1; }
    .kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    .panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      box-shadow: var(--card-shadow);
      margin-bottom: 18px;
      overflow: hidden;
    }
    .panel-head {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .panel-tools {
      padding: 12px 18px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .role-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .role-pill {
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-secondary);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .role-pill.active {
      background: var(--brand-accent);
      border-color: var(--brand-accent);
      color: #ffffff;
    }
    .search-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1 1 320px;
      justify-content: flex-end;
    }
    .ctrl-input {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 7px 11px;
      font-size: 12.5px;
      outline: none;
    }
    .ctrl-input:focus { border-color: var(--brand-accent); }

    .cards-grid {
      padding: 16px 18px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 980px) {
      .cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .cards-grid { grid-template-columns: 1fr; }
    }
    .person-card {
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .person-top {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #134c80, #7147eb);
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .person-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .person-role-line { font-size: 12px; color: var(--text-secondary); }
    .badges-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-supervisor { background: var(--amber-bg); color: var(--amber-text); }
    .badge-controller { background: var(--purple-bg); color: var(--purple-text); }
    .badge-technician { background: var(--blue-bg); color: var(--blue-text); }
    .badge-crew { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-secondary); }
    .badge-onsite { background: var(--green-bg); color: var(--green-text); }
    .badge-cp { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); }

    .person-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11.5px;
      color: var(--text-secondary);
      padding-top: 8px;
      border-top: 1px dashed var(--border-color);
      flex-wrap: wrap;
    }
    .tel-link {
      color: var(--brand-accent);
      font-weight: 600;
      text-decoration: none;
    }
    .tel-link:hover { text-decoration: underline; }
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 28px 16px;
      color: var(--text-secondary);
      font-size: 13px;
      border: 1px dashed var(--border-color);
      border-radius: 10px;
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

  <!-- PASSWORD GATE -->
  <div id="portal-lock-view" class="lock-wrap" style="display: <?php echo $isAuthorized ? 'none' : 'flex'; ?>;">
    <div class="lock-card">
      <div class="lock-badge"><?php echo $portalExpired ? 'Shared Link Expired' : 'Technician Shared Access'; ?></div>
      <h1 class="lock-title"><?php echo htmlspecialchars($portalTitleResolved, ENT_QUOTES, 'UTF-8'); ?></h1>
      <p class="lock-sub">
        <?php if ($portalExpired): ?>
          This shared on-site link expired on <?php echo htmlspecialchars((string) ($portalCfg['expires_at'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>. Contact an Administrator to extend access.
        <?php elseif (!$portalEnabled): ?>
          This shared on-site link is currently disabled by an Administrator.
        <?php else: ?>
          Enter the shared crew access password to view Stock Managers, Gate Controllers, and fellow technicians currently on site.
        <?php endif; ?>
      </p>
      <?php if ($portalBestFor !== '' || $portalPermsSummary !== ''): ?>
      <div style="margin:0 0 12px;padding:8px 10px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-subtle);font-size:11.5px;line-height:1.45;text-align:left;">
        <?php if ($portalBestFor !== ''): ?>
        <div><strong>Best For:</strong> <?php echo htmlspecialchars($portalBestFor, ENT_QUOTES, 'UTF-8'); ?></div>
        <?php endif; ?>
        <?php if ($portalPermsSummary !== ''): ?>
        <div style="margin-top:3px;color:var(--text-secondary);"><strong>Limits:</strong> <?php echo htmlspecialchars($portalPermsSummary, ENT_QUOTES, 'UTF-8'); ?></div>
        <?php endif; ?>
      </div>
      <?php endif; ?>

      <?php if ($portalEnabled): ?>
      <form id="onsite-lock-form">
        <div class="pwd-wrap">
          <input
            type="password"
            id="onsite-password-input"
            class="pwd-input"
            placeholder="Enter shared technician password..."
            autocomplete="current-password"
            required
          />
          <button type="button" class="pwd-eye" id="onsite-toggle-eye" title="Show/Hide password" aria-label="Show password">
            👁
          </button>
        </div>
        <button type="submit" class="btn-primary" id="onsite-unlock-btn">View On-Site Crew</button>
        <div class="lock-error" id="onsite-lock-error" role="alert"></div>
      </form>
      <?php endif; ?>

      <div class="lock-footer">
        <span>Read-Only Live View</span>
        <a href="login.php" class="link-muted">Full Staff Sign In →</a>
      </div>
    </div>
  </div>

  <!-- LIVE ON-SITE DIRECTORY -->
  <div id="portal-live-view" class="portal-shell" style="display: <?php echo $isAuthorized ? 'block' : 'none'; ?>;">
    <header class="topbar">
      <div class="brand-left">
        <div class="brand-mark" style="overflow:hidden;padding:4px;"><img class="js-brand-logo-img" src="assets/brand-mark.svg" alt="aBility" style="width:100%;height:100%;object-fit:contain;" /></div>
        <div>
          <div style="font-size: 16px; font-weight: 800;"><?php echo htmlspecialchars($portalTitleResolved, ENT_QUOTES, 'UTF-8'); ?></div>
          <div style="font-size: 12px; color: var(--text-secondary);">
            Stock Managers · Gate Controllers · Tech Leads · Technicians
            <?php if ($portalBestFor !== ''): ?> · <?php echo htmlspecialchars($portalBestFor, ENT_QUOTES, 'UTF-8'); ?><?php endif; ?>
          </div>
          <?php if ($portalPermsSummary !== ''): ?>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Limits: <?php echo htmlspecialchars($portalPermsSummary, ENT_QUOTES, 'UTF-8'); ?></div>
          <?php endif; ?>
        </div>
      </div>

      <div class="topbar-actions">
        <span class="live-pill">
          <span class="live-dot"></span>
          <span id="onsite-sync-label">Live</span>
        </span>
        <button type="button" class="btn-chip" id="onsite-refresh-btn">↻ Refresh</button>
        <button type="button" class="btn-chip" id="onsite-theme-btn">◐ Theme</button>
        <button type="button" class="btn-chip" id="onsite-logout-btn">Lock / Exit</button>
      </div>
    </header>

    <!-- Role KPI Filter Cards -->
    <div class="kpi-grid">
      <button type="button" class="kpi-card active" data-role-cat="all" id="kpi-card-all">
        <div class="kpi-label">Total On-Site Now</div>
        <div class="kpi-val" id="kpi-total-val">0</div>
        <div class="kpi-sub">All checked-in personnel</div>
      </button>
      <button type="button" class="kpi-card" data-role-cat="supervisor" id="kpi-card-supervisor">
        <div class="kpi-label">Stock Mgr / Tech Leads</div>
        <div class="kpi-val" id="kpi-sup-val">0</div>
        <div class="kpi-sub">Site Mgrs, Leads &amp; PMs</div>
      </button>
      <button type="button" class="kpi-card" data-role-cat="controller" id="kpi-card-controller">
        <div class="kpi-label">Gate Controllers</div>
        <div class="kpi-val" id="kpi-ctrl-val">0</div>
        <div class="kpi-sub">Checkpoints &amp; facility gates</div>
      </button>
      <button type="button" class="kpi-card" data-role-cat="technician" id="kpi-card-technician">
        <div class="kpi-label">Fellow Technicians</div>
        <div class="kpi-val" id="kpi-tech-val">0</div>
        <div class="kpi-sub">Audio, Video, Lighting, Rigging</div>
      </button>
    </div>

    <!-- Active Checked-In Roster -->
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2 style="font-size: 16px; font-weight: 800;">Currently On-Site (<span id="onsite-filtered-count">0</span>)</h2>
          <div style="font-size: 12px; color: var(--text-secondary);">Personnel who have checked in at a facility gate or event venue without checking out.</div>
        </div>
      </div>

      <div class="panel-tools">
        <div class="role-pills" id="onsite-role-pills">
          <button type="button" class="role-pill active" data-role-cat="all">All</button>
          <button type="button" class="role-pill" data-role-cat="supervisor">Stock Mgr &amp; Supervisors</button>
          <button type="button" class="role-pill" data-role-cat="controller">Gate Controllers</button>
          <button type="button" class="role-pill" data-role-cat="technician">Technicians</button>
          <button type="button" class="role-pill" data-role-cat="crew">Other Crew</button>
        </div>

        <div class="search-controls">
          <select id="onsite-cp-filter" class="ctrl-input" aria-label="Filter by checkpoint">
            <option value="all">All Checkpoints</option>
          </select>
          <input type="text" id="onsite-search-input" class="ctrl-input" placeholder="Search name, role, checkpoint, phone..." style="min-width: 220px;" />
        </div>
      </div>

      <div id="onsite-roster-grid" class="cards-grid"></div>
    </section>
  </div>

  <script>
    (function () {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const lockView = document.getElementById('portal-lock-view');
      const liveView = document.getElementById('portal-live-view');
      const lockForm = document.getElementById('onsite-lock-form');
      const pwdInput = document.getElementById('onsite-password-input');
      const eyeBtn = document.getElementById('onsite-toggle-eye');
      const lockErr = document.getElementById('onsite-lock-error');
      const unlockBtn = document.getElementById('onsite-unlock-btn');

      let roleFilter = 'all';
      let cpFilter = 'all';
      let searchTerm = '';
      let cachedData = { rollCallList: [], checkpoints: [] };
      let pollTimer = null;

      function escapeHtml(val) {
        return String(val ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      if (eyeBtn && pwdInput) {
        eyeBtn.addEventListener('click', () => {
          pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
        });
      }

      const themeBtn = document.getElementById('onsite-theme-btn');
      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
          const next = cur === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          try { localStorage.setItem('ability_theme', next); } catch (_) {}
          document.cookie = `ability_theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
        });
      }

      function setRoleFilter(cat) {
        roleFilter = cat || 'all';
        document.querySelectorAll('#onsite-role-pills .role-pill').forEach((btn) => {
          btn.classList.toggle('active', btn.getAttribute('data-role-cat') === roleFilter);
        });
        document.querySelectorAll('.kpi-card').forEach((card) => {
          card.classList.toggle('active', card.getAttribute('data-role-cat') === roleFilter);
        });
        renderDirectory();
      }

      document.querySelectorAll('#onsite-role-pills .role-pill, .kpi-card').forEach((el) => {
        el.addEventListener('click', () => {
          setRoleFilter(el.getAttribute('data-role-cat') || 'all');
        });
      });

      const cpSel = document.getElementById('onsite-cp-filter');
      if (cpSel) {
        cpSel.addEventListener('change', (e) => {
          cpFilter = e.target.value || 'all';
          renderDirectory();
        });
      }

      const searchInp = document.getElementById('onsite-search-input');
      if (searchInp) {
        searchInp.addEventListener('input', (e) => {
          searchTerm = (e.target.value || '').trim().toLowerCase();
          renderDirectory();
        });
      }

      function roleBadgeClass(cat) {
        if (cat === 'supervisor') return 'badge-supervisor';
        if (cat === 'controller') return 'badge-controller';
        if (cat === 'technician') return 'badge-technician';
        return 'badge-crew';
      }

      function renderDirectory() {
        const list = Array.isArray(cachedData.rollCallList) ? cachedData.rollCallList : [];
        const cps = Array.isArray(cachedData.checkpoints) ? cachedData.checkpoints : [];

        // Tally live on-site counts per checkpoint for dropdown badges
        const cpCounts = {};
        list.forEach((r) => {
          if (r.checkpoint_name) {
            cpCounts[r.checkpoint_name] = (cpCounts[r.checkpoint_name] || 0) + 1;
          }
        });

        // Populate checkpoint filter options
        if (cpSel) {
          const prev = cpFilter;
          const cpNames = Array.from(new Set([
            ...cps.map((c) => c.name).filter(Boolean),
            ...list.map((r) => r.checkpoint_name).filter(Boolean),
          ]));
          cpSel.innerHTML = `<option value="all">All Checkpoints (${list.length} On-Site)</option>` +
            cpNames.map((n) => {
              const cnt = cpCounts[n] || 0;
              return `<option value="${escapeHtml(n)}">${escapeHtml(n)}${cnt > 0 ? ` (${cnt})` : ''}</option>`;
            }).join('');
          if (cpNames.includes(prev)) {
            cpSel.value = prev;
          } else {
            cpFilter = 'all';
            cpSel.value = 'all';
          }
        }

        // Scope KPI counts to active checkpoint selection
        const cpScopedList = cpFilter === 'all'
          ? list
          : list.filter((r) => r.checkpoint_name === cpFilter);
        const supCount = cpScopedList.filter((r) => r.role_category === 'supervisor').length;
        const ctrlCount = cpScopedList.filter((r) => r.role_category === 'controller').length;
        const techCount = cpScopedList.filter((r) => r.role_category === 'technician').length;
        document.getElementById('kpi-total-val').textContent = String(cpScopedList.length);
        document.getElementById('kpi-sup-val').textContent = String(supCount);
        document.getElementById('kpi-ctrl-val').textContent = String(ctrlCount);
        document.getElementById('kpi-tech-val').textContent = String(techCount);

        const filtered = cpScopedList.filter((r) => {
          if (roleFilter !== 'all' && r.role_category !== roleFilter) return false;
          if (searchTerm) {
            const hay = `${r.full_name} ${r.role_display} ${r.department} ${r.checkpoint_name} ${r.badge_code} ${r.phone || ''}`.toLowerCase();
            if (!hay.includes(searchTerm)) return false;
          }
          return true;
        });

        document.getElementById('onsite-filtered-count').textContent = String(filtered.length);

        const rosterGrid = document.getElementById('onsite-roster-grid');
        if (rosterGrid) {
          if (filtered.length === 0) {
            rosterGrid.innerHTML = `<div class="empty-state">${
              list.length === 0
                ? 'No personnel are currently checked in on-site right now.'
                : 'No on-site personnel match your selected checkpoint, role, or search filter.'
            }</div>`;
          } else {
            rosterGrid.innerHTML = filtered.map((r) => {
              const avatarInner = r.profile_image_url
                ? `<img src="${escapeHtml(r.profile_image_url)}" alt="${escapeHtml(r.full_name)}" onerror="this.remove();" />`
                : escapeHtml(r.initials || 'U');
              const telClean = (r.phone || '').replace(/[^+\d]/g, '');
              return `
                <article class="person-card">
                  <div class="person-top">
                    <div class="avatar">${avatarInner}</div>
                    <div style="min-width: 0; flex: 1;">
                      <div class="person-name">${escapeHtml(r.full_name)}</div>
                      <div class="person-role-line">${escapeHtml(r.department || 'Operations')} · ${escapeHtml(r.clearance_code || 'L2')}</div>
                    </div>
                  </div>
                  <div class="badges-row">
                    <span class="badge ${roleBadgeClass(r.role_category)}">${escapeHtml(r.role_display || 'Crew')}</span>
                    <span class="badge badge-onsite">On-Site</span>
                    <span class="badge badge-cp">${escapeHtml(r.checkpoint_name)}</span>
                  </div>
                  <div class="person-meta">
                    <span>Checked In: <strong>${escapeHtml(r.check_in_time || '--')}</strong></span>
                    ${r.phone ? `<a href="tel:${escapeHtml(telClean)}" class="tel-link">${escapeHtml(r.phone)}</a>` : '<span>No phone listed</span>'}
                  </div>
                </article>
              `;
            }).join('');
          }
        }
      }

      async function fetchLiveFeed() {
        try {
          const res = await fetch('api.php?action=onsite_public_feed');
          const data = await res.json();
          if (res.status === 401 || res.status === 403 || !data || !data.ok) {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            if (liveView) liveView.style.display = 'none';
            if (lockView) lockView.style.display = 'flex';
            if (lockErr && data && data.error && res.status === 403) {
              lockErr.textContent = data.error;
            }
            return;
          }
          cachedData = data;
          const lbl = document.getElementById('onsite-sync-label');
          if (lbl) lbl.textContent = `Updated ${data.generated_at || 'now'}`;
          renderDirectory();
        } catch (err) {
          const lbl = document.getElementById('onsite-sync-label');
          if (lbl) lbl.textContent = 'Sync paused (network)';
        }
      }

      function startFeedLoop() {
        fetchLiveFeed();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(fetchLiveFeed, 15000);
      }

      if (lockForm) {
        lockForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (lockErr) lockErr.textContent = '';
          const password = pwdInput ? pwdInput.value : '';
          if (!password) {
            if (lockErr) lockErr.textContent = 'Please enter the shared password.';
            return;
          }
          if (unlockBtn) {
            unlockBtn.disabled = true;
            unlockBtn.textContent = 'Verifying...';
          }
          try {
            const res = await fetch('api.php?action=onsite_portal_login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
              },
              body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (res.ok && data && data.ok) {
              if (pwdInput) pwdInput.value = '';
              if (lockView) lockView.style.display = 'none';
              if (liveView) liveView.style.display = 'block';
              startFeedLoop();
            } else {
              if (lockErr) lockErr.textContent = (data && data.error) || 'Incorrect password.';
            }
          } catch (err) {
            if (lockErr) lockErr.textContent = 'Unable to connect to server.';
          } finally {
            if (unlockBtn) {
              unlockBtn.disabled = false;
              unlockBtn.textContent = 'View On-Site Crew';
            }
          }
        });
      }

      const refreshBtn = document.getElementById('onsite-refresh-btn');
      if (refreshBtn) refreshBtn.addEventListener('click', fetchLiveFeed);

      const logoutBtn = document.getElementById('onsite-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
          try {
            await fetch('api.php?action=onsite_portal_logout', {
              method: 'POST',
              headers: { 'X-CSRF-Token': csrfToken },
            });
          } catch (_) {}
          window.location.reload();
        });
      }

      <?php if ($isAuthorized): ?>
      startFeedLoop();
      <?php endif; ?>

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    })();
  </script>
</body>
</html>
