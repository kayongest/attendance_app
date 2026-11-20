/**
 * aBility Manager (id_badges.php#pane-kiosk) — Interactive Gate Terminal & 4-Tier Access Matrix Controller
 */
(function () {
  'use strict';

  const getMetaCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const state = {
    csrfToken: getMetaCsrfToken(),
    kioskMuted: localStorage.getItem('ability_kiosk_muted') === '1',
    activeScreen: 'overview',
    checkpointType: 'stock_warehouse',
    checkpointId: 1,
    stationLocked: localStorage.getItem('ability_station_locked') === '1',
    terminalScreenLocked: true,
    scanMode: 'auto',
    dbSource: 'ability_db',
    clearanceMatrix: [
      { id: 1, key: 'L1_VENUE_BASIC', level_key: 'L1_VENUE_BASIC', code: 'L1', title: 'Level 1 — Venue Crew', short: 'Assigned Venues Only', short_name: 'Assigned Venues Only', color: '#16a34a', description: 'Standard crew access restricted strictly to assigned Event Venues during scheduled calltimes.', venue_rule: 'YES', venue_Rule: 'YES', stock_rule: 'ALL', is_system: 1, is_active: 1, sort_order: 1, member_count: 0 },
      { id: 2, key: 'L2_TECH_STAGE', level_key: 'L2_TECH_STAGE', code: 'L2', title: 'Level 2 — Technical & Stage', short: 'Technical', short_name: 'Technical', color: '#2563eb', description: 'Access to Technical Stage areas, FOH/Backstage at assigned Event Venues, and designated Dispatch Stock Locations.', venue_rule: 'YES', venue_Rule: 'YES', stock_rule: 'YES', is_system: 1, is_active: 1, sort_order: 2, member_count: 16 },
      { id: 3, key: 'L3_STOCK_WAREHOUSE', level_key: 'L3_STOCK_WAREHOUSE', code: 'L3', title: 'Level 3 — Stock & Warehouse', short: 'Stock', short_name: 'Stock', color: '#d97706', description: 'Full access to authorized Stock Warehouses, Loading Bays, and Assigned Event Venues.', venue_rule: 'YES', venue_Rule: 'YES', stock_rule: 'FULL', is_system: 1, is_active: 1, sort_order: 3, member_count: 4 },
      { id: 4, key: 'L4_ALL_ACCESS', level_key: 'L4_ALL_ACCESS', code: 'L4', title: 'Level 4 — Full All-Access', short: 'ALL ACCESS', short_name: 'ALL ACCESS', color: '#dc2626', description: 'Unrestricted 24/7 entry to all Stock Warehouses, Production Vaults, Backstage Technical Zones, and Event Venues.', venue_rule: 'ALL', venue_Rule: 'ALL', stock_rule: 'ALL', is_system: 1, is_active: 1, sort_order: 4, member_count: 2 },
      { id: 8, key: 'L6_SPECIALIZED_OPS', level_key: 'L6_SPECIALIZED_OPS', code: 'L6', title: 'Level 6 — Management', short: 'Management', short_name: 'Management', color: '#7c3aed', description: 'Full executive access to all production facilities, sound stages and warehouse logistics.', venue_rule: 'YES', venue_Rule: 'YES', stock_rule: 'FULL', is_system: 0, is_active: 1, sort_order: 6, member_count: 0 },
    ],
    checkpoints: {
      stock_warehouses: [],
      event_venues: [],
      directory: [],
    },
    activeCheckpoint: {
      id: 1,
      type: 'stock_warehouse',
      name: 'Ndera Warehouse',
      location: 'Ndera Central Logistics Hub',
      call_time: '08:00',
      min_clearance: 'L2 / L3 / L4 Required (L1 Blocked)',
    },
    kpis: {
      activeBadges: 14,
      totalStaff: 14,
      tierCounts: { L1: 4, L2: 5, L3: 2, L4: 3 },
      currentlyOnSite: 4,
      venueCheckinsToday: 3,
      stockCheckinsToday: 2,
      totalGrantedToday: 5,
      lateArrivalsToday: 1,
      deniedScansToday: 1,
    },
    rollCallList: [],
    cosRoleFilter: 'all',
    cosCpFilter: 'all',
    cosSearch: '',
    crew: [],
    hourlyTraffic: [],
    activityTimeline: [],
    timelineRange: 'today',
    timelineDateFrom: '',
    timelineDateTo: '',
    timelineReportRows: [],
    timelineReportSummary: null,
    timelineReportLabel: '',
    timelineReportLoading: false,
    shiftRequests: [],
    pendingShiftRequestCount: 0,
    roles: [],
    usersViewMode: 'personnel',
    rolesSearch: '',
    rolesFilterTier: 'all',
    rolesFilterDept: 'all',
    rolesPage: 1,
    rolesPageSize: 5,
    departments: [],
    deptsSearch: '',
    deptsFilterStatus: 'all',
    deptsPage: 1,
    deptsPageSize: 10,
    navigationConfig: {
      main_nav_enabled: true,
      workspace_nav_enabled: true,
      items: [],
    },
    navSearch: '',
    navFilterGroup: 'all',
    navFilterStatus: 'all',
    srFilterStatus: 'all',
    createEventSearch: '',
    selectedDispatchEventId: '',
    rollCallSearch: '',
    rollCallCpFilter: 'all',
    rollCallRoleFilter: 'all',
    vsSearch: '',
    vsPage: 1,
    vsPerPage: 10,
    currentVerification: null,
    selectedCrewId: 6,

    // Table filters
    overviewTab: 'all',
    directoryTab: 'all',
    overviewSearch: '',
    directorySearch: '',
    tierFilter: 'all',
    gateStateFilter: 'all',

    // Checkpoints directory filters & pagination (5 items per page)
    eventsHubTab: 'directory',
    checkpointTab: 'all',
    checkpointSearch: '',
    checkpointPage: 1,
    checkpointPerPage: 5,

    // Facility & Personnel Allocation Map
    selectedMapCheckpoint: { type: 'event_venue', id: 1 },
    mapViewMode: 'chart',
    mapFilter: 'all',

    // Users & Roles CRUD Manager
    usersTab: 'all',
    usersSearch: '',
    usersFilterDept: 'all',
    usersFilterTier: 'all',
    usersPage: 1,
    usersPerPage: 5,

    // Facilities & Checkpoints CRUD Manager
    stockManager: {
      activeTab: 'warehouses',
      warehouses: [],
      stats: {
        total_warehouses: 0,
      },
      whSearch: '',
      whPage: 1,
      whPerPage: 5,
      evSearch: '',
      evPage: 1,
      evPerPage: 5,
    },

    // User Activity Timeline pagination (5 items per page)
    timelineSearch: '',
    timelineScope: 'all',
    timelinePage: 1,
    timelinePerPage: 5,

    // Crew Roster pagination (5 items per page)
    overviewPage: 1,
    overviewPerPage: 5,
    directoryPage: 1,
    directoryPerPage: 5,

    // Standalone Gate Terminals & On-Site Portals CRUD
    standalonePortals: [],
    portalsTypeFilter: 'all',
    portalsSearch: '',

    // System Settings & Interactive Flow Explorer
    settingsTab: 'flow',
    settingsFlowIdx: 0,
    settingsNodeIdx: 0,
    totpEnabled: false,
    reliefTokens: [],
    sessionReliefUrls: {},
    brandingFonts: [],
    brandingConfig: {
      brand_name: 'aBility',
      logo_path: '',
      logo_url: 'assets/rwanda-events-logo.png',
      favicon_path: '',
      favicon_url: 'assets/icons/favicon-64.png',
      logo_size_px: 34,
      primary_color: '#4f46e5',
      accent_color: '#10b981',
      neutral_color: '#64748b',
      font_family: 'Marvel',
      font_scale: 1.0,
      text_align: 'left',
      default_theme: 'system',
    },
    rosterDeptFilter: 'all',
    deferredPwaPrompt: null,

    // Current Operator Session & Alerts
    currentUser: null,
    unreadNotifCount: 0,
    readNotifIds: new Set(),
    notifications: [],

    // Anti-Shadowing QR, Random Roll-Call & Event Dispatch State
    roleCapabilities: {},
    rollCallSessions: [],
    myPendingRollCall: null,
    eventCrewAssignments: {},
    eventSupportRequests: [],
    myPendingAssignments: [],
    eventDispatchLogs: [],
    selectedDispatchTier: 'tier1_command',
    pendingFaceMatchScan: null,
    vqrTimer: null,
    vqrSecondsLeft: 20,
    passQrTimer: null,
    passQrSlice: 0,
    passQrUserId: 0,
    passQrData: null,
  };

  function getOrCreateClientDeviceToken() {
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
      devTok = 'ABDEV-' + Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    try { localStorage.setItem('ability_device_tok', devTok); } catch (e) {}
    document.cookie = `ability_device_tok=${encodeURIComponent(devTok)}; path=/; max-age=31536000; SameSite=Lax`;
    return devTok;
  }

  function inferClientDeviceLabel() {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'Android Browser';
    if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad';
    if (/Windows/i.test(ua)) return 'Windows Terminal';
    if (/Mac/i.test(ua)) return 'Mac Browser';
    return 'Web Browser';
  }

  // Attach per-session X-CSRF-Token automatically on mutating POST requests to api.php
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const rawFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      const methodStr = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (methodStr === 'POST' && urlStr.includes('api.php')) {
        const token = state.csrfToken || getMetaCsrfToken();
        if (token) {
          const nextInit = Object.assign({}, init);
          const hdrs = new Headers(nextInit.headers || (typeof input !== 'string' && input && input.headers) || {});
          if (!hdrs.has('X-CSRF-Token')) {
            hdrs.set('X-CSRF-Token', token);
          }
          nextInit.headers = hdrs;
          return rawFetch(input, nextInit);
        }
      }
      return rawFetch(input, init);
    };
  }

  const TIER_CYCLE = ['all', 'L1', 'L2', 'L3', 'L4'];
  const GATE_STATE_CYCLE = ['all', 'ready', 'checked_in', 'checked_out'];

  const BRANDING_FONT_STACKS = {
    'Marvel': "'Marvel', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    'Plus Jakarta Sans': "'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif",
    'JetBrains Mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  };

  function applyBrandingConfigClient(cfg = {}, fontsList = null) {
    if (Array.isArray(fontsList)) {
      state.brandingFonts = fontsList;
    }
    const merged = Object.assign({}, state.brandingConfig || {}, cfg || {});
    state.brandingConfig = merged;
    const root = document.documentElement;
    if (!root) return;

    if (merged.primary_color) {
      root.style.setProperty('--brand-primary', merged.primary_color);
      root.style.setProperty('--brand-purple', merged.primary_color);
    }
    if (merged.accent_color) root.style.setProperty('--brand-accent', merged.accent_color);
    if (merged.neutral_color) root.style.setProperty('--brand-neutral', merged.neutral_color);

    // Inject @font-face rules & stylesheet links for custom fonts live
    const fonts = state.brandingFonts || [];
    if (fonts.length && typeof document !== 'undefined') {
      let rtStyle = document.getElementById('ability-branding-fonts-runtime');
      if (!rtStyle) {
        rtStyle = document.createElement('style');
        rtStyle.id = 'ability-branding-fonts-runtime';
        document.head.appendChild(rtStyle);
      }
      const cssRules = [];
      fonts.forEach((f) => {
        if (!f || Number(f.is_active ?? 1) !== 1) return;
        if (f.file_path) {
          const safeFam = String(f.font_name || '').replace(/[^A-Za-z0-9 _-]/g, '');
          const fmt = ['woff2', 'woff', 'truetype', 'opentype'].includes(f.font_format) ? f.font_format : 'woff2';
          cssRules.push(`@font-face{font-family:'${safeFam}';src:url('${f.file_path}') format('${fmt}');font-display:swap;}`);
        }
        if (f.font_url && /^https:\/\//i.test(f.font_url)) {
          const linkId = `ability-font-link-${f.id || safeHashStr(f.font_url)}`;
          if (!document.getElementById(linkId)) {
            const lk = document.createElement('link');
            lk.id = linkId;
            lk.rel = 'stylesheet';
            lk.href = f.font_url;
            document.head.appendChild(lk);
          }
        }
      });
      rtStyle.textContent = cssRules.join('\n');
    }

    const customFontMatch = fonts.find((f) => f && f.font_name === merged.font_family);
    const fontStack = (customFontMatch && customFontMatch.css_stack) || BRANDING_FONT_STACKS[merged.font_family] || BRANDING_FONT_STACKS.Marvel;
    root.style.setProperty('--brand-font-family', fontStack);
    root.style.setProperty('--font-sans', fontStack);
    const scaleNum = Math.max(0.85, Math.min(1.25, Number(merged.font_scale || 1)));
    root.style.setProperty('--brand-font-scale', scaleNum.toFixed(2));
    const align = ['left', 'center', 'justify'].includes(String(merged.text_align)) ? merged.text_align : 'left';
    root.style.setProperty('--brand-text-align', align);
    root.setAttribute('data-text-align', align);

    const logoSizePx = Math.max(24, Math.min(48, Number(merged.logo_size_px || 34)));
    root.style.setProperty('--brand-logo-size', `${logoSizePx}px`);

    if (merged.brand_name) {
      document.querySelectorAll('.brand-name, .js-brand-name').forEach((el) => {
        el.textContent = merged.brand_name;
      });
    }
    const logoSrc = merged.logo_url || merged.logo_path || 'assets/rwanda-events-logo.png';
    document.querySelectorAll('.brand-mark-wrap img, .js-brand-logo-img, img[data-brand-logo="1"]').forEach((img) => {
      img.setAttribute('data-brand-logo', '1');
      if (img.getAttribute('src') !== logoSrc) {
        img.src = logoSrc;
      }
      if (merged.brand_name) img.alt = merged.brand_name;
    });
    const logoPrev = document.getElementById('branding-logo-preview');
    if (logoPrev && logoPrev.getAttribute('src') !== logoSrc) {
      logoPrev.src = logoSrc;
    }
    const favSrc = merged.favicon_url || merged.favicon_path || logoSrc || 'assets/icons/favicon-64.png';
    if (favSrc && typeof document !== 'undefined') {
      document.querySelectorAll('link[rel*="icon"]').forEach((lk) => {
        if (lk.getAttribute('href') !== favSrc) {
          lk.setAttribute('href', favSrc);
        }
      });
    }
  }

  function safeHashStr(s) {
    let h = 0;
    for (let i = 0; i < String(s || '').length; i += 1) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function applyAccessibilityPreferences() {
    const root = document.documentElement;
    if (!root) return;
    try {
      const hc = localStorage.getItem('ability_a11y_high_contrast') === '1';
      const lg = localStorage.getItem('ability_a11y_large_text') === '1';
      const rm = localStorage.getItem('ability_a11y_reduced_motion') === '1';
      if (hc) root.setAttribute('data-contrast', 'high');
      else root.removeAttribute('data-contrast');
      if (rm) root.setAttribute('data-reduced-motion', '1');
      else root.removeAttribute('data-reduced-motion');
      const baseScale = Number(state.brandingConfig?.font_scale || 1);
      const effectiveScale = lg ? Math.min(1.30, +(baseScale * 1.12).toFixed(2)) : baseScale;
      root.style.setProperty('--brand-font-scale', effectiveScale.toFixed(2));
    } catch (_) {}
  }

  // Offline-First IndexedDB Cache (`ability_offline_v1`) for Verification Roster Metadata
  const AbilityMainOffline = (() => {
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
    async function saveRoster(crewList, checkpoints) {
      try {
        const db = await openDb();
        const sanitizedCrew = (crewList || []).map((c) => ({
          id: c.id,
          full_name: c.full_name,
          badge_code: c.badge_code,
          rfid_uid: c.rfid_uid,
          role_display: c.role_display,
          department: c.department,
          clearance_code: c.clearance_code,
          clearance_color: c.clearance_color,
          badge_status: c.badge_status,
          daily_state: c.daily_state,
          checkpoint_authorized: !!c.checkpoint_authorized,
          stock_authorized: !!c.stock_authorized,
        }));
        const tx = db.transaction('rosters', 'readwrite');
        tx.objectStore('rosters').put({
          key: 'main_roster',
          crew: sanitizedCrew,
          checkpoints: (checkpoints?.directory || []).map((d) => ({
            id: d.id, type: d.type, name: d.name, call_time: d.call_time, geofence_radius_m: d.geofence_radius_m || 200,
          })),
          updated_at: new Date().toISOString(),
        });
      } catch (_) {}
    }
    async function getStatus() {
      try {
        const db = await openDb();
        return await new Promise((resolve) => {
          const req = db.transaction('rosters', 'readonly').objectStore('rosters').get('main_roster');
          req.onsuccess = () => {
            const val = req.result;
            resolve(val ? { cached: true, count: (val.crew || []).length, updated_at: val.updated_at } : { cached: false, count: 0, updated_at: null });
          };
          req.onerror = () => resolve({ cached: false, count: 0, updated_at: null });
        });
      } catch (_) { return { cached: false, count: 0, updated_at: null }; }
    }
    async function clearAll() {
      try {
        const db = await openDb();
        db.transaction('rosters', 'readwrite').objectStore('rosters').clear();
      } catch (_) {}
    }
    return { saveRoster, getStatus, clearAll };
  })();

  function updateNetworkStatusUi() {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    const pill = document.getElementById('topbar-network-pill');
    const txt = document.getElementById('topbar-network-text');
    if (pill) pill.classList.toggle('is-offline', !isOnline);
    if (txt) txt.textContent = isOnline ? 'Online' : 'Offline Mode';
    document.querySelectorAll('[data-online-only="1"]').forEach((el) => {
      if (isOnline) {
        el.removeAttribute('data-online-disabled');
        if (el.dataset.prevTitle) {
          el.title = el.dataset.prevTitle;
        }
      } else {
        if (!el.dataset.prevTitle && el.title) el.dataset.prevTitle = el.title;
        el.setAttribute('data-online-disabled', '1');
        el.title = 'Online Only: reconnect to Internet to run this mutation.';
      }
    });
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function resolveToastTone(message, toneOrOpts) {
    if (toneOrOpts && typeof toneOrOpts === 'string' && toneOrOpts !== 'auto') {
      return toneOrOpts;
    }
    if (toneOrOpts && typeof toneOrOpts === 'object' && toneOrOpts.tone) {
      return toneOrOpts.tone;
    }
    const lower = String(message || '').toLowerCase();
    if (/(failed|error|denied|invalid|cannot|blocked|rejected|mismatch|unable)/.test(lower)) return 'error';
    if (/(adjusted|warning|locked|offline|removed|cleared|expired)/.test(lower)) return 'warning';
    if (/(created|updated|saved|deleted|approved|granted|assigned|fulfilled|unlocked|captured|copied|ready|enabled|disabled|reset)/.test(lower)) return 'success';
    return 'info';
  }

  function showToast(message, toneOrOpts = 'auto') {
    const container = document.getElementById('toast-notification');
    if (!container || !message) return;
    const tone = resolveToastTone(message, toneOrOpts);
    const titleMap = {
      success: 'Saved & Applied',
      error: 'Action Failed',
      warning: 'Notice',
      info: 'Update',
    };
    const iconMap = {
      success: '✓',
      error: '!',
      warning: '⚠',
      info: 'i',
    };
    const customTitle = (toneOrOpts && typeof toneOrOpts === 'object' && toneOrOpts.title) ? toneOrOpts.title : (titleMap[tone] || 'Update');
    const duration = (toneOrOpts && typeof toneOrOpts === 'object' && Number(toneOrOpts.duration)) || 4000;

    while (container.children.length >= 4) {
      container.firstElementChild?.remove();
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast-item tone-${escapeHtml(tone)}`;
    toastEl.innerHTML = `
      <span class="toast-item-icon" aria-hidden="true">${iconMap[tone] || 'i'}</span>
      <div class="toast-item-body">
        <div class="toast-item-title">${escapeHtml(customTitle)}</div>
        <div class="toast-item-msg">${escapeHtml(message)}</div>
      </div>
      <button type="button" class="toast-item-close" aria-label="Dismiss notification">×</button>
    `;

    const dismiss = () => {
      toastEl.classList.remove('visible');
      setTimeout(() => toastEl.remove(), 220);
    };
    toastEl.querySelector('.toast-item-close')?.addEventListener('click', dismiss);

    container.appendChild(toastEl);
    requestAnimationFrame(() => toastEl.classList.add('visible'));
    setTimeout(dismiss, duration);
  }

  function applyBootstrapPayload(data, preserveCurrentVerification = false) {
    if (!data || !data.ok) return;
    if (data.csrfToken) {
      state.csrfToken = String(data.csrfToken);
    }
    state.dbSource = data.dbSource || 'ability_db';
    if (Array.isArray(data.clearanceMatrix) && data.clearanceMatrix.length > 0) {
      state.clearanceMatrix = data.clearanceMatrix;
    }
    state.checkpoints = data.checkpoints || { stock_warehouses: [], event_venues: [], directory: [] };
    if (data.activeCheckpoint) {
      state.activeCheckpoint = data.activeCheckpoint;
      state.checkpointType = data.activeCheckpoint.type;
      state.checkpointId = Number(data.activeCheckpoint.id);
    }
    if (data.kpis) {
      state.kpis = data.kpis;
    }
    state.rollCallList = Array.isArray(data.rollCallList) ? data.rollCallList : [];
    state.crew = Array.isArray(data.crew) ? data.crew : [];
    state.hourlyTraffic = Array.isArray(data.hourlyTraffic) ? data.hourlyTraffic : [];
    state.activityTimeline = Array.isArray(data.activityTimeline) ? data.activityTimeline : [];
    state.shiftRequests = Array.isArray(data.shiftRequests) ? data.shiftRequests : [];
    state.pendingShiftRequestCount = Number(data.pendingShiftRequestCount ?? state.shiftRequests.filter((r) => r.status === 'pending').length);
    if (Array.isArray(data.read_notif_ids)) {
      state.readNotifIds = new Set(data.read_notif_ids.map((id) => String(id)));
    }
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      state.roles = data.roles;
    } else if (state.roles.length === 0) {
      // Default fallback roles
      state.roles = [
        { id: 1, role_key: 'admin', title: 'Administrator', clearance_level: 'L4_ALL_ACCESS', clearance_code: 'L4', clearance_title: 'Level 4 - All Access', clearance_color: '#10b981', department: 'Executive', description: 'Full operational control, security matrix management, user provision and badge issuance.', is_system: 1, is_active: 1, staff_count: 1 },
        { id: 2, role_key: 'stock_controller', title: 'Gate Controller', clearance_level: 'L3_STOCK_WAREHOUSE', clearance_code: 'L3', clearance_title: 'Level 3 - Gate Controller', clearance_color: '#8b5cf6', department: 'Operations', description: 'Strictly assigned to one Gate Terminal (#pane-kiosk) for live attendance check-in/out scanning.', is_system: 1, is_active: 1, staff_count: 2 },
        { id: 3, role_key: 'tech_lead', title: 'Technical Lead', clearance_level: 'L4_ALL_ACCESS', clearance_code: 'L4', clearance_title: 'Level 4 - All Access', clearance_color: '#10b981', department: 'Production', description: 'Supervises audio, video, lighting and rigging operations across all checkpoints.', is_system: 1, is_active: 1, staff_count: 1 },
        { id: 4, role_key: 'technician', title: 'Stage & Audio Technician', clearance_level: 'L2_TECH_STAGE', clearance_code: 'L2', clearance_title: 'Level 2 - Technical & Stage', clearance_color: '#3b82f6', department: 'Audio', description: 'Configures FOH audio arrays, monitor consoles, and mic systems on stage and FOH.', is_system: 1, is_active: 1, staff_count: 8 },
        { id: 5, role_key: 'sound_engineer', title: 'Lead Sound Engineer', clearance_level: 'L2_TECH_STAGE', clearance_code: 'L2', clearance_title: 'Level 2 - Technical & Stage', clearance_color: '#3b82f6', department: 'Audio', description: 'Lead acoustic calibration and sound engineering for live events and concert tours.', is_system: 0, is_active: 1, staff_count: 2 },
        { id: 6, role_key: 'lighting_tech', title: 'Lighting Technician', clearance_level: 'L2_TECH_STAGE', clearance_code: 'L2', clearance_title: 'Level 2 - Technical & Stage', clearance_color: '#3b82f6', department: 'Lighting', description: 'DMX universes routing, moving-head fixtures, dimmer racks and stage wash fixtures.', is_system: 0, is_active: 1, staff_count: 2 },
        { id: 7, role_key: 'video_director', title: 'Video Director', clearance_level: 'L2_TECH_STAGE', clearance_code: 'L2', clearance_title: 'Level 2 - Technical & Stage', clearance_color: '#3b82f6', department: 'Video', description: 'Controls LED video walls, SDI fiber transmission, switchers, and live camera chains.', is_system: 0, is_active: 1, staff_count: 1 },
        { id: 8, role_key: 'stage_manager', title: 'Stage Manager', clearance_level: 'L2_TECH_STAGE', clearance_code: 'L2', clearance_title: 'Level 2 - Technical & Stage', clearance_color: '#3b82f6', department: 'Production', description: 'Directs stage crew, backstage call-time coordination, and cueing.', is_system: 0, is_active: 1, staff_count: 1 },
        { id: 9, role_key: 'rigging_lead', title: 'Rigging Lead', clearance_level: 'L2_TECH_STAGE', clearance_code: 'L2', clearance_title: 'Level 2 - Technical & Stage', clearance_color: '#3b82f6', department: 'Rigging', description: 'Motors, truss rigging, load calculations and safety cable inspections overhead.', is_system: 0, is_active: 1, staff_count: 1 },
        { id: 10, role_key: 'user', title: 'Venue Crew', clearance_level: 'L1_VENUE_BASIC', clearance_code: 'L1', clearance_title: 'Level 1 - Venue Basic', clearance_color: '#64748b', department: 'Production', description: 'General event venue operations and support staff. Stock warehouse access restricted.', is_system: 0, is_active: 1, staff_count: 1 },
        { id: 11, role_key: 'security', title: 'Security Officer', clearance_level: 'L1_VENUE_BASIC', clearance_code: 'L1', clearance_title: 'Level 1 - Venue Basic', clearance_color: '#64748b', department: 'Security', description: 'Front of house and gate security perimeter verification.', is_system: 0, is_active: 1, staff_count: 1 },
        { id: 12, role_key: 'driver', title: 'Logistics Driver', clearance_level: 'L1_VENUE_BASIC', clearance_code: 'L1', clearance_title: 'Level 1 - Venue Basic', clearance_color: '#64748b', department: 'Logistics', description: 'Cross-facility crew shuttle, loading bay check-in, and transit logistics.', is_system: 0, is_active: 1, staff_count: 1 },
      ];
    }

    if (Array.isArray(data.departments)) {
      state.departments = data.departments;
    }

    if (Array.isArray(data.standalonePortals)) {
      state.standalonePortals = data.standalonePortals;
    }

    if (typeof data.totpEnabled !== 'undefined') {
      state.totpEnabled = Boolean(data.totpEnabled);
    }
    if (Array.isArray(data.reliefTokens)) {
      state.reliefTokens = data.reliefTokens;
    }
    if (Array.isArray(data.brandingFonts)) {
      state.brandingFonts = data.brandingFonts;
    }
    if (data.roleCapabilities && typeof data.roleCapabilities === 'object') {
      state.roleCapabilities = data.roleCapabilities;
    }
    if (Array.isArray(data.rollCallSessions)) {
      state.rollCallSessions = data.rollCallSessions;
    }
    state.myPendingRollCall = data.myPendingRollCall || null;
    if (data.eventCrewAssignments && typeof data.eventCrewAssignments === 'object') {
      state.eventCrewAssignments = data.eventCrewAssignments;
    }
    if (Array.isArray(data.eventSupportRequests)) {
      state.eventSupportRequests = data.eventSupportRequests;
    }
    if (Array.isArray(data.myPendingAssignments)) {
      state.myPendingAssignments = data.myPendingAssignments;
    }
    if (Array.isArray(data.eventDispatchLogs)) {
      state.eventDispatchLogs = data.eventDispatchLogs;
    }
    if (data.brandingConfig && typeof data.brandingConfig === 'object') {
      applyBrandingConfigClient(data.brandingConfig, data.brandingFonts || null);
      applyAccessibilityPreferences();
    }

    if (data.navigationConfig && Array.isArray(data.navigationConfig.items)) {
      state.navigationConfig = {
        main_nav_enabled: data.navigationConfig.main_nav_enabled !== false,
        workspace_nav_enabled: data.navigationConfig.workspace_nav_enabled !== false,
        items: data.navigationConfig.items,
      };
      try {
        localStorage.setItem('ability_nav_config', JSON.stringify(state.navigationConfig));
      } catch (e) {}
    }

    if (data.currentUser) {
      state.currentUser = data.currentUser;
    } else if (!state.currentUser && state.crew.length > 0) {
      state.currentUser = state.crew.find((c) => Number(c.id) === 2) || state.crew[0];
    }

    AbilityMainOffline.saveRoster(state.crew, state.checkpoints);

    if (!preserveCurrentVerification || !state.currentVerification) {
      const selectedMember = state.crew.find((c) => Number(c.id) === Number(state.selectedCrewId));
      if (selectedMember) {
        state.currentVerification = buildClientVerificationFromMember(selectedMember);
      } else if (data.defaultVerification) {
        state.currentVerification = data.defaultVerification;
        if (data.defaultVerification.badge && data.defaultVerification.badge.user_id) {
          state.selectedCrewId = Number(data.defaultVerification.badge.user_id);
        }
      }
    }

    renderAll();
  }

  function buildClientVerificationFromMember(member) {
    const cp = state.activeCheckpoint;
    const isStock = cp.type === 'stock_warehouse';
    const cpCallTime = (cp && cp.call_time) || '08:00';
    const now = new Date();
    const [cH, cM] = cpCallTime.split(':').map(Number);
    const schedDate = new Date();
    schedDate.setHours(cH || 8, cM || 0, 0, 0);
    const diffMinutes = Math.round((now - schedDate) / 60000);

    const isCheckedIn = member.daily_state === 'checked_in';
    const isLate = !isCheckedIn && diffMinutes > 15;
    const isLockedLate = member.badge_status === 'disabled_late' || (isLate && member.badge_status !== 'active');

    let isAllowed = member.badge_status === 'active' && (!isStock || member.clearance_code !== 'L1');
    let reason = isAllowed
      ? (isCheckedIn
          ? `Currently Checked In at ${member.last_checkpoint_name || cp.name}`
          : `Authorized for ${isStock ? 'Stock Warehouse' : 'Event Venue'} access (${member.clearance_code} — ${member.clearance_short})`)
      : (member.badge_status !== 'active'
          ? `ID Badge is currently ${String(member.badge_status).toUpperCase()}`
          : 'Level 1 (Venue Crew) is not authorized for Stock Warehouses');

    let punctuality = member.punctuality_code || 'on_time';
    let punctualityLabel = isAllowed ? (member.punctuality || 'ON TIME') : 'ACCESS RESTRICTED';

    if (isCheckedIn) {
      punctuality = 'on_time';
      punctualityLabel = 'SHIFT CHECK-OUT';
    } else if (isLate) {
      punctuality = 'late';
      punctualityLabel = 'LATE CALL-TIME';
      if (!isAllowed) {
        reason = 'Late Call-Time Lockout — Requires Supervisor Override';
      }
    } else if (diffMinutes < -10) {
      punctuality = 'early';
      punctualityLabel = 'EARLY ARRIVAL';
    }

    const roleUpper = String(member.role || 'technician').replace(/_/g, ' ').toUpperCase();
    const deptUpper = String(member.department || 'OPERATIONS').toUpperCase();

    // Cross-facility transit is ONLY active if the user was checked in at another facility without having signed out!
    const isCrossFacilityUnsigned = Boolean(
      isCheckedIn &&
      member.last_checkpoint_id &&
      cp &&
      Number(member.last_checkpoint_id) !== Number(cp.id)
    );

    return {
      ok: true,
      allowed: isAllowed,
      reason: reason,
      action: isCheckedIn ? 'check_out' : 'check_in',
      punctuality: punctuality,
      punctuality_label: punctualityLabel,
      call_time: cpCallTime,
      diff_minutes: diffMinutes,
      checkpoint_type: cp.type,
      checkpoint_id: cp.id,
      checkpoint_name: cp.name,
      scanned_at: new Date().toLocaleTimeString(),
      check_in_time: member.check_in_full || member.check_in_time || null,
      check_out_time: member.check_out_full || member.check_out_time || null,
      is_transit_transfer: isCrossFacilityUnsigned,
      transit_from: isCrossFacilityUnsigned ? (member.last_checkpoint_name || 'Stock Warehouse') : null,
      transit_to: isCrossFacilityUnsigned ? cp.name : null,
      badge: {
        user_id: member.id,
        full_name: member.full_name,
        username: member.username,
        role: member.role,
        role_pill: `${roleUpper} - ${deptUpper}`,
        department: member.department,
        phone: member.phone,
        profile_image: member.profile_image_url,
        initials: member.initials,
        badge_code: member.badge_code,
        raw_badge_code: member.raw_badge_code,
        staff_code: member.staff_code,
        clearance_level: member.clearance_level,
        clearance_code: member.clearance_code,
        clearance_title: member.clearance_title,
        clearance_short: member.clearance_short,
        clearance_color: member.clearance_color,
        badge_status: member.badge_status,
        daily_state: member.daily_state,
      },
    };
  }

  function findCrewMember(query) {
    if (!query) return null;
    const q = String(query).trim().toLowerCase();
    if (!q) return null;

    // 1. Exact match on badge_code (case-insensitive)
    let match = state.crew.find((c) => (c.badge_code || '').toLowerCase() === q);
    if (match) return match;

    // 2. Exact match on staff_code (e.g. ABL-006 or ABL-6)
    match = state.crew.find((c) => (c.staff_code || '').toLowerCase() === q);
    if (match) return match;

    // 3. Exact match on RFID
    match = state.crew.find((c) => (c.rfid_uid || '').toLowerCase() === q);
    if (match) return match;

    // 4. Exact match on numeric id or ABL-id
    match = state.crew.find((c) => String(c.id) === q || `abl-${c.id}` === q);
    if (match) return match;

    // 5. Prefix/Substring match on badge_code or staff_code
    match = state.crew.find(
      (c) =>
        (c.badge_code || '').toLowerCase().includes(q) ||
        (c.staff_code || '').toLowerCase().includes(q)
    );
    if (match) return match;

    // 6. Username match
    match = state.crew.find(
      (c) => (c.username || '').toLowerCase() === q || (c.username || '').toLowerCase().includes(q)
    );
    if (match) return match;

    // 7. Full name match
    match = state.crew.find((c) => (c.full_name || '').toLowerCase().includes(q));
    if (match) return match;

    return null;
  }

  function highlightSelectedCrewRow(crewId) {
    document.querySelectorAll('.attendee-table-row[data-crew-id]').forEach((row) => {
      const isSel = Number(row.getAttribute('data-crew-id')) === Number(crewId);
      row.classList.toggle('kiosk-selected-row', isSel);
      const cb = row.querySelector('.custom-checkbox');
      if (cb) cb.setAttribute('aria-checked', isSel ? 'true' : 'false');
    });
  }

  async function fetchBootstrap(preserveVerification = false) {
    try {
      const url = `api.php?action=bootstrap&checkpoint_type=${encodeURIComponent(state.checkpointType)}&checkpoint_id=${encodeURIComponent(state.checkpointId)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse API response as JSON:', parseErr, text.slice(0, 300));
        return;
      }
      if (data && data.ok) {
        applyBootstrapPayload(data, preserveVerification);
      }
    } catch (err) {
      console.warn('Bootstrap fetch fallback:', err);
    }
  }

  // Live background sync for Gate Tech Lead (auto-polls every 6 seconds)
  let liveGateSyncTimer = null;
  function startLiveGateSync() {
    if (liveGateSyncTimer) clearInterval(liveGateSyncTimer);
    liveGateSyncTimer = setInterval(async () => {
      // Don't refresh if user is currently typing in an input or has an open editing modal
      const hasModal = document.querySelector('.modal.open');
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      if (hasModal || isTyping) return;

      try {
        await fetchBootstrap(true);
      } catch (e) {
        // silent polling catch
      }
    }, 6000);
  }

  // =========================================================================
  // KIOSK CONTROLLER: MODAL RESULTS & AUTO-RETURN TO SEARCH
  // =========================================================================

  let kioskCountdownTimer = null;
  let kioskCountdownInterval = null;
  let kioskCountdownRemaining = 0;
  let kioskCountdownDuration = 4000;
  let kioskCountdownPaused = false;

  // Camera is disabled per configuration — scanner operates via optical barcode reader & input search
  function startKioskCamera() {}
  function stopKioskCamera() {}

  // Web Audio Synthesizer for high-fidelity sensory feedback (Zero audio file dependencies)
  const audioCtx =
    typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
      ? new (window.AudioContext || window.webkitAudioContext)()
      : null;

  function playKioskChime(type = 'approve') {
    if (state.kioskMuted || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'approve') {
        // High ascending two-tone chime (D5 -> A5)
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'checkout') {
        // Descending two-tone chime (G5 -> C5)
        osc.frequency.setValueAtTime(784, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.14);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'decline' || type === 'late') {
        // Low cautionary buzzer (A3 -> G3)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(196, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.32);
      }
    } catch (e) {}
  }

  async function confirmGateAction(decision, extra = {}) {
    const v = state.currentVerification;
    if (!v || !v.badge) return;

    clearKioskCountdown();

    const payload = {
      action: 'confirm_gate_action',
      user_id: v.badge.user_id,
      badge_code: v.badge.badge_code,
      decision: decision,
      checkpoint_type: state.checkpointType,
      checkpoint_id: state.checkpointId,
      decline_reason: extra.decline_reason || '',
      supervisor_id: extra.supervisor_id || state.currentUser?.id || 0,
      supervisor_pin: extra.supervisor_pin || '',
      override_reason: extra.override_reason || '',
    };

    try {
      const res = await fetch('api.php?action=confirm_gate_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok && data.error) {
        showToast(data.error);
        playKioskChime('decline');
        return;
      }

      data.confirmed = true;
      state.currentVerification = data;
      state.timelinePage = 1;
      if (data.bootstrap) {
        applyBootstrapPayload(data.bootstrap, true);
      } else {
        renderAll();
      }
      if (state.timelineRange && state.timelineRange !== 'today') {
        fetchAttendanceReport(state.timelineRange);
      }

      if (decision === 'approve_out') {
        playKioskChime('checkout');
      } else if (decision === 'decline_in') {
        playKioskChime('decline');
      } else {
        playKioskChime('approve');
      }

      const pOv = document.getElementById('kiosk-override-panel');
      const pDec = document.getElementById('kiosk-decline-panel');
      const pinOv = document.getElementById('kiosk-override-pin');
      if (pOv) pOv.style.display = 'none';
      if (pDec) pDec.style.display = 'none';
      if (pinOv) pinOv.value = '';

      renderVerificationDeck();

      const name = data.badge ? data.badge.full_name : v.badge.full_name;
      const statusMsg = decision === 'approve_out'
        ? `${name}: Shift Checked Out`
        : (decision === 'decline_in'
          ? `${name}: Entry Declined (${data.reason || extra.decline_reason || 'Declined'})`
          : `${name}: Access Granted (${data.punctuality_label || 'Approved'})`);
      showToast(statusMsg);

      startKioskCountdown(3200);
    } catch (err) {
      showToast('Error communicating with Gate Terminal API');
      playKioskChime('decline');
    }
  }

  function clearKioskCountdown() {
    if (kioskCountdownTimer) {
      clearTimeout(kioskCountdownTimer);
      kioskCountdownTimer = null;
    }
    if (kioskCountdownInterval) {
      clearInterval(kioskCountdownInterval);
      kioskCountdownInterval = null;
    }
    kioskCountdownPaused = false;
    const prog = document.getElementById('kiosk-timeout-progress');
    if (prog) prog.style.width = '100%';
  }

  function returnToSearchInput() {
    clearKioskCountdown();
    closeKioskModal();
    const inp = document.getElementById('kiosk-badge-input');
    const clearBtn = document.getElementById('kiosk-input-clear-btn');
    const matchTag = document.getElementById('kiosk-search-match-tag');
    if (inp) inp.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (matchTag) {
      matchTag.style.display = 'none';
      matchTag.textContent = '';
    }
    if (inp && state.activeScreen === 'terminals' && !state.terminalScreenLocked) {
      setTimeout(() => {
        inp.focus();
      }, 60);
    }
  }

  function showVerificationCard() {
    const card = document.getElementById('kiosk-verification-card');
    if (card) card.style.display = 'grid';
  }

  function startKioskCountdown(durationMs = 4000) {
    clearKioskCountdown();
    showVerificationCard();

    kioskCountdownDuration = durationMs;
    kioskCountdownRemaining = durationMs;
    kioskCountdownPaused = false;

    const prog = document.getElementById('kiosk-timeout-progress');
    const label = document.getElementById('kiosk-timeout-label');
    const card = document.getElementById('kiosk-verification-card');
    let lastTick = Date.now();

    if (prog) prog.style.width = '100%';
    if (label) label.textContent = `Auto-closing in ${Math.ceil(durationMs / 1000)}s...`;

    // Pause countdown when hovering over the card so user can review info comfortably
    if (card && !card.__hasHoverListeners) {
      card.__hasHoverListeners = true;
      card.addEventListener('mouseenter', () => {
        kioskCountdownPaused = true;
        const l = document.getElementById('kiosk-timeout-label');
        if (l) l.textContent = 'Paused (Hovering)';
      });
      card.addEventListener('mouseleave', () => {
        kioskCountdownPaused = false;
        lastTick = Date.now();
      });
    }

    kioskCountdownInterval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      if (!kioskCountdownPaused) {
        kioskCountdownRemaining = Math.max(0, kioskCountdownRemaining - delta);
        const remainingSec = Math.ceil(kioskCountdownRemaining / 1000);
        const pct = Math.max(0, (kioskCountdownRemaining / kioskCountdownDuration) * 100);

        if (prog) prog.style.width = `${pct}%`;
        if (label) label.textContent = `Auto-closing in ${remainingSec}s...`;

        if (kioskCountdownRemaining <= 0) {
          clearKioskCountdown();
          returnToSearchInput();
        }
      }
    }, 50);
  }

  let gateScanInFlight = false;
  const OFFLINE_QUEUE_KEY = 'ability_offline_scan_queue_v1';
  let offlineSyncInFlight = false;
  let cameraStream = null;
  let cameraScanTimer = null;
  let cameraFacingMode = 'environment';
  let cameraBarcodeDetector = null;
  let cameraOffscreenCanvas = null;
  let lastCameraCode = '';
  let lastCameraCodeAt = 0;

  function formatLocalSqlNow(dateObj = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
  }

  function loadOfflineQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveOfflineQueue(list) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(list));
    } catch (_) {}
    renderOfflineQueueBar();
  }

  function enqueueOfflineScan(scanInput, modeToUse) {
    const queue = loadOfflineQueue();
    queue.push({
      client_scan_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scan_input: String(scanInput || '').trim(),
      checkpoint_type: state.checkpointType,
      checkpoint_id: state.checkpointId,
      scan_mode: modeToUse || 'auto',
      offline_scanned_at: formatLocalSqlNow(),
    });
    saveOfflineQueue(queue);
    return queue.length;
  }

  function renderOfflineQueueBar() {
    const bar = document.getElementById('kiosk-offline-sync-bar');
    const netPill = document.getElementById('kiosk-network-status-pill');
    const countEl = document.getElementById('kiosk-offline-count-pill');
    const syncBtn = document.getElementById('kiosk-offline-sync-btn');
    if (!bar) return;

    const queue = loadOfflineQueue();
    const isOnline = navigator.onLine !== false;
    const locked = Boolean(state.terminalScreenLocked);

    bar.style.display = (!locked && (queue.length > 0 || !isOnline)) ? 'flex' : 'none';
    bar.classList.toggle('is-offline', !isOnline);

    if (netPill) {
      netPill.textContent = isOnline ? 'Online' : 'Offline Mode';
      netPill.className = `status-badge ${isOnline ? 'status-badge-green-sm' : 'status-badge-amber-sm'}`;
    }
    if (countEl) {
      const noun = queue.length === 1 ? 'scan' : 'scans';
      countEl.innerHTML = queue.length > 0
        ? `<strong>${queue.length}</strong> offline ${noun} pending sync`
        : 'Device is offline — new scans will queue safely on this terminal';
    }
    if (syncBtn) {
      syncBtn.style.display = queue.length > 0 ? 'inline-flex' : 'none';
      syncBtn.disabled = offlineSyncInFlight || !isOnline;
      syncBtn.textContent = offlineSyncInFlight ? 'Syncing...' : 'Sync Now';
    }

    const headerNetPill = document.getElementById('terminal-net-status-pill');
    if (headerNetPill) {
      headerNetPill.classList.remove('online', 'is-offline', 'has-queued');
      if (!isOnline) {
        headerNetPill.classList.add('is-offline');
        headerNetPill.textContent = queue.length > 0 ? `Offline · ${queue.length} Queued` : 'Offline Mode';
        headerNetPill.title = 'Terminal is offline. Scans queue safely in local storage until connection returns.';
      } else if (queue.length > 0) {
        headerNetPill.classList.add('has-queued');
        headerNetPill.textContent = offlineSyncInFlight ? `Syncing ${queue.length}...` : `Sync ${queue.length} Queued ↻`;
        headerNetPill.title = 'Click to sync queued offline scans now';
      } else {
        headerNetPill.classList.add('online');
        headerNetPill.textContent = 'Online · Synced';
        headerNetPill.title = 'Connected to server · All terminal scans synchronized';
      }
    }
  }

  async function syncOfflineScans(showFeedback = true) {
    const queue = loadOfflineQueue();
    if (queue.length === 0 || offlineSyncInFlight || navigator.onLine === false) {
      renderOfflineQueueBar();
      return;
    }

    offlineSyncInFlight = true;
    renderOfflineQueueBar();
    let syncedCount = 0;
    const remaining = [];
    let latestBootstrap = null;
    let networkAborted = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (networkAborted) {
        remaining.push(item);
        continue;
      }
      try {
        const res = await fetch('api.php?action=process_gate_scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'process_gate_scan',
            scan_input: item.scan_input,
            checkpoint_type: item.checkpoint_type,
            checkpoint_id: item.checkpoint_id,
            scan_mode: item.scan_mode || 'auto',
            offline_scanned_at: item.offline_scanned_at,
          }),
        });
        if (res.status === 401 || res.status === 403) {
          // Preserve item until user re-authenticates or switches back to locked checkpoint
          remaining.push(item);
          continue;
        }
        const data = await res.json();
        if (data && (data.ok !== false || data.duplicate_prevented)) {
          syncedCount++;
          if (data.bootstrap) latestBootstrap = data.bootstrap;
        } else {
          // Drop unrecognized/impossible conflict scans so queue doesn't block forever
          if (showFeedback && data && data.error) {
            showToast(`Offline sync skipped "${item.scan_input}": ${data.error}`);
          }
        }
      } catch (_) {
        networkAborted = true;
        remaining.push(item);
      }
    }

    offlineSyncInFlight = false;
    saveOfflineQueue(remaining);

    if (latestBootstrap) {
      applyBootstrapPayload(latestBootstrap, true);
      renderAll();
    } else if (syncedCount > 0) {
      await fetchBootstrap(true);
    }

    if (showFeedback && syncedCount > 0) {
      showToast(`Synced ${syncedCount} offline scan${syncedCount === 1 ? '' : 's'} to server.`);
    }
  }

  function setCameraStatus(msg, isError = false) {
    const statusEl = document.getElementById('kiosk-camera-status');
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', Boolean(isError));
  }

  function stopCameraScanner() {
    if (cameraScanTimer) {
      clearTimeout(cameraScanTimer);
      cameraScanTimer = null;
    }
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      cameraStream = null;
    }
    const videoEl = document.getElementById('kiosk-camera-video');
    if (videoEl) videoEl.srcObject = null;
    const panel = document.getElementById('kiosk-camera-panel');
    if (panel) panel.style.display = 'none';
    const btn = document.getElementById('kiosk-camera-toggle-btn');
    const lbl = document.getElementById('kiosk-camera-toggle-label');
    if (btn) btn.classList.remove('is-active');
    if (lbl) lbl.textContent = 'Camera Scan';
  }

  async function scanCameraFrameLoop() {
    if (!cameraStream) return;
    const videoEl = document.getElementById('kiosk-camera-video');
    const backdrop = document.getElementById('kiosk-modal-backdrop');
    const modalOpen = backdrop && backdrop.style.display === 'flex';

    if (videoEl && videoEl.readyState >= 2 && !gateScanInFlight && !modalOpen && !state.terminalScreenLocked) {
      try {
        let decodedValue = '';
        if (cameraBarcodeDetector) {
          const codes = await cameraBarcodeDetector.detect(videoEl);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            decodedValue = String(codes[0].rawValue).trim();
          }
        } else if (typeof window.jsQR === 'function' && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          if (!cameraOffscreenCanvas) cameraOffscreenCanvas = document.createElement('canvas');
          cameraOffscreenCanvas.width = videoEl.videoWidth;
          cameraOffscreenCanvas.height = videoEl.videoHeight;
          const ctx = cameraOffscreenCanvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, cameraOffscreenCanvas.width, cameraOffscreenCanvas.height);
            const imgData = ctx.getImageData(0, 0, cameraOffscreenCanvas.width, cameraOffscreenCanvas.height);
            const qr = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
            if (qr && qr.data) decodedValue = String(qr.data).trim();
          }
        }

        if (decodedValue) {
          const nowMs = Date.now();
          if (decodedValue !== lastCameraCode || (nowMs - lastCameraCodeAt) > 2200) {
            lastCameraCode = decodedValue;
            lastCameraCodeAt = nowMs;
            setCameraStatus(`Detected badge: ${decodedValue} — verifying...`, false);
            triggerGateScan(decodedValue);
          }
        }
      } catch (_) {}
    }

    if (cameraStream) {
      cameraScanTimer = setTimeout(scanCameraFrameLoop, 250);
    }
  }

  async function startCameraScanner() {
    if (state.terminalScreenLocked) {
      showToast('Unlock terminal screen first before starting camera scanner.');
      return;
    }
    const panel = document.getElementById('kiosk-camera-panel');
    const videoEl = document.getElementById('kiosk-camera-video');
    const btn = document.getElementById('kiosk-camera-toggle-btn');
    const lbl = document.getElementById('kiosk-camera-toggle-label');
    if (panel) panel.style.display = 'block';
    if (btn) btn.classList.add('is-active');
    if (lbl) lbl.textContent = 'Camera On';

    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      setCameraStatus('Camera access requires HTTPS (or localhost). Open this app over HTTPS on tablets/phones, or type/use a USB scanner.', true);
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('Camera API unavailable in this browser. Type badge code or use a USB barcode scanner.', true);
      return;
    }

    try {
      if ('BarcodeDetector' in window && !cameraBarcodeDetector) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const desired = ['qr_code', 'code_128', 'code_39', 'ean_13'].filter((f) => supported.includes(f));
          cameraBarcodeDetector = new window.BarcodeDetector(desired.length ? { formats: desired } : undefined);
        } catch (_) {
          cameraBarcodeDetector = new window.BarcodeDetector();
        }
      }

      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        cameraStream = null;
      }

      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: cameraFacingMode } },
        audio: false,
      });

      if (videoEl) {
        videoEl.srcObject = cameraStream;
        await videoEl.play().catch(() => {});
      }

      if (!cameraBarcodeDetector && typeof window.jsQR !== 'function') {
        setCameraStatus('Camera stream active, but this browser lacks BarcodeDetector (supported in Chrome/Edge/Android). Use Chrome on tablet/phone or USB scanner.', true);
      } else {
        setCameraStatus(`Live ${cameraFacingMode === 'environment' ? 'rear' : 'front'} camera active — align QR code or badge inside the green frame.`, false);
      }

      scanCameraFrameLoop();
    } catch (err) {
      setCameraStatus(`Camera access failed (${err && err.message ? err.message : 'permission denied'}). Check browser camera permission or use badge input.`, true);
    }
  }

  async function flipCameraFacing() {
    cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    if (cameraStream) {
      await startCameraScanner();
    }
  }

  async function triggerGateScan(scanInput, forcedMode = null, visualConfirmed = false) {
    if (state.terminalScreenLocked) {
      showToast('Terminal screen is LOCKED. Enter the warehouse PIN to unlock scanning.');
      const pinInp = document.getElementById('terminal-unlock-pin-input');
      if (pinInp) pinInp.focus();
      return;
    }
    if (gateScanInFlight) return;
    gateScanInFlight = true;
    const modeToUse = forcedMode || state.scanMode || 'auto';

    if (navigator.onLine === false) {
      const qCount = enqueueOfflineScan(scanInput, modeToUse);
      playKioskChime('approve');
      showToast(`Offline: Saved scan for "${scanInput}" (${qCount} queued to sync).`);
      const kioskInp = document.getElementById('kiosk-badge-input');
      if (kioskInp) kioskInp.value = '';
      gateScanInFlight = false;
      return;
    }

    try {
      const res = await fetch('api.php?action=process_gate_scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_gate_scan',
          scan_input: scanInput,
          checkpoint_type: state.checkpointType,
          checkpoint_id: state.checkpointId,
          scan_mode: modeToUse,
          visual_confirmed: visualConfirmed ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (!data.ok && data.error) {
        showToast(data.error);
        playKioskChime('decline');
        return;
      }

      if (data.visual_confirm_required && data.pending_pass_token) {
        state.pendingFaceMatchScan = {
          scan_input: data.pending_pass_token,
          scan_mode: data.action || modeToUse,
        };
        data.confirmed = false;
        if (data.badge && data.badge.user_id) {
          state.selectedCrewId = Number(data.badge.user_id);
        }
        state.currentVerification = data;
        const backdrop = document.getElementById('kiosk-modal-backdrop');
        if (backdrop) {
          backdrop.style.display = 'flex';
          backdrop.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
        }
        showVerificationCard();
        renderVerificationDeck();
        clearKioskCountdown();
        const timeoutLabel = document.getElementById('kiosk-timeout-label');
        if (timeoutLabel) timeoutLabel.textContent = 'Verify Face Match';
        playKioskChime('approve');
        showToast(`${data.badge ? data.badge.full_name : 'Presenter'}: Confirm photo matches person at gate.`);
        return;
      }

      state.pendingFaceMatchScan = null;
      // Scan has already been recorded on the backend; do not re-prompt for approval
      data.confirmed = true;

      if (data.badge && data.badge.user_id) {
        state.selectedCrewId = Number(data.badge.user_id);
      }
      state.currentVerification = data;

      state.timelinePage = 1;
      if (data.bootstrap) {
        applyBootstrapPayload(data.bootstrap, true);
      } else {
        renderAll();
      }
      if (state.timelineRange && state.timelineRange !== 'today') {
        fetchAttendanceReport(state.timelineRange);
      }

      if (!data.allowed) {
        playKioskChime('decline');
      } else if (data.action === 'check_out') {
        playKioskChime('checkout');
      } else {
        playKioskChime('approve');
      }

      // Sync kiosk input & match tag with verified badge
      const kioskInp = document.getElementById('kiosk-badge-input');
      const kioskTag = document.getElementById('kiosk-search-match-tag');
      const kioskClr = document.getElementById('kiosk-input-clear-btn');
      if (kioskInp && data.badge) {
        kioskInp.value = data.badge.badge_code || '';
        if (kioskClr) kioskClr.style.display = 'flex';
        if (kioskTag) {
          kioskTag.style.display = 'inline-flex';
          kioskTag.innerHTML = `
            <span class="tier-code-badge tier-code-${escapeHtml(data.badge.clearance_code)}">${escapeHtml(data.badge.clearance_code)}</span>
            <span>${escapeHtml(data.badge.full_name)} (${escapeHtml(data.badge.badge_code)})</span>
          `;
        }
        kioskInp.select();
      }

      // Open Centered Kiosk Modal, render Full Navy / Amber Checked-Out Card, start 4s auto-return
      const backdrop = document.getElementById('kiosk-modal-backdrop');
      if (backdrop) {
        backdrop.style.display = 'flex';
        backdrop.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
      showVerificationCard();
      renderVerificationDeck();
      startKioskCountdown(4000);

      const statusTxt = data.duplicate_prevented
        ? (data.reason || 'Scan already recorded')
        : (data.allowed
          ? `${data.action === 'check_out' ? 'CHECKED OUT' : 'ACCESS GRANTED'}`
          : `ACCESS DENIED — ${data.reason}`);
      showToast(`${data.badge ? data.badge.full_name : scanInput}: ${statusTxt}`);
    } catch (err) {
      if (navigator.onLine === false || (err && err.name === 'TypeError')) {
        const qCount = enqueueOfflineScan(scanInput, modeToUse);
        playKioskChime('approve');
        showToast(`Network unreachable: Queued "${scanInput}" offline (${qCount} pending sync).`);
      } else {
        showToast('Error communicating with Gate Terminal API');
      }
    } finally {
      gateScanInFlight = false;
    }
  }

  function switchScreen(screenKey, scrollToId = null) {
    if (screenKey !== 'terminals') {
      stopCameraScanner();
    }

    // Redirect merged routes cleanly into consolidated hubs before permission checks
    if (screenKey === 'analytics' || screenKey === 'access-matrix') {
      if (!isCurrentUserAdmin()) {
        showToast('Access Restricted: Security Clearance Matrix requires Administrator privileges.');
        if (isCurrentUserStockController() || isCurrentUserTechnician()) {
          screenKey = 'terminals';
          scrollToId = 'pane-kiosk';
        } else {
          screenKey = 'overview';
        }
      } else {
        state.usersViewMode = 'matrix';
        screenKey = 'users';
      }
    } else if (screenKey === 'stock-manager') {
      state.eventsHubTab = 'warehouses';
      screenKey = 'events';
      } else if (screenKey === 'venue-security') {
      if (!canCurrentUserAssignEvents() && !isCurrentUserAdmin()) {
        showToast('Access Restricted: Event Venues CRUD is reserved for Operations Managers, Coordinators, Tech Leads, and Administrators.');
        screenKey = isCurrentUserStockController() || isCurrentUserTechnician() ? 'terminals' : 'overview';
        if (screenKey === 'terminals') scrollToId = 'pane-kiosk';
      } else {
        state.eventsHubTab = 'venues';
        screenKey = 'events';
      }
    }

    if (state.currentUser && !isScreenPermittedForCurrentUser(screenKey)) {
      const rawRole = (state.currentUser?.role || '').toLowerCase();
      const isStockCtrl = rawRole === 'stock_controller';
      const isTech = rawRole === 'tech_lead' || rawRole === 'technical_lead';
      const isStockMgr = rawRole === 'stock_manager';
      const isEvtCmd = rawRole === 'project_manager' || rawRole === 'event_coordinator';

      if (isStockCtrl) {
        showToast('Access Scoped: Gate Controllers are scoped to Gate Kiosk (#pane-kiosk) at their assigned terminal.');
        screenKey = 'terminals';
        scrollToId = 'pane-kiosk';
      } else if (isTech || isEvtCmd) {
        showToast('Access Restricted: Section requires Administrator privileges.');
        screenKey = 'overview';
      } else if (isStockMgr) {
        showToast('Access Restricted: Section requires Administrator privileges.');
        screenKey = 'overview';
      } else {
        showToast('Access Restricted: Crew members are scoped to Personal Badge & Gate Kiosk view.');
        screenKey = 'terminals';
        scrollToId = 'pane-kiosk';
      }
    }
    const wasScreen = state.activeScreen;
    const resolvedKey = screenKey;
    state.activeScreen = resolvedKey;
    if (resolvedKey === 'terminals' && wasScreen !== 'terminals') {
      state.terminalScreenLocked = true;
      localStorage.setItem('ability_terminal_screen_locked', '1');
      const errEl = document.getElementById('terminal-unlock-error');
      const pinInp = document.getElementById('terminal-unlock-pin-input');
      if (errEl) errEl.textContent = '';
      if (pinInp) pinInp.value = '';
      renderTerminalLockScreen();
    }
    const screens = {
      overview: document.getElementById('screen-overview'),
      events: document.getElementById('screen-events'),
      'create-event': document.getElementById('screen-create-event'),
      'dispatch-flow': document.getElementById('screen-dispatch-flow'),
      users: document.getElementById('screen-users'),
      attendees: document.getElementById('screen-attendees'),
      terminals: document.getElementById('screen-terminals'),
      'shift-relief': document.getElementById('screen-shift-relief'),
      calltime: document.getElementById('screen-calltime'),
      rollcall: document.getElementById('screen-rollcall'),
      'station-lock': document.getElementById('screen-station-lock'),
      'reset-scans': document.getElementById('screen-reset-scans'),
      'standalone-portals': document.getElementById('screen-standalone-portals'),
      settings: document.getElementById('screen-settings'),
      'custom-nav-page': document.getElementById('screen-custom-nav-page'),
    };
    const activeDomKey = screens[resolvedKey] ? resolvedKey : 'custom-nav-page';
    Object.keys(screens).forEach((k) => {
      if (screens[k]) {
        screens[k].classList.toggle('active', k === activeDomKey);
      }
    });

    // Update sidebar active state & icons across both Main Nav and Checkpoint Controls
    document.querySelectorAll('.sidebar .nav-item').forEach((btn) => {
      const target = btn.getAttribute('data-nav-target') || btn.getAttribute('data-nav-action');
      const isMatch = target === screenKey || target === resolvedKey;
      btn.classList.toggle('active', isMatch);
      const img = btn.querySelector('img[data-inactive-icon]');
      if (img) {
        const activeIc = img.getAttribute('data-active-icon') || '';
        const inactiveIc = img.getAttribute('data-inactive-icon') || '';
        img.src = (isMatch && activeIc) ? activeIc : inactiveIc;
      }
    });

    const settingsGroup = document.getElementById('sidebar-settings-group');
    const settingsSubmenu = document.getElementById('sidebar-settings-submenu');
    if (settingsGroup && settingsSubmenu) {
      if (resolvedKey === 'settings') {
        settingsGroup.classList.add('is-open');
        settingsSubmenu.style.display = 'flex';
      } else {
        settingsGroup.classList.remove('is-open');
        settingsSubmenu.style.display = 'none';
      }
    }

    // Update nav icons
    const ovIcon = document.getElementById('nav-icon-overview');
    const evIcon = document.getElementById('nav-icon-events');
    const atIcon = document.getElementById('nav-icon-attendees');
    if (ovIcon) ovIcon.src = resolvedKey === 'overview' ? 'assets/nav-overview-active.svg' : 'assets/nav-overview-inactive.svg';
    if (evIcon) evIcon.src = resolvedKey === 'events' ? 'assets/nav-events-active.svg' : 'assets/nav-events-inactive.svg';
    if (atIcon) atIcon.src = resolvedKey === 'attendees' ? 'assets/nav-attendees-active.svg' : 'assets/nav-attendees-inactive.svg';

    const matchedNavItem = (state.navigationConfig?.items || []).find((it) => String(it.nav_target) === String(screenKey));
    const pageTitles = {
      overview: 'Gate Operations Dashboard',
      events: 'Checkpoints & Venues',
      'create-event': 'Create Event',
      'dispatch-flow': 'Operational Command & Department Dispatch Flow',
      users: 'Staff, Technicians & Role Management',
      attendees: 'Staff ID Badges',
      terminals: 'Terminals (#pane-kiosk)',
      'shift-relief': 'Shift Relief & Swaps',
      calltime: 'Set Call Time',
      rollcall: 'On-Site Roll-Call',
      'station-lock': 'Station Lock (PIN)',
      'reset-scans': 'Reset Today’s Scans',
      'standalone-portals': 'Gates & On-Site Portals',
      settings: 'System Settings & Flow Explorer',
    };
    const bc = document.getElementById('breadcrumb-page');
    if (bc) {
      bc.textContent = pageTitles[screenKey] || pageTitles[resolvedKey] || (matchedNavItem ? matchedNavItem.label : 'Gate Dashboard');
    }

    if (resolvedKey === 'events') {
      loadStockManagerData();
      switchEventsHubTab(state.eventsHubTab || 'directory');
    }
    if (resolvedKey === 'standalone-portals' && typeof loadOnsiteShareIntoPortalsPage === 'function') {
      loadOnsiteShareIntoPortalsPage();
    }
    if (resolvedKey === 'users') {
      renderUsersScreen();
      switchUsersView(state.usersViewMode || 'personnel');
    }
    if (activeDomKey === 'custom-nav-page') {
      state.customNavScreenKey = screenKey;
    }
    renderDedicatedNavPages(activeDomKey);

    if (scrollToId === 'pane-kiosk' || screenKey === 'terminals') {
      setTimeout(() => {
        if (scrollToId === 'pane-kiosk') {
          const el = document.getElementById('pane-kiosk');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (state.terminalScreenLocked) {
          const pinInp = document.getElementById('terminal-unlock-pin-input');
          if (pinInp) {
            pinInp.focus();
            pinInp.select();
          }
        } else {
          const inp = document.getElementById('kiosk-badge-input');
          if (inp) {
            inp.focus();
            inp.select();
          }
        }
      }, 70);
    } else if (scrollToId) {
      setTimeout(() => {
        const el = document.getElementById(scrollToId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // =========================================================================
  // RENDER FUNCTIONS
  // =========================================================================

  function renderTechLeadRosterCard() {
    const cardEl = document.getElementById('tech-lead-roster-overview-card');
    if (!cardEl || !isCurrentUserTechLead()) return;

    const allFacilities = getAllFacilitiesList();
    const allCrew = state.crew || [];
    const assignedIds = new Set();
    const onSiteIds = new Set();

    const rows = allFacilities.map((f) => {
      const members = getFacilityCrewMembers(f, allCrew);
      members.forEach((m) => {
        if (m && m.id != null) {
          const uid = Number(m.id);
          assignedIds.add(uid);
          if (m.daily_state === 'checked_in') {
            onSiteIds.add(uid);
          }
        }
      });
      const lookupName = String(f.title || f.name || '').trim();
      const displayName = String(f.name || f.title || '').trim();
      return {
        facility: f,
        lookupName,
        displayName,
        callTime: (f.call_time || '08:00').slice(0, 5),
        members,
        count: members.length,
      };
    });

    rows.sort((a, b) => b.count - a.count);

    const totalAssigned = assignedIds.size;
    const onSiteAssigned = onSiteIds.size;
    const standbyAssigned = Math.max(0, totalAssigned - onSiteAssigned);

    const totalEl = document.getElementById('techlead-roster-total-count');
    if (totalEl) totalEl.textContent = String(totalAssigned);

    const statusEl = document.getElementById('techlead-roster-status-summary');
    if (statusEl) statusEl.textContent = `${onSiteAssigned} On-Site · ${standbyAssigned} Standby`;

    const locSummaryEl = document.getElementById('techlead-roster-location-summary');
    if (locSummaryEl) locSummaryEl.textContent = `Across ${rows.length} locations`;

    // Scale 10-bar sparkline proportionally to per-location staffing
    const sparkEl = document.getElementById('techlead-roster-sparkline');
    if (sparkEl) {
      const barEls = sparkEl.querySelectorAll('.sparkline-bar');
      const maxCount = Math.max(1, ...rows.map((r) => r.count));
      barEls.forEach((bar, idx) => {
        const entry = rows[idx % Math.max(1, rows.length)];
        const val = entry ? entry.count : 0;
        const h = val > 0 ? Math.max(10, Math.round((val / maxCount) * 30)) : 6;
        bar.style.height = `${h}px`;
      });
    }

    // Highlight latest scan location or active checkpoint context
    const lastLocEl = document.getElementById('techlead-roster-last-location');
    const lastCtxEl = document.getElementById('techlead-roster-last-context');
    const latestScan = Array.isArray(state.activityTimeline) && state.activityTimeline.length > 0
      ? state.activityTimeline[0]
      : null;
    if (lastLocEl) {
      lastLocEl.textContent = (latestScan && latestScan.checkpoint_name)
        ? latestScan.checkpoint_name
        : (state.activeCheckpoint?.name || 'All Checkpoints');
    }
    if (lastCtxEl) {
      if (latestScan && latestScan.full_name) {
        const timePart = latestScan.time_formatted || latestScan.time || '';
        lastCtxEl.textContent = `${latestScan.full_name}${timePart ? ' · ' + timePart : ''}`;
      } else {
        const cpLoc = state.activeCheckpoint?.location || '';
        const cpCall = state.activeCheckpoint?.call_time || '08:00';
        lastCtxEl.textContent = cpLoc ? `${cpLoc} · Call ${cpCall}` : `Call ${cpCall}`;
      }
    }

    const resetAllBtn = document.getElementById('techlead-card-reset-all-btn');
    if (resetAllBtn) {
      resetAllBtn.style.display = rows.some((r) => r.count > 0) ? 'inline-flex' : 'none';
    }

    const breakdownEl = document.getElementById('techlead-roster-breakdown');
    if (breakdownEl) {
      if (rows.length === 0) {
        breakdownEl.innerHTML = '<div class="region-row"><span class="region-crew-names">No locations configured.</span></div>';
        return;
      }
      breakdownEl.innerHTML = rows.map((r) => {
        const crewNames = r.count > 0
          ? r.members.map((m) => escapeHtml(m.full_name || `Staff #${m.id}`)).join(', ')
          : 'No crew assigned yet — click to schedule';
        const resetBtnHtml = r.count > 0
          ? `<button type="button" class="region-reset-btn js-techlead-row-reset" data-facility-name="${escapeHtml(r.lookupName)}" title="Reset all ${r.count} assigned crew from ${escapeHtml(r.displayName)}">↺ Reset</button>`
          : '';
        return `
          <div class="region-row">
            <button type="button" class="region-row-main js-techlead-location-row" data-facility-name="${escapeHtml(r.lookupName)}" title="Click to schedule or edit crew at ${escapeHtml(r.displayName)}">
              <span class="region-info">
                <span class="region-name">${escapeHtml(r.displayName)} · Call ${escapeHtml(r.callTime)}</span>
                <span class="region-crew-names">${crewNames}</span>
              </span>
            </button>
            <span class="region-row-actions">
              ${resetBtnHtml}
              <span class="region-count">${r.count}</span>
            </span>
          </div>
        `;
      }).join('');
    }
  }

  function renderAll() {
    renderTopbarAndKpis();
    renderCheckpointSelectors();
    renderVerificationDeck();
    renderHourlyTrafficChart();
    renderOverviewCosView();
    renderActivityTimeline();
    renderTechLeadRosterCard();
    renderMyRollCallAlertBanner();
    renderMyAssignmentsInboxCard();
    renderCrewDigitalPassCard();
    renderKioskVenueQrDeck();
    renderCrewTables();
    renderCheckpointsDirectory();
    renderBatchesAndMatrixScreen();
    renderRollCallModalList();
    renderUsersScreen();
    renderDedicatedNavPages();
    renderStockManager();
    renderVenueSecurityPage();
    if (state.activeScreen === 'events') {
      switchEventsHubTab(state.eventsHubTab || 'directory');
    }
    if (state.activeScreen === 'users') {
      switchUsersView(state.usersViewMode || 'personnel');
    }
    if (state.activeScreen === 'settings' && state.settingsTab === 'dispatch') {
      renderSettingsDispatchSection();
    }
    applyNavigationRestrictions();
  }

  function closeAllTopbarDropdowns() {
    const ids = ['topbar-search-dropdown', 'topbar-help-dropdown', 'topbar-notif-dropdown', 'topbar-user-dropdown'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function syncDynamicNotifications() {
    const items = [];
    const crewList = Array.isArray(state.crew) ? state.crew : [];
    const timeline = Array.isArray(state.activityTimeline) ? state.activityTimeline : [];
    const warehouses = Array.isArray(state.checkpoints?.stock_warehouses) ? state.checkpoints.stock_warehouses : [];

    // 1. Users Added / Latest Staff Onboarded
    if (crewList.length > 0) {
      const sortedUsers = [...crewList].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      const latestUser = sortedUsers[0];
      const userIdKey = `user-added-${latestUser.id || latestUser.full_name || '0'}`;
      items.push({
        id: userIdKey,
        type: 'users',
        iconSvg: 'assets/metric-users.svg',
        title: `User Added: ${latestUser.full_name || 'Staff Member'}`,
        desc: `${latestUser.role_display || latestUser.role || 'Crew'} · ${latestUser.clearance_code || 'L1'} (${crewList.length} total staff in directory)`,
        time: latestUser.created_at ? String(latestUser.created_at).slice(0, 16) : 'Directory synced',
        unread: !state.readNotifIds.has(userIdKey),
      });
    }

    // 2. Permission Granted (Latest granted gate scans or active clearance tiers)
    const grantedScans = timeline.filter((t) => String(t.status || '').toLowerCase() !== 'denied');
    if (grantedScans.length > 0) {
      grantedScans.slice(0, 2).forEach((scan, idx) => {
        const grantKey = `perm-granted-${scan.id || scan.badge_code || idx}-${scan.time_formatted || scan.time || ''}`;
        const scanAction = String(scan.action || scan.event_type || 'Check-in').toUpperCase();
        items.push({
          id: grantKey,
          type: 'granted',
          iconSvg: 'assets/metric-circle-check.svg',
          title: `Permission Granted: ${scan.full_name || 'Verified Staff'}`,
          desc: `${scanAction} · ${scan.clearance_code || 'L2'} verified at ${scan.checkpoint_name || 'Checkpoint'}`,
          time: scan.time_formatted || scan.time || 'Today',
          unread: !state.readNotifIds.has(grantKey),
        });
      });
    } else {
      const badgeTotal = Number(state.kpis?.activeBadges ?? crewList.length);
      const grantKey = `perm-matrix-active-${badgeTotal}`;
      items.push({
        id: grantKey,
        type: 'granted',
        iconSvg: 'assets/shield-lock.svg',
        title: `Permissions Active: ${badgeTotal} Issued Badges`,
        desc: 'Clearance matrix (L1–L4) active across event venues and stock gates',
        time: 'Live policy',
        unread: !state.readNotifIds.has(grantKey),
      });
    }

    // 3. Active Stocks / Warehouses
    const activeWhs = warehouses.filter((w) => w && w.is_active !== 0);
    if (activeWhs.length > 0) {
      const summaryParts = activeWhs.map((w) => {
        const wCrew = getFacilityCrewMembers(w, crewList);
        return `${w.name || 'Warehouse'} (${wCrew.length})`;
      });
      const stockKey = `active-stocks-${activeWhs.length}-${summaryParts.join('|')}`;
      items.push({
        id: stockKey,
        type: 'stock',
        iconSvg: 'assets/warehouse-13.svg',
        title: `Active Stocks & Warehouses (${activeWhs.length})`,
        desc: summaryParts.join(' · '),
        time: 'Active hubs',
        unread: !state.readNotifIds.has(stockKey),
      });
    }

    // 4. Optional latest Denied Scan alert (using SVG dot icon, never emoji)
    const deniedScan = timeline.find((t) => String(t.status || '').toLowerCase() === 'denied');
    if (deniedScan) {
      const denyKey = `perm-denied-${deniedScan.id || deniedScan.badge_code || '0'}-${deniedScan.time_formatted || deniedScan.time || ''}`;
      items.push({
        id: denyKey,
        type: 'denied',
        iconSvg: 'assets/status-dot-red-5.svg',
        title: `Access Denied: ${deniedScan.full_name || deniedScan.badge_code || 'Invalid Badge'}`,
        desc: `${deniedScan.denial_reason || 'Insufficient clearance'} at ${deniedScan.checkpoint_name || 'Checkpoint'}`,
        time: deniedScan.time_formatted || deniedScan.time || 'Today',
        unread: !state.readNotifIds.has(denyKey),
      });
    }

    // 5. Random Roll-Call Alert for current logged-in user
    if (state.myPendingRollCall) {
      const rc = state.myPendingRollCall;
      const rcKey = `rollcall-ping-${rc.session_id}-${rc.entry_id}`;
      items.unshift({
        id: rcKey,
        type: 'rollcall',
        iconSvg: 'assets/metric-clock-3.svg',
        title: `Random Roll-Call Check Required (${rc.checkpoint_name || 'On-Site'})`,
        desc: 'Verify you are still inside the venue via GPS geo-fence or live Gate QR before deadline.',
        time: `${Math.max(1, Math.ceil(Number(rc.seconds_left || 60) / 60))}m left`,
        unread: !state.readNotifIds.has(rcKey),
      });
    }

    // 6. Pending Event Dispatch Confirmation for Crew / Techs / Support
    const pendingAssigns = (state.myPendingAssignments || []).filter((a) => String(a.confirmation_status) === 'pending');
    if (pendingAssigns.length > 0) {
      pendingAssigns.slice(0, 2).forEach((a) => {
        const asgKey = `event-asg-pending-${a.event_id}-${a.id}`;
        items.unshift({
          id: asgKey,
          type: 'dispatch',
          iconSvg: 'assets/nav-events-inactive.svg',
          title: `Confirm Event Assignment: ${a.event_title || a.event_id}`,
          desc: `Branch: ${a.branch_dept || 'Crew'} · Call-time ${a.call_time || '08:00'}`,
          time: a.event_date || 'Pending',
          unread: !state.readNotifIds.has(asgKey),
        });
      });
    }

    // 7. Pending Tier 4 Support Staff Requests & Requirements alerts for Supervisors
    const pendingSupport = (state.eventSupportRequests || []).filter((r) => String(r.status) === 'pending');
    if (pendingSupport.length > 0 && (isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserEventCommand() || isCurrentUserTechLead())) {
      const firstSup = pendingSupport[0];
      const supKey = `support-req-${firstSup.id}`;
      items.unshift({
        id: supKey,
        type: 'dispatch',
        iconSvg: 'assets/nav-team-members.svg',
        title: `${pendingSupport.length} Support Staff Request(s) Pending`,
        desc: `${firstSup.event_title}: requested by ${firstSup.requested_by_name}`,
        time: 'Action needed',
        unread: !state.readNotifIds.has(supKey),
      });
    }

    state.notifications = items;
    state.unreadNotifCount = items.filter((n) => n.unread).length;
  }

  function renderNotificationsList() {
    syncDynamicNotifications();
    const list = document.getElementById('topbar-notif-list');
    if (!list) return;
    if (!state.notifications || state.notifications.length === 0) {
      list.innerHTML = `<div style="padding: 16px; text-align: center; font-size: 11px; color: var(--text-muted);">No recent alerts.</div>`;
      return;
    }
    list.innerHTML = state.notifications.map((n) => `
      <div class="notif-item ${n.unread ? 'unread' : ''}">
        <span class="notif-item-icon">
          <img src="${escapeHtml(n.iconSvg || 'assets/metric-users.svg')}" alt="" class="svg-icon notif-svg-icon" />
        </span>
        <div class="notif-item-content">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-desc">${escapeHtml(n.desc)}</div>
          <div class="notif-item-time">${escapeHtml(n.time)}</div>
        </div>
      </div>
    `).join('');
  }

  function isCurrentUserAdmin() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    return role === 'admin' || role === 'manager' || role === 'administrator';
  }

  function isCurrentUserEventCommand() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    return role === 'project_manager' || role === 'event_coordinator';
  }

  function isCurrentUserTechLead() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    return role === 'tech_lead' || role === 'technical_lead' || isCurrentUserAdmin();
  }

  function isCurrentUserStockManager() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    return role === 'stock_manager' || isCurrentUserAdmin();
  }

  function isCurrentUserStockController() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    return role === 'stock_controller';
  }

  function isCurrentUserTechnician() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    return role === 'technician' || (!isCurrentUserAdmin() && !isCurrentUserEventCommand() && !isCurrentUserTechLead() && !isCurrentUserStockManager() && !isCurrentUserStockController());
  }

  function isScreenPermittedForCurrentUser(screenKey) {
    if (isCurrentUserAdmin()) return true;
    const normalizedKey = (screenKey === 'stock-manager' || screenKey === 'venue-security') ? 'events' : screenKey;
    if (normalizedKey === 'analytics' || normalizedKey === 'access-matrix') {
      return false;
    }
    const navItems = state.navigationConfig?.items || [];
    if (Array.isArray(navItems) && navItems.length > 0) {
      const navMatch = navItems.find((it) => String(it.nav_target) === String(normalizedKey));
      if (navMatch) {
        return isNavItemPermittedForCurrentUser(navMatch);
      }
    }
    const rawRole = (state.currentUser?.role || '').toLowerCase();
    const isAdmin = isCurrentUserAdmin();
    const isManager = (rawRole === 'manager' || rawRole === 'project_manager' || rawRole === 'event_coordinator') && !isAdmin;
    const isTech = (rawRole === 'tech_lead' || rawRole === 'technical_lead') && !isAdmin;
    const isStockMgr = (rawRole === 'stock_manager') && !isAdmin;
    const isStockCtrl = (rawRole === 'stock_controller');

    if (isManager) {
      return ['overview', 'events', 'create-event', 'dispatch-flow', 'users', 'attendees', 'terminals', 'shift-relief', 'calltime', 'rollcall', 'standalone-portals', 'settings'].includes(normalizedKey);
    }
    if (isStockCtrl) {
      return ['events', 'dispatch-flow', 'terminals', 'attendees', 'shift-relief', 'rollcall', 'standalone-portals', 'settings'].includes(normalizedKey);
    }
    if (isTech) {
      return ['overview', 'events', 'create-event', 'dispatch-flow', 'users', 'attendees', 'terminals', 'calltime', 'rollcall', 'standalone-portals', 'settings'].includes(normalizedKey);
    }
    if (isStockMgr) {
      return ['overview', 'events', 'dispatch-flow', 'attendees', 'terminals', 'shift-relief', 'calltime', 'rollcall', 'standalone-portals', 'settings'].includes(normalizedKey);
    }
    // Field Crew / Technicians / Support Staff:
    return ['dispatch-flow', 'attendees', 'terminals', 'rollcall'].includes(normalizedKey);
  }

  function canCurrentUserManageWarehouses() {
    if (!state.currentUser) return false;
    const rawRole = (state.currentUser.role || '').toLowerCase();
    return isCurrentUserAdmin() || rawRole === 'manager' || isCurrentUserStockManager();
  }

  function canCurrentUserAddUser() {
    if (!state.currentUser) return false;
    const rawRole = (state.currentUser.role || '').toLowerCase();
    const isManager = rawRole === 'manager' || rawRole === 'project_manager' || rawRole === 'event_coordinator';
    return isCurrentUserAdmin() || isManager || isCurrentUserTechLead() || isCurrentUserStockManager();
  }

  function canCurrentUserAssignEvents() {
    if (!state.currentUser) return false;
    const rawRole = (state.currentUser.role || '').toLowerCase();
    const isManager = rawRole === 'manager' || rawRole === 'project_manager' || rawRole === 'event_coordinator';
    return isCurrentUserAdmin() || isManager || isCurrentUserTechLead();
  }

  function canCurrentUserSetCallTime() {
    if (!state.currentUser) return true; // Permit in kiosk/demo testing
    const rawRole = (state.currentUser.role || '').toLowerCase();
    const isManager = rawRole === 'manager' || rawRole === 'project_manager' || rawRole === 'event_coordinator';
    return isCurrentUserAdmin() || isManager || isCurrentUserTechLead() || isCurrentUserStockManager();
  }

  function renderUsersDelegationBanner() {
    const bannerEl = document.getElementById('users-page-delegation-banner');
    if (!bannerEl) return;
    const isAdmin = isCurrentUserAdmin();
    const isTech = (state.currentUser?.role || '').toLowerCase() === 'tech_lead' && !isAdmin;
    const isStockMgr = (state.currentUser?.role || '').toLowerCase() === 'stock_manager' && !isAdmin;

    const iconEl = document.getElementById('users-page-delegation-icon');
    const titleEl = document.getElementById('users-page-delegation-title');
    const descEl = document.getElementById('users-page-delegation-desc');
    const pillEl = document.getElementById('users-page-delegation-pill');

    if (isStockMgr) {
      bannerEl.style.display = 'flex';
      bannerEl.style.background = 'rgba(217, 119, 6, 0.08)';
      bannerEl.style.border = '1px solid rgba(217, 119, 6, 0.3)';
      bannerEl.style.color = '#92400e';
      if (iconEl) iconEl.textContent = '🏢';
      if (titleEl) titleEl.textContent = 'Site Manager Delegation Active';
      if (descEl) descEl.innerHTML = 'You are authorized to manage facility crew (<strong>L1/L2</strong>), assign Gate Controllers (<strong>L3</strong>), and approve shift relief requests.';
      if (pillEl) {
        pillEl.textContent = 'Site Manager · L1–L3';
        pillEl.style.background = 'rgba(217, 119, 6, 0.15)';
        pillEl.style.color = '#b45309';
      }
    } else if (isTech) {
      bannerEl.style.display = 'flex';
      bannerEl.style.background = 'rgba(37, 99, 235, 0.08)';
      bannerEl.style.border = '1px solid rgba(37, 99, 235, 0.3)';
      bannerEl.style.color = '#1e40af';
      if (iconEl) iconEl.textContent = '🎛️';
      if (titleEl) titleEl.textContent = 'Technical Lead Scoped Delegation Active';
      if (descEl) descEl.innerHTML = 'You are authorized to assign event call times, manage crew rosters, and onboard technical personnel with <strong>Level 1 or Level 2</strong> clearance. Higher clearance tiers require Administrator clearance.';
      if (pillEl) {
        pillEl.textContent = 'Scoped L1 / L2';
        pillEl.style.background = 'rgba(37, 99, 235, 0.15)';
        pillEl.style.color = '#1d4ed8';
      }
    } else {
      bannerEl.style.display = 'none';
    }
  }

  function applyNavigationRestrictions() {
    const rawRole = (state.currentUser?.role || '').toLowerCase();
    const clearance = (state.currentUser?.clearance_code || '').toUpperCase();
    const isAdmin = isCurrentUserAdmin();
    const isManager = (rawRole === 'manager' || rawRole === 'project_manager' || rawRole === 'event_coordinator') && !isAdmin;
    const isTech = (rawRole === 'tech_lead' || rawRole === 'technical_lead') && !isAdmin;
    const isStockMgr = (rawRole === 'stock_manager') && !isAdmin;
    const isStockCtrl = (rawRole === 'stock_controller');
    const isFieldCrew = !isAdmin && !isManager && !isTech && !isStockMgr && !isStockCtrl;
    const isTechCrew = isFieldCrew;

    document.body.setAttribute('data-user-role', rawRole);

    const setVis = (el, isVis) => {
      if (!el) return;
      el.style.display = isVis ? 'flex' : 'none';
      if (isVis) {
        el.removeAttribute('data-restricted');
        if (el.getAttribute('title') === 'Restricted') {
          el.removeAttribute('title');
        }
        if (!el.hasAttribute('title')) {
          const lbl = el.querySelector('.nav-item-label');
          if (lbl && lbl.textContent.trim()) {
            el.setAttribute('title', lbl.textContent.trim());
          }
        }
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.cursor = 'pointer';
        el.removeAttribute('tabindex');
      } else {
        el.setAttribute('data-restricted', 'true');
        el.setAttribute('tabindex', '-1');
      }
    };

    // 1. Main Navigation Items (Sidebar) — Re-render from navigationConfig + apply role & enable/disable rules
    renderMainNavigation();

    // Sync fallback nav items if navigationConfig wasn't loaded yet
    const navOverview = document.querySelector('.sidebar .nav-item[data-nav-target="overview"]');
    const navEvents = document.querySelector('.sidebar .nav-item[data-nav-target="events"]');
    const navUsers = document.getElementById('nav-users-btn') || document.querySelector('.sidebar .nav-item[data-nav-target="users"]');
    const navAttendees = document.querySelector('.sidebar .nav-item[data-nav-target="attendees"]');
    const navTerminals = document.getElementById('nav-terminals-btn') || document.querySelector('.sidebar .nav-item[data-nav-target="terminals"]');

    if (!state.navigationConfig || !Array.isArray(state.navigationConfig.items) || state.navigationConfig.items.length === 0) {
      setVis(navOverview, isAdmin || isManager || isTech || isStockMgr);
      setVis(navEvents, isAdmin || isManager || isTech || isStockMgr || isStockCtrl);
      setVis(navUsers, isAdmin || isManager || isTech);
      setVis(navAttendees, true);
      setVis(navTerminals, true);
    }

    // Sub-tabs on Checkpoints & Venues Hub
    const cpHubTabVenues = document.getElementById('cp-hub-tab-venues');
    const cpHubTabWarehouses = document.getElementById('cp-hub-tab-warehouses');
    const canSeeVenuesHub = isAdmin || isManager || isTech;
    if (cpHubTabVenues) cpHubTabVenues.style.display = canSeeVenuesHub ? 'inline-flex' : 'none';
    if (cpHubTabWarehouses) cpHubTabWarehouses.style.display = (isAdmin || isManager || isStockMgr || isStockCtrl) ? 'inline-flex' : 'none';
    if (!canSeeVenuesHub && state.eventsHubTab === 'venues') {
      state.eventsHubTab = 'directory';
    }

    // 2. Checkpoint Controls Navigation Group (fallback only if workspace items not in navigationConfig)
    const hasWorkspaceNavConfig = Array.isArray(state.navigationConfig?.items) && state.navigationConfig.items.some((it) => it.nav_group === 'workspace');
    const cpNav = document.getElementById('sidebar-checkpoint-controls') || document.querySelector('.nav-group-workspace');
    const btnShiftRelief = document.getElementById('sidebar-shift-relief-btn');
    const btnCallTime = document.getElementById('sidebar-calltime-btn');
    const btnRollCall = document.getElementById('sidebar-rollcall-btn');
    const btnStationLock = document.getElementById('sidebar-station-lock-btn');
    const btnResetDemo = document.getElementById('sidebar-reset-demo-btn');
    const btnOnsiteShare = document.getElementById('sidebar-onsite-share-btn');
    const btnSettings = document.getElementById('sidebar-settings-btn');
    const grpSettings = document.getElementById('sidebar-settings-group');

    if (cpNav && !hasWorkspaceNavConfig) {
      cpNav.style.display = 'flex';
      // Shift Relief & Swaps: Admin, Manager, Stock Manager, Stock Controller
      setVis(btnShiftRelief, isAdmin || isManager || isStockMgr || isStockCtrl);
      // Set Call Time: Admin, Manager, Project Manager, Event Coordinator, Tech Lead, Stock Manager
      setVis(btnCallTime, isAdmin || isManager || isTech || isStockMgr);
      // On-Site Roll-Call: Read-only directory visible to all authenticated personnel
      setVis(btnRollCall, true);
      // Station Lock PIN: Admin ONLY
      setVis(btnStationLock, isAdmin);
      // Reset Today's Scans: Admin ONLY
      setVis(btnResetDemo, isAdmin);
      // Unified Standalone Gates & On-Site Portal Links
      setVis(btnOnsiteShare, isAdmin || isManager || isTech || isStockMgr || isStockCtrl);
      // Settings & Interactive System Flow Explorer
      const settingsAllowed = isAdmin || isManager || isTech || isStockMgr || isStockCtrl;
      setVis(grpSettings || btnSettings, settingsAllowed);
      if (btnSettings) setVis(btnSettings, settingsAllowed);
    }
    if (btnResetDemo && !isAdmin) {
      btnResetDemo.style.display = 'none';
    }

    const topbarSettingsBtn = document.getElementById('topbar-settings-btn');
    if (topbarSettingsBtn) {
      topbarSettingsBtn.style.display = isScreenPermittedForCurrentUser('settings') ? 'inline-flex' : 'none';
    }

    // 3. Subtabs on Users & Roles Screen
    const tabRoles = document.getElementById('view-tab-roles');
    const tabMatrix = document.getElementById('view-tab-matrix');
    const tabDepts = document.getElementById('view-tab-departments');
    const tabNav = document.getElementById('view-tab-navigation');
    if (tabRoles) tabRoles.style.display = isAdmin ? 'inline-flex' : 'none';
    if (tabMatrix) tabMatrix.style.display = isAdmin ? 'inline-flex' : 'none';
    if (tabDepts) tabDepts.style.display = isAdmin ? 'inline-flex' : 'none';
    if (tabNav) tabNav.style.display = isAdmin ? 'inline-flex' : 'none';

    // 4. User Dropdown & Topbar Administrative Controls (ONLY ADMIN)
    const helpWrap = document.getElementById('topbar-help-wrap');
    const notifWrap = document.getElementById('topbar-notif-wrap');
    const helpDrop = document.getElementById('topbar-help-dropdown');
    const notifDrop = document.getElementById('topbar-notif-dropdown');
    if (helpWrap) helpWrap.style.display = isAdmin ? '' : 'none';
    if (notifWrap) notifWrap.style.display = isAdmin ? '' : 'none';
    if (!isAdmin) {
      if (helpDrop) helpDrop.style.display = 'none';
      if (notifDrop) notifDrop.style.display = 'none';
    }
    const menuSwitch = document.getElementById('topbar-menu-switch-user');
    const menuAuth = document.getElementById('topbar-menu-auth-modal');
    if (menuSwitch) menuSwitch.style.display = isAdmin ? 'flex' : 'none';
    if (menuAuth) menuAuth.style.display = isAdmin ? 'flex' : 'none';
    const quickLogout = document.getElementById('topbar-logout-quick-btn');
    if (quickLogout) {
      quickLogout.style.display = isAdmin ? 'none' : 'inline-flex';
    }

    // 5. Breadcrumb Workspace Title
    const bcRoot = document.getElementById('breadcrumb-workspace');
    if (bcRoot) {
      if (isStockCtrl) {
        bcRoot.textContent = 'aBility Gate Station (Gate Controller)';
      } else if (isStockMgr) {
        bcRoot.textContent = 'aBility Site Hub (Site Manager)';
      } else if (isTech) {
        bcRoot.textContent = 'aBility Production Deck (Tech Lead)';
      } else if (isManager) {
        bcRoot.textContent = 'aBility Operations Deck (Project Manager)';
      } else if (isFieldCrew) {
        bcRoot.textContent = 'aBility Crew Station (Field Crew)';
      } else {
        bcRoot.textContent = 'aBility Manager';
      }
    }

    // 5. Control "Add New Team Member" button based on delegation matrix
    const addUserBtn = document.getElementById('open-add-user-btn');
    if (addUserBtn) {
      if (canCurrentUserAddUser()) {
        addUserBtn.style.display = 'inline-flex';
        addUserBtn.disabled = false;
        addUserBtn.removeAttribute('title');
      } else {
        addUserBtn.style.display = 'none';
        addUserBtn.disabled = true;
      }
    }

    renderUsersDelegationBanner();

    // 6. Support Card Context
    const supportTitle = document.querySelector('.support-card .support-card-title');
    const supportDesc = document.querySelector('.support-card .support-card-desc') || document.getElementById('sidebar-support-desc');
    if (supportTitle && supportDesc) {
      if (isStockCtrl) {
        supportTitle.textContent = 'Gate Controller Terminal';
        supportDesc.textContent = state.currentUser?.assigned_checkpoint_name
          ? `Locked to ${state.currentUser.assigned_checkpoint_name} for attendance verification.`
          : 'Terminal assignment pending Administrator / Site Manager approval.';
      } else if (isTechCrew) {
        supportTitle.textContent = 'Technician Terminal';
        supportDesc.textContent = 'Personal RFID credentials & event call time check-in.';
      } else if (isTech) {
        supportTitle.textContent = 'Tech Lead Operations';
        supportDesc.textContent = 'Event rosters, call time scheduling & L1/L2 technical onboarding.';
      } else if (isStockMgr) {
        supportTitle.textContent = 'Site Manager Hub';
        supportDesc.textContent = 'Facility checkpoints, Gate Controller relief approvals & site attendance.';
      } else {
        supportTitle.textContent = 'Clearance Enforcement';
        supportDesc.textContent = `All ${state.clearanceMatrix?.length || 7} security tiers and physical perimeter checkpoints active.`;
      }
    }

    // 7. Kiosk Banner
    document.querySelectorAll('#kiosk-stock-role-banner, .js-kiosk-stock-role-banner').forEach((banner) => {
      banner.style.display = isStockCtrl ? 'flex' : 'none';
    });

    // 8. Auto-redirect if active screen is not permitted for new role
    if (!isScreenPermittedForCurrentUser(state.activeScreen)) {
      if (isStockCtrl || isTechCrew) {
        switchScreen('terminals', 'pane-kiosk');
      } else {
        switchScreen('overview');
      }
    }

    // 9. Gate Dashboard Scoping for Tech Lead:
    // Tech Lead views overview-top-block, User Activity Timeline (left),
    // and the Hourly Traffic chart inside #overview-allocation-card (right);
    // map views and the Production Crew & Staff Roster remain hidden.
    const overviewMapCard = document.getElementById('overview-allocation-card');
    const overviewRosterCard = document.querySelector('#screen-overview .directory-card');
    const overviewTimelineCard = document.querySelector('#screen-overview .timeline-card-overview');

    if (overviewMapCard) {
      overviewMapCard.style.display = '';

      const cardTitle = overviewMapCard.querySelector('.chart-title');
      const cardSubtitle = overviewMapCard.querySelector('.chart-subtitle');
      const radarBadge = overviewMapCard.querySelector('.map-radar-pulse');
      const btnOptA = document.getElementById('toggle-view-option-a') || document.getElementById('toggle-view-map');
      const btnOptB = document.getElementById('toggle-view-option-b');
      const btnChart = document.getElementById('toggle-view-chart');
      const btnCos = document.getElementById('toggle-view-cos');

      if (cardTitle) {
        cardTitle.textContent = 'Hourly Traffic & Currently On-Site Crew';
      }
      if (cardSubtitle) {
        cardSubtitle.textContent = 'Live check-in volume across Kigali event venues and facility gates, paired with active Currently On-Site (COS) roster.';
      }
      if (radarBadge) radarBadge.style.display = 'none';
      if (btnOptA) btnOptA.style.display = 'none';
      if (btnOptB) btnOptB.style.display = 'none';
      if (btnChart) btnChart.style.display = '';
      if (btnCos) btnCos.style.display = '';

      if (state.mapViewMode !== 'cos' && state.mapViewMode !== 'chart') {
        setAllocationMapView('chart');
      }
    }
    if (overviewRosterCard) {
      overviewRosterCard.style.display = isTech ? 'none' : '';
    }
    if (overviewTimelineCard) {
      overviewTimelineCard.style.width = '';
      overviewTimelineCard.style.flex = '';
    }

    // Hide any "go-attendees" buttons for Tech Lead
    document.querySelectorAll('[data-action="go-attendees"]').forEach((btn) => {
      btn.style.display = isTech ? 'none' : '';
    });

    const scheduleRosterBtn = document.getElementById('overview-schedule-roster-btn');
    if (scheduleRosterBtn) {
      scheduleRosterBtn.style.display = canCurrentUserAssignEvents() ? 'inline-flex' : 'none';
    }
  }

  function openAuthModal(defaultTab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('open');
    const isAdmin = isCurrentUserAdmin();
    const tabReg = document.getElementById('auth-tab-register');
    const restrictedBadge = document.getElementById('auth-tab-restricted-badge');
    if (tabReg) {
      tabReg.style.display = isAdmin ? 'inline-block' : 'none';
    }
    if (restrictedBadge) {
      restrictedBadge.style.display = isAdmin ? 'none' : 'inline-flex';
    }
    switchAuthTab(isAdmin ? defaultTab : 'login');
  }

  function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
  }

  function switchAuthTab(tab) {
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg = document.getElementById('auth-tab-register');
    const formLogin = document.getElementById('login-form');
    const formReg = document.getElementById('register-form');
    const title = document.getElementById('auth-modal-title');
    const isAdmin = isCurrentUserAdmin();

    if (tab === 'register' && !isAdmin) {
      showToast('Staff registration is restricted to system administrators.');
      tab = 'login';
    }

    if (tab === 'login') {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabReg) tabReg.classList.remove('active');
      if (formLogin) formLogin.style.display = 'block';
      if (formReg) formReg.style.display = 'none';
      if (title) title.textContent = 'Sign In to aBility Terminal';
    } else {
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabReg) tabReg.classList.add('active');
      if (formLogin) formLogin.style.display = 'none';
      if (formReg) formReg.style.display = 'block';
      if (title) title.textContent = 'Register New Staff & Issue Badge (Admin)';
    }
  }

  function openSwitchUserModal() {
    const modal = document.getElementById('switch-user-modal');
    if (!modal) return;
    modal.classList.add('open');
    const searchInput = document.getElementById('switch-user-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    renderSwitchUserGrid('');
  }

  function closeSwitchUserModal() {
    const modal = document.getElementById('switch-user-modal');
    if (modal) modal.classList.remove('open');
  }

  function renderSwitchUserGrid(filter = '') {
    const grid = document.getElementById('switch-user-grid');
    if (!grid) return;
    const q = filter.trim().toLowerCase();
    const list = state.crew.filter((c) =>
      !q ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.username || '').toLowerCase().includes(q) ||
      (c.badge_code || '').toLowerCase().includes(q) ||
      (c.role || '').toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q)
    );

    if (list.length === 0) {
      grid.innerHTML = `<div style="padding: 18px; text-align: center; font-size: 12px; color: var(--text-muted);">No staff members found matching "${escapeHtml(filter)}"</div>`;
      return;
    }

    const currentId = state.currentUser ? Number(state.currentUser.id) : 0;
    grid.innerHTML = list.map((m) => {
      const isCur = Number(m.id) === currentId;
      return `
        <div class="switch-user-item ${isCur ? 'active-user' : ''} js-switch-to-user" data-user-id="${m.id}" data-badge="${escapeHtml(m.badge_code)}" data-email="${escapeHtml(m.email || '')}" data-username="${escapeHtml(m.username || '')}" data-role="${escapeHtml(m.role || '')}" style="cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar-circle avatar-jl" style="width: 32px; height: 32px; font-size: 12px;">${escapeHtml(m.initials || 'CR')}</div>
            <div>
              <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${escapeHtml(m.full_name)} ${isCur ? '<span style="font-size: 10px; color: var(--brand-primary); font-weight: 600;">(Current)</span>' : ''}</div>
              <div style="font-size: 10px; color: var(--text-secondary); font-family: var(--font-mono);">${escapeHtml(m.badge_code)} · ${escapeHtml(m.role_display || m.role)} (${escapeHtml(m.department || '')})</div>
            </div>
          </div>
          <span class="tier-pill-soft ${escapeHtml(m.clearance_code)}" style="font-size: 10px; padding: 2px 7px;">${escapeHtml(m.clearance_code)}</span>
        </div>
      `;
    }).join('');
  }

  function renderTopbarAndKpis() {
    const dbText = document.getElementById('topbar-db-text');
    if (dbText) {
      dbText.textContent = state.dbSource === 'ability_db'
        ? 'Connected: ability_db (Live)'
        : 'Connected: attendance_app (Standalone)';
    }

    // Render User Avatar and Info in Topbar & Sidebar Account Footer
    const u = state.currentUser || (state.crew.length > 0 ? (state.crew.find((c) => Number(c.id) === 2) || state.crew[0]) : null);
    if (u) {
      state.currentUser = u;
      const displayName = u.full_name || u.username || 'Active Operator';
      const displayRole = `${u.role_display || u.role || 'Staff'} · ${u.clearance_code || 'L2'}`;
      const initials = u.initials || computeInitials(displayName);
      const applyUserAvatarDisplay = (el) => {
        if (!el) return;
        if (u.profile_image_url) {
          el.innerHTML = `<img src="${escapeHtml(u.profile_image_url)}" alt="${escapeHtml(displayName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          el.textContent = initials;
        }
      };

      const topAvatar = document.getElementById('topbar-avatar');
      if (topAvatar) {
        applyUserAvatarDisplay(topAvatar);
        topAvatar.title = `${displayName} (${u.role_display || u.role} · ${u.clearance_code || 'L2'}) · Click for Account Menu`;
      }

      const menuAvatar = document.getElementById('user-menu-avatar');
      applyUserAvatarDisplay(menuAvatar);

      const menuName = document.getElementById('user-menu-name');
      if (menuName) menuName.textContent = displayName;

      const topName = document.getElementById('topbar-user-name');
      const topRole = document.getElementById('topbar-user-role-badge');
      if (topName) topName.textContent = displayName;
      if (topRole) topRole.textContent = `${u.role_display || u.role} (${u.clearance_code || 'L2'})`;

      const menuRole = document.getElementById('user-menu-role');
      if (menuRole) menuRole.textContent = displayRole;

      const menuBadge = document.getElementById('user-menu-badge');
      if (menuBadge) menuBadge.textContent = u.badge_code || 'REW-BADGE-0002';

      // Sidebar Account Footer (#account-footer-btn)
      const footerBtn = document.getElementById('account-footer-btn');
      const footerAvatar = document.getElementById('account-footer-avatar');
      const footerName = document.getElementById('account-footer-name');
      const footerRole = document.getElementById('account-footer-role');
      applyUserAvatarDisplay(footerAvatar);
      if (footerName) {
        footerName.textContent = displayName;
        footerName.title = displayName;
      }
      if (footerRole) {
        footerRole.textContent = displayRole;
        footerRole.title = displayRole;
      }
      if (footerBtn) {
        footerBtn.title = `Signed in as ${displayName} (@${u.username || 'user'}) · ${displayRole}`;
      }

      const isAdmin = isCurrentUserAdmin();
      const userDropdown = document.getElementById('topbar-user-dropdown');
      const quickLogout = document.getElementById('topbar-logout-quick-btn');
      if (quickLogout) {
        quickLogout.style.display = 'none';
      }

      const menuSwitch = document.getElementById('topbar-menu-switch-user');
      const menuAuth = document.getElementById('topbar-menu-auth-modal');
      if (menuSwitch) menuSwitch.style.display = 'flex';
      if (menuAuth) menuAuth.style.display = 'flex';

      const authTitle = document.getElementById('topbar-menu-auth-title');
      const authSub = document.getElementById('topbar-menu-auth-sub');
      if (authTitle) {
        authTitle.textContent = isAdmin ? 'Register Staff & Badge' : 'Sign In / Switch Operator';
      }
      if (authSub) {
        authSub.textContent = isAdmin ? 'Admin toggle: Sign In & Register' : 'Login with personal credentials';
      }

      applyNavigationRestrictions();
    }

    // Render Shift Relief Pending Badges
    const pendingShiftCount = Number(state.pendingShiftRequestCount || 0);
    const srTermBadge = document.getElementById('terminal-shift-relief-badge');
    if (srTermBadge) {
      srTermBadge.style.display = pendingShiftCount > 0 ? 'inline-flex' : 'none';
      srTermBadge.textContent = String(pendingShiftCount);
    }
    const srSideBadge = document.getElementById('sidebar-shift-relief-badge');
    if (srSideBadge) {
      srSideBadge.style.display = pendingShiftCount > 0 ? 'inline-flex' : 'none';
      srSideBadge.textContent = String(pendingShiftCount);
    }
    const srEventsKpi = document.getElementById('events-shift-pending-kpi');
    if (srEventsKpi) {
      srEventsKpi.textContent = String(pendingShiftCount);
    }

    // Render Notifications Bubble
    syncDynamicNotifications();
    const notifBubble = document.getElementById('topbar-notif-bubble');
    if (notifBubble) {
      if (state.unreadNotifCount > 0) {
        notifBubble.style.display = 'block';
        notifBubble.textContent = String(state.unreadNotifCount);
      } else {
        notifBubble.style.display = 'none';
      }
    }

    const k = state.kpis;
    const sideUserCount = document.getElementById('sidebar-users-count');
    if (sideUserCount) {
      sideUserCount.textContent = String(state.crew.length).padStart(2, '0');
    }
    document.querySelectorAll('.js-kpi-active-badges').forEach((el) => {
      el.textContent = String(k.activeBadges ?? 14);
    });
    document.querySelectorAll('.js-stat-total-people').forEach((el) => {
      el.textContent = String(k.totalStaff ?? state.crew.length);
    });
    document.querySelectorAll('.js-stat-onsite').forEach((el) => {
      el.textContent = String(k.currentlyOnSite ?? state.rollCallList.length);
    });
    document.querySelectorAll('.js-kpi-total-granted').forEach((el) => {
      el.textContent = String(k.totalGrantedToday ?? 0);
    });
    document.querySelectorAll('.js-kpi-venue-checkins').forEach((el) => {
      el.textContent = String(k.venueCheckinsToday ?? 0);
    });
    document.querySelectorAll('.js-kpi-stock-checkins').forEach((el) => {
      el.textContent = String(k.stockCheckinsToday ?? 0);
    });
    document.querySelectorAll('.js-kpi-venue-vs-stock').forEach((el) => {
      el.textContent = `${k.venueCheckinsToday ?? 0} Venue · ${k.stockCheckinsToday ?? 0} Stock Gate`;
    });
    document.querySelectorAll('.js-kpi-late-denied').forEach((el) => {
      el.textContent = String((k.lateArrivalsToday ?? 0) + (k.deniedScansToday ?? 0));
    });
    document.querySelectorAll('.js-kpi-late-denied-sub').forEach((el) => {
      el.textContent = `${k.lateArrivalsToday ?? 0} Late · ${k.deniedScansToday ?? 0} Denied`;
    });

    const tc = k.tierCounts || {};
    const breakdownEl = document.getElementById('overview-tier-breakdown');
    if (breakdownEl) {
      if (Array.isArray(state.clearanceMatrix) && state.clearanceMatrix.length) {
        breakdownEl.textContent = state.clearanceMatrix
          .map((t) => `${t.code}:${tc[t.code] ?? (t.member_count ?? 0)}`)
          .join(' · ');
      } else {
        const parts = Object.entries(tc).map(([lvl, cnt]) => `${lvl}:${cnt}`);
        breakdownEl.textContent = parts.length ? parts.join(' · ') : 'No data';
      }
    }

    // Tab counts
    const checkedInCount = state.crew.filter((c) => c.daily_state === 'checked_in').length;
    const checkedOutCount = state.crew.filter((c) => c.daily_state === 'checked_out').length;
    const stockAuthCount = state.crew.filter((c) => c.stock_authorized).length;
    const restrictedCount = state.crew.filter((c) => !c.stock_authorized).length;

    document.querySelectorAll('.js-tab-count-all').forEach((el) => (el.textContent = String(state.crew.length)));
    document.querySelectorAll('.js-tab-count-in').forEach((el) => (el.textContent = String(checkedInCount)));
    document.querySelectorAll('.js-tab-count-out').forEach((el) => (el.textContent = String(checkedOutCount)));
    document.querySelectorAll('.js-tab-count-stock').forEach((el) => (el.textContent = String(stockAuthCount)));
    document.querySelectorAll('.js-tab-count-l1').forEach((el) => (el.textContent = String(restrictedCount)));
  }

  function renderCheckpointSelectors() {
    const isStock = state.checkpointType === 'stock_warehouse';
    const isCtrlLocked = isCurrentUserStockController();
    const isStationLocked = Boolean(state.stationLocked);
    const isLocked = isStationLocked || isCtrlLocked;
    const assignedCpName = state.currentUser?.assigned_checkpoint_name || state.activeCheckpoint?.name || 'assigned terminal';
    const activeCpName = state.activeCheckpoint?.name || 'active checkpoint';
    const lockReason = isCtrlLocked
      ? `Gate Controller locked: Your account is assigned to ${assignedCpName}. Use Relief / Swap to request reassignment.`
      : (isStationLocked
          ? `Station PIN locked to ${activeCpName}. Click the Station Lock pill to unlock with your Site PIN.`
          : '');

    document.querySelectorAll('.cp-type-toggle').forEach((wrap) => {
      wrap.classList.toggle('is-locked', isLocked);
      if (isLocked) {
        wrap.setAttribute('title', lockReason);
      } else {
        wrap.removeAttribute('title');
      }
    });

    document.querySelectorAll('.js-cp-type-btn').forEach((btn) => {
      const btnType = btn.getAttribute('data-cp-type');
      btn.classList.remove('active-stock', 'active-venue');
      if (btnType === state.checkpointType) {
        btn.classList.add(isStock ? 'active-stock' : 'active-venue');
      }
      // Keep button clickable so clicking when locked triggers a clear explanation toast
      btn.disabled = false;
      btn.classList.toggle('is-locked', isLocked);
      btn.setAttribute('aria-disabled', isLocked ? 'true' : 'false');
      if (isLocked) {
        btn.setAttribute('title', lockReason);
      } else {
        btn.removeAttribute('title');
      }
    });

    const optionsList = isStock
      ? state.checkpoints.stock_warehouses || []
      : state.checkpoints.event_venues || [];

    document.querySelectorAll('.js-checkpoint-select').forEach((sel) => {
      sel.innerHTML = optionsList
        .map(
          (cp) =>
            `<option value="${cp.id}" ${Number(cp.id) === Number(state.checkpointId) ? 'selected' : ''}>${escapeHtml(
              cp.name
            )} (Call: ${escapeHtml(cp.call_time || '08:00')})</option>`
        )
        .join('');
      sel.disabled = isLocked;
      if (isLocked) {
        sel.setAttribute('title', lockReason);
      } else {
        sel.removeAttribute('title');
      }
    });

    document.querySelectorAll('.js-station-lock-btn').forEach((btn) => {
      btn.classList.toggle('locked', isLocked);
      btn.classList.toggle('unlocked', !isLocked);
      btn.setAttribute(
        'title',
        isCtrlLocked
          ? lockReason
          : (isStationLocked
              ? `Station PIN locked to ${activeCpName} — click to unlock with Site PIN`
              : `Lock terminal switcher to ${activeCpName} with Site PIN`)
      );
    });

    document.querySelectorAll('.js-station-lock-label').forEach((lbl) => {
      if (isCtrlLocked) {
        lbl.textContent = `ASSIGNED TERMINAL LOCKED (${assignedCpName})`;
      } else {
        lbl.textContent = isStationLocked
          ? `STATION PIN LOCKED (${activeCpName}) · Unlock`
          : 'MULTI-CHECKPOINT MODE · Lock Station';
      }
    });

    document.querySelectorAll('.js-active-cp-meta').forEach((el) => {
      el.textContent = `${state.activeCheckpoint.name} · Call Time ${state.activeCheckpoint.call_time || '08:00'} · ${
        state.activeCheckpoint.min_clearance || ''
      }`;
    });

    const sbCallPill = document.getElementById('sidebar-active-calltime-pill');
    if (sbCallPill) {
      sbCallPill.textContent = state.activeCheckpoint.call_time || '08:00';
    }
    updateKioskQuickbar();
    renderTerminalLockScreen();

    // Update Screen 2 Spotlight
    const spType = document.querySelector('.js-spotlight-cp-type');
    const spHours = document.querySelector('.js-spotlight-cp-hours');
    const spName = document.querySelector('.js-spotlight-cp-name');
    const spLoc = document.querySelector('.js-spotlight-cp-loc');
    const spRule = document.querySelector('.js-spotlight-rule-text');
    if (spType) spType.textContent = isStock ? 'STOCK WAREHOUSE GATE' : 'EVENT VENUE ENTRANCE';
    if (spHours) spHours.textContent = `CALL TIME: ${state.activeCheckpoint.call_time || '08:00'} · KIGALI`;
    if (spName) spName.textContent = state.activeCheckpoint.name;
    if (spLoc) spLoc.textContent = `${state.activeCheckpoint.location || 'Kigali'} · ${state.activeCheckpoint.lead_label || ''}`;
    if (spRule) spRule.textContent = state.activeCheckpoint.min_clearance || '4-Tier Access Matrix Active';
  }

  function updateKioskQuickbar() {
    const qbTimeEl = document.getElementById('kiosk-quickbar-time');
    const qbSubEl = document.getElementById('kiosk-quickbar-sub');
    if (!qbTimeEl && !qbSubEl) return;

    const ct = state.activeCheckpoint.call_time || '08:00';
    const parts = ct.split(':');
    let h = parseInt(parts[0], 10) || 8;
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const formatted12 = `${String(h12).padStart(2, '0')}:${m} ${ampm}`;

    if (qbTimeEl) {
      qbTimeEl.textContent = `${formatted12} (${ct})`;
    }
    if (qbSubEl) {
      qbSubEl.textContent = `${state.activeCheckpoint.name} · 15m grace window · Live arrival punctuality active`;
    }
  }

  let terminalLockClockTimer = null;

  function resolveWarehousePinClient(wh) {
    if (wh && wh.terminal_pin && String(wh.terminal_pin).trim() !== '') {
      return String(wh.terminal_pin).trim();
    }
    return '';
  }

  function getActiveCheckpointPin() {
    if (state.checkpointType === 'stock_warehouse') {
      const list = state.checkpoints.stock_warehouses || [];
      const wh = list.find((w) => Number(w.id) === Number(state.checkpointId)) || state.activeCheckpoint;
      return resolveWarehousePinClient(wh);
    }
    return (state.activeCheckpoint && state.activeCheckpoint.terminal_pin)
      ? String(state.activeCheckpoint.terminal_pin).trim()
      : '';
  }

  async function verifyCheckpointPin(pin) {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) return { ok: false, error: 'Please enter a Terminal PIN.' };
    try {
      const res = await fetch('api.php?action=verify_terminal_pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_terminal_pin',
          checkpoint_type: state.checkpointType,
          checkpoint_id: state.checkpointId,
          pin: cleanPin,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { ok: false, error: 'Unable to verify Terminal PIN with server. Check your connection.' };
    }
  }

  function updateTerminalLockClock() {
    const clockEl = document.getElementById('terminal-lock-clock');
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function renderTerminalLockScreen() {
    const locked = Boolean(state.terminalScreenLocked);
    const heroCard = document.getElementById('pane-kiosk');
    const chip = document.getElementById('kiosk-scanner-station-chip');
    const statusPill = document.getElementById('terminal-lock-status-pill');
    const statusIcon = document.getElementById('terminal-lock-status-icon');
    const statusText = document.getElementById('terminal-lock-status-text');
    const lockBtn = document.getElementById('terminal-lock-screen-btn');
    const pinMgrBtn = document.getElementById('terminal-pin-manager-btn');
    const quickbar = document.getElementById('kiosk-calltime-quickbar');
    const scanForm = document.getElementById('kiosk-scan-form');
    const lockPanel = document.getElementById('terminal-lock-screen-panel');
    const facChip = document.getElementById('terminal-lock-facility-chip');
    const cpNameEl = document.getElementById('terminal-lock-cp-name');
    const cpName = state.activeCheckpoint?.name || 'Ndera Warehouse';
    const cpCode = state.activeCheckpoint?.code ? ` (${state.activeCheckpoint.code})` : '';
    const isStock = state.checkpointType === 'stock_warehouse';

    if (heroCard) heroCard.classList.toggle('is-terminal-locked', locked);
    if (chip) {
      chip.textContent = locked ? 'Screen Locked' : 'Scanner Active';
      chip.classList.toggle('is-locked', locked);
    }
    if (statusPill) {
      statusPill.classList.toggle('locked', locked);
      statusPill.classList.toggle('unlocked', !locked);
    }
    if (statusIcon) {
      statusIcon.innerHTML = `<img src="assets/${locked ? 'lock.svg' : 'unlock.svg'}" alt="" class="svg-icon" />`;
    }
    if (statusText) statusText.textContent = locked ? `Locked · ${cpName}` : 'Screen Unlocked';
    const quickTips = document.getElementById('kiosk-scanner-quick-tips');
    if (lockBtn) {
      lockBtn.innerHTML = `<img src="assets/${locked ? 'unlock.svg' : 'lock.svg'}" alt="" class="svg-icon" /><span>${locked ? 'Unlock Screen' : 'Lock Screen'}</span>`;
      lockBtn.title = locked ? 'Enter PIN to unlock terminal screen' : 'Lock this terminal screen';
      lockBtn.style.display = locked ? 'none' : 'inline-flex';
    }
    if (quickTips) {
      quickTips.style.display = locked ? 'none' : 'flex';
    }
    if (pinMgrBtn) {
      const canManagePins = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserTechLead();
      pinMgrBtn.style.display = canManagePins ? 'inline-flex' : 'none';
    }
    if (quickbar) quickbar.style.display = locked ? 'none' : 'flex';
    if (scanForm) scanForm.style.display = locked ? 'none' : 'flex';
    if (lockPanel) lockPanel.style.display = locked ? 'block' : 'none';
    if (locked) {
      stopCameraScanner();
    }
    renderOfflineQueueBar();
    if (facChip) {
      facChip.innerHTML = `<img src="assets/${isStock ? 'warehouse-13.svg' : 'map-pin-13.svg'}" alt="" class="svg-icon" /><span>${escapeHtml(cpName.toUpperCase() + cpCode.toUpperCase())}</span>`;
    }
    if (cpNameEl) cpNameEl.textContent = cpName;

    if (locked) {
      updateTerminalLockClock();
      if (!terminalLockClockTimer) {
        terminalLockClockTimer = setInterval(updateTerminalLockClock, 1000);
      }
    } else if (terminalLockClockTimer) {
      clearInterval(terminalLockClockTimer);
      terminalLockClockTimer = null;
    }
  }

  function getManageablePinCheckpoints() {
    const canManageWarehouses = isCurrentUserAdmin() || isCurrentUserStockManager();
    const canManageVenues = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserTechLead();
    const warehouses =
      (state.checkpoints.stock_warehouses && state.checkpoints.stock_warehouses.length > 0
        ? state.checkpoints.stock_warehouses
        : state.stockManager.warehouses) || [];
    const events = state.checkpoints.events || [];
    const items = [];

    if (canManageWarehouses) {
      warehouses.forEach((w) => {
        const cpId = String(w.id);
        items.push({
          key: `stock_warehouse:${cpId}`,
          cpType: 'stock_warehouse',
          cpId,
          typeLabel: '🏭 Facility Gate',
          name: w.name || 'Warehouse',
          code: w.code || 'STK',
          location: w.location || '',
          pin: resolveWarehousePinClient(w),
        });
      });
    }

    if (canManageVenues) {
      events.forEach((ev) => {
        const cpId = String(ev.id || ev.raw_id || '');
        if (!cpId) return;
        items.push({
          key: `event_venue:${cpId}`,
          cpType: 'event_venue',
          cpId,
          typeLabel: '🎪 Event Venue',
          name: ev.name || ev.title || 'Event Venue',
          code: ev.code || ev.event_code || 'EVT',
          location: ev.location || '',
          pin: ev.terminal_pin ? String(ev.terminal_pin).trim() : '',
        });
      });
    }

    return { canManageWarehouses, canManageVenues, items };
  }

  function renderWarehousePinList() {
    const listEl = document.getElementById('warehouse-pin-list');
    const selEl = document.getElementById('wh-pin-select');
    const { items } = getManageablePinCheckpoints();

    if (listEl) {
      if (items.length === 0) {
        listEl.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); padding: 12px;">No manageable terminal checkpoints found for your role.</div>`;
      } else {
        listEl.innerHTML = items
          .map((item) => `
            <div class="warehouse-pin-row">
              <div class="warehouse-pin-row-info">
                <span class="warehouse-pin-row-name">${escapeHtml(item.name)}</span>
                <span class="warehouse-pin-row-sub">${escapeHtml(item.typeLabel)} · ${escapeHtml(item.code)}${item.location ? ` · ${escapeHtml(item.location)}` : ''}</span>
              </div>
              <div class="warehouse-pin-row-actions">
                <span class="warehouse-pin-code-pill">PIN: ${item.pin ? escapeHtml(item.pin) : 'Not Set'}</span>
                <button type="button" class="btn btn-secondary-32-sm js-edit-wh-pin-btn" data-cp-key="${escapeHtml(item.key)}" data-pin="${escapeHtml(item.pin)}">Edit</button>
              </div>
            </div>
          `)
          .join('');
      }
    }

    if (selEl) {
      const prevVal = selEl.value;
      const whItems = items.filter((i) => i.cpType === 'stock_warehouse');
      const evItems = items.filter((i) => i.cpType === 'event_venue');
      const renderOpt = (i) => `<option value="${escapeHtml(i.key)}">${escapeHtml(i.name)} (${escapeHtml(i.code)})</option>`;
      let html = '';
      if (whItems.length > 0) {
        html += `<optgroup label="Facility Gates (Stock Warehouses)">${whItems.map(renderOpt).join('')}</optgroup>`;
      }
      if (evItems.length > 0) {
        html += `<optgroup label="Event Venues">${evItems.map(renderOpt).join('')}</optgroup>`;
      }
      selEl.innerHTML = html || `<option value="">No checkpoints available</option>`;

      const activeKey = `${state.checkpointType}:${state.checkpointId}`;
      if (prevVal && items.some((i) => i.key === prevVal)) {
        selEl.value = prevVal;
      } else if (items.some((i) => i.key === activeKey)) {
        selEl.value = activeKey;
      } else if (items.length > 0) {
        selEl.value = items[0].key;
      }

      const selectedItem = items.find((i) => i.key === selEl.value);
      const pinValInput = document.getElementById('wh-pin-value');
      if (pinValInput && selectedItem && !pinValInput.matches(':focus')) {
        pinValInput.value = selectedItem.pin;
      }
    }
  }

  function buildBadgeQrSvg(codeText) {
    const str = String(codeText || 'REW-BADGE-0000');
    const size = 11;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const isFinder = (r, c) =>
      (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3);
    const rects = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        let on = false;
        if (isFinder(r, c)) {
          on = (r === 0 || r === 2 || r === size - 1 || r === size - 3 || c === 0 || c === 2 || c === size - 1 || c === size - 3 || (r === 1 && c === 1) || (r === 1 && c === size - 2) || (r === size - 2 && c === 1));
        } else {
          const bit = (r * size + c + (str.charCodeAt((r + c) % str.length) || 0)) & 31;
          const mixed = Math.imul(hash ^ ((r + 1) * 73856093) ^ ((c + 1) * 19349663), 0x45d9f3b);
          on = (((mixed >>> bit) ^ mixed) & 1) === 1;
        }
        if (on) {
          rects.push(`<rect x="${c * 7}" y="${r * 7}" width="7" height="7" rx="1" fill="#0f172a"/>`);
        }
      }
    }
    return `<svg viewBox="0 0 ${size * 7} ${size * 7}" width="78" height="78" role="img" aria-label="Digital badge matrix for ${escapeHtml(str)}">${rects.join('')}</svg>`;
  }

  async function fetchLiveDynamicPassQr(force = false) {
    if (!state.currentUser || !state.currentUser.id) return;
    const nowSlice = Math.floor(Date.now() / 30000);
    if (!force && state.passQrData && Number(state.passQrUserId) === Number(state.currentUser.id) && Number(state.passQrSlice) === nowSlice) {
      return;
    }
    try {
      const res = await fetch('api.php?action=get_dynamic_pass_qr', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data && data.ok && data.token) {
        state.passQrData = data;
        state.passQrSlice = Number(data.slice || nowSlice);
        state.passQrUserId = Number(data.user_id || state.currentUser.id);
        renderCrewDigitalPassQrOnly();
      }
    } catch (e) {}
  }

  function renderCrewDigitalPassQrOnly() {
    const qrBox = document.getElementById('crew-pass-qr-box');
    const timerEl = document.getElementById('crew-pass-rotate-label');
    const tokenEl = document.getElementById('crew-pass-live-code');
    if (!qrBox) return;
    const tok = state.passQrData && state.passQrData.token ? String(state.passQrData.token) : '';
    const meCrew = (state.crew || []).find((c) => Number(c.id) === Number(state.currentUser?.id)) || state.currentUser;
    const fallbackCode = meCrew?.badge_code || `REW-BADGE-${String(meCrew?.id || 0).padStart(4, '0')}`;
    const payloadStr = tok || fallbackCode;
    if (window.AbilityQRCode && typeof window.AbilityQRCode.toSvg === 'function') {
      qrBox.innerHTML = window.AbilityQRCode.toSvg(payloadStr, 140);
    } else {
      qrBox.innerHTML = buildBadgeQrSvg(payloadStr);
    }
    if (tokenEl) {
      tokenEl.textContent = tok ? `${tok.slice(0, 18)}… (30s Dynamic)` : fallbackCode;
    }
    if (timerEl) {
      const secs = Math.max(1, 30 - (Math.floor(Date.now() / 1000) % 30));
      timerEl.textContent = tok ? `Anti-Shadowing QR · Rotates in ${secs}s` : 'Static Fallback Badge QR';
    }
  }

  function renderCrewDigitalPassCard() {
    const card = document.getElementById('crew-digital-pass-card');
    if (!card) return;
    if (!state.currentUser) {
      card.style.display = 'none';
      card.innerHTML = '';
      return;
    }

    const meCrew = (state.crew || []).find((c) => Number(c.id) === Number(state.currentUser.id)) || state.currentUser;
    const fullName = meCrew.full_name || state.currentUser.full_name || 'Crew Member';
    const initials = meCrew.initials || fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'CR';
    const roleLabel = meCrew.role_display || meCrew.role || 'Field Crew';
    const dept = meCrew.department || 'Operations';
    const badgeCode = meCrew.badge_code || `REW-BADGE-${String(meCrew.id || 0).padStart(4, '0')}`;
    const rfidUid = meCrew.rfid_uid || 'RFID-UNASSIGNED';
    const clearance = meCrew.clearance_label || meCrew.clearance_level || 'L2 Technician';
    const cpName = meCrew.assigned_checkpoint_name || meCrew.last_checkpoint_name || state.activeCheckpoint?.name || 'Any Authorized Gate';
    const dailyState = meCrew.daily_state || '';
    const statusLabel = dailyState === 'checked_in'
      ? 'Checked In · On Site'
      : (dailyState === 'checked_out' ? 'Checked Out · Transit' : 'Standby / Ready');
    const statusClass = dailyState === 'checked_in'
      ? 'status-in'
      : (dailyState === 'checked_out' ? 'status-out' : '');
    const kicker = isCurrentUserTechnician() ? 'MY DIGITAL CREW PASS' : 'PERSONAL DIGITAL ID PASS';
    const avatarHtml = meCrew.photo_url || meCrew.profile_image_url
      ? `<img src="${escapeHtml(meCrew.photo_url || meCrew.profile_image_url)}" alt="${escapeHtml(fullName)}" />`
      : escapeHtml(initials);
    const devCount = Number(state.passQrData?.trusted_device_count ?? meCrew.trusted_device_count ?? 0);

    card.style.display = 'flex';
    card.innerHTML = `
      <div class="crew-pass-left">
        <div class="crew-pass-avatar">${avatarHtml}</div>
        <div class="crew-pass-meta">
          <span class="crew-pass-kicker">${escapeHtml(kicker)}</span>
          <div class="crew-pass-name">${escapeHtml(fullName)}</div>
          <div class="crew-pass-sub">${escapeHtml(roleLabel)} · ${escapeHtml(dept)}</div>
          <div class="crew-pass-pills">
            <span class="crew-pass-pill ${statusClass}">${escapeHtml(statusLabel)}</span>
            <span class="crew-pass-pill">🔑 ${escapeHtml(clearance)}</span>
            <span class="crew-pass-pill">📍 ${escapeHtml(cpName)}</span>
            <span class="crew-pass-pill">${devCount > 0 ? `📱 ${devCount} Bound Device` : '📱 Auto-binds on first QR scan'}</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary-32-sm" id="btn-refresh-dynamic-pass">↻ Rotate QR Now</button>
            <button type="button" class="btn btn-secondary-32-sm" id="btn-rebind-device-totp">📱 Rebind Phone via TOTP</button>
          </div>
        </div>
      </div>
      <div class="crew-pass-qr-wrap">
        <div class="crew-pass-qr-box" id="crew-pass-qr-box">${buildBadgeQrSvg(badgeCode)}</div>
        <div class="crew-pass-code-col">
          <span id="crew-pass-rotate-label" style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #b45309;">Anti-Shadowing 30s QR</span>
          <span class="crew-pass-badge-code">${escapeHtml(badgeCode)}</span>
          <span class="crew-pass-rfid" id="crew-pass-live-code">${escapeHtml(rfidUid)}</span>
        </div>
      </div>
    `;

    renderCrewDigitalPassQrOnly();
    fetchLiveDynamicPassQr(false);

    document.getElementById('btn-refresh-dynamic-pass')?.addEventListener('click', () => fetchLiveDynamicPassQr(true));
    document.getElementById('btn-rebind-device-totp')?.addEventListener('click', async () => {
      const totpCode = window.prompt('Enter your 6-digit Authenticator (TOTP) code to bind this device as your sole check-in phone:');
      if (!totpCode) return;
      try {
        const res = await fetch('api.php?action=rebind_trusted_device_totp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rebind_trusted_device_totp',
            device_token: getOrCreateClientDeviceToken(),
            device_label: inferClientDeviceLabel(),
            totp_code: totpCode.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.error || 'Could not rebind device.');
          return;
        }
        applyBootstrapPayload(data, true);
        fetchLiveDynamicPassQr(true);
        showToast(data.message || 'Trusted device updated.');
      } catch (err) {
        showToast('Network error rebinding device.');
      }
    });

    if (!state.passQrTimer) {
      state.passQrTimer = setInterval(() => {
        if (document.hidden || !state.currentUser) return;
        const box = document.getElementById('crew-pass-qr-box');
        if (!box) return;
        const secInSlice = Math.floor(Date.now() / 1000) % 30;
        const timerEl = document.getElementById('crew-pass-rotate-label');
        if (timerEl && state.passQrData?.token) {
          timerEl.textContent = `Anti-Shadowing QR · Rotates in ${Math.max(1, 30 - secInSlice)}s`;
        }
        if (Math.floor(Date.now() / 30000) !== Number(state.passQrSlice)) {
          fetchLiveDynamicPassQr(false);
        }
      }, 1000);
    }
  }

  async function refreshKioskVenueQr() {
    const box = document.getElementById('kiosk-venue-qr-box');
    const countdownEl = document.getElementById('kiosk-vqr-countdown');
    const policyPill = document.getElementById('kiosk-vqr-policy-pill');
    const activeCp = state.activeCheckpoint || {};
    if (policyPill) {
      const pol = String(activeCp.checkin_policy || 'hybrid').toLowerCase();
      policyPill.textContent = pol === 'qr_strict' ? 'Strict QR Policy' : (pol === 'manual_allowed' ? 'Manual + QR Allowed' : 'Hybrid · Name + QR');
    }
    if (!box || !state.currentUser || state.terminalScreenLocked) return;
    try {
      const res = await fetch(`api.php?action=issue_venue_checkin_qr&checkpoint_type=${encodeURIComponent(state.checkpointType)}&checkpoint_id=${encodeURIComponent(state.checkpointId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue_venue_checkin_qr',
          checkpoint_type: state.checkpointType,
          checkpoint_id: state.checkpointId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || !data.ok || !data.token) {
        if (countdownEl) countdownEl.textContent = data?.error ? 'QR restricted' : 'QR paused';
        return;
      }
      state.vqrLastUrl = new URL(data.checkin_url, window.location.href).href;
      state.vqrSecondsLeft = 20;
      if (window.AbilityQRCode && typeof window.AbilityQRCode.toSvg === 'function') {
        box.innerHTML = window.AbilityQRCode.toSvg(state.vqrLastUrl, 108);
      } else {
        box.textContent = data.token.slice(0, 12);
      }
      if (countdownEl) countdownEl.textContent = 'Rotating: 20s';
    } catch (e) {}
  }

  function renderKioskVenueQrDeck() {
    const deck = document.getElementById('kiosk-venue-qr-deck');
    if (!deck) return;
    const rawRole = String(state.currentUser?.role || '').toLowerCase();
    const canOperateGate = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserEventCommand() || isCurrentUserTechLead() || rawRole === 'stock_controller';
    deck.style.display = (canOperateGate && !state.terminalScreenLocked) ? 'block' : 'none';
    if (!canOperateGate || state.terminalScreenLocked) return;

    const activeCp = state.activeCheckpoint || {};
    const policyPill = document.getElementById('kiosk-vqr-policy-pill');
    if (policyPill) {
      const pol = String(activeCp.checkin_policy || 'hybrid').toLowerCase();
      policyPill.textContent = pol === 'qr_strict' ? 'Strict QR Policy' : (pol === 'manual_allowed' ? 'Manual + QR Allowed' : 'Hybrid · Name + QR');
    }
    const cpTag = `${state.checkpointType}:${state.checkpointId}`;
    if (state.vqrCpKey !== cpTag) {
      state.vqrCpKey = cpTag;
      refreshKioskVenueQr();
    }
    if (!state.vqrTimer) {
      state.vqrTimer = setInterval(() => {
        if (document.hidden || state.terminalScreenLocked || state.activeScreen !== 'terminals') return;
        const deckEl = document.getElementById('kiosk-venue-qr-deck');
        if (!deckEl || deckEl.style.display === 'none') return;
        state.vqrSecondsLeft = Math.max(0, Number(state.vqrSecondsLeft || 0) - 1);
        const cdEl = document.getElementById('kiosk-vqr-countdown');
        if (state.vqrSecondsLeft <= 0) {
          refreshKioskVenueQr();
        } else if (cdEl) {
          cdEl.textContent = `Rotating: ${state.vqrSecondsLeft}s`;
        }
      }, 1000);
    }
  }

  function openWarehousePinModal() {
    const modal = document.getElementById('warehouse-pin-modal');
    if (!modal) return;
    renderWarehousePinList();
    modal.classList.add('open');
  }

  function renderVerificationDeck() {
    const v = state.currentVerification;
    if (!v || !v.badge) return;
    const b = v.badge;

    const cardEl = document.getElementById('kiosk-verification-card');
    const backdropEl = document.getElementById('kiosk-modal-backdrop');

    const staffCodeEl = document.getElementById('kiosk-staff-code');
    const cpTagEl = document.getElementById('kiosk-checkpoint-tag');
    const portraitImg = document.getElementById('kiosk-portrait-img');
    const initialsEl = document.getElementById('kiosk-initials-avatar');
    const phoneEl = document.getElementById('kiosk-staff-phone');
    const rolePillEl = document.getElementById('kiosk-role-pill');

    if (staffCodeEl) staffCodeEl.textContent = b.staff_code || 'ABL-006';
    if (cpTagEl) cpTagEl.textContent = String(v.checkpoint_name || state.activeCheckpoint.name).toUpperCase();

    const facilityBadgeEl = document.getElementById('kiosk-facility-type-badge');
    if (facilityBadgeEl) {
      const isStockFacility = (v.checkpoint_type === 'stock_warehouse') || (state.activeCheckpoint && state.activeCheckpoint.type === 'stock_warehouse');
      facilityBadgeEl.textContent = isStockFacility ? '🏢 Facility Gate' : '🏟️ Event Venue';
      facilityBadgeEl.className = `kiosk-facility-pill ${isStockFacility ? 'stock' : 'venue'}`;
    }

    const assignmentTagEl = document.getElementById('kiosk-assignment-tag');
    if (assignmentTagEl) {
      if (state.activeCheckpoint.type === 'event_venue' && v.is_assigned_to_event !== undefined) {
        assignmentTagEl.style.display = 'inline-flex';
        if (v.is_assigned_to_event) {
          assignmentTagEl.className = 'status-badge status-badge-green-sm';
          assignmentTagEl.textContent = 'Assigned Event Crew';
        } else {
          assignmentTagEl.className = 'status-badge status-badge-amber-sm';
          assignmentTagEl.textContent = 'Unassigned Roster';
        }
      } else {
        assignmentTagEl.style.display = 'none';
      }
    }

    if (b.profile_image && portraitImg && initialsEl) {
      portraitImg.src = b.profile_image;
      portraitImg.style.display = 'block';
      initialsEl.style.display = 'none';
      portraitImg.onerror = function () {
        portraitImg.style.display = 'none';
        initialsEl.style.display = 'flex';
      };
    } else if (portraitImg && initialsEl) {
      portraitImg.style.display = 'none';
      initialsEl.style.display = 'flex';
      initialsEl.textContent = b.initials || 'CR';
    }

    if (phoneEl) phoneEl.textContent = `${b.phone || '+250 788 100 000'} · @${b.username}`;
    if (rolePillEl) rolePillEl.textContent = b.role_pill || 'TECHNICIAN - PRODUCTION';

    const nameEl = document.getElementById('kiosk-staff-name');
    const titleEl = document.getElementById('kiosk-clearance-title');
    const circleEl = document.getElementById('kiosk-clearance-circle');
    if (nameEl) nameEl.textContent = b.full_name;
    if (titleEl) titleEl.textContent = b.clearance_title;
    if (circleEl) {
      circleEl.textContent = b.clearance_code || 'L2';
      circleEl.style.backgroundColor = b.clearance_color || '#2563eb';
    }

    const bannerEl = document.getElementById('kiosk-status-banner');
    const ringEl = document.getElementById('kiosk-status-ring');
    const svgEl = document.getElementById('kiosk-status-svg');
    const headlineEl = document.getElementById('kiosk-status-headline');
    const punctEl = document.getElementById('kiosk-punctuality-pill');
    const reasonEl = document.getElementById('kiosk-status-reason');
    const heroTsWrap = document.getElementById('kiosk-prominent-timestamp');
    const heroTsVal = document.getElementById('kiosk-hero-ts-value');

    const granted = Boolean(v.allowed);
    const isCheckOut = granted && (
      v.action === 'check_out' ||
      (v.badge && v.badge.daily_state === 'checked_out') ||
      (v.check_out_time && !v.check_in_time)
    );

    if (cardEl) {
      cardEl.classList.toggle('kiosk-state-checkout', isCheckOut);
    }
    if (backdropEl) {
      backdropEl.classList.toggle('kiosk-state-checkout', isCheckOut);
    }

    if (isCheckOut) {
      // Exit Action: Instantly flip to Amber / Orange with "CHECKED OUT"
      if (bannerEl) bannerEl.className = 'kiosk-status-banner checked-out';
      if (ringEl) ringEl.className = 'kiosk-status-ring checked-out';
      if (svgEl) {
        svgEl.innerHTML = `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        `;
      }
      if (headlineEl) {
        headlineEl.textContent = 'CHECKED OUT';
        headlineEl.className = 'kiosk-status-headline checked-out';
      }
      if (punctEl) {
        punctEl.textContent = 'SHIFT CHECK-OUT';
        punctEl.className = 'kiosk-punctuality-pill late';
      }
      if (heroTsWrap && heroTsVal) {
        heroTsWrap.style.display = 'flex';
        heroTsVal.textContent = `CHECKED OUT AT ${v.check_out_time || v.scanned_at || new Date().toLocaleTimeString()}`;
      }
      if (reasonEl) {
        reasonEl.textContent = v.reason || `Departure logged at ${v.checkpoint_name || state.activeCheckpoint.name}`;
      }
    } else if (granted) {
      // Inbound Action: Full Navy with Giant "ACCESS GRANTED" + Universal Green Checkmark
      if (bannerEl) bannerEl.className = 'kiosk-status-banner granted';
      if (ringEl) ringEl.className = 'kiosk-status-ring granted';
      if (svgEl) {
        svgEl.innerHTML = `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      }
      if (headlineEl) {
        headlineEl.textContent = 'ACCESS GRANTED';
        headlineEl.className = 'kiosk-status-headline granted';
      }
      if (punctEl) {
        punctEl.textContent = v.punctuality_label || 'ON TIME';
        punctEl.className = `kiosk-punctuality-pill ${v.punctuality || 'on_time'}`;
      }
      if (heroTsWrap && heroTsVal) {
        if (v.check_in_time) {
          heroTsWrap.style.display = 'flex';
          heroTsVal.textContent = `CHECKED IN AT ${v.check_in_time}`;
        } else {
          heroTsWrap.style.display = 'none';
        }
      }
      if (reasonEl) {
        reasonEl.textContent = v.reason || '';
      }
    } else {
      // Access Denied
      if (bannerEl) bannerEl.className = 'kiosk-status-banner denied';
      if (ringEl) ringEl.className = 'kiosk-status-ring denied';
      if (svgEl) {
        svgEl.innerHTML = `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      }
      if (headlineEl) {
        headlineEl.textContent = 'ACCESS DENIED';
        headlineEl.className = 'kiosk-status-headline denied';
      }
      if (punctEl) {
        punctEl.textContent = 'RESTRICTED';
        punctEl.className = 'kiosk-punctuality-pill restricted';
      }
      if (heroTsWrap) {
        heroTsWrap.style.display = 'none';
      }
      if (reasonEl) {
        reasonEl.textContent = v.reason || 'Access denied for active checkpoint.';
      }
    }

    // Passive Inbound & Outbound Timestamp Indicators (State Dictated by Scanner)
    const inIndicator = document.getElementById('kiosk-indicator-in');
    const outIndicator = document.getElementById('kiosk-indicator-out');
    const inTimeEl = document.getElementById('kiosk-in-time');
    const outTimeEl = document.getElementById('kiosk-out-time');

    if (inTimeEl) {
      inTimeEl.textContent = v.check_in_time ? `In: ${v.check_in_time}` : 'Not Checked In';
    }
    if (outTimeEl) {
      outTimeEl.textContent = v.check_out_time ? `Out: ${v.check_out_time}` : '--:--:--';
    }
    if (inIndicator) {
      inIndicator.classList.toggle('in-active', Boolean(v.check_in_time));
    }
    if (outIndicator) {
      outIndicator.classList.toggle('out-active', Boolean(v.check_out_time));
    }

    // Phase 1: Call-Time & Live Punctuality Delta Strip
    const calltimeEl = document.getElementById('kiosk-delta-calltime');
    const arrivalPillEl = document.getElementById('kiosk-delta-arrival-pill');
    const schedCallTime = v.call_time || (state.activeCheckpoint && state.activeCheckpoint.call_time) || '08:00';
    if (calltimeEl) calltimeEl.textContent = `${schedCallTime} AM`;

    const now = new Date();
    const [cH, cM] = schedCallTime.split(':').map(Number);
    const schedDate = new Date();
    schedDate.setHours(cH || 8, cM || 0, 0, 0);
    const localDiff = Math.round((now - schedDate) / 60000);
    const diff = v.diff_minutes !== undefined ? Number(v.diff_minutes) : localDiff;

    if (arrivalPillEl) {
      if (diff <= 15) {
        arrivalPillEl.className = 'kiosk-delta-pill on_time';
        arrivalPillEl.textContent = diff < -5 ? `Early (${Math.abs(diff)}m)` : `On-Time (+${diff}m)`;
      } else {
        arrivalPillEl.className = 'kiosk-delta-pill late';
        arrivalPillEl.textContent = `Cutoff Exceeded (+${diff}m Late)`;
      }
    }

    // Phase 1: Interactive Operator Decision Action Buttons
    const btnApproveIn = document.getElementById('kiosk-btn-approve-in');
    const btnApproveOut = document.getElementById('kiosk-btn-approve-out');
    const btnOverride = document.getElementById('kiosk-btn-override');
    const btnConfirmFace = document.getElementById('kiosk-btn-confirm-face');
    const btnDecline = document.getElementById('kiosk-btn-decline');
    const pnlOverride = document.getElementById('kiosk-override-panel');
    const pnlDecline = document.getElementById('kiosk-decline-panel');

    if (pnlOverride) pnlOverride.style.display = 'none';
    if (pnlDecline) pnlDecline.style.display = 'none';

    const isCurrentlyCheckedIn = (b.daily_state === 'checked_in');
    const isLateArrival = !isCurrentlyCheckedIn && diff > 15;
    const isLockedLate = b.badge_status === 'disabled_late' || isLateArrival;

    if (v.visual_confirm_required && state.pendingFaceMatchScan) {
      if (btnApproveIn) btnApproveIn.style.display = 'none';
      if (btnApproveOut) btnApproveOut.style.display = 'none';
      if (btnOverride) btnOverride.style.display = 'none';
      if (btnConfirmFace) btnConfirmFace.style.display = 'inline-flex';
      if (btnDecline) btnDecline.style.display = 'inline-flex';
    } else if (v.confirmed) {
      // Just confirmed action: hide decision buttons while countdown ticks
      if (btnApproveIn) btnApproveIn.style.display = 'none';
      if (btnApproveOut) btnApproveOut.style.display = 'none';
      if (btnOverride) btnOverride.style.display = 'none';
      if (btnConfirmFace) btnConfirmFace.style.display = 'none';
      if (btnDecline) btnDecline.style.display = 'none';
    } else if (isCurrentlyCheckedIn) {
      // Already inside -> Offer Check-Out and Decline
      if (btnApproveIn) btnApproveIn.style.display = 'none';
      if (btnApproveOut) btnApproveOut.style.display = 'inline-flex';
      if (btnOverride) btnOverride.style.display = 'none';
      if (btnConfirmFace) btnConfirmFace.style.display = 'none';
      if (btnDecline) btnDecline.style.display = 'inline-flex';
    } else if (isLockedLate) {
      // Tardy / Locked -> Require Supervisor Override or Decline
      if (btnApproveIn) btnApproveIn.style.display = 'none';
      if (btnApproveOut) btnApproveOut.style.display = 'none';
      if (btnOverride) btnOverride.style.display = 'inline-flex';
      if (btnConfirmFace) btnConfirmFace.style.display = 'none';
      if (btnDecline) btnDecline.style.display = 'inline-flex';
    } else {
      // Punctual Inbound -> Offer Approve In and Decline
      if (btnApproveIn) btnApproveIn.style.display = 'inline-flex';
      if (btnApproveOut) btnApproveOut.style.display = 'none';
      if (btnOverride) btnOverride.style.display = 'none';
      if (btnConfirmFace) btnConfirmFace.style.display = 'none';
      if (btnDecline) btnDecline.style.display = 'inline-flex';
    }

    // Footer Bar
    const footerBadgeEl = document.getElementById('kiosk-footer-badge');
    const footerStatusEl = document.getElementById('kiosk-footer-status');
    if (footerBadgeEl) {
      footerBadgeEl.textContent = `BADGE #: ${b.badge_code}`;
    }
    if (footerStatusEl) {
      if (isCheckOut) {
        footerStatusEl.textContent = `${v.checkpoint_name || state.activeCheckpoint.name} - Checked Out`;
        footerStatusEl.className = 'kiosk-footer-clearance-status verified';
      } else {
        footerStatusEl.textContent = `${v.checkpoint_name || state.activeCheckpoint.name} Clearance - ${
          granted ? 'Verified' : 'Denied'
        }`;
        footerStatusEl.className = `kiosk-footer-clearance-status ${granted ? 'verified' : 'denied'}`;
      }
    }

    // Update Dual-Facility Live Production Dispatch Workflow Card (Option B)
    // ONLY display for users who didn't sign out from venues or stock before transferring!
    const transitCard = document.getElementById('kiosk-transit-flow-card');
    const isTransitActive = Boolean(
      v.is_transit_transfer ||
      (b && b.daily_state === 'checked_in' && b.last_checkpoint_id && state.activeCheckpoint && Number(b.last_checkpoint_id) !== Number(state.activeCheckpoint.id))
    );
    if (transitCard) {
      transitCard.style.display = isTransitActive ? 'flex' : 'none';
      if (isTransitActive) {
        const techNames = transitCard.querySelectorAll('.kiosk-transit-tech-name');
        techNames.forEach((el) => {
          el.textContent = b.full_name || 'Technician';
        });
        const routePill = document.getElementById('kiosk-transit-route-pill');
        if (routePill && v.transit_from && v.transit_to) {
          routePill.textContent = `${v.transit_from} ➔ ${v.transit_to}`;
        } else if (routePill) {
          routePill.textContent = 'Ndera Warehouse ➔ Kigali Convention Centre';
        }
      }
    }
  }

  function renderHourlyTrafficChart() {
    const container = document.getElementById('overview-chart-bars');
    if (!container) return;

    const buckets = state.hourlyTraffic && state.hourlyTraffic.length > 0
      ? state.hourlyTraffic
      : [
          { hour: '07:00', venueCount: 1, stockCount: 1 },
          { hour: '08:00', venueCount: 2, stockCount: 1 },
          { hour: '09:00', venueCount: 1, stockCount: 0 },
          { hour: '10:00', venueCount: 0, stockCount: 0 },
          { hour: '11:00', venueCount: 0, stockCount: 0 },
          { hour: '12:00', venueCount: 0, stockCount: 0 },
          { hour: '14:00', venueCount: 0, stockCount: 0 },
          { hour: '16:00', venueCount: 0, stockCount: 0 },
        ];

    const maxVal = Math.max(
      4,
      ...buckets.map((b) => Math.max(Number(b.venueCount || 0), Number(b.stockCount || 0)))
    );

    container.innerHTML = buckets
      .map((b) => {
        const vCount = Number(b.venueCount || 0);
        const sCount = Number(b.stockCount || 0);
        const vHeight = Math.max(6, Math.round((vCount / maxVal) * 108));
        const sHeight = Math.max(6, Math.round((sCount / maxVal) * 108));
        return `
          <div class="dual-bar-group" title="${escapeHtml(b.hour)} — Venue: ${vCount} | Stock: ${sCount}">
            <div class="chart-bar-venue" style="height: ${vHeight}px;"></div>
            <div class="chart-bar-stock" style="height: ${sHeight}px;"></div>
          </div>
        `;
      })
      .join('');
  }

  // =========================================================================
  // REAL-TIME FACILITY & PERSONNEL ALLOCATION MAP (OVERVIEW SCREEN)
  // =========================================================================

  const KIGALI_KNOWN_COORDS = [
    { match: /ndera/i, left: '84%', top: '20%', shortName: 'Ndera Hub' },
    { match: /(convention|kcc)/i, type: 'stock_warehouse', left: '43%', top: '20%', shortName: 'KCC Stock' },
    { match: /(bk\s*arena|arena)/i, type: 'stock_warehouse', left: '74%', top: '67%', shortName: 'BK Arena Stock' },
    { match: /(convention|kcc)/i, left: '48%', top: '40%', shortName: 'KCC' },
    { match: /(bk\s*arena|arena)/i, left: '70%', top: '44%', shortName: 'BK Arena' },
    { match: /camp\s*kigali/i, left: '29%', top: '76%', shortName: 'Camp Kigali' },
    { match: /intare/i, left: '87%', top: '48%', shortName: 'Intare Arena' },
    { match: /gikondo/i, left: '39%', top: '80%', shortName: 'Gikondo Hub' },
    { match: /masaka/i, left: '82%', top: '80%', shortName: 'Masaka Depot' },
    { match: /remera/i, left: '59%', top: '60%', shortName: 'Remera Hub' },
    { match: /marrio?tt/i, left: '16%', top: '66%', shortName: 'Marriott' },
    { match: /four\s*points?/i, left: '24%', top: '45%', shortName: 'FourPoints' },
    { match: /m[oö]venpick/i, left: '13%', top: '25%', shortName: 'Mövenpick' },
    { match: /(f1|asili)/i, left: '55%', top: '23%', shortName: 'F1 Asili' },
    { match: /(universe|mcf)/i, left: '67%', top: '24%', shortName: 'MCF Universe' },
    { match: /world\s*bank/i, left: '36%', top: '57%', shortName: 'World Bank' },
    { match: /mscard/i, left: '49%', top: '67%', shortName: 'MScard' },
    { match: /demo/i, left: '32%', top: '28%', shortName: 'Demo Station' },
  ];

  function getFacilityMapCoords(facility, index = 0) {
    const dbX = Number(facility?.map_x);
    const dbY = Number(facility?.map_y);
    const hasDbCoords = Number.isFinite(dbX) && Number.isFinite(dbY) && dbX > 0 && dbY > 0;
    const haystack = `${facility?.name || ''} ${facility?.location || ''} ${facility?.title || ''}`;
    let matchedShortName = '';
    for (const kc of KIGALI_KNOWN_COORDS) {
      if (kc.type && facility?.type !== kc.type) continue;
      if (kc.match.test(haystack)) {
        matchedShortName = kc.shortName;
        if (!hasDbCoords) {
          return {
            left: kc.left,
            top: kc.top,
            shortName: kc.shortName,
          };
        }
        break;
      }
    }
    if (hasDbCoords) {
      return {
        left: `${Math.min(92, Math.max(8, dbX))}%`,
        top: `${Math.min(88, Math.max(12, dbY))}%`,
        shortName: matchedShortName || facility?.name?.split('—')[0]?.split('-')[0]?.trim() || 'Site',
      };
    }
    const isStock = facility.type === 'stock_warehouse';
    const defaults = isStock
      ? [
          { left: '84%', top: '20%', shortName: 'Ndera Hub' },
          { left: '39%', top: '80%', shortName: 'Gikondo Hub' },
          { left: '82%', top: '80%', shortName: 'Masaka Depot' },
          { left: '59%', top: '60%', shortName: 'Remera Hub' },
        ]
      : [
          { left: '48%', top: '40%', shortName: 'KCC' },
          { left: '70%', top: '44%', shortName: 'BK Arena' },
          { left: '29%', top: '76%', shortName: 'Camp Kigali' },
          { left: '87%', top: '48%', shortName: 'Intare Arena' },
        ];
    const item = defaults[index % defaults.length];
    return {
      left: item.left,
      top: item.top,
      shortName: facility.name?.split('—')[0]?.split('-')[0]?.trim() || item.shortName,
    };
  }

  /**
   * Separates overlapping Option A Radar facility pins and label pills in percentage space.
   * Mutates each item's `coords` (`left`, `top`) within safe stage bounds so pins remain legible.
   */
  function resolveMapPinOverlaps(items) {
    if (!Array.isArray(items) || items.length <= 1) return items;
    const minDx = 12.5;
    const minDy = 15.5;
    const minX = 10;
    const maxX = 89;
    const minY = 15;
    const maxY = 84;

    const pts = items.map((item, idx) => ({
      item,
      idx,
      x: parseFloat(item.coords?.left) || 50,
      y: parseFloat(item.coords?.top) || 50,
    }));

    for (let iter = 0; iter < 40; iter += 1) {
      let moved = false;
      for (let i = 0; i < pts.length; i += 1) {
        for (let j = i + 1; j < pts.length; j += 1) {
          const a = pts[i];
          const b = pts[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
            const angle = ((a.idx + b.idx + 1) * 2.399963);
            dx = Math.cos(angle) * 0.5;
            dy = Math.sin(angle) * 0.5;
          }
          const overlapX = minDx - Math.abs(dx);
          const overlapY = minDy - Math.abs(dy);
          if (overlapX > 0 && overlapY > 0) {
            moved = true;
            if ((overlapX / minDx) <= (overlapY / minDy)) {
              const push = (overlapX * 0.55) * (dx >= 0 ? 1 : -1);
              a.x -= push;
              b.x += push;
            } else {
              const push = (overlapY * 0.55) * (dy >= 0 ? 1 : -1);
              a.y -= push;
              b.y += push;
            }
            a.x = Math.max(minX, Math.min(maxX, a.x));
            b.x = Math.max(minX, Math.min(maxX, b.x));
            a.y = Math.max(minY, Math.min(maxY, a.y));
            b.y = Math.max(minY, Math.min(maxY, b.y));
          }
        }
      }
      if (!moved) break;
    }

    pts.forEach((p) => {
      p.item.coords = {
        ...p.item.coords,
        left: `${p.x.toFixed(1)}%`,
        top: `${p.y.toFixed(1)}%`,
      };
    });
    return items;
  }

  function getAllFacilitiesList() {
    if (state.checkpoints && Array.isArray(state.checkpoints.directory) && state.checkpoints.directory.length > 0) {
      return state.checkpoints.directory;
    }
    const merged = [
      ...(state.checkpoints?.event_venues || []),
      ...(state.checkpoints?.stock_warehouses || []),
    ];
    if (merged.length > 0) return merged;
    return [
      { id: 1, type: 'stock_warehouse', name: 'Ndera Warehouse', location: 'Ndera Central Logistics Hub', call_time: '08:00', lead_name: 'Schadrack Niyikiza' },
      { id: 2, type: 'stock_warehouse', name: 'KCC Stock', location: 'Kigali Convention Centre', call_time: '07:30', lead_name: 'Niyonase Prince' },
      { id: 3, type: 'stock_warehouse', name: 'BK Arena Stock', location: 'BK Arena Remera', call_time: '08:00', lead_name: 'Musirikare Leonce' },
      { id: 1, type: 'event_venue', name: 'Kigali Convention Centre', location: 'Gasabo District', call_time: '08:00', lead_name: 'Hirwa Jean de Dieu' },
      { id: 2, type: 'event_venue', name: 'BK Arena', location: 'Remera', call_time: '08:00', lead_name: 'Musirikare Leonce' },
      { id: 3, type: 'event_venue', name: 'Camp Kigali', location: 'Nyarugenge', call_time: '08:30', lead_name: 'Patrick NYIRIMBIBI' },
      { id: 4, type: 'event_venue', name: 'Intare Conference Arena', location: 'Rusororo', call_time: '09:00', lead_name: 'Diane Iradukunda' },
      { id: 4, type: 'stock_warehouse', name: 'Remera Technical Hub', location: 'Remera Transit Station', call_time: '08:00', lead_name: 'Solomon Gakiza' },
    ];
  }

  function getFacilityCrewMembers(facility, allCrew) {
    if (!facility || !Array.isArray(allCrew)) return [];

    const fId = facility.id != null ? String(facility.id) : '';
    const fRawId = facility.raw_id != null ? String(facility.raw_id) : '';
    const fType = facility.type || 'stock_warehouse';
    const fNameLower = (facility.name || '').trim().toLowerCase();
    const fCodeLower = (facility.code || '').trim().toLowerCase();

    // Assigned technician IDs from event or warehouse
    const assignedTechIds = new Set();
    if (Array.isArray(facility.assigned_technicians)) {
      facility.assigned_technicians.forEach((tid) => {
        if (tid != null) assignedTechIds.add(String(tid));
      });
    }

    // Assigned technician names (for comma-separated or raw lists)
    const assignedNames = new Set();
    if (Array.isArray(facility.assigned_technician_names)) {
      facility.assigned_technician_names.forEach((n) => {
        if (n) assignedNames.add(String(n).trim().toLowerCase());
      });
    }

    const matched = allCrew.filter((c) => {
      const uId = String(c.id);
      const uNameLower = (c.full_name || '').trim().toLowerCase();
      const uUsernameLower = (c.username || '').trim().toLowerCase();

      // 1. Direct assigned checkpoint fields on user profile
      const cAssignedType = c.assigned_checkpoint_type;
      const cAssignedId = c.assigned_checkpoint_id != null ? String(c.assigned_checkpoint_id) : '';
      const cAssignedName = (c.assigned_checkpoint_name || '').trim().toLowerCase();

      if (cAssignedType === fType) {
        if (cAssignedId && (cAssignedId === fId || (fRawId && cAssignedId === fRawId))) {
          return true;
        }
        if (cAssignedName && (cAssignedName === fNameLower || (fCodeLower && cAssignedName.includes(fCodeLower)))) {
          return true;
        }
      }

      // 2. Explicit assignment list in facility (assigned_technicians)
      if (assignedTechIds.has(uId)) {
        return true;
      }

      // 3. Name-based match from facility's assigned technician names
      if (assignedNames.size > 0) {
        if (assignedNames.has(uNameLower) || assignedNames.has(uUsernameLower)) {
          return true;
        }
        for (const an of assignedNames) {
          if (an && (uNameLower === an || uUsernameLower === an)) {
            return true;
          }
        }
      }

      // 4. Active live check-in at this location right now (checked_in only, NOT checked_out or historical)
      if (c.daily_state === 'checked_in') {
        const liveType = c.checkpoint_type;
        const liveId = c.checkpoint_id != null ? String(c.checkpoint_id) : '';
        const liveName = (c.checkpoint_name || '').trim().toLowerCase();

        if (liveType === fType && (liveId === fId || (fRawId && liveId === fRawId) || (liveName && liveName === fNameLower))) {
          return true;
        }
      }

      return false;
    });

    // Deduplicate by user ID
    const seen = new Set();
    return matched.filter((c) => {
      const uid = String(c.id);
      if (seen.has(uid)) return false;
      seen.add(uid);
      return true;
    });
  }

  function renderAllocationMap() {
    const cardEl = document.getElementById('overview-allocation-card');
    if (!cardEl) return;

    const pinsContainer = document.getElementById('overview-map-pins');
    const allFacilities = getAllFacilitiesList();

    // 1. Calculate Live Quick Metrics
    let activeHubsCount = 0;
    const allCrew = state.crew || [];
    const totalOnSiteCrew = allCrew.filter((c) => c.daily_state === 'checked_in').length;
    const totalAvailableCrew = allCrew.filter((c) => c.daily_state !== 'checked_in').length;

    // Crew currently checked out / in transit across venues and facility gates
    const transitCrew = allCrew.filter((c) => {
      const st = String(c.daily_state || '').toLowerCase();
      return st === 'checked_out' || st === 'in_transit';
    });
    const inTransitCount = transitCrew.length;

    // Filter facilities based on state.mapFilter
    const filter = state.mapFilter || 'all';

    const facilityData = allFacilities.map((f, idx) => {
      const isStock = f.type === 'stock_warehouse';
      const facilityCrew = getFacilityCrewMembers(f, allCrew);
      const onSiteCrew = facilityCrew.filter((c) => c.daily_state === 'checked_in');
      const headCount = onSiteCrew.length;
      const assignedCount = facilityCrew.length;

      if (headCount > 0 || assignedCount > 0) activeHubsCount++;

      const coords = getFacilityMapCoords(f, idx);
      const isSelected = state.selectedMapCheckpoint &&
        state.selectedMapCheckpoint.type === f.type &&
        (String(state.selectedMapCheckpoint.id) === String(f.id) || (f.raw_id && String(state.selectedMapCheckpoint.id) === String(f.raw_id)));

      return {
        facility: f,
        coords,
        headCount,
        assignedCount,
        isSelected,
        facilityCrew,
        onSiteCrew,
        isStock,
      };
    });

    // Update Quick Metric Badges in DOM
    const activeHubsEl = document.getElementById('map-active-facilities-count');
    const onSiteEl = document.getElementById('map-onsite-crew-count');
    const transitEl = document.getElementById('map-transit-crew-count');
    const readyEl = document.getElementById('map-ready-crew-count');

    if (activeHubsEl) activeHubsEl.textContent = String(Math.max(1, activeHubsCount));
    if (onSiteEl) onSiteEl.textContent = String(totalOnSiteCrew);
    if (transitEl) transitEl.textContent = String(inTransitCount);
    if (readyEl) readyEl.textContent = String(totalAvailableCrew);

    // 2. Render Map Pins
    if (pinsContainer) {
      const filteredData = facilityData.filter((item) => {
        if (filter === 'event_venue' && item.facility.type !== 'event_venue') return false;
        if (filter === 'stock_warehouse' && item.facility.type !== 'stock_warehouse') return false;
        if (filter === 'active' && item.headCount === 0 && item.assignedCount === 0) return false;
        return true;
      });

      resolveMapPinOverlaps(filteredData);

      pinsContainer.innerHTML = filteredData.map((item) => {
        const { facility, coords, headCount, assignedCount, isSelected, isStock } = item;
        const pinClasses = [
          'map-facility-pin',
          isStock ? 'type-stock' : 'type-venue',
          headCount > 0 ? 'has-onsite' : (assignedCount > 0 ? 'has-assigned' : ''),
          isSelected ? 'selected' : '',
        ].filter(Boolean).join(' ');

        const displayCount = headCount > 0 ? headCount : (assignedCount > 0 ? assignedCount : 0);

        return `
          <div class="${pinClasses}"
               style="left: ${coords.left}; top: ${coords.top};"
               data-facility-type="${escapeHtml(facility.type)}"
               data-facility-id="${escapeHtml(String(facility.id))}"
               tabindex="0"
               role="button"
               aria-label="${escapeHtml(facility.name)}: ${headCount} on-site, ${assignedCount} assigned"
               title="${escapeHtml(facility.name)} (${headCount} On-Site · ${assignedCount} Assigned Crew — Click to inspect)">
            <div class="pin-marker">
              <span>${isStock ? '🏭' : '🎪'}</span>
              <span class="pin-headcount-badge">${displayCount}</span>
            </div>
            <div class="pin-label-pill">${escapeHtml(coords.shortName)}</div>
          </div>
        `;
      }).join('');

      // Wire Click & Enter events on pins
      pinsContainer.querySelectorAll('.map-facility-pin').forEach((pinEl) => {
        const cpType = pinEl.getAttribute('data-facility-type');
        const cpId = pinEl.getAttribute('data-facility-id');

        const handleSelect = (e) => {
          e.stopPropagation();
          selectMapFacility(cpType, cpId);
        };

        pinEl.addEventListener('click', handleSelect);
        pinEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect(e);
          }
        });
      });
    }

    // 3. Toggle & Animate Transit Route Overlay ONLY when crew are checked out / in transit
    syncMapTransitOverlay(transitCrew, facilityData);

    // 4. Render Inspector Card
    renderMapFacilityInspector();
  }

  function syncMapTransitOverlay(transitCrew, facilityData) {
    const overlay = document.getElementById('map-transit-overlay');
    const lineEl = document.getElementById('map-transit-line');
    const motionEl = document.getElementById('map-transit-motion');
    if (!overlay) return;

    if (!Array.isArray(transitCrew) || transitCrew.length === 0) {
      overlay.style.display = 'none';
      return;
    }

    const toSvgPoint = (coords) => ({
      x: Math.round((parseFloat(coords.left) / 100) * 720),
      y: Math.round((parseFloat(coords.top) / 100) * 340),
    });

    const findFacilityCoords = (cpType, cpId, cpName) => {
      const match = facilityData.find((item) => {
        const f = item.facility;
        if (cpId && cpType && f.type === cpType && (String(f.id) === String(cpId) || String(f.raw_id) === String(cpId))) {
          return true;
        }
        return cpName && String(f.name || '').toLowerCase() === String(cpName).toLowerCase();
      });
      return match ? toSvgPoint(match.coords) : null;
    };

    const mover = transitCrew[0];
    const originPt = findFacilityCoords(mover.last_checkpoint_type, mover.last_checkpoint_id, mover.last_checkpoint_name);
    let destPt = findFacilityCoords(mover.assigned_checkpoint_type, mover.assigned_checkpoint_id, mover.assigned_checkpoint_name);

    if (originPt && !destPt && facilityData.length > 1) {
      const alt = facilityData.find((item) => {
        const pt = toSvgPoint(item.coords);
        return pt.x !== originPt.x || pt.y !== originPt.y;
      });
      if (alt) destPt = toSvgPoint(alt.coords);
    }

    const pathStr = (originPt && destPt && (originPt.x !== destPt.x || originPt.y !== destPt.y))
      ? `M ${originPt.x},${originPt.y} Q ${Math.round((originPt.x + destPt.x) / 2)},${Math.max(24, Math.min(originPt.y, destPt.y) - 36)} ${destPt.x},${destPt.y}`
      : 'M 580,68 Q 440,85 345,130 Q 420,165 490,150';

    if (lineEl) lineEl.setAttribute('d', pathStr);
    if (motionEl) motionEl.setAttribute('path', pathStr);
    overlay.style.display = '';
  }

  function selectMapFacility(type, id) {
    state.selectedMapCheckpoint = { type, id: String(id) };

    // Update selected class on pins
    const pinsContainer = document.getElementById('overview-map-pins');
    if (pinsContainer) {
      pinsContainer.querySelectorAll('.map-facility-pin').forEach((pin) => {
        const pType = pin.getAttribute('data-facility-type');
        const pId = pin.getAttribute('data-facility-id');
        if (pType === type && (pId === String(id) || Number(pId) === Number(id))) {
          pin.classList.add('selected');
        } else {
          pin.classList.remove('selected');
        }
      });
    }

    renderMapFacilityInspector();
  }

  function renderMapFacilityInspector() {
    const inspectorEl = document.getElementById('map-inspector-card');
    if (!inspectorEl) return;

    const allFacilities = getAllFacilitiesList();
    const selCp = state.selectedMapCheckpoint || (allFacilities.length > 0 ? { type: allFacilities[0].type, id: allFacilities[0].id } : { type: 'event_venue', id: 1 });

    let facility = allFacilities.find((f) =>
      f.type === selCp.type && (String(f.id) === String(selCp.id) || Number(f.id) === Number(selCp.id) || (f.raw_id && String(f.raw_id) === String(selCp.id)))
    );
    if (!facility && allFacilities.length > 0) {
      facility = allFacilities[0];
      state.selectedMapCheckpoint = { type: facility.type, id: facility.id };
    }
    if (!facility) return;

    const isStock = facility.type === 'stock_warehouse';
    const allCrew = state.crew || [];
    const facilityCrew = getFacilityCrewMembers(facility, allCrew);
    const onSiteCrew = facilityCrew.filter((c) => c.daily_state === 'checked_in');
    const headCount = onSiteCrew.length;
    const assignedCount = facilityCrew.length;

    const typePill = document.getElementById('inspector-type-pill');
    const liveDot = document.getElementById('inspector-live-dot');
    const nameEl = document.getElementById('inspector-name');
    const metaEl = document.getElementById('inspector-meta');
    const trayEl = document.getElementById('inspector-crew-tray');

    if (typePill) {
      typePill.textContent = isStock ? '🏭 Stock Warehouse' : '🎪 Event Venue';
      typePill.className = `status-badge ${isStock ? 'status-badge-neutral-sm' : 'status-badge-purple-sm'}`;
    }

    if (liveDot) {
      if (headCount > 0) {
        liveDot.textContent = `● ${headCount} Active On-Site`;
        liveDot.className = 'inspector-status-dot-active';
        liveDot.style.color = '#10b981';
      } else if (assignedCount > 0) {
        liveDot.textContent = `● ${assignedCount} Assigned · Ready`;
        liveDot.className = 'inspector-status-dot-ready';
        liveDot.style.color = '#3b82f6';
      } else {
        liveDot.textContent = '○ Standby / Ready';
        liveDot.className = 'inspector-status-dot-idle';
        liveDot.style.color = 'var(--text-secondary, #94a3b8)';
      }
    }

    if (nameEl) {
      nameEl.textContent = facility.name || (isStock ? 'Central Warehouse' : 'Production Venue');
    }

    if (metaEl) {
      const callTime = facility.call_time || '08:00 AM';
      const assignedController = facilityCrew.find((c) => String(c.role || '').toLowerCase() === 'stock_controller');
      const assignedManager = facilityCrew.find((c) => String(c.role || '').toLowerCase() === 'stock_manager');
      const fallbackLead = facility.lead_name || facility.assigned_lead_name || (facility.lead_label ? facility.lead_label.replace(/^.*?:\s*/, '') : 'Unassigned');
      const inChargeName = assignedController?.full_name
        || assignedManager?.full_name
        || (isStock ? facility.controller_name : '')
        || facility.project_manager
        || fallbackLead;
      const inChargeLabel = assignedManager && !assignedController
        ? 'Stock Manager'
        : (isStock ? 'Stock Controller / Manager' : 'Controller / Manager');
      metaEl.innerHTML = `
        <span>Call Time: <strong>${escapeHtml(callTime)}</strong></span> ·
        <span>${inChargeLabel}: <strong>${escapeHtml(inChargeName)}</strong></span> ·
        <span id="inspector-headcount-tag"><strong>${assignedCount}</strong> Assigned Personnel (<strong>${headCount}</strong> On-Site)</span>
      `;
    }

    // Update Reset Roster button visibility in inspector header
    const resetRosterBtn = document.getElementById('map-reset-roster-btn');
    if (resetRosterBtn) {
      if (facilityCrew.length > 0) {
        resetRosterBtn.style.display = 'inline-flex';
        resetRosterBtn.title = `Reset all ${facilityCrew.length} assigned personnel from ${facility.name}`;
      } else {
        resetRosterBtn.style.display = 'none';
      }
    }

    // Render horizontal crew tray
    if (trayEl) {
      if (facilityCrew.length === 0) {
        trayEl.innerHTML = `
          <div class="empty-tray-label" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 4px 0;">
            <span>No personnel currently allocated to this location.</span>
            <button type="button" class="btn btn-secondary-32-sm js-open-allocate-modal" data-target-type="${escapeHtml(facility.type)}" data-target-id="${escapeHtml(String(facility.id))}" style="height: 26px; padding: 0 10px; font-size: 11.5px;">
              <span>+ Quick Dispatch</span>
            </button>
          </div>
        `;
      } else {
        trayEl.innerHTML = facilityCrew.map((c) => {
          const isOnSite = c.daily_state === 'checked_in';
          const isCheckedOut = c.daily_state === 'checked_out';
          const stateColor = isOnSite ? '#10b981' : (isCheckedOut ? '#94a3b8' : '#3b82f6');
          const stateLabel = isOnSite ? 'On-Site' : (isCheckedOut ? 'Checked Out' : 'Ready / Assigned');
          const roleDisplay = c.role_display || c.role || 'Crew';
          const avatarHtml = c.profile_image_url || c.profile_image
            ? `<img src="${escapeHtml(c.profile_image_url || c.profile_image)}" alt="" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`
            : `<span class="inspector-crew-chip-avatar">${escapeHtml(c.initials || 'CR')}</span>`;

          return `
            <div class="inspector-crew-chip" data-crew-id="${c.id}" tabindex="0" role="button" title="${escapeHtml(c.full_name)} (${escapeHtml(roleDisplay)}) — Status: ${stateLabel}. Click to verify.">
              ${avatarHtml}
              <span style="font-weight: 600;">${escapeHtml(c.full_name)}</span>
              <span style="font-size: 11px; opacity: 0.8;">(${escapeHtml(roleDisplay)})</span>
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${stateColor}; display: inline-block; flex-shrink: 0;" title="${stateLabel}"></span>
              <button type="button" class="chip-unassign-btn js-chip-unassign" data-crew-id="${c.id}" data-crew-name="${escapeHtml(c.full_name)}" title="Unassign ${escapeHtml(c.full_name)} from this location" aria-label="Unassign ${escapeHtml(c.full_name)}">✕</button>
            </div>
          `;
        }).join('');

        // Wire click to inspect / verify crew member
        trayEl.querySelectorAll('.inspector-crew-chip').forEach((chip) => {
          const handleOpen = (e) => {
            if (e.target && e.target.closest('.js-chip-unassign')) return;
            const uid = Number(chip.getAttribute('data-crew-id'));
            const member = allCrew.find((m) => Number(m.id) === uid);
            if (member) {
              state.selectedCrewId = uid;
              openKioskModal(member);
            }
          };
          chip.addEventListener('click', handleOpen);
          chip.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (e.target && e.target.closest('.js-chip-unassign')) return;
              e.preventDefault();
              handleOpen(e);
            }
          });
        });

        // Wire individual unassign button on each chip
        trayEl.querySelectorAll('.js-chip-unassign').forEach((unassignBtn) => {
          unassignBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const uid = Number(unassignBtn.getAttribute('data-crew-id'));
            const uName = unassignBtn.getAttribute('data-crew-name') || 'Crew member';
            const facName = facility.name || 'this location';

            const { confirmed } = await showConfirmModal({
              title: 'Unassign Personnel',
              message: `Are you sure you want to remove ${uName} from ${facName}?\nThey will be returned to the unassigned Standby pool.`,
              confirmText: 'Unassign',
              tone: 'warning',
            });
            if (!confirmed) return;

            try {
              const res = await fetch('api.php?action=unassign_personnel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  checkpoint_type: facility.type,
                  checkpoint_id: facility.raw_id || facility.id,
                  user_id: uid,
                }),
              });
              const data = await res.json();
              if (!res.ok || !data || !data.ok) {
                showToast((data && data.error) || 'Failed to unassign personnel.');
                return;
              }
              applyBootstrapPayload(data, true);
              const mem = state.crew.find((c) => Number(c.id) === uid);
              const stillOnSiteHere = Boolean(
                mem &&
                mem.daily_state === 'checked_in' &&
                mem.checkpoint_type === facility.type &&
                (String(mem.checkpoint_id) === String(facility.id) || (facility.raw_id && String(mem.checkpoint_id) === String(facility.raw_id)))
              );
              playKioskChime('approve');
              showToast(
                stillOnSiteHere
                  ? `✓ Unassigned ${uName} from ${facName} roster (still visible while checked in on-site until checked out).`
                  : `✓ Removed ${uName} from ${facName}.`
              );
            } catch (err) {
              showToast('Error communicating with server: ' + err.message);
            }
          });
        });
      }

      // Wire any quick dispatch buttons inside empty tray
      trayEl.querySelectorAll('.js-open-allocate-modal').forEach((btn) => {
        btn.addEventListener('click', () => {
          openAllocatePersonnelModal({ type: facility.type, id: facility.id });
        });
      });
    }
  }

  function renderOverviewCosView() {
    const grid = document.getElementById('overview-cos-roster-grid');
    if (!grid) return;

    const list = Array.isArray(state.rollCallList) ? state.rollCallList : [];
    const cps = Array.isArray(state.checkpoints?.directory) ? state.checkpoints.directory : [];

    const cpCounts = {};
    list.forEach((r) => {
      if (r.checkpoint_name) {
        cpCounts[r.checkpoint_name] = (cpCounts[r.checkpoint_name] || 0) + 1;
      }
    });

    const cpSel = document.getElementById('overview-cos-cp-filter');
    if (cpSel) {
      const prev = state.cosCpFilter || cpSel.value || 'all';
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
        state.cosCpFilter = prev;
      } else {
        cpSel.value = 'all';
        state.cosCpFilter = 'all';
      }
    }

    const activeRoleCat = state.cosRoleFilter || 'all';
    document.querySelectorAll('#overview-cos-role-pills .cos-role-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-role-cat') === activeRoleCat);
    });

    const activeCp = state.cosCpFilter || 'all';
    const q = (state.cosSearch || '').trim().toLowerCase();

    const filtered = list.filter((r) => {
      const cat = r.role_category || resolveRollCallRoleCategory(r);
      if (activeRoleCat !== 'all' && cat !== activeRoleCat) return false;
      if (activeCp !== 'all' && String(r.checkpoint_name || '') !== activeCp) return false;
      if (q) {
        const hay = `${r.full_name || ''} ${r.role_display || ''} ${r.department || ''} ${r.checkpoint_name || ''} ${r.badge_code || ''} ${r.phone || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const countEl = document.getElementById('overview-cos-filtered-count');
    if (countEl) {
      countEl.textContent = String(filtered.length);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="cos-empty-state">${
        list.length === 0
          ? 'No personnel are currently checked in on-site right now.'
          : 'No on-site personnel match your selected checkpoint, role, or search filter.'
      }</div>`;
      return;
    }

    grid.innerHTML = filtered.map((r) => {
      const cat = r.role_category || resolveRollCallRoleCategory(r);
      const roleClass = cat === 'supervisor'
        ? 'cos-badge-supervisor'
        : (cat === 'controller'
          ? 'cos-badge-controller'
          : (cat === 'technician' ? 'cos-badge-technician' : 'cos-badge-crew'));
      const initials = escapeHtml(r.initials || 'U');
      const avatarInner = r.profile_image_url
        ? `<span>${initials}</span><img src="${escapeHtml(r.profile_image_url)}" alt="${escapeHtml(r.full_name)}" onerror="this.remove();" />`
        : initials;
      const phoneStr = r.phone ? String(r.phone).trim() : '';
      const telClean = phoneStr.replace(/[^+\d]/g, '');

      return `
        <article class="cos-person-card">
          <div class="cos-person-top">
            <div class="cos-avatar">${avatarInner}</div>
            <div style="min-width: 0; flex: 1;">
              <div class="cos-person-name">${escapeHtml(r.full_name)}</div>
              <div class="cos-person-role-line">${escapeHtml(r.department || 'Operations')} · ${escapeHtml(r.clearance_code || 'L2')}</div>
            </div>
          </div>
          <div class="cos-badges-row">
            <span class="cos-badge ${roleClass}">${escapeHtml(r.role_display || 'Crew')}</span>
            <span class="cos-badge cos-badge-onsite">On-Site</span>
            <span class="cos-badge cos-badge-cp">${escapeHtml(r.checkpoint_name)}</span>
          </div>
          <div class="cos-person-meta">
            <span>Checked In: <strong>${escapeHtml(r.check_in_time || '--')}</strong></span>
            ${phoneStr ? `<a href="tel:${escapeHtml(telClean)}" class="cos-tel-link">${escapeHtml(phoneStr)}</a>` : '<span>No phone listed</span>'}
          </div>
        </article>
      `;
    }).join('');
  }

  function setAllocationMapView(viewMode) {
    // Option A (Radar) and Option B (Live Map) disabled for now; only Traffic Chart and COS remain active
    if (viewMode !== 'cos' && viewMode !== 'chart') {
      viewMode = 'chart';
    }
    state.mapViewMode = viewMode;
    const mapView = document.getElementById('overview-map-view');
    const liveMapPanel = document.getElementById('live-map-panel');
    const chartView = document.getElementById('overview-traffic-chart-view');
    const cosView = document.getElementById('overview-cos-view');
    const btnOptA = document.getElementById('toggle-view-option-a') || document.getElementById('toggle-view-map');
    const btnOptB = document.getElementById('toggle-view-option-b');
    const btnChart = document.getElementById('toggle-view-chart');
    const btnCos = document.getElementById('toggle-view-cos');
    const collapseBtn = document.getElementById('toggle-option-a-collapse');
    const filterSelect = document.getElementById('overview-map-filter');

    if (mapView) mapView.style.display = 'none';
    if (liveMapPanel) liveMapPanel.style.display = 'none';
    if (chartView) chartView.style.display = 'none';
    if (cosView) cosView.style.display = 'none';

    if (btnOptA) btnOptA.classList.remove('active');
    if (btnOptB) btnOptB.classList.remove('active');
    if (btnChart) btnChart.classList.remove('active');
    if (btnCos) btnCos.classList.remove('active');

    if (viewMode === 'cos') {
      state.mapViewMode = 'cos';
      if (cosView) cosView.style.display = 'block';
      if (btnCos) btnCos.classList.add('active');
      if (collapseBtn) collapseBtn.style.display = 'none';
      if (filterSelect) filterSelect.style.display = 'none';
      renderOverviewCosView();
    } else {
      state.mapViewMode = 'chart';
      if (chartView) chartView.style.display = 'block';
      if (btnChart) btnChart.classList.add('active');
      if (collapseBtn) collapseBtn.style.display = 'none';
      if (filterSelect) filterSelect.style.display = 'none';
      renderHourlyTrafficChart();
    }
  }

  function toggleOptionACollapse() {
    const wrapper = document.getElementById('option-a-collapsible-wrapper');
    const btn = document.getElementById('toggle-option-a-collapse');
    if (!wrapper) return;
    const isCollapsed = wrapper.classList.toggle('collapsed');
    if (btn) {
      btn.classList.toggle('is-collapsed', isCollapsed);
      const icon = btn.querySelector('.collapse-icon');
      const label = btn.querySelector('.collapse-label');
      if (icon) icon.textContent = isCollapsed ? '▼' : '▲';
      if (label) label.textContent = isCollapsed ? 'Expand Active' : 'Collapse Active';
    }
  }

  // =========================================================================
  // OPTION B: LIVE ALLOCATION MAP (TIMELINE FEED SYNCED)
  // =========================================================================

  const OPTION_B_VENUES = {
    'Ndera Warehouse': { x: 0.30, y: 0.40, label: '🏭 Ndera Hub' },
    'KCC Stock':       { x: 0.48, y: 0.38, label: '🏭 KCC Stock' },
    'BK Arena Stock':  { x: 0.55, y: 0.72, label: '🏭 BK Arena Stock' },
    'Kigali Convention Centre': { x: 0.48, y: 0.38, label: '🎪 KCC Dome' },
    'BK Arena':        { x: 0.55, y: 0.72, label: '🏟️ BK Arena' },
    'Camp Kigali':     { x: 0.20, y: 0.56, label: '🏛️ Camp Kigali' },
    'Intare Conference Arena': { x: 0.85, y: 0.48, label: '🎪 Intare Arena' },
    'Gikondo Logistics Hub': { x: 0.38, y: 0.72, label: '🏭 Gikondo Hub' },
    'Masaka Central Depot': { x: 0.78, y: 0.78, label: '🏭 Masaka Depot' },
    'Remera Technical Hub': { x: 0.58, y: 0.58, label: '🏭 Remera Hub' },
  };

  function readTimelineFeedForMap() {
    const feed = document.getElementById('timeline-feed-list');
    if (!feed) return new Map();
    const users = new Map(); // uid -> {uid, name, initials, role, venue, status}

    feed.querySelectorAll('.timeline-event-card').forEach((card) => {
      const uid = card.dataset.timelineUid;
      if (!uid || users.has(uid)) return; // keep newest card only (feed is newest-first)

      const name = card.querySelector('.timeline-mini-name')?.textContent.trim() || '';
      const initials = card.querySelector('.timeline-mini-avatar')?.textContent.trim() || 'CR';
      const role = card.querySelector('.timeline-mini-role')?.textContent.trim() || '';
      const title = card.querySelector('.timeline-action-title')?.textContent || '';

      // Derive venue from action title — e.g. "… — Ndera Warehouse"
      const venue = title.split('—').pop().trim() || 'Ndera Warehouse';
      // Derive status: last action "out" => transit, "in" => onsite
      const isOut = /signed out|checked out/i.test(title);
      const status = isOut ? 'transit' : 'onsite';

      users.set(uid, { uid, name, initials, role, venue, status });
    });

    // If feed is empty or sparse, supplement with on-site crew from state
    if (users.size === 0 && Array.isArray(state.crew)) {
      state.crew.slice(0, 6).forEach((c) => {
        const userCpType = c.assigned_checkpoint_type || c.checkpoint_type || c.last_checkpoint_type;
        const cpName = c.assigned_checkpoint_name || c.last_checkpoint_name || (userCpType === 'stock_warehouse' ? 'Ndera Warehouse' : 'Kigali Convention Centre');
        users.set(String(c.id), {
          uid: String(c.id),
          name: c.full_name,
          initials: c.initials || 'CR',
          role: c.role_display || c.role || 'Tech',
          venue: cpName,
          status: c.daily_state === 'checked_in' ? 'onsite' : (c.daily_state === 'checked_out' ? 'transit' : 'available'),
        });
      });
    }

    return users;
  }

  function renderOptionBMap(users = null) {
    const map = document.getElementById('allocation-map');
    const statusEl = document.getElementById('live-map-status');
    const userSelect = document.getElementById('allocate-user-select');
    if (!map) return;

    const activeUsers = users || readTimelineFeedForMap();
    map.querySelectorAll('.map-pin').forEach((p) => p.remove());

    // Render geographical landmark anchors for Kigali hubs if not present
    if (map.querySelectorAll('.map-landmark').length === 0) {
      const primaryLandmarks = [
        { label: '🏭 Ndera Hub', x: 0.30, y: 0.40 },
        { label: '🎪 KCC Dome', x: 0.48, y: 0.38 },
        { label: '🏟️ BK Arena', x: 0.55, y: 0.72 },
        { label: '🏛️ Camp Kigali', x: 0.20, y: 0.56 },
        { label: '🎪 Intare Arena', x: 0.85, y: 0.48 },
      ];
      primaryLandmarks.forEach((lm) => {
        const lmEl = document.createElement('div');
        lmEl.className = 'map-landmark';
        lmEl.style.left = `${lm.x * 100}%`;
        lmEl.style.top = `${lm.y * 100}%`;
        lmEl.innerHTML = `<span>${lm.label}</span>`;
        map.appendChild(lmEl);
      });
    }

    const allCheckpoints = [
      ...(state.checkpoints?.stock_warehouses || []),
      ...(state.checkpoints?.events || []),
    ];
    const venueOccupants = {};
    activeUsers.forEach((u) => {
      let vKeyMatched = u.venue;
      const uVenueLower = String(u.venue || '').toLowerCase();
      const dbCp = allCheckpoints.find((cp) => {
        const cpName = String(cp?.name || cp?.title || '').toLowerCase();
        return cpName && (cpName === uVenueLower || cpName.includes(uVenueLower) || uVenueLower.includes(cpName));
      });
      let coord = null;
      if (dbCp && Number(dbCp.map_x) > 0 && Number(dbCp.map_y) > 0) {
        coord = { x: Number(dbCp.map_x) / 100, y: Number(dbCp.map_y) / 100 };
        vKeyMatched = dbCp.name || dbCp.title || u.venue;
      } else {
        coord = OPTION_B_VENUES[u.venue];
      }
      if (!coord) {
        for (const vKey of Object.keys(OPTION_B_VENUES)) {
          if (uVenueLower.includes(vKey.toLowerCase()) || vKey.toLowerCase().includes(uVenueLower)) {
            coord = OPTION_B_VENUES[vKey];
            vKeyMatched = vKey;
            break;
          }
        }
      }
      if (!coord) coord = { x: 0.5, y: 0.5 };

      if (!venueOccupants[vKeyMatched]) venueOccupants[vKeyMatched] = 0;
      const occIndex = venueOccupants[vKeyMatched]++;
      // Subtle cluster offset so multiple crew at the same venue don't overlap
      const offsetX = occIndex === 0 ? 0 : ((occIndex % 2 === 1 ? 1 : -1) * Math.ceil(occIndex / 2) * 16);
      const offsetY = occIndex === 0 ? 0 : (Math.floor(occIndex / 2) * 14);

      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `map-pin ${u.status}`;
      pin.dataset.uid = u.uid;
      pin.textContent = u.initials;
      pin.title = `${u.name} · ${u.role} · ${u.venue} (${u.status})`;
      pin.style.left = `calc(${coord.x * 100}% + ${offsetX}px)`;
      pin.style.top  = `calc(${coord.y * 100}% + ${offsetY}px)`;
      pin.addEventListener('click', () => focusOptionBUser(u.uid));
      map.appendChild(pin);
    });

    if (statusEl) statusEl.textContent = `${activeUsers.size} online`;
    populateOptionBUserSelect(activeUsers, userSelect);
  }

  function populateOptionBUserSelect(users, selectEl) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">Select user…</option>';
    users.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.uid;
      opt.textContent = `${u.name} (${u.role})`;
      selectEl.appendChild(opt);
    });
    selectEl.value = current;
  }

  function focusOptionBUser(uid) {
    const map = document.getElementById('allocation-map');
    const feed = document.getElementById('timeline-feed-list');
    if (map) {
      map.querySelectorAll('.map-pin').forEach((p) =>
        p.classList.toggle('is-focused', p.dataset.uid === uid)
      );
    }
    if (feed) {
      feed.querySelectorAll('.timeline-event-card').forEach((c) => {
        const hit = c.dataset.timelineUid === uid;
        c.style.outline = hit ? '1px solid #00e5ff' : '';
        c.style.background = hit ? 'rgba(0,229,255,.06)' : '';
        if (hit) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }

  function initOptionBAllocationEvents() {
    const goBtn = document.getElementById('allocate-go-btn');
    const userSelect = document.getElementById('allocate-user-select');
    const venueSelect = document.getElementById('allocate-venue-select');
    const feed = document.getElementById('timeline-feed-list');

    if (feed) {
      feed.addEventListener('click', (e) => {
        const card = e.target.closest('.timeline-event-card');
        if (card && card.dataset.timelineUid) {
          focusOptionBUser(card.dataset.timelineUid);
        }
      });

      // Observe timeline changes to refresh Option B live
      new MutationObserver(() => {
        if (state.mapViewMode === 'option-b') {
          renderOptionBMap();
        }
      }).observe(feed, { childList: true, subtree: true });
    }

    if (goBtn) {
      goBtn.addEventListener('click', async () => {
        const uid = userSelect ? userSelect.value : '';
        const venue = venueSelect ? venueSelect.value : '';
        if (!uid) {
          showToast('Please select a user to allocate.');
          return;
        }
        const users = readTimelineFeedForMap();
        const u = users.get(uid);
        if (!u) return;

        u.venue = venue;
        u.status = 'transit';
        renderOptionBMap(users);
        focusOptionBUser(uid);

        // Sync with backend API
        try {
          const cpType = venue.toLowerCase().includes('warehouse') || venue.toLowerCase().includes('stock') ? 'stock_warehouse' : 'event_venue';
          const cpId = cpType === 'stock_warehouse' ? 1 : 1001;
          const res = await fetch('api.php?action=allocate_personnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkpoint_type: cpType,
              checkpoint_id: cpId,
              user_ids: [Number(uid)],
              dispatch_type: 'immediate_dispatch',
              notes: `Option B Quick Allocation to ${venue}`,
            }),
          });
          const data = await res.json();
          if (data && data.ok) {
            applyBootstrapPayload(data);
            playKioskChime('approve');
            showToast(`✓ Deployed ${u.name} to ${venue} (In Transit)`);
            renderAll();
            renderOptionBMap();
            focusOptionBUser(uid);
          }
        } catch (err) {
          showToast(`Allocated ${u.name} to ${venue}`);
        }
      });
    }
  }

  // =========================================================================
  // ALLOCATE & DISPATCH PERSONNEL MODAL
  // =========================================================================

  let allocSelectedUserIds = new Set();

  function openAllocatePersonnelModal(targetCp = null) {
    const modal = document.getElementById('allocate-personnel-modal');
    if (!modal) return;

    const allFacilities = getAllFacilitiesList();
    const targetSelect = document.getElementById('alloc-target-facility');
    const activeTarget = targetCp || state.selectedMapCheckpoint || { type: 'event_venue', id: 1 };

    if (targetSelect) {
      targetSelect.innerHTML = allFacilities.map((f) => {
        const isStock = f.type === 'stock_warehouse';
        const val = `${f.type}:${f.id}`;
        const isSel = f.type === activeTarget.type && Number(f.id) === Number(activeTarget.id);
        const icon = isStock ? '🏭' : '🎪';
        return `<option value="${val}" ${isSel ? 'selected' : ''}>${icon} ${escapeHtml(f.name)} (${f.location || (isStock ? 'Warehouse' : 'Venue')})</option>`;
      }).join('');
    }

    // Reset selection and render crew checklist
    allocSelectedUserIds.clear();
    const searchInp = document.getElementById('alloc-crew-search');
    if (searchInp) searchInp.value = '';

    renderAllocChecklist('');
    updateAllocSelectedCount();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeAllocatePersonnelModal() {
    const modal = document.getElementById('allocate-personnel-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function renderAllocChecklist(filterText = '') {
    const checklistEl = document.getElementById('alloc-crew-checklist');
    if (!checklistEl) return;

    const q = (filterText || '').trim().toLowerCase();
    const allCrew = state.crew || [];

    const filtered = allCrew.filter((c) => {
      if (!q) return true;
      return (
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.role_display || c.role || '').toLowerCase().includes(q) ||
        (c.department || '').toLowerCase().includes(q) ||
        (c.badge_code || '').toLowerCase().includes(q) ||
        (c.staff_code || '').toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      checklistEl.innerHTML = `<div style="padding: 16px; text-align: center; font-size: 11px; color: var(--text-secondary);">No crew members match your search.</div>`;
      return;
    }

    checklistEl.innerHTML = filtered.map((c) => {
      const isChecked = allocSelectedUserIds.has(Number(c.id));
      const isOnSite = c.daily_state === 'checked_in';
      const isCheckedOut = c.daily_state === 'checked_out';
      const statusBadge = isOnSite
        ? `<span class="status-badge status-badge-green-sm">On-Site</span>`
        : (isCheckedOut
          ? `<span class="status-badge status-badge-neutral-sm">Checked Out</span>`
          : `<span class="status-badge status-badge-purple-sm">Standby</span>`);

      return `
        <label class="alloc-crew-row" data-crew-id="${c.id}">
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" value="${c.id}" class="js-alloc-crew-cb" ${isChecked ? 'checked' : ''} />
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${c.clearance_color || '#3b82f6'}; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${escapeHtml(c.initials || 'CR')}
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.2;">${escapeHtml(c.full_name)}</div>
              <div style="font-size: 10.5px; color: var(--text-secondary);">${escapeHtml(c.role_display || c.role)} · ${escapeHtml(c.department || 'Technical')} · <strong style="color: ${c.clearance_color || '#3b82f6'};">${c.clearance_code || 'L2'}</strong></div>
            </div>
          </div>
          <div>${statusBadge}</div>
        </label>
      `;
    }).join('');

    // Wire checkbox listeners
    checklistEl.querySelectorAll('.js-alloc-crew-cb').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const uid = Number(e.target.value);
        if (e.target.checked) {
          allocSelectedUserIds.add(uid);
        } else {
          allocSelectedUserIds.delete(uid);
        }
        updateAllocSelectedCount();
      });
    });
  }

  function updateAllocSelectedCount() {
    const countEl = document.getElementById('alloc-selected-count');
    if (countEl) {
      countEl.textContent = `${allocSelectedUserIds.size} Selected`;
    }
  }

  function pairTimelineEvents(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const parseTs = (r) => {
      if (!r || !r.scanned_at) return 0;
      const d = new Date(String(r.scanned_at).replace(' ', 'T'));
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const fmtShortTime = (r) => {
      if (r.scanned_time) {
        const m = String(r.scanned_time).match(/^(\d{1,2}:\d{2})(?::\d{2})?\s*(AM|PM)$/i);
        if (m) return `${m[1]} ${m[2].toUpperCase()}`;
      }
      const ts = parseTs(r);
      if (!ts) return '';
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const fmtTimeWithSecs = (r) => {
      const m = String(r.formatted_time || '').match(/(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
      if (m) return m[1];
      if (r.scanned_time) return String(r.scanned_time);
      return fmtShortTime(r);
    };
    const fmtDatePrefix = (r) => {
      const ft = String(r.formatted_time || '');
      const idx = ft.indexOf('•');
      if (idx > 0) return ft.slice(0, idx).trim();
      return String(r.scanned_date || '').trim();
    };
    const calcDuration = (inMs, outMs) => {
      if (!inMs || !outMs || outMs <= inMs) return '';
      const mins = Math.max(1, Math.round((outMs - inMs) / 60000));
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
    };

    const chronological = [...rows].sort((a, b) => {
      const tA = parseTs(a);
      const tB = parseTs(b);
      if (tA !== tB) return tA - tB;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    const paired = [];
    const openByKey = new Map();

    chronological.forEach((raw) => {
      const item = { ...raw };
      const isDenied = item.access_status === 'denied';
      const action = String(item.scan_action || 'check_in').toLowerCase();
      const key = `${item.user_id || 0}::${item.checkpoint_type || ''}::${item.checkpoint_id || item.checkpoint_name || ''}`;
      const tsMs = parseTs(item);

      if (isDenied || action === 'access_verify') {
        item._inLogId = Number(item.id || 0);
        item._outLogId = 0;
        item._inScannedAt = item.scanned_at || '';
        item._outScannedAt = '';
        item._sortTs = tsMs;
        paired.push(item);
        return;
      }

      if (action === 'check_in') {
        const shortIn = fmtShortTime(item);
        const entry = {
          ...item,
          in_pill: item.in_pill || (shortIn ? `In: ${shortIn}` : null),
          out_pill: null,
          _inLogId: Number(item.id || 0),
          _outLogId: 0,
          _inScannedAt: item.scanned_at || '',
          _outScannedAt: '',
          _inTsMs: tsMs,
          _inFormatted: item.formatted_time || `${item.scanned_date || ''} ${item.scanned_time || ''}`.trim(),
          _inShortWithSec: fmtTimeWithSecs(item),
          _inDate: fmtDatePrefix(item),
          _sortTs: tsMs,
        };
        const idx = paired.push(entry) - 1;
        openByKey.set(key, idx);
        return;
      }

      if (action === 'check_out') {
        if (openByKey.has(key)) {
          const idx = openByKey.get(key);
          const openItem = paired[idx];
          openByKey.delete(key);

          const shortIn = fmtShortTime(openItem);
          const shortOut = fmtShortTime(item);
          const inSec = openItem._inShortWithSec || shortIn;
          const outSec = fmtTimeWithSecs(item) || shortOut;
          const dateLabel = openItem._inDate || fmtDatePrefix(item);
          const durLabel = (item.duration_label && item.duration_label !== '—')
            ? item.duration_label
            : calcDuration(openItem._inTsMs, tsMs);
          const isStock = item.checkpoint_type === 'stock_warehouse';
          const cpLabel = item.checkpoint_name || openItem.checkpoint_name || 'Checkpoint';

          paired[idx] = {
            ...openItem,
            id: item.id || openItem.id,
            scanned_at: item.scanned_at || openItem.scanned_at,
            scan_action: 'session_complete',
            action_title: `${isStock ? 'Stock Gate' : 'Venue Gate'} Attendance (In & Out) — ${cpLabel}`,
            formatted_time: dateLabel
              ? `${dateLabel} • In ${inSec} → Out ${outSec}`
              : `In ${inSec} → Out ${outSec}`,
            in_pill: shortIn ? `In: ${shortIn}` : openItem.in_pill,
            out_pill: shortOut ? `Out: ${shortOut}` : (item.out_pill || null),
            duration_label: durLabel || openItem.duration_label || '—',
            is_transit: Boolean(openItem.is_transit || item.is_transit),
            is_night_shift: Boolean(openItem.is_night_shift || item.is_night_shift),
            notes: item.notes || openItem.notes,
            _inLogId: Number(openItem._inLogId || openItem.id || 0),
            _outLogId: Number(item.id || 0),
            _inScannedAt: openItem._inScannedAt || openItem.scanned_at || '',
            _outScannedAt: item.scanned_at || '',
            _sortTs: tsMs || openItem._sortTs,
          };
          return;
        }

        // Standalone check-out (when matching check-in is not present in window)
        const shortOut = fmtShortTime(item);
        item.in_pill = item.in_pill || null;
        item.out_pill = item.out_pill || (shortOut ? `Out: ${shortOut}` : null);
        item._inLogId = 0;
        item._outLogId = Number(item.id || 0);
        item._inScannedAt = '';
        item._outScannedAt = item.scanned_at || '';
        item._sortTs = tsMs;
        paired.push(item);
        return;
      }

      item._inLogId = Number(item.id || 0);
      item._outLogId = 0;
      item._inScannedAt = item.scanned_at || '';
      item._outScannedAt = '';
      item._sortTs = tsMs;
      paired.push(item);
    });

    return paired.sort((a, b) => {
      const tDiff = (b._sortTs || 0) - (a._sortTs || 0);
      if (tDiff !== 0) return tDiff;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }

  function renderActivityTimeline() {
    const listEls = [
      document.getElementById('timeline-feed-list'),
      document.getElementById('attendees-timeline-feed-list'),
    ].filter(Boolean);
    if (listEls.length === 0) return;

    const pageInfoEls = [
      document.getElementById('timeline-page-info'),
      document.getElementById('attendees-timeline-page-info'),
    ].filter(Boolean);

    const prevBtns = [
      document.getElementById('timeline-prev-btn'),
      document.getElementById('attendees-timeline-prev-btn'),
    ].filter(Boolean);

    const nextBtns = [
      document.getElementById('timeline-next-btn'),
      document.getElementById('attendees-timeline-next-btn'),
    ].filter(Boolean);

    const q = state.timelineSearch.trim().toLowerCase();
    const scope = state.timelineScope;
    const isReportMode = state.timelineRange && state.timelineRange !== 'today';
    const rawRows = isReportMode ? (state.timelineReportRows || []) : (state.activityTimeline || []);
    const sourceRows = pairTimelineEvents(rawRows);

    const summaryEl = document.getElementById('timeline-report-summary');
    if (summaryEl) {
      if (state.timelineReportLoading) {
        summaryEl.style.display = 'flex';
        summaryEl.innerHTML = '<span>Loading attendance report...</span>';
      } else if (isReportMode && state.timelineReportSummary) {
        const s = state.timelineReportSummary;
        summaryEl.style.display = 'flex';
        summaryEl.innerHTML = `
          <span><strong>${escapeHtml(state.timelineReportLabel || 'Report')}</strong></span>
          <span>Scans: <strong>${s.total_scans || 0}</strong></span>
          <span>Check-Ins: <strong>${s.total_check_ins || 0}</strong></span>
          <span>Check-Outs: <strong>${s.total_check_outs || 0}</strong></span>
          <span>Open Night Shifts: <strong>${s.active_open_shifts || 0}</strong></span>
          <span>Hours Logged: <strong>${s.total_hours_worked || 0}h</strong></span>
        `;
      } else {
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
      }
    }

    const filtered = sourceRows.filter((item) => {
      if (scope === 'event_venue' && item.checkpoint_type !== 'event_venue') return false;
      if (scope === 'stock_warehouse' && item.checkpoint_type !== 'stock_warehouse') return false;
      if (scope === 'granted' && item.access_status !== 'granted') return false;
      if (scope === 'denied' && item.access_status !== 'denied') return false;

      if (q) {
        const hay = `${item.full_name} ${item.badge_code} ${item.checkpoint_name} ${item.action_title || item.scan_action || ''} ${item.department || ''} ${item.role_display || item.role || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.timelinePerPage));
    if (state.timelinePage > totalPages) state.timelinePage = totalPages;
    if (state.timelinePage < 1) state.timelinePage = 1;

    const startIdx = (state.timelinePage - 1) * state.timelinePerPage;
    const pageItems = filtered.slice(startIdx, startIdx + state.timelinePerPage);

    let htmlContent = '';
    const canManageTimeline = isCurrentUserAdmin() || isCurrentUserStockManager();
    document.querySelectorAll('.js-open-create-timeline-btn').forEach((btn) => {
      btn.style.display = canManageTimeline ? 'inline-flex' : 'none';
    });

    if (pageItems.length === 0) {
      htmlContent = `<div style="padding: 24px; text-align: center; font-size: 12px; color: var(--text-secondary);">No gate activity logs match your filter.</div>`;
    } else {
      htmlContent = pageItems
        .map((item) => {
          const isDenied = item.access_status === 'denied';
          const isStock = item.checkpoint_type === 'stock_warehouse';
          const isTransit = Boolean(item.is_transit) || (item.notes && (item.notes.includes('Transit') || item.notes.includes('Transferred') || item.notes.includes('from Ndera') || item.notes.includes('to Kigali')));
          const actionTitle = item.action_title || `${item.scan_action === 'check_out' ? 'Checked out from' : (isDenied ? 'Denied at' : 'Checked in at')} ${item.checkpoint_name}`;
          const formattedTime = item.formatted_time || `${item.scanned_date || ''} ${item.scanned_time || ''}`.trim();
          const initials = item.initials || String(item.full_name || 'ST').split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();
          const roleDisp = item.role_display || item.role || '';
          const durationChip = item.duration_label && item.duration_label !== '—'
            ? `<span class="ts-mini-pill in" title="Paired shift duration">⏱ ${escapeHtml(item.duration_label)}</span>`
            : '';
          const nightChip = item.is_night_shift
            ? `<span class="status-badge status-badge-purple-sm">Night Shift</span>`
            : '';
          const crudBtns = canManageTimeline
            ? `<button type="button" class="btn btn-secondary-32-sm js-edit-timeline-log" data-timeline-id="${Number(item.id || 0)}" data-in-id="${Number(item._inLogId || 0)}" data-out-id="${Number(item._outLogId || 0)}" title="Edit Activity Log" style="height: 22px; padding: 0 7px; font-size: 10.5px;">Edit</button>
               <button type="button" class="btn btn-secondary-32-sm js-delete-timeline-log" data-timeline-id="${Number(item.id || 0)}" data-in-id="${Number(item._inLogId || 0)}" data-out-id="${Number(item._outLogId || 0)}" data-log-label="${escapeHtml(item.full_name)}" title="Delete Activity Log" style="height: 22px; padding: 0 7px; font-size: 10.5px; color: #dc2626; border-color: #fecaca;">Del</button>`
            : '';
          return `
            <div class="timeline-event-card" data-timeline-uid="${item.user_id}" data-timeline-id="${item.id}" style="cursor: pointer;" title="Click to view ${escapeHtml(item.full_name)} verification &amp; scan record">
              <div class="timeline-event-left">
                <div class="timeline-action-title">${escapeHtml(actionTitle)}</div>
                <div class="timeline-time-sub">${escapeHtml(formattedTime)} · ${escapeHtml(item.badge_code)}</div>
                <div class="timeline-staff-mini">
                  <div class="timeline-mini-avatar">${escapeHtml(initials)}</div>
                  <span class="timeline-mini-name">${escapeHtml(item.full_name)}</span>
                  ${item.clearance_code ? `<span class="tier-code-badge tier-code-${escapeHtml(item.clearance_code)}">${escapeHtml(item.clearance_code)}</span>` : ''}
                  <span class="timeline-mini-role">${escapeHtml(roleDisp)}${item.department ? ' · ' + escapeHtml(item.department) : ''}</span>
                </div>
              </div>
              <div class="timeline-event-right">
                ${
                  !isDenied && item.in_pill
                    ? `<span class="ts-mini-pill in">${escapeHtml(item.in_pill)}</span>`
                    : ''
                }
                ${
                  !isDenied && item.out_pill
                    ? `<span class="ts-mini-pill out">${escapeHtml(item.out_pill)}</span>`
                    : ''
                }
                ${durationChip}
                ${nightChip}
                ${
                  isTransit
                    ? `<span class="status-badge status-badge-purple-sm" title="Cross-Facility Transit">Transit Flow</span>`
                    : ''
                }
                <span class="status-badge ${isDenied ? 'status-badge-red-sm' : 'status-badge-green-sm'}">
                  ${isDenied ? 'Denied' : 'Granted'}
                </span>
                <span class="status-badge status-badge-neutral-sm">
                  ${isStock ? 'Facility Gate' : 'Event Venue'}
                </span>
                ${crudBtns}
              </div>
            </div>
          `;
        })
        .join('');
    }

    listEls.forEach((el) => {
      el.innerHTML = htmlContent;
    });

    const pageInfoText = `Page ${state.timelinePage} of ${totalPages} (${filtered.length} logs)`;
    pageInfoEls.forEach((el) => {
      el.textContent = pageInfoText;
    });

    prevBtns.forEach((btn) => {
      btn.disabled = state.timelinePage <= 1;
    });
    nextBtns.forEach((btn) => {
      btn.disabled = state.timelinePage >= totalPages;
    });
  }

  function filterCrewList(tabKey, searchStr) {
    const q = searchStr.trim().toLowerCase();
    return state.crew.filter((c) => {
      if (tabKey === 'checked_in' && c.daily_state !== 'checked_in') return false;
      if (tabKey === 'checked_out' && c.daily_state !== 'checked_out') return false;
      if (tabKey === 'stock_auth' && !c.stock_authorized) return false;
      if (tabKey === 'restricted' && c.stock_authorized) return false;

      if (state.tierFilter !== 'all' && c.clearance_code !== state.tierFilter) return false;
      if (state.gateStateFilter !== 'all' && c.daily_state !== state.gateStateFilter) return false;

      if (q) {
        const hay = `${c.full_name} ${c.username} ${c.badge_code} ${c.staff_code} ${c.department} ${c.role_display}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderCrewRowsHtml(list) {
    if (list.length === 0) {
      return `<div style="padding: 28px; text-align: center; font-size: 12px; color: var(--text-secondary);">No crew members match the selected filter criteria.</div>`;
    }

    return list
      .map((c) => {
        const isSelected = Number(c.id) === Number(state.selectedCrewId);
        const canCheckIn = c.daily_state === 'ready';
        const canCheckOut = c.daily_state === 'checked_in';

        return `
          <div class="data-table-row attendee-table-row ${isSelected ? 'kiosk-selected-row' : ''}" data-crew-id="${c.id}">
            <div class="col-checkbox">
              <div class="custom-checkbox" role="checkbox" aria-checked="${isSelected ? 'true' : 'false'}" tabindex="0"></div>
            </div>
            <div class="col-attendee">
              <div class="avatar-circle avatar-jl">${escapeHtml(c.initials)}</div>
              <div class="attendee-identity">
                <span class="attendee-name">${escapeHtml(c.full_name)}</span>
                <span class="attendee-email">@${escapeHtml(c.username)} · ${escapeHtml(c.phone)}</span>
              </div>
            </div>
            <div class="col-company">
              <div class="company-stack">
                <span class="company-name">${escapeHtml(c.department)}</span>
                <span class="company-role">${escapeHtml(c.role_display)}</span>
              </div>
            </div>
            <div class="col-ticket">
              <span class="tier-pill-soft ${escapeHtml(c.clearance_code)}">
                <span class="tier-code-badge tier-code-${escapeHtml(c.clearance_code)}">${escapeHtml(c.clearance_code)}</span>
                <span>${escapeHtml(c.clearance_short)}</span>
              </span>
            </div>
            <div class="col-reg-date">
              <div class="badge-code-mono-pill">
                <span class="badge-code-primary">${escapeHtml(c.badge_code)}</span>
                <span class="badge-code-sub">${escapeHtml(c.staff_code)} · ${escapeHtml(c.rfid_uid)}</span>
              </div>
            </div>
            <div class="col-reg-status">
              <div class="paired-timestamps-cell">
                ${
                  c.checkpoint_authorized
                    ? `<span class="status-badge status-badge-green-sm">Authorized (${escapeHtml(c.punctuality)})</span>`
                    : `<span class="status-badge status-badge-red-sm">Stock Restricted (L1)</span>`
                }
                ${c.check_in_time ? `<span class="ts-mini-pill in">In: ${escapeHtml(c.check_in_time)}</span>` : ''}
                ${c.check_out_time ? `<span class="ts-mini-pill out">Out: ${escapeHtml(c.check_out_time)}</span>` : ''}
              </div>
            </div>
            <div class="col-checkin">
              <div class="paired-gate-actions">
                <button
                  type="button"
                  class="gate-btn gate-btn-checkin js-row-gate-action"
                  data-badge="${escapeHtml(c.badge_code)}"
                  data-mode="check_in"
                  ${canCheckIn ? '' : 'disabled'}
                >
                  Checkin
                </button>
                <button
                  type="button"
                  class="gate-btn gate-btn-checkout js-row-gate-action"
                  data-badge="${escapeHtml(c.badge_code)}"
                  data-mode="check_out"
                  ${canCheckOut ? '' : 'disabled'}
                >
                  Checkout
                </button>
              </div>
            </div>
            <div class="col-actions">
              <button
                type="button"
                class="icon-btn js-inspect-crew-kiosk"
                data-crew-id="${c.id}"
                title="Load in #pane-kiosk Verification Deck"
              >
                <img src="assets/scan-line-13.svg" alt="Kiosk" class="svg-icon" />
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderPaginationControls(currentPage, totalPages, scope = 'dir') {
    if (totalPages <= 1) return '';

    const pages = getPaginationPageNumbers(currentPage, totalPages);
    const pageBtnsHtml = pages.map((p) => {
      if (p === '...') {
        return '<span class="pagination-ellipsis" style="padding:0 4px; color:var(--text-secondary);">…</span>';
      }
      return `
        <button
          type="button"
          class="page-number-btn ${p === currentPage ? 'active' : ''} js-crew-page-btn"
          data-page-scope="${scope}"
          data-page="${p}"
          aria-label="Go to page ${p}"
        >
          ${p}
        </button>
      `;
    }).join('');

    return `
      <button
        type="button"
        class="btn btn-secondary-32-sm js-crew-prev-btn"
        data-page-scope="${scope}"
        ${currentPage <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}
        aria-label="Previous Page"
      >
        <span>← Prev</span>
      </button>
      <div class="pagination-page-numbers" style="display:flex; align-items:center; gap:4px;">
        ${pageBtnsHtml}
      </div>
      <button
        type="button"
        class="btn btn-secondary-32-sm js-crew-next-btn"
        data-page-scope="${scope}"
        ${currentPage >= totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}
        aria-label="Next Page"
      >
        <span>Next →</span>
      </button>
    `;
  }

  function renderPaginatedCrewTable({
    rowsEl,
    countEl,
    paginationEl,
    tab,
    search,
    pageKey,
    perPageKey,
    scope,
    unitLabel,
  }) {
    if (!rowsEl) return;

    const list = filterCrewList(tab, search);
    const totalItems = list.length;
    const perPage = state[perPageKey] || 5;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    if (state[pageKey] > totalPages) state[pageKey] = totalPages;
    if (state[pageKey] < 1) state[pageKey] = 1;

    const startIndex = (state[pageKey] - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalItems);
    const pagedList = list.slice(startIndex, endIndex);

    rowsEl.innerHTML = renderCrewRowsHtml(pagedList);

    if (countEl) {
      if (totalItems === 0) {
        countEl.textContent = 'Showing 0 crew members';
      } else {
        countEl.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalItems} ${unitLabel} (Page ${state[pageKey]} of ${totalPages})`;
      }
    }

    if (paginationEl) {
      paginationEl.innerHTML = renderPaginationControls(state[pageKey], totalPages, scope);
    }
  }

  function renderCrewTables() {
    renderPaginatedCrewTable({
      rowsEl: document.getElementById('overview-attendee-rows'),
      countEl: document.getElementById('overview-results-count'),
      paginationEl: document.getElementById('overview-page-controls'),
      tab: state.overviewTab,
      search: state.overviewSearch,
      pageKey: 'overviewPage',
      perPageKey: 'overviewPerPage',
      scope: 'ov',
      unitLabel: 'badged production crew',
    });

    renderPaginatedCrewTable({
      rowsEl: document.getElementById('directory-attendee-rows'),
      countEl: document.getElementById('directory-results-count'),
      paginationEl: document.getElementById('directory-page-controls'),
      tab: state.directoryTab,
      search: state.directorySearch,
      pageKey: 'directoryPage',
      perPageKey: 'directoryPerPage',
      scope: 'dir',
      unitLabel: 'badged crew',
    });
  }

  function switchEventsHubTab(tab = 'directory') {
    const canSeeVenuesHub = isCurrentUserAdmin() || canCurrentUserAssignEvents();
    const canSeeWhHub = isCurrentUserAdmin() || canCurrentUserManageWarehouses() || isCurrentUserStockController();
    let safeTab = ['directory', 'warehouses', 'venues'].includes(tab) ? tab : 'directory';
    if (safeTab === 'venues' && !canSeeVenuesHub) safeTab = 'directory';
    if (safeTab === 'warehouses' && !canSeeWhHub) safeTab = 'directory';

    state.eventsHubTab = safeTab;

    document.querySelectorAll('.js-events-hub-tab').forEach((btn) => {
      const btnTab = btn.getAttribute('data-cp-hub-tab');
      const isActive = btnTab === safeTab;
      btn.className = `btn ${isActive ? 'btn-primary-32' : 'btn-secondary-32'} js-events-hub-tab${isActive ? ' active-subtab' : ''}`;
      const icon = btn.querySelector('img');
      if (icon) icon.style.filter = isActive ? 'brightness(0) invert(1)' : 'none';
    });

    const dirPane = document.getElementById('events-hub-pane-directory');
    const whPane = document.getElementById('events-hub-pane-warehouses');
    const venPane = document.getElementById('events-hub-pane-venues');
    if (dirPane) dirPane.style.display = safeTab === 'directory' ? 'block' : 'none';
    if (whPane) whPane.style.display = safeTab === 'warehouses' ? 'block' : 'none';
    if (venPane) venPane.style.display = safeTab === 'venues' ? 'block' : 'none';

    const canManageWh = canCurrentUserManageWarehouses();
    const canManageVenues = canCurrentUserAssignEvents();
    const topAddWhBtn = document.getElementById('open-add-warehouse-btn');
    const inlineAddWhBtn = document.getElementById('hub-add-wh-inline-btn');
    const topAddVenueBtn = document.getElementById('vs-add-venue-btn');
    const inlineAddVenueBtn = document.getElementById('hub-add-venue-inline-btn');
    if (topAddWhBtn) topAddWhBtn.style.display = (safeTab === 'warehouses' && canManageWh) ? 'inline-flex' : 'none';
    if (inlineAddWhBtn) inlineAddWhBtn.style.display = canManageWh ? 'inline-flex' : 'none';
    if (topAddVenueBtn) topAddVenueBtn.style.display = (safeTab === 'venues' && canManageVenues) ? 'inline-flex' : 'none';
    if (inlineAddVenueBtn) inlineAddVenueBtn.style.display = canManageVenues ? 'inline-flex' : 'none';

    if (safeTab === 'warehouses') {
      renderWarehousesGrid();
    } else if (safeTab === 'venues') {
      renderVenueSecurityPage();
    } else {
      renderCheckpointsDirectory();
    }
  }

  function renderCheckpointsDirectory() {
    const rowsEl = document.getElementById('events-table-rows');
    if (!rowsEl) return;

    const allCps = state.checkpoints.directory || [];
    const stocksCount = (state.checkpoints.stock_warehouses || []).length;
    const venuesCount = (state.checkpoints.event_venues || []).length;

    const hubAllEl = document.getElementById('cp-hub-count-all');
    const hubWhEl = document.getElementById('cp-hub-count-wh');
    const hubVenEl = document.getElementById('cp-hub-count-venues');
    if (hubAllEl) hubAllEl.textContent = String(allCps.length).padStart(2, '0');
    if (hubWhEl) hubWhEl.textContent = String(stocksCount).padStart(2, '0');
    if (hubVenEl) hubVenEl.textContent = String(venuesCount).padStart(2, '0');

    document.querySelectorAll('#events-total-kpi').forEach((el) => {
      el.textContent = String(allCps.length).padStart(2, '0');
    });
    document.querySelectorAll('#events-stock-kpi').forEach((el) => {
      el.textContent = String(stocksCount).padStart(2, '0');
    });
    document.querySelectorAll('#events-venue-kpi').forEach((el) => {
      el.textContent = String(venuesCount).padStart(2, '0');
    });

    const sidebarCount = document.getElementById('sidebar-events-count');
    const dirBadge = document.getElementById('events-directory-badge');
    if (sidebarCount) sidebarCount.textContent = String(allCps.length).padStart(2, '0');
    if (dirBadge) dirBadge.textContent = String(allCps.length).padStart(2, '0');

    const tabAll = document.getElementById('events-tab-count-all');
    const tabStock = document.getElementById('events-tab-count-stock');
    const tabVenue = document.getElementById('events-tab-count-venue');
    if (tabAll) tabAll.textContent = String(allCps.length).padStart(2, '0');
    if (tabStock) tabStock.textContent = String(stocksCount).padStart(2, '0');
    if (tabVenue) tabVenue.textContent = String(venuesCount).padStart(2, '0');

    const q = state.checkpointSearch.trim().toLowerCase();
    const filtered = allCps.filter((cp) => {
      if (state.checkpointTab !== 'all' && cp.type !== state.checkpointTab) return false;
      if (q) {
        const hay = `${cp.name} ${cp.location} ${cp.lead_label} ${cp.min_clearance}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // 5 items per page pagination
    state.checkpointPage = state.checkpointPage || 1;
    state.checkpointPerPage = 5;
    const totalPages = Math.ceil(filtered.length / state.checkpointPerPage) || 1;
    if (state.checkpointPage > totalPages) state.checkpointPage = totalPages;
    if (state.checkpointPage < 1) state.checkpointPage = 1;

    const startIdx = (state.checkpointPage - 1) * state.checkpointPerPage;
    const paged = filtered.slice(startIdx, startIdx + state.checkpointPerPage);

    // Update Footer Count
    const footerCountEl = document.getElementById('events-results-count');
    if (footerCountEl) {
      if (filtered.length === 0) {
        footerCountEl.textContent = 'Showing 0 of 0 checkpoints';
      } else {
        const endIdx = Math.min(startIdx + state.checkpointPerPage, filtered.length);
        footerCountEl.textContent = `Showing ${startIdx + 1}–${endIdx} of ${filtered.length} checkpoints`;
      }
    }

    // Update Page Controls
    const pageControlsEl = document.getElementById('events-page-controls');
    if (pageControlsEl) {
      if (totalPages <= 1) {
        pageControlsEl.innerHTML = '';
      } else {
        let controlsHtml = `
          <button type="button" class="btn btn-secondary-32 js-events-prev-page" ${state.checkpointPage <= 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
            &larr; Prev
          </button>
        `;
        for (let p = 1; p <= totalPages; p++) {
          const isActive = p === state.checkpointPage;
          controlsHtml += `
            <button type="button" class="btn ${isActive ? 'btn-primary-32' : 'btn-secondary-32'} js-events-page-num" data-page="${p}" style="min-width: 32px; padding: 0 8px; font-weight: 600;">
              ${p}
            </button>
          `;
        }
        controlsHtml += `
          <button type="button" class="btn btn-secondary-32 js-events-next-page" ${state.checkpointPage >= totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
            Next &rarr;
          </button>
        `;
        pageControlsEl.innerHTML = controlsHtml;

        pageControlsEl.querySelectorAll('.js-events-page-num').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.checkpointPage = Number(btn.getAttribute('data-page'));
            renderCheckpointsDirectory();
          });
        });
        const prevBtn = pageControlsEl.querySelector('.js-events-prev-page');
        if (prevBtn && state.checkpointPage > 1) {
          prevBtn.addEventListener('click', () => {
            state.checkpointPage--;
            renderCheckpointsDirectory();
          });
        }
        const nextBtn = pageControlsEl.querySelector('.js-events-next-page');
        if (nextBtn && state.checkpointPage < totalPages) {
          nextBtn.addEventListener('click', () => {
            state.checkpointPage++;
            renderCheckpointsDirectory();
          });
        }
      }
    }

    if (filtered.length === 0) {
      rowsEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No checkpoints match the search criteria.</div>';
      return;
    }

    rowsEl.innerHTML = paged
      .map((cp) => {
        const isStock = cp.type === 'stock_warehouse';
        const isActive = cp.type === state.checkpointType && Number(cp.id) === Number(state.checkpointId);
        return `
          <div class="data-table-row data-table-row-event event-table-row" style="${isActive ? 'background-color: #f5f3ff;' : ''}">
            <div class="col-checkbox-event">
              <div class="custom-checkbox" role="checkbox" aria-checked="${isActive ? 'true' : 'false'}"></div>
            </div>
            <div class="col-event-name">
              <div class="date-tile" style="background-color: ${isStock ? '#dcfce7' : '#e0f2fe'};">
                <span class="date-tile-month" style="color: ${isStock ? '#15803d' : '#0369a1'};">${isStock ? 'STOCK' : 'VENUE'}</span>
                <span class="date-tile-day" style="font-size: 13px; font-weight: 700; color: ${isStock ? '#15803d' : '#0369a1'};">#${cp.id}</span>
              </div>
              <div class="attendee-identity">
                <span class="event-row-title">${escapeHtml(cp.name)}</span>
                <span class="event-row-type">${escapeHtml(cp.location)}</span>
              </div>
            </div>
            <div class="col-event-schedule">
              <div class="company-stack">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="company-name">Call: <strong>${escapeHtml(cp.call_time || '08:00')}</strong></span>
                  <button
                    type="button"
                    class="calltime-edit-trigger js-open-row-calltime"
                    data-cp-type="${cp.type}"
                    data-cp-id="${cp.id}"
                    data-cp-name="${escapeHtml(cp.name)}"
                    data-call-time="${escapeHtml(cp.call_time || '08:00')}"
                    title="Change Call Time"
                    style="display: inline-flex; align-items: center; gap: 3px;"
                  >
                    <img src="assets/edit.svg" alt="" class="svg-icon" style="width: 10px; height: 10px;" />
                    <span>Set</span>
                  </button>
                  ${
                    !isStock
                      ? `<button
                          type="button"
                          class="calltime-edit-trigger js-open-event-assign-modal"
                          data-event-id="${cp.raw_id || cp.id}"
                          title="Assign Technicians & Call Time"
                          style="display: inline-flex; align-items: center; gap: 3px; background: rgba(37, 99, 235, 0.08); color: #2563eb; border-color: rgba(37, 99, 235, 0.2);"
                        >
                          <img src="assets/team-members.svg" alt="" class="svg-icon" style="width: 10px; height: 10px;" />
                          <span>Crew (${cp.assigned_count || 0})</span>
                        </button>`
                      : ''
                  }
                </div>
                <span class="company-role">${escapeHtml(cp.lead_label || '')}</span>
              </div>
            </div>
            <div class="col-event-location">
              <span class="status-badge ${isStock ? 'status-badge-amber-sm' : 'status-badge-green-sm'}">
                ${escapeHtml(cp.min_clearance)}
              </span>
            </div>
            <div class="col-event-registrations">
              <div class="capacity-cell">
                <span class="capacity-numbers">
                  <strong>${cp.on_site_now || 0} On-Site</strong>
                  <span class="capacity-total"> · ${cp.checked_in_today || 0} Check-ins today</span>
                </span>
              </div>
            </div>
            <div class="col-event-status">
              <span class="status-badge ${isStock ? 'status-badge-green-sm' : 'status-badge-purple-sm'}">
                ${isStock ? 'Stock Warehouse' : 'Event Venue'}
              </span>
            </div>
            <div class="col-event-action" style="display: flex; gap: 6px; align-items: center;">
              <button
                type="button"
                class="btn btn-primary-32 js-activate-checkpoint-btn"
                data-cp-type="${cp.type}"
                data-cp-id="${cp.id}"
              >
                ${isActive ? 'Active Terminal (#pane-kiosk)' : 'Open Gate Terminal'}
              </button>
              ${
                !isStock
                  ? `<button
                      type="button"
                      class="btn btn-secondary-32 js-open-event-assign-modal"
                      data-event-id="${cp.raw_id || cp.id}"
                      title="Assign Technical Crew & Call Time"
                      style="padding: 0 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;"
                    >
                      <img src="assets/team-members.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
                      <span>Roster</span>
                    </button>`
                  : ''
              }
            </div>
            <div class="col-actions"></div>
          </div>
        `;
      })
      .join('');
  }

  function renderClearanceMatrixCardsHtml() {
    if (!state.clearanceMatrix || state.clearanceMatrix.length === 0) {
      return '<div style="padding: 24px; text-align: center; color: var(--text-secondary); width: 100%;">No clearance tiers configured.</div>';
    }
    return state.clearanceMatrix
      .map((m) => {
        const venueRule = m.venue_Rule || m.venue_rule || 'YES';
        const stockRule = m.stock_rule || 'NO';
        const isCore = Number(m.is_system) === 1;

        return `
        <div class="metric-card" style="border-top: 3px solid ${escapeHtml(m.color || '#2563eb')}; position: relative;">
          <div class="metric-heading" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tier-code-badge" style="background: ${escapeHtml(m.color || '#2563eb')}; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 11px; display: inline-block;">${escapeHtml(m.code)}</span>
              <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${m.member_count || 0} Staff</span>
            </div>
            <div class="tier-card-actions" style="display: flex; align-items: center; gap: 4px;">
              <button type="button" class="btn-tier-action js-edit-tier" data-tier-id="${m.id || ''}" data-tier-code="${escapeHtml(m.code)}" title="Edit Tier Configuration" style="background: var(--bg-hover, #f1f5f9); border: 1px solid var(--border-color, #e2e8f0); border-radius: 4px; padding: 2px 7px; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--text-primary); display: inline-flex; align-items: center; gap: 4px;">
                <img src="assets/edit.svg" alt="" class="svg-icon" style="width: 11px; height: 11px;" />
                <span>Edit</span>
              </button>
              ${
                isCore
                  ? `<span style="font-size: 10px; font-weight: 600; color: #1e40af; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;"><img src="assets/lock.svg" alt="" class="svg-icon" style="width: 10px; height: 10px; opacity: 0.7;" /> Core Tier</span>`
                  : `<span style="font-size: 10px; font-weight: 600; color: #475569; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.08); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;">Standard</span>
              <button type="button" class="btn-tier-action js-delete-tier" data-tier-id="${m.id || ''}" data-tier-code="${escapeHtml(m.code)}" data-tier-title="${escapeHtml(m.title)}" data-member-count="${m.member_count || 0}" title="Delete Custom Tier" style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 4px; padding: 2px 7px; font-size: 11px; font-weight: 600; cursor: pointer; color: #dc2626; display: inline-flex; align-items: center; gap: 3px;">
                <img src="assets/trash.svg" alt="" class="svg-icon" style="width: 11px; height: 11px;" />
                <span>Del</span>
              </button>`
              }
            </div>
          </div>
          <span style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-top: 6px; display: block; line-height: 1.25;">${escapeHtml(m.title)}</span>
          <span class="metric-context" style="font-size: 11px; color: var(--text-secondary); margin-top: 2px; display: block;">
            Venue Access: <strong>${escapeHtml(venueRule)}</strong> · Stock Access: <strong>${escapeHtml(stockRule)}</strong>
          </span>
          ${
            m.description
              ? `<p style="margin: 6px 0 0; font-size: 11px; color: var(--text-secondary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${escapeHtml(m.description)}">${escapeHtml(m.description)}</p>`
              : ''
          }
        </div>
      `;
      })
      .join('');
  }

  function renderClearanceMatrixCards() {
    const html = renderClearanceMatrixCardsHtml();
    const matrixGrid = document.getElementById('matrix-tier-cards-grid');
    if (matrixGrid) matrixGrid.innerHTML = html;

    const usersMatrixGrid = document.getElementById('users-matrix-tier-cards-grid');
    if (usersMatrixGrid) usersMatrixGrid.innerHTML = html;

    const pillMatrix = document.getElementById('pill-matrix-count');
    if (pillMatrix) pillMatrix.textContent = String(state.clearanceMatrix ? state.clearanceMatrix.length : 0);
  }

  function renderUsersMatrixScreen() {
    renderBatchesAndMatrixScreen();
  }

  function switchUsersView(mode) {
    const isAdmin = isCurrentUserAdmin();
    const safeMode = (!isAdmin && ['roles', 'matrix', 'departments', 'navigation'].includes(mode))
      ? 'personnel'
      : mode;
    state.usersViewMode = safeMode;
    mode = safeMode;

    const tabPersonnel = document.getElementById('view-tab-personnel');
    const tabRoles = document.getElementById('view-tab-roles');
    const tabMatrix = document.getElementById('view-tab-matrix');
    const tabDepts = document.getElementById('view-tab-departments');
    const tabNav = document.getElementById('view-tab-navigation');
    const personnelView = document.getElementById('personnel-view-container');
    const rolesView = document.getElementById('roles-view-container');
    const matrixView = document.getElementById('matrix-view-container');
    const deptsView = document.getElementById('departments-view-container');
    const navView = document.getElementById('navigation-view-container');
    const addStaffBtn = document.getElementById('open-add-user-btn');
    const addRoleBtn = document.getElementById('open-add-role-btn');
    const addTierTopBtn = document.getElementById('open-add-tier-top-btn');
    const addDeptTopBtn = document.getElementById('open-add-dept-top-btn');
    const addNavTopBtn = document.getElementById('open-add-nav-top-btn');
    const exportBtn = document.getElementById('users-export-btn');

    const tabs = [
      { el: tabPersonnel, active: mode === 'personnel' },
      { el: tabRoles, active: mode === 'roles' },
      { el: tabMatrix, active: mode === 'matrix' },
      { el: tabDepts, active: mode === 'departments' },
      { el: tabNav, active: mode === 'navigation' },
    ];

    tabs.forEach(({ el, active }) => {
      if (!el) return;
      if (active) {
        el.className = 'btn btn-primary-32 js-users-view-tab active-subtab';
        const icon = el.querySelector('img');
        if (icon) icon.style.filter = 'brightness(0) invert(1)';
      } else {
        el.className = 'btn btn-secondary-32 js-users-view-tab';
        const icon = el.querySelector('img');
        if (icon) icon.style.filter = 'none';
      }
    });

    if (personnelView) personnelView.style.display = mode === 'personnel' ? 'block' : 'none';
    if (rolesView) rolesView.style.display = mode === 'roles' ? 'block' : 'none';
    if (matrixView) matrixView.style.display = mode === 'matrix' ? 'block' : 'none';
    if (deptsView) deptsView.style.display = mode === 'departments' ? 'block' : 'none';
    if (navView) navView.style.display = mode === 'navigation' ? 'block' : 'none';

    if (addStaffBtn) addStaffBtn.style.display = mode === 'personnel' ? 'inline-flex' : 'none';
    if (addRoleBtn) addRoleBtn.style.display = mode === 'roles' ? 'inline-flex' : 'none';
    if (addTierTopBtn) addTierTopBtn.style.display = mode === 'matrix' ? 'inline-flex' : 'none';
    if (addDeptTopBtn) addDeptTopBtn.style.display = mode === 'departments' ? 'inline-flex' : 'none';
    if (addNavTopBtn) addNavTopBtn.style.display = mode === 'navigation' ? 'inline-flex' : 'none';
    if (exportBtn) exportBtn.style.display = mode === 'personnel' ? 'inline-flex' : 'none';

    if (mode === 'matrix') {
      renderUsersMatrixScreen();
    } else if (mode === 'roles') {
      renderRolesScreen();
    } else if (mode === 'departments') {
      renderDepartmentsScreen();
    } else if (mode === 'navigation') {
      renderNavigationManagerScreen();
    } else {
      renderUsersScreen();
    }
  }

  function renderBatchesAndMatrixScreen() {
    // 1. 4-Tier Matrix Overview Cards
    renderClearanceMatrixCards();

    // 2. 4-Tier Access Matrix Crew Assignment Rows
    const matrixRowsEl = document.getElementById('matrix-config-rows');
    if (matrixRowsEl) {
      matrixRowsEl.innerHTML = state.crew
        .map(
          (c) => `
          <div class="tier-table-row" style="height: 60px;">
            <div style="width: 220px; display: flex; align-items: center; gap: 10px;">
              <div class="avatar-circle avatar-jl">${escapeHtml(c.initials)}</div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 12px; font-weight: 600;">${escapeHtml(c.full_name)}</span>
                <span style="font-size: 10px; color: var(--text-secondary);">${escapeHtml(c.role_display)} · ${escapeHtml(c.department)}</span>
              </div>
            </div>
            <div style="width: 160px;">
              <span class="badge-code-primary">${escapeHtml(c.badge_code)}</span>
            </div>
            <div style="width: 220px;">
              <span class="tier-pill-soft ${escapeHtml(c.clearance_code)}">
                <span class="tier-code-badge tier-code-${escapeHtml(c.clearance_code)}">${escapeHtml(c.clearance_code)}</span>
                <span>${escapeHtml(c.clearance_short)}</span>
              </span>
            </div>
            <div style="width: 180px; font-size: 11px;">
              ${
                c.clearance_code === 'L1'
                  ? 'Venue: YES · <strong style="color:#dc2626;">Stock: NO</strong>'
                  : 'Venue: YES · <strong style="color:#16a34a;">Stock: YES</strong>'
              }
            </div>
            <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
              <select class="form-select js-clearance-select" data-user-id="${c.id}" style="height: 30px; font-size: 11px;">
                <option value="L1_VENUE_BASIC" ${c.clearance_code === 'L1' ? 'selected' : ''}>L1 — Event Venue Crew (Venue Only)</option>
                <option value="L2_TECH_STAGE" ${c.clearance_code === 'L2' ? 'selected' : ''}>L2 — Technical & Stage (Facility + Venue)</option>
                <option value="L3_STOCK_WAREHOUSE" ${c.clearance_code === 'L3' ? 'selected' : ''}>L3 — Gate Controller (Assigned Gate)</option>
                <option value="L4_ALL_ACCESS" ${c.clearance_code === 'L4' ? 'selected' : ''}>L4 — Executive & All-Access</option>
              </select>
              <button type="button" class="btn btn-secondary-32-sm js-test-in-kiosk" data-crew-id="${c.id}">
                Test in Kiosk ↗
              </button>
            </div>
          </div>
        `
        )
        .join('');
    }
  }

  function renderMyRollCallAlertBanner() {
    const targets = [
      document.getElementById('my-rollcall-alert-card'),
      document.getElementById('page-rc-my-alert-card'),
    ].filter(Boolean);
    if (!targets.length) return;
    const ping = state.myPendingRollCall;
    if (!ping) {
      targets.forEach((el) => { el.style.display = 'none'; el.innerHTML = ''; });
      return;
    }
    const minsLeft = Math.max(1, Math.ceil(Number(ping.seconds_left || 60) / 60));
    const html = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#b45309;">Random Premise Roll-Call Verification Required</div>
          <div style="font-size:15px;font-weight:800;color:var(--text-primary);margin-top:2px;">Confirm you are currently inside ${escapeHtml(ping.checkpoint_name || 'your assigned site')}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
            Deadline: <strong>${escapeHtml(ping.deadline_at || '')}</strong> (~${minsLeft} min left) · ${Number(ping.auto_checkout_on_miss) === 1 ? 'Missed response triggers Auto Check-Out.' : 'Missed response flags Unaccounted.'}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button type="button" class="btn btn-primary-32 js-self-verify-rollcall-btn" data-entry-id="${Number(ping.entry_id)}" style="background:#059669;border-color:#059669;">📍 Verify On-Premise (GPS + Device)</button>
          <button type="button" class="btn btn-secondary-32-sm js-self-qr-rollcall-btn" data-entry-id="${Number(ping.entry_id)}">📷 Verify with Gate QR Token</button>
        </div>
      </div>
    `;
    targets.forEach((el) => {
      el.style.display = 'block';
      el.innerHTML = html;
      el.querySelector('.js-self-verify-rollcall-btn')?.addEventListener('click', () => handleSelfRespondRollCall(ping.entry_id, false));
      el.querySelector('.js-self-qr-rollcall-btn')?.addEventListener('click', () => handleSelfRespondRollCall(ping.entry_id, true));
    });
  }

  async function handleSelfRespondRollCall(entryId, askQrToken) {
    let venueQrTok = '';
    if (askQrToken) {
      venueQrTok = (window.prompt('Paste the URL or challenge token from the live Gate Rotating QR screen:') || '').trim();
      if (!venueQrTok) return;
    }
    const postVerify = async (coords) => {
      try {
        const res = await fetch('api.php?action=respond_roll_call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'respond_roll_call',
            entry_id: Number(entryId),
            device_token: getOrCreateClientDeviceToken(),
            device_label: inferClientDeviceLabel(),
            venue_qr_token: venueQrTok,
            lat: coords ? coords.lat : '',
            lng: coords ? coords.lng : '',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data || !data.ok) {
          showToast(data?.error || 'Could not verify Roll-Call presence.');
          playKioskChime('decline');
          return;
        }
        applyBootstrapPayload(data, true);
        playKioskChime('approve');
        showToast(data.message || 'Premise presence confirmed.');
      } catch (e) {
        showToast('Network error confirming presence.');
      }
    };
    if (venueQrTok || !navigator.geolocation) {
      await postVerify(null);
      return;
    }
    showToast('Acquiring GPS coordinates for geo-fence verification...');
    navigator.geolocation.getCurrentPosition(
      (pos) => postVerify({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }),
      () => postVerify(null),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 15000 }
    );
  }

  function renderMyAssignmentsInboxCard() {
    const card = document.getElementById('my-assignments-inbox-card');
    if (!card) return;
    const myAsg = Array.isArray(state.myPendingAssignments) ? state.myPendingAssignments : [];
    const pendingSupReqs = (state.eventSupportRequests || []).filter((r) => String(r.status) === 'pending');
    const canFulfillSupport = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserEventCommand();
    const showTechInbox = myAsg.length > 0;
    const showSupInbox = canFulfillSupport && pendingSupReqs.length > 0;
    if (!showTechInbox && !showSupInbox) {
      card.style.display = 'none';
      card.innerHTML = '';
      return;
    }
    const asgRowsHtml = myAsg.map((a) => {
      const st = String(a.confirmation_status || 'pending').toLowerCase();
      return `
        <div class="rc-entry-row">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <strong>${escapeHtml(a.event_title || 'Event')}</strong>
              <span class="assign-status-pill ${escapeHtml(st)}">${escapeHtml(st)}</span>
              <span class="status-badge status-badge-purple-sm">${escapeHtml(a.branch_dept || 'Crew')}</span>
            </div>
            <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
              ${escapeHtml(a.event_location || '')} · ${escapeHtml(a.event_date || '')} · Call-Time ${escapeHtml(a.call_time || '08:00')} · Lead: ${escapeHtml(a.tech_lead || 'Tech Lead')}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${st !== 'confirmed' ? `<button type="button" class="btn btn-primary-32 js-confirm-my-assignment" data-event-id="${escapeHtml(a.event_id)}" style="background:#059669;border-color:#059669;">✓ Confirm</button>` : ''}
            ${st !== 'declined' ? `<button type="button" class="btn btn-secondary-32-sm js-decline-my-assignment" data-event-id="${escapeHtml(a.event_id)}" style="color:#dc2626;border-color:#fecaca;">✕ Decline</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
    const supRowsHtml = showSupInbox ? `
      <div style="margin-top:${showTechInbox ? '12px' : '0'};padding-top:${showTechInbox ? '10px' : '0'};${showTechInbox ? 'border-top:1px solid var(--border-color);' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div>
            <strong style="font-size:13px;">Pending Tier 4 Support Staff Requests (${pendingSupReqs.length})</strong>
            <div style="font-size:11.5px;color:var(--text-secondary);">${pendingSupReqs.map((r) => `${r.event_title} (by ${r.requested_by_name})`).join(' · ')}</div>
          </div>
          <button type="button" class="btn btn-primary-32" id="inbox-open-dispatch-btn">Assign Support Staff →</button>
        </div>
      </div>
    ` : '';

    card.style.display = 'block';
    card.innerHTML = `
      ${showTechInbox ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <div>
            <h3 class="directory-title-18" style="margin:0;font-size:15px;">My Event Dispatch Assignments</h3>
            <p class="directory-desc" style="margin:0;font-size:11.5px;">Confirm or decline scheduled event deployments assigned by Command / Tech Lead.</p>
          </div>
        </div>
        ${asgRowsHtml}
      ` : ''}
      ${supRowsHtml}
    `;

    card.querySelectorAll('.js-confirm-my-assignment').forEach((btn) => {
      btn.addEventListener('click', () => respondMyEventAssignment(btn.getAttribute('data-event-id'), 'confirmed'));
    });
    card.querySelectorAll('.js-decline-my-assignment').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reason = window.prompt('Optional reason for declining this event assignment:', 'Schedule conflict');
        if (reason === null) return;
        respondMyEventAssignment(btn.getAttribute('data-event-id'), 'declined', reason);
      });
    });
    card.querySelector('#inbox-open-dispatch-btn')?.addEventListener('click', () => {
      switchScreen('settings');
      switchSettingsTab('dispatch');
    });
  }

  async function respondMyEventAssignment(eventId, decision, declineReason = '') {
    try {
      const res = await fetch('api.php?action=respond_event_assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_event_assignment',
          event_id: String(eventId),
          decision,
          decline_reason: declineReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || !data.ok) {
        showToast(data?.error || 'Could not update assignment response.');
        return;
      }
      applyBootstrapPayload(data, true);
      showToast(data.message || `Assignment ${decision}.`);
    } catch (err) {
      showToast('Network error responding to assignment.');
    }
  }

  function renderRollCallModalList() {
    const listEl = document.getElementById('rollcall-modal-list');
    if (!listEl) return;
    const sumEl = document.getElementById('rollcall-modal-random-summary');
    const activeSessions = (state.rollCallSessions || []).filter((s) => s.status === 'active' || s.status === 'awaiting_review');
    if (sumEl) {
      if (activeSessions.length > 0) {
        const latest = activeSessions[0];
        const c = latest.counts || {};
        sumEl.textContent = `Active Roll-Call #${latest.id} (${latest.checkpoint_name}): ${c.present || 0} present · ${c.pending || 0} pending · ${c.timed_out || 0} auto-out.`;
      } else {
        sumEl.textContent = 'Run a random sample check to verify checked-in crew are still physically inside the premise.';
      }
    }
    listEl.innerHTML = buildRollCallListHtml(state.rollCallList);
  }

  function openKioskModal(memberOrVerification = null) {
    let member = null;
    let verification = null;

    if (memberOrVerification && memberOrVerification.badge) {
      verification = memberOrVerification;
      member = verification.badge;
    } else if (typeof memberOrVerification === 'object' && memberOrVerification !== null) {
      member = memberOrVerification;
    } else if (memberOrVerification != null) {
      member = (state.crew || []).find((c) => Number(c.id) === Number(memberOrVerification));
    }

    if (!member && !verification) {
      // Modal ONLY pops up with results! Return to input search.
      returnToSearchInput();
      return;
    }

    if (verification) {
      state.currentVerification = verification;
      if (verification.badge && verification.badge.user_id) {
        state.selectedCrewId = Number(verification.badge.user_id);
      }
    } else if (member) {
      state.selectedCrewId = Number(member.id);
      state.currentVerification = buildClientVerificationFromMember(member);
    }

    const b = state.currentVerification ? state.currentVerification.badge : member;
    const inp = document.getElementById('kiosk-badge-input');
    const matchTag = document.getElementById('kiosk-search-match-tag');
    const clearBtn = document.getElementById('kiosk-input-clear-btn');
    if (inp && b) {
      inp.value = b.badge_code || b.staff_code || '';
      if (clearBtn) clearBtn.style.display = 'flex';
      if (matchTag) {
        matchTag.style.display = 'inline-flex';
        matchTag.innerHTML = `
          <span class="tier-code-badge tier-code-${escapeHtml(b.clearance_code)}">${escapeHtml(b.clearance_code)}</span>
          <span>${escapeHtml(b.full_name)} (${escapeHtml(b.badge_code)})</span>
        `;
      }
    }

    const backdrop = document.getElementById('kiosk-modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    showVerificationCard();
    renderVerificationDeck();
    highlightSelectedCrewRow(state.selectedCrewId);
    clearKioskCountdown();
    const timeoutLabel = document.getElementById('kiosk-timeout-label');
    if (timeoutLabel) timeoutLabel.style.display = 'none';
  }

  function closeKioskModal() {
    clearKioskCountdown();
    state.pendingFaceMatchScan = null;
    const backdrop = document.getElementById('kiosk-modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  // =========================================================================
  // DEDICATED TIMELINE ACTIVITY LOG & TRANSIT AUDIT MODAL
  // =========================================================================

  function openTimelineDetailModal(tlItem, member = null) {
    const modal = document.getElementById('timeline-detail-modal');
    if (!modal || !tlItem) return;

    const resolvedMember = member || (state.crew || []).find((c) => Number(c.id) === Number(tlItem.user_id)) || {
      id: tlItem.user_id,
      full_name: tlItem.full_name,
      staff_code: tlItem.staff_code,
      badge_code: tlItem.badge_code,
      role: 'technician',
      role_display: tlItem.role_display,
      department: tlItem.department,
      clearance_code: tlItem.clearance_code,
      clearance_title: tlItem.clearance_code === 'L4' ? 'Executive & Director' : (tlItem.clearance_code === 'L3' ? 'Stock & Logistics Manager' : (tlItem.clearance_code === 'L2' ? 'Technical & Stage' : 'Venue Basic')),
      clearance_color: tlItem.clearance_color || '#2563eb',
      phone: '+250 788 000 000',
      initials: tlItem.initials || 'CR',
      profile_image_url: tlItem.profile_image_url,
      daily_state: tlItem.scan_action === 'check_out' ? 'checked_out' : 'checked_in',
    };

    // Header elements
    const logIdEl = document.getElementById('tl-modal-log-id');
    const tsEl = document.getElementById('tl-modal-timestamp');
    const cpEl = document.getElementById('tl-modal-checkpoint');
    const statusBadgeEl = document.getElementById('tl-modal-status-badge');
    const statusTextEl = document.getElementById('tl-modal-status-text');

    if (logIdEl) logIdEl.textContent = `#LOG-${String(tlItem.id || 1).padStart(4, '0')}`;
    if (tsEl) tsEl.textContent = tlItem.formatted_time || tlItem.scanned_at || 'Today';
    if (cpEl) cpEl.textContent = `${tlItem.checkpoint_name} (${tlItem.checkpoint_type === 'stock_warehouse' ? 'Stock Warehouse Gate' : 'Event Venue Entrance'})`;

    const isDenied = tlItem.access_status === 'denied';
    if (statusBadgeEl && statusTextEl) {
      statusBadgeEl.className = `status-badge ${isDenied ? 'status-badge-red-md' : 'status-badge-green-md'}`;
      statusTextEl.textContent = isDenied ? 'Access Denied' : 'Access Granted';
    }

    // Personnel Profile
    const imgEl = document.getElementById('tl-modal-avatar-img');
    const initialsEl = document.getElementById('tl-modal-avatar-initials');
    const nameEl = document.getElementById('tl-modal-name');
    const tierPillEl = document.getElementById('tl-modal-tier-pill');
    const tierBadgeEl = document.getElementById('tl-modal-tier-badge');
    const tierTitleEl = document.getElementById('tl-modal-tier-title');
    const dailyStateEl = document.getElementById('tl-modal-daily-state');
    const staffCodeEl = document.getElementById('tl-modal-staff-code');
    const badgeCodeEl = document.getElementById('tl-modal-badge-code');
    const roleEl = document.getElementById('tl-modal-role');
    const contactEl = document.getElementById('tl-modal-contact');
    const firstNameEl = document.getElementById('tl-modal-user-firstname');

    const photoUrl = resolvedMember.profile_image_url || tlItem.profile_image_url;
    if (photoUrl && imgEl && initialsEl) {
      imgEl.src = photoUrl;
      imgEl.style.display = 'block';
      initialsEl.style.display = 'none';
    } else if (initialsEl && imgEl) {
      imgEl.style.display = 'none';
      initialsEl.style.display = 'flex';
      initialsEl.textContent = resolvedMember.initials || tlItem.initials || computeInitials(resolvedMember.full_name);
    }

    if (nameEl) nameEl.textContent = resolvedMember.full_name;
    if (firstNameEl) firstNameEl.textContent = (resolvedMember.full_name || '').split(' ')[0] || 'Crew Member';
    if (tierBadgeEl) tierBadgeEl.textContent = resolvedMember.clearance_code || 'L2';
    if (tierTitleEl) tierTitleEl.textContent = resolvedMember.clearance_title || 'Technical & Stage';
    if (tierPillEl) tierPillEl.className = `tier-pill-soft ${resolvedMember.clearance_code || 'L2'}`;

    if (dailyStateEl) {
      const ds = resolvedMember.daily_state || (tlItem.scan_action === 'check_out' ? 'checked_out' : 'checked_in');
      dailyStateEl.textContent = ds === 'checked_in' ? 'Checked In (On-Site)' : (ds === 'checked_out' ? 'Checked Out' : 'Ready / Off-Site');
      dailyStateEl.className = `status-badge ${ds === 'checked_in' ? 'status-badge-green-sm' : (ds === 'checked_out' ? 'status-badge-neutral-sm' : 'status-badge-purple-sm')}`;
    }

    if (staffCodeEl) staffCodeEl.textContent = resolvedMember.staff_code || formatStaffCode(resolvedMember.id);
    if (badgeCodeEl) badgeCodeEl.textContent = resolvedMember.badge_code || `REW-BADGE-${String(resolvedMember.id).padStart(4, '0')}`;
    if (roleEl) roleEl.textContent = `${resolvedMember.role_display || 'Staff'} · ${resolvedMember.department || 'General'}`;
    if (contactEl) contactEl.textContent = resolvedMember.phone ? `${resolvedMember.phone}${resolvedMember.username ? ` · @${resolvedMember.username}` : ''}` : (resolvedMember.username ? `@${resolvedMember.username}` : 'No phone registered');

    // Metrics Tiles
    const actionValEl = document.getElementById('tl-modal-action-val');
    const actionSubEl = document.getElementById('tl-modal-action-sub');
    const facValEl = document.getElementById('tl-modal-facility-val');
    const facSubEl = document.getElementById('tl-modal-facility-sub');
    const puncValEl = document.getElementById('tl-modal-punctuality-val');
    const puncSubEl = document.getElementById('tl-modal-punctuality-sub');
    const dwellValEl = document.getElementById('tl-modal-dwell-val');
    const dwellSubEl = document.getElementById('tl-modal-dwell-sub');

    const isCheckOut = tlItem.scan_action === 'check_out';
    if (actionValEl) actionValEl.textContent = isDenied ? 'Access Denied' : (isCheckOut ? 'Checked Out (Exit)' : 'Checked In (Admitted)');
    if (actionSubEl) actionSubEl.textContent = isDenied ? 'Security Restriction Active' : (isCheckOut ? 'Outbound Gate Departure' : 'Inbound Terminal Scan');

    if (facValEl) facValEl.textContent = tlItem.checkpoint_name;
    if (facSubEl) facSubEl.textContent = tlItem.checkpoint_type === 'stock_warehouse' ? '🏭 Stock Warehouse Gate' : '🏟️ Event Venue Gate';

    // Punctuality & Call Time
    const callTimeStr = state.activeCheckpoint?.call_time || '08:00';
    if (puncValEl) {
      if (isDenied) {
        puncValEl.textContent = 'Restricted / Denied';
      } else if (tlItem.punctuality_status === 'late') {
        puncValEl.textContent = 'Cutoff Exceeded (Late)';
      } else if (tlItem.punctuality_status === 'early') {
        puncValEl.textContent = 'Early Arrival';
      } else {
        puncValEl.textContent = 'On-Time (Within Grace)';
      }
    }
    if (puncSubEl) {
      const scanTimeOnly = tlItem.formatted_time?.split('•')[1]?.trim() || '';
      puncSubEl.textContent = `Shift Call-Time: ${callTimeStr}${scanTimeOnly ? ` · Scan: ${scanTimeOnly}` : ''}`;
    }

    // Dwell Time calculation
    const inTime = tlItem.in_pill || resolvedMember.check_in_time;
    const outTime = tlItem.out_pill || resolvedMember.check_out_time;
    if (dwellValEl) {
      if (inTime && outTime) {
        dwellValEl.textContent = `Session Recorded`;
      } else if (inTime) {
        dwellValEl.textContent = `Currently On-Site`;
      } else {
        dwellValEl.textContent = `Off-Site`;
      }
    }
    if (dwellSubEl) {
      dwellSubEl.textContent = `${inTime || 'In: --'} ➔ ${outTime || (inTime ? 'Active On-Site' : 'Out: --')}`;
    }

    // Policy Box
    const policyBox = document.getElementById('tl-modal-policy-box');
    const policyIcon = document.getElementById('tl-modal-policy-icon');
    const policyHeading = document.getElementById('tl-modal-policy-heading');
    const policyDesc = document.getElementById('tl-modal-policy-desc');

    if (policyBox && policyIcon && policyHeading && policyDesc) {
      if (isDenied) {
        policyBox.className = 'audit-policy-box denied';
        policyIcon.textContent = '✕';
        policyHeading.textContent = 'Access Restricted by Clearance Policy';
        policyDesc.textContent = tlItem.denial_reason || tlItem.notes || `Access to ${tlItem.checkpoint_name} denied. Tier ${resolvedMember.clearance_code} does not meet requirements.`;
      } else {
        policyBox.className = 'audit-policy-box granted';
        policyIcon.textContent = '✓';
        policyHeading.textContent = `Authorized by ${resolvedMember.clearance_code} Policy (${resolvedMember.clearance_title || 'Technical & Stage'})`;
        policyDesc.textContent = tlItem.notes || `Personnel badge ${resolvedMember.badge_code} successfully verified for ${tlItem.checkpoint_name}. Entry permitted.`;
      }
    }

    // Transit Section
    const transitSec = document.getElementById('tl-modal-transit-section');
    const transitRouteEl = document.getElementById('tl-modal-transit-route');
    const isTransit = Boolean(tlItem.is_transit || (tlItem.notes && (tlItem.notes.includes('Transit') || tlItem.notes.includes('Transferred'))));
    if (transitSec) {
      transitSec.style.display = isTransit ? 'block' : 'none';
      if (transitRouteEl && isTransit) {
        transitRouteEl.textContent = `${tlItem.checkpoint_name} ➔ Kigali Convention Centre`;
      }
    }

    // User's Gate History Today
    const historyList = document.getElementById('tl-modal-history-list');
    const historyCount = document.getElementById('tl-modal-history-count');
    if (historyList) {
      const userLogs = (state.activityTimeline || []).filter((t) => Number(t.user_id) === Number(resolvedMember.id));
      if (historyCount) historyCount.textContent = `${userLogs.length} scan${userLogs.length === 1 ? '' : 's'} recorded today`;

      if (userLogs.length === 0) {
        historyList.innerHTML = `<div style="padding: 12px; font-size: 11px; color: var(--text-secondary); text-align: center;">No other gate scans recorded today for this personnel.</div>`;
      } else {
        historyList.innerHTML = userLogs.map((log) => {
          const isLogDenied = log.access_status === 'denied';
          const isThisLog = Number(log.id) === Number(tlItem.id);
          const rawTime = log.formatted_time?.split('•')[1]?.trim() || log.formatted_time;
          return `
            <div class="audit-history-row ${isThisLog ? 'current-active-log' : ''}" data-log-id="${log.id}" style="cursor: pointer;" title="Click to view details for this ${escapeHtml(log.checkpoint_name)} record">
              <div class="audit-history-time">
                <strong>${escapeHtml(rawTime)}</strong>
                <span>${escapeHtml(log.checkpoint_name)}</span>
              </div>
              <div class="audit-history-desc">
                <span class="audit-history-action">${escapeHtml(log.action_title)}</span>
                ${log.notes ? `<span class="audit-history-note">${escapeHtml(log.notes)}</span>` : ''}
              </div>
              <div class="audit-history-status">
                <span class="status-badge ${isLogDenied ? 'status-badge-red-sm' : 'status-badge-green-sm'}">
                  ${isLogDenied ? 'Denied' : (log.scan_action === 'check_out' ? 'Checked Out' : 'Checked In')}
                </span>
                ${isThisLog ? `<span class="current-log-tag">Active Record</span>` : ''}
              </div>
            </div>
          `;
        }).join('');

        // Wire click on any history row to switch the inspected record seamlessly
        historyList.querySelectorAll('.audit-history-row').forEach((row) => {
          row.addEventListener('click', () => {
            const logId = Number(row.getAttribute('data-log-id'));
            const targetLog = userLogs.find((l) => Number(l.id) === logId);
            if (targetLog) {
              openTimelineDetailModal(targetLog, resolvedMember);
            }
          });
        });
      }
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeTimelineDetailModal() {
    const modal = document.getElementById('timeline-detail-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function renderSearchSuggestions(query) {
    const suggestEl = document.getElementById('directory-search-suggest');
    if (!suggestEl) return;

    const q = (query || '').trim().toLowerCase();
    if (!q) {
      suggestEl.style.display = 'none';
      suggestEl.innerHTML = '';
      return;
    }

    const matches = (state.crew || []).filter((c) => {
      const name = (c.full_name || '').toLowerCase();
      const badge = (c.badge_code || '').toLowerCase();
      const staffCode = (c.staff_code || '').toLowerCase();
      const username = (c.username || '').toLowerCase();
      const dept = (c.department || '').toLowerCase();
      const role = (c.role_display || '').toLowerCase();
      return name.includes(q) || badge.includes(q) || staffCode.includes(q) || username.includes(q) || dept.includes(q) || role.includes(q);
    }).slice(0, 5);

    if (matches.length === 0) {
      suggestEl.style.display = 'block';
      suggestEl.innerHTML = `
        <div class="search-suggest-empty">
          No matching crew members for "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
      return;
    }

    suggestEl.style.display = 'block';
    suggestEl.innerHTML = matches.map((m) => `
      <div class="search-suggest-item js-suggest-kiosk-item" data-crew-id="${m.id}">
        <div class="suggest-left">
          <div class="avatar-circle avatar-jl" style="width: 28px; height: 28px; font-size: 11px;">${escapeHtml(m.initials || 'CR')}</div>
          <div class="suggest-identity">
            <span class="suggest-name">${escapeHtml(m.full_name)}</span>
            <span class="suggest-sub">@${escapeHtml(m.username)} · ${escapeHtml(m.badge_code)}</span>
          </div>
        </div>
        <div class="suggest-right">
          <span class="tier-pill-soft ${escapeHtml(m.clearance_code)}" style="font-size: 10px; padding: 2px 7px;">
            <span class="tier-code-badge tier-code-${escapeHtml(m.clearance_code)}">${escapeHtml(m.clearance_code)}</span>
            <span>${escapeHtml(m.clearance_short)}</span>
          </span>
          <span class="suggest-open-pill">Open Kiosk ↗</span>
        </div>
      </div>
    `).join('');
  }

  function populateClearanceDropdowns() {
    const userClrSelect = document.getElementById('user-modal-clearance');
    const roleClrSelect = document.getElementById('role-modal-tier-select');
    if (!state.clearanceMatrix || state.clearanceMatrix.length === 0) return;

    if (userClrSelect) {
      const currentVal = userClrSelect.value;
      userClrSelect.innerHTML = state.clearanceMatrix
        .map(
          (m) =>
            `<option value="${escapeHtml(m.key || m.level_key)}">${escapeHtml(m.code)} — ${escapeHtml(m.title)} (${escapeHtml(m.short || m.short_name || '')})</option>`
        )
        .join('');
      if (currentVal && Array.from(userClrSelect.options).some((o) => o.value === currentVal)) {
        userClrSelect.value = currentVal;
      }
    }

    if (roleClrSelect) {
      const currentVal = roleClrSelect.value;
      roleClrSelect.innerHTML = state.clearanceMatrix
        .map(
          (m) =>
            `<option value="${escapeHtml(m.key || m.level_key)}">${escapeHtml(m.code)} — ${escapeHtml(m.title)}</option>`
        )
        .join('');
      if (currentVal && Array.from(roleClrSelect.options).some((o) => o.value === currentVal)) {
        roleClrSelect.value = currentVal;
      }
    }
  }

  function openTierCrudModal(tier = null) {
    const modal = document.getElementById('tier-crud-modal');
    if (!modal) return;

    const titleEl = document.getElementById('tier-crud-modal-title');
    const idInput = document.getElementById('tier-crud-id');
    const isSystemInput = document.getElementById('tier-crud-is-system');
    const typeSelect = document.getElementById('tier-crud-tier-type');
    const codeInput = document.getElementById('tier-crud-code');
    const keyInput = document.getElementById('tier-crud-key');
    const titleInput = document.getElementById('tier-crud-title');
    const shortInput = document.getElementById('tier-crud-short');
    const venueSelect = document.getElementById('tier-crud-venue-rule');
    const stockSelect = document.getElementById('tier-crud-stock-rule');
    const colorInput = document.getElementById('tier-crud-color');
    const colorTextInput = document.getElementById('tier-crud-color-text');
    const sortInput = document.getElementById('tier-crud-sort');
    const activeCheck = document.getElementById('tier-crud-active');
    const descInput = document.getElementById('tier-crud-desc');
    const systemNotice = document.getElementById('tier-crud-system-notice');

    if (tier) {
      if (titleEl) titleEl.textContent = `Edit Clearance Tier (${tier.code})`;
      if (idInput) idInput.value = tier.id || 0;
      const isSys = Number(tier.is_system) === 1;
      const isBaseCore = ['L1', 'L2', 'L3', 'L4'].includes(tier.code);

      if (typeSelect) {
        typeSelect.value = isSys ? '1' : '0';
        typeSelect.disabled = isBaseCore; // Foundational L1-L4 must stay Core
      }
      if (isSystemInput) isSystemInput.value = isSys ? '1' : '0';
      if (codeInput) {
        codeInput.value = tier.code || '';
        codeInput.readOnly = isSys;
      }
      if (keyInput) {
        keyInput.value = tier.key || tier.level_key || '';
        keyInput.readOnly = isSys;
      }
      if (titleInput) titleInput.value = tier.title || '';
      if (shortInput) shortInput.value = tier.short_name || tier.short || tier.title || '';
      if (venueSelect) venueSelect.value = (tier.venue_rule || tier.venue_Rule || 'YES').toUpperCase();
      if (stockSelect) stockSelect.value = (tier.stock_rule || 'NO').toUpperCase();
      const col = tier.color || '#2563eb';
      if (colorInput) colorInput.value = col;
      if (colorTextInput) colorTextInput.value = col;
      if (sortInput) sortInput.value = tier.sort_order || (tier.id || 5);
      if (activeCheck) activeCheck.checked = tier.is_active !== 0;
      if (descInput) descInput.value = tier.description || '';
      if (systemNotice) {
        systemNotice.style.display = isSys ? 'block' : 'none';
        systemNotice.innerHTML = isBaseCore
          ? '🔒 <strong>Foundational Core Tier (L1–L4):</strong> Code and unique key are locked to preserve gate checkpoint rules. You can safely configure Title, Rules, Description, and Theme Color.'
          : '🔒 <strong>Core Tier:</strong> Designated as system-critical and protected from deletion.';
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Clearance Tier';
      if (idInput) idInput.value = 0;
      if (typeSelect) {
        typeSelect.value = '0'; // Defaults to 2. Standard Tier
        typeSelect.disabled = false;
      }
      if (isSystemInput) isSystemInput.value = '0';
      const nextIdx = (state.clearanceMatrix ? state.clearanceMatrix.length : 4) + 1;
      const nextCode = `L${nextIdx}`;
      if (codeInput) {
        codeInput.value = nextCode;
        codeInput.readOnly = false;
      }
      if (keyInput) {
        keyInput.value = `${nextCode}_SPECIALIZED_OPS`;
        keyInput.readOnly = false;
      }
      if (titleInput) titleInput.value = `Level ${nextIdx} — Specialized Operations`;
      if (shortInput) shortInput.value = 'Specialized Operations';
      if (venueSelect) venueSelect.value = 'YES';
      if (stockSelect) stockSelect.value = 'YES';
      if (colorInput) colorInput.value = '#8b5cf6';
      if (colorTextInput) colorTextInput.value = '#8b5cf6';
      if (sortInput) sortInput.value = nextIdx;
      if (activeCheck) activeCheck.checked = true;
      if (descInput) descInput.value = '';
      if (systemNotice) systemNotice.style.display = 'none';
    }

    modal.classList.add('open');
  }

  function closeTierCrudModal() {
    const modal = document.getElementById('tier-crud-modal');
    if (modal) modal.classList.remove('open');
  }

  function openCallTimeModal(targetCpType = null, targetCpId = null, targetCpName = null, currentTime = null) {
    const modal = document.getElementById('call-time-modal');
    if (!modal) return;

    const selectEl = document.getElementById('call-time-cp-select');
    const titleEl = document.getElementById('call-time-modal-target-name');
    const typeBadge = document.getElementById('call-time-modal-type');
    const typeInput = document.getElementById('call-time-cp-type');
    const idInput = document.getElementById('call-time-cp-id');
    const timeInput = document.getElementById('call-time-input');

    const defaultCp = state.activeCheckpoint;
    const resolvedType = targetCpType || defaultCp.type;
    const resolvedId = targetCpId != null ? String(targetCpId) : String(defaultCp.id);

    // Populate dropdown with all Event Venues & Stock Warehouses
    if (selectEl) {
      const allCps = state.checkpoints.directory || [];
      const venues = allCps.filter((c) => c.type === 'event_venue');
      const stocks = allCps.filter((c) => c.type === 'stock_warehouse');

      let html = '';
      if (venues.length > 0) {
        html += `<optgroup label="Event Venues">`;
        venues.forEach((v) => {
          const val = `event_venue:${v.id}`;
          const isSel = resolvedType === 'event_venue' && String(v.id) === resolvedId;
          html += `<option value="${val}" ${isSel ? 'selected' : ''}>${escapeHtml(v.name)} (Call: ${escapeHtml(v.call_time || '08:00')})</option>`;
        });
        html += `</optgroup>`;
      }
      if (stocks.length > 0) {
        html += `<optgroup label="Stock Warehouses">`;
        stocks.forEach((s) => {
          const val = `stock_warehouse:${s.id}`;
          const isSel = resolvedType === 'stock_warehouse' && String(s.id) === resolvedId;
          html += `<option value="${val}" ${isSel ? 'selected' : ''}>${escapeHtml(s.name)} (Call: ${escapeHtml(s.call_time || '08:00')})</option>`;
        });
        html += `</optgroup>`;
      }
      selectEl.innerHTML = html;
    }

    // Function to synchronize inputs when selection changes
    function syncSelectedCheckpoint(cpType, cpId) {
      const allCps = state.checkpoints.directory || [];
      const found = allCps.find((c) => c.type === cpType && String(c.id) === String(cpId)) || defaultCp;
      if (titleEl) titleEl.textContent = found.name;
      if (typeBadge) {
        const isStock = found.type === 'stock_warehouse';
        typeBadge.textContent = isStock ? 'Stock Warehouse' : 'Event Venue';
        typeBadge.className = `status-badge ${isStock ? 'status-badge-green-sm' : 'status-badge-purple-sm'}`;
      }
      if (typeInput) typeInput.value = found.type;
      if (idInput) idInput.value = found.id;
      if (timeInput) timeInput.value = currentTime || found.call_time || '08:00';
    }

    syncSelectedCheckpoint(resolvedType, resolvedId);

    if (selectEl) {
      selectEl.onchange = () => {
        const [selType, selId] = selectEl.value.split(':');
        currentTime = null; // reset override so it loads selected checkpoint's current time
        syncSelectedCheckpoint(selType, selId);
      };
    }

    modal.classList.add('open');
  }

  function openEventAssignModal(eventId) {
    const modal = document.getElementById('event-assign-modal');
    if (!modal) return;

    const allCps = state.checkpoints.directory || [];
    const event = allCps.find((c) => String(c.raw_id || c.id) === String(eventId) && c.type === 'event_venue') ||
      (state.checkpoints.event_venues || []).find((v) => String(v.raw_id || v.id) === String(eventId));

    if (!event) {
      showToast('Event not found.');
      return;
    }

    const idInput = document.getElementById('event-assign-id');
    const nameInput = document.getElementById('event-assign-name');
    const callTimeInput = document.getElementById('event-assign-calltime');
    const techLeadSelect = document.getElementById('event-assign-techlead');
    const pmInput = document.getElementById('event-assign-pm');
    const countBadge = document.getElementById('event-assign-count-badge');
    const crewListEl = document.getElementById('event-assign-crew-list');

    if (idInput) idInput.value = event.raw_id || event.id;
    if (nameInput) nameInput.value = event.name || event.title;
    if (callTimeInput) callTimeInput.value = event.call_time || '08:00';
    if (pmInput) pmInput.value = event.project_manager || 'Operations PM';

    // Populate Tech Leads dropdown
    if (techLeadSelect) {
      const candidates = (state.crew || []).filter((c) =>
        ['admin', 'manager', 'tech_lead', 'sound_engineer', 'stage_manager', 'rigging_lead'].includes((c.role || '').toLowerCase()) ||
        ['Audio', 'Production', 'Executive'].includes(c.department || '')
      );
      techLeadSelect.innerHTML = candidates.map((c) => {
        const isSel = (event.tech_lead && event.tech_lead.toLowerCase() === (c.full_name || '').toLowerCase()) ||
          (c.role === 'tech_lead');
        return `<option value="${escapeHtml(c.full_name)}" ${isSel ? 'selected' : ''}>${escapeHtml(c.full_name)} (${escapeHtml(c.role_display || c.role)} · ${escapeHtml(c.department || '')})</option>`;
      }).join('');
    }

    let currentAssigned = Array.isArray(event.assigned_technicians)
      ? event.assigned_technicians.map(Number)
      : [];

    function renderAssignCrewList(searchQuery = '') {
      if (!crewListEl) return;
      const q = searchQuery.toLowerCase().trim();
      const techCrew = (state.crew || []).filter((c) => {
        if (q) {
          const hay = `${c.full_name} ${c.role} ${c.department} ${c.badge_code}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      const checkedCount = crewListEl.querySelectorAll('.js-assign-tech-check:checked').length || currentAssigned.length;
      if (countBadge) countBadge.textContent = `${checkedCount} Assigned`;

      crewListEl.innerHTML = techCrew.map((c) => {
        const isAssigned = currentAssigned.includes(Number(c.id));
        const isOnSite = c.daily_state === 'checked_in';
        return `
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 6px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); cursor: pointer; user-select: none;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" class="js-assign-tech-check" value="${c.id}" ${isAssigned ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px;" />
              <div>
                <strong style="font-size: 12px; color: var(--text-primary);">${escapeHtml(c.full_name)}</strong>
                <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">(${escapeHtml(c.badge_code || '')})</span>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                  <span>${escapeHtml(c.role_display || c.role)}</span> · <span>${escapeHtml(c.department || 'Production')}</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="status-badge" style="background: rgba(37, 99, 235, 0.1); color: #2563eb; font-size: 10px;">${escapeHtml(c.clearance_code || 'L2')}</span>
              ${isOnSite ? '<span class="status-badge status-badge-green-sm" style="font-size: 10px;">On-Site</span>' : ''}
            </div>
          </label>
        `;
      }).join('');

      crewListEl.querySelectorAll('.js-assign-tech-check').forEach((cb) => {
        cb.addEventListener('change', () => {
          const totalChecked = crewListEl.querySelectorAll('.js-assign-tech-check:checked').length;
          if (countBadge) countBadge.textContent = `${totalChecked} Assigned`;
        });
      });
    }

    renderAssignCrewList();

    const searchInput = document.getElementById('event-assign-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.oninput = () => renderAssignCrewList(searchInput.value);
    }

    modal.classList.add('open');
  }

  function closeEventAssignModal() {
    const modal = document.getElementById('event-assign-modal');
    if (modal) modal.classList.remove('open');
  }

  // =========================================================================
  // STOCKS & WAREHOUSES CRUD MANAGER
  // =========================================================================

  async function loadStockManagerData() {
    try {
      const res = await fetch('api.php?action=list_stock_manager');
      const data = await res.json();
      if (!data || !data.ok) return;

      state.stockManager.warehouses = Array.isArray(data.warehouses) ? data.warehouses : [];
      state.stockManager.stats = data.stats || {
        total_warehouses: state.stockManager.warehouses.length,
      };

      // Update sidebar badge
      const sideBadge = document.getElementById('sidebar-stock-count');
      if (sideBadge) {
        const whCount = String(state.stockManager.stats.total_warehouses || 0).padStart(2, '0');
        sideBadge.textContent = whCount;
      }

      // Update top KPI card if present
      const elWh = document.getElementById('sm-stat-warehouses');
      if (elWh) elWh.textContent = state.stockManager.stats.total_warehouses;

      renderStockManager();
    } catch (err) {
      console.error('Failed to load stock manager data:', err);
    }
  }

  /**
   * Computes inclusive calendar day duration between two YYYY-MM-DD dates in UTC (DST-safe).
   */
  function computeEventDuration(startStr, endStr) {
    const s = String(startStr || '').trim();
    const e = String(endStr || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return { days: 1, label: '1 day', valid: false };
    }
    const effEnd = /^\d{4}-\d{2}-\d{2}$/.test(e) ? e : s;
    const [sy, sm, sd] = s.split('-').map(Number);
    const [ey, em, ed] = effEnd.split('-').map(Number);
    const utcStart = Date.UTC(sy, sm - 1, sd);
    const utcEnd = Date.UTC(ey, em - 1, ed);
    if (utcEnd < utcStart) {
      return { days: 0, label: 'Invalid dates', valid: false };
    }
    const days = Math.max(1, Math.round((utcEnd - utcStart) / 86400000) + 1);
    return {
      days,
      label: days === 1 ? '1 day' : `${days} days`,
      valid: true,
    };
  }

  /**
   * Checks whether a user holds the system-assigned Tech Lead role (from state.roles / user.role).
   */
  function isUserAssignedTechLeadRole(u) {
    if (!u || Number(u.is_active ?? 1) === 0) return false;
    const techLeadRoleKeys = new Set(['tech_lead', 'technical_lead']);
    (state.roles || []).forEach((r) => {
      const rKey = String(r?.role_key || '').trim().toLowerCase();
      const rTitle = String(r?.title || '').trim().toLowerCase();
      if (rKey === 'tech_lead' || rKey === 'technical_lead' || rTitle.includes('tech lead') || rTitle.includes('technical lead')) {
        techLeadRoleKeys.add(rKey);
      }
    });
    const userRole = String(u.role || '').trim().toLowerCase();
    const userRoleDisplay = String(u.role_display || '').trim().toLowerCase();
    return techLeadRoleKeys.has(userRole) || userRoleDisplay === 'tech lead' || userRoleDisplay === 'technical lead';
  }

  /**
   * Populates a Technical Lead (strict system role filter) or Project Manager / Event Coordinator `<select>`.
   */
  function populateLeadershipSelect(selectEl, currentVal = '', mode = 'pm') {
    if (!selectEl) return;
    const isPm = mode === 'pm';
    const isCoord = mode === 'coordinator';
    const isTechLeadMode = mode === 'techlead';
    const placeholder = isCoord
      ? '-- Select Event Coordinator --'
      : (isPm ? '-- Select Project Manager --' : '-- Select Event Tech Lead --');

    const crewList = (state.crew || []).filter((u) => u && (u.full_name || u.username));
    const targetLower = String(currentVal || '').trim().toLowerCase();
    let matched = false;
    const buildOpt = (u) => {
      const name = String(u.full_name || u.username || '').trim();
      const roleLabel = u.role_display || u.role || 'Staff';
      const isSel = targetLower !== '' && name.toLowerCase() === targetLower;
      if (isSel) matched = true;
      return `<option value="${escapeHtml(name)}" ${isSel ? 'selected' : ''}>${escapeHtml(name)} (${escapeHtml(roleLabel)})</option>`;
    };

    if (isTechLeadMode) {
      const roleFiltered = crewList.filter((u) => isUserAssignedTechLeadRole(u));
      let html = `<option value="">${placeholder}</option>`;
      if (roleFiltered.length > 0) {
        html += `<optgroup label="System-Assigned Tech Leads">${roleFiltered.map(buildOpt).join('')}</optgroup>`;
      } else {
        html += '<option value="" disabled>-- No active users assigned the Tech Lead role --</option>';
      }
      if (currentVal && !matched) {
        html += `<option value="${escapeHtml(currentVal)}" selected>${escapeHtml(currentVal)} (Current)</option>`;
      }
      selectEl.innerHTML = html;
      return;
    }

    const preferredRoles = new Set(['project_manager', 'event_coordinator', 'manager', 'admin', 'administrator']);
    const preferredDepts = new Set(['operations', 'executive', 'production']);

    const preferred = [];
    const others = [];
    crewList.forEach((u) => {
      const role = String(u.role || '').toLowerCase();
      const dept = String(u.department || '').toLowerCase();
      if (preferredRoles.has(role) || preferredDepts.has(dept)) {
        preferred.push(u);
      } else {
        others.push(u);
      }
    });

    let html = `<option value="">${placeholder}</option>`;
    if (preferred.length > 0) {
      html += `<optgroup label="${isCoord ? 'Event Coordinators &amp; PMs' : 'Project Managers &amp; Coordinators'}">${preferred.map(buildOpt).join('')}</optgroup>`;
    }
    if (others.length > 0) {
      html += `<optgroup label="All Team Members">${others.map(buildOpt).join('')}</optgroup>`;
    }
    if (currentVal && !matched) {
      html += `<option value="${escapeHtml(currentVal)}" selected>${escapeHtml(currentVal)}</option>`;
    }
    selectEl.innerHTML = html;
  }

  function renderCardGridPagination({ footerEl, controlsEl, totalItems, currentPage, perPage, itemNoun, onPageChange }) {
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIdx = (safePage - 1) * perPage;
    const endIdx = Math.min(startIdx + perPage, totalItems);

    if (footerEl) {
      footerEl.textContent = totalItems === 0
        ? `Showing 0 ${itemNoun}s`
        : `Showing ${startIdx + 1}–${endIdx} of ${totalItems} ${totalItems === 1 ? itemNoun : itemNoun + 's'}`;
    }
    if (!controlsEl) return safePage;
    if (totalPages <= 1) {
      controlsEl.innerHTML = '';
      return safePage;
    }

    let html = `<button type="button" class="btn btn-secondary-32 js-grid-page-btn" data-page="${safePage - 1}" ${safePage <= 1 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>&larr; Prev</button>`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button type="button" class="btn ${p === safePage ? 'btn-primary-32' : 'btn-secondary-32'} js-grid-page-btn" data-page="${p}" style="min-width:32px;padding:0 8px;font-weight:600;">${p}</button>`;
    }
    html += `<button type="button" class="btn btn-secondary-32 js-grid-page-btn" data-page="${safePage + 1}" ${safePage >= totalPages ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>Next &rarr;</button>`;
    controlsEl.innerHTML = html;

    controlsEl.querySelectorAll('.js-grid-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const nextP = Number(btn.getAttribute('data-page') || 1);
        if (nextP >= 1 && nextP <= totalPages && nextP !== safePage) {
          onPageChange(nextP);
        }
      });
    });
    return safePage;
  }

  async function confirmAndDeleteEventVenue(vid, vTitle) {
    if (!canCurrentUserAssignEvents()) {
      showToast('Permission Denied: Deleting Event Venues requires Tech Lead, PM, or Administrator privileges.', 'error');
      return false;
    }
    const { confirmed } = await showConfirmModal({
      title: 'Delete Event',
      message: `Delete Event "${vTitle}"? Any crew assignments pointing to this event will be cleared.`,
      confirmText: 'Delete Event',
      tone: 'danger',
    });
    if (!confirmed) return false;
    try {
      const res = await fetch('api.php?action=delete_event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: vid }),
      });
      const data = await res.json();
      if (res.ok && data && data.ok) {
        if (String(state.selectedDispatchEventId || '') === String(vid)) {
          state.selectedDispatchEventId = '';
        }
        applyBootstrapPayload(data, true);
        renderAll();
        showToast(data.message || `Deleted Event "${vTitle}".`, 'success');
        return true;
      } else {
        showToast((data && data.error) || 'Failed to delete Event.', 'error');
        return false;
      }
    } catch (err) {
      showToast('Network error deleting Event.', 'error');
      return false;
    }
  }

  function renderStockManager() {
    const whCountNum = state.stockManager.warehouses.length;
    const evCountNum = (state.checkpoints?.event_venues || []).length;
    const hubWhCount = document.getElementById('cp-hub-count-wh');
    const hubVenCount = document.getElementById('cp-hub-count-venues');
    if (hubWhCount) hubWhCount.textContent = String(whCountNum).padStart(2, '0');
    if (hubVenCount) hubVenCount.textContent = String(evCountNum).padStart(2, '0');
    renderWarehousesGrid();
  }

  function renderWarehousesGrid() {
    const grid = document.getElementById('sm-warehouses-grid');
    if (!grid) return;

    const q = (state.stockManager.whSearch || '').toLowerCase().trim();
    const list = state.stockManager.warehouses.filter((w) => {
      if (!q) return true;
      return (
        (w.name || '').toLowerCase().includes(q) ||
        (w.code || '').toLowerCase().includes(q) ||
        (w.location || '').toLowerCase().includes(q) ||
        (w.controller_name || '').toLowerCase().includes(q)
      );
    });

    const perPage = state.stockManager.whPerPage || 5;
    state.stockManager.whPage = renderCardGridPagination({
      footerEl: document.getElementById('sm-results-footer'),
      controlsEl: document.getElementById('sm-page-controls'),
      totalItems: list.length,
      currentPage: state.stockManager.whPage || 1,
      perPage,
      itemNoun: 'facility gate',
      onPageChange: (p) => {
        state.stockManager.whPage = p;
        renderWarehousesGrid();
      },
    });

    if (list.length === 0) {
      const addEmptyBtnHtml = canCurrentUserManageWarehouses()
        ? `<button type="button" class="btn btn-primary-38 js-trigger-add-wh">
            <img src="assets/plus-white.svg" alt="" class="svg-icon" />
            <span>+ Add Facility Gate</span>
          </button>`
        : '';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: var(--bg-surface); border-radius: 8px; border: 1px dashed var(--border-color);">
          <div style="margin-bottom: 10px;"><img src="assets/warehouse-13.svg" alt="" class="svg-icon" style="width: 32px; height: 32px; opacity: 0.7;" /></div>
          <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">No Facility Gates Found</h4>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
            ${q ? `No facility gates matching "${escapeHtml(q)}"` : 'Get started by creating your first facility gate.'}
          </p>
          ${addEmptyBtnHtml}
        </div>
      `;
      return;
    }

    const startIdx = ((state.stockManager.whPage || 1) - 1) * perPage;
    const pagedList = list.slice(startIdx, startIdx + perPage);
    const canManageWh = canCurrentUserManageWarehouses();

    grid.innerHTML = pagedList
      .map((w) => {
        const whFallbackSvg = `<img src="assets/warehouse-13.svg" alt="" class="svg-icon" style="width: 34px; height: 34px; filter: brightness(0) invert(1); opacity: 0.85;" />`;
        const bannerHtml = w.image
          ? `<img src="${escapeHtml(w.image)}" alt="${escapeHtml(w.name)}" class="wh-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="wh-card-fallback-icon" style="display:none;">${whFallbackSvg}</div>`
          : `<div class="wh-card-fallback-icon">${whFallbackSvg}</div>`;

        const statusBadge = w.is_active
          ? `<span class="status-badge status-badge-green-sm">Active Operational</span>`
          : `<span class="status-badge status-badge-amber-sm">Inactive / Closed</span>`;

        const wCode = String(w.code || '').toUpperCase().trim();
        const wNameLower = String(w.name || '').toLowerCase();
        let gateHref = `gate.php?wh_id=${encodeURIComponent(w.id)}`;
        if (wCode === 'NDR-STK' || wNameLower.includes('ndera')) {
          gateHref = 'ndera-gate.php';
        } else if (wCode === 'BKA-STK' || wNameLower.includes('bk arena')) {
          gateHref = 'bk-arena-gate.php';
        } else if (wCode === 'KCC-STK' || wNameLower.includes('kcc') || wNameLower.includes('convention')) {
          gateHref = 'kcc-gate.php';
        }
        const gatePillHtml = w.is_active
          ? `<a href="${gateHref}" target="_blank" rel="noopener noreferrer" class="wh-stored-pill" style="text-decoration: none; color: #4f46e5; font-weight: 700;">Gate Terminal ↗</a>`
          : `<span class="wh-stored-pill" style="opacity: 0.65;">Gate Offline</span>`;

        return `
        <div class="wh-card">
          <div class="wh-card-banner">
            ${bannerHtml}
            <div class="wh-card-badge-top">${statusBadge}</div>
          </div>
          <div class="wh-card-body">
            <div class="wh-card-title-row">
              <h3 class="wh-card-name">${escapeHtml(w.name)}</h3>
              <span class="wh-code-badge">${escapeHtml(w.code)}</span>
            </div>
            <div class="wh-card-meta-line">
              <img src="assets/map-pin-12.svg" alt="" class="svg-icon" style="opacity: 0.6;" />
              <span>${escapeHtml(w.location)}</span>
            </div>
            <div class="wh-card-meta-line">
              <span>Hours: ${escapeHtml(w.open_time)} – ${escapeHtml(w.close_time)}</span>
            </div>
            <div class="wh-card-controller-box">
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px; display: inline-flex; align-items: center; gap: 5px;">
                <img src="assets/metric-users.svg" alt="" class="svg-icon" style="width: 13px; height: 13px; opacity: 0.7;" />
                <span>${escapeHtml(w.controller_name || 'Unassigned')}</span>
              </div>
              <div style="color: var(--text-secondary); font-size: 11px;">
                ${escapeHtml(w.controller_phone || '')} ${w.controller_email ? `· ${escapeHtml(w.controller_email)}` : ''}
              </div>
            </div>
            <div class="wh-card-footer">
              ${gatePillHtml}
              ${canManageWh ? `
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-secondary-32-sm js-edit-wh-btn" data-wh-id="${w.id}">
                  Edit
                </button>
                <button type="button" class="btn btn-secondary-32-sm js-delete-record-btn" data-del-type="warehouse" data-del-id="${w.id}" data-del-name="${escapeHtml(w.name)}" style="color: #dc2626; border-color: #fecaca;">
                  Delete
                </button>
              </div>` : ''}
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  function renderStockManagerEventsGrid() {
    const grid = document.getElementById('sm-events-grid');
    if (!grid) return;

    const allEvents = state.checkpoints?.event_venues || [];
    const q = (state.stockManager.evSearch || '').toLowerCase().trim();
    const list = allEvents.filter((ev) => {
      if (!q) return true;
      return `${ev.title || ''} ${ev.name || ''} ${ev.location || ''} ${ev.tech_lead || ''} ${ev.project_manager || ''} ${ev.date || ''}`.toLowerCase().includes(q);
    });

    const perPage = state.stockManager.evPerPage || 5;
    state.stockManager.evPage = renderCardGridPagination({
      footerEl: document.getElementById('sm-results-footer'),
      controlsEl: document.getElementById('sm-page-controls'),
      totalItems: list.length,
      currentPage: state.stockManager.evPage || 1,
      perPage,
      itemNoun: 'event venue',
      onPageChange: (p) => {
        state.stockManager.evPage = p;
        renderStockManagerEventsGrid();
      },
    });

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: var(--bg-surface); border-radius: 8px; border: 1px dashed var(--border-color);">
          <div style="margin-bottom: 10px;"><img src="assets/metric-calendar-clock.svg" alt="" class="svg-icon" style="width: 32px; height: 32px; opacity: 0.7;" /></div>
          <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">No Event Venues Found</h4>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
            ${q ? `No events matching "${escapeHtml(q)}"` : 'Get started by adding your first Event Venue.'}
          </p>
          <button type="button" class="btn btn-primary-38 js-trigger-add-ev">
            <img src="assets/plus-white.svg" alt="" class="svg-icon" />
            <span>+ Add Event Venue</span>
          </button>
        </div>
      `;
      return;
    }

    const startIdx = ((state.stockManager.evPage || 1) - 1) * perPage;
    const pagedList = list.slice(startIdx, startIdx + perPage);
    const canManage = canCurrentUserAssignEvents();

    grid.innerHTML = pagedList.map((ev) => {
      const venueIdAttr = escapeHtml(String(ev.raw_id || ev.id));
      const onsiteCount = Number(ev.on_site_now || 0);
      const statusBadge = onsiteCount > 0
        ? `<span class="status-badge status-badge-green-sm">${onsiteCount} On-Site</span>`
        : `<span class="status-badge status-badge-purple-sm">Event Gate</span>`;
      const crudBtns = canManage
        ? `<button type="button" class="btn btn-secondary-32-sm js-vs-edit-venue" data-venue-id="${venueIdAttr}">Edit</button>
           <button type="button" class="btn btn-secondary-32-sm js-vs-delete-venue" data-venue-id="${venueIdAttr}" data-venue-title="${escapeHtml(ev.title || ev.name)}" style="color: #dc2626; border-color: #fecaca;">Delete</button>`
        : '';

      const evFallbackSvg = `<img src="assets/metric-calendar-clock.svg" alt="" class="svg-icon" style="width: 36px; height: 36px; filter: brightness(0) invert(1); opacity: 0.9;" />`;
      const bannerHtml = ev.image
        ? `<img src="${escapeHtml(ev.image)}" alt="${escapeHtml(ev.title || ev.name)}" class="wh-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="wh-card-fallback-icon" style="display:none;">${evFallbackSvg}</div>`
        : `<div class="wh-card-fallback-icon">${evFallbackSvg}</div>`;

      return `
        <div class="wh-card">
          <div class="wh-card-banner" style="background: linear-gradient(135deg, #312e81, #4f46e5);">
            ${bannerHtml}
            <div class="wh-card-badge-top">${statusBadge}</div>
          </div>
          <div class="wh-card-body">
            <div class="wh-card-title-row">
              <h3 class="wh-card-name">${escapeHtml(ev.title || ev.name)}</h3>
              <span class="wh-code-badge">EV-${escapeHtml(String(ev.raw_id || ev.id))}</span>
            </div>
            <div class="wh-card-meta-line">
              <img src="assets/map-pin-12.svg" alt="" class="svg-icon" style="opacity: 0.6;" />
              <span>${escapeHtml(ev.location || 'Kigali Event Venue')}</span>
            </div>
            <div class="wh-card-meta-line">
              <span>${ev.date ? `${escapeHtml(ev.date)} · ` : ''}Call: ${escapeHtml(ev.call_time || '08:00')} CAT</span>
            </div>
            <div class="wh-card-controller-box">
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px; display: inline-flex; align-items: center; gap: 5px;">
                <img src="assets/metric-users.svg" alt="" class="svg-icon" style="width: 13px; height: 13px; opacity: 0.7;" />
                <span>TL: ${escapeHtml(ev.tech_lead || ev.lead_name || 'Unassigned')}</span>
              </div>
              <div style="color: var(--text-secondary); font-size: 11px;">
                PM: ${escapeHtml(ev.project_manager || 'Unassigned')}
              </div>
            </div>
            <div class="wh-card-footer">
              <span class="wh-stored-pill">${Number(ev.assigned_count || 0)} crew</span>
              <div style="display: flex; gap: 6px;">
                ${crudBtns}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function getPaginationPageNumbers(currentPage, totalPages) {
    if (totalPages <= 7) {
      const pages = [];
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }

  function openWarehouseModal(warehouseId = null) {
    if (!canCurrentUserManageWarehouses()) {
      showToast('Permission Denied: Facility Gate CRUD requires Site Manager, Operations Manager, or Administrator privileges.');
      return;
    }
    const modal = document.getElementById('warehouse-crud-modal');
    if (!modal) return;
    const form = document.getElementById('warehouse-crud-form');
    if (form) form.reset();

    const titleEl = document.getElementById('wh-modal-title');
    const idInput = document.getElementById('wh-modal-id');
    const nameInput = document.getElementById('wh-modal-name');
    const codeInput = document.getElementById('wh-modal-code');
    const statusSelect = document.getElementById('wh-modal-status');
    const locInput = document.getElementById('wh-modal-location');
    const openTimeInput = document.getElementById('wh-modal-opentime');
    const closeTimeInput = document.getElementById('wh-modal-closetime');
    const ctrlInput = document.getElementById('wh-modal-controller');
    const phoneInput = document.getElementById('wh-modal-phone');
    const pinInput = document.getElementById('wh-modal-pin');
    const radInput = document.getElementById('wh-modal-radius');
    const latInput = document.getElementById('wh-modal-lat');
    const lngInput = document.getElementById('wh-modal-lng');

    // Reset dropzone
    resetDropzone('wh');

    if (warehouseId) {
      const wh = state.stockManager.warehouses.find((w) => Number(w.id) === Number(warehouseId));
      if (wh) {
        if (titleEl) titleEl.textContent = 'Edit Warehouse Facility';
        if (idInput) idInput.value = wh.id;
        if (nameInput) nameInput.value = wh.name || '';
        if (codeInput) codeInput.value = wh.code || '';
        if (statusSelect) statusSelect.value = String(wh.is_active ?? 1);
        if (locInput) locInput.value = wh.location || '';
        if (openTimeInput) openTimeInput.value = (wh.open_time || '08:00').slice(0, 5);
        if (closeTimeInput) closeTimeInput.value = (wh.close_time || '18:00').slice(0, 5);
        if (ctrlInput) ctrlInput.value = wh.controller_name || '';
        if (phoneInput) phoneInput.value = wh.controller_phone || '';
        if (pinInput) pinInput.value = resolveWarehousePinClient(wh);
        if (radInput) radInput.value = String(wh.geofence_radius_m || 200);
        if (latInput) latInput.value = wh.lat !== null && wh.lat !== undefined ? String(wh.lat) : '';
        if (lngInput) lngInput.value = wh.lng !== null && wh.lng !== undefined ? String(wh.lng) : '';

        if (wh.image) {
          setDropzonePreview('wh', wh.image, wh.image.split('/').pop());
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Warehouse';
      if (idInput) idInput.value = '0';
      if (radInput) radInput.value = '200';
      if (latInput) latInput.value = '';
      if (lngInput) lngInput.value = '';
      if (openTimeInput) openTimeInput.value = '08:00';
      if (closeTimeInput) closeTimeInput.value = '18:00';
      if (ctrlInput) {
        const defaultCtrl = (state.crew || []).find((c) => String(c.role || '').toLowerCase() === 'stock_controller');
        ctrlInput.value = defaultCtrl ? defaultCtrl.full_name : '';
      }
      if (pinInput) pinInput.value = '';
    }

    modal.classList.add('open');
  }

  function populateUserAssignedCpDropdown() {
    const sel = document.getElementById('user-modal-assigned-cp');
    if (!sel) return;
    const whs = state.checkpoints.stock_warehouses || [];
    const evs = state.checkpoints.event_venues || [];
    const opts = ['<option value="">-- Unassigned (Requires Approval Request) --</option>'];
    if (whs.length > 0) {
      opts.push('<optgroup label="Facility Gates">');
      whs.forEach((w) => {
        opts.push(`<option value="stock_warehouse:${escapeHtml(String(w.id))}">${escapeHtml(w.name)}</option>`);
      });
      opts.push('</optgroup>');
    }
    if (evs.length > 0) {
      opts.push('<optgroup label="Event Venues">');
      evs.forEach((v) => {
        opts.push(`<option value="event_venue:${escapeHtml(String(v.id))}">${escapeHtml(v.name)}</option>`);
      });
      opts.push('</optgroup>');
    }
    sel.innerHTML = opts.join('');
  }

  function syncUserAssignedCpVisibility() {
    const roleVal = (document.getElementById('user-modal-role')?.value || '').toLowerCase();
    const wrap = document.getElementById('user-modal-assigned-cp-wrap');
    if (!wrap) return;
    wrap.style.display = roleVal === 'stock_controller' ? 'block' : 'none';
  }

  function openUserModal(userId = null) {
    const isStockCtrl = isCurrentUserStockController();
    if (isStockCtrl) {
      showToast('Access Restricted: Gate Controllers are assigned exclusively to gate terminal scanning and cannot create or modify personnel accounts.');
      return;
    }

    populateClearanceDropdowns();
    populateUserAssignedCpDropdown();
    const modal = document.getElementById('user-crud-modal');
    if (!modal) return;
    const form = document.getElementById('user-crud-form');
    if (form) form.reset();

    const titleEl = document.getElementById('user-modal-title');
    const idInput = document.getElementById('user-modal-id');
    const nameInput = document.getElementById('user-modal-fullname');
    const userInput = document.getElementById('user-modal-username');
    const roleSelect = document.getElementById('user-modal-role');
    const deptSelect = document.getElementById('user-modal-dept');
    const phoneInput = document.getElementById('user-modal-phone');
    const emailInput = document.getElementById('user-modal-email');
    const clearanceSelect = document.getElementById('user-modal-clearance');
    const stockAccessSelect = document.getElementById('user-modal-stock-access');
    const venueAccessSelect = document.getElementById('user-modal-venue-access');
    const badgeCodeInput = document.getElementById('user-modal-badge-code');
    const rfidInput = document.getElementById('user-modal-rfid-uid');
    const badgeStatusSelect = document.getElementById('user-modal-badge-status');
    const activeCheck = document.getElementById('user-modal-active');

    const isAdmin = isCurrentUserAdmin();
    const isTech = (state.currentUser?.role || '').toLowerCase() === 'tech_lead' && !isAdmin;
    const isStockMgr = (state.currentUser?.role || '').toLowerCase() === 'stock_manager' && !isAdmin;

    const noticeEl = document.getElementById('user-modal-delegation-notice');
    if (noticeEl) {
      if (isAdmin) {
        noticeEl.style.display = 'block';
        noticeEl.style.background = 'rgba(16, 185, 129, 0.08)';
        noticeEl.style.border = '1px solid rgba(16, 185, 129, 0.25)';
        noticeEl.style.color = '#065f46';
        noticeEl.innerHTML = '<strong>👑 Administrator Delegation:</strong> Full system access enabled. Authorized to grant any Clearance Tier (L1–L8) and assign all roles.';
      } else if (isStockMgr) {
        noticeEl.style.display = 'block';
        noticeEl.style.background = 'rgba(217, 119, 6, 0.08)';
        noticeEl.style.border = '1px solid rgba(217, 119, 6, 0.25)';
        noticeEl.style.color = '#92400e';
        noticeEl.innerHTML = '<strong>🏢 Site Manager Delegation Active:</strong> You are authorized to onboard facility crew (<strong>L1/L2</strong>) and manage Gate Controllers (<strong>L3</strong>). Higher executive tiers (L4+) require Administrator clearance.';
      } else if (isTech) {
        noticeEl.style.display = 'block';
        noticeEl.style.background = 'rgba(37, 99, 235, 0.08)';
        noticeEl.style.border = '1px solid rgba(37, 99, 235, 0.25)';
        noticeEl.style.color = '#1e40af';
        noticeEl.innerHTML = '<strong>🎛️ Tech Lead Delegation Active:</strong> You are authorized to onboard technical and stage personnel with <strong>Level 1 or Level 2</strong> clearance. Higher security tiers (L3–L8) and administrative roles require Administrator clearance.';
      } else {
        noticeEl.style.display = 'none';
      }
    }

    const hintEl = document.getElementById('user-modal-clearance-hint');
    if (hintEl) {
      hintEl.style.display = (!isAdmin && (isStockMgr || isTech)) ? 'flex' : 'none';
    }

    // Role select filter
    if (roleSelect) {
      Array.from(roleSelect.options).forEach((opt) => {
        const val = opt.value.toLowerCase();
        const restrictedForStock = ['admin', 'administrator', 'manager', 'project_manager', 'tech_lead', 'stock_manager'];
        const restrictedForTech = ['admin', 'administrator', 'manager', 'project_manager', 'stock_manager'];
        const baseText = opt.text.replace(/^\[🔒 Admin Only\]\s*/i, '');
        if (!isAdmin) {
          let shouldDisable = false;
          if (isStockMgr && restrictedForStock.includes(val)) shouldDisable = true;
          if (isTech && restrictedForTech.includes(val)) shouldDisable = true;
          if (!isStockMgr && !isTech) shouldDisable = true;

          if (shouldDisable) {
            opt.disabled = true;
            opt.text = `[🔒 Admin Only] ${baseText}`;
          } else {
            opt.disabled = false;
            opt.text = baseText;
          }
        } else {
          opt.disabled = false;
          opt.text = baseText;
        }
      });
    }

    // Clearance select filter
    if (clearanceSelect) {
      Array.from(clearanceSelect.options).forEach((opt) => {
        const val = opt.value.toUpperCase();
        // Permitted under delegation: L1 and L2 (plus L3 for Site Managers onboarding Gate Controllers)
        const isPermitted = val.startsWith('L1') || val.startsWith('L2') || (isStockMgr && val.startsWith('L3'));
        const baseText = opt.text.replace(/^\[🔒 Admin Only\]\s*/i, '');
        if (!isAdmin) {
          if (!isPermitted) {
            opt.disabled = true;
            opt.text = `[🔒 Admin Only] ${baseText}`;
          } else {
            opt.disabled = false;
            opt.text = baseText;
          }
        } else {
          opt.disabled = false;
          opt.text = baseText;
        }
      });
    }

    resetDropzone('user');

    const passInput = document.getElementById('user-modal-password');
    const passLabel = document.getElementById('user-modal-password-label');
    const assignedCpSelect = document.getElementById('user-modal-assigned-cp');

    if (userId) {
      const u = state.crew.find((c) => Number(c.id) === Number(userId));
      if (u) {
        if (titleEl) titleEl.textContent = 'Edit Personnel & Roles';
        if (idInput) idInput.value = u.id;
        if (nameInput) nameInput.value = u.full_name || '';
        if (userInput) userInput.value = u.username || '';
        if (roleSelect) roleSelect.value = u.role || 'technician';
        if (deptSelect) deptSelect.value = u.department || 'Audio';
        if (phoneInput) phoneInput.value = u.phone || '';
        if (emailInput) emailInput.value = u.email || '';
        if (clearanceSelect) clearanceSelect.value = u.clearance_level || 'L2_TECH_STAGE';
        if (stockAccessSelect) stockAccessSelect.value = u.stock_access_mode || 'assigned_only';
        if (venueAccessSelect) venueAccessSelect.value = u.venue_access_mode || 'all';
        if (badgeCodeInput) badgeCodeInput.value = u.badge_code || '';
        if (rfidInput) rfidInput.value = u.rfid_uid || '';
        if (badgeStatusSelect) badgeStatusSelect.value = u.badge_status || 'active';
        if (activeCheck) activeCheck.checked = Number(u.is_active ?? 1) === 1;
        if (assignedCpSelect) {
          assignedCpSelect.value = u.assigned_checkpoint_type && u.assigned_checkpoint_id
            ? `${u.assigned_checkpoint_type}:${u.assigned_checkpoint_id}`
            : '';
        }
        if (passInput) {
          passInput.value = '';
          passInput.required = false;
          passInput.placeholder = 'Leave blank to keep existing password';
        }
        if (passLabel) passLabel.textContent = 'Reset Password (Optional)';

        if (u.profile_image_url) {
          setDropzonePreview('user', u.profile_image_url, u.profile_image_url.split('/').pop());
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Team Member';
      if (idInput) idInput.value = '0';
      if (assignedCpSelect) assignedCpSelect.value = '';
      if (passInput) {
        passInput.value = '';
        passInput.required = true;
        passInput.placeholder = 'Set initial password (min 6 characters)';
      }
      if (passLabel) passLabel.textContent = 'Account Password *';
      if (roleSelect) {
        const firstValidRole = Array.from(roleSelect.options).find((o) => !o.disabled);
        roleSelect.value = firstValidRole ? firstValidRole.value : 'technician';
      }
      if (deptSelect) deptSelect.value = isStockMgr ? 'Warehouse' : 'Audio';
      if (clearanceSelect) {
        const firstValidClr = Array.from(clearanceSelect.options).find((o) => !o.disabled && (o.value.startsWith('L2') || o.value.startsWith('L1')));
        clearanceSelect.value = firstValidClr ? firstValidClr.value : 'L2_TECH_STAGE';
      }
      if (stockAccessSelect) stockAccessSelect.value = isStockMgr ? 'all' : 'assigned_only';
      if (venueAccessSelect) venueAccessSelect.value = 'all';
      if (badgeStatusSelect) badgeStatusSelect.value = 'active';
      if (activeCheck) activeCheck.checked = true;

      // Suggest next badge code
      const nextId = state.crew.length > 0 ? Math.max(...state.crew.map((c) => Number(c.id))) + 1 : 1;
      if (badgeCodeInput) badgeCodeInput.value = `REW-BADGE-${String(nextId).padStart(4, '0')}`;
      if (rfidInput) rfidInput.value = `RFID-88${String(nextId).padStart(2, '0')}`;
    }

    syncUserAssignedCpVisibility();
    modal.classList.add('open');
  }

  function exportUsersCsv() {
    const list = state.crew || [];
    if (list.length === 0) {
      showToast('No users available to export');
      return;
    }
    const headers = ['ID', 'Full Name', 'Username', 'Role', 'Department', 'Clearance Code', 'Clearance Title', 'Badge Code', 'RFID UID', 'Phone', 'Email', 'Status'];
    const rows = list.map((u) => [
      u.id,
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.role_display || u.role || '').replace(/"/g, '""')}"`,
      `"${(u.department || '').replace(/"/g, '""')}"`,
      `"${u.clearance_code || ''}"`,
      `"${(u.clearance_short || '').replace(/"/g, '""')}"`,
      `"${u.badge_code || ''}"`,
      `"${u.rfid_uid || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.email || ''}"`,
      u.badge_status || 'active',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ability_Crew_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Crew Roster to CSV');
  }

  
  // =========================================================================
  // ROLES MANAGEMENT CRUD LOGIC
  // =========================================================================

  function renderRolesScreen() {
    const rolesGrid = document.getElementById('roles-tier-cards-grid');
    const rowsEl = document.getElementById('roles-table-rows');

    const roles = Array.isArray(state.roles) ? state.roles : [];
    const crew = Array.isArray(state.crew) ? state.crew : [];
    const matrix = Array.isArray(state.clearanceMatrix) ? state.clearanceMatrix : [];

    // Recalculate staff counts dynamically from current crew list
    roles.forEach((r) => {
      const rKey = (r.role_key || '').toLowerCase();
      r.staff_count = crew.filter((c) => (c.role || '').toLowerCase() === rKey).length;
    });

    // 1. Render dynamic 4-Tier Roles Distribution Grid (2 rows, 4 items per row)
    if (rolesGrid) {
      if (matrix.length === 0) {
        rolesGrid.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-secondary); width: 100%;">No clearance tiers configured.</div>';
      } else {
        rolesGrid.innerHTML = matrix
          .map((m) => {
            const mCode = (m.code || '').toUpperCase();
            const matchedRoles = roles.filter((r) => {
              const rCode = (r.clearance_code || '').toUpperCase();
              return rCode === mCode || (mCode === 'L1' && rCode === 'L1') || (mCode === 'L2' && rCode === 'L2') || (mCode === 'L3' && rCode === 'L3') || (mCode === 'L4' && rCode === 'L4');
            });
            const roleCount = matchedRoles.length;
            const titleClean = (m.title || '').replace(/^Level\s*\d+\s*[—–-]\s*/i, '').trim() || m.short || m.code;

            let badgeClass = 'status-badge';
            let badgeStyle = 'font-size: 10px; font-weight: 600;';
            if (m.code === 'L1') {
              badgeStyle += ' background: #e2e8f0; color: #334155;';
            } else if (m.code === 'L2') {
              badgeClass += ' status-badge-blue-sm';
            } else if (m.code === 'L3') {
              badgeClass += ' status-badge-purple-sm';
            } else if (m.code === 'L4') {
              badgeClass += ' status-badge-green-sm';
            } else {
              const hex = (m.color || '#7c3aed').replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16) || 124;
              const g = parseInt(hex.substring(2, 4), 16) || 58;
              const b = parseInt(hex.substring(4, 6), 16) || 237;
              badgeStyle += ` background: rgba(${r}, ${g}, ${b}, 0.12); color: ${m.color || '#7c3aed'};`;
            }

            return `
              <div class="metric-card" style="border-top: 3px solid ${escapeHtml(m.color || '#2563eb')}; position: relative;">
                <div class="metric-heading" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                  <span class="metric-label-reg" style="font-weight: 600; color: var(--text-primary); font-size: 11px; white-space: normal; line-height: 1.3;">
                    Tier ${escapeHtml(m.code)} — ${escapeHtml(titleClean)}
                  </span>
                  <span class="${badgeClass}" style="${badgeStyle}">${escapeHtml(m.code)} Matrix</span>
                </div>
                <span class="metric-value-30" style="margin-top: 8px; font-size: 26px; font-weight: 700; color: var(--text-primary); line-height: 1.1;">
                  ${String(roleCount).padStart(2, '0')} Role${roleCount === 1 ? '' : 's'}
                </span>
                <span class="metric-context" style="margin-top: 6px; display: block; font-size: 11px; color: var(--text-secondary); line-height: 1.35; white-space: normal;">
                  ${escapeHtml(m.description || `${m.short_name || m.title || 'Technical Role'} clearance scope.`)}
                </span>
              </div>
            `;
          })
          .join('');
      }
    }

    // Update Header and Tab Badges
    const elBadge = document.getElementById('roles-badge-count');
    const elPillRoles = document.getElementById('pill-roles-count');
    const elPillCrew = document.getElementById('pill-personnel-count');
    const elPillMatrix = document.getElementById('pill-matrix-count');
    const elPillDepts = document.getElementById('pill-depts-count');

    if (elBadge) elBadge.textContent = `${roles.length} Roles`;
    if (elPillRoles) elPillRoles.textContent = String(roles.length);
    if (elPillCrew) elPillCrew.textContent = String(crew.length);
    if (elPillMatrix) elPillMatrix.textContent = String(matrix.length);
    if (elPillDepts) elPillDepts.textContent = String(state.departments ? state.departments.length : 0);

    // Populate roles department filter dropdown
    const deptSelect = document.getElementById('roles-filter-dept');
    if (deptSelect) {
      const currentVal = deptSelect.value;
      const deptNames = Array.from(new Set([
        ...roles.map((r) => r.department).filter(Boolean),
        ...(state.departments || []).map((d) => d.name).filter(Boolean)
      ])).sort();
      deptSelect.innerHTML = '<option value="all">All Departments</option>' + deptNames.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
      if (currentVal && deptNames.includes(currentVal)) {
        deptSelect.value = currentVal;
      }
    }

    // Populate clearance filter dropdown from matrix
    const tierSelect = document.getElementById('roles-filter-tier');
    if (tierSelect && matrix.length > 0) {
      const currentTier = tierSelect.value;
      tierSelect.innerHTML = '<option value="all">All Clearance Tiers</option>' + matrix.map((m) => `<option value="${escapeHtml(m.code)}">${escapeHtml(m.code)} — ${escapeHtml(m.title)}</option>`).join('');
      if (currentTier) tierSelect.value = currentTier;
    }

    if (!rowsEl) return;

    // Filter roles
    const q = (state.rolesSearch || '').trim().toLowerCase();
    const filterTier = state.rolesFilterTier || 'all';
    const filterDept = state.rolesFilterDept || 'all';

    const filtered = roles.filter((r) => {
      if (q) {
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchKey = (r.role_key || '').toLowerCase().includes(q);
        const matchDept = (r.department || '').toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchKey && !matchDept && !matchDesc) return false;
      }
      if (filterTier !== 'all' && (r.clearance_code || '').toUpperCase() !== filterTier.toUpperCase()) {
        return false;
      }
      if (filterDept !== 'all' && (r.department || '').toLowerCase() !== filterDept.toLowerCase()) {
        return false;
      }
      return true;
    });

    // 2. Roles Pagination (5 items per page)
    state.rolesPage = state.rolesPage || 1;
    state.rolesPageSize = 5;
    const totalPages = Math.ceil(filtered.length / state.rolesPageSize) || 1;
    if (state.rolesPage > totalPages) state.rolesPage = totalPages;
    if (state.rolesPage < 1) state.rolesPage = 1;

    const startIdx = (state.rolesPage - 1) * state.rolesPageSize;
    const paged = filtered.slice(startIdx, startIdx + state.rolesPageSize);

    // Update Pagination Footer
    const footerCountEl = document.getElementById('roles-results-footer');
    if (footerCountEl) {
      if (filtered.length === 0) {
        footerCountEl.textContent = 'Showing 0 of 0 roles';
      } else {
        const endIdx = Math.min(startIdx + state.rolesPageSize, filtered.length);
        footerCountEl.textContent = `Showing ${startIdx + 1}–${endIdx} of ${filtered.length} roles`;
      }
    }

    const pageControlsEl = document.getElementById('roles-page-controls');
    if (pageControlsEl) {
      if (totalPages <= 1) {
        pageControlsEl.innerHTML = '';
      } else {
        let controlsHtml = `
          <button type="button" class="btn btn-secondary-32 js-roles-prev-page" ${state.rolesPage <= 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
            &larr; Prev
          </button>
        `;
        for (let p = 1; p <= totalPages; p++) {
          const isActive = p === state.rolesPage;
          controlsHtml += `
            <button type="button" class="btn ${isActive ? 'btn-primary-32' : 'btn-secondary-32'} js-roles-page-num" data-page="${p}" style="min-width: 32px; padding: 0 8px; font-weight: 600;">
              ${p}
            </button>
          `;
        }
        controlsHtml += `
          <button type="button" class="btn btn-secondary-32 js-roles-next-page" ${state.rolesPage >= totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
            Next &rarr;
          </button>
        `;
        pageControlsEl.innerHTML = controlsHtml;

        pageControlsEl.querySelectorAll('.js-roles-page-num').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.rolesPage = Number(btn.getAttribute('data-page'));
            renderRolesScreen();
          });
        });
        const prevBtn = pageControlsEl.querySelector('.js-roles-prev-page');
        if (prevBtn && state.rolesPage > 1) {
          prevBtn.addEventListener('click', () => {
            state.rolesPage--;
            renderRolesScreen();
          });
        }
        const nextBtn = pageControlsEl.querySelector('.js-roles-next-page');
        if (nextBtn && state.rolesPage < totalPages) {
          nextBtn.addEventListener('click', () => {
            state.rolesPage++;
            renderRolesScreen();
          });
        }
      }
    }

    if (filtered.length === 0) {
      rowsEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No technical roles match the selected filter.</div>`;
      return;
    }

    rowsEl.innerHTML = paged
      .map((r) => {
        const tierBadgeClass =
          r.clearance_code === 'L4' ? 'status-badge-green-sm' :
          r.clearance_code === 'L3' ? 'status-badge-purple-sm' :
          r.clearance_code === 'L2' ? 'status-badge-blue-sm' : 'status-badge-gray-sm';

        const isSys = Number(r.is_system) === 1;
        const typeTag = isSys
          ? `<span class="status-badge" style="background: #e0e7ff; color: #3730a3; font-size: 10px; font-weight: 700;">SYSTEM</span>`
          : `<span class="status-badge" style="background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 600;">CUSTOM</span>`;

        return `
          <div class="data-table-row" style="display: flex; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 12px; gap: 8px;">
            <div style="width: 230px;">
              <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(r.title)}</div>
              <div style="font-family: monospace; font-size: 11px; color: var(--text-muted);">code: ${escapeHtml(r.role_key)}</div>
            </div>

            <div style="width: 170px;">
              <span class="status-badge ${tierBadgeClass}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px;">
                <img src="assets/metric-circle-check.svg" alt="" class="svg-icon" style="width: 12px; height: 12px; filter: brightness(0.6);" />
                ${escapeHtml(r.clearance_code)} · ${escapeHtml(r.clearance_short || r.clearance_title || 'Access')}
              </span>
            </div>

            <div style="width: 140px;">
              <span style="font-weight: 600; color: #4a5568;">${escapeHtml(r.department || 'Production')}</span>
            </div>

            <div style="flex: 1 0 260px; min-width: 0; color: var(--text-secondary); line-height: 1.4; padding-right: 10px;">
              ${escapeHtml(r.description || 'Standard venue operations and gate verification scope.')}
            </div>

            <div style="width: 110px; text-align: center;">
              <button type="button" class="btn-ghost-sm js-filter-crew-by-role" data-role-key="${escapeHtml(r.role_key)}" title="Click to view assigned personnel in directory" style="background: rgba(37, 99, 235, 0.08); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <img src="assets/metric-users.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
                <span>${r.staff_count} Staff</span>
              </button>
            </div>

            <div style="width: 85px;">
              ${typeTag}
            </div>

            <div style="width: 130px; display: flex; justify-content: flex-end; gap: 6px;">
              <button type="button" class="btn btn-secondary-32 js-edit-role" data-role-id="${r.id}" title="Edit Role & Clearance" style="padding: 0 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                <img src="assets/edit.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
                <span>Edit</span>
              </button>
              ${
                isSys
                  ? `<button type="button" class="btn btn-secondary-32" disabled title="Protected Core System Role" style="opacity: 0.45; cursor: not-allowed; padding: 0 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"><img src="assets/lock.svg" alt="" class="svg-icon" style="width: 11px; height: 11px;" /> <span style="font-size: 10px;">Core</span></button>`
                  : `<button type="button" class="btn btn-secondary-32 js-delete-role" data-role-id="${r.id}" data-role-title="${escapeHtml(r.title)}" data-assigned="${r.staff_count}" title="Delete Custom Role" style="color: #dc2626; padding: 0 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;"><img src="assets/trash.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" /> <span>Del</span></button>`
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  function openRoleModal(role = null) {
    populateClearanceDropdowns();
    const modal = document.getElementById('role-crud-modal');
    if (!modal) return;

    const titleEl = document.getElementById('role-modal-title');
    const tagEl = document.getElementById('role-modal-tag');
    const idInput = document.getElementById('role-modal-id');
    const titleInput = document.getElementById('role-modal-title-input');
    const keyInput = document.getElementById('role-modal-key-input');
    const tierSelect = document.getElementById('role-modal-tier-select');
    const deptSelect = document.getElementById('role-modal-dept-select');
    const descInput = document.getElementById('role-modal-desc-input');
    const activeCb = document.getElementById('role-modal-active-checkbox');

    if (role) {
      if (titleEl) titleEl.textContent = `Edit Role: ${role.title}`;
      if (tagEl) tagEl.textContent = `Tier ${role.clearance_code || 'L2'}`;
      if (idInput) idInput.value = String(role.id);
      if (titleInput) titleInput.value = role.title || '';
      if (keyInput) {
        keyInput.value = role.role_key || '';
        keyInput.readOnly = Number(role.is_system) === 1;
      }
      if (tierSelect) tierSelect.value = role.clearance_level || 'L2_TECH_STAGE';
      if (deptSelect) deptSelect.value = role.department || 'Audio';
      if (descInput) descInput.value = role.description || '';
      if (activeCb) activeCb.checked = Number(role.is_active) !== 0;
    } else {
      if (titleEl) titleEl.textContent = 'Add Technical Role';
      if (tagEl) tagEl.textContent = 'New Clearance Definition';
      if (idInput) idInput.value = '0';
      if (titleInput) titleInput.value = '';
      if (keyInput) {
        keyInput.value = '';
        keyInput.readOnly = false;
      }
      if (tierSelect) tierSelect.value = 'L2_TECH_STAGE';
      if (deptSelect) deptSelect.value = 'Audio';
      if (descInput) descInput.value = '';
      if (activeCb) activeCb.checked = true;
    }

    modal.classList.add('open');
  }

  function closeRoleModal() {
    const modal = document.getElementById('role-crud-modal');
    if (modal) modal.classList.remove('open');
  }

  // =========================================================================
  // DEPARTMENTS MANAGEMENT & CRUD (TAB 4 IN USERS SCREEN)
  // =========================================================================

  function renderDepartmentsScreen() {
    const rowsEl = document.getElementById('departments-table-rows');
    const depts = Array.isArray(state.departments) ? state.departments : [];
    const crew = Array.isArray(state.crew) ? state.crew : [];
    const roles = Array.isArray(state.roles) ? state.roles : [];

    // Recalculate dynamic staff and role counts
    depts.forEach((d) => {
      const dName = (d.name || '').toLowerCase();
      const dCode = (d.code || '').toLowerCase();
      d.staff_count = crew.filter((c) => {
        const uDept = (c.department || '').toLowerCase();
        return uDept === dName || uDept === dCode;
      }).length;
      d.roles_count = roles.filter((r) => {
        const rDept = (r.department || '').toLowerCase();
        return rDept === dName || rDept === dCode;
      }).length;
    });

    // Aggregate metrics
    const totalDepts = depts.length;
    const activeDepts = depts.filter((d) => Number(d.is_active) === 1).length;
    const totalStaffAssigned = depts.reduce((acc, d) => acc + (d.staff_count || 0), 0);
    const totalRolesAssigned = depts.reduce((acc, d) => acc + (d.roles_count || 0), 0);

    const elTotal = document.getElementById('depts-kpi-total');
    const elActive = document.getElementById('depts-kpi-active');
    const elStaff = document.getElementById('depts-kpi-staff');
    const elRoles = document.getElementById('depts-kpi-roles');
    const elBadge = document.getElementById('depts-badge-count');
    const elPill = document.getElementById('pill-depts-count');

    if (elTotal) elTotal.textContent = String(totalDepts);
    if (elActive) elActive.textContent = String(activeDepts);
    if (elStaff) elStaff.textContent = String(totalStaffAssigned);
    if (elRoles) elRoles.textContent = String(totalRolesAssigned);
    if (elBadge) elBadge.textContent = `${totalDepts} Departments`;
    if (elPill) elPill.textContent = String(totalDepts);

    if (!rowsEl) return;

    // Filter
    const q = (state.deptsSearch || '').trim().toLowerCase();
    const filterStatus = state.deptsFilterStatus || 'all';

    const filtered = depts.filter((d) => {
      if (q) {
        const matchName = (d.name || '').toLowerCase().includes(q);
        const matchCode = (d.code || '').toLowerCase().includes(q);
        const matchDesc = (d.description || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesc) return false;
      }
      if (filterStatus === 'active' && Number(d.is_active) !== 1) return false;
      if (filterStatus === 'inactive' && Number(d.is_active) === 1) return false;
      return true;
    });

    // Pagination
    state.deptsPage = state.deptsPage || 1;
    state.deptsPageSize = 10;
    const totalPages = Math.ceil(filtered.length / state.deptsPageSize) || 1;
    if (state.deptsPage > totalPages) state.deptsPage = totalPages;
    if (state.deptsPage < 1) state.deptsPage = 1;

    const startIdx = (state.deptsPage - 1) * state.deptsPageSize;
    const paged = filtered.slice(startIdx, startIdx + state.deptsPageSize);

    // Update Pagination Footer
    const footerCountEl = document.getElementById('depts-results-footer');
    if (footerCountEl) {
      if (filtered.length === 0) {
        footerCountEl.textContent = 'Showing 0 of 0 departments';
      } else {
        const endIdx = Math.min(startIdx + state.deptsPageSize, filtered.length);
        footerCountEl.textContent = `Showing ${startIdx + 1}–${endIdx} of ${filtered.length} departments`;
      }
    }

    const pageControlsEl = document.getElementById('depts-page-controls');
    if (pageControlsEl) {
      if (totalPages <= 1) {
        pageControlsEl.innerHTML = '';
      } else {
        let controlsHtml = `
          <button type="button" class="btn btn-secondary-32 js-depts-prev-page" ${state.deptsPage <= 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
            &larr; Prev
          </button>
        `;
        for (let p = 1; p <= totalPages; p++) {
          const isActive = p === state.deptsPage;
          controlsHtml += `
            <button type="button" class="btn ${isActive ? 'btn-primary-32' : 'btn-secondary-32'} js-depts-page-num" data-page="${p}" style="min-width: 32px; padding: 0 8px; font-weight: 600;">
              ${p}
            </button>
          `;
        }
        controlsHtml += `
          <button type="button" class="btn btn-secondary-32 js-depts-next-page" ${state.deptsPage >= totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
            Next &rarr;
          </button>
        `;
        pageControlsEl.innerHTML = controlsHtml;

        pageControlsEl.querySelectorAll('.js-depts-page-num').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.deptsPage = Number(btn.getAttribute('data-page'));
            renderDepartmentsScreen();
          });
        });
        const prevBtn = pageControlsEl.querySelector('.js-depts-prev-page');
        if (prevBtn && state.deptsPage > 1) {
          prevBtn.addEventListener('click', () => {
            state.deptsPage--;
            renderDepartmentsScreen();
          });
        }
        const nextBtn = pageControlsEl.querySelector('.js-depts-next-page');
        if (nextBtn && state.deptsPage < totalPages) {
          nextBtn.addEventListener('click', () => {
            state.deptsPage++;
            renderDepartmentsScreen();
          });
        }
      }
    }

    if (filtered.length === 0) {
      rowsEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No departments match the search query.</div>`;
      return;
    }

    rowsEl.innerHTML = paged
      .map((d) => {
        const isActive = Number(d.is_active) === 1;
        const statusTag = isActive
          ? `<span class="status-badge status-badge-green-sm" style="font-size: 11px;">Active</span>`
          : `<span class="status-badge" style="background: #f1f5f9; color: #64748b; font-size: 11px;">Inactive</span>`;

        return `
          <div class="data-table-row" style="display: flex; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 12px; gap: 8px;">
            <div style="width: 110px;">
              <span class="status-badge status-badge-blue-sm" style="font-family: monospace; font-size: 11px; font-weight: 700; padding: 2px 7px;">
                ${escapeHtml(d.code)}
              </span>
            </div>

            <div style="width: 220px;">
              <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(d.name)}</div>
            </div>

            <div style="flex: 1 0 240px; min-width: 0; color: var(--text-secondary); line-height: 1.4; padding-right: 10px;">
              ${escapeHtml(d.description || 'General organizational division and operational unit.')}
            </div>

            <div style="width: 120px; text-align: center;">
              <button type="button" class="btn-ghost-sm js-filter-crew-by-dept" data-dept-name="${escapeHtml(d.name)}" title="View ${d.staff_count || 0} assigned crew members in directory" style="background: rgba(37, 99, 235, 0.08); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <img src="assets/metric-users.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
                <span>${d.staff_count || 0} Staff</span>
              </button>
            </div>

            <div style="width: 120px; text-align: center;">
              <button type="button" class="btn-ghost-sm js-filter-roles-by-dept" data-dept-name="${escapeHtml(d.name)}" title="View ${d.roles_count || 0} roles in this department" style="background: rgba(147, 51, 234, 0.08); color: #7c3aed; border: 1px solid rgba(147, 51, 234, 0.2); border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <img src="assets/nav-payments.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
                <span>${d.roles_count || 0} Roles</span>
              </button>
            </div>

            <div style="width: 100px;">
              ${statusTag}
            </div>

            <div style="width: 120px; display: flex; justify-content: flex-end; gap: 6px;">
              <button type="button" class="btn btn-secondary-32 js-edit-dept" data-dept-id="${d.id}" title="Edit Department" style="padding: 0 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                <img src="assets/edit.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
                <span>Edit</span>
              </button>
              <button type="button" class="btn btn-secondary-32 js-delete-dept" data-dept-id="${d.id}" data-dept-name="${escapeHtml(d.name)}" data-assigned="${d.staff_count || 0}" title="Delete Department" style="color: #dc2626; padding: 0 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                <img src="assets/trash.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
                <span>Del</span>
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function openDeptModal(dept = null) {
    const modal = document.getElementById('dept-crud-modal');
    if (!modal) return;
    const titleEl = document.getElementById('dept-crud-modal-title');
    const idEl = document.getElementById('dept-crud-id');
    const codeEl = document.getElementById('dept-crud-code');
    const nameEl = document.getElementById('dept-crud-name');
    const descEl = document.getElementById('dept-crud-desc');
    const activeEl = document.getElementById('dept-crud-active');

    if (dept) {
      if (titleEl) titleEl.textContent = `Edit Department: ${dept.name}`;
      if (idEl) idEl.value = String(dept.id || 0);
      if (codeEl) codeEl.value = dept.code || '';
      if (nameEl) nameEl.value = dept.name || '';
      if (descEl) descEl.value = dept.description || '';
      if (activeEl) activeEl.checked = Number(dept.is_active) === 1;
    } else {
      if (titleEl) titleEl.textContent = 'Add New Department';
      if (idEl) idEl.value = '0';
      if (codeEl) codeEl.value = '';
      if (nameEl) nameEl.value = '';
      if (descEl) descEl.value = '';
      if (activeEl) activeEl.checked = true;
    }
    modal.style.display = 'flex';
  }

  function closeDeptModal() {
    const modal = document.getElementById('dept-crud-modal');
    if (modal) modal.style.display = 'none';
  }

  // =========================================================================
  // NAVIGATION MENU ENABLE/DISABLE & CRUD CONTROLLER
  // =========================================================================

  function getNavBadgeValueAndId(item) {
    const type = String(item.badge_type || 'none');
    if (type === 'event_venues' || item.nav_key === 'create_event') {
      const evOnlyCount = state.checkpoints?.event_venues?.length || 0;
      return {
        id: item.badge_id || 'sidebar-create-event-count',
        text: String(evOnlyCount).padStart(2, '0'),
      };
    }
    if (type === 'events') {
      const evCount = (state.checkpoints?.event_venues?.length || 0) + (state.checkpoints?.stock_warehouses?.length || 0);
      return {
        id: item.badge_id || 'sidebar-events-count',
        text: String(evCount).padStart(2, '0'),
      };
    }
    if (type === 'users') {
      const uCount = (state.crew || []).length;
      return {
        id: item.badge_id || 'sidebar-users-count',
        text: String(uCount).padStart(2, '0'),
      };
    }
    if (type === 'stock') {
      const sCount = (state.checkpoints?.stock_warehouses || []).length;
      return {
        id: item.badge_id || 'sidebar-stock-count',
        text: String(sCount).padStart(2, '0'),
      };
    }
    if (type === 'onsite') {
      const oCount = (state.rollCallList || []).length;
      return {
        id: item.badge_id || '',
        className: 'js-stat-onsite',
        text: String(oCount).padStart(2, '0'),
      };
    }
    if (type === 'shift_relief') {
      const srCount = Number(state.pendingShiftRequestCount || 0);
      return {
        id: item.badge_id || 'sidebar-shift-relief-badge',
        style: `${srCount > 0 ? '' : 'display: none; '}background: #fef3c7; color: #b45309;`,
        text: String(srCount),
      };
    }
    if (type === 'calltime') {
      const ct = String(state.activeCheckpoint?.call_time || '08:00').slice(0, 5);
      return {
        id: item.badge_id || 'sidebar-active-calltime-pill',
        text: ct,
      };
    }
    if (type === 'standalone_portals') {
      const pCount = (state.standalonePortals && state.standalonePortals.length > 0) ? state.standalonePortals.length : 4;
      return {
        id: item.badge_id || 'sidebar-portals-count',
        text: String(pCount).padStart(2, '0'),
      };
    }
    if (type === 'custom' && item.badge_text) {
      return {
        id: item.badge_id || '',
        text: String(item.badge_text),
      };
    }
    return null;
  }

  function renderNavItemIconHtml(item, isActive = false) {
    const ic = String(item.icon || 'assets/nav-overview-inactive.svg');
    const actIc = String(item.active_icon || '');
    if (ic === 'svg:warehouse') {
      return `
        <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      `;
    }
    const src = (isActive && actIc) ? actIc : ic;
    const idAttr = item.icon_id ? `id="${escapeHtml(item.icon_id)}"` : '';
    const inactiveAttr = `data-inactive-icon="${escapeHtml(ic)}"`;
    const activeAttr = actIc ? `data-active-icon="${escapeHtml(actIc)}"` : '';
    return `<img src="${escapeHtml(src)}" alt="" class="svg-icon" ${idAttr} ${inactiveAttr} ${activeAttr} />`;
  }

  function isNavItemPermittedForCurrentUser(item) {
    if (!item || Number(item.is_enabled) !== 1) return false;
    const allowedRaw = String(item.allowed_roles || 'all').trim().toLowerCase();
    if (!allowedRaw || allowedRaw === 'all') return true;
    const rawRole = String(state.currentUser?.role || '').trim().toLowerCase();
    const roleTokens = allowedRaw.split(',').map((r) => r.trim()).filter(Boolean);
    if (isCurrentUserAdmin()) {
      return roleTokens.includes('admin') || roleTokens.includes('administrator') || roleTokens.includes('all');
    }
    if (rawRole === 'technical_lead' && roleTokens.includes('tech_lead')) {
      return true;
    }
    return roleTokens.includes(rawRole);
  }

  function buildSidebarNavButtonHtml(item) {
    const target = String(item.nav_target || 'overview');
    const isShortcut = target.startsWith('action:');
    const isCustomUrl = target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#') || target.endsWith('.html') || target.endsWith('.php');
    const isActive = !isShortcut && !isCustomUrl && (
      state.activeScreen === target ||
      (state.activeScreen === 'events' && (target === 'stock-manager' || target === 'venue-security')) ||
      (state.activeScreen === 'users' && state.usersViewMode === 'matrix' && (target === 'access-matrix' || target === 'analytics'))
    );
    const visible = isNavItemPermittedForCurrentUser(item);
    const idAttr = item.dom_id ? `id="${escapeHtml(item.dom_id)}"` : '';
    const nodeAttr = item.node_id ? `data-node-id="${escapeHtml(item.node_id)}"` : '';
    const targetAttr = (!isShortcut && !isCustomUrl)
      ? `data-nav-target="${escapeHtml(target)}"`
      : `data-nav-action="${escapeHtml(target)}"`;
    const badge = getNavBadgeValueAndId(item);
    const badgeHtml = badge
      ? `<span class="nav-item-count${badge.className ? ` ${escapeHtml(badge.className)}` : ''}"${badge.id ? ` id="${escapeHtml(badge.id)}"` : ''}${badge.style ? ` style="${escapeHtml(badge.style)}"` : ''}>${escapeHtml(badge.text)}</span>`
      : '';

    if (target === 'settings') {
      const settingsOpen = state.activeScreen === 'settings';
      const sec = state.settingsTab || 'flow';
      const sections = [
        ['flow', 'Flow'],
        ['relief', 'Relief & Geo-QR'],
        ['dispatch', 'Dispatch Hierarchy'],
        ['links', 'Shared Links'],
        ['branding', 'Branding & Mode'],
        ['accounts', 'Accounts & Offline'],
        ['pwa', 'PWA (Android & iOS)'],
        ['controls', 'Config Shortcuts'],
      ];
      return `
        <div class="sidebar-settings-group${settingsOpen ? ' is-open' : ''}" id="sidebar-settings-group" style="display: ${visible ? 'flex' : 'none'};">
          <button type="button" class="nav-item sidebar-settings-toggle${isActive ? ' active' : ''}" ${idAttr} ${targetAttr} data-nav-group="${escapeHtml(item.nav_group || 'workspace')}" data-nav-key="${escapeHtml(item.nav_key)}" data-nav-id="${Number(item.id)}" ${nodeAttr} aria-expanded="${settingsOpen ? 'true' : 'false'}" title="Settings > Flow &amp; Platform Configuration" style="display: ${visible ? 'flex' : 'none'}; opacity: 1; filter: none; cursor: pointer;" ${visible ? '' : 'data-restricted="true" tabindex="-1"'}>
            ${renderNavItemIconHtml(item, isActive)}
            <span class="nav-item-label">Settings</span>
            <span class="sidebar-settings-chevron" id="sidebar-settings-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="sidebar-settings-submenu" id="sidebar-settings-submenu" style="display: ${settingsOpen ? 'flex' : 'none'};">
            ${sections.map(([key, lbl]) => `
              <button type="button" class="nav-subitem${sec === key ? ' active' : ''}" data-settings-section="${key}">
                <span>${escapeHtml(lbl)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <button type="button" class="nav-item${isActive ? ' active' : ''}" ${idAttr} ${targetAttr} data-nav-group="${escapeHtml(item.nav_group || 'main')}" data-nav-key="${escapeHtml(item.nav_key)}" data-nav-id="${Number(item.id)}" ${nodeAttr} title="${escapeHtml(item.label)}" style="display: ${visible ? 'flex' : 'none'}; opacity: 1; filter: none; cursor: pointer;" ${visible ? '' : 'data-restricted="true" tabindex="-1"'}>
        ${renderNavItemIconHtml(item, isActive)}
        <span class="nav-item-label">${escapeHtml(item.label)}</span>
        ${badgeHtml}
      </button>
    `;
  }

  function renderMainNavigation() {
    const navGroup = document.querySelector('.sidebar .nav-group[aria-label="Main navigation"]');
    const wsGroup = document.getElementById('sidebar-checkpoint-controls') || document.querySelector('.sidebar .nav-group-workspace');
    const disabledNotice = document.getElementById('sidebar-nav-disabled-notice');
    const wsDisabledNotice = document.getElementById('sidebar-workspace-disabled-notice');
    const cfg = state.navigationConfig || { main_nav_enabled: true, workspace_nav_enabled: true, items: [] };
    const isMainEnabled = cfg.main_nav_enabled !== false;
    const isWorkspaceEnabled = cfg.workspace_nav_enabled !== false;
    const isAdmin = isCurrentUserAdmin();
    const allItems = Array.isArray(cfg.items) ? cfg.items : [];
    const sortByOrder = (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id || 0) - Number(b.id || 0);

    if (navGroup) {
      const mainItems = allItems.filter((it) => (it.nav_group || 'main') === 'main').sort(sortByOrder);
      if (mainItems.length > 0) {
        navGroup.innerHTML = mainItems.map(buildSidebarNavButtonHtml).join('');
      }
      navGroup.style.display = isMainEnabled ? 'flex' : 'none';
    }

    if (wsGroup) {
      const wsItems = allItems.filter((it) => it.nav_group === 'workspace').sort(sortByOrder);
      let anyWsVisible = false;
      if (wsItems.length > 0) {
        anyWsVisible = wsItems.some((it) => isNavItemPermittedForCurrentUser(it));
        wsGroup.innerHTML = `<span class="nav-section-label" data-node-id="2:3306">CHECKPOINT CONTROLS</span>` + wsItems.map(buildSidebarNavButtonHtml).join('');
      } else {
        anyWsVisible = true;
      }
      wsGroup.style.display = (isWorkspaceEnabled && anyWsVisible) ? 'flex' : 'none';
    }

    if (disabledNotice) {
      disabledNotice.style.display = (!isMainEnabled && isAdmin) ? 'flex' : 'none';
    }
    if (wsDisabledNotice) {
      wsDisabledNotice.style.display = (!isWorkspaceEnabled && isAdmin) ? 'flex' : 'none';
    }

    const pillCountEl = document.getElementById('pill-nav-count');
    if (pillCountEl && allItems.length > 0) {
      pillCountEl.textContent = String(allItems.length);
    }
  }

  function formatNavRolesSummary(allowedRolesStr) {
    const raw = String(allowedRolesStr || 'all').trim().toLowerCase();
    if (!raw || raw === 'all') {
      return '<span class="status-badge status-badge-green-sm" style="font-size: 11px;">All Roles</span>';
    }
    const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean);
    const labels = [];
    if (tokens.some((t) => t === 'admin' || t === 'administrator')) labels.push('Admin');
    if (tokens.some((t) => t === 'manager' || t === 'project_manager')) labels.push('Manager');
    if (tokens.some((t) => t === 'tech_lead' || t === 'technical_lead')) labels.push('Tech Lead');
    if (tokens.includes('stock_manager')) labels.push('Site Mgr');
    if (tokens.includes('stock_controller')) labels.push('Gate Ctrl');
    if (tokens.some((t) => ['technician', 'sound_engineer', 'lighting_tech', 'video_director', 'stage_manager', 'rigging_lead', 'user', 'security', 'driver'].includes(t))) {
      labels.push('Crew');
    }
    if (labels.length === 0) {
      return `<span class="status-badge status-badge-blue-sm" style="font-size: 11px;">${escapeHtml(raw)}</span>`;
    }
    return labels.map((l) => `<span class="status-badge status-badge-blue-sm" style="font-size: 10.5px; margin-right: 4px; margin-bottom: 2px;">${escapeHtml(l)}</span>`).join('');
  }

  function renderNavigationManagerScreen() {
    const cfg = state.navigationConfig || { main_nav_enabled: true, workspace_nav_enabled: true, items: [] };
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    const isMainEnabled = cfg.main_nav_enabled !== false;
    const isWorkspaceEnabled = cfg.workspace_nav_enabled !== false;

    const syncGroupToggle = (toggleId, badgeId, enabled) => {
      const tEl = document.getElementById(toggleId);
      const bEl = document.getElementById(badgeId);
      if (tEl) tEl.checked = enabled;
      if (bEl) {
        bEl.textContent = enabled ? 'Enabled' : 'Disabled';
        bEl.className = enabled ? 'status-badge status-badge-green-sm' : 'status-badge';
        if (!enabled) {
          bEl.style.background = '#fee2e2';
          bEl.style.color = '#dc2626';
        } else {
          bEl.style.background = '';
          bEl.style.color = '';
        }
      }
    };
    syncGroupToggle('nav-main-group-toggle', 'nav-main-group-status-badge', isMainEnabled);
    syncGroupToggle('nav-workspace-group-toggle', 'nav-workspace-group-status-badge', isWorkspaceEnabled);

    const totalCount = items.length;
    const enabledCount = items.filter((i) => Number(i.is_enabled) === 1).length;
    const disabledCount = totalCount - enabledCount;
    const customCount = items.filter((i) => Number(i.is_system) !== 1).length;

    const elTotal = document.getElementById('nav-kpi-total');
    const elEnabled = document.getElementById('nav-kpi-enabled');
    const elDisabled = document.getElementById('nav-kpi-disabled');
    const elCustom = document.getElementById('nav-kpi-custom');
    const elPill = document.getElementById('pill-nav-count');
    const elBadge = document.getElementById('nav-items-badge-count');
    if (elTotal) elTotal.textContent = String(totalCount);
    if (elEnabled) elEnabled.textContent = String(enabledCount);
    if (elDisabled) elDisabled.textContent = String(disabledCount);
    if (elCustom) elCustom.textContent = String(customCount);
    if (elPill) elPill.textContent = String(totalCount);
    if (elBadge) elBadge.textContent = `${totalCount} Items`;

    const rowsEl = document.getElementById('navigation-table-rows');
    if (!rowsEl) return;

    const q = (state.navSearch || '').trim().toLowerCase();
    const groupFilter = state.navFilterGroup || 'all';
    const statusFilter = state.navFilterStatus || 'all';
    const sorted = [...items].sort((a, b) => {
      const gA = (a.nav_group || 'main') === 'workspace' ? 1 : 0;
      const gB = (b.nav_group || 'main') === 'workspace' ? 1 : 0;
      if (gA !== gB) return gA - gB;
      return Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id || 0) - Number(b.id || 0);
    });
    const filtered = sorted.filter((it) => {
      const grp = (it.nav_group || 'main') === 'workspace' ? 'workspace' : 'main';
      if (groupFilter !== 'all' && grp !== groupFilter) return false;
      const enabled = Number(it.is_enabled) === 1;
      if (statusFilter === 'enabled' && !enabled) return false;
      if (statusFilter === 'disabled' && enabled) return false;
      if (q) {
        const hay = `${it.label} ${it.nav_key} ${grp} ${it.nav_target} ${it.allowed_roles}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      rowsEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No navigation items match the current filter.</div>`;
      return;
    }

    rowsEl.innerHTML = filtered.map((it) => {
      const enabled = Number(it.is_enabled) === 1;
      const isWs = it.nav_group === 'workspace';
      const groupBadge = isWs
        ? '<span class="status-badge" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed; font-size: 10.5px;">Checkpoint</span>'
        : '<span class="status-badge status-badge-blue-sm" style="font-size: 10.5px;">Main Nav</span>';
      const badgeLabel = it.badge_type && it.badge_type !== 'none'
        ? (it.badge_type === 'custom' ? (it.badge_text || 'Custom') : it.badge_type)
        : 'None';
      const systemTag = Number(it.is_system) === 1
        ? '<span style="font-size: 10px; color: var(--text-muted);">System</span>'
        : '<span style="font-size: 10px; color: #4f46e5; font-weight: 700;">Custom</span>';

      return `
        <div class="data-table-row" style="display: flex; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 12px; gap: 8px; ${enabled ? '' : 'opacity: 0.65;'}">
          <div style="width: 55px; font-weight: 700; color: var(--text-secondary);">#${Number(it.sort_order || 0)}</div>

          <div style="width: 125px;">${groupBadge}</div>

          <div style="width: 220px; display: flex; align-items: center; gap: 10px; min-width: 0;">
            <span style="width: 28px; height: 28px; border-radius: 8px; background: var(--bg-subtle); border: 1px solid var(--border-color); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${renderNavItemIconHtml(it, false)}
            </span>
            <div style="min-width: 0;">
              <div style="font-weight: 700; color: var(--text-primary); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(it.label)}</div>
              <div style="font-size: 10.5px; color: var(--text-muted);">${escapeHtml(it.nav_key)} · ${systemTag}</div>
            </div>
          </div>

          <div style="width: 155px;">
            <code style="font-size: 11px; background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; color: var(--text-primary);">${escapeHtml(it.nav_target)}</code>
          </div>

          <div style="flex: 1 0 180px; min-width: 0; display: flex; flex-wrap: wrap; align-items: center;">
            ${formatNavRolesSummary(it.allowed_roles)}
          </div>

          <div style="width: 100px; text-align: center;">
            <span class="status-badge" style="background: var(--bg-subtle); color: var(--text-secondary); font-size: 11px;">${escapeHtml(badgeLabel)}</span>
          </div>

          <div style="width: 90px; display: flex; justify-content: center;">
            <label class="nav-toggle-switch" title="${enabled ? 'Disable' : 'Enable'} ${escapeHtml(it.label)}">
              <input type="checkbox" class="js-toggle-nav-item" data-nav-id="${Number(it.id)}" ${enabled ? 'checked' : ''} />
              <span class="nav-toggle-slider"></span>
            </label>
          </div>

          <div style="width: 130px; display: flex; justify-content: flex-end; gap: 6px;">
            <button type="button" class="btn btn-secondary-32 js-edit-nav-item" data-nav-id="${Number(it.id)}" title="Edit Navigation Item" style="padding: 0 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
              <img src="assets/edit.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
              <span>Edit</span>
            </button>
            <button type="button" class="btn btn-secondary-32 js-delete-nav-item" data-nav-id="${Number(it.id)}" data-nav-label="${escapeHtml(it.label)}" title="Delete Navigation Item" style="color: #dc2626; padding: 0 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
              <img src="assets/trash.svg" alt="" class="svg-icon" style="width: 12px; height: 12px;" />
              <span>Del</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openNavItemModal(item = null) {
    const modal = document.getElementById('nav-item-crud-modal');
    if (!modal) return;
    const titleEl = document.getElementById('nav-crud-modal-title');
    const idEl = document.getElementById('nav-crud-id');
    const groupEl = document.getElementById('nav-crud-group');
    const labelEl = document.getElementById('nav-crud-label');
    const keyEl = document.getElementById('nav-crud-key');
    const orderEl = document.getElementById('nav-crud-order');
    const targetEl = document.getElementById('nav-crud-target');
    const customUrlWrap = document.getElementById('nav-crud-custom-url-wrap');
    const customUrlEl = document.getElementById('nav-crud-custom-url');
    const iconEl = document.getElementById('nav-crud-icon');
    const badgeTypeEl = document.getElementById('nav-crud-badge-type');
    const badgeTextWrap = document.getElementById('nav-crud-badge-text-wrap');
    const badgeTextEl = document.getElementById('nav-crud-badge-text');
    const rolesAllEl = document.getElementById('nav-crud-roles-all');
    const roleCbs = Array.from(document.querySelectorAll('#nav-crud-roles-list .js-nav-role-cb'));
    const enabledEl = document.getElementById('nav-crud-enabled');

    const knownTargets = [
      'overview', 'events', 'users', 'attendees', 'terminals', 'venue-security',
      'stock-manager', 'access-matrix',
      'shift-relief', 'calltime', 'rollcall', 'station-lock', 'reset-scans', 'standalone-portals',
      'action:shift-relief', 'action:calltime', 'action:rollcall', 'action:station-lock', 'action:reset-scans', 'action:onsite-share',
    ];

    if (item) {
      if (titleEl) titleEl.textContent = `Edit Nav Item: ${item.label}`;
      if (idEl) idEl.value = String(item.id || 0);
      if (groupEl) groupEl.value = item.nav_group === 'workspace' ? 'workspace' : 'main';
      if (labelEl) labelEl.value = item.label || '';
      if (keyEl) keyEl.value = item.nav_key || '';
      if (orderEl) orderEl.value = String(item.sort_order || 1);
      const tgt = String(item.nav_target || 'overview');
      if (knownTargets.includes(tgt)) {
        if (targetEl) targetEl.value = tgt;
        if (customUrlWrap) customUrlWrap.style.display = 'none';
        if (customUrlEl) customUrlEl.value = '';
      } else {
        if (targetEl) targetEl.value = 'custom';
        if (customUrlWrap) customUrlWrap.style.display = 'block';
        if (customUrlEl) customUrlEl.value = tgt;
      }
      if (iconEl) {
        const icVal = item.icon || 'assets/nav-overview-inactive.svg';
        if (!Array.from(iconEl.options).some((o) => o.value === icVal)) {
          const opt = document.createElement('option');
          opt.value = icVal;
          opt.textContent = icVal;
          iconEl.appendChild(opt);
        }
        iconEl.value = icVal;
      }
      const bType = item.badge_type || 'none';
      if (badgeTypeEl) badgeTypeEl.value = bType;
      if (badgeTextWrap) badgeTextWrap.style.display = bType === 'custom' ? 'block' : 'none';
      if (badgeTextEl) badgeTextEl.value = item.badge_text || '';
      if (enabledEl) enabledEl.checked = Number(item.is_enabled) === 1;

      const allowedRaw = String(item.allowed_roles || 'all').toLowerCase().trim();
      const isAll = !allowedRaw || allowedRaw === 'all';
      if (rolesAllEl) rolesAllEl.checked = isAll;
      const tokens = allowedRaw.split(',').map((t) => t.trim()).filter(Boolean);
      roleCbs.forEach((cb) => {
        if (isAll) {
          cb.checked = true;
          cb.disabled = true;
        } else {
          cb.disabled = false;
          const cbTokens = cb.value.split(',').map((t) => t.trim());
          cb.checked = cbTokens.some((t) => tokens.includes(t));
        }
      });
    } else {
      const defGroup = (state.navFilterGroup === 'workspace') ? 'workspace' : 'main';
      const nextOrder = ((state.navigationConfig?.items || []).filter((i) => (i.nav_group || 'main') === defGroup).length || 0) + 1;
      if (titleEl) titleEl.textContent = 'Add Navigation Item';
      if (idEl) idEl.value = '0';
      if (groupEl) groupEl.value = defGroup;
      if (labelEl) labelEl.value = '';
      if (keyEl) keyEl.value = '';
      if (orderEl) orderEl.value = String(nextOrder);
      if (targetEl) targetEl.value = defGroup === 'workspace' ? 'shift-relief' : 'overview';
      if (customUrlWrap) customUrlWrap.style.display = 'none';
      if (customUrlEl) customUrlEl.value = '';
      if (iconEl) iconEl.value = 'assets/nav-overview-inactive.svg';
      if (badgeTypeEl) badgeTypeEl.value = 'none';
      if (badgeTextWrap) badgeTextWrap.style.display = 'none';
      if (badgeTextEl) badgeTextEl.value = '';
      if (enabledEl) enabledEl.checked = true;
      if (rolesAllEl) rolesAllEl.checked = true;
      roleCbs.forEach((cb) => {
        cb.checked = true;
        cb.disabled = true;
      });
    }
    modal.style.display = 'flex';
  }

  function closeNavItemModal() {
    const modal = document.getElementById('nav-item-crud-modal');
    if (modal) modal.style.display = 'none';
  }

  // =========================================================================
  // DEDICATED NAVIGATION PAGE RENDERERS & SHARED UI BUILDERS
  // =========================================================================

  function buildCheckpointSelectOptionsHtml(selectedVal = '') {
    const whs = state.checkpoints.stock_warehouses || [];
    const evs = state.checkpoints.event_venues || [];
    const curVal = selectedVal || `${state.checkpointType}:${state.checkpointId}`;
    const opts = [];
    if (whs.length > 0) {
      opts.push('<optgroup label="Facility Gates (Stock Warehouses)">');
      whs.forEach((w) => {
        const val = `stock_warehouse:${w.id}`;
        opts.push(`<option value="${escapeHtml(val)}" ${val === curVal ? 'selected' : ''}>${escapeHtml(w.name)} (${escapeHtml(w.call_time || '08:00')})</option>`);
      });
      opts.push('</optgroup>');
    }
    if (evs.length > 0) {
      opts.push('<optgroup label="Event Venues">');
      evs.forEach((v) => {
        const val = `event_venue:${v.id}`;
        opts.push(`<option value="${escapeHtml(val)}" ${val === curVal ? 'selected' : ''}>${escapeHtml(v.name)} (${escapeHtml(v.call_time || '08:00')})</option>`);
      });
      opts.push('</optgroup>');
    }
    return opts.join('');
  }

  function buildShiftRequestListHtml(reqs, canApprove) {
    if (!Array.isArray(reqs) || reqs.length === 0) {
      return '<div style="padding: 18px; text-align: center; font-size: 12px; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 8px;">No Gate Controller relief or assignment requests match this view.</div>';
    }
    return reqs.map((r) => {
      const st = String(r.status || 'pending').toLowerCase();
      const badgeCls = st === 'approved' ? 'status-badge-green-sm' : (st === 'rejected' ? 'status-badge-red-sm' : 'status-badge-amber-sm');
      const winText = (r.shift_start || r.shift_end)
        ? `Window: ${escapeHtml(r.shift_start || 'Now')} -> ${escapeHtml(r.shift_end || 'Ongoing')}`
        : 'Ongoing / Immediate';
      const actionBtns = (st === 'pending' && canApprove)
        ? `<div style="display: flex; gap: 6px; margin-top: 8px;">
            <button type="button" class="btn btn-primary-32 js-review-shift-btn" data-req-id="${r.id}" data-decision="approved" style="background: #16a34a; border-color: #15803d;">Approve</button>
            <button type="button" class="btn btn-secondary-32-sm js-review-shift-btn" data-req-id="${r.id}" data-decision="rejected" style="color: #dc2626; border-color: #fecaca;">Reject</button>
          </div>`
        : (st === 'pending'
            ? '<div style="font-size: 10.5px; color: var(--text-muted); margin-top: 6px;">Requires Administrator or Site Manager approval</div>'
            : `<div style="font-size: 10.5px; color: var(--text-muted); margin-top: 6px;">Reviewed by ${escapeHtml(r.reviewed_by_name || 'Supervisor')} ${r.reviewed_by_role ? '(' + escapeHtml(r.reviewed_by_role) + ')' : ''}</div>`);

      return `
        <div style="padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface-white);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <strong style="font-size: 12.5px; color: var(--text-primary);">${escapeHtml(r.checkpoint_name)} · ${escapeHtml(formatShiftReasonLabel(r.reason_type))}</strong>
            <span class="status-badge ${badgeCls}">${escapeHtml(st.toUpperCase())}</span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 4px;">
            Incoming Controller: <strong>${escapeHtml(r.replacement_controller_name)}</strong>${r.outgoing_controller_name ? ` (Relieving: ${escapeHtml(r.outgoing_controller_name)})` : ''}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            Requested by ${escapeHtml(r.requested_by_name)} · ${winText}${r.notes ? ' · ' + escapeHtml(r.notes) : ''}
          </div>
          ${actionBtns}
        </div>
      `;
    }).join('');
  }

  function resolveRollCallRoleCategory(rc) {
    if (rc && rc.role_category) return rc.role_category;
    const r = String((rc && rc.role) || (rc && rc.role_display) || '').toLowerCase();
    if (r.includes('stock_manager') || r.includes('site manager') || r.includes('admin') || r.includes('project_manager') || r.includes('tech_lead') || r.includes('technical lead') || r === 'manager') {
      return 'supervisor';
    }
    if (r.includes('stock_controller') || r.includes('gate controller')) {
      return 'controller';
    }
    if (r.includes('technician') || r.includes('sound') || r.includes('lighting') || r.includes('video') || r.includes('stage') || r.includes('rigging')) {
      return 'technician';
    }
    return 'crew';
  }

  function buildRollCallListHtml(list, emptyText = 'No crew members are currently checked in on-site.') {
    if (!Array.isArray(list) || list.length === 0) {
      return `<div style="padding: 24px; text-align: center; font-size: 12px; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 8px;">${escapeHtml(emptyText)}</div>`;
    }
    const rawRole = String(state.currentUser?.role || '').toLowerCase();
    const canManageCheckout = isCurrentUserAdmin() || isCurrentUserStockManager() || rawRole === 'manager' || rawRole === 'project_manager';

    return list.map((rc) => {
      const cat = resolveRollCallRoleCategory(rc);
      const catBadgeClass = cat === 'supervisor'
        ? 'status-badge-amber-sm'
        : (cat === 'controller' ? 'status-badge-purple-sm' : (cat === 'technician' ? 'status-badge-blue-sm' : 'status-badge-neutral-sm'));
      const phoneStr = rc.phone ? String(rc.phone).trim() : '';
      const telHref = phoneStr ? `tel:${escapeHtml(phoneStr.replace(/[^+\d]/g, ''))}` : '';
      const actionHtml = canManageCheckout
        ? `<button type="button" class="gate-btn gate-btn-checkout js-rollcall-checkout-btn" data-badge="${escapeHtml(rc.badge_code)}">Checkout Now</button>`
        : `<span class="status-badge status-badge-green-sm">On-Site ✓</span>`;

      return `
      <div class="timeline-event-card" style="align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="avatar-circle avatar-jl">${escapeHtml(rc.initials)}</div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-size: 12px; font-weight: 700;">${escapeHtml(rc.full_name)}</span>
              <span class="status-badge ${catBadgeClass}">${escapeHtml(rc.role_display)}</span>
              <span class="tier-code-badge tier-code-${escapeHtml(rc.clearance_code)}">${escapeHtml(rc.clearance_code)}</span>
              <span class="badge-code-primary">${escapeHtml(rc.badge_code)}</span>
            </div>
            <span style="font-size: 11px; color: var(--text-secondary);">
              ${escapeHtml(rc.department)} · At <strong>${escapeHtml(rc.checkpoint_name)}</strong>${phoneStr ? ` · <a href="${telHref}" style="color: var(--brand-primary); text-decoration: none; font-weight: 600;">${escapeHtml(phoneStr)}</a>` : ''}
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="ts-mini-pill in">In: ${escapeHtml(rc.check_in_time)}</span>
          ${actionHtml}
        </div>
      </div>
    `;
    }).join('');
  }

  function renderVenueSecurityPage() {
    const allVenues = state.checkpoints?.event_venues || [];
    const q = (state.vsSearch || '').trim().toLowerCase();
    const venues = q
      ? allVenues.filter((v) => `${v.name} ${v.title || ''} ${v.location || ''} ${v.tech_lead || ''} ${v.project_manager || ''} ${v.date || ''}`.toLowerCase().includes(q))
      : allVenues;
    const rcList = state.rollCallList || [];
    const crewList = state.crew || [];
    const venueOnsite = rcList.filter((r) => String(r.checkpoint_type || '') === 'event_venue');
    const venueControllers = crewList.filter((c) => String(c.assigned_checkpoint_type || '') === 'event_venue' && Number(c.is_active ?? 1) !== 0);
    const activeVenue = state.checkpointType === 'event_venue'
      ? (allVenues.find((v) => String(v.id) === String(state.checkpointId)) || allVenues[0])
      : allVenues[0];
    const canManageVenues = canCurrentUserAssignEvents();

    const addVenueBtn = document.getElementById('vs-add-venue-btn');
    const inlineVenueBtn = document.getElementById('hub-add-venue-inline-btn');
    if (addVenueBtn) addVenueBtn.style.display = (canManageVenues && state.eventsHubTab === 'venues') ? 'inline-flex' : 'none';
    if (inlineVenueBtn) inlineVenueBtn.style.display = canManageVenues ? 'inline-flex' : 'none';

    const elTotal = document.getElementById('vs-kpi-venues');
    const elOnsite = document.getElementById('vs-kpi-onsite');
    const elCtrls = document.getElementById('vs-kpi-controllers');
    const elCt = document.getElementById('vs-kpi-calltime');
    const elCtCp = document.getElementById('vs-kpi-calltime-cp');
    const elBadge = document.getElementById('vs-stations-count-badge');
    const gridEl = document.getElementById('vs-venues-grid');

    if (elTotal) elTotal.textContent = String(allVenues.length);
    if (elOnsite) elOnsite.textContent = String(venueOnsite.length);
    if (elCtrls) elCtrls.textContent = String(venueControllers.length);
    if (elCt) elCt.textContent = activeVenue?.call_time || '08:00';
    if (elCtCp) elCtCp.textContent = activeVenue ? activeVenue.name : 'No Event Venue';
    if (elBadge) elBadge.textContent = `${venues.length} Venues`;

    const perPage = state.vsPerPage || 10;
    state.vsPage = renderCardGridPagination({
      footerEl: document.getElementById('vs-results-footer'),
      controlsEl: document.getElementById('vs-page-controls'),
      totalItems: venues.length,
      currentPage: state.vsPage || 1,
      perPage,
      itemNoun: 'event venue',
      onPageChange: (p) => {
        state.vsPage = p;
        renderVenueSecurityPage();
      },
    });

    if (!gridEl) return;
    if (venues.length === 0) {
      gridEl.innerHTML = allVenues.length === 0
        ? '<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No Event Venues registered yet. Click "+ Add Event Venue" to create one.</div>'
        : '<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No Event Venues match your search query.</div>';
      return;
    }

    const startIdx = ((state.vsPage || 1) - 1) * perPage;
    const pagedVenues = venues.slice(startIdx, startIdx + perPage);

    gridEl.innerHTML = pagedVenues.map((v) => {
      const onsiteCount = rcList.filter((r) => String(r.checkpoint_type) === 'event_venue' && String(r.checkpoint_id) === String(v.id)).length;
      const assignedCtrls = crewList.filter((c) => String(c.assigned_checkpoint_type || '') === 'event_venue' && String(c.assigned_checkpoint_id || '') === String(v.id));
      const ctrlLabel = assignedCtrls.length > 0
        ? assignedCtrls.map((u) => escapeHtml(u.full_name)).join(', ')
        : (v.lead_name ? escapeHtml(v.lead_name) : 'Unassigned');
      const venueIdAttr = escapeHtml(String(v.raw_id || v.id));
      const crudRow = canManageVenues
        ? `<button type="button" class="btn btn-secondary-32-sm js-vs-edit-venue" data-venue-id="${venueIdAttr}" title="Edit Event Venue">Edit</button>
           <button type="button" class="btn btn-secondary-32-sm js-vs-delete-venue" data-venue-id="${venueIdAttr}" data-venue-title="${escapeHtml(v.title || v.name)}" title="Delete Event Venue" style="color: #dc2626; border-color: #fecaca;">Del</button>`
        : '';
      const thumbStrip = v.image
        ? `<div style="height: 88px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #312e81;"><img src="${escapeHtml(v.image)}" alt="${escapeHtml(v.title || v.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.style.display='none';" /></div>`
        : '';
      const sDate = v.start_date || v.date || '';
      const eDate = v.end_date || sDate;
      const durLbl = v.duration_label || computeEventDuration(sDate, eDate).label;
      const dateSpanText = sDate ? (sDate === eDate ? `${sDate} · ${durLbl}` : `${sDate} → ${eDate} · ${durLbl}`) : '';
      return `
        <div style="border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; background: var(--surface-white); display: flex; flex-direction: column; gap: 10px;">
          ${thumbStrip}
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <div>
              <strong style="font-size: 14px; color: var(--text-primary);">${escapeHtml(v.title || v.name)}</strong>
              <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(v.location || v.venue_location || 'Kigali Event Venue')}${dateSpanText ? ' · ' + escapeHtml(dateSpanText) : ''}</div>
            </div>
            <span class="status-badge ${onsiteCount > 0 ? 'status-badge-green-sm' : 'status-badge-purple-sm'}">${onsiteCount} On-Site</span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 3px;">
            <span>Call Time: <strong>${escapeHtml(v.call_time || '08:00')} CAT</strong> · Assigned: <strong>${Number(v.assigned_count || 0)}</strong></span>
            <span>Gate Controller / Lead: <strong>${ctrlLabel}</strong></span>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; padding-top: 6px;">
            <button type="button" class="btn btn-primary-32 js-vs-launch-kiosk" data-cp-id="${escapeHtml(String(v.id))}" data-cp-name="${escapeHtml(v.name)}" style="flex: 1 1 120px;">
              Launch Kiosk
            </button>
            <button type="button" class="btn btn-secondary-32-sm js-vs-edit-calltime" data-cp-id="${escapeHtml(String(v.id))}" data-cp-name="${escapeHtml(v.name)}" data-call-time="${escapeHtml(v.call_time || '08:00')}">
              Call Time
            </button>
            ${crudRow}
          </div>
        </div>
      `;
    }).join('');
  }

  function toDatetimeLocalValue(mysqlOrIso) {
    if (!mysqlOrIso) {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const clean = String(mysqlOrIso).trim().replace(' ', 'T');
    return clean.length >= 16 ? clean.slice(0, 16) : clean;
  }

  function openTimelineCrudModal(item = null) {
    const modal = document.getElementById('timeline-crud-modal');
    if (!modal) return;

    const titleEl = document.getElementById('tl-crud-modal-title');
    const idEl = document.getElementById('tl-crud-id');
    const inIdEl = document.getElementById('tl-crud-in-id');
    const outIdEl = document.getElementById('tl-crud-out-id');
    const userSel = document.getElementById('tl-crud-user');
    const cpSel = document.getElementById('tl-crud-checkpoint');
    const modeSel = document.getElementById('tl-crud-mode');
    const accessSel = document.getElementById('tl-crud-access');
    const punctSel = document.getElementById('tl-crud-punctuality');
    const inTimeEl = document.getElementById('tl-crud-in-time');
    const outTimeEl = document.getElementById('tl-crud-out-time');
    const outWrapEl = document.getElementById('tl-crud-out-time-wrap');
    const inLabelEl = document.getElementById('tl-crud-in-label');
    const denialWrapEl = document.getElementById('tl-crud-denial-wrap');
    const denialEl = document.getElementById('tl-crud-denial');
    const notesEl = document.getElementById('tl-crud-notes');

    if (userSel) {
      userSel.innerHTML = (state.crew || []).map((c) =>
        `<option value="${Number(c.id)}">${escapeHtml(c.full_name)} (${escapeHtml(c.badge_code || '')})</option>`
      ).join('');
    }
    if (cpSel) {
      cpSel.innerHTML = buildCheckpointSelectOptionsHtml(
        item ? `${item.checkpoint_type || 'stock_warehouse'}:${item.checkpoint_id || 1}` : `${state.checkpointType}:${state.checkpointId}`
      );
    }

    const syncModeFields = () => {
      const m = modeSel ? modeSel.value : 'check_in';
      const acc = accessSel ? accessSel.value : 'granted';
      const isSess = m === 'session_complete' && acc === 'granted';
      if (outWrapEl) outWrapEl.style.display = isSess ? 'block' : 'none';
      if (inLabelEl) {
        inLabelEl.textContent = isSess
          ? 'Check-In Timestamp *'
          : (m === 'check_out' ? 'Check-Out Timestamp *' : 'Scan Timestamp *');
      }
      if (denialWrapEl) denialWrapEl.style.display = acc === 'denied' ? 'block' : 'none';
    };

    if (item) {
      const inId = Number(item._inLogId || (item.scan_action === 'check_in' ? item.id : 0));
      const outId = Number(item._outLogId || (item.scan_action === 'check_out' ? item.id : 0));
      const isSess = item.scan_action === 'session_complete' || (inId > 0 && outId > 0);
      if (titleEl) titleEl.textContent = `Edit Activity Log: ${item.full_name || 'Staff'}`;
      if (idEl) idEl.value = String(item.id || 0);
      if (inIdEl) inIdEl.value = String(inId);
      if (outIdEl) outIdEl.value = String(outId);
      if (userSel && item.user_id) userSel.value = String(item.user_id);
      if (modeSel) modeSel.value = isSess ? 'session_complete' : (item.scan_action || 'check_in');
      if (accessSel) accessSel.value = item.access_status || 'granted';
      if (punctSel) punctSel.value = item.punctuality_status || 'on_time';
      if (inTimeEl) inTimeEl.value = toDatetimeLocalValue(item._inScannedAt || item.scanned_at);
      if (outTimeEl) outTimeEl.value = toDatetimeLocalValue(item._outScannedAt || item.scanned_at);
      if (denialEl) denialEl.value = item.denial_reason || '';
      if (notesEl) notesEl.value = item.notes || '';
    } else {
      if (titleEl) titleEl.textContent = 'Add Gate Activity Log';
      if (idEl) idEl.value = '0';
      if (inIdEl) inIdEl.value = '0';
      if (outIdEl) outIdEl.value = '0';
      if (modeSel) modeSel.value = 'session_complete';
      if (accessSel) accessSel.value = 'granted';
      if (punctSel) punctSel.value = 'on_time';
      const nowVal = toDatetimeLocalValue('');
      if (inTimeEl) inTimeEl.value = nowVal;
      if (outTimeEl) outTimeEl.value = nowVal;
      if (denialEl) denialEl.value = '';
      if (notesEl) notesEl.value = '';
    }

    syncModeFields();
    modal.style.display = 'flex';
  }

  function closeTimelineCrudModal() {
    const modal = document.getElementById('timeline-crud-modal');
    if (modal) modal.style.display = 'none';
  }

  function openVenueCrudModal(venue = null) {
    const modal = document.getElementById('venue-crud-modal');
    if (!modal) return;
    const titleHead = document.getElementById('venue-crud-modal-title');
    const idEl = document.getElementById('venue-crud-id');
    const titleEl = document.getElementById('venue-crud-title');
    const locEl = document.getElementById('venue-crud-location');
    const dateEl = document.getElementById('venue-crud-date');
    const endDateEl = document.getElementById('venue-crud-end-date');
    const durEl = document.getElementById('venue-crud-duration');
    const ctEl = document.getElementById('venue-crud-calltime');
    const pinEl = document.getElementById('venue-crud-pin');
    const tlEl = document.getElementById('venue-crud-techlead');
    const pmEl = document.getElementById('venue-crud-pm');
    const coordEl = document.getElementById('venue-crud-coordinator');
    const radEl = document.getElementById('venue-crud-radius');
    const latEl = document.getElementById('venue-crud-lat');
    const lngEl = document.getElementById('venue-crud-lng');
    const crewBox = document.getElementById('venue-crud-crew-list');

    const assignedSet = new Set((venue && Array.isArray(venue.assigned_technicians) ? venue.assigned_technicians : []).map(Number));
    if (crewBox) {
      crewBox.innerHTML = (state.crew || []).map((c) => `
        <label class="nav-crud-role-opt">
          <input type="checkbox" class="js-venue-crud-crew-cb" value="${Number(c.id)}" ${assignedSet.has(Number(c.id)) ? 'checked' : ''} />
          <span>${escapeHtml(c.full_name)} (${escapeHtml(c.role_display || c.role)})</span>
        </label>
      `).join('');
    }

    resetDropzone('venue');
    const rmImgEl = document.getElementById('venue-crud-remove-image');
    const delModalBtn = document.getElementById('venue-crud-delete-btn');
    const subModalBtn = document.getElementById('venue-crud-submit-btn');
    if (rmImgEl) rmImgEl.value = '0';
    const todayIso = new Date().toISOString().slice(0, 10);
    if (venue) {
      const startIso = venue.start_date || venue.date || todayIso;
      const endIso = venue.end_date || startIso;
      if (titleHead) titleHead.textContent = `Edit Event: ${venue.title || venue.name}`;
      if (idEl) idEl.value = String(venue.raw_id || venue.id || '');
      if (titleEl) titleEl.value = venue.title || venue.name || '';
      if (locEl) locEl.value = venue.location || '';
      if (dateEl) dateEl.value = startIso;
      if (endDateEl) {
        endDateEl.min = startIso;
        endDateEl.value = endIso;
      }
      if (durEl) durEl.value = venue.duration_label || computeEventDuration(startIso, endIso).label;
      if (ctEl) ctEl.value = venue.call_time || '08:00';
      if (pinEl) {
        pinEl.value = venue.terminal_pin || '';
        pinEl.placeholder = 'Leave blank to keep existing PIN';
      }
      if (subModalBtn) subModalBtn.textContent = 'Save Event Changes';
      if (delModalBtn) delModalBtn.style.display = canCurrentUserAssignEvents() ? 'inline-flex' : 'none';
      if (radEl) radEl.value = String(venue.geofence_radius_m || 200);
      if (latEl) latEl.value = venue.lat !== null && venue.lat !== undefined ? String(venue.lat) : '';
      if (lngEl) lngEl.value = venue.lng !== null && venue.lng !== undefined ? String(venue.lng) : '';
      const polEl = document.getElementById('venue-crud-checkin-policy');
      const visEl = document.getElementById('venue-crud-visual-match');
      if (polEl) polEl.value = venue.checkin_policy || 'hybrid';
      if (visEl) visEl.checked = Number(venue.require_visual_match ?? 1) === 1;
      const reqB = (venue.requirements && venue.requirements.branches) || {};
      ['video', 'sound', 'lighting', 'electrical', 'rigging', 'interpretation'].forEach((k) => {
        const inp = document.getElementById(`venue-req-${k}`);
        const cap = k.charAt(0).toUpperCase() + k.slice(1);
        if (inp) inp.value = String(reqB[cap] || 0);
      });
      const rNotes = document.getElementById('venue-req-notes');
      if (rNotes) rNotes.value = (venue.requirements && venue.requirements.notes) || '';
      populateLeadershipSelect(tlEl, venue.tech_lead || venue.lead_name || '', 'techlead');
      populateLeadershipSelect(pmEl, venue.project_manager || '', 'pm');
      populateLeadershipSelect(coordEl, venue.event_coordinator || '', 'coordinator');
      if (venue.image) {
        setDropzonePreview('venue', venue.image, venue.image.split('/').pop());
      }
    } else {
      if (titleHead) titleHead.textContent = 'Add Event Venue Station';
      if (idEl) idEl.value = '';
      if (titleEl) titleEl.value = '';
      if (locEl) locEl.value = '';
      if (dateEl) dateEl.value = todayIso;
      if (endDateEl) {
        endDateEl.min = todayIso;
        endDateEl.value = todayIso;
      }
      if (durEl) durEl.value = '1 day';
      if (ctEl) ctEl.value = '08:00';
      if (pinEl) {
        pinEl.value = '1234';
        pinEl.placeholder = 'e.g. 1234';
      }
      if (subModalBtn) subModalBtn.textContent = 'Save Event Venue';
      if (delModalBtn) delModalBtn.style.display = 'none';
      if (radEl) radEl.value = '200';
      if (latEl) latEl.value = '';
      if (lngEl) lngEl.value = '';
      const polEl = document.getElementById('venue-crud-checkin-policy');
      const visEl = document.getElementById('venue-crud-visual-match');
      if (polEl) polEl.value = 'hybrid';
      if (visEl) visEl.checked = true;
      ['video', 'sound', 'lighting', 'electrical', 'rigging', 'interpretation'].forEach((k) => {
        const inp = document.getElementById(`venue-req-${k}`);
        if (inp) inp.value = '0';
      });
      const rNotes = document.getElementById('venue-req-notes');
      if (rNotes) rNotes.value = '';
      populateLeadershipSelect(tlEl, '', 'techlead');
      populateLeadershipSelect(pmEl, '', 'pm');
      populateLeadershipSelect(coordEl, '', 'coordinator');
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
  }

  function closeVenueCrudModal() {
    const modal = document.getElementById('venue-crud-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
    }
  }

  function renderShiftReliefPage() {
    const reqs = state.shiftRequests || [];
    const pendingReqs = reqs.filter((r) => String(r.status || 'pending').toLowerCase() === 'pending');
    const approvedReqs = reqs.filter((r) => String(r.status || '').toLowerCase() === 'approved');
    const controllers = (state.crew || []).filter((c) => String(c.role || '').toLowerCase() === 'stock_controller' && Number(c.is_active ?? 1) !== 0);
    const whs = state.checkpoints.stock_warehouses || [];
    const evs = state.checkpoints.event_venues || [];
    const allCps = [...whs.map((w) => ({ ...w, type: 'stock_warehouse', typeLabel: 'Facility Gate' })), ...evs.map((e) => ({ ...e, type: 'event_venue', typeLabel: 'Event Venue' }))];

    const elPend = document.getElementById('page-sr-kpi-pending');
    const elAppr = document.getElementById('page-sr-kpi-approved');
    const elCtrl = document.getElementById('page-sr-kpi-controllers');
    const elCps = document.getElementById('page-sr-kpi-checkpoints');
    const pillEl = document.getElementById('page-sr-pending-summary-pill');
    const rosterPillEl = document.getElementById('page-sr-roster-count');
    if (elPend) elPend.textContent = String(pendingReqs.length);
    if (elAppr) elAppr.textContent = String(approvedReqs.length);
    if (elCtrl) elCtrl.textContent = String(controllers.length);
    if (elCps) elCps.textContent = String(allCps.length);
    if (pillEl) pillEl.textContent = `${pendingReqs.length} Pending`;
    if (rosterPillEl) rosterPillEl.textContent = `${allCps.length} Checkpoints`;

    const cpSel = document.getElementById('page-sr-checkpoint-select');
    if (cpSel) {
      const prev = cpSel.value || `${state.checkpointType}:${state.checkpointId}`;
      cpSel.innerHTML = buildCheckpointSelectOptionsHtml(prev);
      syncShiftControllersForCheckpoint(cpSel.value, 'page-sr-replacement-select', 'page-sr-outgoing-select');
    }

    const filterStatus = state.srFilterStatus || 'all';
    const filteredReqs = filterStatus === 'all'
      ? reqs
      : reqs.filter((r) => String(r.status || 'pending').toLowerCase() === filterStatus);
    const listEl = document.getElementById('page-shift-request-list');
    if (listEl) {
      listEl.innerHTML = buildShiftRequestListHtml(filteredReqs, canCurrentUserApproveShiftRequests());
    }

    const rosterEl = document.getElementById('page-sr-assignments-list');
    if (rosterEl) {
      rosterEl.innerHTML = allCps.map((cp) => {
        const assigned = (state.crew || []).filter((u) => String(u.assigned_checkpoint_type || '') === cp.type && String(u.assigned_checkpoint_id || '') === String(cp.id));
        const namesHtml = assigned.length > 0
          ? assigned.map((u) => `<span class="status-badge status-badge-green-sm" style="margin: 2px 4px 2px 0;">${escapeHtml(u.full_name)}</span>`).join('')
          : '<span style="font-size: 11.5px; color: var(--text-muted);">No assigned controller</span>';
        return `
          <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; background: var(--surface-white);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
              <strong style="font-size: 13px; color: var(--text-primary);">${escapeHtml(cp.name)}</strong>
              <span class="status-badge ${cp.type === 'stock_warehouse' ? 'status-badge-blue-sm' : 'status-badge-purple-sm'}" style="font-size: 10px;">${escapeHtml(cp.typeLabel)}</span>
            </div>
            <div>${namesHtml}</div>
          </div>
        `;
      }).join('');
    }
  }

  function renderCallTimePage() {
    const allCps = state.checkpoints.directory || [];
    const activeCp = state.activeCheckpoint || allCps[0] || { type: 'stock_warehouse', id: 1, name: 'Checkpoint', call_time: '08:00' };
    const times = allCps.map((c) => String(c.call_time || '08:00')).sort();

    const elActive = document.getElementById('page-ct-kpi-active');
    const elActiveName = document.getElementById('page-ct-kpi-active-name');
    const elTotal = document.getElementById('page-ct-kpi-total');
    const elEarliest = document.getElementById('page-ct-kpi-earliest');
    const elListCount = document.getElementById('page-ct-list-count');
    if (elActive) elActive.textContent = activeCp.call_time || '08:00';
    if (elActiveName) elActiveName.textContent = activeCp.name || 'Active Checkpoint';
    if (elTotal) elTotal.textContent = String(allCps.length);
    if (elEarliest) elEarliest.textContent = times[0] || '08:00';
    if (elListCount) elListCount.textContent = `${allCps.length} Sites`;

    const selEl = document.getElementById('page-ct-cp-select');
    const typeInp = document.getElementById('page-ct-cp-type');
    const idInp = document.getElementById('page-ct-cp-id');
    const timeInp = document.getElementById('page-ct-input');
    const targetNameEl = document.getElementById('page-ct-target-name');
    const targetBadgeEl = document.getElementById('page-ct-target-type');

    if (selEl) {
      const currentVal = selEl.value || `${activeCp.type}:${activeCp.id}`;
      selEl.innerHTML = buildCheckpointSelectOptionsHtml(currentVal);
      const [selType, selId] = (selEl.value || `${activeCp.type}:${activeCp.id}`).split(':');
      const found = allCps.find((c) => c.type === selType && String(c.id) === String(selId)) || activeCp;
      if (typeInp) typeInp.value = found.type;
      if (idInp) idInp.value = found.id;
      if (targetNameEl) targetNameEl.textContent = found.name;
      if (targetBadgeEl) {
        const isStock = found.type === 'stock_warehouse';
        targetBadgeEl.textContent = isStock ? 'Stock Warehouse' : 'Event Venue';
        targetBadgeEl.className = `status-badge ${isStock ? 'status-badge-green-sm' : 'status-badge-purple-sm'}`;
      }
      if (timeInp && !timeInp.matches(':focus')) {
        timeInp.value = found.call_time || '08:00';
      }
    }

    const rowsEl = document.getElementById('page-calltime-schedule-rows');
    if (rowsEl) {
      rowsEl.innerHTML = allCps.length === 0
        ? '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">No checkpoints found.</div>'
        : allCps.map((cp) => {
            const isStock = cp.type === 'stock_warehouse';
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface-white); flex-wrap: wrap;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <strong style="font-size: 13px; color: var(--text-primary);">${escapeHtml(cp.name)}</strong>
                    <span class="status-badge ${isStock ? 'status-badge-green-sm' : 'status-badge-purple-sm'}" style="font-size: 10px;">${isStock ? 'Facility Gate' : 'Event Venue'}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Scheduled Call Time: <strong>${escapeHtml(cp.call_time || '08:00')} CAT</strong> · 15m Grace Window</div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn btn-secondary-32-sm js-page-ct-load" data-cp-key="${escapeHtml(cp.type + ':' + cp.id)}">Edit</button>
                  <button type="button" class="btn btn-secondary-32-sm js-page-ct-row-extend" data-cp-type="${escapeHtml(cp.type)}" data-cp-id="${escapeHtml(String(cp.id))}" data-mins="15">+15m</button>
                </div>
              </div>
            `;
          }).join('');
    }
  }

  function renderRollCallPage() {
    const rcList = state.rollCallList || [];
    const stockOnsite = rcList.filter((r) => String(r.checkpoint_type || '') === 'stock_warehouse');
    const venueOnsite = rcList.filter((r) => String(r.checkpoint_type || '') === 'event_venue');
    const occupiedSites = new Set(rcList.map((r) => `${r.checkpoint_type || ''}:${r.checkpoint_id || r.checkpoint_name}`));

    const elStock = document.getElementById('page-rc-kpi-stock');
    const elVenues = document.getElementById('page-rc-kpi-venues');
    const elSites = document.getElementById('page-rc-kpi-sites');
    if (elStock) elStock.textContent = String(stockOnsite.length);
    if (elVenues) elVenues.textContent = String(venueOnsite.length);
    if (elSites) elSites.textContent = String(occupiedSites.size);

    const canSharePortal = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserTechLead();
    const shareBtn = document.getElementById('page-rc-share-btn');
    if (shareBtn) shareBtn.style.display = canSharePortal ? 'inline-flex' : 'none';

    const kioskBtn = document.getElementById('page-rc-open-kiosk-btn');
    if (kioskBtn) kioskBtn.style.display = isCurrentUserTechnician() ? 'none' : 'inline-flex';

    // Update role category filter counts
    const roleCounts = { all: rcList.length, supervisor: 0, controller: 0, technician: 0, crew: 0 };
    rcList.forEach((rc) => {
      const cat = resolveRollCallRoleCategory(rc);
      if (Object.prototype.hasOwnProperty.call(roleCounts, cat)) {
        roleCounts[cat] += 1;
      } else {
        roleCounts.crew += 1;
      }
    });
    Object.keys(roleCounts).forEach((k) => {
      const el = document.getElementById(`rc-tab-count-${k}`);
      if (el) el.textContent = String(roleCounts[k]);
    });

    const activeRoleCat = state.rollCallRoleFilter || 'all';
    document.querySelectorAll('#page-rc-role-pills .js-rc-role-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-role-cat') === activeRoleCat);
    });

    const cpFilterEl = document.getElementById('page-rc-cp-filter');
    if (cpFilterEl) {
      const prev = state.rollCallCpFilter || cpFilterEl.value || 'all';
      const allCps = state.checkpoints.directory || [];
      cpFilterEl.innerHTML = '<option value="all">All Checkpoints</option>' +
        allCps.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
      if (Array.from(cpFilterEl.options).some((o) => o.value === prev)) {
        cpFilterEl.value = prev;
      }
    }

    const q = (state.rollCallSearch || '').trim().toLowerCase();
    const cpFilter = state.rollCallCpFilter || 'all';
    const filtered = rcList.filter((rc) => {
      if (activeRoleCat !== 'all' && resolveRollCallRoleCategory(rc) !== activeRoleCat) return false;
      if (cpFilter !== 'all' && String(rc.checkpoint_name || '') !== cpFilter) return false;
      if (q) {
        const hay = `${rc.full_name} ${rc.badge_code} ${rc.role_display} ${rc.department} ${rc.checkpoint_name} ${rc.phone || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const listEl = document.getElementById('page-rollcall-list');
    if (listEl) {
      listEl.innerHTML = buildRollCallListHtml(filtered, rcList.length === 0 ? 'No crew members are currently checked in on-site.' : 'No on-site personnel match your selected role, checkpoint, or search filter.');
    }

    renderRandomRollCallPanel();
  }

  function renderRandomRollCallPanel() {
    const scopeSel = document.getElementById('rc-scope-select');
    const wrapEl = document.getElementById('random-rollcall-sessions-wrap');
    const controlsBar = document.getElementById('rc-controls-bar');
    const canManage = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserEventCommand() || isCurrentUserTechLead() || isCurrentUserStockController();
    if (controlsBar) controlsBar.style.display = canManage ? 'flex' : 'none';

    if (scopeSel) {
      const prev = scopeSel.value || 'all|all';
      const cps = state.checkpoints?.directory || [];
      scopeSel.innerHTML = '<option value="all|all">All Checkpoints</option>' +
        cps.map((c) => `<option value="${escapeHtml(`${c.type}|${c.raw_id || c.id}`)}">${escapeHtml(c.name)}</option>`).join('');
      if (Array.from(scopeSel.options).some((o) => o.value === prev)) {
        scopeSel.value = prev;
      }
    }

    if (!wrapEl) return;
    const sessions = state.rollCallSessions || [];
    if (!sessions.length) {
      wrapEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">No Random Roll-Call sessions launched yet. Click <strong>🎲 Trigger Random Roll-Call</strong> to randomly sample checked-in staff.</div>';
      return;
    }

    wrapEl.innerHTML = sessions.slice(0, 4).map((sess) => {
      const c = sess.counts || {};
      const st = String(sess.status || 'active');
      const statusBadge = st === 'active'
        ? '<span class="status-badge status-badge-amber-sm">ACTIVE WINDOW</span>'
        : (st === 'awaiting_review' ? '<span class="status-badge status-badge-red-sm">AWAITING REVIEW</span>' : '<span class="status-badge status-badge-green-sm">CLOSED</span>');
      const entriesHtml = (sess.entries || []).map((ent) => {
        const est = String(ent.status || 'pending');
        const pillCls = est === 'present' ? 'confirmed' : ((est === 'pending' || est === 'excused') ? 'pending' : 'declined');
        const metaInfo = [
          ent.department || '',
          ent.checkpoint_name || '',
          ent.verification_method ? `Method: ${ent.verification_method}` : '',
          ent.distance_m !== null && ent.distance_m !== undefined ? `${ent.distance_m}m` : '',
        ].filter(Boolean).join(' · ');
        const supActions = canManage ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${est !== 'present' ? `<button type="button" class="btn btn-secondary-32-sm js-rc-scan-pass" data-entry-id="${Number(ent.id)}" title="Scan presenter's live 30s Pass QR">📷 Scan Pass QR</button>` : ''}
            ${est !== 'present' ? `<button type="button" class="btn btn-secondary-32-sm js-rc-resolve" data-entry-id="${Number(ent.id)}" data-decision="present" style="color:#047857;border-color:#a7f3d0;">✓ Present</button>` : ''}
            ${est !== 'absent' ? `<button type="button" class="btn btn-secondary-32-sm js-rc-resolve" data-entry-id="${Number(ent.id)}" data-decision="absent" style="color:#dc2626;border-color:#fecaca;">✕ Absent &amp; Out</button>` : ''}
            ${(est === 'timed_out' || est === 'absent') ? `<button type="button" class="btn btn-secondary-32-sm js-rc-resolve" data-entry-id="${Number(ent.id)}" data-decision="excused">↺ Restore IN</button>` : ''}
          </div>
        ` : '';
        return `
          <div class="rc-entry-row">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong style="font-size:12.5px;">${escapeHtml(ent.full_name)}</strong>
                <span class="assign-status-pill ${pillCls}">${escapeHtml(est.replace('_', ' '))}</span>
              </div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${escapeHtml(metaInfo)}</div>
            </div>
            ${supActions}
          </div>
        `;
      }).join('');

      return `
        <div class="rc-session-card">
          <div class="rc-session-head">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong style="font-size:13.5px;">Roll-Call #${Number(sess.id)} · ${escapeHtml(sess.checkpoint_name)}</strong>
                ${statusBadge}
                <span style="font-size:11.5px;color:var(--text-secondary);">By ${escapeHtml(sess.triggered_by_name || 'Supervisor')}</span>
              </div>
              <div style="font-size:11.5px;color:var(--text-secondary);margin-top:3px;">
                Present: <strong>${c.present || 0}</strong> · Pending: <strong>${c.pending || 0}</strong> · Timed Out / Auto-Out: <strong>${c.timed_out || 0}</strong> · Absent: <strong>${c.absent || 0}</strong> · Deadline: ${escapeHtml(sess.deadline_at || '')}
              </div>
            </div>
            ${canManage && st !== 'closed' ? `<button type="button" class="btn btn-secondary-32-sm js-rc-close-session" data-session-id="${Number(sess.id)}">Close Session</button>` : ''}
          </div>
          ${entriesHtml}
        </div>
      `;
    }).join('');

    wrapEl.querySelectorAll('.js-rc-resolve').forEach((btn) => {
      btn.addEventListener('click', () => resolveRollCallEntryApi(btn.getAttribute('data-entry-id'), btn.getAttribute('data-decision'), ''));
    });
    wrapEl.querySelectorAll('.js-rc-scan-pass').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tok = (window.prompt('Scan or paste staff member\'s live 30s ABPASS1 Pass QR token:') || '').trim();
        if (tok) resolveRollCallEntryApi(btn.getAttribute('data-entry-id'), 'present', tok);
      });
    });
    wrapEl.querySelectorAll('.js-rc-close-session').forEach((btn) => {
      btn.addEventListener('click', () => closeRollCallSessionApi(btn.getAttribute('data-session-id')));
    });
  }

  async function triggerRandomRollCallApi(overrides = null) {
    const scopeRaw = overrides?.scope || document.getElementById('rc-scope-select')?.value || 'all|all';
    const [cpType, cpId] = String(scopeRaw).split('|');
    const selMode = overrides?.selection_mode || document.getElementById('rc-mode-select')?.value || 'random_count';
    const sampleVal = Number(overrides?.sample_value || document.getElementById('rc-sample-value')?.value || 5);
    const deadlineMins = Number(overrides?.deadline_minutes || document.getElementById('rc-deadline-mins')?.value || 10);
    const autoOut = overrides?.auto_checkout_on_miss !== undefined
      ? (overrides.auto_checkout_on_miss ? 1 : 0)
      : (document.getElementById('rc-auto-checkout-chk')?.checked ? 1 : 0);
    try {
      const res = await fetch('api.php?action=start_random_roll_call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_random_roll_call',
          checkpoint_type: cpType || 'all',
          checkpoint_id: cpId || 'all',
          selection_mode: selMode,
          sample_value: sampleVal,
          deadline_minutes: deadlineMins,
          require_geo_or_qr: 1,
          auto_checkout_on_miss: autoOut,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || !data.ok) {
        showToast(data?.error || 'Could not start Random Roll-Call.');
        return;
      }
      applyBootstrapPayload(data, true);
      showToast(data.message || 'Random Roll-Call started.');
    } catch (err) {
      showToast('Network error starting Random Roll-Call.');
    }
  }

  async function resolveRollCallEntryApi(entryId, decision, passQrToken) {
    try {
      const res = await fetch('api.php?action=resolve_roll_call_entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_roll_call_entry',
          entry_id: Number(entryId),
          decision,
          pass_qr_token: passQrToken || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || !data.ok) {
        showToast(data?.error || 'Could not update Roll-Call entry.');
        return;
      }
      applyBootstrapPayload(data, true);
      showToast(data.message || 'Roll-Call updated.');
    } catch (err) {
      showToast('Network error updating Roll-Call.');
    }
  }

  async function closeRollCallSessionApi(sessionId) {
    const { confirmed } = await showConfirmModal({
      title: 'Close Random Roll-Call Session',
      message: 'Check out any remaining unanswered personnel from this Roll-Call session now?',
      confirmText: 'Auto Check-Out & Close',
      tone: 'warning',
    });
    if (!confirmed) return;
    try {
      const res = await fetch('api.php?action=close_roll_call_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_roll_call_session',
          session_id: Number(sessionId),
          auto_checkout_remaining: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || !data.ok) {
        showToast(data?.error || 'Could not close session.');
        return;
      }
      applyBootstrapPayload(data, true);
      showToast(data.message || 'Session closed.');
    } catch (err) {
      showToast('Network error closing Roll-Call session.');
    }
  }

  function renderStationLockPage() {
    const bannerEl = document.getElementById('page-station-lock-banner');
    const titleEl = document.getElementById('page-sl-status-title');
    const badgeEl = document.getElementById('page-sl-status-badge');
    const cpLabelEl = document.getElementById('page-sl-active-cp-label');
    const formCpEl = document.getElementById('page-sl-form-cp-name');
    const screenBadgeEl = document.getElementById('page-sl-screen-lock-badge');
    const activeName = state.activeCheckpoint?.name || 'Active Checkpoint';

    if (bannerEl) {
      bannerEl.classList.toggle('is-locked', Boolean(state.stationLocked));
      bannerEl.classList.toggle('is-unlocked', !state.stationLocked);
    }
    if (titleEl) {
      titleEl.textContent = state.stationLocked
        ? `Station Locked to ${activeName}`
        : 'Multi-Checkpoint Mode (Unlocked)';
    }
    if (badgeEl) {
      badgeEl.textContent = state.stationLocked ? 'LOCKED' : 'UNLOCKED';
      badgeEl.className = state.stationLocked ? 'status-badge status-badge-amber-sm' : 'status-badge status-badge-green-sm';
    }
    if (cpLabelEl) cpLabelEl.textContent = activeName;
    if (formCpEl) formCpEl.textContent = activeName;
    if (screenBadgeEl) {
      screenBadgeEl.textContent = state.terminalScreenLocked ? 'Terminal Screen: PIN Locked' : 'Terminal Screen: Unlocked';
    }

    const { items } = getManageablePinCheckpoints();
    const listEl = document.getElementById('page-warehouse-pin-list');
    const selEl = document.getElementById('page-wh-pin-select');
    if (listEl) {
      listEl.innerHTML = items.length === 0
        ? '<div style="font-size: 12px; color: var(--text-muted); padding: 12px;">No manageable terminal checkpoints found for your role.</div>'
        : items.map((item) => `
            <div class="warehouse-pin-row">
              <div class="warehouse-pin-row-info">
                <span class="warehouse-pin-row-name">${escapeHtml(item.name)}</span>
                <span class="warehouse-pin-row-sub">${escapeHtml(item.typeLabel)} · ${escapeHtml(item.code)}${item.location ? ` · ${escapeHtml(item.location)}` : ''}</span>
              </div>
              <div class="warehouse-pin-row-actions">
                <span class="warehouse-pin-code-pill">PIN: ${item.pin ? escapeHtml(item.pin) : 'Not Set'}</span>
                <button type="button" class="btn btn-secondary-32-sm js-page-edit-wh-pin-btn" data-cp-key="${escapeHtml(item.key)}" data-pin="${escapeHtml(item.pin)}">Edit</button>
              </div>
            </div>
          `).join('');
    }
    if (selEl) {
      const prevVal = selEl.value;
      const whItems = items.filter((i) => i.cpType === 'stock_warehouse');
      const evItems = items.filter((i) => i.cpType === 'event_venue');
      const renderOpt = (i) => `<option value="${escapeHtml(i.key)}">${escapeHtml(i.name)} (${escapeHtml(i.code)})</option>`;
      let html = '';
      if (whItems.length > 0) html += `<optgroup label="Facility Gates (Stock Warehouses)">${whItems.map(renderOpt).join('')}</optgroup>`;
      if (evItems.length > 0) html += `<optgroup label="Event Venues">${evItems.map(renderOpt).join('')}</optgroup>`;
      selEl.innerHTML = html || '<option value="">No checkpoints available</option>';

      const activeKey = `${state.checkpointType}:${state.checkpointId}`;
      if (prevVal && items.some((i) => i.key === prevVal)) selEl.value = prevVal;
      else if (items.some((i) => i.key === activeKey)) selEl.value = activeKey;
      else if (items.length > 0) selEl.value = items[0].key;

      const selectedItem = items.find((i) => i.key === selEl.value);
      const pinValInput = document.getElementById('page-wh-pin-value');
      if (pinValInput && selectedItem && !pinValInput.matches(':focus')) {
        pinValInput.value = selectedItem.pin;
      }
    }
  }

  function renderResetScansPage() {
    const elEvents = document.getElementById('page-reset-kpi-events');
    const elCrew = document.getElementById('page-reset-kpi-crew');
    if (elEvents) elEvents.textContent = String((state.activityTimeline || []).length);
    if (elCrew) elCrew.textContent = String((state.crew || []).length);
  }

  function renderCustomNavPage(targetKey = state.customNavScreenKey || state.activeScreen) {
    const titleEl = document.getElementById('custom-nav-page-title');
    const subEl = document.getElementById('custom-nav-page-subtitle');
    const manageBtn = document.getElementById('custom-nav-manage-btn');
    const bodyEl = document.getElementById('custom-nav-page-body');
    const item = (state.navigationConfig?.items || []).find((it) => String(it.nav_target) === String(targetKey));

    if (titleEl) titleEl.textContent = item ? item.label : `Workspace Page: ${targetKey || 'Custom'}`;
    if (subEl) {
      subEl.textContent = item
        ? `Sidebar group: ${(item.nav_group || 'main') === 'workspace' ? 'Checkpoint Controls' : 'Main Navigation'} · Route key: ${item.nav_target}`
        : 'Dedicated view rendered dynamically from Navigation Menu CRUD.';
    }
    if (manageBtn) {
      manageBtn.style.display = isCurrentUserAdmin() ? 'inline-flex' : 'none';
    }
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <strong style="font-size: 15px; color: var(--text-primary);">${escapeHtml(item ? item.label : (targetKey || 'Custom Page'))}</strong>
              <p style="font-size: 12.5px; color: var(--text-secondary); margin: 4px 0 0;">
                This dedicated page was automatically provisioned for navigation target <code>${escapeHtml(targetKey || 'custom')}</code>.
              </p>
            </div>
            <div>${formatNavRolesSummary(item ? item.allowed_roles : 'all')}</div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <div style="padding: 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-canvas);">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Active Checkpoint</div>
              <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${escapeHtml(state.activeCheckpoint?.name || 'Kigali Operations')}</div>
            </div>
            <div style="padding: 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-canvas);">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Personnel On-Site</div>
              <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${(state.rollCallList || []).length} Active Today</div>
            </div>
            <div style="padding: 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-canvas);">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Scheduled Call Time</div>
              <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${escapeHtml(state.activeCheckpoint?.call_time || '08:00')} CAT</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  const SYSTEM_FLOW_SPEC = [
    {
      id: 'portals',
      label: '1. Portals & Auth',
      subtitle: 'Four isolated entry points converge on api.php and db.php',
      branchPill: '4 Entry Points · 3 Session Scopes',
      nodes: [
        {
          step: 'ENTRY 1',
          short: 'login.php',
          summary: 'Sign In & Admin Sign Up',
          title: 'Authentication Gateway (login.php)',
          source: 'login.php + api.php (login, register)',
          route: 'POST api.php?action=login | register',
          detail: 'Authenticates username, email, or REW-BADGE-XXXX against users.password_hash / password. Protects logins with security_rate_limits (5 fails / 600s → 60s block). Roles stock_controller and technician redirect to index.php#pane-kiosk.',
          outcome: 'Sets $_SESSION["auth_user_id"] + CSRF token',
          tone: 'chip',
          jumpScreen: null,
        },
        {
          step: 'ENTRY 2',
          short: 'index.php',
          summary: 'Main Operations SPA Shell',
          title: 'Dashboard & Terminal Shell (index.php)',
          source: 'index.php + index.html + app.js',
          route: 'GET api.php?action=bootstrap (6s sync)',
          detail: 'Gates on auth_user_id, injects meta[name="csrf-token"] and theme preset cookie, then bootstraps full operational payload (crew, checkpoints, timeline, clearanceMatrix, navConfig, portals) and starts 6-second startLiveGateSync() polling.',
          outcome: 'Authenticated CSRF-protected workspace',
          tone: 'ok',
          jumpScreen: 'overview',
          jumpLabel: 'Open Gate Dashboard',
        },
        {
          step: 'ENTRY 3',
          short: 'gate.php',
          summary: 'Standalone Site Kiosks',
          title: 'Location-Locked Gate Terminals (gate.php)',
          source: 'ndera-gate.php / bk-arena-gate.php / kcc-gate.php',
          route: 'standalone_gate_unlock | feed | scan',
          detail: 'Operates without an operator login. Resolves site via standalone_portals / stock_locations, verifies dedicated terminal_pin (rate-limited), stores SHA-1 pin token in $_SESSION["standalone_gate_auth"][wh_id], and runs executeGateScan().',
          outcome: 'Isolated per-facility PIN session',
          tone: 'warn',
          jumpScreen: 'standalone-portals',
          jumpLabel: 'Open Gates & On-Site',
        },
        {
          step: 'ENTRY 4',
          short: 'onsite.php',
          summary: 'Read-Only Live Directory',
          title: 'Shareable On-Site Crew Portal (onsite.php)',
          source: 'onsite.php + api.php (onsite_portal_login)',
          route: 'GET api.php?action=onsite_public_feed (15s)',
          detail: 'Strictly isolated from auth_user_id. Unlocks via shared technician passcode (app_settings.onsite_share_password_hash, default TechSite@2026) and session version check. Admin/Site Manager can rotate password or revoke viewers.',
          outcome: 'Read-only live roll-call feed',
          tone: 'chip',
          jumpScreen: 'rollcall',
          jumpLabel: 'Open On-Site Roll-Call',
        },
        {
          step: 'DATA LAYER',
          short: 'db.php + MySQL',
          summary: 'ability_db / attendance_app',
          title: 'Database Bridge & Auto-Fallback (db.php)',
          source: 'db.php :: getDbConnection()',
          route: 'MySQL 127.0.0.1:3306 (PDO)',
          detail: 'Prefers ability_db when users table exists; otherwise auto-creates attendance_app and runs ensureAbilitySchemaAndSeed(). Legacy batch/stock inventory API endpoints return HTTP 410 Gone under Attendance-Only Deployment.',
          outcome: 'Tables auto-migrated & indexed',
          tone: 'ok',
          jumpScreen: null,
        },
      ],
    },
    {
      id: 'scan',
      label: '2. Scan Engine',
      subtitle: 'End-to-end badge scan, offline buffering, clearance evaluation & commit',
      branchPill: 'Online Sync + Offline Queue',
      nodes: [
        {
          step: 'STEP 1',
          short: 'Capture Input',
          summary: 'USB / Camera QR / Row',
          title: 'Multi-Channel Scan Capture',
          source: 'app.js :: triggerGateScan / scanCameraFrameLoop',
          route: '#kiosk-badge-input | BarcodeDetector | jsQR',
          detail: 'Captures USB scanner/keyboard input, live camera QR/Code-128 frames (250ms loop with 2.2s code debounce), or direct row click. Blocked immediately if state.terminalScreenLocked is true.',
          outcome: 'Badge, RFID UID, ABL code, or name',
          tone: 'chip',
          jumpScreen: 'terminals',
          jumpLabel: 'Open Terminals',
        },
        {
          step: 'STEP 2',
          short: 'Network Check',
          summary: 'Online vs localStorage Queue',
          title: 'Offline-First Queue Branch',
          source: 'app.js :: enqueueOfflineScan / syncOfflineScans',
          route: 'localStorage["ability_offline_scan_queue_v1"]',
          detail: 'If navigator.onLine is false or fetch fails with TypeError, queues scan with client timestamp offline_scanned_at. Server accepts offline timestamps up to 72h back and auto-syncs when window fires online.',
          outcome: 'Zero lost scans during Wi-Fi drops',
          tone: 'warn',
          jumpScreen: 'terminals',
          jumpLabel: 'Open Terminals',
        },
        {
          step: 'STEP 3',
          short: 'Lock & Match',
          summary: 'Controller lock + lookup',
          title: 'Operator Scope & Identity Lookup',
          source: 'api.php :: assertControllerCheckpointLock()',
          route: 'POST api.php?action=process_gate_scan',
          detail: 'Verifies operator role (admin/manager/stock_manager/tech_lead/stock_controller). For stock_controller, rejects scans outside assigned_checkpoint_type/id (HTTP 403), then resolves crew via findCrewMemberByScanInput().',
          outcome: 'Authenticated target & checkpoint',
          tone: 'chip',
          jumpScreen: null,
        },
        {
          step: 'STEP 4',
          short: 'Clearance Gate',
          summary: 'Status & L1–L4 Checkpoint Rules',
          title: 'Access Evaluation (evaluateCheckpointAccess)',
          source: 'api.php :: evaluateCheckpointAccess()',
          route: 'user_badges + checkpoint_type + id',
          detail: 'Requires badge_status === "active". At stock_warehouse gates, blocks L1 or stock_access_mode="none" and enforces allowed_stock_ids when "selected". At event_venue, permits unless venue_access_mode="none" (except L4).',
          outcome: 'Denied logs access_verify + reason',
          tone: 'err',
          jumpScreen: 'users',
          jumpSubTab: 'matrix',
          jumpLabel: 'Open Clearance Matrix',
        },
        {
          step: 'STEP 5',
          short: 'Dedup & Score',
          summary: '5s anti-double-scan + Call-Time',
          title: 'Deduplication & Punctuality Scoring',
          source: 'api.php :: executeGateScan()',
          route: 'attendance_logs (±5s check) + call_time',
          detail: 'Preserves prior scan if same user/checkpoint scanned within <= 5s (duplicate_prevented). Otherwise scores arrival vs call_time/open_time: < -10m Early, <= +15m On-Time, > +15m Late.',
          outcome: 'Early / On-Time / Late / Check-Out',
          tone: 'ok',
          jumpScreen: 'calltime',
          jumpLabel: 'Open Set Call Time',
        },
        {
          step: 'STEP 6',
          short: 'Commit & UI',
          summary: 'DB insert + Modal + Chime',
          title: 'Audit Write & 4s Kiosk Feedback',
          source: 'app.js :: renderVerificationDeck / playKioskChime',
          route: 'INSERT attendance_logs → #kiosk-modal-backdrop',
          detail: 'Writes immutable scan row, returns fresh bootstrap payload, plays Web Audio tone (approve/checkout/decline), opens centered verification modal with 4s countdown back to scanner.',
          outcome: 'Live KPIs, timeline & roll-call updated',
          tone: 'ok',
          jumpScreen: 'overview',
          jumpLabel: 'Open Activity Timeline',
        },
      ],
    },
    {
      id: 'transit',
      label: '3. State & Transit',
      subtitle: 'Paired daily attendance state machine, overnight shifts & cross-facility transfer',
      branchPill: '3 States · Auto-Transit',
      nodes: [
        {
          step: 'STATE 1',
          short: 'ready',
          summary: 'Not Yet Scanned Today',
          title: 'Initial State: Ready',
          source: 'api.php :: buildFullPayload()',
          route: 'No open check_in today or prior 18h',
          detail: 'Default daily_state for staff with no active check-in. An authorized auto scan at any permitted checkpoint resolves to check_in and starts their active shift.',
          outcome: 'Next auto scan → check_in',
          tone: 'chip',
          jumpScreen: 'attendees',
          jumpLabel: 'Open Staff ID Badges',
        },
        {
          step: 'STATE 2',
          short: 'checked_in',
          summary: 'On-Site (+18h Night Shift)',
          title: 'Active State: Checked In',
          source: 'api.php :: buildFullPayload()',
          route: 'attendance_logs (today + 18h overnight lookback)',
          detail: 'Places person into rollCallList, checkpoint on_site_now, Overview COS view, and onsite.php. Unclosed check_in logs up to 18h before midnight remain checked_in past 00:00 (NIGHT SHIFT ACTIVE).',
          outcome: 'Listed in Live On-Site Roll-Call',
          tone: 'ok',
          jumpScreen: 'rollcall',
          jumpLabel: 'Open On-Site Roll-Call',
        },
        {
          step: 'BRANCH A',
          short: 'Same Gate → Out',
          summary: 'State transitions to checked_out',
          title: 'Same-Checkpoint Exit Scan',
          source: 'api.php :: executeGateScan()',
          route: 'scan_action = check_out (same cpType & cpId)',
          detail: 'Re-scanning at the same facility/venue transitions daily_state to checked_out, stamps check_out_time, logs SHIFT CHECK-OUT, and removes the user from active on-site headcount.',
          outcome: 'State → checked_out · Duration pairable',
          tone: 'warn',
          jumpScreen: 'terminals',
          jumpLabel: 'Open Terminals',
        },
        {
          step: 'BRANCH B',
          short: 'New Gate → Transit',
          summary: 'Auto Check-Out A + Check-In B',
          title: 'Cross-Facility Auto-Transit Transfer',
          source: 'api.php :: executeGateScan() + confirm_gate_action()',
          route: '2 logs: check_out (prev) + check_in (new)',
          detail: 'If a checked_in person scans at a different checkpoint without checking out first, executeGateScan() inserts a check_out at the previous gate ("Transit departure → Transferred") AND a check_in at the new gate.',
          outcome: 'Seamless multi-site custody continuity',
          tone: 'chip',
          jumpScreen: 'events',
          jumpLabel: 'Open Checkpoints & Venues',
        },
        {
          step: 'MANUAL FLOW',
          short: 'Row Preview',
          summary: 'Override / Late Lockout',
          title: 'Manual Kiosk Decision & Late Override',
          source: 'app.js :: openKioskModal + api.php :: confirm_gate_action',
          route: 'POST api.php?action=confirm_gate_action',
          detail: 'Clicking a crew table row opens unconfirmed preview with Approve In/Out, Decline Entry, and Supervisor Override. Declining with "late" sets badge_status="disabled_late"; Supervisor Override checks password/PIN, logs late_override, and reactivates badge.',
          outcome: 'Accountable late-entry exceptions',
          tone: 'err',
          jumpScreen: 'attendees',
          jumpLabel: 'Open Staff ID Badges',
        },
      ],
    },
    {
      id: 'locks',
      label: '4. Locks & Relief',
      subtitle: 'Three layers of terminal locking and tracked Gate Controller handover approval',
      branchPill: '3 Lock Layers · Relief Queue',
      nodes: [
        {
          step: 'LOCK 1',
          short: 'Lock-on-Entry',
          summary: 'Auto-locks #pane-kiosk',
          title: 'Terminal Screen Lock-on-Entry',
          source: 'app.js :: switchScreen() + renderTerminalLockScreen()',
          route: 'POST api.php?action=verify_terminal_pin',
          detail: 'Entering Terminals forces state.terminalScreenLocked = true, hiding the call-time quickbar and scanner input behind a live clock screen. Unlocks only after server verifies the active site terminal_pin (5 tries / 10m rate limit).',
          outcome: 'Prevents unattended desk scans',
          tone: 'warn',
          jumpScreen: 'terminals',
          jumpLabel: 'Open Terminals',
        },
        {
          step: 'LOCK 2',
          short: 'Station Lock',
          summary: 'Pins browser to 1 site',
          title: 'Browser Station Lock (PIN)',
          source: 'app.js :: submitStationLockToggle()',
          route: 'localStorage["ability_station_locked"] + PIN',
          detail: 'Admin, Site Manager, or Tech Lead enters the checkpoint PIN to lock or unlock checkpoint switching across that browser workstation, keeping shared gate laptops pinned to one checkpoint.',
          outcome: 'Stops accidental gate switching',
          tone: 'chip',
          jumpScreen: 'station-lock',
          jumpLabel: 'Open Station Lock (PIN)',
        },
        {
          step: 'LOCK 3',
          short: 'Controller DB Lock',
          summary: 'Server-enforced gate scope',
          title: 'Gate Controller Server Lock',
          source: 'api.php :: assertControllerCheckpointLock()',
          route: 'users.assigned_checkpoint_type & _id',
          detail: 'Every stock_controller session is locked server-side across bootstrap, scans, confirmations, PIN verify, and attendance_report to their assigned checkpoint. Cross-gate calls return HTTP 403.',
          outcome: 'Strict per-gate separation of duty',
          tone: 'err',
          jumpScreen: null,
        },
        {
          step: 'HANDOVER 1',
          short: 'Shift Request',
          summary: 'Relief / Sick / Night Swap',
          title: 'Submit Relief or Swap Request',
          source: 'api.php :: request_controller_shift()',
          route: 'INSERT controller_shift_requests (pending)',
          detail: 'Controllers, Tech Leads, Site Managers, or Admins submit a target checkpoint, replacement controller, reason (sick_leave, shift_swap, high_volume, night_shift, new_assignment), and optional shift_start/end.',
          outcome: 'Queued for Supervisor review + alert',
          tone: 'chip',
          jumpScreen: 'shift-relief',
          jumpLabel: 'Open Shift Relief & Swaps',
        },
        {
          step: 'HANDOVER 2',
          short: 'Approve & Swap',
          summary: 'Reassigns DB checkpoint',
          title: 'Review & Execute Controller Handover',
          source: 'api.php :: review_controller_shift()',
          route: 'UPDATE controller_shift_requests + users',
          detail: 'Only Admin or Site Manager (stock_manager) can approve/reject. Approval updates replacement users.assigned_checkpoint_* + assignment_expires_at, updates stock_locations.controller_name, and clears outgoing controller assignment.',
          outcome: 'Instant audited terminal transfer',
          tone: 'ok',
          jumpScreen: 'shift-relief',
          jumpLabel: 'Open Shift Relief Queue',
        },
      ],
    },
    {
      id: 'rbac',
      label: '5. RBAC & Sync',
      subtitle: 'Server-enforced role scoping, dynamic navigation, shift pairing & alert state',
      branchPill: 'Server RBAC · Dynamic Nav',
      nodes: [
        {
          step: 'ROLE 1',
          short: 'Admin / Mgr',
          summary: 'Full System & Matrix CRUD',
          title: 'System Administrator & Manager',
          source: 'api.php :: canCallerPerformAction()',
          route: 'admin, administrator, manager',
          detail: 'Full access to clearance tiers (L1–L4+), roles, departments, navigation_items CRUD, switch_user, user deletion, Station Lock page, and password-confirmed reset_today_scans.',
          outcome: 'Max Assignable Tier: L4+',
          tone: 'ok',
          jumpScreen: 'users',
          jumpSubTab: 'roles',
          jumpLabel: 'Open Roles Matrix',
        },
        {
          step: 'ROLE 2',
          short: 'Lead & Site Mgr',
          summary: 'Scoped L1–L2 / L1–L3 Delegation',
          title: 'Technical Lead & Site Manager',
          source: 'api.php :: canCallerPerformAction() + app.js',
          route: 'tech_lead | stock_manager',
          detail: 'tech_lead sets venue call-times, assigns event rosters (assign_event_crew), and onboards L1/L2 tech crew. stock_manager manages warehouses/portals, timeline CRUD, onsite.php config, relief approvals, and L1–L3 onboarding.',
          outcome: 'Enforced server-side on every POST',
          tone: 'chip',
          jumpScreen: 'events',
          jumpLabel: 'Open Checkpoints & Venues',
        },
        {
          step: 'ROLE 3',
          short: 'Controller & Crew',
          summary: 'Terminal vs Self-Badge Scope',
          title: 'Gate Controller & Field Crew',
          source: 'api.php :: getDefaultNavigationItems() + app.js',
          route: 'stock_controller | technician | crew',
          detail: 'stock_controller operates #pane-kiosk, Checkpoints, Badges, Roll-Call, Portals, and Shift Relief requests; cannot create users or edit tiers. Crew/technicians are scoped to Staff ID Badges, Terminals, and On-Site Roll-Call.',
          outcome: 'Strict least-privilege UI + API',
          tone: 'warn',
          jumpScreen: 'attendees',
          jumpLabel: 'Open Staff ID Badges',
        },
        {
          step: 'NAV ENGINE',
          short: 'Dynamic Nav',
          summary: 'Consolidated Sidebar (MySQL)',
          title: 'Database-Driven Navigation & Hub Routing',
          source: 'api.php :: ensureNavigationTables() + app.js :: switchScreen()',
          route: 'navigation_items + app_settings',
          detail: 'Renders Main Navigation and Checkpoint Controls from MySQL navigation_items. Legacy routes (analytics, access-matrix, stock-manager, venue-security) cleanly redirect to consolidated hubs.',
          outcome: 'Live enable/disable & custom pages',
          tone: 'chip',
          jumpScreen: 'users',
          jumpSubTab: 'navigation',
          jumpLabel: 'Open Navigation CRUD',
        },
        {
          step: 'REPORT & ALERTS',
          short: 'Reports & Reads',
          summary: 'Shift Pairing & Alert State',
          title: 'Multi-Range Attendance Reports & Alerts',
          source: 'api.php :: attendance_report + mark_notifications_read',
          route: 'today | night_shift | 7d | custom',
          detail: 'Pairs check_in → check_out durations across Today, Night Shift (18:00–09:00), 7d, or Custom dates for CSV/Print sign-off. Admin bell alerts track pending relief, denied/late scans, and persist read state in user_notification_reads.',
          outcome: 'Audited shift hours & persistent alerts',
          tone: 'ok',
          jumpScreen: 'overview',
          jumpLabel: 'Open Gate Dashboard',
        },
      ],
    },
    {
      id: 'relief_geo_totp',
      label: '5. Geo-QR & TOTP Relief',
      subtitle: 'Single-use GPS Geo-Fenced QR tokens paired with RFC 6238 Authenticator codes and automatic expiry',
      branchPill: 'GPS Haversine (200m) + 6-Digit TOTP + Shift End Expiry',
      nodes: [
        {
          step: 'ENROLL 2FA',
          short: 'TOTP Secret',
          summary: 'RFC 6238 6-Digit Setup',
          title: 'Authenticator Secret Enrollment',
          source: 'api.php :: totp_setup + totp_verify_enable',
          route: 'user_totp_secrets (Base32)',
          detail: 'Operator enrolls Google Authenticator / Authy via otpauth://totp QR generated offline by AbilityQRCode. Server verifies 6-digit HMAC-SHA1 30s rotating code via computeTotpCode().',
          outcome: 'TOTP verified & stored per user',
          tone: 'chip',
          jumpScreen: 'settings',
          jumpSettingsTab: 'relief',
          jumpLabel: 'Open Relief Geo-QR',
        },
        {
          step: 'ISSUE QR',
          short: 'Relief Token',
          summary: 'Single-Use SHA-256 Handover',
          title: 'Generate Geo-Fenced Relief QR Token',
          source: 'api.php :: generate_relief_qr',
          route: 'relief_qr_tokens + controller_shift_requests',
          detail: 'Supervisor selects Relief Controller, Checkpoint, radius (default 200m), duration, and outputs relief.php?token=... while storing SHA-256 token hash.',
          outcome: 'Pending relief QR ready for field scan',
          tone: 'warn',
          jumpScreen: 'settings',
          jumpSettingsTab: 'relief',
          jumpLabel: 'Generate QR Token',
        },
        {
          step: 'FIELD SCAN',
          short: 'relief.php',
          summary: 'Geo-Fence + PIN Fallback',
          title: 'Checkpoint GPS Proximity Verification',
          source: 'relief.php + db.php :: calculateHaversineMeters',
          route: 'POST api.php?action=redeem_relief_qr',
          detail: 'Validates live GPS distance against checkpoint lat/lng within geofence_radius_m, or verifies checkpoint Terminal Override PIN indoors if GPS is unavailable.',
          outcome: 'Proximity / override confirmed',
          tone: 'chip',
          jumpScreen: 'shift-relief',
          jumpLabel: 'Open Shift Relief',
        },
        {
          step: 'ACTIVATE & EXPIRE',
          short: 'Auto-Expire',
          summary: 'Atomic Redemption & Revoke',
          title: 'Temporary Assignment & Expiry Enforcement',
          source: 'db.php :: expireStaleShiftAssignments',
          route: 'users.assignment_expires_at',
          detail: 'Marks QR token redeemed_at in transaction, updates assigned checkpoint + assignment_expires_at, and automatically revokes access when shift_end elapses.',
          outcome: 'Time-boxed relief custody active',
          tone: 'ok',
          jumpScreen: 'terminals',
          jumpLabel: 'Open Gate Terminal',
        },
      ],
    },
    {
      id: 'hierarchy_pwa',
      label: '6. Hierarchy, Links & PWA',
      subtitle: 'Command tree (PM/Coordinator → Tech Lead → 6 Depts → Support), link policies, branding, & offline/PWA',
      branchPill: '6 Tech Depts · Policy Links · IndexedDB Offline · Android/iOS PWA',
      nodes: [
        {
          step: 'COMMAND FLOW',
          short: 'Dispatch Tree',
          summary: 'PM → Tech Lead → 6 Depts → Support',
          title: 'Operational Dispatch & Department Hierarchy',
          source: 'db.php :: ensureDepartmentsTable + api.php :: save_event',
          route: 'events.event_coordinator + assigned_roster_json',
          detail: 'Maps Project Manager / Event Coordinator → Technical Lead → Technicians across Video, Sound, Lighting, Electrical, Rigging, and Interpretation → Support Staff.',
          outcome: 'Structured venue roster dispatch',
          tone: 'chip',
          jumpScreen: 'settings',
          jumpSettingsTab: 'dispatch',
          jumpLabel: 'View Dispatch Hierarchy',
        },
        {
          step: 'SHARED LINKS',
          short: 'Best For & Limits',
          summary: 'Portal Suitability & Expiry',
          title: 'Shared Link Policies & Phone Masking',
          source: 'standalone_portals + api.php :: onsite_public_feed',
          route: 'best_for + permissions_summary + mask_phones',
          detail: 'Defines Best For audience, Permissions & Limitations, Read-Only scan lock (allow_scan), phone number masking, and automatic expiration (expires_at) on shared portals.',
          outcome: 'Auditable external portal scope',
          tone: 'warn',
          jumpScreen: 'settings',
          jumpSettingsTab: 'links',
          jumpLabel: 'Inspect Shared Links',
        },
        {
          step: 'BRANDING',
          short: 'Themes & Tokens',
          summary: 'Colours, Fonts, Alignment & Mode',
          title: 'Global Branding & Accessibility Studio',
          source: 'db.php :: renderBrandingHeadHtml + app.js',
          route: 'POST api.php?action=save_branding_config',
          detail: 'Applies brand colours, offline-safe font family/scale, text alignment, Dark/Light default, High Contrast, and Reduced Motion across SPA + standalone PHP portals.',
          outcome: 'Consistent multi-portal styling',
          tone: 'chip',
          jumpScreen: 'settings',
          jumpSettingsTab: 'branding',
          jumpLabel: 'Open Branding Studio',
        },
        {
          step: 'OFFLINE & PWA',
          short: 'Android & iOS',
          summary: 'IndexedDB Cache vs Online Only',
          title: 'Offline Badge Verification & Installable PWA',
          source: 'sw.js + manifest.webmanifest + ability_offline_v1',
          route: 'Cache API + IndexedDB scan_queue',
          detail: 'Caches non-sensitive verification rosters for offline lookup and queues gate terminal scans until reconnect, while locking mutating Online-Only actions offline.',
          outcome: 'Resilient mobile field PWA',
          tone: 'ok',
          jumpScreen: 'settings',
          jumpSettingsTab: 'pwa',
          jumpLabel: 'Open PWA Setup',
        },
      ],
    },
  ];

  const SETTINGS_SECTIONS = ['flow', 'relief', 'dispatch', 'links', 'branding', 'accounts', 'pwa', 'controls'];

  function renderSvgQrInto(el, text) {
    if (!el) return;
    if (window.AbilityQRCode && typeof window.AbilityQRCode.toSvg === 'function') {
      el.innerHTML = window.AbilityQRCode.toSvg(String(text || ''), 176);
    } else {
      el.textContent = String(text || '');
    }
  }

  function switchSettingsTab(tab = 'flow') {
    const nextTab = SETTINGS_SECTIONS.includes(tab) ? tab : 'flow';
    state.settingsTab = nextTab;
    SETTINGS_SECTIONS.forEach((key) => {
      const btn = document.getElementById(`settings-tab-${key}`);
      const pane = document.getElementById(`settings-pane-${key}`);
      const isAct = nextTab === key;
      if (btn) {
        btn.className = isAct ? 'btn btn-primary-32 js-settings-tab-btn active-subtab' : 'btn btn-secondary-32 js-settings-tab-btn';
        const ic = btn.querySelector('img');
        if (ic) ic.style.filter = isAct ? 'brightness(0) invert(1)' : 'none';
      }
      if (pane) {
        pane.style.display = isAct ? 'block' : 'none';
      }
    });
    const secSelect = document.getElementById('settings-section-select');
    if (secSelect && secSelect.value !== nextTab) {
      secSelect.value = nextTab;
    }
    const flowSubSel = document.getElementById('settings-flow-subselect');
    const flowSubSep = document.getElementById('settings-flow-subsep');
    if (flowSubSel) flowSubSel.style.display = nextTab === 'flow' ? 'inline-block' : 'none';
    if (flowSubSep) flowSubSep.style.display = nextTab === 'flow' ? 'inline' : 'none';
    document.querySelectorAll('.nav-subitem[data-settings-section]').forEach((subEl) => {
      subEl.classList.toggle('active', subEl.getAttribute('data-settings-section') === nextTab);
    });
    renderSettingsScreen();
  }

  function renderSettingsReliefSection() {
    const totpPill = document.getElementById('totp-status-pill');
    const btnShowDisable = document.getElementById('btn-totp-show-disable');
    if (totpPill) {
      totpPill.textContent = state.totpEnabled ? '2FA Enabled' : 'Not Enrolled';
      totpPill.className = 'status-badge ' + (state.totpEnabled ? 'status-badge-green-sm' : 'status-badge-amber-sm');
    }
    if (btnShowDisable) {
      btnShowDisable.style.display = state.totpEnabled ? 'inline-flex' : 'none';
    }

    const userSel = document.getElementById('relief-qr-user');
    if (userSel) {
      const prevVal = userSel.value;
      const eligible = (state.crew || []).filter((c) => Number(c.is_active ?? 1) !== 0);
      userSel.innerHTML = '<option value="">Select Relief Controller...</option>' +
        eligible.map((c) => `<option value="${Number(c.id)}">${escapeHtml(c.full_name)} (${escapeHtml(c.role_display || c.role)})</option>`).join('');
      if (prevVal) userSel.value = prevVal;
    }

    const cpSel = document.getElementById('relief-qr-checkpoint');
    const whs = (state.checkpoints?.stock_warehouses || []).map((w) => Object.assign({}, w, { type: 'stock_warehouse', typeLabel: 'Facility Gate' }));
    const evs = (state.checkpoints?.event_venues || []).map((e) => Object.assign({}, e, { type: 'event_venue', typeLabel: 'Event Venue' }));
    const allCps = [...whs, ...evs];
    if (cpSel) {
      const prevCp = cpSel.value;
      cpSel.innerHTML = '<option value="">Select Checkpoint...</option>' +
        allCps.map((cp) => `<option value="${escapeHtml(cp.type)}:${escapeHtml(String(cp.raw_id || cp.id))}" data-radius="${Number(cp.geofence_radius_m || 200)}">${escapeHtml(cp.name)} (${escapeHtml(cp.typeLabel)})</option>`).join('');
      if (prevCp) cpSel.value = prevCp;
    }

    const geoListEl = document.getElementById('relief-checkpoint-geo-list');
    if (geoListEl) {
      const canEditGeo = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserTechLead();
      geoListEl.innerHTML = allCps.map((cp) => {
        const cpKey = `${cp.type}:${cp.raw_id || cp.id}`;
        const latVal = cp.lat !== null && cp.lat !== undefined ? String(cp.lat) : '';
        const lngVal = cp.lng !== null && cp.lng !== undefined ? String(cp.lng) : '';
        const radVal = Number(cp.geofence_radius_m || 200);
        return `
          <div style="border:1px solid var(--border-color);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <div>
                <strong style="font-size:13px;">${escapeHtml(cp.name)}</strong>
                <span class="status-badge status-badge-blue-sm" style="margin-left:6px;">${escapeHtml(cp.typeLabel)}</span>
              </div>
              <span style="font-size:11px;color:var(--text-muted);">${latVal && lngVal ? `${latVal}, ${lngVal}` : 'GPS Not Set'} · ${radVal}m</span>
            </div>
            ${canEditGeo ? `
            <div style="display:grid;grid-template-columns:1fr 1fr 90px auto auto;gap:6px;align-items:center;">
              <input type="number" step="0.000001" class="form-input js-geo-lat" data-cp-key="${escapeHtml(cpKey)}" placeholder="Lat" value="${escapeHtml(latVal)}" style="height:32px;font-size:12px;" />
              <input type="number" step="0.000001" class="form-input js-geo-lng" data-cp-key="${escapeHtml(cpKey)}" placeholder="Lng" value="${escapeHtml(lngVal)}" style="height:32px;font-size:12px;" />
              <input type="number" min="50" max="5000" class="form-input js-geo-rad" data-cp-key="${escapeHtml(cpKey)}" value="${radVal}" style="height:32px;font-size:12px;" title="Radius (meters)" />
              <button type="button" class="btn btn-secondary-32-sm js-geo-capture-btn" data-cp-key="${escapeHtml(cpKey)}" title="Capture Browser GPS">GPS</button>
              <button type="button" class="btn btn-primary-32 js-geo-save-btn" data-cp-key="${escapeHtml(cpKey)}" data-cp-type="${escapeHtml(cp.type)}" data-cp-id="${escapeHtml(String(cp.raw_id || cp.id))}" data-online-only="1">Save</button>
            </div>` : ''}
          </div>
        `;
      }).join('');
    }

    const histEl = document.getElementById('relief-qr-history-list');
    if (histEl) {
      const toks = state.reliefTokens || [];
      if (!toks.length) {
        histEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:10px;">No Geo-Fenced Relief QR tokens issued yet.</div>';
      } else {
        histEl.innerHTML = toks.map((t) => {
          const stClass = t.redeemed_at ? 'status-badge-green-sm' : (t.is_expired ? 'status-badge-red-sm' : 'status-badge-amber-sm');
          const stText = t.redeemed_at ? 'Redeemed' : (t.is_expired ? 'Expired' : 'Active');
          return `
            <div style="border:1px solid var(--border-color);border-radius:10px;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <div>
                <div style="font-size:12.5px;font-weight:700;">${escapeHtml(t.target_name || 'Controller')} → ${escapeHtml(t.checkpoint_name || '')}</div>
                <div style="font-size:11px;color:var(--text-secondary);">Radius ${Number(t.geofence_radius_m || 200)}m · ${t.require_totp ? 'TOTP Required' : 'Geo Only'}${t.distance_m !== null && t.distance_m !== undefined ? ` · Verified at ${t.distance_m}m` : ''}${t.override_used ? ' · PIN Override' : ''}</div>
              </div>
              <div style="text-align:right;">
                <span class="status-badge ${stClass}">${stText}</span>
                <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;">Exp: ${escapeHtml(t.expires_at || '—')}</div>
                ${state.sessionReliefUrls && state.sessionReliefUrls[t.id] && !t.redeemed_at && !t.is_expired ? `<a href="${escapeHtml(state.sessionReliefUrls[t.id])}" target="_blank" style="font-size:11px;font-weight:700;display:inline-block;margin-top:3px;">Open ↗</a>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function renderDispatchViews() {
    renderSettingsDispatchSection();
    renderDispatchFlowPage();
  }

  function getDispatchContextData(pickedId = '') {
    const events = state.checkpoints?.event_venues || [];
    const resolvedId = pickedId && events.some((ev) => String(ev.raw_id || ev.id) === String(pickedId))
      ? String(pickedId)
      : (state.selectedDispatchEventId && events.some((ev) => String(ev.raw_id || ev.id) === String(state.selectedDispatchEventId))
        ? String(state.selectedDispatchEventId)
        : (events[0] ? String(events[0].raw_id || events[0].id) : ''));

    const activeEv = events.find((ev) => String(ev.raw_id || ev.id) === resolvedId) || null;
    const assignedSet = activeEv && Array.isArray(activeEv.assigned_technicians)
      ? new Set(activeEv.assigned_technicians.map(Number))
      : null;
    const pool = assignedSet
      ? (state.crew || []).filter((c) => assignedSet.has(Number(c.id)))
      : (state.crew || []);

    const pmName = activeEv?.project_manager || ((state.crew || []).find((c) => c.role === 'project_manager')?.full_name || 'Project Manager');
    const coordName = activeEv?.event_coordinator || ((state.crew || []).find((c) => c.role === 'event_coordinator')?.full_name || 'Event Coordinator');
    const tlName = activeEv?.tech_lead || activeEv?.lead_name || ((state.crew || []).find((c) => isUserAssignedTechLeadRole(c))?.full_name || 'Technical Lead');

    const deptNames = ['Video', 'Sound', 'Lighting', 'Electrical', 'Rigging', 'Interpretation'];
    const deptMatches = (c, d) => {
      const dep = String(c.department || '').toLowerCase();
      const role = String(c.role || '').toLowerCase();
      if (d === 'Sound') return dep.includes('sound') || dep.includes('audio') || role.includes('sound') || role === 'technician';
      if (d === 'Video') return dep.includes('video') || role.includes('video');
      if (d === 'Lighting') return dep.includes('light') || role.includes('light');
      if (d === 'Electrical') return dep.includes('elect') || role.includes('elect');
      if (d === 'Rigging') return dep.includes('rig') || role.includes('rig');
      if (d === 'Interpretation') return dep.includes('interp') || role.includes('interp');
      return dep === d.toLowerCase();
    };
    const techDeptMemberCount = deptNames.reduce((acc, dn) => acc + pool.filter((c) => deptMatches(c, dn)).length, 0);
    const supportList = pool.filter((c) => {
      const dep = String(c.department || '').toLowerCase();
      const role = String(c.role || '').toLowerCase();
      return role === 'support_staff' || dep.includes('support') || role === 'user' || role === 'driver' || role === 'security';
    });

    const asgMap = (activeEv && state.eventCrewAssignments && state.eventCrewAssignments[String(activeEv.raw_id || activeEv.id)]) || {};
    const formatMemberBadge = (m) => {
      const rec = asgMap[String(m.id)];
      if (!rec) return escapeHtml(m.full_name);
      const st = String(rec.confirmation_status || 'pending');
      const icon = st === 'confirmed' ? '✓' : (st === 'declined' ? '✕' : '⏳');
      return `${escapeHtml(m.full_name)} <span class="assign-status-pill ${escapeHtml(st)}">${icon}</span>`;
    };

    const evId = activeEv ? String(activeEv.raw_id || activeEv.id) : '';
    const supportReqs = (state.eventSupportRequests || []).filter((r) => !evId || String(r.event_id) === evId);
    const evLogs = (state.eventDispatchLogs || []).filter((l) => !evId || String(l.event_id) === evId);
    const pendingSupportCount = supportReqs.filter((r) => r.status === 'pending').length;
    const confirmedCount = Object.values(asgMap).filter((rec) => String(rec?.confirmation_status || '') === 'confirmed').length;
    const durLabel = activeEv?.duration_label || computeEventDuration(activeEv?.start_date || activeEv?.date, activeEv?.end_date).label;

    const nodes = [
      {
        tierKey: 'tier1_command',
        step: 'TIER 1 · COMMAND',
        tone: 'chip',
        short: activeEv ? (activeEv.title || activeEv.name) : 'Create Event & Command',
        summary: `PM: ${pmName} · ${durLabel}`,
        title: `Tier 1 · Command Initiation (${pmName} / ${coordName})`,
        source: activeEv ? `${activeEv.location || 'Venue'} · ${activeEv.start_date || activeEv.date || ''} → ${activeEv.end_date || activeEv.start_date || activeEv.date || ''} (${durLabel})` : 'Create Event & Dispatch Initiation',
        route: 'Create Event (Dates & Auto Duration, Cover, Tech Lead) → Send Branch Targets',
        detail: 'Project Managers and Event Coordinators create events, set call times & duration, assign the system-filtered Tech Lead, and issue department headcount requirements.',
        outcome: activeEv ? `Status: ${String(activeEv.dispatch_status || 'draft').replace(/_/g, ' ').toUpperCase()}` : 'Ready for Event Creation',
        jumpScreen: 'create-event',
        jumpLabel: 'Open Create Event Tab',
      },
      {
        tierKey: 'tier2_tech_lead',
        step: 'TIER 2 · TECH LEAD',
        tone: activeEv?.tech_lead ? 'ok' : 'warn',
        short: tlName,
        summary: 'System Role-Filtered Tech Lead',
        title: `Tier 2 · Technical Supervision (${tlName})`,
        source: 'Filtered from users assigned Tech Lead system role',
        route: 'Review Requirements → Allocate 6 Dept Technicians → Request Support Manpower',
        detail: 'The Tech Lead receives production targets from Tier 1, staffs specialists across Video, Sound, Lighting, Electrical, Rigging, and Interpretation, and submits Tier 4 support requests.',
        outcome: activeEv?.tech_lead ? `Assigned Lead: ${tlName}` : 'Assign Tech Lead in Create Event',
        jumpScreen: 'create-event',
        jumpLabel: 'Edit Event & Tech Lead',
      },
      {
        tierKey: 'tier3_technicians',
        step: 'TIER 3 · 6 DEPTS',
        tone: techDeptMemberCount > 0 ? 'ok' : 'warn',
        short: '6 Tech Departments',
        summary: `Video · Sound · Light · Power · Rig · Interp (${techDeptMemberCount})`,
        title: `Tier 3 · 6 Technical Branches (${techDeptMemberCount} Assigned)`,
        source: 'Video · Sound · Lighting · Electrical · Rigging · Interpretation',
        route: 'Confirm Deployment Slot → Anti-Shadowing Gate Check-In → Respond to Roll-Call',
        detail: 'Specialty branch technicians view shift call times, confirm deployment readiness, and verify attendance at the event venue checkpoint via QR or supervisor gate check-in.',
        outcome: `${techDeptMemberCount} Technical Crew Assigned`,
      },
      {
        tierKey: 'tier4_support',
        step: 'TIER 4 · SUPPORT',
        tone: pendingSupportCount > 0 ? 'warn' : (supportList.length > 0 ? 'ok' : 'chip'),
        short: `Support Staff (${supportList.length})`,
        summary: pendingSupportCount > 0 ? `${pendingSupportCount} Pending Request(s)` : 'Logistics, Runners & Security Pool',
        title: `Tier 4 · Ground Support & Fulfillment (${supportList.length} Assigned)`,
        source: 'Operations Drivers, Runners & Venue Security',
        route: 'Request Submitted by Tier 1/2 → Fulfilled by Site Manager → Venue Gate Access Only',
        detail: 'Support crew fulfill general logistics and staging runs at assigned event venues while L1 perimeter rules automatically block unauthorized warehouse entry.',
        outcome: pendingSupportCount > 0 ? `${pendingSupportCount} Request(s) Pending` : `${supportList.length} Support Members Ready`,
      },
      {
        tierKey: 'site_ops',
        step: 'TIER 5 · AUDIT',
        tone: confirmedCount > 0 || evLogs.length > 0 ? 'ok' : 'chip',
        short: 'Readiness & Gate Sync',
        summary: `${confirmedCount} Confirmed · ${evLogs.length} Audit Logs`,
        title: 'Tier 5 · Readiness Audit & Gate Checkpoint Sync',
        source: 'Live Gate Terminals, Confirmation Pills & Audit Log',
        route: 'Crew Confirmations → Gate Check-In Sync → Random Roll-Call & Export',
        detail: 'Aggregates crew confirmation statuses, terminal check-in telemetry, and chronological dispatch audit trail across all leadership tiers and checkpoints.',
        outcome: `${confirmedCount} Confirmed · ${evLogs.length} Logged Actions`,
        jumpScreen: 'terminals',
        jumpLabel: 'Launch Gate Terminal',
      },
    ];

    return {
      events,
      resolvedId,
      activeEv,
      pool,
      pmName,
      coordName,
      tlName,
      deptNames,
      deptMatches,
      techDeptMemberCount,
      supportList,
      asgMap,
      formatMemberBadge,
      evLogs,
      supportReqs,
      confirmedCount,
      nodes,
    };
  }

  function syncDispatchEventSelect(selEl, ctx) {
    if (!selEl) return;
    selEl.innerHTML = '<option value="">All Crew Department Pool</option>' +
      ctx.events.map((ev) => `<option value="${escapeHtml(String(ev.raw_id || ev.id))}">${escapeHtml(ev.title || ev.name)}</option>`).join('');
    if (ctx.resolvedId) {
      selEl.value = ctx.resolvedId;
    }
  }

  function renderDispatchPipelineInto(diagramEl, inspectorEl, statusPillEl, ctx) {
    if (!diagramEl) return;
    const selTier = state.selectedDispatchTier || 'tier1_command';
    let activeIdx = ctx.nodes.findIndex((n) => n.tierKey === selTier);
    if (activeIdx < 0) activeIdx = 0;
    const activeNode = ctx.nodes[activeIdx];

    if (statusPillEl) {
      statusPillEl.textContent = ctx.activeEv
        ? `${ctx.activeEv.title || ctx.activeEv.name} · ${ctx.activeEv.duration_label || '1 day'}`
        : 'All Events Pool';
    }

    diagramEl.innerHTML = ctx.nodes.map((n, idx) => `
      <button type="button" class="flow-pipeline-node${idx === activeIdx ? ' is-active' : ''}" data-node-idx="${idx}" data-dispatch-tier="${escapeHtml(n.tierKey)}">
        <div class="flow-node-top">
          <span class="flow-step-badge tone-${escapeHtml(n.tone)}">${escapeHtml(n.step)}</span>
          <span class="flow-node-arrow">${idx < ctx.nodes.length - 1 ? '→' : '●'}</span>
        </div>
        <div class="flow-node-short">${escapeHtml(n.short)}</div>
        <div class="flow-node-summary">${escapeHtml(n.summary)}</div>
      </button>
    `).join('');

    diagramEl.querySelectorAll('.flow-pipeline-node').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedDispatchTier = btn.getAttribute('data-dispatch-tier') || 'tier1_command';
        renderDispatchViews();
      });
    });

    if (inspectorEl) {
      const canJump = Boolean(activeNode.jumpScreen && isScreenPermittedForCurrentUser(activeNode.jumpScreen));
      inspectorEl.innerHTML = `
        <div class="flow-inspector-top">
          <div>
            <span class="flow-step-badge tone-${escapeHtml(activeNode.tone)}">${escapeHtml(activeNode.step)}</span>
            <h3 class="flow-inspector-title" style="margin-top:6px;">${escapeHtml(activeNode.title)}</h3>
          </div>
          <span class="flow-inspector-counter">Step ${activeIdx + 1} of ${ctx.nodes.length}</span>
        </div>
        <div class="flow-inspector-meta">
          <div class="flow-meta-chip">
            <span class="flow-meta-label">OWNER / SCOPE</span>
            <span class="flow-meta-value">${escapeHtml(activeNode.source)}</span>
          </div>
          <div class="flow-meta-chip">
            <span class="flow-meta-label">DISPATCH HANDOFF</span>
            <span class="flow-meta-value">${escapeHtml(activeNode.route)}</span>
          </div>
        </div>
        <p class="flow-inspector-detail">${escapeHtml(activeNode.detail)}</p>
        <div class="flow-inspector-footer">
          <div class="flow-inspector-outcome">
            <span class="flow-meta-label">LIVE STATUS</span>
            <span class="flow-outcome-pill tone-${escapeHtml(activeNode.tone)}">${escapeHtml(activeNode.outcome)}</span>
          </div>
          <div class="flow-inspector-actions">
            ${canJump ? `<button type="button" class="btn btn-primary-32 js-df-jump-btn" data-jump-screen="${escapeHtml(activeNode.jumpScreen)}">${escapeHtml(activeNode.jumpLabel || 'Open')} →</button>` : ''}
            <button type="button" class="btn btn-secondary-32 js-df-prev-btn" ${activeIdx === 0 ? 'disabled' : ''}>← Prev Tier</button>
            <button type="button" class="btn btn-secondary-32 js-df-next-btn" ${activeIdx >= ctx.nodes.length - 1 ? 'disabled' : ''}>Next Tier →</button>
          </div>
        </div>
      `;

      inspectorEl.querySelector('.js-df-prev-btn')?.addEventListener('click', () => {
        if (activeIdx > 0) {
          state.selectedDispatchTier = ctx.nodes[activeIdx - 1].tierKey;
          renderDispatchViews();
        }
      });
      inspectorEl.querySelector('.js-df-next-btn')?.addEventListener('click', () => {
        if (activeIdx < ctx.nodes.length - 1) {
          state.selectedDispatchTier = ctx.nodes[activeIdx + 1].tierKey;
          renderDispatchViews();
        }
      });
      inspectorEl.querySelector('.js-df-jump-btn')?.addEventListener('click', (e) => {
        const targetScreen = e.currentTarget.getAttribute('data-jump-screen');
        if (targetScreen) switchScreen(targetScreen);
      });
    }
  }

  function renderDispatchHierarchyCanvasInto(canvasEl, ctx) {
    if (!canvasEl) return;
    const caps = state.roleCapabilities || {};
    const selTier = state.selectedDispatchTier || 'tier1_command';
    const renderTierPermChips = (tierKey) => {
      const spec = caps[tierKey];
      if (!spec || !Array.isArray(spec.allowed_actions)) return '';
      return `<div class="dispatch-perm-pills">${spec.allowed_actions.slice(0, 3).map((a) => `<span class="dispatch-perm-pill">${escapeHtml(a)}</span>`).join('')}</div>`;
    };

    canvasEl.innerHTML = `
      <div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:4px;">Click any Role Tier card below to synchronize with the Flow Explorer Pipeline and inspect permissions.</div>
      <div class="dispatch-tier">
        <div class="dispatch-node-card is-root is-clickable ${selTier === 'tier1_command' ? 'is-selected' : ''}" data-tier-key="tier1_command">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--brand-primary);">Tier 1 · Command ${ctx.activeEv ? `· Status: ${escapeHtml(String(ctx.activeEv.dispatch_status || 'draft').replace(/_/g, ' ').toUpperCase())}` : ''}</div>
          <div style="font-size:15px;font-weight:800;margin-top:2px;">Project Manager / Event Coordinator</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">PM: <strong>${escapeHtml(ctx.pmName)}</strong> · Coordinator: <strong>${escapeHtml(ctx.coordName)}</strong></div>
          ${renderTierPermChips('tier1_command')}
        </div>
      </div>
      <div class="dispatch-arrow-down">&#8595;</div>
      <div class="dispatch-tier">
        <div class="dispatch-node-card is-clickable ${selTier === 'tier2_tech_lead' ? 'is-selected' : ''}" data-tier-key="tier2_tech_lead">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Tier 2 · Technical Supervision</div>
          <div style="font-size:14.5px;font-weight:800;margin-top:2px;">Tech Lead</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Lead: <strong>${escapeHtml(ctx.tlName)}</strong></div>
          ${renderTierPermChips('tier2_tech_lead')}
        </div>
      </div>
      <div class="dispatch-arrow-down">&#8595;</div>
      <div class="dispatch-tier">
        <div class="dispatch-node-card is-clickable ${selTier === 'tier3_technicians' ? 'is-selected' : ''}" data-tier-key="tier3_technicians" style="min-width:220px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Tier 3 · Technical Execution</div>
          <div style="font-size:14px;font-weight:800;margin-top:2px;">Technicians (${ctx.deptNames.length} Specialty Branches)</div>
          ${renderTierPermChips('tier3_technicians')}
        </div>
      </div>
      <div class="dispatch-arrow-down">&#8595;</div>
      <div class="dispatch-dept-grid">
        ${ctx.deptNames.map((dn) => {
          const members = ctx.pool.filter((c) => ctx.deptMatches(c, dn));
          const reqNeed = Number(ctx.activeEv?.requirements?.branches?.[dn] || 0);
          return `
            <div class="dispatch-dept-card is-clickable" data-tier-key="tier3_technicians">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:13px;">${escapeHtml(dn)}</strong>
                <span class="status-badge status-badge-blue-sm">${members.length}${reqNeed > 0 ? ` / ${reqNeed} req` : ''}</span>
              </div>
              <div style="font-size:11.5px;color:var(--text-secondary);line-height:1.45;">
                ${members.length ? members.slice(0, 4).map((m) => ctx.formatMemberBadge(m)).join('<br>') + (members.length > 4 ? `<br>+${members.length - 4} more` : '') : '<em>Unassigned</em>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="dispatch-arrow-down">&#8595;</div>
      <div class="dispatch-tier">
        <div class="dispatch-node-card is-clickable ${selTier === 'tier4_support' ? 'is-selected' : ''}" data-tier-key="tier4_support" style="width:100%;max-width:640px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Tier 4 · Operations Ground Support</div>
          <div style="font-size:14px;font-weight:800;margin-top:2px;">Support Staff (${ctx.supportList.length})</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
            ${ctx.supportList.length ? ctx.supportList.slice(0, 6).map((s) => ctx.formatMemberBadge(s)).join(' · ') : 'Assign runners, logistics drivers, or venue crew via Event Roster or Support Requests below.'}
          </div>
          ${renderTierPermChips('tier4_support')}
        </div>
      </div>
    `;

    canvasEl.querySelectorAll('[data-tier-key]').forEach((el) => {
      el.addEventListener('click', () => {
        state.selectedDispatchTier = el.getAttribute('data-tier-key') || 'tier1_command';
        renderDispatchViews();
      });
    });
  }

  function renderDispatchRoleFlowDrawerInto(drawer, ctx) {
    if (!drawer) return;
    const caps = state.roleCapabilities || {};
    const tierKeys = Object.keys(caps);
    const activeKey = caps[state.selectedDispatchTier] ? state.selectedDispatchTier : (tierKeys[0] || 'tier1_command');
    const spec = caps[activeKey];
    if (!spec) {
      drawer.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Role capabilities loading...</div>';
      return;
    }

    const pickedId = ctx.resolvedId;
    const roleSet = new Set((spec.roles || []).map((r) => String(r).toLowerCase()));
    const dispatchLogs = (state.eventDispatchLogs || []).filter((l) => {
      if (pickedId && String(l.event_id) !== String(pickedId)) return false;
      return roleSet.has(String(l.actor_role || '').toLowerCase());
    });
    const scanLogs = (state.activityTimeline || []).filter((t) => {
      const m = (state.crew || []).find((c) => Number(c.id) === Number(t.user_id));
      return m && roleSet.has(String(m.role || '').toLowerCase());
    }).slice(0, 6);

    const tierTabs = tierKeys.map((k) => {
      const sp = caps[k];
      return `<button type="button" class="btn ${k === activeKey ? 'btn-primary-32' : 'btn-secondary-32-sm'} js-dispatch-tier-tab" data-tier-key="${escapeHtml(k)}">${escapeHtml(sp.tier_title || k)}</button>`;
    }).join('');

    const combinedActions = [
      ...dispatchLogs.map((l) => `<div style="font-size:11.5px;padding:4px 0;border-bottom:1px dashed var(--border-color);"><strong>${escapeHtml(l.actor_name)}</strong> (${escapeHtml(l.action_type)}): ${escapeHtml(l.summary)} <span style="color:var(--text-muted);">· ${escapeHtml(String(l.created_at || '').slice(0, 16))}</span></div>`),
      ...scanLogs.map((t) => `<div style="font-size:11.5px;padding:4px 0;border-bottom:1px dashed var(--border-color);"><strong>${escapeHtml(t.full_name)}</strong> (${escapeHtml(t.action || t.event_type)}): ${escapeHtml(t.checkpoint_name || '')} <span style="color:var(--text-muted);">· ${escapeHtml(t.time_formatted || t.time || '')}</span></div>`),
    ];

    drawer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <div>
          <strong style="font-size:14px;">Role Permissions &amp; Executed Flow Inspector — ${escapeHtml(spec.role_titles || spec.tier_title)}</strong>
          <div style="font-size:11.5px;color:var(--text-secondary);">Clearance: <strong>${escapeHtml(spec.clearance || '')}</strong></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${tierTabs}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;">
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#047857;margin-bottom:4px;">Allowed Permissions</div>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:var(--text-primary);line-height:1.5;">
            ${(spec.allowed_actions || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}
          </ul>
          ${(spec.restricted_actions || []).length ? `<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#b45309;margin:8px 0 3px 0;">Limitations</div><ul style="margin:0;padding-left:16px;font-size:11.5px;color:var(--text-secondary);">${spec.restricted_actions.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--brand-primary);margin-bottom:4px;">Role Operational Flow</div>
          <ol style="margin:0;padding-left:18px;font-size:12px;color:var(--text-primary);line-height:1.55;">
            ${(spec.flow_steps || []).map((s) => `<li>${escapeHtml(s.replace(/^\d+\.\s*/, ''))}</li>`).join('')}
          </ol>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Live Actions Executed by This Role</div>
          <div style="max-height:150px;overflow-y:auto;">
            ${combinedActions.length ? combinedActions.join('') : '<div style="font-size:11.5px;color:var(--text-muted);">No recent logged actions by this tier for the selected scope yet.</div>'}
          </div>
        </div>
      </div>
    `;

    drawer.querySelectorAll('.js-dispatch-tier-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedDispatchTier = btn.getAttribute('data-tier-key') || 'tier1_command';
        renderDispatchViews();
      });
    });
  }

  function renderDispatchWorkflowDeckInto(deck, ctx) {
    if (!deck) return;
    const activeEv = ctx.activeEv;
    const evId = activeEv ? String(activeEv.raw_id || activeEv.id) : '';
    const evTitle = activeEv ? (activeEv.title || activeEv.name) : 'Select an Event Venue';
    const canSendReqs = isCurrentUserAdmin() || isCurrentUserEventCommand();
    const canReqSupport = canSendReqs || isCurrentUserTechLead();
    const canFulfillSupport = isCurrentUserAdmin() || isCurrentUserStockManager() || isCurrentUserEventCommand();

    const deptNames = ctx.deptNames;
    const reqBranches = (activeEv && activeEv.requirements && activeEv.requirements.branches) || {};
    const reqNotes = (activeEv && activeEv.requirements && activeEv.requirements.notes) || '';

    const supportPool = (state.crew || []).filter((c) => {
      const r = String(c.role || '').toLowerCase();
      const d = String(c.department || '').toLowerCase();
      return ['driver', 'security', 'user', 'support_staff', 'operations', 'operations_crew', 'runner'].includes(r) || d.includes('support') || d.includes('logistic');
    });
    const supportReqs = ctx.supportReqs;
    const evLogs = ctx.evLogs;

    deck.innerHTML = `
      <div class="dispatch-step-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13.5px;">Step 1 &amp; 2 · Send Requirements to Tech Lead</strong>
          <span class="status-badge status-badge-purple-sm">${escapeHtml(activeEv ? String(activeEv.dispatch_status || 'draft').replace(/_/g, ' ').toUpperCase() : 'NO EVENT')}</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-secondary);">Event: <strong>${escapeHtml(evTitle)}</strong> · Tech Lead: <strong>${escapeHtml(activeEv?.tech_lead || '—')}</strong></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          ${deptNames.map((dn) => `
            <label style="font-size:11px;color:var(--text-secondary);display:flex;flex-direction:column;gap:2px;">
              <span>${escapeHtml(dn)}</span>
              <input type="number" class="form-input js-dp-req-branch" data-branch="${escapeHtml(dn)}" min="0" max="99" value="${Number(reqBranches[dn] || 0)}" style="height:30px;padding:0 6px;font-size:12px;" ${!evId || !canSendReqs ? 'disabled' : ''} />
            </label>
          `).join('')}
        </div>
        <input type="text" class="form-input js-dp-req-notes" value="${escapeHtml(reqNotes)}" placeholder="Gear & setup notes for Tech Lead..." style="height:32px;font-size:12px;" ${!evId || !canSendReqs ? 'disabled' : ''} />
        ${evId && canSendReqs ? `<button type="button" class="btn btn-primary-32 js-dp-send-reqs-btn">Send Requirements to Tech Lead</button>` : ''}
      </div>

      <div class="dispatch-step-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13.5px;">Step 3 · Tier 4 Support Staff Requests</strong>
          <span class="status-badge status-badge-amber-sm">${supportReqs.filter((r) => r.status === 'pending').length} Pending</span>
        </div>
        ${evId && canReqSupport ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <input type="text" class="form-input js-dp-sup-req-note" placeholder="Need e.g. 2x Runners, 1x Driver..." style="flex:1;min-width:140px;height:32px;font-size:12px;" />
            <button type="button" class="btn btn-secondary-32-sm js-dp-request-support-btn">+ Request Support</button>
          </div>
        ` : ''}
        <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
          ${supportReqs.length ? supportReqs.map((sr) => {
            const isPend = sr.status === 'pending';
            const rolesStr = Object.entries(sr.requested_roles || {}).map(([k, v]) => `${v}x ${k}`).join(', ');
            return `
              <div style="padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);font-size:11.5px;">
                <div style="display:flex;justify-content:space-between;gap:6px;">
                  <strong>#${Number(sr.id)} · ${escapeHtml(rolesStr || 'Support Crew')}</strong>
                  <span class="assign-status-pill ${isPend ? 'pending' : 'confirmed'}">${escapeHtml(sr.status)}</span>
                </div>
                <div style="color:var(--text-secondary);margin-top:2px;">By ${escapeHtml(sr.requested_by_name)}${sr.notes ? ` · ${escapeHtml(sr.notes)}` : ''}</div>
                ${sr.assigned_names?.length ? `<div style="margin-top:4px;color:#047857;">Assigned: <strong>${escapeHtml(sr.assigned_names.join(', '))}</strong></div>` : ''}
                ${isPend && canFulfillSupport ? `
                  <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                      ${supportPool.map((sp) => `<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;"><input type="checkbox" class="js-dp-sup-cb-${Number(sr.id)}" value="${Number(sp.id)}" /><span>${escapeHtml(sp.full_name)}</span></label>`).join('') || '<em>No support pool users</em>'}
                    </div>
                    <button type="button" class="btn btn-primary-32 js-dp-fulfill-btn" data-request-id="${Number(sr.id)}" style="height:28px;font-size:11px;">Fulfill Request #${Number(sr.id)}</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('') : '<div style="font-size:11.5px;color:var(--text-muted);">No Support Staff requests for this event yet.</div>'}
        </div>
      </div>

      <div class="dispatch-step-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13.5px;">Step 4 &amp; 5 · Readiness &amp; Live Dispatch Audit</strong>
          <span class="status-badge status-badge-blue-sm">${evLogs.length} Actions</span>
        </div>
        <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
          ${evLogs.length ? evLogs.slice(0, 12).map((l) => `
            <div style="padding:6px 8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);font-size:11.5px;">
              <div><strong>${escapeHtml(l.actor_name)}</strong> <span style="color:var(--text-muted);">(${escapeHtml(l.actor_role)})</span></div>
              <div style="margin-top:2px;">${escapeHtml(l.summary)}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${escapeHtml(String(l.created_at || '').slice(0, 19))}</div>
            </div>
          `).join('') : '<div style="font-size:11.5px;color:var(--text-muted);">No dispatch actions recorded for this event yet.</div>'}
        </div>
      </div>
    `;

    deck.querySelector('.js-dp-send-reqs-btn')?.addEventListener('click', async () => {
      if (!evId) return;
      const branches = {};
      deck.querySelectorAll('.js-dp-req-branch').forEach((inp) => {
        branches[inp.getAttribute('data-branch')] = Math.max(0, Number(inp.value || 0));
      });
      const notes = (deck.querySelector('.js-dp-req-notes')?.value || '').trim();
      try {
        const res = await fetch('api.php?action=send_event_requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send_event_requirements', event_id: evId, branches, notes }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) { showToast(data?.error || 'Failed to send requirements.'); return; }
        applyBootstrapPayload(data, true);
        showToast(data.message || 'Requirements sent to Tech Lead.');
      } catch (e) { showToast('Network error sending requirements.'); }
    });

    deck.querySelector('.js-dp-request-support-btn')?.addEventListener('click', async () => {
      if (!evId) return;
      const noteText = (deck.querySelector('.js-dp-sup-req-note')?.value || '').trim();
      try {
        const res = await fetch('api.php?action=request_support_staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'request_support_staff',
            event_id: evId,
            requested_roles: { 'Support Crew': 2, 'Logistics / Runner': 1 },
            notes: noteText || 'Requested from Dispatch Flow Workbench',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) { showToast(data?.error || 'Failed to request support staff.'); return; }
        applyBootstrapPayload(data, true);
        showToast(data.message || 'Support request submitted.');
      } catch (e) { showToast('Network error submitting support request.'); }
    });

    deck.querySelectorAll('.js-dp-fulfill-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reqId = Number(btn.getAttribute('data-request-id'));
        const userIds = Array.from(deck.querySelectorAll(`.js-dp-sup-cb-${reqId}:checked`)).map((cb) => Number(cb.value));
        if (!userIds.length) {
          showToast('Select at least one Tier 4 Support Staff member first.');
          return;
        }
        try {
          const res = await fetch('api.php?action=fulfill_support_request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'fulfill_support_request', request_id: reqId, user_ids: userIds }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) { showToast(data?.error || 'Failed to fulfill support request.'); return; }
          applyBootstrapPayload(data, true);
          showToast(data.message || 'Support staff assigned.');
        } catch (e) { showToast('Network error fulfilling support request.'); }
      });
    });
  }

  function renderSettingsDispatchSection() {
    const selEl = document.getElementById('dispatch-event-select');
    const ctx = getDispatchContextData(selEl?.value || state.selectedDispatchEventId || '');
    if (ctx.resolvedId && !state.selectedDispatchEventId) {
      state.selectedDispatchEventId = ctx.resolvedId;
    }
    syncDispatchEventSelect(selEl, ctx);
    renderDispatchPipelineInto(
      document.getElementById('settings-dispatch-flow-diagram'),
      document.getElementById('settings-dispatch-flow-inspector'),
      null,
      ctx
    );
    renderDispatchHierarchyCanvasInto(document.getElementById('dispatch-hierarchy-canvas'), ctx);
    renderDispatchRoleFlowDrawerInto(document.getElementById('dispatch-role-flow-drawer'), ctx);
    renderDispatchWorkflowDeckInto(document.getElementById('dispatch-workflow-deck'), ctx);
  }

  function renderDispatchFlowPage() {
    const selEl = document.getElementById('dispatch-page-event-select');
    const ctx = getDispatchContextData(selEl?.value || state.selectedDispatchEventId || '');
    if (ctx.resolvedId && !state.selectedDispatchEventId) {
      state.selectedDispatchEventId = ctx.resolvedId;
    }
    syncDispatchEventSelect(selEl, ctx);
    renderDispatchPipelineInto(
      document.getElementById('dispatch-flow-diagram'),
      document.getElementById('dispatch-flow-inspector'),
      document.getElementById('dispatch-flow-active-event-pill'),
      ctx
    );
    renderDispatchHierarchyCanvasInto(document.getElementById('dispatch-page-hierarchy-canvas'), ctx);
    renderDispatchRoleFlowDrawerInto(document.getElementById('dispatch-page-role-flow-drawer'), ctx);
    renderDispatchWorkflowDeckInto(document.getElementById('dispatch-page-workflow-deck'), ctx);
  }

  // =========================================================================
  // CREATE EVENT WORKSPACE TAB (#screen-create-event)
  // =========================================================================

  function updateCreateEventLivePreview() {
    const titleVal = document.getElementById('ce-title')?.value.trim() || 'Event Cover Preview';
    const locVal = document.getElementById('ce-location')?.value.trim() || 'Location pending';
    const tlVal = document.getElementById('ce-techlead')?.value.trim() || 'Unassigned';
    const sDate = document.getElementById('ce-start-date')?.value || new Date().toISOString().slice(0, 10);
    const eDate = document.getElementById('ce-end-date')?.value || sDate;
    const dur = computeEventDuration(sDate, eDate);

    const durEl = document.getElementById('ce-duration');
    const pillEl = document.getElementById('ce-duration-pill');
    if (durEl) durEl.value = dur.label;
    if (pillEl) pillEl.textContent = dur.label;

    const pTitle = document.getElementById('ce-cover-preview-title');
    const pDates = document.getElementById('ce-cover-preview-dates');
    const pMeta = document.getElementById('ce-cover-preview-meta');
    if (pTitle) pTitle.textContent = titleVal;
    if (pDates) pDates.textContent = sDate === eDate ? `${sDate} · ${dur.label}` : `${sDate} → ${eDate} · ${dur.label}`;
    if (pMeta) pMeta.textContent = `${locVal} · Tech Lead: ${tlVal}`;

    const dropPreviewVisible = document.getElementById('ce-dropzone-preview')?.style.display !== 'none';
    const dropImgSrc = document.getElementById('ce-preview-img')?.getAttribute('src') || '';
    const coverImg = document.getElementById('ce-cover-preview-img');
    if (coverImg) {
      if (dropPreviewVisible && dropImgSrc) {
        coverImg.src = dropImgSrc;
        coverImg.style.display = 'block';
      } else {
        coverImg.removeAttribute('src');
        coverImg.style.display = 'none';
      }
    }
  }

  function resetCreateEventForm() {
    const todayIso = new Date().toISOString().slice(0, 10);
    const idEl = document.getElementById('ce-event-id');
    const titleEl = document.getElementById('ce-title');
    const locEl = document.getElementById('ce-location');
    const startEl = document.getElementById('ce-start-date');
    const endEl = document.getElementById('ce-end-date');
    const ctEl = document.getElementById('ce-calltime');
    const pinEl = document.getElementById('ce-pin');
    const tlEl = document.getElementById('ce-techlead');
    const modeBadge = document.getElementById('ce-screen-mode-badge');
    const heading = document.getElementById('ce-form-heading');
    const cancelBtn = document.getElementById('ce-cancel-edit-btn');
    const submitLabel = document.querySelector('#ce-submit-btn span');

    if (idEl) idEl.value = '';
    if (titleEl) titleEl.value = '';
    if (locEl) locEl.value = '';
    if (startEl) startEl.value = todayIso;
    if (endEl) endEl.value = todayIso;
    if (ctEl) ctEl.value = '08:00';
    if (pinEl) pinEl.value = '1234';
    if (modeBadge) modeBadge.textContent = 'New Event';
    if (heading) heading.textContent = 'Create Event Details';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (submitLabel) submitLabel.textContent = 'Save & Create Event';
    resetDropzone('ce');
    populateLeadershipSelect(tlEl, '', 'techlead');
    updateCreateEventLivePreview();
  }

  function loadEventIntoCreateEventForm(ev) {
    if (!ev) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const startIso = ev.start_date || ev.date || todayIso;
    const endIso = ev.end_date || startIso;
    const idEl = document.getElementById('ce-event-id');
    const titleEl = document.getElementById('ce-title');
    const locEl = document.getElementById('ce-location');
    const startEl = document.getElementById('ce-start-date');
    const endEl = document.getElementById('ce-end-date');
    const ctEl = document.getElementById('ce-calltime');
    const pinEl = document.getElementById('ce-pin');
    const tlEl = document.getElementById('ce-techlead');
    const modeBadge = document.getElementById('ce-screen-mode-badge');
    const heading = document.getElementById('ce-form-heading');
    const cancelBtn = document.getElementById('ce-cancel-edit-btn');
    const submitLabel = document.querySelector('#ce-submit-btn span');

    if (idEl) idEl.value = String(ev.raw_id || ev.id || '');
    if (titleEl) titleEl.value = ev.title || ev.name || '';
    if (locEl) locEl.value = ev.location || '';
    if (startEl) startEl.value = startIso;
    if (endEl) endEl.value = endIso;
    if (ctEl) ctEl.value = ev.call_time || '08:00';
    if (pinEl) pinEl.value = ev.terminal_pin || '1234';
    if (modeBadge) modeBadge.textContent = 'Editing Event';
    if (heading) heading.textContent = `Edit Event: ${ev.title || ev.name}`;
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    if (submitLabel) submitLabel.textContent = 'Save Event Changes';
    resetDropzone('ce');
    if (ev.image) {
      setDropzonePreview('ce', ev.image, ev.image.split('/').pop());
    }
    populateLeadershipSelect(tlEl, ev.tech_lead || '', 'techlead');
    updateCreateEventLivePreview();
    document.getElementById('create-event-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderCreateEventPage() {
    const startEl = document.getElementById('ce-start-date');
    const endEl = document.getElementById('ce-end-date');
    const tlEl = document.getElementById('ce-techlead');
    const gridEl = document.getElementById('create-event-cards-grid');
    const countBadge = document.getElementById('ce-cards-count-badge');

    const todayIso = new Date().toISOString().slice(0, 10);
    if (startEl && !startEl.value) startEl.value = todayIso;
    if (endEl && !endEl.value) endEl.value = startEl?.value || todayIso;

    if (tlEl) {
      const preservedVal = tlEl.value || '';
      populateLeadershipSelect(tlEl, preservedVal, 'techlead');
    }
    updateCreateEventLivePreview();

    if (!gridEl) return;
    const allEvents = state.checkpoints?.event_venues || [];
    const q = String(state.createEventSearch || '').trim().toLowerCase();
    const filtered = allEvents.filter((ev) => {
      if (!q) return true;
      const hay = `${ev.title || ''} ${ev.location || ''} ${ev.tech_lead || ''} ${ev.start_date || ev.date || ''}`.toLowerCase();
      return hay.includes(q);
    });

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Event${filtered.length === 1 ? '' : 's'}`;
    }

    if (!filtered.length) {
      gridEl.innerHTML = '<div style="grid-column:1/-1;padding:28px;text-align:center;color:var(--text-muted);border:1px dashed var(--border-color);border-radius:12px;">No events match the filter yet. Use the form on the left to create an event.</div>';
      return;
    }

    const canManage = isCurrentUserAdmin() || isCurrentUserEventCommand() || isCurrentUserTechLead();
    gridEl.innerHTML = filtered.map((ev) => {
      const evIdStr = String(ev.raw_id || ev.id);
      const startDate = ev.start_date || ev.date || todayIso;
      const endDate = ev.end_date || startDate;
      const durLabel = ev.duration_label || computeEventDuration(startDate, endDate).label;
      const heroStyle = ev.image ? ` style="background-image: url('${escapeHtml(ev.image)}');"` : '';
      const statusText = String(ev.dispatch_status || 'draft').replace(/_/g, ' ').toUpperCase();
      return `
        <article class="event-showcase-card" data-ce-card-id="${escapeHtml(evIdStr)}">
          <div class="event-showcase-hero"${heroStyle}>
            <div class="event-showcase-top">
              <span class="event-showcase-pill">${escapeHtml(durLabel)}</span>
              <span class="event-showcase-pill">${escapeHtml(statusText)}</span>
            </div>
            <div>
              <h3 style="margin:0;font-size:15px;font-weight:800;line-height:1.25;">${escapeHtml(ev.title || ev.name)}</h3>
              <div style="font-size:11.5px;opacity:0.9;margin-top:2px;">${escapeHtml(ev.location || 'Kigali Venue')}</div>
            </div>
          </div>
          <div class="event-showcase-body">
            <div class="event-showcase-meta">
              <div class="event-showcase-meta-item">
                <span class="event-showcase-meta-label">Start Date</span>
                <span class="event-showcase-meta-val">${escapeHtml(startDate)}</span>
              </div>
              <div class="event-showcase-meta-item">
                <span class="event-showcase-meta-label">End Date</span>
                <span class="event-showcase-meta-val">${escapeHtml(endDate)}</span>
              </div>
              <div class="event-showcase-meta-item">
                <span class="event-showcase-meta-label">Event Tech Lead</span>
                <span class="event-showcase-meta-val">${escapeHtml(ev.tech_lead || '—')}</span>
              </div>
              <div class="event-showcase-meta-item">
                <span class="event-showcase-meta-label">Call Time · Crew</span>
                <span class="event-showcase-meta-val">${escapeHtml(ev.call_time || '08:00')} · ${Number(ev.assigned_count || 0)} crew</span>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;">
              ${canManage ? `<button type="button" class="btn btn-secondary-32-sm js-ce-edit-btn" data-event-id="${escapeHtml(evIdStr)}">Edit</button>` : ''}
              <button type="button" class="btn btn-primary-32 js-ce-dispatch-btn" data-event-id="${escapeHtml(evIdStr)}" style="flex:1;height:30px;font-size:11.5px;">Dispatch Flow →</button>
              ${canCurrentUserAssignEvents() ? `<button type="button" class="btn btn-secondary-32-sm js-ce-delete-btn" data-event-id="${escapeHtml(evIdStr)}" data-event-title="${escapeHtml(ev.title || ev.name)}" style="color:#dc2626;border-color:#fecaca;">Delete</button>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    gridEl.querySelectorAll('.js-ce-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eid = btn.getAttribute('data-event-id');
        const found = (state.checkpoints?.event_venues || []).find((v) => String(v.raw_id || v.id) === String(eid));
        if (found) openVenueCrudModal(found);
      });
    });

    gridEl.querySelectorAll('.js-ce-dispatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedDispatchEventId = String(btn.getAttribute('data-event-id') || '');
        switchScreen('dispatch-flow');
      });
    });

    gridEl.querySelectorAll('.js-ce-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const eid = btn.getAttribute('data-event-id');
        const title = btn.getAttribute('data-event-title') || 'Event';
        await confirmAndDeleteEventVenue(eid, title);
      });
    });
  }

  function renderSettingsLinksSection() {
    const gridEl = document.getElementById('settings-shared-links-grid');
    if (!gridEl) return;
    const portals = state.standalonePortals || [];
    const canEdit = isCurrentUserAdmin() || isCurrentUserStockManager();
    const cardsHtml = portals.map((p) => {
      const expiredBadge = p.is_expired ? '<span class="status-badge status-badge-red-sm">Expired</span>' : (Number(p.is_active) === 1 ? '<span class="status-badge status-badge-green-sm">Active</span>' : '<span class="status-badge status-badge-amber-sm">Paused</span>');
      const fullUrl = resolvePortalAbsoluteUrl(p.entry_url || '');
      return `
        <div class="shared-link-policy-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div>
              <h3 style="margin:0;font-size:14.5px;font-weight:800;">${escapeHtml(p.title || p.portal_key)}</h3>
              <code style="font-size:11px;color:var(--text-muted);">${escapeHtml(p.entry_url || '')}</code>
            </div>
            ${expiredBadge}
          </div>
          <div style="font-size:12px;line-height:1.5;">
            <div><strong>Best For:</strong> ${escapeHtml(p.best_for || 'Authorized gate or crew visibility')}</div>
            <div style="margin-top:4px;color:var(--text-secondary);"><strong>Permissions &amp; Limitations:</strong> ${escapeHtml(p.permissions_summary || 'Standard portal scope')}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span class="status-badge status-badge-blue-sm">${Number(p.allow_scan ?? 1) === 1 ? 'Scans Enabled' : 'Read-Only'}</span>
            <span class="status-badge ${Number(p.mask_phones ?? 0) === 1 ? 'status-badge-green-sm' : 'status-badge-amber-sm'}">${Number(p.mask_phones ?? 0) === 1 ? 'Phones Masked' : 'Full Phones'}</span>
            ${p.expires_at ? `<span class="status-badge status-badge-amber-sm">Exp: ${escapeHtml(p.expires_at)}</span>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;">
            <a href="${escapeHtml(fullUrl)}" target="_blank" class="btn btn-secondary-32-sm" style="text-decoration:none;">Open Link ↗</a>
            ${canEdit ? `<button type="button" class="btn btn-primary-32 js-settings-edit-portal-btn" data-portal-id="${Number(p.id)}">Edit Policy</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const reliefCardHtml = `
      <div class="shared-link-policy-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <h3 style="margin:0;font-size:14.5px;font-weight:800;">Geo-Fenced Relief Activation</h3>
            <code style="font-size:11px;color:var(--text-muted);">relief.php?token=...</code>
          </div>
          <span class="status-badge status-badge-blue-sm">Token Gated</span>
        </div>
        <div style="font-size:12px;line-height:1.5;">
          <div><strong>Best For:</strong> Temporary shift relief handovers outdoors or at remote gates.</div>
          <div style="margin-top:4px;color:var(--text-secondary);"><strong>Permissions &amp; Limitations:</strong> Single-use SHA-256 token; requires 200m GPS proximity (or Terminal PIN override) + TOTP 2FA; auto-expires at shift_end.</div>
        </div>
        <div style="margin-top:auto;">
          <button type="button" class="btn btn-secondary-32-sm" id="js-links-goto-relief">Issue Relief QR →</button>
        </div>
      </div>
    `;
    gridEl.innerHTML = cardsHtml + reliefCardHtml;
  }

  function renderSettingsBrandingSection() {
    const cfg = state.brandingConfig || {};
    const isAdmin = isCurrentUserAdmin();
    const dnEl = document.getElementById('brand-display-name');
    if (dnEl) dnEl.value = cfg.brand_name || 'aBility';

    const bindPair = (colorId, hexId, val) => {
      const cEl = document.getElementById(colorId);
      const hEl = document.getElementById(hexId);
      if (cEl && val) cEl.value = val;
      if (hEl && val) hEl.value = val;
    };
    bindPair('brand-color-primary', 'brand-color-primary-hex', cfg.primary_color || '#4f46e5');
    bindPair('brand-color-accent', 'brand-color-accent-hex', cfg.accent_color || '#10b981');
    bindPair('brand-color-neutral', 'brand-color-neutral-hex', cfg.neutral_color || '#64748b');

    const ffEl = document.getElementById('brand-font-family');
    const fonts = state.brandingFonts && state.brandingFonts.length
      ? state.brandingFonts
      : Object.keys(BRANDING_FONT_STACKS).map((name, i) => ({
          id: i + 1,
          font_name: name,
          css_stack: BRANDING_FONT_STACKS[name],
          font_url: '',
          file_path: '',
          is_system: 1,
          is_active: 1,
        }));
    if (ffEl) {
      const activeFonts = fonts.filter((f) => Number(f.is_active ?? 1) === 1);
      ffEl.innerHTML = activeFonts.map((f) => `<option value="${escapeHtml(f.font_name)}">${escapeHtml(f.font_name)}${f.file_path ? ' (Uploaded)' : (f.font_url ? ' (Webfont)' : '')}</option>`).join('');
      if (cfg.font_family) ffEl.value = cfg.font_family;
    }

    const fsEl = document.getElementById('brand-font-scale');
    const fsValEl = document.getElementById('brand-font-scale-val');
    if (fsEl) fsEl.value = Number(cfg.font_scale || 1).toFixed(2);
    if (fsValEl) fsValEl.textContent = `${Math.round(Number(cfg.font_scale || 1) * 100)}%`;
    const taEl = document.getElementById('brand-text-align');
    if (taEl && cfg.text_align) taEl.value = cfg.text_align;
    const dtEl = document.getElementById('brand-default-theme');
    if (dtEl && cfg.default_theme) dtEl.value = cfg.default_theme;
    const saveBtn = document.getElementById('btn-save-branding');
    if (saveBtn) saveBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    const logoPrev = document.getElementById('branding-logo-preview');
    const logoLbl = document.getElementById('branding-logo-path-label');
    const logoSrc = cfg.logo_url || cfg.logo_path || 'assets/rwanda-events-logo.png';
    if (logoPrev) logoPrev.src = logoSrc;
    if (logoLbl) logoLbl.textContent = cfg.logo_path ? cfg.logo_path : 'assets/rwanda-events-logo.png (Default)';
    const lsEl = document.getElementById('brand-logo-size');
    const lsValEl = document.getElementById('brand-logo-size-val');
    const lsNum = Math.max(24, Math.min(48, Number(cfg.logo_size_px || 34)));
    if (lsEl) lsEl.value = String(lsNum);
    if (lsValEl) lsValEl.textContent = `${lsNum}px`;
    ['branding-logo-upload-form', 'branding-font-crud-form', 'btn-reset-branding-logo'].forEach((elId) => {
      const el = document.getElementById(elId);
      if (el) el.style.display = isAdmin ? '' : 'none';
    });

    const fontsListEl = document.getElementById('branding-fonts-crud-list');
    if (fontsListEl) {
      fontsListEl.innerHTML = fonts.map((f) => {
        const isCurrent = (cfg.font_family || 'Marvel') === f.font_name;
        const isSys = Number(f.is_system) === 1;
        return `
          <div style="border:1px solid var(--border-color);border-radius:10px;padding:9px 11px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <strong style="font-size:13px;font-family:${escapeHtml(f.css_stack || 'inherit')};">${escapeHtml(f.font_name)}</strong>
                ${isCurrent ? '<span class="status-badge status-badge-green-sm">Selected</span>' : ''}
                <span class="status-badge ${isSys ? 'status-badge-blue-sm' : 'status-badge-amber-sm'}">${isSys ? 'Preset' : 'Custom'}</span>
                ${Number(f.is_active ?? 1) === 0 ? '<span class="status-badge status-badge-red-sm">Disabled</span>' : ''}
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(f.css_stack || '')}${f.file_path ? ` · ${escapeHtml(f.file_path)}` : ''}</div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0;">
              ${!isCurrent && Number(f.is_active ?? 1) === 1 ? `<button type="button" class="btn btn-secondary-32-sm js-font-use-btn" data-font-name="${escapeHtml(f.font_name)}" data-online-only="1">Use</button>` : ''}
              ${isAdmin ? `<button type="button" class="btn btn-secondary-32-sm js-font-edit-btn" data-font-id="${Number(f.id)}">Edit</button>` : ''}
              ${isAdmin && !isSys ? `<button type="button" class="btn btn-secondary-32-sm js-font-delete-btn" data-font-id="${Number(f.id)}" data-font-name="${escapeHtml(f.font_name)}" style="color:#dc2626;" data-online-only="1">Delete</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  async function renderSettingsAccountsOfflineSection() {
    try {
      const hc = document.getElementById('a11y-high-contrast');
      const lg = document.getElementById('a11y-large-text');
      const rm = document.getElementById('a11y-reduced-motion');
      if (hc) hc.checked = localStorage.getItem('ability_a11y_high_contrast') === '1';
      if (lg) lg.checked = localStorage.getItem('ability_a11y_large_text') === '1';
      if (rm) rm.checked = localStorage.getItem('ability_a11y_reduced_motion') === '1';
    } catch (_) {}
    const pill = document.getElementById('offline-cache-status-pill');
    if (pill) {
      const st = await AbilityMainOffline.getStatus();
      pill.textContent = st.cached ? `${st.count} Badges Cached` : 'Empty Cache';
      pill.className = 'status-badge ' + (st.cached ? 'status-badge-green-sm' : 'status-badge-amber-sm');
    }
    updateNetworkStatusUi();
  }

  function renderSettingsPwaSection() {
    const swEl = document.getElementById('pwa-sw-status');
    const installBtn = document.getElementById('pwa-install-btn');
    if (swEl) {
      if (!('serviceWorker' in navigator)) {
        swEl.textContent = 'Service Worker: Unsupported';
      } else if (navigator.serviceWorker.controller) {
        swEl.textContent = 'Service Worker: Active & Caching';
        swEl.className = 'status-badge status-badge-green-sm';
      } else {
        swEl.textContent = 'Service Worker: Registered';
      }
    }
    if (installBtn) {
      installBtn.style.display = state.deferredPwaPrompt ? 'inline-flex' : 'none';
    }
  }

  function renderSettingsScreen() {
    const activeTab = SETTINGS_SECTIONS.includes(state.settingsTab) ? state.settingsTab : 'flow';
    SETTINGS_SECTIONS.forEach((key) => {
      const pane = document.getElementById(`settings-pane-${key}`);
      if (pane) pane.style.display = activeTab === key ? 'block' : 'none';
      const btn = document.getElementById(`settings-tab-${key}`);
      if (btn) btn.className = activeTab === key ? 'btn btn-primary-32 js-settings-tab-btn active-subtab' : 'btn btn-secondary-32 js-settings-tab-btn';
    });
    const secSelect = document.getElementById('settings-section-select');
    if (secSelect && secSelect.value !== activeTab) secSelect.value = activeTab;
    const flowSubSel = document.getElementById('settings-flow-subselect');
    const flowSubSep = document.getElementById('settings-flow-subsep');
    if (flowSubSel) {
      flowSubSel.innerHTML = SYSTEM_FLOW_SPEC.map((f, idx) => `<option value="${idx}">${escapeHtml(f.label)}</option>`).join('');
      flowSubSel.value = String(Math.max(0, Math.min(SYSTEM_FLOW_SPEC.length - 1, Number(state.settingsFlowIdx) || 0)));
      flowSubSel.style.display = activeTab === 'flow' ? 'inline-block' : 'none';
    }
    if (flowSubSep) flowSubSep.style.display = activeTab === 'flow' ? 'inline' : 'none';
    document.querySelectorAll('.nav-subitem[data-settings-section]').forEach((subEl) => {
      subEl.classList.toggle('active', subEl.getAttribute('data-settings-section') === activeTab);
    });

    if (activeTab === 'relief') renderSettingsReliefSection();
    if (activeTab === 'dispatch') renderSettingsDispatchSection();
    if (activeTab === 'links') renderSettingsLinksSection();
    if (activeTab === 'branding') renderSettingsBrandingSection();
    if (activeTab === 'accounts') renderSettingsAccountsOfflineSection();
    if (activeTab === 'pwa') renderSettingsPwaSection();

    const kpiDb = document.getElementById('settings-kpi-db');
    const kpiRole = document.getElementById('settings-kpi-role');
    const kpiUser = document.getElementById('settings-kpi-user');
    const kpiCps = document.getElementById('settings-kpi-checkpoints');
    const kpiPortals = document.getElementById('settings-kpi-portals');
    const kpiRelief = document.getElementById('settings-kpi-relief');
    const kpiOnsite = document.getElementById('settings-kpi-onsite');
    const runtimeBadge = document.getElementById('settings-runtime-db-badge');

    const cpCount = (state.checkpoints?.directory || []).length;
    const portalCount = (state.standalonePortals || []).length;
    const pendingRelief = Number(state.pendingShiftRequestCount || 0);
    const onsiteCount = (state.rollCallList || []).length;

    if (kpiDb) kpiDb.textContent = state.dbSource || 'ability_db';
    if (runtimeBadge) runtimeBadge.textContent = `Attendance-Only · ${state.dbSource || 'ability_db'}`;
    if (kpiRole) kpiRole.textContent = state.currentUser?.role_display || 'Staff';
    if (kpiUser) kpiUser.textContent = state.currentUser?.full_name ? `${state.currentUser.full_name} (${state.currentUser.clearance_code || 'L2'})` : 'Active Operator';
    if (kpiCps) kpiCps.textContent = String(cpCount);
    if (kpiPortals) kpiPortals.textContent = `${portalCount} Standalone Portal${portalCount === 1 ? '' : 's'}`;
    if (kpiRelief) kpiRelief.textContent = String(pendingRelief);
    if (kpiOnsite) kpiOnsite.textContent = `${onsiteCount} Currently On-Site`;

    const flowTabsEl = document.getElementById('settings-flow-tabs');
    const flowSubEl = document.getElementById('settings-flow-subtitle');
    const branchPillEl = document.getElementById('settings-flow-branch-pill');
    const counterEl = document.getElementById('settings-flow-step-counter');
    const diagramEl = document.getElementById('settings-flow-diagram');
    const stepBadgeEl = document.getElementById('settings-node-step-badge');
    const nodeTitleEl = document.getElementById('settings-node-title');
    const nodeSourceEl = document.getElementById('settings-node-source');
    const nodeRouteEl = document.getElementById('settings-node-route');
    const nodeDetailEl = document.getElementById('settings-node-detail');
    const nodeOutcomeEl = document.getElementById('settings-node-outcome');
    const jumpBtn = document.getElementById('settings-flow-jump-btn');
    const prevBtn = document.getElementById('settings-flow-prev-btn');
    const nextBtn = document.getElementById('settings-flow-next-btn');

    const flowIdx = Math.max(0, Math.min(SYSTEM_FLOW_SPEC.length - 1, Number(state.settingsFlowIdx) || 0));
    state.settingsFlowIdx = flowIdx;
    const activeFlow = SYSTEM_FLOW_SPEC[flowIdx];
    const nodeIdx = Math.max(0, Math.min(activeFlow.nodes.length - 1, Number(state.settingsNodeIdx) || 0));
    state.settingsNodeIdx = nodeIdx;
    const activeNode = activeFlow.nodes[nodeIdx];

    if (flowTabsEl) {
      flowTabsEl.innerHTML = SYSTEM_FLOW_SPEC.map((f, idx) => `
        <button type="button" role="tab" aria-selected="${idx === flowIdx}" class="flow-explorer-tab-btn${idx === flowIdx ? ' active' : ''}" data-flow-idx="${idx}">
          ${escapeHtml(f.label)}
        </button>
      `).join('');
    }
    if (flowSubEl) flowSubEl.textContent = activeFlow.subtitle;
    if (branchPillEl) branchPillEl.textContent = activeFlow.branchPill;
    if (counterEl) counterEl.textContent = `Step ${nodeIdx + 1} of ${activeFlow.nodes.length}`;

    if (diagramEl) {
      diagramEl.innerHTML = activeFlow.nodes.map((n, idx) => `
        <button type="button" class="flow-pipeline-node${idx === nodeIdx ? ' is-active' : ''}" data-node-idx="${idx}">
          <div class="flow-node-top">
            <span class="flow-step-badge tone-${escapeHtml(n.tone)}">${escapeHtml(n.step)}</span>
            <span class="flow-node-arrow">${idx < activeFlow.nodes.length - 1 ? '→' : '●'}</span>
          </div>
          <div class="flow-node-short">${escapeHtml(n.short)}</div>
          <div class="flow-node-summary">${escapeHtml(n.summary)}</div>
        </button>
      `).join('');
    }

    if (stepBadgeEl) {
      stepBadgeEl.textContent = activeNode.step;
      stepBadgeEl.className = `flow-step-badge tone-${activeNode.tone}`;
    }
    if (nodeTitleEl) nodeTitleEl.textContent = activeNode.title;
    if (nodeSourceEl) nodeSourceEl.textContent = activeNode.source;
    if (nodeRouteEl) nodeRouteEl.textContent = activeNode.route;
    if (nodeDetailEl) nodeDetailEl.textContent = activeNode.detail;
    if (nodeOutcomeEl) {
      nodeOutcomeEl.textContent = activeNode.outcome;
      nodeOutcomeEl.className = `flow-outcome-pill tone-${activeNode.tone}`;
    }

    if (jumpBtn) {
      const canJump = Boolean(activeNode.jumpScreen && isScreenPermittedForCurrentUser(activeNode.jumpScreen));
      jumpBtn.style.display = canJump ? 'inline-flex' : 'none';
      if (canJump) {
        jumpBtn.textContent = `${activeNode.jumpLabel || 'Open Screen'} →`;
        jumpBtn.setAttribute('data-jump-screen', activeNode.jumpScreen);
        jumpBtn.setAttribute('data-jump-subtab', activeNode.jumpSubTab || '');
        jumpBtn.setAttribute('data-jump-settings-tab', activeNode.jumpSettingsTab || '');
      }
    }
    if (prevBtn) prevBtn.disabled = nodeIdx === 0;
    if (nextBtn) nextBtn.disabled = nodeIdx >= activeFlow.nodes.length - 1;

    const shortcutsEl = document.getElementById('settings-shortcuts-grid');
    if (shortcutsEl) {
      const isAdmin = isCurrentUserAdmin();
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const cards = [
        {
          title: 'Navigation Menu CRUD',
          desc: 'Enable, disable, reorder, or create Main Navigation and Checkpoint Controls sidebar items.',
          actionLabel: 'Manage Navigation',
          screen: 'users',
          subTab: 'navigation',
          visible: isAdmin,
        },
        {
          title: '4-Tier Clearance Matrix',
          desc: 'Configure L1–L4+ physical access tiers, badge styling, and default checkpoint access rules.',
          actionLabel: 'Open Matrix',
          screen: 'users',
          subTab: 'matrix',
          visible: isAdmin,
        },
        {
          title: 'Roles & Permissions CRUD',
          desc: 'Create or edit operational roles and bind default clearance levels and departments.',
          actionLabel: 'Manage Roles',
          screen: 'users',
          subTab: 'roles',
          visible: isAdmin,
        },
        {
          title: 'Departments CRUD',
          desc: 'Manage technical & production departments across crew profiles and roles.',
          actionLabel: 'Manage Departments',
          screen: 'users',
          subTab: 'departments',
          visible: isAdmin,
        },
        {
          title: 'Gates & On-Site Portals',
          desc: 'Customize standalone kiosk backgrounds, Gate PINs, and shared onsite.php access passwords.',
          actionLabel: 'Open Portals',
          screen: 'standalone-portals',
          visible: isScreenPermittedForCurrentUser('standalone-portals'),
        },
        {
          title: 'Station Lock & Terminal PINs',
          desc: 'Lock browser stations to a checkpoint or rotate per-facility and event venue PINs.',
          actionLabel: 'Open Station Lock',
          screen: 'station-lock',
          visible: isAdmin,
        },
        {
          title: 'Set Call Time Schedules',
          desc: 'Adjust baseline check-in call-times (+15m grace window) across venues and facility gates.',
          actionLabel: 'Open Call Times',
          screen: 'calltime',
          visible: isScreenPermittedForCurrentUser('calltime'),
        },
        {
          title: 'Shift Relief & Approvals',
          desc: 'Submit or approve Gate Controller relief, sick-leave coverage, and night shift handovers.',
          actionLabel: 'Open Relief Queue',
          screen: 'shift-relief',
          visible: isScreenPermittedForCurrentUser('shift-relief'),
        },
        {
          title: 'Appearance & Theme Mode',
          desc: `Currently active: ${isDark ? 'Dark Mode' : 'Light Mode'}. Persists across browser sessions and login screens.`,
          actionLabel: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
          actionType: 'toggle-theme',
          visible: true,
        },
      ].filter((c) => c.visible);

      shortcutsEl.innerHTML = cards.map((c) => `
        <div class="settings-shortcut-card">
          <div>
            <h3 class="settings-shortcut-title">${escapeHtml(c.title)}</h3>
            <p class="settings-shortcut-desc">${escapeHtml(c.desc)}</p>
          </div>
          <div>
            <button type="button" class="btn btn-secondary-32-sm js-settings-shortcut-btn"
              data-shortcut-action="${escapeHtml(c.actionType || 'screen')}"
              data-shortcut-screen="${escapeHtml(c.screen || '')}"
              data-shortcut-subtab="${escapeHtml(c.subTab || '')}">
              ${escapeHtml(c.actionLabel)} →
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  function generateRandomDigitsPin(len = 6) {
    const digits = '0123456789';
    let out = '';
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const buf = new Uint32Array(len);
      window.crypto.getRandomValues(buf);
      for (let i = 0; i < len; i += 1) {
        const idx = i === 0 ? (1 + (buf[i] % 9)) : (buf[i] % 10);
        out += digits.charAt(idx);
      }
      return out;
    }
    return String(100000 + Math.floor(Math.random() * 900000));
  }

  function generateRandomOnsitePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'Crew-';
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const buf = new Uint32Array(6);
      window.crypto.getRandomValues(buf);
      for (let i = 0; i < 6; i += 1) code += chars.charAt(buf[i] % chars.length);
      return code;
    }
    for (let i = 0; i < 6; i += 1) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  function showGeneratedPortalBanner(title, url, kindLabel, secret) {
    const banner = document.getElementById('page-sp-generated-banner');
    const titleEl = document.getElementById('page-sp-gen-title');
    const textEl = document.getElementById('page-sp-gen-text');
    const copyBtn = document.getElementById('page-sp-gen-copy-btn');
    if (!banner || !textEl) return;
    if (titleEl) titleEl.textContent = `New Access Credentials Generated — ${title}`;
    const msg = `${title}\nLink: ${url}\n${kindLabel}: ${secret}`;
    textEl.textContent = `Link: ${url}  ·  ${kindLabel}: ${secret}`;
    if (copyBtn) {
      copyBtn.setAttribute('data-copy-msg', msg);
      copyBtn.textContent = `Copy Link + ${kindLabel}`;
    }
    banner.style.display = 'flex';
  }

  function canCurrentUserManagePortals() {
    const rawRole = String(state.currentUser?.role || '').toLowerCase().trim();
    return isCurrentUserAdmin() || isCurrentUserStockManager() || rawRole === 'manager';
  }

  function resolvePortalAbsoluteUrl(entryPath) {
    try {
      return new URL(String(entryPath || 'gate.php'), window.location.href).href;
    } catch (_) {
      return String(entryPath || '');
    }
  }

  function renderStandalonePortalsPage() {
    const list = Array.isArray(state.standalonePortals) ? state.standalonePortals : [];
    const grid = document.getElementById('standalone-portals-grid');
    if (!grid) return;

    const canManage = canCurrentUserManagePortals();
    const addBtn = document.getElementById('open-add-portal-btn');
    if (addBtn) addBtn.style.display = canManage ? 'inline-flex' : 'none';

    const gateCount = list.filter((p) => p.portal_type === 'facility_gate').length;
    const bgCount = list.filter((p) => Boolean(p.background_image)).length;
    const onsiteRow = list.find((p) => p.portal_key === 'onsite' || p.portal_type === 'onsite_portal');

    const kpiTotal = document.getElementById('page-sp-kpi-total');
    const kpiGates = document.getElementById('page-sp-kpi-gates');
    const kpiBgs = document.getElementById('page-sp-kpi-bgs');
    const kpiOnsite = document.getElementById('page-sp-kpi-onsite-status');
    const sideCount = document.getElementById('sidebar-portals-count');
    if (kpiTotal) kpiTotal.textContent = String(list.length);
    if (kpiGates) kpiGates.textContent = String(gateCount);
    if (kpiBgs) kpiBgs.textContent = String(bgCount);
    if (kpiOnsite && onsiteRow) kpiOnsite.textContent = Number(onsiteRow.is_active) === 1 ? 'Active' : 'Paused';
    if (sideCount) sideCount.textContent = String(list.length || 4).padStart(2, '0');

    const onsiteCard = document.getElementById('page-sp-onsite-card');
    if (onsiteCard) {
      onsiteCard.style.display = isCurrentUserStockController() ? 'none' : 'block';
    }
    const pageSpUrlInp = document.getElementById('page-sp-onsite-url-input');
    if (pageSpUrlInp) {
      pageSpUrlInp.value = resolvePortalAbsoluteUrl('onsite.php');
    }

    const typeFilter = state.portalsTypeFilter || 'all';
    const q = (state.portalsSearch || '').trim().toLowerCase();
    const filtered = list.filter((p) => {
      if (typeFilter !== 'all' && p.portal_type !== typeFilter) return false;
      if (q) {
        const hay = `${p.title} ${p.subtitle} ${p.portal_key} ${p.entry_url} ${p.wh_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 12px;">
        No standalone gates or portals match your filter.
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map((p) => {
      const fullUrl = resolvePortalAbsoluteUrl(p.entry_url);
      const isOnsite = p.portal_type === 'onsite_portal';
      const isActive = Number(p.is_active) === 1;
      const hasBg = Boolean(p.background_image);
      const tintPct = Math.round(Number(p.overlay_opacity || 0.78) * 100);
      const safeTitle = escapeHtml(p.title);
      const safeSub = escapeHtml(p.subtitle || (isOnsite ? 'Read-Only Technician On-Site Directory' : `${p.wh_name || 'Facility Gate'} · ${p.wh_location || 'Kigali'}`));
      const bannerBgHtml = hasBg
        ? `<img src="${escapeHtml(p.background_image)}" alt="${safeTitle}" class="portal-crud-banner-img" />`
        : '';

      return `
        <article class="portal-crud-card" data-portal-id="${p.id}">
          <div class="portal-crud-banner${isOnsite ? ' is-onsite' : ''}">
            ${bannerBgHtml}
            <div class="portal-crud-banner-scrim"></div>
            <div class="portal-crud-banner-top">
              <span class="portal-bg-chip">${isOnsite ? 'On-Site Portal' : 'Facility Gate'}</span>
              <span class="status-badge ${isActive ? 'status-badge-green-sm' : 'status-badge-amber-sm'}">${isActive ? 'Active' : 'Paused'}</span>
            </div>
            <div class="portal-crud-banner-bottom">
              <span>${hasBg ? `Custom BG (${tintPct}% scrim)` : 'Default Backdrop'}</span>
              <span>${p.wh_code ? escapeHtml(p.wh_code) : (isOnsite ? 'READ-ONLY' : 'GATE')}</span>
            </div>
          </div>

          <div class="portal-crud-body">
            <div class="portal-crud-title-row">
              <div>
                <h3 class="portal-crud-title">${safeTitle}</h3>
                <div class="portal-crud-sub">${safeSub}</div>
              </div>
              ${!isOnsite ? `<span class="status-badge status-badge-purple-sm" style="white-space: nowrap;">${p.has_pin ? (p.terminal_pin ? `PIN: ${escapeHtml(p.terminal_pin)}` : 'PIN Protected') : 'No PIN'}</span>` : ''}
            </div>

            <div class="portal-url-row">
              <input type="text" class="portal-url-input" readonly value="${escapeHtml(fullUrl)}" aria-label="${safeTitle} URL" />
              <button type="button" class="btn btn-secondary-32-sm js-sp-copy-btn" data-url="${escapeHtml(fullUrl)}" data-label="${safeTitle}">Copy</button>
              <a href="${escapeHtml(p.entry_url)}" target="_blank" rel="noopener" class="btn btn-secondary-32-sm" style="text-decoration: none; white-space: nowrap;">Open ↗</a>
            </div>
          </div>

          <div class="portal-crud-footer">
            <span style="font-size: 11px; color: var(--text-muted);">Key: <code>${escapeHtml(p.portal_key)}</code></span>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${canManage && !isOnsite && p.wh_id ? `<button type="button" class="btn btn-secondary-32-sm js-sp-gen-pin-btn" data-portal-id="${p.id}" data-wh-id="${p.wh_id}" data-portal-title="${safeTitle}" data-url="${escapeHtml(fullUrl)}" style="color: #059669; border-color: #a7f3d0;">Generate PIN</button>` : ''}
              ${canManage && isOnsite ? `<button type="button" class="btn btn-secondary-32-sm js-sp-gen-onsite-btn" data-portal-id="${p.id}" data-portal-title="${safeTitle}" data-url="${escapeHtml(fullUrl)}" style="color: #059669; border-color: #a7f3d0;">Generate Pass</button>` : ''}
              ${canManage ? `<button type="button" class="btn btn-secondary-32-sm js-sp-edit-btn" data-portal-id="${p.id}">Customize / Edit</button>` : ''}
              ${canManage && hasBg ? `<button type="button" class="btn btn-secondary-32-sm js-sp-reset-bg-btn" data-portal-id="${p.id}" data-portal-title="${safeTitle}" style="color: #b45309;">Reset BG</button>` : ''}
              ${canManage && Number(p.is_system) !== 1 ? `<button type="button" class="btn btn-secondary-32-sm js-sp-delete-btn" data-portal-id="${p.id}" data-portal-title="${safeTitle}" style="color: #dc2626; border-color: #fecaca;">Delete</button>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadOnsiteShareIntoPortalsPage() {
    if (isCurrentUserStockController()) return;
    const enabledCb = document.getElementById('page-sp-onsite-enabled-cb');
    const pwdInp = document.getElementById('page-sp-onsite-pwd-input');
    const pwdHint = document.getElementById('page-sp-onsite-pwd-hint');
    const statusPill = document.getElementById('page-sp-onsite-pill');
    const urlInp = document.getElementById('page-sp-onsite-url-input');
    const invitePrev = document.getElementById('page-sp-onsite-invite-preview');
    const saveBtn = document.getElementById('page-sp-onsite-save-btn');
    const revokeBtn = document.getElementById('page-sp-onsite-revoke-btn');
    const genBtn = document.getElementById('page-sp-onsite-gen-btn');
    const kpiOnsite = document.getElementById('page-sp-kpi-onsite-status');

    const fallbackUrl = resolvePortalAbsoluteUrl('onsite.php');
    if (urlInp) urlInp.value = fallbackUrl;
    if (pwdInp) pwdInp.value = '';

    try {
      const res = await fetch('api.php?action=get_onsite_share_config');
      const data = await res.json();
      if (!res.ok || !data || !data.ok) return;

      const shareUrl = resolvePortalAbsoluteUrl(data.share_path || 'onsite.php');
      const isEn = Boolean(data.enabled);
      if (urlInp) urlInp.value = shareUrl;
      if (enabledCb) enabledCb.checked = isEn;
      if (statusPill) {
        statusPill.textContent = isEn ? 'Active' : 'Disabled';
        statusPill.className = isEn ? 'status-badge status-badge-green-sm' : 'status-badge status-badge-red-sm';
      }
      if (kpiOnsite) kpiOnsite.textContent = isEn ? 'Active' : 'Disabled';

      const canManage = Boolean(data.can_manage);
      if (enabledCb) enabledCb.disabled = !canManage;
      if (pwdInp) pwdInp.disabled = !canManage;
      if (saveBtn) saveBtn.style.display = canManage ? 'inline-flex' : 'none';
      if (revokeBtn) revokeBtn.style.display = canManage ? 'inline-flex' : 'none';
      if (genBtn) genBtn.style.display = canManage ? 'inline-flex' : 'none';

      if (data.is_default_password && data.default_password_preview) {
        if (pwdHint) pwdHint.textContent = `Current active passcode: "${data.default_password_preview}" (enter a custom password or Generate to change).`;
        if (invitePrev) {
          invitePrev.textContent = `aBility Live On-Site Crew Link:\nLink: ${shareUrl}\nPassword: ${data.default_password_preview}`;
        }
      } else {
        if (pwdHint) pwdHint.textContent = 'Custom hashed passcode is active. Enter a new passcode or click Generate to rotate.';
        if (invitePrev) invitePrev.textContent = `Link: ${shareUrl}\n(Custom technician password set by Administrator)`;
      }
    } catch (_) {}
  }

  function closePortalCrudModal() {
    const modal = document.getElementById('portal-crud-modal');
    if (modal) modal.classList.remove('open');
  }

  let selectedPortalBgFile = null;

  function setPortalModalBgPreview(src, filename, isExisting = false) {
    const promptEl = document.getElementById('portal-bg-prompt');
    const prevWrap = document.getElementById('portal-bg-preview-wrap');
    const prevImg = document.getElementById('portal-bg-preview-img');
    const nameEl = document.getElementById('portal-bg-filename');
    const resetBtn = document.getElementById('portal-bg-reset-btn');
    if (src) {
      if (prevImg) prevImg.src = src;
      if (nameEl) nameEl.textContent = filename || 'portal-background.jpg';
      if (promptEl) promptEl.style.display = 'none';
      if (prevWrap) prevWrap.style.display = 'flex';
      if (resetBtn) resetBtn.style.display = 'inline-block';
    } else {
      if (prevImg) prevImg.src = '';
      if (promptEl) promptEl.style.display = 'block';
      if (prevWrap) prevWrap.style.display = 'none';
      if (resetBtn) resetBtn.style.display = isExisting ? 'inline-block' : 'none';
    }
  }

  function syncPortalModalTypeFields() {
    const typeSel = document.getElementById('portal-crud-type');
    const whWrap = document.getElementById('portal-crud-wh-wrap');
    const pinWrap = document.getElementById('portal-crud-pin-wrap');
    const onsitePwdWrap = document.getElementById('portal-crud-onsite-pwd-wrap');
    const isGate = !typeSel || typeSel.value === 'facility_gate';
    if (whWrap) whWrap.style.display = isGate ? 'block' : 'none';
    if (pinWrap) pinWrap.style.display = isGate ? 'block' : 'none';
    if (onsitePwdWrap) onsitePwdWrap.style.display = isGate ? 'none' : 'block';
  }

  function openPortalCrudModal(portal = null) {
    const modal = document.getElementById('portal-crud-modal');
    if (!modal) return;
    selectedPortalBgFile = null;
    const fileInp = document.getElementById('portal-crud-bg-file');
    if (fileInp) fileInp.value = '';

    const titleHead = document.getElementById('portal-crud-modal-title');
    const sysBadge = document.getElementById('portal-crud-system-badge');
    const idEl = document.getElementById('portal-crud-id');
    const removeBgEl = document.getElementById('portal-crud-remove-bg');
    const titleEl = document.getElementById('portal-crud-title');
    const keyEl = document.getElementById('portal-crud-key');
    const subEl = document.getElementById('portal-crud-subtitle');
    const typeEl = document.getElementById('portal-crud-type');
    const whEl = document.getElementById('portal-crud-wh-id');
    const urlEl = document.getElementById('portal-crud-url');
    const pinEl = document.getElementById('portal-crud-pin');
    const onsitePwdEl = document.getElementById('portal-crud-onsite-pwd');
    const opEl = document.getElementById('portal-crud-opacity');
    const opValEl = document.getElementById('portal-crud-opacity-val');
    const activeEl = document.getElementById('portal-crud-active');
    const bestForEl = document.getElementById('portal-crud-best-for');
    const permsEl = document.getElementById('portal-crud-permissions');
    const expEl = document.getElementById('portal-crud-expires-at');
    const allowScanEl = document.getElementById('portal-crud-allow-scan');
    const maskPhonesEl = document.getElementById('portal-crud-mask-phones');

    if (whEl) {
      const whs = state.checkpoints?.stock_warehouses || [];
      whEl.innerHTML = '<option value="">Select Facility Gate Location...</option>' +
        whs.map((w) => `<option value="${escapeHtml(String(w.id))}">${escapeHtml(w.name)} (${escapeHtml(w.code || 'STK')})</option>`).join('');
    }

    if (removeBgEl) removeBgEl.value = '0';
    if (onsitePwdEl) onsitePwdEl.value = '';

    if (portal) {
      const isSys = Number(portal.is_system) === 1;
      if (titleHead) titleHead.textContent = `Customize Portal: ${portal.title}`;
      if (sysBadge) sysBadge.textContent = isSys ? 'Core Portal' : 'Custom Portal';
      if (idEl) idEl.value = String(portal.id || 0);
      if (titleEl) titleEl.value = portal.title || '';
      if (keyEl) {
        keyEl.value = portal.portal_key || '';
        keyEl.disabled = isSys;
      }
      if (subEl) subEl.value = portal.subtitle || '';
      if (typeEl) {
        typeEl.value = portal.portal_type || 'facility_gate';
        typeEl.disabled = isSys;
      }
      if (whEl) {
        whEl.value = portal.wh_id ? String(portal.wh_id) : '';
        whEl.disabled = isSys && portal.portal_type === 'onsite_portal';
      }
      if (urlEl) {
        urlEl.value = portal.entry_url || '';
        urlEl.readOnly = isSys;
      }
      if (pinEl) pinEl.value = portal.terminal_pin || '';
      if (bestForEl) bestForEl.value = portal.best_for || '';
      if (permsEl) permsEl.value = portal.permissions_summary || '';
      if (expEl) expEl.value = portal.expires_at ? String(portal.expires_at).replace(' ', 'T').slice(0, 16) : '';
      if (allowScanEl) allowScanEl.checked = Number(portal.allow_scan ?? (portal.portal_type === 'onsite_portal' ? 0 : 1)) === 1;
      if (maskPhonesEl) maskPhonesEl.checked = Number(portal.mask_phones ?? 0) === 1;
      const opNum = Math.max(0.20, Math.min(0.95, Number(portal.overlay_opacity || 0.78)));
      if (opEl) opEl.value = opNum.toFixed(2);
      if (opValEl) opValEl.textContent = `${Math.round(opNum * 100)}%`;
      if (activeEl) activeEl.checked = Number(portal.is_active) === 1;
      setPortalModalBgPreview(portal.background_image || '', portal.background_image ? portal.background_image.split('/').pop() : '', Boolean(portal.background_image));
    } else {
      if (titleHead) titleHead.textContent = 'Add Standalone Gate / Portal';
      if (sysBadge) sysBadge.textContent = 'New Portal';
      if (idEl) idEl.value = '0';
      if (titleEl) titleEl.value = '';
      if (keyEl) {
        keyEl.value = '';
        keyEl.disabled = false;
      }
      if (subEl) subEl.value = '';
      if (typeEl) {
        typeEl.value = 'facility_gate';
        typeEl.disabled = false;
      }
      if (whEl) {
        whEl.value = '';
        whEl.disabled = false;
      }
      if (urlEl) {
        urlEl.value = '';
        urlEl.readOnly = false;
      }
      if (pinEl) pinEl.value = '';
      if (bestForEl) bestForEl.value = '';
      if (permsEl) permsEl.value = '';
      if (expEl) expEl.value = '';
      if (allowScanEl) allowScanEl.checked = true;
      if (maskPhonesEl) maskPhonesEl.checked = false;
      if (opEl) opEl.value = '0.78';
      if (opValEl) opValEl.textContent = '78%';
      if (activeEl) activeEl.checked = true;
      setPortalModalBgPreview('', '', false);
    }

    syncPortalModalTypeFields();
    modal.classList.add('open');
  }

  function renderDedicatedNavPages(onlyScreen = null) {
    if (!onlyScreen || onlyScreen === 'events') renderVenueSecurityPage();
    if (!onlyScreen || onlyScreen === 'create-event') renderCreateEventPage();
    if (!onlyScreen || onlyScreen === 'dispatch-flow') renderDispatchFlowPage();
    if (!onlyScreen || onlyScreen === 'shift-relief') renderShiftReliefPage();
    if (!onlyScreen || onlyScreen === 'calltime') renderCallTimePage();
    if (!onlyScreen || onlyScreen === 'rollcall') renderRollCallPage();
    if (!onlyScreen || onlyScreen === 'station-lock') renderStationLockPage();
    if (!onlyScreen || onlyScreen === 'reset-scans') renderResetScansPage();
    if (!onlyScreen || onlyScreen === 'standalone-portals') renderStandalonePortalsPage();
    if (!onlyScreen || onlyScreen === 'settings') renderSettingsScreen();
    if (onlyScreen === 'custom-nav-page' || (state.activeScreen && document.getElementById('screen-custom-nav-page')?.classList.contains('active'))) {
      renderCustomNavPage(state.customNavScreenKey || state.activeScreen);
    }
  }

  function populateRoleDropdowns() {
    const roleSelects = [
      document.getElementById('user-modal-role'),
      document.getElementById('reg-role'),
    ];

    if (Array.isArray(state.roles) && state.roles.length > 0) {
      roleSelects.forEach((sel) => {
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = state.roles.map((r) => `
          <option value="${escapeHtml(r.role_key)}">${escapeHtml(r.title)} (${escapeHtml(r.clearance_code || 'L2')})</option>
        `).join('');
        if (currentVal && Array.from(sel.options).some((o) => o.value === currentVal)) {
          sel.value = currentVal;
        }
      });
    }

    // Populate department select dropdowns in Role modal, User modal, and filters
    const deptSelects = [
      document.getElementById('role-modal-dept-select'),
      document.getElementById('filter-dept'),
      document.getElementById('user-modal-department'),
      document.getElementById('reg-department'),
    ];
    const depts = (state.departments || []).map((d) => d.name).filter(Boolean);
    if (depts.length > 0) {
      deptSelects.forEach((sel) => {
        if (!sel) return;
        const currentVal = sel.value;
        const isFilter = sel.id === 'filter-dept';
        let opts = isFilter ? '<option value="all">All Departments</option>' : '';
        opts += depts.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
        sel.innerHTML = opts;
        if (currentVal && Array.from(sel.options).some((o) => o.value === currentVal)) {
          sel.value = currentVal;
        }
      });
    }
  }

  function renderUsersScreen() {
    const rowsEl = document.getElementById('users-table-rows') || document.getElementById('users-table-body');
    if (!rowsEl) return;
    populateRoleDropdowns();
    renderUsersDelegationBanner();
    renderRolesScreen();

    const crew = Array.isArray(state.crew) ? state.crew : [];

    // Update sidebar count
    const sideUserCount = document.getElementById('sidebar-users-count');
    if (sideUserCount) {
      sideUserCount.textContent = String(crew.length).padStart(2, '0');
    }

    // Calculate metrics
    const totalCount = crew.length;
    const activeBadges = crew.filter((c) => c.badge_status === 'active').length;
    const stockAuth = crew.filter((c) => c.clearance_code !== 'L1' && c.badge_status === 'active').length;
    const uniqueDepts = Array.from(new Set(crew.map((c) => c.department).filter(Boolean)));
    const deptCount = uniqueDepts.length;

    const elTotal = document.getElementById('users-kpi-total');
    const elActive = document.getElementById('users-kpi-active');
    const elStock = document.getElementById('users-kpi-stock');
    const elDepts = document.getElementById('users-kpi-depts');
    const elBadge = document.getElementById('users-badge-count');

    if (elTotal) elTotal.textContent = String(totalCount).padStart(2, '0');
    if (elActive) elActive.textContent = String(activeBadges).padStart(2, '0');
    if (elStock) elStock.textContent = String(stockAuth).padStart(2, '0');
    if (elDepts) elDepts.textContent = String(deptCount).padStart(2, '0');
    if (elBadge) elBadge.textContent = `${totalCount} Staff`;
    const elPillCrew = document.getElementById('pill-personnel-count');
    if (elPillCrew) elPillCrew.textContent = String(totalCount);
    const elPillMatrix = document.getElementById('pill-matrix-count');
    if (elPillMatrix) elPillMatrix.textContent = String(state.clearanceMatrix ? state.clearanceMatrix.length : 0);

    // Tab counts
    const techRoles = ['technician', 'sound_engineer', 'lighting_tech', 'video_director', 'stage_manager', 'rigging_lead'];
    const stockRoles = ['stock_controller', 'stock_manager'];
    const mgmtRoles = ['admin', 'project_manager', 'tech_lead', 'manager'];

    const techCount = crew.filter((c) => techRoles.includes(c.role)).length;
    const stockCtrlCount = crew.filter((c) => stockRoles.includes(c.role)).length;
    const mgmtCount = crew.filter((c) => mgmtRoles.includes(c.role)).length;
    const suspendedCount = crew.filter((c) => c.badge_status !== 'active' || Number(c.is_active) === 0).length;

    const tabAll = document.getElementById('users-tab-count-all');
    const tabTech = document.getElementById('users-tab-count-tech');
    const tabStock = document.getElementById('users-tab-count-stock');
    const tabMgmt = document.getElementById('users-tab-count-mgmt');
    const tabSusp = document.getElementById('users-tab-count-suspended');

    if (tabAll) tabAll.textContent = String(totalCount);
    if (tabTech) tabTech.textContent = String(techCount);
    if (tabStock) tabStock.textContent = String(stockCtrlCount);
    if (tabMgmt) tabMgmt.textContent = String(mgmtCount);
    if (tabSusp) tabSusp.textContent = String(suspendedCount);

    // Populate Department dropdown filter if not already populated or changed
    const deptFilterEl = document.getElementById('users-filter-dept');
    if (deptFilterEl && deptFilterEl.options.length <= 1) {
      uniqueDepts.sort().forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptFilterEl.appendChild(opt);
      });
    }

    // Filtering
    let filtered = crew.filter((c) => {
      // Tab filter
      if (state.usersTab === 'technicians' && !techRoles.includes(c.role)) return false;
      if (state.usersTab === 'stock_controllers' && !stockRoles.includes(c.role)) return false;
      if (state.usersTab === 'managers' && !mgmtRoles.includes(c.role)) return false;
      if (state.usersTab === 'suspended' && c.badge_status === 'active' && Number(c.is_active) === 1) return false;

      // Department filter
      if (state.usersFilterDept !== 'all' && c.department !== state.usersFilterDept) return false;

      // Clearance filter
      if (state.usersFilterTier !== 'all' && c.clearance_code !== state.usersFilterTier) return false;

      // Search query filter
      if (state.usersSearch) {
        const q = state.usersSearch.toLowerCase().trim();
        const str = `${c.full_name} ${c.username} ${c.badge_code} ${c.rfid_uid} ${c.phone} ${c.email} ${c.role_display} ${c.department}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });

    // Pagination
    const totalItems = filtered.length;
    const perPage = state.usersPerPage || 5;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    if (state.usersPage > totalPages) state.usersPage = totalPages;
    if (state.usersPage < 1) state.usersPage = 1;

    const startIndex = (state.usersPage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalItems);
    const pagedUsers = filtered.slice(startIndex, endIndex);

    // Render Table Rows
    if (pagedUsers.length === 0) {
      rowsEl.innerHTML = `
        <div style="padding: 36px 20px; text-align: center; color: var(--text-secondary); font-size: 13px; border-bottom: 1px solid var(--border-color);">
          No personnel found matching the selected filter criteria.
        </div>
      `;
    } else {
      rowsEl.innerHTML = pagedUsers.map((c) => {
        const isSusp = c.badge_status !== 'active' || Number(c.is_active) === 0;
        const statusBadge = isSusp
          ? `<span class="status-badge status-badge-red-sm">Suspended</span>`
          : `<span class="status-badge status-badge-green-sm">Active</span>`;

        const avatarHtml = c.profile_image_url
          ? `<img src="${escapeHtml(c.profile_image_url)}" alt="${escapeHtml(c.full_name)}" class="user-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
             <div class="user-avatar-wrap" style="display:none;">${escapeHtml(c.initials)}</div>`
          : `<div class="user-avatar-wrap">${escapeHtml(c.initials)}</div>`;

        return `
          <div class="data-table-row" data-user-id="${c.id}" style="height: 64px;">
            <div class="col-user-personnel" style="flex: 1 0 240px; min-width: 0; display: flex; align-items: center; gap: 12px;">
              <div class="user-avatar-wrap" style="${c.profile_image_url ? 'padding: 0;' : ''}">
                ${avatarHtml}
              </div>
              <div class="user-name-stack" style="min-width: 0; overflow: hidden;">
                <span class="user-full-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.full_name)}</span>
                <span class="user-username">@${escapeHtml(c.username)}</span>
              </div>
            </div>
            <div class="col-user-role" style="width: 170px; display: flex; flex-direction: column; gap: 3px;">
              <span style="font-weight: 600; font-size: 12px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.role_display)}</span>
              <span class="dept-pill">${escapeHtml(c.department)}</span>
            </div>
            <div class="col-user-tier" style="width: 180px;">
              <span class="tier-pill-soft ${escapeHtml(c.clearance_code)}">
                <span class="tier-code-badge tier-code-${escapeHtml(c.clearance_code)}">${escapeHtml(c.clearance_code)}</span>
                <span>${escapeHtml(c.clearance_short)}</span>
              </span>
            </div>
            <div class="col-user-badge" style="width: 170px; display: flex; flex-direction: column; gap: 2px;">
              <span class="user-badge-code">${escapeHtml(c.badge_code)}</span>
              <span class="user-rfid-uid">${escapeHtml(c.rfid_uid)}</span>
            </div>
            <div class="col-user-contact" style="width: 180px; display: flex; flex-direction: column; gap: 2px;">
              <span class="user-phone">${escapeHtml(c.phone)}</span>
              <span class="user-email" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.email)}</span>
            </div>
            <div class="col-user-status" style="width: 90px;">
              ${statusBadge}
            </div>
            <div class="col-user-actions" style="width: 170px; display: flex; justify-content: flex-end; align-items: center; gap: 6px; flex-wrap: wrap;">
              ${Number(c.trusted_device_count || 0) > 0 && (isCurrentUserAdmin() || isCurrentUserStockManager()) ? `<button type="button" class="btn btn-secondary-32-sm js-reset-device-btn" data-user-id="${c.id}" data-user-name="${escapeHtml(c.full_name)}" title="Reset bound phone/device lock">📱 Unbind</button>` : ''}
              <button type="button" class="btn btn-secondary-32-sm js-edit-user-btn" data-user-id="${c.id}" title="Edit User & Permissions">
                Edit
              </button>
              <button type="button" class="btn btn-secondary-32-sm js-delete-user-btn" data-user-id="${c.id}" data-user-name="${escapeHtml(c.full_name)}" style="color: #dc2626; border-color: #fecaca;" title="Delete User">
                Delete
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Pagination Footer
    const footerCount = document.getElementById('users-results-footer');
    if (footerCount) {
      if (totalItems === 0) {
        footerCount.textContent = 'Showing 0 personnel';
      } else {
        footerCount.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} personnel (Page ${state.usersPage} of ${totalPages})`;
      }
    }

    const pageControls = document.getElementById('users-page-controls');
    if (pageControls) {
      let pageHtml = '';
      pageHtml += `
        <button type="button" class="btn btn-secondary-32-sm js-users-page-prev" ${state.usersPage <= 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          Prev
        </button>
      `;
      for (let p = 1; p <= totalPages; p++) {
        const isActive = p === state.usersPage;
        pageHtml += `
          <button type="button" class="btn ${isActive ? 'btn-primary-38' : 'btn-secondary-32-sm'} js-users-page-num" data-page="${p}" style="min-width: 32px; height: 32px; padding: 0 8px; font-size: 12px; font-weight: ${isActive ? '700' : '500'};">
            ${p}
          </button>
        `;
      }
      pageHtml += `
        <button type="button" class="btn btn-secondary-32-sm js-users-page-next" ${state.usersPage >= totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          Next
        </button>
      `;
      pageControls.innerHTML = pageHtml;
    }
  }

  function openDeleteModal(type, id, name) {
    const modal = document.getElementById('confirm-delete-modal');
    if (!modal) return;
    const typeInput = document.getElementById('delete-target-type');
    const idInput = document.getElementById('delete-target-id');
    const descEl = document.getElementById('delete-modal-desc');

    if (typeInput) typeInput.value = type;
    if (idInput) idInput.value = id;
    if (descEl) {
      const typeLabel =
        type === 'warehouse'
          ? 'facility gate'
          : type === 'user'
          ? 'personnel record & badge credentials for'
          : type === 'clearance_tier'
          ? 'security clearance level'
          : 'record';
      descEl.textContent = `Are you sure you want to delete ${typeLabel} "${name}"? This action will permanently remove it from MySQL.`;
    }

    modal.classList.add('open');
  }

  // Dropzone helper utilities
  function resetDropzone(prefix) {
    const fileInput = document.getElementById(`${prefix}-modal-image`);
    const promptEl = document.getElementById(`${prefix}-dropzone-prompt`);
    const previewEl = document.getElementById(`${prefix}-dropzone-preview`);
    const previewImg = document.getElementById(`${prefix}-preview-img`);
    const filenameEl = document.getElementById(`${prefix}-preview-filename`);

    if (fileInput) fileInput.value = '';
    if (promptEl) promptEl.style.display = 'flex';
    if (previewEl) previewEl.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (filenameEl) filenameEl.textContent = '';
    if (prefix === 'ce' && typeof updateCreateEventLivePreview === 'function') {
      updateCreateEventLivePreview();
    }
  }

  function setDropzonePreview(prefix, imgSrc, filename) {
    const promptEl = document.getElementById(`${prefix}-dropzone-prompt`);
    const previewEl = document.getElementById(`${prefix}-dropzone-preview`);
    const previewImg = document.getElementById(`${prefix}-preview-img`);
    const filenameEl = document.getElementById(`${prefix}-preview-filename`);

    if (promptEl) promptEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'flex';
    if (previewImg) previewImg.src = imgSrc;
    if (filenameEl) filenameEl.textContent = filename || 'Existing image';
    if (prefix === 'ce' && typeof updateCreateEventLivePreview === 'function') {
      updateCreateEventLivePreview();
    }
  }

  function setupDropzoneEvents(prefix) {
    const dropzone = document.getElementById(`${prefix}-dropzone`);
    const fileInput = document.getElementById(`${prefix}-modal-image`);
    const removeBtn = document.getElementById(`${prefix}-remove-image-btn`);

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', (e) => {
      if (e.target.closest(`#${prefix}-remove-image-btn`)) return;
      fileInput.click();
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(fileInput.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFileSelect(fileInput.files[0]);
      }
    });

    function handleFileSelect(file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, WEBP)', 'error');
        return;
      }
      if (prefix === 'venue') {
        const rmEl = document.getElementById('venue-crud-remove-image');
        if (rmEl) rmEl.value = '0';
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setDropzonePreview(prefix, e.target.result, file.name);
        if (prefix === 'ce' || prefix === 'venue') {
          showToast(`Cover image selected: ${file.name}`, 'info');
        }
      };
      reader.readAsDataURL(file);
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }
  }

  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================

  let triggerResetTodayScans = null;

  function bindEvents() {
    function handleSidebarNavInteraction(btn) {
      if (!btn) return;
      const target = btn.getAttribute('data-nav-target');
      const action = btn.getAttribute('data-nav-action');

      if (target) {
        if (target === 'terminals') {
          state.terminalScreenLocked = true;
          localStorage.setItem('ability_terminal_screen_locked', '1');
          const errEl = document.getElementById('terminal-unlock-error');
          const pinInp = document.getElementById('terminal-unlock-pin-input');
          if (errEl) errEl.textContent = '';
          if (pinInp) pinInp.value = '';
          renderTerminalLockScreen();
        }
        switchScreen(target);
        return;
      }

      if (action === 'venue-security') {
        switchScreen('venue-security');
        return;
      }

      if (action === 'access-matrix') {
        if (!isCurrentUserAdmin()) {
          showToast('Access Restricted: Security Clearance Matrix configuration requires Administrator privileges.');
          return;
        }
        switchScreen('access-matrix', 'matrix-config-section');
        return;
      }

      if (action === 'action:shift-relief' || action === 'shift-relief') {
        openShiftRequestModal();
        return;
      }

      if (action === 'action:calltime' || action === 'calltime') {
        if (!canCurrentUserSetCallTime()) {
          showToast('Access Restricted: Setting Call Times requires Tech Lead, Stock Manager, or Administrator privileges.');
          return;
        }
        const cp = state.activeCheckpoint;
        openCallTimeModal(cp ? cp.type : null, cp ? cp.id : null, cp ? cp.name : null, cp ? cp.call_time : null);
        return;
      }

      if (action === 'action:rollcall' || action === 'rollcall') {
        renderRollCallModalList();
        const rcModal = document.getElementById('rollcall-modal');
        if (rcModal) rcModal.classList.add('open');
        return;
      }

      if (action === 'action:station-lock' || action === 'station-lock') {
        if (isCurrentUserStockController()) {
          const assignedName = state.currentUser?.assigned_checkpoint_name || state.activeCheckpoint?.name || 'your assigned terminal';
          showToast(`Gate Controller locked to ${assignedName}. Click Relief / Swap to request a terminal change.`);
          return;
        }
        if (!isCurrentUserAdmin() && !isCurrentUserStockManager() && !isCurrentUserTechLead()) {
          showToast('Access Restricted: Station PIN Locking requires Technical Lead, Site Manager, or Administrator privileges.');
          return;
        }
        const cpNameEl = document.getElementById('station-lock-cp-name');
        const pinInput = document.getElementById('station-pin-input');
        if (cpNameEl) cpNameEl.textContent = state.activeCheckpoint?.name || 'Active Checkpoint';
        if (pinInput) {
          pinInput.value = '';
          setTimeout(() => pinInput.focus(), 50);
        }
        const lkModal = document.getElementById('station-lock-modal');
        if (lkModal) lkModal.classList.add('open');
        return;
      }

      if (action === 'action:reset-scans' || action === 'reset-scans') {
        if (typeof triggerResetTodayScans === 'function') {
          triggerResetTodayScans();
        }
        return;
      }

      if (action === 'action:onsite-share' || action === 'onsite-share' || action === 'action:standalone-portals') {
        const rawRole = String(state.currentUser?.role || '').trim().toLowerCase();
        const isAllowedPortalViewer =
          isCurrentUserAdmin() ||
          isCurrentUserStockManager() ||
          isCurrentUserTechLead() ||
          rawRole === 'manager' ||
          rawRole === 'project_manager' ||
          isCurrentUserStockController();
        if (!isAllowedPortalViewer) {
          showToast('Access Restricted: Opening standalone gate & on-site portals requires Controller, Supervisor, or Administrator privileges.');
          return;
        }
        if (typeof openOnsiteShareModal === 'function') {
          openOnsiteShareModal();
        }
        return;
      }

      if (action) {
        if (action.startsWith('http://') || action.startsWith('https://') || action.endsWith('.html') || action.endsWith('.php')) {
          window.open(action, '_blank', 'noopener');
        } else if (action.startsWith('#')) {
          window.location.hash = action;
        } else {
          switchScreen(action);
        }
      }
    }

    // Delegated Sidebar Main Navigation (supports dynamic CRUD & enable/disable)
    const mainNavGroup = document.querySelector('.sidebar .nav-group[aria-label="Main navigation"]');
    if (mainNavGroup) {
      mainNavGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (!btn) return;
        handleSidebarNavInteraction(btn);
      });
    }

    // Delegated Sidebar Checkpoint Controls (Workspace Navigation)
    const workspaceNavGroup = document.getElementById('sidebar-checkpoint-controls');
    if (workspaceNavGroup) {
      workspaceNavGroup.addEventListener('click', (e) => {
        const subBtn = e.target.closest('.nav-subitem[data-settings-section]');
        if (subBtn) {
          const sec = subBtn.getAttribute('data-settings-section') || 'flow';
          if (state.activeScreen !== 'settings') {
            state.settingsTab = sec;
            switchScreen('settings');
          } else {
            switchSettingsTab(sec);
          }
          return;
        }
        const btn = e.target.closest('.nav-item');
        if (!btn) return;
        if (btn.getAttribute('data-nav-target') === 'settings') {
          const grp = document.getElementById('sidebar-settings-group');
          const sub = document.getElementById('sidebar-settings-submenu');
          if (state.activeScreen === 'settings' && grp && sub) {
            const nowOpen = !grp.classList.contains('is-open');
            grp.classList.toggle('is-open', nowOpen);
            sub.style.display = nowOpen ? 'flex' : 'none';
            btn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
            return;
          }
        }
        handleSidebarNavInteraction(btn);
      });
    }

    const navDisabledNotice = document.getElementById('sidebar-nav-disabled-notice');
    if (navDisabledNotice) {
      navDisabledNotice.addEventListener('click', () => {
        if (!isCurrentUserAdmin()) return;
        state.usersViewMode = 'navigation';
        switchScreen('users');
      });
    }

    const workspaceNavDisabledNotice = document.getElementById('sidebar-workspace-disabled-notice');
    if (workspaceNavDisabledNotice) {
      workspaceNavDisabledNotice.addEventListener('click', () => {
        if (!isCurrentUserAdmin()) return;
        state.usersViewMode = 'navigation';
        switchScreen('users');
      });
    }

    const brandHome = document.getElementById('brand-home-btn');
    if (brandHome) {
      brandHome.addEventListener('click', () => {
        if (isCurrentUserStockController() || isCurrentUserTechnician()) {
          switchScreen('terminals', 'pane-kiosk');
        } else {
          switchScreen('overview');
        }
      });
    }

    // Generic data-action buttons
    document.body.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const act = actionBtn.getAttribute('data-action');
        if (act === 'go-kiosk') {
          switchScreen('terminals', 'pane-kiosk');
        } else if (act === 'go-attendees') {
          switchScreen('attendees');
        } else if (act === 'go-events') {
          switchScreen('events');
        } else if (act === 'go-overview') {
          switchScreen('overview');
        } else if (act === 'go-analytics') {
          switchScreen('access-matrix');
        }
      }
    });

    // Checkpoint Type Toggle Buttons (`Facility Gate` vs `Event Venue`)
    document.querySelectorAll('.js-cp-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isCurrentUserStockController()) {
          const assignedName = state.currentUser?.assigned_checkpoint_name || state.activeCheckpoint?.name || 'your assigned terminal';
          showToast(`Gate Controller locked: Assigned strictly to ${assignedName}. Use Relief / Swap to request reassignment.`);
          return;
        }
        if (state.stationLocked) {
          const cpName = state.activeCheckpoint?.name || 'this checkpoint';
          showToast(`Station PIN locked to ${cpName}. Click the Station Lock pill to unlock with your Site PIN.`);
          return;
        }
        const newType = btn.getAttribute('data-cp-type');
        if (newType === state.checkpointType) return;
        state.checkpointType = newType;
        const list =
          newType === 'stock_warehouse'
            ? state.checkpoints.stock_warehouses || []
            : state.checkpoints.event_venues || [];
        if (list.length > 0) {
          state.checkpointId = Number(list[0].id);
        }
        fetchBootstrap(false);
        showToast(
          newType === 'stock_warehouse'
            ? 'Checkpoint Mode: Facility Gate (L2–L4 Required; L1 Blocked)'
            : 'Checkpoint Mode: Event Venue Main Entrance (L1–L4 Authorized)'
        );
      });
    });

    // Target Checkpoint Dropdown
    document.querySelectorAll('.js-checkpoint-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        if (isCurrentUserStockController()) {
          renderCheckpointSelectors();
          showToast('Checkpoint Locked: Gate Controllers cannot switch terminals without Administrator or Site Manager relief approval.');
          return;
        }
        if (state.stationLocked) return;
        state.checkpointId = Number(e.target.value);
        fetchBootstrap(false);
      });
    });

    // Scan Mode Select (synced across Terminals and ID Badges & Kiosk)
    const scanModeSelects = document.querySelectorAll('.js-scan-mode-select, #kiosk-scan-mode-select');
    scanModeSelects.forEach((sel) => {
      sel.addEventListener('change', (e) => {
        state.scanMode = e.target.value;
        scanModeSelects.forEach((other) => {
          if (other !== e.target) other.value = state.scanMode;
        });
        showToast(`Scan Mode set to: ${e.target.options[e.target.selectedIndex].text}`);
      });
    });

    // Focus Badge Scanner button
    const focusBtn = document.getElementById('focus-kiosk-scanner-btn');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        if (state.terminalScreenLocked) {
          const pinInp = document.getElementById('terminal-unlock-pin-input');
          if (pinInp) {
            pinInp.focus();
            pinInp.select();
          }
        } else {
          const inp = document.getElementById('kiosk-badge-input');
          if (inp) {
            inp.focus();
            inp.select();
          }
        }
      });
    }

    // Auto-search and instant live preview for Kiosk Badge Input
    const kioskInput = document.getElementById('kiosk-badge-input');
    const kioskMatchTag = document.getElementById('kiosk-search-match-tag');
    const kioskClearBtn = document.getElementById('kiosk-input-clear-btn');
    let autoScanTimeout = null;

    if (kioskInput) {
      kioskInput.addEventListener('input', () => {
        const query = kioskInput.value.trim();
        if (autoScanTimeout) {
          clearTimeout(autoScanTimeout);
          autoScanTimeout = null;
        }

        if (!query) {
          if (kioskMatchTag) {
            kioskMatchTag.style.display = 'none';
            kioskMatchTag.textContent = '';
          }
          if (kioskClearBtn) kioskClearBtn.style.display = 'none';
          return;
        }

        if (kioskClearBtn) kioskClearBtn.style.display = 'flex';

        // Auto-search matching crew member
        const matched = findCrewMember(query);
        if (matched) {
          if (kioskMatchTag) {
            kioskMatchTag.style.display = 'inline-flex';
            kioskMatchTag.innerHTML = `
              <span class="tier-code-badge tier-code-${escapeHtml(matched.clearance_code)}">${escapeHtml(matched.clearance_code)}</span>
              <span>${escapeHtml(matched.full_name)} (${escapeHtml(matched.badge_code)})</span>
            `;
          }

          // Live preview in Verification Deck immediately
          state.selectedCrewId = Number(matched.id);
          state.currentVerification = buildClientVerificationFromMember(matched);
          renderVerificationDeck();
          highlightSelectedCrewRow(matched.id);

          // If query matches a full barcode pattern or exact code, auto-record with brief debounce
          const isExactBarcodePattern =
            /^(REW-BADGE-\d{4}|ABL-BDG-\d{4}|ABL-\d{3,4})$/i.test(query) ||
            query.toLowerCase() === (matched.badge_code || '').toLowerCase() ||
            query.toLowerCase() === (matched.rfid_uid || '').toLowerCase();

          if (isExactBarcodePattern) {
            autoScanTimeout = setTimeout(() => {
              triggerGateScan(matched.badge_code);
            }, 400);
          }
        } else {
          if (kioskMatchTag) {
            kioskMatchTag.style.display = 'inline-flex';
            kioskMatchTag.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">No matching crew</span>`;
          }
        }
      });
    }

    if (kioskClearBtn) {
      kioskClearBtn.addEventListener('click', () => {
        if (autoScanTimeout) {
          clearTimeout(autoScanTimeout);
          autoScanTimeout = null;
        }
        if (kioskInput) {
          kioskInput.value = '';
          kioskInput.focus();
        }
        if (kioskMatchTag) {
          kioskMatchTag.style.display = 'none';
          kioskMatchTag.textContent = '';
        }
        kioskClearBtn.style.display = 'none';
      });
    }

    // Kiosk Scan Form Submit
    const scanForm = document.getElementById('kiosk-scan-form');
    if (scanForm) {
      scanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (autoScanTimeout) {
          clearTimeout(autoScanTimeout);
          autoScanTimeout = null;
        }
        const inp = document.getElementById('kiosk-badge-input');
        const val = inp ? inp.value.trim() : '';
        if (!val) {
          showToast('Enter or scan a Badge Code (e.g. REW-BADGE-0006)');
          return;
        }
        const matched = findCrewMember(val);
        triggerGateScan(matched ? (matched.badge_code || val) : val);
      });
    }

    // =========================================================================
    // TOPBAR UTILITIES & CONTROLS
    // =========================================================================

    // Breadcrumb root navigates home to overview
    const bcWs = document.getElementById('breadcrumb-workspace');
    if (bcWs) {
      bcWs.addEventListener('click', () => switchScreen('overview'));
    }

    // Database Sync Pill click
    const dbPill = document.getElementById('topbar-db-pill');
    if (dbPill) {
      dbPill.addEventListener('click', async () => {
        dbPill.classList.add('syncing');
        const dbText = document.getElementById('topbar-db-text');
        if (dbText) dbText.textContent = 'Syncing Database...';
        try {
          const res = await fetch('api.php?action=sync_db');
          const d = await res.json();
          if (d && d.ok) {
            if (d.payload) applyBootstrapPayload(d.payload);
            showToast(d.message || 'Database synchronized with live attendance records!');
          } else {
            await fetchBootstrap();
            showToast('Database connection verified & synchronized!');
          }
        } catch (err) {
          showToast('Database connection verified (Offline Cache)');
        } finally {
          dbPill.classList.remove('syncing');
          renderTopbarAndKpis();
        }
      });
    }

    // Global Keyboard Shortcut: ⌘K or Ctrl+K to focus search, Escape to close dropdowns
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const topSearch = document.getElementById('topbar-search-input');
        if (topSearch) {
          topSearch.focus();
          topSearch.select();
        }
      }
      if (e.key === 'Escape') {
        closeAllTopbarDropdowns();
      }
    });

    // Topbar Quick Search & Real-Time Suggestions Popover
    const topSearch = document.getElementById('topbar-search-input');
    const searchDropdown = document.getElementById('topbar-search-dropdown');
    if (topSearch && searchDropdown) {
      topSearch.addEventListener('input', () => {
        const q = topSearch.value.trim().toLowerCase();
        if (!q) {
          searchDropdown.style.display = 'none';
          searchDropdown.innerHTML = '';
          return;
        }
        const matches = state.crew.filter((c) =>
          (c.full_name || '').toLowerCase().includes(q) ||
          (c.badge_code || '').toLowerCase().includes(q) ||
          (c.username || '').toLowerCase().includes(q) ||
          (c.role || '').toLowerCase().includes(q) ||
          (c.department || '').toLowerCase().includes(q)
        ).slice(0, 6);

        if (matches.length === 0) {
          searchDropdown.innerHTML = `<div style="padding: 12px; text-align: center; font-size: 11px; color: var(--text-muted);">No crew members match "${escapeHtml(q)}"</div>`;
        } else {
          searchDropdown.innerHTML = matches.map((m) => `
            <div class="search-item js-search-result-item" data-badge="${escapeHtml(m.badge_code)}" data-user-id="${m.id}" style="cursor: pointer;">
              <div class="search-item-left">
                <div class="avatar-circle avatar-jl" style="width: 28px; height: 28px; font-size: 11px;">${escapeHtml(m.initials || 'CR')}</div>
                <div>
                  <div class="search-item-name">${escapeHtml(m.full_name)}</div>
                  <div class="search-item-badge">${escapeHtml(m.badge_code)} · ${escapeHtml(m.department || '')}</div>
                </div>
              </div>
              <span class="tier-pill-soft ${escapeHtml(m.clearance_code)}" style="font-size: 10px; padding: 2px 6px;">${escapeHtml(m.clearance_code)}</span>
            </div>
          `).join('');
        }
        searchDropdown.style.display = 'block';
      });

      topSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = topSearch.value.trim();
          if (val) {
            searchDropdown.style.display = 'none';
            const matched = findCrewMember(val);
            switchScreen('terminals', 'pane-kiosk');
            triggerGateScan(matched ? matched.badge_code : val);
            topSearch.value = '';
          }
        }
      });
    }

    // Help Button & Controls Dropdown
    const helpBtn = document.getElementById('topbar-help-btn');
    const helpDropdown = document.getElementById('topbar-help-dropdown');
    if (helpBtn && helpDropdown) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = helpDropdown.style.display === 'block';
        closeAllTopbarDropdowns();
        if (!isOpen) helpDropdown.style.display = 'block';
      });
    }

    const menuKiosk = document.getElementById('topbar-menu-kiosk');
    if (menuKiosk) {
      menuKiosk.addEventListener('click', () => {
        closeAllTopbarDropdowns();
        switchScreen('terminals', 'pane-kiosk');
      });
    }

    const openSettingsFromTrigger = () => {
      closeAllTopbarDropdowns();
      switchScreen('settings');
    };
    ['topbar-settings-btn', 'topbar-menu-settings', 'topbar-user-settings'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', openSettingsFromTrigger);
    });

    const settingsSyncBtn = document.getElementById('settings-sync-now-btn');
    if (settingsSyncBtn) {
      settingsSyncBtn.addEventListener('click', async () => {
        await fetchBootstrap(true);
        showToast('Live system telemetry & flow state synced.');
      });
    }

    document.querySelectorAll('.js-settings-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchSettingsTab(btn.getAttribute('data-settings-tab') || 'flow');
      });
    });

    const settingsFlowTabs = document.getElementById('settings-flow-tabs');
    if (settingsFlowTabs) {
      settingsFlowTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-flow-idx]');
        if (!btn) return;
        state.settingsFlowIdx = Number(btn.getAttribute('data-flow-idx')) || 0;
        state.settingsNodeIdx = 0;
        renderSettingsScreen();
      });
    }

    const settingsFlowDiagram = document.getElementById('settings-flow-diagram');
    if (settingsFlowDiagram) {
      settingsFlowDiagram.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-node-idx]');
        if (!btn) return;
        state.settingsNodeIdx = Number(btn.getAttribute('data-node-idx')) || 0;
        renderSettingsScreen();
      });
    }

    const settingsPrevBtn = document.getElementById('settings-flow-prev-btn');
    if (settingsPrevBtn) {
      settingsPrevBtn.addEventListener('click', () => {
        if (state.settingsNodeIdx > 0) {
          state.settingsNodeIdx -= 1;
          renderSettingsScreen();
        }
      });
    }

    const settingsNextBtn = document.getElementById('settings-flow-next-btn');
    if (settingsNextBtn) {
      settingsNextBtn.addEventListener('click', () => {
        const activeFlow = SYSTEM_FLOW_SPEC[state.settingsFlowIdx] || SYSTEM_FLOW_SPEC[0];
        if (activeFlow && state.settingsNodeIdx < activeFlow.nodes.length - 1) {
          state.settingsNodeIdx += 1;
          renderSettingsScreen();
        }
      });
    }

    const settingsJumpBtn = document.getElementById('settings-flow-jump-btn');
    if (settingsJumpBtn) {
      settingsJumpBtn.addEventListener('click', () => {
        const scr = settingsJumpBtn.getAttribute('data-jump-screen');
        const subTab = settingsJumpBtn.getAttribute('data-jump-subtab');
        const settingsSub = settingsJumpBtn.getAttribute('data-jump-settings-tab');
        if (scr === 'users' && subTab) {
          state.usersViewMode = subTab;
        }
        if (scr === 'settings' && settingsSub) {
          switchScreen('settings');
          switchSettingsTab(settingsSub);
          return;
        }
        if (scr) switchScreen(scr);
      });
    }

    const secSelect = document.getElementById('settings-section-select');
    if (secSelect) {
      secSelect.addEventListener('change', (e) => {
        switchSettingsTab(e.target.value || 'flow');
      });
    }

    const flowSubSel = document.getElementById('settings-flow-subselect');
    if (flowSubSel) {
      flowSubSel.addEventListener('change', (e) => {
        state.settingsFlowIdx = Number(e.target.value) || 0;
        state.settingsNodeIdx = 0;
        renderSettingsScreen();
      });
    }

    function captureBrowserGps(onOk) {
      if (!navigator.geolocation) {
        showToast('Browser geolocation is unavailable on this device.');
        return;
      }
      showToast('Requesting GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        (pos) => onOk(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6))),
        (err) => showToast('GPS error: ' + err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Settings Tab: Temporary Relief (TOTP & Geo-QR)
    const btnTotpSetup = document.getElementById('btn-totp-setup');
    if (btnTotpSetup) {
      btnTotpSetup.addEventListener('click', async () => {
        if (!navigator.onLine) { showToast('Online Only: reconnect to setup Authenticator 2FA.'); return; }
        btnTotpSetup.disabled = true;
        try {
          const res = await fetch('api.php?action=totp_setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            const box = document.getElementById('totp-enroll-box');
            const secEl = document.getElementById('totp-secret-display');
            const qrEl = document.getElementById('totp-qr-container');
            if (box) box.style.display = 'block';
            if (secEl) secEl.textContent = data.secret || '';
            renderSvgQrInto(qrEl, data.otpauth_uri || '');
            showToast(data.message || 'Scan TOTP QR and verify below.');
          } else {
            showToast((data && data.error) || 'Could not initialize TOTP.');
          }
        } catch (_) {
          showToast('Network error initializing TOTP.');
        } finally {
          btnTotpSetup.disabled = false;
        }
      });
    }

    const btnTotpVerify = document.getElementById('btn-totp-verify');
    if (btnTotpVerify) {
      btnTotpVerify.addEventListener('click', async () => {
        const code = (document.getElementById('totp-verify-code')?.value || '').trim();
        if (!/^\d{6}$/.test(code)) { showToast('Enter the 6-digit code from your Authenticator app.'); return; }
        btnTotpVerify.disabled = true;
        try {
          const res = await fetch('api.php?action=totp_verify_enable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            state.totpEnabled = true;
            const box = document.getElementById('totp-enroll-box');
            if (box) box.style.display = 'none';
            const inp = document.getElementById('totp-verify-code');
            if (inp) inp.value = '';
            renderSettingsReliefSection();
            showToast(data.message || 'TOTP Authenticator enabled.');
          } else {
            showToast((data && data.error) || 'Invalid TOTP code.');
          }
        } catch (_) {
          showToast('Network error verifying TOTP.');
        } finally {
          btnTotpVerify.disabled = false;
        }
      });
    }

    const btnTotpShowDisable = document.getElementById('btn-totp-show-disable');
    if (btnTotpShowDisable) {
      btnTotpShowDisable.addEventListener('click', () => {
        const p = document.getElementById('totp-disable-panel');
        if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
      });
    }

    const btnTotpConfirmDisable = document.getElementById('btn-totp-confirm-disable');
    if (btnTotpConfirmDisable) {
      btnTotpConfirmDisable.addEventListener('click', async () => {
        const pwd = document.getElementById('totp-disable-password')?.value || '';
        if (!pwd) { showToast('Enter your password to confirm.'); return; }
        btnTotpConfirmDisable.disabled = true;
        try {
          const res = await fetch('api.php?action=totp_disable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            state.totpEnabled = false;
            const p = document.getElementById('totp-disable-panel');
            if (p) p.style.display = 'none';
            const pwdInp = document.getElementById('totp-disable-password');
            if (pwdInp) pwdInp.value = '';
            renderSettingsReliefSection();
            showToast(data.message || 'TOTP 2FA disabled.');
          } else {
            showToast((data && data.error) || 'Failed to disable TOTP.');
          }
        } catch (_) {
          showToast('Network error disabling TOTP.');
        } finally {
          btnTotpConfirmDisable.disabled = false;
        }
      });
    }

    const reliefCpSel = document.getElementById('relief-qr-checkpoint');
    if (reliefCpSel) {
      reliefCpSel.addEventListener('change', () => {
        const opt = reliefCpSel.options[reliefCpSel.selectedIndex];
        const rad = opt ? opt.getAttribute('data-radius') : '';
        const radInp = document.getElementById('relief-qr-radius');
        if (rad && radInp) radInp.value = rad;
      });
    }

    const reliefQrForm = document.getElementById('relief-qr-generate-form');
    if (reliefQrForm) {
      reliefQrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!navigator.onLine) { showToast('Online Only: reconnect to generate a Relief QR.'); return; }
        const btn = document.getElementById('btn-generate-relief-qr');
        if (btn) btn.disabled = true;
        const cpVal = document.getElementById('relief-qr-checkpoint')?.value || '';
        const [cpType, cpId] = cpVal.includes(':') ? cpVal.split(':') : ['stock_warehouse', ''];
        try {
          const res = await fetch('api.php?action=generate_relief_qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assigned_user_id: Number(document.getElementById('relief-qr-user')?.value || 0),
              checkpoint_type: cpType,
              checkpoint_id: cpId,
              geofence_radius_m: Number(document.getElementById('relief-qr-radius')?.value || 200),
              duration_hours: Number(document.getElementById('relief-qr-hours')?.value || 8),
              expires_minutes: Number(document.getElementById('relief-qr-exp-mins')?.value || 60),
              require_geofence: document.getElementById('relief-qr-req-geo')?.checked ? 1 : 0,
              require_totp: document.getElementById('relief-qr-req-totp')?.checked ? 1 : 0,
            }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            applyBootstrapPayload(data, true);
            const absUrl = new URL(data.relief_url || ('relief.php?token=' + data.token), window.location.href).href;
            if (data.token_id) {
              state.sessionReliefUrls[data.token_id] = absUrl;
            }
            const outBox = document.getElementById('relief-qr-output-box');
            const sumEl = document.getElementById('relief-qr-summary');
            const urlInp = document.getElementById('relief-qr-url');
            const openBtn = document.getElementById('btn-open-relief-url');
            const svgEl = document.getElementById('relief-qr-svg');
            if (outBox) outBox.style.display = 'block';
            if (sumEl) {
              sumEl.textContent = `${data.assigned_user_name} → ${data.checkpoint_name} (${data.geofence_radius_m}m · ${data.require_totp ? 'TOTP' : 'Geo Only'})`;
            }
            if (urlInp) urlInp.value = absUrl;
            if (openBtn) openBtn.href = absUrl;
            renderSvgQrInto(svgEl, absUrl);
            renderSettingsReliefSection();
            showToast(data.message || 'Geo-Fenced Relief QR generated.');
          } else {
            showToast((data && data.error) || 'Failed to generate Relief QR.');
          }
        } catch (_) {
          showToast('Network error generating Relief QR.');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    const btnCopyReliefUrl = document.getElementById('btn-copy-relief-url');
    if (btnCopyReliefUrl) {
      btnCopyReliefUrl.addEventListener('click', () => {
        const val = document.getElementById('relief-qr-url')?.value || '';
        if (!val) return;
        navigator.clipboard?.writeText(val).then(() => showToast('Relief URL copied.')).catch(() => showToast(val));
      });
    }

    const geoListEl = document.getElementById('relief-checkpoint-geo-list');
    if (geoListEl) {
      geoListEl.addEventListener('click', async (e) => {
        const capBtn = e.target.closest('.js-geo-capture-btn');
        if (capBtn) {
          const cpKey = capBtn.getAttribute('data-cp-key');
          captureBrowserGps((lat, lng) => {
            const latInp = geoListEl.querySelector(`.js-geo-lat[data-cp-key="${CSS.escape(cpKey)}"]`);
            const lngInp = geoListEl.querySelector(`.js-geo-lng[data-cp-key="${CSS.escape(cpKey)}"]`);
            if (latInp) latInp.value = String(lat);
            if (lngInp) lngInp.value = String(lng);
            showToast(`Captured GPS: ${lat}, ${lng}`);
          });
          return;
        }
        const saveBtn = e.target.closest('.js-geo-save-btn');
        if (saveBtn) {
          const cpKey = saveBtn.getAttribute('data-cp-key');
          const cpType = saveBtn.getAttribute('data-cp-type');
          const cpId = saveBtn.getAttribute('data-cp-id');
          const latVal = geoListEl.querySelector(`.js-geo-lat[data-cp-key="${CSS.escape(cpKey)}"]`)?.value || '';
          const lngVal = geoListEl.querySelector(`.js-geo-lng[data-cp-key="${CSS.escape(cpKey)}"]`)?.value || '';
          const radVal = Number(geoListEl.querySelector(`.js-geo-rad[data-cp-key="${CSS.escape(cpKey)}"]`)?.value || 200);
          saveBtn.disabled = true;
          try {
            let res;
            if (cpType === 'event_venue') {
              const evObj = (state.checkpoints?.event_venues || []).find((v) => String(v.raw_id || v.id) === String(cpId));
              res = await fetch('api.php?action=save_event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event_id: cpId,
                  call_time: evObj?.call_time || '08:00',
                  assigned_technicians: evObj?.assigned_technicians || [],
                  lat: latVal,
                  lng: lngVal,
                  geofence_radius_m: radVal,
                }),
              });
            } else {
              const whObj = (state.checkpoints?.stock_warehouses || []).find((w) => String(w.id) === String(cpId));
              res = await fetch('api.php?action=save_warehouse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: Number(cpId),
                  name: whObj?.name || 'Facility Gate',
                  code: whObj?.code || '',
                  location: whObj?.location || '',
                  open_time: whObj?.open_time || '08:00',
                  close_time: whObj?.close_time || '18:00',
                  controller_name: whObj?.controller_name || '',
                  is_active: 1,
                  lat: latVal,
                  lng: lngVal,
                  geofence_radius_m: radVal,
                }),
              });
            }
            const data = await res.json();
            if (res.ok && data && data.ok) {
              await fetchBootstrap(true);
              showToast('Checkpoint geo-fence coordinates saved.');
            } else {
              showToast((data && data.error) || 'Failed to save coordinates.');
            }
          } catch (_) {
            showToast('Network error saving coordinates.');
          } finally {
            saveBtn.disabled = false;
          }
        }
      });
    }

    const pageSrOpenGeo = document.getElementById('page-sr-open-geoqr-btn');
    if (pageSrOpenGeo) {
      pageSrOpenGeo.addEventListener('click', () => {
        switchScreen('settings');
        switchSettingsTab('relief');
      });
    }

    // Settings Tab & Dedicated Screen: Dispatch Hierarchy
    const dispatchEvSel = document.getElementById('dispatch-event-select');
    if (dispatchEvSel) {
      dispatchEvSel.addEventListener('change', () => {
        state.selectedDispatchEventId = dispatchEvSel.value || '';
        renderDispatchViews();
      });
    }
    const dispatchPageEvSel = document.getElementById('dispatch-page-event-select');
    if (dispatchPageEvSel) {
      dispatchPageEvSel.addEventListener('change', () => {
        state.selectedDispatchEventId = dispatchPageEvSel.value || '';
        renderDispatchViews();
      });
    }
    const openRosterForEvent = (selId) => {
      const evId = document.getElementById(selId)?.value || state.selectedDispatchEventId || '';
      const evObj = (state.checkpoints?.event_venues || []).find((v) => String(v.raw_id || v.id) === evId);
      if (typeof window.openScheduleRosterModalForFacility === 'function' && evObj) {
        window.openScheduleRosterModalForFacility(evObj.name);
      } else {
        const btn = document.getElementById('open-schedule-roster-btn');
        if (btn) btn.click();
      }
    };
    const dispatchOpenRoster = document.getElementById('dispatch-open-roster-btn');
    if (dispatchOpenRoster) {
      dispatchOpenRoster.addEventListener('click', () => openRosterForEvent('dispatch-event-select'));
    }
    const dispatchPageOpenRoster = document.getElementById('dispatch-page-open-roster-btn');
    if (dispatchPageOpenRoster) {
      dispatchPageOpenRoster.addEventListener('click', () => openRosterForEvent('dispatch-page-event-select'));
    }
    const dispatchPageCreateEvBtn = document.getElementById('dispatch-page-create-event-btn');
    if (dispatchPageCreateEvBtn) {
      dispatchPageCreateEvBtn.addEventListener('click', () => {
        resetCreateEventForm();
        switchScreen('create-event');
      });
    }

    // Create Event Workspace Tab Listeners & Auto-Duration Sync
    const bindDateRangeDuration = (startId, endId, durId, pillId, onUpdated) => {
      const sEl = document.getElementById(startId);
      const eEl = document.getElementById(endId);
      const dEl = document.getElementById(durId);
      const pEl = pillId ? document.getElementById(pillId) : null;
      if (!sEl || !eEl) return;
      const syncDur = (changedSource, isExplicitChange = false) => {
        const sVal = sEl.value;
        let eVal = eEl.value;
        let adjusted = false;
        if (sVal && (!eVal || eVal < sVal)) {
          if (changedSource === 'end' && eVal && eVal < sVal) {
            adjusted = true;
            showToast('End date adjusted: it cannot be earlier than start date.', 'warning');
          }
          eVal = sVal;
          eEl.value = sVal;
        }
        eEl.min = sVal || '';
        const dur = computeEventDuration(sVal, eVal);
        if (dEl) dEl.value = dur.label;
        if (pEl) pEl.textContent = dur.label;
        if (typeof onUpdated === 'function') onUpdated();
        if (isExplicitChange && !adjusted && dur.valid) {
          showToast(`Event duration updated to ${dur.label} (${sVal}${eVal !== sVal ? ` → ${eVal}` : ''}).`, 'info');
        }
      };
      sEl.addEventListener('change', () => syncDur('start', true));
      sEl.addEventListener('input', () => syncDur('start', false));
      eEl.addEventListener('change', () => syncDur('end', true));
      eEl.addEventListener('input', () => syncDur('end', false));
    };

    bindDateRangeDuration('ce-start-date', 'ce-end-date', 'ce-duration', 'ce-duration-pill', updateCreateEventLivePreview);
    bindDateRangeDuration('venue-crud-date', 'venue-crud-end-date', 'venue-crud-duration', null, null);

    ['ce-title', 'ce-location', 'ce-techlead'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateCreateEventLivePreview);
        el.addEventListener('change', updateCreateEventLivePreview);
      }
    });

    document.getElementById('ce-cards-search')?.addEventListener('input', (e) => {
      state.createEventSearch = e.target.value || '';
      renderCreateEventPage();
    });

    document.getElementById('create-event-reset-btn')?.addEventListener('click', resetCreateEventForm);
    document.getElementById('ce-cancel-edit-btn')?.addEventListener('click', resetCreateEventForm);
    document.getElementById('create-event-open-dispatch-btn')?.addEventListener('click', () => switchScreen('dispatch-flow'));
    document.getElementById('create-event-open-new-tab-btn')?.addEventListener('click', () => {
      window.open('index.php#create-event', '_blank', 'noopener');
    });

    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
      createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleVal = document.getElementById('ce-title')?.value.trim() || '';
        const startVal = document.getElementById('ce-start-date')?.value || '';
        const endVal = document.getElementById('ce-end-date')?.value || startVal;
        const locVal = document.getElementById('ce-location')?.value.trim() || '';
        const tlVal = document.getElementById('ce-techlead')?.value.trim() || '';
        if (!titleVal || !startVal || !endVal || !locVal || !tlVal) {
          showToast('Please complete Event Name, Start & End Dates, Location, and Event Tech Lead.');
          return;
        }
        const durCheck = computeEventDuration(startVal, endVal);
        if (!durCheck.valid) {
          showToast('Event end date cannot be earlier than start date.');
          return;
        }

        const subBtn = document.getElementById('ce-submit-btn');
        const subLbl = subBtn?.querySelector('span');
        const prevBtnText = subLbl ? subLbl.textContent : 'Save & Create Event';
        if (subBtn) subBtn.disabled = true;
        if (subLbl) subLbl.textContent = 'Saving Event...';

        const fd = new FormData();
        fd.append('event_id', document.getElementById('ce-event-id')?.value.trim() || '');
        fd.append('title', titleVal);
        fd.append('date', startVal);
        fd.append('start_date', startVal);
        fd.append('end_date', endVal);
        fd.append('location', locVal);
        fd.append('tech_lead', tlVal);
        fd.append('call_time', document.getElementById('ce-calltime')?.value || '08:00');
        fd.append('terminal_pin', document.getElementById('ce-pin')?.value.trim() || '1234');
        const ceImgInput = document.getElementById('ce-modal-image');
        if (ceImgInput && ceImgInput.files && ceImgInput.files[0]) {
          fd.append('image', ceImgInput.files[0]);
        }

        try {
          const res = await fetch('api.php?action=save_event', { method: 'POST', body: fd });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            if (data.event_id) state.selectedDispatchEventId = String(data.event_id);
            resetCreateEventForm();
            applyBootstrapPayload(data, true);
            renderAll();
            showToast(data.message || `Event "${titleVal}" saved (${durCheck.label}).`, 'success');
          } else {
            showToast((data && data.error) || 'Failed to save event.', 'error');
          }
        } catch (err) {
          showToast('Network error saving event.', 'error');
        } finally {
          if (subBtn) subBtn.disabled = false;
          if (subLbl) subLbl.textContent = prevBtnText;
        }
      });
    }

    // Settings Tab: Shared Links Policy
    const linksOpenPortals = document.getElementById('settings-links-open-portals-btn');
    if (linksOpenPortals) linksOpenPortals.addEventListener('click', () => switchScreen('standalone-portals'));
    const linksGrid = document.getElementById('settings-shared-links-grid');
    if (linksGrid) {
      linksGrid.addEventListener('click', (e) => {
        if (e.target.closest('#js-links-goto-relief')) {
          switchSettingsTab('relief');
          return;
        }
        const editBtn = e.target.closest('.js-settings-edit-portal-btn');
        if (editBtn) {
          const pid = Number(editBtn.getAttribute('data-portal-id'));
          const item = (state.standalonePortals || []).find((p) => Number(p.id) === pid);
          if (item) openPortalCrudModal(item);
        }
      });
    }

    // Settings Tab: Branding Studio
    const readBrandingForm = () => ({
      brand_name: document.getElementById('brand-display-name')?.value.trim() || 'aBility',
      logo_size_px: Number(document.getElementById('brand-logo-size')?.value || 34),
      primary_color: document.getElementById('brand-color-primary-hex')?.value.trim() || '#4f46e5',
      accent_color: document.getElementById('brand-color-accent-hex')?.value.trim() || '#10b981',
      neutral_color: document.getElementById('brand-color-neutral-hex')?.value.trim() || '#64748b',
      font_family: document.getElementById('brand-font-family')?.value || 'Marvel',
      font_scale: Number(document.getElementById('brand-font-scale')?.value || 1),
      text_align: document.getElementById('brand-text-align')?.value || 'left',
      default_theme: document.getElementById('brand-default-theme')?.value || 'system',
    });
    const syncColorPair = (pickerId, hexId) => {
      const pEl = document.getElementById(pickerId);
      const hEl = document.getElementById(hexId);
      if (pEl && hEl) {
        pEl.addEventListener('input', () => { hEl.value = pEl.value; applyBrandingConfigClient(readBrandingForm()); applyAccessibilityPreferences(); });
        hEl.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(hEl.value)) pEl.value = hEl.value; applyBrandingConfigClient(readBrandingForm()); applyAccessibilityPreferences(); });
      }
    };
    syncColorPair('brand-color-primary', 'brand-color-primary-hex');
    syncColorPair('brand-color-accent', 'brand-color-accent-hex');
    syncColorPair('brand-color-neutral', 'brand-color-neutral-hex');
    ['brand-display-name', 'brand-logo-size', 'brand-font-family', 'brand-font-scale', 'brand-text-align', 'brand-default-theme'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          const fsVal = document.getElementById('brand-font-scale-val');
          if (id === 'brand-font-scale' && fsVal) fsVal.textContent = `${Math.round(Number(el.value || 1) * 100)}%`;
          const lsVal = document.getElementById('brand-logo-size-val');
          if (id === 'brand-logo-size' && lsVal) lsVal.textContent = `${Number(el.value || 34)}px`;
          applyBrandingConfigClient(readBrandingForm());
          applyAccessibilityPreferences();
        });
      }
    });
    document.querySelectorAll('.js-brand-quick-theme').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ch = btn.getAttribute('data-theme-choice');
        if (ch && typeof applyTheme === 'function') applyTheme(ch, true, false);
      });
    });
    const resetBrandBtn = document.getElementById('btn-branding-reset-defaults');
    if (resetBrandBtn) {
      resetBrandBtn.addEventListener('click', () => {
        applyBrandingConfigClient({ brand_name: 'aBility', primary_color: '#4f46e5', accent_color: '#10b981', neutral_color: '#64748b', font_family: 'Marvel', font_scale: 1, text_align: 'left', default_theme: 'system' });
        applyAccessibilityPreferences();
        renderSettingsBrandingSection();
        showToast('Preview reset to default theme.');
      });
    }
    const brandingForm = document.getElementById('branding-config-form');
    if (brandingForm) {
      brandingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sb = document.getElementById('btn-save-branding');
        if (sb && sb.style.display !== 'none') sb.click();
      });
    }
    const saveBrandBtn = document.getElementById('btn-save-branding');
    if (saveBrandBtn) {
      saveBrandBtn.addEventListener('click', async () => {
        if (!navigator.onLine) { showToast('Online Only: reconnect to save Branding globally.'); return; }
        saveBrandBtn.disabled = true;
        try {
          const res = await fetch('api.php?action=save_branding_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(readBrandingForm()),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            if (data.brandingConfig) applyBrandingConfigClient(data.brandingConfig, data.brandingFonts || null);
            applyAccessibilityPreferences();
            renderSettingsBrandingSection();
            showToast(data.message || 'Branding configuration saved globally.');
          } else {
            showToast((data && data.error) || 'Failed to save branding.');
          }
        } catch (_) {
          showToast('Network error saving branding.');
        } finally {
          saveBrandBtn.disabled = false;
        }
      });
    }

    // Branding Logo Upload / Preset / Reset
    const logoUploadForm = document.getElementById('branding-logo-upload-form');
    if (logoUploadForm) {
      logoUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!navigator.onLine) { showToast('Online Only: reconnect to upload a logo.'); return; }
        const fileInp = document.getElementById('branding-logo-file');
        if (!fileInp || !fileInp.files || !fileInp.files[0]) {
          showToast('Select a logo image file first.');
          return;
        }
        const btn = document.getElementById('btn-upload-branding-logo');
        if (btn) btn.disabled = true;
        try {
          const fd = new FormData();
          fd.append('logo', fileInp.files[0]);
          const res = await fetch('api.php?action=upload_branding_logo', { method: 'POST', body: fd });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            fileInp.value = '';
            if (data.brandingConfig) applyBrandingConfigClient(data.brandingConfig);
            renderSettingsBrandingSection();
            showToast(data.message || 'Logo uploaded and applied.');
          } else {
            showToast((data && data.error) || 'Logo upload failed.');
          }
        } catch (_) {
          showToast('Network error uploading logo.');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }
    document.querySelectorAll('.js-logo-preset-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!navigator.onLine) { showToast('Online Only: reconnect to change logo.'); return; }
        const presetPath = btn.getAttribute('data-preset') || '';
        btn.disabled = true;
        try {
          const res = await fetch('api.php?action=upload_branding_logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset_path: presetPath }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            if (data.brandingConfig) applyBrandingConfigClient(data.brandingConfig);
            renderSettingsBrandingSection();
            showToast(data.message || 'Preset logo applied.');
          } else {
            showToast((data && data.error) || 'Could not apply logo preset.');
          }
        } catch (_) {
          showToast('Network error updating logo preset.');
        } finally {
          btn.disabled = false;
        }
      });
    });
    const resetLogoBtn = document.getElementById('btn-reset-branding-logo');
    if (resetLogoBtn) {
      resetLogoBtn.addEventListener('click', async () => {
        if (!navigator.onLine) { showToast('Online Only: reconnect to reset logo.'); return; }
        resetLogoBtn.disabled = true;
        try {
          const res = await fetch('api.php?action=reset_branding_logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            if (data.brandingConfig) applyBrandingConfigClient(data.brandingConfig);
            renderSettingsBrandingSection();
            showToast(data.message || 'Brand logo reset to default.');
          } else {
            showToast((data && data.error) || 'Failed to reset logo.');
          }
        } catch (_) {
          showToast('Network error resetting logo.');
        } finally {
          resetLogoBtn.disabled = false;
        }
      });
    }

    // Branding Fonts CRUD Form & List Handlers
    const resetFontCrudForm = () => {
      const form = document.getElementById('branding-font-crud-form');
      if (form) form.reset();
      const idEl = document.getElementById('brand-font-crud-id');
      if (idEl) idEl.value = '0';
      const cancelBtn = document.getElementById('btn-cancel-branding-font');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const saveBtnF = document.getElementById('btn-save-branding-font');
      if (saveBtnF) saveBtnF.textContent = 'Add / Save Font';
    };
    const cancelFontBtn = document.getElementById('btn-cancel-branding-font');
    if (cancelFontBtn) cancelFontBtn.addEventListener('click', resetFontCrudForm);

    const fontCrudForm = document.getElementById('branding-font-crud-form');
    if (fontCrudForm) {
      fontCrudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!navigator.onLine) { showToast('Online Only: reconnect to save fonts.'); return; }
        const btn = document.getElementById('btn-save-branding-font');
        if (btn) btn.disabled = true;
        try {
          const fd = new FormData();
          fd.append('id', document.getElementById('brand-font-crud-id')?.value || '0');
          fd.append('font_name', (document.getElementById('brand-font-crud-name')?.value || '').trim());
          fd.append('css_stack', (document.getElementById('brand-font-crud-stack')?.value || '').trim());
          fd.append('font_url', (document.getElementById('brand-font-crud-url')?.value || '').trim());
          fd.append('is_active', document.getElementById('brand-font-crud-active')?.checked ? '1' : '0');
          fd.append('activate', document.getElementById('brand-font-crud-activate')?.checked ? '1' : '0');
          const fInp = document.getElementById('brand-font-crud-file');
          if (fInp && fInp.files && fInp.files[0]) {
            fd.append('font_file', fInp.files[0]);
          }
          const res = await fetch('api.php?action=save_branding_font', { method: 'POST', body: fd });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            resetFontCrudForm();
            applyBrandingConfigClient(data.brandingConfig || state.brandingConfig, data.brandingFonts || null);
            renderSettingsBrandingSection();
            showToast(data.message || 'Font saved.');
          } else {
            showToast((data && data.error) || 'Failed to save font.');
          }
        } catch (_) {
          showToast('Network error saving font.');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    const fontsCrudListEl = document.getElementById('branding-fonts-crud-list');
    if (fontsCrudListEl) {
      fontsCrudListEl.addEventListener('click', async (e) => {
        const useBtn = e.target.closest('.js-font-use-btn');
        if (useBtn) {
          const fname = useBtn.getAttribute('data-font-name') || '';
          const nextCfg = Object.assign({}, readBrandingForm(), { font_family: fname });
          applyBrandingConfigClient(nextCfg);
          const sel = document.getElementById('brand-font-family');
          if (sel) sel.value = fname;
          if (isCurrentUserAdmin() && navigator.onLine) {
            try {
              const r = await fetch('api.php?action=save_branding_config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ font_family: fname }),
              });
              const d = await r.json();
              if (r.ok && d && d.ok && d.brandingConfig) applyBrandingConfigClient(d.brandingConfig, d.brandingFonts || null);
            } catch (_) {}
          }
          renderSettingsBrandingSection();
          showToast(`Active font set to ${fname}.`);
          return;
        }
        const editBtn = e.target.closest('.js-font-edit-btn');
        if (editBtn) {
          const fid = Number(editBtn.getAttribute('data-font-id'));
          const item = (state.brandingFonts || []).find((f) => Number(f.id) === fid);
          if (!item) return;
          const idEl = document.getElementById('brand-font-crud-id');
          const nameEl = document.getElementById('brand-font-crud-name');
          const stackEl = document.getElementById('brand-font-crud-stack');
          const urlEl = document.getElementById('brand-font-crud-url');
          const actEl = document.getElementById('brand-font-crud-active');
          const cancelBtn = document.getElementById('btn-cancel-branding-font');
          const saveBtnF = document.getElementById('btn-save-branding-font');
          if (idEl) idEl.value = String(item.id);
          if (nameEl) nameEl.value = item.font_name || '';
          if (stackEl) stackEl.value = item.css_stack || '';
          if (urlEl) urlEl.value = item.font_url || '';
          if (actEl) actEl.checked = Number(item.is_active ?? 1) === 1;
          if (cancelBtn) cancelBtn.style.display = 'inline-flex';
          if (saveBtnF) saveBtnF.textContent = 'Update Font';
          if (nameEl) nameEl.focus();
          return;
        }
        const delBtn = e.target.closest('.js-font-delete-btn');
        if (delBtn) {
          if (!navigator.onLine) { showToast('Online Only: reconnect to delete font.'); return; }
          const fid = Number(delBtn.getAttribute('data-font-id'));
          const fname = delBtn.getAttribute('data-font-name') || 'this font';
          const confirmed = typeof showConfirmDialog === 'function'
            ? await showConfirmDialog(`Delete custom font "${fname}"?`, 'Delete Font')
            : window.confirm(`Delete custom font "${fname}"?`);
          if (!confirmed) return;
          delBtn.disabled = true;
          try {
            const res = await fetch('api.php?action=delete_branding_font', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: fid }),
            });
            const data = await res.json();
            if (res.ok && data && data.ok) {
              applyBrandingConfigClient(data.brandingConfig || state.brandingConfig, data.brandingFonts || null);
              renderSettingsBrandingSection();
              showToast(data.message || 'Font deleted.');
            } else {
              showToast((data && data.error) || 'Could not delete font.');
            }
          } catch (_) {
            showToast('Network error deleting font.');
          } finally {
            delBtn.disabled = false;
          }
        }
      });
    }

    // Settings Tab: Accounts, Password Change, Accessibility & Offline Cache
    const ownPwdForm = document.getElementById('own-password-form');
    if (ownPwdForm) {
      ownPwdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!navigator.onLine) { showToast('Online Only: reconnect to change your password.'); return; }
        const curPwd = document.getElementById('own-current-pwd')?.value || '';
        const newPwd = document.getElementById('own-new-pwd')?.value || '';
        const confPwd = document.getElementById('own-confirm-pwd')?.value || '';
        if (newPwd.length < 8) { showToast('New password must be at least 8 characters.'); return; }
        if (newPwd !== confPwd) { showToast('New passwords do not match.'); return; }
        const btn = document.getElementById('btn-change-own-pwd');
        if (btn) btn.disabled = true;
        try {
          const res = await fetch('api.php?action=change_own_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: curPwd, new_password: newPwd, confirm_password: confPwd }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            ownPwdForm.reset();
            showToast(data.message || 'Password updated.');
          } else {
            showToast((data && data.error) || 'Failed to update password.');
          }
        } catch (_) {
          showToast('Network error updating password.');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }
    [
      ['a11y-high-contrast', 'ability_a11y_high_contrast'],
      ['a11y-large-text', 'ability_a11y_large_text'],
      ['a11y-reduced-motion', 'ability_a11y_reduced_motion'],
    ].forEach(([elId, storeKey]) => {
      const cb = document.getElementById(elId);
      if (cb) {
        cb.addEventListener('change', () => {
          try { localStorage.setItem(storeKey, cb.checked ? '1' : '0'); } catch (_) {}
          applyAccessibilityPreferences();
          showToast('Accessibility preference updated.');
        });
      }
    });
    const btnSyncCache = document.getElementById('btn-refresh-offline-cache');
    if (btnSyncCache) {
      btnSyncCache.addEventListener('click', async () => {
        await fetchBootstrap(true);
        await renderSettingsAccountsOfflineSection();
        showToast('Offline verification roster synced to IndexedDB.');
      });
    }
    const btnWipeCache = document.getElementById('btn-wipe-offline-cache');
    if (btnWipeCache) {
      btnWipeCache.addEventListener('click', async () => {
        await AbilityMainOffline.clearAll();
        await renderSettingsAccountsOfflineSection();
        showToast('Offline IndexedDB verification cache cleared.');
      });
    }

    // Settings Tab: PWA Install Prompt
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', async () => {
        if (!state.deferredPwaPrompt) return;
        state.deferredPwaPrompt.prompt();
        await state.deferredPwaPrompt.userChoice.catch(() => {});
        state.deferredPwaPrompt = null;
        renderSettingsPwaSection();
      });
    }

    const settingsShortcutsGrid = document.getElementById('settings-shortcuts-grid');
    if (settingsShortcutsGrid) {
      settingsShortcutsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.js-settings-shortcut-btn');
        if (!btn) return;
        const act = btn.getAttribute('data-shortcut-action');
        if (act === 'toggle-theme') {
          toggleTheme(true);
          renderSettingsScreen();
          return;
        }
        const scr = btn.getAttribute('data-shortcut-screen');
        const subTab = btn.getAttribute('data-shortcut-subtab');
        if (scr === 'users' && subTab) {
          state.usersViewMode = subTab;
        }
        if (scr) switchScreen(scr);
      });
    }

    // Notifications Button & Activity Alerts Dropdown
    const notifBtn = document.getElementById('topbar-notif-btn');
    const notifDropdown = document.getElementById('topbar-notif-dropdown');
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifDropdown.style.display === 'flex' || notifDropdown.style.display === 'block';
        closeAllTopbarDropdowns();
        if (!isOpen) {
          renderNotificationsList();
          notifDropdown.style.display = 'flex';
        }
      });
    }

    const notifMarkRead = document.getElementById('topbar-notif-mark-read');
    if (notifMarkRead) {
      notifMarkRead.addEventListener('click', async () => {
        const idsToMark = state.notifications
          .map((n) => (n && n.id ? String(n.id) : ''))
          .filter(Boolean);
        idsToMark.forEach((id) => state.readNotifIds.add(id));
        state.notifications.forEach((n) => {
          n.unread = false;
        });
        state.unreadNotifCount = 0;
        renderTopbarAndKpis();
        renderNotificationsList();
        showToast('All notifications marked as read.');
        if (idsToMark.length > 0) {
          try {
            const res = await fetch('api.php?action=mark_notifications_read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notif_ids: idsToMark }),
            });
            const data = await res.json();
            if (data && data.ok && Array.isArray(data.read_notif_ids)) {
              state.readNotifIds = new Set(data.read_notif_ids.map((id) => String(id)));
              syncDynamicNotifications();
            }
          } catch (err) {
            // Local read state remains active in memory for this session
          }
        }
      });
    }

    const viewAllLogs = document.getElementById('topbar-view-all-logs');
    if (viewAllLogs) {
      viewAllLogs.addEventListener('click', () => {
        closeAllTopbarDropdowns();
        switchScreen('overview', 'activity-timeline-card');
      });
    }

    // User Avatar & Account Menu Dropdown (ONLY FOR ADMIN)
    const topAvatar = document.getElementById('topbar-avatar');
    const userDropdown = document.getElementById('topbar-user-dropdown');
    const quickLogout = document.getElementById('topbar-logout-quick-btn');
    if (quickLogout) {
      quickLogout.addEventListener('click', () => {
        window.location.href = 'login.php?logout=1';
      });
    }
    const userTrigger = document.getElementById('topbar-user-trigger') || topAvatar;
    const handleAccountTriggerClick = (e) => {
      e.stopPropagation();
      if (!isCurrentUserAdmin()) {
        // Non-Admin: Direct access to personal Digital ID Badge (User Dropdown is restricted to Admin)
        closeAllTopbarDropdowns();
        const u = state.currentUser || state.crew[0];
        if (u) {
          state.selectedCrewId = u.id;
          state.currentVerification = buildClientVerificationFromMember(u);
          renderVerificationDeck();
          highlightSelectedCrewRow(u.id);
          openKioskModal(u);
        }
        return;
      }
      const isOpen = userDropdown.style.display === 'block';
      closeAllTopbarDropdowns();
      if (!isOpen) userDropdown.style.display = 'block';
    };
    if (userTrigger && userDropdown) {
      userTrigger.addEventListener('click', handleAccountTriggerClick);
    }
    const accountFooterBtn = document.getElementById('account-footer-btn');
    if (accountFooterBtn && userDropdown) {
      accountFooterBtn.addEventListener('click', handleAccountTriggerClick);
    }

    const menuMyBadge = document.getElementById('topbar-menu-mybadge');
    if (menuMyBadge) {
      menuMyBadge.addEventListener('click', () => {
        closeAllTopbarDropdowns();
        const u = state.currentUser || state.crew[0];
        if (u) {
          switchScreen('terminals', 'pane-kiosk');
          state.selectedCrewId = u.id;
          state.currentVerification = buildClientVerificationFromMember(u);
          renderVerificationDeck();
          highlightSelectedCrewRow(u.id);
        }
      });
    }

    const menuSwitch = document.getElementById('topbar-menu-switch-user');
    if (menuSwitch) {
      menuSwitch.addEventListener('click', () => {
        closeAllTopbarDropdowns();
        openSwitchUserModal();
      });
    }

    const menuAuth = document.getElementById('topbar-menu-auth-modal');
    if (menuAuth) {
      menuAuth.addEventListener('click', () => {
        closeAllTopbarDropdowns();
        const isAdmin = isCurrentUserAdmin();
        window.location.href = isAdmin ? 'login.php?admin=1' : 'login.php';
      });
    }

    const menuLogout = document.getElementById('topbar-menu-logout');
    if (menuLogout) {
      menuLogout.addEventListener('click', async () => {
        closeAllTopbarDropdowns();
        try {
          await fetch('api.php?action=logout');
        } catch (e) {}
        state.currentUser = null;
        renderTopbarAndKpis();
        showToast('You have been signed out successfully.');
        setTimeout(() => {
          window.location.href = 'login.php?logout=1';
        }, 500);
      });
    }

    // Close open topbar dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-popover-wrap') && !e.target.closest('.topbar-search-wrap')) {
        closeAllTopbarDropdowns();
      }
    });

    // Delegated click for search result items
    document.addEventListener('click', (e) => {
      const searchItem = e.target.closest('.js-search-result-item');
      if (searchItem) {
        const badge = searchItem.getAttribute('data-badge');
        const uid = searchItem.getAttribute('data-user-id');
        closeAllTopbarDropdowns();
        if (topSearch) topSearch.value = '';
        const member = state.crew.find((c) => Number(c.id) === Number(uid)) || findCrewMember(badge);
        if (member) {
          switchScreen('terminals', 'pane-kiosk');
          state.selectedCrewId = member.id;
          state.currentVerification = buildClientVerificationFromMember(member);
          renderVerificationDeck();
          highlightSelectedCrewRow(member.id);
        }
      }
    });

    // =========================================================================
    // AUTHENTICATION MODAL (LOGIN & REGISTER) EVENT LISTENERS
    // =========================================================================

    const authTabLogin = document.getElementById('auth-tab-login');
    const authTabReg = document.getElementById('auth-tab-register');
    if (authTabLogin) {
      authTabLogin.addEventListener('click', () => switchAuthTab('login'));
    }
    if (authTabReg) {
      authTabReg.addEventListener('click', () => switchAuthTab('register'));
    }

    document.querySelectorAll('.js-close-auth-modal').forEach((btn) => {
      btn.addEventListener('click', () => closeAuthModal());
    });

    // 1-Click Fast Demo Login buttons
    document.querySelectorAll('.js-demo-login').forEach((btn) => {
      btn.addEventListener('click', () => {
        const u = btn.getAttribute('data-username');
        const p = btn.getAttribute('data-pass');
        const uInput = document.getElementById('login-username');
        const pInput = document.getElementById('login-password');
        if (uInput) uInput.value = u;
        if (pInput) pInput.value = p;
        const form = document.getElementById('login-form');
        if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    });

    // Login Form Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Signing In...';
        }

        try {
          const res = await fetch('api.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password }),
          });
          const data = await res.json();
          if (data && data.ok) {
            state.currentUser = data.user;
            closeAuthModal();
            renderTopbarAndKpis();
            if (isCurrentUserStockController()) {
              switchScreen('terminals', 'pane-kiosk');
              showToast(data.message || `Welcome back, ${data.user.full_name}! Redirected to Staff ID Badges & Gate Terminal.`);
            } else {
              showToast(data.message || `Welcome back, ${data.user.full_name}!`);
            }
          } else {
            showToast(data?.error || 'Invalid credentials.');
          }
        } catch (err) {
          showToast('Unable to reach authentication server. Please verify your connection.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In to Terminal';
          }
        }
      });
    }

    // Register Form Submit
    const regForm = document.getElementById('register-form');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('reg-fullname').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const role = document.getElementById('reg-role').value;
        const department = document.getElementById('reg-department').value;
        const password = document.getElementById('reg-password').value;
        const passConfirm = document.getElementById('reg-password-confirm').value;

        if (password !== passConfirm) {
          showToast('Passwords do not match! Please verify.');
          return;
        }

        const submitBtn = document.getElementById('register-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Registering & Generating Badge...';
        }

        try {
          const res = await fetch('api.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              full_name: fullName,
              username,
              email,
              phone,
              role,
              department,
              password,
            }),
          });
          const data = await res.json();
          if (data && data.ok) {
            await fetchBootstrap(false);
            renderTopbarAndKpis();
            showToast(data.message || 'Account registered & digital badge issued!');
            closeAuthModal();
          } else {
            showToast(data?.error || 'Registration failed.');
          }
        } catch (err) {
          showToast('Unable to register user. Verify Admin session and server connection.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register & Issue Digital Badge';
          }
        }
      });
    }

    // =========================================================================
    // SWITCH OPERATOR MODAL EVENT LISTENERS
    // =========================================================================

    document.querySelectorAll('.js-close-switch-modal').forEach((btn) => {
      btn.addEventListener('click', () => closeSwitchUserModal());
    });

    const switchSearch = document.getElementById('switch-user-search');
    if (switchSearch) {
      switchSearch.addEventListener('input', () => {
        renderSwitchUserGrid(switchSearch.value);
      });
    }

    document.addEventListener('click', async (e) => {
      const switchRow = e.target.closest('.js-switch-to-user');
      if (switchRow) {
        const uid = Number(switchRow.getAttribute('data-user-id') || 0);
        const badge = switchRow.getAttribute('data-badge') || '';
        const email = switchRow.getAttribute('data-email') || '';
        const username = switchRow.getAttribute('data-username') || '';
        const role = switchRow.getAttribute('data-role') || '';
        closeSwitchUserModal();
        closeAllTopbarDropdowns();
        try {
          const res = await fetch('api.php?action=switch_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 
              user_id: uid, 
              badge_code: badge,
              email: email,
              username: username,
              role: role,
            }),
          });
          const data = await res.json();
          if (data && data.ok) {
            state.currentUser = data.user;
            renderTopbarAndKpis();
            if (isCurrentUserStockController() || isCurrentUserTechnician()) {
              switchScreen('terminals', 'pane-kiosk');
            }
            showToast(data.message || `Switched active operator to ${data.user.full_name}`);
          } else {
            const localUser = state.crew.find((c) => Number(c.id) === uid);
            if (localUser) {
              state.currentUser = localUser;
              renderTopbarAndKpis();
              showToast(`Switched active operator to ${localUser.full_name}`);
            }
          }
        } catch (err) {
          const localUser = state.crew.find((c) => Number(c.id) === uid);
          if (localUser) {
            state.currentUser = localUser;
            renderTopbarAndKpis();
            showToast(`Switched active operator to ${localUser.full_name}`);
          }
        }
      }
    });

    // Delegated clicks for Crew Rows, Paired Checkin/Checkout buttons, Timeline items, Checkpoint activation, and Matrix config
    document.body.addEventListener('click', async (e) => {
      // 0. Close Kiosk Modal if backdrop clicked outside dialog
      if (e.target.id === 'kiosk-modal-backdrop') {
        returnToSearchInput();
        return;
      }

      // 0a. Return to Search or Close button in Kiosk Modal header or footer
      if (
        e.target.closest('#kiosk-back-search-btn') ||
        e.target.closest('#kiosk-scan-next-btn') ||
        e.target.closest('#kiosk-modal-close-btn') ||
        e.target.closest('.js-close-kiosk-modal')
      ) {
        returnToSearchInput();
        return;
      }

      // Phase 1: Kiosk Decision Action Buttons (Approve / Face Match / Decline / Override)
      if (e.target.closest('#kiosk-btn-confirm-face')) {
        if (state.pendingFaceMatchScan && state.pendingFaceMatchScan.scan_input) {
          const p = state.pendingFaceMatchScan;
          state.pendingFaceMatchScan = null;
          await triggerGateScan(p.scan_input, p.scan_mode || 'auto', true);
        }
        return;
      }
      if (e.target.closest('#kiosk-btn-approve-in')) {
        await confirmGateAction('approve_in');
        return;
      }
      if (e.target.closest('#kiosk-btn-approve-out')) {
        await confirmGateAction('approve_out');
        return;
      }
      if (e.target.closest('#kiosk-btn-override')) {
        const pnl = document.getElementById('kiosk-override-panel');
        if (pnl) {
          const isShown = pnl.style.display !== 'none';
          pnl.style.display = isShown ? 'none' : 'block';
          if (!isShown) {
            const pinInp = document.getElementById('kiosk-override-pin');
            if (pinInp) {
              pinInp.value = '';
              pinInp.focus();
            }
          }
        }
        return;
      }
      if (e.target.closest('#kiosk-override-cancel-btn')) {
        const pnl = document.getElementById('kiosk-override-panel');
        if (pnl) pnl.style.display = 'none';
        return;
      }
      if (e.target.closest('#kiosk-override-confirm-btn')) {
        const pinInp = document.getElementById('kiosk-override-pin');
        const rSelect = document.getElementById('kiosk-override-reason-select');
        const pin = pinInp ? pinInp.value.trim() : '';
        const reason = rSelect ? rSelect.value : 'Authorized by Supervisor';
        if (!pin) {
          showToast('Enter Supervisor Password or Terminal PIN');
          if (pinInp) pinInp.focus();
          return;
        }
        await confirmGateAction('supervisor_override', {
          supervisor_pin: pin,
          override_reason: reason,
        });
        return;
      }
      if (e.target.closest('#kiosk-btn-decline')) {
        const pnl = document.getElementById('kiosk-decline-panel');
        if (pnl) {
          const isShown = pnl.style.display !== 'none';
          pnl.style.display = isShown ? 'none' : 'block';
        }
        return;
      }
      if (e.target.closest('#kiosk-decline-cancel-btn')) {
        const pnl = document.getElementById('kiosk-decline-panel');
        if (pnl) pnl.style.display = 'none';
        return;
      }
      if (e.target.closest('#kiosk-decline-confirm-btn')) {
        const rSelect = document.getElementById('kiosk-decline-reason-select');
        const reason = rSelect ? rSelect.value : 'Declined by Gate Operator';
        await confirmGateAction('decline_in', {
          decline_reason: reason,
        });
        return;
      }

      // 0c. Open Kiosk from search suggestion click
      const suggestItem = e.target.closest('.js-suggest-kiosk-item');
      if (suggestItem) {
        const cid = Number(suggestItem.getAttribute('data-crew-id'));
        const member = state.crew.find((m) => Number(m.id) === cid);
        if (member) {
          const sEl = document.getElementById('directory-search-suggest');
          if (sEl) sEl.style.display = 'none';
          openKioskModal(member);
        }
        return;
      }

      // 0c–0e. Crew Tables Pagination (Overview & Directory)
      const crewPageMap = { ov: 'overviewPage', dir: 'directoryPage' };
      const crewPrevBtn = e.target.closest('.js-crew-prev-btn');
      if (crewPrevBtn && !crewPrevBtn.hasAttribute('disabled')) {
        const key = crewPageMap[crewPrevBtn.getAttribute('data-page-scope') || 'dir'];
        if (key && state[key] > 1) {
          state[key]--;
          renderCrewTables();
        }
        return;
      }

      const crewNextBtn = e.target.closest('.js-crew-next-btn');
      if (crewNextBtn && !crewNextBtn.hasAttribute('disabled')) {
        const key = crewPageMap[crewNextBtn.getAttribute('data-page-scope') || 'dir'];
        if (key) {
          state[key]++;
          renderCrewTables();
        }
        return;
      }

      const crewPageBtn = e.target.closest('.js-crew-page-btn');
      if (crewPageBtn) {
        const key = crewPageMap[crewPageBtn.getAttribute('data-page-scope') || 'dir'];
        const targetPage = Number(crewPageBtn.getAttribute('data-page'));
        if (key && targetPage && targetPage !== state[key]) {
          state[key] = targetPage;
          renderCrewTables();
        }
        return;
      }

      // 1. Paired Checkin / Checkout button in Crew Roster table
      const gateBtn = e.target.closest('.js-row-gate-action');
      if (gateBtn) {
        e.stopPropagation();
        const badge = gateBtn.getAttribute('data-badge');
        const mode = gateBtn.getAttribute('data-mode');
        if (badge) triggerGateScan(badge, mode);
        return;
      }

      // 2. Inspect icon in Crew Roster row
      const inspectCrewBtn = e.target.closest('.js-inspect-crew-kiosk');
      if (inspectCrewBtn) {
        e.stopPropagation();
        const cid = Number(inspectCrewBtn.getAttribute('data-crew-id'));
        const member = state.crew.find((m) => Number(m.id) === cid);
        if (member) {
          openKioskModal(member);
        }
        return;
      }

      // 3. Crew Roster Row Click -> Load member in Centered Kiosk Modal
      const crewRow = e.target.closest('.attendee-table-row[data-crew-id]');
      if (crewRow) {
        const cid = Number(crewRow.getAttribute('data-crew-id'));
        const member = state.crew.find((m) => Number(m.id) === cid);
        if (member) {
          openKioskModal(member);
        }
        return;
      }

      // 4a. User Activity Timeline Edit / Delete CRUD Buttons
      const tlEditBtn = e.target.closest('.js-edit-timeline-log');
      if (tlEditBtn) {
        e.stopPropagation();
        if (!isCurrentUserAdmin() && !isCurrentUserStockManager()) {
          showToast('Permission Denied: Activity Timeline CRUD requires Site Manager or Administrator privileges.');
          return;
        }
        const tlId = Number(tlEditBtn.getAttribute('data-timeline-id') || 0);
        const isRpt = state.timelineRange && state.timelineRange !== 'today';
        const pairedList = pairTimelineEvents(isRpt ? (state.timelineReportRows || []) : (state.activityTimeline || []));
        const tlItem = pairedList.find((t) => Number(t.id) === tlId) || (state.activityTimeline || []).find((t) => Number(t.id) === tlId);
        if (tlItem) {
          openTimelineCrudModal(tlItem);
        }
        return;
      }

      const tlDelBtn = e.target.closest('.js-delete-timeline-log');
      if (tlDelBtn) {
        e.stopPropagation();
        if (!isCurrentUserAdmin() && !isCurrentUserStockManager()) {
          showToast('Permission Denied: Activity Timeline CRUD requires Site Manager or Administrator privileges.');
          return;
        }
        const inId = Number(tlDelBtn.getAttribute('data-in-id') || 0);
        const outId = Number(tlDelBtn.getAttribute('data-out-id') || 0);
        const tlId = Number(tlDelBtn.getAttribute('data-timeline-id') || 0);
        const label = tlDelBtn.getAttribute('data-log-label') || 'this staff member';
        const ids = Array.from(new Set([inId, outId, tlId].filter((n) => n > 0)));
        const { confirmed } = await showConfirmModal({
          title: 'Delete Activity Log',
          message: `Delete ${ids.length > 1 ? 'this paired Check-In & Check-Out session' : 'this gate scan entry'} for ${label}?`,
          confirmText: 'Delete Log',
          tone: 'danger',
        });
        if (!confirmed) return;
        try {
          const res = await fetch('api.php?action=delete_attendance_log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tlId, ids }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            applyBootstrapPayload(data, true);
            renderAll();
            if (state.timelineRange && state.timelineRange !== 'today') {
              fetchAttendanceReport(state.timelineRange);
            }
            showToast(data.message || 'Activity log deleted.');
          } else {
            showToast((data && data.error) || 'Failed to delete activity log.');
          }
        } catch (err) {
          showToast('Network error deleting activity log.');
        }
        return;
      }

      // 4. User Activity Timeline Card Click -> Open Dedicated Audit & Transit Log Modal
      const tlCard = e.target.closest('.timeline-event-card[data-timeline-uid]');
      if (tlCard) {
        const uid = Number(tlCard.getAttribute('data-timeline-uid'));
        const tlId = Number(tlCard.getAttribute('data-timeline-id'));
        const member = (state.crew || []).find((m) => Number(m.id) === uid);
        const isRpt = state.timelineRange && state.timelineRange !== 'today';
        const pairedList = pairTimelineEvents(isRpt ? (state.timelineReportRows || []) : (state.activityTimeline || []));
        const tlItem = pairedList.find((t) => Number(t.id) === tlId) || (state.activityTimeline || []).find((t) => Number(t.id) === tlId);

        if (tlItem) {
          openTimelineDetailModal(tlItem, member);
        } else if (member) {
          const synthItem = {
            id: uid,
            user_id: uid,
            full_name: member.full_name,
            role_display: member.role_display,
            department: member.department,
            badge_code: member.badge_code,
            staff_code: member.staff_code,
            clearance_code: member.clearance_code,
            clearance_color: member.clearance_color,
            checkpoint_name: state.activeCheckpoint.name,
            checkpoint_type: state.activeCheckpoint.type,
            scan_action: member.daily_state === 'checked_out' ? 'check_out' : 'check_in',
            access_status: 'granted',
            formatted_time: new Date().toLocaleTimeString(),
            notes: 'Current Gate Session',
            in_pill: member.check_in_time ? `In: ${member.check_in_time}` : null,
            out_pill: member.check_out_time ? `Out: ${member.check_out_time}` : null,
          };
          openTimelineDetailModal(synthItem, member);
        }
        return;
      }

      // 5. Activate Checkpoint from Screen 2 Directory
      const actCpBtn = e.target.closest('.js-activate-checkpoint-btn');
      if (actCpBtn) {
        if (state.stationLocked) {
          showToast('Station is locked. Unlock with the checkpoint Terminal PIN first.');
          return;
        }
        state.checkpointType = actCpBtn.getAttribute('data-cp-type');
        state.checkpointId = Number(actCpBtn.getAttribute('data-cp-id'));
        await fetchBootstrap(false);
        switchScreen('terminals', 'pane-kiosk');
        showToast(`Switched Active Gate Terminal to ${state.activeCheckpoint.name}`);
        return;
      }

      // 6. Roll-Call Modal Checkout Now button
      const rcOutBtn = e.target.closest('.js-rollcall-checkout-btn');
      if (rcOutBtn) {
        const badge = rcOutBtn.getAttribute('data-badge');
        if (badge) triggerGateScan(badge, 'check_out');
        return;
      }

      // 7. Open Call Time modal from table row
      const callTimeRowBtn = e.target.closest('.js-open-row-calltime');
      if (callTimeRowBtn) {
        e.stopPropagation();
        const cpType = callTimeRowBtn.getAttribute('data-cp-type');
        const cpId = callTimeRowBtn.getAttribute('data-cp-id');
        const cpName = callTimeRowBtn.getAttribute('data-cp-name');
        const currentTime = callTimeRowBtn.getAttribute('data-call-time');
        openCallTimeModal(cpType, cpId, cpName, currentTime);
        return;
      }

      // 8. Open Event Assign Modal from table row
      const eventAssignBtn = e.target.closest('.js-open-event-assign-modal');
      if (eventAssignBtn) {
        e.stopPropagation();
        if (isCurrentUserStockController()) {
          showToast('Access Restricted: Assigning event crew requires Tech Lead or Supervisor privileges.');
          return;
        }
        const eventId = eventAssignBtn.getAttribute('data-event-id');
        if (eventId) {
          openEventAssignModal(eventId);
        }
        return;
      }

      // 9. Test in Kiosk from Matrix screen
      const testKioskBtn = e.target.closest('.js-test-in-kiosk');
      if (testKioskBtn) {
        const cid = Number(testKioskBtn.getAttribute('data-crew-id'));
        const member = state.crew.find((m) => Number(m.id) === cid);
        if (member) {
          state.selectedCrewId = cid;
          state.currentVerification = buildClientVerificationFromMember(member);
          switchScreen('terminals', 'pane-kiosk');
          renderAll();
        }
        return;
      }

      // 10. Stock Manager: Edit Warehouse
      const editWhBtn = e.target.closest('.js-edit-wh-btn');
      if (editWhBtn) {
        openWarehouseModal(Number(editWhBtn.getAttribute('data-wh-id')));
        return;
      }

      // 11. Stock Manager: Add Warehouse shortcut
      const trigAddWh = e.target.closest('.js-trigger-add-wh');
      if (trigAddWh) {
        openWarehouseModal();
        return;
      }

      // 12. Facilities Manager: Delete Record
      const delBtn = e.target.closest('.js-delete-record-btn');
      if (delBtn) {
        openDeleteModal(
          delBtn.getAttribute('data-del-type'),
          delBtn.getAttribute('data-del-id'),
          delBtn.getAttribute('data-del-name')
        );
        return;
      }

      // 14b. User Management: Reset Trusted Device Lock
      const resetDevBtn = e.target.closest('.js-reset-device-btn');
      if (resetDevBtn) {
        const uid = Number(resetDevBtn.getAttribute('data-user-id'));
        const uName = resetDevBtn.getAttribute('data-user-name') || 'this user';
        const { confirmed } = await showConfirmModal({
          title: 'Unbind Trusted Device Lock',
          message: `Revoke active phone/device lock for ${uName}? Their next Gate QR scan will bind their current device.`,
          confirmText: 'Unbind Device',
          tone: 'warning',
        });
        if (!confirmed) return;
        try {
          const res = await fetch('api.php?action=reset_user_trusted_device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_user_trusted_device', user_id: uid }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            showToast(data?.error || 'Could not unbind device.');
            return;
          }
          applyBootstrapPayload(data, true);
          showToast(data.message || 'Device lock reset.');
        } catch (err) {
          showToast('Network error resetting device lock.');
        }
        return;
      }

      // 15. User Management: Edit User
      const editUserBtn = e.target.closest('.js-edit-user-btn');
      if (editUserBtn) {
        openUserModal(Number(editUserBtn.getAttribute('data-user-id')));
        return;
      }

      // 16. User Management: Delete User
      const delUserBtn = e.target.closest('.js-delete-user-btn');
      if (delUserBtn) {
        openDeleteModal('user', Number(delUserBtn.getAttribute('data-user-id')), delUserBtn.getAttribute('data-user-name') || 'this user');
        return;
      }

      // 17. User Management: Pagination Prev
      const userPrevBtn = e.target.closest('.js-users-page-prev');
      if (userPrevBtn) {
        if (state.usersPage > 1) {
          state.usersPage--;
          renderUsersScreen();
        }
        return;
      }

      // 18. User Management: Pagination Next
      const userNextBtn = e.target.closest('.js-users-page-next');
      if (userNextBtn) {
        state.usersPage++;
        renderUsersScreen();
        return;
      }

      // 19. User Management: Pagination Page Num
      const userNumBtn = e.target.closest('.js-users-page-num');
      if (userNumBtn) {
        state.usersPage = Number(userNumBtn.getAttribute('data-page'));
        renderUsersScreen();
        return;
      }
    });

    // Clearance Tier Change in Matrix Config Table
    document.body.addEventListener('change', async (e) => {
      const clrSelect = e.target.closest('.js-clearance-select');
      if (clrSelect) {
        const uid = Number(clrSelect.getAttribute('data-user-id'));
        const newLevel = clrSelect.value;
        const res = await fetch('api.php?action=update_clearance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_clearance',
            user_id: uid,
            clearance_level: newLevel,
            badge_status: 'active',
          }),
        });
        const data = await res.json();
        if (data && data.ok) {
          applyBootstrapPayload(data, false);
          showToast(`Updated staff #${uid} clearance tier to ${newLevel}`);
        }
      }
    });

    // Status Tabs (Overview & Directory)
    const ovTabs = document.getElementById('overview-attendee-tabs');
    if (ovTabs) {
      ovTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.status-tab[data-tab]');
        if (!tab) return;
        state.overviewTab = tab.getAttribute('data-tab');
        state.overviewPage = 1;
        ovTabs.querySelectorAll('.status-tab').forEach((t) => t.classList.toggle('active', t === tab));
        renderCrewTables();
      });
    }

    const dirTabs = document.getElementById('directory-attendee-tabs');
    if (dirTabs) {
      dirTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.status-tab[data-tab]');
        if (!tab) return;
        state.directoryTab = tab.getAttribute('data-tab');
        state.directoryPage = 1;
        dirTabs.querySelectorAll('.status-tab').forEach((t) => t.classList.toggle('active', t === tab));
        renderCrewTables();
      });
    }

    // Checkpoints Tabs (Screen 2 Directory)
    const evTabs = document.getElementById('events-status-tabs');
    if (evTabs) {
      evTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.status-tab[data-event-tab]');
        if (!tab) return;
        state.checkpointTab = tab.getAttribute('data-event-tab');
        state.checkpointPage = 1;
        evTabs.querySelectorAll('.status-tab').forEach((t) => t.classList.toggle('active', t === tab));
        renderCheckpointsDirectory();
      });
    }

    // Checkpoints & Venues Hub Top Sub-Tabs (Directory / Facility Gates CRUD / Event Venues CRUD)
    document.querySelectorAll('.js-events-hub-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextTab = btn.getAttribute('data-cp-hub-tab') || 'directory';
        switchEventsHubTab(nextTab);
      });
    });

    // Search Inputs
    const ovSearch = document.getElementById('overview-attendee-search');
    if (ovSearch) {
      ovSearch.addEventListener('input', (e) => {
        state.overviewSearch = e.target.value;
        state.overviewPage = 1;
        renderCrewTables();
      });
    }

    const dirSearch = document.getElementById('directory-attendee-search');
    const suggestEl = document.getElementById('directory-search-suggest');
    if (dirSearch) {
      dirSearch.addEventListener('input', (e) => {
        state.directorySearch = e.target.value;
        state.directoryPage = 1;
        renderCrewTables();
        renderSearchSuggestions(e.target.value);

        // Auto-open modal on exact badge code match (e.g. barcode scanner)
        const q = e.target.value.trim().toLowerCase();
        if (q.length >= 4) {
          const exactMatch = (state.crew || []).find((c) =>
            (c.badge_code && c.badge_code.toLowerCase() === q) ||
            (c.staff_code && c.staff_code.toLowerCase() === q) ||
            (c.rfid_uid && c.rfid_uid.toLowerCase() === q)
          );
          if (exactMatch) {
            if (suggestEl) suggestEl.style.display = 'none';
            openKioskModal(exactMatch);
          }
        }
      });

      dirSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const q = dirSearch.value.trim().toLowerCase();
          if (!q) return;
          const matched = (state.crew || []).find((c) =>
            (c.full_name && c.full_name.toLowerCase().includes(q)) ||
            (c.badge_code && c.badge_code.toLowerCase().includes(q)) ||
            (c.staff_code && c.staff_code.toLowerCase().includes(q)) ||
            (c.username && c.username.toLowerCase().includes(q)) ||
            (c.department && c.department.toLowerCase().includes(q))
          );
          if (matched) {
            if (suggestEl) suggestEl.style.display = 'none';
            openKioskModal(matched);
          }
        } else if (e.key === 'Escape') {
          if (suggestEl) suggestEl.style.display = 'none';
        }
      });

      dirSearch.addEventListener('focus', () => {
        if (dirSearch.value.trim()) {
          renderSearchSuggestions(dirSearch.value);
        }
      });
    }

    // Dismiss search suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.table-search-box-wrap')) {
        const sEl = document.getElementById('directory-search-suggest');
        if (sEl) sEl.style.display = 'none';
      }
    });

    // Global Keyboard Shortcuts for Gate Terminal & Kiosk Decision Actions
    document.addEventListener('keydown', (e) => {
      const allocModal = document.getElementById('allocate-personnel-modal');
      if (allocModal && allocModal.classList.contains('open')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeAllocatePersonnelModal();
          return;
        }
      }

      const tlModal = document.getElementById('timeline-detail-modal');
      if (tlModal && tlModal.classList.contains('open')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeTimelineDetailModal();
          return;
        }
      }

      const cardEl = document.getElementById('kiosk-verification-card');
      const isCardVisible = cardEl && cardEl.style.display !== 'none';
      const backdrop = document.getElementById('kiosk-modal-backdrop');
      const isModalOpen = backdrop && backdrop.style.display !== 'none';

      if (isCardVisible || isModalOpen) {
        if (e.key === 'Escape') {
          const pOv = document.getElementById('kiosk-override-panel');
          const pDec = document.getElementById('kiosk-decline-panel');
          if (pOv && pOv.style.display !== 'none') {
            e.preventDefault();
            pOv.style.display = 'none';
            return;
          }
          if (pDec && pDec.style.display !== 'none') {
            e.preventDefault();
            pDec.style.display = 'none';
            return;
          }
          returnToSearchInput();
          const sEl = document.getElementById('directory-search-suggest');
          if (sEl) sEl.style.display = 'none';
          return;
        }

        if (e.key === 'Enter' && !['TEXTAREA'].includes((document.activeElement || {}).tagName)) {
          const pOv = document.getElementById('kiosk-override-panel');
          const pDec = document.getElementById('kiosk-decline-panel');
          if (pOv && pOv.style.display !== 'none') {
            e.preventDefault();
            const btn = document.getElementById('kiosk-override-confirm-btn');
            if (btn) btn.click();
            return;
          }
          if (pDec && pDec.style.display !== 'none') {
            e.preventDefault();
            const btn = document.getElementById('kiosk-decline-confirm-btn');
            if (btn) btn.click();
            return;
          }
          const btnFace = document.getElementById('kiosk-btn-confirm-face');
          if (btnFace && btnFace.style.display !== 'none') {
            e.preventDefault();
            btnFace.click();
            return;
          }
          const btnOut = document.getElementById('kiosk-btn-approve-out');
          if (btnOut && btnOut.style.display !== 'none') {
            e.preventDefault();
            btnOut.click();
            return;
          }
          const btnIn = document.getElementById('kiosk-btn-approve-in');
          if (btnIn && btnIn.style.display !== 'none') {
            e.preventDefault();
            btnIn.click();
            return;
          }
        }

        if (e.key === ' ' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement || {}).tagName)) {
          const btnOv = document.getElementById('kiosk-btn-override');
          if (btnOv && btnOv.style.display !== 'none') {
            e.preventDefault();
            btnOv.click();
            return;
          }
        }
      }

      if (e.key === 'Escape') {
        returnToSearchInput();
        const sEl = document.getElementById('directory-search-suggest');
        if (sEl) sEl.style.display = 'none';
      }
      // Quick '/' key to focus barcode scanner anytime
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement || {}).tagName)) {
        e.preventDefault();
        if (state.terminalScreenLocked) {
          const pinInp = document.getElementById('terminal-unlock-pin-input');
          if (pinInp) {
            pinInp.focus();
            pinInp.select();
          }
        } else {
          const inp = document.getElementById('kiosk-badge-input');
          if (inp) {
            inp.focus();
            inp.select();
          }
        }
      }
    });

    const evSearch = document.getElementById('events-search-input');
    if (evSearch) {
      evSearch.addEventListener('input', (e) => {
        state.checkpointSearch = e.target.value;
        state.checkpointPage = 1;
        renderCheckpointsDirectory();
      });
    }

    // Clearance & Gate State filter pills
    ['overview-ticket-filter', 'directory-ticket-filter'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          const idx = (TIER_CYCLE.indexOf(state.tierFilter) + 1) % TIER_CYCLE.length;
          state.tierFilter = TIER_CYCLE[idx];
          state.overviewPage = 1;
          state.directoryPage = 1;
          const lbl = state.tierFilter === 'all' ? 'Clearance: All Tiers' : `Clearance: Tier ${state.tierFilter}`;
          ['overview-ticket-filter-label', 'directory-ticket-filter-label'].forEach((lid) => {
            const el = document.getElementById(lid);
            if (el) el.textContent = lbl;
          });
          renderCrewTables();
        });
      }
    });

    ['overview-checkin-filter', 'directory-checkin-filter'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          const idx = (GATE_STATE_CYCLE.indexOf(state.gateStateFilter) + 1) % GATE_STATE_CYCLE.length;
          state.gateStateFilter = GATE_STATE_CYCLE[idx];
          state.overviewPage = 1;
          state.directoryPage = 1;
          const lbl =
            state.gateStateFilter === 'all'
              ? 'Gate State: All'
              : `Gate State: ${state.gateStateFilter.replace('_', ' ')}`;
          ['overview-checkin-filter-label', 'directory-checkin-filter-label'].forEach((lid) => {
            const el = document.getElementById(lid);
            if (el) el.textContent = lbl;
          });
          renderCrewTables();
        });
      }
    });

    // User Activity Timeline Filters & Pagination (Synchronized across Overview & Screen 2)
    document.querySelectorAll('.timeline-search-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        state.timelineSearch = e.target.value;
        state.timelinePage = 1;
        document.querySelectorAll('.timeline-search-input').forEach((other) => {
          if (other !== e.target) other.value = e.target.value;
        });
        renderActivityTimeline();
      });
    });

    document.querySelectorAll('.timeline-scope-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        state.timelineScope = e.target.value;
        state.timelinePage = 1;
        document.querySelectorAll('.timeline-scope-select').forEach((other) => {
          if (other !== e.target) other.value = e.target.value;
        });
        renderActivityTimeline();
      });
    });

    document.querySelectorAll('#timeline-prev-btn, #attendees-timeline-prev-btn, .js-timeline-prev-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.timelinePage > 1) {
          state.timelinePage--;
          renderActivityTimeline();
        }
      });
    });

    document.querySelectorAll('#timeline-next-btn, #attendees-timeline-next-btn, .js-timeline-next-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.timelinePage++;
        renderActivityTimeline();
      });
    });

    // Modals: Roll-Call Modal
    const rollcallModal = document.getElementById('rollcall-modal');
    document.querySelectorAll('.js-open-rollcall-modal, #topbar-help-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        renderRollCallModalList();
        if (rollcallModal) rollcallModal.classList.add('open');
      });
    });
    const closeRc = document.getElementById('close-rollcall-modal');
    if (closeRc && rollcallModal) {
      closeRc.addEventListener('click', () => rollcallModal.classList.remove('open'));
    }

    // Modals: Station Lock PIN Modal (Uses Dedicated Warehouse PIN or Venue PIN)
    const lockModal = document.getElementById('station-lock-modal');
    document.querySelectorAll('.js-station-lock-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isCurrentUserStockController()) {
          const assignedName = state.currentUser?.assigned_checkpoint_name || state.activeCheckpoint?.name || 'your assigned terminal';
          showToast(`Gate Controller locked to ${assignedName}. Click Relief / Swap to request a terminal change.`);
          return;
        }
        if (!isCurrentUserAdmin() && !isCurrentUserStockManager() && !isCurrentUserTechLead()) {
          showToast('Access Restricted: Station PIN Locking requires Technical Lead, Site Manager, or Administrator privileges.');
          return;
        }
        const cpNameEl = document.getElementById('station-lock-cp-name');
        const pinInput = document.getElementById('station-pin-input');
        if (cpNameEl) cpNameEl.textContent = state.activeCheckpoint?.name || 'Active Checkpoint';
        if (pinInput) {
          pinInput.value = '';
          setTimeout(() => pinInput.focus(), 50);
        }
        if (lockModal) lockModal.classList.add('open');
      });
    });
    const cancelLock = document.getElementById('cancel-station-lock');
    if (cancelLock && lockModal) {
      cancelLock.addEventListener('click', () => lockModal.classList.remove('open'));
    }
    async function submitStationLockToggle(pinInputEl, modalToClose = null) {
      if (isCurrentUserStockController()) {
        const assignedName = state.currentUser?.assigned_checkpoint_name || state.activeCheckpoint?.name || 'your assigned terminal';
        showToast(`Gate Controller locked to ${assignedName}. Click Relief / Swap to request a terminal change.`);
        return;
      }
      if (!isCurrentUserAdmin() && !isCurrentUserStockManager() && !isCurrentUserTechLead()) {
        showToast('Access Restricted: Station PIN Locking requires Technical Lead, Site Manager, or Administrator privileges.');
        return;
      }
      const pin = pinInputEl ? pinInputEl.value.trim() : '';
      const check = await verifyCheckpointPin(pin);
      if (!check || !check.ok) {
        showToast(check?.error || `Invalid PIN for ${state.activeCheckpoint?.name || 'this checkpoint'}`);
        if (pinInputEl) {
          pinInputEl.focus();
          pinInputEl.select();
        }
        return;
      }
      state.stationLocked = !state.stationLocked;
      localStorage.setItem('ability_station_locked', state.stationLocked ? '1' : '0');
      if (modalToClose) modalToClose.classList.remove('open');
      if (pinInputEl) pinInputEl.value = '';
      renderCheckpointSelectors();
      renderStationLockPage();
      showToast(
        state.stationLocked
          ? `Terminal LOCKED to ${state.activeCheckpoint.name}`
          : 'Terminal UNLOCKED — Multi-Checkpoint Mode enabled'
      );
    }

    const lockForm = document.getElementById('station-lock-form');
    if (lockForm && lockModal) {
      lockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitStationLockToggle(document.getElementById('station-pin-input'), lockModal);
      });
    }

    const pageLockForm = document.getElementById('page-station-lock-form');
    if (pageLockForm) {
      pageLockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitStationLockToggle(document.getElementById('page-station-pin-input'), null);
      });
    }

    // Terminals Page: Lock Screen Header Button + Inline Lock Screen Unlock Form
    const terminalLockBtn = document.getElementById('terminal-lock-screen-btn');
    if (terminalLockBtn) {
      terminalLockBtn.addEventListener('click', () => {
        if (!state.terminalScreenLocked) {
          state.terminalScreenLocked = true;
          localStorage.setItem('ability_terminal_screen_locked', '1');
          const errEl = document.getElementById('terminal-unlock-error');
          if (errEl) {
            errEl.style.display = 'none';
            errEl.textContent = '';
          }
          renderCheckpointSelectors();
          const pinInp = document.getElementById('terminal-unlock-pin-input');
          if (pinInp) {
            pinInp.value = '';
            setTimeout(() => pinInp.focus(), 40);
          }
          showToast(`🔒 Terminal Screen LOCKED (${state.activeCheckpoint?.name || 'Checkpoint'})`);
        } else {
          const pinInp = document.getElementById('terminal-unlock-pin-input');
          if (pinInp) {
            pinInp.focus();
            pinInp.select();
          }
        }
      });
    }

    const terminalUnlockForm = document.getElementById('terminal-unlock-form');
    if (terminalUnlockForm) {
      terminalUnlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pinInp = document.getElementById('terminal-unlock-pin-input');
        const errEl = document.getElementById('terminal-unlock-error');
        const submitBtn = document.getElementById('terminal-unlock-submit-btn');
        const pin = pinInp ? pinInp.value.trim() : '';

        if (submitBtn) submitBtn.disabled = true;
        const result = await verifyCheckpointPin(pin);
        if (submitBtn) submitBtn.disabled = false;

        if (!result || !result.ok) {
          const msg = result?.error || `Invalid PIN for ${state.activeCheckpoint?.name || 'this warehouse'}`;
          if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
          }
          playKioskChime('decline');
          if (pinInp) {
            pinInp.focus();
            pinInp.select();
          }
          return;
        }

        state.terminalScreenLocked = false;
        localStorage.setItem('ability_terminal_screen_locked', '0');
        if (errEl) {
          errEl.style.display = 'none';
          errEl.textContent = '';
        }
        if (pinInp) pinInp.value = '';
        renderCheckpointSelectors();
        renderKioskVenueQrDeck();
        playKioskChime('approve');
        showToast(`🔓 Terminal Unlocked — ${state.activeCheckpoint?.name || 'Ready to scan'}`);
        const badgeInp = document.getElementById('kiosk-badge-input');
        if (badgeInp) {
          setTimeout(() => badgeInp.focus(), 60);
        }
      });
    }

    // Terminals Page: Unified Site Terminal PIN Manager Modal (Gates & Venues)
    const whPinModal = document.getElementById('warehouse-pin-modal');
    const openWhPinMgrBtn = document.getElementById('terminal-pin-manager-btn');
    if (openWhPinMgrBtn) {
      openWhPinMgrBtn.addEventListener('click', () => {
        if (!isCurrentUserAdmin() && !isCurrentUserStockManager() && !isCurrentUserTechLead()) {
          showToast('Access Restricted: Terminal PIN configuration requires Technical Lead, Stock Manager, or Administrator privileges.');
          return;
        }
        openWarehousePinModal();
      });
    }
    ['close-warehouse-pin-modal', 'cancel-warehouse-pin-modal'].forEach((cid) => {
      const b = document.getElementById(cid);
      if (b && whPinModal) {
        b.addEventListener('click', () => whPinModal.classList.remove('open'));
      }
    });
    if (whPinModal) {
      whPinModal.addEventListener('click', (e) => {
        if (e.target === whPinModal) whPinModal.classList.remove('open');
      });
    }

    const whPinListEl = document.getElementById('warehouse-pin-list');
    if (whPinListEl) {
      whPinListEl.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.js-edit-wh-pin-btn');
        if (!editBtn) return;
        const cpKey = editBtn.getAttribute('data-cp-key') || '';
        const pin = editBtn.getAttribute('data-pin') || '';
        const selEl = document.getElementById('wh-pin-select');
        const valEl = document.getElementById('wh-pin-value');
        if (selEl && cpKey) selEl.value = cpKey;
        if (valEl) {
          valEl.value = pin;
          valEl.focus();
          valEl.select();
        }
      });
    }

    const whPinSelectEl = document.getElementById('wh-pin-select');
    if (whPinSelectEl) {
      whPinSelectEl.addEventListener('change', () => {
        const { items } = getManageablePinCheckpoints();
        const selected = items.find((i) => i.key === whPinSelectEl.value);
        const valEl = document.getElementById('wh-pin-value');
        if (valEl && selected) {
          valEl.value = selected.pin || '';
        }
      });
    }

    async function submitCheckpointPinUpdate(selectId, valueId, saveBtnId) {
      if (!isCurrentUserAdmin() && !isCurrentUserStockManager() && !isCurrentUserTechLead()) {
        showToast('Access Restricted: Terminal PIN configuration requires Technical Lead, Stock Manager, or Administrator privileges.');
        return;
      }
      const rawKey = (document.getElementById(selectId)?.value || '').trim();
      const [cpType, ...rest] = rawKey.split(':');
      const cpId = rest.join(':');
      const pin = (document.getElementById(valueId)?.value || '').trim();
      const saveBtn = document.getElementById(saveBtnId);
      if (!cpType || !cpId) {
        showToast('Please select a checkpoint terminal.');
        return;
      }
      if (!/^[A-Za-z0-9]{4,12}$/.test(pin)) {
        showToast('PIN must be 4–12 digits or alphanumeric characters.');
        return;
      }
      if (saveBtn) saveBtn.disabled = true;
      try {
        const res = await fetch('api.php?action=save_checkpoint_pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_checkpoint_pin',
            checkpoint_type: cpType,
            checkpoint_id: cpId,
            terminal_pin: pin,
          }),
        });
        const data = await res.json();
        if (data && data.ok) {
          if (cpType === 'stock_warehouse') {
            const wid = Number(cpId);
            (state.checkpoints.stock_warehouses || []).forEach((w) => {
              if (Number(w.id) === wid) w.terminal_pin = pin;
            });
            (state.stockManager.warehouses || []).forEach((w) => {
              if (Number(w.id) === wid) w.terminal_pin = pin;
            });
          } else {
            (state.checkpoints.events || []).forEach((ev) => {
              if (String(ev.id) === String(cpId) || String(ev.raw_id || '') === String(cpId)) {
                ev.terminal_pin = pin;
              }
            });
          }
          if (state.activeCheckpoint && state.checkpointType === cpType && String(state.checkpointId) === String(cpId)) {
            state.activeCheckpoint.terminal_pin = pin;
          }
          renderWarehousePinList();
          renderStationLockPage();
          showToast(data.message || 'Checkpoint Terminal PIN saved');
          await fetchBootstrap(false);
          if (cpType === 'stock_warehouse') {
            loadStockManagerData();
          }
        } else {
          showToast(data?.error || 'Failed to save checkpoint PIN');
        }
      } catch (err) {
        showToast('Error saving checkpoint PIN');
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    }

    const whPinForm = document.getElementById('warehouse-pin-form');
    if (whPinForm) {
      whPinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitCheckpointPinUpdate('wh-pin-select', 'wh-pin-value', 'save-warehouse-pin-btn');
      });
    }

    // Station Lock Dedicated Page Controls
    const pageWhPinListEl = document.getElementById('page-warehouse-pin-list');
    if (pageWhPinListEl) {
      pageWhPinListEl.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.js-page-edit-wh-pin-btn');
        if (!editBtn) return;
        const cpKey = editBtn.getAttribute('data-cp-key') || '';
        const pin = editBtn.getAttribute('data-pin') || '';
        const selEl = document.getElementById('page-wh-pin-select');
        const valEl = document.getElementById('page-wh-pin-value');
        if (selEl && cpKey) selEl.value = cpKey;
        if (valEl) {
          valEl.value = pin;
          valEl.focus();
          valEl.select();
        }
      });
    }

    const pageWhPinSelectEl = document.getElementById('page-wh-pin-select');
    if (pageWhPinSelectEl) {
      pageWhPinSelectEl.addEventListener('change', () => {
        const { items } = getManageablePinCheckpoints();
        const selected = items.find((i) => i.key === pageWhPinSelectEl.value);
        const valEl = document.getElementById('page-wh-pin-value');
        if (valEl && selected) {
          valEl.value = selected.pin || '';
        }
      });
    }

    const pageWhPinForm = document.getElementById('page-warehouse-pin-form');
    if (pageWhPinForm) {
      pageWhPinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitCheckpointPinUpdate('page-wh-pin-select', 'page-wh-pin-value', 'page-save-warehouse-pin-btn');
      });
    }

    // Venue Security Portal Dedicated Page Controls
    const vsLaunchFirstBtn = document.getElementById('vs-launch-first-kiosk-btn');
    if (vsLaunchFirstBtn) {
      vsLaunchFirstBtn.addEventListener('click', () => {
        if (state.stationLocked && state.checkpointType !== 'event_venue') {
          showToast('Station is locked. Unlock with the checkpoint Terminal PIN first.');
          return;
        }
        const firstVenue = (state.checkpoints.event_venues || [])[0];
        if (!firstVenue) {
          showToast('No Event Venues available.');
          return;
        }
        state.checkpointType = 'event_venue';
        state.checkpointId = Number(firstVenue.id);
        switchScreen('terminals', 'pane-kiosk');
        fetchBootstrap(false);
        showToast(`Switched Gate Terminal to ${firstVenue.name}`);
      });
    }

    const vsSearchInput = document.getElementById('vs-search-input');
    if (vsSearchInput) {
      vsSearchInput.addEventListener('input', (e) => {
        state.vsSearch = e.target.value;
        state.vsPage = 1;
        renderVenueSecurityPage();
      });
    }

    const vsAddVenueBtn = document.getElementById('vs-add-venue-btn');
    if (vsAddVenueBtn) {
      vsAddVenueBtn.addEventListener('click', () => {
        if (!canCurrentUserAssignEvents()) {
          showToast('Permission Denied: Creating Event Venues requires Tech Lead, PM, or Administrator privileges.');
          return;
        }
        openVenueCrudModal(null);
      });
    }

    const vsVenuesGrid = document.getElementById('vs-venues-grid');
    if (vsVenuesGrid) {
      vsVenuesGrid.addEventListener('click', async (e) => {
        const launchBtn = e.target.closest('.js-vs-launch-kiosk');
        if (launchBtn) {
          if (state.stationLocked && state.checkpointType !== 'event_venue') {
            showToast('Station is locked. Unlock with the checkpoint Terminal PIN first.');
            return;
          }
          const cpId = Number(launchBtn.getAttribute('data-cp-id') || 0);
          const cpName = launchBtn.getAttribute('data-cp-name') || 'Event Venue';
          state.checkpointType = 'event_venue';
          if (cpId) state.checkpointId = cpId;
          switchScreen('terminals', 'pane-kiosk');
          fetchBootstrap(false);
          showToast(`Launched Venue Gate Kiosk for ${cpName}`);
          return;
        }
        const ctBtn = e.target.closest('.js-vs-edit-calltime');
        if (ctBtn) {
          const cpId = ctBtn.getAttribute('data-cp-id');
          const cpName = ctBtn.getAttribute('data-cp-name');
          const ct = ctBtn.getAttribute('data-call-time');
          openCallTimeModal('event_venue', cpId, cpName, ct);
          return;
        }
        const editBtn = e.target.closest('.js-vs-edit-venue');
        if (editBtn) {
          if (!canCurrentUserAssignEvents()) {
            showToast('Permission Denied: Editing Event Venues requires Tech Lead, PM, or Administrator privileges.');
            return;
          }
          const vid = editBtn.getAttribute('data-venue-id') || '';
          const venue = (state.checkpoints?.event_venues || []).find((v) => String(v.raw_id || v.id) === String(vid) || String(v.id) === String(vid));
          if (venue) openVenueCrudModal(venue);
          return;
        }
        const delBtn = e.target.closest('.js-vs-delete-venue');
        if (delBtn) {
          const vid = delBtn.getAttribute('data-venue-id') || '';
          const vTitle = delBtn.getAttribute('data-venue-title') || 'this Event Venue';
          await confirmAndDeleteEventVenue(vid, vTitle);
        }
      });
    }

    // Event Venue CRUD Modal Listeners
    document.querySelectorAll('.js-close-venue-crud-modal').forEach((btn) => {
      btn.addEventListener('click', closeVenueCrudModal);
    });
    const venueCrudBackdrop = document.getElementById('venue-crud-modal');
    if (venueCrudBackdrop) {
      venueCrudBackdrop.addEventListener('click', (e) => {
        if (e.target === venueCrudBackdrop) closeVenueCrudModal();
      });
    }
    const venueSelectAllBtn = document.getElementById('venue-crud-select-all-btn');
    if (venueSelectAllBtn) {
      venueSelectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('#venue-crud-crew-list .js-venue-crud-crew-cb').forEach((cb) => {
          cb.checked = true;
        });
      });
    }
    const venueClearBtn = document.getElementById('venue-crud-clear-btn');
    if (venueClearBtn) {
      venueClearBtn.addEventListener('click', () => {
        document.querySelectorAll('#venue-crud-crew-list .js-venue-crud-crew-cb').forEach((cb) => {
          cb.checked = false;
        });
      });
    }
    const whCapBtn = document.getElementById('wh-capture-gps-btn');
    if (whCapBtn && navigator.geolocation) {
      whCapBtn.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const l1 = document.getElementById('wh-modal-lat');
            const l2 = document.getElementById('wh-modal-lng');
            if (l1) l1.value = pos.coords.latitude.toFixed(6);
            if (l2) l2.value = pos.coords.longitude.toFixed(6);
            showToast('Warehouse GPS coordinates captured.');
          },
          (err) => showToast('GPS error: ' + err.message),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    const venueCapBtn = document.getElementById('venue-capture-gps-btn');
    if (venueCapBtn && navigator.geolocation) {
      venueCapBtn.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const l1 = document.getElementById('venue-crud-lat');
            const l2 = document.getElementById('venue-crud-lng');
            if (l1) l1.value = pos.coords.latitude.toFixed(6);
            if (l2) l2.value = pos.coords.longitude.toFixed(6);
            showToast('Venue GPS coordinates captured.');
          },
          (err) => showToast('GPS error: ' + err.message),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    const venueCrudForm = document.getElementById('venue-crud-form');
    document.getElementById('venue-clear-image-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const rmEl = document.getElementById('venue-crud-remove-image');
      if (rmEl) rmEl.value = '1';
      resetDropzone('venue');
      showToast('Event cover image marked for removal when you save.', 'warning');
    });
    document.getElementById('venue-crud-delete-btn')?.addEventListener('click', async () => {
      const evId = document.getElementById('venue-crud-id')?.value.trim() || '';
      const evTitle = document.getElementById('venue-crud-title')?.value.trim() || 'this Event';
      if (!evId) return;
      const deleted = await confirmAndDeleteEventVenue(evId, evTitle);
      if (deleted) closeVenueCrudModal();
    });

    if (venueCrudForm) {
      venueCrudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const modalStartDate = document.getElementById('venue-crud-date')?.value || '';
        const modalEndDate = document.getElementById('venue-crud-end-date')?.value || modalStartDate;
        const durCheck = computeEventDuration(modalStartDate, modalEndDate);
        if (!durCheck.valid) {
          showToast('Event end date cannot be earlier than start date.', 'error');
          return;
        }
        const btn = document.getElementById('venue-crud-submit-btn');
        const editingEventId = document.getElementById('venue-crud-id')?.value.trim() || '';
        const defaultBtnText = editingEventId ? 'Save Event Changes' : 'Save Event Venue';
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Saving...';
        }
        const assignedTechs = Array.from(document.querySelectorAll('#venue-crud-crew-list .js-venue-crud-crew-cb:checked'))
          .map((cb) => Number(cb.value));
        const fd = new FormData();
        fd.append('event_id', editingEventId);
        fd.append('title', document.getElementById('venue-crud-title')?.value.trim() || '');
        fd.append('location', document.getElementById('venue-crud-location')?.value.trim() || '');
        fd.append('date', modalStartDate);
        fd.append('start_date', modalStartDate);
        fd.append('end_date', modalEndDate);
        fd.append('call_time', document.getElementById('venue-crud-calltime')?.value || '08:00');
        fd.append('terminal_pin', document.getElementById('venue-crud-pin')?.value.trim() || '');
        fd.append('tech_lead', document.getElementById('venue-crud-techlead')?.value.trim() || '');
        fd.append('project_manager', document.getElementById('venue-crud-pm')?.value.trim() || '');
        fd.append('event_coordinator', document.getElementById('venue-crud-coordinator')?.value.trim() || '');
        fd.append('geofence_radius_m', document.getElementById('venue-crud-radius')?.value || '200');
        fd.append('lat', document.getElementById('venue-crud-lat')?.value || '');
        fd.append('lng', document.getElementById('venue-crud-lng')?.value || '');
        fd.append('checkin_policy', document.getElementById('venue-crud-checkin-policy')?.value || 'hybrid');
        fd.append('require_visual_match', document.getElementById('venue-crud-visual-match')?.checked ? '1' : '0');
        fd.append('remove_image', document.getElementById('venue-crud-remove-image')?.value || '0');
        const branchReqs = {};
        let hasAnyReq = false;
        ['Video', 'Sound', 'Lighting', 'Electrical', 'Rigging', 'Interpretation'].forEach((cap) => {
          const val = Math.max(0, Number(document.getElementById(`venue-req-${cap.toLowerCase()}`)?.value || 0));
          branchReqs[cap] = val;
          if (val > 0) hasAnyReq = true;
        });
        const rNotes = (document.getElementById('venue-req-notes')?.value || '').trim();
        if (hasAnyReq || rNotes) {
          fd.append('requirements', JSON.stringify({ branches: branchReqs, notes: rNotes }));
        }
        fd.append('assigned_technicians', JSON.stringify(assignedTechs));
        const fileInput = document.getElementById('venue-modal-image');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fd.append('image', fileInput.files[0]);
        }
        try {
          const res = await fetch('api.php?action=save_event', {
            method: 'POST',
            body: fd,
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            if (data.event_id) state.selectedDispatchEventId = String(data.event_id);
            closeVenueCrudModal();
            applyBootstrapPayload(data, true);
            renderAll();
            showToast(data.message || 'Event changes saved successfully.', 'success');
          } else {
            showToast((data && data.error) || 'Failed to save Event changes.', 'error');
          }
        } catch (err) {
          showToast('Network error saving Event changes.', 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = defaultBtnText;
          }
        }
      });
    }

    // User Activity Timeline CRUD Modal Listeners
    document.querySelectorAll('.js-open-create-timeline-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isCurrentUserAdmin() && !isCurrentUserStockManager()) {
          showToast('Permission Denied: Activity Timeline CRUD requires Site Manager or Administrator privileges.');
          return;
        }
        openTimelineCrudModal(null);
      });
    });
    document.querySelectorAll('.js-close-timeline-crud-modal').forEach((btn) => {
      btn.addEventListener('click', closeTimelineCrudModal);
    });
    const tlCrudBackdrop = document.getElementById('timeline-crud-modal');
    if (tlCrudBackdrop) {
      tlCrudBackdrop.addEventListener('click', (e) => {
        if (e.target === tlCrudBackdrop) closeTimelineCrudModal();
      });
    }
    const tlModeSel = document.getElementById('tl-crud-mode');
    const tlAccessSel = document.getElementById('tl-crud-access');
    const syncTlCrudVisibility = () => {
      const m = tlModeSel ? tlModeSel.value : 'check_in';
      const acc = tlAccessSel ? tlAccessSel.value : 'granted';
      const outWrap = document.getElementById('tl-crud-out-time-wrap');
      const inLabel = document.getElementById('tl-crud-in-label');
      const denialWrap = document.getElementById('tl-crud-denial-wrap');
      const isSess = m === 'session_complete' && acc === 'granted';
      if (outWrap) outWrap.style.display = isSess ? 'block' : 'none';
      if (inLabel) {
        inLabel.textContent = isSess
          ? 'Check-In Timestamp *'
          : (m === 'check_out' ? 'Check-Out Timestamp *' : 'Scan Timestamp *');
      }
      if (denialWrap) denialWrap.style.display = acc === 'denied' ? 'block' : 'none';
    };
    if (tlModeSel) tlModeSel.addEventListener('change', syncTlCrudVisibility);
    if (tlAccessSel) tlAccessSel.addEventListener('change', syncTlCrudVisibility);

    const tlCrudForm = document.getElementById('timeline-crud-form');
    if (tlCrudForm) {
      tlCrudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('tl-crud-submit-btn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Saving...';
        }
        const cpVal = document.getElementById('tl-crud-checkpoint')?.value || `${state.checkpointType}:${state.checkpointId}`;
        const [cpType, ...rest] = cpVal.split(':');
        const cpId = rest.join(':');
        try {
          const res = await fetch('api.php?action=save_attendance_log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: Number(document.getElementById('tl-crud-id')?.value || 0),
              in_log_id: Number(document.getElementById('tl-crud-in-id')?.value || 0),
              out_log_id: Number(document.getElementById('tl-crud-out-id')?.value || 0),
              user_id: Number(document.getElementById('tl-crud-user')?.value || 0),
              checkpoint_type: cpType,
              checkpoint_id: cpId,
              scan_action: document.getElementById('tl-crud-mode')?.value || 'check_in',
              access_status: document.getElementById('tl-crud-access')?.value || 'granted',
              punctuality_status: document.getElementById('tl-crud-punctuality')?.value || 'on_time',
              scanned_at: document.getElementById('tl-crud-in-time')?.value || '',
              check_out_at: document.getElementById('tl-crud-out-time')?.value || '',
              denial_reason: document.getElementById('tl-crud-denial')?.value.trim() || '',
              notes: document.getElementById('tl-crud-notes')?.value.trim() || '',
            }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            closeTimelineCrudModal();
            applyBootstrapPayload(data, true);
            renderAll();
            if (state.timelineRange && state.timelineRange !== 'today') {
              fetchAttendanceReport(state.timelineRange);
            }
            showToast(data.message || 'Activity log saved.');
          } else {
            showToast((data && data.error) || 'Failed to save activity log.');
          }
        } catch (err) {
          showToast('Network error saving activity log.');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save Log Entry';
          }
        }
      });
    }

    // On-Site Roll-Call Dedicated Page Controls
    const pageRcSearchInp = document.getElementById('page-rc-search-input');
    if (pageRcSearchInp) {
      pageRcSearchInp.addEventListener('input', (e) => {
        state.rollCallSearch = e.target.value;
        renderRollCallPage();
      });
    }
    const pageRcCpFilter = document.getElementById('page-rc-cp-filter');
    if (pageRcCpFilter) {
      pageRcCpFilter.addEventListener('change', (e) => {
        state.rollCallCpFilter = e.target.value;
        renderRollCallPage();
      });
    }
    const pageRcRefreshBtn = document.getElementById('page-rc-refresh-btn');
    if (pageRcRefreshBtn) {
      pageRcRefreshBtn.addEventListener('click', async () => {
        await fetchBootstrap(false);
        renderRollCallPage();
        showToast('On-Site Roll-Call refreshed.');
      });
    }

    document.querySelectorAll('#page-rc-role-pills .js-rc-role-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.rollCallRoleFilter = btn.getAttribute('data-role-cat') || 'all';
        renderRollCallPage();
      });
    });

    // Share Technician On-Site Link & Password Modal
    const onsiteShareModal = document.getElementById('onsite-share-modal');
    const pageRcShareBtn = document.getElementById('page-rc-share-btn');
    const onsiteUrlInp = document.getElementById('onsite-share-url-input');
    const onsiteEnabledCb = document.getElementById('onsite-share-enabled-cb');
    const onsitePwdInp = document.getElementById('onsite-share-pwd-input');
    const onsitePwdHint = document.getElementById('onsite-share-pwd-hint');
    const onsiteStatusPill = document.getElementById('onsite-share-status-pill');
    const onsiteInviteBox = document.getElementById('onsite-share-invite-box');
    const onsiteInviteText = document.getElementById('onsite-share-invite-text');
    const onsiteAdminCtrls = document.getElementById('onsite-share-admin-controls');
    const onsiteSaveBtn = document.getElementById('onsite-share-save-btn');
    const onsiteRevokeBtn = document.getElementById('onsite-revoke-sessions-btn');

    function buildOnsiteShareUrl(sharePath = 'onsite.php') {
      return new URL(sharePath, window.location.href).href;
    }

    function updateOnsiteInvitePreview(url, password = '') {
      if (!onsiteInviteBox || !onsiteInviteText) return;
      if (!password) {
        onsiteInviteBox.style.display = 'none';
        return;
      }
      onsiteInviteText.textContent =
        `aBility Live On-Site Crew Link (View Stock Managers, Controllers & Technicians on site):\n` +
        `Link: ${url}\n` +
        `Password: ${password}`;
      onsiteInviteBox.style.display = 'block';
    }

    function syncOnsiteShareStatusBadge(enabled) {
      if (!onsiteStatusPill) return;
      onsiteStatusPill.textContent = enabled ? 'Active' : 'Disabled';
      onsiteStatusPill.className = enabled ? 'status-badge status-badge-green-sm' : 'status-badge status-badge-red-sm';
    }

    async function openOnsiteShareModal() {
      if (!onsiteShareModal) return;
      if (onsitePwdInp) onsitePwdInp.value = '';
      updateOnsiteInvitePreview('', '');

      const gateNderaInp = document.getElementById('portal-ndera-url-input');
      const gateBkInp = document.getElementById('portal-bk-url-input');
      const gateKccInp = document.getElementById('portal-kcc-url-input');
      if (gateNderaInp) gateNderaInp.value = buildOnsiteShareUrl('ndera-gate.php');
      if (gateBkInp) gateBkInp.value = buildOnsiteShareUrl('bk-arena-gate.php');
      if (gateKccInp) gateKccInp.value = buildOnsiteShareUrl('kcc-gate.php');

      const fallbackUrl = buildOnsiteShareUrl('onsite.php');
      if (onsiteUrlInp) onsiteUrlInp.value = fallbackUrl;
      onsiteShareModal.classList.add('open');

      if (isCurrentUserStockController()) {
        if (onsiteAdminCtrls) onsiteAdminCtrls.style.display = 'none';
        if (onsiteSaveBtn) onsiteSaveBtn.style.display = 'none';
        if (onsiteRevokeBtn) onsiteRevokeBtn.style.display = 'none';
        return;
      }
      if (onsiteAdminCtrls) onsiteAdminCtrls.style.display = '';

      try {
        const res = await fetch('api.php?action=get_onsite_share_config');
        const data = await res.json();
        if (res.ok && data && data.ok) {
          const shareUrl = buildOnsiteShareUrl(data.share_path || 'onsite.php');
          if (onsiteUrlInp) onsiteUrlInp.value = shareUrl;
          if (onsiteEnabledCb) onsiteEnabledCb.checked = Boolean(data.enabled);
          syncOnsiteShareStatusBadge(Boolean(data.enabled));

          const canManage = Boolean(data.can_manage);
          if (onsiteAdminCtrls) onsiteAdminCtrls.style.opacity = canManage ? '1' : '0.85';
          if (onsiteEnabledCb) onsiteEnabledCb.disabled = !canManage;
          if (onsitePwdInp) onsitePwdInp.disabled = !canManage;
          if (onsiteSaveBtn) onsiteSaveBtn.style.display = canManage ? 'inline-flex' : 'none';
          if (onsiteRevokeBtn) onsiteRevokeBtn.style.display = canManage ? 'inline-flex' : 'none';
          const genBtn = document.getElementById('onsite-gen-pwd-btn');
          if (genBtn) genBtn.style.display = canManage ? 'inline-flex' : 'none';

          if (data.is_default_password && data.default_password_preview) {
            if (onsitePwdHint) {
              onsitePwdHint.textContent = `Current active passcode: "${data.default_password_preview}" (you can customize or generate a new one anytime).`;
            }
            updateOnsiteInvitePreview(shareUrl, data.default_password_preview);
          } else if (onsitePwdHint) {
            onsitePwdHint.textContent = 'Custom hashed passcode is active. Enter a new passcode or click Generate to rotate and copy.';
          }
        } else {
          showToast((data && data.error) || 'Could not load share configuration.');
        }
      } catch (err) {
        showToast('Network error loading share settings.');
      }
    }

    if (pageRcShareBtn) {
      pageRcShareBtn.addEventListener('click', openOnsiteShareModal);
    }

    document.querySelectorAll('.js-close-onsite-share-modal').forEach((btn) => {
      btn.addEventListener('click', () => onsiteShareModal?.classList.remove('open'));
    });

    document.querySelectorAll('.js-copy-portal-url').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-copy-target') || '';
        const label = btn.getAttribute('data-copy-label') || 'Link';
        const inp = targetId ? document.getElementById(targetId) : null;
        const val = inp ? inp.value : '';
        if (!val) return;
        try {
          await navigator.clipboard.writeText(val);
          showToast(`${label} copied to clipboard!`);
        } catch (_) {
          if (inp) { inp.select(); document.execCommand('copy'); }
          showToast(`${label} copied!`);
        }
      });
    });

    const copyUrlBtn = document.getElementById('onsite-copy-url-btn');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', async () => {
        const val = onsiteUrlInp?.value || buildOnsiteShareUrl('onsite.php');
        try {
          await navigator.clipboard.writeText(val);
          showToast('On-Site Link copied to clipboard!');
        } catch (_) {
          if (onsiteUrlInp) { onsiteUrlInp.select(); document.execCommand('copy'); }
          showToast('On-Site Link copied!');
        }
      });
    }

    const genPwdBtn = document.getElementById('onsite-gen-pwd-btn');
    if (genPwdBtn) {
      genPwdBtn.addEventListener('click', () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'Crew-';
        for (let i = 0; i < 6; i += 1) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (onsitePwdInp) {
          onsitePwdInp.value = code;
          onsitePwdInp.focus();
        }
      });
    }

    const copyInviteBtn = document.getElementById('onsite-copy-invite-btn');
    if (copyInviteBtn) {
      copyInviteBtn.addEventListener('click', async () => {
        const msg = onsiteInviteText?.textContent || '';
        if (!msg) return;
        try {
          await navigator.clipboard.writeText(msg);
          showToast('Shareable link & password copied for crew!');
        } catch (_) {
          showToast('Copy failed — select and copy text manually.');
        }
      });
    }

    if (onsiteSaveBtn) {
      onsiteSaveBtn.addEventListener('click', async () => {
        const newPwd = (onsitePwdInp?.value || '').trim();
        const enabled = onsiteEnabledCb ? onsiteEnabledCb.checked : true;
        onsiteSaveBtn.disabled = true;
        try {
          const res = await fetch('api.php?action=save_onsite_share_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, password: newPwd }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            syncOnsiteShareStatusBadge(Boolean(data.enabled));
            const shareUrl = buildOnsiteShareUrl(data.share_path || 'onsite.php');
            if (newPwd) {
              updateOnsiteInvitePreview(shareUrl, newPwd);
              if (onsitePwdHint) {
                onsitePwdHint.textContent = 'New passcode saved! Use "Copy Link + Password" above to send it to technicians.';
              }
            }
            showToast(data.message || 'Technician link settings saved.');
          } else {
            showToast((data && data.error) || 'Failed to save share settings.');
          }
        } catch (err) {
          showToast('Network error saving share settings.');
        } finally {
          onsiteSaveBtn.disabled = false;
        }
      });
    }

    if (onsiteRevokeBtn) {
      onsiteRevokeBtn.addEventListener('click', async () => {
        onsiteRevokeBtn.disabled = true;
        try {
          const res = await fetch('api.php?action=save_onsite_share_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ revoke_sessions: true }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            showToast(data.message || 'Active viewer sessions revoked.');
          } else {
            showToast((data && data.error) || 'Failed to revoke sessions.');
          }
        } catch (err) {
          showToast('Network error revoking sessions.');
        } finally {
          onsiteRevokeBtn.disabled = false;
        }
      });
    }

    // Custom Nav Page Configure Shortcut
    const customNavManageBtn = document.getElementById('custom-nav-manage-btn');
    if (customNavManageBtn) {
      customNavManageBtn.addEventListener('click', () => {
        if (!isCurrentUserAdmin()) return;
        state.usersViewMode = 'navigation';
        switchScreen('users');
      });
    }

    // Standalone Gates & On-Site Portals Dedicated CRUD Page
    const addPortalBtn = document.getElementById('open-add-portal-btn');
    if (addPortalBtn) {
      addPortalBtn.addEventListener('click', () => openPortalCrudModal(null));
    }
    const spTypeFilter = document.getElementById('page-sp-type-filter');
    if (spTypeFilter) {
      spTypeFilter.addEventListener('change', (e) => {
        state.portalsTypeFilter = e.target.value || 'all';
        renderStandalonePortalsPage();
      });
    }
    const spSearchInput = document.getElementById('page-sp-search-input');
    if (spSearchInput) {
      spSearchInput.addEventListener('input', (e) => {
        state.portalsSearch = e.target.value || '';
        renderStandalonePortalsPage();
      });
    }

    const spGenCopyBtn = document.getElementById('page-sp-gen-copy-btn');
    const spGenDismissBtn = document.getElementById('page-sp-gen-dismiss-btn');
    const spGenBanner = document.getElementById('page-sp-generated-banner');
    if (spGenCopyBtn) {
      spGenCopyBtn.addEventListener('click', async () => {
        const msg = spGenCopyBtn.getAttribute('data-copy-msg') || '';
        if (!msg) return;
        try {
          await navigator.clipboard.writeText(msg);
          showToast('Link & generated PIN/Password copied!');
        } catch (_) {
          showToast('Copy failed — copy credentials directly from the banner.');
        }
      });
    }
    if (spGenDismissBtn && spGenBanner) {
      spGenDismissBtn.addEventListener('click', () => {
        spGenBanner.style.display = 'none';
      });
    }

    const portalsGrid = document.getElementById('standalone-portals-grid');
    if (portalsGrid) {
      portalsGrid.addEventListener('click', async (e) => {
        const genPinBtn = e.target.closest('.js-sp-gen-pin-btn');
        if (genPinBtn) {
          const whId = Number(genPinBtn.getAttribute('data-wh-id') || 0);
          const pTitle = genPinBtn.getAttribute('data-portal-title') || 'Facility Gate';
          const pUrl = genPinBtn.getAttribute('data-url') || '';
          if (!whId) return;
          const newPin = generateRandomDigitsPin(6);
          genPinBtn.disabled = true;
          genPinBtn.textContent = 'Generating...';
          try {
            const res = await fetch('api.php?action=save_warehouse_pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                checkpoint_type: 'stock_warehouse',
                checkpoint_id: whId,
                terminal_pin: newPin,
              }),
            });
            const data = await res.json();
            if (res.ok && data && data.ok) {
              if (Array.isArray(data.standalonePortals)) {
                state.standalonePortals = data.standalonePortals;
              }
              renderStandalonePortalsPage();
              await fetchBootstrap(true);
              showGeneratedPortalBanner(pTitle, pUrl, 'Gate PIN', newPin);
              showToast(`New Gate PIN "${newPin}" saved for ${pTitle}.`);
            } else {
              showToast((data && data.error) || 'Failed to generate Gate PIN.');
            }
          } catch (_) {
            showToast('Network error generating Gate PIN.');
          } finally {
            genPinBtn.disabled = false;
            genPinBtn.textContent = 'Generate PIN';
          }
          return;
        }

        const genOnsiteBtn = e.target.closest('.js-sp-gen-onsite-btn');
        if (genOnsiteBtn) {
          const pTitle = genOnsiteBtn.getAttribute('data-portal-title') || 'Live On-Site Crew Portal';
          const pUrl = genOnsiteBtn.getAttribute('data-url') || resolvePortalAbsoluteUrl('onsite.php');
          const newPass = generateRandomOnsitePassword();
          genOnsiteBtn.disabled = true;
          genOnsiteBtn.textContent = 'Generating...';
          try {
            const res = await fetch('api.php?action=save_onsite_share_config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enabled: true, password: newPass }),
            });
            const data = await res.json();
            if (res.ok && data && data.ok) {
              await loadOnsiteShareIntoPortalsPage();
              showGeneratedPortalBanner(pTitle, pUrl, 'Password', newPass);
              showToast(`New On-Site Password "${newPass}" saved!`);
            } else {
              showToast((data && data.error) || 'Failed to generate On-Site password.');
            }
          } catch (_) {
            showToast('Network error generating On-Site password.');
          } finally {
            genOnsiteBtn.disabled = false;
            genOnsiteBtn.textContent = 'Generate Pass';
          }
          return;
        }

        const copyBtn = e.target.closest('.js-sp-copy-btn');
        if (copyBtn) {
          const url = copyBtn.getAttribute('data-url') || '';
          const lbl = copyBtn.getAttribute('data-label') || 'Portal URL';
          if (url) {
            try {
              await navigator.clipboard.writeText(url);
              showToast(`${lbl} URL copied to clipboard!`);
            } catch (_) {
              showToast(`URL: ${url}`);
            }
          }
          return;
        }

        const editBtn = e.target.closest('.js-sp-edit-btn');
        if (editBtn) {
          const pid = Number(editBtn.getAttribute('data-portal-id') || 0);
          const item = (state.standalonePortals || []).find((p) => Number(p.id) === pid);
          if (item) openPortalCrudModal(item);
          return;
        }

        const resetBgBtn = e.target.closest('.js-sp-reset-bg-btn');
        if (resetBgBtn) {
          const pid = Number(resetBgBtn.getAttribute('data-portal-id') || 0);
          const pTitle = resetBgBtn.getAttribute('data-portal-title') || 'this portal';
          const ok = await showConfirmModal({
            title: 'Reset Custom Background',
            message: `Remove the custom background image from "${pTitle}" and restore the default backdrop?`,
            confirmText: 'Reset Background',
            danger: false,
          });
          if (!ok) return;
          try {
            const res = await fetch('api.php?action=reset_portal_background', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: pid }),
            });
            const data = await res.json();
            if (res.ok && data && data.ok) {
              state.standalonePortals = data.standalonePortals || state.standalonePortals;
              renderStandalonePortalsPage();
              showToast(data.message || 'Background reset.');
            } else {
              showToast((data && data.error) || 'Failed to reset background.');
            }
          } catch (_) {
            showToast('Network error resetting background.');
          }
          return;
        }

        const delBtn = e.target.closest('.js-sp-delete-btn');
        if (delBtn) {
          const pid = Number(delBtn.getAttribute('data-portal-id') || 0);
          const pTitle = delBtn.getAttribute('data-portal-title') || 'this portal';
          const ok = await showConfirmModal({
            title: 'Delete Custom Portal',
            message: `Delete "${pTitle}" from Standalone Gates & On-Site Portals?`,
            confirmText: 'Delete Portal',
            danger: true,
          });
          if (!ok) return;
          try {
            const res = await fetch('api.php?action=delete_standalone_portal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: pid }),
            });
            const data = await res.json();
            if (res.ok && data && data.ok) {
              state.standalonePortals = data.standalonePortals || [];
              renderStandalonePortalsPage();
              renderMainNavigation();
              showToast(data.message || 'Portal deleted.');
            } else {
              showToast((data && data.error) || 'Failed to delete portal.');
            }
          } catch (_) {
            showToast('Network error deleting portal.');
          }
        }
      });
    }

    // Portal CRUD & Background Image Upload Modal Events
    const portalModal = document.getElementById('portal-crud-modal');
    if (portalModal) {
      portalModal.addEventListener('click', (e) => {
        if (e.target === portalModal) closePortalCrudModal();
      });
    }
    document.querySelectorAll('.js-close-portal-crud-modal').forEach((btn) => {
      btn.addEventListener('click', closePortalCrudModal);
    });

    const portalTypeSel = document.getElementById('portal-crud-type');
    if (portalTypeSel) {
      portalTypeSel.addEventListener('change', syncPortalModalTypeFields);
    }

    const portalOpacityInp = document.getElementById('portal-crud-opacity');
    const portalOpacityVal = document.getElementById('portal-crud-opacity-val');
    if (portalOpacityInp && portalOpacityVal) {
      portalOpacityInp.addEventListener('input', () => {
        portalOpacityVal.textContent = `${Math.round(Number(portalOpacityInp.value || 0.78) * 100)}%`;
      });
    }

    const portalTitleInp = document.getElementById('portal-crud-title');
    const portalKeyInp = document.getElementById('portal-crud-key');
    if (portalTitleInp && portalKeyInp) {
      portalTitleInp.addEventListener('input', () => {
        const idVal = Number(document.getElementById('portal-crud-id')?.value || 0);
        if (idVal === 0 && !portalKeyInp.disabled) {
          portalKeyInp.value = portalTitleInp.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
      });
    }

    const portalBgDropzone = document.getElementById('portal-bg-dropzone');
    const portalBgFileInp = document.getElementById('portal-crud-bg-file');
    const portalBgChangeBtn = document.getElementById('portal-bg-change-btn');
    const portalBgResetBtn = document.getElementById('portal-bg-reset-btn');
    const handlePortalBgSelection = (file) => {
      if (!file || !file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, WEBP, GIF).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Background image must be smaller than 5 MB.');
        return;
      }
      selectedPortalBgFile = file;
      const rmEl = document.getElementById('portal-crud-remove-bg');
      if (rmEl) rmEl.value = '0';
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPortalModalBgPreview(ev.target.result, file.name, true);
      };
      reader.readAsDataURL(file);
    };

    if (portalBgDropzone && portalBgFileInp) {
      portalBgDropzone.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'portal-bg-change-btn') return;
        portalBgFileInp.click();
      });
      portalBgDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        portalBgDropzone.classList.add('drag-over');
      });
      portalBgDropzone.addEventListener('dragleave', () => {
        portalBgDropzone.classList.remove('drag-over');
      });
      portalBgDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        portalBgDropzone.classList.remove('drag-over');
        if (e.dataTransfer?.files?.length) {
          handlePortalBgSelection(e.dataTransfer.files[0]);
        }
      });
      portalBgFileInp.addEventListener('change', (e) => {
        if (e.target.files?.length) handlePortalBgSelection(e.target.files[0]);
      });
    }
    if (portalBgChangeBtn && portalBgFileInp) {
      portalBgChangeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        portalBgFileInp.click();
      });
    }
    if (portalBgResetBtn) {
      portalBgResetBtn.addEventListener('click', () => {
        selectedPortalBgFile = null;
        if (portalBgFileInp) portalBgFileInp.value = '';
        const rmEl = document.getElementById('portal-crud-remove-bg');
        if (rmEl) rmEl.value = '1';
        setPortalModalBgPreview('', '', false);
      });
    }

    const portalCrudGenPinBtn = document.getElementById('portal-crud-gen-pin-btn');
    const portalCrudPinInp = document.getElementById('portal-crud-pin');
    if (portalCrudGenPinBtn && portalCrudPinInp) {
      portalCrudGenPinBtn.addEventListener('click', () => {
        portalCrudPinInp.value = generateRandomDigitsPin(6);
        portalCrudPinInp.focus();
      });
    }

    const portalCrudGenOnsiteBtn = document.getElementById('portal-crud-gen-onsite-btn');
    const portalCrudOnsitePwdInp = document.getElementById('portal-crud-onsite-pwd');
    if (portalCrudGenOnsiteBtn && portalCrudOnsitePwdInp) {
      portalCrudGenOnsiteBtn.addEventListener('click', () => {
        portalCrudOnsitePwdInp.value = generateRandomOnsitePassword();
        portalCrudOnsitePwdInp.focus();
      });
    }

    const portalCrudForm = document.getElementById('portal-crud-form');
    if (portalCrudForm) {
      portalCrudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('portal-crud-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';
        }
        try {
          const pType = document.getElementById('portal-crud-type')?.value || 'facility_gate';
          const pTitle = (document.getElementById('portal-crud-title')?.value || '').trim();
          const newPinVal = (document.getElementById('portal-crud-pin')?.value || '').trim();
          const newOnsitePwdVal = (document.getElementById('portal-crud-onsite-pwd')?.value || '').trim();

          const fd = new FormData();
          fd.append('id', document.getElementById('portal-crud-id')?.value || '0');
          fd.append('title', pTitle);
          fd.append('portal_key', (document.getElementById('portal-crud-key')?.value || '').trim());
          fd.append('subtitle', (document.getElementById('portal-crud-subtitle')?.value || '').trim());
          fd.append('portal_type', pType);
          fd.append('wh_id', document.getElementById('portal-crud-wh-id')?.value || '');
          fd.append('entry_url', (document.getElementById('portal-crud-url')?.value || '').trim());
          fd.append('terminal_pin', newPinVal);
          fd.append('onsite_password', newOnsitePwdVal);
          fd.append('overlay_opacity', document.getElementById('portal-crud-opacity')?.value || '0.78');
          fd.append('best_for', (document.getElementById('portal-crud-best-for')?.value || '').trim());
          fd.append('permissions_summary', (document.getElementById('portal-crud-permissions')?.value || '').trim());
          fd.append('expires_at', document.getElementById('portal-crud-expires-at')?.value || '');
          fd.append('allow_scan', document.getElementById('portal-crud-allow-scan')?.checked ? '1' : '0');
          fd.append('mask_phones', document.getElementById('portal-crud-mask-phones')?.checked ? '1' : '0');
          fd.append('is_active', document.getElementById('portal-crud-active')?.checked ? '1' : '0');
          fd.append('remove_background', document.getElementById('portal-crud-remove-bg')?.value === '1' ? '1' : '0');
          if (selectedPortalBgFile) {
            fd.append('background_image', selectedPortalBgFile);
          }

          const res = await fetch('api.php?action=save_standalone_portal', {
            method: 'POST',
            body: fd,
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            state.standalonePortals = data.standalonePortals || state.standalonePortals;
            closePortalCrudModal();
            renderStandalonePortalsPage();
            renderMainNavigation();
            await fetchBootstrap(true);
            if (pType === 'onsite_portal') {
              await loadOnsiteShareIntoPortalsPage();
              if (newOnsitePwdVal) {
                showGeneratedPortalBanner(pTitle || 'Live On-Site Crew Portal', resolvePortalAbsoluteUrl('onsite.php'), 'Password', newOnsitePwdVal);
              }
            } else if (newPinVal) {
              const savedPortal = (state.standalonePortals || []).find((p) => Number(p.id) === Number(data.portal_id));
              showGeneratedPortalBanner(
                pTitle || 'Facility Gate',
                resolvePortalAbsoluteUrl(savedPortal ? savedPortal.entry_url : 'gate.php'),
                'Gate PIN',
                newPinVal
              );
            }
            showToast(data.message || 'Portal saved!');
          } else {
            showToast((data && data.error) || 'Failed to save portal settings.');
          }
        } catch (_) {
          showToast('Network error saving portal settings.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Portal Settings';
          }
        }
      });
    }

    // Embedded On-Site Security Controls inside #screen-standalone-portals
    const spGenBtn = document.getElementById('page-sp-onsite-gen-btn');
    const spPwdInp = document.getElementById('page-sp-onsite-pwd-input');
    const spEnabledCb = document.getElementById('page-sp-onsite-enabled-cb');
    const spSaveBtn = document.getElementById('page-sp-onsite-save-btn');
    const spRevokeBtn = document.getElementById('page-sp-onsite-revoke-btn');
    const spCopyInviteBtn = document.getElementById('page-sp-onsite-copy-invite-btn');
    const spInvitePreview = document.getElementById('page-sp-onsite-invite-preview');
    if (spGenBtn && spPwdInp) {
      spGenBtn.addEventListener('click', () => {
        spPwdInp.value = generateRandomOnsitePassword();
        spPwdInp.focus();
      });
    }
    if (spCopyInviteBtn) {
      spCopyInviteBtn.addEventListener('click', async () => {
        const txt = spInvitePreview?.textContent || '';
        if (!txt) return;
        try {
          await navigator.clipboard.writeText(txt);
          showToast('On-Site crew link & password copied!');
        } catch (_) {
          showToast('Copy failed — select and copy text manually.');
        }
      });
    }
    if (spSaveBtn) {
      spSaveBtn.addEventListener('click', async () => {
        const newPwd = (spPwdInp?.value || '').trim();
        const enabled = spEnabledCb ? spEnabledCb.checked : true;
        spSaveBtn.disabled = true;
        try {
          const res = await fetch('api.php?action=save_onsite_share_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, password: newPwd }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            await loadOnsiteShareIntoPortalsPage();
            showToast(data.message || 'Technician link settings saved.');
          } else {
            showToast((data && data.error) || 'Failed to save share settings.');
          }
        } catch (_) {
          showToast('Network error saving share settings.');
        } finally {
          spSaveBtn.disabled = false;
        }
      });
    }
    if (spRevokeBtn) {
      spRevokeBtn.addEventListener('click', async () => {
        spRevokeBtn.disabled = true;
        try {
          const res = await fetch('api.php?action=save_onsite_share_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ revoke_sessions: true }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok) {
            showToast(data.message || 'Active viewer sessions revoked.');
          } else {
            showToast((data && data.error) || 'Failed to revoke sessions.');
          }
        } catch (_) {
          showToast('Network error revoking sessions.');
        } finally {
          spRevokeBtn.disabled = false;
        }
      });
    }

    // Modals: Dedicated Timeline Activity & Transit Log Modal
    const tlDetailModal = document.getElementById('timeline-detail-modal');
    const closeTlBtn1 = document.getElementById('close-timeline-detail-modal');
    const closeTlBtn2 = document.getElementById('tl-modal-close-btn');
    const printTlBtn = document.getElementById('tl-modal-print-btn');

    [closeTlBtn1, closeTlBtn2].forEach((btn) => {
      if (btn && tlDetailModal) {
        btn.addEventListener('click', () => closeTimelineDetailModal());
      }
    });

    if (tlDetailModal) {
      tlDetailModal.addEventListener('click', (e) => {
        if (e.target === tlDetailModal) {
          closeTimelineDetailModal();
        }
      });
    }

    if (printTlBtn) {
      printTlBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Real-Time Facility & Personnel Allocation Map: View Switcher (Option A, Option B, Chart, COS)
    const btnToggleOptA = document.getElementById('toggle-view-option-a') || document.getElementById('toggle-view-map');
    const btnToggleOptB = document.getElementById('toggle-view-option-b');
    const btnToggleChart = document.getElementById('toggle-view-chart');
    const btnToggleCos = document.getElementById('toggle-view-cos');
    const btnCollapseOptA = document.getElementById('toggle-option-a-collapse');

    if (btnToggleOptA) {
      btnToggleOptA.addEventListener('click', () => setAllocationMapView('option-a'));
    }
    if (btnToggleOptB) {
      btnToggleOptB.addEventListener('click', () => setAllocationMapView('option-b'));
    }
    if (btnToggleChart) {
      btnToggleChart.addEventListener('click', () => setAllocationMapView('chart'));
    }
    if (btnToggleCos) {
      btnToggleCos.addEventListener('click', () => setAllocationMapView('cos'));
    }
    if (btnCollapseOptA) {
      btnCollapseOptA.addEventListener('click', toggleOptionACollapse);
    }

    const cosRolePills = document.getElementById('overview-cos-role-pills');
    if (cosRolePills) {
      cosRolePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.cos-role-pill');
        if (!pill) return;
        state.cosRoleFilter = pill.getAttribute('data-role-cat') || 'all';
        renderOverviewCosView();
      });
    }
    const cosCpFilterSel = document.getElementById('overview-cos-cp-filter');
    if (cosCpFilterSel) {
      cosCpFilterSel.addEventListener('change', (e) => {
        state.cosCpFilter = e.target.value || 'all';
        renderOverviewCosView();
      });
    }
    const cosSearchInp = document.getElementById('overview-cos-search-input');
    if (cosSearchInp) {
      cosSearchInp.addEventListener('input', (e) => {
        state.cosSearch = e.target.value || '';
        renderOverviewCosView();
      });
    }

    // Initialize Option B Timeline Feed Integration & Allocation Bar
    initOptionBAllocationEvents();

    const mapFilterSelect = document.getElementById('overview-map-filter');
    if (mapFilterSelect) {
      mapFilterSelect.addEventListener('change', (e) => {
        state.mapFilter = e.target.value;
        renderAllocationMap();
      });
    }

    // Real-Time Facility & Personnel Allocation Modal: Triggers & Submission
    const mapAllocBtn = document.getElementById('map-allocate-crew-btn');
    if (mapAllocBtn) {
      mapAllocBtn.addEventListener('click', () => {
        openAllocatePersonnelModal(state.selectedMapCheckpoint);
      });
    }

    // Reset All Assigned Personnel for Current Facility
    const mapResetBtn = document.getElementById('map-reset-roster-btn');
    if (mapResetBtn) {
      mapResetBtn.addEventListener('click', async () => {
        const allFacilities = getAllFacilitiesList();
        const selCp = state.selectedMapCheckpoint || (allFacilities.length > 0 ? { type: allFacilities[0].type, id: allFacilities[0].id } : null);
        if (!selCp) return;

        const facility = allFacilities.find((f) =>
          f.type === selCp.type && (String(f.id) === String(selCp.id) || Number(f.id) === Number(selCp.id) || (f.raw_id && String(f.raw_id) === String(selCp.id)))
        );
        const facName = facility?.name || 'this location';
        const allCrew = state.crew || [];
        const facilityCrew = facility ? getFacilityCrewMembers(facility, allCrew) : [];

        if (facilityCrew.length === 0) {
          showToast(`No personnel currently assigned to ${facName}.`);
          return;
        }

        const { confirmed } = await showConfirmModal({
          title: 'Reset Location Roster',
          message: `Are you sure you want to reset the roster for ${facName}?\nAll ${facilityCrew.length} assigned personnel will be unassigned and returned to Standby.`,
          confirmText: 'Reset Roster',
          tone: 'danger',
        });
        if (!confirmed) return;

        mapResetBtn.disabled = true;
        mapResetBtn.innerHTML = `<span>Resetting...</span>`;

        try {
          const res = await fetch('api.php?action=reset_facility_crew', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkpoint_type: selCp.type,
              checkpoint_id: (facility && facility.raw_id) ? facility.raw_id : selCp.id,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data || !data.ok) {
            showToast((data && data.error) || 'Failed to reset roster.');
            return;
          }

          applyBootstrapPayload(data, true);
          playKioskChime('approve');
          showToast(`✓ Roster reset for ${facName}. All personnel returned to Standby.`);
        } catch (err) {
          showToast('Error communicating with server: ' + err.message);
        } finally {
          mapResetBtn.disabled = false;
          mapResetBtn.innerHTML = `<span>↺ Reset Roster</span>`;
        }
      });
    }

    const allocModalEl = document.getElementById('allocate-personnel-modal');
    const closeAllocBtn = document.getElementById('close-alloc-modal');
    const cancelAllocBtn = document.getElementById('cancel-alloc-modal');
    [closeAllocBtn, cancelAllocBtn].forEach((btn) => {
      if (btn) btn.addEventListener('click', closeAllocatePersonnelModal);
    });
    if (allocModalEl) {
      allocModalEl.addEventListener('click', (e) => {
        if (e.target === allocModalEl) {
          closeAllocatePersonnelModal();
        }
      });
    }

    const allocSearchInput = document.getElementById('alloc-crew-search');
    if (allocSearchInput) {
      allocSearchInput.addEventListener('input', (e) => {
        renderAllocChecklist(e.target.value);
      });
    }

    const allocForm = document.getElementById('allocate-personnel-form');
    if (allocForm) {
      allocForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userIds = Array.from(allocSelectedUserIds);
        if (userIds.length === 0) {
          showToast('Please select at least one crew member to allocate.');
          return;
        }

        const targetVal = document.getElementById('alloc-target-facility')?.value || 'event_venue:1';
        const [cpType, cpId] = targetVal.split(':');
        const dispatchType = document.getElementById('alloc-dispatch-type')?.value || 'immediate_dispatch';
        const notes = document.getElementById('alloc-notes')?.value || 'Live deployment via Map Radar';
        const submitBtn = document.getElementById('submit-alloc-btn');

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>Deploying ${userIds.length} Crew...</span>`;
        }

        try {
          const res = await fetch('api.php?action=allocate_personnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkpoint_type: cpType,
              checkpoint_id: cpId,
              user_ids: userIds,
              dispatch_type: dispatchType,
              notes: notes,
            }),
          });
          const data = await res.json();
          if (!data.ok) {
            showToast(data.error || 'Failed to allocate personnel.');
            return;
          }

          applyBootstrapPayload(data);
          state.selectedMapCheckpoint = { type: cpType, id: Number(cpId) };
          closeAllocatePersonnelModal();
          playKioskChime('approve');
          showToast(`✓ Successfully allocated ${userIds.length} crew to destination.`);
          renderAll();
        } catch (err) {
          showToast('Error communicating with allocation server.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Confirm Allocation &amp; Deployment →</span>`;
          }
        }
      });
    }

    // =========================================================================
    // SCHEDULE EVENT ROSTER MODAL (Tech Lead / Gate Dashboard Header)
    // Scoped strictly to: save_event, assign_event_crew, allocate_personnel
    // (by stock/venue name only), reset_facility_crew, and unassign_personnel.
    // =========================================================================
    const scheduleRosterModal = document.getElementById('schedule-roster-modal');
    const rosterTargetSelect = document.getElementById('roster-target-select');
    const rosterSearchInput = document.getElementById('roster-crew-search');
    const rosterCheckedIds = new Set();

    function getFacilityLookupName(facility) {
      if (!facility) return '';
      return String(facility.title || facility.name || '').trim();
    }

    function findFacilityByLookupName(targetName) {
      const needle = String(targetName || '').trim().toLowerCase();
      if (!needle) return null;
      return getAllFacilitiesList().find((f) => {
        const titleName = String(f.title || '').trim().toLowerCase();
        const fullName = String(f.name || '').trim().toLowerCase();
        return titleName === needle || fullName === needle;
      }) || null;
    }

    function populateRosterTargetSelect(preferredName) {
      if (!rosterTargetSelect) return null;
      const facilities = getAllFacilitiesList();
      const prevValue = preferredName || rosterTargetSelect.value || getFacilityLookupName(state.activeCheckpoint) || '';
      rosterTargetSelect.innerHTML = '';

      facilities.forEach((f) => {
        const pureName = getFacilityLookupName(f);
        if (!pureName) return;
        const opt = document.createElement('option');
        opt.value = pureName;
        opt.textContent = pureName;
        rosterTargetSelect.appendChild(opt);
      });

      const matched = findFacilityByLookupName(prevValue);
      if (matched) {
        rosterTargetSelect.value = getFacilityLookupName(matched);
      } else if (rosterTargetSelect.options.length > 0) {
        rosterTargetSelect.selectedIndex = 0;
      }
      return findFacilityByLookupName(rosterTargetSelect.value);
    }

    function syncRosterCheckedFromFacility(facility) {
      rosterCheckedIds.clear();
      if (!facility) return;
      const assigned = getFacilityCrewMembers(facility, state.crew || []);
      assigned.forEach((u) => {
        if (u && u.id != null) rosterCheckedIds.add(Number(u.id));
      });
    }

    function updateRosterSelectedCount() {
      const badge = document.getElementById('roster-selected-count');
      if (badge) {
        badge.textContent = `${rosterCheckedIds.size} Selected`;
      }
    }

    function populateRosterTechLeadOptions(currentLead) {
      const sel = document.getElementById('roster-event-techlead');
      if (!sel) return;
      sel.innerHTML = '';

      const blankOpt = document.createElement('option');
      blankOpt.value = '';
      blankOpt.textContent = '-- Select Tech Lead --';
      sel.appendChild(blankOpt);

      const candidates = (state.crew || []).filter((u) => u && u.full_name);
      let foundCurrent = false;
      candidates.forEach((u) => {
        const opt = document.createElement('option');
        opt.value = u.full_name;
        opt.textContent = u.full_name;
        if (currentLead && u.full_name.trim().toLowerCase() === String(currentLead).trim().toLowerCase()) {
          opt.selected = true;
          foundCurrent = true;
        }
        sel.appendChild(opt);
      });

      if (currentLead && !foundCurrent) {
        const customOpt = document.createElement('option');
        customOpt.value = currentLead;
        customOpt.textContent = currentLead;
        customOpt.selected = true;
        sel.appendChild(customOpt);
      }
    }

    function renderRosterChecklist() {
      const listEl = document.getElementById('roster-crew-checklist');
      const pillsEl = document.getElementById('roster-dept-filter-pills');
      if (pillsEl) {
        const deptBuckets = ['all', 'Video', 'Sound', 'Lighting', 'Electrical', 'Rigging', 'Interpretation', 'Support Staff'];
        pillsEl.innerHTML = deptBuckets.map((db) => `
          <button type="button" class="btn ${state.rosterDeptFilter === db ? 'btn-primary-32' : 'btn-secondary-32-sm'} js-roster-dept-pill" data-dept="${escapeHtml(db)}">${db === 'all' ? 'All Depts' : escapeHtml(db)}</button>
        `).join('');
        pillsEl.querySelectorAll('.js-roster-dept-pill').forEach((pb) => {
          pb.addEventListener('click', () => {
            state.rosterDeptFilter = pb.getAttribute('data-dept') || 'all';
            renderRosterChecklist();
          });
        });
      }
      if (!listEl) return;
      const query = String(rosterSearchInput ? rosterSearchInput.value : '').trim().toLowerCase();
      const deptFilter = String(state.rosterDeptFilter || 'all').toLowerCase();
      const filtered = (state.crew || []).filter((u) => {
        if (!u) return false;
        if (deptFilter !== 'all') {
          const uDept = String(u.department || '').toLowerCase();
          const uRole = String(u.role || '').toLowerCase();
          const matchesDept =
            (deptFilter === 'sound' && (uDept.includes('sound') || uDept.includes('audio') || uRole === 'technician' || uRole.includes('sound'))) ||
            (deptFilter === 'support staff' && (uDept.includes('support') || uRole === 'support_staff' || uRole === 'driver' || uRole === 'security' || uRole === 'user')) ||
            uDept.includes(deptFilter) ||
            uRole.includes(deptFilter);
          if (!matchesDept) return false;
        }
        if (!query) return true;
        const hay = `${u.full_name || ''} ${u.role || ''} ${u.department || ''} ${u.clearance_level || ''}`.toLowerCase();
        return hay.includes(query);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = '<div style="font-size: 12px; color: var(--text-secondary); padding: 10px; text-align: center;">No matching personnel found.</div>';
        updateRosterSelectedCount();
        return;
      }

      listEl.innerHTML = filtered.map((u) => {
        const uid = Number(u.id);
        const checked = rosterCheckedIds.has(uid) ? 'checked' : '';
        return `
          <label style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; background: var(--surface-card, #ffffff);">
            <span style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <input type="checkbox" class="js-roster-crew-cb" value="${uid}" ${checked} />
              <span style="font-size: 12.5px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(u.full_name || 'Staff #' + uid)}</span>
            </span>
            <span style="font-size: 11px; color: var(--text-secondary); flex-shrink: 0;">${escapeHtml(u.role || 'Crew')} · ${escapeHtml(u.clearance_level || 'L1')}</span>
          </label>
        `;
      }).join('');

      listEl.querySelectorAll('.js-roster-crew-cb').forEach((cb) => {
        cb.addEventListener('change', () => {
          const idVal = Number(cb.value);
          if (cb.checked) rosterCheckedIds.add(idVal);
          else rosterCheckedIds.delete(idVal);
          updateRosterSelectedCount();
        });
      });

      updateRosterSelectedCount();
    }

    function renderScheduleRosterModalContent(options) {
      const opts = options || {};
      const facility = populateRosterTargetSelect(opts.preferredName);
      const eventSection = document.getElementById('roster-event-section');
      const assignedListEl = document.getElementById('roster-assigned-list');
      const assignedCountEl = document.getElementById('roster-assigned-count');

      if (!facility) {
        if (eventSection) eventSection.style.display = 'none';
        if (assignedListEl) assignedListEl.innerHTML = '<span style="font-size: 12px; color: var(--text-secondary);">No stock or venue selected.</span>';
        renderRosterChecklist();
        return;
      }

      if (opts.syncChecked) {
        syncRosterCheckedFromFacility(facility);
      }

      const isEventVenue = facility.type === 'event_venue';
      if (eventSection) {
        eventSection.style.display = isEventVenue ? 'block' : 'none';
      }

      if (isEventVenue) {
        const callInput = document.getElementById('roster-event-calltime');
        const pmInput = document.getElementById('roster-event-pm');
        const coordInput = document.getElementById('roster-event-coordinator');
        const tlSelect = document.getElementById('roster-event-techlead');
        const dateLabel = document.getElementById('roster-event-date-label');
        if (callInput) callInput.value = (facility.call_time || '08:00').slice(0, 5);
        if (dateLabel) dateLabel.textContent = facility.date ? `Date: ${facility.date}` : '';
        populateLeadershipSelect(pmInput, facility.project_manager || '', 'pm');
        populateLeadershipSelect(coordInput, facility.event_coordinator || '', 'coordinator');
        populateLeadershipSelect(tlSelect, facility.tech_lead || facility.lead_name || '', 'techlead');
        const hsBox = document.getElementById('roster-dispatch-handshake-box');
        const stPill = document.getElementById('roster-dispatch-status-pill');
        const reqSum = document.getElementById('roster-requirements-summary');
        if (hsBox) hsBox.style.display = 'flex';
        if (stPill) stPill.textContent = String(facility.dispatch_status || 'draft').replace(/_/g, ' ').toUpperCase();
        if (reqSum) {
          const br = (facility.requirements && facility.requirements.branches) || {};
          const brParts = Object.keys(br).filter((k) => Number(br[k]) > 0).map((k) => `${k}: ${br[k]}`);
          reqSum.textContent = brParts.length
            ? `Requirements Brief: ${brParts.join(' · ')}${facility.requirements?.notes ? ` — ${facility.requirements.notes}` : ''}`
            : 'No technical branch requirements sent yet (configure in Edit Event Venue or Settings → Dispatch Flow).';
        }
      } else {
        const hsBox = document.getElementById('roster-dispatch-handshake-box');
        if (hsBox) hsBox.style.display = 'none';
      }

      const assignedCrew = getFacilityCrewMembers(facility, state.crew || []);
      if (assignedCountEl) assignedCountEl.textContent = String(assignedCrew.length);

      const evKeyRaw = String(facility.raw_id || facility.id || '');
      const asgMap = (state.eventCrewAssignments && state.eventCrewAssignments[evKeyRaw]) || {};
      if (assignedListEl) {
        if (assignedCrew.length === 0) {
          assignedListEl.innerHTML = '<span style="font-size: 12px; color: var(--text-secondary);">No crew currently assigned to this stock or venue.</span>';
        } else {
          assignedListEl.innerHTML = assignedCrew.map((member) => {
            const asg = asgMap[String(member.id)];
            const stBadge = asg
              ? `<span class="assign-status-pill ${escapeHtml(asg.confirmation_status || 'pending')}">${asg.confirmation_status === 'confirmed' ? '✓' : (asg.confirmation_status === 'declined' ? '✕' : '⏳')}</span>`
              : '';
            return `
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: var(--surface-subtle, #f1f5f9); border: 1px solid var(--border-color); font-size: 11.5px; font-weight: 600;">
              <span>${escapeHtml(member.full_name || 'Member #' + member.id)}</span>
              ${stBadge}
              <button type="button" class="js-roster-unassign-btn" data-user-id="${Number(member.id)}" data-user-name="${escapeHtml(member.full_name || '')}" title="Unassign personnel" style="border: none; background: transparent; color: #dc2626; font-weight: 700; cursor: pointer; padding: 0 2px; line-height: 1;">✕</button>
            </span>
          `;
          }).join('');
        }
      }

      renderRosterChecklist();
    }

    async function postRosterAction(action, bodyPayload, successFallback) {
      const qs = `action=${encodeURIComponent(action)}&checkpoint_type=${encodeURIComponent(state.checkpointType)}&checkpoint_id=${encodeURIComponent(state.checkpointId)}`;
      const res = await fetch(`api.php?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload || {}),
      });
      const data = await res.json();
      if (!res.ok || !data || !data.ok) {
        const errMsg = (data && data.error) ? data.error : `Request failed (${res.status})`;
        showToast(`⚠️ ${errMsg}`);
        playKioskChime('decline');
        return null;
      }

      applyBootstrapPayload(data, true);
      if (scheduleRosterModal && scheduleRosterModal.classList.contains('open')) {
        renderScheduleRosterModalContent({
          preferredName: rosterTargetSelect ? rosterTargetSelect.value : '',
          syncChecked: true,
        });
      }
      playKioskChime('approve');
      showToast(`✅ ${data.message || successFallback}`);
      return data;
    }

    async function resetFacilityRostersByName(facilityNames, triggerBtn) {
      const uniqueNames = Array.from(new Set((facilityNames || []).map((n) => String(n || '').trim()).filter(Boolean)));
      if (uniqueNames.length === 0) {
        showToast('No assigned crew to reset.');
        return;
      }

      const confirmMsg = uniqueNames.length === 1
        ? `Unassign all crew members from "${uniqueNames[0]}" and return them to Standby?`
        : `Unassign all crew members across ${uniqueNames.length} locations (${uniqueNames.join(', ')}) and return them to Standby?`;

      const { confirmed } = await showConfirmModal({
        title: uniqueNames.length === 1 ? 'Reset Location Roster' : 'Reset All Assigned Rosters',
        message: confirmMsg,
        confirmText: 'Reset Roster',
        tone: 'danger',
      });
      if (!confirmed) return;

      if (triggerBtn) triggerBtn.disabled = true;
      try {
        let lastData = null;
        for (const fname of uniqueNames) {
          const qs = `action=reset_facility_crew&checkpoint_type=${encodeURIComponent(state.checkpointType)}&checkpoint_id=${encodeURIComponent(state.checkpointId)}`;
          const res = await fetch(`api.php?${qs}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facility_name: fname }),
          });
          const data = await res.json();
          if (!res.ok || !data || !data.ok) {
            showToast(`⚠️ ${(data && data.error) ? data.error : `Failed resetting ${fname}`}`);
            playKioskChime('decline');
            return;
          }
          lastData = data;
        }
        if (lastData) {
          applyBootstrapPayload(lastData, true);
          playKioskChime('approve');
          showToast(uniqueNames.length === 1
            ? `✅ Roster reset for ${uniqueNames[0]}.`
            : `✅ Reset rosters across ${uniqueNames.length} locations.`);
        }
      } catch (err) {
        console.error('resetFacilityRostersByName error:', err);
        showToast('⚠️ Error resetting roster.');
      } finally {
        if (triggerBtn) triggerBtn.disabled = false;
      }
    }

    function openScheduleRosterModal(preferredName) {
      if (!scheduleRosterModal) return;
      if (!canCurrentUserAssignEvents()) {
        showToast('⛔ Only Admin, Manager, or Tech Lead can schedule the event roster.');
        return;
      }
      if (rosterSearchInput) rosterSearchInput.value = '';
      renderScheduleRosterModalContent({ preferredName, syncChecked: true });
      scheduleRosterModal.classList.add('open');
      scheduleRosterModal.setAttribute('aria-hidden', 'false');
    }

    function closeScheduleRosterModal() {
      if (!scheduleRosterModal) return;
      scheduleRosterModal.classList.remove('open');
      scheduleRosterModal.setAttribute('aria-hidden', 'true');
    }

    const openRosterBtn = document.getElementById('overview-schedule-roster-btn');
    if (openRosterBtn) {
      openRosterBtn.addEventListener('click', () => openScheduleRosterModal());
    }
    const cardOpenRosterBtn = document.getElementById('techlead-card-open-roster-btn');
    if (cardOpenRosterBtn) {
      cardOpenRosterBtn.addEventListener('click', () => openScheduleRosterModal());
    }
    const cardResetAllBtn = document.getElementById('techlead-card-reset-all-btn');
    if (cardResetAllBtn) {
      cardResetAllBtn.addEventListener('click', () => {
        const allCrew = state.crew || [];
        const assignedNames = getAllFacilitiesList()
          .filter((f) => getFacilityCrewMembers(f, allCrew).length > 0)
          .map((f) => getFacilityLookupName(f));
        resetFacilityRostersByName(assignedNames, cardResetAllBtn);
      });
    }
    const techLeadBreakdownEl = document.getElementById('techlead-roster-breakdown');
    if (techLeadBreakdownEl) {
      techLeadBreakdownEl.addEventListener('click', (e) => {
        const resetRowBtn = e.target.closest('.js-techlead-row-reset');
        if (resetRowBtn) {
          e.stopPropagation();
          resetFacilityRostersByName([resetRowBtn.dataset.facilityName || ''], resetRowBtn);
          return;
        }
        const row = e.target.closest('.js-techlead-location-row');
        if (!row) return;
        openScheduleRosterModal(row.dataset.facilityName || '');
      });
    }
    const closeRosterBtn = document.getElementById('close-schedule-roster-modal');
    if (closeRosterBtn) closeRosterBtn.addEventListener('click', closeScheduleRosterModal);
    const cancelRosterBtn = document.getElementById('cancel-schedule-roster-modal');
    if (cancelRosterBtn) cancelRosterBtn.addEventListener('click', closeScheduleRosterModal);
    if (scheduleRosterModal) {
      scheduleRosterModal.addEventListener('click', (e) => {
        if (e.target === scheduleRosterModal) closeScheduleRosterModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && scheduleRosterModal.classList.contains('open')) {
          closeScheduleRosterModal();
        }
      });
    }

    if (rosterTargetSelect) {
      rosterTargetSelect.addEventListener('change', () => {
        renderScheduleRosterModalContent({
          preferredName: rosterTargetSelect.value,
          syncChecked: true,
        });
      });
    }

    if (rosterSearchInput) {
      rosterSearchInput.addEventListener('input', renderRosterChecklist);
    }

    function buildStructuredEventRoster(pm, eventCoord, techLead, crewIds) {
      const idSet = new Set((crewIds || []).map(Number));
      const depts = { Video: [], Sound: [], Lighting: [], Electrical: [], Rigging: [], Interpretation: [] };
      const supportStaff = [];
      (state.crew || []).forEach((u) => {
        const uid = Number(u.id);
        if (!idSet.has(uid)) return;
        const d = String(u.department || '').toLowerCase();
        const r = String(u.role || '').toLowerCase();
        if (d.includes('video') || r.includes('video')) depts.Video.push(uid);
        else if (d.includes('sound') || d.includes('audio') || r.includes('sound') || r === 'technician') depts.Sound.push(uid);
        else if (d.includes('light') || r.includes('light')) depts.Lighting.push(uid);
        else if (d.includes('elect') || r.includes('elect')) depts.Electrical.push(uid);
        else if (d.includes('rig') || r.includes('rig')) depts.Rigging.push(uid);
        else if (d.includes('interp') || r.includes('interp')) depts.Interpretation.push(uid);
        else supportStaff.push(uid);
      });
      return {
        project_manager: pm,
        event_coordinator: eventCoord,
        tech_lead: techLead,
        departments: depts,
        support_staff: supportStaff,
      };
    }

    const rosterSaveEventBtn = document.getElementById('roster-save-event-btn');
    if (rosterSaveEventBtn) {
      rosterSaveEventBtn.addEventListener('click', async () => {
        const facilityName = String(rosterTargetSelect ? rosterTargetSelect.value : '').trim();
        if (!facilityName) {
          showToast('⚠️ Select an event venue first.');
          return;
        }
        const callTime = document.getElementById('roster-event-calltime')?.value || '08:00';
        const techLead = document.getElementById('roster-event-techlead')?.value || '';
        const pm = document.getElementById('roster-event-pm')?.value || '';
        const eventCoord = document.getElementById('roster-event-coordinator')?.value || '';
        const facility = findFacilityByLookupName(facilityName);
        const existingCrewIds = getFacilityCrewMembers(facility, state.crew || []).map((m) => Number(m.id));
        const crewToSave = rosterCheckedIds.size > 0 ? Array.from(rosterCheckedIds) : existingCrewIds;

        rosterSaveEventBtn.disabled = true;
        try {
          await postRosterAction('save_event', {
            facility_name: facilityName,
            call_time: callTime,
            tech_lead: techLead,
            project_manager: pm,
            event_coordinator: eventCoord,
            assigned_technicians: crewToSave,
            assigned_roster: buildStructuredEventRoster(pm, eventCoord, techLead, crewToSave),
          }, 'Event call-time and details saved.');
        } catch (err) {
          console.error('save_event error:', err);
          showToast('⚠️ Error saving event details.');
        } finally {
          rosterSaveEventBtn.disabled = false;
        }
      });
    }

    const rosterReqSupportBtn = document.getElementById('roster-request-support-btn');
    if (rosterReqSupportBtn) {
      rosterReqSupportBtn.addEventListener('click', async () => {
        const facilityName = String(rosterTargetSelect ? rosterTargetSelect.value : '').trim();
        const facility = findFacilityByLookupName(facilityName);
        if (!facility || facility.type !== 'event_venue') {
          showToast('Select an Event Venue first.');
          return;
        }
        const evId = String(facility.raw_id || facility.id || '');
        const noteTxt = (document.getElementById('roster-support-note')?.value || '').trim() || 'Requested from Event Roster modal';
        rosterReqSupportBtn.disabled = true;
        try {
          await postRosterAction('request_support_staff', {
            event_id: evId,
            requested_roles: { 'Support Crew': 2, 'Logistics Driver': 1 },
            notes: noteTxt,
          }, 'Tier 4 Support Staff request sent.');
          const noteEl = document.getElementById('roster-support-note');
          if (noteEl) noteEl.value = '';
        } finally {
          rosterReqSupportBtn.disabled = false;
        }
      });
    }

    const rosterAssignCrewBtn = document.getElementById('roster-assign-crew-btn');
    if (rosterAssignCrewBtn) {
      rosterAssignCrewBtn.addEventListener('click', async () => {
        const facilityName = String(rosterTargetSelect ? rosterTargetSelect.value : '').trim();
        if (!facilityName) {
          showToast('⚠️ Select an event venue first.');
          return;
        }
        const callTime = document.getElementById('roster-event-calltime')?.value || '08:00';
        const techLead = document.getElementById('roster-event-techlead')?.value || '';
        const pm = document.getElementById('roster-event-pm')?.value || '';
        const eventCoord = document.getElementById('roster-event-coordinator')?.value || '';
        const crewIds = Array.from(rosterCheckedIds);

        rosterAssignCrewBtn.disabled = true;
        try {
          await postRosterAction('assign_event_crew', {
            facility_name: facilityName,
            call_time: callTime,
            tech_lead: techLead,
            project_manager: pm,
            event_coordinator: eventCoord,
            assigned_technicians: crewIds,
            assigned_roster: buildStructuredEventRoster(pm, eventCoord, techLead, crewIds),
          }, 'Event crew roster synced.');
        } catch (err) {
          console.error('assign_event_crew error:', err);
          showToast('⚠️ Error syncing event crew.');
        } finally {
          rosterAssignCrewBtn.disabled = false;
        }
      });
    }

    const rosterAllocateBtn = document.getElementById('roster-allocate-btn');
    if (rosterAllocateBtn) {
      rosterAllocateBtn.addEventListener('click', async () => {
        const facilityName = String(rosterTargetSelect ? rosterTargetSelect.value : '').trim();
        if (!facilityName) {
          showToast('⚠️ Select a stock warehouse or event venue name.');
          return;
        }
        const userIds = Array.from(rosterCheckedIds);
        if (userIds.length === 0) {
          showToast('⚠️ Select at least one crew member to allocate.');
          return;
        }
        const notes = String(document.getElementById('roster-alloc-notes')?.value || 'Scheduled via Tech Lead Gate Roster').trim();

        rosterAllocateBtn.disabled = true;
        try {
          await postRosterAction('allocate_personnel', {
            facility_name: facilityName,
            user_ids: userIds,
            notes,
          }, `Personnel allocated to ${facilityName}.`);
        } catch (err) {
          console.error('allocate_personnel error:', err);
          showToast('⚠️ Error allocating personnel.');
        } finally {
          rosterAllocateBtn.disabled = false;
        }
      });
    }

    const rosterResetCrewBtn = document.getElementById('roster-reset-crew-btn');
    if (rosterResetCrewBtn) {
      rosterResetCrewBtn.addEventListener('click', async () => {
        const facilityName = String(rosterTargetSelect ? rosterTargetSelect.value : '').trim();
        if (!facilityName) return;

        const { confirmed } = await showConfirmModal({
          title: 'Reset Facility Crew',
          message: `Unassign all crew members from "${facilityName}"?`,
          confirmText: 'Reset Roster',
          tone: 'danger',
        });
        if (!confirmed) return;

        rosterResetCrewBtn.disabled = true;
        try {
          await postRosterAction('reset_facility_crew', {
            facility_name: facilityName,
          }, `Crew reset for ${facilityName}.`);
        } catch (err) {
          console.error('reset_facility_crew error:', err);
          showToast('⚠️ Error resetting facility crew.');
        } finally {
          rosterResetCrewBtn.disabled = false;
        }
      });
    }

    const rosterAssignedListEl = document.getElementById('roster-assigned-list');
    if (rosterAssignedListEl) {
      rosterAssignedListEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('.js-roster-unassign-btn');
        if (!btn) return;
        const facilityName = String(rosterTargetSelect ? rosterTargetSelect.value : '').trim();
        const uid = Number(btn.dataset.userId || 0);
        const userName = btn.dataset.userName || `Member #${uid}`;
        if (!facilityName || !uid) return;

        btn.disabled = true;
        try {
          await postRosterAction('unassign_personnel', {
            facility_name: facilityName,
            user_id: uid,
          }, `${userName} unassigned from ${facilityName}.`);
        } catch (err) {
          console.error('unassign_personnel error:', err);
          showToast('⚠️ Error unassigning personnel.');
        } finally {
          btn.disabled = false;
        }
      });
    }

    // Clearance Tier CRUD Triggers & Submission
    document.querySelectorAll('#open-create-tier-btn, .js-open-create-tier-btn').forEach((btn) => {
      btn.addEventListener('click', () => openTierCrudModal(null));
    });
    document.querySelectorAll('.js-close-tier-crud-modal').forEach((btn) => {
      btn.addEventListener('click', closeTierCrudModal);
    });

    // Swatches & Color Picker Sync
    document.querySelectorAll('.tier-color-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const c = swatch.getAttribute('data-color');
        const picker = document.getElementById('tier-crud-color');
        const txt = document.getElementById('tier-crud-color-text');
        if (picker && c) picker.value = c;
        if (txt && c) txt.value = c;
      });
    });
    const tierColorPicker = document.getElementById('tier-crud-color');
    const tierColorTxt = document.getElementById('tier-crud-color-text');
    if (tierColorPicker && tierColorTxt) {
      tierColorPicker.addEventListener('input', (e) => {
        tierColorTxt.value = e.target.value;
      });
      tierColorTxt.addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value.trim())) {
          tierColorPicker.value = e.target.value.trim();
        }
      });
    }

    // Auto-derive key from title on creation
    const tierCodeInp = document.getElementById('tier-crud-code');
    const tierTitleInp = document.getElementById('tier-crud-title');
    const tierKeyInp = document.getElementById('tier-crud-key');
    if (tierTitleInp && tierKeyInp) {
      tierTitleInp.addEventListener('input', () => {
        const idVal = Number(document.getElementById('tier-crud-id')?.value || 0);
        if (idVal === 0 && tierCodeInp && !tierCodeInp.readOnly) {
          const code = (tierCodeInp.value || 'L').toUpperCase().trim();
          const clean = tierTitleInp.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          if (clean) tierKeyInp.value = `${code}_${clean}`.slice(0, 60);
        }
      });
    }

    // Tier Type (1. Core vs 2. Standard) dynamic toggle
    const tierTypeSelect = document.getElementById('tier-crud-tier-type');
    if (tierTypeSelect) {
      tierTypeSelect.addEventListener('change', (e) => {
        const isSys = e.target.value === '1';
        const systemNotice = document.getElementById('tier-crud-system-notice');
        if (systemNotice) {
          systemNotice.style.display = isSys ? 'block' : 'none';
          systemNotice.innerHTML = '🔒 <strong>Core Tier:</strong> Designated as system-protected and safe from accidental deletion.';
        }
      });
    }

    // Tier CRUD Form Submit
    const tierCrudForm = document.getElementById('tier-crud-form');
    if (tierCrudForm) {
      tierCrudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('tier-crud-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving Tier...';
        }

        const id = Number(document.getElementById('tier-crud-id').value || 0);
        const code = document.getElementById('tier-crud-code').value.trim().toUpperCase();
        const level_key = document.getElementById('tier-crud-key').value.trim().toUpperCase();
        const title = document.getElementById('tier-crud-title').value.trim();
        const short_name = document.getElementById('tier-crud-short').value.trim();
        const venue_rule = document.getElementById('tier-crud-venue-rule').value;
        const stock_rule = document.getElementById('tier-crud-stock-rule').value;
        const color = document.getElementById('tier-crud-color-text').value.trim() || document.getElementById('tier-crud-color').value;
        const sort_order = Number(document.getElementById('tier-crud-sort').value || 0);
        const is_active = document.getElementById('tier-crud-active').checked ? 1 : 0;
        const is_system = Number(document.getElementById('tier-crud-tier-type')?.value ?? document.getElementById('tier-crud-is-system')?.value ?? 0);
        const description = document.getElementById('tier-crud-desc').value.trim();

        try {
          const res = await fetch('api.php?action=save_clearance_tier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_clearance_tier',
              id,
              code,
              level_key,
              title,
              short_name,
              venue_rule,
              stock_rule,
              color,
              sort_order,
              is_active,
              is_system,
              description,
            }),
          });
          const data = await res.json();
          if (data && data.ok) {
            if (Array.isArray(data.clearanceMatrix)) {
              state.clearanceMatrix = data.clearanceMatrix;
            }
            closeTierCrudModal();
            renderClearanceMatrixCards();
            showToast(data.message || `Clearance Tier ${code} saved successfully.`);
            await fetchBootstrap(false);
          } else {
            showToast(data.error || 'Failed to save clearance tier.');
          }
        } catch (err) {
          console.error(err);
          showToast('Error communicating with server.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Clearance Tier';
          }
        }
      });
    }

    // Delegated click on Matrix Tier Cards (Edit & Delete) across Screen 4 & Screen Users (Tab 3)
    ['matrix-tier-cards-grid', 'users-matrix-tier-cards-grid'].forEach((gridId) => {
      const grid = document.getElementById(gridId);
      if (grid) {
        grid.addEventListener('click', (e) => {
          const editBtn = e.target.closest('.js-edit-tier');
          if (editBtn) {
            const tierCode = editBtn.getAttribute('data-tier-code');
            const tierId = Number(editBtn.getAttribute('data-tier-id') || 0);
            const tier = (state.clearanceMatrix || []).find(
              (m) => (tierId > 0 && Number(m.id) === tierId) || m.code === tierCode
            );
            if (tier) openTierCrudModal(tier);
            return;
          }

          const delBtn = e.target.closest('.js-delete-tier');
          if (delBtn) {
            const tierId = Number(delBtn.getAttribute('data-tier-id') || 0);
            const tierCode = delBtn.getAttribute('data-tier-code') || '';
            const tierTitle = delBtn.getAttribute('data-tier-title') || '';
            const memberCount = Number(delBtn.getAttribute('data-member-count') || 0);

            if (memberCount > 0) {
              showToast(`Cannot delete ${tierCode}: ${memberCount} staff member(s) are assigned to this tier.`);
              return;
            }

            openDeleteModal('clearance_tier', tierId, `${tierCode} — ${tierTitle}`);
          }
        });
      }
    });

    // Call Time Management & Quick Extension / Reset
    async function updateCheckpointCallTime({ cpType = null, cpId = null, callTime = null, extendMinutes = 0, resetToDefault = false }) {
      const resolvedType = cpType || state.checkpointType || state.activeCheckpoint.type;
      const resolvedId = cpId != null ? cpId : (state.checkpointId || state.activeCheckpoint.id);

      try {
        const res = await fetch('api.php?action=update_call_time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_call_time',
            checkpoint_type: resolvedType,
            checkpoint_id: resolvedId,
            call_time: callTime || '08:00',
            extend_minutes: extendMinutes,
            reset_to_default: resetToDefault ? 1 : 0,
          }),
        });
        const data = await res.json();
        if (data && data.ok) {
          applyBootstrapPayload(data, true);
          renderAll();
          updateKioskQuickbar();
          const modal = document.getElementById('call-time-modal');
          if (modal) modal.classList.remove('open');

          if (extendMinutes > 0) {
            playKioskChime('approve');
            showToast(`Shift extended by +${extendMinutes}m! New Call-Time: ${data.updated_call_time || ''}`);
          } else if (resetToDefault) {
            playKioskChime('approve');
            showToast('Call-Time reset back to default baseline (08:00 AM).');
          } else {
            playKioskChime('approve');
            showToast(`Scheduled Call-Time set to ${callTime || data.updated_call_time}`);
          }
          return true;
        } else {
          showToast('Failed to update call time: ' + ((data && data.error) || 'Server error'));
          return false;
        }
      } catch (err) {
        console.error('Call time update error:', err);
        showToast('Error communicating with server');
        return false;
      }
    }

    // Call Time Modal Handlers
    const callTimeModal = document.getElementById('call-time-modal');
    const closeCallTimeBtn = document.getElementById('close-call-time-modal');
    if (closeCallTimeBtn && callTimeModal) {
      closeCallTimeBtn.addEventListener('click', () => callTimeModal.classList.remove('open'));
    }

    // Quick Presets in Call Time Modal
    document.querySelectorAll('.js-calltime-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-time');
        const inp = document.getElementById('call-time-input');
        if (inp && t) inp.value = t;
      });
    });

    // Quick Extension Buttons in Call Time Modal
    document.querySelectorAll('.js-modal-extend-calltime').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.getAttribute('data-mins'), 10) || 15;
        const cpType = document.getElementById('call-time-cp-type')?.value || state.checkpointType;
        const cpId = document.getElementById('call-time-cp-id')?.value || state.checkpointId;
        updateCheckpointCallTime({
          cpType,
          cpId,
          extendMinutes: mins,
        });
      });
    });

    // Reset to Default (08:00 AM) in Call Time Modal
    document.querySelectorAll('#call-time-reset-default-btn, .js-modal-reset-calltime').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cpType = document.getElementById('call-time-cp-type')?.value || state.checkpointType;
        const cpId = document.getElementById('call-time-cp-id')?.value || state.checkpointId;
        updateCheckpointCallTime({
          cpType,
          cpId,
          resetToDefault: true,
        });
      });
    });

    // Quick Extension Buttons in Kiosk Strip Quickbar
    document.querySelectorAll('.js-quick-extend-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.getAttribute('data-mins'), 10) || 15;
        updateCheckpointCallTime({
          cpType: state.checkpointType,
          cpId: state.checkpointId,
          extendMinutes: mins,
        });
      });
    });

    // Reset to Default (08:00 AM) in Kiosk Strip Quickbar
    const quickResetCallTimeBtn = document.getElementById('kiosk-quick-reset-calltime-btn');
    if (quickResetCallTimeBtn) {
      quickResetCallTimeBtn.addEventListener('click', async () => {
        const { confirmed } = await showConfirmModal({
          title: 'Reset Shift Call-Time',
          message: 'Reset active shift call-time back to default baseline (08:00 AM)?',
          confirmText: 'Reset to 08:00 AM',
          tone: 'warning',
        });
        if (!confirmed) return;
        updateCheckpointCallTime({
          cpType: state.checkpointType,
          cpId: state.checkpointId,
          resetToDefault: true,
        });
      });
    }

    // Open Call Time Modal for Active Checkpoint (sidebar-calltime-btn is handled via delegated #sidebar-checkpoint-controls listener)
    document.querySelectorAll('.js-open-active-calltime-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cp = state.activeCheckpoint;
        if (cp) {
          openCallTimeModal(cp.type, cp.id, cp.name, cp.call_time);
        }
      });
    });

    
    // View Switcher between Personnel Directory, Roles Management, 4-Tier Access Matrix, and Departments
    const tabPersonnel = document.getElementById('view-tab-personnel');
    const tabRoles = document.getElementById('view-tab-roles');
    const tabMatrix = document.getElementById('view-tab-matrix');
    const tabDepts = document.getElementById('view-tab-departments');
    const tabNav = document.getElementById('view-tab-navigation');
    const addRoleBtn = document.getElementById('open-add-role-btn');
    const addDeptTopBtn = document.getElementById('open-add-dept-top-btn');

    if (tabPersonnel) tabPersonnel.addEventListener('click', () => switchUsersView('personnel'));
    if (tabRoles) tabRoles.addEventListener('click', () => switchUsersView('roles'));
    if (tabMatrix) tabMatrix.addEventListener('click', () => switchUsersView('matrix'));
    if (tabDepts) tabDepts.addEventListener('click', () => switchUsersView('departments'));
    if (tabNav) tabNav.addEventListener('click', () => switchUsersView('navigation'));

    // Open Add Role Modal
    if (addRoleBtn) {
      addRoleBtn.addEventListener('click', () => openRoleModal(null));
    }

    // Open Add Department Modal
    if (addDeptTopBtn) {
      addDeptTopBtn.addEventListener('click', () => openDeptModal(null));
    }
    document.querySelectorAll('.js-open-create-dept-btn').forEach((btn) => {
      btn.addEventListener('click', () => openDeptModal(null));
    });
    document.querySelectorAll('.js-close-dept-crud-modal').forEach((btn) => {
      btn.addEventListener('click', () => closeDeptModal());
    });

    // Close Role Modal
    document.querySelectorAll('.js-close-role-modal').forEach((btn) => {
      btn.addEventListener('click', () => closeRoleModal());
    });

    // Auto slugify role key input from title input
    const roleTitleInput = document.getElementById('role-modal-title-input');
    const roleKeyInput = document.getElementById('role-modal-key-input');
    if (roleTitleInput && roleKeyInput) {
      roleTitleInput.addEventListener('input', () => {
        const idVal = Number(document.getElementById('role-modal-id').value);
        if (idVal === 0) {
          roleKeyInput.value = roleTitleInput.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
        }
      });
    }

    // Role CRUD Form Submit
    const roleForm = document.getElementById('role-crud-form');
    if (roleForm) {
      roleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = Number(document.getElementById('role-modal-id').value);
        const title = document.getElementById('role-modal-title-input').value.trim();
        const role_key = document.getElementById('role-modal-key-input').value.trim().toLowerCase();
        const clearance_level = document.getElementById('role-modal-tier-select').value;
        const department = document.getElementById('role-modal-dept-select').value;
        const description = document.getElementById('role-modal-desc-input').value.trim();
        const is_active = document.getElementById('role-modal-active-checkbox').checked ? 1 : 0;
        const submitBtn = document.getElementById('role-modal-submit-btn');

        if (!title || !role_key) {
          showToast('Please provide both role title and code key.');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving Role...';
        }

        try {
          const res = await fetch('api.php?action=save_role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, title, role_key, clearance_level, department, description, is_active }),
          });
          const data = await res.json();
          if (data && data.ok) {
            if (Array.isArray(data.roles)) state.roles = data.roles;
            closeRoleModal();
            renderRolesScreen();
            populateRoleDropdowns();
            showToast(data.message || 'Role definition saved successfully!');
          } else {
            showToast(data.error || 'Failed to save role definition.');
          }
        } catch (err) {
          // Offline fallback
          const tier = clearance_level === 'L4_ALL_ACCESS' ? { code: 'L4', title: 'Level 4 - All Access', color: '#10b981' } :
                       clearance_level === 'L3_STOCK_WAREHOUSE' ? { code: 'L3', title: 'Level 3 - Stock Warehouse', color: '#8b5cf6' } :
                       clearance_level === 'L2_TECH_STAGE' ? { code: 'L2', title: 'Level 2 - Technical & Stage', color: '#3b82f6' } :
                       { code: 'L1', title: 'Level 1 - Venue Basic', color: '#64748b' };
          if (id > 0) {
            const existing = state.roles.find((r) => Number(r.id) === id);
            if (existing) {
              Object.assign(existing, { title, role_key, clearance_level, department, description, is_active, clearance_code: tier.code, clearance_title: tier.title, clearance_color: tier.color });
            }
          } else {
            const newId = (state.roles.length ? Math.max(...state.roles.map((r) => Number(r.id))) : 0) + 1;
            state.roles.push({ id: newId, title, role_key, clearance_level, department, description, is_active, is_system: 0, staff_count: 0, clearance_code: tier.code, clearance_title: tier.title, clearance_color: tier.color });
          }
          closeRoleModal();
          renderRolesScreen();
          populateRoleDropdowns();
          showToast(`Role "${title}" saved successfully (Offline mode)!`);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Role Definition';
          }
        }
      });
    }

    // Role search & filters
    const rolesSearchInp = document.getElementById('roles-search-input');
    if (rolesSearchInp) {
      rolesSearchInp.addEventListener('input', (e) => {
        state.rolesSearch = e.target.value;
        renderRolesScreen();
      });
    }
    const rolesTierSel = document.getElementById('roles-filter-tier');
    if (rolesTierSel) {
      rolesTierSel.addEventListener('change', (e) => {
        state.rolesFilterTier = e.target.value;
        renderRolesScreen();
      });
    }
    const rolesDeptSel = document.getElementById('roles-filter-dept');
    if (rolesDeptSel) {
      rolesDeptSel.addEventListener('change', (e) => {
        state.rolesFilterDept = e.target.value;
        renderRolesScreen();
      });
    }

    // Global click listener for Edit Role, Delete Role, and Filter Crew by Role
    document.addEventListener('click', async (e) => {
      // 1. Edit Role
      const editRoleBtn = e.target.closest('.js-edit-role');
      if (editRoleBtn) {
        const rid = Number(editRoleBtn.getAttribute('data-role-id'));
        const r = (state.roles || []).find((x) => Number(x.id) === rid);
        if (r) openRoleModal(r);
        return;
      }

      // 2. Delete Role
      const delRoleBtn = e.target.closest('.js-delete-role');
      if (delRoleBtn) {
        const rid = Number(delRoleBtn.getAttribute('data-role-id'));
        const title = delRoleBtn.getAttribute('data-role-title') || 'this role';
        const assigned = Number(delRoleBtn.getAttribute('data-assigned') || 0);

        if (assigned > 0) {
          showToast(`Cannot delete "${title}": ${assigned} staff members are assigned to this role. Please reassign them first.`);
          return;
        }

        const { confirmed: confirmDelete } = await showConfirmModal({
          title: 'Delete Technical Role',
          message: `Are you sure you want to permanently delete technical role "${title}"?`,
          confirmText: 'Delete Role',
          tone: 'danger',
        });
        if (!confirmDelete) return;

        try {
          const res = await fetch('api.php?action=delete_role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: rid }),
          });
          const data = await res.json();
          if (data && data.ok) {
            if (Array.isArray(data.roles)) state.roles = data.roles;
            else state.roles = state.roles.filter((x) => Number(x.id) !== rid);
            renderRolesScreen();
            populateRoleDropdowns();
            showToast(data.message || `Role "${title}" deleted successfully.`);
          } else {
            showToast(data.error || 'Failed to delete role.');
          }
        } catch (err) {
          state.roles = state.roles.filter((x) => Number(x.id) !== rid);
          renderRolesScreen();
          populateRoleDropdowns();
          showToast(`Role "${title}" deleted (Offline mode).`);
        }
        return;
      }

      // 3. Filter Crew by Role pill
      const filterPill = e.target.closest('.js-filter-crew-by-role');
      if (filterPill) {
        const rKey = filterPill.getAttribute('data-role-key');
        switchUsersView('personnel');
        const searchInput = document.getElementById('users-search-input');
        if (searchInput) {
          searchInput.value = rKey;
          state.usersSearch = rKey;
          renderUsersScreen();
        }
        return;
      }

      // 4. Edit Department
      const editDeptBtn = e.target.closest('.js-edit-dept');
      if (editDeptBtn) {
        const did = Number(editDeptBtn.getAttribute('data-dept-id'));
        const d = (state.departments || []).find((x) => Number(x.id) === did);
        if (d) openDeptModal(d);
        return;
      }

      // 5. Delete Department
      const delDeptBtn = e.target.closest('.js-delete-dept');
      if (delDeptBtn) {
        const did = Number(delDeptBtn.getAttribute('data-dept-id'));
        const name = delDeptBtn.getAttribute('data-dept-name') || 'this department';
        const assigned = Number(delDeptBtn.getAttribute('data-assigned') || 0);

        if (assigned > 0) {
          showToast(`Cannot delete "${name}": ${assigned} staff member(s) are currently assigned. Reassign them first.`);
          return;
        }

        const { confirmed: confirmDelete } = await showConfirmModal({
          title: 'Delete Department',
          message: `Are you sure you want to permanently delete department "${name}"?`,
          confirmText: 'Delete Department',
          tone: 'danger',
        });
        if (!confirmDelete) return;

        try {
          const res = await fetch('api.php?action=delete_department', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: did }),
          });
          const data = await res.json();
          if (data && data.ok) {
            if (Array.isArray(data.departments)) state.departments = data.departments;
            else state.departments = state.departments.filter((x) => Number(x.id) !== did);
            renderDepartmentsScreen();
            populateRoleDropdowns();
            showToast(data.message || `Department "${name}" deleted successfully.`);
          } else {
            showToast(data.error || 'Failed to delete department.');
          }
        } catch (err) {
          state.departments = state.departments.filter((x) => Number(x.id) !== did);
          renderDepartmentsScreen();
          populateRoleDropdowns();
          showToast(`Department "${name}" deleted (Offline mode).`);
        }
        return;
      }

      // 6. Filter Crew by Dept pill
      const filterCrewDept = e.target.closest('.js-filter-crew-by-dept');
      if (filterCrewDept) {
        const deptName = filterCrewDept.getAttribute('data-dept-name');
        switchUsersView('personnel');
        const deptFilter = document.getElementById('filter-dept');
        if (deptFilter) {
          deptFilter.value = deptName;
          state.usersFilterDept = deptName;
        }
        state.usersPage = 1;
        renderUsersScreen();
        return;
      }

      // 7. Filter Roles by Dept pill
      const filterRolesDept = e.target.closest('.js-filter-roles-by-dept');
      if (filterRolesDept) {
        const deptName = filterRolesDept.getAttribute('data-dept-name');
        switchUsersView('roles');
        const rolesDeptFilter = document.getElementById('roles-filter-dept');
        if (rolesDeptFilter) {
          rolesDeptFilter.value = deptName;
          state.rolesFilterDept = deptName;
        }
        state.rolesPage = 1;
        renderRolesScreen();
        return;
      }
    });

    // Department search & filter listeners
    const deptsSearchInp = document.getElementById('depts-search-input');
    if (deptsSearchInp) {
      deptsSearchInp.addEventListener('input', (e) => {
        state.deptsSearch = e.target.value;
        state.deptsPage = 1;
        renderDepartmentsScreen();
      });
    }
    const deptsStatusSel = document.getElementById('depts-filter-status');
    if (deptsStatusSel) {
      deptsStatusSel.addEventListener('change', (e) => {
        state.deptsFilterStatus = e.target.value;
        state.deptsPage = 1;
        renderDepartmentsScreen();
      });
    }

    // Department CRUD Form Submit
    const deptForm = document.getElementById('dept-crud-form');
    if (deptForm) {
      deptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = Number(document.getElementById('dept-crud-id').value);
        const code = document.getElementById('dept-crud-code').value.trim().toUpperCase();
        const name = document.getElementById('dept-crud-name').value.trim();
        const description = document.getElementById('dept-crud-desc').value.trim();
        const is_active = document.getElementById('dept-crud-active').checked ? 1 : 0;
        const submitBtn = document.getElementById('dept-crud-submit-btn');

        if (!name || !code) {
          showToast('Please provide both department code and name.');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving Department...';
        }

        try {
          const res = await fetch('api.php?action=save_department', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, code, name, description, is_active }),
          });
          const data = await res.json();
          if (data && data.ok) {
            closeDeptModal();
            if (Array.isArray(data.departments)) {
              state.departments = data.departments;
            }
            renderDepartmentsScreen();
            populateRoleDropdowns();
            showToast(data.message || `Department "${name}" saved successfully.`);
          } else {
            showToast(data.error || 'Failed to save department.');
          }
        } catch (err) {
          showToast('Network error saving department.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Department';
          }
        }
      });
    }

    // =========================================================================
    // NAVIGATION MENU ENABLE/DISABLE & CRUD LISTENERS
    // =========================================================================
    const mainNavToggle = document.getElementById('nav-main-group-toggle');
    if (mainNavToggle) {
      mainNavToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked ? 1 : 0;
        try {
          const res = await fetch('api.php?action=toggle_main_nav', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group: 'main', enabled }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok && data.navigationConfig) {
            state.navigationConfig = data.navigationConfig;
            try { localStorage.setItem('ability_nav_config', JSON.stringify(state.navigationConfig)); } catch (err) {}
            renderMainNavigation();
            renderNavigationManagerScreen();
            showToast(data.message || (enabled ? 'Main navigation enabled.' : 'Main navigation disabled.'));
          } else {
            e.target.checked = !enabled;
            showToast((data && data.error) || 'Failed to update main navigation visibility.');
          }
        } catch (err) {
          state.navigationConfig.main_nav_enabled = Boolean(enabled);
          renderMainNavigation();
          renderNavigationManagerScreen();
        }
      });
    }

    const workspaceNavToggle = document.getElementById('nav-workspace-group-toggle');
    if (workspaceNavToggle) {
      workspaceNavToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked ? 1 : 0;
        try {
          const res = await fetch('api.php?action=toggle_main_nav', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group: 'workspace', enabled }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok && data.navigationConfig) {
            state.navigationConfig = data.navigationConfig;
            try { localStorage.setItem('ability_nav_config', JSON.stringify(state.navigationConfig)); } catch (err) {}
            renderMainNavigation();
            renderNavigationManagerScreen();
            showToast(data.message || (enabled ? 'Checkpoint Controls enabled.' : 'Checkpoint Controls disabled.'));
          } else {
            e.target.checked = !enabled;
            showToast((data && data.error) || 'Failed to update Checkpoint Controls visibility.');
          }
        } catch (err) {
          state.navigationConfig.workspace_nav_enabled = Boolean(enabled);
          renderMainNavigation();
          renderNavigationManagerScreen();
        }
      });
    }

    const navResetDefaultsBtn = document.getElementById('nav-reset-defaults-btn');
    if (navResetDefaultsBtn) {
      navResetDefaultsBtn.addEventListener('click', async () => {
        const { confirmed } = await showConfirmModal({
          title: 'Restore Default Navigation & Controls',
          message: 'Restore the 8 default Main Navigation items and 5 Checkpoint Controls items, and re-enable both sidebar sections? Custom items will be removed.',
          confirmText: 'Restore Defaults',
          tone: 'warning',
        });
        if (!confirmed) return;
        try {
          const res = await fetch('api.php?action=reset_navigation_defaults', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (res.ok && data && data.ok && data.navigationConfig) {
            state.navigationConfig = data.navigationConfig;
            try { localStorage.setItem('ability_nav_config', JSON.stringify(state.navigationConfig)); } catch (err) {}
            renderMainNavigation();
            renderNavigationManagerScreen();
            showToast(data.message || 'Default navigation restored.');
          } else {
            showToast((data && data.error) || 'Failed to restore default navigation.');
          }
        } catch (err) {
          showToast('Network error restoring default navigation.');
        }
      });
    }

    document.querySelectorAll('.js-open-create-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => openNavItemModal(null));
    });
    document.querySelectorAll('.js-close-nav-crud-modal').forEach((btn) => {
      btn.addEventListener('click', () => closeNavItemModal());
    });
    const navCrudModalEl = document.getElementById('nav-item-crud-modal');
    if (navCrudModalEl) {
      navCrudModalEl.addEventListener('click', (e) => {
        if (e.target === navCrudModalEl) closeNavItemModal();
      });
    }

    const navSearchInp = document.getElementById('nav-search-input');
    if (navSearchInp) {
      navSearchInp.addEventListener('input', (e) => {
        state.navSearch = e.target.value;
        renderNavigationManagerScreen();
      });
    }
    const navFilterGroupSel = document.getElementById('nav-filter-group');
    if (navFilterGroupSel) {
      navFilterGroupSel.addEventListener('change', (e) => {
        state.navFilterGroup = e.target.value;
        renderNavigationManagerScreen();
      });
    }

    const navFilterSel = document.getElementById('nav-filter-status');
    if (navFilterSel) {
      navFilterSel.addEventListener('change', (e) => {
        state.navFilterStatus = e.target.value;
        renderNavigationManagerScreen();
      });
    }

    const navLabelInp = document.getElementById('nav-crud-label');
    const navKeyInp = document.getElementById('nav-crud-key');
    if (navLabelInp && navKeyInp) {
      navLabelInp.addEventListener('input', () => {
        const idVal = Number(document.getElementById('nav-crud-id')?.value || 0);
        if (idVal === 0) {
          navKeyInp.value = navLabelInp.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        }
      });
    }

    const navTargetSel = document.getElementById('nav-crud-target');
    const navCustomUrlWrap = document.getElementById('nav-crud-custom-url-wrap');
    if (navTargetSel && navCustomUrlWrap) {
      navTargetSel.addEventListener('change', () => {
        navCustomUrlWrap.style.display = navTargetSel.value === 'custom' ? 'block' : 'none';
      });
    }

    const navBadgeTypeSel = document.getElementById('nav-crud-badge-type');
    const navBadgeTextWrap = document.getElementById('nav-crud-badge-text-wrap');
    if (navBadgeTypeSel && navBadgeTextWrap) {
      navBadgeTypeSel.addEventListener('change', () => {
        navBadgeTextWrap.style.display = navBadgeTypeSel.value === 'custom' ? 'block' : 'none';
      });
    }

    const navRolesAllCb = document.getElementById('nav-crud-roles-all');
    if (navRolesAllCb) {
      navRolesAllCb.addEventListener('change', () => {
        const isAll = navRolesAllCb.checked;
        document.querySelectorAll('#nav-crud-roles-list .js-nav-role-cb').forEach((cb) => {
          cb.disabled = isAll;
          if (isAll) cb.checked = true;
        });
      });
    }

    const navCrudForm = document.getElementById('nav-item-crud-form');
    if (navCrudForm) {
      navCrudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = Number(document.getElementById('nav-crud-id').value || 0);
        const nav_group = document.getElementById('nav-crud-group')?.value || 'main';
        const label = document.getElementById('nav-crud-label').value.trim();
        const nav_key = document.getElementById('nav-crud-key').value.trim();
        const sort_order = Number(document.getElementById('nav-crud-order').value || 10);
        const targetSel = document.getElementById('nav-crud-target').value;
        const customUrl = document.getElementById('nav-crud-custom-url').value.trim();
        const nav_target = targetSel === 'custom' ? (customUrl || 'overview') : targetSel;
        const icon = document.getElementById('nav-crud-icon').value;
        const activeIconMap = {
          'assets/nav-overview-inactive.svg': 'assets/nav-overview-active.svg',
          'assets/nav-events-inactive.svg': 'assets/nav-events-active.svg',
          'assets/nav-attendees-inactive.svg': 'assets/nav-attendees-active.svg',
        };
        const active_icon = activeIconMap[icon] || '';
        const badge_type = document.getElementById('nav-crud-badge-type').value;
        const badge_text = document.getElementById('nav-crud-badge-text').value.trim();
        const is_enabled = document.getElementById('nav-crud-enabled').checked ? 1 : 0;
        const allRoles = document.getElementById('nav-crud-roles-all').checked;

        let allowed_roles = 'all';
        if (!allRoles) {
          const picked = Array.from(document.querySelectorAll('#nav-crud-roles-list .js-nav-role-cb:checked')).map((cb) => cb.value);
          allowed_roles = picked.length > 0 ? picked.join(',') : 'admin,administrator';
        }

        const submitBtn = document.getElementById('nav-crud-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';
        }

        try {
          const res = await fetch('api.php?action=save_nav_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              nav_group,
              label,
              nav_key,
              nav_target,
              icon,
              active_icon,
              badge_type,
              badge_text,
              allowed_roles,
              sort_order,
              is_enabled,
            }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok && data.navigationConfig) {
            closeNavItemModal();
            state.navigationConfig = data.navigationConfig;
            try { localStorage.setItem('ability_nav_config', JSON.stringify(state.navigationConfig)); } catch (err) {}
            renderMainNavigation();
            renderNavigationManagerScreen();
            showToast(data.message || `Saved navigation item "${label}".`);
          } else {
            showToast((data && data.error) || 'Failed to save navigation item.');
          }
        } catch (err) {
          showToast('Network error saving navigation item.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Nav Item';
          }
        }
      });
    }

    const navTableRows = document.getElementById('navigation-table-rows');
    if (navTableRows) {
      navTableRows.addEventListener('change', async (e) => {
        const toggleCb = e.target.closest('.js-toggle-nav-item');
        if (!toggleCb) return;
        const id = Number(toggleCb.getAttribute('data-nav-id') || 0);
        const is_enabled = toggleCb.checked ? 1 : 0;
        try {
          const res = await fetch('api.php?action=toggle_nav_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, is_enabled }),
          });
          const data = await res.json();
          if (res.ok && data && data.ok && data.navigationConfig) {
            state.navigationConfig = data.navigationConfig;
            try { localStorage.setItem('ability_nav_config', JSON.stringify(state.navigationConfig)); } catch (err) {}
            renderMainNavigation();
            renderNavigationManagerScreen();
            showToast(data.message || (is_enabled ? 'Navigation item enabled.' : 'Navigation item disabled.'));
          } else {
            toggleCb.checked = !is_enabled;
            showToast((data && data.error) || 'Failed to toggle navigation item.');
          }
        } catch (err) {
          toggleCb.checked = !is_enabled;
          showToast('Network error updating navigation item.');
        }
      });

      navTableRows.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.js-edit-nav-item');
        if (editBtn) {
          const nid = Number(editBtn.getAttribute('data-nav-id') || 0);
          const item = (state.navigationConfig?.items || []).find((x) => Number(x.id) === nid);
          if (item) openNavItemModal(item);
          return;
        }

        const delBtn = e.target.closest('.js-delete-nav-item');
        if (delBtn) {
          const nid = Number(delBtn.getAttribute('data-nav-id') || 0);
          const label = delBtn.getAttribute('data-nav-label') || 'this item';
          const { confirmed } = await showConfirmModal({
            title: 'Delete Navigation Item',
            message: `Are you sure you want to delete "${label}" from the Main Navigation bar?\nYou can always re-create it or use Restore Defaults later.`,
            confirmText: 'Delete Item',
            tone: 'danger',
          });
          if (!confirmed) return;

          try {
            const res = await fetch('api.php?action=delete_nav_item', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: nid }),
            });
            const data = await res.json();
            if (res.ok && data && data.ok && data.navigationConfig) {
              state.navigationConfig = data.navigationConfig;
              try { localStorage.setItem('ability_nav_config', JSON.stringify(state.navigationConfig)); } catch (err) {}
              renderMainNavigation();
              renderNavigationManagerScreen();
              showToast(data.message || `Deleted "${label}".`);
            } else {
              showToast((data && data.error) || 'Failed to delete navigation item.');
            }
          } catch (err) {
            showToast('Network error deleting navigation item.');
          }
        }
      });
    }

    // Submit Call Time Form
    const callTimeForm = document.getElementById('call-time-form');
    if (callTimeForm) {
      callTimeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cpType = document.getElementById('call-time-cp-type').value;
        const cpId = document.getElementById('call-time-cp-id').value;
        const callTime = document.getElementById('call-time-input').value;
        await updateCheckpointCallTime({ cpType, cpId, callTime });
      });
    }

    // Set Call Time Dedicated Page Listeners
    const pageCtSelectEl = document.getElementById('page-ct-cp-select');
    if (pageCtSelectEl) {
      pageCtSelectEl.addEventListener('change', () => {
        const [selType, selId] = (pageCtSelectEl.value || '').split(':');
        const found = (state.checkpoints.directory || []).find((c) => c.type === selType && String(c.id) === String(selId));
        if (found) {
          const typeInp = document.getElementById('page-ct-cp-type');
          const idInp = document.getElementById('page-ct-cp-id');
          const timeInp = document.getElementById('page-ct-input');
          const nameEl = document.getElementById('page-ct-target-name');
          const badgeEl = document.getElementById('page-ct-target-type');
          if (typeInp) typeInp.value = found.type;
          if (idInp) idInp.value = found.id;
          if (timeInp) timeInp.value = found.call_time || '08:00';
          if (nameEl) nameEl.textContent = found.name;
          if (badgeEl) {
            const isStock = found.type === 'stock_warehouse';
            badgeEl.textContent = isStock ? 'Stock Warehouse' : 'Event Venue';
            badgeEl.className = `status-badge ${isStock ? 'status-badge-green-sm' : 'status-badge-purple-sm'}`;
          }
        }
      });
    }
    document.querySelectorAll('.js-page-calltime-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-time');
        const inp = document.getElementById('page-ct-input');
        if (inp && t) inp.value = t;
      });
    });
    document.querySelectorAll('.js-page-extend-calltime').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!canCurrentUserSetCallTime()) {
          showToast('Access Restricted: Setting Call Times requires Tech Lead, Stock Manager, or Administrator privileges.');
          return;
        }
        const mins = parseInt(btn.getAttribute('data-mins'), 10) || 15;
        const cpType = document.getElementById('page-ct-cp-type')?.value || state.checkpointType;
        const cpId = document.getElementById('page-ct-cp-id')?.value || state.checkpointId;
        updateCheckpointCallTime({ cpType, cpId, extendMinutes: mins });
      });
    });
    const pageCtResetBtn = document.getElementById('page-ct-reset-default-btn');
    if (pageCtResetBtn) {
      pageCtResetBtn.addEventListener('click', () => {
        if (!canCurrentUserSetCallTime()) {
          showToast('Access Restricted: Setting Call Times requires Tech Lead, Stock Manager, or Administrator privileges.');
          return;
        }
        const cpType = document.getElementById('page-ct-cp-type')?.value || state.checkpointType;
        const cpId = document.getElementById('page-ct-cp-id')?.value || state.checkpointId;
        updateCheckpointCallTime({ cpType, cpId, resetToDefault: true });
      });
    }
    const pageCallTimeForm = document.getElementById('page-call-time-form');
    if (pageCallTimeForm) {
      pageCallTimeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!canCurrentUserSetCallTime()) {
          showToast('Access Restricted: Setting Call Times requires Tech Lead, Stock Manager, or Administrator privileges.');
          return;
        }
        const cpType = document.getElementById('page-ct-cp-type')?.value || state.checkpointType;
        const cpId = document.getElementById('page-ct-cp-id')?.value || state.checkpointId;
        const callTime = document.getElementById('page-ct-input')?.value || '08:00';
        await updateCheckpointCallTime({ cpType, cpId, callTime });
      });
    }
    const pageCtRowsEl = document.getElementById('page-calltime-schedule-rows');
    if (pageCtRowsEl) {
      pageCtRowsEl.addEventListener('click', (e) => {
        const loadBtn = e.target.closest('.js-page-ct-load');
        if (loadBtn && pageCtSelectEl) {
          const cpKey = loadBtn.getAttribute('data-cp-key');
          if (cpKey) {
            pageCtSelectEl.value = cpKey;
            pageCtSelectEl.dispatchEvent(new Event('change'));
          }
          return;
        }
        const extBtn = e.target.closest('.js-page-ct-row-extend');
        if (extBtn) {
          if (!canCurrentUserSetCallTime()) {
            showToast('Access Restricted: Setting Call Times requires Tech Lead, Stock Manager, or Administrator privileges.');
            return;
          }
          const cpType = extBtn.getAttribute('data-cp-type');
          const cpId = extBtn.getAttribute('data-cp-id');
          const mins = parseInt(extBtn.getAttribute('data-mins'), 10) || 15;
          updateCheckpointCallTime({ cpType, cpId, extendMinutes: mins });
        }
      });
    }

    // Submit Event Crew Assignment Form
    const eventAssignForm = document.getElementById('event-assign-form');
    if (eventAssignForm) {
      eventAssignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const eventId = document.getElementById('event-assign-id').value;
        const callTime = document.getElementById('event-assign-calltime').value;
        const techLead = document.getElementById('event-assign-techlead').value;
        const pm = document.getElementById('event-assign-pm').value;

        const checkedTechs = Array.from(document.querySelectorAll('#event-assign-crew-list .js-assign-tech-check:checked'))
          .map((cb) => Number(cb.value));

        try {
          const res = await fetch('api.php?action=save_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              event_id: eventId,
              call_time: callTime,
              tech_lead: techLead,
              project_manager: pm,
              assigned_technicians: JSON.stringify(checkedTechs),
            }),
          });
          const data = await res.json();
          if (data && data.ok) {
            closeEventAssignModal();
            applyBootstrapPayload(data, true);
            showToast(data.message || `Event roster updated: ${checkedTechs.length} technicians assigned.`);
          } else {
            showToast(data.error || 'Failed to save event roster.');
          }
        } catch (err) {
          showToast('Network error saving event roster.');
        }
      });
    }

    document.querySelectorAll('.js-close-event-assign-modal').forEach((btn) => {
      btn.addEventListener('click', closeEventAssignModal);
    });

    const selectAllTechsBtn = document.querySelector('.js-event-select-all-techs');
    if (selectAllTechsBtn) {
      selectAllTechsBtn.addEventListener('click', () => {
        document.querySelectorAll('#event-assign-crew-list .js-assign-tech-check').forEach((cb) => {
          cb.checked = true;
        });
        const countBadge = document.getElementById('event-assign-count-badge');
        const total = document.querySelectorAll('#event-assign-crew-list .js-assign-tech-check:checked').length;
        if (countBadge) countBadge.textContent = `${total} Assigned`;
      });
    }

    const clearCrewBtn = document.querySelector('.js-event-clear-crew');
    if (clearCrewBtn) {
      clearCrewBtn.addEventListener('click', () => {
        document.querySelectorAll('#event-assign-crew-list .js-assign-tech-check').forEach((cb) => {
          cb.checked = false;
        });
        const countBadge = document.getElementById('event-assign-count-badge');
        if (countBadge) countBadge.textContent = '0 Assigned';
      });
    }
    async function executeResetTodayScans(confirmPassword) {
      try {
        const res = await fetch('api.php?action=reset_today_scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkpoint_type: state.checkpointType,
            checkpoint_id: state.checkpointId,
            confirm_password: confirmPassword,
          })
        });
        const data = await res.json();
        if (data && data.ok) {
          state.activityTimeline = [];
          state.timelinePage = 1;
          applyBootstrapPayload(data, false);
          renderAll();
          playKioskChime('approve');
          showToast("User Activity Timeline logs and gate scans have been completely reset.");
          return { ok: true };
        }
        return { ok: false, error: (data && data.error) || 'Server error' };
      } catch (err) {
        console.error('Reset logs error:', err);
        return { ok: false, error: err.message };
      }
    }

    const resetLogsHandler = async () => {
      if (!isCurrentUserAdmin()) {
        showToast('Permission Denied: Only System Administrators can reset attendance logs.');
        return;
      }
      const { confirmed, password: confirmPassword } = await showConfirmModal({
        title: 'Reset User Activity Timeline',
        message: 'Are you sure you want to reset the User Activity Timeline and gate scans?\nAll activity logs will be cleared and crew set to Not Checked In (0 on-site).',
        confirmText: 'Reset All Logs',
        tone: 'danger',
        requirePassword: true,
        passwordLabel: 'Administrator Password',
        passwordPlaceholder: 'Enter your Admin password to confirm...',
      });
      if (!confirmed) {
        return;
      }
      const result = await executeResetTodayScans(confirmPassword);
      if (!result.ok) {
        showToast('Failed to reset logs: ' + result.error);
      }
    };

    const pageResetScansForm = document.getElementById('page-reset-scans-form');
    if (pageResetScansForm) {
      pageResetScansForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isCurrentUserAdmin()) {
          showToast('Permission Denied: Only System Administrators can reset attendance logs.');
          return;
        }
        const pwdInp = document.getElementById('page-reset-password-input');
        const errEl = document.getElementById('page-reset-scans-error');
        const btn = document.getElementById('page-reset-scans-submit-btn');
        const password = pwdInp ? pwdInp.value : '';
        if (errEl) {
          errEl.style.display = 'none';
          errEl.textContent = '';
        }
        if (btn) btn.disabled = true;
        const result = await executeResetTodayScans(password);
        if (btn) btn.disabled = false;
        if (result.ok) {
          pageResetScansForm.reset();
        } else if (errEl) {
          errEl.textContent = result.error || 'Failed to reset today’s scans.';
          errEl.style.display = 'block';
        }
      });
    }

    triggerResetTodayScans = resetLogsHandler;

    ['reset-demo-db-btn', 'users-matrix-reset-logs-btn', 'timeline-clear-btn'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', resetLogsHandler);
      }
    });

    document.querySelectorAll('.js-reset-activity-logs').forEach((btn) => {
      btn.addEventListener('click', resetLogsHandler);
    });

    // -----------------------------------------------------------------------
    // DAILY CHECK-IN / CHECK-OUT MANAGEMENT EXPORT
    // -----------------------------------------------------------------------

    function formatOnSiteDuration(inStr, outStr) {
      if (!inStr || inStr === 'N/A') return 'Not Arrived';
      const parseTime = (str) => {
        if (!str) return null;
        const m = String(str).match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
        if (!m) return null;
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const meridiem = m[4] ? m[4].toUpperCase() : null;
        if (meridiem === 'PM' && h < 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        return h * 60 + min;
      };
      const inMins = parseTime(inStr);
      if (inMins === null) return 'N/A';
      if (!outStr || outStr === 'N/A') return 'Currently On-Site';
      const outMins = parseTime(outStr);
      if (outMins === null) return 'Currently On-Site';
      let diff = outMins - inMins;
      if (diff < 0) diff += 24 * 60; // crossed midnight
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      return `${hrs}h ${mins}m`;
    }

    function exportDailyAttendanceReport() {
      let targetList = [];
      const isOverviewFiltered = state.overviewTab !== 'all' || (state.overviewSearch && state.overviewSearch.trim());
      const isDirFiltered = state.directoryTab !== 'all' || (state.directorySearch && state.directorySearch.trim());

      if (state.activeScreen === 'overview' && isOverviewFiltered) {
        targetList = filterCrewList(state.overviewTab, state.overviewSearch);
      } else if (state.activeScreen === 'attendees' && isDirFiltered) {
        targetList = filterCrewList(state.directoryTab, state.directorySearch);
      } else {
        targetList = state.crew || [];
      }

      if (!targetList || targetList.length === 0) {
        showToast('No crew records available to export');
        return;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const venueName = (state.activeCheckpoint && state.activeCheckpoint.name) || 'Main Gate / Venue';
      const callTime = (state.activeCheckpoint && state.activeCheckpoint.call_time) || '08:00';

      const headers = [
        'Report Date',
        'Badge ID',
        'Staff Code',
        'Crew / Technician Name',
        'Role',
        'Department',
        'Clearance Tier',
        'Facility Type',
        'Recorded Checkpoint / Location',
        'Scheduled Call Time',
        'Gate Attendance Status',
        'Check-In Time',
        'Check-Out Time',
        'Punctuality Status',
        'Duration On-Site',
        'Attendance Mode',
        'Operational Notes'
      ];

      const rows = targetList.map((c) => {
        const stateDisplay = c.daily_state === 'checked_in'
          ? 'Checked In (On-Site)'
          : (c.daily_state === 'checked_out' ? 'Checked Out' : 'Not Arrived');
        const punctuality = c.punctuality || (c.punctuality_code ? c.punctuality_code.toUpperCase().replace('_', ' ') : 'ON TIME');
        const duration = formatOnSiteDuration(c.check_in_time, c.check_out_time);
        const facType = c.last_checkpoint_type === 'stock_warehouse'
          ? 'Facility Gate'
          : (c.last_checkpoint_type === 'event_venue' ? 'Event Venue' : ((state.activeCheckpoint && state.activeCheckpoint.type === 'stock_warehouse') ? 'Facility Gate' : 'Event Venue'));
        const recordedLocation = c.last_checkpoint_name || venueName;
        const isTransitTransfer = Boolean(
          c.is_transit_transfer ||
          (c.daily_state === 'checked_in' && c.last_checkpoint_id && state.activeCheckpoint && Number(c.last_checkpoint_id) !== Number(state.activeCheckpoint.id))
        );
        const attendanceMode = isTransitTransfer
          ? 'Inter-Facility Transit Transfer'
          : 'Single Location (Direct)';
        const notes = c.checkpoint_auth_reason || (isTransitTransfer ? 'Transferred between facilities' : `Direct shift at ${recordedLocation}`);

        return [
          todayStr,
          `"${c.badge_code || ''}"`,
          `"${c.staff_code || c.username || ''}"`,
          `"${(c.full_name || '').replace(/"/g, '""')}"`,
          `"${(c.role_display || c.role || '').replace(/"/g, '""')}"`,
          `"${(c.department || '').replace(/"/g, '""')}"`,
          `"${c.clearance_code || ''} - ${(c.clearance_short || '').replace(/"/g, '""')}"`,
          `"${facType}"`,
          `"${recordedLocation.replace(/"/g, '""')}"`,
          `"${callTime}"`,
          `"${stateDisplay}"`,
          `"${c.check_in_time || 'N/A'}"`,
          `"${c.check_out_time || 'N/A'}"`,
          `"${punctuality}"`,
          `"${duration}"`,
          `"${attendanceMode}"`,
          `"${notes.replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ability_Daily_Attendance_Report_${todayStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported Daily Attendance Report (${targetList.length} records) for Management`);
    }

    function exportAuditLogsReport() {
      const logs = state.activityTimeline || [];
      if (!logs || logs.length === 0) {
        showToast('No gate activity logs available to export');
        return;
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      const headers = [
        'Log ID',
        'Date & Time',
        'Badge ID',
        'Staff Code',
        'Crew / Technician Name',
        'Role',
        'Department',
        'Clearance Tier',
        'Facility Type',
        'Checkpoint / Location',
        'Gate Scan Action',
        'Access Status',
        'Transit Event',
        'Punctuality Status',
        'Operational Notes'
      ];
      const rows = logs.map((l) => {
        const facType = l.checkpoint_type === 'stock_warehouse' ? 'Stock Warehouse' : 'Event Venue';
        const isTransit = Boolean(l.is_transit);
        return [
          l.id || '',
          `"${l.formatted_time || ''}"`,
          `"${l.badge_code || ''}"`,
          `"${l.staff_code || ''}"`,
          `"${(l.full_name || '').replace(/"/g, '""')}"`,
          `"${(l.role_display || '').replace(/"/g, '""')}"`,
          `"${(l.department || '').replace(/"/g, '""')}"`,
          `"${l.clearance_code || ''}"`,
          `"${facType}"`,
          `"${(l.checkpoint_name || '').replace(/"/g, '""')}"`,
          `"${String(l.scan_action || 'check_in').toUpperCase()}"`,
          `"${String(l.access_status || 'granted').toUpperCase()}"`,
          `"${isTransit ? 'YES (Cross-Facility Transfer)' : 'NO (Single Location)'}"`,
          `"${String(l.punctuality_status || 'on_time').toUpperCase()}"`,
          `"${(l.notes || l.action_title || '').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ability_Gate_Audit_Logs_${todayStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported Gate Audit Logs (${logs.length} events) for Audit`);
    }

    // Export CSV Handlers
    document.querySelectorAll('.js-export-attendees').forEach((btn) => {
      btn.addEventListener('click', () => exportDailyAttendanceReport());
    });
    document.querySelectorAll('.js-export-audit-logs').forEach((btn) => {
      btn.addEventListener('click', () => exportAuditLogsReport());
    });

    // -----------------------------------------------------------------------
    // STOCKS & WAREHOUSES MANAGER EVENT BINDINGS
    // -----------------------------------------------------------------------

    // Segmented tabs toggle
    document.querySelectorAll('.js-sm-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-target-tab');
        if (tab) {
          state.stockManager.activeTab = tab;
          renderStockManager();
        }
      });
    });

    // Search and filter listeners
    const whSearch = document.getElementById('sm-wh-search-input');
    if (whSearch) {
      whSearch.addEventListener('input', (e) => {
        state.stockManager.whSearch = e.target.value;
        state.stockManager.whPage = 1;
        renderWarehousesGrid();
      });
    }

    const smEvSearch = document.getElementById('sm-ev-search-input');
    if (smEvSearch) {
      smEvSearch.addEventListener('input', (e) => {
        state.stockManager.evSearch = e.target.value;
        state.stockManager.evPage = 1;
        renderStockManagerEventsGrid();
      });
    }

    document.querySelectorAll('.js-trigger-add-ev').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!canCurrentUserAssignEvents()) {
          showToast('Permission Denied: Creating Event Venues requires Tech Lead, PM, or Administrator privileges.');
          return;
        }
        openVenueCrudModal(null);
      });
    });

    // Modal open buttons
    const addWhBtn = document.getElementById('open-add-warehouse-btn');
    if (addWhBtn) addWhBtn.addEventListener('click', () => openWarehouseModal());

    // Modal close buttons
    const closeWhBtn = document.getElementById('close-wh-modal');
    if (closeWhBtn) {
      closeWhBtn.addEventListener('click', () => {
        document.getElementById('warehouse-crud-modal')?.classList.remove('open');
      });
    }

    const cancelDelBtn = document.getElementById('cancel-delete-btn');
    if (cancelDelBtn) {
      cancelDelBtn.addEventListener('click', () => {
        document.getElementById('confirm-delete-modal')?.classList.remove('open');
      });
    }

    // Initialize dropzones
    setupDropzoneEvents('wh');
    setupDropzoneEvents('user');
    setupDropzoneEvents('venue');
    setupDropzoneEvents('ce');

    // User Management Modal Triggers & Controls
    const openAddUserBtn = document.getElementById('open-add-user-btn');
    if (openAddUserBtn) {
      openAddUserBtn.addEventListener('click', () => openUserModal());
    }

    const closeUserModalBtn = document.getElementById('close-user-modal');
    if (closeUserModalBtn) {
      closeUserModalBtn.addEventListener('click', () => {
        document.getElementById('user-crud-modal')?.classList.remove('open');
      });
    }

    const userSearchInput = document.getElementById('users-search-input');
    if (userSearchInput) {
      userSearchInput.addEventListener('input', (e) => {
        state.usersSearch = e.target.value;
        state.usersPage = 1;
        renderUsersScreen();
      });
    }

    const userDeptFilter = document.getElementById('users-filter-dept');
    if (userDeptFilter) {
      userDeptFilter.addEventListener('change', (e) => {
        state.usersFilterDept = e.target.value;
        state.usersPage = 1;
        renderUsersScreen();
      });
    }

    const userTierFilter = document.getElementById('users-filter-tier');
    if (userTierFilter) {
      userTierFilter.addEventListener('change', (e) => {
        state.usersFilterTier = e.target.value;
        state.usersPage = 1;
        renderUsersScreen();
      });
    }

    document.querySelectorAll('#users-status-tabs .status-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#users-status-tabs .status-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.usersTab = tab.getAttribute('data-tab') || 'all';
        state.usersPage = 1;
        renderUsersScreen();
      });
    });

    const userExportBtn = document.getElementById('users-export-btn');
    if (userExportBtn) {
      userExportBtn.addEventListener('click', () => exportUsersCsv());
    }

    // Safety guard on Clearance select in modal
    const userClrSelect = document.getElementById('user-modal-clearance');
    if (userClrSelect) {
      userClrSelect.addEventListener('change', () => {
        if (!isCurrentUserAdmin()) {
          const val = userClrSelect.value.toUpperCase();
          if (!val.startsWith('L1') && !val.startsWith('L2')) {
            showToast('Permission restricted: Delegated operators may only assign Level 1 or Level 2 clearance.', 'error');
            userClrSelect.value = 'L2_TECH_STAGE';
          }
        }
      });
    }

    // User CRUD Form Submit
    const userForm = document.getElementById('user-crud-form');
    if (userForm) {
      userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-user-btn');
        if (saveBtn) saveBtn.disabled = true;

        const fd = new FormData();
        const uidVal = Number(document.getElementById('user-modal-id').value || 0);
        const passVal = document.getElementById('user-modal-password')?.value.trim() || '';
        if (uidVal <= 0 && passVal.length < 6) {
          showToast('Please set an initial password (minimum 6 characters).');
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        fd.append('id', uidVal);
        fd.append('full_name', document.getElementById('user-modal-fullname').value);
        fd.append('username', document.getElementById('user-modal-username').value);
        if (passVal !== '') fd.append('password', passVal);
        fd.append('role', document.getElementById('user-modal-role').value);
        fd.append('department', document.getElementById('user-modal-dept').value);
        fd.append('phone', document.getElementById('user-modal-phone').value);
        fd.append('email', document.getElementById('user-modal-email').value);
        fd.append('clearance_level', document.getElementById('user-modal-clearance').value);
        fd.append('stock_access_mode', document.getElementById('user-modal-stock-access').value);
        fd.append('venue_access_mode', document.getElementById('user-modal-venue-access').value);
        fd.append('badge_code', document.getElementById('user-modal-badge-code').value);
        fd.append('rfid_uid', document.getElementById('user-modal-rfid-uid').value);
        fd.append('badge_status', document.getElementById('user-modal-badge-status').value);
        fd.append('is_active', document.getElementById('user-modal-active').checked ? 1 : 0);

        const assignedCpVal = document.getElementById('user-modal-assigned-cp')?.value || '';
        if (assignedCpVal && assignedCpVal.includes(':')) {
          const [acpType, acpId] = assignedCpVal.split(':');
          fd.append('assigned_checkpoint_type', acpType);
          fd.append('assigned_checkpoint_id', acpId);
        } else {
          fd.append('assigned_checkpoint_type', '');
          fd.append('assigned_checkpoint_id', '');
        }

        const fileInput = document.getElementById('user-modal-image');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fd.append('profile_image', fileInput.files[0]);
        }

        try {
          const res = await fetch('api.php?action=save_user', {
            method: 'POST',
            body: fd,
          });
          const data = await res.json();
          if (data && data.ok) {
            showToast(data.message || 'Personnel profile & permissions saved');
            document.getElementById('user-crud-modal')?.classList.remove('open');
            await fetchBootstrap(false);
            renderUsersScreen();
          } else {
            showToast(data.error || 'Failed to save personnel record');
          }
        } catch (err) {
          showToast('Error communicating with server');
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    // Warehouse CRUD Form Submit
    const whForm = document.getElementById('warehouse-crud-form');
    if (whForm) {
      whForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-wh-btn');
        if (saveBtn) saveBtn.disabled = true;

        const fd = new FormData();
        fd.append('id', document.getElementById('wh-modal-id').value);
        fd.append('name', document.getElementById('wh-modal-name').value);
        fd.append('code', document.getElementById('wh-modal-code').value);
        fd.append('is_active', document.getElementById('wh-modal-status').value);
        fd.append('location', document.getElementById('wh-modal-location').value);
        fd.append('open_time', document.getElementById('wh-modal-opentime').value);
        fd.append('close_time', document.getElementById('wh-modal-closetime').value);
        fd.append('controller_name', document.getElementById('wh-modal-controller').value);
        fd.append('controller_phone', document.getElementById('wh-modal-phone').value);
        fd.append('terminal_pin', (document.getElementById('wh-modal-pin')?.value || '').trim());
        fd.append('geofence_radius_m', document.getElementById('wh-modal-radius')?.value || '200');
        fd.append('lat', document.getElementById('wh-modal-lat')?.value || '');
        fd.append('lng', document.getElementById('wh-modal-lng')?.value || '');

        const fileInput = document.getElementById('wh-modal-image');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fd.append('image', fileInput.files[0]);
        }

        try {
          const res = await fetch('api.php?action=save_warehouse', {
            method: 'POST',
            body: fd,
          });
          const data = await res.json();
          if (data && data.ok) {
            showToast(data.message || 'Warehouse saved successfully');
            document.getElementById('warehouse-crud-modal')?.classList.remove('open');
            await loadStockManagerData();
            await fetchBootstrap(false);
          } else {
            showToast(data.error || 'Failed to save warehouse');
          }
        } catch (err) {
          showToast('Error communicating with server');
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    // Delete Confirmation Button
    const confirmDelBtn = document.getElementById('confirm-delete-btn');
    if (confirmDelBtn) {
      confirmDelBtn.addEventListener('click', async () => {
        const type = document.getElementById('delete-target-type').value;
        const id = document.getElementById('delete-target-id').value;
        if (!id) return;

        let action = '';
        if (type === 'warehouse') action = 'delete_warehouse';
        else if (type === 'user') action = 'delete_user';
        else if (type === 'clearance_tier') action = 'delete_clearance_tier';
        if (!action) return;
        confirmDelBtn.disabled = true;

        try {
          const res = await fetch(`api.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Number(id) }),
          });
          const data = await res.json();
          if (data && data.ok) {
            showToast(data.message || 'Record deleted successfully');
            document.getElementById('confirm-delete-modal')?.classList.remove('open');
            if (type === 'clearance_tier') {
              if (Array.isArray(data.clearanceMatrix)) state.clearanceMatrix = data.clearanceMatrix;
              renderClearanceMatrixCards();
              await fetchBootstrap(false);
            } else if (type === 'user') {
              await fetchBootstrap(false);
              renderUsersScreen();
            } else {
              await loadStockManagerData();
              if (type === 'warehouse') await fetchBootstrap(false);
            }
          } else {
            showToast(data.error || 'Failed to delete record');
          }
        } catch (err) {
          showToast('Error communicating with server');
        } finally {
          confirmDelBtn.disabled = false;
        }
      });
    }

    // Support Center #pane-kiosk link
    const supLink = document.getElementById('support-center-link');
    if (supLink) {
      supLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchScreen('terminals', 'pane-kiosk');
      });
    }
  }

  // ==========================================================================
  // THEME MANAGEMENT (LIGHT & DARK MODE)
  // ==========================================================================

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem('ability_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return getSystemTheme();
  }

  function applyTheme(theme, animate = false, showFeedback = false) {
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

    updateThemeUI(theme);
    if (state.activeScreen === 'settings') {
      renderSettingsScreen();
    }

    if (showFeedback && currentTheme !== theme) {
      const isDark = theme === 'dark';
      showToast(isDark ? '🌙 Dark Mode activated' : '☀️ Light Mode activated');
    }
  }

  function toggleTheme(showFeedback = true) {
    const current = document.documentElement.getAttribute('data-theme') || getSavedTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true, showFeedback);
  }

  function updateThemeUI(theme) {
    const isDark = theme === 'dark';

    // Topbar Toggle Button tooltip & aria
    const topBtn = document.getElementById('topbar-theme-toggle-btn');
    if (topBtn) {
      topBtn.setAttribute('title', isDark ? 'Switch to Light Mode (Alt+T or Ctrl+Shift+D)' : 'Switch to Dark Mode (Alt+T or Ctrl+Shift+D)');
      topBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }

    // User Dropdown Theme item
    const userMenuTitle = document.getElementById('user-menu-theme-title');
    const userMenuSub = document.getElementById('user-menu-theme-sub');
    const userMenuIcon = document.getElementById('user-menu-theme-icon');
    if (userMenuTitle) {
      userMenuTitle.textContent = isDark ? 'Theme: Light Mode' : 'Theme: Dark Mode';
    }
    if (userMenuSub) {
      userMenuSub.textContent = isDark ? 'Switch to light interface' : 'Switch to dark interface';
    }
    if (userMenuIcon) {
      userMenuIcon.innerHTML = isDark
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
  }

  function initTheme() {
    const initialTheme = getSavedTheme();
    applyTheme(initialTheme, false, false);

    // Topbar Button Click
    const topBtn = document.getElementById('topbar-theme-toggle-btn');
    if (topBtn) {
      topBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme(true);
      });
    }

    // User Dropdown Menu Item Click
    const menuBtn = document.getElementById('topbar-menu-theme-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme(true);
        closeAllTopbarDropdowns();
      });
    }

    // Keyboard Shortcuts: Alt+T or Ctrl+Shift+D / Cmd+Shift+D
    window.addEventListener('keydown', (e) => {
      const isAltT = e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T');
      const isCtrlShiftD = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd');
      if (isAltT || isCtrlShiftD) {
        e.preventDefault();
        toggleTheme(true);
      }
    });

    // Cross-tab synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'ability_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        applyTheme(e.newValue, true, false);
      }
    });

    // OS preference change listener (if user has not set explicit preference)
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('ability_theme')) {
          applyTheme(e.matches ? 'dark' : 'light', true, false);
        }
      });
    }
  }

  function canCurrentUserApproveShiftRequests() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    return ['admin', 'manager', 'administrator', 'stock_manager'].includes(role);
  }

  function formatShiftReasonLabel(reason) {
    const map = {
      sick_leave: 'Sick Leave Relief',
      shift_swap: 'Shift Swap / Handover',
      high_volume: 'High Venue Workload',
      night_shift: 'Night Shift Coverage',
      new_assignment: 'New Terminal Assignment',
    };
    return map[String(reason || '').toLowerCase()] || 'Shift Relief';
  }

  function getShiftPoolUsers() {
    const allowedRoles = new Set(['stock_controller', 'stock_manager', 'tech_lead', 'support_staff', 'admin', 'administrator', 'manager']);
    return (state.crew || []).filter((c) => {
      const role = String(c.role || '').toLowerCase();
      return allowedRoles.has(role) && Number(c.is_active ?? 1) !== 0;
    });
  }

  function findCheckpointLeadMatch(cpType, cpId) {
    const whs = state.checkpoints.stock_warehouses || [];
    const evs = state.checkpoints.event_venues || [];
    const list = cpType === 'stock_warehouse' ? whs : evs;
    const cp = list.find((item) => String(item.id) === String(cpId));
    return cp ? String(cp.controller_name || cp.lead_name || '').trim().toLowerCase() : '';
  }

  function syncShiftControllersForCheckpoint(cpVal, repSelId = 'sr-replacement-select', outSelId = 'sr-outgoing-select') {
    const repSel = document.getElementById(repSelId);
    const outSel = document.getElementById(outSelId);
    if (!repSel || !outSel) return;

    const [cpType, cpId] = (cpVal || `${state.checkpointType}:${state.checkpointId}`).split(':');
    const pool = getShiftPoolUsers();
    const gateControllers = pool.filter((c) => String(c.role || '').toLowerCase() === 'stock_controller');
    const supervisors = pool.filter((c) => ['stock_manager', 'tech_lead', 'support_staff'].includes(String(c.role || '').toLowerCase()));
    const cpLeadName = findCheckpointLeadMatch(cpType, cpId);

    const isAssignedToTarget = (u) => {
      const matchDirect = String(u.assigned_checkpoint_type || '') === String(cpType) && String(u.assigned_checkpoint_id || '') === String(cpId);
      const matchLead = !u.assigned_checkpoint_id && cpLeadName !== '' && String(u.full_name || '').trim().toLowerCase() === cpLeadName;
      return matchDirect || matchLead;
    };

    const targetAssigned = pool.filter(isAssignedToTarget);
    const otherAssignedControllers = gateControllers.filter((c) => !isAssignedToTarget(c) && Boolean(c.assigned_checkpoint_id));
    const unassignedControllers = gateControllers.filter((c) => !isAssignedToTarget(c) && !c.assigned_checkpoint_id);
    const otherSupervisors = supervisors.filter((c) => !isAssignedToTarget(c));

    const formatUserOpt = (u, extraTag = '') => {
      const gateTag = u.assigned_checkpoint_name || (cpLeadName && isAssignedToTarget(u) ? (findCheckpointRecordName(cpType, cpId) || 'Assigned Gate') : 'Unassigned');
      const roleTag = String(u.role || '').toLowerCase() === 'stock_controller' ? '' : ` · ${u.role_display || u.role}`;
      const label = `${u.full_name} (${gateTag}${roleTag}${extraTag})`;
      return `<option value="${u.id}">${escapeHtml(label)}</option>`;
    };

    // Populate Outgoing Controller Select grouped by selected gate vs other facility gates
    const outParts = ['<option value="0">-- Auto-detect / Keep existing --</option>'];
    if (targetAssigned.length > 0) {
      outParts.push('<optgroup label="Assigned to Selected Gate / Venue">');
      targetAssigned.forEach((u) => outParts.push(formatUserOpt(u)));
      outParts.push('</optgroup>');
    }
    const otherOutPool = [...otherAssignedControllers, ...unassignedControllers, ...otherSupervisors];
    if (otherOutPool.length > 0) {
      outParts.push('<optgroup label="Controllers &amp; Leads at Other Facility Gates">');
      otherOutPool.forEach((u) => outParts.push(formatUserOpt(u)));
      outParts.push('</optgroup>');
    }
    outSel.innerHTML = outParts.join('');

    // Auto-select the user currently assigned to the chosen facility gate / venue
    const primaryOutgoing = targetAssigned.find((u) => String(u.role || '').toLowerCase() === 'stock_controller') || targetAssigned[0];
    outSel.value = primaryOutgoing ? String(primaryOutgoing.id) : '0';

    // Populate Incoming / Assigned Controller Select grouped by Facility Gate vs Relief Pool
    const repParts = [];
    const byGateMap = new Map();
    const gateHolders = [...otherAssignedControllers, ...targetAssigned.filter((u) => String(u.role || '').toLowerCase() === 'stock_controller')];
    gateHolders.forEach((u) => {
      const gName = u.assigned_checkpoint_name || 'Assigned Gate';
      if (!byGateMap.has(gName)) byGateMap.set(gName, []);
      byGateMap.get(gName).push(u);
    });
    byGateMap.forEach((usersInGate, gName) => {
      repParts.push(`<optgroup label="Facility Gate: ${escapeHtml(gName)}">`);
      usersInGate.forEach((u) => repParts.push(formatUserOpt(u)));
      repParts.push('</optgroup>');
    });
    if (unassignedControllers.length > 0) {
      repParts.push('<optgroup label="Available / Unassigned Gate Controllers">');
      unassignedControllers.forEach((u) => repParts.push(formatUserOpt(u)));
      repParts.push('</optgroup>');
    }
    if (supervisors.length > 0) {
      repParts.push('<optgroup label="Facility Managers, Technical Leads &amp; Support">');
      supervisors.forEach((u) => repParts.push(formatUserOpt(u)));
      repParts.push('</optgroup>');
    }
    repSel.innerHTML = repParts.length > 0 ? repParts.join('') : '<option value="">No eligible controllers or supervisors found</option>';

    if (isCurrentUserStockController() && state.currentUser?.id) {
      repSel.value = String(state.currentUser.id);
    } else {
      const outIdStr = outSel.value;
      const suggestedIncoming = [...unassignedControllers, ...otherAssignedControllers, ...supervisors].find((u) => String(u.id) !== outIdStr);
      if (suggestedIncoming) {
        repSel.value = String(suggestedIncoming.id);
      }
    }
  }

  function findCheckpointRecordName(cpType, cpId) {
    const list = cpType === 'stock_warehouse' ? (state.checkpoints.stock_warehouses || []) : (state.checkpoints.event_venues || []);
    const cp = list.find((item) => String(item.id) === String(cpId));
    return cp ? cp.name : '';
  }

  function renderShiftRequestModal() {
    const cpSel = document.getElementById('sr-checkpoint-select');
    const listEl = document.getElementById('shift-request-list');
    const pillEl = document.getElementById('sr-pending-summary-pill');

    if (cpSel) {
      cpSel.innerHTML = buildCheckpointSelectOptionsHtml(`${state.checkpointType}:${state.checkpointId}`);
    }

    syncShiftControllersForCheckpoint(cpSel ? cpSel.value : `${state.checkpointType}:${state.checkpointId}`);

    const reqs = state.shiftRequests || [];
    const pendingCount = reqs.filter((r) => r.status === 'pending').length;
    if (pillEl) {
      pillEl.textContent = `${pendingCount} Pending`;
    }

    if (!listEl) return;
    listEl.innerHTML = buildShiftRequestListHtml(reqs, canCurrentUserApproveShiftRequests());
  }

  function openShiftRequestModal() {
    const modal = document.getElementById('shift-request-modal');
    if (!modal) return;
    renderShiftRequestModal();
    modal.classList.add('open');
  }

  function closeShiftRequestModal() {
    const modal = document.getElementById('shift-request-modal');
    if (modal) modal.classList.remove('open');
  }

  function initShiftReliefControls() {
    const termBtn = document.getElementById('terminal-shift-relief-btn');
    if (termBtn) termBtn.addEventListener('click', openShiftRequestModal);

    const closeBtn = document.getElementById('close-shift-request-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeShiftRequestModal);

    const cancelBtn = document.getElementById('cancel-shift-request-modal');
    if (cancelBtn) cancelBtn.addEventListener('click', closeShiftRequestModal);

    const roleSelect = document.getElementById('user-modal-role');
    if (roleSelect) roleSelect.addEventListener('change', syncUserAssignedCpVisibility);

    const srCpSel = document.getElementById('sr-checkpoint-select');
    if (srCpSel) {
      srCpSel.addEventListener('change', () => {
        syncShiftControllersForCheckpoint(srCpSel.value, 'sr-replacement-select', 'sr-outgoing-select');
      });
    }

    const pageSrCpSel = document.getElementById('page-sr-checkpoint-select');
    if (pageSrCpSel) {
      pageSrCpSel.addEventListener('change', () => {
        syncShiftControllersForCheckpoint(pageSrCpSel.value, 'page-sr-replacement-select', 'page-sr-outgoing-select');
      });
    }

    const pageSrFilterSel = document.getElementById('page-sr-filter-status');
    if (pageSrFilterSel) {
      pageSrFilterSel.addEventListener('change', (e) => {
        state.srFilterStatus = e.target.value;
        renderShiftReliefPage();
      });
    }

    async function handleShiftRequestFormSubmit(formEl, ids) {
      const btn = document.getElementById(ids.submitBtn);
      if (btn) btn.disabled = true;
      const cpVal = document.getElementById(ids.cpSelect)?.value || '';
      const [cpType, cpId] = cpVal.includes(':') ? cpVal.split(':') : ['stock_warehouse', '1'];
      try {
        const res = await fetch('api.php?action=request_controller_shift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'request_controller_shift',
            checkpoint_type: cpType,
            checkpoint_id: cpId,
            replacement_controller_id: Number(document.getElementById(ids.repSelect)?.value || 0),
            outgoing_controller_id: Number(document.getElementById(ids.outSelect)?.value || 0),
            reason_type: document.getElementById(ids.reasonSelect)?.value || 'shift_swap',
            relief_mode: document.getElementById('page-sr-relief-mode')?.value || 'standard',
            shift_start: document.getElementById(ids.startInput)?.value || '',
            shift_end: document.getElementById(ids.endInput)?.value || '',
            notes: document.getElementById(ids.notesInput)?.value || '',
          }),
        });
        const data = await res.json();
        if (data && data.ok) {
          applyBootstrapPayload(data, true);
          renderAll();
          renderShiftRequestModal();
          formEl.reset();
          showToast(data.message || 'Shift relief request submitted.');
        } else {
          showToast(data.error || 'Failed to submit shift relief request.');
        }
      } catch (err) {
        showToast('Error communicating with server.');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    const srForm = document.getElementById('shift-request-form');
    if (srForm) {
      srForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleShiftRequestFormSubmit(srForm, {
          submitBtn: 'sr-submit-btn',
          cpSelect: 'sr-checkpoint-select',
          repSelect: 'sr-replacement-select',
          outSelect: 'sr-outgoing-select',
          reasonSelect: 'sr-reason-select',
          startInput: 'sr-shift-start',
          endInput: 'sr-shift-end',
          notesInput: 'sr-notes',
        });
      });
    }

    const pageSrForm = document.getElementById('page-shift-request-form');
    if (pageSrForm) {
      pageSrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleShiftRequestFormSubmit(pageSrForm, {
          submitBtn: 'page-sr-submit-btn',
          cpSelect: 'page-sr-checkpoint-select',
          repSelect: 'page-sr-replacement-select',
          outSelect: 'page-sr-outgoing-select',
          reasonSelect: 'page-sr-reason-select',
          startInput: 'page-sr-shift-start',
          endInput: 'page-sr-shift-end',
          notesInput: 'page-sr-notes',
        });
      });
    }

    async function handleShiftReviewListClick(e) {
      const revBtn = e.target.closest('.js-review-shift-btn');
      if (!revBtn) return;
      const reqId = Number(revBtn.getAttribute('data-req-id') || 0);
      const decision = revBtn.getAttribute('data-decision') || '';
      if (!reqId || !decision) return;
      revBtn.disabled = true;
      try {
        const res = await fetch('api.php?action=review_controller_shift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'review_controller_shift',
            request_id: reqId,
            decision: decision,
          }),
        });
        const data = await res.json();
        if (data && data.ok) {
          applyBootstrapPayload(data, true);
          renderAll();
          renderShiftRequestModal();
          showToast(data.message || `Request #${reqId} ${decision}.`);
        } else {
          showToast(data.error || 'Permission denied or review failed.');
        }
      } catch (err) {
        showToast('Error communicating with server.');
      } finally {
        revBtn.disabled = false;
      }
    }

    const listEl = document.getElementById('shift-request-list');
    if (listEl) listEl.addEventListener('click', handleShiftReviewListClick);

    const pageListEl = document.getElementById('page-shift-request-list');
    if (pageListEl) pageListEl.addEventListener('click', handleShiftReviewListClick);
  }

  async function fetchAttendanceReport(range = state.timelineRange || 'today') {
    state.timelineRange = range;
    if (range === 'today') {
      state.timelineReportRows = [];
      state.timelineReportSummary = null;
      state.timelineReportLabel = '';
      state.timelineReportLoading = false;
      state.timelinePage = 1;
      renderActivityTimeline();
      return;
    }

    state.timelineReportLoading = true;
    state.timelinePage = 1;
    renderActivityTimeline();

    try {
      const params = new URLSearchParams({ action: 'attendance_report', range });
      if (state.timelineDateFrom) params.set('date_from', state.timelineDateFrom);
      if (state.timelineDateTo) params.set('date_to', state.timelineDateTo);
      if (isCurrentUserStockController() && state.checkpointType && state.checkpointId) {
        params.set('checkpoint_type', state.checkpointType);
        params.set('checkpoint_id', String(state.checkpointId));
      }
      const res = await fetch(`api.php?${params.toString()}`);
      const data = await res.json();
      if (data && data.ok) {
        state.timelineReportRows = Array.isArray(data.rows) ? data.rows : [];
        state.timelineReportSummary = data.summary || null;
        state.timelineReportLabel = data.window_label || '';
      } else {
        showToast((data && data.error) || 'Failed to load attendance report.');
      }
    } catch (_) {
      showToast('Network error loading attendance report.');
    } finally {
      state.timelineReportLoading = false;
      renderActivityTimeline();
    }
  }

  async function exportShiftReportCsv() {
    let rows = [];
    const range = state.timelineRange || 'today';
    try {
      const params = new URLSearchParams({ action: 'attendance_report', range });
      if (state.timelineDateFrom) params.set('date_from', state.timelineDateFrom);
      if (state.timelineDateTo) params.set('date_to', state.timelineDateTo);
      if (isCurrentUserStockController() && state.checkpointType && state.checkpointId) {
        params.set('checkpoint_type', state.checkpointType);
        params.set('checkpoint_id', String(state.checkpointId));
      }
      const res = await fetch(`api.php?${params.toString()}`);
      const data = await res.json();
      rows = (data && data.ok && Array.isArray(data.rows)) ? data.rows : [];
    } catch (_) {
      rows = state.timelineRange === 'today' ? (state.activityTimeline || []) : (state.timelineReportRows || []);
    }

    if (!rows.length) {
      showToast('No attendance logs in the selected shift window to export.');
      return;
    }

    const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Scanned At', 'Staff Name', 'Badge Code', 'Role', 'Department', 'Checkpoint', 'Action', 'Access', 'Punctuality', 'Shift Duration', 'Night Shift', 'Notes'];
    const lines = [headers.map(csvEsc).join(',')];
    rows.forEach((r) => {
      lines.push([
        r.scanned_at || r.formatted_time || '',
        r.full_name || '',
        r.badge_code || '',
        r.role || r.role_display || '',
        r.department || '',
        r.checkpoint_name || '',
        r.scan_action || r.action_title || '',
        r.access_status || '',
        r.punctuality_status || '',
        r.duration_label || '—',
        r.is_night_shift ? 'Yes' : 'No',
        r.notes || '',
      ].map(csvEsc).join(','));
    });

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aBility_attendance_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} attendance record${rows.length === 1 ? '' : 's'} to CSV.`);
  }

  async function openClientShiftSignOffReport() {
    const range = state.timelineRange || 'today';
    let rows = [];
    let summary = null;
    let windowLabel = range === 'today' ? 'Today (Live Shift)' : range.toUpperCase();

    try {
      const params = new URLSearchParams({ action: 'attendance_report', range });
      if (state.timelineDateFrom) params.set('date_from', state.timelineDateFrom);
      if (state.timelineDateTo) params.set('date_to', state.timelineDateTo);
      if (isCurrentUserStockController() && state.checkpointType && state.checkpointId) {
        params.set('checkpoint_type', state.checkpointType);
        params.set('checkpoint_id', String(state.checkpointId));
      }
      const res = await fetch(`api.php?${params.toString()}`);
      const data = await res.json();
      if (data && data.ok) {
        rows = Array.isArray(data.rows) ? data.rows : [];
        summary = data.summary || null;
        if (data.window_label) windowLabel = data.window_label;
      }
    } catch (_) {
      rows = range === 'today' ? (state.activityTimeline || []) : (state.timelineReportRows || []);
    }

    if (!rows.length) {
      rows = range === 'today' ? (state.activityTimeline || []) : (state.timelineReportRows || []);
    }

    const totalScans = summary?.total_scans ?? rows.length;
    const checkIns = summary?.check_ins ?? rows.filter((r) => /in/i.test(String(r.scan_action || r.action_title || ''))).length;
    const checkOuts = summary?.check_outs ?? rows.filter((r) => /out/i.test(String(r.scan_action || r.action_title || ''))).length;
    const onTimeCount = summary?.on_time ?? rows.filter((r) => /on.?time|early/i.test(String(r.punctuality_status || ''))).length;
    const lateCount = summary?.late ?? rows.filter((r) => /late/i.test(String(r.punctuality_status || ''))).length;
    const deniedCount = summary?.denied ?? rows.filter((r) => /declin|denied/i.test(String(r.access_status || ''))).length;

    const generatedAt = new Date().toLocaleString();
    const generatedBy = state.currentUser?.full_name || 'Authorized Operator';
    const scopeName = state.activeCheckpoint?.name || 'All Kigali Sites & Venues';

    const rowHtml = rows.length
      ? rows.map((r, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(r.scanned_at || r.formatted_time || '—')}</td>
            <td><strong>${escapeHtml(r.full_name || 'Unknown')}</strong><br><span class="muted">${escapeHtml(r.badge_code || '')}</span></td>
            <td>${escapeHtml(r.role_display || r.role || '—')}</td>
            <td>${escapeHtml(r.checkpoint_name || '—')}</td>
            <td>${escapeHtml(r.scan_action || r.action_title || 'Scan')}</td>
            <td>${escapeHtml(r.access_status || '—')}</td>
            <td>${escapeHtml(r.punctuality_status || '—')}</td>
            <td>${escapeHtml(r.duration_label || '—')}</td>
            <td>${escapeHtml(r.notes || '')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="10" style="text-align:center; padding: 24px; color:#64748b;">No attendance scans recorded in the selected shift window.</td></tr>';

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>aBility Client Shift Sign-Off Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Marvel:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Marvel", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 28px; font-size: 12px; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #312e81; padding-bottom: 14px; margin-bottom: 18px; }
    .brand { font-size: 20px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.3px; }
    .sub { font-size: 11px; color: #475569; margin-top: 3px; }
    .meta { text-align: right; font-size: 11px; color: #334155; line-height: 1.5; }
    .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 18px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
    .kpi-v { font-size: 18px; font-weight: 800; color: #1e1b4b; }
    .kpi-l { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
    th { background: #1e1b4b; color: #ffffff; text-align: left; padding: 7px 8px; font-weight: 700; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .muted { color: #64748b; font-size: 10px; }
    .signoff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 26px; page-break-inside: avoid; }
    .sig-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; }
    .sig-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #334155; margin-bottom: 36px; }
    .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 11px; color: #475569; display: flex; justify-content: space-between; }
    @media print { body { margin: 14px; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <div class="brand">aBility Tech · Client Shift Sign-Off Report</div>
      <div class="sub">Kigali Crew Attendance, Gate Punctuality &amp; Field Compliance Audit</div>
    </div>
    <div class="meta">
      <div><strong>Window:</strong> ${escapeHtml(windowLabel)}</div>
      <div><strong>Site / Checkpoint:</strong> ${escapeHtml(scopeName)}</div>
      <div><strong>Generated:</strong> ${escapeHtml(generatedAt)} · ${escapeHtml(generatedBy)}</div>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-v">${escapeHtml(String(totalScans))}</div><div class="kpi-l">Total Scans</div></div>
    <div class="kpi"><div class="kpi-v">${escapeHtml(String(checkIns))}</div><div class="kpi-l">Check-Ins</div></div>
    <div class="kpi"><div class="kpi-v">${escapeHtml(String(checkOuts))}</div><div class="kpi-l">Check-Outs</div></div>
    <div class="kpi"><div class="kpi-v">${escapeHtml(String(onTimeCount))}</div><div class="kpi-l">On Time / Early</div></div>
    <div class="kpi"><div class="kpi-v">${escapeHtml(String(lateCount))}</div><div class="kpi-l">Late Arrivals</div></div>
    <div class="kpi"><div class="kpi-v">${escapeHtml(String(deniedCount))}</div><div class="kpi-l">Declined / Denied</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Timestamp</th><th>Crew / Badge</th><th>Role</th><th>Checkpoint</th><th>Action</th><th>Access</th><th>Punctuality</th><th>Duration</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${rowHtml}</tbody>
  </table>
  <div class="signoff-grid">
    <div class="sig-box">
      <div class="sig-title">Technical Lead / Production Verification</div>
      <div class="sig-line"><span>Name &amp; Signature</span><span>Date / Time</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Site Manager / Client Representative Sign-Off</div>
      <div class="sig-line"><span>Name &amp; Stamp</span><span>Date / Time</span></div>
    </div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=980,height=780');
    if (win) {
      win.document.open();
      win.document.write(reportHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try { win.print(); } catch (_) {}
      }, 250);
    } else {
      window.print();
    }
  }

  function initPhase2Controls() {
    const camToggleBtn = document.getElementById('kiosk-camera-toggle-btn');
    const camFlipBtn = document.getElementById('kiosk-camera-flip-btn');
    const camCloseBtn = document.getElementById('kiosk-camera-close-btn');
    const syncBtn = document.getElementById('kiosk-offline-sync-btn');
    const netPillBtn = document.getElementById('terminal-net-status-pill');
    const soundBtn = document.getElementById('terminal-sound-toggle-btn');
    const fullscreenBtn = document.getElementById('terminal-fullscreen-btn');
    const rangeSelect = document.getElementById('timeline-range-select');
    const customDatesEl = document.getElementById('timeline-custom-dates');
    const dateFromEl = document.getElementById('timeline-date-from');
    const dateToEl = document.getElementById('timeline-date-to');
    const applyRangeBtn = document.getElementById('timeline-apply-range-btn');
    const exportCsvBtn = document.getElementById('timeline-export-csv-btn');
    const printBtn = document.getElementById('timeline-print-btn');

    if (camToggleBtn) {
      camToggleBtn.addEventListener('click', () => {
        if (cameraStream) {
          stopCameraScanner();
        } else {
          startCameraScanner();
        }
      });
    }
    if (camFlipBtn) camFlipBtn.addEventListener('click', flipCameraFacing);
    if (camCloseBtn) camCloseBtn.addEventListener('click', stopCameraScanner);
    if (syncBtn) syncBtn.addEventListener('click', () => syncOfflineScans(true));
    if (netPillBtn) {
      netPillBtn.addEventListener('click', () => {
        const queued = readOfflineScanQueue().length;
        if (queued > 0) {
          syncOfflineScans(true);
        } else if (navigator.onLine) {
          showToast('Gate Terminal online — 0 offline scans waiting.');
        } else {
          showToast('Terminal offline — badge scans queue locally until reconnected.');
        }
      });
    }

    const syncSoundBtnUi = () => {
      if (!soundBtn) return;
      soundBtn.textContent = state.kioskMuted ? '🔇 Muted' : '🔊 Sound';
      soundBtn.title = state.kioskMuted ? 'Unmute gate terminal audio chimes' : 'Mute gate terminal audio chimes';
    };
    syncSoundBtnUi();
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        state.kioskMuted = !state.kioskMuted;
        localStorage.setItem('ability_kiosk_muted', state.kioskMuted ? '1' : '0');
        syncSoundBtnUi();
        if (!state.kioskMuted) {
          playKioskChime('approve');
        }
      });
    }

    const syncFullscreenBtnUi = () => {
      const heroCard = document.getElementById('pane-kiosk');
      const isFull = Boolean(document.fullscreenElement || heroCard?.classList.contains('is-kiosk-fullscreen'));
      if (fullscreenBtn) {
        fullscreenBtn.textContent = isFull ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
      }
    };
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', async () => {
        const heroCard = document.getElementById('pane-kiosk');
        if (!heroCard) return;
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
            heroCard.classList.remove('is-kiosk-fullscreen');
          } else if (heroCard.classList.contains('is-kiosk-fullscreen')) {
            heroCard.classList.remove('is-kiosk-fullscreen');
          } else if (heroCard.requestFullscreen) {
            await heroCard.requestFullscreen();
          } else {
            heroCard.classList.add('is-kiosk-fullscreen');
          }
        } catch (_) {
          heroCard.classList.toggle('is-kiosk-fullscreen');
        }
        syncFullscreenBtnUi();
      });
      document.addEventListener('fullscreenchange', () => {
        const heroCard = document.getElementById('pane-kiosk');
        if (!document.fullscreenElement && heroCard) {
          heroCard.classList.remove('is-kiosk-fullscreen');
        }
        syncFullscreenBtnUi();
      });
    }

    if (rangeSelect) {
      rangeSelect.addEventListener('change', (e) => {
        const val = e.target.value || 'today';
        if (customDatesEl) customDatesEl.style.display = val === 'custom' ? 'flex' : 'none';
        if (val !== 'custom') {
          fetchAttendanceReport(val);
        }
      });
    }
    if (applyRangeBtn) {
      applyRangeBtn.addEventListener('click', () => {
        state.timelineDateFrom = dateFromEl ? dateFromEl.value : '';
        state.timelineDateTo = dateToEl ? dateToEl.value : '';
        if (!state.timelineDateFrom) {
          showToast('Select a start date first.');
          return;
        }
        fetchAttendanceReport('custom');
      });
    }
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportShiftReportCsv);
    if (printBtn) printBtn.addEventListener('click', openClientShiftSignOffReport);

    window.addEventListener('online', () => {
      renderOfflineQueueBar();
      syncOfflineScans(true);
    });
    window.addEventListener('offline', () => {
      renderOfflineQueueBar();
      showToast('Connection lost — gate scans will queue locally until back online.');
    });

    renderOfflineQueueBar();
  }

  function showConfirmModal({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    tone = 'danger',
    requirePassword = false,
    passwordLabel = 'Password',
    passwordPlaceholder = 'Enter your password...',
  } = {}) {
    const modal = document.getElementById('app-confirm-modal');
    if (!modal) {
      return Promise.resolve({ confirmed: false, password: '' });
    }

    const iconEl = document.getElementById('app-confirm-icon');
    const titleEl = document.getElementById('app-confirm-title');
    const descEl = document.getElementById('app-confirm-desc');
    const pwWrap = document.getElementById('app-confirm-password-wrap');
    const pwLbl = document.getElementById('app-confirm-password-label');
    const pwInp = document.getElementById('app-confirm-password-input');
    const errEl = document.getElementById('app-confirm-error');
    const cancelBtn = document.getElementById('app-confirm-cancel-btn');
    const okBtn = document.getElementById('app-confirm-ok-btn');

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = message;
    if (cancelBtn) cancelBtn.textContent = cancelText;
    if (okBtn) {
      okBtn.textContent = confirmText;
      okBtn.classList.remove('btn-confirm-danger', 'btn-confirm-warning');
      if (tone === 'danger') okBtn.classList.add('btn-confirm-danger');
      else if (tone === 'warning') okBtn.classList.add('btn-confirm-warning');
    }
    if (iconEl) {
      iconEl.classList.remove('tone-danger', 'tone-warning', 'tone-primary');
      iconEl.classList.add(`tone-${tone === 'warning' ? 'warning' : (tone === 'primary' ? 'primary' : 'danger')}`);
      iconEl.textContent = tone === 'primary' ? '?' : '!';
    }
    if (pwWrap) pwWrap.style.display = requirePassword ? 'block' : 'none';
    if (pwLbl) pwLbl.textContent = passwordLabel;
    if (pwInp) {
      pwInp.value = '';
      pwInp.placeholder = passwordPlaceholder;
    }
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    return new Promise((resolve) => {
      let settled = false;

      const cleanup = () => {
        okBtn?.removeEventListener('click', onConfirm);
        cancelBtn?.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKeyDown);
        pwInp?.removeEventListener('keydown', onPwKeyDown);
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      };

      const finish = (confirmed, password = '') => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ confirmed, password });
      };

      const onConfirm = () => {
        const pwVal = pwInp ? pwInp.value : '';
        if (requirePassword && !pwVal) {
          if (errEl) {
            errEl.textContent = 'Please enter your password to confirm this action.';
            errEl.style.display = 'block';
          }
          pwInp?.focus();
          return;
        }
        finish(true, pwVal);
      };

      const onCancel = () => finish(false, '');
      const onBackdrop = (e) => {
        if (e.target === modal) onCancel();
      };
      const onKeyDown = (e) => {
        if (e.key === 'Escape') onCancel();
      };
      const onPwKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        }
      };

      okBtn?.addEventListener('click', onConfirm);
      cancelBtn?.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKeyDown);
      pwInp?.addEventListener('keydown', onPwKeyDown);

      setTimeout(() => {
        if (requirePassword && pwInp) pwInp.focus();
        else okBtn?.focus();
      }, 40);
    });
  }

  function isElementVisibleForTour(selector) {
    if (!selector) return true;
    const el = document.querySelector(selector);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || rect.height > 0);
  }

  function startInteractiveTour(forceScope = null) {
    const driverFactory = window.driver && window.driver.js && window.driver.js.driver;
    if (typeof driverFactory !== 'function') {
      showToast('Guided tour library failed to load. Refresh the page and try again.');
      return;
    }

    const isCtrl = isCurrentUserStockController();
    const targetScope = forceScope || (isCtrl || state.activeScreen === 'terminals' ? 'kiosk' : 'overview');

    if (targetScope === 'kiosk' && state.activeScreen !== 'terminals') {
      switchScreen('terminals', 'pane-kiosk');
    } else if (targetScope === 'overview' && !isCtrl && state.activeScreen !== 'overview') {
      switchScreen('overview');
    }

    const kioskSteps = [
      {
        element: '#terminal-lock-status-pill',
        popover: {
          title: 'Assigned Gate & Terminal Lock',
          description: 'Gate Controllers are locked to their assigned facility or venue. Enter your dedicated terminal PIN to unlock badge scanning.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#terminal-unlock-form',
        popover: {
          title: 'Unlock Terminal Scanning',
          description: 'Enter the dedicated site PIN here to enable barcode, RFID, and tablet camera attendance scanning for this checkpoint.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#kiosk-badge-input',
        popover: {
          title: 'Fast Badge & Staff Lookup',
          description: 'Scan a QR/barcode with a USB reader or type a badge code (e.g. REW-BADGE-0006) or staff name and press Enter.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#kiosk-camera-toggle-btn',
        popover: {
          title: 'Tablet & Phone Camera Scanner',
          description: 'Use your tablet or mobile camera to scan staff QR badges directly without extra hardware. Flip between front and rear cameras anytime.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#kiosk-calltime-quickbar',
        popover: {
          title: 'Live Shift Call-Time',
          description: 'Arrivals are compared against the checkpoint call-time (+15m grace window) to automatically flag Early, On-Time, or Late check-ins.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#terminal-shift-relief-btn',
        popover: {
          title: 'Shift Relief, Sick Leave & Night Swaps',
          description: 'Request temporary gate coverage, emergency sick-leave replacement, or night-shift handover for Administrator / Site Manager approval.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#kiosk-offline-sync-bar',
        popover: {
          title: 'Offline Scan Queue',
          description: 'If internet drops at the gate, scans save locally with exact timestamps and auto-sync to the server once connectivity returns.',
          side: 'top',
          align: 'start',
        },
      },
    ];

    const overviewSteps = [
      {
        element: '.checkpoint-selector-bar',
        popover: {
          title: 'Active Checkpoint Switcher',
          description: 'Switch between Facility Gates and Event Venues, verify call-times, or lock this workstation to a single gate with a PIN.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.metrics-grid',
        popover: {
          title: 'Real-Time Attendance KPIs',
          description: 'Track active badges, staff currently on-site (click Card 2 for Live Roll-Call), daily check-ins, and late or denied exceptions.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#shift-report-toolbar',
        popover: {
          title: 'Night-Shift & Multi-Day Reports',
          description: 'Filter attendance by Today, Night Shift (18:00–09:00), Last 7 Days, or Custom Dates, then export CSV or print shift sheets.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#overview-allocation-card',
        popover: {
          title: 'Hourly Traffic & Currently On-Site Crew',
          description: 'Live check-in volume across Kigali event venues and facility gates, paired with active Currently On-Site (COS) roster.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '#sidebar-shift-relief-btn',
        popover: {
          title: 'Shift Relief & Coverage Queue',
          description: 'Submit or approve Gate Controller replacements for sick leave, busy event days, and overnight shift coverage.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#nav-terminals-btn',
        popover: {
          title: 'Interactive Gate Kiosk & Camera Scanner',
          description: 'Open the dedicated Gate Terminal view (#pane-kiosk) for live QR camera scanning, offline queueing, and PIN screen lock.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#topbar-help-btn',
        popover: {
          title: 'Replay Tour Anytime',
          description: 'Click Help (?) anytime to relaunch this interactive tour, inspect Live Roll-Call, or view keyboard shortcuts.',
          side: 'bottom',
          align: 'end',
        },
      },
    ];

    const rawSteps = targetScope === 'kiosk' ? kioskSteps : overviewSteps;
    const activeSteps = rawSteps.filter((step) => isElementVisibleForTour(step.element));
    if (!activeSteps.length) {
      showToast('No tour targets are visible on this screen right now.');
      return;
    }

    const driverObj = driverFactory({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.58,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'ability-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      steps: activeSteps,
      onDestroyed: () => {
        try {
          localStorage.setItem(`ability_tour_seen_v1_${targetScope}`, '1');
        } catch (_) {}
      },
    });
    driverObj.drive();
  }

  function initSidebarCollapse() {
    const shell = document.querySelector('.app-shell');
    const collapseBtn = document.getElementById('sidebar-collapse-toggle-btn');
    const topbarToggleBtn = document.getElementById('topbar-sidebar-toggle-btn');
    if (!shell) return;

    try {
      if (localStorage.getItem('ability_sidebar_collapsed') === 'true') {
        shell.classList.add('sidebar-collapsed');
      }
    } catch (_) {}

    const toggle = () => {
      const isCollapsed = shell.classList.toggle('sidebar-collapsed');
      try {
        localStorage.setItem('ability_sidebar_collapsed', isCollapsed ? 'true' : 'false');
      } catch (_) {}
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 260);
    };

    if (collapseBtn) collapseBtn.addEventListener('click', toggle);
    if (topbarToggleBtn) topbarToggleBtn.addEventListener('click', toggle);

    // Keyboard shortcut: Alt + S
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toggle();
      }
    });

    // Populate titles for tooltip display on collapsed rail
    document.querySelectorAll('.sidebar .nav-item').forEach((item) => {
      if (!item.hasAttribute('title')) {
        const lbl = item.querySelector('.nav-item-label');
        if (lbl && lbl.textContent.trim()) {
          item.setAttribute('title', lbl.textContent.trim());
        }
      }
    });
  }

  function initRosterLayoutToggle() {
    const btn = document.getElementById('toggle-roster-layout-btn');
    const splitRow = document.querySelector('.attendees-kiosk-split-row');
    const label = document.getElementById('roster-layout-toggle-text');
    if (!btn || !splitRow) return;

    try {
      const isFull = localStorage.getItem('ability_roster_fullwidth') === 'true';
      if (isFull) {
        splitRow.classList.add('is-fullwidth');
        if (label) label.textContent = 'Split View';
      }
    } catch (_) {}

    btn.addEventListener('click', () => {
      const isFull = splitRow.classList.toggle('is-fullwidth');
      if (label) {
        label.textContent = isFull ? 'Split View' : 'Full Width';
      }
      try {
        localStorage.setItem('ability_roster_fullwidth', isFull ? 'true' : 'false');
      } catch (_) {}
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 260);
    });
  }

  function initTourControls() {
    const tourBtn = document.getElementById('topbar-menu-tour');
    if (tourBtn) {
      tourBtn.addEventListener('click', () => {
        const drop = document.getElementById('topbar-help-dropdown');
        if (drop) drop.style.display = 'none';
        startInteractiveTour();
      });
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    applyAccessibilityPreferences();
    updateNetworkStatusUi();
    window.addEventListener('online', () => { updateNetworkStatusUi(); syncOfflineScans(true); });
    window.addEventListener('offline', () => { updateNetworkStatusUi(); showToast('Offline mode active: Online-Only controls locked.'); });
    window.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      state.deferredPwaPrompt = ev;
      if (state.activeScreen === 'settings' && state.settingsTab === 'pwa') {
        renderSettingsPwaSection();
      }
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(() => {
        if (state.activeScreen === 'settings' && state.settingsTab === 'pwa') renderSettingsPwaSection();
      }).catch(() => {});
    }
    initSidebarCollapse();
    initRosterLayoutToggle();
    bindEvents();
    initShiftReliefControls();
    initPhase2Controls();
    initTourControls();
    document.getElementById('kiosk-vqr-refresh-btn')?.addEventListener('click', refreshKioskVenueQr);
    document.getElementById('kiosk-vqr-open-url-btn')?.addEventListener('click', () => {
      if (state.vqrLastUrl) {
        window.open(state.vqrLastUrl, '_blank', 'noopener');
      } else {
        showToast('Generating live Gate QR first...');
        refreshKioskVenueQr();
      }
    });
    document.getElementById('rc-trigger-random-btn')?.addEventListener('click', () => triggerRandomRollCallApi(null));
    document.getElementById('rollcall-modal-quick-random-btn')?.addEventListener('click', () => {
      triggerRandomRollCallApi({ selection_mode: 'random_count', sample_value: 5, deadline_minutes: 10, auto_checkout_on_miss: 1 });
    });
    document.getElementById('rollcall-modal-open-page-btn')?.addEventListener('click', () => {
      closeAllModals();
      switchScreen('rollcall');
    });
    if (window.location.hash === '#pane-kiosk') {
      switchScreen('terminals', 'pane-kiosk');
    } else if (window.location.hash === '#rollcall') {
      switchScreen('rollcall');
    } else if (window.location.hash === '#create-event') {
      switchScreen('create-event');
    } else if (window.location.hash === '#dispatch-flow') {
      switchScreen('dispatch-flow');
    } else if (window.location.hash === '#settings' || window.location.hash === '#flow-explorer') {
      switchScreen('settings');
    }
    await fetchBootstrap(false);
    if (state.currentUser && Number(state.currentUser.must_change_password) === 1 && isScreenPermittedForCurrentUser('settings')) {
      showToast('Security Notice: Update your temporary password under Settings > Accounts & Offline.');
    }
    syncOfflineScans(false);
    startLiveGateSync();
    if (window.location.hash === '#rollcall' && isScreenPermittedForCurrentUser('rollcall')) {
      switchScreen('rollcall');
    } else if (window.location.hash === '#create-event' && isScreenPermittedForCurrentUser('create-event')) {
      switchScreen('create-event');
    } else if (window.location.hash === '#dispatch-flow' && isScreenPermittedForCurrentUser('dispatch-flow')) {
      switchScreen('dispatch-flow');
    } else if ((window.location.hash === '#settings' || window.location.hash === '#flow-explorer') && isScreenPermittedForCurrentUser('settings')) {
      switchScreen('settings');
    } else if (isCurrentUserStockController()) {
      switchScreen('terminals', 'pane-kiosk');
      applyNavigationRestrictions();
    }
    loadStockManagerData();
    try {
      const tourScope = isCurrentUserStockController() || state.activeScreen === 'terminals' ? 'kiosk' : 'overview';
      if (!localStorage.getItem(`ability_tour_seen_v1_${tourScope}`)) {
        localStorage.setItem(`ability_tour_seen_v1_${tourScope}`, 'hinted');
        setTimeout(() => {
          showToast('Tip: Open Help (?) → Interactive Guided Tour for a quick walkthrough.');
        }, 1200);
      }
    } catch (_) {}
  });
})();
