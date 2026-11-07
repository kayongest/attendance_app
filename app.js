/**
 * Identity AttendanceApp — Interactive UI & PHP/MySQL Persistence Logic
 * Connects all 4 screens (Overview, Events, Attendees, Analytics)
 * to the XAMPP PHP/MySQL backend (`api.php` + `db.php`).
 */

(function () {
  'use strict';

  // --- Initial State (Hydrated from MySQL via `api.php?action=bootstrap`) ---
  const state = {
    currentScreen: 'overview', // 'overview' | 'events' | 'attendees' | 'analytics'
    mysqlConnected: false,
    stats: {
      totalPeople: 1338,
      registered: 1284,
      checkedIn: 964,
      waitlist: 42,
      cancelled: 12,
      checkedInDelta: 186,
      ticketRevenue: 128400,
      lastArrivalTime: '10:06 AM'
    },
    overviewTable: {
      tab: 'all',
      search: '',
      ticketFilter: 'all',
      statusFilter: 'all',
      checkinFilter: 'all',
      sortAsc: true
    },
    directoryTable: {
      tab: 'all',
      search: '',
      ticketFilter: 'all',
      statusFilter: 'all',
      checkinFilter: 'all',
      sortAsc: true
    },
    eventsTable: {
      tab: 'all',
      search: '',
      typeFilter: 'all',
      sortAsc: true
    },
    intervals: [
      { id: 1, slotLabel: '08:00', guestCount: 18, barHeightPx: 10.8, isPeak: false },
      { id: 2, slotLabel: '08:30', guestCount: 46, barHeightPx: 27.6, isPeak: false },
      { id: 3, slotLabel: '09:00', guestCount: 112, barHeightPx: 67.2, isPeak: false },
      { id: 4, slotLabel: '09:30', guestCount: 176, barHeightPx: 105.6, isPeak: true },
      { id: 5, slotLabel: '10:00', guestCount: 154, barHeightPx: 92.4, isPeak: false },
      { id: 6, slotLabel: '10:30', guestCount: 113, barHeightPx: 67.8, isPeak: false },
      { id: 7, slotLabel: '11:00', guestCount: 89, barHeightPx: 53.4, isPeak: false },
      { id: 8, slotLabel: '11:30', guestCount: 62, barHeightPx: 37.2, isPeak: false },
      { id: 9, slotLabel: '12:00', guestCount: 42, barHeightPx: 25.2, isPeak: false },
      { id: 10, slotLabel: '12:30', guestCount: 28, barHeightPx: 16.8, isPeak: false },
      { id: 11, slotLabel: '13:00', guestCount: 24, barHeightPx: 14.4, isPeak: false }
    ],
    analytics: {
      peakGuests: 176,
      peakTime: '09:30 AM',
      avgCheckinSeconds: '4.2s',
      vipRemaining: 25,
      ticketTiers: [
        {
          tier: 'General admission',
          registered: 912,
          checkedIn: 689,
          rate: 75.5,
          revenue: 86640,
          priceLabel: '$95',
          badgeType: 'neutral'
        },
        {
          tier: 'VIP pass',
          registered: 310,
          checkedIn: 221,
          rate: 71.3,
          revenue: 41760,
          priceLabel: '$240',
          badgeType: 'purple'
        },
        {
          tier: 'Speaker & Press',
          registered: 62,
          checkedIn: 54,
          rate: 87.1,
          revenue: 0,
          priceLabel: 'Comp',
          badgeType: 'green'
        }
      ],
      stations: [
        {
          name: 'North Foyer Kiosk 01',
          location: 'Main Entrance · Terminal A',
          processed: 342,
          avgSpeed: '4.1s',
          status: 'Online',
          sharePct: 36
        },
        {
          name: 'North Foyer Kiosk 02',
          location: 'Main Entrance · Terminal B',
          processed: 318,
          avgSpeed: '4.4s',
          status: 'Online',
          sharePct: 33
        },
        {
          name: 'VIP Express Desk 03',
          location: 'West Lounge · Fast Track',
          processed: 221,
          avgSpeed: '3.6s',
          status: 'Online',
          sharePct: 23
        },
        {
          name: 'Speaker & Press Desk 04',
          location: 'Green Room · Backstage',
          processed: 83,
          avgSpeed: '3.2s',
          status: 'Online',
          sharePct: 8
        }
      ],
      roleDistribution: [
        { role: 'Product & UX Designers', count: 540, pct: 42 },
        { role: 'Design Directors & Heads', count: 334, pct: 26 },
        { role: 'Founders & Executives', count: 244, pct: 19 },
        { role: 'Design Engineers & PMs', count: 166, pct: 13 }
      ],
      recentLogs: [
        {
          id: 7,
          attendeeId: 'att-3',
          name: 'Lana Steiner',
          initials: 'LS',
          avatarBg: '#f5ece5',
          avatarColor: '#ac7b53',
          company: 'Catalog',
          ticket: 'General admission',
          station: 'North Foyer Kiosk 02',
          checkinTime: '10:06 AM'
        },
        {
          id: 6,
          attendeeId: 'att-10',
          name: 'Noah Williams',
          initials: 'NW',
          avatarBg: '#ececf6',
          avatarColor: '#787b9d',
          company: 'Notion',
          ticket: 'VIP pass',
          station: 'VIP Express Desk 03',
          checkinTime: '09:45 AM'
        },
        {
          id: 5,
          attendeeId: 'att-5',
          name: 'Drew Cano',
          initials: 'DC',
          avatarBg: '#ececf3',
          avatarColor: '#797a94',
          company: 'Hourglass',
          ticket: 'General admission',
          station: 'North Foyer Kiosk 01',
          checkinTime: '09:38 AM'
        },
        {
          id: 4,
          attendeeId: 'att-9',
          name: 'Ava Thompson',
          initials: 'AT',
          avatarBg: '#e7f1ec',
          avatarColor: '#53856a',
          company: 'Linear',
          ticket: 'General admission',
          station: 'North Foyer Kiosk 02',
          checkinTime: '09:26 AM'
        },
        {
          id: 3,
          attendeeId: 'att-1',
          name: 'Olivia Rhye',
          initials: 'OR',
          avatarBg: '#f0eafa',
          avatarColor: '#8862b4',
          company: 'Layers',
          ticket: 'General admission',
          station: 'North Foyer Kiosk 01',
          checkinTime: '09:12 AM'
        }
      ]
    },
    attendees: [
      {
        id: 'att-1',
        initials: 'OR',
        bgOverview: '#f0eafa',
        bgDirectory: '#f0ebff',
        color: '#8862b4',
        name: 'Olivia Rhye',
        email: 'olivia@layers.design',
        company: 'Layers',
        role: 'Product Designer',
        ticket: 'General admission',
        ticketHighlight: false,
        registeredDate: 'Oct 12, 2026',
        status: 'Registered',
        checkedIn: true,
        checkinTime: '09:12 AM',
        selected: false
      },
      {
        id: 'att-2',
        initials: 'PB',
        bgOverview: '#eaf0f8',
        bgDirectory: '#eaf0fa',
        color: '#5578a1',
        colorDirectory: '#517eaf',
        name: 'Phoenix Baker',
        email: 'phoenix@sisyphus.com',
        company: 'Sisyphus',
        role: 'Design Director',
        ticket: 'VIP pass',
        ticketHighlight: true,
        registeredDate: 'Oct 13, 2026',
        status: 'Registered',
        checkedIn: true,
        checkinTime: '08:54 AM',
        selected: false
      },
      {
        id: 'att-3',
        initials: 'LS',
        bgOverview: '#f5ece5',
        bgDirectory: '#f5ede5',
        color: '#ac7b53',
        colorDirectory: '#b67f51',
        name: 'Lana Steiner',
        email: 'lana@catalog.studio',
        company: 'Catalog',
        role: 'Creative Director',
        ticket: 'General admission',
        ticketHighlight: false,
        registeredDate: 'Oct 14, 2026',
        status: 'Registered',
        checkedIn: true,
        checkinTime: '10:06 AM',
        selected: false
      },
      {
        id: 'att-4',
        initials: 'DW',
        bgOverview: '#e8f1eb',
        bgDirectory: '#e7f1ec',
        color: '#59856a',
        colorDirectory: '#53856a',
        name: 'Demi Wilkinson',
        email: 'demi@circooles.io',
        company: 'Circooles',
        role: 'Co-founder',
        ticket: 'VIP pass',
        ticketHighlight: true,
        registeredDate: 'Oct 15, 2026',
        status: 'Registered',
        checkedIn: false,
        checkinTime: null,
        selected: false
      },
      {
        id: 'att-5',
        initials: 'DC',
        bgOverview: '#ececf3',
        bgDirectory: '#ececf6',
        color: '#797a94',
        colorDirectory: '#787b9d',
        name: 'Drew Cano',
        email: 'drew@hourglass.app',
        company: 'Hourglass',
        role: 'Product Manager',
        ticket: 'General admission',
        ticketHighlight: false,
        registeredDate: 'Oct 18, 2026',
        status: 'Registered',
        checkedIn: true,
        checkinTime: '09:38 AM',
        selected: false
      },
      {
        id: 'att-6',
        initials: 'NC',
        bgOverview: '#f0eafa',
        bgDirectory: '#f0ebff',
        color: '#8862b4',
        name: 'Natali Craig',
        email: 'natali@command.design',
        company: 'Command',
        role: 'Brand Designer',
        ticket: 'General admission',
        ticketHighlight: false,
        registeredDate: 'Oct 22, 2026',
        status: 'Waitlisted',
        checkedIn: false,
        checkinTime: null,
        selected: false
      },
      {
        id: 'att-7',
        initials: 'OD',
        bgOverview: '#eaf0f8',
        bgDirectory: '#eaf0fa',
        color: '#5578a1',
        colorDirectory: '#517eaf',
        name: 'Orlando Diggs',
        email: 'orlando@feather.co',
        company: 'Feather',
        role: 'Head of Design',
        ticket: 'VIP pass',
        ticketHighlight: true,
        registeredDate: 'Oct 24, 2026',
        status: 'Registered',
        checkedIn: false,
        checkinTime: null,
        selected: false
      },
      {
        id: 'att-8',
        initials: 'AL',
        bgOverview: '#f5ece5',
        bgDirectory: '#f5ede5',
        color: '#ac7b53',
        colorDirectory: '#b67f51',
        name: 'Andi Lane',
        email: 'andi@quotient.co',
        company: 'Quotient',
        role: 'UX Researcher',
        ticket: 'General admission',
        ticketHighlight: false,
        registeredDate: 'Oct 28, 2026',
        status: 'Cancelled',
        checkedIn: false,
        checkinTime: null,
        selected: false
      },
      {
        id: 'att-9',
        initials: 'AT',
        bgOverview: '#e7f1ec',
        bgDirectory: '#e7f1ec',
        color: '#53856a',
        name: 'Ava Thompson',
        email: 'ava@linear.app',
        company: 'Linear',
        role: 'Product Designer',
        ticket: 'General admission',
        ticketHighlight: false,
        registeredDate: 'Oct 29, 2026',
        status: 'Registered',
        checkedIn: true,
        checkinTime: '09:26 AM',
        selected: false
      },
      {
        id: 'att-10',
        initials: 'NW',
        bgOverview: '#ececf6',
        bgDirectory: '#ececf6',
        color: '#787b9d',
        name: 'Noah Williams',
        email: 'noah@notion.so',
        company: 'Notion',
        role: 'Design Engineer',
        ticket: 'VIP pass',
        ticketHighlight: true,
        registeredDate: 'Nov 1, 2026',
        status: 'Registered',
        checkedIn: true,
        checkinTime: '09:45 AM',
        selected: false
      },
      {
        id: 'att-11',
        initials: 'MC',
        bgOverview: '#f0ebff',
        bgDirectory: '#f0ebff',
        color: '#8862b4',
        name: 'Mia Chen',
        email: 'mia@figma.com',
        company: 'Figma',
        role: 'Design Advocate',
        ticket: 'Speaker',
        ticketHighlight: true,
        registeredDate: 'Nov 2, 2026',
        status: 'Registered',
        checkedIn: true,
        checkinTime: '08:32 AM',
        selected: false
      },
      {
        id: 'att-12',
        initials: 'EP',
        bgOverview: '#eaf0fa',
        bgDirectory: '#eaf0fa',
        color: '#517eaf',
        name: 'Ethan Park',
        email: 'ethan@read.cv',
        company: 'Read.cv',
        role: 'Co-founder',
        ticket: 'General admission',
        ticketHighlight: false,
        registeredDate: 'Nov 4, 2026',
        status: 'Registered',
        checkedIn: false,
        checkinTime: null,
        selected: false
      }
    ],
    events: [
      {
        id: 'evt-1',
        month: 'NOV',
        day: '07',
        name: 'Form & Future Summit 2026',
        type: 'Conference',
        date: 'Nov 7, 2026',
        time: '8:00 AM – 6:00 PM',
        venue: 'Fort Mason Center',
        city: 'San Francisco, CA',
        registeredText: '1,284',
        capacityText: ' / 1,500',
        barWidthPx: 86,
        isPastBar: false,
        status: 'Live',
        actionLabel: 'Manage event →',
        actionTarget: 'overview',
        selected: false
      },
      {
        id: 'evt-2',
        month: 'NOV',
        day: '19',
        name: 'Design Leaders Dinner',
        type: 'Networking dinner',
        date: 'Nov 19, 2026',
        time: '6:30 PM – 9:30 PM',
        venue: 'The Pearl',
        city: 'San Francisco, CA',
        registeredText: '48',
        capacityText: ' / 60',
        barWidthPx: 80,
        isPastBar: false,
        status: 'Upcoming',
        actionLabel: 'Manage event →',
        actionTarget: 'attendees',
        selected: false
      },
      {
        id: 'evt-3',
        month: 'DEC',
        day: '03',
        name: 'Design Systems Workshop',
        type: 'Workshop',
        date: 'Dec 3, 2026',
        time: '9:00 AM – 4:00 PM',
        venue: 'Forma studio',
        city: 'San Francisco, CA',
        registeredText: '86',
        capacityText: ' / 120',
        barWidthPx: 72,
        isPastBar: false,
        status: 'Upcoming',
        actionLabel: 'Manage event →',
        actionTarget: 'attendees',
        selected: false
      },
      {
        id: 'evt-4',
        month: 'DEC',
        day: '10',
        name: 'Creative Community Meetup',
        type: 'Community meetup',
        date: 'Dec 10, 2026',
        time: '5:30 PM – 8:00 PM',
        venue: 'The Assembly',
        city: 'San Francisco, CA',
        registeredText: '128',
        capacityText: ' / 200',
        barWidthPx: 64,
        isPastBar: false,
        status: 'Upcoming',
        actionLabel: 'Manage event →',
        actionTarget: 'attendees',
        selected: false
      },
      {
        id: 'evt-5',
        month: 'OCT',
        day: '22',
        name: 'Product Futures Forum',
        type: 'Conference',
        date: 'Oct 22, 2026',
        time: '9:00 AM – 5:00 PM',
        venue: 'Pier 27',
        city: 'San Francisco, CA',
        registeredText: '642',
        capacityText: ' / 700',
        barWidthPx: 92,
        isPastBar: true,
        status: 'Past',
        actionLabel: 'View report →',
        actionTarget: 'analytics',
        selected: false
      },
      {
        id: 'evt-6',
        month: 'SEP',
        day: '24',
        name: 'The Shape of AI',
        type: 'Panel & networking',
        date: 'Sep 24, 2026',
        time: '5:00 PM – 8:00 PM',
        venue: 'Gray Area',
        city: 'San Francisco, CA',
        registeredText: '286',
        capacityText: ' / 300',
        barWidthPx: 95,
        isPastBar: true,
        status: 'Past',
        actionLabel: 'View report →',
        actionTarget: 'analytics',
        selected: false
      },
      {
        id: 'evt-7',
        month: 'AUG',
        day: '20',
        name: 'Summer Studio Social',
        type: 'Community meetup',
        date: 'Aug 20, 2026',
        time: '4:00 PM – 7:00 PM',
        venue: 'Forma studio',
        city: 'San Francisco, CA',
        registeredText: '158',
        capacityText: ' / 180',
        barWidthPx: 88,
        isPastBar: true,
        status: 'Past',
        actionLabel: 'View report →',
        actionTarget: 'analytics',
        selected: false
      },
      {
        id: 'evt-8',
        month: 'FEB',
        day: '18',
        name: 'Form & Future: New York',
        type: 'Conference',
        date: 'Feb 18, 2027',
        time: 'Schedule not published',
        venue: 'Venue to be confirmed',
        city: 'New York, NY',
        registeredText: '0',
        capacityText: ' / 800',
        barWidthPx: 0,
        isPastBar: false,
        status: 'Draft',
        actionLabel: 'Continue setup →',
        actionTarget: 'events',
        selected: false
      }
    ]
  };

  // --- Utility Helpers ---
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNumber(n) {
    return Number(n).toLocaleString('en-US');
  }

  function getCurrentFormattedTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('visible');
    }, 2800);
  }

  // --- Apply Payload from PHP/MySQL API (`api.php`) ---
  function applyServerPayload(payload) {
    if (!payload || !payload.ok) return;
    state.mysqlConnected = true;
    if (payload.stats) state.stats = payload.stats;
    if (Array.isArray(payload.attendees)) state.attendees = payload.attendees;
    if (Array.isArray(payload.events)) state.events = payload.events;
    if (Array.isArray(payload.intervals)) state.intervals = payload.intervals;
    if (payload.analytics) state.analytics = payload.analytics;

    const syncBadge = document.getElementById('mysql-sync-badge');
    const syncText = document.getElementById('mysql-sync-text');
    if (syncBadge) syncBadge.classList.remove('offline');
    if (syncText) syncText.textContent = 'MySQL synced · XAMPP';

    renderAll();
  }

  function syncFromMySql() {
    fetch('api.php?action=bootstrap', { cache: 'no-store' })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok) {
          applyServerPayload(data);
        }
      })
      .catch(function () {
        const syncBadge = document.getElementById('mysql-sync-badge');
        const syncText = document.getElementById('mysql-sync-text');
        if (syncBadge) syncBadge.classList.add('offline');
        if (syncText) syncText.textContent = 'Local memory mode';
      });
  }

  function postToApi(action, bodyObj, onSuccessToast) {
    return fetch('api.php?action=' + encodeURIComponent(action), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj || {})
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok) {
          applyServerPayload(data);
          if (onSuccessToast) showToast(onSuccessToast);
        }
      })
      .catch(function () {
        // Fallback already applied optimistically
      });
  }

  // --- Screen Navigation (Overview, Events, Attendees, Analytics) ---
  function switchScreen(screenName) {
    if (!['overview', 'events', 'attendees', 'analytics'].includes(screenName)) return;
    state.currentScreen = screenName;

    document.querySelectorAll('.screen-view').forEach(function (view) {
      view.classList.remove('active');
    });
    const targetView = document.getElementById('screen-' + screenName);
    if (targetView) targetView.classList.add('active');

    document.querySelectorAll('.nav-item[data-nav-target]').forEach(function (btn) {
      const target = btn.getAttribute('data-nav-target');
      btn.classList.toggle('active', target === screenName);
    });

    const iconOverview = document.getElementById('nav-icon-overview');
    const iconEvents = document.getElementById('nav-icon-events');
    const iconAttendees = document.getElementById('nav-icon-attendees');
    const iconAnalytics = document.getElementById('nav-icon-analytics');

    if (iconOverview) {
      iconOverview.src =
        screenName === 'overview'
          ? 'assets/nav-overview-active.svg'
          : 'assets/nav-overview-inactive.svg';
    }
    if (iconEvents) {
      iconEvents.src =
        screenName === 'events'
          ? 'assets/nav-events-active.svg'
          : 'assets/nav-events-inactive.svg';
    }
    if (iconAttendees) {
      iconAttendees.src =
        screenName === 'attendees'
          ? 'assets/nav-attendees-active.svg'
          : 'assets/nav-attendees-inactive.svg';
    }
    if (iconAnalytics) {
      iconAnalytics.src =
        screenName === 'analytics'
          ? 'assets/nav-analytics-active.svg'
          : 'assets/nav-analytics.svg';
    }

    const breadcrumbPage = document.getElementById('breadcrumb-page');
    if (breadcrumbPage) {
      const labels = {
        overview: 'Overview',
        events: 'Events',
        attendees: 'Attendees',
        analytics: 'Analytics'
      };
      breadcrumbPage.textContent = labels[screenName] || 'Overview';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Update Shared Metrics Across All 4 Screens ---
  function updateDashboardStats() {
    const remaining = Math.max(0, state.stats.registered - state.stats.checkedIn);
    const rate = ((state.stats.checkedIn / Math.max(1, state.stats.registered)) * 100).toFixed(1) + '%';
    const revenueFormatted = '$' + formatNumber(state.stats.ticketRevenue || 128400);

    document.querySelectorAll('.js-stat-total-people').forEach(function (el) {
      el.textContent = formatNumber(state.stats.totalPeople);
    });
    document.querySelectorAll('.js-stat-registered').forEach(function (el) {
      el.textContent = formatNumber(state.stats.registered);
    });
    document.querySelectorAll('.js-stat-checkedin').forEach(function (el) {
      el.textContent = formatNumber(state.stats.checkedIn);
    });
    document.querySelectorAll('.js-stat-remaining').forEach(function (el) {
      el.textContent = formatNumber(remaining);
    });
    document.querySelectorAll('.js-stat-rate').forEach(function (el) {
      el.textContent = rate;
    });
    document.querySelectorAll('.js-stat-revenue').forEach(function (el) {
      el.textContent = revenueFormatted;
    });

    const overviewRevEl = document.getElementById('overview-revenue-val');
    if (overviewRevEl) overviewRevEl.textContent = revenueFormatted;

    const deltaEl = document.getElementById('overview-checkedin-delta');
    if (deltaEl) {
      deltaEl.textContent = '↗ ' + formatNumber(state.stats.checkedInDelta);
    }

    const eventsCheckedSub = document.getElementById('events-live-checkedin-sub');
    if (eventsCheckedSub) {
      eventsCheckedSub.textContent = 'checked in · ' + rate;
    }

    const eventsRemainingLabel = document.getElementById('events-live-remaining-label');
    if (eventsRemainingLabel) {
      eventsRemainingLabel.textContent = formatNumber(remaining) + ' yet to arrive';
    }

    const eventsProgressBar = document.getElementById('events-live-progress-bar');
    if (eventsProgressBar) {
      eventsProgressBar.style.width = rate;
    }

    const attendeesContext = document.getElementById('attendees-checkedin-context');
    if (attendeesContext) {
      attendeesContext.textContent = rate + ' of registered guests have arrived';
    }

    const bannerDetail = document.getElementById('checkin-banner-detail-text');
    if (bannerDetail) {
      bannerDetail.textContent =
        '4 check-in stations online · Last arrival at ' +
        state.stats.lastArrivalTime +
        ' · Badges printing normally';
    }

    const totalEventsStr = String(state.events.length).padStart(2, '0');
    const sidebarCount = document.getElementById('sidebar-events-count');
    const kpiTotal = document.getElementById('events-total-kpi');
    const dirBadge = document.getElementById('events-directory-badge');
    const tabAll = document.getElementById('events-tab-count-all');
    if (sidebarCount) sidebarCount.textContent = totalEventsStr;
    if (kpiTotal) kpiTotal.textContent = totalEventsStr;
    if (dirBadge) dirBadge.textContent = totalEventsStr;
    if (tabAll) tabAll.textContent = totalEventsStr;
  }

  // --- Render 30-Minute Arrival Velocity Bars (Overview + Analytics) ---
  function renderVelocityCharts() {
    const html = state.intervals
      .map(function (item) {
        const barClass = item.isPeak ? 'chart-bar peak' : 'chart-bar';
        const title = item.slotLabel + ' — ' + item.guestCount + ' guests';
        return (
          '<div class="chart-bar-col">' +
          '<div class="' +
          barClass +
          '" style="height: ' +
          item.barHeightPx +
          'px;" title="' +
          escapeHtml(title) +
          '"></div>' +
          '</div>'
        );
      })
      .join('');

    const overviewBars = document.getElementById('overview-chart-bars');
    if (overviewBars) overviewBars.innerHTML = html;

    const analyticsBars = document.getElementById('analytics-chart-bars');
    if (analyticsBars) analyticsBars.innerHTML = html;
  }

  // --- Render Analytics Screen (Screen 4) ---
  function renderAnalyticsView() {
    const analytics = state.analytics || {};

    const convSub = document.getElementById('analytics-kpi-conversion-sub');
    if (convSub) {
      convSub.textContent =
        formatNumber(state.stats.checkedIn) +
        ' of ' +
        formatNumber(state.stats.registered) +
        ' registered guests arrived';
    }

    const lastUpd = document.getElementById('analytics-last-updated');
    if (lastUpd) {
      lastUpd.textContent = 'Last arrival at ' + state.stats.lastArrivalTime;
    }

    const peakVal = document.getElementById('analytics-kpi-peak-val');
    if (peakVal && analytics.peakGuests) {
      peakVal.textContent = analytics.peakGuests + ' / 30m';
    }

    // 1. Role distribution list
    const roleListEl = document.getElementById('analytics-role-list');
    if (roleListEl && Array.isArray(analytics.roleDistribution)) {
      roleListEl.innerHTML = analytics.roleDistribution
        .map(function (r) {
          return (
            '<div class="role-item">' +
            '<div class="role-item-header">' +
            '<span class="role-item-name">' +
            escapeHtml(r.role) +
            '</span>' +
            '<span class="role-item-meta">' +
            formatNumber(r.count) +
            ' · ' +
            r.pct +
            '%</span>' +
            '</div>' +
            '<div class="role-progress-track">' +
            '<div class="role-progress-fill" style="width: ' +
            r.pct +
            '%;"></div>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }

    // 2. Ticket tier breakdown rows
    const tierRowsEl = document.getElementById('analytics-tier-rows');
    if (tierRowsEl && Array.isArray(analytics.ticketTiers)) {
      tierRowsEl.innerHTML = analytics.ticketTiers
        .map(function (t) {
          let badgeClass = 'status-badge status-badge-neutral-sm';
          if (t.badgeType === 'purple') badgeClass = 'status-badge status-badge-purple-sm';
          if (t.badgeType === 'green') badgeClass = 'status-badge status-badge-green-sm';

          const revText = t.revenue > 0 ? '$' + formatNumber(t.revenue) : 'Complimentary';

          return (
            '<div class="tier-table-row">' +
            '<div class="col-tier-name">' +
            '<span class="event-row-title">' +
            escapeHtml(t.tier) +
            '</span>' +
            '<span class="' +
            badgeClass +
            '">' +
            escapeHtml(t.priceLabel) +
            '</span>' +
            '</div>' +
            '<div class="col-tier-num">' +
            formatNumber(t.registered) +
            '</div>' +
            '<div class="col-tier-num">' +
            formatNumber(t.checkedIn) +
            '</div>' +
            '<div class="col-tier-rate">' +
            '<div style="display:flex; justify-content:space-between; font-size:10px;">' +
            '<span style="color:var(--text-secondary);">Arrived</span>' +
            '<span style="color:var(--brand-primary); font-weight:600;">' +
            t.rate +
            '%</span>' +
            '</div>' +
            '<div class="capacity-track" style="width:100%;">' +
            '<div class="capacity-fill" style="width:' +
            Math.min(100, t.rate) +
            '%;"></div>' +
            '</div>' +
            '</div>' +
            '<div class="col-tier-rev">' +
            escapeHtml(revText) +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }

    // 3. Check-in kiosk stations grid
    const stationsGrid = document.getElementById('analytics-stations-grid');
    if (stationsGrid && Array.isArray(analytics.stations)) {
      stationsGrid.innerHTML = analytics.stations
        .map(function (st) {
          return (
            '<div class="station-box">' +
            '<div class="station-box-top">' +
            '<span class="station-name">' +
            escapeHtml(st.name) +
            '</span>' +
            '<span class="status-badge status-badge-green-sm">' +
            '<img src="assets/status-dot-green-4.svg" alt="" class="svg-icon" />' +
            '<span>' +
            escapeHtml(st.status) +
            '</span>' +
            '</span>' +
            '</div>' +
            '<span class="station-loc">' +
            escapeHtml(st.location) +
            '</span>' +
            '<div class="station-stats">' +
            '<span class="station-count">' +
            formatNumber(st.processed) +
            ' <span style="font-size:10px; color:var(--text-secondary); font-weight:400;">checked in</span></span>' +
            '<span class="station-speed">Avg ' +
            escapeHtml(st.avgSpeed) +
            '</span>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }

    // 4. Live Check-in Logs (MySQL `checkin_logs`)
    const liveLogsEl = document.getElementById('analytics-live-logs');
    if (liveLogsEl && Array.isArray(analytics.recentLogs)) {
      if (analytics.recentLogs.length === 0) {
        liveLogsEl.innerHTML =
          '<div style="padding:16px 0; font-size:11px; color:var(--text-secondary);">No recent check-in logs.</div>';
      } else {
        liveLogsEl.innerHTML = analytics.recentLogs
          .map(function (log) {
            return (
              '<div class="live-log-item">' +
              '<div class="live-log-left">' +
              '<div class="avatar-circle" style="background-color:' +
              escapeHtml(log.avatarBg) +
              '; color:' +
              escapeHtml(log.avatarColor) +
              ';">' +
              escapeHtml(log.initials) +
              '</div>' +
              '<div class="cell-stack">' +
              '<span class="attendee-name">' +
              escapeHtml(log.name) +
              '</span>' +
              '<span class="attendee-email">' +
              escapeHtml(log.company) +
              ' · ' +
              escapeHtml(log.station) +
              '</span>' +
              '</div>' +
              '</div>' +
              '<div class="live-log-right">' +
              '<span class="checkin-time-text" style="font-weight:500; color:var(--text-primary);">' +
              escapeHtml(log.checkinTime) +
              '</span>' +
              '<button type="button" class="undo-checkin-link js-undo-checkin" data-attendee-id="' +
              escapeHtml(log.attendeeId) +
              '" data-attendee-name="' +
              escapeHtml(log.name) +
              '">Undo</button>' +
              '</div>' +
              '</div>'
            );
          })
          .join('');
      }
    }
  }

  // --- Filter & Sort Attendees ---
  function getFilteredAttendees(tableConfig, maxDefaultRows) {
    const query = tableConfig.search.trim().toLowerCase();
    let list = state.attendees.filter(function (att) {
      if (tableConfig.tab === 'checked-in' && !att.checkedIn) return false;
      if (
        tableConfig.tab === 'not-checked-in' &&
        (att.checkedIn || att.status !== 'Registered')
      ) {
        return false;
      }
      if (tableConfig.tab === 'waitlist' && att.status !== 'Waitlisted') return false;
      if (tableConfig.tab === 'cancelled' && att.status !== 'Cancelled') return false;

      if (tableConfig.ticketFilter !== 'all' && att.ticket !== tableConfig.ticketFilter) {
        return false;
      }

      if (tableConfig.statusFilter !== 'all' && att.status !== tableConfig.statusFilter) {
        return false;
      }

      if (tableConfig.checkinFilter === 'checked-in' && !att.checkedIn) return false;
      if (
        tableConfig.checkinFilter === 'not-checked-in' &&
        (att.checkedIn || att.status !== 'Registered')
      ) {
        return false;
      }

      if (query) {
        const hay = (
          att.name +
          ' ' +
          att.email +
          ' ' +
          att.company +
          ' ' +
          att.role +
          ' ' +
          att.ticket
        ).toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });

    if (!tableConfig.sortAsc) {
      list = list.slice().reverse();
    }

    const isUnfilteredDefault =
      tableConfig.tab === 'all' &&
      !query &&
      tableConfig.ticketFilter === 'all' &&
      tableConfig.statusFilter === 'all' &&
      tableConfig.checkinFilter === 'all' &&
      tableConfig.sortAsc;

    if (maxDefaultRows && isUnfilteredDefault) {
      return list.slice(0, maxDefaultRows);
    }
    return list;
  }

  // --- Render Attendee Row HTML ---
  function renderAttendeeRowHtml(att, isOverview) {
    const avatarBg = isOverview ? att.bgOverview : att.bgDirectory || att.bgOverview;
    const avatarColor = isOverview ? att.color : att.colorDirectory || att.color;
    const checkboxClass = isOverview
      ? 'custom-checkbox custom-checkbox-14' + (att.selected ? ' checked' : '')
      : 'custom-checkbox' + (att.selected ? ' checked' : '');

    let statusBadgeHtml = '';
    if (att.status === 'Registered') {
      const badgeClass = isOverview ? 'status-badge status-badge-green-md' : 'status-badge status-badge-green-sm';
      const dotAsset = isOverview ? 'assets/status-dot-green-5.svg' : 'assets/status-dot-green-4.svg';
      statusBadgeHtml =
        '<div class="' +
        badgeClass +
        '">' +
        '<img src="' +
        dotAsset +
        '" alt="" class="svg-icon" />' +
        '<span>Registered</span>' +
        '</div>';
    } else if (att.status === 'Waitlisted') {
      const badgeClass = isOverview ? 'status-badge status-badge-amber-md' : 'status-badge status-badge-amber-sm';
      const dotAsset = isOverview ? 'assets/status-dot-amber-5.svg' : 'assets/status-dot-amber-4.svg';
      statusBadgeHtml =
        '<div class="' +
        badgeClass +
        '">' +
        '<img src="' +
        dotAsset +
        '" alt="" class="svg-icon" />' +
        '<span>Waitlisted</span>' +
        '</div>';
    } else {
      const badgeClass = isOverview ? 'status-badge status-badge-red-md' : 'status-badge status-badge-red-sm';
      const dotAsset = isOverview ? 'assets/status-dot-red-5.svg' : 'assets/status-dot-red-4.svg';
      statusBadgeHtml =
        '<div class="' +
        badgeClass +
        '">' +
        '<img src="' +
        dotAsset +
        '" alt="" class="svg-icon" />' +
        '<span>Cancelled</span>' +
        '</div>';
    }

    let checkinHtml = '';
    if (att.checkedIn) {
      const checkIcon = isOverview ? 'assets/circle-check-14.svg' : 'assets/circle-check-13.svg';
      const statusTextClass = isOverview
        ? 'checkin-status-text checkin-status-text-med'
        : 'checkin-status-text';
      checkinHtml =
        '<div class="checkin-arrived">' +
        '<img src="' +
        checkIcon +
        '" alt="" class="svg-icon" />' +
        '<div class="checkin-arrived-stack">' +
        '<span class="' +
        statusTextClass +
        '">Checked in</span>' +
        '<span class="checkin-time-text">' +
        escapeHtml(att.checkinTime || '09:30 AM') +
        '</span>' +
        '</div>' +
        '</div>';
    } else if (att.status === 'Registered') {
      const btnClass = isOverview ? 'btn btn-secondary-32' : 'btn btn-secondary-32-sm';
      checkinHtml =
        '<button type="button" class="' +
        btnClass +
        ' js-checkin-btn" data-attendee-id="' +
        escapeHtml(att.id) +
        '">Check in</button>';
    } else {
      checkinHtml = '<span class="checkin-na">—</span>';
    }

    const personalStackClass = isOverview ? 'cell-stack' : 'cell-stack-6';
    const ticketClass = att.ticketHighlight ? 'ticket-label highlight' : 'ticket-label';

    return (
      '<div class="data-table-row" data-attendee-row="' +
      escapeHtml(att.id) +
      '">' +
      '<div class="col-checkbox">' +
      '<div class="' +
      checkboxClass +
      ' js-row-checkbox" data-attendee-id="' +
      escapeHtml(att.id) +
      '" role="checkbox" aria-checked="' +
      (att.selected ? 'true' : 'false') +
      '" tabindex="0"></div>' +
      '</div>' +
      '<div class="col-attendee">' +
      '<div class="avatar-circle" style="background-color: ' +
      avatarBg +
      '; color: ' +
      avatarColor +
      ';">' +
      escapeHtml(att.initials) +
      '</div>' +
      '<div class="' +
      personalStackClass +
      '">' +
      '<span class="attendee-name">' +
      escapeHtml(att.name) +
      '</span>' +
      '<span class="attendee-email">' +
      escapeHtml(att.email) +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="col-company cell-stack">' +
      '<span class="company-name">' +
      escapeHtml(att.company) +
      '</span>' +
      '<span class="company-role">' +
      escapeHtml(att.role) +
      '</span>' +
      '</div>' +
      '<div class="col-ticket">' +
      '<span class="' +
      ticketClass +
      '">' +
      escapeHtml(att.ticket) +
      '</span>' +
      '</div>' +
      '<div class="col-reg-date">' +
      '<span class="reg-date-label">' +
      escapeHtml(att.registeredDate) +
      '</span>' +
      '</div>' +
      '<div class="col-reg-status">' +
      statusBadgeHtml +
      '</div>' +
      '<div class="col-checkin">' +
      checkinHtml +
      '</div>' +
      '<div class="col-actions">' +
      '<button type="button" class="icon-btn js-attendee-menu" data-attendee-id="' +
      escapeHtml(att.id) +
      '" data-attendee-name="' +
      escapeHtml(att.name) +
      '" title="More options">' +
      '<img src="assets/ellipsis.svg" alt="" class="svg-icon" />' +
      '</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderAttendeeTables() {
    const overviewContainer = document.getElementById('overview-attendee-rows');
    if (overviewContainer) {
      const overviewRows = getFilteredAttendees(state.overviewTable, 8);
      if (overviewRows.length === 0) {
        overviewContainer.innerHTML =
          '<div class="data-table-row" style="justify-content:center; color:var(--text-secondary); font-size:12px;">No matching attendees found.</div>';
      } else {
        overviewContainer.innerHTML = overviewRows
          .map(function (att) {
            return renderAttendeeRowHtml(att, true);
          })
          .join('');
      }
      const overviewCountEl = document.getElementById('overview-results-count');
      if (overviewCountEl) {
        overviewCountEl.textContent =
          'Showing 1–' +
          overviewRows.length +
          ' of ' +
          formatNumber(state.stats.totalPeople) +
          ' people';
      }
    }

    const directoryContainer = document.getElementById('directory-attendee-rows');
    if (directoryContainer) {
      const directoryRows = getFilteredAttendees(state.directoryTable, 12);
      if (directoryRows.length === 0) {
        directoryContainer.innerHTML =
          '<div class="data-table-row" style="justify-content:center; color:var(--text-secondary); font-size:12px;">No matching attendees found.</div>';
      } else {
        directoryContainer.innerHTML = directoryRows
          .map(function (att) {
            return renderAttendeeRowHtml(att, false);
          })
          .join('');
      }
      const directoryCountEl = document.getElementById('directory-results-count');
      if (directoryCountEl) {
        directoryCountEl.textContent =
          'Showing 1–' +
          directoryRows.length +
          ' of ' +
          formatNumber(state.stats.totalPeople) +
          ' people';
      }
    }
  }

  // --- Render Events Table ---
  function renderEventsTable() {
    const container = document.getElementById('events-table-rows');
    if (!container) return;

    const query = state.eventsTable.search.trim().toLowerCase();
    let filtered = state.events.filter(function (evt) {
      if (state.eventsTable.tab === 'upcoming' && evt.status !== 'Upcoming') return false;
      if (state.eventsTable.tab === 'live' && evt.status !== 'Live') return false;
      if (state.eventsTable.tab === 'past' && evt.status !== 'Past') return false;
      if (state.eventsTable.tab === 'draft' && evt.status !== 'Draft') return false;

      if (state.eventsTable.typeFilter !== 'all' && evt.type !== state.eventsTable.typeFilter) {
        return false;
      }

      if (query) {
        const hay = (evt.name + ' ' + evt.type + ' ' + evt.venue + ' ' + evt.city).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (!state.eventsTable.sortAsc) {
      filtered = filtered.slice().reverse();
    }

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="data-table-row data-table-row-event" style="justify-content:center; color:var(--text-secondary); font-size:12px;">No matching events found.</div>';
    } else {
      container.innerHTML = filtered
        .map(function (evt) {
          let badgeHtml = '';
          if (evt.status === 'Live') {
            badgeHtml =
              '<div class="status-badge status-badge-green-sm">' +
              '<img src="assets/status-dot-green-4.svg" alt="" class="svg-icon" />' +
              '<span>Live</span>' +
              '</div>';
          } else if (evt.status === 'Upcoming') {
            badgeHtml = '<div class="status-badge status-badge-purple-sm">Upcoming</div>';
          } else if (evt.status === 'Past') {
            badgeHtml = '<div class="status-badge status-badge-neutral-sm">Past</div>';
          } else {
            badgeHtml = '<div class="status-badge status-badge-neutral-sm">Draft</div>';
          }

          const fillBarHtml =
            evt.barWidthPx > 0
              ? '<div class="capacity-fill' +
                (evt.isPastBar ? ' past' : '') +
                '" style="width: ' +
                evt.barWidthPx +
                'px;"></div>'
              : '';

          return (
            '<div class="data-table-row data-table-row-event" data-event-row="' +
            escapeHtml(evt.id) +
            '">' +
            '<div class="col-checkbox-event">' +
            '<div class="custom-checkbox' +
            (evt.selected ? ' checked' : '') +
            ' js-event-checkbox" data-event-id="' +
            escapeHtml(evt.id) +
            '" role="checkbox" aria-checked="' +
            (evt.selected ? 'true' : 'false') +
            '" tabindex="0"></div>' +
            '</div>' +
            '<div class="col-event-identity">' +
            '<div class="date-tile">' +
            '<span class="date-tile-month">' +
            escapeHtml(evt.month) +
            '</span>' +
            '<span class="date-tile-day">' +
            escapeHtml(evt.day) +
            '</span>' +
            '</div>' +
            '<div class="cell-stack-6">' +
            '<span class="event-row-title">' +
            escapeHtml(evt.name) +
            '</span>' +
            '<span class="event-row-type">' +
            escapeHtml(evt.type) +
            '</span>' +
            '</div>' +
            '</div>' +
            '<div class="col-event-schedule cell-stack-6">' +
            '<span class="company-name">' +
            escapeHtml(evt.date) +
            '</span>' +
            '<span class="company-role">' +
            escapeHtml(evt.time) +
            '</span>' +
            '</div>' +
            '<div class="col-event-location cell-stack-6">' +
            '<span class="company-name">' +
            escapeHtml(evt.venue) +
            '</span>' +
            '<span class="company-role">' +
            escapeHtml(evt.city) +
            '</span>' +
            '</div>' +
            '<div class="col-event-registrations capacity-cell">' +
            '<p class="capacity-numbers">' +
            '<span>' +
            escapeHtml(evt.registeredText) +
            '</span>' +
            '<span class="capacity-total">' +
            escapeHtml(evt.capacityText) +
            '</span>' +
            '</p>' +
            '<div class="capacity-track">' +
            fillBarHtml +
            '</div>' +
            '</div>' +
            '<div class="col-event-status">' +
            badgeHtml +
            '</div>' +
            '<div class="col-event-action">' +
            '<span class="event-action-link js-event-row-action" data-target-screen="' +
            escapeHtml(evt.actionTarget) +
            '" data-event-title="' +
            escapeHtml(evt.name) +
            '">' +
            escapeHtml(evt.actionLabel) +
            '</span>' +
            '</div>' +
            '<div class="col-actions">' +
            '<button type="button" class="icon-btn js-event-menu" data-event-title="' +
            escapeHtml(evt.name) +
            '" title="More options">' +
            '<img src="assets/ellipsis.svg" alt="" class="svg-icon" />' +
            '</button>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }

    const countEl = document.getElementById('events-results-count');
    if (countEl) {
      countEl.textContent =
        'Showing all ' + filtered.length + ' events in Forma studio';
    }
  }

  function renderAll() {
    updateDashboardStats();
    renderVelocityCharts();
    renderAttendeeTables();
    renderEventsTable();
    renderAnalyticsView();
  }

  // --- Check-in & Undo Handlers (Persisted in MySQL) ---
  function handleCheckInAttendee(attendeeId) {
    const attendee = state.attendees.find(function (a) {
      return a.id === attendeeId;
    });
    if (!attendee || attendee.checkedIn) return;

    const formattedTime = getCurrentFormattedTime();
    attendee.checkedIn = true;
    attendee.checkinTime = formattedTime;
    state.stats.checkedIn += 1;
    state.stats.checkedInDelta += 1;
    state.stats.lastArrivalTime = formattedTime;

    renderAll();
    postToApi(
      'checkin',
      { attendeeId: attendeeId, checkinTime: formattedTime },
      attendee.name + ' checked in at ' + formattedTime + ' (saved to MySQL)'
    );
  }

  function handleUndoCheckIn(attendeeId, attendeeName) {
    const attendee = state.attendees.find(function (a) {
      return a.id === attendeeId;
    });
    if (attendee && attendee.checkedIn) {
      attendee.checkedIn = false;
      attendee.checkinTime = null;
      state.stats.checkedIn = Math.max(0, state.stats.checkedIn - 1);
      state.stats.checkedInDelta = Math.max(0, state.stats.checkedInDelta - 1);
      renderAll();
    }
    postToApi(
      'undo_checkin',
      { attendeeId: attendeeId },
      'Reverted check-in for ' + (attendeeName || 'guest') + ' in MySQL'
    );
  }

  // --- Export CSV Helper ---
  function exportAttendeesCsv() {
    const headers = ['Name', 'Email', 'Company', 'Role', 'Ticket', 'Registered On', 'Status', 'Check-in'];
    const rows = state.attendees.map(function (a) {
      return [
        a.name,
        a.email,
        a.company,
        a.role,
        a.ticket,
        a.registeredDate,
        a.status,
        a.checkedIn ? 'Checked in (' + a.checkinTime + ')' : 'Not checked in'
      ]
        .map(function (cell) {
          return '"' + String(cell).replace(/"/g, '""') + '"';
        })
        .join(',');
    });
    const csvContent = [headers.join(',')].concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'form-and-future-attendees.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported attendee directory (CSV)');
  }

  // --- Event Listeners Setup ---
  function initEventListeners() {
    document.querySelectorAll('.nav-item[data-nav-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = btn.getAttribute('data-nav-target');
        switchScreen(target);
      });
    });

    document.querySelectorAll('.nav-item[data-nav-toast]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showToast(btn.getAttribute('data-nav-toast'));
      });
    });

    const brandHome = document.getElementById('brand-home-btn');
    if (brandHome) {
      brandHome.addEventListener('click', function () {
        switchScreen('overview');
      });
    }
    const breadcrumbRoot = document.getElementById('breadcrumb-workspace');
    if (breadcrumbRoot) {
      breadcrumbRoot.addEventListener('click', function () {
        switchScreen('overview');
      });
    }

    // Delegated clicks
    document.addEventListener('click', function (e) {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const act = actionEl.getAttribute('data-action');
        if (act === 'go-overview') switchScreen('overview');
        if (act === 'go-events') switchScreen('events');
        if (act === 'go-attendees') switchScreen('attendees');
        if (act === 'go-analytics') switchScreen('analytics');
        return;
      }

      const checkinBtn = e.target.closest('.js-checkin-btn');
      if (checkinBtn) {
        const attId = checkinBtn.getAttribute('data-attendee-id');
        handleCheckInAttendee(attId);
        return;
      }

      const undoBtn = e.target.closest('.js-undo-checkin');
      if (undoBtn) {
        const attId = undoBtn.getAttribute('data-attendee-id');
        const attName = undoBtn.getAttribute('data-attendee-name');
        handleUndoCheckIn(attId, attName);
        return;
      }

      const rowCheckbox = e.target.closest('.js-row-checkbox');
      if (rowCheckbox) {
        const attId = rowCheckbox.getAttribute('data-attendee-id');
        const att = state.attendees.find(function (a) {
          return a.id === attId;
        });
        if (att) {
          att.selected = !att.selected;
          renderAttendeeTables();
        }
        return;
      }

      const eventCheckbox = e.target.closest('.js-event-checkbox');
      if (eventCheckbox) {
        const evtId = eventCheckbox.getAttribute('data-event-id');
        const evt = state.events.find(function (ev) {
          return ev.id === evtId;
        });
        if (evt) {
          evt.selected = !evt.selected;
          renderEventsTable();
        }
        return;
      }

      const eventRowAction = e.target.closest('.js-event-row-action');
      if (eventRowAction) {
        const targetScreen = eventRowAction.getAttribute('data-target-screen');
        const eventTitle = eventRowAction.getAttribute('data-event-title');
        if (targetScreen && ['overview', 'attendees', 'analytics'].includes(targetScreen)) {
          switchScreen(targetScreen);
          showToast('Viewing ' + eventTitle);
        } else {
          showToast('Opening setup for ' + eventTitle);
        }
        return;
      }

      const attendeeMenu = e.target.closest('.js-attendee-menu');
      if (attendeeMenu) {
        const attId = attendeeMenu.getAttribute('data-attendee-id');
        const attName = attendeeMenu.getAttribute('data-attendee-name');
        const att = state.attendees.find(function (a) {
          return a.id === attId;
        });
        if (att && att.checkedIn) {
          handleUndoCheckIn(attId, attName);
        } else if (att && att.status === 'Registered') {
          handleCheckInAttendee(attId);
        } else {
          showToast('Guest status: ' + (att ? att.status : 'N/A'));
        }
        return;
      }

      const eventMenu = e.target.closest('.js-event-menu');
      if (eventMenu) {
        showToast('Event options for ' + eventMenu.getAttribute('data-event-title'));
      }
    });

    // Reset Demo Database Button
    const resetDemoBtn = document.getElementById('reset-demo-db-btn');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', function () {
        postToApi('reset_demo', {}, 'MySQL database reset to initial Figma snapshot');
      });
    }

    // Overview Attendee Tabs
    const overviewTabs = document.getElementById('overview-attendee-tabs');
    if (overviewTabs) {
      overviewTabs.addEventListener('click', function (e) {
        const tabBtn = e.target.closest('.status-tab[data-tab]');
        if (!tabBtn) return;
        overviewTabs.querySelectorAll('.status-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tabBtn.classList.add('active');
        state.overviewTable.tab = tabBtn.getAttribute('data-tab');
        renderAttendeeTables();
      });
    }

    // Directory Attendee Tabs
    const directoryTabs = document.getElementById('directory-attendee-tabs');
    if (directoryTabs) {
      directoryTabs.addEventListener('click', function (e) {
        const tabBtn = e.target.closest('.status-tab[data-tab]');
        if (!tabBtn) return;
        directoryTabs.querySelectorAll('.status-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tabBtn.classList.add('active');
        state.directoryTable.tab = tabBtn.getAttribute('data-tab');
        renderAttendeeTables();
      });
    }

    // Events Status Tabs
    const eventsTabs = document.getElementById('events-status-tabs');
    if (eventsTabs) {
      eventsTabs.addEventListener('click', function (e) {
        const tabBtn = e.target.closest('.status-tab[data-event-tab]');
        if (!tabBtn) return;
        eventsTabs.querySelectorAll('.status-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tabBtn.classList.add('active');
        state.eventsTable.tab = tabBtn.getAttribute('data-event-tab');
        renderEventsTable();
      });
    }

    // Search Inputs
    const overviewSearch = document.getElementById('overview-attendee-search');
    if (overviewSearch) {
      overviewSearch.addEventListener('input', function () {
        state.overviewTable.search = overviewSearch.value;
        renderAttendeeTables();
      });
    }

    const directorySearch = document.getElementById('directory-attendee-search');
    if (directorySearch) {
      directorySearch.addEventListener('input', function () {
        state.directoryTable.search = directorySearch.value;
        renderAttendeeTables();
      });
    }

    const eventsSearch = document.getElementById('events-search-input');
    if (eventsSearch) {
      eventsSearch.addEventListener('input', function () {
        state.eventsTable.search = eventsSearch.value;
        renderEventsTable();
      });
    }

    // Topbar Quick Search
    const topbarSearch = document.getElementById('topbar-search-input');
    if (topbarSearch) {
      topbarSearch.addEventListener('input', function () {
        const q = topbarSearch.value;
        if (state.currentScreen === 'overview') {
          state.overviewTable.search = q;
          if (overviewSearch) overviewSearch.value = q;
          renderAttendeeTables();
        } else if (state.currentScreen === 'attendees') {
          state.directoryTable.search = q;
          if (directorySearch) directorySearch.value = q;
          renderAttendeeTables();
        } else if (state.currentScreen === 'events') {
          state.eventsTable.search = q;
          if (eventsSearch) eventsSearch.value = q;
          renderEventsTable();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (topbarSearch) topbarSearch.focus();
      }
    });

    // Filter Pills
    function setupCycleFilter(btnId, labelId, options, onSelect) {
      const btn = document.getElementById(btnId);
      const labelEl = document.getElementById(labelId);
      if (!btn || !labelEl) return;
      let idx = 0;
      btn.addEventListener('click', function () {
        idx = (idx + 1) % options.length;
        const chosen = options[idx];
        labelEl.textContent = chosen.label;
        btn.classList.toggle('active-filter', chosen.value !== 'all');
        onSelect(chosen.value);
      });
    }

    const ticketOptions = [
      { value: 'all', label: 'Ticket type' },
      { value: 'General admission', label: 'Ticket: General' },
      { value: 'VIP pass', label: 'Ticket: VIP pass' },
      { value: 'Speaker', label: 'Ticket: Speaker' }
    ];
    const regStatusOptions = [
      { value: 'all', label: 'Registration status' },
      { value: 'Registered', label: 'Status: Registered' },
      { value: 'Waitlisted', label: 'Status: Waitlisted' },
      { value: 'Cancelled', label: 'Status: Cancelled' }
    ];
    const checkinStatusOptions = [
      { value: 'all', label: 'Check-in status' },
      { value: 'checked-in', label: 'Arrived: Checked in' },
      { value: 'not-checked-in', label: 'Arrived: Not checked in' }
    ];

    setupCycleFilter(
      'overview-ticket-filter',
      'overview-ticket-filter-label',
      ticketOptions,
      function (val) {
        state.overviewTable.ticketFilter = val;
        renderAttendeeTables();
      }
    );
    setupCycleFilter(
      'overview-status-filter',
      'overview-status-filter-label',
      regStatusOptions,
      function (val) {
        state.overviewTable.statusFilter = val;
        renderAttendeeTables();
      }
    );
    setupCycleFilter(
      'overview-checkin-filter',
      'overview-checkin-filter-label',
      checkinStatusOptions,
      function (val) {
        state.overviewTable.checkinFilter = val;
        renderAttendeeTables();
      }
    );

    setupCycleFilter(
      'directory-ticket-filter',
      'directory-ticket-filter-label',
      ticketOptions,
      function (val) {
        state.directoryTable.ticketFilter = val;
        renderAttendeeTables();
      }
    );
    setupCycleFilter(
      'directory-status-filter',
      'directory-status-filter-label',
      regStatusOptions,
      function (val) {
        state.directoryTable.statusFilter = val;
        renderAttendeeTables();
      }
    );
    setupCycleFilter(
      'directory-checkin-filter',
      'directory-checkin-filter-label',
      checkinStatusOptions,
      function (val) {
        state.directoryTable.checkinFilter = val;
        renderAttendeeTables();
      }
    );

    setupCycleFilter(
      'events-type-filter',
      'events-type-filter-label',
      [
        { value: 'all', label: 'All event types' },
        { value: 'Conference', label: 'Conference' },
        { value: 'Networking dinner', label: 'Networking dinner' },
        { value: 'Workshop', label: 'Workshop' },
        { value: 'Community meetup', label: 'Community meetup' }
      ],
      function (val) {
        state.eventsTable.typeFilter = val;
        renderEventsTable();
      }
    );

    // Sort headers
    const overviewSort = document.getElementById('overview-sort-attendee');
    if (overviewSort) {
      overviewSort.addEventListener('click', function () {
        state.overviewTable.sortAsc = !state.overviewTable.sortAsc;
        renderAttendeeTables();
      });
    }
    const directorySort = document.getElementById('directory-sort-attendee');
    if (directorySort) {
      directorySort.addEventListener('click', function () {
        state.directoryTable.sortAsc = !state.directoryTable.sortAsc;
        renderAttendeeTables();
      });
    }
    const eventsSort = document.getElementById('events-sort-name');
    if (eventsSort) {
      eventsSort.addEventListener('click', function () {
        state.eventsTable.sortAsc = !state.eventsTable.sortAsc;
        renderEventsTable();
      });
    }

    // Select-all checkboxes
    const overviewSelectAll = document.getElementById('overview-select-all');
    if (overviewSelectAll) {
      overviewSelectAll.addEventListener('click', function () {
        const isChecked = overviewSelectAll.classList.toggle('checked');
        state.attendees.forEach(function (a) {
          a.selected = isChecked;
        });
        renderAttendeeTables();
      });
    }
    const directorySelectAll = document.getElementById('directory-select-all');
    if (directorySelectAll) {
      directorySelectAll.addEventListener('click', function () {
        const isChecked = directorySelectAll.classList.toggle('checked');
        state.attendees.forEach(function (a) {
          a.selected = isChecked;
        });
        renderAttendeeTables();
      });
    }
    const eventsSelectAll = document.getElementById('events-select-all');
    if (eventsSelectAll) {
      eventsSelectAll.addEventListener('click', function () {
        const isChecked = eventsSelectAll.classList.toggle('checked');
        state.events.forEach(function (ev) {
          ev.selected = isChecked;
        });
        renderEventsTable();
      });
    }

    // Export buttons
    document.querySelectorAll('.js-export-attendees').forEach(function (btn) {
      btn.addEventListener('click', exportAttendeesCsv);
    });
    const eventsExportBtn = document.getElementById('events-export-btn');
    if (eventsExportBtn) {
      eventsExportBtn.addEventListener('click', function () {
        showToast('Exported ' + state.events.length + ' events from Forma studio');
      });
    }

    // Add Attendee Modal (Persisted in MySQL)
    const addAttendeeModal = document.getElementById('add-attendee-modal');
    const addAttendeeForm = document.getElementById('add-attendee-form');
    document.querySelectorAll('.js-open-add-attendee').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (addAttendeeModal) addAttendeeModal.classList.add('open');
      });
    });
    const cancelAddAttendee = document.getElementById('cancel-add-attendee');
    if (cancelAddAttendee && addAttendeeModal) {
      cancelAddAttendee.addEventListener('click', function () {
        addAttendeeModal.classList.remove('open');
      });
    }
    if (addAttendeeForm && addAttendeeModal) {
      addAttendeeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = document.getElementById('input-attendee-name').value.trim();
        const email = document.getElementById('input-attendee-email').value.trim();
        const company = document.getElementById('input-attendee-company').value.trim();
        const role = document.getElementById('input-attendee-role').value.trim();
        const ticket = document.getElementById('input-attendee-ticket').value;
        if (!name || !email) return;

        addAttendeeForm.reset();
        addAttendeeModal.classList.remove('open');
        postToApi(
          'add_attendee',
          { name: name, email: email, company: company, role: role, ticket: ticket },
          'Added ' + name + ' to MySQL attendee directory'
        );
      });
    }

    // Create Event Modal (Persisted in MySQL)
    const createEventModal = document.getElementById('create-event-modal');
    const createEventForm = document.getElementById('create-event-form');
    document.querySelectorAll('.js-open-create-event').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (createEventModal) createEventModal.classList.add('open');
      });
    });
    const cancelCreateEvent = document.getElementById('cancel-create-event');
    if (cancelCreateEvent && createEventModal) {
      cancelCreateEvent.addEventListener('click', function () {
        createEventModal.classList.remove('open');
      });
    }
    if (createEventForm && createEventModal) {
      createEventForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const title = document.getElementById('input-event-name').value.trim();
        const category = document.getElementById('input-event-type').value;
        const venue = document.getElementById('input-event-venue').value.trim();
        const cap = document.getElementById('input-event-capacity').value;
        if (!title) return;

        createEventForm.reset();
        createEventModal.classList.remove('open');
        postToApi(
          'add_event',
          { name: title, type: category, venue: venue, capacity: cap },
          'Created event "' + title + '" in MySQL'
        ).then(function () {
          switchScreen('events');
        });
      });
    }

    // Auxiliary interactive buttons
    const openScannerBtn = document.getElementById('open-checkin-scanner-btn');
    if (openScannerBtn) {
      openScannerBtn.addEventListener('click', function () {
        showToast('QR Check-in Scanner ready — 4 stations online');
      });
    }
    const manageStationsBtn = document.getElementById('manage-stations-btn');
    if (manageStationsBtn) {
      manageStationsBtn.addEventListener('click', function () {
        switchScreen('analytics');
        showToast('Viewing live check-in station telemetry');
      });
    }
    const sendMsgBtn = document.getElementById('attendees-send-msg-btn');
    if (sendMsgBtn) {
      sendMsgBtn.addEventListener('click', function () {
        showToast('Broadcast composer ready for ' + formatNumber(state.stats.totalPeople) + ' attendees');
      });
    }
    const importBtn = document.getElementById('attendees-import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', function () {
        showToast('CSV / Luma / Eventbrite guest importer ready');
      });
    }
  }

  // --- Initialize Application ---
  renderAll();
  initEventListeners();
  syncFromMySql();
})();
