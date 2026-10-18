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
    friends: 'ul.static.friendships',
    msgs: 'ul.static.messages',
  };
  var read = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var write = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  /* 登录态放 sessionStorage：同一浏览器两个标签页可以分别登录两个账号，方便演示私信 */
  var readSession = function (k, d) { try { var v = JSON.parse(sessionStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var writeSession = function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
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
      loading = Promise.all(['campuses', 'societies', 'events', 'reviews', 'users'].map(function (n) {
        return origFetch('../data/' + n + '.json').then(function (r) { return r.json(); }).catch(function () { return {}; });
      })).then(function (out) {
        DATA = {
          campuses: out[0].campuses || [], societies: out[1].societies || [], events: out[2].events || [],
          reviews: out[3].reviews || [], users: out[4].users || []
        };
        window.__UNILOOP_STATIC__ = true;
        return DATA;
      });
    }
    return loading;
  }

  function currentUser() { return readSession(LS.user, null) || read(LS.user, null); }
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

  /* ---------- 好友 / 私信 数据层（localStorage） ---------- */
  function friendships() { return read(LS.friends, []); }
  function saveFriendships(v) { write(LS.friends, v); }
  function messagesRows() { return read(LS.msgs, []); }
  function saveMessages(v) { write(LS.msgs, v); }
  function byId(arr, id) { return (arr || []).filter(function (x) { return String(x.id) === String(id); })[0]; }
  function userLite(u) {
    if (!u) return null;
    return {
      id: u.id, name: u.name, username: u.username || null,
      campus_id: u.campus_id, campus_name: u.campus_name || '', campus_logo: u.campus_logo || '', role: u.role || 'student'
    };
  }
  function relationOf(a, b) {
    var f = friendships().filter(function (x) {
      return (x.requesterId === a && x.addresseeId === b) || (x.requesterId === b && x.addresseeId === a);
    })[0];
    if (!f) return 'none';
    if (f.status === 'accepted') return 'friends';
    return f.requesterId === a ? 'requested_out' : 'requested_in';
  }
  function friendIdsOf(uid) {
    return friendships().filter(function (f) {
      return f.status === 'accepted' && (f.requesterId === uid || f.addresseeId === uid);
    }).map(function (f) { return f.requesterId === uid ? f.addresseeId : f.requesterId; });
  }
  function threadSummary(uid, pid) {
    var rows = messagesRows().filter(function (m) {
      return (m.fromId === uid && m.toId === pid) || (m.fromId === pid && m.toId === uid);
    });
    return {
      last: rows[rows.length - 1] || null,
      unread: rows.filter(function (m) { return m.toId === uid && !m.readAt; }).length,
      count: rows.length
    };
  }
  function unreadOf(uid) {
    return messagesRows().filter(function (m) { return m.toId === uid && !m.readAt; }).length;
  }

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
      return res({ user: user, rsvps: rsvps, memberships: full, saved: savedMoney, saved_events: savedEvents, unread_messages: unreadOf(user.id) });
    }
    if (p === 'auth/login') {
      var email = String(body.email || '').trim().toLowerCase();
      if (String(body.password || '') !== 'demo1234') return res({ error: 'Wrong email or password (demo password is demo1234).' }, 401);
      var demo = (d.users || []).filter(function (u) { return String(u.email || '').toLowerCase() === email; })[0];
      if (!demo && email === 'exec@uniloop.demo') {
        demo = { id: 'usr_exec', name: 'Jamie Lee', username: 'jamie.lee', email: email, campus_id: 'uts_haymarket', campus_name: 'University of Technology Sydney', role: 'exec' };
      }
      if (!demo && email === 'student@uniloop.demo') {
        demo = { id: 'usr_student', name: 'Jamie Chen', username: 'jamie.chen', email: email, campus_id: 'mq_sydney', campus_name: 'Macquarie University', role: 'student' };
      }
      if (!demo) return res({ error: 'Wrong email or password. Try student@uniloop.demo or any demo student listed in the guide.' }, 401);
      var clean = Object.assign({}, demo); delete clean.password; delete clean.salt; delete clean.hash;
      writeSession(LS.user, clean);
      return res({ user: clean });
    }
    if (p === 'auth/logout') {
      try { sessionStorage.removeItem(LS.user); localStorage.removeItem(LS.user); } catch (e) { }
      return res({ ok: true });
    }
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
      var taken = ['jamie.chen', 'jamie.lee'].indexOf(q) > -1 ||
        (d.users || []).some(function (u) { return String(u.username || '').toLowerCase() === q; }) ||
        read(LS.users, []).some(function (u) { return u.username === q; });
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

    /* ---------- 好友 / 私信（静态版：数据存浏览器 localStorage，跨标签页共享） ---------- */
    if (p === 'users/search') {
      var meS = currentUser();
      if (!meS) return res({ error: 'Please sign in first.' }, 401);
      var q = String(url.searchParams.get('q') || '').trim().toLowerCase().replace(/^@/, '');
      if (!q) return res({ users: [] });
      var found = (d.users || []).filter(function (u) {
        return u.id !== meS.id && ((u.name || '').toLowerCase().indexOf(q) > -1 || (u.username || '').toLowerCase().indexOf(q) > -1);
      }).slice(0, 12).map(function (u) { return Object.assign(userLite(u), { relation: relationOf(meS.id, u.id) }); });
      return res({ users: found, static: true });
    }
    if (p === 'friends' && method === 'GET') {
      var meF = currentUser();
      if (!meF) return res({ error: 'Please sign in first.' }, 401);
      var fs = friendships(), friends = [], incoming = [], outgoing = [];
      fs.forEach(function (f) {
        if (f.requesterId !== meF.id && f.addresseeId !== meF.id) return;
        var otherId = f.requesterId === meF.id ? f.addresseeId : f.requesterId;
        var other = byId(d.users || [], otherId);
        if (!other) return;
        if (f.status === 'accepted') {
          var t = threadSummary(meF.id, otherId);
          friends.push({
            friendship_id: f.id, user: userLite(other), since: f.respondedAt || f.createdAt,
            last_message: t.last ? { text: t.last.text, created_at: t.last.createdAt, from_me: t.last.fromId === meF.id } : null,
            unread: t.unread
          });
        } else if (f.addresseeId === meF.id) incoming.push({ id: f.id, user: userLite(other), created_at: f.createdAt });
        else outgoing.push({ id: f.id, user: userLite(other), created_at: f.createdAt });
      });
      friends.sort(function (a, b) {
        return new Date((b.last_message || {}).created_at || b.since) - new Date((a.last_message || {}).created_at || a.since);
      });
      return res({ friends: friends, incoming: incoming, outgoing: outgoing, unread: unreadOf(meF.id), static: true });
    }
    if (p === 'friends/request') {
      var meR = currentUser();
      if (!meR) return res({ error: 'Please sign in first.' }, 401);
      var target = byId(d.users || [], String(body.user_id || ''));
      if (!target) return res({ error: 'User not found.' }, 404);
      if (target.id === meR.id) return res({ error: 'You cannot add yourself.' }, 400);
      var fsr = friendships();
      var existing = fsr.filter(function (f) {
        return (f.requesterId === meR.id && f.addresseeId === target.id) || (f.requesterId === target.id && f.addresseeId === meR.id);
      })[0];
      if (existing) {
        if (existing.status === 'accepted') return res({ error: 'You are already friends.' }, 409);
        if (existing.requesterId === meR.id) return res({ error: 'Request already sent.' }, 409);
        existing.status = 'accepted'; existing.respondedAt = new Date().toISOString();
        saveFriendships(fsr);
        return res({ ok: true, status: 'accepted' });
      }
      var nf = { id: 'fr_' + Date.now(), requesterId: meR.id, addresseeId: target.id, status: 'pending', createdAt: new Date().toISOString(), respondedAt: null };
      fsr.push(nf); saveFriendships(fsr);
      return res({ ok: true, status: 'pending', friendship: { id: nf.id } });
    }
    if (p === 'friends/respond') {
      var meP = currentUser();
      if (!meP) return res({ error: 'Please sign in first.' }, 401);
      var fr = byId(friendships(), String(body.id || ''));
      if (!fr || fr.addresseeId !== meP.id) return res({ error: 'Request not found.' }, 404);
      if (fr.status !== 'pending') return res({ error: 'This request was already handled.' }, 409);
      var fs2 = friendships();
      var row2 = byId(fs2, fr.id);
      row2.status = body.accept ? 'accepted' : 'declined';
      row2.respondedAt = new Date().toISOString();
      saveFriendships(fs2);
      return res({ ok: true, status: row2.status });
    }
    if (/^friends\/[^/]+$/.test(p) && method === 'DELETE') {
      var meD = currentUser();
      if (!meD) return res({ error: 'Please sign in first.' }, 401);
      var fid = p.split('/')[1];
      var all = friendships();
      var hit = all.filter(function (f) { return f.id === fid; })[0];
      if (!hit || (hit.requesterId !== meD.id && hit.addresseeId !== meD.id)) return res({ error: 'Friendship not found.' }, 404);
      saveFriendships(all.filter(function (f) { return f.id !== fid; }));
      return res({ ok: true });
    }
    if (p === 'messages' && method === 'GET') {
      var meT = currentUser();
      if (!meT) return res({ error: 'Please sign in first.' }, 401);
      var threads = friendIdsOf(meT.id).map(function (pid) {
        var peer = byId(d.users || [], pid);
        if (!peer) return null;
        var t = threadSummary(meT.id, pid);
        return {
          peer: userLite(peer),
          last_message: t.last ? { text: t.last.text, created_at: t.last.createdAt, from_me: t.last.fromId === meT.id } : null,
          unread: t.unread, count: t.count
        };
      }).filter(Boolean).sort(function (a, b) {
        return new Date((b.last_message || {}).created_at || 0) - new Date((a.last_message || {}).created_at || 0);
      });
      return res({ threads: threads, static: true });
    }
    if (p === 'messages/unread') {
      var meU = currentUser();
      return res({ unread: meU ? unreadOf(meU.id) : 0 });
    }
    if (/^messages\/[^/]+$/.test(p) && method === 'GET') {
      var meG = currentUser();
      if (!meG) return res({ error: 'Please sign in first.' }, 401);
      var peerId = p.split('/')[1];
      var peerG = byId(d.users || [], peerId);
      if (!peerG) return res({ error: 'User not found.' }, 404);
      if (relationOf(meG.id, peerG.id) !== 'friends') return res({ error: 'You can only message friends.' }, 403);
      var rows = messagesRows().filter(function (m) {
        return (m.fromId === meG.id && m.toId === peerG.id) || (m.fromId === peerG.id && m.toId === meG.id);
      }).sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
      var changed = false;
      rows.forEach(function (m) { if (m.toId === meG.id && !m.readAt) { m.readAt = new Date().toISOString(); changed = true; } });
      if (changed) saveMessages(messagesRows().map(function (m) { return byId(rows, m.id) || m; }));
      return res({
        peer: userLite(peerG),
        messages: rows.map(function (m) { return { id: m.id, from_me: m.fromId === meG.id, text: m.text, created_at: m.createdAt, read: !!m.readAt }; }),
        static: true
      });
    }
    if (/^messages\/[^/]+$/.test(p) && method === 'POST') {
      var meN = currentUser();
      if (!meN) return res({ error: 'Please sign in first.' }, 401);
      var peerN = byId(d.users || [], p.split('/')[1]);
      if (!peerN) return res({ error: 'User not found.' }, 404);
      if (relationOf(meN.id, peerN.id) !== 'friends') return res({ error: 'You can only message friends.' }, 403);
      var textN = String(body.text || '').trim().slice(0, 2000);
      if (!textN) return res({ error: 'Type a message first.' }, 400);
      var allM = messagesRows();
      var nm = { id: 'msg_' + Date.now(), fromId: meN.id, toId: peerN.id, text: textN, createdAt: new Date().toISOString(), readAt: null };
      allM.push(nm); saveMessages(allM);
      return res({ ok: true, message: { id: nm.id, from_me: true, text: nm.text, created_at: nm.createdAt, read: false } });
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
