#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v2 契约测试：图片唯一/地图/收藏/评价/社团主页/主办方 Hub/筛选"""
import json, urllib.request, http.cookiejar, sys
B = 'http://localhost:3400'
def cl(): return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, p, m='GET', b=None):
    d = json.dumps(b).encode() if b is not None else None
    r = urllib.request.Request(B + p, data=d, method=m, headers={'content-type': 'application/json'})
    try:
        with op.open(r, timeout=15) as x: return x.status, json.loads(x.read() or b'{}')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b'{}')
        except Exception: return e.code, {}
F = []
def ck(n, c, x=''):
    print(('  PASS  ' if c else '  FAIL  ') + n + ((' | ' + str(x)[:140]) if x else ''))
    if not c: F.append(n)

print('== 1) 活动：图片唯一 + 地图坐标 ==')
s, b = call(cl(), '/api/events?when=all')
evs = b.get('events', [])
ck('活动数量 > 25', len(evs) > 25, len(evs))
imgs = [e['cover_image_url'] for e in evs]
ck('图片各不相同', len(set(imgs)) >= min(len(imgs), 25), '%d unique / %d' % (len(set(imgs)), len(imgs)))
ck('每个活动都有坐标', all(e.get('venue_coords') for e in evs))
ck('每个活动都有 Google 导航', all((e.get('map') or {}).get('google_directions') for e in evs))
ck('每个活动都有描述', all(len(e.get('description') or '') > 10 for e in evs))

print('== 2) 筛选：校区 / 时间 / 免费 ==')
s, b = call(cl(), '/api/events?campus_id=usyd_camperdown&when=all')
ck('校区筛选只返回该校', s == 200 and all(e['campus_id'] == 'usyd_camperdown' for e in b['events']), len(b['events']))
s, b7 = call(cl(), '/api/events?when=7d')
s, ball = call(cl(), '/api/events?when=all')
ck('时间筛选生效', len(b7['events']) <= len(ball['events']), '%d vs %d' % (len(b7['events']), len(ball['events'])))
s, bf = call(cl(), '/api/events?free=1&when=all')
ck('免费筛选只返回 0 元', all(e['price_public'] == 0 for e in bf['events']), len(bf['events']))

print('== 3) 收藏 ==')
stu = cl(); call(stu, '/api/auth/login', 'POST', {'email': 'student@uniloop.demo', 'password': 'demo1234'})
s, b = call(stu, '/api/events?when=all'); ev = b['events'][0]
s, r1 = call(stu, '/api/events/%s/save' % ev['id'], 'POST')
ck('收藏成功', s == 200 and r1.get('saved'))
s, me = call(stu, '/api/me')
ck('me 返回 saved_events', any(x['id'] == ev['id'] for x in me.get('saved_events', [])), len(me.get('saved_events', [])))
s, r2 = call(stu, '/api/events/%s/save' % ev['id'], 'DELETE')
s, me2 = call(stu, '/api/me')
ck('取消收藏', not any(x['id'] == ev['id'] for x in me2.get('saved_events', [])))

print('== 4) 社团：校徽 / 评分 / 主页 / 评价 ==')
s, b = call(cl(), '/api/societies')
socs = b.get('societies', [])
ck('社团带校徽', all(x.get('campus_logo') for x in socs))
ck('社团带评分', any(x.get('rating') for x in socs))
s, d = call(cl(), '/api/societies/soc_outdoors')
ck('社团主页：即将开始', isinstance(d.get('upcoming'), list) and len(d['upcoming']) > 0, len(d.get('upcoming', [])))
ck('社团主页：过往相册', isinstance(d.get('gallery'), list) and len(d['gallery']) > 0, len(d.get('gallery', [])))
ck('社团主页：评价', isinstance(d.get('reviews'), list) and len(d['reviews']) > 0, len(d.get('reviews', [])))
s, rr = call(stu, '/api/societies/soc_outdoors/reviews', 'POST', {'rating': 5, 'text': 'Great walk, well organised.'})
ck('发布评价', s == 200 and rr.get('review', {}).get('rating') == 5, rr.get('error'))

print('== 5) 主办方 Hub ==')
org = cl(); call(org, '/api/auth/login', 'POST', {'email': 'exec@uniloop.demo', 'password': 'demo1234'})
s, h = call(org, '/api/exec/hub')
ck('hub 200', s == 200, h.get('error'))
ck('hub 统计字段', all(k in h.get('stats', {}) for k in ['members', 'followers', 'rsvps_total', 'rating', 'capacity_total']), list(h.get('stats', {}).keys())[:8])
ck('hub 累计曲线 14 天', len(h.get('series', [])) == 14, len(h.get('series', [])))
ck('hub 过往活动 + 相册', len(h.get('past', [])) > 0 and len(h.get('gallery', [])) > 0, (len(h.get('past', [])), len(h.get('gallery', []))))
ck('hub 评价列表', len(h.get('reviews', [])) > 0, len(h.get('reviews', [])))
s, dash = call(org, '/api/exec/dashboard')
ck('dashboard 有 needed_to_fill / projected', 'needed_to_fill' in dash.get('stats', {}) and 'projected_final' in dash.get('stats', {}), dash.get('stats', {}))

print('== 6) 推荐 + 报名联动 ==')
s, rec = call(stu, '/api/recommend', 'POST', {'origin_campus': 'mq_sydney', 'available_from': '2030-01-01T09:00:00+11:00', 'available_to': '2030-01-01T12:00:00+11:00', 'interests': ['outdoors']})
ck('推荐 200', s == 200 and 'results' in rec, rec.get('error'))
s, b = call(stu, '/api/events?when=all')
target = next((e for e in b['events'] if e['audience_scope'] == 'OPEN_TO_ALL' and not e['my_rsvp']), None)
before = target['rsvp_count']
s1, _ = call(stu, '/api/events/%s/rsvp' % target['id'], 'POST', {'card': '4242424242424242'})
s2, _ = call(stu, '/api/events/%s/rsvp' % target['id'], 'POST', {'card': '4242424242424242'})
s, after = call(stu, '/api/events/%s' % target['id'])
ck('RSVP 只 +1', s1 == 200 and s2 == 409 and after['event']['rsvp_count'] == before + 1, (before, after['event']['rsvp_count']))

print()
print('FAILURES:', F if F else 'none')
sys.exit(1 if F else 0)
