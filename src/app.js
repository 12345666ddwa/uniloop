/* app.js v2 — UniLoop：学生端/社团主页/主办方 Hub/地图/收藏/评价/竖版预览 */
(function () {
  'use strict';
  var S = {
    me: null, campuses: [], events: [], societies: [], saved: [], myRsvps: [], myMemberships: [], savedMoney: 0,
    filter: { campus: '', when: 'week', category: 'all', free: false, q: '' },
    route: { name: 'discover' }, org: null, orgEventId: null, poll: null, loading: true, ai: { busy: false, results: null, text: '' }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { n = Number(n) || 0; return n === 0 ? 'Free' : '$' + (n % 1 ? n.toFixed(2) : n); };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function d(iso) { return new Date(iso); }
  function fmtDay(iso) { var x = d(iso); return DAYS[x.getDay()] + ' ' + x.getDate() + ' ' + x.toLocaleString('en-AU', { month: 'short' }); }
  function fmtTime(iso) { return d(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  function fmtRange(a, b) { return fmtDay(a) + ' · ' + fmtTime(a) + (b ? '–' + fmtTime(b) : ''); }
  function initials(n) { return String(n || '?').split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase(); }
  function rel(iso) { var days = Math.round((d(iso) - Date.now()) / 86400000); return days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + ' days'; }

  var toastEl = $('#toast'), toastT;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600); }

  async function api(path, opts) {
    opts = opts || {};
    var res = await fetch(path, { method: opts.method || 'GET', credentials: 'include', headers: opts.body ? { 'content-type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined });
    var data = {}; try { data = await res.json(); } catch (e) { }
    if (!res.ok) { var err = new Error(data.error || ('HTTP ' + res.status)); err.status = res.status; err.data = data; throw err; }
    return data;
  }

  /* ============ 认证 ============ */
  var authMode = 'login';
  function openAuth(mode) { authMode = mode || 'login'; $('#authScrim').classList.add('open'); syncAuth(); setTimeout(function () { $('#auEmail').focus(); }, 80); }
  function closeAuth() { $('#authScrim').classList.remove('open'); $('#authErr').classList.add('is-hidden'); }
  function syncAuth() {
    var isLogin = authMode === 'login';
    $('#authTitle').textContent = isLogin ? 'Welcome back' : 'Join UniLoop';
    $('#nameField').style.display = isLogin ? 'none' : '';
    $('#campusField').style.display = isLogin ? 'none' : '';
    $('#authSubmit').textContent = isLogin ? 'Log in' : 'Create account';
    $$('[data-auth]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.auth === authMode)); });
    if (!isLogin && !$('#auCampus').options.length) $('#auCampus').innerHTML = S.campuses.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
  }
  $$('[data-auth]').forEach(function (b) { b.addEventListener('click', function () { authMode = b.dataset.auth; syncAuth(); }); });
  $('#authClose').addEventListener('click', closeAuth);
  $('#authCancel').addEventListener('click', closeAuth);
  $('#authScrim').addEventListener('click', function (e) { if (e.target === $('#authScrim')) closeAuth(); });
  $$('#authScrim [data-demo]').forEach(function (b) {
    b.addEventListener('click', function () { $('#auEmail').value = b.dataset.demo; $('#auPass').value = 'demo1234'; authMode = 'login'; syncAuth(); $('#authForm').requestSubmit(); });
  });
  $('#authForm').addEventListener('submit', async function (e) {
    e.preventDefault(); var errEl = $('#authErr'); errEl.classList.add('is-hidden');
    try {
      var payload = authMode === 'login'
        ? { email: $('#auEmail').value.trim(), password: $('#auPass').value }
        : { name: $('#auName').value.trim(), email: $('#auEmail').value.trim(), password: $('#auPass').value, campus_id: $('#auCampus').value || 'mq_sydney' };
      var r = await api('/api/auth/' + authMode, { method: 'POST', body: payload });
      S.me = r.user; closeAuth(); toast('Signed in as ' + r.user.name.split(' ')[0]);
      await loadMe(); await loadEvents(); render();
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove('is-hidden'); }
  });

  /* ============ 支付 ============ */
  var payResolve = null;
  function openPay(title, sub, lines) {
    $('#payTitle').textContent = title; $('#paySub').textContent = sub || 'Test mode — no real charge.';
    $('#payLines').innerHTML = lines.map(function (l) { return '<div class="kv' + (l.hl ? ' hl' : '') + '"><span>' + esc(l.k) + '</span><b>' + esc(l.v) + '</b></div>'; }).join('');
    $('#payErr').classList.add('is-hidden'); $('#payScrim').classList.add('open');
    return new Promise(function (res) { payResolve = res; });
  }
  function closePay(v) { $('#payScrim').classList.remove('open'); if (payResolve) { var r = payResolve; payResolve = null; r(v); } }
  $('#payClose').addEventListener('click', function () { closePay(null); });
  $('#payCancel').addEventListener('click', function () { closePay(null); });
  $('#payScrim').addEventListener('click', function (e) { if (e.target === $('#payScrim')) closePay(null); });
  $('#payForm').addEventListener('submit', function (e) {
    e.preventDefault(); var c = $('#payCard').value;
    if (String(c).replace(/\D/g, '').length < 12) { $('#payErr').textContent = 'Use 4242 4242 4242 4242.'; $('#payErr').classList.remove('is-hidden'); return; }
    closePay(c);
  });

  /* ============ 发布活动 ============ */
  function openCreate() {
    if (!S.me) return openAuth('login');
    if (S.me.role !== 'exec') { toast('Organiser demo account only'); return openAuth('login'); }
    var x = new Date(); x.setDate(x.getDate() + 7);
    $('#evDate').value = x.toISOString().slice(0, 10);
    $('#createErr').classList.add('is-hidden'); $('#createScrim').classList.add('open');
    setTimeout(function () { $('#evTitle').focus(); }, 80);
  }
  function closeCreate() { $('#createScrim').classList.remove('open'); }
  $('#createClose').addEventListener('click', closeCreate);
  $('#createCancel').addEventListener('click', closeCreate);
  $('#createScrim').addEventListener('click', function (e) { if (e.target === $('#createScrim')) closeCreate(); });
  $('#createForm').addEventListener('submit', async function (e) {
    e.preventDefault(); var errEl = $('#createErr'); errEl.classList.add('is-hidden');
    try {
      var r = await api('/api/exec/events', { method: 'POST', body: {
        title: $('#evTitle').value.trim(), description: $('#evDesc').value.trim(), category: $('#evCat').value,
        audience_scope: $('#evScope').value, venue: $('#evPlace').value.trim(),
        starts_at: new Date($('#evDate').value + 'T' + ($('#evTime').value || '17:00') + ':00').toISOString(),
        capacity: Number($('#evCap').value) || null,
        price_member: Number($('#evPM').value) || 0, price_public: Number($('#evPP').value) || 0
      } });
      closeCreate(); $('#createForm').reset(); toast('Published. It is in Discover now.');
      await loadEvents(); if (S.route.name === 'organiser') await loadOrg(); render();
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove('is-hidden'); }
  });

  /* ============ 数据 ============ */
  async function loadMe() {
    try { var r = await api('/api/me'); S.me = r.user; S.myRsvps = r.rsvps || []; S.myMemberships = r.memberships || []; S.savedMoney = r.saved || 0; S.savedEventsData = r.saved_events || []; S.saved = S.savedEventsData.map(function (e) { return e.id; }); }
    catch (e) { S.me = null; S.myRsvps = []; S.myMemberships = []; S.saved = []; }
  }
  function eventQuery() {
    var q = new URLSearchParams();
    if (S.filter.campus) q.set('campus_id', S.filter.campus);
    if (S.filter.when) q.set('when', S.filter.when);
    if (S.filter.category && S.filter.category !== 'all') q.set('category', S.filter.category);
    if (S.filter.free) q.set('free', '1');
    if (S.filter.q) q.set('q', S.filter.q);
    return q.toString();
  }
  async function loadEvents() {
    try { var r = await api('/api/events?' + eventQuery()); S.events = r.events || []; } catch (e) { S.events = []; }
  }
  async function loadSocieties() {
    if (S.societies.length) return;
    try { S.societies = (await api('/api/societies')).societies || []; } catch (e) { S.societies = []; }
  }
  async function loadOrg(eventId) {
    try { S.org = await api('/api/exec/hub'); if (eventId) S.orgDash = await api('/api/exec/dashboard?event_id=' + encodeURIComponent(eventId)); else S.orgDash = await api('/api/exec/dashboard'); S.orgEventId = (S.orgDash.event || {}).id; }
    catch (e) { S.org = { error: e.message, status: e.status }; S.orgDash = null; }
  }

  /* ============ 通用组件 ============ */
  function stars(rating) {
    if (rating == null) return '<span class="stars"><span class="s">☆☆☆☆☆</span> <span class="tiny muted">no reviews</span></span>';
    var full = Math.round(rating);
    return '<span class="stars"><span class="s">' + '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full) + '</span> ' + rating.toFixed(1) + '</span>';
  }
  function saveBtn(e) {
    return '<button class="icon-save" data-save="' + esc(e.id) + '" aria-pressed="' + (e.is_saved ? 'true' : 'false') + '" aria-label="' + (e.is_saved ? 'Remove from saved' : 'Save event') + '" title="Save">' +
      '<svg viewBox="0 0 24 24" fill="' + (e.is_saved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 4.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V5.5a1 1 0 0 1 1-1Z"/></svg></button>';
  }
  function rsvpBtn(e, big) {
    var cls = 'btn ' + (big ? 'btn-primary' : 'btn-sm btn-primary');
    if (e.past) return '<span class="gone">Finished</span>';
    if (e.my_rsvp) return '<span class="badge-soft badge-member">You\'re in · ' + (e.my_rsvp.ticket_type === 'member' ? 'member' : 'general') + '</span>';
    if (e.capacity != null && e.seats_left === 0) return '<button class="btn btn-sm" disabled>Full</button>';
    if (e.audience_scope === 'CAMPUS_ONLY' && !e.can_rsvp && S.me && S.me.campus_id !== e.campus_id) return '<button class="btn btn-sm" disabled>Campus only</button>';
    var label = e.your_price > 0 ? 'RSVP · ' + money(e.your_price) : 'RSVP free';
    return '<button class="' + cls + '" data-rsvp="' + esc(e.id) + '">' + label + '</button>';
  }
  function evCard(e) {
    var campusNote = e.audience_scope === 'CAMPUS_ONLY' ? '<span class="scope-note">Own campus only</span>' : '';
    return '<article class="card ev2" data-open="' + esc(e.id) + '" tabindex="0" role="button" aria-label="Open ' + esc(e.title) + '">' +
      '<div class="ev2-media"><img src="' + esc(e.cover_image_url) + '" alt="' + esc(e.title) + '" loading="lazy"></div>' +
      '<div class="ev2-body">' +
      '<h3>' + esc(e.title) + '</h3>' +
      '<p class="ev2-desc">' + esc(e.description) + '</p>' +
      '<div class="ev2-meta"><span>' + esc(fmtRange(e.starts_at, e.ends_at)) + '</span><span>·</span><span>' + esc(String(e.venue).split(',')[0]) + '</span></div>' +
      '<div class="ev2-meta"><span>' + esc(e.society_name) + '</span>' + campusNote + '</div>' +
      '<div class="ev2-foot"><div class="ev2-price">' + money(e.your_price) + (e.price_member < e.price_public ? ' <small>member</small>' : '') + '</div>' +
      '<span class="small muted">' + (e.seats_left == null ? 'no cap' : e.seats_left + ' left') + '</span><span class="spacer"></span>' +
      saveBtn(e) + rsvpBtn(e) + '</div></div></article>';
  }
  function mapCard(e) {
    if (!e.map) return '';
    var m = e.map;
    return '<div class="mapcard">' +
      '<iframe title="Map of ' + esc(e.venue) + '" loading="lazy" referrerpolicy="no-referrer" src="' + esc(m.osm_embed) + '"></iframe>' +
      '<div class="map-foot"><span class="map-addr">' + esc(e.venue) + '<br><span class="tiny">' + m.lat.toFixed(4) + ', ' + m.lng.toFixed(4) + '</span></span>' +
      '<a class="btn-mini primary" target="_blank" rel="noopener" href="' + esc(m.google_directions) + '">Google 导航 ↗</a>' +
      '<a class="btn-mini" target="_blank" rel="noopener" href="' + esc(m.apple_maps) + '">Apple Maps</a>' +
      '<a class="btn-mini" target="_blank" rel="noopener" href="' + esc(m.osm_page) + '">大地图</a></div></div>';
  }
  function topbar(active) {
    var nav = [['discover', '#/', 'Discover'], ['societies', '#/societies', 'Societies'], ['saved', '#/saved', 'Saved'], ['my', '#/my', 'My stuff']];
    var isOrg = S.route.name.indexOf('organiser') === 0;
    return '<header class="topbar"><div class="topbar-in">' +
      '<a class="brand" href="#/"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.2c3 2.4 4.6 5.6 4.6 8.8S15 18.4 12 20.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.2 9.2h15.6M4.2 14.8h15.6" stroke="currentColor" stroke-width="1.4" opacity=".55"/></svg>UniLoop</a>' +
      '<nav class="mainnav">' + nav.map(function (n) { return '<a href="' + n[1] + '"' + (active === n[0] ? ' aria-current="page"' : '') + '>' + n[2] + '</a>'; }).join('') + '</nav>' +
      '<div class="topright"><div class="seg" role="group" aria-label="Switch role"><button data-role="student" aria-pressed="' + (!isOrg) + '">Student</button><button data-role="organiser" aria-pressed="' + isOrg + '">Organiser</button></div>' +
      (S.me ? '<span class="avatar" title="' + esc(S.me.name) + '">' + esc(initials(S.me.name)) + '</span><button class="iconbtn" id="logoutBtn" aria-label="Sign out" title="Sign out">⏏</button>'
        : '<button class="btn btn-sm btn-primary" id="loginBtn">Log in</button>') + '</div></div></header>';
  }
  function tabbar(active) {
    return '<nav class="tabbar"><a href="#/"' + (active === 'discover' ? ' aria-current="page"' : '') + '>Discover</a>' +
      '<a href="#/societies"' + (active === 'societies' ? ' aria-current="page"' : '') + '>Societies</a>' +
      '<a href="#/saved"' + (active === 'saved' ? ' aria-current="page"' : '') + '>Saved</a>' +
      '<a href="#/my"' + (active === 'my' ? ' aria-current="page"' : '') + '>My stuff</a></nav>';
  }

  /* ============ 学生端：Discover ============ */
  function filterBar() {
    var campuses = [{ id: '', name: 'All campuses' }].concat(S.campuses);
    return '<div class="filterbar">' +
      '<label>Campus<select id="fCampus">' + campuses.map(function (c) { return '<option value="' + esc(c.id) + '"' + (S.filter.campus === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label>When<select id="fWhen">' +
        [['week', 'This week'], ['7d', 'Next 7 days'], ['month', 'This month'], ['all', 'Any time']].map(function (o) { return '<option value="' + o[0] + '"' + (S.filter.when === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="grow">Search<input id="fQ" type="search" placeholder="Search events, societies, venues" value="' + esc(S.filter.q) + '"></label>' +
      '<label class="toggle"><input type="checkbox" id="fFree"' + (S.filter.free ? ' checked' : '') + '> Free only</label>' +
      '</div>' +
      '<div class="chipset" style="margin:-8px 0 18px">' +
      [['all', 'Everything'], ['outdoors', 'Outdoors'], ['social', 'Social'], ['creative', 'Creative'], ['sport', 'Sport'], ['careers', 'Careers'], ['other', 'Other']].map(function (c) {
        return '<button class="chip" data-cat="' + c[0] + '" aria-pressed="' + (S.filter.category === c[0]) + '">' + c[1] + '</button>';
      }).join('') + '</div>';
  }
  function aiPanel() {
    var chips = ['Free Saturday morning', 'Something creative this week', 'Cheap food nearby', 'Outdoors, under $15'];
    var r = S.ai.results;
    return '<section class="ai"><p class="ai-label"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.1 6.3L20.5 10l-6.4 1.7L12 18l-2.1-6.3L3.5 10l6.4-1.7L12 2z"/></svg>Loop AI</p>' +
      '<h3>Tell us your gap.<br>We check the fit.</h3>' +
      '<p class="ai-sub">Time window, campus access and travel time are checked by rules — no guessing.</p>' +
      '<div class="chipset" style="margin:0 0 10px">' + chips.map(function (c) { return '<button class="chip" data-ai-chip="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<form class="ai-form" id="aiForm"><label class="sr" for="aiInput">Describe your free time</label>' +
      '<input class="ai-input" id="aiInput" placeholder="free Saturday morning…" value="' + esc(S.ai.text) + '">' +
      '<select id="aiWhen" class="ai-select" aria-label="Time window"><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select>' +
      '<button class="btn btn-primary" type="submit"' + (S.ai.busy ? ' disabled' : '') + '>' + (S.ai.busy ? 'Checking…' : 'Find my plans') + '</button></form>' +
      (r ? aiResults(r) : '') +
      '<p class="ai-note">Rules pick the events. The model only explains why.</p></section>';
  }
  function aiResults(r) {
    if (!r.results.length) {
      return '<div class="ai-result"><p class="ar-title">Nothing fits that window</p><ul><li><span>Try another day part, or a wider campus filter.</span></li></ul>' +
        '<p class="tiny muted">Checked ' + r.considered + ' events · ' + r.excluded.length + ' excluded by rules.</p></div>';
    }
    return '<div class="ai-result"><p class="ar-title">' + r.results.length + ' thing' + (r.results.length === 1 ? '' : 's') + ' fit</p><ul>' +
      r.results.slice(0, 3).map(function (x) {
        return '<li><span><a href="#/event/' + esc(x.event_id) + '" style="font-weight:650">' + esc(x.event.title) + '</a><br><span class="tiny muted">' + esc(x.match_reason) + ' · travel ' + x.travel_minutes + ' min</span></span></li>';
      }).join('') + '</ul><p class="tiny muted">Checked ' + r.considered + ' · excluded ' + r.excluded.length + ' (time window / campus / interests)</p></div>';
  }
  function viewDiscover() {
    var list = S.events, lead = list[0], rest = list.slice(1);
    return topbar('discover') + '<div class="wrap">' +
      '<div class="pagehead"><div><p class="eyebrow">' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · Sydney</p>' +
      '<h1 class="h1">Find your kind of day.</h1>' +
      '<p class="lede">' + (S.me ? 'Good morning, ' + esc(S.me.name.split(' ')[0]) + '. ' : '') + (list.length ? list.length + ' events match your filters.' : 'Nothing matches yet — loosen the filters.') + '</p></div></div>' +
      filterBar() +
      '<div class="cols"><div class="col-main">' +
      (S.loading ? '<div class="skel skel-card" style="margin-bottom:20px"></div>' + '<div class="grid">' + Array.from({ length: 4 }).map(function () { return '<div class="skel skel-card"></div>'; }).join('') + '</div>'
        : (lead ? '<article class="card ev2" data-open="' + esc(lead.id) + '" style="margin-bottom:22px">' +
          '<div class="ev2-media"><img src="' + esc(lead.cover_image_url) + '" alt="' + esc(lead.title) + '"></div>' +
          '<div class="ev2-body"><h3 style="font-size:22px">' + esc(lead.title) + '</h3><p class="ev2-desc" style="font-size:14px;-webkit-line-clamp:3">' + esc(lead.description) + '</p>' +
          '<div class="ev2-meta"><span>' + esc(fmtRange(lead.starts_at, lead.ends_at)) + '</span><span>·</span><span>' + esc(lead.venue) + '</span><span>·</span><span>' + esc(lead.society_name) + '</span></div>' +
          '<div class="ev2-foot"><div class="ev2-price">' + money(lead.your_price) + '</div><span class="small muted">' + (lead.seats_left == null ? '' : lead.seats_left + ' spots left') + '</span><span class="spacer"></span>' + saveBtn(lead) + rsvpBtn(lead) + '</div></div></article>'
          : '<div class="empty2"><b>No events match these filters.</b><button class="btn-quiet" id="clearFilters">Clear filters</button></div>') +
        '<div class="sectionhead"><h2>Also this week</h2><span class="count">' + rest.length + ' more</span></div>' +
        (rest.length ? '<div class="grid">' + rest.map(evCard).join('') + '</div>' : '')) +
      '</div><aside class="rail-stack">' + aiPanel() + '</aside></div>' +
      '<footer class="foot"><span>Sample campus events · photos are placeholders · all times AEST</span><a href="#/preview" style="color:var(--forest);font-weight:650">竖版预览 ↗</a></footer>' +
      '</div>' + tabbar('discover');
  }

  /* ============ 事件详情 ============ */
  function viewEvent(data) {
    if (!data) return topbar('discover') + '<div class="wrap"><div class="empty2"><b>Event not found</b><a class="btn-quiet" href="#/">Back to Discover</a></div></div>';
    var e = data.event, soc = data.society;
    var memberLine = e.price_member < e.price_public ? '<div class="kv"><span>Member price</span><b>' + money(e.price_member) + '</b></div>' : '';
    return topbar('discover') + '<div class="wrap"><p style="margin:20px 0 0"><a class="btn-quiet" href="#/">← Back to Discover</a></p>' +
      '<div class="detail2" style="margin-top:12px"><div>' +
      '<img class="hero-img" src="' + esc(e.cover_image_url) + '" alt="' + esc(e.title) + '">' +
      '<h1 class="h1">' + esc(e.title) + '</h1>' +
      '<p class="sub">' + esc(e.society_name) + ' · ' + esc(fmtRange(e.starts_at, e.ends_at)) + ' · ' + esc(e.venue) + '</p>' +
      (e.audience_scope === 'CAMPUS_ONLY' ? '<p class="scope-note" style="margin:-6px 0 12px">Only for ' + esc(e.campus_name) + ' students</p>' : '') +
      '<p class="desc">' + esc(e.description) + '</p>' +
      '<h2 style="font-size:17px;margin:22px 0 10px">Where</h2>' + mapCard(e) +
      '<h2 style="font-size:17px;margin:24px 0 10px">From ' + esc(e.society_name) + '</h2>' +
      '<a class="card soc3" href="#/society/' + esc(soc.id) + '" style="text-decoration:none">' +
      '<div class="top"><span class="mark"><img src="' + esc(soc.campus_logo) + '" alt=""></span><div><div class="nm">' + esc(soc.name) + '</div><div class="meta">' + esc(soc.campus_name) + ' · ' + soc.member_count + ' members</div></div>' +
      '<span class="spacer"></span>' + stars(soc.rating) + '</div>' +
      '<p class="blurb">' + esc(soc.blurb) + '</p><span class="btn-quiet">Open society page →</span></a>' +
      '</div><aside class="stack">' +
      '<div class="panel2"><h2>Get a spot</h2>' +
      '<div class="kv"><span>Price</span><b>' + money(e.your_price) + '</b></div>' + memberLine +
      '<div class="kv"><span>Going</span><b>' + e.rsvp_count + (e.capacity ? ' / ' + e.capacity : '') + '</b></div>' +
      (e.capacity ? '<div class="bar2"><span style="width:' + Math.min(100, Math.round(e.rsvp_count / e.capacity * 100)) + '%"></span></div><p class="tiny muted">' + Math.max(0, e.capacity - e.rsvp_count) + ' spots left</p>' : '') +
      '<div class="stack" style="margin-top:12px">' + rsvpBtn(e, true) +
      (S.me && !e.is_member && soc.membership_price >= 0 ? '<button class="btn btn-sm btn-ghost block" id="joinSociety" data-society="' + esc(soc.id) + '" data-price="' + soc.membership_price + '">Join ' + esc(soc.name) + ' · ' + money(soc.membership_price) + ' for member price</button>' : '') +
      '<button class="btn btn-sm btn-ghost block" data-save="' + esc(e.id) + '" aria-pressed="' + (e.is_saved ? 'true' : 'false') + '">' + (e.is_saved ? '★ Saved' : '☆ Save for later') + '</button>' +
      (e.my_rsvp ? '<button class="btn btn-sm btn-ghost block" id="cancelRsvp" data-id="' + esc(e.id) + '">Cancel my RSVP</button>' : '') +
      '</div><p class="tiny muted" style="margin-top:10px">Test payments only — no real charge.</p></div>' +
      '</aside></div></div>' + tabbar('discover');
  }

  /* ============ 社团目录 ============ */
  function viewSocieties() {
    var groups = {};
    S.societies.forEach(function (s) { (groups[s.campus_id] = groups[s.campus_id] || []).push(s); });
    return topbar('societies') + '<div class="wrap">' +
      '<div class="pagehead"><div><p class="eyebrow">Across Sydney</p><h1 class="h1">Societies.</h1><p class="lede">Join once — member prices all year. Rated by students.</p></div></div>' +
      S.campuses.filter(function (c) { return groups[c.id]; }).map(function (c) {
        return '<div class="campus-head"><img src="' + esc(c.logo) + '" alt="' + esc(c.name) + '"><div><div class="nm">' + esc(c.name) + '</div><div class="lbl">' + groups[c.id].length + ' societies</div></div></div>' +
          '<div class="soc-grid">' + groups[c.id].map(function (s) {
            return '<article class="card soc3" data-soc="' + esc(s.id) + '">' +
              '<div class="top"><span class="mark"><img src="' + esc(s.campus_logo) + '" alt=""></span><div><div class="nm">' + esc(s.name) + '</div><div class="meta">' + s.member_count + ' members · ' + s.followers + ' followers</div></div></div>' +
              '<p class="blurb">' + esc(s.blurb) + '</p>' +
              '<div class="row tight">' + stars(s.rating) + '<span class="tiny muted">(' + s.review_count + ')</span><span class="spacer"></span>' +
              (s.is_member ? '<span class="badge-soft badge-member">Member</span>' : '<span class="badge-soft">' + money(s.membership_price) + ' to join</span>') + '</div>' +
              '<div class="foot"><a class="btn-quiet" href="#/society/' + esc(s.id) + '">Open →</a><span class="spacer"></span><span class="tiny muted">' + s.upcoming_events + ' upcoming</span></div>' +
              '</article>';
          }).join('') + '</div>';
      }).join('') + '</div>' + tabbar('societies');
  }

  /* ============ 社团主页 ============ */
  function viewSociety(data) {
    if (!data) return topbar('societies') + '<div class="wrap"><div class="empty2"><b>Society not found</b></div></div>';
    var s = data.society, tab = S.socTab || 'upcoming';
    var cover = (data.upcoming[0] || data.past[0] || {}).cover_image_url || '/assets/events/ev1.jpg';
    function tabBody() {
      if (tab === 'upcoming') return data.upcoming.length ? '<div class="grid">' + data.upcoming.map(evCard).join('') + '</div>' : '<div class="empty2"><b>Nothing scheduled yet.</b></div>';
      if (tab === 'past') return data.gallery.length ? '<div class="gallery">' + data.gallery.map(function (g) { return '<a href="#/event/' + esc(g.id) + '"><figure><img src="' + esc(g.image) + '" alt="' + esc(g.title) + '"><figcaption>' + esc(g.title) + ' · ' + fmtDay(g.date) + '</figcaption></figure></a>'; }).join('') + '</div>' : '<div class="empty2"><b>No past events yet.</b></div>';
      return '<div class="reviews">' + (data.reviews.length ? data.reviews.map(function (r) {
        return '<div class="review"><div class="top"><span class="who">' + esc(r.display_name) + '</span><span class="stars"><span class="s">' + '★★★★★'.slice(0, r.rating) + '☆☆☆☆☆'.slice(0, 5 - r.rating) + '</span></span></div><div class="txt">' + esc(r.text) + '</div></div>';
      }).join('') : '<div class="empty2"><b>No reviews yet.</b>Be the first.</div>') +
        (S.me ? '<form class="review-form" id="reviewForm"><select id="rvRating"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select><input id="rvText" placeholder="How was it?"><button class="btn btn-sm btn-primary" type="submit">Post review</button></form>' : '') + '</div>';
    }
    return topbar('societies') + '<div class="wrap"><p style="margin:20px 0 0"><a class="btn-quiet" href="#/societies">← All societies</a></p>' +
      '<div class="hub-cover"><img src="' + esc(cover) + '" alt=""></div>' +
      '<div class="hub-head"><div class="hub-logo"><img src="' + esc(s.campus_logo) + '" alt="' + esc(s.campus_name) + '"></div>' +
      '<div class="hub-title"><h1>' + esc(s.name) + '</h1><p class="sub" style="margin:2px 0 0">' + esc(s.campus_name) + ' · ' + esc((s.tags || []).join(' · ')) + '</p></div>' +
      (s.is_member ? '<span class="badge-soft badge-member">Member</span>' : '<button class="btn btn-primary" id="joinSoc" data-society="' + esc(s.id) + '" data-price="' + s.membership_price + '">Join · ' + money(s.membership_price) + '</button>') + '</div>' +
      '<p class="desc" style="margin:14px 0 0">' + esc(s.blurb) + '</p>' +
      '<div class="hub-stats">' +
      '<div class="cell"><div class="n">' + (s.rating == null ? '—' : s.rating.toFixed(1)) + '</div><div class="l">Rating (' + s.review_count + ' reviews)</div></div>' +
      '<div class="cell"><div class="n">' + s.member_count + '</div><div class="l">Members</div></div>' +
      '<div class="cell"><div class="n">' + s.followers + '</div><div class="l">Followers</div></div>' +
      '<div class="cell"><div class="n">' + (data.upcoming.length + data.past.length) + '</div><div class="l">Events hosted</div></div></div>' +
      '<div class="tabs2" role="tablist">' +
      ['upcoming', 'past', 'reviews'].map(function (t) { return '<button role="tab" data-soctab="' + t + '" aria-selected="' + (tab === t) + '">' + (t === 'upcoming' ? 'Upcoming' : t === 'past' ? 'Past & photos' : 'Reviews') + '</button>'; }).join('') + '</div>' +
      tabBody() + '</div>' + tabbar('societies');
  }

  /* ============ 我的 / 收藏 ============ */
  function viewMy() {
    if (!S.me) return topbar('my') + '<div class="wrap"><div class="empty2"><b>Sign in to see your stuff</b><button class="btn btn-primary" id="myLogin">Log in</button></div></div>' + tabbar('my');
    return topbar('my') + '<div class="wrap"><div class="pagehead"><div><p class="eyebrow">' + esc(S.me.campus_name) + '</p><h1 class="h1">My stuff.</h1>' +
      '<p class="lede">' + S.myRsvps.length + ' tickets · ' + S.myMemberships.length + ' societies · saved ' + money(S.savedMoney) + ' with member prices.</p></div></div>' +
      '<div class="sectionhead"><h2>Tickets</h2><span class="count">' + S.myRsvps.length + '</span></div>' +
      (S.myRsvps.length ? '<div class="grid">' + S.myRsvps.map(function (r) { return evCard(r.event); }).join('') + '</div>' : '<div class="empty2"><b>No tickets yet</b><a class="btn-quiet" href="#/">Find something</a></div>') +
      '<div class="sectionhead" style="margin-top:30px"><h2>My societies</h2></div>' +
      (S.myMemberships.length ? '<div class="soc-grid">' + S.myMemberships.map(function (m) {
        return '<a class="card soc3" href="#/society/' + esc(m.society_id) + '"><div class="top"><span class="mark"><img src="' + esc((S.societies.filter(function (s) { return s.id === m.society_id; })[0] || {}).campus_logo || '/assets/schools/mq.png') + '" alt=""></span><div><div class="nm">' + esc(m.society_name) + '</div><div class="meta">Member · paid ' + money(m.price_paid) + '</div></div></div><span class="btn-quiet">Open →</span></a>';
      }).join('') + '</div>' : '<div class="empty2"><b>No memberships yet</b>Joining unlocks member prices.</div>') + '</div>' + tabbar('my');
  }
  function viewSaved() {
    var list = (S.savedEventsData && S.savedEventsData.length) ? S.savedEventsData : S.events.filter(function (e) { return S.saved.indexOf(e.id) > -1; });
    return topbar('saved') + '<div class="wrap"><div class="pagehead"><div><p class="eyebrow">Your shortlist</p><h1 class="h1">Saved.</h1><p class="lede">' + (S.me ? list.length + ' events saved for later.' : 'Log in to keep a shortlist.') + '</p></div></div>' +
      (list.length ? '<div class="grid">' + list.map(evCard).join('') + '</div>' : '<div class="empty2"><b>Nothing saved yet</b>Tap the bookmark on any event.<div style="margin-top:10px"><a class="btn btn-primary" href="#/">Browse events</a></div></div>') +
      '</div>' + tabbar('saved');
  }

  /* ============ 主办方 Hub ============ */
  function cumulativeChart(series, capacity) {
    var w = 620, h = 220, padL = 40, padR = 16, top = 18, bottom = 176;
    var max = Math.max(capacity || 0, series[series.length - 1].cumulative || 0, 5) * 1.1;
    var stepX = (w - padL - padR) / Math.max(1, series.length - 1);
    var pts = series.map(function (p, i) { return [Math.round(padL + i * stepX), Math.round(bottom - (p.cumulative / max) * (bottom - top))]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
    var area = line + ' L' + pts[pts.length - 1][0] + ' ' + bottom + ' L' + pts[0][0] + ' ' + bottom + ' Z';
    var capY = capacity ? Math.round(bottom - (capacity / max) * (bottom - top)) : null;
    var last = pts[pts.length - 1];
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Cumulative RSVPs vs capacity">' +
      '<defs><linearGradient id="gA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1F4A3B" stop-opacity=".18"/><stop offset="1" stop-color="#1F4A3B" stop-opacity="0"/></linearGradient></defs>' +
      [0, 1, 2, 3].map(function (i) { var y = top + i * ((bottom - top) / 3); return '<line class="gridline" x1="' + padL + '" y1="' + y + '" x2="' + (w - padR) + '" y2="' + y + '"/><text class="axislab" x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + Math.round(max - i * (max / 3)) + '</text>'; }).join('') +
      (capY ? '<line x1="' + padL + '" y1="' + capY + '" x2="' + (w - padR) + '" y2="' + capY + '" stroke="#D8583A" stroke-width="1.5" stroke-dasharray="5 5" opacity=".8"/>' +
        '<text class="axislab" x="' + (w - padR) + '" y="' + (capY - 5) + '" text-anchor="end" fill="#BF472B">capacity ' + capacity + '</text>' : '') +
      '<path class="area" d="' + area + '"/><path class="line" d="' + line + '"/>' +
      '<circle class="dot" cx="' + last[0] + '" cy="' + last[1] + '" r="4"/>' +
      '<text class="axislab" x="' + padL + '" y="194" text-anchor="middle">' + fmtDay(series[0].date) + '</text>' +
      '<text class="axislab" x="' + (w - padR) + '" y="194" text-anchor="end">today</text></svg>';
  }
  function viewOrganiser() {
    if (!S.me) return topbar('organiser') + '<div class="wrap"><div class="empty2"><b>Organiser sign-in required</b><button class="btn btn-primary" id="orgLogin">Log in</button></div></div>';
    if (S.me.role !== 'exec') return topbar('organiser') + '<div class="wrap"><div class="empty2"><b>This area is for society organisers</b>Use the organiser demo account.<div style="margin-top:10px"><button class="btn btn-primary" id="orgLogin">Switch account</button></div></div></div>';
    if (!S.org || S.org.error) return topbar('organiser') + '<div class="wrap"><div class="empty2"><b>' + esc((S.org && S.org.error) || 'Loading…') + '</b></div></div>';
    var h = S.org, st = h.stats, dash = S.orgDash || { stats: {}, series: [] }, ds = dash.stats;
    return topbar('organiser') + '<div class="wrap" style="padding-top:22px">' +
      '<div class="hub-head" style="margin-top:0;align-items:center">' +
      '<div class="hub-logo" style="width:64px;height:64px"><img src="' + esc(h.society.campus_logo) + '" alt=""></div>' +
      '<div class="hub-title"><h1 style="font-size:26px">' + esc(h.society.name) + '</h1><p class="sub" style="margin:2px 0 0">' + esc(h.society.campus_name) + ' · ' + stars(h.society.rating) + ' · ' + st.followers + ' followers · ' + st.members + ' members</p></div>' +
      '<button class="btn btn-primary" id="openCreate">＋ New event</button></div>' +

      '<div class="kpis2">' +
      '<div class="kpi2"><div class="k">RSVPs (upcoming)</div><div class="v">' + st.rsvps_upcoming + ' <small>/ ' + st.capacity_total + '</small></div><div class="n">' + st.rsvps_24h + ' in the last 24h</div></div>' +
      '<div class="kpi2"><div class="k">Fill rate</div><div class="v">' + (st.capacity_total ? Math.round(st.rsvps_upcoming / st.capacity_total * 100) : 0) + '<small>%</small></div><div class="n">across ' + st.events_upcoming + ' upcoming</div></div>' +
      '<div class="kpi2"><div class="k">Page views</div><div class="v">' + (ds.page_views || 0) + '</div><div class="n">' + (ds.view_to_rsvp_rate ? (ds.view_to_rsvp_rate * 100).toFixed(1) + '% → RSVP' : 'featured event') + '</div></div>' +
      '<div class="kpi2"><div class="k">Revenue</div><div class="v">' + money(st.revenue) + '</div><div class="n">tickets + memberships (test)</div></div></div>' +

      '<div class="org-grid">' +
      '<section class="chartcard"><h2>Will it fill?</h2><p class="cap">Cumulative RSVPs, last 14 days · capacity line · projected finish</p>' +
      cumulativeChart(dash.series.length ? dash.series : [{ date: new Date().toISOString().slice(0, 10), cumulative: 0 }], (dash.event || {}).capacity) +
      '<div class="chart-legend"><span><i style="background:#1F4A3B"></i>Cumulative RSVPs</span><span><i style="background:#D8583A"></i>Capacity</span></div>' +
      '<div class="table-foot" style="border:0;padding:10px 0 0"><span>' + (ds.rsvp_count || 0) + ' of ' + ((dash.event || {}).capacity || '∞') + ' · ' +
      ((ds.needed_to_fill == null) ? 'no cap' : (ds.needed_to_fill === 0 ? 'full' : 'needs ' + ds.needed_to_fill + ' more')) +
      ' · projected ' + (ds.projected_final || 0) + ' by event day (' + (ds.days_to_event || 0) + ' days left)</span></div></section>' +

      '<aside class="stack">' +
      '<div class="panel2"><h2 style="font-size:15px">Featured event</h2>' +
      (dash.event ? '<div class="list-row" style="border:0;padding:0"><img src="' + esc(dash.event.cover_image_url) + '" alt=""><div><div class="t">' + esc(dash.event.title) + '</div><div class="m">' + esc(fmtRange(dash.event.starts_at, dash.event.ends_at)) + '</div></div></div>' +
        '<div class="row" style="margin-top:10px"><a class="btn btn-sm btn-ghost" href="#/organiser/attendees/' + esc(dash.event.id) + '">Attendees →</a><span class="spacer"></span><span class="small muted">' + (ds.rsvps_24h || 0) + ' today</span></div>' : '') + '</div>' +
      '<div class="panel2"><h2 style="font-size:15px">Rating</h2><div class="row"><span class="n" style="font-size:26px;font-weight:750">' + (st.rating == null ? '—' : st.rating.toFixed(1)) + '</span>' + stars(st.rating) + '</div><p class="tiny muted">' + st.review_count + ' student reviews · replies coming soon</p></div>' +
      '</aside></div>' +

      '<div class="sectionhead" style="margin-top:26px"><h2>Upcoming events</h2><span class="count">' + h.upcoming.length + '</span></div>' +
      (h.upcoming.length ? '<div class="panel2" style="padding:6px 14px">' + h.upcoming.map(function (e) {
        return '<div class="list-row"><img src="' + esc(e.cover_image_url) + '" alt=""><div style="flex:1"><div class="t">' + esc(e.title) + '</div><div class="m">' + esc(fmtRange(e.starts_at, e.ends_at)) + ' · ' + esc(e.venue) + '</div></div>' +
          '<div class="small"><b>' + e.rsvp_count + '</b> / ' + (e.capacity || '∞') + '</div><a class="btn-quiet" href="#/event/' + esc(e.id) + '">Open</a></div>';
      }).join('') + '</div>' : '<div class="empty2"><b>No upcoming events</b></div>') +

      '<div class="sectionhead" style="margin-top:26px"><h2>Past events & photos</h2><span class="count">' + h.past.length + '</span></div>' +
      (h.gallery.length ? '<div class="gallery">' + h.gallery.map(function (g) { return '<a href="#/event/' + esc(g.id) + '"><figure><img src="' + esc(g.image) + '" alt="' + esc(g.title) + '"><figcaption>' + esc(g.title) + ' · ' + fmtDay(g.date) + '</figcaption></figure></a>'; }).join('') + '</div>' : '<div class="empty2"><b>No past events yet</b></div>') +

      '<div class="sectionhead" style="margin-top:26px"><h2>What students said</h2><span class="count">' + h.reviews.length + '</span></div>' +
      '<div class="reviews">' + (h.reviews.length ? h.reviews.map(function (r) {
        return '<div class="review"><div class="top"><span class="who">' + esc(r.display_name) + '</span><span class="stars"><span class="s">' + '★★★★★'.slice(0, r.rating) + '☆☆☆☆☆'.slice(0, 5 - r.rating) + '</span></span></div><div class="txt">' + esc(r.text) + '</div></div>';
      }).join('') : '<div class="empty2"><b>No reviews yet</b></div>') + '</div>' +
      '</div>' + tabbar('organiser');
  }
  function viewAttendees(evId) {
    if (!S.me || S.me.role !== 'exec') return viewOrganiser();
    var dash = S.orgDash;
    if (!dash || !dash.event || dash.event.id !== evId) return topbar('organiser') + '<div class="wrap"><div class="empty2">Loading…</div></div>';
    var rows = dash.attendees || [];
    return topbar('organiser') + '<div class="wrap" style="padding-top:22px"><p><a class="btn-quiet" href="#/organiser">← Back to hub</a></p>' +
      '<div class="pagehead" style="margin-top:8px"><div><h1 class="h1">Attendees.</h1><p class="lede">' + esc(dash.event.title) + ' · ' + rows.length + ' confirmed · ' + money(dash.stats.revenue) + ' collected</p></div>' +
      '<button class="btn btn-ghost" id="exportCsv">Export CSV</button></div>' +
      (rows.length ? '<div class="panel2" style="padding:4px 14px"><table class="table"><thead><tr><th style="width:32%">Student</th><th style="width:28%">Email</th><th style="width:20%">RSVP’d</th><th style="width:12%">Ticket</th><th style="width:8%">Paid</th></tr></thead><tbody>' +
        rows.map(function (a) {
          return '<tr><td><div class="who"><span class="avatar">' + esc(initials(a.display_name)) + '</span><span><b>' + esc(a.display_name) + '</b><span>' + esc((a.campus_id || '').replace(/_/g, ' ')) + '</span></span></div></td>' +
            '<td class="small muted">' + esc(a.email) + '</td><td class="small muted">' + esc(new Date(a.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) + '</td>' +
            '<td><span class="status">' + (a.ticket_type === 'member' ? 'Member' : 'General') + '</span></td><td>' + money(a.price_paid) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty2"><b>No RSVPs yet.</b>Share the event link.</div>') + '</div>';
  }

  /* ============ 竖版预览 ============ */
  function viewPreview() {
    return topbar('preview') + '<div class="wrap"><div class="pagehead"><div><p class="eyebrow">Mobile check</p><h1 class="h1">竖版预览。</h1><p class="lede">390 × 844 的真实 iframe —— 手机上打开同一地址就是竖版。</p></div></div>' +
      '<div class="phone-wrap"><div class="phone"><div class="notch"></div><div class="screen"><iframe src="/?embed=1" title="Mobile preview"></iframe></div></div></div>' +
      '<p class="phone-hint">直接扫码/用手机访问同一网址即可；此页只是桌面端预览。</p></div>' + tabbar('preview');
  }

  /* ============ 渲染与绑定 ============ */
  async function render() {
    var h = location.hash.replace(/^#\/?/, ''); var parts = h.split('/'); var app = $('#app');
    if (parts[0] === 'event' && parts[1]) {
      S.route = { name: 'event', id: parts[1] };
      app.innerHTML = topbar('discover') + '<div class="wrap"><div class="skel" style="height:320px;margin-top:22px"></div></div>';
      try { var r = await api('/api/events/' + encodeURIComponent(parts[1])); app.innerHTML = viewEvent(r); } catch (e) { app.innerHTML = viewEvent(null); }
    } else if (parts[0] === 'societies') {
      S.route = { name: 'societies' }; await loadSocieties(); app.innerHTML = viewSocieties();
    } else if (parts[0] === 'society' && parts[1]) {
      S.route = { name: 'society', id: parts[1] };
      app.innerHTML = topbar('societies') + '<div class="wrap"><div class="empty2">Loading…</div></div>';
      try { var rs = await api('/api/societies/' + encodeURIComponent(parts[1])); S.socData = rs; app.innerHTML = viewSociety(rs); } catch (e) { app.innerHTML = viewSociety(null); }
    } else if (parts[0] === 'saved') {
      S.route = { name: 'saved' }; await loadMe(); await loadEvents(); app.innerHTML = viewSaved();
    } else if (parts[0] === 'my') {
      S.route = { name: 'my' }; await loadMe(); await loadSocieties(); app.innerHTML = viewMy();
    } else if (parts[0] === 'preview') {
      S.route = { name: 'preview' }; app.innerHTML = viewPreview();
    } else if (parts[0] === 'organiser' && parts[1] === 'attendees' && parts[2]) {
      S.route = { name: 'organiser-attendees', id: parts[2] }; await loadMe();
      if (!S.orgDash || !S.orgDash.event || S.orgDash.event.id !== parts[2]) await loadOrg(parts[2]);
      app.innerHTML = viewAttendees(parts[2]);
    } else if (parts[0] === 'organiser') {
      S.route = { name: 'organiser' }; await loadMe();
      if (S.me && S.me.role === 'exec') await loadOrg(); else S.org = null;
      app.innerHTML = viewOrganiser();
    } else {
      S.route = { name: 'discover' }; S.loading = true; app.innerHTML = viewDiscover();
      await Promise.all([loadEvents(), loadMe()]); S.loading = false; app.innerHTML = viewDiscover();
    }
    bind();
  }

  function bind() {
    $$('[data-role]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.role === 'organiser') {
          if (!S.me) return openAuth('login');
          if (S.me.role !== 'exec') { toast('Use the organiser demo account'); return openAuth('login'); }
          location.hash = '#/organiser';
        } else location.hash = '#/';
      });
    });
    var lb = $('#loginBtn'); if (lb) lb.onclick = function () { openAuth('login'); };
    var ob = $('#logoutBtn'); if (ob) ob.onclick = async function () { await api('/api/auth/logout', { method: 'POST' }); S.me = null; S.myRsvps = []; S.myMemberships = []; S.saved = []; S.org = null; toast('Signed out'); render(); };
    /* 卡片整体可点 */
    $$('[data-open]').forEach(function (card) {
      var go = function (ev) {
        if (ev.target.closest('button,a,[data-save],[data-rsvp]')) return;
        location.hash = '#/event/' + card.dataset.open;
      };
      card.addEventListener('click', go);
      card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(ev); } });
    });
    /* 社团卡整体可点 */
    $$('[data-soc]').forEach(function (card) {
      card.addEventListener('click', function (ev) {
        if (ev.target.closest('a,button')) return;
        location.hash = '#/society/' + card.dataset.soc;
      });
    });
    /* 收藏 */
    $$('[data-save]').forEach(function (b) {
      b.addEventListener('click', async function (ev) {
        ev.stopPropagation();
        if (!S.me) return openAuth('login');
        var id = b.dataset.save, on = b.getAttribute('aria-pressed') === 'true';
        try {
          await api('/api/events/' + encodeURIComponent(id) + '/save', { method: on ? 'DELETE' : 'POST' });
          b.setAttribute('aria-pressed', String(!on));
          if (on) S.saved = S.saved.filter(function (x) { return x !== id; }); else if (S.saved.indexOf(id) < 0) S.saved.push(id);
          toast(on ? 'Removed from saved' : 'Saved');
          if (S.route.name === 'saved') render();
        } catch (e) { toast(e.message); }
      });
    });
    /* RSVP */
    $$('[data-rsvp]').forEach(function (b) {
      b.addEventListener('click', async function (ev) {
        ev.stopPropagation();
        if (!S.me) return openAuth('login');
        var id = b.dataset.rsvp; b.disabled = true;
        try {
          await api('/api/events/' + encodeURIComponent(id) + '/rsvp', { method: 'POST', body: {} });
          toast('You are on the list.'); await loadMe(); render();
        } catch (err) {
          b.disabled = false;
          if (err.status === 402) {
            var card = await openPay('Confirm and pay', 'Test mode — no real charge.', [{ k: 'Ticket', v: money(err.data.price || 0), hl: true }]);
            if (!card) return;
            try { await api('/api/events/' + encodeURIComponent(id) + '/rsvp', { method: 'POST', body: { card: card } }); toast('Paid and added.'); await loadMe(); render(); }
            catch (e2) { toast(e2.message); }
          } else toast(err.message);
        }
      });
    });
    /* 加入社团 */
    $$('#joinSociety,#joinSoc').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!S.me) return openAuth('login');
        var price = Number(b.dataset.price) || 0;
        var card = price > 0 ? await openPay('Join society', 'Test mode — no real charge.', [{ k: 'Membership', v: money(price), hl: true }]) : null;
        if (price > 0 && !card) return;
        try { await api('/api/societies/' + encodeURIComponent(b.dataset.society) + '/join', { method: 'POST', body: { card: card || '4242424242424242' } }); toast('Joined — member price applies'); S.societies = []; await loadMe(); render(); }
        catch (e) { toast(e.message); }
      });
    });
    var cr = $('#cancelRsvp'); if (cr) cr.onclick = async function () { try { await api('/api/events/' + encodeURIComponent(cr.dataset.id) + '/rsvp', { method: 'DELETE' }); toast('RSVP cancelled'); await loadMe(); render(); } catch (e) { toast(e.message); } };
    /* 筛选 */
    var fc = $('#fCampus'); if (fc) fc.onchange = async function () { S.filter.campus = fc.value; S.loading = true; $('#app').innerHTML = viewDiscover(); await loadEvents(); S.loading = false; $('#app').innerHTML = viewDiscover(); bind(); };
    var fw = $('#fWhen'); if (fw) fw.onchange = async function () { S.filter.when = fw.value; S.loading = true; $('#app').innerHTML = viewDiscover(); await loadEvents(); S.loading = false; $('#app').innerHTML = viewDiscover(); bind(); };
    var ff = $('#fFree'); if (ff) ff.onchange = async function () { S.filter.free = ff.checked; S.loading = true; $('#app').innerHTML = viewDiscover(); await loadEvents(); S.loading = false; $('#app').innerHTML = viewDiscover(); bind(); };
    var fq = $('#fQ'); if (fq) {
      var t; fq.oninput = function () { S.filter.q = fq.value; clearTimeout(t); t = setTimeout(async function () { await loadEvents(); var focus = document.activeElement === fq; $('#app').innerHTML = viewDiscover(); bind(); if (focus) { var n = $('#fQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 280); };
    }
    $$('[data-cat]').forEach(function (b) { b.onclick = async function () { S.filter.category = b.dataset.cat; S.loading = true; $('#app').innerHTML = viewDiscover(); await loadEvents(); S.loading = false; $('#app').innerHTML = viewDiscover(); bind(); }; });
    var cf = $('#clearFilters'); if (cf) cf.onclick = async function () { S.filter = { campus: '', when: 'week', category: 'all', free: false, q: '' }; await loadEvents(); render(); };
    /* Loop AI */
    $$('[data-ai-chip]').forEach(function (b) { b.onclick = function () { S.ai.text = b.dataset.aiChip; $('#aiInput').value = S.ai.text; $('#aiForm').dispatchEvent(new Event('submit', { cancelable: true })); }; });
    var aif = $('#aiForm'); if (aif) aif.addEventListener('submit', async function (e) {
      e.preventDefault();
      var txt = ($('#aiInput').value || '').trim(); var part = $('#aiWhen').value;
      if (!txt) { toast('Tell us when you are free'); return; }
      S.ai.text = txt; S.ai.busy = true; $('#app').innerHTML = viewDiscover(); bind();
      var base = new Date(); base.setDate(base.getDate() + (/saturday|sat/i.test(txt) ? ((6 - base.getDay() + 7) % 7 || 7) : 1));
      var from = new Date(base), to = new Date(base);
      if (part === 'morning') { from.setHours(8, 0, 0, 0); to.setHours(12, 0, 0, 0); }
      else if (part === 'evening') { from.setHours(17, 0, 0, 0); to.setHours(22, 0, 0, 0); }
      else { from.setHours(12, 0, 0, 0); to.setHours(17, 0, 0, 0); }
      var interests = [];
      ['outdoors', 'social', 'creative', 'sport', 'careers'].forEach(function (k) { if (txt.toLowerCase().indexOf(k) > -1) interests.push(k); });
      try {
        var r = await api('/api/recommend', { method: 'POST', body: { origin_campus: S.me ? S.me.campus_id : 'mq_sydney', available_from: from.toISOString(), available_to: to.toISOString(), interests: interests } });
        S.ai.results = r; S.ai.busy = false;
        $('#app').innerHTML = viewDiscover(); bind();
      } catch (err) { S.ai.busy = false; toast(err.message); $('#app').innerHTML = viewDiscover(); bind(); }
    });
    /* 社团 tabs / 评价 */
    $$('[data-soctab]').forEach(function (b) { b.onclick = function () { S.socTab = b.dataset.soctab; $('#app').innerHTML = viewSociety(S.socData); bind(); }; });
    var rf = $('#reviewForm');
    if (rf) rf.onsubmit = async function (e) {
      e.preventDefault();
      try {
        await api('/api/societies/' + encodeURIComponent(S.socData.society.id) + '/reviews', { method: 'POST', body: { rating: Number($('#rvRating').value), text: $('#rvText').value } });
        toast('Review posted'); var rs = await api('/api/societies/' + encodeURIComponent(S.socData.society.id)); S.socData = rs; S.socTab = 'reviews'; $('#app').innerHTML = viewSociety(rs); bind();
      } catch (err) { toast(err.message); }
    };
    /* 主办方 */
    var oc = $('#openCreate'); if (oc) oc.onclick = openCreate;
    var ex = $('#exportCsv'); if (ex) ex.onclick = function () {
      var rows = (S.orgDash && S.orgDash.attendees) || [];
      var csv = [['name', 'email', 'campus', 'ticket', 'paid', 'rsvp_at']].concat(rows.map(function (a) { return [a.display_name, a.email, a.campus_id, a.ticket_type, a.price_paid, a.created_at]; }))
        .map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'uniloop-attendees.csv'; a.click(); toast('CSV downloaded');
    };
    var ml = $('#myLogin'); if (ml) ml.onclick = function () { openAuth('login'); };
    var ol = $('#orgLogin'); if (ol) ol.onclick = function () { openAuth('login'); };
    /* 主办方 5 秒轮询 */
    if (S.poll) { clearInterval(S.poll); S.poll = null; }
    if (S.route.name === 'organiser' && S.me && S.me.role === 'exec') {
      S.poll = setInterval(async function () {
        if (document.hidden || S.route.name !== 'organiser') return;
        await loadOrg(S.orgEventId);
        var app = $('#app'); if (app && S.org && !S.org.error) { app.innerHTML = viewOrganiser(); bind(); }
      }, 5000);
    }
  }

  window.addEventListener('hashchange', render);
  (async function boot() {
    try { S.campuses = (await api('/api/campuses')).campuses; } catch (e) { S.campuses = []; }
    await loadMe();
    // embed 模式（竖版预览 iframe）隐藏顶部导航之外的装饰
    if (new URLSearchParams(location.search).get('embed') === '1') document.documentElement.classList.add('embed');
    await render();
  })();
})();
