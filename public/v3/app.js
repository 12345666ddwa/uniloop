/* UniLoop v3 — 竖屏 App + 桌面端（同一套组件，响应式布局） */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { n = Number(n) || 0; return n === 0 ? 'Free' : '$' + n; };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(i) { var d = new Date(i); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function fmtTime(i) { return new Date(i).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function initials(n) { return String(n || '?').split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase(); }

  var HERO_LINES = [
    { k: 'Sydney universities', a: 'What&rsquo;s on', b: 'this week.' },
    { k: 'Your kind of day', a: 'Make a day', b: 'of it.' },
    { k: 'Small plans, good people', a: 'Find your', b: 'people.' },
    { k: 'On campus this week', a: 'Something worth', b: 'showing up for.' }
  ];
  var CATS = { outdoors: 'Outdoors', social: 'Social', creative: 'Creative', sport: 'Sport', careers: 'Careers', other: 'Other' };
  var CATCOL = { outdoors: '#1F4A3B', social: '#D8583A', creative: '#B4622E', sport: '#2E5E8C', careers: '#7A3E6B', other: '#6B7280' };
  var CAMPCOL = { mq_sydney: '#1F4A3B', usyd_camperdown: '#D8583A', unsw_kensington: '#2E5E8C', uts_haymarket: '#B4622E', wsu_parramatta: '#7A3E6B' };
  var ICON = {
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4c2.4 2.3 3.6 5.3 3.6 8.6S14.4 18.3 12 20.6c-2.4-2.3-3.6-5.3-3.6-8.6S9.6 5.7 12 3.4Z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1v-9.5Z"/></svg>',
    soc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="9" r="3.2"/><circle cx="16.5" cy="10.5" r="2.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 6.5-3.9"/></svg>',
    saved: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 4.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V5.5a1 1 0 0 1 1-1Z"/></svg>',
    me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><path d="M14 14h2.5v2.5H14zM18.5 18.5H21V21h-2.5zM14 20h2"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5 5 0 0 0-2-4"/></svg>',
    org: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>'
  };

  var S = {
    me: null, events: [], campuses: [], societies: [], savedEvents: [], myRsvps: [], myMemberships: [], savedMoney: 0,
    q: '', where: 'any', when: 'any', date: '', what: 'all', free: false, radius: 0,
    showAllTickets: false, showPastTickets: false, flashIds: [], orgTimer: null, unameOk: null,
    pending: {}, step: 1, route: { name: 'home' }, heroIdx: 0, openEventId: null, org: null, orgDash: null, socTab: 'upcoming', socData: null
  };

  var THEME_KEY = 'uniloop.theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { }
  }
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function toggleTheme() { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); route(); }

  async function api(path, opts) {
    opts = opts || {};
    var res = await fetch(path, { method: opts.method || 'GET', credentials: 'include', headers: opts.body ? { 'content-type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined });
    var data = {}; try { data = await res.json(); } catch (e) { }
    if (!res.ok) { var err = new Error(data.error || ('HTTP ' + res.status)); err.status = res.status; err.data = data; throw err; }
    return data;
  }
  var toastEl, toastT;
  function toast(m) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translate(-50%,10px);background:rgba(14,26,21,.94);color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;opacity:0;transition:.2s;z-index:80;pointer-events:none;white-space:nowrap'; document.body.appendChild(toastEl); }
    toastEl.textContent = m; toastEl.style.opacity = '1'; toastEl.style.transform = 'translate(-50%,0)';
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.style.opacity = '0'; toastEl.style.transform = 'translate(-50%,10px)'; }, 2000);
  }

  /* ---------------- 数据 ---------------- */
  async function loadMe() {
    try {
      var r = await api('/api/me'); S.me = r.user; S.myRsvps = r.rsvps || []; S.myMemberships = r.memberships || [];
      S.savedMoney = r.saved || 0; S.savedEvents = r.saved_events || [];
    } catch (e) { S.me = null; S.myRsvps = []; S.myMemberships = []; S.savedEvents = []; }
  }
  async function loadEvents() {
    try { var r = await api('/api/events?when=all&limit=120'); S.events = r.events || []; } catch (e) { S.events = []; toast(e.message); }
  }
  async function loadSocieties() {
    try { var r = await api('/api/societies'); S.societies = r.societies || []; } catch (e) { S.societies = []; }
  }
  async function loadCampuses() {
    try { var r = await api('/api/campuses'); S.campuses = r.campuses || []; } catch (e) { S.campuses = []; }
  }

  /* ---------------- 距离 / 匹配 ---------------- */
  function anchors() {
    var a = {};
    S.events.forEach(function (e) { if (!a[e.campus_id] && e.venue_coords) a[e.campus_id] = e.venue_coords; });
    return a;
  }
  function distOf(e) {
    var a = anchors()[e.campus_id]; if (!a || !e.venue_coords) return 999;
    var R = 6371, t = function (x) { return x * Math.PI / 180; };
    var dLat = t(e.venue_coords[0] - a[0]), dLon = t(e.venue_coords[1] - a[1]);
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(t(a[0])) * Math.cos(t(e.venue_coords[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
  }
  var WD = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
  function parseQ(q) {
    var p = {};
    if (/\b(free|no cost)\b/.test(q)) p.free = true;
    if (/\btoday\b/.test(q)) p.day = 'today'; else if (/\btomorrow\b/.test(q)) p.day = 'tomorrow';
    else { for (var k in WD) { if (new RegExp('\\b' + k + '\\b').test(q)) { p.weekday = WD[k]; break; } } }
    if (/\bweekend\b/.test(q)) p.weekend = true;
    if (/\bmorning\b/.test(q)) p.hmax = 12; else if (/\bafternoon\b/.test(q)) { p.hmin = 12; p.hmax = 17; } else if (/\b(evening|night)\b/.test(q)) p.hmin = 17;
    var m = q.match(/(?:under|below|less than)\s*\$?\s*(\d+)/); if (m) p.max = Number(m[1]);
    return p;
  }
  function matches(e) {
    var q = S.q.trim().toLowerCase(), now = new Date(), d = new Date(e.starts_at);
    if (S.where !== 'any' && e.campus_id !== S.where) return false;
    if (S.what !== 'all' && e.category !== S.what) return false;
    if (S.free && e.price_public > 0) return false;
    if (S.radius > 0 && S.where !== 'any' && distOf(e) > S.radius) return false;
    if (S.date && !sameDay(d, new Date(S.date))) return false;
    if (S.when === 'today' && !sameDay(d, now)) return false;
    if (S.when === 'tomorrow' && !sameDay(d, new Date(now.getTime() + 86400000))) return false;
    if (S.when === 'weekend' && d.getDay() !== 0 && d.getDay() !== 6) return false;
    if (S.when === '7d' && d.getTime() > now.getTime() + 7 * 86400000) return false;
    if (!q) return true;
    var P = parseQ(q);
    if (P.free && e.price_public > 0) return false;
    if (P.max != null && e.price_public > P.max) return false;
    if (P.day === 'today' && !sameDay(d, now)) return false;
    if (P.day === 'tomorrow' && !sameDay(d, new Date(now.getTime() + 86400000))) return false;
    if (P.weekday != null && d.getDay() !== P.weekday) return false;
    if (P.weekend && d.getDay() !== 0 && d.getDay() !== 6) return false;
    if (P.hmax != null && d.getHours() >= P.hmax) return false;
    if (P.hmin != null && d.getHours() < P.hmin) return false;
    var hay = (e.title + ' ' + e.society_name + ' ' + e.venue + ' ' + e.category + ' ' + (e.description || '')).toLowerCase();
    return hay.indexOf(q) > -1;
  }
  function isFiltering() { return !!(S.q.trim() || S.where !== 'any' || S.when !== 'any' || S.date || S.what !== 'all' || S.free || S.radius > 0); }

  /* ---------------- 组件 ---------------- */
  function setSavedLocal(id, on) {
    S.events.forEach(function (e) { if (e.id === id) e.is_saved = on; });
    if (on) { if (!S.savedEvents.some(function (e) { return e.id === id; })) { var ev = S.events.filter(function (e) { return e.id === id; })[0]; if (ev) S.savedEvents.unshift(ev); } }
    else S.savedEvents = S.savedEvents.filter(function (e) { return e.id !== id; });
  }

  function seatsTag(e) {
    if (e.seats_left == null) return '';
    if (e.seats_left === 0) return '<span class="seats low">Full</span>';
    return '<span class="seats' + (e.seats_left <= 5 ? ' low' : '') + '">' + e.seats_left + ' left</span>';
  }
  function card(e) {
    var d = new Date(e.starts_at);
    return '<button class="card" data-open="' + esc(e.id) + '">' +
      '<div class="thumb"><img src="' + esc(e.cover_image_url) + '" alt="" loading="lazy">' +
      '<span class="date">' + MONTHS[d.getMonth()].toUpperCase() + ' ' + d.getDate() + '</span>' +
      '<span class="chipcat">' + esc(CATS[e.category] || 'Event') + '</span>' +
      (e.source ? '<span class="ext" data-ext="' + esc(e.source) + '" role="button" aria-label="Official event page">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>' + '</span>' : '') +
      '<span class="save" data-save="' + esc(e.id) + '" role="button" aria-label="Save" aria-pressed="' + (!!e.is_saved) + '"><svg viewBox="0 0 24 24" fill="' + (e.is_saved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 4.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V5.5a1 1 0 0 1 1-1Z"/></svg></span></div>' +
      '<div class="body"><div class="title">' + esc(e.title) + '</div>' +
      '<div class="meta">' + ICON.cal + ' ' + fmtDay(e.starts_at) + ' · ' + fmtTime(e.starts_at) + '</div>' +
      '<div class="meta">' + ICON.pin + ' ' + esc(String(e.venue).split(',')[0]) + '</div>' +
      '<div class="foot"><span class="price">' + money(e.your_price) + '</span>' + seatsTag(e) + '</div>' +
      (e.source ? '<span class="official-link" data-ext="' + esc(e.source) + '" role="link" tabindex="0">Official page ↗</span>' : '') +
      '</div></button>';
  }
  function row(e) {
    return '<button class="row" data-open="' + esc(e.id) + '"><span class="rhumb"><img src="' + esc(e.cover_image_url) + '" alt=""></span>' +
      '<span class="rmain"><div class="rtitle">' + esc(e.title) + '</div>' +
      '<div class="rmeta">' + fmtDay(e.starts_at) + ' · ' + fmtTime(e.starts_at) + ' · ' + esc(String(e.venue).split(',')[0]) + '</div>' +
      '<div class="rfoot"><span class="rprice">' + money(e.your_price) + '</span>' + seatsTag(e) + '<span class="rtag">' + esc(e.society_name) + '</span></div></span></button>';
  }
  function stars(r) {
    if (r == null) return '<span class="stars">—</span>';
    var n = Math.round(r);
    return '<span class="stars"><span class="s">' + '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n) + '</span> ' + r.toFixed(1) + '</span>';
  }
  function socCard(s) {
    return '<button class="soc" data-soc="' + esc(s.id) + '"><div class="top"><span class="mark"><img src="' + esc(s.campus_logo) + '" alt=""></span>' +
      '<span><span class="nm">' + esc(s.name) + '</span><br><span class="meta">' + s.member_count + ' members · ' + esc(s.campus_name.split(' ')[0]) + '</span></span></div>' +
      '<div class="blurb">' + esc(s.blurb) + '</div>' +
      '<div class="foot">' + stars(s.rating) + '<span style="margin-left:auto" class="pill-soft">' + (s.is_member ? 'Member' : money(s.membership_price) + ' to join') + '</span></div></button>';
  }

  /* ---------------- 侧栏 / Tab ---------------- */
  function sidebar() {
    var nav = [['home', '#/', 'Discover', ICON.home], ['societies', '#/societies', 'Societies', ICON.soc], ['saved', '#/saved', 'Saved', ICON.saved], ['my', '#/my', 'My stuff', ICON.me]];
    var active = S.route.name;
    if (active === 'event') active = 'home';
    var socs = (S.myMemberships || []).slice(0, 5);
    return '<a class="brand" href="#/">' +
      '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.2c3 2.4 4.6 5.6 4.6 8.8S15 18.4 12 20.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.2 9.2h15.6M4.2 14.8h15.6" stroke="currentColor" stroke-width="1.4" opacity=".55"/></svg>UniLoop</a>' +
      '<nav class="snav">' + nav.map(function (n) {
        return '<a href="' + n[1] + '"' + (active === n[0] ? ' aria-current="page"' : '') + '>' + n[3] + n[2] + '</a>';
      }).join('') +
      (S.me && S.me.role === 'exec' ? '<a href="#/organiser"' + (active === 'organiser' ? ' aria-current="page"' : '') + '>' + ICON.org + 'Organiser</a>' +
        '<a href="#/scan">' + ICON.qr + 'Scan tickets</a><a href="#/members">' + ICON.people + 'Members</a>' : '') +
      '</nav>' +
      '<div class="sblock"><h4>When</h4><div class="chips">' +
      [['any', 'Any day'], ['today', 'Today'], ['weekend', 'Weekend'], ['7d', '7 days']].map(function (x) {
        return '<button data-side="when" data-k="' + x[0] + '" aria-pressed="' + (S.when === x[0] && !S.date) + '">' + x[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="sblock"><h4>Type</h4><div class="chips">' +
      [['all', 'All']].concat(Object.keys(CATS).map(function (k) { return [k, CATS[k]]; })).map(function (x) {
        return '<button data-side="what" data-k="' + x[0] + '" aria-pressed="' + (S.what === x[0]) + '">' + x[1] + '</button>';
      }).join('') + '</div></div>' +
      (socs.length ? '<div class="sblock"><h4>My societies</h4><div class="chips">' + socs.map(function (m) {
        return '<button data-soc-link="' + esc(m.society_id) + '">' + esc(m.society_name) + '</button>';
      }).join('') + '</div></div>' : '') +
      '<div class="sfoot">' + (S.me ? 'Signed in as<br><b>' + esc(S.me.name) + '</b>' : 'Not signed in') + '<br><br><a href="#/my" style="color:inherit">' + (S.me ? 'My stuff' : 'Log in') + '</a></div>' +
      '<div class="themerow">' +
        '<button data-theme-set="light" aria-label="Light mode" aria-pressed="' + (currentTheme() !== 'dark') + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/></svg>' +
        '</button>' +
        '<button data-theme-set="dark" aria-label="Dark mode" aria-pressed="' + (currentTheme() === 'dark') + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"/></svg>' +
        '</button></div>';
  }
  function tabs() {
    if (!window.matchMedia('(hover:none) and (pointer:coarse)').matches) return '';
    var act = S.route.name; if (act === 'event') act = 'home';
    var items = [['home', '#/', 'Home', ICON.home], ['societies', '#/societies', 'Societies', ICON.soc], ['saved', '#/saved', 'Saved', ICON.saved], ['my', '#/my', 'Me', ICON.me]];
    return items.map(function (i) {
      return '<a class="tab" href="' + i[1] + '"' + (act === i[0] ? ' aria-current="page"' : '') + '>' + i[3] + i[2] + '</a>';
    }).join('');
  }

  /* ---------------- 首页 ---------------- */
  function heroHTML() {
    var soon = S.events.slice().sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); }).slice(0, 4);
    var slides = soon.map(function (e) { return '<div class="slide" style="background-image:url(\'' + esc(e.cover_image_url) + '\')"></div>'; }).join('');
    var e = soon[S.heroIdx % Math.max(1, soon.length)] || {};
    return '<section class="hero"><div class="slides">' + slides + '</div><div class="veil"></div>' +
      '<header class="hero-top"><a class="brand" href="#/">' +
      '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.2c3 2.4 4.6 5.6 4.6 8.8S15 18.4 12 20.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.2 9.2h15.6M4.2 14.8h15.6" stroke="currentColor" stroke-width="1.4" opacity=".55"/></svg>UniLoop</a>' +
      '<span class="city">Sydney</span><span class="sp"></span>' +
      '<button class="avatar" id="avatarBtn">' + (S.me ? esc(initials(S.me.name)) : 'Log in') + '</button></header>' +
      '<div class="hero-body"><p class="kicker">' + HERO_LINES[S.heroIdx % HERO_LINES.length].k + '</p><h1>' + HERO_LINES[S.heroIdx % HERO_LINES.length].a + '<br>' + HERO_LINES[S.heroIdx % HERO_LINES.length].b + '</h1>' +
      '<p class="hero-meta">' + (e.title ? '<b>' + esc(e.society_name) + '</b><span class="dot"></span><span>' + fmtDay(e.starts_at) + ' · ' + fmtTime(e.starts_at) + '</span><span class="dot"></span><span>' + esc(String(e.venue).split(',')[0]) + '</span>' : '') + '</p></div>' +
      '<div class="hero-dots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i === S.heroIdx ? 'on' : '') + '"></i>'; }).join('') + '</div></section>';
  }
  function searchHTML() {
    var whenLabel = S.date ? fmtDay(S.date) : ({ any: 'Any day', today: 'Today', tomorrow: 'Tomorrow', weekend: 'This weekend', '7d': '7 days' }[S.when] || 'Any day');
    return '<div class="searchwrap"><div class="searchbar">' +
      '<button class="seg dim" id="segWhere"><span class="lbl">Where</span><span class="val">' + (S.where === 'any' ? 'Anywhere' : ((S.campuses.filter(function (c) { return c.id === S.where; })[0] || {}).short || 'Anywhere')) + '</span></button><span class="divider"></span>' +
      '<button class="seg dim" id="segWhen"><span class="lbl">When</span><span class="val">' + whenLabel + '</span></button><span class="divider"></span>' +
      '<button class="seg dim" id="segWhat"><span class="lbl">What</span><span class="val">' + (S.what === 'all' ? 'Anything' : CATS[S.what]) + '</span></button>' +
      '<button class="go" id="searchGo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h13M12 5l7 7-7 7"/></svg></button></div>' +
      '<div class="filters"><button class="filter" data-pill="when" data-active="' + (S.when !== 'any' || !!S.date) + '"><span>' + whenLabel + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '<button class="filter" data-pill="what" data-active="' + (S.what !== 'all') + '"><span>' + (S.what === 'all' ? 'Any type' : CATS[S.what]) + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '<button class="filter" data-pill="free" data-active="' + (!!S.free) + '">Free</button>' +
      '<button class="filter" data-pill="radius" data-active="' + (S.radius > 0) + '"><span>' + (S.radius ? S.radius + ' km' : '3 km') + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button></div></div>';
  }
  function viewHome() {
    var list;
    if (isFiltering()) {
      list = S.events.filter(matches).sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
      return heroHTML() + searchHTML() +
        '<div class="results"><div class="head"><span class="count">' + list.length + ' result' + (list.length === 1 ? '' : 's') + '</span><button class="clear" id="clearAll">Clear all</button></div>' +
        (list.length ? '<div class="rows">' + list.map(row).join('') + '</div>' : '<div class="empty"><b>Nothing matches yet</b>Try another word, or clear the filters.</div>') + '</div>';
    }
    var soon = S.events.slice().sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
    var free = S.events.filter(function (e) { return e.price_public === 0; });
    return heroHTML() + searchHTML() +
      '<section class="reveal"><div class="sec"><h2>Happening soon</h2><a href="#/search">See all</a></div><div class="rail">' + soon.slice(0, 12).map(card).join('') + '</div></section>' +
      '<section class="reveal"><div class="sec"><h2>Free this week</h2><span class="sub">' + free.length + ' events</span></div><div class="rail">' + (free.length ? free : soon.slice().reverse()).slice(0, 12).map(card).join('') + '</div></section>' +
      '<section class="reveal"><div class="sec"><h2>This week, all together</h2><span class="sub">' + Math.min(8, soon.length) + ' picks</span></div><div class="grid">' + soon.slice(0, 8).map(card).join('') + '</div></section>' +
      '<section class="reveal"><div class="sec"><h2>Campuses</h2><span class="sub">5 universities</span></div><div class="campuses">' +
      S.campuses.map(function (c) { return '<button class="campus" data-campus="' + esc(c.id) + '"><img src="' + esc(c.logo) + '" alt=""><span>' + esc(c.short) + '</span></button>'; }).join('') + '</div></section>';
  }

  /* ---------------- 活动页（路由） ---------------- */
  function viewEventPage(e) {
    if (!e) return '<div class="empty"><b>Event not found</b><a class="btn-quiet" href="#/">Back to Discover</a></div>';
    var pct = e.capacity ? Math.min(100, Math.round(e.rsvp_count / e.capacity * 100)) : 0;
    var seatsTxt = e.seats_left == null ? 'No cap' : (e.seats_left === 0 ? 'Full' : e.seats_left + ' spots left');
    var memberLine = e.price_member < e.price_public
      ? '<div class="n">Member price ' + money(e.price_member) + ' · join the society to get it</div>' : '';
    return '<div class="evpage"><a class="evback" href="#/">← Back to Discover</a>' +
      '<div class="evgrid"><div class="evmain">' +
        '<div class="evhero"><img src="' + esc(e.cover_image_url) + '" alt="' + esc(e.title) + '"></div>' +
        '<div class="pg-cat" style="margin-top:16px">' + (CATS[e.category] || 'Event').toUpperCase() + ' · ' + esc(e.campus_name || '') + '</div>' +
        '<h1>' + esc(e.title) + '</h1>' +
        '<div class="pg-host"><img src="' + esc(e.society_logo || '') + '" alt=""><div><b>' + esc(e.society_name) + '</b><span>' +
          (e.society_rating ? '★ ' + e.society_rating + ' · ' : '') + esc(e.campus_name || '') + '</span></div></div>' +
        (e.source ? '<a class="official-big" href="' + esc(e.source) + '" target="_blank" rel="noopener"><span>Official event page<span>Opens the original listing in a new tab</span></span>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg></a>' : '') +
        '<div class="pg-meta">' +
          '<div class="mrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg><div><b>' + fmtDay(e.starts_at) + ' · ' + fmtTime(e.starts_at) + '</b><span>' + (((new Date(e.ends_at) - new Date(e.starts_at)) / 3600000)) + ' hours · ' + (e.audience_scope === 'CAMPUS_ONLY' ? 'Own campus only' : 'Open to all campuses') + '</span></div></div>' +
          '<div class="mrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg><div><b>' + esc(String(e.venue).split(',')[0]) + '</b><span>' + (e.venue_coords ? 'Directions · ' + distOf(e) + ' km from campus' : '') + '</span></div></div>' +
        '</div>' +
        '<p class="pg-desc">' + esc(e.description) + '</p>' +
        '<div class="pg-sec">Spots</div><div class="pg-bar"><span style="width:' + pct + '%"></span></div>' +
        '<div style="font-size:12px;color:var(--muted)">' + e.rsvp_count + ' going · ' + seatsTxt + '</div>' +
        '<div class="pg-sec">Where</div><div class="pg-map"><iframe src="' + esc((e.map || {}).osm_embed || '') + '" title="Map" loading="lazy" referrerpolicy="no-referrer"></iframe>' +
          '<div class="mapbtns"><a href="' + esc((e.map || {}).google_directions || '#') + '" target="_blank" rel="noopener">Google directions</a><a href="' + esc((e.map || {}).apple_maps || '#') + '" target="_blank" rel="noopener">Apple Maps</a></div></div>' +
      '</div>' +
      '<aside class="evaside">' +
        '<div class="evcard"><div class="k">Price</div><div class="v">' + money(e.your_price) + '</div>' + memberLine +
          (e.my_rsvp ? '<div class="n" style="color:var(--forest);font-weight:700">You are in · ' + (e.my_rsvp.ticket_type === 'member' ? 'member ticket' : 'general ticket') + (e.my_rsvp.ticket_code ? ' · ' + esc(e.my_rsvp.ticket_code) : '') + '</div>' : '') +
          '<button class="evcta" id="evRsvp"' + (e.my_rsvp || e.seats_left === 0 ? ' disabled' : '') + '>' +
            (e.my_rsvp ? "You're in" : (e.seats_left === 0 ? 'Full' : 'RSVP' + (e.your_price ? ' · ' + money(e.your_price) : ' free'))) + '</button>' +
          '<button class="evghost" id="evSave">' + (e.is_saved ? '★ Saved' : '☆ Save for later') + '</button>' +
          (e.society_membership_price != null ? '<a class="evghost" href="#/society/' + esc(e.society_id) + '">View ' + esc(e.society_name) + ' →</a>' : '') +
        '</div>' +
        '<div class="evcard"><div class="k">Going</div><div class="v">' + e.rsvp_count + (e.capacity ? ' <span style="font-size:13px;color:var(--muted)">/ ' + e.capacity + '</span>' : '') + '</div><div class="n">' + seatsTxt + '</div></div>' +
      '</aside></div></div>';
  }

  function openEvent(id) {
    var e = S.events.filter(function (x) { return x.id === id; })[0];
    if (!e) { api('/api/events/' + encodeURIComponent(id)).then(function (r) { renderEvent(r.event); showEvent(); }).catch(function (err) { toast(err.message); }); return; }
    renderEvent(e); showEvent();
  }
  function renderEvent(e) {
    $('#pgImg').src = e.cover_image_url; $('#pgImg').alt = e.title;
    $('#pgCat').textContent = (CATS[e.category] || 'Event').toUpperCase();
    $('#pgTitle').textContent = e.title;
    $('#pgCrest').src = e.society_logo || ''; $('#pgSoc').textContent = e.society_name;
    $('#pgSocMeta').textContent = (e.society_rating ? '★ ' + e.society_rating + ' · ' : '') + (e.campus_name || '');
    $('#pgWhen').textContent = fmtDay(e.starts_at) + ' · ' + fmtTime(e.starts_at);
    $('#pgWhenSub').textContent = ((new Date(e.ends_at) - new Date(e.starts_at)) / 3600000) + ' hours · ' + (e.audience_scope === 'CAMPUS_ONLY' ? 'Own campus only' : 'Open to all campuses');
    $('#pgWhere').textContent = String(e.venue).split(',')[0];
    $('#pgWhereSub').textContent = e.venue_coords ? 'Directions · ' + distOf(e) + ' km from campus' : '';
    $('#pgDesc').textContent = e.description;
    $('#pgBar').style.width = (e.capacity ? Math.min(100, Math.round(e.rsvp_count / e.capacity * 100)) : 0) + '%';
    $('#pgSpots').textContent = e.rsvp_count + ' going' + (e.capacity ? ' · ' + Math.max(0, e.capacity - e.rsvp_count) + ' of ' + e.capacity + ' left' : '');
    $('#pgPrice').textContent = money(e.your_price);
    var seats = $('#pgSeats');
    if (e.seats_left == null) { seats.textContent = 'No cap'; seats.className = ''; }
    else if (e.seats_left === 0) { seats.textContent = 'Full'; seats.className = 'low'; }
    else { seats.textContent = e.seats_left + ' left'; seats.className = e.seats_left <= 5 ? 'low' : ''; }
    var btn = $('#pgRsvp');
    if (e.my_rsvp) { btn.textContent = "You're in"; btn.disabled = true; }
    else if (e.seats_left === 0) { btn.textContent = 'Full'; btn.disabled = true; }
    else { btn.textContent = 'RSVP' + (e.your_price ? ' · ' + money(e.your_price) : ' free'); btn.disabled = false; }
    if (e.map) { $('#pgMap').src = e.map.osm_embed; $('#pgGmaps').href = e.map.google_directions; $('#pgApple').href = e.map.apple_maps; }
    $('#pgSave').setAttribute('aria-pressed', String(!!e.is_saved));
    $('#pgSave').querySelector('svg').setAttribute('fill', e.is_saved ? 'currentColor' : 'none');
    $('#pgAside').innerHTML = (e.source ? '<a class="official" href="' + esc(e.source) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>Official event page</a>' : '') + '<div class="kpi"><div class="k">Price</div><div class="v">' + money(e.your_price) + '</div>' +
      '<div class="n">' + (e.price_member < e.price_public ? 'Member price ' + money(e.price_member) : 'Test payments only') + '</div></div>' +
      '<div class="kpi" style="margin-top:10px"><div class="k">Going</div><div class="v">' + e.rsvp_count + (e.capacity ? ' <small>/ ' + e.capacity + '</small>' : '') + '</div><div class="n">' + (e.seats_left == null ? 'No cap' : e.seats_left + ' spots left') + '</div></div>';
    S.openEventId = e.id;
  }
  function showEvent() { $('#eventPage').classList.add('on'); $('#eventPage .page-scroll').scrollTop = 0; }
  function closeEvent() { $('#eventPage').classList.remove('on'); S.openEventId = null; }

  async function rsvp(id) {
    if (!S.me) { S.pending = { type: 'rsvp', id: id }; openAuth(); return; }
    try {
      await api('/api/events/' + encodeURIComponent(id) + '/rsvp', { method: 'POST', body: { card: '4242424242424242' } });
      toast('You are on the list.'); await loadMe(); await loadEvents(); route();
    } catch (err) {
      if (err.status === 402) {
        try { await api('/api/events/' + encodeURIComponent(id) + '/rsvp', { method: 'POST', body: { card: '4242424242424242' } }); toast('Paid & added'); await loadMe(); route(); }
        catch (e2) { toast(e2.message); }
      } else toast(err.message);
    }
  }

  /* ---------------- 社团 ---------------- */
  function viewSocieties() {
    var groups = {};
    S.societies.forEach(function (s) { (groups[s.campus_id] = groups[s.campus_id] || []).push(s); });
    return '<div class="sec" style="padding-top:28px"><h2>Societies</h2><span class="sub">' + S.societies.length + ' across Sydney</span></div>' +
      S.campuses.filter(function (c) { return groups[c.id]; }).map(function (c) {
        return '<div class="campus-head"><img src="' + esc(c.logo) + '" alt=""><div><div class="nm">' + esc(c.name) + '</div><div class="lbl">' + groups[c.id].length + ' societies</div></div></div>' +
          '<div class="socgrid">' + groups[c.id].map(socCard).join('') + '</div>';
      }).join('');
  }
  function viewSociety(d) {
    if (!d) return '<div class="empty"><b>Society not found</b></div>';
    var s = d.society;
    var cover = (d.upcoming[0] || d.past[0] || {}).cover_image_url || '/assets/events/ev1.jpg';
    var socials = s.socials || {};
    var ig = socials.instagram || ('https://www.instagram.com/explore/search/keyword/?q=' + encodeURIComponent(s.name));
    var luma = socials.luma || ('https://lu.ma/search?q=' + encodeURIComponent(s.name));
    var web = socials.web || ('https://www.google.com/search?q=' + encodeURIComponent(s.name));
    return '<div class="hub-cover"><img src="' + esc(cover) + '" alt=""></div>' +
      '<div class="hub-head"><div class="hub-logo"><img src="' + esc(s.campus_logo) + '" alt=""></div><div class="hub-title"><h1>' + esc(s.name) + '</h1><p>' + esc(s.campus_name) + ' · ' + esc((s.tags || []).join(' · ')) + '</p></div>' +
      (s.is_member ? '<span class="pill-soft">Member</span>' : '<button class="filter" id="joinSoc" data-soc="' + esc(s.id) + '" data-price="' + s.membership_price + '" style="flex:0 0 auto">Join · ' + money(s.membership_price) + '</button>') + '</div>' +
      '<div class="hub-stats"><div class="cell"><div class="n">' + s.member_count + '</div><div class="l">Members</div></div>' +
      '<div class="cell"><div class="n">' + s.followers + '</div><div class="l">Followers</div></div>' +
      '<div class="cell"><div class="n">' + d.upcoming.length + '</div><div class="l">Upcoming</div></div>' +
      '<div class="cell"><div class="n">' + (s.type || 'Society') + '</div><div class="l">Type</div></div></div>' +
      '<div style="padding:0 16px"><p class="pg-desc">' + esc(s.blurb) + '</p></div>' +
      '<div class="pg-sec" style="padding:0 16px">Official links</div>' +
      '<div class="socials">' +
      '<a href="' + esc(ig) + '" target="_blank" rel="noopener">' + ICON.ig + 'Instagram</a>' +
      '<a href="' + esc(luma) + '" target="_blank" rel="noopener">' + ICON.link + 'Luma page</a>' +
      '<a href="' + esc(web) + '" target="_blank" rel="noopener">' + ICON.globe + 'Website / search</a>' +
      '</div>' +
      '<div class="sec" style="padding-top:10px"><h2>Upcoming</h2><span class="sub">' + d.upcoming.length + ' events</span></div>' +
      (d.upcoming.length ? '<div class="grid">' + d.upcoming.map(card).join('') + '</div>' : '<div class="empty"><b>Nothing scheduled</b></div>') +
      (d.past.length ? '<div class="sec"><h2>Past photos</h2><span class="sub">' + d.past.length + '</span></div><div class="gallery">' +
        d.gallery.map(function (g) { return '<figure><img src="' + esc(g.image) + '" alt=""><figcaption>' + esc(g.title) + '</figcaption></figure>'; }).join('') + '</div>' : '');
  }

  /* ---------------- 我的 / 收藏 ---------------- */
  function viewSaved() {
    if (!S.me) return '<div class="empty"><b>Sign in to see saved events</b><div style="margin-top:12px"><button class="filter" id="loginBtn">Log in</button></div></div>';
    var list = S.savedEvents;
    return '<div class="sec" style="padding-top:28px"><h2>Saved</h2><span class="sub">' + list.length + ' events</span></div>' +
      (list.length ? '<div class="grid">' + list.map(card).join('') + '</div>' : '<div class="empty"><b>Nothing saved yet</b>Tap the bookmark on any event.</div>');
  }
  function viewMy() {
    if (!S.me) return '<div class="empty"><b>Sign in to see your stuff</b><div style="margin-top:12px"><button class="filter" id="loginBtn">Log in</button></div></div>';
    return '<div class="sec" style="padding-top:28px"><h2>My stuff</h2><span class="sub">' + (S.me.username ? '@' + esc(S.me.username) + ' · ' : '') + esc(S.me.campus_name) + '</span></div>' +
      '<div style="padding:0 16px 6px"><button class="themebtn" id="themeBtn2" style="margin-top:0">' + (currentTheme() === 'dark' ? '☀ Switch to light' : '☾ Switch to dark') + '</button></div>' +
      '<div style="padding:0 16px 8px"><div class="kpis" style="padding:0"><div class="kpi"><div class="k">Tickets</div><div class="v">' + S.myRsvps.length + '</div><div class="n">upcoming</div></div>' +
      '<div class="kpi"><div class="k">Societies</div><div class="v">' + S.myMemberships.length + '</div><div class="n">memberships</div></div>' +
      '<div class="kpi"><div class="k">Saved</div><div class="v">' + money(S.savedMoney) + '</div><div class="n">with member prices</div></div>' +
      '<div class="kpi"><div class="k">Saved events</div><div class="v">' + S.savedEvents.length + '</div><div class="n">on your list</div></div></div></div>' +
      (function () {
        var now = Date.now();
        var up = S.myRsvps.filter(function (r) { return new Date(r.event.starts_at).getTime() >= now; });
        var past = S.myRsvps.filter(function (r) { return new Date(r.event.starts_at).getTime() < now; });
        var shown = S.showAllTickets ? up : up.slice(0, 3);
        var html = '<div class="sec"><h2>Upcoming tickets</h2><span class="sub">' + up.length + '</span></div>';
        if (!up.length) html += '<div class="empty"><b>No upcoming tickets</b>RSVP to something on Discover.</div>';
        else {
          html += '<div class="grid">' + shown.map(function (r) {
            return '<div style="display:flex;flex-direction:column;gap:6px">' + card(r.event) +
              '<button class="evghost" data-ticket="' + esc(r.ticket_code || '') + '" style="margin-top:0">Show ticket · ' + esc(r.ticket_code || '—') + '</button></div>';
          }).join('') + '</div>';
          if (up.length > 3) html += '<div style="padding:8px 16px 0"><button class="evghost" id="toggleTickets">' +
            (S.showAllTickets ? 'Show fewer' : 'Show all ' + up.length + ' tickets') + '</button></div>';
        }
        if (past.length) {
          html += '<div class="sec"><h2>Past tickets</h2><span class="sub">' + past.length + '</span></div>';
          html += '<div style="padding:0 16px"><button class="evghost" id="togglePast">' +
            (S.showPastTickets ? 'Hide past tickets' : 'Show ' + past.length + ' past tickets') + '</button></div>';
          if (S.showPastTickets) html += '<div class="grid" style="margin-top:10px">' + past.slice(0, 12).map(function (r) { return card(r.event); }).join('') + '</div>';
        }
        return html;
      })() +
      '<div class="sec"><h2>My societies</h2></div>' +
      (S.myMemberships.length ? '<div class="socgrid">' + S.socFromMemberships().join('') + '</div>' : '<div class="empty"><b>No memberships</b>Joining unlocks member prices.</div>');
  }
  S.socFromMemberships = function () {
    return S.myMemberships.map(function (m) {
      var s = S.societies.filter(function (x) { return x.id === m.society_id; })[0] || { name: m.society_name, campus_logo: '/assets/schools/mq.png', member_count: 0, rating: null, membership_price: m.price_paid, blurb: '' };
      return '<button class="soc" data-soc="' + esc(m.society_id) + '"><div class="top"><span class="mark"><img src="' + esc(s.campus_logo) + '" alt=""></span><span><span class="nm">' + esc(m.society_name) + '</span><br><span class="meta">Member · paid ' + money(m.price_paid) + '</span></span></div></button>';
    });
  };

  function ticketUrl(code) { return location.origin + '/#/checkin/' + code; }
  function showTicket(code) {
    if (!code) return toast('No ticket code yet');
    var svg = (window.QR && QR.svg) ? QR.svg(ticketUrl(code), { size: 240, label: 'Ticket QR code' }) : '';
    var wrap = document.createElement('div');
    wrap.className = 'scrim on'; wrap.id = 'ticketScrim';
    wrap.innerHTML = '<div style="margin:auto;max-width:360px;background:var(--surface);border-radius:20px;padding:20px;text-align:center;box-shadow:0 30px 70px -30px rgba(0,0,0,.5)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:14px">Your ticket</b>' +
      '<button id="ticketClose" style="border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:var(--muted)">×</button></div>' +
      '<div style="background:#fff;border-radius:14px;padding:12px">' + svg + '</div>' +
      '<div style="font-family:ui-monospace,monospace;font-size:18px;letter-spacing:.16em;margin-top:12px">' + esc(code) + '</div>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-top:6px">Show this at the door. Exec scans it to check you in.</div></div>';
    document.body.appendChild(wrap);
    wrap.onclick = function (e) { if (e.target === wrap || e.target.id === 'ticketClose') wrap.remove(); };
  }

  function viewScan() {
    if (!S.me || S.me.role !== 'exec') return '<div class="empty"><b>Organiser sign-in required</b></div>';
    return '<div class="evpage" style="max-width:720px"><div class="sec" style="padding-left:0"><h2>Scan tickets</h2><span class="sub">Check-in</span></div>' +
      '<div class="evcard"><div class="k">Ticket code</div>' +
      '<input id="scanInput" placeholder="Paste code or ticket link" style="width:100%;height:48px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:0 12px;font-size:15px;margin-top:8px;color:var(--ink)">' +
      '<button class="evcta" id="scanBtn">Check in</button>' +
      '<div id="scanResult" style="margin-top:12px;font-size:13px"></div>' +
      '<button class="evghost" id="scanCam">Scan with camera</button><video id="scanVideo" playsinline style="display:none;width:100%;border-radius:12px;margin-top:10px"></video></div>' +
      '<p style="font-size:12px;color:var(--muted);margin-top:12px">Tip: the QR contains ' + esc(location.origin) + '/#/checkin/CODE</p></div>';
  }
  async function doScan(code) {
    try {
      var r = await api('/api/exec/scan', { method: 'POST', body: { code: code } });
      $('#scanResult').innerHTML = '<div style="background:#E7F0EA;color:#1F4A3B;padding:12px;border-radius:10px;font-weight:700">✓ ' +
        esc(r.attendee.name) + (r.already ? ' — already checked in' : ' — checked in') + '</div>';
      return true;
    } catch (e) { $('#scanResult').innerHTML = '<div style="background:#FBEDE8;color:#B4472C;padding:12px;border-radius:10px">' + esc(e.message) + '</div>'; return false; }
  }

  function viewMembers() {
    if (!S.me || S.me.role !== 'exec') return '<div class="empty"><b>Organiser sign-in required</b></div>';
    if (!S.members) return '<div class="empty">Loading…</div>';
    return '<div class="evpage" style="max-width:900px"><div class="sec" style="padding-left:0"><h2>Members</h2><span class="sub">' + S.members.count + ' total</span></div>' +
      '<div class="evcard" style="padding:4px 14px">' + (S.members.members.length ? S.members.members.map(function (m) {
        return '<div class="lrow" style="border-color:var(--line)"><div style="width:34px;height:34px;border-radius:50%;background:var(--sage);display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--forest)">' + esc(initials(m.name)) + '</div>' +
          '<div><div class="t">' + esc(m.name) + '</div><div class="m">' + esc(m.email) + '</div></div><div class="r">' + money(m.price_paid) + '</div></div>';
      }).join('') : '<div class="empty"><b>No members yet</b></div>') + '</div></div>';
  }

  /* ---------------- 主办方 ---------------- */
  function chart(series, capacity) {
    if (!series || !series.length) return '';
    var w = 420, h = 140, pad = 24;
    var max = Math.max(capacity || 0, series[series.length - 1].cumulative || 1) * 1.1;
    var step = (w - pad * 2) / Math.max(1, series.length - 1);
    var pts = series.map(function (p, i) { return [Math.round(pad + i * step), Math.round(h - pad - (p.cumulative / max) * (h - pad * 2))]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
    var capY = capacity ? Math.round(h - pad - (capacity / max) * (h - pad * 2)) : null;
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1F4A3B" stop-opacity=".2"/><stop offset="1" stop-color="#1F4A3B" stop-opacity="0"/></linearGradient></defs>' +
      (capY ? '<line x1="' + pad + '" y1="' + capY + '" x2="' + (w - pad) + '" y2="' + capY + '" stroke="#D8583A" stroke-width="1.4" stroke-dasharray="5 5"/>' : '') +
      '<path d="' + line + ' L' + pts[pts.length - 1][0] + ' ' + (h - pad) + ' L' + pts[0][0] + ' ' + (h - pad) + ' Z" fill="url(#cg)"/>' +
      '<path d="' + line + '" fill="none" stroke="#1F4A3B" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function viewOrganiser() {
    if (!S.me) return '<div class="empty"><b>Organiser sign-in required</b><div style="margin-top:12px"><button class="filter" id="loginBtn">Log in</button></div></div>';
    if (S.me.role !== 'exec') return '<div class="empty"><b>Society organisers only</b>Use the organiser demo account.<div style="margin-top:12px"><button class="filter" id="loginBtn">Switch account</button></div></div>';
    if (!S.org) return '<div class="empty">Loading…</div>';
    var h = S.org, st = h.stats, d = S.orgDash || { stats: {}, series: [] }, ds = d.stats;
    return '<div class="hub-head" style="margin-top:22px"><div class="hub-logo"><img src="' + esc(h.society.campus_logo) + '" alt=""></div>' +
      '<div class="hub-title"><h1>' + esc(h.society.name) + '</h1><p>' + stars(h.society.rating) + ' · ' + st.followers + ' followers · ' + st.members + ' members</p></div>' +
      '<button class="filter" id="openCreate" style="flex:0 0 auto">＋ New event</button></div>' +
      '<div class="kpis"><div class="kpi"><div class="k">RSVPs</div><div class="v">' + st.rsvps_upcoming + ' <small>/ ' + st.capacity_total + '</small></div><div class="n">' + st.rsvps_24h + ' in 24h</div></div>' +
      '<div class="kpi"><div class="k">Fill rate</div><div class="v">' + (st.capacity_total ? Math.round(st.rsvps_upcoming / st.capacity_total * 100) : 0) + '<small>%</small></div><div class="n">' + st.events_upcoming + ' upcoming</div></div>' +
      '<div class="kpi"><div class="k">Page views</div><div class="v">' + (ds.page_views || 0) + '</div><div class="n">featured event</div></div>' +
      '<div class="kpi"><div class="k">Revenue</div><div class="v">' + money(st.revenue) + '</div><div class="n">tickets + members</div></div></div>' +
      '<div class="chartcard"><h2>Will it fill?</h2><p class="cap">Cumulative RSVPs, last 14 days · capacity line</p>' + chart(d.series, (d.event || {}).capacity) +
      '<p style="font-size:11.5px;color:var(--muted);margin:8px 0 0">' + (ds.rsvp_count || 0) + ' of ' + ((d.event || {}).capacity || '∞') + ' · ' + (ds.needed_to_fill == null ? 'no cap' : ds.needed_to_fill + ' more to fill') + ' · projected ' + (ds.projected_final || 0) + '</p></div>' +
      '<div class="sec"><h2>Recent RSVPs</h2><span class="sub"><span class="livedot"></span>live · 3s</span></div>' +
      '<div class="list" id="orgAttendees">' + (function () {
        var rows = (S.orgDash && S.orgDash.attendees) || [];
        if (!rows.length) return '<div class="empty"><b>No RSVPs yet</b>Share the event link.</div>';
        return rows.slice(0, 8).map(function (a) {
          var flash = S.flashIds.indexOf(a.id) > -1 ? ' flash' : '';
          return '<div class="lrow' + flash + '"><div class="av">' + esc(initials(a.display_name)) + '</div>' +
            '<div style="min-width:0"><div class="who">' + esc(a.display_name) + '</div>' +
            '<div class="sub2">' + (a.ticket_code ? esc(a.ticket_code) + ' · ' : '') + (a.ticket_type === 'member' ? 'member' : 'general') + ' · ' + (a.email ? esc(a.email.split('@')[0]) : '') + '</div></div>' +
            '<div class="r">' + (a.checked_in ? '<span class="pill-ok">✓ checked in</span>' : '<span class="pill-wait">not yet</span>') + '</div></div>';
        }).join('');
      })() + '</div>' +
      '<div class="sec"><h2>Upcoming</h2><span class="sub">' + h.upcoming.length + '</span></div><div class="list">' +
      h.upcoming.map(function (e) { return '<div class="lrow" data-open="' + esc(e.id) + '"><img src="' + esc(e.cover_image_url) + '" alt=""><div><div class="t">' + esc(e.title) + '</div><div class="m">' + fmtDay(e.starts_at) + ' · ' + esc(String(e.venue).split(',')[0]) + '</div></div><div class="r">' + e.rsvp_count + '/' + (e.capacity || '∞') + '</div></div>'; }).join('') + '</div>' +
      '<div class="sec"><h2>Past events</h2><span class="sub">' + h.past.length + '</span></div><div class="gallery">' +
      h.gallery.map(function (g) { return '<figure><img src="' + esc(g.image) + '" alt=""><figcaption>' + esc(g.title) + '</figcaption></figure>'; }).join('') + '</div>' +
      '<div class="sec"><h2>What students said</h2><span class="sub">' + h.reviews.length + '</span></div><div class="reviews">' +
      h.reviews.map(function (r) { return '<div class="review"><div class="top"><span class="who">' + esc(r.display_name) + '</span>' + stars(r.rating) + '</div><div class="txt">' + esc(r.text) + '</div></div>'; }).join('') + '</div>';
  }

  /* ---------------- 搜索面板 ---------------- */
  function previewCount() { var save = { where: S.where, when: S.when, what: S.what, free: S.free, q: S.q, date: S.date }; Object.assign(S, S.pending); var n = S.events.filter(matches).length; Object.assign(S, save); return n; }
  function dateCount(ds) { return S.events.filter(function (e) { return sameDay(new Date(e.starts_at), new Date(ds)); }).length; }
  function renderStep() {
    var st = S.step;
    $$('#searchSheet [data-stepbar]').forEach(function (i) { i.classList.toggle('on', Number(i.dataset.stepbar) <= st); });
    $('#searchExtra').innerHTML = '';
    if (st === 1) {
      $('#searchTitle').textContent = 'Where?'; $('#searchSub').textContent = 'Pick a campus, or search anywhere in Sydney.';
      $('#searchExtra').innerHTML = '<div class="searchfield"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg><input id="qInput" placeholder="Search events, societies, venues" value="' + esc(S.pending.q || '') + '"></div>' +
        '<div class="popular"><span class="lbl">Popular</span>' + ['careers', 'walk', 'coffee', 'hike'].map(function (t) { return '<button data-pop="' + t + '">' + t + '</button>'; }).join('') + '</div>';
      var opts = [{ k: 'any', t: 'Anywhere', d: 'All of Sydney', short: 'ALL', c: 'linear-gradient(135deg,#1F4A3B,#D8583A)' }]
        .concat(S.campuses.map(function (c) { return { k: c.id, t: c.name, d: c.short + ' campus', short: c.short, c: CAMPCOL[c.id] || '#1F4A3B' }; }));
      $('#searchOpts').innerHTML = opts.map(function (x) {
        var on = (S.pending.where || 'any') === x.k, cnt = S.events.filter(function (e) { return x.k === 'any' || e.campus_id === x.k; }).length;
        return '<button class="opt" data-opt="where" data-k="' + esc(x.k) + '" aria-pressed="' + on + '"><span class="badge" style="background:' + x.c + '">' + esc(x.short) + '</span><span><span class="t">' + esc(x.t) + '</span><span class="d">' + esc(x.d) + '</span></span><span class="cnt">' + cnt + '</span><span class="tick"></span></button>';
      }).join('');
    } else if (st === 2) {
      $('#searchTitle').textContent = 'When?'; $('#searchSub').textContent = 'Pick a window — or a specific day.';
      var now = new Date();
      var ws = [['any', 'Any day', 'No date filter'], ['today', 'Today', 'Before midnight'], ['tomorrow', 'Tomorrow', 'The next day'], ['weekend', 'This weekend', 'Sat & Sun'], ['7d', 'Next 7 days', 'Rolling week']];
      $('#searchOpts').innerHTML = ws.map(function (x) {
        var on = (S.pending.when || 'any') === x[0] && !S.pending.date;
        var cnt = S.events.filter(function (e) {
          var d = new Date(e.starts_at);
          if (x[0] === 'any') return true;
          if (x[0] === 'today') return sameDay(d, now);
          if (x[0] === 'tomorrow') return sameDay(d, new Date(now.getTime() + 86400000));
          if (x[0] === 'weekend') return d.getDay() === 0 || d.getDay() === 6;
          if (x[0] === '7d') return d.getTime() <= now.getTime() + 7 * 86400000;
          return true;
        }).length;
        return '<button class="opt" data-opt="when" data-k="' + x[0] + '" aria-pressed="' + on + '"><span><span class="t">' + x[1] + '</span><span class="d">' + x[2] + '</span></span><span class="cnt">' + cnt + '</span><span class="tick"></span></button>';
      }).join('') + '<div style="margin:14px 2px 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Pick a day</div><div class="datestrip">' + dateChips() + '</div>';
    } else {
      $('#searchTitle').textContent = 'What?'; $('#searchSub').textContent = 'Pick a type, or keep it open.';
      var ws2 = [['all', 'Anything', 'All event types']].concat(Object.keys(CATS).map(function (k) { return [k, CATS[k], '']; }));
      $('#searchOpts').innerHTML = ws2.map(function (x) {
        var on = (S.pending.what || 'all') === x[0];
        var cnt = S.events.filter(function (e) { return x[0] === 'all' || e.category === x[0]; }).length;
        var dot = x[0] === 'all' ? '<span class="dot" style="background:linear-gradient(135deg,#1F4A3B,#D8583A)"></span>' : '<span class="dot" style="background:' + CATCOL[x[0]] + '"></span>';
        return '<button class="opt" data-opt="what" data-k="' + x[0] + '" aria-pressed="' + on + '">' + dot + '<span><span class="t">' + x[1] + '</span>' + (x[2] ? '<span class="d">' + x[2] + '</span>' : '') + '</span><span class="cnt">' + cnt + '</span><span class="tick"></span></button>';
      }).join('') + '<button class="opt" data-opt="free" data-k="1" aria-pressed="' + (!!S.pending.free) + '"><span class="dot" style="background:#E9EFE8;border:1px solid #C9D6CC"></span><span><span class="t">Free only</span><span class="d">No ticket price</span></span><span class="cnt">' + S.events.filter(function (e) { return e.price_public === 0; }).length + '</span><span class="tick"></span></button>';
    }
    var n = previewCount();
    $('#searchCount').textContent = n + (n === 1 ? ' event matches' : ' events match');
    $('#searchShow').textContent = st < 3 ? 'Next' : 'Show events';
  }
  function dateChips() {
    var out = '', today = new Date();
    for (var i = 0; i < 21; i++) {
      var d = new Date(today.getTime() + i * 86400000), cnt = dateCount(d), key = d.toISOString().slice(0, 10);
      out += '<button class="dchip' + (cnt ? '' : ' none') + '" data-date="' + key + '" aria-pressed="' + (S.pending.date === key) + '"><span class="dn">' + DAYS[d.getDay()] + '</span><span class="dd">' + d.getDate() + '</span><span class="ev">' + (cnt ? cnt + ' ev' : '—') + '</span></button>';
    }
    return out;
  }
  function openSearch(step) {
    S.step = step || 1; S.pending = { where: S.where, when: S.when, what: S.what, free: S.free, q: S.q, date: S.date };
    renderStep(); $('#scrim').classList.add('on'); $('#searchSheet').classList.add('on');
  }
  function closeSearch() { $('#scrim').classList.remove('on'); $('#searchSheet').classList.remove('on'); }
  function applySearch() {
    S.where = S.pending.where; S.when = S.pending.when; S.what = S.pending.what; S.free = !!S.pending.free; S.q = S.pending.q || ''; S.date = S.pending.date || '';
    closeSearch(); route();
  }

  /* ---------------- 登录 ---------------- */
  var authMode = 'login';
  function openAuth() { $('#authSheet').classList.add('on'); $('#scrim').classList.add('on'); syncAuth(); }
  function closeAuth() { $('#authSheet').classList.remove('on'); $('#scrim').classList.remove('on'); }
  function syncAuth() {
    var login = authMode === 'login';
    $('#authTitle').textContent = login ? 'Log in' : 'Join UniLoop';
    $('#fName').style.display = login ? 'none' : '';
    $('#fUsername').style.display = login ? 'none' : '';
    $('#fCampus').style.display = login ? 'none' : '';
    $('#authSubmit').textContent = login ? 'Log in' : 'Create account';
    $$('#authSheet [data-auth]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.auth === authMode)); });
    if (!login && !$('#auCampus').options.length) $('#auCampus').innerHTML = S.campuses.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
  }
  async function submitAuth() {
    var err = $('#authErr'); err.classList.add('is-hidden');
    if (authMode === 'signup') {
      var uv = ($('#auUsername').value || '').trim();
      if (uv && S.unameOk === false) { err.textContent = 'Pick a different username.'; err.classList.remove('is-hidden'); return; }
    }
    try {
      var payload = authMode === 'login' ? { email: $('#auEmail').value.trim(), password: $('#auPass').value }
        : { name: $('#auName').value.trim(), username: ($('#auUsername').value || '').trim(), email: $('#auEmail').value.trim(), password: $('#auPass').value, campus_id: $('#auCampus').value };
      var r = await api('/api/auth/' + authMode, { method: 'POST', body: payload });
      closeAuth(); toast('Signed in as ' + r.user.name.split(' ')[0]);
      await loadMe(); await loadEvents(); await loadSocieties();
      var pending = S.pending; S.pending = null;
      if (pending && pending.type === 'save') {
        try { await api('/api/events/' + encodeURIComponent(pending.id) + '/save', { method: pending.on ? 'DELETE' : 'POST' }); setSavedLocal(pending.id, !pending.on); await loadMe(); toast(pending.on ? 'Removed from saved' : 'Saved'); } catch (e) { toast(e.message); }
      } else if (pending && pending.type === 'rsvp') {
        await rsvp(pending.id); return;
      }
      route();
    } catch (e) { err.textContent = e.message; err.classList.remove('is-hidden'); }
  }

  /* ---------------- 创建活动 ---------------- */
  function openCreate() {
    if (!S.me || S.me.role !== 'exec') { openAuth(); return; }
    var d = new Date(); d.setDate(d.getDate() + 7);
    $('#evDate').value = d.toISOString().slice(0, 10);
    $('#createErr').classList.add('is-hidden');
    $('#createSheet').classList.add('on'); $('#scrim').classList.add('on');
  }
  function closeCreate() { $('#createSheet').classList.remove('on'); $('#scrim').classList.remove('on'); }
  async function submitCreate() {
    var err = $('#createErr'); err.classList.add('is-hidden');
    try {
      await api('/api/exec/events', { method: 'POST', body: {
        title: $('#evTitle').value.trim(), description: $('#evDesc').value.trim(), category: $('#evCat').value,
        audience_scope: $('#evScope').value, venue: $('#evPlace').value.trim(),
        starts_at: new Date($('#evDate').value + 'T' + ($('#evTime').value || '17:00') + ':00').toISOString(),
        capacity: Number($('#evCap').value) || null, price_member: Number($('#evPM').value) || 0, price_public: Number($('#evPP').value) || 0
      } });
      closeCreate(); toast('Published'); await loadEvents(); await loadOrg(); route();
    } catch (e) { err.textContent = e.message; err.classList.remove('is-hidden'); }
  }

  async function loadOrg() {
    try { S.org = await api('/api/exec/hub'); S.orgDash = await api('/api/exec/dashboard'); } catch (e) { S.org = null; S.orgDash = null; }
  }
  function stopOrgPolling() { if (S.orgTimer) { clearInterval(S.orgTimer); S.orgTimer = null; } }
  function startOrgPolling() {
    stopOrgPolling();
    S.orgTimer = setInterval(async function () {
      if (S.route.name !== 'organiser') return stopOrgPolling();
      try {
        var hub = await api('/api/exec/hub'), dash = await api('/api/exec/dashboard');
        var prev = ((S.orgDash && S.orgDash.attendees) || []).map(function (a) { return a.id; });
        var fresh = (dash.attendees || []).filter(function (a) { return prev.indexOf(a.id) === -1; }).map(function (a) { return a.id; });
        var changed = fresh.length || (hub.stats.rsvps_upcoming !== (S.org ? S.org.stats.rsvps_upcoming : -1));
        S.org = hub; S.orgDash = dash;
        if (changed) {
          S.flashIds = fresh;
          if (fresh.length) toast(fresh.length + ' new RSVP' + (fresh.length > 1 ? 's' : '') + ' just now');
          var main = document.getElementById('main'); var y = main ? main.scrollTop : 0;
          if (S.route.name === 'organiser') {
            $('#view').innerHTML = viewOrganiser(); bind();
            if (main) main.scrollTop = y;
          }
          setTimeout(function () { S.flashIds = []; }, 3000);
        }
      } catch (e) { /* 静默失败，下次再试 */ }
    }, 3000);
  }

  /* ---------------- 路由 ---------------- */
  async function route() {
    var h = location.hash.replace(/^#\/?/, ''); var p = h.split('/');
    if (p[0] === 'society' && p[1]) {
      S.route = { name: 'society' };
      $('#view').innerHTML = '<div class="empty">Loading…</div>';
      try { var d = await api('/api/societies/' + encodeURIComponent(p[1])); S.socData = d; $('#view').innerHTML = viewSociety(d); }
      catch (e) { $('#view').innerHTML = '<div class="empty"><b>' + esc(e.message) + '</b></div>'; }
    } else if (p[0] === 'societies') {
      S.route = { name: 'societies' }; if (!S.societies.length) await loadSocieties(); $('#view').innerHTML = viewSocieties();
    } else if (p[0] === 'saved') {
      S.route = { name: 'saved' }; await loadMe(); $('#view').innerHTML = viewSaved();
    } else if (p[0] === 'my') {
      S.route = { name: 'my' }; await loadMe(); if (!S.societies.length) await loadSocieties(); $('#view').innerHTML = viewMy();
    } else if (p[0] === 'scan') {
      S.route = { name: 'scan' }; await loadMe(); $('#view').innerHTML = viewScan();
    } else if (p[0] === 'members') {
      S.route = { name: 'members' }; await loadMe();
      try { S.members = await api('/api/exec/members'); } catch (e) { S.members = null; }
      $('#view').innerHTML = viewMembers();
    } else if (p[0] === 'checkin') {
      S.route = { name: 'scan' }; $('#view').innerHTML = viewScan();
    } else if (p[0] === 'organiser') {
      S.route = { name: 'organiser' }; await loadMe(); if (S.me && S.me.role === 'exec') await loadOrg(); $('#view').innerHTML = viewOrganiser(); startOrgPolling();
    } else if (p[0] === 'event' && p[1]) {
      S.route = { name: 'event', id: p[1] };
      var ev = S.events.filter(function (x) { return x.id === p[1]; })[0];
      if (!ev) { try { var rr = await api('/api/events/' + encodeURIComponent(p[1])); ev = rr.event; } catch (e) { ev = null; } }
      $('#view').innerHTML = viewEventPage(ev);
      S.openEventId = ev ? ev.id : null;
    } else if (p[0] === 'search') {
      S.route = { name: 'home' }; S.q = S.q || ''; $('#view').innerHTML = viewHome();
    } else {
      S.route = { name: 'home' }; $('#view').innerHTML = viewHome();
    }
    if (S.route.name !== 'organiser') stopOrgPolling();
    $('#sidebar').innerHTML = sidebar();
    $('#tabs').innerHTML = tabs();
    bind();
    observeReveals();
  }

  /* ---------------- 绑定 ---------------- */
  function bind() {
    $$('[data-open]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-save],[data-ext]')) return;
        location.hash = '#/event/' + el.dataset.open;
      });
    });
    $$('[data-save]').forEach(function (b) {
      b.addEventListener('click', async function (ev) {
        ev.stopPropagation();
        var id = b.dataset.save, on = b.getAttribute('aria-pressed') === 'true';
        if (!S.me) { S.pending = { type: 'save', id: id, on: on }; openAuth(); return; }
        try {
          await api('/api/events/' + encodeURIComponent(id) + '/save', { method: on ? 'DELETE' : 'POST' });
          b.setAttribute('aria-pressed', String(!on)); setSavedLocal(id, !on);
          toast(on ? 'Removed from saved' : 'Saved'); await loadMe(); route();
        } catch (e) { toast(e.message); }
      });
    });
    $$('[data-soc]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-price]')) return;
        location.hash = '#/society/' + el.dataset.soc;
      });
    });
    var j = $('#joinSoc');
    if (j) j.addEventListener('click', async function () {
      if (!S.me) return openAuth();
      try { await api('/api/societies/' + encodeURIComponent(j.dataset.soc) + '/join', { method: 'POST', body: { card: '4242424242424242' } }); toast('Joined'); await loadMe(); await loadSocieties(); route(); }
      catch (e) { toast(e.message); }
    });
    $$('[data-pill]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.pill;
        if (p === 'free') { S.free = !S.free; route(); }
        else if (p === 'when') openSearch(2);
        else if (p === 'what') openSearch(3);
        else if (p === 'radius') { S.radius = S.radius === 0 ? 3 : (S.radius === 3 ? 5 : 0); if (S.radius && S.where === 'any') S.where = (S.campuses[0] || {}).id || 'any'; route(); }
      });
    });
    var sw = $('#segWhere'), sn = $('#segWhen'), sa = $('#segWhat'), sg = $('#searchGo');
    if (sw) sw.onclick = function () { openSearch(1); };
    if (sn) sn.onclick = function () { openSearch(2); };
    if (sa) sa.onclick = function () { openSearch(3); };
    if (sg) sg.onclick = function () { openSearch(1); };
    $$('[data-campus]').forEach(function (b) { b.onclick = function () { S.where = b.dataset.campus; S.when = 'any'; S.date = ''; S.what = 'all'; S.free = false; S.radius = 0; route(); }; });
    var ca = $('#clearAll'); if (ca) ca.onclick = function () { S.q = ''; S.where = 'any'; S.when = 'any'; S.date = ''; S.what = 'all'; S.free = false; S.radius = 0; route(); };
    $$('[data-theme-set]').forEach(function (b) {
      b.onclick = function () { applyTheme(b.dataset.themeSet); route(); };
    });
    var tb2 = $('#themeBtn2'); if (tb2) tb2.onclick = toggleTheme;
    var lb = $('#loginBtn'); if (lb) lb.onclick = openAuth;
    var av = $('#avatarBtn'); if (av) av.onclick = function () { if (S.me) location.hash = '#/my'; else openAuth(); };
    $$('#sidebar [data-side]').forEach(function (b) {
      b.onclick = function () { if (b.dataset.side === 'when') { S.when = b.dataset.k; S.date = ''; } else S.what = b.dataset.k; route(); };
    });
    $$('#sidebar [data-soc-link]').forEach(function (b) { b.onclick = function () { location.hash = '#/society/' + b.dataset.socLink; }; });
    $$('[data-soctab]').forEach(function (b) { b.onclick = function () { S.socTab = b.dataset.soctab; $('#view').innerHTML = viewSociety(S.socData); bind(); }; });
    var pgBack = $('#pgBack'); if (pgBack) pgBack.onclick = closeEvent;
    var pgSave = $('#pgSave'); if (pgSave) pgSave.onclick = async function () {
      if (!S.me) return openAuth();
      var id = S.openEventId, on = this.getAttribute('aria-pressed') === 'true';
      await api('/api/events/' + encodeURIComponent(id) + '/save', { method: on ? 'DELETE' : 'POST' });
      this.setAttribute('aria-pressed', String(!on)); this.querySelector('svg').setAttribute('fill', !on ? 'currentColor' : 'none');
      setSavedLocal(id, !on); await loadMe(); toast(on ? 'Removed from saved' : 'Saved');
    };
    var tt = $('#toggleTickets'); if (tt) tt.onclick = function () { S.showAllTickets = !S.showAllTickets; route(); };
    var tp = $('#togglePast'); if (tp) tp.onclick = function () { S.showPastTickets = !S.showPastTickets; route(); };
    $$('[data-ticket]').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); showTicket(b.dataset.ticket); }; });
    var sb = $('#scanBtn'); if (sb) sb.onclick = function () { var v = ($('#scanInput').value || '').trim(); if (!v) return toast('Paste a code first'); doScan(v); };
    var sc = $('#scanCam'); if (sc) sc.onclick = async function () {
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        var video = $('#scanVideo'); video.style.display = 'block'; video.srcObject = stream; await video.play();
        if (!window.jsQR) { await new Promise(function (res, rej) { var s = document.createElement('script'); s.src = '/v3/vendor/jsqr.js'; s.onload = res; s.onerror = rej; document.body.appendChild(s); }); }
        var cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
        var timer = setInterval(function () {
          if (!video.videoWidth) return;
          var w = 480, h = Math.round(480 * video.videoHeight / video.videoWidth) || 360;
          cv.width = w; cv.height = h; cx.drawImage(video, 0, 0, w, h);
          var r = window.jsQR(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (r && r.data) { clearInterval(timer); stream.getTracks().forEach(function (t) { t.stop(); }); video.style.display = 'none'; $('#scanInput').value = r.data; doScan(r.data); }
        }, 400);
      } catch (e) { toast('Camera unavailable: ' + e.message); }
    };
    var evR = $('#evRsvp'); if (evR) evR.onclick = function () { if (S.openEventId) rsvp(S.openEventId); };
    var evS = $('#evSave'); if (evS) evS.onclick = async function () {
      if (!S.me) { S.pending = { type: 'save' }; openAuth(); return; }
      var id = S.openEventId; var on = this.textContent.indexOf('★') === 0;
      await api('/api/events/' + encodeURIComponent(id) + '/save', { method: on ? 'DELETE' : 'POST' });
      setSavedLocal(id, !on); await loadMe(); toast(on ? 'Removed from saved' : 'Saved'); route();
    };
    var oc = $('#openCreate'); if (oc) oc.onclick = openCreate;
    var sc = $('#searchClose'); if (sc) sc.onclick = closeSearch;
    var ss = $('#searchShow'); if (ss) ss.onclick = function () { if (S.step < 3) { S.step++; renderStep(); } else applySearch(); };
    $$('#searchOpts [data-opt]').forEach(function (b) {
      b.onclick = function () {
        var kind = b.dataset.opt, k = b.dataset.k;
        if (kind === 'free') S.pending.free = !S.pending.free;
        else if (kind === 'when') { S.pending.when = k; S.pending.date = ''; }
        else S.pending[kind] = k;
        renderStep();
      };
    });
    $$('[data-date]').forEach(function (b) {
      b.onclick = function () { S.pending.date = S.pending.date === b.dataset.date ? '' : b.dataset.date; if (S.pending.date) S.pending.when = 'any'; renderStep(); };
    });
    $$('[data-pop]').forEach(function (b) { b.onclick = function () { S.pending.q = b.dataset.pop; renderStep(); }; });
    var qi = $('#qInput'); if (qi) qi.oninput = function () { S.pending.q = qi.value; var n = previewCount(); $('#searchCount').textContent = n + (n === 1 ? ' event matches' : ' events match'); };
    var ac = $('#authClose'); if (ac) ac.onclick = closeAuth;
    $$('#authSheet [data-auth]').forEach(function (b) { b.onclick = function () { authMode = b.dataset.auth; syncAuth(); }; });
    $$('#authSheet [data-demo]').forEach(function (b) { b.onclick = function () { $('#auEmail').value = b.dataset.demo; $('#auPass').value = 'demo1234'; authMode = 'login'; syncAuth(); submitAuth(); }; });
    var un = $('#auUsername');
    if (un) {
      var unTimer = null;
      un.oninput = function () {
        var v = un.value.trim().toLowerCase().replace(/^@/, '');
        var msg = $('#unameMsg');
        S.unameOk = null;
        if (!v) { msg.textContent = ''; msg.style.color = 'var(--muted)'; return; }
        if (!/^[a-z0-9._]{3,20}$/.test(v)) { msg.textContent = '3–20 characters: letters, numbers, dots, underscores'; msg.style.color = 'var(--coral)'; return; }
        msg.textContent = 'Checking…'; msg.style.color = 'var(--muted)';
        clearTimeout(unTimer);
        unTimer = setTimeout(async function () {
          try {
            var r = await api('/api/username-available?u=' + encodeURIComponent(v));
            S.unameOk = !!r.available;
            msg.textContent = (r.available ? '✓ @' + v + ' is available' : '✗ ' + r.reason);
            msg.style.color = r.available ? 'var(--forest)' : 'var(--coral)';
          } catch (e) { msg.textContent = ''; }
        }, 350);
      };
    }
    var as = $('#authSubmit'); if (as) as.onclick = submitAuth;
    var cc = $('#createClose'); if (cc) cc.onclick = closeCreate;
    var cs = $('#createSubmit'); if (cs) cs.onclick = submitCreate;
  }
  document.addEventListener('click', function (ev) {
    var ext = ev.target.closest('[data-ext]');
    if (ext) { ev.stopPropagation(); ev.preventDefault(); window.open(ext.dataset.ext, '_blank', 'noopener'); return; }
    if (ev.target.id === 'scrim') { closeSearch(); closeAuth(); closeCreate(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSearch(); closeAuth(); closeCreate(); closeEvent(); } });
  function observeReveals() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .1 });
    $$('.reveal').forEach(function (e) { io.observe(e); });
  }

  /* ---------------- 启动 ---------------- */
  (async function boot() {
    var savedTheme = 'light';
    try { savedTheme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { }
    applyTheme(savedTheme);
    await Promise.all([loadCampuses(), loadMe()]);
    await loadEvents();
    await loadSocieties();
    window.addEventListener('hashchange', route);
    await route();
    setInterval(function () {
      var soon = S.events.slice().sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); }).slice(0, 4);
      if (!soon.length) return;
      S.heroIdx = (S.heroIdx + 1) % soon.length;
      if (S.route.name === 'home' && !isFiltering()) {
        var dots = $$('.hero-dots i'); dots.forEach(function (d, i) { d.classList.toggle('on', i === S.heroIdx); });
        var e = soon[S.heroIdx];
        var meta = $('.hero-meta'); if (meta && e) meta.innerHTML = '<b>' + esc(e.society_name) + '</b><span class="dot"></span><span>' + fmtDay(e.starts_at) + ' · ' + fmtTime(e.starts_at) + '</span><span class="dot"></span><span>' + esc(String(e.venue).split(',')[0]) + '</span>';
        var heroEl = document.querySelector('.hero');
        if (heroEl) {
          heroEl.classList.add('swap');
          setTimeout(function () {
            var line = HERO_LINES[S.heroIdx % HERO_LINES.length];
            var k = document.querySelector('.hero .kicker'), h1 = document.querySelector('.hero h1');
            if (k) k.textContent = line.k;
            if (h1) h1.innerHTML = line.a + '<br>' + line.b;
            heroEl.classList.remove('swap');
          }, 260);
        }
      }
    }, 8000);
  })();
})();
