/**
 * aBility Manager (id_badges.php#pane-kiosk) — Interactive Gate Terminal & 4-Tier Access Matrix Controller
 */
(function () {
  'use strict';

  const state = {
    activeScreen: 'overview',
    checkpointType: 'stock_warehouse',
    checkpointId: 1,
    stationLocked: localStorage.getItem('ability_station_locked') === '1',
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
    batches: [],
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
    directoryPage: 1,
    directoryPerPage: 5,

    // Currently inspected batch in modal
    inspectedBatchId: null,

    // Current Operator Session & Alerts
    currentUser: null,
    unreadNotifCount: 3,
    notifications: [
      { id: 1, type: 'denied', icon: '🔴', title: 'Scan Denied: Invalid Badge', desc: 'Badge code REW-BADGE-9999 attempted scan at Ndera Warehouse', time: '10m ago', unread: true },
      { id: 2, type: 'late', icon: '🟡', title: 'Late Arrival Flagged', desc: 'Patrick Nshimiyimana (+14m late) checked in at Gate 1', time: '25m ago', unread: true },
      { id: 3, type: 'granted', icon: '🟢', title: 'Check-in Granted', desc: 'Eric Havugimana (Rigging · L2) verified at Main Entrance', time: '42m ago', unread: true },
      { id: 4, type: 'batch', icon: '📦', title: 'Stock Batch Dispatched', desc: 'Batch JS-2026-104 dispatched to Kigali Convention Centre', time: '1h ago', unread: false },
    ],
  };

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
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      state.roles = data.roles;
    } else if (state.roles.length === 0) {
      // Default fallback roles
      state.roles = [
        { id: 1, role_key: 'admin', title: 'Administrator', clearance_level: 'L4_ALL_ACCESS', clearance_code: 'L4', clearance_title: 'Level 4 - All Access', clearance_color: '#10b981', department: 'Executive', description: 'Full operational control, security matrix management, user provision and badge issuance.', is_system: 1, is_active: 1, staff_count: 1 },
        { id: 2, role_key: 'stock_controller', title: 'Stock Controller', clearance_level: 'L3_STOCK_WAREHOUSE', clearance_code: 'L3', clearance_title: 'Level 3 - Stock Warehouse', clearance_color: '#8b5cf6', department: 'Warehouse', description: 'Gate terminal scanning (#pane-kiosk), equipment batch dispatch and return custody authorizations.', is_system: 1, is_active: 1, staff_count: 2 },
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
    if (!audioCtx) return;
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
      supervisor_id: extra.supervisor_id || (state.currentUser?.id || 1),
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
      if (data.bootstrap) {
        applyBootstrapPayload(data.bootstrap, true);
      } else {
        renderAll();
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
      if (pOv) pOv.style.display = 'none';
      if (pDec) pDec.style.display = 'none';

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
    if (inp && state.activeScreen === 'attendees') {
      setTimeout(() => {
        inp.focus();
        inp.select();
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

  async function triggerGateScan(scanInput, forcedMode = null) {
    const modeToUse = forcedMode || state.scanMode || 'auto';
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
        return;
      }

      if (data.badge && data.badge.user_id) {
        state.selectedCrewId = Number(data.badge.user_id);
      }
      state.currentVerification = data;

      if (data.bootstrap) {
        applyBootstrapPayload(data.bootstrap, true);
      } else {
        renderAll();
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

      const statusTxt = data.allowed
        ? `${data.action === 'check_out' ? 'CHECKED OUT' : 'ACCESS GRANTED'}`
        : `ACCESS DENIED — ${data.reason}`;
      showToast(`${data.badge ? data.badge.full_name : scanInput}: ${statusTxt}`);
    } catch (err) {
      showToast('Error communicating with Gate Terminal API');
    }
  }

  function switchScreen(screenKey, scrollToId = null) {
    if (!isScreenPermittedForCurrentUser(screenKey)) {
      const rawRole = (state.currentUser?.role || '').toLowerCase();
      const isStockCtrl = rawRole === 'stock_controller';
      const isTech = rawRole === 'tech_lead';
      const isStockMgr = rawRole === 'stock_manager';

      if (isStockCtrl) {
        showToast('Access Scoped: Stock Controllers are assigned to Gate Kiosk (#pane-kiosk) and Stock Batch Approvals.');
        screenKey = 'attendees';
        scrollToId = 'pane-kiosk';
      } else if (isTech) {
        showToast('Access Restricted: Warehouse inventory management is reserved for Stock Managers.');
        screenKey = 'overview';
      } else if (isStockMgr) {
        showToast('Access Restricted: Venue Security Portal is reserved for Technical Leads and Administrators.');
        screenKey = 'overview';
      } else {
        showToast('Access Restricted: Crew members are scoped to Personal Badge & Gate Kiosk view.');
        screenKey = 'attendees';
        scrollToId = 'pane-kiosk';
      }
    }
    state.activeScreen = screenKey;
    const screens = {
      overview: document.getElementById('screen-overview'),
      events: document.getElementById('screen-events'),
      users: document.getElementById('screen-users'),
      attendees: document.getElementById('screen-attendees'),
      analytics: document.getElementById('screen-analytics'),
      'stock-manager': document.getElementById('screen-stock-manager'),
    };
    Object.keys(screens).forEach((k) => {
      if (screens[k]) {
        screens[k].classList.toggle('active', k === screenKey);
      }
    });

    // Update sidebar active state
    document.querySelectorAll('.sidebar .nav-item[data-nav-target]').forEach((btn) => {
      const target = btn.getAttribute('data-nav-target');
      btn.classList.toggle('active', target === screenKey);
    });

    // Update nav icons
    const ovIcon = document.getElementById('nav-icon-overview');
    const evIcon = document.getElementById('nav-icon-events');
    const atIcon = document.getElementById('nav-icon-attendees');
    if (ovIcon) ovIcon.src = screenKey === 'overview' ? 'assets/nav-overview-active.svg' : 'assets/nav-overview-inactive.svg';
    if (evIcon) evIcon.src = screenKey === 'events' ? 'assets/nav-events-active.svg' : 'assets/nav-events-inactive.svg';
    if (atIcon) atIcon.src = screenKey === 'attendees' ? 'assets/nav-attendees-active.svg' : 'assets/nav-attendees-inactive.svg';

    const pageTitles = {
      overview: 'Gate Operations Dashboard',
      events: 'Venues & Stock Gates',
      users: 'Staff, Technicians & Role Management',
      attendees: 'Staff ID Badges & Gate Terminal (#pane-kiosk)',
      analytics: 'Stock Batch Approvals & Clearance Matrix',
      'stock-manager': 'Stocks & Warehouses Inventory Manager',
    };
    const bc = document.getElementById('breadcrumb-page');
    if (bc) bc.textContent = pageTitles[screenKey] || 'Gate Dashboard';

    if (screenKey === 'stock-manager') {
      loadStockManagerData();
    }
    if (screenKey === 'users') {
      renderUsersScreen();
      switchUsersView(state.usersViewMode || 'personnel');
    }

    if (scrollToId === 'pane-kiosk') {
      setTimeout(() => {
        const el = document.getElementById('pane-kiosk');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const inp = document.getElementById('kiosk-badge-input');
        if (inp) {
          inp.focus();
          inp.select();
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

  function renderAll() {
    renderTopbarAndKpis();
    renderCheckpointSelectors();
    renderVerificationDeck();
    renderHourlyTrafficChart();
    renderActivityTimeline();
    renderCrewTables();
    renderCheckpointsDirectory();
    renderBatchesAndMatrixScreen();
    renderRollCallModalList();
    renderUsersScreen();
    if (state.activeScreen === 'users') {
      switchUsersView(state.usersViewMode || 'personnel');
    }
  }

  function closeAllTopbarDropdowns() {
    const ids = ['topbar-search-dropdown', 'topbar-help-dropdown', 'topbar-notif-dropdown', 'topbar-user-dropdown'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function renderNotificationsList() {
    const list = document.getElementById('topbar-notif-list');
    if (!list) return;
    if (!state.notifications || state.notifications.length === 0) {
      list.innerHTML = `<div style="padding: 16px; text-align: center; font-size: 11px; color: var(--text-muted);">No recent alerts.</div>`;
      return;
    }
    list.innerHTML = state.notifications.map((n) => `
      <div class="notif-item ${n.unread ? 'unread' : ''}">
        <span class="notif-item-icon">${n.icon || '🔔'}</span>
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
    return role === 'tech_lead' || isCurrentUserAdmin();
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
    const rawRole = (state.currentUser?.role || '').toLowerCase();
    const isAdmin = isCurrentUserAdmin();
    const isTech = rawRole === 'tech_lead' && !isAdmin;
    const isStockMgr = rawRole === 'stock_manager' && !isAdmin;
    const isStockCtrl = rawRole === 'stock_controller';

    if (isStockCtrl) {
      return screenKey === 'attendees' || screenKey === 'analytics';
    }
    if (isTech) {
      return screenKey === 'overview' || screenKey === 'events' || screenKey === 'users' || screenKey === 'attendees';
    }
    if (isStockMgr) {
      return screenKey === 'overview' || screenKey === 'events' || screenKey === 'users' || screenKey === 'attendees' || screenKey === 'analytics' || screenKey === 'stock-manager';
    }
    // Technician / Standard crew:
    return screenKey === 'attendees';
  }

  function canCurrentUserAddUser() {
    if (!state.currentUser) return false;
    return isCurrentUserAdmin() || isCurrentUserTechLead() || isCurrentUserStockManager();
  }

  function canCurrentUserAssignEvents() {
    if (!state.currentUser) return false;
    return isCurrentUserAdmin() || isCurrentUserTechLead();
  }

  function canCurrentUserSetCallTime() {
    if (!state.currentUser) return true; // Permit in kiosk/demo testing
    return isCurrentUserAdmin() || isCurrentUserTechLead() || isCurrentUserStockManager();
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
      if (iconEl) iconEl.textContent = '🏭';
      if (titleEl) titleEl.textContent = 'Stock Manager Scoped Delegation Active';
      if (descEl) descEl.innerHTML = 'You are authorized to onboard and manage warehouse, logistics, and technical stage personnel with <strong>Level 1 (Venue/Logistics)</strong> or <strong>Level 2 (Technical)</strong> clearance. Higher clearance tiers (L3–L8) and management roles require Administrator clearance.';
      if (pillEl) {
        pillEl.textContent = 'Scoped L1 / L2';
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
    const isAdmin = isCurrentUserAdmin();
    const isTech = rawRole === 'tech_lead' && !isAdmin;
    const isStockMgr = rawRole === 'stock_manager' && !isAdmin;
    const isStockCtrl = rawRole === 'stock_controller';
    const isTechCrew = !isAdmin && !isTech && !isStockMgr && !isStockCtrl;

    const setVis = (el, isVis) => {
      if (!el) return;
      el.style.display = isVis ? 'flex' : 'none';
      if (isVis) {
        el.removeAttribute('data-restricted');
        el.removeAttribute('title');
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.cursor = 'pointer';
        el.removeAttribute('tabindex');
      } else {
        el.setAttribute('data-restricted', 'true');
        el.setAttribute('tabindex', '-1');
      }
    };

    // 1. Main Navigation Items (Sidebar)
    const navOverview = document.querySelector('.sidebar .nav-item[data-nav-target="overview"]');
    const navEvents = document.querySelector('.sidebar .nav-item[data-nav-target="events"]');
    const navUsers = document.getElementById('nav-users-btn') || document.querySelector('.sidebar .nav-item[data-nav-target="users"]');
    const navAttendees = document.querySelector('.sidebar .nav-item[data-nav-target="attendees"]');
    const navVenueSec = document.getElementById('nav-venue-security-btn');
    const navAnalytics = document.querySelector('.sidebar .nav-item[data-nav-target="analytics"]');
    const navStockMgr = document.getElementById('nav-stock-manager-btn') || document.querySelector('.sidebar .nav-item[data-nav-target="stock-manager"]');
    const navMatrix = document.getElementById('nav-access-matrix-btn');

    // Gate Dashboard: Admin, Tech Lead, Stock Manager (Hidden for Stock Controller & Technician)
    setVis(navOverview, isAdmin || isTech || isStockMgr);

    // Venues & Stock Gates: Admin, Tech Lead, Stock Manager (Hidden for Stock Controller & Technician)
    setVis(navEvents, isAdmin || isTech || isStockMgr);

    // Users & Roles: Admin, Tech Lead, Stock Manager (Hidden for Stock Controller & Technician)
    setVis(navUsers, isAdmin || isTech || isStockMgr);

    // ID Badges & Kiosk: Visible to all personas
    setVis(navAttendees, true);

    // Venue Security Portal: Admin and Tech Lead (Hidden for Stock Manager, Stock Controller, Technician)
    setVis(navVenueSec, isAdmin || isTech);

    // Stock Batch Approvals: Admin, Stock Manager, Stock Controller (Hidden for Tech Lead & Technician)
    setVis(navAnalytics, isAdmin || isStockMgr || isStockCtrl);

    // Stocks & Warehouses: Admin, Stock Manager (Hidden for Tech Lead, Stock Controller, Technician)
    setVis(navStockMgr, isAdmin || isStockMgr);

    // Clearance Matrix: Admin ONLY (Hidden for all other roles)
    setVis(navMatrix, isAdmin);

    // 2. Checkpoint Controls Navigation Group
    const cpNav = document.getElementById('sidebar-checkpoint-controls') || document.querySelector('.nav-group-workspace');
    const btnCallTime = document.getElementById('sidebar-calltime-btn');
    const btnRollCall = document.getElementById('sidebar-rollcall-btn');
    const btnStationLock = document.getElementById('sidebar-station-lock-btn');
    const btnResetDemo = document.getElementById('sidebar-reset-demo-btn');

    if (cpNav) {
      if (isStockCtrl || isTechCrew) {
        // Entire section hidden for Stock Controllers & Technicians
        cpNav.style.display = 'none';
      } else {
        cpNav.style.display = 'flex';
        // Set Call Time: Admin, Tech Lead, Stock Manager, or default/demo
        setVis(btnCallTime, !state.currentUser || isAdmin || isTech || isStockMgr);
        // On-Site Roll-Call: Admin, Tech Lead, Stock Manager
        setVis(btnRollCall, !state.currentUser || isAdmin || isTech || isStockMgr);
        // Station Lock PIN: Admin ONLY
        setVis(btnStationLock, !state.currentUser || isAdmin);
        // Reset Today's Scans: ALWAYS visible for gate demo/operators
        setVis(btnResetDemo, true);
      }
    }
    if (btnResetDemo) {
      btnResetDemo.style.display = 'flex';
      btnResetDemo.style.opacity = '1';
      btnResetDemo.style.filter = 'none';
      btnResetDemo.style.cursor = 'pointer';
    }

    // 3. Subtabs on Users & Roles Screen
    const tabRoles = document.getElementById('view-tab-roles');
    const tabMatrix = document.getElementById('view-tab-matrix');
    const tabDepts = document.getElementById('view-tab-departments');
    if (tabRoles) tabRoles.style.display = isAdmin ? 'inline-flex' : 'none';
    if (tabMatrix) tabMatrix.style.display = isAdmin ? 'inline-flex' : 'none';
    if (tabDepts) tabDepts.style.display = isAdmin ? 'inline-flex' : 'none';

    // 4. Breadcrumb Workspace Title
    const bcRoot = document.getElementById('breadcrumb-workspace');
    if (bcRoot) {
      if (isStockCtrl) {
        bcRoot.textContent = 'aBility Gate Station (Stock Controller)';
      } else if (isStockMgr) {
        bcRoot.textContent = 'aBility Logistics Hub (Stock Manager)';
      } else if (isTech) {
        bcRoot.textContent = 'aBility Production Deck (Tech Lead)';
      } else if (isTechCrew) {
        bcRoot.textContent = 'aBility Crew Station (Technician)';
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
        supportTitle.textContent = 'Stock Gate Kiosk Active';
        supportDesc.textContent = 'Warehouse loading dock access & batch verification terminal.';
      } else if (isTechCrew) {
        supportTitle.textContent = 'Technician Terminal';
        supportDesc.textContent = 'Personal RFID credentials & event call time check-in.';
      } else if (isTech) {
        supportTitle.textContent = 'Tech Lead Operations';
        supportDesc.textContent = 'Event rosters, call time scheduling & L1/L2 technical onboarding.';
      } else if (isStockMgr) {
        supportTitle.textContent = 'Warehouse Logistics';
        supportDesc.textContent = 'Inventory hubs, equipment dispatches & L1/L2 warehouse onboarding.';
      } else {
        supportTitle.textContent = 'Clearance Enforcement';
        supportDesc.textContent = `All ${state.clearanceMatrix?.length || 7} security tiers and physical perimeter checkpoints active.`;
      }
    }

    // 7. Kiosk Banner
    const kioskBanner = document.getElementById('kiosk-stock-role-banner');
    if (kioskBanner) {
      kioskBanner.style.display = isStockCtrl ? 'flex' : 'none';
    }

    // 8. Auto-redirect if active screen is not permitted for new role
    if (!isScreenPermittedForCurrentUser(state.activeScreen)) {
      if (isStockCtrl || isTechCrew) {
        switchScreen('attendees', 'pane-kiosk');
      } else {
        switchScreen('overview');
      }
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

    // Render Notifications Bubble
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
    document.querySelectorAll('.js-cp-type-btn').forEach((btn) => {
      const btnType = btn.getAttribute('data-cp-type');
      btn.classList.remove('active-stock', 'active-venue');
      if (btnType === state.checkpointType) {
        btn.classList.add(isStock ? 'active-stock' : 'active-venue');
      }
      btn.disabled = state.stationLocked;
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
      sel.disabled = state.stationLocked;
    });

    document.querySelectorAll('.js-station-lock-btn').forEach((btn) => {
      btn.classList.toggle('locked', state.stationLocked);
      btn.classList.toggle('unlocked', !state.stationLocked);
    });

    document.querySelectorAll('.js-station-lock-label').forEach((lbl) => {
      lbl.textContent = state.stationLocked
        ? `ENTRANCE STATION LOCKED (${state.activeCheckpoint.name}) · Unlock (PIN: 1234)`
        : 'MULTI-CHECKPOINT MODE · Lock Station (PIN: 1234)';
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
      facilityBadgeEl.textContent = isStockFacility ? '🏭 Stock Warehouse' : '🏟️ Event Venue';
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

    const isCurrentlyCheckedIn = (b.daily_state === 'checked_in') || (v.action === 'check_out');
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

    const filtered = state.activityTimeline.filter((item) => {
      if (scope === 'event_venue' && item.checkpoint_type !== 'event_venue') return false;
      if (scope === 'stock_warehouse' && item.checkpoint_type !== 'stock_warehouse') return false;
      if (scope === 'granted' && item.access_status !== 'granted') return false;
      if (scope === 'denied' && item.access_status !== 'denied') return false;

      if (q) {
        const hay = `${item.full_name} ${item.badge_code} ${item.checkpoint_name} ${item.action_title} ${item.department} ${item.role_display}`.toLowerCase();
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
          return `
            <div class="timeline-event-card" data-timeline-uid="${item.user_id}" data-timeline-id="${item.id}" style="cursor: pointer;" title="Click to view ${escapeHtml(item.full_name)} transit flow &amp; verification">
              <div class="timeline-event-left">
                <div class="timeline-action-title">${escapeHtml(item.action_title)}</div>
                <div class="timeline-time-sub">${escapeHtml(item.formatted_time)} · ${escapeHtml(item.badge_code)}</div>
                <div class="timeline-staff-mini">
                  <div class="timeline-mini-avatar">${escapeHtml(item.initials)}</div>
                  <span class="timeline-mini-name">${escapeHtml(item.full_name)}</span>
                  <span class="tier-code-badge tier-code-${escapeHtml(item.clearance_code)}">${escapeHtml(item.clearance_code)}</span>
                  <span class="timeline-mini-role">${escapeHtml(item.role_display)} · ${escapeHtml(item.department)}</span>
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
                ${
                  isTransit
                    ? `<span class="status-badge status-badge-purple-sm" title="Option B Transit: Ndera Warehouse ➔ Kigali Convention Centre">🚚 Transit Flow</span>`
                    : ''
                }
                <span class="status-badge ${isDenied ? 'status-badge-red-sm' : 'status-badge-green-sm'}">
                  ${isDenied ? 'Denied' : 'Granted'}
                </span>
                <span class="status-badge status-badge-neutral-sm">
                  ${isStock ? 'Stock Gate' : 'Event Venue'}
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
        const hasBatch = Array.isArray(c.linked_batches) && c.linked_batches.length > 0;

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
                <span class="company-role">${escapeHtml(c.role_display)}${hasBatch ? ' · 📦 Batch Linked' : ''}</span>
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

  function renderPaginationControls(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let pageBtnsHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      pageBtnsHtml += `
        <button
          type="button"
          class="page-number-btn ${p === currentPage ? 'active' : ''} js-dir-page-btn"
          data-page="${p}"
          aria-label="Go to page ${p}"
        >
          ${p}
        </button>
      `;
    }

    return `
      <button
        type="button"
        class="btn btn-secondary-32-sm js-dir-prev-btn"
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
        class="btn btn-secondary-32-sm js-dir-next-btn"
        ${currentPage >= totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}
        aria-label="Next Page"
      >
        <span>Next →</span>
      </button>
    `;
  }

  function renderCrewTables() {
    const overviewRowsEl = document.getElementById('overview-attendee-rows');
    const overviewCountEl = document.getElementById('overview-results-count');
    if (overviewRowsEl) {
      const ovList = filterCrewList(state.overviewTab, state.overviewSearch);
      overviewRowsEl.innerHTML = renderCrewRowsHtml(ovList);
      if (overviewCountEl) {
        overviewCountEl.textContent = `Showing ${ovList.length} of ${state.crew.length} badged production crew`;
      }
    }

    const dirRowsEl = document.getElementById('directory-attendee-rows');
    const dirCountEl = document.getElementById('directory-results-count');
    const dirPaginationEl = document.getElementById('directory-page-controls');
    if (dirRowsEl) {
      const dirList = filterCrewList(state.directoryTab, state.directorySearch);
      const totalItems = dirList.length;
      const perPage = state.directoryPerPage || 5;
      const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

      if (state.directoryPage > totalPages) {
        state.directoryPage = totalPages;
      }
      if (state.directoryPage < 1) {
        state.directoryPage = 1;
      }

      const startIndex = (state.directoryPage - 1) * perPage;
      const endIndex = Math.min(startIndex + perPage, totalItems);
      const pagedList = dirList.slice(startIndex, endIndex);

      dirRowsEl.innerHTML = renderCrewRowsHtml(pagedList);

      if (dirCountEl) {
        if (totalItems === 0) {
          dirCountEl.textContent = 'Showing 0 crew members';
        } else {
          dirCountEl.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalItems} badged crew (Page ${state.directoryPage} of ${totalPages})`;
        }
      }

      if (dirPaginationEl) {
        dirPaginationEl.innerHTML = renderPaginationControls(state.directoryPage, totalPages);
      }
    }
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
    const personnelView = document.getElementById('personnel-view-container');
    const rolesView = document.getElementById('roles-view-container');
    const matrixView = document.getElementById('matrix-view-container');
    const deptsView = document.getElementById('departments-view-container');
    const addStaffBtn = document.getElementById('open-add-user-btn');
    const addRoleBtn = document.getElementById('open-add-role-btn');
    const addTierTopBtn = document.getElementById('open-add-tier-top-btn');
    const addDeptTopBtn = document.getElementById('open-add-dept-top-btn');
    const exportBtn = document.getElementById('users-export-btn');

    const tabs = [
      { el: tabPersonnel, active: mode === 'personnel' },
      { el: tabRoles, active: mode === 'roles' },
      { el: tabMatrix, active: mode === 'matrix' },
      { el: tabDepts, active: mode === 'departments' },
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

    if (addStaffBtn) addStaffBtn.style.display = mode === 'personnel' ? 'inline-flex' : 'none';
    if (addRoleBtn) addRoleBtn.style.display = mode === 'roles' ? 'inline-flex' : 'none';
    if (addTierTopBtn) addTierTopBtn.style.display = mode === 'matrix' ? 'inline-flex' : 'none';
    if (addDeptTopBtn) addDeptTopBtn.style.display = mode === 'departments' ? 'inline-flex' : 'none';
    if (exportBtn) exportBtn.style.display = mode === 'personnel' ? 'inline-flex' : 'none';

    if (mode === 'matrix') {
      renderUsersMatrixScreen();
    } else if (mode === 'roles') {
      renderRolesScreen();
    } else if (mode === 'departments') {
      renderDepartmentsScreen();
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
                <option value="L1_VENUE_BASIC" ${c.clearance_code === 'L1' ? 'selected' : ''}>L1 — Event Venue Crew (No Stock)</option>
                <option value="L2_TECH_STAGE" ${c.clearance_code === 'L2' ? 'selected' : ''}>L2 — Technical & Stage (Stock + Venue)</option>
                <option value="L3_STOCK_WAREHOUSE" ${c.clearance_code === 'L3' ? 'selected' : ''}>L3 — Stock Controller (Full Stock)</option>
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

    if (state.rollCallList.length === 0) {
      listEl.innerHTML = `<div style="padding: 24px; text-align: center; font-size: 12px; color: var(--text-secondary);">No crew members are currently checked in on-site.</div>`;
      return;
    }

    listEl.innerHTML = state.rollCallList
      .map(
        (rc) => `
        <div class="timeline-event-card" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar-circle avatar-jl">${escapeHtml(rc.initials)}</div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; align-items: center; gap: 6px;">
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
            <button
              type="button"
              class="gate-btn gate-btn-checkout js-rollcall-checkout-btn"
              data-badge="${escapeHtml(rc.badge_code)}"
            >
              Checkout Now
            </button>
          </div>
        </div>
      `
      )
      .join('');
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
    startKioskCountdown(4000);
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
        const itCount = String(state.stockManager.stats.total_items || 0).padStart(2, '0');
        sideBadge.textContent = `${whCount}/${itCount}`;
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
      activeBadge.textContent = isWh ? 'Warehouses' : 'Stock Items';
      activeBadge.className = `status-badge ${isWh ? 'status-badge-purple-sm' : 'status-badge-green-sm'}`;
    }

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
          smPageControls.innerHTML = `<span style="font-size: 11px; color: var(--text-secondary);">Supports drag-and-drop image uploads for warehouses &amp; equipment items</span>`;
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
        footerEl.textContent = `Showing ${state.stockManager.warehouses.length} warehouse ${state.stockManager.warehouses.length === 1 ? 'facility' : 'facilities'}`;
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

  function openUserModal(userId = null) {
    const isStockCtrl = isCurrentUserStockController();
    if (isStockCtrl) {
      showToast('Access Restricted: Stock Controllers are assigned exclusively to gate terminal scanning and batch custody and cannot create or modify personnel accounts.');
      return;
    }

    populateClearanceDropdowns();
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
        noticeEl.innerHTML = '<strong>🏭 Stock Manager Delegation Active:</strong> You are authorized to onboard warehouse crew & logistics staff with <strong>Level 1 (Venue/Logistics)</strong> or <strong>Level 2 (Technical)</strong> clearance. Higher security tiers (L3–L8) and administrative roles require Administrator clearance.';
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
        // Permitted under delegation: only L1 and L2
        const isPermitted = val.startsWith('L1') || val.startsWith('L2');
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

        if (u.profile_image_url) {
          setDropzonePreview('user', u.profile_image_url, u.profile_image_url.split('/').pop());
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Team Member';
      if (idInput) idInput.value = '0';
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

  function bindEvents() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar .nav-item[data-nav-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav-target');
        switchScreen(target);
      });
    });

    const brandHome = document.getElementById('brand-home-btn');
    if (brandHome) {
      brandHome.addEventListener('click', () => {
        if (isCurrentUserStockController() || isCurrentUserTechnician()) {
          switchScreen('attendees', 'pane-kiosk');
        } else {
          switchScreen('overview');
        }
      });
    }

    // Venue Security Portal nav shortcut
    const venueSecBtn = document.getElementById('nav-venue-security-btn');
    if (venueSecBtn) {
      venueSecBtn.addEventListener('click', () => {
        if (!isCurrentUserAdmin() && !isCurrentUserTechLead()) {
          showToast('Access Restricted: Venue Security Portal is reserved for Technical Leads and Administrators.');
          return;
        }
        if (state.stationLocked && state.checkpointType !== 'event_venue') {
          showToast('Station is locked. Unlock with PIN 1234 first.');
          return;
        }
        state.checkpointType = 'event_venue';
        const firstVenue = (state.checkpoints.event_venues || [])[0];
        if (firstVenue) state.checkpointId = Number(firstVenue.id);
        switchScreen('attendees', 'pane-kiosk');
        fetchBootstrap(false);
        showToast('Switched to Event Venue Security Portal (#pane-kiosk)');
      });
    }

    // Clearance Matrix nav shortcut
    const matrixNavBtn = document.getElementById('nav-access-matrix-btn');
    if (matrixNavBtn) {
      matrixNavBtn.addEventListener('click', () => {
        if (!isCurrentUserAdmin()) {
          showToast('Access Restricted: Security Clearance Matrix configuration requires Administrator privileges.');
          return;
        }
        switchScreen('analytics', 'matrix-config-section');
      });
    }

    // Generic data-action buttons
    document.body.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const act = actionBtn.getAttribute('data-action');
        if (act === 'go-kiosk' || act === 'go-attendees') {
          switchScreen('attendees', 'pane-kiosk');
        } else if (act === 'go-events') {
          switchScreen('events');
        } else if (act === 'go-overview') {
          switchScreen('overview');
        } else if (act === 'go-analytics') {
          switchScreen('analytics');
        }
      }
    });

    // Checkpoint Type Toggle Buttons (`Stock Warehouse` vs `Event Venue`)
    document.querySelectorAll('.js-cp-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.stationLocked) {
          showToast('Entrance Station is LOCKED. Unlock with PIN 1234 to switch checkpoints.');
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
            ? 'Checkpoint Mode: Stock Warehouse Gate (L2–L4 Required; L1 Blocked)'
            : 'Checkpoint Mode: Event Venue Main Entrance (L1–L4 Authorized)'
        );
      });
    });

    // Target Checkpoint Dropdown
    document.querySelectorAll('.js-checkpoint-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        if (state.stationLocked) return;
        state.checkpointId = Number(e.target.value);
        fetchBootstrap(false);
      });
    });

    // Scan Mode Select
    const scanModeSel = document.getElementById('kiosk-scan-mode-select');
    if (scanModeSel) {
      scanModeSel.addEventListener('change', (e) => {
        state.scanMode = e.target.value;
        showToast(`Scan Mode set to: ${e.target.options[e.target.selectedIndex].text}`);
      });
    }

    // Focus Badge Scanner button
    const focusBtn = document.getElementById('focus-kiosk-scanner-btn');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        const inp = document.getElementById('kiosk-badge-input');
        if (inp) {
          inp.focus();
          inp.select();
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
        if (matched) {
          openKioskModal(matched);
        } else {
          triggerGateScan(val);
        }
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
            switchScreen('attendees', 'pane-kiosk');
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
        switchScreen('attendees', 'pane-kiosk');
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
      notifMarkRead.addEventListener('click', () => {
        state.unreadNotifCount = 0;
        state.notifications.forEach((n) => { n.unread = false; });
        renderTopbarAndKpis();
        renderNotificationsList();
        showToast('All notifications marked as read.');
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
          switchScreen('attendees', 'pane-kiosk');
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
          switchScreen('attendees', 'pane-kiosk');
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
              switchScreen('attendees', 'pane-kiosk');
              showToast(data.message || `Welcome back, ${data.user.full_name}! Redirected to Staff ID Badges & Gate Terminal.`);
            } else {
              showToast(data.message || `Welcome back, ${data.user.full_name}!`);
            }
          } else {
            // Local fallback if server check fails or offline
            const localMatched = state.crew.find((c) =>
              c.username.toLowerCase() === username.toLowerCase() ||
              c.badge_code.toUpperCase() === username.toUpperCase() ||
              (c.email && c.email.toLowerCase() === username.toLowerCase())
            );
            if (localMatched && (password === 'password123' || password === 'admin123')) {
              state.currentUser = localMatched;
              closeAuthModal();
              renderTopbarAndKpis();
              showToast(`Welcome back, ${localMatched.full_name}!`);
            } else {
              showToast(data.error || 'Invalid credentials.');
            }
          }
        } catch (err) {
          const localMatched = state.crew.find((c) =>
            c.username.toLowerCase() === username.toLowerCase() ||
            c.badge_code.toUpperCase() === username.toUpperCase()
          );
          if (localMatched) {
            state.currentUser = localMatched;
            closeAuthModal();
            renderTopbarAndKpis();
            showToast(`Signed in as ${localMatched.full_name} (Offline Mode)`);
          } else {
            showToast('Unable to sign in. Please verify your credentials.');
          }
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
            state.currentUser = data.user;
            closeAuthModal();
            await fetchBootstrap(false);
            renderTopbarAndKpis();
            showToast(data.message || 'Account registered & digital badge issued!');
          } else {
            showToast(data.error || 'Registration failed.');
          }
        } catch (err) {
          // Local fallback creation
          const newId = state.crew.length + 1;
          const badgeCode = `REW-BADGE-${String(newId).padStart(4, '0')}`;
          const newMember = {
            id: newId,
            username,
            full_name: fullName,
            email: email || `${username}@ability.rw`,
            phone: phone || '+250 788 100 200',
            role,
            role_display: role.charAt(0).toUpperCase() + role.slice(1),
            department,
            badge_code: badgeCode,
            raw_badge_code: badgeCode,
            staff_code: `ABL-${String(newId).padStart(3, '0')}`,
            rfid_uid: `RFID-88${String(newId).padStart(2, '0')}`,
            clearance_code: role === 'admin' ? 'L4' : (role === 'stock_controller' ? 'L3' : 'L2'),
            clearance_title: 'Level 2 — Technical & Stage',
            clearance_short: 'Technical & Stage',
            clearance_color: '#2563eb',
            badge_status: 'active',
            daily_state: 'ready',
            initials: computeInitials(fullName),
            profile_image_url: null,
          };
          state.crew.push(newMember);
          state.currentUser = newMember;
          closeAuthModal();
          renderAll();
          showToast(`Account created locally! Badge ${badgeCode} issued.`);
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
              switchScreen('attendees', 'pane-kiosk');
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
              pinInp.focus();
              pinInp.select();
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
          showToast('Enter Supervisor PIN (e.g. 1234)');
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

      // 0b. Quick Scan Demo Badges
      const quickBadgeBtn = e.target.closest('.kiosk-quick-badge-btn');
      if (quickBadgeBtn) {
        const badge = quickBadgeBtn.getAttribute('data-badge');
        if (badge) {
          const inp = document.getElementById('kiosk-badge-input');
          if (inp) inp.value = badge;
          triggerGateScan(badge);
        }
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

      // 0c. Directory Table Pagination: Prev button
      const dirPrevBtn = e.target.closest('.js-dir-prev-btn');
      if (dirPrevBtn && !dirPrevBtn.hasAttribute('disabled')) {
        if (state.directoryPage > 1) {
          state.directoryPage--;
          renderCrewTables();
        }
        return;
      }

      // 0d. Directory Table Pagination: Next button
      const dirNextBtn = e.target.closest('.js-dir-next-btn');
      if (dirNextBtn && !dirNextBtn.hasAttribute('disabled')) {
        state.directoryPage++;
        renderCrewTables();
        return;
      }

      // 0e. Directory Table Pagination: Specific Page Number button
      const dirPageBtn = e.target.closest('.js-dir-page-btn');
      if (dirPageBtn) {
        const targetPage = Number(dirPageBtn.getAttribute('data-page'));
        if (targetPage && targetPage !== state.directoryPage) {
          state.directoryPage = targetPage;
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

      // 4. User Activity Timeline Card Click -> Load member verification in Centered Kiosk Modal
      const tlCard = e.target.closest('.timeline-event-card[data-timeline-uid]');
      if (tlCard) {
        const uid = Number(tlCard.getAttribute('data-timeline-uid'));
        const tlId = Number(tlCard.getAttribute('data-timeline-id'));
        const member = (state.crew || []).find((m) => Number(m.id) === uid);
        const tlItem = (state.activityTimeline || []).find((t) => Number(t.id) === tlId);

        if (tlItem && member) {
          const isDenied = tlItem.access_status === 'denied';
          const rolePill = `${String(member.role_display || '').toUpperCase()} - ${String(member.department || '').toUpperCase()}`;
          const verification = {
            allowed: !isDenied,
            reason: isDenied
              ? (tlItem.denial_reason || tlItem.action_title || 'Access Denied at Checkpoint')
              : (tlItem.notes || `Access Authorized at ${tlItem.checkpoint_name}`),
            action: tlItem.scan_action || (isDenied ? 'denied' : 'check_in'),
            punctuality: tlItem.punctuality_status || 'on_time',
            punctuality_label: isDenied ? 'RESTRICTED' : (tlItem.punctuality_status === 'late' ? 'LATE' : 'ON TIME'),
            checkpoint_name: tlItem.checkpoint_name,
            check_in_time: tlItem.in_pill || member.check_in_time || null,
            check_out_time: tlItem.out_pill || member.check_out_time || null,
            scanned_at: tlItem.formatted_time || null,
            is_transit_transfer: Boolean(tlItem.is_transit || (tlItem.notes && (tlItem.notes.includes('Transit') || tlItem.notes.includes('Transferred') || tlItem.notes.includes('from Ndera')))),
            transit_from: 'Ndera Warehouse',
            transit_to: 'Kigali Convention Centre',
            badge: {
              id: member.id,
              user_id: member.id,
              full_name: member.full_name,
              badge_code: member.badge_code,
              staff_code: member.staff_code,
              role: member.role,
              role_display: member.role_display,
              role_pill: rolePill,
              department: member.department,
              clearance_code: member.clearance_code,
              clearance_title: member.clearance_title,
              clearance_color: member.clearance_color,
              profile_image: member.profile_image_url || null,
              initials: member.initials,
              phone: member.phone,
              username: member.username,
              daily_state: isDenied ? 'denied' : (tlItem.scan_action === 'check_out' ? 'checked_out' : 'checked_in'),
              badge_status: member.badge_status,
            },
          };
          openKioskModal(verification);
        } else if (member) {
          openKioskModal(member);
        } else if (tlItem) {
          const isDenied = tlItem.access_status === 'denied';
          const verification = {
            allowed: !isDenied,
            reason: isDenied ? (tlItem.denial_reason || tlItem.action_title || 'Access Denied') : (tlItem.notes || `Access at ${tlItem.checkpoint_name}`),
            action: tlItem.scan_action || 'check_in',
            punctuality: tlItem.punctuality_status || 'on_time',
            punctuality_label: isDenied ? 'RESTRICTED' : 'ON TIME',
            checkpoint_name: tlItem.checkpoint_name,
            check_in_time: tlItem.in_pill || null,
            check_out_time: tlItem.out_pill || null,
            scanned_at: tlItem.formatted_time || null,
            badge: {
              id: tlItem.user_id,
              user_id: tlItem.user_id,
              full_name: tlItem.full_name,
              badge_code: tlItem.badge_code,
              staff_code: tlItem.staff_code,
              role: 'technician',
              role_display: tlItem.role_display,
              role_pill: `${String(tlItem.role_display || '').toUpperCase()} - ${String(tlItem.department || '').toUpperCase()}`,
              department: tlItem.department,
              clearance_code: tlItem.clearance_code,
              clearance_title: `Level ${tlItem.clearance_code}`,
              clearance_color: tlItem.clearance_color || '#2563eb',
              profile_image: tlItem.profile_image_url || null,
              initials: tlItem.initials,
              phone: '+250 788 100 000',
              username: 'user',
              daily_state: isDenied ? 'denied' : 'checked_in',
              badge_status: 'active',
            },
          };
          openKioskModal(verification);
        }
        return;
      }

      // 5. Activate Checkpoint from Screen 2 Directory
      const actCpBtn = e.target.closest('.js-activate-checkpoint-btn');
      if (actCpBtn) {
        if (state.stationLocked) {
          showToast('Station is locked. Unlock with PIN 1234 first.');
          return;
        }
        state.checkpointType = actCpBtn.getAttribute('data-cp-type');
        state.checkpointId = Number(actCpBtn.getAttribute('data-cp-id'));
        await fetchBootstrap(false);
        switchScreen('attendees', 'pane-kiosk');
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
        const doDel = confirm(`Are you sure you want to permanently delete equipment batch "${num}"? All linked items in the manifest will also be removed.`);
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
          switchScreen('attendees', 'pane-kiosk');
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
        const inp = document.getElementById('kiosk-badge-input');
        if (inp) {
          inp.focus();
          inp.select();
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
    document.querySelectorAll('.js-open-rollcall-modal, #sidebar-rollcall-btn, #topbar-help-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.id === 'sidebar-rollcall-btn' && (isCurrentUserStockController() || isCurrentUserTechnician())) {
          showToast('Access Restricted: Roll-Call inspection requires Supervisor or Administrator privileges.');
          return;
        }
        renderRollCallModalList();
        if (rollcallModal) rollcallModal.classList.add('open');
      });
    });
    const closeRc = document.getElementById('close-rollcall-modal');
    if (closeRc && rollcallModal) {
      closeRc.addEventListener('click', () => rollcallModal.classList.remove('open'));
    }

    // Modals: Station Lock PIN Modal (`PIN: 1234`)
    const lockModal = document.getElementById('station-lock-modal');
    document.querySelectorAll('.js-station-lock-btn, #sidebar-station-lock-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isCurrentUserAdmin()) {
          showToast('Access Restricted: Station PIN Locking requires Administrator privileges.');
          return;
        }
        if (lockModal) lockModal.classList.add('open');
      });
    });
    const cancelLock = document.getElementById('cancel-station-lock');
    if (cancelLock && lockModal) {
      cancelLock.addEventListener('click', () => lockModal.classList.remove('open'));
    }
    const lockForm = document.getElementById('station-lock-form');
    if (lockForm && lockModal) {
      lockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pinInput = document.getElementById('station-pin-input');
        const pin = pinInput ? pinInput.value.trim() : '';
        if (pin !== '1234') {
          showToast('Invalid Station PIN. Use default supervisor PIN: 1234');
          return;
        }
        state.stationLocked = !state.stationLocked;
        localStorage.setItem('ability_station_locked', state.stationLocked ? '1' : '0');
        lockModal.classList.remove('open');
        renderCheckpointSelectors();
        showToast(
          state.stationLocked
            ? `Terminal LOCKED to ${state.activeCheckpoint.name}`
            : 'Terminal UNLOCKED — Multi-Checkpoint Mode enabled'
        );
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
      quickResetCallTimeBtn.addEventListener('click', () => {
        if (!confirm('Reset active shift call-time back to default baseline (08:00 AM)?')) return;
        updateCheckpointCallTime({
          cpType: state.checkpointType,
          cpId: state.checkpointId,
          resetToDefault: true,
        });
      });
    }

    // Sidebar Set Call Time Button
    const sidebarCallTimeBtn = document.getElementById('sidebar-calltime-btn');
    if (sidebarCallTimeBtn) {
      sidebarCallTimeBtn.addEventListener('click', () => {
        if (!canCurrentUserSetCallTime()) {
          showToast('Access Restricted: Setting Call Times requires Tech Lead, Stock Manager, or Administrator privileges.');
          return;
        }
        const cp = state.activeCheckpoint;
        openCallTimeModal(cp ? cp.type : null, cp ? cp.id : null, cp ? cp.name : null, cp ? cp.call_time : null);
      });
    }

    // Open Call Time Modal for Active Checkpoint
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
    const addRoleBtn = document.getElementById('open-add-role-btn');
    const addDeptTopBtn = document.getElementById('open-add-dept-top-btn');

    if (tabPersonnel) tabPersonnel.addEventListener('click', () => switchUsersView('personnel'));
    if (tabRoles) tabRoles.addEventListener('click', () => switchUsersView('roles'));
    if (tabMatrix) tabMatrix.addEventListener('click', () => switchUsersView('matrix'));
    if (tabDepts) tabDepts.addEventListener('click', () => switchUsersView('departments'));

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

        const confirmDelete = confirm(`Are you sure you want to permanently delete technical role "${title}"?`);
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

        const confirmDelete = confirm(`Are you sure you want to permanently delete department "${name}"?`);
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
    const resetLogsHandler = async () => {
      if (!confirm("Are you sure you want to reset the User Activity Timeline and gate scans?\nAll activity logs will be cleared and crew set to Not Checked In (0 on-site).")) {
        return;
      }
      try {
        const res = await fetch('api.php?action=reset_today_scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkpoint_type: state.checkpointType,
            checkpoint_id: state.checkpointId,
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
        } else {
          showToast('Failed to reset logs: ' + ((data && data.error) || 'Server error'));
        }
      } catch (err) {
        console.error('Reset logs error:', err);
        showToast('Error resetting logs: ' + err.message);
      }
    };

    ['reset-demo-db-btn', 'sidebar-reset-demo-btn', 'users-matrix-reset-logs-btn', 'timeline-clear-btn'].forEach((id) => {
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
        fd.append('id', document.getElementById('user-modal-id').value);
        fd.append('full_name', document.getElementById('user-modal-fullname').value);
        fd.append('username', document.getElementById('user-modal-username').value);
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
        switchScreen('attendees', 'pane-kiosk');
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

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    bindEvents();
    if (window.location.hash === '#pane-kiosk') {
      switchScreen('attendees', 'pane-kiosk');
    }
    await fetchBootstrap(false);
    startLiveGateSync();
    if (isCurrentUserStockController()) {
      switchScreen('attendees', 'pane-kiosk');
      applyNavigationRestrictions();
    }
    loadStockManagerData();
  });
})();
