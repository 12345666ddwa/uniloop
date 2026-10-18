// server.js — UniLoop v2（零依赖）：账号/会员/报名/收藏/评价/社团主页/主办方数据/地图坐标
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildSeed } = require('./seed');
const CAMPUS_COORDS = { mq_sydney: [-33.7738, 151.1126], usyd_camperdown: [-33.8894, 151.1874], unsw_kensington: [-33.9173, 151.2313], uts_haymarket: [-33.8825, 151.2000], wsu_parramatta: [-33.8120, 150.9940] };

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '.sym-data');
const DB_FILE = path.join(DATA_DIR, 'uniloop-db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

/* ---------- 账号安全 ---------- */
function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(String(pw), salt, 32).toString('hex') };
}
function checkPassword(pw, user) {
  const { hash } = hashPassword(pw, user.salt);
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(user.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- 持久化 ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let db;
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
else { db = buildSeed(hashPassword); save(); }
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}
const nextId = (k) => ++db.seq[k];
const iso = () => new Date().toISOString();
const byId = (arr, id) => arr.find((x) => String(x.id) === String(id));
const campusOf = (id) => db.campuses.find((c) => c.id === id) || {};
const isMember = (u, s) => !!u && db.memberships.some((m) => m.userId === u.id && m.societyId === s);
const memberCount = (s) => db.memberships.filter((m) => m.societyId === s).length;
const confirmed = (evId) => db.rsvps.filter((r) => r.eventId === evId && r.status === 'CONFIRMED');
const rsvpCount = (evId) => confirmed(evId).length;
const isSaved = (u, evId) => !!u && (u.savedEvents || []).includes(evId);

function publicUser(u) {
  if (!u) return null;
  const c = campusOf(u.campusId);
  return { id: u.id, name: u.name, username: u.username || null, email: u.email, campus_id: u.campusId, campus_name: c.name, campus_logo: c.logo, role: u.role, society_id: u.societyId, interests: u.interests || [] };
}
function ratingOf(societyId) {
  const rs = db.reviews.filter((r) => r.societyId === societyId);
  if (!rs.length) return { rating: null, review_count: 0 };
  return { rating: Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10, review_count: rs.length };
}
function societyOut(s, user) {
  const c = campusOf(s.campusId);
  const r = ratingOf(s.id);
  return {
    id: s.id, name: s.name, campus_id: s.campusId, campus_name: c.name, campus_logo: c.logo,
    blurb: s.blurb, tags: s.tags, membership_price: s.membershipPrice, followers: s.followers || 0,
    member_count: memberCount(s.id), rating: r.rating, review_count: r.review_count,
    is_member: user ? isMember(user, s.id) : false,
    upcoming_events: db.events.filter((e) => e.societyId === s.id && !e.past).length,
  };
}
function mapLinks(coords, label) {
  if (!coords) return null;
  const [lat, lng] = coords;
  const q = encodeURIComponent(label || (lat + ',' + lng));
  return {
    lat, lng,
    osm_embed: `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008}%2C${lat - 0.005}%2C${lng + 0.008}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`,
    osm_page: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    google_directions: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    google_place: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    apple_maps: `https://maps.apple.com/?daddr=${lat},${lng}&q=${q}`,
  };
}

/* ---------- 事件输出 ---------- */
function eventOut(e, user) {
  const soc = byId(db.societies, e.societyId) || {};
  const taken = rsvpCount(e.id);
  const mine = user ? db.rsvps.find((r) => r.eventId === e.id && r.userId === user.id && r.status === 'CONFIRMED') : null;
  const member = user ? isMember(user, e.societyId) : false;
  return {
    id: e.id, title: e.title, description: e.description, category: e.category,
    campus_id: e.campusId, campus_name: e.campusName, campus_logo: campusOf(e.campusId).logo,
    venue: e.venue, venue_coords: e.venueCoords || null, map: mapLinks(e.venueCoords, e.venue),
    starts_at: e.startsAt, ends_at: e.endsAt, audience_scope: e.audienceScope,
    society_id: e.societyId, society_name: e.societyName, society_logo: campusOf(e.campusId).logo,
    society_rating: ratingOf(e.societyId).rating,
    cover_image_url: e.coverImageUrl, capacity: e.capacity, status: e.status,
    rsvp_count: taken, page_views: e.pageViews || 0, past: !!e.past,
    source: e.source || '', kind: e.kind || '',
    price_member: e.priceMember, price_public: e.pricePublic,
    your_price: member ? e.priceMember : e.pricePublic, is_member: member,
    seats_left: e.capacity == null ? null : Math.max(0, e.capacity - taken),
    is_saved: isSaved(user, e.id),
    my_rsvp: mine ? { id: mine.id, status: mine.status, ticket_type: mine.ticketType, price_paid: mine.pricePaid, created_at: mine.createdAt, ticket_code: mine.ticketCode || null, checked_in: !!mine.checkedIn } : null,
    can_rsvp: !!user && !e.past && (e.audienceScope !== 'CAMPUS_ONLY' || user.campusId === e.campusId)
      && (e.capacity == null || taken < e.capacity) && !mine,
    society_membership_price: soc.membershipPrice || 0,
  };
}
function mockCharge(card, amount) {
  if (!amount) return { ok: true, ref: 'FREE' };
  const digits = String(card || '').replace(/\D/g, '');
  if (digits.length < 12) return { ok: false, error: 'Enter a test card (4242 4242 4242 4242).' };
  if (digits.endsWith('0002')) return { ok: false, error: 'Card declined (test decline card).' };
  return { ok: true, ref: 'MOCK-' + crypto.randomBytes(3).toString('hex').toUpperCase() };
}

/* ---------- HTTP ---------- */
function send(res, status, body, headers = {}) {
  const isStr = typeof body === 'string';
  res.writeHead(status, Object.assign({ 'Content-Type': isStr ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(isStr ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2e6) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
const getCookie = (req, n) => { const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + n + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : null; };
function currentUser(req) {
  const t = getCookie(req, 'ul_session');
  const s = t && db.sessions[t];
  if (!s) return null;
  if (Date.now() > s.expires) { delete db.sessions[t]; save(); return null; }
  return byId(db.users, s.userId);
}
function startSession(u) {
  const t = crypto.randomBytes(24).toString('hex');
  db.sessions[t] = { userId: u.id, expires: Date.now() + 7 * 86400000 };
  save();
  return { 'Set-Cookie': `ul_session=${t}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 86400}` };
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json' };
function serveStatic(req, res, pathname) {
  let rel = pathname;
  if (rel === '/' || rel === '/index.html') rel = '/v3/index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  if (!/\.[a-zA-Z0-9]+$/.test(rel)) rel += '/index.html';   // /v3 → /v3/index.html
  const full = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  fs.readFile(full, (err, data) => {
    if (err) return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => e2 ? send(res, 404, 'Not found') : (res.writeHead(200, { 'Content-Type': MIME['.html'] }), res.end(html)));
    var ext = path.extname(full).toLowerCase();
    var cache = (ext === '.html' || ext === '.css' || ext === '.js') ? 'no-store' : 'public, max-age=86400';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(data);
  });
}

/* ---------- 路由 ---------- */
const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler });
}
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const needUser = (u) => { if (!u) fail(401, 'Please sign in first.'); return u; };
const needExec = (u) => { needUser(u); if (u.role !== 'exec') fail(403, 'Society organiser accounts only.'); return u; };

route('GET', '/_sym/health', () => ({ ok: true, users: db.users.length, events: db.events.length, societies: db.societies.length, reviews: db.reviews.length }));

/* 认证 */
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const unameTaken = (u) => db.users.some((x) => (x.username || '').toLowerCase() === u);

route('GET', '/api/username-available', ({ query }) => {
  const u = String(query.u || '').trim().toLowerCase().replace(/^@/, '');
  if (!USERNAME_RE.test(u)) return { available: false, reason: '3–20 characters: letters, numbers, dots or underscores.' };
  if (unameTaken(u)) return { available: false, reason: 'That username is taken.' };
  return { available: true, reason: 'Available' };
});

route('POST', '/api/auth/signup', async ({ body }) => {
  const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), pw = String(body.password || '');
  if (!name || !email.includes('@')) fail(400, 'Enter your name and a valid email.');
  if (pw.length < 6) fail(400, 'Password must be at least 6 characters.');
  if (db.users.some((u) => u.email === email)) fail(409, 'That email already has an account.');
  let username = String(body.username || '').trim().toLowerCase().replace(/^@/, '');
  if (username) {
    if (!USERNAME_RE.test(username)) fail(400, 'Username: 3–20 letters, numbers, dots or underscores.');
    if (unameTaken(username)) fail(409, 'That username is taken. Try another.');
  } else {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 15) || 'student';
    username = base;
    let n = 1;
    while (unameTaken(username)) username = base + (++n);
  }
  const u = { id: 'usr_' + nextId('user'), name, username, email, campusId: body.campus_id || 'mq_sydney', role: 'student', societyId: null, interests: Array.isArray(body.interests) ? body.interests.slice(0, 12) : [], savedEvents: [], ...hashPassword(pw), createdAt: iso() };
  db.users.push(u);
  return { __headers: startSession(u), user: publicUser(u) };
});
route('POST', '/api/auth/login', async ({ body }) => {
  const u = db.users.find((x) => x.email === String(body.email || '').trim().toLowerCase());
  if (!u || !checkPassword(String(body.password || ''), u)) fail(401, 'Wrong email or password.');
  return { __headers: startSession(u), user: publicUser(u) };
});
route('POST', '/api/auth/logout', ({ req }) => {
  const t = getCookie(req, 'ul_session');
  if (t) { delete db.sessions[t]; save(); }
  return { __headers: { 'Set-Cookie': 'ul_session=; Path=/; Max-Age=0' }, ok: true };
});
route('GET', '/api/me', ({ user }) => {
  if (!user) return { user: null };
  const memberships = db.memberships.filter((m) => m.userId === user.id).map((m) => {
    const s = byId(db.societies, m.societyId) || {};
    return { id: m.id, society_id: m.societyId, society_name: s.name, price_paid: m.pricePaid, joined_at: m.joinedAt };
  });
  const rsvps = db.rsvps.filter((r) => r.userId === user.id && r.status === 'CONFIRMED')
    .map((r) => ({ id: r.id, ticket_type: r.ticketType, price_paid: r.pricePaid, created_at: r.createdAt, ticket_code: r.ticketCode || null, checked_in: !!r.checkedIn, event: eventOut(byId(db.events, r.eventId), user) }))
    .sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at));
  const saved = (user.savedEvents || []).map((id) => byId(db.events, id)).filter(Boolean).map((e) => eventOut(e, user));
  const savedMoney = rsvps.reduce((s, r) => s + (r.ticket_type === 'member' ? Math.max(0, r.event.price_public - r.price_paid) : 0), 0);
  return { user: publicUser(user), memberships, rsvps, saved_events: saved, saved: savedMoney, society: user.societyId ? byId(db.societies, user.societyId) : null };
});
route('PATCH', '/api/me', async ({ user, body }) => {
  needUser(user);
  if (Array.isArray(body.interests)) user.interests = body.interests.slice(0, 12);
  if (body.campus_id && db.campuses.some((c) => c.id === body.campus_id)) user.campusId = body.campus_id;
  save();
  return { user: publicUser(user) };
});

/* 校区与场地 */
route('GET', '/api/campuses', () => ({ campuses: db.campuses }));
route('GET', '/api/venues', () => ({ venues: db.venues }));

/* 社团 */
route('GET', '/api/societies', ({ user, query }) => {
  let list = db.societies;
  if (query.campus_id) list = list.filter((s) => s.campusId === query.campus_id);
  if (query.q) { const q = query.q.toLowerCase(); list = list.filter((s) => (s.name + ' ' + s.blurb + ' ' + s.tags.join(' ')).toLowerCase().includes(q)); }
  return { societies: list.map((s) => societyOut(s, user)) };
});
route('GET', '/api/societies/:id', ({ params, user }) => {
  const s = byId(db.societies, params.id) || fail(404, 'Society not found.');
  const upcoming = db.events.filter((e) => e.societyId === s.id && !e.past).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).map((e) => eventOut(e, user));
  const pastRaw = db.events.filter((e) => e.societyId === s.id && e.past).sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
  const reviews = db.reviews.filter((r) => r.societyId === s.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((r) => ({ id: r.id, display_name: r.displayName, rating: r.rating, text: r.text, created_at: r.createdAt }));
  return {
    society: societyOut(s, user),
    upcoming, past: pastRaw.map((e) => eventOut(e, user)),
    gallery: pastRaw.map((e) => ({ id: e.id, image: e.coverImageUrl, title: e.title, date: e.startsAt, attendance: rsvpCount(e.id) })),
    reviews,
  };
});
route('POST', '/api/societies/:id/join', async ({ params, user, body }) => {
  needUser(user);
  const s = byId(db.societies, params.id) || fail(404, 'Society not found.');
  if (isMember(user, s.id)) return { ok: true, already: true };
  const ch = mockCharge(body.card, s.membershipPrice);
  if (!ch.ok) fail(402, ch.error);
  const m = { id: 'mem_' + nextId('membership'), userId: user.id, societyId: s.id, pricePaid: s.membershipPrice, joinedAt: iso() };
  db.memberships.push(m);
  if (s.membershipPrice > 0) db.payments.push({ id: 'pay_' + nextId('payment'), userId: user.id, kind: 'membership', refId: m.id, amount: s.membershipPrice, ref: ch.ref, createdAt: m.joinedAt });
  s.followers = (s.followers || 0) + 1;
  save();
  return { ok: true, membership: { id: m.id, society_id: s.id, price_paid: m.pricePaid }, society: societyOut(s, user) };
});
route('POST', '/api/societies/:id/reviews', async ({ params, user, body }) => {
  needUser(user);
  const s = byId(db.societies, params.id) || fail(404, 'Society not found.');
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
  const text = String(body.text || '').trim().slice(0, 400);
  if (!rating) fail(400, 'Pick a rating from 1 to 5.');
  const r = { id: 'rev_' + nextId('review'), societyId: s.id, userId: user.id, displayName: user.name, rating, text, createdAt: iso() };
  db.reviews.push(r);
  save();
  const agg = ratingOf(s.id);
  return { ok: true, review: { id: r.id, display_name: r.displayName, rating, text, created_at: r.createdAt }, rating: agg.rating, review_count: agg.review_count };
});

/* 活动 */
route('GET', '/api/events', ({ user, query }) => {
  const now = Date.now();
  let list = db.events.filter((e) => e.status === 'PUBLISHED');
  if (query.include_past !== '1') list = list.filter((e) => !e.past && new Date(e.endsAt).getTime() > now);
  if (query.campus_id && query.campus_id !== 'all') list = list.filter((e) => e.campusId === query.campus_id);
  if (query.category && query.category !== 'all') list = list.filter((e) => e.category === query.category);
  if (query.scope) list = list.filter((e) => e.audienceScope === query.scope);
  if (query.free === '1') list = list.filter((e) => e.pricePublic === 0);
  if (query.saved === '1' && user) list = list.filter((e) => (user.savedEvents || []).includes(e.id));
  if (query.when && query.when !== 'all') {
    const days = query.when === 'week' ? 7 : query.when === '7d' ? 7 : query.when === 'month' ? 31 : 7;
    const end = now + days * 86400000;
    list = list.filter((e) => { const t = new Date(e.startsAt).getTime(); return t >= now - 3600000 && t <= end; });
  }
  if (query.q) {
    const q = query.q.toLowerCase();
    list = list.filter((e) => (e.title + ' ' + e.societyName + ' ' + e.venue + ' ' + e.category).toLowerCase().includes(q));
  }
  list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const limit = Math.min(200, Number(query.limit) || 80);
  return { events: list.slice(0, limit).map((e) => eventOut(e, user)), total: list.length };
});
route('GET', '/api/events/:id', ({ params, user }) => {
  const e = byId(db.events, params.id) || fail(404, 'Event not found.');
  e.pageViews = (e.pageViews || 0) + 1; save();
  const soc = byId(db.societies, e.societyId);
  return { event: eventOut(e, user), society: societyOut(soc, user) };
});
route('POST', '/api/events/:id/save', ({ params, user }) => {
  needUser(user);
  const e = byId(db.events, params.id) || fail(404, 'Event not found.');
  user.savedEvents = user.savedEvents || [];
  if (!user.savedEvents.includes(e.id)) user.savedEvents.push(e.id);
  save();
  return { ok: true, saved: true };
});
route('DELETE', '/api/events/:id/save', ({ params, user }) => {
  needUser(user);
  user.savedEvents = (user.savedEvents || []).filter((x) => x !== String(params.id));
  save();
  return { ok: true, saved: false };
});
route('POST', '/api/events/:id/rsvp', async ({ params, user, body }) => {
  needUser(user);
  const e = byId(db.events, params.id) || fail(404, 'Event not found.');
  if (e.past) fail(400, 'This event has already finished.');
  if (e.audienceScope === 'CAMPUS_ONLY' && user.campusId !== e.campusId) fail(403, 'This event is for ' + e.campusName + ' students only.');
  if (db.rsvps.some((r) => r.eventId === e.id && r.userId === user.id && r.status === 'CONFIRMED')) fail(409, "You're already going to this event.");
  if (e.capacity != null && rsvpCount(e.id) >= e.capacity) fail(409, 'Sorry, this event is full.');
  const soc = byId(db.societies, e.societyId);
  let joined = false;
  if (body.join_society && !isMember(user, soc.id)) {
    const chm = mockCharge(body.card, soc.membershipPrice);
    if (!chm.ok) fail(402, chm.error);
    const m = { id: 'mem_' + nextId('membership'), userId: user.id, societyId: soc.id, pricePaid: soc.membershipPrice, joinedAt: iso() };
    db.memberships.push(m);
    if (soc.membershipPrice > 0) db.payments.push({ id: 'pay_' + nextId('payment'), userId: user.id, kind: 'membership', refId: m.id, amount: soc.membershipPrice, ref: chm.ref, createdAt: m.joinedAt });
    joined = true;
  }
  const member = isMember(user, soc.id);
  const price = member ? e.priceMember : e.pricePublic;
  const ch = mockCharge(body.card, price);
  if (!ch.ok) { const err = new Error(ch.error); err.status = 402; err.price = price; throw err; }
  const code = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
  const r = { id: 'rsvp_' + nextId('rsvp'), eventId: e.id, userId: user.id, status: 'CONFIRMED', ticketType: member ? 'member' : 'public', pricePaid: price, createdAt: iso(), checkedIn: false, ticketCode: code };
  db.rsvps.push(r);
  if (price > 0) db.payments.push({ id: 'pay_' + nextId('payment'), userId: user.id, kind: 'ticket', refId: r.id, amount: price, ref: ch.ref, createdAt: r.createdAt });
  save();
  return { ok: true, joined, ticket_type: r.ticketType, price_paid: r.pricePaid, event: eventOut(e, user) };
});
route('DELETE', '/api/events/:id/rsvp', ({ params, user }) => {
  needUser(user);
  const i = db.rsvps.findIndex((r) => r.eventId === String(params.id) && r.userId === user.id && r.status === 'CONFIRMED');
  if (i === -1) fail(404, "You don't have a ticket for this event.");
  db.rsvps.splice(i, 1); save();
  return { ok: true };
});

/* 推荐（规则） */
route('POST', '/api/recommend', ({ body, user }) => {
  const interests = (body.interests || []).map((s) => String(s).toLowerCase());
  const from = body.available_from ? new Date(body.available_from).getTime() : Date.now();
  const to = body.available_to ? new Date(body.available_to).getTime() : from + 4 * 3600000;
  const campus = body.origin_campus || (user && user.campusId) || 'mq_sydney';
  const list = db.events.filter((e) => !e.past && e.status === 'PUBLISHED' && new Date(e.startsAt).getTime() >= Date.now() - 3600000);
  const excluded = [], results = [];
  for (const e of list) {
    if (e.audienceScope === 'CAMPUS_ONLY' && e.campusId !== campus) { excluded.push({ event_id: e.id, reason: 'campus_only' }); continue; }
    const s = new Date(e.startsAt).getTime(), en = new Date(e.endsAt).getTime();
    if (Math.min(en, to) - Math.max(s, from) < 30 * 60000) { excluded.push({ event_id: e.id, reason: 'time_window' }); continue; }
    const soc = byId(db.societies, e.societyId) || {};
    const hits = (soc.tags || []).filter((t) => interests.includes(String(t).toLowerCase()));
    const sameCampus = e.campusId === campus;
    if (!hits.length && !sameCampus) { excluded.push({ event_id: e.id, reason: 'no_interest_match' }); continue; }
    const score = hits.length * 3 + (sameCampus ? 2 : 0) + (e.pricePublic === 0 ? 1 : 0);
    const when = new Date(e.startsAt).toLocaleString('en-AU', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
    results.push({
      event_id: e.id, score,
      match_reason: `${when} fits your window${sameCampus ? '' : ', same city'}${hits.length ? ', matches ' + hits.join(' & ') : ''}${e.pricePublic === 0 ? ', and it is free' : ''}.`,
      match_tags: [...hits, e.audienceScope === 'OPEN_TO_ALL' ? 'open_to_all' : 'campus_only'],
      has_time_conflict: false, travel_minutes: sameCampus ? 12 : 24, event: eventOut(e, user),
    });
  }
  results.sort((a, b) => b.score - a.score);
  return { results: results.slice(0, 6), considered: list.length, excluded: excluded.slice(0, 8) };
});

/* 主办方：社团主页数据 */
function cumulativeSeries(events, days = 14) {
  const now = new Date(); now.setHours(23, 59, 59, 999);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayEnd = new Date(now.getTime() - i * 86400000);
    const total = db.rsvps.filter((r) => r.status === 'CONFIRMED' && events.some((e) => e.id === r.eventId) && new Date(r.createdAt) <= dayEnd).length;
    out.push({ date: dayEnd.toISOString().slice(0, 10), cumulative: total });
  }
  return out;
}
route('GET', '/api/exec/members', ({ user }) => {
  needExec(user);
  const club = byId(db.societies, user.societyId) || fail(404, 'No society linked.');
  const rows = db.memberships.filter((m) => m.societyId === club.id).map((m) => {
    const u = byId(db.users, m.userId) || {};
    return { id: m.id, name: u.name || 'Student', email: u.email || '', campus_id: u.campusId, joined_at: m.joinedAt, price_paid: m.pricePaid };
  }).sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));
  return { society: societyOut(club, user), count: rows.length, members: rows };
});

route('POST', '/api/exec/scan', async ({ user, body }) => {
  needExec(user);
  const raw = String(body.code || '').trim();
  const m = raw.match(/checkin\/([A-Za-z0-9]+)/);
  const code = (m ? m[1] : raw.replace(/[^A-Za-z0-9]/g, '')).toUpperCase();
  if (!code) fail(400, 'Paste a ticket code or the link inside the QR.');
  const rsvp = db.rsvps.find((r) => (r.ticketCode || '').toUpperCase() === code && r.status === 'CONFIRMED');
  if (!rsvp) fail(404, 'No ticket found for that code.');
  const ev = byId(db.events, rsvp.eventId);
  if (ev && ev.societyId !== user.societyId) fail(403, 'That ticket belongs to another society.');
  if (rsvp.checkedIn) return { ok: true, already: true, attendee: { name: (byId(db.users, rsvp.userId) || {}).name || 'Student', event: ev ? ev.title : '', checked_in_at: rsvp.checkedInAt } };
  rsvp.checkedIn = true; rsvp.checkedInAt = iso(); save();
  return { ok: true, attendee: { name: (byId(db.users, rsvp.userId) || {}).name || 'Student', event: ev ? ev.title : '', checked_in_at: rsvp.checkedInAt } };
});

route('GET', '/api/exec/hub', ({ user }) => {
  needExec(user);
  const club = byId(db.societies, user.societyId) || fail(404, 'No society linked to this account.');
  const events = db.events.filter((e) => e.societyId === club.id).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const upcoming = events.filter((e) => !e.past);
  const past = events.filter((e) => e.past).sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
  const allRsvps = db.rsvps.filter((r) => events.some((e) => e.id === r.eventId) && r.status === 'CONFIRMED');
  const members = db.memberships.filter((m) => m.societyId === club.id);
  const reviews = db.reviews.filter((r) => r.societyId === club.id);
  const agg = ratingOf(club.id);
  return {
    society: societyOut(club, user),
    stats: {
      members: members.length, members_24h: members.filter((m) => Date.now() - new Date(m.joinedAt) < 86400000).length,
      followers: club.followers || 0,
      rsvps_total: allRsvps.length, rsvps_24h: allRsvps.filter((r) => Date.now() - new Date(r.createdAt) < 86400000).length,
      events_upcoming: upcoming.length, events_past: past.length,
      revenue: allRsvps.reduce((s, r) => s + (r.pricePaid || 0), 0) + members.reduce((s, m) => s + (m.pricePaid || 0), 0),
      rating: agg.rating, review_count: agg.review_count,
      capacity_total: upcoming.reduce((s, e) => s + (e.capacity || 0), 0),
      rsvps_upcoming: upcoming.reduce((s, e) => s + rsvpCount(e.id), 0),
    },
    series: cumulativeSeries(events, 14),
    upcoming: upcoming.map((e) => ({ ...eventOut(e, user), attendees_sample: confirmed(e.id).slice(0, 5).map((r) => (byId(db.users, r.userId) || {}).name || 'Student') })),
    past: past.map((e) => ({ id: e.id, title: e.title, starts_at: e.startsAt, image: e.coverImageUrl, attendance: rsvpCount(e.id), capacity: e.capacity, venue: e.venue })),
    reviews: reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12).map((r) => ({ id: r.id, display_name: r.displayName, rating: r.rating, text: r.text, created_at: r.createdAt })),
    gallery: past.slice(0, 8).map((e) => ({ id: e.id, image: e.coverImageUrl, title: e.title, date: e.startsAt })),
  };
});
route('GET', '/api/exec/dashboard', ({ user, query }) => {
  needExec(user);
  const club = byId(db.societies, user.societyId) || fail(404, 'No society linked.');
  let e = query.event_id ? byId(db.events, query.event_id) : null;
  if (!e) e = db.events.filter((x) => x.societyId === club.id && !x.past).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
  if (!e) fail(404, 'Create an event first.');
  const rsvps = confirmed(e.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const now = new Date(); now.setHours(23, 59, 59, 999);
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const dayEnd = new Date(now.getTime() - i * 86400000);
    const c = rsvps.filter((r) => new Date(r.createdAt) <= dayEnd).length;
    series.push({ date: dayEnd.toISOString().slice(0, 10), cumulative: c });
  }
  const filled = rsvps.length;
  const pct = e.capacity ? filled / e.capacity : null;
  const daysToEvent = Math.max(0, Math.ceil((new Date(e.startsAt).getTime() - Date.now()) / 86400000));
  const last7 = series.slice(-8);
  const rate = last7.length > 1 ? (last7[last7.length - 1].cumulative - last7[0].cumulative) / Math.max(1, last7.length - 1) : 0;
  const projected = Math.min(e.capacity || 9999, Math.round(filled + rate * daysToEvent));
  return {
    event: eventOut(e, user), society: societyOut(club, user),
    stats: {
      rsvp_count: filled, capacity: e.capacity, capacity_filled_rate: pct,
      needed_to_fill: e.capacity == null ? null : Math.max(0, e.capacity - filled),
      page_views: e.pageViews || 0, view_to_rsvp_rate: e.pageViews ? filled / e.pageViews : null,
      rsvps_24h: rsvps.filter((r) => Date.now() - new Date(r.createdAt) < 86400000).length,
      days_to_event: daysToEvent, projected_final: projected,
      members: db.memberships.filter((m) => m.societyId === club.id).length,
      member_ticket_share: filled ? Math.round(100 * rsvps.filter((r) => r.ticketType === 'member').length / filled) : 0,
      revenue: rsvps.reduce((s, r) => s + (r.pricePaid || 0), 0),
    },
    series,
    attendees: rsvps.slice(0, 60).map((r) => { const u = byId(db.users, r.userId) || {}; return { id: r.id, display_name: u.name || 'Student', email: u.email || '', campus_id: u.campusId, status: r.status, ticket_type: r.ticketType, price_paid: r.pricePaid, created_at: r.createdAt, ticket_code: r.ticketCode || null, checked_in: !!r.checkedIn }; }),
  };
});
route('POST', '/api/exec/events', async ({ user, body }) => {
  needExec(user);
  const club = byId(db.societies, user.societyId) || fail(404, 'No society linked.');
  const title = String(body.title || '').trim(), venue = String(body.venue || '').trim();
  const starts = new Date(body.starts_at || '');
  if (!title) fail(400, 'Give the event a name.');
  if (!venue) fail(400, 'Where is it happening?');
  if (isNaN(starts.getTime())) fail(400, 'Pick a start date and time.');
  if (starts.getTime() < Date.now()) fail(400, 'Pick a start time in the future.');
  const cap = body.capacity == null ? null : Math.floor(Number(body.capacity));
  if (cap != null && !(cap > 0 && cap <= 5000)) fail(400, 'Capacity must be between 1 and 5000.');
  const v = (db.venues || []).find((x) => x.name === venue);
  const cat = ['outdoors', 'social', 'creative', 'sport', 'careers', 'other'].includes(body.category) ? body.category : 'other';
  const e = {
    id: 'evt_' + nextId('event'), title: title.slice(0, 120), description: String(body.description || '').slice(0, 800),
    category: cat, campusId: club.campusId, campusName: campusOf(club.campusId).name,
    venue, venueCoords: v ? v.coords : (CAMPUS_COORDS[club.campusId] || [-33.87, 151.21]),
    startsAt: starts.toISOString(), endsAt: new Date(starts.getTime() + Math.min(12, Math.max(0.5, Number(body.duration_hours) || 2)) * 3600000).toISOString(),
    audienceScope: body.audience_scope === 'CAMPUS_ONLY' ? 'CAMPUS_ONLY' : 'OPEN_TO_ALL',
    societyId: club.id, societyName: club.name,
    coverImageUrl: body.cover_image_url || '/assets/events/ev' + (1 + (nextId('event') % 31)) + '.jpg',
    capacity: cap, status: 'PUBLISHED', pageViews: 0, past: false,
    priceMember: Math.max(0, Number(body.price_member) || 0),
    pricePublic: Math.max(0, Number(body.price_public) || Number(body.price_member) || 0),
    createdAt: iso(),
  };
  db.events.push(e); save();
  return { ok: true, event: eventOut(e, user) };
});
route('GET', '/api/exec/events/:id/attendees', ({ params, user }) => {
  needExec(user);
  const e = byId(db.events, params.id);
  if (!e || e.societyId !== user.societyId) fail(404, 'Event not found.');
  const rows = confirmed(e.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((r) => {
    const u = byId(db.users, r.userId) || {};
    return { id: r.id, display_name: u.name || 'Student', email: u.email || '', campus_id: u.campusId, ticket_type: r.ticketType, price_paid: r.pricePaid, status: r.status, created_at: r.createdAt, checked_in: !!r.checkedIn, ticket_code: r.ticketCode || null };
  });
  return { event: eventOut(e, user), count: rows.length, attendees: rows };
});
route('POST', '/api/dev/reset', ({ user }) => {
  needExec(user);
  const fresh = buildSeed(hashPassword);
  fresh.sessions = db.sessions;
  db = fresh; save();
  return { ok: true };
});

/* ---------- 服务器 ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (!p.startsWith('/api/') && p !== '/_sym/health') return serveStatic(req, res, p);
  const r = routes.find((rt) => rt.method === req.method && rt.re.test(p));
  if (!r) return send(res, 404, { error: 'Not found' });
  try {
    const m = p.match(r.re);
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
    const out = await r.handler({ req, res, params, body, user: currentUser(req), query: Object.fromEntries(url.searchParams) });
    const headers = out && out.__headers ? out.__headers : {};
    if (out && out.__headers) delete out.__headers;
    send(res, 200, out, headers);
  } catch (err) {
    if (!err.status) console.error(err);
    const payload = { error: err.status ? err.message : 'Something went wrong. Try again.' };
    if (err.price) payload.price = err.price;
    send(res, err.status || 500, payload);
  }
});
server.listen(PORT, '0.0.0.0', () => console.log(`UniLoop v2 on http://localhost:${PORT}`));
