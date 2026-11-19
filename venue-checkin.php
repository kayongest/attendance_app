<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/db.php';

$brandingHtml = '';
try {
    $activeDb = '';
    $pdo = getDbConnection($activeDb);
    $brandingHtml = renderBrandingHeadHtml($pdo);
} catch (Throwable $e) {
    $brandingHtml = '';
}

$csrfToken = getSessionCsrfToken() ?: (string) $_SESSION['csrf_token'];
$rawToken = trim((string) ($_GET['c'] ?? $_GET['token'] ?? ''));
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="csrf-token" content="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>" />
  <title>Venue Check-In Verification | aBility</title>
  <link rel="stylesheet" href="styles.css?v=20261119-5" />
  <?= $brandingHtml ?>
  <style>
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 45%), var(--bg-canvas, #f4f7fb);
      padding: 1rem;
      margin: 0;
    }
    .vchk-shell {
      width: 100%;
      max-width: 470px;
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 18px;
      box-shadow: 0 22px 48px rgba(15, 23, 42, 0.10);
      padding: 1.45rem;
    }
    .vchk-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--border-subtle, #e2e8f0);
    }
    .vchk-brand h1 {
      font-size: 1.05rem;
      font-weight: 800;
      margin: 0;
      color: var(--text-primary, #0f172a);
    }
    .vchk-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      white-space: nowrap;
    }
    .vchk-badge.ok { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .vchk-badge.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .vchk-badge.err { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
      margin-bottom: 1rem;
    }
    .meta-box {
      background: var(--bg-surface-muted, #f8fafc);
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 10px;
      padding: 0.65rem 0.75rem;
    }
    .meta-box label {
      display: block;
      font-size: 0.67rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, #64748b);
      margin-bottom: 0.2rem;
    }
    .meta-box strong {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      word-break: break-word;
    }
    .factor-card {
      background: var(--bg-surface-muted, #f8fafc);
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 12px;
      padding: 0.85rem;
      margin-bottom: 0.85rem;
    }
    .factor-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
    }
    .field-label {
      display: block;
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text-secondary, #475569);
      margin-bottom: 0.3rem;
      margin-top: 0.55rem;
    }
    input[type="text"], input[type="password"], select {
      width: 100%;
      box-sizing: border-box;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border-subtle, #cbd5e1);
      border-radius: 9px;
      font-size: 0.92rem;
      background: #ffffff;
      color: var(--text-primary, #0f172a);
    }
    .totp-input {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: 0.32em;
      text-align: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-weight: 700;
      font-size: 0.92rem;
      border-radius: 10px;
      padding: 0.72rem 1rem;
      border: none;
      cursor: pointer;
      width: 100%;
      text-decoration: none;
      box-sizing: border-box;
    }
    .btn-primary {
      background: var(--brand-primary, #2563eb);
      color: #ffffff;
    }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      background: #ffffff;
      color: var(--text-primary, #0f172a);
      border: 1px solid var(--border-subtle, #cbd5e1);
      width: auto;
      padding: 0.35rem 0.65rem;
      font-size: 0.74rem;
    }
    .status-banner {
      display: none;
      border-radius: 10px;
      padding: 0.8rem 0.9rem;
      font-size: 0.84rem;
      font-weight: 600;
      margin-bottom: 0.9rem;
      line-height: 1.45;
    }
    .status-banner.err { display: block; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .status-banner.ok { display: block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .muted-note { font-size: 0.75rem; color: var(--text-muted, #64748b); margin-top: 0.35rem; line-height: 1.4; }
    details { margin-top: 0.5rem; }
    summary { font-size: 0.74rem; font-weight: 600; color: var(--brand-primary, #2563eb); cursor: pointer; }
    .mode-pills { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin-top: 0.35rem; }
    .mode-pill-btn {
      padding: 0.45rem 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
    }
    .mode-pill-btn.active {
      background: #eff6ff;
      border-color: #2563eb;
      color: #1d4ed8;
    }
  </style>
</head>
<body>
  <main class="vchk-shell">
    <div class="vchk-brand">
      <div style="display:flex;align-items:center;gap:0.65rem;">
        <img class="js-brand-logo-img" data-brand-logo="1" src="assets/rwanda-events-logo.png" alt="aBility" style="width:34px;height:34px;border-radius:8px;object-fit:contain;flex-shrink:0;" />
        <div>
          <h1>Venue QR Check-In / Out</h1>
          <div class="muted-note" style="margin-top:2px;">Anti-Shadowing Device + Geo Verification</div>
        </div>
      </div>
      <span id="vchk-status-badge" class="vchk-badge">Loading...</span>
    </div>

    <div id="vchk-alert" class="status-banner" role="alert"></div>

    <div class="meta-grid">
      <div class="meta-box">
        <label>Checkpoint Gate</label>
        <strong id="meta-cp-name">—</strong>
      </div>
      <div class="meta-box">
        <label>Device Binding</label>
        <strong id="meta-device-id">Checking...</strong>
      </div>
      <div class="meta-box">
        <label>Geo-Fence Policy</label>
        <strong id="meta-geo-radius">—</strong>
      </div>
      <div class="meta-box">
        <label>Window Timer</label>
        <strong id="meta-timer">—</strong>
      </div>
    </div>

    <form id="vchk-form" novalidate>
      <div class="factor-card">
        <div class="factor-head">
          <span>1. Staff Identity</span>
          <span id="identity-badge" class="vchk-badge warn">Verify</span>
        </div>
        <div id="session-user-box" style="display:none;font-size:0.84rem;color:#0f172a;line-height:1.4;">
          Signed in as <strong id="session-user-name">—</strong>
          <div id="session-user-state" class="muted-note" style="margin-top:2px;"></div>
        </div>
        <div id="login-inputs-box">
          <label class="field-label" for="vchk-username">Username or Email</label>
          <input id="vchk-username" type="text" autocomplete="username" placeholder="Your Ability username" />
          <label class="field-label" for="vchk-password">Password</label>
          <input id="vchk-password" type="password" autocomplete="current-password" placeholder="Enter password" />
        </div>
      </div>

      <div class="factor-card">
        <div class="factor-head">
          <span>2. Action &amp; Geo-Fence Proximity</span>
          <span id="gps-badge" class="vchk-badge">Checking GPS...</span>
        </div>
        <div class="mode-pills" id="mode-pills">
          <button type="button" class="mode-pill-btn active" data-mode="auto">Auto (IN/OUT)</button>
          <button type="button" class="mode-pill-btn" data-mode="check_in">Force Check-In</button>
          <button type="button" class="mode-pill-btn" data-mode="check_out">Force Check-Out</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-top:0.65rem;flex-wrap:wrap;">
          <div id="gps-detail" class="muted-note" style="margin:0;">Requesting device coordinates...</div>
          <button type="button" id="btn-refresh-gps" class="btn btn-ghost">Refresh GPS</button>
        </div>
        <details>
          <summary>Supervisor Override PIN (if GPS unavailable indoors)</summary>
          <label class="field-label" for="vchk-sup-pin">Checkpoint Terminal PIN</label>
          <input id="vchk-sup-pin" type="password" inputmode="numeric" placeholder="Optional Checkpoint Override PIN" />
        </details>
      </div>

      <div id="totp-box" class="factor-card" style="display:none;">
        <div class="factor-head">
          <span>3. Authenticator (TOTP) / Device Rebind</span>
          <span class="vchk-badge warn">6-Digit Code</span>
        </div>
        <label class="field-label" for="vchk-totp">6-digit code from Authenticator app</label>
        <input id="vchk-totp" class="totp-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="000000" />
        <label id="rebind-row" style="display:none;margin-top:0.6rem;font-size:0.78rem;color:#1e293b;align-items:center;gap:0.45rem;cursor:pointer;">
          <input type="checkbox" id="vchk-rebind-chk" style="width:auto;" />
          <span>Rebind my account to this phone using TOTP above</span>
        </label>
      </div>

      <button type="submit" id="btn-submit-vchk" class="btn btn-primary">Verify &amp; Check In / Out</button>
    </form>

    <div id="vchk-success-actions" style="display:none;margin-top:0.9rem;">
      <a href="index.php" class="btn btn-primary" style="background:var(--brand-accent,#059669);">Open My Pass &amp; Assignments</a>
    </div>

    <div style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);">
      <a href="index.php" style="color:inherit;text-decoration:none;">← Return to Main Dashboard</a>
      <span id="vchk-footer-note">Anti-shadowing active</span>
    </div>
  </main>

  <script>
    (function () {
      const token = <?= json_encode($rawToken) ?>;
      let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      let currentCoords = null;
      let scanMode = 'auto';
      let timerSecs = 0;
      let timerHandle = null;

      function getOrCreateDeviceToken() {
        let devTok = '';
        try { devTok = localStorage.getItem('ability_device_tok') || ''; } catch (e) {}
        if (!devTok || devTok.length < 16) {
          const m = document.cookie.match(/(?:^|;\s*)ability_device_tok=([^;]+)/);
          if (m) devTok = decodeURIComponent(m[1]);
        }
        if (!devTok || devTok.length < 16) {
          const arr = new Uint8Array(24);
          if (window.crypto && crypto.getRandomValues) {
            crypto.getRandomValues(arr);
          } else {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
          }
          devTok = 'ABDEV-' + Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
        }
        try { localStorage.setItem('ability_device_tok', devTok); } catch (e) {}
        document.cookie = 'ability_device_tok=' + encodeURIComponent(devTok) + '; path=/; max-age=31536000; SameSite=Lax';
        return devTok;
      }

      function inferDeviceLabel() {
        const ua = navigator.userAgent || '';
        if (/Android/i.test(ua)) return 'Android Phone';
        if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad';
        if (/Windows/i.test(ua)) return 'Windows Browser';
        if (/Mac/i.test(ua)) return 'Mac Browser';
        return 'Web Device';
      }

      const deviceToken = getOrCreateDeviceToken();
      const deviceLabel = inferDeviceLabel();
      document.getElementById('meta-device-id').textContent = deviceLabel + ' (' + deviceToken.slice(-6) + ')';

      const alertBox = document.getElementById('vchk-alert');
      const statusBadge = document.getElementById('vchk-status-badge');
      const gpsBadge = document.getElementById('gps-badge');
      const gpsDetail = document.getElementById('gps-detail');
      const submitBtn = document.getElementById('btn-submit-vchk');

      function showAlert(msg, kind) {
        alertBox.textContent = msg;
        alertBox.className = 'status-banner ' + (kind === 'ok' ? 'ok' : 'err');
      }

      function requestGps() {
        if (!navigator.geolocation) {
          gpsBadge.textContent = 'Unavailable';
          gpsBadge.className = 'vchk-badge err';
          gpsDetail.textContent = 'Browser geolocation unavailable. Use Supervisor Override PIN.';
          return;
        }
        gpsBadge.textContent = 'Locating...';
        gpsBadge.className = 'vchk-badge';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            currentCoords = {
              lat: Number(pos.coords.latitude.toFixed(6)),
              lng: Number(pos.coords.longitude.toFixed(6)),
              accuracy: Math.round(pos.coords.accuracy || 0),
            };
            gpsBadge.textContent = 'Locked (±' + currentCoords.accuracy + 'm)';
            gpsBadge.className = 'vchk-badge ok';
            gpsDetail.textContent = 'GPS ' + currentCoords.lat + ', ' + currentCoords.lng;
          },
          (err) => {
            currentCoords = null;
            gpsBadge.textContent = 'GPS Blocked';
            gpsBadge.className = 'vchk-badge warn';
            gpsDetail.textContent = (err && err.message) ? err.message : 'Enable location permission or use Gate Override PIN.';
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
        );
      }

      function startTimer(secs) {
        timerSecs = Math.max(0, Number(secs || 0));
        if (timerHandle) clearInterval(timerHandle);
        const render = () => {
          const el = document.getElementById('meta-timer');
          if (timerSecs <= 0) {
            el.textContent = 'Expired';
            statusBadge.textContent = 'Expired';
            statusBadge.className = 'vchk-badge err';
            return;
          }
          el.textContent = timerSecs + 's left';
          timerSecs--;
        };
        render();
        timerHandle = setInterval(render, 1000);
      }

      document.getElementById('mode-pills').addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-pill-btn');
        if (!btn) return;
        scanMode = btn.getAttribute('data-mode') || 'auto';
        document.querySelectorAll('.mode-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });

      document.getElementById('btn-refresh-gps').addEventListener('click', requestGps);

      async function loadInfo() {
        if (!token) {
          statusBadge.textContent = 'Missing QR';
          statusBadge.className = 'vchk-badge err';
          submitBtn.disabled = true;
          showAlert('No rotating Venue QR token was supplied in this URL. Point your camera at the live gate screen.', 'err');
          return;
        }
        try {
          const res = await fetch('api.php?action=get_venue_checkin_info&c=' + encodeURIComponent(token));
          const data = await res.json();
          if (data.csrf_token) csrfToken = data.csrf_token;
          if (!res.ok || !data.ok) {
            statusBadge.textContent = 'Invalid QR';
            statusBadge.className = 'vchk-badge err';
            submitBtn.disabled = true;
            showAlert(data.error || 'Venue Check-In QR invalid or expired.', 'err');
            return;
          }
          document.getElementById('meta-cp-name').textContent = data.checkpoint_name || 'Facility Gate';
          document.getElementById('meta-geo-radius').textContent = data.has_geofence
            ? ('Within ' + data.geofence_radius_m + 'm required')
            : 'Gate QR screen verified';
          startTimer(data.seconds_left || 0);

          if (data.expired) {
            statusBadge.textContent = 'Expired';
            statusBadge.className = 'vchk-badge err';
            submitBtn.disabled = true;
            showAlert('This 45s Venue Check-In QR expired. Scan the new live QR displayed on the gate screen.', 'err');
          } else {
            statusBadge.textContent = 'Live Gate QR';
            statusBadge.className = 'vchk-badge ok';
          }

          if (data.session_user) {
            const su = data.session_user;
            document.getElementById('session-user-box').style.display = 'block';
            document.getElementById('login-inputs-box').style.display = 'none';
            document.getElementById('session-user-name').textContent = su.full_name + ' (@' + su.username + ')';
            document.getElementById('session-user-state').textContent = su.checked_in
              ? 'Currently Checked In — ready to Check Out or verify.'
              : 'Currently Ready — scanning will Check In.';
            document.getElementById('identity-badge').textContent = 'Signed In';
            document.getElementById('identity-badge').className = 'vchk-badge ok';
            if (su.totp_enabled) {
              document.getElementById('totp-box').style.display = 'block';
            }
          }
        } catch (err) {
          showAlert('Unable to reach server to validate QR.', 'err');
        }
      }

      document.getElementById('vchk-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying Anti-Shadowing Checks...';
        try {
          const payload = {
            action: 'redeem_venue_checkin_qr',
            token,
            device_token: deviceToken,
            device_label: deviceLabel,
            username: (document.getElementById('vchk-username').value || '').trim(),
            password: document.getElementById('vchk-password').value || '',
            lat: currentCoords ? currentCoords.lat : '',
            lng: currentCoords ? currentCoords.lng : '',
            totp_code: (document.getElementById('vchk-totp').value || '').trim(),
            rebind_with_totp: document.getElementById('vchk-rebind-chk').checked ? 1 : 0,
            supervisor_pin: (document.getElementById('vchk-sup-pin').value || '').trim(),
            scan_mode: scanMode,
            csrf_token: csrfToken,
          };
          const res = await fetch('api.php?action=redeem_venue_checkin_qr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (data.device_mismatch) {
            document.getElementById('totp-box').style.display = 'block';
            if (data.totp_enabled) {
              document.getElementById('rebind-row').style.display = 'flex';
            }
          }
          if (data.totp_required) {
            document.getElementById('totp-box').style.display = 'block';
          }
          if (!res.ok || !data.ok || data.allowed === false) {
            showAlert(data.error || data.reason || 'Verification failed.', 'err');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify & Check In / Out';
            return;
          }

          statusBadge.textContent = (data.action === 'check_out' ? 'Checked Out' : 'Checked In');
          statusBadge.className = 'vchk-badge ok';
          const actLabel = data.action === 'check_out' ? 'CHECK-OUT GRANTED' : 'CHECK-IN GRANTED';
          const distText = (data.distance_m !== null && data.distance_m !== undefined) ? (' · Distance ' + data.distance_m + 'm') : '';
          const devNote = data.newly_bound_device ? ' · Phone bound to your profile' : '';
          showAlert(actLabel + ' at ' + (data.checkpoint_name || 'Gate') + distText + devNote + '.', 'ok');
          document.getElementById('vchk-form').style.display = 'none';
          document.getElementById('vchk-success-actions').style.display = 'block';
        } catch (err) {
          showAlert('Network error while submitting Venue Check-In.', 'err');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Verify & Check In / Out';
        }
      });

      requestGps();
      loadInfo();
    })();
  </script>
</body>
</html>
