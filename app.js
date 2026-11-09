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
    clearanceMatrix: [],
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
    roles: [],
    usersViewMode: 'personnel',
    rolesSearch: '',
    rolesFilterTier: 'all',
    rolesFilterDept: 'all',
    currentVerification: null,
    selectedCrewId: 6,

    // Table filters
    overviewTab: 'all',
    directoryTab: 'all',
    overviewSearch: '',
    directorySearch: '',
    tierFilter: 'all',
    gateStateFilter: 'all',

    // Checkpoints directory filters
    checkpointTab: 'all',
    checkpointSearch: '',

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
    state.clearanceMatrix = Array.isArray(data.clearanceMatrix) ? data.clearanceMatrix : [];
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
    const isAllowed = member.badge_status === 'active' && (!isStock || member.clearance_code !== 'L1');
    const reason = !isAllowed
      ? (member.badge_status !== 'active'
          ? `ID Badge is currently ${String(member.badge_status).toUpperCase()}`
          : 'Level 1 (Venue Crew) is not authorized for Stock Warehouses')
      : `Authorized for ${isStock ? 'Stock Warehouse' : 'Event Venue'} access (${member.clearance_code} — ${member.clearance_short})`;

    const roleUpper = String(member.role || 'technician').replace(/_/g, ' ').toUpperCase();
    const deptUpper = String(member.department || 'OPERATIONS').toUpperCase();

    return {
      ok: true,
      allowed: isAllowed,
      reason: reason,
      action: member.daily_state === 'checked_out' ? 'check_out' : 'check_in',
      punctuality: member.punctuality_code || 'on_time',
      punctuality_label: isAllowed ? (member.punctuality || 'ON TIME') : 'ACCESS RESTRICTED',
      checkpoint_type: cp.type,
      checkpoint_id: cp.id,
      checkpoint_name: cp.name,
      scanned_at: new Date().toLocaleTimeString(),
      check_in_time: member.check_in_full || member.check_in_time || null,
      check_out_time: member.check_out_full || member.check_out_time || null,
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

      const statusTxt = data.allowed
        ? `ACCESS GRANTED (${data.action === 'check_out' ? 'Checked Out' : 'Checked In'})`
        : `ACCESS DENIED — ${data.reason}`;
      showToast(`${data.badge ? data.badge.full_name : scanInput}: ${statusTxt}`);
    } catch (err) {
      showToast('Error communicating with Gate Terminal API');
    }
  }

  function switchScreen(screenKey, scrollToId = null) {
    if (isCurrentUserStockController() && screenKey !== 'attendees') {
      showToast('Access Restricted: Stock Controllers are assigned exclusively to Staff ID Badges & Gate Terminal (#pane-kiosk).');
      screenKey = 'attendees';
      scrollToId = 'pane-kiosk';
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
      analytics: 'Stock Batch Approvals & 4-Tier Access Matrix',
      'stock-manager': 'Stocks & Warehouses Inventory Manager',
    };
    const bc = document.getElementById('breadcrumb-page');
    if (bc) bc.textContent = pageTitles[screenKey] || 'Gate Dashboard';

    if (screenKey === 'stock-manager') {
      loadStockManagerData();
    }
    if (screenKey === 'users') {
      renderUsersScreen();
    }

    if (scrollToId === 'pane-kiosk') {
      setTimeout(() => {
        openKioskModal();
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
    const clearance = (state.currentUser.clearance_code || '').toUpperCase();
    return (
      role === 'admin' ||
      role === 'manager' ||
      role === 'tech_lead' ||
      clearance.includes('L4') ||
      clearance === 'L4_ALL_ACCESS'
    );
  }

  function isCurrentUserStockController() {
    if (!state.currentUser) return false;
    const role = (state.currentUser.role || '').toLowerCase();
    const clearance = (state.currentUser.clearance_code || '').toUpperCase();
    return (
      role === 'stock_controller' ||
      role === 'stock_manager' ||
      clearance === 'L3' ||
      clearance.startsWith('L3')
    );
  }

  function applyNavigationRestrictions() {
    const isStock = isCurrentUserStockController();
    const navItems = document.querySelectorAll('.sidebar .nav-item[data-nav-target]');
    navItems.forEach((btn) => {
      const target = btn.getAttribute('data-nav-target');
      if (isStock) {
        if (target !== 'attendees') {
          btn.style.opacity = '0.35';
          btn.style.filter = 'grayscale(1)';
          btn.style.cursor = 'not-allowed';
          btn.setAttribute('data-restricted', 'true');
          btn.title = 'Access Restricted: Stock Controllers are assigned exclusively to Staff ID Badges & Gate Terminal (#pane-kiosk)';
        } else {
          btn.style.opacity = '1';
          btn.style.filter = 'none';
          btn.style.cursor = 'pointer';
          btn.removeAttribute('data-restricted');
          btn.title = 'Staff ID Badges & Gate Terminal (#pane-kiosk)';
        }
      } else {
        btn.style.opacity = '1';
        btn.style.filter = 'none';
        btn.style.cursor = 'pointer';
        btn.removeAttribute('data-restricted');
        btn.removeAttribute('title');
      }
    });

    const bcRoot = document.getElementById('breadcrumb-workspace');
    if (bcRoot) {
      bcRoot.textContent = isStock ? 'aBility Gate Station (Stock Controller)' : 'aBility Manager';
    }

    // Disable CHECKPOINT CONTROLS navigation group for Stock Controllers
    const cpNav = document.getElementById('sidebar-checkpoint-controls') || document.querySelector('.nav-group-workspace');
    if (cpNav) {
      if (isStock) {
        cpNav.classList.add('nav-group-disabled');
        cpNav.querySelectorAll('button').forEach((b) => {
          b.disabled = true;
          b.setAttribute('tabindex', '-1');
          b.title = 'Access Restricted: Checkpoint controls require Supervisor or Administrator privileges';
        });
      } else {
        cpNav.classList.remove('nav-group-disabled');
        cpNav.querySelectorAll('button').forEach((b) => {
          b.disabled = false;
          b.removeAttribute('tabindex');
          b.removeAttribute('title');
        });
      }
    }

    // Disable Venue Security Portal and 4-Tier Access Matrix shortcuts for Stock Controllers
    const venueSecBtn = document.getElementById('nav-venue-security-btn');
    const matrixNavBtn = document.getElementById('nav-access-matrix-btn');

    if (venueSecBtn) {
      if (isStock) {
        venueSecBtn.disabled = true;
        venueSecBtn.style.opacity = '0.35';
        venueSecBtn.style.filter = 'grayscale(1)';
        venueSecBtn.style.cursor = 'not-allowed';
        venueSecBtn.setAttribute('tabindex', '-1');
        venueSecBtn.title = 'Access Restricted: Venue Security Portal is restricted for Stock Controllers (Stock Warehouse Terminal Only)';
      } else {
        venueSecBtn.disabled = false;
        venueSecBtn.style.opacity = '1';
        venueSecBtn.style.filter = 'none';
        venueSecBtn.style.cursor = 'pointer';
        venueSecBtn.removeAttribute('tabindex');
        venueSecBtn.removeAttribute('title');
      }
    }

    if (matrixNavBtn) {
      if (isStock) {
        matrixNavBtn.disabled = true;
        matrixNavBtn.style.opacity = '0.35';
        matrixNavBtn.style.filter = 'grayscale(1)';
        matrixNavBtn.style.cursor = 'not-allowed';
        matrixNavBtn.setAttribute('tabindex', '-1');
        matrixNavBtn.title = 'Access Restricted: 4-Tier Access Matrix configuration requires Supervisor or Administrator privileges';
      } else {
        matrixNavBtn.disabled = false;
        matrixNavBtn.style.opacity = '1';
        matrixNavBtn.style.filter = 'none';
        matrixNavBtn.style.cursor = 'pointer';
        matrixNavBtn.removeAttribute('tabindex');
        matrixNavBtn.removeAttribute('title');
      }
    }

    const kioskBanner = document.getElementById('kiosk-stock-role-banner');
    if (kioskBanner) {
      kioskBanner.style.display = isStock ? 'flex' : 'none';
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
        <div class="switch-user-item ${isCur ? 'active-user' : ''} js-switch-to-user" data-user-id="${m.id}" data-badge="${escapeHtml(m.badge_code)}" style="cursor: pointer;">
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

      const menuRole = document.getElementById('user-menu-role');
      if (menuRole) menuRole.textContent = `${u.role_display || u.role} · ${u.clearance_code || 'L2'}`;

      const menuBadge = document.getElementById('user-menu-badge');
      if (menuBadge) menuBadge.textContent = u.badge_code || 'REW-BADGE-0002';

      const isAdmin = isCurrentUserAdmin();
      const userDropdown = document.getElementById('topbar-user-dropdown');
      const quickLogout = document.getElementById('topbar-logout-quick-btn');
      if (userDropdown && !isAdmin) {
        userDropdown.style.display = 'none';
      }
      if (quickLogout) {
        quickLogout.style.display = isAdmin ? 'none' : 'inline-flex';
      }

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

    const tc = k.tierCounts || { L1: 0, L2: 0, L3: 0, L4: 0 };
    const breakdownEl = document.getElementById('overview-tier-breakdown');
    if (breakdownEl) {
      breakdownEl.textContent = `L1:${tc.L1 || 0} · L2:${tc.L2 || 0} · L3:${tc.L3 || 0} · L4:${tc.L4 || 0}`;
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

  function renderVerificationDeck() {
    const v = state.currentVerification;
    if (!v || !v.badge) return;
    const b = v.badge;

    const staffCodeEl = document.getElementById('kiosk-staff-code');
    const cpTagEl = document.getElementById('kiosk-checkpoint-tag');
    const portraitImg = document.getElementById('kiosk-portrait-img');
    const initialsEl = document.getElementById('kiosk-initials-avatar');
    const phoneEl = document.getElementById('kiosk-staff-phone');
    const rolePillEl = document.getElementById('kiosk-role-pill');

    if (staffCodeEl) staffCodeEl.textContent = b.staff_code || 'ABL-006';
    if (cpTagEl) cpTagEl.textContent = String(v.checkpoint_name || state.activeCheckpoint.name).toUpperCase();

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

    const granted = Boolean(v.allowed);
    if (bannerEl) {
      bannerEl.classList.toggle('granted', granted);
      bannerEl.classList.toggle('denied', !granted);
    }
    if (ringEl) {
      ringEl.classList.toggle('granted', granted);
      ringEl.classList.toggle('denied', !granted);
    }
    if (svgEl) {
      svgEl.innerHTML = granted
        ? '<polyline points="20 6 9 17 4 12"></polyline>'
        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
    }
    if (headlineEl) {
      headlineEl.textContent = granted ? 'ACCESS GRANTED' : 'ACCESS DENIED';
      headlineEl.classList.toggle('granted', granted);
      headlineEl.classList.toggle('denied', !granted);
    }
    if (punctEl) {
      punctEl.textContent = v.punctuality_label || (granted ? 'ON TIME' : 'RESTRICTED');
      punctEl.className = `kiosk-punctuality-pill ${granted ? (v.punctuality || 'on_time') : 'restricted'}`;
    }
    if (reasonEl) {
      reasonEl.textContent = v.reason || '';
    }

    // Inbound & Outbound Timestamps
    const inTrigger = document.getElementById('kiosk-trigger-in');
    const outTrigger = document.getElementById('kiosk-trigger-out');
    const inTimeEl = document.getElementById('kiosk-in-time');
    const outTimeEl = document.getElementById('kiosk-out-time');

    if (inTimeEl) {
      inTimeEl.textContent = v.check_in_time ? `In: ${v.check_in_time}` : 'Click to Record Check-In';
    }
    if (outTimeEl) {
      outTimeEl.textContent = v.check_out_time ? `Out: ${v.check_out_time}` : 'Click to Record Check-Out';
    }
    if (inTrigger) {
      inTrigger.classList.toggle('in-active', Boolean(v.check_in_time));
    }
    if (outTrigger) {
      outTrigger.classList.toggle('out-active', Boolean(v.check_out_time));
    }

    // Linked Stock Batch Custody Bar
    const batchBar = document.getElementById('kiosk-batch-bar');
    const batchNumEl = document.getElementById('kiosk-batch-number');
    const batchRouteEl = document.getElementById('kiosk-batch-route');
    const inspectBtn = document.getElementById('kiosk-inspect-batch-btn');

    const batches = Array.isArray(v.linked_batches) && v.linked_batches.length > 0
      ? v.linked_batches
      : state.batches.filter((bt) => Number(bt.technician_id) === Number(b.user_id));

    if (batchBar) {
      if (batches.length > 0) {
        const firstBatch = batches[0];
        batchBar.style.display = 'flex';
        if (batchNumEl) batchNumEl.textContent = firstBatch.batch_number;
        if (batchRouteEl) {
          batchRouteEl.textContent = `${firstBatch.source_name} → ${firstBatch.destination_name} [${firstBatch.status}]`;
        }
        if (inspectBtn) {
          inspectBtn.onclick = function () {
            openBatchModal(firstBatch.id);
          };
        }
      } else {
        batchBar.style.display = 'flex';
        if (batchNumEl) batchNumEl.textContent = 'NO ACTIVE BATCH';
        if (batchRouteEl) {
          batchRouteEl.textContent = state.checkpointType === 'stock_warehouse'
            ? 'No equipment dispatch batch assigned to this badge'
            : 'Venue crew shift entry (no stock batch required)';
        }
        if (inspectBtn) {
          inspectBtn.onclick = function () {
            if (state.batches.length > 0) openBatchModal(state.batches[0].id);
          };
        }
      }
    }

    // Footer Bar
    const footerBadgeEl = document.getElementById('kiosk-footer-badge');
    const footerStatusEl = document.getElementById('kiosk-footer-status');
    if (footerBadgeEl) {
      footerBadgeEl.textContent = `BADGE #: ${b.badge_code}`;
    }
    if (footerStatusEl) {
      footerStatusEl.textContent = `${v.checkpoint_name || state.activeCheckpoint.name} Clearance - ${
        granted ? 'Verified' : 'Denied'
      }`;
      footerStatusEl.className = `kiosk-footer-clearance-status ${granted ? 'verified' : 'denied'}`;
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
    const listEl = document.getElementById('timeline-feed-list');
    const pageInfoEl = document.getElementById('timeline-page-info');
    const prevBtn = document.getElementById('timeline-prev-btn');
    const nextBtn = document.getElementById('timeline-next-btn');
    if (!listEl) return;

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

    if (pageItems.length === 0) {
      listEl.innerHTML = `<div style="padding: 24px; text-align: center; font-size: 12px; color: var(--text-secondary);">No gate activity logs match your filter.</div>`;
    } else {
      listEl.innerHTML = pageItems
        .map((item) => {
          const isDenied = item.access_status === 'denied';
          const isStock = item.checkpoint_type === 'stock_warehouse';
          return `
            <div class="timeline-event-card" data-timeline-uid="${item.user_id}">
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

    if (pageInfoEl) {
      pageInfoEl.textContent = `Page ${state.timelinePage} of ${totalPages} (${filtered.length} logs)`;
    }
    if (prevBtn) prevBtn.disabled = state.timelinePage <= 1;
    if (nextBtn) nextBtn.disabled = state.timelinePage >= totalPages;
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

    rowsEl.innerHTML = filtered
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
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="company-name">Call: <strong>${escapeHtml(cp.call_time || '08:00')}</strong></span>
                  <button
                    type="button"
                    class="calltime-edit-trigger js-open-row-calltime"
                    data-cp-type="${cp.type}"
                    data-cp-id="${cp.id}"
                    data-cp-name="${escapeHtml(cp.name)}"
                    data-call-time="${escapeHtml(cp.call_time || '08:00')}"
                    title="Change Call Time"
                  >
                    ✎ Set
                  </button>
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
            <div class="col-event-action">
              <button
                type="button"
                class="btn btn-primary-32 js-activate-checkpoint-btn"
                data-cp-type="${cp.type}"
                data-cp-id="${cp.id}"
              >
                ${isActive ? 'Active Terminal (#pane-kiosk)' : 'Open Gate Terminal'}
              </button>
            </div>
            <div class="col-actions"></div>
          </div>
        `;
      })
      .join('');
  }

  function renderBatchesAndMatrixScreen() {
    // 1. 4-Tier Matrix Overview Cards
    const matrixGrid = document.getElementById('matrix-tier-cards-grid');
    if (matrixGrid && state.clearanceMatrix.length > 0) {
      matrixGrid.innerHTML = state.clearanceMatrix
        .map(
          (m) => `
          <div class="metric-card" style="border-top: 3px solid ${escapeHtml(m.color)};">
            <div class="metric-heading">
              <span class="tier-code-badge tier-code-${escapeHtml(m.code)}">${escapeHtml(m.code)}</span>
              <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${m.member_count || 0} Staff</span>
            </div>
            <span style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escapeHtml(m.title)}</span>
            <span class="metric-context">
              Venue Access: <strong>${escapeHtml(m.venue_Rule)}</strong> · Stock Access: <strong>${escapeHtml(m.stock_rule)}</strong>
            </span>
          </div>
        `
        )
        .join('');
    }

    // 2. Equipment Batches Custody Table
    const batchesRowsEl = document.getElementById('batches-table-rows');
    const batchesBadge = document.getElementById('batches-count-badge');
    if (batchesBadge) batchesBadge.textContent = String(state.batches.length).padStart(2, '0');

    if (batchesRowsEl) {
      batchesRowsEl.innerHTML = state.batches
        .map((b) => {
          const isApproved = b.status === 'approved';
          return `
            <div class="tier-table-row" style="height: 68px;">
              <div style="width: 210px; display: flex; flex-direction: column; gap: 3px;">
                <span class="badge-code-primary">${escapeHtml(b.batch_number)}</span>
                <span style="font-size: 10px; color: var(--text-secondary);">Job Sheet: ${escapeHtml(b.job_sheet)} · ${escapeHtml(b.event_name)}</span>
              </div>
              <div style="width: 220px; display: flex; flex-direction: column; gap: 3px;">
                <span style="font-size: 11px; font-weight: 600;">${escapeHtml(b.source_name)} → ${escapeHtml(b.destination_name)}</span>
                <span style="font-size: 10px; color: var(--text-secondary);">${escapeHtml(b.destination_room)} (${escapeHtml(b.movement_type)})</span>
              </div>
              <div style="width: 200px; display: flex; flex-direction: column; gap: 3px;">
                <span style="font-size: 11px; font-weight: 600;">${escapeHtml(b.technician_name)}</span>
                <span style="font-size: 10px; color: var(--text-secondary);">${escapeHtml(b.technician_badge)} · Tier ${escapeHtml(b.technician_clearance)}</span>
              </div>
              <div style="width: 140px; font-size: 11px;">
                ${escapeHtml(b.stock_controller_name)}
              </div>
              <div style="width: 120px;">
                <span class="status-badge ${isApproved ? 'status-badge-green-sm' : 'status-badge-amber-sm'}">
                  ${escapeHtml(b.status.toUpperCase())}
                </span>
              </div>
              <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                <button type="button" class="btn btn-secondary-32-sm js-open-batch-modal" data-batch-id="${b.id}">
                  Inspect Manifest
                </button>
                ${
                  !isApproved
                    ? `<button type="button" class="btn btn-primary-32 js-approve-batch-btn" data-batch-id="${b.id}">Approve Batch</button>`
                    : ''
                }
              </div>
            </div>
          `;
        })
        .join('');
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

  function openKioskModal(memberOrId = null) {
    let member = null;
    if (typeof memberOrId === 'object' && memberOrId !== null) {
      member = memberOrId;
    } else if (memberOrId != null) {
      member = (state.crew || []).find((c) => Number(c.id) === Number(memberOrId));
    } else if (state.selectedCrewId) {
      member = (state.crew || []).find((c) => Number(c.id) === Number(state.selectedCrewId));
    }
    if (!member && state.crew && state.crew.length > 0) {
      member = state.crew[0];
    }

    if (member) {
      state.selectedCrewId = Number(member.id);
      state.currentVerification = buildClientVerificationFromMember(member);
      const inp = document.getElementById('kiosk-badge-input');
      const matchTag = document.getElementById('kiosk-search-match-tag');
      const clearBtn = document.getElementById('kiosk-input-clear-btn');
      if (inp) {
        inp.value = member.badge_code || member.staff_code || '';
        if (clearBtn) clearBtn.style.display = 'flex';
        if (matchTag) {
          matchTag.style.display = 'inline-flex';
          matchTag.innerHTML = `
            <span class="tier-code-badge tier-code-${escapeHtml(member.clearance_code)}">${escapeHtml(member.clearance_code)}</span>
            <span>${escapeHtml(member.full_name)} (${escapeHtml(member.badge_code)})</span>
          `;
        }
      }
    }

    renderVerificationDeck();
    highlightSelectedCrewRow(state.selectedCrewId);

    const backdrop = document.getElementById('kiosk-modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const inp = document.getElementById('kiosk-badge-input');
      if (inp) {
        setTimeout(() => {
          inp.focus();
          inp.select();
        }, 90);
      }
    }
  }

  function closeKioskModal() {
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
      } else {
        footerEl.textContent = `Showing ${state.stockManager.items.length} inventory equipment items`;
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

  function renderStockItemsTable() {
    const rowsEl = document.getElementById('sm-items-rows');
    const footerEl = document.getElementById('sm-results-footer');
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

    if (footerEl) {
      footerEl.textContent = `Showing ${list.length} of ${state.stockManager.items.length} inventory equipment items`;
    }

    if (list.length === 0) {
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

    rowsEl.innerHTML = list
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
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Stock Item';
      if (idInput) idInput.value = '0';
      if (qtyInput) qtyInput.value = 1;
      if (condSelect) condSelect.value = 'good';
      if (statusSelect) statusSelect.value = 'available';
    }

    modal.classList.add('open');
  }

  function openUserModal(userId = null) {
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
      if (roleSelect) roleSelect.value = 'technician';
      if (deptSelect) deptSelect.value = 'Audio';
      if (clearanceSelect) clearanceSelect.value = 'L2_TECH_STAGE';
      if (stockAccessSelect) stockAccessSelect.value = 'assigned_only';
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
    const rowsEl = document.getElementById('roles-table-rows');
    if (!rowsEl) return;

    const roles = Array.isArray(state.roles) ? state.roles : [];
    const crew = Array.isArray(state.crew) ? state.crew : [];

    // Recalculate staff counts dynamically from current crew list
    roles.forEach((r) => {
      const rKey = (r.role_key || '').toLowerCase();
      r.staff_count = crew.filter((c) => (c.role || '').toLowerCase() === rKey).length;
    });

    // Update KPI counters
    const l1Roles = roles.filter((r) => (r.clearance_code || '').startsWith('L1')).length;
    const l2Roles = roles.filter((r) => (r.clearance_code || '').startsWith('L2')).length;
    const l3Roles = roles.filter((r) => (r.clearance_code || '').startsWith('L3')).length;
    const l4Roles = roles.filter((r) => (r.clearance_code || '').startsWith('L4')).length;

    const elL1 = document.getElementById('roles-kpi-l1');
    const elL2 = document.getElementById('roles-kpi-l2');
    const elL3 = document.getElementById('roles-kpi-l3');
    const elL4 = document.getElementById('roles-kpi-l4');
    const elBadge = document.getElementById('roles-badge-count');
    const elPillRoles = document.getElementById('pill-roles-count');
    const elPillCrew = document.getElementById('pill-personnel-count');

    if (elL1) elL1.textContent = String(l1Roles).padStart(2, '0') + ' Roles';
    if (elL2) elL2.textContent = String(l2Roles).padStart(2, '0') + ' Roles';
    if (elL3) elL3.textContent = String(l3Roles).padStart(2, '0') + ' Role' + (l3Roles === 1 ? '' : 's');
    if (elL4) elL4.textContent = String(l4Roles).padStart(2, '0') + ' Roles';
    if (elBadge) elBadge.textContent = `${roles.length} Roles`;
    if (elPillRoles) elPillRoles.textContent = String(roles.length);
    if (elPillCrew) elPillCrew.textContent = String(crew.length);

    // Populate roles department filter dropdown
    const deptSelect = document.getElementById('roles-filter-dept');
    if (deptSelect && deptSelect.options.length <= 1) {
      const depts = Array.from(new Set(roles.map((r) => r.department).filter(Boolean))).sort();
      depts.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptSelect.appendChild(opt);
      });
    }

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
      if (filterTier !== 'all' && !(r.clearance_code || '').startsWith(filterTier)) {
        return false;
      }
      if (filterDept !== 'all' && (r.department || '').toLowerCase() !== filterDept.toLowerCase()) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      rowsEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No technical roles match the selected filter.</div>`;
      return;
    }

    rowsEl.innerHTML = filtered.map((r) => {
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
              <span class="status-dot"></span>
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
            <button type="button" class="btn-ghost-sm js-filter-crew-by-role" data-role-key="${escapeHtml(r.role_key)}" title="Click to view assigned personnel in directory" style="background: #edf2f7; border-radius: 12px; padding: 3px 10px; font-size: 11px; font-weight: 600; cursor: pointer; border: none;">
              👥 ${r.staff_count} Staff
            </button>
          </div>

          <div style="width: 85px;">
            ${typeTag}
          </div>

          <div style="width: 130px; display: flex; justify-content: flex-end; gap: 6px;">
            <button type="button" class="btn btn-secondary-32 js-edit-role" data-role-id="${r.id}" title="Edit Role & Clearance" style="padding: 0 10px; font-size: 11px;">
              ✏️ Edit
            </button>
            ${isSys
              ? `<button type="button" class="btn btn-secondary-32" disabled title="Protected Core System Role" style="opacity: 0.35; cursor: not-allowed; padding: 0 8px; font-size: 11px;">🔒</button>`
              : `<button type="button" class="btn btn-secondary-32 js-delete-role" data-role-id="${r.id}" data-role-title="${escapeHtml(r.title)}" data-assigned="${r.staff_count}" title="Delete Custom Role" style="color: #dc2626; padding: 0 8px; font-size: 11px;">🗑️</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  }

  function openRoleModal(role = null) {
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

  function populateRoleDropdowns() {
    const roleSelects = [
      document.getElementById('user-modal-role'),
      document.getElementById('reg-role'),
    ];

    if (!Array.isArray(state.roles) || state.roles.length === 0) return;

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

  function renderUsersScreen() {
    const rowsEl = document.getElementById('users-table-rows') || document.getElementById('users-table-body');
    if (!rowsEl) return;
    populateRoleDropdowns();
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
      const typeLabel = type === 'warehouse' ? 'warehouse facility' : (type === 'user' ? 'personnel record & badge credentials for' : 'stock item');
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
    // Sidebar navigation (Restricted for Stock Controllers)
    document.querySelectorAll('.sidebar .nav-item[data-nav-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav-target');
        if (isCurrentUserStockController() && target !== 'attendees') {
          showToast('Access Restricted: Stock Controllers are assigned exclusively to Staff ID Badges & Gate Terminal (#pane-kiosk).');
          return;
        }
        switchScreen(target);
      });
    });

    const brandHome = document.getElementById('brand-home-btn');
    if (brandHome) {
      brandHome.addEventListener('click', () => {
        if (isCurrentUserStockController()) {
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
        if (isCurrentUserStockController()) {
          showToast('Access Restricted: Stock Controllers are assigned exclusively to Stock Warehouse Gate Terminal (#pane-kiosk).');
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

    // 4-Tier Access Matrix nav shortcut
    const matrixNavBtn = document.getElementById('nav-access-matrix-btn');
    if (matrixNavBtn) {
      matrixNavBtn.addEventListener('click', () => {
        if (isCurrentUserStockController()) {
          showToast('Access Restricted: 4-Tier Access Matrix configuration requires Supervisor or Administrator privileges.');
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
        const codeToScan = matched ? matched.badge_code : val;
        triggerGateScan(codeToScan);
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
    if (topAvatar && userDropdown) {
      topAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isCurrentUserAdmin()) {
          closeAllTopbarDropdowns();
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
        const uid = Number(switchRow.getAttribute('data-user-id'));
        const badge = switchRow.getAttribute('data-badge');
        closeSwitchUserModal();
        try {
          const res = await fetch('api.php?action=switch_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ user_id: uid, badge_code: badge }),
          });
          const data = await res.json();
          if (data && data.ok) {
            state.currentUser = data.user;
            renderTopbarAndKpis();
            if (isCurrentUserStockController()) {
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

    // Inbound (`In`) & Outbound (`Out`) Timestamp Triggers inside `#pane-kiosk`
    const inTrigger = document.getElementById('kiosk-trigger-in');
    if (inTrigger) {
      inTrigger.addEventListener('click', () => {
        if (state.currentVerification && state.currentVerification.badge) {
          triggerGateScan(state.currentVerification.badge.badge_code, 'check_in');
        }
      });
    }

    const outTrigger = document.getElementById('kiosk-trigger-out');
    if (outTrigger) {
      outTrigger.addEventListener('click', () => {
        if (state.currentVerification && state.currentVerification.badge) {
          triggerGateScan(state.currentVerification.badge.badge_code, 'check_out');
        }
      });
    }

    // Delegated clicks for Crew Rows, Paired Checkin/Checkout buttons, Timeline items, Checkpoint activation, and Matrix config
    document.body.addEventListener('click', async (e) => {
      // 0. Close Kiosk Modal if close button or backdrop clicked
      if (e.target.closest('#kiosk-modal-close-btn') || e.target.id === 'kiosk-modal-backdrop') {
        closeKioskModal();
        return;
      }

      // 0b. Open Kiosk from search suggestion click
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

      // 4. User Activity Timeline Card Click
      const tlCard = e.target.closest('.timeline-event-card[data-timeline-uid]');
      if (tlCard) {
        const uid = Number(tlCard.getAttribute('data-timeline-uid'));
        const member = state.crew.find((m) => Number(m.id) === uid);
        if (member) {
          openKioskModal(member);
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

    // Global Escape key to dismiss Kiosk modal or search suggestions
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeKioskModal();
        const sEl = document.getElementById('directory-search-suggest');
        if (sEl) sEl.style.display = 'none';
      }
    });

    const evSearch = document.getElementById('events-search-input');
    if (evSearch) {
      evSearch.addEventListener('input', (e) => {
        state.checkpointSearch = e.target.value;
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

    // User Activity Timeline Filters & Pagination
    const tlSearch = document.getElementById('timeline-search-input');
    if (tlSearch) {
      tlSearch.addEventListener('input', (e) => {
        state.timelineSearch = e.target.value;
        state.timelinePage = 1;
        renderActivityTimeline();
      });
    }

    const tlScope = document.getElementById('timeline-scope-select');
    if (tlScope) {
      tlScope.addEventListener('change', (e) => {
        state.timelineScope = e.target.value;
        state.timelinePage = 1;
        renderActivityTimeline();
      });
    }

    const tlPrev = document.getElementById('timeline-prev-btn');
    if (tlPrev) {
      tlPrev.addEventListener('click', () => {
        if (state.timelinePage > 1) {
          state.timelinePage--;
          renderActivityTimeline();
        }
      });
    }

    const tlNext = document.getElementById('timeline-next-btn');
    if (tlNext) {
      tlNext.addEventListener('click', () => {
        state.timelinePage++;
        renderActivityTimeline();
      });
    }

    // Modals: Roll-Call Modal
    const rollcallModal = document.getElementById('rollcall-modal');
    document.querySelectorAll('.js-open-rollcall-modal, #sidebar-rollcall-btn, #topbar-help-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.id === 'sidebar-rollcall-btn' && isCurrentUserStockController()) {
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
        if (btn.id === 'sidebar-station-lock-btn' && isCurrentUserStockController()) {
          showToast('Access Restricted: Station PIN Locking requires Supervisor or Administrator privileges.');
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

    // Sidebar Set Call Time Button
    const sidebarCallTimeBtn = document.getElementById('sidebar-calltime-btn');
    if (sidebarCallTimeBtn) {
      sidebarCallTimeBtn.addEventListener('click', () => {
        if (isCurrentUserStockController()) {
          showToast('Access Restricted: Setting Call Times requires Supervisor or Administrator privileges.');
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

    
    // View Switcher between Personnel Directory and Roles CRUD
    const tabPersonnel = document.getElementById('view-tab-personnel');
    const tabRoles = document.getElementById('view-tab-roles');
    const personnelView = document.getElementById('personnel-view-container');
    const rolesView = document.getElementById('roles-view-container');
    const addStaffBtn = document.getElementById('open-add-user-btn');
    const addRoleBtn = document.getElementById('open-add-role-btn');

    function switchUsersView(mode) {
      state.usersViewMode = mode;
      if (mode === 'roles') {
        if (tabPersonnel) {
          tabPersonnel.className = 'btn btn-secondary-32 js-users-view-tab';
          const icon = tabPersonnel.querySelector('img');
          if (icon) icon.style.filter = 'none';
        }
        if (tabRoles) {
          tabRoles.className = 'btn btn-primary-32 js-users-view-tab active-subtab';
          const icon = tabRoles.querySelector('img');
          if (icon) icon.style.filter = 'brightness(0) invert(1)';
        }
        if (personnelView) personnelView.style.display = 'none';
        if (rolesView) rolesView.style.display = 'block';
        if (addStaffBtn) addStaffBtn.style.display = 'none';
        if (addRoleBtn) addRoleBtn.style.display = 'inline-flex';
        renderRolesScreen();
      } else {
        if (tabPersonnel) {
          tabPersonnel.className = 'btn btn-primary-32 js-users-view-tab active-subtab';
          const icon = tabPersonnel.querySelector('img');
          if (icon) icon.style.filter = 'brightness(0) invert(1)';
        }
        if (tabRoles) {
          tabRoles.className = 'btn btn-secondary-32 js-users-view-tab';
          const icon = tabRoles.querySelector('img');
          if (icon) icon.style.filter = 'none';
        }
        if (personnelView) personnelView.style.display = 'block';
        if (rolesView) rolesView.style.display = 'none';
        if (addStaffBtn) addStaffBtn.style.display = 'inline-flex';
        if (addRoleBtn) addRoleBtn.style.display = 'none';
        renderUsersScreen();
      }
    }

    if (tabPersonnel) tabPersonnel.addEventListener('click', () => switchUsersView('personnel'));
    if (tabRoles) tabRoles.addEventListener('click', () => switchUsersView('roles'));

    // Open Add Role Modal
    if (addRoleBtn) {
      addRoleBtn.addEventListener('click', () => openRoleModal(null));
    }

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
    });

    // Submit Call Time Form
    const callTimeForm = document.getElementById('call-time-form');
    if (callTimeForm) {
      callTimeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cpType = document.getElementById('call-time-cp-type').value;
        const cpId = document.getElementById('call-time-cp-id').value;
        const callTime = document.getElementById('call-time-input').value;

        try {
          const res = await fetch('api.php?action=update_call_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_call_time',
              checkpoint_type: cpType,
              checkpoint_id: cpId,
              call_time: callTime,
            }),
          });
          const data = await res.json();
          if (data && data.ok) {
            applyBootstrapPayload(data, true);
            if (callTimeModal) callTimeModal.classList.remove('open');
            showToast(`Scheduled Call Time set to ${callTime} (${cpType === 'stock_warehouse' ? 'Stock Warehouse' : 'Event Venue'})`);
          } else {
            showToast('Failed to update call time');
          }
        } catch (err) {
          showToast('Error communicating with server');
        }
      });
    }

    // Reset Today's Scans
    ['reset-demo-db-btn', 'sidebar-reset-demo-btn'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', async () => {
          if (isCurrentUserStockController()) {
            showToast('Access Restricted: Resetting scans requires Administrator privileges.');
            return;
          }
          const res = await fetch('api.php?action=reset_demo', { method: 'POST' });
          const data = await res.json();
          if (data && data.ok) {
            applyBootstrapPayload(data, false);
            showToast('Today’s gate scans reset and re-seeded in MySQL');
          }
        });
      }
    });

    // Export CSV
    document.querySelectorAll('.js-export-attendees').forEach((btn) => {
      btn.addEventListener('click', () => {
        const headers = ['Badge Code', 'Staff Code', 'Full Name', 'Role', 'Department', 'Clearance', 'State', 'Check-In', 'Check-Out'];
        const rows = state.crew.map((c) => [
          c.badge_code,
          c.staff_code,
          `"${c.full_name}"`,
          c.role_display,
          c.department,
          c.clearance_code,
          c.daily_state,
          c.check_in_time || '',
          c.check_out_time || '',
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ability_gate_roster_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported aBility Gate Roster CSV');
      });
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
        renderStockItemsTable();
      });
    }

    const catFilter = document.getElementById('sm-category-filter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        state.stockManager.categoryFilter = e.target.value;
        renderStockItemsTable();
      });
    }

    const locFilter = document.getElementById('sm-location-filter');
    if (locFilter) {
      locFilter.addEventListener('change', (e) => {
        state.stockManager.locationFilter = e.target.value;
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
            if (type === 'user') {
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

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    if (window.location.hash === '#pane-kiosk') {
      switchScreen('attendees', 'pane-kiosk');
    }
    await fetchBootstrap(false);
    if (isCurrentUserStockController()) {
      switchScreen('attendees', 'pane-kiosk');
      applyNavigationRestrictions();
    }
    loadStockManagerData();
  });
})();
