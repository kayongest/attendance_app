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
    batches: [],
    shiftRequests: [],
    pendingShiftRequestCount: 0,
    batchesSearch: '',
    batchesFilterStatus: 'all',
    batchesFilterMovement: 'all',
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
    rollCallSearch: '',
    rollCallCpFilter: 'all',
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
    checkpointTab: 'all',
    checkpointSearch: '',
    checkpointPage: 1,
    checkpointPerPage: 5,

    // Facility & Personnel Allocation Map
    selectedMapCheckpoint: { type: 'event_venue', id: 1 },
    mapViewMode: 'map',
    mapFilter: 'all',

    // Users & Roles CRUD Manager
    usersTab: 'all',
    usersSearch: '',
    usersFilterDept: 'all',
    usersFilterTier: 'all',
    usersPage: 1,
    usersPerPage: 5,

    // Stocks & Warehouses CRUD Manager
    stockManager: {
      activeTab: 'warehouses',
      warehouses: [],
      items: [],
      categories: [],
      stats: {
        total_warehouses: 0,
        total_items: 0,
        available_count: 0,
        in_use_count: 0,
      },
      whSearch: '',
      itemSearch: '',
      categoryFilter: 'all',
      locationFilter: 'all',
      itemPage: 1,
      itemPerPage: 10,
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

    // Currently inspected batch in modal
    inspectedBatchId: null,

    // Current Operator Session & Alerts
    currentUser: null,
    unreadNotifCount: 0,
    readNotifIds: new Set(),
    notifications: [],
  };

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

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3200);
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
    state.batches = Array.isArray(data.batches) ? data.batches : [];
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
        { id: 12, role_key: 'driver', title: 'Logistics Driver', clearance_level: 'L1_VENUE_BASIC', clearance_code: 'L1', clearance_title: 'Level 1 - Venue Basic', clearance_color: '#64748b', department: 'Logistics', description: 'Equipment transport, loading bay check-in, and transit logistics.', is_system: 0, is_active: 1, staff_count: 1 },
      ];
    }

    if (Array.isArray(data.departments)) {
      state.departments = data.departments;
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
      linked_batches: member.linked_batches || [],
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

  async function triggerGateScan(scanInput, forcedMode = null) {
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
        }),
      });
      const data = await res.json();
      if (!data.ok && data.error) {
        showToast(data.error);
        playKioskChime('decline');
        return;
      }

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
    if (!isScreenPermittedForCurrentUser(screenKey)) {
      const rawRole = (state.currentUser?.role || '').toLowerCase();
      const isStockCtrl = rawRole === 'stock_controller';
      const isTech = rawRole === 'tech_lead' || rawRole === 'technical_lead';
      const isStockMgr = rawRole === 'stock_manager';

      if (isStockCtrl) {
        showToast('Access Scoped: Gate Controllers are scoped to Gate Kiosk (#pane-kiosk) at their assigned terminal.');
        screenKey = 'terminals';
        scrollToId = 'pane-kiosk';
      } else if (isTech) {
        showToast('Access Scoped: Tech Leads are scoped to Gate Dashboard & Terminal only.');
        screenKey = 'overview';
      } else if (isStockMgr) {
        showToast('Access Restricted: Venue Security Portal is reserved for Technical Leads and Administrators.');
        screenKey = 'overview';
      } else {
        showToast('Access Restricted: Crew members are scoped to Personal Badge & Gate Kiosk view.');
        screenKey = 'terminals';
        scrollToId = 'pane-kiosk';
      }
    }
    const wasScreen = state.activeScreen;
    const resolvedKey = screenKey === 'access-matrix' ? 'analytics' : screenKey;
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
      users: document.getElementById('screen-users'),
      attendees: document.getElementById('screen-attendees'),
      terminals: document.getElementById('screen-terminals'),
      analytics: document.getElementById('screen-analytics'),
      'stock-manager': document.getElementById('screen-stock-manager'),
      'venue-security': document.getElementById('screen-venue-security'),
      'shift-relief': document.getElementById('screen-shift-relief'),
      calltime: document.getElementById('screen-calltime'),
      rollcall: document.getElementById('screen-rollcall'),
      'station-lock': document.getElementById('screen-station-lock'),
      'reset-scans': document.getElementById('screen-reset-scans'),
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
      const isMatch = target === screenKey || target === resolvedKey || (target === 'access-matrix' && resolvedKey === 'analytics');
      btn.classList.toggle('active', isMatch);
      const img = btn.querySelector('img[data-inactive-icon]');
      if (img) {
        const activeIc = img.getAttribute('data-active-icon') || '';
        const inactiveIc = img.getAttribute('data-inactive-icon') || '';
        img.src = (isMatch && activeIc) ? activeIc : inactiveIc;
      }
    });

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
      events: 'Venues & Stock Gates',
      users: 'Staff, Technicians & Role Management',
      attendees: 'Staff ID Badges & Kiosk',
      terminals: 'Terminals (#pane-kiosk)',
      analytics: 'Access Clearance Matrix',
      'access-matrix': 'Access Clearance Matrix',
      'stock-manager': 'Facilities & Gates Registry',
      'venue-security': 'Venue Security Portal',
      'shift-relief': 'Shift Relief & Swaps',
      calltime: 'Set Call Time',
      rollcall: 'On-Site Roll-Call',
      'station-lock': 'Station Lock (PIN)',
      'reset-scans': 'Reset Today’s Scans',
    };
    const bc = document.getElementById('breadcrumb-page');
    if (bc) {
      bc.textContent = pageTitles[screenKey] || pageTitles[resolvedKey] || (matchedNavItem ? matchedNavItem.label : 'Gate Dashboard');
    }

    if (resolvedKey === 'stock-manager') {
      loadStockManagerData();
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
    if (state.mapViewMode === 'option-b') {
      renderOptionBMap();
    } else {
      renderAllocationMap();
    }
    renderActivityTimeline();
    renderTechLeadRosterCard();
    renderCrewDigitalPassCard();
    renderCrewTables();
    renderCheckpointsDirectory();
    renderBatchesAndMatrixScreen();
    renderRollCallModalList();
    renderUsersScreen();
    renderDedicatedNavPages();
    if (state.activeScreen === 'users') {
      switchUsersView(state.usersViewMode || 'personnel');
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
    return role === 'technician' || (!isCurrentUserAdmin() && !isCurrentUserTechLead() && !isCurrentUserStockManager() && !isCurrentUserStockController());
  }

  function isScreenPermittedForCurrentUser(screenKey) {
    if (isCurrentUserAdmin()) return true;
    const navItems = state.navigationConfig?.items || [];
    if (Array.isArray(navItems) && navItems.length > 0) {
      const navMatch = navItems.find((it) =>
        String(it.nav_target) === String(screenKey) ||
        (screenKey === 'analytics' && String(it.nav_target) === 'access-matrix') ||
        (screenKey === 'access-matrix' && String(it.nav_target) === 'analytics')
      );
      if (navMatch) {
        return isNavItemPermittedForCurrentUser(navMatch);
      }
    }
    const rawRole = (state.currentUser?.role || '').toLowerCase();
    const isAdmin = isCurrentUserAdmin();
    const isManager = (rawRole === 'manager' || rawRole === 'project_manager') && !isAdmin;
    const isTech = (rawRole === 'tech_lead' || rawRole === 'technical_lead') && !isAdmin;
    const isStockMgr = (rawRole === 'stock_manager') && !isAdmin;
    const isStockCtrl = (rawRole === 'stock_controller');

    if (isManager) {
      return ['overview', 'events', 'users', 'attendees', 'terminals', 'venue-security', 'shift-relief', 'calltime', 'rollcall'].includes(screenKey);
    }
    if (isStockCtrl) {
      return ['terminals', 'attendees', 'analytics', 'stock-manager', 'shift-relief'].includes(screenKey);
    }
    if (isTech) {
      // Tech Lead is strictly scoped to Gate Dashboard (overview) & Terminal (terminals)
      return screenKey === 'overview' || screenKey === 'terminals';
    }
    if (isStockMgr) {
      return ['overview', 'events', 'attendees', 'terminals', 'analytics', 'stock-manager', 'shift-relief', 'calltime', 'rollcall'].includes(screenKey);
    }
    // Field Crew / Technicians / Drivers / Decorators / Standard crew:
    return screenKey === 'attendees' || screenKey === 'terminals';
  }

  function canCurrentUserAddUser() {
    if (!state.currentUser) return false;
    const rawRole = (state.currentUser.role || '').toLowerCase();
    const isManager = rawRole === 'manager' || rawRole === 'project_manager';
    return isCurrentUserAdmin() || isManager || isCurrentUserTechLead() || isCurrentUserStockManager();
  }

  function canCurrentUserAssignEvents() {
    if (!state.currentUser) return false;
    const rawRole = (state.currentUser.role || '').toLowerCase();
    const isManager = rawRole === 'manager' || rawRole === 'project_manager';
    return isCurrentUserAdmin() || isManager || isCurrentUserTechLead();
  }

  function canCurrentUserSetCallTime() {
    if (!state.currentUser) return true; // Permit in kiosk/demo testing
    const rawRole = (state.currentUser.role || '').toLowerCase();
    const isManager = rawRole === 'manager' || rawRole === 'project_manager';
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
    const isManager = (rawRole === 'manager' || rawRole === 'project_manager') && !isAdmin;
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

    // Sync any extra nav items if navigationConfig wasn't loaded yet
    const navOverview = document.querySelector('.sidebar .nav-item[data-nav-target="overview"]');
    const navEvents = document.querySelector('.sidebar .nav-item[data-nav-target="events"]');
    const navUsers = document.getElementById('nav-users-btn') || document.querySelector('.sidebar .nav-item[data-nav-target="users"]');
    const navAttendees = document.querySelector('.sidebar .nav-item[data-nav-target="attendees"]');
    const navTerminals = document.getElementById('nav-terminals-btn') || document.querySelector('.sidebar .nav-item[data-nav-target="terminals"]');
    const navVenueSec = document.getElementById('nav-venue-security-btn');
    const navAnalytics = document.querySelector('.sidebar .nav-item[data-nav-target="analytics"]');
    const navStockMgr = document.getElementById('nav-stock-manager-btn') || document.querySelector('.sidebar .nav-item[data-nav-target="stock-manager"]');
    const navMatrix = document.getElementById('nav-access-matrix-btn');

    if (!state.navigationConfig || !Array.isArray(state.navigationConfig.items) || state.navigationConfig.items.length === 0) {
      setVis(navOverview, isAdmin || isManager || isTech || isStockMgr);
      setVis(navEvents, isAdmin || isManager || isStockMgr);
      setVis(navUsers, isAdmin || isManager);
      setVis(navAttendees, !isTech);
      setVis(navTerminals, true);
      setVis(navVenueSec, isAdmin || isManager);
      setVis(navAnalytics, isAdmin || isStockMgr || isStockCtrl);
      setVis(navStockMgr, isAdmin || isStockMgr || isStockCtrl);
      setVis(navMatrix, isAdmin);
    }

    // 2. Checkpoint Controls Navigation Group (fallback only if workspace items not in navigationConfig)
    const hasWorkspaceNavConfig = Array.isArray(state.navigationConfig?.items) && state.navigationConfig.items.some((it) => it.nav_group === 'workspace');
    const cpNav = document.getElementById('sidebar-checkpoint-controls') || document.querySelector('.nav-group-workspace');
    const btnShiftRelief = document.getElementById('sidebar-shift-relief-btn');
    const btnCallTime = document.getElementById('sidebar-calltime-btn');
    const btnRollCall = document.getElementById('sidebar-rollcall-btn');
    const btnStationLock = document.getElementById('sidebar-station-lock-btn');
    const btnResetDemo = document.getElementById('sidebar-reset-demo-btn');

    if (cpNav && !hasWorkspaceNavConfig) {
      if (isFieldCrew || isTech) {
        // Entire checkpoint controls group hidden for Field Crew & Tech Lead
        cpNav.style.display = 'none';
      } else {
        cpNav.style.display = 'flex';
        // Shift Relief & Swaps: Admin, Manager, Stock Manager, Stock Controller
        setVis(btnShiftRelief, isAdmin || isManager || isStockMgr || isStockCtrl);
        // Set Call Time: Admin, Manager, Stock Manager
        setVis(btnCallTime, isAdmin || isManager || isStockMgr);
        // On-Site Roll-Call: Admin, Manager, Stock Manager
        setVis(btnRollCall, isAdmin || isManager || isStockMgr);
        // Station Lock PIN: Admin ONLY
        setVis(btnStationLock, isAdmin);
        // Reset Today's Scans: Admin ONLY
        setVis(btnResetDemo, isAdmin);
      }
    }
    if (btnResetDemo && !isAdmin) {
      btnResetDemo.style.display = 'none';
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

      if (cardTitle) {
        cardTitle.textContent = isTech
          ? 'Hourly Venue vs. Facility Gate Traffic'
          : 'Real-Time Personnel & Facility Allocation Map';
      }
      if (cardSubtitle) {
        cardSubtitle.textContent = isTech
          ? 'Live check-in volume across Kigali event venues and facility gates for today’s call-time window.'
          : 'Real-time geographic tracking & instant crew attendance across Kigali venues and facility hubs.';
      }
      if (radarBadge) radarBadge.style.display = isTech ? 'none' : '';
      if (btnOptA) btnOptA.style.display = isTech ? 'none' : '';
      if (btnOptB) btnOptB.style.display = isTech ? 'none' : '';
      if (btnChart) btnChart.style.display = '';

      if (isTech) {
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

    // Render User Avatar and Info in Topbar
    const u = state.currentUser || (state.crew.length > 0 ? (state.crew.find((c) => Number(c.id) === 2) || state.crew[0]) : null);
    if (u) {
      state.currentUser = u;
      const initials = u.initials || computeInitials(u.full_name || 'Mirene Uwase');
      const topAvatar = document.getElementById('topbar-avatar');
      if (topAvatar) {
        if (u.profile_image_url) {
          topAvatar.innerHTML = `<img src="${escapeHtml(u.profile_image_url)}" alt="${escapeHtml(u.full_name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          topAvatar.textContent = initials;
        }
        topAvatar.title = `${u.full_name} (${u.role_display || u.role} · ${u.clearance_code || 'L2'}) · Click for Account Menu`;
      }

      const menuAvatar = document.getElementById('user-menu-avatar');
      if (menuAvatar) {
        if (u.profile_image_url) {
          menuAvatar.innerHTML = `<img src="${escapeHtml(u.profile_image_url)}" alt="${escapeHtml(u.full_name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          menuAvatar.textContent = initials;
        }
      }

      const menuName = document.getElementById('user-menu-name');
      if (menuName) menuName.textContent = u.full_name || 'Active Operator';

      const topName = document.getElementById('topbar-user-name');
      const topRole = document.getElementById('topbar-user-role-badge');
      if (topName) topName.textContent = u.full_name || 'Active Operator';
      if (topRole) topRole.textContent = `${u.role_display || u.role} (${u.clearance_code || 'L2'})`;

      const menuRole = document.getElementById('user-menu-role');
      if (menuRole) menuRole.textContent = `${u.role_display || u.role} · ${u.clearance_code || 'L2'}`;

      const menuBadge = document.getElementById('user-menu-badge');
      if (menuBadge) menuBadge.textContent = u.badge_code || 'REW-BADGE-0002';

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

    // Update Featured Equipment Batch Card on Screen 2 from state.batches[0]
    if (state.batches && state.batches.length > 0) {
      const fb = state.batches[0];
      const bCodeEl = document.getElementById('spotlight-batch-code');
      const bStatEl = document.getElementById('spotlight-batch-status');
      const bRouteEl = document.getElementById('spotlight-batch-route');
      const bTechEl = document.getElementById('spotlight-batch-tech');
      const bCtrlEl = document.getElementById('spotlight-batch-controller');
      if (bCodeEl) bCodeEl.textContent = fb.batch_number;
      if (bStatEl) bStatEl.textContent = fb.status.toUpperCase();
      if (bRouteEl) bRouteEl.textContent = `${fb.source_name} → ${fb.destination_name}`;
      if (bTechEl) bTechEl.textContent = `${fb.technician_name} (${fb.technician_badge} · ${fb.technician_clearance})`;
      if (bCtrlEl) bCtrlEl.textContent = `Controller: ${fb.stock_controller_name}`;
    }
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
    const avatarHtml = meCrew.photo_url
      ? `<img src="${escapeHtml(meCrew.photo_url)}" alt="${escapeHtml(fullName)}" />`
      : escapeHtml(initials);

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
          </div>
        </div>
      </div>
      <div class="crew-pass-qr-wrap">
        <div class="crew-pass-qr-box">${buildBadgeQrSvg(badgeCode)}</div>
        <div class="crew-pass-code-col">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b;">Scan at Gate Terminal</span>
          <span class="crew-pass-badge-code">${escapeHtml(badgeCode)}</span>
          <span class="crew-pass-rfid">${escapeHtml(rfidUid)}</span>
        </div>
      </div>
    `;
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

    // Linked Stock Batch Custody Bar is intentionally disabled for attendance-only focus
    const batchBar = document.getElementById('kiosk-batch-bar');
    if (batchBar) {
      batchBar.style.display = 'none';
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
    const btnDecline = document.getElementById('kiosk-btn-decline');
    const pnlOverride = document.getElementById('kiosk-override-panel');
    const pnlDecline = document.getElementById('kiosk-decline-panel');

    if (pnlOverride) pnlOverride.style.display = 'none';
    if (pnlDecline) pnlDecline.style.display = 'none';

    const isCurrentlyCheckedIn = (b.daily_state === 'checked_in');
    const isLateArrival = !isCurrentlyCheckedIn && diff > 15;
    const isLockedLate = b.badge_status === 'disabled_late' || isLateArrival;

    if (v.confirmed) {
      // Just confirmed action: hide decision buttons while countdown ticks
      if (btnApproveIn) btnApproveIn.style.display = 'none';
      if (btnApproveOut) btnApproveOut.style.display = 'none';
      if (btnOverride) btnOverride.style.display = 'none';
      if (btnDecline) btnDecline.style.display = 'none';
    } else if (isCurrentlyCheckedIn) {
      // Already inside -> Offer Check-Out and Decline
      if (btnApproveIn) btnApproveIn.style.display = 'none';
      if (btnApproveOut) btnApproveOut.style.display = 'inline-flex';
      if (btnOverride) btnOverride.style.display = 'none';
      if (btnDecline) btnDecline.style.display = 'inline-flex';
    } else if (isLockedLate) {
      // Tardy / Locked -> Require Supervisor Override or Decline
      if (btnApproveIn) btnApproveIn.style.display = 'none';
      if (btnApproveOut) btnApproveOut.style.display = 'none';
      if (btnOverride) btnOverride.style.display = 'inline-flex';
      if (btnDecline) btnDecline.style.display = 'inline-flex';
    } else {
      // Punctual Inbound -> Offer Approve In and Decline
      if (btnApproveIn) btnApproveIn.style.display = 'inline-flex';
      if (btnApproveOut) btnApproveOut.style.display = 'none';
      if (btnOverride) btnOverride.style.display = 'none';
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
      { id: 3, type: 'stock_warehouse', name: 'BK Arena Stock', location: 'BK Arena Remera', call_time: '08:00', lead_name: 'Irene Mudacumura' },
      { id: 1, type: 'event_venue', name: 'Kigali Convention Centre', location: 'Gasabo District', call_time: '08:00', lead_name: 'Jean Paul Ndayisaba' },
      { id: 2, type: 'event_venue', name: 'BK Arena', location: 'Remera', call_time: '08:00', lead_name: 'Musirikare Leonce' },
      { id: 3, type: 'event_venue', name: 'Camp Kigali', location: 'Nyarugenge', call_time: '08:30', lead_name: 'Patrick Nyirimbibi' },
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

  function setAllocationMapView(viewMode) {
    const rawRole = (state.currentUser?.role || '').toLowerCase();
    const isTech = (rawRole === 'tech_lead' || rawRole === 'technical_lead') && !isCurrentUserAdmin();
    if (isTech) {
      viewMode = 'chart';
    }
    state.mapViewMode = viewMode;
    const mapView = document.getElementById('overview-map-view');
    const liveMapPanel = document.getElementById('live-map-panel');
    const chartView = document.getElementById('overview-traffic-chart-view');
    const btnOptA = document.getElementById('toggle-view-option-a') || document.getElementById('toggle-view-map');
    const btnOptB = document.getElementById('toggle-view-option-b');
    const btnChart = document.getElementById('toggle-view-chart');
    const collapseBtn = document.getElementById('toggle-option-a-collapse');
    const filterSelect = document.getElementById('overview-map-filter');

    if (mapView) mapView.style.display = 'none';
    if (liveMapPanel) liveMapPanel.style.display = 'none';
    if (chartView) chartView.style.display = 'none';

    if (btnOptA) btnOptA.classList.remove('active');
    if (btnOptB) btnOptB.classList.remove('active');
    if (btnChart) btnChart.classList.remove('active');

    if (viewMode === 'option-a' || viewMode === 'map') {
      state.mapViewMode = 'option-a';
      if (mapView) mapView.style.display = 'block';
      if (btnOptA) btnOptA.classList.add('active');
      if (collapseBtn) collapseBtn.style.display = 'inline-flex';
      if (filterSelect) filterSelect.style.display = 'inline-block';
      renderAllocationMap();
    } else if (viewMode === 'option-b') {
      state.mapViewMode = 'option-b';
      if (liveMapPanel) liveMapPanel.style.display = 'flex';
      if (btnOptB) btnOptB.classList.add('active');
      if (collapseBtn) collapseBtn.style.display = 'none';
      if (filterSelect) filterSelect.style.display = 'none';
      renderOptionBMap();
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
            showToast(`✓ Dispatched ${u.name} to ${venue} (In Transit)`);
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
    const sourceRows = isReportMode ? (state.timelineReportRows || []) : (state.activityTimeline || []);

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

  function renderCheckpointsDirectory() {
    const rowsEl = document.getElementById('events-table-rows');
    if (!rowsEl) return;

    const allCps = state.checkpoints.directory || [];
    const stocksCount = (state.checkpoints.stock_warehouses || []).length;
    const venuesCount = (state.checkpoints.event_venues || []).length;

    document.querySelectorAll('#events-total-kpi').forEach((el) => {
      el.textContent = String(allCps.length).padStart(2, '0');
    });
    document.querySelectorAll('#events-stock-kpi').forEach((el) => {
      el.textContent = String(stocksCount).padStart(2, '0');
    });
    document.querySelectorAll('#events-venue-kpi').forEach((el) => {
      el.textContent = String(venuesCount).padStart(2, '0');
    });
    document.querySelectorAll('#events-batches-kpi').forEach((el) => {
      el.textContent = String(state.batches.length).padStart(2, '0');
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
    renderClearanceMatrixCards();
  }

  function switchUsersView(mode) {
    state.usersViewMode = mode;

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

    // 2. Equipment Batches Custody Table
    populateBatchCrudDropdowns();
    const batchesRowsEl = document.getElementById('batches-table-rows');
    const batchesBadge = document.getElementById('batches-count-badge');

    let batches = Array.isArray(state.batches) ? state.batches : [];
    if (state.batchesSearch) {
      const q = state.batchesSearch.toLowerCase().trim();
      batches = batches.filter(
        (b) =>
          (b.batch_number || '').toLowerCase().includes(q) ||
          (b.job_sheet || '').toLowerCase().includes(q) ||
          (b.event_name || '').toLowerCase().includes(q) ||
          (b.technician_name || '').toLowerCase().includes(q) ||
          (b.source_name || '').toLowerCase().includes(q) ||
          (b.destination_name || '').toLowerCase().includes(q) ||
          (b.destination_room || '').toLowerCase().includes(q)
      );
    }
    if (state.batchesFilterStatus && state.batchesFilterStatus !== 'all') {
      batches = batches.filter((b) => (b.status || '').toLowerCase() === state.batchesFilterStatus.toLowerCase());
    }
    if (state.batchesFilterMovement && state.batchesFilterMovement !== 'all') {
      batches = batches.filter((b) => (b.movement_type || '').toLowerCase() === state.batchesFilterMovement.toLowerCase());
    }

    if (batchesBadge) batchesBadge.textContent = String(batches.length).padStart(2, '0');

    if (batchesRowsEl) {
      if (batches.length === 0) {
        batchesRowsEl.innerHTML = `
          <div style="padding: 32px 20px; text-align: center; color: var(--text-secondary); font-size: 13px;">
            <div style="font-size: 24px; margin-bottom: 6px;">📦</div>
            <strong>No equipment batches found</strong>
            <p style="margin-top: 4px; font-size: 11px;">Try adjusting search terms or click "+ Create Equipment Batch" above.</p>
          </div>
        `;
      } else {
        batchesRowsEl.innerHTML = batches
          .map((b) => {
            const isApproved = b.status === 'approved';
            const statusBadge =
              b.status === 'approved' ? 'status-badge-green-sm' :
              b.status === 'pending' ? 'status-badge-amber-sm' :
              b.status === 'in_transit' ? 'status-badge-blue-sm' :
              b.status === 'completed' ? 'status-badge-purple-sm' : 'status-badge-amber-sm';

            const itemsCount = Array.isArray(b.items) ? b.items.length : 0;

            return `
              <div class="tier-table-row" style="height: 68px;">
                <div style="width: 210px; display: flex; flex-direction: column; gap: 3px;">
                  <span class="badge-code-primary">${escapeHtml(b.batch_number)}</span>
                  <span style="font-size: 10px; color: var(--text-secondary);">Job Sheet: ${escapeHtml(b.job_sheet)} · ${escapeHtml(b.event_name)}</span>
                </div>
                <div style="width: 220px; display: flex; flex-direction: column; gap: 3px;">
                  <span style="font-size: 11px; font-weight: 600;">${escapeHtml(b.source_name)} &rarr; ${escapeHtml(b.destination_name)}</span>
                  <span style="font-size: 10px; color: var(--text-secondary);">${escapeHtml(b.destination_room || 'Main Stage')} (${escapeHtml(b.movement_type)})</span>
                </div>
                <div style="width: 190px; display: flex; flex-direction: column; gap: 3px;">
                  <span style="font-size: 11px; font-weight: 600;">${escapeHtml(b.technician_name)}</span>
                  <span style="font-size: 10px; color: var(--text-secondary);">${escapeHtml(b.technician_badge)} · Tier ${escapeHtml(b.technician_clearance)}</span>
                </div>
                <div style="width: 130px; font-size: 11px;">
                  ${escapeHtml(b.stock_controller_name)}
                </div>
                <div style="width: 110px;">
                  <span class="status-badge ${statusBadge}">
                    ${escapeHtml(b.status.toUpperCase())}
                  </span>
                </div>
                <div style="flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-secondary-32-sm js-open-batch-modal" data-batch-id="${b.id}" title="Inspect Manifest (${itemsCount} items)">
                    Inspect (${itemsCount})
                  </button>
                  <button type="button" class="btn btn-secondary-32-sm js-edit-batch" data-batch-id="${b.id}" title="Edit Equipment Batch">
                    ✏️ Edit
                  </button>
                  ${
                    !isApproved
                      ? `<button type="button" class="btn btn-primary-32-sm js-approve-batch-btn" data-batch-id="${b.id}" style="background:#16a34a; font-size:11px; padding:0 8px; height:28px;" title="Verify & Approve Batch">Approve</button>`
                      : ''
                  }
                  <button type="button" class="btn btn-secondary-32-sm js-delete-batch" data-batch-id="${b.id}" data-batch-num="${escapeHtml(b.batch_number)}" style="color: #dc2626; padding:0 8px; height:28px;" title="Delete Batch">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // 3. 4-Tier Access Matrix Crew Assignment Rows
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

  function renderRollCallModalList() {
    const listEl = document.getElementById('rollcall-modal-list');
    if (!listEl) return;
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

  function openBatchModal(batchId) {
    const batch = state.batches.find((b) => Number(b.id) === Number(batchId)) || state.batches[0];
    if (!batch) return;
    state.inspectedBatchId = batch.id;

    const modal = document.getElementById('batch-custody-modal');
    const statusEl = document.getElementById('batch-modal-status');
    const bodyEl = document.getElementById('batch-modal-body');
    const approveBtn = document.getElementById('approve-batch-modal-btn');

    if (statusEl) {
      statusEl.textContent = batch.status.toUpperCase();
      statusEl.className = `status-badge ${batch.status === 'approved' ? 'status-badge-green-md' : 'status-badge-amber-md'}`;
    }

    const itemsHtml =
      Array.isArray(batch.items) && batch.items.length > 0
        ? batch.items
            .map(
              (it) =>
                `<div style="display:flex; justify-content:space-between; padding:6px 10px; background:var(--bg-canvas); border-radius:6px; border:1px solid var(--border-color);">
                  <span>${escapeHtml(it.item_name)}</span>
                  <strong>Qty: ${it.quantity}</strong>
                </div>`
            )
            .join('')
        : `<div style="padding:8px; color:var(--text-secondary);">Standard Production Rigging & Audio Package</div>`;

    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:12px; background:var(--bg-canvas); border-radius:8px; border:1px solid var(--border-color);">
          <div><strong>Batch Number:</strong> <span class="badge-code-primary">${escapeHtml(batch.batch_number)}</span></div>
          <div><strong>Job Sheet:</strong> ${escapeHtml(batch.job_sheet)}</div>
          <div><strong>Origin Warehouse:</strong> ${escapeHtml(batch.source_name)}</div>
          <div><strong>Destination Venue:</strong> ${escapeHtml(batch.destination_name)} (${escapeHtml(batch.destination_room)})</div>
          <div><strong>Assigned Technician:</strong> ${escapeHtml(batch.technician_name)} (${escapeHtml(batch.technician_badge)})</div>
          <div><strong>Stock Controller:</strong> ${escapeHtml(batch.stock_controller_name)}</div>
        </div>
        <div style="font-weight:600; margin-top:4px;">Equipment Manifest Items:</div>
        <div style="display:flex; flex-direction:column; gap:6px;">${itemsHtml}</div>
      `;
    }

    if (approveBtn) {
      approveBtn.style.display = batch.status === 'approved' ? 'none' : 'inline-flex';
    }

    if (modal) modal.classList.add('open');
  }

  function populateBatchCrudDropdowns() {
    const techSelect = document.getElementById('batch-crud-tech');
    if (techSelect && state.crew.length > 0) {
      const currentVal = techSelect.value;
      techSelect.innerHTML = state.crew
        .map((c) => `<option value="${c.id}">${escapeHtml(c.full_name)} (${escapeHtml(c.badge_code)} · ${escapeHtml(c.clearance_code)})</option>`)
        .join('');
      if (currentVal) techSelect.value = currentVal;
    }

    const ctrlSelect = document.getElementById('batch-crud-controller');
    if (ctrlSelect) {
      const currentVal = ctrlSelect.value;
      const controllers = state.crew.filter((c) =>
        ['stock_controller', 'stock_manager', 'admin', 'manager'].includes((c.role || '').toLowerCase()) ||
        (c.clearance_code === 'L3' || c.clearance_code === 'L4')
      );
      const list = controllers.length > 0 ? controllers : state.crew;
      ctrlSelect.innerHTML = list
        .map((c) => `<option value="${c.id}" data-name="${escapeHtml(c.full_name)}">${escapeHtml(c.full_name)} (${escapeHtml(c.role_display)})</option>`)
        .join('');
      if (currentVal) ctrlSelect.value = currentVal;
    }
  }

  function addBatchCrudItemRow(name = '', qty = 1, serial = '') {
    const container = document.getElementById('batch-crud-items-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'batch-item-row';
    row.style.cssText = 'display: flex; gap: 6px; align-items: center; margin-bottom: 4px;';
    row.innerHTML = `
      <input type="text" class="form-input js-batch-item-name" placeholder="Item name (e.g. Flight Case A)" value="${escapeHtml(name)}" required style="flex: 2; height: 30px; font-size: 11px;" />
      <input type="number" class="form-input js-batch-item-qty" placeholder="Qty" value="${qty || 1}" min="1" required style="width: 60px; height: 30px; font-size: 11px;" />
      <input type="text" class="form-input js-batch-item-serial" placeholder="Serial / Asset #" value="${escapeHtml(serial || '')}" style="flex: 1.5; height: 30px; font-size: 11px;" />
      <button type="button" class="btn-ghost-sm js-remove-batch-item" style="color: #dc2626; padding: 2px 6px; cursor: pointer; border: none; background: transparent; font-weight: bold;" title="Remove Item">✕</button>
    `;
    container.appendChild(row);
  }

  function openBatchCrudModal(batch = null) {
    populateBatchCrudDropdowns();
    const modal = document.getElementById('batch-crud-modal');
    if (!modal) return;

    const titleEl = document.getElementById('batch-crud-modal-title');
    const idInput = document.getElementById('batch-crud-id');
    const numInput = document.getElementById('batch-crud-num');
    const jobsheetInput = document.getElementById('batch-crud-jobsheet');
    const eventInput = document.getElementById('batch-crud-event');
    const movementSelect = document.getElementById('batch-crud-movement');
    const sourceInput = document.getElementById('batch-crud-source');
    const destInput = document.getElementById('batch-crud-destination');
    const roomInput = document.getElementById('batch-crud-room');
    const statusSelect = document.getElementById('batch-crud-status');
    const techSelect = document.getElementById('batch-crud-tech');
    const ctrlSelect = document.getElementById('batch-crud-controller');
    const notesInput = document.getElementById('batch-crud-notes');
    const itemsContainer = document.getElementById('batch-crud-items-container');

    if (itemsContainer) itemsContainer.innerHTML = '';

    const todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.random().toString(16).substring(2, 8).toUpperCase();

    if (batch) {
      if (titleEl) titleEl.textContent = `Edit Equipment Batch (${batch.batch_number})`;
      if (idInput) idInput.value = batch.id;
      if (numInput) numInput.value = batch.batch_number || '';
      if (jobsheetInput) jobsheetInput.value = batch.job_sheet || '';
      if (eventInput) eventInput.value = batch.event_name || '';
      if (movementSelect) movementSelect.value = batch.movement_type || 'stock_to_venue_room';
      if (sourceInput) sourceInput.value = batch.source_name || '';
      if (destInput) destInput.value = batch.destination_name || '';
      if (roomInput) roomInput.value = batch.destination_room || '';
      if (statusSelect) statusSelect.value = batch.status || 'pending';
      if (techSelect && batch.technician_id) techSelect.value = batch.technician_id;
      if (ctrlSelect) {
        if (batch.stock_controller_id) ctrlSelect.value = batch.stock_controller_id;
        else {
          const opt = Array.from(ctrlSelect.options).find(
            (o) => (o.getAttribute('data-name') || '').toLowerCase() === (batch.stock_controller_name || '').toLowerCase()
          );
          if (opt) opt.selected = true;
        }
      }
      if (notesInput) notesInput.value = batch.notes || '';

      if (Array.isArray(batch.items) && batch.items.length > 0) {
        batch.items.forEach((it) => addBatchCrudItemRow(it.item_name, it.quantity, it.serial_number));
      } else {
        addBatchCrudItemRow('Standard Equipment Package', 1, '');
      }
    } else {
      if (titleEl) titleEl.textContent = 'Create Equipment Batch';
      if (idInput) idInput.value = 0;
      if (numInput) numInput.value = `BATCH-${todayDateStr}-${randCode}`;
      if (jobsheetInput) jobsheetInput.value = `JS-${todayDateStr}-01`;
      if (eventInput) eventInput.value = state.activeCheckpoint ? state.activeCheckpoint.name : 'Production Event';
      if (movementSelect) movementSelect.value = 'stock_to_venue_room';
      if (sourceInput) sourceInput.value = 'Ndera Central Warehouse';
      if (destInput) destInput.value = 'Kigali Convention Centre';
      if (roomInput) roomInput.value = 'Main Stage (MH1)';
      if (statusSelect) statusSelect.value = 'pending';
      if (techSelect && state.crew.length > 0) techSelect.value = state.selectedCrewId || state.crew[0].id;
      if (ctrlSelect && ctrlSelect.options.length > 0) ctrlSelect.selectedIndex = 0;
      if (notesInput) notesInput.value = '';

      addBatchCrudItemRow('Flight Case A', 1, `FC-${randCode}`);
      addBatchCrudItemRow('Microphone Shure Wireless', 2, `SHUR-${randCode}`);
    }

    modal.classList.add('open');
  }

  function closeBatchCrudModal() {
    const modal = document.getElementById('batch-crud-modal');
    if (modal) modal.classList.remove('open');
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
      state.stockManager.items = Array.isArray(data.stock_items) ? data.stock_items : [];
      state.stockManager.categories = Array.isArray(data.categories) ? data.categories : [];
      state.stockManager.stats = data.stats || {
        total_warehouses: state.stockManager.warehouses.length,
        total_items: state.stockManager.items.length,
        available_count: 0,
        in_use_count: 0,
      };

      // Update sidebar badge
      const sideBadge = document.getElementById('sidebar-stock-count');
      if (sideBadge) {
        const whCount = String(state.stockManager.stats.total_warehouses || 0).padStart(2, '0');
        sideBadge.textContent = whCount;
      }

      // Update top KPI cards
      const elWh = document.getElementById('sm-stat-warehouses');
      const elIt = document.getElementById('sm-stat-items');
      const elAv = document.getElementById('sm-stat-available');
      const elIn = document.getElementById('sm-stat-inuse');
      if (elWh) elWh.textContent = state.stockManager.stats.total_warehouses;
      if (elIt) elIt.textContent = state.stockManager.stats.total_items;
      if (elAv) elAv.textContent = state.stockManager.stats.available_count;
      if (elIn) elIn.textContent = state.stockManager.stats.in_use_count;

      renderStockManager();
    } catch (err) {
      console.error('Failed to load stock manager data:', err);
    }
  }

  function renderStockManager() {
    const isWh = state.stockManager.activeTab === 'warehouses';

    // Update segmented tab buttons
    document.querySelectorAll('.js-sm-tab-btn').forEach((btn) => {
      const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-target-tab');
      btn.classList.toggle('active', tab === state.stockManager.activeTab);
    });

    // Update active view badge & tab count numbers
    const activeBadge = document.getElementById('sm-active-view-badge');
    if (activeBadge) {
      activeBadge.textContent = 'Facility Gates';
      activeBadge.className = 'status-badge status-badge-purple-sm';
    }

    const whCountNum = state.stockManager.warehouses.length;
    const evCountNum = (state.checkpoints?.event_venues || []).length;
    const smTotalKpi = document.getElementById('sm-total-cp-kpi');
    const smGatesKpi = document.getElementById('sm-gates-kpi');
    const smVenuesKpi = document.getElementById('sm-venues-kpi');
    if (smTotalKpi) smTotalKpi.textContent = String(whCountNum + evCountNum).padStart(2, '0');
    if (smGatesKpi) smGatesKpi.textContent = String(whCountNum).padStart(2, '0');
    if (smVenuesKpi) smVenuesKpi.textContent = String(evCountNum).padStart(2, '0');

    const whTabCount = document.getElementById('sm-tab-wh-count');
    const itemTabCount = document.getElementById('sm-tab-item-count');
    if (whTabCount) whTabCount.textContent = String(state.stockManager.warehouses.length).padStart(2, '0');
    if (itemTabCount) itemTabCount.textContent = String(state.stockManager.items.length).padStart(2, '0');

    const whSection = document.getElementById('sm-pane-warehouses');
    const itemsSection = document.getElementById('sm-pane-items');

    if (whSection && itemsSection) {
      if (isWh) {
        whSection.style.display = 'block';
        itemsSection.style.display = 'none';
        renderWarehousesGrid();
        const smPageControls = document.getElementById('sm-page-controls');
        if (smPageControls) {
          smPageControls.innerHTML = `<span style="font-size: 11px; color: var(--text-secondary);">Supports drag-and-drop image uploads for facility gates</span>`;
        }
      } else {
        whSection.style.display = 'none';
        itemsSection.style.display = 'block';
        renderStockItemsTable();
      }
    }

    // Update footer results count
    const footerEl = document.getElementById('sm-results-footer');
    if (footerEl) {
      if (isWh) {
        footerEl.textContent = `Showing ${state.stockManager.warehouses.length} facility ${state.stockManager.warehouses.length === 1 ? 'gate' : 'gates'}`;
      }
    }

    // Populate category dropdown
    const catSelect = document.getElementById('sm-category-filter');
    if (catSelect && catSelect.children.length <= 1) {
      const currentCat = state.stockManager.categoryFilter;
      catSelect.innerHTML =
        `<option value="all">All Categories</option>` +
        state.stockManager.categories
          .map((c) => `<option value="${escapeHtml(c)}" ${currentCat === c ? 'selected' : ''}>${escapeHtml(c)}</option>`)
          .join('');
    }

    // Populate location dropdown in stock item filters
    const locFilter = document.getElementById('sm-location-filter');
    if (locFilter && locFilter.children.length <= 1) {
      const currentLoc = state.stockManager.locationFilter;
      locFilter.innerHTML =
        `<option value="all">All Warehouses</option>` +
        state.stockManager.warehouses
          .map((w) => `<option value="${escapeHtml(w.name)}" ${currentLoc === w.name ? 'selected' : ''}>${escapeHtml(w.name)}</option>`)
          .join('');
    }

    // Populate warehouse dropdown in stock item form
    const formWhSelect = document.getElementById('item-modal-warehouse');
    if (formWhSelect) {
      formWhSelect.innerHTML = state.stockManager.warehouses
        .map((w) => `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)} (${escapeHtml(w.code)})</option>`)
        .join('');
    }
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

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: var(--bg-surface); border-radius: 8px; border: 1px dashed var(--border-color);">
          <div style="font-size: 32px; margin-bottom: 8px;">🏬</div>
          <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">No Warehouses Found</h4>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
            ${q ? `No warehouses matching "${escapeHtml(q)}"` : 'Get started by creating your first warehouse facility.'}
          </p>
          <button type="button" class="btn btn-primary-38 js-trigger-add-wh">
            <img src="assets/plus-white.svg" alt="" class="svg-icon" />
            <span>+ Add Warehouse Hub</span>
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = list
      .map((w) => {
        const bannerHtml = w.image
          ? `<img src="${escapeHtml(w.image)}" alt="${escapeHtml(w.name)}" class="wh-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="wh-card-fallback-icon" style="display:none;">🏬</div>`
          : `<div class="wh-card-fallback-icon">🏬</div>`;

        const statusBadge = w.is_active
          ? `<span class="status-badge status-badge-green-sm">Active Operational</span>`
          : `<span class="status-badge status-badge-amber-sm">Inactive / Closed</span>`;

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
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
                👤 ${escapeHtml(w.controller_name)}
              </div>
              <div style="color: var(--text-secondary); font-size: 11px;">
                ${escapeHtml(w.controller_phone)} ${w.controller_email ? `· ${escapeHtml(w.controller_email)}` : ''}
              </div>
            </div>
            <div class="wh-card-footer">
              <span class="wh-stored-pill">${w.item_count} items stored</span>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-secondary-32-sm js-edit-wh-btn" data-wh-id="${w.id}">
                  Edit
                </button>
                <button type="button" class="btn btn-secondary-32-sm js-delete-record-btn" data-del-type="warehouse" data-del-id="${w.id}" data-del-name="${escapeHtml(w.name)}" style="color: #dc2626; border-color: #fecaca;">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
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

  function renderStockItemsTable() {
    const rowsEl = document.getElementById('sm-items-rows');
    const footerEl = document.getElementById('sm-results-footer');
    const pageControlsEl = document.getElementById('sm-page-controls');
    if (!rowsEl) return;

    const q = (state.stockManager.itemSearch || '').toLowerCase().trim();
    const cat = state.stockManager.categoryFilter;
    const loc = state.stockManager.locationFilter;

    const list = state.stockManager.items.filter((it) => {
      if (cat !== 'all' && it.category !== cat) return false;
      if (loc !== 'all' && it.stock_location !== loc) return false;
      if (!q) return true;
      return (
        (it.item_name || '').toLowerCase().includes(q) ||
        (it.serial_number || '').toLowerCase().includes(q) ||
        (it.brand || '').toLowerCase().includes(q) ||
        (it.model || '').toLowerCase().includes(q) ||
        (it.notes || '').toLowerCase().includes(q)
      );
    });

    const totalItems = list.length;
    const perPageVal = state.stockManager.itemPerPage;
    const isAll = perPageVal === 'all';
    const perPage = isAll ? (totalItems || 1) : Number(perPageVal || 10);
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / perPage));

    if (state.stockManager.itemPage > totalPages) state.stockManager.itemPage = totalPages;
    if (state.stockManager.itemPage < 1) state.stockManager.itemPage = 1;

    const startIdx = isAll ? 0 : (state.stockManager.itemPage - 1) * perPage;
    const endIdx = isAll ? totalItems : Math.min(startIdx + perPage, totalItems);
    const pagedList = isAll ? list : list.slice(startIdx, endIdx);

    if (footerEl) {
      if (totalItems === 0) {
        footerEl.textContent = 'Showing 0 equipment items';
      } else if (isAll) {
        footerEl.textContent = `Showing all ${totalItems} of ${state.stockManager.items.length} inventory equipment items`;
      } else {
        footerEl.textContent = `Showing ${startIdx + 1}–${endIdx} of ${totalItems} inventory equipment items (Page ${state.stockManager.itemPage} of ${totalPages})`;
      }
    }

    if (list.length === 0) {
      if (pageControlsEl) pageControlsEl.innerHTML = '';
      rowsEl.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; background: var(--bg-surface);">
          <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
          <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">No Equipment Items Found</h4>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
            ${q || cat !== 'all' || loc !== 'all' ? 'Try adjusting your search terms or filters.' : 'Add your first piece of stock inventory.'}
          </p>
          <button type="button" class="btn btn-primary-38 js-trigger-add-item">
            <img src="assets/plus-white.svg" alt="" class="svg-icon" />
            <span>+ Add Stock Item</span>
          </button>
        </div>
      `;
      return;
    }

    const condBadges = {
      good: '<span class="status-badge status-badge-green-sm">Good</span>',
      fair: '<span class="status-badge status-badge-blue-sm">Fair</span>',
      maintenance: '<span class="status-badge status-badge-amber-sm">Repair</span>',
      damaged: '<span class="status-badge status-badge-red-sm">Damaged</span>',
    };

    const statusBadges = {
      available: '<span class="status-badge status-badge-green-sm">Available</span>',
      in_use: '<span class="status-badge status-badge-amber-sm">In Use</span>',
      maintenance: '<span class="status-badge status-badge-red-sm">Maintenance</span>',
    };

    rowsEl.innerHTML = pagedList
      .map((it) => {
        const thumbHtml = it.image
          ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.item_name)}" class="stock-thumb-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" /><span class="stock-thumb-placeholder" style="display:none;">📦</span>`
          : `<span class="stock-thumb-placeholder">📦</span>`;

        return `
        <div class="stock-item-row" data-item-id="${it.id}">
          <div class="stock-item-identity">
            <div class="stock-thumb-wrap">
              ${thumbHtml}
            </div>
            <div class="stock-name-stack">
              <span class="stock-item-title" title="${escapeHtml(it.item_name)}">${escapeHtml(it.item_name)}</span>
              <span class="stock-item-notes">${escapeHtml(it.notes || 'No notes specified')}</span>
            </div>
          </div>
          <div style="width: 170px; display: flex; flex-direction: column; gap: 2px;">
            <span class="badge-code-primary">${escapeHtml(it.serial_number)}</span>
            <span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(it.brand || '')} ${escapeHtml(it.model || '')}</span>
          </div>
          <div style="width: 140px; display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 12px; font-weight: 600;">${escapeHtml(it.category)}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(it.department || 'Warehouse')}</span>
          </div>
          <div style="width: 160px; display: flex; align-items: center; gap: 6px;">
            <img src="assets/map-pin-12.svg" alt="" class="svg-icon" style="opacity: 0.6;" />
            <span style="font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(it.stock_location)}
            </span>
          </div>
          <div style="width: 110px; display: flex; flex-direction: column; gap: 3px;">
            <span style="font-size: 12px; font-weight: 700;">Qty: ${it.quantity}</span>
            <div>${condBadges[it.condition] || condBadges.good}</div>
          </div>
          <div style="width: 110px;">
            ${statusBadges[it.status] || statusBadges.available}
          </div>
          <div style="width: 100px; display: flex; justify-content: flex-end; gap: 6px;">
            <button type="button" class="btn btn-secondary-32-sm js-edit-item-btn" data-item-id="${it.id}">
              Edit
            </button>
            <button type="button" class="btn btn-secondary-32-sm js-delete-record-btn" data-del-type="item" data-del-id="${it.id}" data-del-name="${escapeHtml(it.item_name)}" style="color: #dc2626;">
              Delete
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Render pagination controls
    if (pageControlsEl) {
      if (totalPages <= 1) {
        pageControlsEl.innerHTML = '';
      } else {
        const curPage = state.stockManager.itemPage;
        let controlsHtml = `
          <button type="button" class="btn btn-secondary-32-sm js-sm-items-prev-page" ${curPage <= 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} aria-label="Previous Page">
            <span>&larr; Prev</span>
          </button>
        `;

        const pages = getPaginationPageNumbers(curPage, totalPages);
        pages.forEach((p) => {
          if (p === '...') {
            controlsHtml += `<span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; color: var(--text-muted); font-size: 12px;">…</span>`;
          } else {
            const isActive = p === curPage;
            controlsHtml += `
              <button type="button" class="page-number-btn ${isActive ? 'active' : ''} js-sm-items-page-num" data-page="${p}" aria-label="Page ${p}">
                ${p}
              </button>
            `;
          }
        });

        controlsHtml += `
          <button type="button" class="btn btn-secondary-32-sm js-sm-items-next-page" ${curPage >= totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} aria-label="Next Page">
            <span>Next &rarr;</span>
          </button>
        `;

        pageControlsEl.innerHTML = controlsHtml;
      }
    }
  }

  function openWarehouseModal(warehouseId = null) {
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

        if (wh.image) {
          setDropzonePreview('wh', wh.image, wh.image.split('/').pop());
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Warehouse';
      if (idInput) idInput.value = '0';
      if (openTimeInput) openTimeInput.value = '08:00';
      if (closeTimeInput) closeTimeInput.value = '18:00';
      if (ctrlInput) ctrlInput.value = 'Mirene Uwase';
      if (pinInput) pinInput.value = '';
    }

    modal.classList.add('open');
  }

  function updateItemModalMatchCount() {
    const nameInput = document.getElementById('item-modal-name');
    const brandInput = document.getElementById('item-modal-brand');
    const modelInput = document.getElementById('item-modal-model');
    const idInput = document.getElementById('item-modal-id');
    const badgeEl = document.getElementById('item-modal-match-count');
    if (!nameInput || !badgeEl) return;

    const curId = Number(idInput?.value || 0);
    const name = (nameInput.value || '').trim().toLowerCase();
    const brand = (brandInput?.value || '').trim().toLowerCase();
    const model = (modelInput?.value || '').trim().toLowerCase();

    if (!name) {
      badgeEl.textContent = '0';
      return;
    }

    const matches = (state.stockManager.items || []).filter((other) => {
      if (Number(other.id) === curId) return false;
      if ((other.item_name || '').trim().toLowerCase() !== name) return false;
      if (model && other.model && other.model.trim().toLowerCase() !== model) return false;
      if (brand && other.brand && other.brand.trim().toLowerCase() !== brand) return false;
      return true;
    });

    badgeEl.textContent = String(matches.length);

    // If current dropzone has no preview, but matching sibling has image, preview the shared image
    const previewEl = document.getElementById('item-dropzone-preview');
    const fileInput = document.getElementById('item-modal-image');
    const hasManualFile = fileInput && fileInput.files && fileInput.files.length > 0;
    const curHasImg = previewEl && previewEl.style.display !== 'none';
    if (!curHasImg && !hasManualFile) {
      const siblingWithImg = matches.find((m) => m.image && m.image.trim() !== '');
      if (siblingWithImg) {
        setDropzonePreview('item', siblingWithImg.image, `Shared photo from identical units (${siblingWithImg.serial_number || 'Stock Unit'})`);
      }
    }
  }

  function openStockItemModal(itemId = null) {
    const modal = document.getElementById('stock-item-crud-modal');
    if (!modal) return;
    const form = document.getElementById('stock-item-crud-form');
    if (form) form.reset();

    const titleEl = document.getElementById('item-modal-title');
    const idInput = document.getElementById('item-modal-id');
    const nameInput = document.getElementById('item-modal-name');
    const serialInput = document.getElementById('item-modal-serial');
    const catSelect = document.getElementById('item-modal-category');
    const brandInput = document.getElementById('item-modal-brand');
    const modelInput = document.getElementById('item-modal-model');
    const whSelect = document.getElementById('item-modal-warehouse');
    const qtyInput = document.getElementById('item-modal-qty');
    const condSelect = document.getElementById('item-modal-condition');
    const statusSelect = document.getElementById('item-modal-status');
    const notesInput = document.getElementById('item-modal-notes');

    // Reset dropzone
    resetDropzone('item');

    // Populate warehouses in form select if needed
    if (whSelect && state.stockManager.warehouses.length > 0) {
      whSelect.innerHTML = state.stockManager.warehouses
        .map((w) => `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)} (${escapeHtml(w.code)})</option>`)
        .join('');
    }

    if (itemId) {
      const it = state.stockManager.items.find((i) => Number(i.id) === Number(itemId));
      if (it) {
        if (titleEl) titleEl.textContent = 'Edit Stock Equipment Item';
        if (idInput) idInput.value = it.id;
        if (nameInput) nameInput.value = it.item_name || '';
        if (serialInput) serialInput.value = it.serial_number || '';
        if (catSelect) catSelect.value = it.category || 'Audio';
        if (brandInput) brandInput.value = it.brand || '';
        if (modelInput) modelInput.value = it.model || '';
        if (whSelect) whSelect.value = it.stock_location || (state.stockManager.warehouses[0]?.name || '');
        if (qtyInput) qtyInput.value = it.quantity || 1;
        if (condSelect) condSelect.value = it.condition || 'good';
        if (statusSelect) statusSelect.value = it.status || 'available';
        if (notesInput) notesInput.value = it.notes || '';

        if (it.image) {
          setDropzonePreview('item', it.image, it.image.split('/').pop());
        } else {
          // Check sibling immediately
          const siblingWithImg = state.stockManager.items.find((other) => {
            if (Number(other.id) === Number(it.id)) return false;
            if ((other.item_name || '').trim().toLowerCase() !== (it.item_name || '').trim().toLowerCase()) return false;
            if (it.model && other.model && other.model.trim().toLowerCase() !== it.model.trim().toLowerCase()) return false;
            return !!(other.image && other.image.trim());
          });
          if (siblingWithImg) {
            setDropzonePreview('item', siblingWithImg.image, `Shared photo from identical units (${siblingWithImg.serial_number || 'Unit'})`);
          }
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Stock Item';
      if (idInput) idInput.value = '0';
      if (qtyInput) qtyInput.value = 1;
      if (condSelect) condSelect.value = 'good';
      if (statusSelect) statusSelect.value = 'available';
    }

    updateItemModalMatchCount();
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
              ${escapeHtml(d.description || 'General organizational division and equipment unit.')}
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
    return roleTokens.includes(rawRole);
  }

  function buildSidebarNavButtonHtml(item) {
    const target = String(item.nav_target || 'overview');
    const isShortcut = target.startsWith('action:');
    const isCustomUrl = target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#') || target.endsWith('.html') || target.endsWith('.php');
    const isActive = !isShortcut && !isCustomUrl && (state.activeScreen === target || (target === 'access-matrix' && state.activeScreen === 'analytics'));
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
      'stock-manager', 'access-matrix', 'analytics',
      'shift-relief', 'calltime', 'rollcall', 'station-lock', 'reset-scans',
      'action:shift-relief', 'action:calltime', 'action:rollcall', 'action:station-lock', 'action:reset-scans',
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

  function buildRollCallListHtml(list, emptyText = 'No crew members are currently checked in on-site.') {
    if (!Array.isArray(list) || list.length === 0) {
      return `<div style="padding: 24px; text-align: center; font-size: 12px; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 8px;">${escapeHtml(emptyText)}</div>`;
    }
    return list.map((rc) => `
      <div class="timeline-event-card" style="align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="avatar-circle avatar-jl">${escapeHtml(rc.initials)}</div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-size: 12px; font-weight: 700;">${escapeHtml(rc.full_name)}</span>
              <span class="tier-code-badge tier-code-${escapeHtml(rc.clearance_code)}">${escapeHtml(rc.clearance_code)}</span>
              <span class="badge-code-primary">${escapeHtml(rc.badge_code)}</span>
            </div>
            <span style="font-size: 11px; color: var(--text-secondary);">
              ${escapeHtml(rc.role_display)} (${escapeHtml(rc.department)}) · At <strong>${escapeHtml(rc.checkpoint_name)}</strong>
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="ts-mini-pill in">In: ${escapeHtml(rc.check_in_time)}</span>
          <button type="button" class="gate-btn gate-btn-checkout js-rollcall-checkout-btn" data-badge="${escapeHtml(rc.badge_code)}">
            Checkout Now
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderVenueSecurityPage() {
    const venues = state.checkpoints?.event_venues || [];
    const rcList = state.rollCallList || [];
    const crewList = state.crew || [];
    const venueOnsite = rcList.filter((r) => String(r.checkpoint_type || '') === 'event_venue');
    const venueControllers = crewList.filter((c) => String(c.assigned_checkpoint_type || '') === 'event_venue' && Number(c.is_active ?? 1) !== 0);
    const activeVenue = state.checkpointType === 'event_venue'
      ? (venues.find((v) => String(v.id) === String(state.checkpointId)) || venues[0])
      : venues[0];

    const elTotal = document.getElementById('vs-kpi-venues');
    const elOnsite = document.getElementById('vs-kpi-onsite');
    const elCtrls = document.getElementById('vs-kpi-controllers');
    const elCt = document.getElementById('vs-kpi-calltime');
    const elCtCp = document.getElementById('vs-kpi-calltime-cp');
    const elBadge = document.getElementById('vs-stations-count-badge');
    const gridEl = document.getElementById('vs-venues-grid');

    if (elTotal) elTotal.textContent = String(venues.length);
    if (elOnsite) elOnsite.textContent = String(venueOnsite.length);
    if (elCtrls) elCtrls.textContent = String(venueControllers.length);
    if (elCt) elCt.textContent = activeVenue?.call_time || '08:00';
    if (elCtCp) elCtCp.textContent = activeVenue ? activeVenue.name : 'No Event Venue';
    if (elBadge) elBadge.textContent = `${venues.length} Venues`;

    if (!gridEl) return;
    if (venues.length === 0) {
      gridEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No Event Venues registered yet. Create one under Venues &amp; Facility Gates.</div>';
      return;
    }

    gridEl.innerHTML = venues.map((v) => {
      const onsiteCount = rcList.filter((r) => String(r.checkpoint_type) === 'event_venue' && String(r.checkpoint_id) === String(v.id)).length;
      const assignedCtrls = crewList.filter((c) => String(c.assigned_checkpoint_type || '') === 'event_venue' && String(c.assigned_checkpoint_id || '') === String(v.id));
      const ctrlLabel = assignedCtrls.length > 0
        ? assignedCtrls.map((u) => escapeHtml(u.full_name)).join(', ')
        : (v.lead_name ? escapeHtml(v.lead_name) : 'Unassigned');
      return `
        <div style="border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; background: var(--surface-white); display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <div>
              <strong style="font-size: 14px; color: var(--text-primary);">${escapeHtml(v.name)}</strong>
              <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(v.location || v.venue_location || 'Kigali Event Venue')}</div>
            </div>
            <span class="status-badge ${onsiteCount > 0 ? 'status-badge-green-sm' : 'status-badge-purple-sm'}">${onsiteCount} On-Site</span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 3px;">
            <span>Call Time: <strong>${escapeHtml(v.call_time || '08:00')} CAT</strong></span>
            <span>Gate Controller / Lead: <strong>${ctrlLabel}</strong></span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 6px;">
            <button type="button" class="btn btn-primary-32 js-vs-launch-kiosk" data-cp-id="${escapeHtml(String(v.id))}" data-cp-name="${escapeHtml(v.name)}" style="flex: 1;">
              Launch Gate Kiosk
            </button>
            <button type="button" class="btn btn-secondary-32-sm js-vs-edit-calltime" data-cp-id="${escapeHtml(String(v.id))}" data-cp-name="${escapeHtml(v.name)}" data-call-time="${escapeHtml(v.call_time || '08:00')}">
              Call Time
            </button>
          </div>
        </div>
      `;
    }).join('');
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
      if (cpFilter !== 'all' && String(rc.checkpoint_name || '') !== cpFilter) return false;
      if (q) {
        const hay = `${rc.full_name} ${rc.badge_code} ${rc.role_display} ${rc.department} ${rc.checkpoint_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const listEl = document.getElementById('page-rollcall-list');
    if (listEl) {
      listEl.innerHTML = buildRollCallListHtml(filtered, rcList.length === 0 ? 'No crew members are currently checked in on-site.' : 'No on-site personnel match your search filter.');
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

  function renderDedicatedNavPages(onlyScreen = null) {
    if (!onlyScreen || onlyScreen === 'venue-security') renderVenueSecurityPage();
    if (!onlyScreen || onlyScreen === 'shift-relief') renderShiftReliefPage();
    if (!onlyScreen || onlyScreen === 'calltime') renderCallTimePage();
    if (!onlyScreen || onlyScreen === 'rollcall') renderRollCallPage();
    if (!onlyScreen || onlyScreen === 'station-lock') renderStationLockPage();
    if (!onlyScreen || onlyScreen === 'reset-scans') renderResetScansPage();
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
            <div class="col-user-actions" style="width: 130px; display: flex; justify-content: flex-end; align-items: center; gap: 6px;">
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
          ? 'warehouse facility'
          : type === 'user'
          ? 'personnel record & badge credentials for'
          : type === 'clearance_tier'
          ? 'security clearance level'
          : 'stock item';
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
        showToast('Please select a valid image file (JPG, PNG, WEBP)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setDropzonePreview(prefix, e.target.result, file.name);
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
        switchScreen('analytics', 'matrix-config-section');
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
        if (isCurrentUserStockController() || isCurrentUserTechnician()) {
          showToast('Access Restricted: Roll-Call inspection requires Supervisor or Administrator privileges.');
          return;
        }
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
        const btn = e.target.closest('.nav-item');
        if (!btn) return;
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
          switchScreen('analytics');
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
    if (userTrigger && userDropdown) {
      userTrigger.addEventListener('click', (e) => {
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
      });
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

      // Phase 1: Kiosk Decision Action Buttons (Approve / Decline / Override)
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

      // 4. User Activity Timeline Card Click -> Open Dedicated Audit & Transit Log Modal
      const tlCard = e.target.closest('.timeline-event-card[data-timeline-uid]');
      if (tlCard) {
        const uid = Number(tlCard.getAttribute('data-timeline-uid'));
        const tlId = Number(tlCard.getAttribute('data-timeline-id'));
        const member = (state.crew || []).find((m) => Number(m.id) === uid);
        const tlItem = (state.activityTimeline || []).find((t) => Number(t.id) === tlId);

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

      // 7. Open Batch Modal button
      const openBatchBtn = e.target.closest('.js-open-batch-modal');
      if (openBatchBtn) {
        openBatchModal(Number(openBatchBtn.getAttribute('data-batch-id')));
        return;
      }

      // 8. Open Call Time modal from table row
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

      // 8b. Open Event Assign Modal from table row
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

      // 8. Approve Batch button
      const approveBatchBtn = e.target.closest('.js-approve-batch-btn');
      if (approveBatchBtn) {
        const bid = Number(approveBatchBtn.getAttribute('data-batch-id'));
        await fetch('api.php?action=approve_batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve_batch', batch_id: bid, status: 'approved' }),
        });
        await fetchBootstrap(true);
        showToast(`Batch #${bid} approved for warehouse dispatch`);
        return;
      }

      // 8b. Edit Batch button
      const editBatchBtn = e.target.closest('.js-edit-batch');
      if (editBatchBtn) {
        const bid = Number(editBatchBtn.getAttribute('data-batch-id'));
        const batch = state.batches.find((b) => Number(b.id) === bid);
        if (batch) openBatchCrudModal(batch);
        return;
      }

      // 8c. Delete Batch button
      const delBatchBtn = e.target.closest('.js-delete-batch');
      if (delBatchBtn) {
        const bid = Number(delBatchBtn.getAttribute('data-batch-id'));
        const num = delBatchBtn.getAttribute('data-batch-num') || `Batch #${bid}`;
        const { confirmed: doDel } = await showConfirmModal({
          title: 'Delete Record',
          message: `Are you sure you want to permanently delete "${num}"? All linked manifest items will also be removed.`,
          confirmText: 'Delete Record',
          tone: 'danger',
        });
        if (!doDel) return;

        try {
          const res = await fetch('api.php?action=delete_batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_batch', id: bid }),
          });
          const d = await res.json();
          if (d && d.ok) {
            if (Array.isArray(d.batches)) state.batches = d.batches;
            else state.batches = state.batches.filter((b) => Number(b.id) !== bid);
            renderBatchesAndMatrixScreen();
            showToast(d.message || `Batch "${num}" deleted successfully.`);
          } else {
            showToast(d.error || 'Failed to delete batch.');
          }
        } catch (err) {
          state.batches = state.batches.filter((b) => Number(b.id) !== bid);
          renderBatchesAndMatrixScreen();
          showToast(`Batch "${num}" deleted.`);
        }
        return;
      }

      // 8d. Remove item row in Batch CRUD Modal
      const remItemBtn = e.target.closest('.js-remove-batch-item');
      if (remItemBtn) {
        const row = remItemBtn.closest('.batch-item-row');
        if (row) row.remove();
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

      // 12. Stock Manager: Edit Item
      const editItemBtn = e.target.closest('.js-edit-item-btn');
      if (editItemBtn) {
        openStockItemModal(Number(editItemBtn.getAttribute('data-item-id')));
        return;
      }

      // 13. Stock Manager: Add Item shortcut
      const trigAddItem = e.target.closest('.js-trigger-add-item');
      if (trigAddItem) {
        openStockItemModal();
        return;
      }

      // 14. Stock Manager: Delete Record
      const delBtn = e.target.closest('.js-delete-record-btn');
      if (delBtn) {
        openDeleteModal(
          delBtn.getAttribute('data-del-type'),
          delBtn.getAttribute('data-del-id'),
          delBtn.getAttribute('data-del-name')
        );
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

      // 20. Stock Items Pagination: Prev
      const smPrevBtn = e.target.closest('.js-sm-items-prev-page');
      if (smPrevBtn && !smPrevBtn.hasAttribute('disabled')) {
        if (state.stockManager.itemPage > 1) {
          state.stockManager.itemPage--;
          renderStockItemsTable();
        }
        return;
      }

      // 21. Stock Items Pagination: Next
      const smNextBtn = e.target.closest('.js-sm-items-next-page');
      if (smNextBtn && !smNextBtn.hasAttribute('disabled')) {
        state.stockManager.itemPage++;
        renderStockItemsTable();
        return;
      }

      // 22. Stock Items Pagination: Page Num
      const smPageBtn = e.target.closest('.js-sm-items-page-num');
      if (smPageBtn) {
        const targetPage = Number(smPageBtn.getAttribute('data-page'));
        if (targetPage && targetPage !== state.stockManager.itemPage) {
          state.stockManager.itemPage = targetPage;
          renderStockItemsTable();
        }
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

    // Checkpoints Tabs (Screen 2)
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

    const vsVenuesGrid = document.getElementById('vs-venues-grid');
    if (vsVenuesGrid) {
      vsVenuesGrid.addEventListener('click', (e) => {
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

    // Custom Nav Page Configure Shortcut
    const customNavManageBtn = document.getElementById('custom-nav-manage-btn');
    if (customNavManageBtn) {
      customNavManageBtn.addEventListener('click', () => {
        if (!isCurrentUserAdmin()) return;
        state.usersViewMode = 'navigation';
        switchScreen('users');
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

    // Real-Time Facility & Personnel Allocation Map: View Switcher (Option A, Option B, Chart)
    const btnToggleOptA = document.getElementById('toggle-view-option-a') || document.getElementById('toggle-view-map');
    const btnToggleOptB = document.getElementById('toggle-view-option-b');
    const btnToggleChart = document.getElementById('toggle-view-chart');
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
    if (btnCollapseOptA) {
      btnCollapseOptA.addEventListener('click', toggleOptionACollapse);
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
        const notes = document.getElementById('alloc-notes')?.value || 'Live dispatch via Map Radar';
        const submitBtn = document.getElementById('submit-alloc-btn');

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>Dispatching ${userIds.length} Crew...</span>`;
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
            submitBtn.innerHTML = `<span>Confirm Allocation &amp; Dispatch →</span>`;
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
      if (!listEl) return;
      const query = String(rosterSearchInput ? rosterSearchInput.value : '').trim().toLowerCase();
      const filtered = (state.crew || []).filter((u) => {
        if (!u) return false;
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
        const dateLabel = document.getElementById('roster-event-date-label');
        if (callInput) callInput.value = (facility.call_time || '08:00').slice(0, 5);
        if (pmInput) pmInput.value = facility.project_manager || '';
        if (dateLabel) dateLabel.textContent = facility.date ? `Date: ${facility.date}` : '';
        populateRosterTechLeadOptions(facility.tech_lead || facility.lead_name || '');
      }

      const assignedCrew = getFacilityCrewMembers(facility, state.crew || []);
      if (assignedCountEl) assignedCountEl.textContent = String(assignedCrew.length);

      if (assignedListEl) {
        if (assignedCrew.length === 0) {
          assignedListEl.innerHTML = '<span style="font-size: 12px; color: var(--text-secondary);">No crew currently assigned to this stock or venue.</span>';
        } else {
          assignedListEl.innerHTML = assignedCrew.map((member) => `
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: var(--surface-subtle, #f1f5f9); border: 1px solid var(--border-color); font-size: 11.5px; font-weight: 600;">
              <span>${escapeHtml(member.full_name || 'Member #' + member.id)}</span>
              <button type="button" class="js-roster-unassign-btn" data-user-id="${Number(member.id)}" data-user-name="${escapeHtml(member.full_name || '')}" title="Unassign personnel" style="border: none; background: transparent; color: #dc2626; font-weight: 700; cursor: pointer; padding: 0 2px; line-height: 1;">✕</button>
            </span>
          `).join('');
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
            assigned_technicians: crewToSave,
          }, 'Event call-time and details saved.');
        } catch (err) {
          console.error('save_event error:', err);
          showToast('⚠️ Error saving event details.');
        } finally {
          rosterSaveEventBtn.disabled = false;
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
        const crewIds = Array.from(rosterCheckedIds);

        rosterAssignCrewBtn.disabled = true;
        try {
          await postRosterAction('assign_event_crew', {
            facility_name: facilityName,
            call_time: callTime,
            tech_lead: techLead,
            project_manager: pm,
            assigned_technicians: crewIds,
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

    // Modals: Batch Custody Modal
    const batchModal = document.getElementById('batch-custody-modal');
    const closeBatch = document.getElementById('close-batch-modal');
    if (closeBatch && batchModal) {
      closeBatch.addEventListener('click', () => batchModal.classList.remove('open'));
    }
    const approveModalBtn = document.getElementById('approve-batch-modal-btn');
    if (approveModalBtn && batchModal) {
      approveModalBtn.addEventListener('click', async () => {
        if (!state.inspectedBatchId) return;
        await fetch('api.php?action=approve_batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve_batch',
            batch_id: state.inspectedBatchId,
            status: 'approved',
          }),
        });
        batchModal.classList.remove('open');
        await fetchBootstrap(true);
        showToast(`Batch #${state.inspectedBatchId} approved`);
      });
    }

    // Batch CRUD Modal triggers & submission
    const openCreateBatchBtn = document.getElementById('open-create-batch-btn');
    if (openCreateBatchBtn) {
      openCreateBatchBtn.addEventListener('click', () => openBatchCrudModal(null));
    }
    const addBatchItemBtn = document.getElementById('batch-crud-add-item-btn');
    if (addBatchItemBtn) {
      addBatchItemBtn.addEventListener('click', () => addBatchCrudItemRow('', 1, ''));
    }
    document.querySelectorAll('.js-close-batch-crud-modal').forEach((btn) => {
      btn.addEventListener('click', closeBatchCrudModal);
    });

    const batchCrudForm = document.getElementById('batch-crud-form');
    if (batchCrudForm) {
      batchCrudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('batch-crud-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving Batch...';
        }

        const id = Number(document.getElementById('batch-crud-id').value || 0);
        const batch_number = document.getElementById('batch-crud-num').value.trim();
        const job_sheet = document.getElementById('batch-crud-jobsheet').value.trim();
        const event_name = document.getElementById('batch-crud-event').value.trim();
        const movement_type = document.getElementById('batch-crud-movement').value;
        const source_name = document.getElementById('batch-crud-source').value.trim();
        const destination_name = document.getElementById('batch-crud-destination').value.trim();
        const destination_room = document.getElementById('batch-crud-room').value.trim();
        const status = document.getElementById('batch-crud-status').value;
        const techSelect = document.getElementById('batch-crud-tech');
        const technician_id = Number(techSelect ? techSelect.value : 0);
        const ctrlSelect = document.getElementById('batch-crud-controller');
        const stock_controller_id = Number(ctrlSelect ? ctrlSelect.value : 0);
        const stock_controller_name = ctrlSelect && ctrlSelect.selectedOptions[0]
          ? ctrlSelect.selectedOptions[0].getAttribute('data-name') || ctrlSelect.selectedOptions[0].text
          : 'Mirene Uwase';
        const notes = document.getElementById('batch-crud-notes').value.trim();

        // Extract manifest items
        const itemRows = document.querySelectorAll('#batch-crud-items-container .batch-item-row');
        const items = [];
        itemRows.forEach((row) => {
          const nameInp = row.querySelector('.js-batch-item-name');
          const qtyInp = row.querySelector('.js-batch-item-qty');
          const serialInp = row.querySelector('.js-batch-item-serial');
          const item_name = nameInp ? nameInp.value.trim() : '';
          const quantity = qtyInp ? Number(qtyInp.value || 1) : 1;
          const serial_number = serialInp ? serialInp.value.trim() : '';
          if (item_name) {
            items.push({ item_name, quantity, serial_number, status });
          }
        });

        try {
          const res = await fetch('api.php?action=save_batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_batch',
              id,
              batch_number,
              job_sheet,
              event_name,
              movement_type,
              source_name,
              destination_name,
              destination_room,
              status,
              technician_id,
              stock_controller_id,
              stock_controller_name,
              notes,
              items,
            }),
          });
          const data = await res.json();
          if (data && data.ok) {
            if (Array.isArray(data.batches)) state.batches = data.batches;
            closeBatchCrudModal();
            renderBatchesAndMatrixScreen();
            showToast(data.message || `Equipment batch "${batch_number}" saved!`);
          } else {
            showToast(data.error || 'Failed to save equipment batch.');
          }
        } catch (err) {
          console.error(err);
          showToast('Batch saved (Offline fallback)');
          closeBatchCrudModal();
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Equipment Batch';
          }
        }
      });
    }

    // Batches Table Search & Filters
    const batchesSearchInp = document.getElementById('batches-search-input');
    if (batchesSearchInp) {
      batchesSearchInp.addEventListener('input', (e) => {
        state.batchesSearch = e.target.value;
        renderBatchesAndMatrixScreen();
      });
    }
    const batchesFilterStatus = document.getElementById('batches-filter-status');
    if (batchesFilterStatus) {
      batchesFilterStatus.addEventListener('change', (e) => {
        state.batchesFilterStatus = e.target.value;
        renderBatchesAndMatrixScreen();
      });
    }
    const batchesFilterMovement = document.getElementById('batches-filter-movement');
    if (batchesFilterMovement) {
      batchesFilterMovement.addEventListener('change', (e) => {
        state.batchesFilterMovement = e.target.value;
        renderBatchesAndMatrixScreen();
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
        'Equipment Custody Batches',
        'Operational Notes'
      ];

      const rows = targetList.map((c) => {
        const stateDisplay = c.daily_state === 'checked_in'
          ? 'Checked In (On-Site)'
          : (c.daily_state === 'checked_out' ? 'Checked Out' : 'Not Arrived');
        const punctuality = c.punctuality || (c.punctuality_code ? c.punctuality_code.toUpperCase().replace('_', ' ') : 'ON TIME');
        const duration = formatOnSiteDuration(c.check_in_time, c.check_out_time);
        const batches = Array.isArray(c.equipment_batches) && c.equipment_batches.length > 0
          ? c.equipment_batches.map((b) => (typeof b === 'object' ? b.batch_number : b)).join('; ')
          : 'None';
        const facType = c.last_checkpoint_type === 'stock_warehouse'
          ? 'Stock Warehouse'
          : (c.last_checkpoint_type === 'event_venue' ? 'Event Venue' : ((state.activeCheckpoint && state.activeCheckpoint.type === 'stock_warehouse') ? 'Stock Warehouse' : 'Event Venue'));
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
          `"${batches.replace(/"/g, '""')}"`,
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
        renderWarehousesGrid();
      });
    }

    const itemSearch = document.getElementById('sm-item-search-input');
    if (itemSearch) {
      itemSearch.addEventListener('input', (e) => {
        state.stockManager.itemSearch = e.target.value;
        state.stockManager.itemPage = 1;
        renderStockItemsTable();
      });
    }

    const catFilter = document.getElementById('sm-category-filter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        state.stockManager.categoryFilter = e.target.value;
        state.stockManager.itemPage = 1;
        renderStockItemsTable();
      });
    }

    const locFilter = document.getElementById('sm-location-filter');
    if (locFilter) {
      locFilter.addEventListener('change', (e) => {
        state.stockManager.locationFilter = e.target.value;
        state.stockManager.itemPage = 1;
        renderStockItemsTable();
      });
    }

    const smPageSizeFilter = document.getElementById('sm-page-size-filter');
    if (smPageSizeFilter) {
      smPageSizeFilter.addEventListener('change', (e) => {
        state.stockManager.itemPerPage = e.target.value === 'all' ? 'all' : Number(e.target.value);
        state.stockManager.itemPage = 1;
        renderStockItemsTable();
      });
    }

    // Modal open buttons
    const addWhBtn = document.getElementById('open-add-warehouse-btn');
    if (addWhBtn) addWhBtn.addEventListener('click', () => openWarehouseModal());

    const addItemBtn = document.getElementById('open-add-stock-btn');
    if (addItemBtn) addItemBtn.addEventListener('click', () => openStockItemModal());

    // Modal close buttons
    const closeWhBtn = document.getElementById('close-wh-modal');
    if (closeWhBtn) {
      closeWhBtn.addEventListener('click', () => {
        document.getElementById('warehouse-crud-modal')?.classList.remove('open');
      });
    }

    const closeItemBtn = document.getElementById('close-item-modal');
    if (closeItemBtn) {
      closeItemBtn.addEventListener('click', () => {
        document.getElementById('stock-item-crud-modal')?.classList.remove('open');
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
    setupDropzoneEvents('item');
    setupDropzoneEvents('user');

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

    // Stock Item CRUD Form Submit
    const itemForm = document.getElementById('stock-item-crud-form');
    if (itemForm) {
      itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-item-btn');
        if (saveBtn) saveBtn.disabled = true;

        const cat = document.getElementById('item-modal-category').value;
        const fd = new FormData();
        fd.append('id', document.getElementById('item-modal-id').value);
        fd.append('item_name', document.getElementById('item-modal-name').value);
        fd.append('serial_number', document.getElementById('item-modal-serial').value);
        fd.append('category', cat);
        fd.append('brand', document.getElementById('item-modal-brand').value);
        fd.append('model', document.getElementById('item-modal-model').value);
        fd.append('department', cat);
        fd.append('stock_location', document.getElementById('item-modal-warehouse').value);
        fd.append('quantity', document.getElementById('item-modal-qty').value);
        fd.append('condition', document.getElementById('item-modal-condition').value);
        fd.append('status', document.getElementById('item-modal-status').value);
        fd.append('notes', document.getElementById('item-modal-notes').value);

        const syncCheck = document.getElementById('item-modal-sync-identical');
        fd.append('sync_identical', syncCheck && syncCheck.checked ? '1' : '0');

        const fileInput = document.getElementById('item-modal-image');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fd.append('image', fileInput.files[0]);
        }

        try {
          const res = await fetch('api.php?action=save_stock_item', {
            method: 'POST',
            body: fd,
          });
          const data = await res.json();
          if (data && data.ok) {
            showToast(data.message || 'Stock item saved successfully');
            document.getElementById('stock-item-crud-modal')?.classList.remove('open');
            await loadStockManagerData();
          } else {
            showToast(data.error || 'Failed to save stock item');
          }
        } catch (err) {
          showToast('Error communicating with server');
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    // Dynamic match count update when typing item name, brand, model in modal
    ['item-modal-name', 'item-modal-brand', 'item-modal-model'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => updateItemModalMatchCount());
    });

    // Sync all identical images across inventory
    const syncAllImagesBtn = document.getElementById('sm-sync-all-images-btn');
    if (syncAllImagesBtn) {
      syncAllImagesBtn.addEventListener('click', async () => {
        syncAllImagesBtn.disabled = true;
        const icon = syncAllImagesBtn.querySelector('img');
        if (icon) icon.style.animation = 'spin 0.8s linear infinite';

        try {
          const res = await fetch('api.php?action=sync_all_stock_images');
          const data = await res.json();
          if (data && data.ok) {
            showToast(data.message || 'Photos synced across matching equipment groups');
            await loadStockManagerData();
          } else {
            showToast(data.error || 'Failed to sync images');
          }
        } catch (err) {
          showToast('Error communicating with server');
        } finally {
          syncAllImagesBtn.disabled = false;
          if (icon) icon.style.animation = '';
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

        let action = 'delete_stock_item';
        if (type === 'warehouse') action = 'delete_warehouse';
        else if (type === 'user') action = 'delete_user';
        else if (type === 'clearance_tier') action = 'delete_clearance_tier';
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
          title: 'Live Kigali Allocation Radar & Traffic',
          description: 'Inspect where crew members are currently checked in or in transit across Kigali venues and logistics gates.',
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
    initSidebarCollapse();
    initRosterLayoutToggle();
    bindEvents();
    initShiftReliefControls();
    initPhase2Controls();
    initTourControls();
    if (window.location.hash === '#pane-kiosk') {
      switchScreen('terminals', 'pane-kiosk');
    }
    await fetchBootstrap(false);
    syncOfflineScans(false);
    startLiveGateSync();
    if (isCurrentUserStockController()) {
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
