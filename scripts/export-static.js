#!/usr/bin/env node
/**
 * export-static.js — 把种子数据导出成静态 JSON，供 Netlify 等纯静态托管使用。
 * 输出：public/data/{campuses,societies,events}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { buildSeed } = require('../seed');

const hashPassword = () => ({ salt: 'static', hash: 'static' });
const db = buildSeed(hashPassword);
const now = Date.now();
const CAMPUS_LOGO = {};

const campuses = db.campuses.map((c) => ({ id: c.id, name: c.name, short: c.short, city: c.city, logo: c.logo }));

const activeIds = new Set(db.events.filter((e) => !e.past).map((e) => e.societyId));
const keep = db.societies.filter((s) => activeIds.has(s.id)).sort((a, b) => b.followers - a.followers).slice(0, 150);
const societies = keep.map((s) => {
  const memberCount = db.memberships.filter((m) => m.societyId === s.id).length;
  const reviews = db.reviews.filter((r) => r.societyId === s.id);
  const rating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;
  return {
    id: s.id, name: s.name, campus_id: s.campusId, campus_name: (db.campuses.find((c) => c.id === s.campusId) || {}).name || '',
    campus_logo: (db.campuses.find((c) => c.id === s.campusId) || {}).logo || '',
    tags: s.tags, blurb: s.blurb, membership_price: s.membershipPrice, followers: s.followers,
    member_count: memberCount, rating, review_count: reviews.length, type: s.type || 'Society',
    socials: s.socials || {}, is_member: false,
  };
});

const socById = Object.fromEntries(societies.map((s) => [s.id, s]));

function eventOut(e) {
  const taken = db.rsvps.filter((r) => r.eventId === e.id && r.status === 'CONFIRMED').length;
  const soc = socById[e.societyId] || {};
  const seatsLeft = e.capacity == null ? null : Math.max(0, e.capacity - taken);
  return {
    id: e.id, title: e.title, description: e.description, category: e.category,
    campus_id: e.campusId, campus_name: e.campusName, campus_logo: (db.campuses.find((c) => c.id === e.campusId) || {}).logo || '',
    venue: e.venue, venue_coords: e.venueCoords,
    starts_at: e.startsAt, ends_at: e.endsAt, audience_scope: e.audienceScope,
    society_id: e.societyId, society_name: e.societyName, society_logo: soc.campus_logo || '',
    society_rating: soc.rating == null ? null : Math.round(soc.rating * 10) / 10,
    society_membership_price: soc.membership_price ?? null,
    cover_image_url: e.coverImageUrl, capacity: e.capacity, status: e.status,
    page_views: e.pageViews || 0, rsvp_count: taken, seats_left: seatsLeft,
    price_member: e.priceMember, price_public: e.pricePublic, your_price: e.pricePublic,
    source: e.source || '', kind: e.kind || '', past: !!e.past,
    is_saved: false, my_rsvp: null,
    map: {
      osm_embed: 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        [(e.venueCoords || [0, 0])[1] - 0.01, (e.venueCoords || [0, 0])[0] - 0.008,
         (e.venueCoords || [0, 0])[1] + 0.01, (e.venueCoords || [0, 0])[0] + 0.008].join('%2C') +
        '&layer=mapnik&marker=' + (e.venueCoords || [0, 0]).join('%2C'),
      google_directions: 'https://www.google.com/maps/dir/?api=1&destination=' + (e.venueCoords || [0, 0]).join('%2C'),
      apple_maps: 'https://maps.apple.com/?daddr=' + (e.venueCoords || [0, 0]).join('%2C'),
    },
  };
}

const events = db.events.filter((e) => !e.past && new Date(e.startsAt).getTime() > now).map(eventOut);
const stats = {
  generated_at: new Date().toISOString(),
  events: events.length,
  societies: societies.length,
  note: 'Static snapshot exported from the seed data. RSVPs and saves are stored in this browser only.',
};

const outDir = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(outDir, { recursive: true });
const write = (name, obj) => {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(obj));
  console.log('wrote public/data/' + name, (fs.statSync(path.join(outDir, name)).size / 1024).toFixed(0) + 'KB');
};
write('campuses.json', { campuses });
write('societies.json', { societies, total: societies.length });
write('events.json', { events, total: events.length });
write('meta.json', stats);
// 静态模式下的演示评价（按社团）
write('reviews.json', { reviews: db.reviews.map((r) => ({ id: r.id, society_id: r.societyId, display_name: r.displayName, rating: r.rating, text: r.text, created_at: r.createdAt })) });
console.log('done:', stats.events, 'events /', stats.societies, 'societies');
