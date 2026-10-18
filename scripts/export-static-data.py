#!/usr/bin/env python3
"""export-static-data.py — 把线上库（.sym-data/uniloop-db.json）导出成静态 JSON。

与 scripts/export-static.js 的区别：那边是从 seed 生成（只有 ~25 场活动、150 社团），
这边是从真实数据库导出（424 场活动、1113 社团、真实照片、18 个演示账号），
并且把图片路径改成相对路径（../assets/...），这样同一份数据在
    - Node 服务（/v3/index.html）
    - GitHub Pages / Netlify（/uniloop/v3/index.html）
两种部署下都能正确加载图片。
"""
import json, os, sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, ".sym-data", "uniloop-db.json")
OUT = os.path.join(ROOT, "public", "data")

with open(DB, encoding="utf-8") as f:
    db = json.load(f)

def rel(p):
    """'/assets/x' -> '../assets/x'（相对 /v3/index.html）"""
    if isinstance(p, str) and p.startswith("/"):
        return ".." + p
    return p

campuses = [{"id": c["id"], "name": c["name"], "short": c.get("short", ""),
             "city": c.get("city", ""), "logo": rel(c.get("logo", ""))} for c in db["campuses"]]
campus_by_id = {c["id"]: c for c in campuses}

reviews = [{"id": r["id"], "society_id": r["societyId"], "display_name": r.get("displayName", ""),
            "rating": r.get("rating", 5), "text": r.get("text", ""),
            "created_at": r.get("createdAt", "")} for r in db.get("reviews", [])]

def rating_of(sid):
    rs = [r for r in reviews if r["society_id"] == sid]
    if not rs:
        return None, 0
    return round(sum(r["rating"] for r in rs) / len(rs), 1), len(rs)

members = {}
for m in db.get("memberships", []):
    members[m["societyId"]] = members.get(m["societyId"], 0) + 1

societies = []
for s in db["societies"]:
    c = campus_by_id.get(s["campusId"], {})
    rating, rc = rating_of(s["id"])
    societies.append({
        "id": s["id"], "name": s["name"], "campus_id": s["campusId"],
        "campus_name": c.get("name", ""), "campus_logo": c.get("logo", ""),
        "tags": s.get("tags", []), "blurb": s.get("blurb", ""),
        "membership_price": s.get("membershipPrice", 0), "followers": s.get("followers", 0),
        "member_count": members.get(s["id"], 0), "rating": rating, "review_count": rc,
        "type": s.get("type", "Society"), "socials": s.get("socials", {}), "is_member": False,
    })

taken = {}
for r in db.get("rsvps", []):
    if r.get("status") == "CONFIRMED":
        taken[r["eventId"]] = taken.get(r["eventId"], 0) + 1

def map_links(coords, label):
    if not coords:
        return None
    lat, lng = coords[0], coords[1]
    from urllib.parse import quote
    q = quote(label or f"{lat},{lng}")
    return {
        "lat": lat, "lng": lng,
        "osm_embed": (f"https://www.openstreetmap.org/export/embed.html?bbox={lng-0.008}%2C{lat-0.005}%2C"
                      f"{lng+0.008}%2C{lat+0.005}&layer=mapnik&marker={lat}%2C{lng}"),
        "osm_page": f"https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=17/{lat}/{lng}",
        "google_directions": f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}",
        "google_place": f"https://www.google.com/maps/search/?api=1&query={lat},{lng}",
        "apple_maps": f"https://maps.apple.com/?daddr={lat},{lng}&q={q}",
    }

events = []
for e in db["events"]:
    if e.get("status") != "PUBLISHED":
        continue
    c = campus_by_id.get(e["campusId"], {})
    n = taken.get(e["id"], 0)
    rating, _ = rating_of(e["societyId"])
    events.append({
        "id": e["id"], "title": e["title"], "description": e.get("description", ""),
        "category": e.get("category", "other"),
        "campus_id": e["campusId"], "campus_name": e.get("campusName", c.get("name", "")),
        "campus_logo": c.get("logo", ""),
        "venue": e.get("venue", ""), "venue_coords": e.get("venueCoords"),
        "map": map_links(e.get("venueCoords"), e.get("venue")),
        "starts_at": e["startsAt"], "ends_at": e["endsAt"],
        "audience_scope": e.get("audienceScope", "OPEN_TO_ALL"),
        "society_id": e["societyId"], "society_name": e.get("societyName", ""),
        "society_logo": c.get("logo", ""), "society_rating": rating,
        "cover_image_url": rel(e.get("coverImageUrl", "")),
        "capacity": e.get("capacity"), "status": e.get("status", "PUBLISHED"),
        "rsvp_count": n, "page_views": e.get("pageViews", 0), "past": bool(e.get("past")),
        "source": e.get("source", ""), "kind": e.get("kind", ""),
        "price_member": e.get("priceMember", 0), "price_public": e.get("pricePublic", 0),
        "your_price": e.get("pricePublic", 0), "is_member": False,
        "seats_left": None if e.get("capacity") is None else max(0, e["capacity"] - n),
        "is_saved": False, "my_rsvp": None, "can_rsvp": False,
        "society_membership_price": next((s["membershipPrice"] for s in db["societies"] if s["id"] == e["societyId"]), 0),
    })

users = []
for u in db["users"]:
    c = campus_by_id.get(u["campusId"], {})
    users.append({"id": u["id"], "name": u["name"], "username": u.get("username", ""),
                  "email": u.get("email", ""), "campus_id": u["campusId"],
                  "campus_name": c.get("name", ""), "campus_logo": c.get("logo", ""),
                  "role": u.get("role", "student")})

os.makedirs(OUT, exist_ok=True)
def dump(name, payload):
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

dump("campuses", {"campuses": campuses})
dump("societies", {"societies": societies, "total": len(societies)})
dump("events", {"events": events, "total": len(events)})
dump("reviews", {"reviews": reviews})
dump("users", {"users": users})
dump("meta", {"generated_at": datetime.utcnow().isoformat() + "Z", "events": len(events),
              "societies": len(societies), "users": len(users),
              "note": "Exported from the live database. In the static build, saves/RSVPs/friends/messages live in this browser only."})

print(f"campuses={len(campuses)} societies={len(societies)} events={len(events)} reviews={len(reviews)} users={len(users)}")
