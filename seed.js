// seed.js — 种子数据 v2：5 校（含校徽）、12 社团（评分/关注/相册）、31 场活动（独立图片 + 坐标）、过往活动、评价
'use strict';

const CAMPUSES = [
  { id: 'mq_sydney', name: 'Macquarie University', short: 'MQ', city: 'Sydney', logo: '/assets/schools/mq.png', domain: 'mq.edu.au' },
  { id: 'usyd_camperdown', name: 'University of Sydney', short: 'USYD', city: 'Sydney', logo: '/assets/schools/usyd.svg', domain: 'sydney.edu.au' },
  { id: 'unsw_kensington', name: 'UNSW Sydney', short: 'UNSW', city: 'Sydney', logo: '/assets/schools/unsw.png', domain: 'unsw.edu.au' },
  { id: 'uts_haymarket', name: 'University of Technology Sydney', short: 'UTS', city: 'Sydney', logo: '/assets/schools/uts.svg', domain: 'uts.edu.au' },
  { id: 'wsu_parramatta', name: 'Western Sydney University', short: 'WSU', city: 'Sydney', logo: '/assets/schools/wsu.png', domain: 'westernsydney.edu.au' },
];

// 13 个真实场地（近似坐标，用于地图与导航）
const VENUES = [
  { name: 'Macquarie University', campusId: 'mq_sydney', coords: [-33.7738, 151.1126] },
  { name: 'Library lawn, Macquarie', campusId: 'mq_sydney', coords: [-33.7753, 151.1143] },
  { name: 'Sport & Aquatic Centre, Macquarie', campusId: 'mq_sydney', coords: [-33.7762, 151.1170] },
  { name: 'MQ Incubator, Macquarie', campusId: 'mq_sydney', coords: [-33.7731, 151.1112] },
  { name: 'Manning House, Camperdown', campusId: 'usyd_camperdown', coords: [-33.8894, 151.1874] },
  { name: 'Eastern Avenue lawns, Camperdown', campusId: 'usyd_camperdown', coords: [-33.8880, 151.1900] },
  { name: 'Tin Sheds studio, Darlington', campusId: 'usyd_camperdown', coords: [-33.8915, 151.1930] },
  { name: 'Quadrangle lawn, Kensington', campusId: 'unsw_kensington', coords: [-33.9173, 151.2313] },
  { name: 'Roundhouse, Kensington', campusId: 'unsw_kensington', coords: [-33.9160, 151.2290] },
  { name: 'UTS Tower, Haymarket', campusId: 'uts_haymarket', coords: [-33.8825, 151.2000] },
  { name: 'Alumni Green, Ultimo', campusId: 'uts_haymarket', coords: [-33.8830, 151.1990] },
  { name: 'Parramatta campus lawn', campusId: 'wsu_parramatta', coords: [-33.8120, 150.9940] },
  { name: 'Building EQ, Parramatta', campusId: 'wsu_parramatta', coords: [-33.8108, 150.9960] },
];

const SOCIETIES = [
  { id: 'soc_outdoors', name: 'Outdoors Society', campusId: 'mq_sydney', tags: ['outdoors'], membershipPrice: 15, followers: 412, blurb: 'Slow hikes, long lunches, occasional rain. We walk, we swim, we eat.' },
  { id: 'soc_student_life', name: 'Student Life Society', campusId: 'mq_sydney', tags: ['social'], membershipPrice: 0, followers: 980, blurb: 'Free food, blankets on the lawn, and whoever turns up.' },
  { id: 'soc_makers', name: 'Makers Society', campusId: 'mq_sydney', tags: ['creative'], membershipPrice: 20, followers: 265, blurb: 'Clay, print, zines — things you can hold in your hands.' },
  { id: 'soc_run_club', name: 'Campus Run Club', campusId: 'mq_sydney', tags: ['sport'], membershipPrice: 10, followers: 338, blurb: 'Conversational pace. Nobody gets dropped. Coffee after.' },
  { id: 'soc_tech', name: 'Tech Society', campusId: 'mq_sydney', tags: ['careers', 'other'], membershipPrice: 12, followers: 620, blurb: 'Build nights, talks, and too much coffee.' },
  { id: 'soc_usyd_arts', name: 'Arts Society', campusId: 'usyd_camperdown', tags: ['creative'], membershipPrice: 18, followers: 455, blurb: 'Galleries, zines, and long conversations about nothing.' },
  { id: 'soc_usyd_sport', name: 'Sydney Uni Sport', campusId: 'usyd_camperdown', tags: ['sport'], membershipPrice: 25, followers: 701, blurb: 'Casual games, serious snacks.' },
  { id: 'soc_unsw_social', name: 'Kensington Social', campusId: 'unsw_kensington', tags: ['social'], membershipPrice: 0, followers: 540, blurb: 'Picnics, trivia, newcomers especially welcome.' },
  { id: 'soc_unsw_outdoors', name: 'UNSW Outdoors', campusId: 'unsw_kensington', tags: ['outdoors'], membershipPrice: 20, followers: 388, blurb: 'Coast walks, camping weekends, sunrise swims.' },
  { id: 'soc_uts_design', name: 'UTS Design Collective', campusId: 'uts_haymarket', tags: ['creative', 'careers'], membershipPrice: 15, followers: 312, blurb: 'Design crits, portfolio nights, studio tours.' },
  { id: 'soc_uts_food', name: 'UTS Food Society', campusId: 'uts_haymarket', tags: ['social', 'other'], membershipPrice: 8, followers: 823, blurb: 'Night markets, dumpling crawls, recipes worth stealing.' },
  { id: 'soc_wsu_careers', name: 'WSU Careers Society', campusId: 'wsu_parramatta', tags: ['careers'], membershipPrice: 0, followers: 196, blurb: 'Internship panels, CV clinics, alumni coffees.' },
];

const UPCOMING = [
  // [title, category, societyId, daysAhead, startHour, duration, scope, venueIdx, capacity, priceMember, pricePublic]
  ['Sydney campus hike', 'outdoors', 'soc_outdoors', 7, 9, 2.5, 'OPEN_TO_ALL', 4, 60, 0, 0],
  ['The big lawn picnic', 'social', 'soc_student_life', 6, 12.5, 2.5, 'OPEN_TO_ALL', 5, 80, 0, 0],
  ['Clay, coffee & good company', 'creative', 'soc_makers', 8, 10, 2.5, 'CAMPUS_ONLY', 6, 25, 10, 18],
  ['Run club: easy 5K', 'sport', 'soc_run_club', 10, 7, 0.75, 'OPEN_TO_ALL', 1, 50, 0, 0],
  ['Sunset sketch club', 'creative', 'soc_makers', 3, 17, 2, 'OPEN_TO_ALL', 6, 24, 8, 14],
  ['Harbour walk & coffee', 'outdoors', 'soc_unsw_outdoors', 4, 8, 3, 'OPEN_TO_ALL', 7, 40, 0, 5],
  ['Trivia night: bring a team', 'social', 'soc_unsw_social', 2, 18.5, 2, 'OPEN_TO_ALL', 8, 90, 0, 3],
  ['Portfolio night with studios', 'careers', 'soc_uts_design', 5, 18, 2.5, 'CAMPUS_ONLY', 9, 60, 5, 12],
  ['Night market crawl', 'social', 'soc_uts_food', 3, 19, 3, 'OPEN_TO_ALL', 10, 45, 6, 12],
  ['Internship panel: tech', 'careers', 'soc_tech', 6, 17.5, 1.5, 'CAMPUS_ONLY', 3, 80, 0, 0],
  ['Build night: ship something small', 'other', 'soc_tech', 2, 18, 2.5, 'OPEN_TO_ALL', 3, 40, 0, 0],
  ['Beach volleyball social', 'sport', 'soc_usyd_sport', 9, 15, 2, 'OPEN_TO_ALL', 5, 36, 4, 8],
  ['Zine workshop', 'creative', 'soc_usyd_arts', 7, 14, 2.5, 'CAMPUS_ONLY', 6, 20, 6, 12],
  ['Coast walk: Bondi to Coogee', 'outdoors', 'soc_unsw_outdoors', 11, 8.5, 3.5, 'OPEN_TO_ALL', 7, 30, 0, 4],
  ['Dumpling making night', 'social', 'soc_uts_food', 6, 18, 2.5, 'OPEN_TO_ALL', 10, 28, 8, 15],
  ['CV clinic: 15-minute reviews', 'careers', 'soc_wsu_careers', 5, 13, 3, 'CAMPUS_ONLY', 12, 40, 0, 0],
  ['Morning swim club', 'sport', 'soc_run_club', 4, 6.5, 1, 'OPEN_TO_ALL', 2, 30, 0, 0],
  ['Film photo walk', 'creative', 'soc_makers', 9, 16, 2.5, 'OPEN_TO_ALL', 1, 22, 5, 10],
  ['Board games & bubble tea', 'social', 'soc_student_life', 3, 17, 3, 'OPEN_TO_ALL', 0, 50, 0, 5],
  ['Sunrise yoga on the lawn', 'other', 'soc_student_life', 8, 7, 1, 'OPEN_TO_ALL', 1, 35, 0, 0],
  ['Blue Mountains day hike', 'outdoors', 'soc_outdoors', 12, 7.5, 8, 'OPEN_TO_ALL', 0, 24, 12, 20],
  ['Design crit: bring work', 'careers', 'soc_uts_design', 10, 17, 2, 'CAMPUS_ONLY', 9, 30, 0, 6],
  ['Coffee & careers: alumni', 'careers', 'soc_tech', 12, 16, 1.5, 'OPEN_TO_ALL', 3, 45, 0, 0],
  ['Rooftop movie night', 'social', 'soc_usyd_arts', 11, 19.5, 2.5, 'OPEN_TO_ALL', 5, 70, 5, 10],
  ['Track session: intervals', 'sport', 'soc_usyd_sport', 7, 6.5, 1, 'OPEN_TO_ALL', 5, 40, 0, 0],
  ['Pottery: glazing day', 'creative', 'soc_makers', 13, 11, 3, 'CAMPUS_ONLY', 6, 18, 10, 18],
  ['Careers fair warm-up', 'careers', 'soc_wsu_careers', 9, 12, 2, 'OPEN_TO_ALL', 12, 60, 0, 0],
  ['Lake loop walk', 'outdoors', 'soc_outdoors', 5, 9, 2, 'CAMPUS_ONLY', 1, 28, 0, 4],
  ['Games night: retro', 'social', 'soc_unsw_social', 8, 18, 3, 'OPEN_TO_ALL', 8, 44, 0, 3],
  ['Pitch night: 3-minute ideas', 'other', 'soc_tech', 13, 18.5, 2, 'OPEN_TO_ALL', 3, 60, 0, 0],
  ['Kickabout: casual football', 'sport', 'soc_unsw_social', 6, 16, 1.5, 'OPEN_TO_ALL', 7, 32, 0, 0],
];

const PAST = [
  ['Sunrise hike: Spit to Manly', 'outdoors', 'soc_outdoors', 21, 264, 4.8],
  ['Welcome picnic', 'social', 'soc_student_life', 28, 312, 4.6],
  ['Raku firing day', 'creative', 'soc_makers', 35, 96, 4.9],
  ['City2Surf training run', 'sport', 'soc_run_club', 18, 140, 4.4],
  ['Build night: agents 101', 'other', 'soc_tech', 25, 118, 4.7],
  ['Gallery hop: Chippendale', 'creative', 'soc_usyd_arts', 30, 88, 4.5],
  ['Social sport gala', 'sport', 'soc_usyd_sport', 26, 205, 4.3],
  ['Trivia grand final', 'social', 'soc_unsw_social', 19, 176, 4.8],
  ['Camping: Royal National Park', 'outdoors', 'soc_unsw_outdoors', 33, 84, 4.9],
  ['Portfolio review night', 'careers', 'soc_uts_design', 22, 102, 4.6],
  ['Hawker crawl', 'social', 'soc_uts_food', 20, 190, 4.7],
  ['CV clinic marathon', 'careers', 'soc_wsu_careers', 27, 74, 4.2],
];

const REVIEW_TEXTS = [
  'Turned up alone and left with four new friends. Exactly what I needed.',
  'Organisers were on time, the plan was clear, and the price was honestly fair.',
  'Small group, good pace, no pressure to be good at it. Coming again.',
  'Best value event I have been to this semester.',
  'A bit crowded at the start, but the second half was great.',
  'Loved the photos afterwards — nice touch.',
  'Would have liked it to run longer.',
  'Super welcoming to first-years. Recommend.',
];

const NAMES = ['Amelia Chen', 'Noah Williams', 'Priya Sharma', 'Oliver Nguyen', 'Hana Tanaka', 'Kai Patel', 'Ruby Park', 'Arjun Singh', 'Ella Wang', 'Teo Costa', 'Zoe Martin', 'Hugo Fischer', 'Ivy Ibrahim', 'Sam Lee', 'Nina Brown', 'Omar Ali'];

function buildSeed(hashPassword) {
  const now = Date.now();
  const DAY = 86400000;
  const iso = (ms) => new Date(ms).toISOString();
  const seq = { user: 0, event: 0, rsvp: 0, membership: 0, payment: 0, review: 0 };

  const societies = SOCIETIES.map((s) => ({ ...s, createdAt: iso(now - 400 * DAY) }));
  const socById = Object.fromEntries(societies.map((s) => [s.id, s]));

  const events = [];
  let imgIdx = 0;
  const addEvent = (title, category, societyId, daysAhead, startHour, duration, scope, venueIdx, capacity, pm, pp, past) => {
    const soc = socById[societyId];
    const venue = VENUES[venueIdx] || VENUES[0];
    const start = new Date(now + daysAhead * DAY);
    start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    imgIdx += 1;
    events.push({
      id: (past ? 'evp_' : 'evt_') + (++seq.event),
      title, description: `${title} with ${soc.name}. Sample data for the demo — ${category} event on campus.`,
      category, campusId: soc.campusId, campusName: (CAMPUSES.find((c) => c.id === soc.campusId) || {}).name,
      venue: venue.name, venueCoords: venue.coords,
      startsAt: start.toISOString(), endsAt: new Date(start.getTime() + duration * 3600000).toISOString(),
      audienceScope: scope, societyId, societyName: soc.name,
      coverImageUrl: '/assets/events/ev' + (imgIdx <= 31 ? imgIdx : ((imgIdx - 1) % 31) + 1) + '.jpg',
      capacity, status: 'PUBLISHED', pageViews: 60 + ((imgIdx * 53) % 320),
      priceMember: pm, pricePublic: pp, past: !!past, createdAt: iso(now - (past ? 40 : 12) * DAY),
    });
  };
  UPCOMING.forEach((r) => addEvent(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], false));
  PAST.forEach((r) => addEvent(r[0], r[1], r[2], -Math.abs(r[3]), 10, 3, 'OPEN_TO_ALL', 0, r[4], 0, 0, true));
  // 每个社团再补一场更早的过往活动（相册更真实）
  PAST.forEach((r) => addEvent(r[0] + ' (semester 1)', r[1], r[2], -(Math.abs(r[3]) + 60), 11, 3, 'OPEN_TO_ALL', 1, Math.max(12, r[4] - 30), 0, 0, true));

  const users = [];
  const mkUser = (id, name, email, campusId, role, societyId, interests) => {
    users.push({ id, name, email, campusId, role, societyId: societyId || null, interests, savedEvents: [], ...hashPassword('demo1234'), createdAt: iso(now - 60 * DAY) });
  };
  mkUser('usr_student', 'Jamie Chen', 'student@uniloop.demo', 'mq_sydney', 'student', null, ['outdoors', 'social', 'creative']);
  mkUser('usr_exec', 'Jamie Lee', 'exec@uniloop.demo', 'mq_sydney', 'exec', 'soc_outdoors', ['outdoors', 'social']);
  mkUser('usr_exec2', 'Priya Sharma', 'exec2@uniloop.demo', 'usyd_camperdown', 'exec', 'soc_usyd_arts', ['creative']);
  NAMES.forEach((n, i) => {
    const campus = CAMPUSES[i % CAMPUSES.length].id;
    mkUser('usr_' + i, n, n.toLowerCase().replace(/[^a-z]+/g, '.') + '@students.' + campus.split('_')[0] + '.edu.au', campus, 'student', null, [['outdoors', 'social', 'creative', 'sport', 'careers', 'other'][i % 6]]);
  });

  const memberships = [];
  const join = (userId, societyId, daysAgo) => memberships.push({ id: 'mem_' + (++seq.membership), userId, societyId, pricePaid: socById[societyId].membershipPrice, joinedAt: iso(now - daysAgo * DAY) });
  join('usr_exec', 'soc_outdoors', 300);
  join('usr_amelia' in {} ? 'usr_0' : 'usr_0', 'soc_outdoors', 40);
  join('usr_1', 'soc_outdoors', 30);
  join('usr_2', 'soc_run_club', 22);
  join('usr_3', 'soc_makers', 18);
  join('usr_4', 'soc_makers', 12);
  join('usr_5', 'soc_tech', 9);
  join('usr_exec2', 'soc_usyd_arts', 280);
  join('usr_6', 'soc_usyd_arts', 60);
  join('usr_7', 'soc_uts_food', 55);
  join('usr_8', 'soc_unsw_outdoors', 48);
  join('usr_9', 'soc_student_life', 44);

  // RSVP：主推活动 48 人（7 人在 24h 内），其余按天分布
  const rsvps = [];
  const students = users.filter((u) => u.role === 'student');
  const addRsvp = (userId, ev, daysAgo) => {
    if (rsvps.some((r) => r.userId === userId && r.eventId === ev.id)) return;
    const member = memberships.some((m) => m.userId === userId && m.societyId === ev.societyId);
    rsvps.push({ id: 'rsvp_' + (++seq.rsvp), eventId: ev.id, userId, status: 'CONFIRMED', ticketType: member ? 'member' : 'public', pricePaid: member ? ev.priceMember : ev.pricePublic, createdAt: iso(now - daysAgo * DAY - (seq.rsvp % 9) * 3600000) });
  };
  const upcomingEvents = events.filter((e) => !e.past);
  const hero = upcomingEvents[0];
  for (let i = 0; i < 48; i++) addRsvp(students[i % students.length].id, hero, i < 7 ? 0 : (i % 6) + 1);
  upcomingEvents.slice(1).forEach((ev, i) => {
    const n = 5 + ((i * 7) % 30);
    for (let j = 0; j < n; j++) addRsvp(students[(i * 3 + j) % students.length].id, ev, (j % 6) + 1);
  });

  // 评价
  const reviews = [];
  SOCIETIES.forEach((s, si) => {
    const count = 2 + (si % 4);
    for (let i = 0; i < count; i++) {
      reviews.push({
        id: 'rev_' + (++seq.review), societyId: s.id,
        userId: 'usr_' + ((si + i) % NAMES.length),
        displayName: NAMES[(si + i) % NAMES.length],
        rating: [5, 4, 5, 3, 4][(si + i) % 5],
        text: REVIEW_TEXTS[(si * 2 + i) % REVIEW_TEXTS.length],
        createdAt: iso(now - (12 + i * 7) * DAY),
      });
    }
  });

  return {
    seq, campuses: CAMPUSES, venues: VENUES, societies, users, memberships, events, rsvps, reviews, payments: [],
    sessions: {},
    meta: { seededAt: iso(now), note: 'Synthetic sample data. Society names are real public clubs; events, people, reviews and payments are fictional. School marks are used for identification only.' },
  };
}

module.exports = { buildSeed, CAMPUSES, VENUES };
