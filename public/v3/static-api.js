/* static-api.js — 纯静态托管（Netlify / GitHub Pages）下的 API 兜底层
 *
 * 原理：拦截 /api/* 请求；如果真实后端返回 404（说明没有 Node 服务），
 * 就切换到「静态模式」：数据读 /data/*.json，报名/收藏/登录存 localStorage。
 * 站点在 Node 上运行时完全不受影响（真实 API 优先）。
 */
(function () {
  'use strict';
  var origFetch = window.fetch.bind(window);
  var DATA = null, loading = null, isStatic = false;

  var LS = {
    user: 'ul.static.user',
    users: 'ul.static.users',
    rsvps: 'ul.static.rsvps',
    saved: 'ul.static.saved',
    mem: 'ul.static.memberships',
  };
  var read = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var write = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var res = function (body, status) {
    return new Response(JSON.stringify(body), { status: status || 200, headers: { 'content-type': 'application/json' } });
  };
  var code = function () {
    var s = '', a = 'ABCDEF0123456789';
    for (var i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  };

  async function load() {
    if (DATA) return DATA;
    if (!loading) {
      loading = Promise.all(['campuses', 'societies', 'events', 'reviews'].map(function (n) {
        return origFetch('/data/' + n + '.json').then(function (r) { return r.json(); });
      })).then(function (out) {
        DATA = { campuses: out[0].campuses || [], societies: out[1].societies || [], events: out[2].events || [], reviews: out[3].reviews || [] };
        window.__UNILOOP_STATIC__ = true;
        return DATA;
      });
    }
    return loading;
  }

  function currentUser() { return read(LS.user, null); }
  function myRsvps() { return read(LS.rsvps, []); }
  function mySaved() { return read(LS.saved, []); }
  function myMemberships() { return read(LS.mem, []); }

  function hydrate(e) {
    var user = currentUser();
    var saved = mySaved();
    var rsvps = myRsvps();
    var mem = myMemberships();
    var mine = rsvps.filter(function (r) { return r.event_id === e.id; })[0] || null;
    var extra = rsvps.filter(function (r) { return r.event_id === e.id; }).length;
    var isMember = mem.some(function (m) { return m.society_id === e.society_id; });
    var taken = (e.rsvp_count || 0) + extra;
    return Object.assign({}, e, {
      rsvp_count: taken,
      seats_left: e.capacity == null ? null : Math.max(0, e.capacity - taken),
      is_saved: saved.indexOf(e.id) > -1,
      your_price: isMember ? e.price_member : e.price_public,
      my_rsvp: mine ? { id: mine.id, status: 'CONFIRMED', ticket_type: mine.ticket_type, price_paid: mine.price_paid, ticket_code: mine.ticket_code, checked_in: !!mine.checked_in, created_at: mine.created_at } : null,
    });
  }

  function findEvent(d, id) { return d.events.filter(function (e) { return e.id === id; })[0]; }

  async function handle(path, init) {
    var d = await load();
    var method = (init && init.method || 'GET').toUpperCase();
    var url = new URL(path, location.origin);
    var p = url.pathname.replace(/^\/+/, '');
    var body = {};
    try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (e) { }

    /* ---------- 账号 ---------- */
    if (p === 'me') {
      var user = currentUser();
      if (!user) return res({ user: null, rsvps: [], memberships: [], saved: 0, saved_events: [] });
      var rsvps = myRsvps().map(function (r) {
        var ev = findEvent(d, r.event_id);
        return ev ? { id: r.id, ticket_type: r.ticket_type, price_paid: r.price_paid, ticket_code: r.ticket_code, checked_in: !!r.checked_in, created_at: r.created_at, event: hydrate(ev) } : null;
      }).filter(Boolean);
      var mem = myMemberships();
      var full = mem.map(function (m) {
        var s = d.societies.filter(function (x) { return x.id === m.society_id; })[0] || {};
        return Object.assign({}, m, { society: s });
      });
      var savedIds = mySaved();
      var savedEvents = savedIds.map(function (id) { var ev = findEvent(d, id); return ev ? hydrate(ev) : null; }).filter(Boolean);
      var savedMoney = rsvps.reduce(function (a, r) { var ev = r.event; var pub = ev.price_public || 0; return a + Math.max(0, pub - (r.price_paid || 0)); }, 0);
      return res({ user: user, rsvps: rsvps, memberships: full, saved: savedMoney, saved_events: savedEvents });
    }
    if (p === 'auth/login') {
      var email = String(body.email || '').trim().toLowerCase();
      if (String(body.password || '') !== 'demo1234') return res({ error: 'Wrong email or password.' }, 401);
      var demo = email === 'exec@uniloop.demo'
        ? { id: 'usr_exec', name: 'Jamie Lee', username: 'jamie.lee', email: email, campus_id: 'mq_sydney', role: 'exec', society_id: null }
        : { id: 'usr_student', name: 'Jamie Chen', username: 'jamie.chen', email: 'student@uniloop.demo', campus_id: 'mq_sydney', role: 'student', society_id: null };
      if (email !== 'exec@uniloop.demo' && email !== 'student@uniloop.demo') return res({ error: 'Wrong email or password.' }, 401);
      write(LS.user, demo);
      return res({ user: demo });
    }
    if (p === 'auth/logout') { try { localStorage.removeItem(LS.user); } catch (e) { } return res({ ok: true }); }
    if (p === 'auth/signup') {
      var users = read(LS.users, []);
      var em = String(body.email || '').trim().toLowerCase();
      if (users.some(function (u) { return u.email === em; })) return res({ error: 'That email already has an account.' }, 409);
      var uname = String(body.username || '').trim().toLowerCase().replace(/^@/, '');
      if (uname && (users.some(function (u) { return u.username === uname; }) || ['jamie.chen', 'jamie.lee'].indexOf(uname) > -1)) {
        return res({ error: 'That username is taken. Try another.' }, 409);
      }
      var u = {
        id: 'usr_' + Date.now(), name: String(body.name || 'Student').trim(),
        username: uname || String(body.name || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''),
        email: em, campus_id: body.campus_id || 'mq_sydney', role: 'student', society_id: null,
      };
      users.push(u); write(LS.users, users); write(LS.user, u);
      return res({ user: u });
    }
    if (p === 'username-available') {
      var q = String(url.searchParams.get('u') || '').toLowerCase().replace(/^@/, '');
      if (!/^[a-z0-9._]{3,20}$/.test(q)) return res({ available: false, reason: '3–20 characters: letters, numbers, dots or underscores.' });
      var taken = ['jamie.chen', 'jamie.lee'].indexOf(q) > -1 || read(LS.users, []).some(function (u) { return u.username === q; });
      return res({ available: !taken, reason: taken ? 'That username is taken.' : 'Available' });
    }

    /* ---------- 基础数据 ---------- */
    if (p === 'campuses') return res({ campuses: d.campuses });
    if (p === 'events') {
      var limit = Number(url.searchParams.get('limit') || 120);
      var list = d.events.map(hydrate);
      return res({ events: list.slice(0, limit), total: list.length, static: true });
    }
    if (/^events\/[^/]+$/.test(p)) {
      var ev = findEvent(d, p.split('/')[1]);
      return ev ? res({ event: hydrate(ev) }) : res({ error: 'Event not found.' }, 404);
    }
    if (/^events\/[^/]+\/save$/.test(p)) {
      var id = p.split('/')[1], ids = mySaved();
      if (!currentUser()) return res({ error: 'Sign in first.' }, 401);
      if (method === 'DELETE') ids = ids.filter(function (x) { return x !== id; });
      else if (ids.indexOf(id) === -1) ids.push(id);
      write(LS.saved, ids);
      return res({ ok: true, saved: ids.indexOf(id) > -1 });
    }
    if (/^events\/[^/]+\/rsvp$/.test(p)) {
      var eid = p.split('/')[1];
      var ev2 = findEvent(d, eid);
      if (!ev2) return res({ error: 'Event not found.' }, 404);
      var me = currentUser();
      if (!me) return res({ error: 'Sign in first.' }, 401);
      var rl = myRsvps();
      if (rl.some(function (r) { return r.event_id === eid; })) return res({ error: 'You already have a ticket for this event.' }, 409);
      if (ev2.audience_scope === 'CAMPUS_ONLY' && me.campus_id !== ev2.campus_id) return res({ error: 'This event is for that campus only.' }, 403);
      var countNow = (ev2.rsvp_count || 0) + rl.filter(function (r) { return r.event_id === eid; }).length;
      if (ev2.capacity != null && countNow >= ev2.capacity) return res({ error: 'This event is full.' }, 409);
      var isMember = myMemberships().some(function (m) { return m.society_id === ev2.society_id; });
      var row = { id: 'rsvp_' + Date.now(), event_id: eid, ticket_type: isMember ? 'member' : 'public', price_paid: isMember ? ev2.price_member : ev2.price_public, ticket_code: code(), checked_in: false, created_at: new Date().toISOString() };
      rl.push(row); write(LS.rsvps, rl);
      return res({ ok: true, event: hydrate(ev2) });
    }
    if (p === 'societies') return res({ societies: d.societies.map(function (s) { return Object.assign({}, s, { is_member: myMemberships().some(function (m) { return m.society_id === s.id; }) }); }), total: d.societies.length, static: true });
    if (/^societies\/[^/]+$/.test(p) && method === 'GET') {
      var sid = p.split('/')[1];
      var soc = d.societies.filter(function (s) { return s.id === sid; })[0];
      if (!soc) return res({ error: 'Society not found.' }, 404);
      var mine = d.events.filter(function (e) { return e.society_id === sid && !e.past; });
      var past = d.events.filter(function (e) { return e.society_id === sid && e.past; });
      return res({
        society: Object.assign({}, soc, { is_member: myMemberships().some(function (m) { return m.society_id === sid; }) }),
        upcoming: mine.slice(0, 9).map(hydrate),
        past: past.slice(0, 6).map(hydrate),
        gallery: past.slice(0, 6).map(function (e) { return { id: e.id, image: e.cover_image_url, title: e.title, date: e.starts_at }; }),
        reviews: d.reviews.filter(function (r) { return r.society_id === sid; }).slice(0, 8),
        static: true,
      });
    }
    if (/^societies\/[^/]+\/join$/.test(p)) {
      var sid2 = p.split('/')[1];
      var soc2 = d.societies.filter(function (s) { return s.id === sid2; })[0];
      var me2 = currentUser();
      if (!me2) return res({ error: 'Sign in first.' }, 401);
      if (!soc2) return res({ error: 'Society not found.' }, 404);
      var mem2 = myMemberships();
      if (!mem2.some(function (m) { return m.society_id === sid2; })) {
        mem2.push({ id: 'mem_' + Date.now(), society_id: sid2, society_name: soc2.name, price_paid: soc2.membership_price, joined_at: new Date().toISOString() });
        write(LS.mem, mem2);
      }
      return res({ ok: true });
    }
    if (p === 'recommend') {
      var inter = (body.interests || []).map(String);
      var results = d.events.filter(function (e) { return !inter.length || inter.indexOf(e.category) > -1; }).slice(0, 6).map(hydrate);
      return res({ results: results, excluded: [], static: true });
    }

    /* ---------- 主办方：静态模式不支持 ---------- */
    if (/^exec\//.test(p)) return res({ error: 'Live organiser features need the Node server. This is the static preview.' }, 501);

    return res({ error: 'Not found (static preview).' }, 404);
  }

  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!/\/api\//.test(url)) return origFetch(input, init);
    if (!isStatic) {
      try {
        var real = await origFetch(input, init);
        var ctype = (real.headers.get('content-type') || '').toLowerCase();
        // 真正的后端一定返回 JSON；返回 HTML/404 说明是纯静态托管
        if (real.status !== 404 && ctype.indexOf('json') > -1) return real;
        isStatic = true;
        window.__UNILOOP_STATIC__ = true;
      } catch (e) { isStatic = true; window.__UNILOOP_STATIC__ = true; }
    }
    var path = url.replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^\/api\//, '');
    try { return await handle(path, init || {}); } catch (e) { return res({ error: String(e && e.message || e) }, 500); }
  };
})();
