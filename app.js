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

    // User Activity Timeline pagination (5 items per page)
    timelineSearch: '',
    timelineScope: 'all',
    timelinePage: 1,
    timelinePerPage: 5,

    // Currently inspected batch in modal
    inspectedBatchId: null,
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
      const data = await res.json();
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
    state.activeScreen = screenKey;
    const screens = {
      overview: document.getElementById('screen-overview'),
      events: document.getElementById('screen-events'),
      attendees: document.getElementById('screen-attendees'),
      analytics: document.getElementById('screen-analytics'),
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
      attendees: 'Staff ID Badges & Gate Terminal (#pane-kiosk)',
      analytics: 'Stock Batch Approvals & 4-Tier Access Matrix',
    };
    const bc = document.getElementById('breadcrumb-page');
    if (bc) bc.textContent = pageTitles[screenKey] || 'Gate Dashboard';

    if (scrollToId) {
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
  }

  function renderTopbarAndKpis() {
    const dbText = document.getElementById('topbar-db-text');
    if (dbText) {
      dbText.textContent = state.dbSource === 'ability_db'
        ? 'Connected: ability_db (Live)'
        : 'Connected: attendance_app (Standalone)';
    }

    const k = state.kpis;
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
    if (dirRowsEl) {
      const dirList = filterCrewList(state.directoryTab, state.directorySearch);
      dirRowsEl.innerHTML = renderCrewRowsHtml(dirList);
      if (dirCountEl) {
        dirCountEl.textContent = `Showing ${dirList.length} of ${state.crew.length} badged production crew`;
      }
    }
  }

  function renderCheckpointsDirectory() {
    const rowsEl = document.getElementById('events-table-rows');
    if (!rowsEl) return;

    const allCps = state.checkpoints.directory || [];
    const stocksCount = (state.checkpoints.stock_warehouses || []).length;
    const venuesCount = (state.checkpoints.event_venues || []).length;

    const totalKpi = document.getElementById('events-total-kpi');
    const stockKpi = document.getElementById('events-stock-kpi');
    const venueKpi = document.getElementById('events-venue-kpi');
    const batchKpi = document.getElementById('events-batches-kpi');
    const sidebarCount = document.getElementById('sidebar-events-count');
    const dirBadge = document.getElementById('events-directory-badge');

    if (totalKpi) totalKpi.textContent = String(allCps.length).padStart(2, '0');
    if (stockKpi) stockKpi.textContent = String(stocksCount).padStart(2, '0');
    if (venueKpi) venueKpi.textContent = String(venuesCount).padStart(2, '0');
    if (batchKpi) batchKpi.textContent = String(state.batches.length).padStart(2, '0');
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
  // EVENT LISTENERS
  // =========================================================================

  function bindEvents() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar .nav-item[data-nav-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchScreen(btn.getAttribute('data-nav-target'));
      });
    });

    const brandHome = document.getElementById('brand-home-btn');
    if (brandHome) brandHome.addEventListener('click', () => switchScreen('overview'));

    // Venue Security Portal nav shortcut
    const venueSecBtn = document.getElementById('nav-venue-security-btn');
    if (venueSecBtn) {
      venueSecBtn.addEventListener('click', () => {
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

    // Topbar Quick Search (`⌘K`)
    const topSearch = document.getElementById('topbar-search-input');
    if (topSearch) {
      topSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = topSearch.value.trim();
          if (val) {
            const matched = findCrewMember(val);
            switchScreen('attendees', 'pane-kiosk');
            triggerGateScan(matched ? matched.badge_code : val);
            topSearch.value = '';
          }
        }
      });
    }

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
          state.selectedCrewId = cid;
          state.currentVerification = buildClientVerificationFromMember(member);
          switchScreen('attendees', 'pane-kiosk');
          renderAll();
        }
        return;
      }

      // 3. Crew Roster Row Click -> Load member in `#pane-kiosk`
      const crewRow = e.target.closest('.attendee-table-row[data-crew-id]');
      if (crewRow) {
        const cid = Number(crewRow.getAttribute('data-crew-id'));
        const member = state.crew.find((m) => Number(m.id) === cid);
        if (member) {
          state.selectedCrewId = cid;
          state.currentVerification = buildClientVerificationFromMember(member);
          const inp = document.getElementById('kiosk-badge-input');
          if (inp) {
            inp.value = member.badge_code;
            if (kioskClearBtn) kioskClearBtn.style.display = 'flex';
            if (kioskMatchTag) {
              kioskMatchTag.style.display = 'inline-flex';
              kioskMatchTag.innerHTML = `
                <span class="tier-code-badge tier-code-${escapeHtml(member.clearance_code)}">${escapeHtml(member.clearance_code)}</span>
                <span>${escapeHtml(member.full_name)} (${escapeHtml(member.badge_code)})</span>
              `;
            }
          }
          renderAll();
          showToast(`Loaded ${member.full_name} (${member.badge_code} · ${member.clearance_code}) into Kiosk Deck`);
        }
        return;
      }

      // 4. User Activity Timeline Card Click
      const tlCard = e.target.closest('.timeline-event-card[data-timeline-uid]');
      if (tlCard) {
        const uid = Number(tlCard.getAttribute('data-timeline-uid'));
        const member = state.crew.find((m) => Number(m.id) === uid);
        if (member) {
          state.selectedCrewId = uid;
          state.currentVerification = buildClientVerificationFromMember(member);
          switchScreen('attendees', 'pane-kiosk');
          renderAll();
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
    if (dirSearch) {
      dirSearch.addEventListener('input', (e) => {
        state.directorySearch = e.target.value;
        renderCrewTables();
      });
    }

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
  });
})();
