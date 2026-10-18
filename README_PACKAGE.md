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

## Demo accounts (password `demo1234`)

| Role | Email | What you see |
|---|---|---|
| Student | `student@uniloop.demo` | Discover, search, RSVP, saved events, tickets with QR |
| Organiser | `exec@uniloop.demo` | Live dashboard, attendees, members, ticket scanning, create event |

Test card for any payment step: `4242 4242 4242 4242` (any card ending `0002` is declined on purpose). No real money moves.

## What is inside

```
uniloop/
├─ server.js            zero-dependency HTTP server + JSON API
├─ seed.js              builds the initial database
├─ data-real.json        1,113 clubs and 425 real event listings (imported, with official links)
├─ package.json
├─ public/
│  ├─ v3/               the app
│  │  ├─ index.html     shell + loading screen (all CSS/JS inlined)
│  │  ├─ styles.css     design tokens + layout + components
│  │  ├─ app.js         router, views, interactions
│  │  ├─ qr.js          offline QR generator (tickets)
│  │  ├─ vendor/jsqr.js QR decoder (camera scanning)
│  │  └─ assets/        WSU crest used by the loading screen
│  ├─ demo/             English demo guide (open /demo/)
│  └─ assets/
│     ├─ schools/       five university crests
│     └─ events/        31 event cover images
├─ docs/                feature audit, design research, demo guide (.docx)
├─ bin/                 helper scripts (git save/push, tunnel)
└─ tests/               API + mobile layout checks (Python, optional)
```

## Features

**Student**
- Staged search: Where (campus) · When (window or a specific day) · What (category)
- Save events; saved items stay in sync
- RSVP with capacity, one-ticket-per-person and campus-only rules enforced on the server
- Join a club (mock payment) — member pricing then applies automatically
- Ticket with QR code and check-in status
- Every event keeps its official registration link (opens the original club page)

**Organiser**
- Live KPIs: RSVPs, fill rate, page views, revenue (dashboard polls every 3 seconds)
- Cumulative RSVP curve with capacity line and a projection
- Recent RSVPs with ticket codes and check-in state, new rows flash
- Members list, ticket scanning (paste code or camera), create and publish events

**Cross-cutting**
- Accounts, sessions, password hashing, usernames with availability check
- Five Sydney universities, 1,100+ clubs, 400+ upcoming events
- Light and dark theme, responsive from 390px to ultrawide

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
| Event cover images | Sample — stock images used as placeholders |
| “For you” recommendations | Backend only — rules-based endpoint exists, no UI yet |
| Ratings and reviews | Partial — demo reviews display; students cannot post yet |
| Payments | Mocked — test cards, no gateway |
| Data storage | Single JSON file on disk; one server only |

## Docs

- `docs/FEATURE_AUDIT.md` — feature-by-feature status, test steps, known limits
- `docs/UniLoop_Demo_Guide_EN.docx` — the demo guide as a Word file
- `public/demo/` — the same guide as a web page (served at `/demo/`)
- `docs/MOBILE_UI_RESEARCH.md`, `docs/PREMIUM_HERO_NOTES.md`, `docs/MEETUP_AIRBNB_RESEARCH.md` — design research
- `docs/GIT_WORKFLOW.md` — how versions and rollbacks work in this repo

## Tests (optional)

```
python3 tests/test_api2.py      # 22 API contract checks
python3 tests/test_mobile2.py   # 390px layout checks (needs Chrome on :9222)
```
