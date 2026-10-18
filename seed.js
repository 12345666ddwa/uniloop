// seed.js — v3：优先使用队友提供的真实数据（data-real.json），并生成演示账号/会员/报名
'use strict';

const fs = require('fs');
const path = require('path');

const CAMPUSES = [
  { id: 'mq_sydney', name: 'Macquarie University', short: 'MQ', city: 'Sydney', logo: '/assets/schools/mq.png' },
  { id: 'usyd_camperdown', name: 'University of Sydney', short: 'USYD', city: 'Sydney', logo: '/assets/schools/usyd.svg' },
  { id: 'unsw_kensington', name: 'UNSW Sydney', short: 'UNSW', city: 'Sydney', logo: '/assets/schools/unsw.png' },
  { id: 'uts_haymarket', name: 'University of Technology Sydney', short: 'UTS', city: 'Sydney', logo: '/assets/schools/uts.svg' },
  { id: 'wsu_parramatta', name: 'Western Sydney University', short: 'WSU', city: 'Sydney', logo: '/assets/schools/wsu.png' },
];
const COLORS = ['#1F4A3B', '#D8583A', '#B4622E', '#2E5E8C', '#7A3E6B', '#6B7280'];
const NAMES = ['Amelia Chen', 'Noah Williams', 'Priya Sharma', 'Oliver Nguyen', 'Hana Tanaka', 'Kai Patel', 'Ruby Park', 'Arjun Singh', 'Ella Wang', 'Teo Costa', 'Zoe Martin', 'Hugo Fischer', 'Ivy Ibrahim', 'Sam Lee', 'Nina Brown', 'Omar Ali'];
const REVIEW_TEXTS = [
  'Turned up alone and left with new friends. Exactly what I needed.',
  'Organisers were on time, the plan was clear, and the price was fair.',
  'Small group, good pace, no pressure. Coming again.',
  'Best value event this semester.',
  'A bit crowded at the start, but the second half was great.',
  'Would have liked it to run longer.',
  'Super welcoming to first-years. Recommend.',
];

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''); }
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

function loadReal() {
  const p = path.join(__dirname, 'data-real.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function buildSeed(hashPassword) {
  const now = Date.now();
  const DAY = 86400000;
  const iso = (ms) => new Date(ms).toISOString();
  const seq = { user: 0, society: 0, event: 0, rsvp: 0, membership: 0, payment: 0, review: 0 };

  const real = loadReal();
  let societies, events;

  if (real && real.clubs && real.clubs.length) {
    societies = real.clubs.map((c, i) => ({
      id: c.id, name: c.name, campusId: c.campusId, tags: c.tags || ['other'],
      membershipPrice: Number(c.membershipPrice) || 0, followers: Number(c.followers) || 100,
      blurb: c.blurb || '', color: COLORS[hash(c.id) % COLORS.length], type: c.type || 'Society',
      socials: {
        instagram: 'https://www.instagram.com/explore/search/keyword/?q=' + encodeURIComponent(c.name),
        luma: 'https://lu.ma/search?q=' + encodeURIComponent(c.name),
        web: 'https://www.google.com/search?q=' + encodeURIComponent(c.name + ' ' + (c.uni || '') + ' society'),
      },
      createdAt: iso(now - (400 - (i % 300)) * DAY),
    }));
    events = real.events.map((e, i) => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      category: e.category || 'other',
      campusId: e.campusId,
      campusName: e.campusName,
      venue: e.venue,
      venueCoords: e.venueCoords,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      audienceScope: (hash(e.id + e.title) % 10 < 3) ? 'CAMPUS_ONLY' : 'OPEN_TO_ALL',
      societyId: e.societyId,
      societyName: e.societyName,
      coverImageUrl: e.coverImageUrl,
      capacity: e.capacity,
      status: 'PUBLISHED',
      pageViews: e.pageViews || 60,
      priceMember: Number(e.priceMember) || 0,
      pricePublic: Number(e.pricePublic) || 0,
      kind: e.kind || '',
      source: e.source || '',
      past: !!e.past,
      createdAt: iso(now - (20 + (i % 40)) * DAY),
    }));
  } else {
    // 兜底：极小数据集（无真实数据时）
    societies = [{ id: 'club_outdoors', name: 'Outdoors Society', campusId: 'mq_sydney', tags: ['outdoors'], membershipPrice: 15, followers: 412, blurb: 'Slow hikes and long lunches.', color: '#1F4A3B', createdAt: iso(now - 400 * DAY) }];
    events = [{
      id: 'ev_1', title: 'Campus hike', description: 'A slow loop with the Outdoors Society.', category: 'outdoors',
      campusId: 'mq_sydney', campusName: 'Macquarie University', venue: 'Macquarie University', venueCoords: [-33.7738, 151.1126],
      startsAt: iso(now + 5 * DAY), endsAt: iso(now + 5 * DAY + 3 * 3600000), audienceScope: 'OPEN_TO_ALL',
      societyId: 'club_outdoors', societyName: 'Outdoors Society', coverImageUrl: '/assets/events/ev1.jpg',
      capacity: 40, status: 'PUBLISHED', pageViews: 120, priceMember: 0, pricePublic: 0, source: '', past: false, createdAt: iso(now - 10 * DAY),
    }];
  }

  const socById = Object.fromEntries(societies.map((s) => [s.id, s]));
  const upcoming = events.filter((e) => !e.past && new Date(e.endsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

  /* ---- 用户 ---- */
  const users = [];
  const mkUser = (id, name, email, campusId, role, societyId, interests) => users.push({
    id, name, email, campusId, role, societyId: societyId || null, interests: interests || [],
    savedEvents: [], ...hashPassword('demo1234'), createdAt: iso(now - 60 * DAY),
  });
  // exec 账号绑定到“活动最多”的社团，保证看板/扫码有内容
  const counts = {};
  events.forEach((e) => { if (!e.past) counts[e.societyId] = (counts[e.societyId] || 0) + 1; });
  const busiestId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const mqClub = socById[busiestId] || societies.find((s) => s.campusId === 'mq_sydney') || societies[0];
  mkUser('usr_student', 'Jamie Chen', 'student@uniloop.demo', 'mq_sydney', 'student', null, ['outdoors', 'social', 'creative']);
  mkUser('usr_exec', 'Jamie Lee', 'exec@uniloop.demo', mqClub.campusId, 'exec', mqClub.id, ['outdoors', 'social']);
  const execClub = mqClub;
  NAMES.forEach((n, i) => {
    const campus = CAMPUSES[i % CAMPUSES.length].id;
    mkUser('usr_' + i, n, slug(n) + '@students.' + campus.split('_')[0] + '.edu.au', campus, 'student', null,
      [['outdoors', 'social', 'creative', 'sport', 'careers', 'other'][i % 6]]);
  });
  const students = users.filter((u) => u.role === 'student');

  /* ---- 会员（exec + 少量学生加入热门社团） ---- */
  const memberships = [];
  const join = (userId, societyId, daysAgo) => {
    const s = socById[societyId]; if (!s) return;
    if (memberships.some((m) => m.userId === userId && m.societyId === societyId)) return;
    memberships.push({ id: 'mem_' + (++seq.membership), userId, societyId, pricePaid: s.membershipPrice, joinedAt: iso(now - daysAgo * DAY) });
  };
  join('usr_exec', execClub.id, 300);
  const popular = societies.slice().sort((a, b) => b.followers - a.followers).slice(0, 8);
  popular.forEach((s, i) => join('usr_' + (i % students.length), s.id, 40 - i * 3));

  /* ---- 报名：主推活动 48，其余 4–30 ---- */
  const rsvps = [];
  const addRsvp = (userId, ev, daysAgo) => {
    if (!ev) return;
    if (rsvps.some((r) => r.userId === userId && r.eventId === ev.id)) return;
    const member = memberships.some((m) => m.userId === userId && m.societyId === ev.societyId);
    rsvps.push({
      id: 'rsvp_' + (++seq.rsvp), eventId: ev.id, userId, status: 'CONFIRMED',
      ticketType: member ? 'member' : 'public', pricePaid: member ? ev.priceMember : ev.pricePublic,
      createdAt: iso(now - daysAgo * DAY - (seq.rsvp % 9) * 3600000),
      checkedIn: false, ticketCode: require('crypto').randomBytes(4).toString('hex').toUpperCase(),
    });
  };
  const hero = upcoming[0];
  for (let i = 0; i < 48; i++) addRsvp(students[i % students.length].id, hero, i < 7 ? 0 : (i % 6) + 1);
  upcoming.slice(1, 120).forEach((ev, i) => {
    const n = 3 + ((i * 5) % 24);
    for (let j = 0; j < n; j++) addRsvp(students[(i * 3 + j) % students.length].id, ev, (j % 6) + 1);
  });

  /* ---- 评价（少量，仅热门社团） ---- */
  const reviews = [];
  popular.slice(0, 6).forEach((s, si) => {
    for (let i = 0; i < 3; i++) {
      reviews.push({
        id: 'rev_' + (++seq.review), societyId: s.id, userId: 'usr_' + ((si + i) % NAMES.length),
        displayName: NAMES[(si + i) % NAMES.length], rating: [5, 4, 5][(si + i) % 3],
        text: REVIEW_TEXTS[(si * 2 + i) % REVIEW_TEXTS.length], createdAt: iso(now - (10 + i * 6) * DAY),
      });
    }
  });

  return {
    seq: { ...seq, user: users.length, society: societies.length, event: events.length, rsvp: rsvps.length },
    campuses: CAMPUSES, societies, users, memberships, events, rsvps, reviews, payments: [], sessions: {},
    meta: {
      seededAt: iso(now),
      source: real ? 'real' : 'fallback',
      note: 'Event & club data imported from the team dataset (includes official event links). Accounts, RSVPs and reviews are demo data.',
    },
  };
}

module.exports = { buildSeed, CAMPUSES };
