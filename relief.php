<?php
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

require_once __DIR__ . '/db.php';
$activeDb = '';
$pdo = null;
$brandingHtml = '';
$defaultBrandingTheme = null;
try {
    $pdo = getDbConnection($activeDb);
    $brandingHtml = renderBrandingHeadHtml($pdo);
    $bCfg = getBrandingConfig($pdo);
    if (!empty($bCfg['default_theme']) && in_array($bCfg['default_theme'], ['dark', 'light'], true)) {
        $defaultBrandingTheme = $bCfg['default_theme'];
    }
} catch (Throwable $e) {
    $brandingHtml = '';
}
$csrfToken = getSessionCsrfToken() ?: (string) $_SESSION['csrf_token'];
$rawToken = trim((string) ($_GET['token'] ?? ''));
$themeAttr = (($_COOKIE['ability_theme'] ?? '') === 'light')
    ? 'light'
    : ((($_COOKIE['ability_theme'] ?? '') === 'dark') ? 'dark' : ($defaultBrandingTheme ?: 'dark'));
?>
<!DOCTYPE html>
<html lang="en" data-theme="<?= htmlspecialchars($themeAttr, ENT_QUOTES, 'UTF-8') ?>">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="csrf-token" content="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="aBility Relief" />
  <meta name="theme-color" content="#070b14" />
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon-180.png" />
  <link rel="icon" type="image/png" href="assets/icons/favicon-64.png" />
  <title>aBility Manager — Geo-Fenced Temporary Relief Activation</title>
  <?= $brandingHtml . "\n" ?>
  <style>
    :root {
      --bg-page: #070b14;
      --bg-card: rgba(15, 23, 42, 0.92);
      --border: rgba(148, 163, 184, 0.22);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --brand-primary: #3b82f6;
      --brand-accent: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --font-family: var(--brand-font-family, 'Inter', system-ui, -apple-system, sans-serif);
    }
    html[data-theme="light"] {
      --bg-page: #f1f5f9;
      --bg-card: #ffffff;
      --border: rgba(15, 23, 42, 0.14);
      --text-main: #0f172a;
      --text-muted: #475569;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: var(--font-family);
      font-size: calc(14px * var(--brand-font-scale, 1));
      text-align: var(--brand-text-align, left);
      background:
        radial-gradient(circle at 15% 15%, rgba(59,130,246,0.18), transparent 45%),
        radial-gradient(circle at 85% 80%, rgba(16,185,129,0.14), transparent 45%),
        var(--bg-page);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
    }
    .relief-shell {
      width: 100%;
      max-width: 520px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 1.5rem;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(16px);
    }
    .relief-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--border);
    }
    .relief-brand h1 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
    }
    .relief-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      background: rgba(59, 130, 246, 0.16);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.32);
    }
    .relief-badge.ok { background: rgba(16, 185, 129, 0.16); color: #34d399; border-color: rgba(16, 185, 129, 0.35); }
    .relief-badge.warn { background: rgba(245, 158, 11, 0.16); color: #fbbf24; border-color: rgba(245, 158, 11, 0.35); }
    .relief-badge.err { background: rgba(239, 68, 68, 0.16); color: #f87171; border-color: rgba(239, 68, 68, 0.35); }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
      margin-bottom: 1rem;
    }
    .meta-box {
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(148, 163, 184, 0.06);
    }
    .meta-box label {
      display: block;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.2rem;
    }
    .meta-box strong {
      font-size: 0.85rem;
      word-break: break-word;
    }
    .factor-card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.85rem;
      margin-bottom: 0.85rem;
      background: rgba(148, 163, 184, 0.04);
    }
    .factor-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
      font-size: 0.86rem;
    }
    .field-label {
      display: block;
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text-muted);
      margin: 0.55rem 0 0.25rem;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.45);
      color: var(--text-main);
      font-size: 0.92rem;
      font-family: inherit;
    }
    html[data-theme="light"] input[type="text"],
    html[data-theme="light"] input[type="password"] {
      background: #f8fafc;
    }
    .totp-input {
      letter-spacing: 0.35em;
      font-family: 'Courier New', monospace !important;
      font-size: 1.2rem !important;
      font-weight: 800;
      text-align: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.72rem 1rem;
      border-radius: 10px;
      border: 1px solid transparent;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      font-family: inherit;
      text-decoration: none;
    }
    .btn-primary {
      width: 100%;
      background: var(--brand-primary);
      color: #ffffff;
    }
    .btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .btn-ghost {
      background: rgba(148, 163, 184, 0.12);
      color: var(--text-main);
      border-color: var(--border);
      font-size: 0.76rem;
      padding: 0.42rem 0.7rem;
    }
    .status-banner {
      padding: 0.75rem 0.9rem;
      border-radius: 10px;
      font-size: 0.84rem;
      margin-bottom: 0.85rem;
      display: none;
    }
    .status-banner.show { display: block; }
    .status-banner.error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; }
    .status-banner.success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; }
    html[data-theme="light"] .status-banner.error { color: #b91c1c; }
    html[data-theme="light"] .status-banner.success { color: #047857; }
    .muted-note {
      font-size: 0.76rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
      line-height: 1.45;
    }
    details summary {
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <main class="relief-shell">
    <div class="relief-brand">
      <div style="display:flex;align-items:center;gap:0.65rem;">
        <img class="js-brand-logo-img" data-brand-logo="1" src="assets/rwanda-events-logo.png" alt="aBility" style="width:34px;height:34px;border-radius:8px;object-fit:contain;flex-shrink:0;" />
        <div>
          <h1>Temporary Relief Activation</h1>
          <div class="muted-note" style="margin-top:2px;">Geo-Fenced QR + Authenticator Verification</div>
        </div>
      </div>
      <span id="token-status-badge" class="relief-badge">Loading...</span>
    </div>

    <div id="relief-alert" class="status-banner" role="alert"></div>

    <div id="token-meta" class="meta-grid">
      <div class="meta-box">
        <label>Checkpoint Gate</label>
        <strong id="meta-checkpoint">—</strong>
      </div>
      <div class="meta-box">
        <label>Relief Controller</label>
        <strong id="meta-assignee">—</strong>
      </div>
      <div class="meta-box">
        <label>Geo-Fence Limit</label>
        <strong id="meta-radius">200m</strong>
      </div>
      <div class="meta-box">
        <label>QR Link Expires</label>
        <strong id="meta-expires">—</strong>
      </div>
    </div>

    <form id="relief-redeem-form" novalidate>
      <div id="identity-card" class="factor-card" style="display:none;">
        <div class="factor-head">
          <span>Operator Identity Verification</span>
          <span class="relief-badge warn">Sign In Required</span>
        </div>
        <label class="field-label" for="relief-username">Username</label>
        <input id="relief-username" type="text" autocomplete="username" placeholder="Relief controller username" />
        <label class="field-label" for="relief-password">Password</label>
        <input id="relief-password" type="password" autocomplete="current-password" placeholder="Enter account password" />
      </div>

      <div class="factor-card">
        <div class="factor-head">
          <span>1. Geo-Fence Proximity</span>
          <span id="gps-badge" class="relief-badge">Checking GPS...</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
          <div id="gps-detail" class="muted-note" style="margin:0;">Requesting device coordinates...</div>
          <button type="button" id="btn-refresh-gps" class="btn btn-ghost">Refresh GPS</button>
        </div>
        <details>
          <summary>Supervisor Override PIN (if GPS unavailable indoors)</summary>
          <label class="field-label" for="supervisor-pin">Checkpoint Terminal PIN</label>
          <input id="supervisor-pin" type="password" inputmode="numeric" placeholder="Enter Checkpoint Terminal PIN" />
        </details>
      </div>

      <div id="totp-card" class="factor-card">
        <div class="factor-head">
          <span>2. Authenticator (TOTP) Code</span>
          <span id="totp-req-badge" class="relief-badge warn">6-Digit Code</span>
        </div>
        <label class="field-label" for="totp-code">Enter 6-digit code from Google Authenticator / Authy</label>
        <input id="totp-code" class="totp-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="000000" />
        <div id="totp-help" class="muted-note">Time-based 30s rotating verification bound to your user account.</div>
      </div>

      <button type="submit" id="btn-activate-relief" class="btn btn-primary">Activate Temporary Gate Relief</button>
    </form>

    <div id="relief-success-actions" style="display:none;margin-top:1rem;">
      <a href="index.php" class="btn btn-primary" style="background:var(--brand-accent);">Open Dashboard &amp; Gate Terminal</a>
    </div>

    <div style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);">
      <a href="index.php" style="color:inherit;text-decoration:none;">← Return to Main Dashboard</a>
      <span id="countdown-label">Checking expiry...</span>
    </div>
  </main>

  <script>
    (function () {
      const token = <?= json_encode($rawToken) ?>;
      let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      let tokenInfo = null;
      let currentCoords = null;

      const alertBox = document.getElementById('relief-alert');
      const statusBadge = document.getElementById('token-status-badge');
      const gpsBadge = document.getElementById('gps-badge');
      const gpsDetail = document.getElementById('gps-detail');
      const totpCard = document.getElementById('totp-card');
      const totpReqBadge = document.getElementById('totp-req-badge');
      const identityCard = document.getElementById('identity-card');
      const submitBtn = document.getElementById('btn-activate-relief');

      function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = 'status-banner show ' + (type || 'error');
      }

      function haversineMeters(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const p1 = lat1 * Math.PI / 180;
        const p2 = lat2 * Math.PI / 180;
        const dp = (lat2 - lat1) * Math.PI / 180;
        const dl = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      function updateGpsUi() {
        if (!currentCoords) return;
        const { lat, lng, accuracy } = currentCoords;
        if (tokenInfo && tokenInfo.checkpoint_lat !== null && tokenInfo.checkpoint_lng !== null) {
          const dist = Math.round(haversineMeters(tokenInfo.checkpoint_lat, tokenInfo.checkpoint_lng, lat, lng));
          const maxR = Number(tokenInfo.geofence_radius_m || 200);
          const inside = dist <= maxR;
          gpsBadge.textContent = inside ? `In Zone (${dist}m)` : `Outside (${dist}m)`;
          gpsBadge.className = 'relief-badge ' + (inside ? 'ok' : 'err');
          gpsDetail.textContent = `Device GPS locked (${lat.toFixed(5)}, ${lng.toFixed(5)}, ±${Math.round(accuracy || 0)}m) — ${dist}m from checkpoint.`;
        } else {
          gpsBadge.textContent = 'GPS Locked';
          gpsBadge.className = 'relief-badge warn';
          gpsDetail.textContent = `Device GPS locked (${lat.toFixed(5)}, ${lng.toFixed(5)}). Checkpoint GPS coordinates not set — enter Supervisor PIN if prompted.`;
        }
      }

      function fetchGps() {
        if (!navigator.geolocation) {
          gpsBadge.textContent = 'GPS Unsupported';
          gpsBadge.className = 'relief-badge err';
          gpsDetail.textContent = 'Browser geolocation unavailable. Use Supervisor Override PIN below.';
          return;
        }
        gpsBadge.textContent = 'Locating...';
        gpsBadge.className = 'relief-badge';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            currentCoords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            };
            updateGpsUi();
          },
          (err) => {
            gpsBadge.textContent = 'GPS Denied/Failed';
            gpsBadge.className = 'relief-badge warn';
            gpsDetail.textContent = `Could not get GPS (${err.message}). Retry outdoors or enter Supervisor Override PIN.`;
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
        );
      }

      async function loadTokenInfo() {
        if (!token) {
          statusBadge.textContent = 'Missing Token';
          statusBadge.className = 'relief-badge err';
          showAlert('No Relief QR token found in URL. Scan the QR code generated in Shift Relief Settings.', 'error');
          submitBtn.disabled = true;
          return;
        }
        try {
          const res = await fetch('api.php?action=get_relief_token_info&token=' + encodeURIComponent(token));
          const data = await res.json();
          if (data.csrf_token) csrfToken = data.csrf_token;
          if (!res.ok || !data.ok || !data.token_info) {
            statusBadge.textContent = 'Invalid Token';
            statusBadge.className = 'relief-badge err';
            showAlert(data.error || 'Relief QR token is invalid.', 'error');
            submitBtn.disabled = true;
            return;
          }
          tokenInfo = data.token_info;
          document.getElementById('meta-checkpoint').textContent = tokenInfo.checkpoint_name || 'Assigned Checkpoint';
          document.getElementById('meta-assignee').textContent = tokenInfo.assigned_user_name || 'Relief Controller';
          document.getElementById('meta-radius').textContent = (tokenInfo.require_geofence ? `${tokenInfo.geofence_radius_m}m Fence` : 'GPS Optional');
          document.getElementById('meta-expires').textContent = tokenInfo.expires_at || '—';

          if (!data.session_user_id) {
            identityCard.style.display = 'block';
            if (tokenInfo.assigned_username) {
              document.getElementById('relief-username').value = tokenInfo.assigned_username;
            }
          }

          const needsTotp = Number(tokenInfo.require_totp) === 1 || Boolean(tokenInfo.target_totp_enabled);
          if (!needsTotp) {
            totpCard.style.display = 'none';
          } else {
            totpReqBadge.textContent = tokenInfo.target_totp_enabled ? 'Required (Enrolled)' : 'Required (Not Enrolled Yet)';
            totpReqBadge.className = 'relief-badge ' + (tokenInfo.target_totp_enabled ? 'ok' : 'err');
          }

          if (tokenInfo.status === 'redeemed') {
            statusBadge.textContent = 'Already Redeemed';
            statusBadge.className = 'relief-badge warn';
            showAlert('This Relief QR code was already redeemed at ' + (tokenInfo.redeemed_at || '') + '.', 'error');
            submitBtn.disabled = true;
          } else if (tokenInfo.status === 'expired') {
            statusBadge.textContent = 'Expired';
            statusBadge.className = 'relief-badge err';
            showAlert('This Relief QR code expired at ' + tokenInfo.expires_at + '.', 'error');
            submitBtn.disabled = true;
          } else {
            statusBadge.textContent = 'Active QR Token';
            statusBadge.className = 'relief-badge ok';
          }

          updateGpsUi();
        } catch (err) {
          showAlert('Network error verifying Relief QR token: ' + err.message, 'error');
        }
      }

      document.getElementById('btn-refresh-gps').addEventListener('click', fetchGps);

      document.getElementById('relief-redeem-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.className = 'status-banner';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying Geo-Fence & Authenticator...';
        try {
          const payload = {
            action: 'redeem_relief_qr',
            token,
            csrf_token: csrfToken,
            lat: currentCoords ? currentCoords.lat : '',
            lng: currentCoords ? currentCoords.lng : '',
            totp_code: document.getElementById('totp-code').value.trim(),
            supervisor_pin: document.getElementById('supervisor-pin').value.trim(),
            username: document.getElementById('relief-username').value.trim(),
            password: document.getElementById('relief-password').value
          };
          const res = await fetch('api.php?action=redeem_relief_qr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            showAlert(data.error || 'Could not activate relief assignment.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Activate Temporary Gate Relief';
            return;
          }
          statusBadge.textContent = 'Activated';
          statusBadge.className = 'relief-badge ok';
          showAlert(data.message || 'Temporary relief activated!', 'success');
          submitBtn.style.display = 'none';
          document.getElementById('relief-success-actions').style.display = 'block';
        } catch (err) {
          showAlert('Failed to activate relief: ' + err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Activate Temporary Gate Relief';
        }
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
      loadTokenInfo();
      fetchGps();
    })();
  </script>
</body>
</html>
