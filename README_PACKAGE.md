# UniLoop

Campus events + club memberships + a live organiser view — in one place.

Zero dependencies. Node 18+ only. No `npm install`, no build step.

## Run it

```
node server.js
```

- Default port: `3000` (override with `PORT=3400 node server.js`)
- Data is written to `.sym-data/uniloop-db.json` (survives restarts)
- Reset to fresh seed data: delete `.sym-data/uniloop-db.json` and restart
- Health check: `GET /_sym/health`

Open `http://localhost:3000/`.

## Live demo (temporary tunnel)

A running copy is exposed at:

**https://transportation-cms-joyce-haven.trycloudflare.com**

Same accounts as below. This is a Cloudflare quick tunnel — it stays up only while the
host machine and the `cloudflared` process are running, and the address changes if the
tunnel is restarted. For a permanent URL, run your own tunnel or deploy the folder.

## Static build (GitHub Pages / Netlify)

`public/` is a complete static site: `public/index.html` redirects to `public/v3/`,
data is pre-exported into `public/data/*.json`, and `public/v3/static-api.js` fakes the
API in the browser when no Node server is present.

```
python3 scripts/export-static-data.py   # refresh public/data/*.json from .sym-data
```

What works on the static build: browsing, search, filters, event pages, save, RSVP,
joining societies, sign-up with username check, **friends and messaging**.

Static-mode caveats:
- Saves, RSVPs, memberships, friendships and messages live in this browser's storage only.
- The logged-in user is kept in `sessionStorage`, so **two tabs of the same browser can be
  two different accounts** — that is how the messaging demo works.
- Organiser features need the Node server.

## Demo accounts (password `demo1234`)

| Role | Email | What you see |
|---|---|---|
| Student | `student@uniloop.demo` | Discover, search, RSVP, saved events, tickets, friends and messages |
| Organiser | `exec@uniloop.demo` | Live dashboard, attendees, members, ticket scanning, create event |

There are 18 demo students in total (see `.sym-data/uniloop-db.json` → `users`), e.g.
`amelia.chen@students.mq.edu.au`, `noah.williams@students.usyd.edu.au`,
`priya.sharma@students.unsw.edu.au` — all use `demo1234`. Two browser windows with two
different accounts is the fastest way to demo messaging.

Test card for any payment step: `4242 4242 4242 4242` (any card ending `0002` is declined on purpose). No real money moves.

## What is inside

```
uniloop/
├─ server.js              zero-dependency HTTP server + JSON API
├─ seed.js                builds the initial database
├─ data-real.json         425 imported event listings (with official links)
├─ package.json
├─ README_PACKAGE.md      this file
├─ 交付说明_中文.md        same information in Chinese
├─ public/
│  ├─ v3/                 the live app (served at /)
│  │  ├─ index.html       shell + loading screen
│  │  ├─ styles.css       design tokens + layout + components
│  │  ├─ app.js           router, views, interactions (incl. friends & chat)
│  │  ├─ qr.js            offline QR generator (tickets)
│  │  ├─ static-api.js    browser-only fallback used by the static build
│  │  ├─ vendor/jsqr.js   QR decoder (camera scanning)
│  │  └─ assets/          WSU crest used by the loading screen
│  ├─ index.html          v1 template build (kept for reference, not served)
│  ├─ start.html          standalone search prototype
│  ├─ demo/               English demo guide (open /demo/)
│  └─ assets/
│     ├─ schools/         five university crests
│     └─ events/          333 unique event cover photos (real, fetched from official pages)
│                          + school crests; every one of the 424 events resolves to a local file
├─ .sym-data/uniloop-db.json   the live database (users, events, societies, friendships, messages)
├─ docs/                  feature audit, design research, demo guide (.docx)
├─ scripts/               image-fetching / export helpers (dev only, not needed to run)
└─ bin/                   helper scripts (git save/push, tunnel)
```

## Features

**Student**
- Staged search: Where (campus) · When (window or a specific day) · What (category)
- Save events; saved items stay in sync
- RSVP with capacity, one-ticket-per-person and campus-only rules enforced on the server
- Join a club (mock payment) — member pricing then applies automatically
- Ticket with QR code and check-in status
- Every event keeps its official registration link (opens the original club page)
- **Friends and direct messages** (new): search people by name or `@username`, send a
  friend request, accept/decline incoming requests, then chat one-to-one. The conversation
  list shows the last message and unread count; the open thread refreshes every 4 seconds.

**Organiser**
- Live KPIs: RSVPs, fill rate, page views, revenue (dashboard polls every 3 seconds)
- Cumulative RSVP curve with capacity line and a projection
- Recent RSVPs with ticket codes and check-in state, new rows flash
- Members list, ticket scanning (paste code or camera), create and publish events

**Cross-cutting**
- Accounts, sessions, password hashing, usernames with live availability check
- **Log out** from the sidebar footer or from *My stuff*
- Five Sydney universities, 1,100+ clubs, 420+ upcoming events
- Light and dark theme, responsive from 390px to ultrawide

## Messaging API (for reference)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users/search?q=` | find people by name or @username, returns relation state |
| GET | `/api/friends` | friends, incoming requests, outgoing requests, unread count |
| POST | `/api/friends/request` | `{ user_id }` — send a request (auto-accepts if they already asked you) |
| POST | `/api/friends/respond` | `{ id, accept }` — accept or decline |
| DELETE | `/api/friends/:id` | remove a friend (takes the friendship id, not the user id) |
| GET | `/api/messages` | conversation list |
| GET | `/api/messages/:peerId` | one thread; marks incoming messages as read |
| POST | `/api/messages/:peerId` | `{ text }` — send, max 2000 chars |

Only friends can message each other (`403` otherwise).

## Honest scope

| Area | Status |
|---|---|
| Accounts, sessions, roles | Working — server-side auth, cookies, scrypt hashing |
| Events, clubs, search, filters | Working — real listings imported from public club pages |
| RSVP rules | Working — capacity, duplicates and campus-only enforced server-side |
| Memberships and member pricing | Working — checkout is mock payment only |
| Tickets, QR, check-in, members | Working — camera scanning needs localhost or HTTPS |
| Organiser dashboard | Working — projection is a simple trend estimate, not a model |
| Official event links | Working — taken from the source listings |
| Friends and messaging | Working — polling (4 s), no WebSocket, no push notifications |
| Event cover images | Real posters/photos scraped from official event pages — 333 unique files cover all 424 events (a society's events may share one cover); no stock placeholders left |
| “For you” recommendations | Backend only — rules-based endpoint exists, no UI yet |
| Ratings and reviews | Partial — demo reviews display; students cannot post yet |
| Payments | Mocked — test cards, no gateway |
| Data storage | Single JSON file on disk; one server only, no concurrent writers |

## Known limitations worth telling the team

1. Messages are polled, not pushed. Two tabs update within 4 seconds; there is no badge
   outside the app (no email/push).
2. There are no attachments, reactions, typing indicators or group chats yet.
3. Read state is stored per message (`readAt`) but the UI only shows a count, not "seen".
4. The database is one JSON file rewritten on every change — fine for a demo, not for
   concurrent load.
5. Deleting `.sym-data/uniloop-db.json` resets everything back to `seed.js`.

## Docs

- `docs/FEATURE_AUDIT.md` — feature-by-feature status, test steps, known limits
- `docs/UniLoop_Demo_Guide_EN.docx` — the demo guide as a Word file
- `public/demo/` — the same guide as a web page (served at `/demo/`)
- `docs/MOBILE_UI_RESEARCH.md`, `docs/PREMIUM_HERO_NOTES.md`, `docs/MEETUP_AIRBNB_RESEARCH.md` — design research
- `docs/GIT_WORKFLOW.md` — how versions and rollbacks work in this repo

## Quick API smoke test

```
node server.js &
curl http://localhost:3000/_sym/health
curl -c /tmp/a.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"student@uniloop.demo","password":"demo1234"}'
curl -b /tmp/a.txt http://localhost:3000/api/friends
```
