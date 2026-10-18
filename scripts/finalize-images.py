#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""finalize-images.py — 收尾：剔除跨社团共用的模板图、清理文件、输出覆盖率"""
import hashlib
import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data-real.json')
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'events', 'real')

data = json.load(open(DATA))
events = data['events']


def digest(url):
    p = os.path.join(ROOT, 'public', url.lstrip('/'))
    if '/real/' not in url or not os.path.exists(p):
        return None
    return hashlib.md5(open(p, 'rb').read()).hexdigest()


img_socs = defaultdict(set)
img_count = Counter()
for e in events:
    h = digest(e['coverImageUrl'])
    if h:
        img_socs[h].add(e['societyId'])
        img_count[h] += 1

# 一张图被 4 个以上不同社团使用 → 判为站点模板
template = {h for h, socs in img_socs.items() if len(socs) >= 4}
reverted = 0
for i, e in enumerate(events):
    h = digest(e['coverImageUrl'])
    if h and h in template:
        e['coverImageUrl'] = '/assets/events/ev%d.jpg' % ((i % 31) + 1)
        reverted += 1

json.dump(data, open(DATA, 'w'), ensure_ascii=False, indent=1)

# 清理未引用文件
used = {os.path.basename(e['coverImageUrl']) for e in events if '/real/' in e['coverImageUrl']}
removed = 0
for f in os.listdir(OUT_DIR):
    if f not in used:
        os.remove(os.path.join(OUT_DIR, f))
        removed += 1

now = datetime.now(timezone.utc)
upcoming = [e for e in events if not e.get('past') and datetime.fromisoformat(e['startsAt'].replace('Z', '+00:00')) > now]
upcoming.sort(key=lambda e: e['startsAt'])


def ratio(lst):
    r = sum(1 for e in lst if '/real/' in e['coverImageUrl'])
    return r, len(lst), (100 * r / len(lst) if lst else 0)


print('模板图退回占位: %d 场' % reverted)
print('清理未引用图片: %d 张 | 保留 %d 张' % (removed, len(os.listdir(OUT_DIR))))
print('总体覆盖率: %d/%d (%.0f%%)' % ratio(events))
for n in (20, 40, 80, 120):
    r, t, p = ratio(upcoming[:n])
    print('  前 %3d 场: %d/%d (%.0f%%)' % (n, r, t, p))
size = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
print('真实图片体积: %.1f MB' % (size / 1024 / 1024))
