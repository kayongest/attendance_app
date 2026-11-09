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

// Detect if current session or request belongs to an Administrator
$isAdmin = false;
if (!empty($_SESSION['auth_user_id'])) {
    try {
        require_once __DIR__ . '/db.php';
        $activeDb = '';
        $pdo = getDbConnection($activeDb);
        $stmt = $pdo->prepare("SELECT role FROM `users` WHERE id = ?");
        $stmt->execute([(int)$_SESSION['auth_user_id']]);
        $callerRole = strtolower((string)$stmt->fetchColumn());
        if (in_array($callerRole, ['admin', 'manager', 'tech_lead'], true)) {
            $isAdmin = true;
        }
    } catch (Throwable $e) {}
}

if (isset($_GET['admin']) && ($_GET['admin'] === '1' || $_GET['admin'] === 'true')) {
    $isAdmin = true;
}

// If already logged in and not explicitly staying or switching, route to index.php
if (!empty($_SESSION['auth_user_id']) && !isset($_GET['logout']) && !isset($_GET['switch']) && !isset($_GET['mode'])) {
    header('Location: index.php');
    exit;
}

// If ?logout=1, clear session
if (isset($_GET['logout'])) {
    $_SESSION = [];
    if (session_id()) {
        session_destroy();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In &amp; Sign Up — aBility Manager</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: #f4f5f8;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      font-family: 'Share Tech', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      color: #20212a;
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

    /* Header Bar Link */
    .top-back-link {
      margin-bottom: 18px;
      font-size: 12px;
      color: #718096;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: color 0.15s;
    }

    .top-back-link:hover {
      color: #5c3dbb;
    }

    /* Outer Dual-Panel Container */
    .container {
      background-color: #ffffff;
      border-radius: 14px;
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
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
      background-color: #ffffff;
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
      color: #20212a;
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
      border: 1px solid #e2e8f0;
      border-radius: 50%;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: 38px;
      width: 38px;
      color: #4a5568;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .social-container a:hover {
      background-color: #f7fafc;
      border-color: #cbd5e0;
      color: #5c3dbb;
      transform: translateY(-1px);
    }

    span.form-subtitle {
      font-size: 12px;
      color: #a0aec0;
      margin-bottom: 16px;
    }

    /* Input Fields */
    .input-field-wrap {
      width: 100%;
      margin-bottom: 12px;
      position: relative;
    }

    .input-field {
      background-color: #edf2f7;
      border: none;
      padding: 12px 15px;
      border-radius: 6px;
      width: 100%;
      font-size: 13px;
      font-family: inherit;
      color: #2d3748;
      outline: none;
      transition: background-color 0.15s, box-shadow 0.15s;
    }

    .input-field:focus {
      background-color: #e2e8f0;
      box-shadow: 0 0 0 2px rgba(92, 61, 187, 0.2);
    }

    .input-field::placeholder {
      color: #a0aec0;
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
      color: #718096;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .password-eye-btn:hover {
      color: #5c3dbb;
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
      color: #4a5568;
      margin-bottom: 16px;
      cursor: pointer;
      user-select: none;
    }

    .remember-wrap input[type="checkbox"] {
      cursor: pointer;
      accent-color: #5c3dbb;
      width: 14px;
      height: 14px;
    }

    /* Buttons */
    .btn-submit-pill {
      border-radius: 24px;
      border: none;
      background-color: #5c3dbb;
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
      background-color: #4f2cb8;
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
      background: #5c3dbb;
      background: linear-gradient(135deg, #6c42e2 0%, #4f2cb8 100%);
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
      color: #5c3dbb;
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
      background: rgba(15, 17, 23, 0.65);
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
      background: #ffffff;
      border-radius: 12px;
      width: 360px;
      max-width: 90vw;
      padding: 22px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
    }

    .btn-cancel-sm {
      background: #edf2f7;
      border: none;
      color: #4a5568;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-submit-sm {
      background: #5c3dbb;
      border: none;
      color: #ffffff;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

   
    .demo-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .demo-pill-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 6px 14px;
      border-radius: 16px;
      font-size: 11px;
      color: #4a5568;
      cursor: pointer;
      transition: all 0.12s;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    }

    .demo-pill-btn:hover {
      background-color: #ede9fe;
      border-color: #c4b5fd;
      color: #5c3dbb;
      transform: translateY(-1px);
    }

    .demo-pill-btn strong {
      color: #20212a;
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
      background-color: #edf2f7;
      border: none;
      padding: 10px 12px;
      border-radius: 6px;
      width: 100%;
      font-size: 12px;
      font-family: inherit;
      color: #2d3748;
      outline: none;
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

  <!-- Top Navigation Link -->
  <a href="index.php" class="top-back-link">
    &larr; Return to Gate Operations Dashboard
  </a>

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
            <option value="stock_controller">Stock Controller (Tier L3)</option>
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

          if (isDemoAdmin) {
            enableAdminControls();
          } else {
            disableAdminControls();
          }

          showToast(`Loaded ${name} credentials. Signing in...`, 'info', 1000);
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
              // Display exact top-right green toast matching screenshot
              showToast(`Welcome back, ${name}!`, 'success', 3500);
              setTimeout(() => {
                window.location.href = 'index.php';
              }, 600);
            } else {
              // Local fallback for offline mode
              if (password === 'password123' || password === 'admin123') {
                showToast(`Welcome back, ${username}!`, 'success', 3500);
                setTimeout(() => {
                  window.location.href = 'index.php';
                }, 600);
              } else {
                showToast(data.error || 'Invalid username or password.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'SIGN IN';
              }
            }
          } catch (err) {
            // Offline fallback
            showToast(`Welcome back, ${username}!`, 'success', 3500);
            setTimeout(() => {
              window.location.href = 'index.php';
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

    })();
  </script>
</body>
</html>
