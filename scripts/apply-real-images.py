#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""apply-real-images.py — 把抓到的真实封面写回 data-real.json

- 读取 scripts/event-images-report.json 的 mapping
- 校验图片存在且不是"空白图"（亮度方差过低）
- 更新每个活动的 coverImageUrl 为本地真实图；没抓到的保留占位图（按 id 轮换，避免重复）
- 备份原文件到 data-real.backup.json
"""
import json
import os
import shutil

from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data-real.json')
REPORT = os.path.join(ROOT, 'scripts', 'event-images-report.json')
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'events', 'real')

report = json.load(open(REPORT))
mapping = report.get('mapping', {})
data = json.load(open(DATA))

if not os.path.exists(os.path.join(ROOT, 'data-real.backup.json')):
    shutil.copy2(DATA, os.path.join(ROOT, 'data-real.backup.json'))

applied = 0
skipped = 0
blank = []
for i, e in enumerate(data['events']):
    eid = e.get('id')
    rel = mapping.get(eid)
    if rel:
        p = os.path.join(ROOT, 'public', rel.lstrip('/'))
        if os.path.exists(p):
            try:
                im = Image.open(p).convert('L')
                st = ImageStat.Stat(im)
                if st.stddev[0] < 6:  # 近乎纯色 → 视为无效
                    blank.append(eid)
                else:
                    e['coverImageUrl'] = rel
                    applied += 1
                    continue
            except Exception:
                pass
    # 兜底：轮换占位图，保证不全是同一张
    e['coverImageUrl'] = '/assets/events/ev%d.jpg' % ((i % 31) + 1)
    skipped += 1

json.dump(data, open(DATA, 'w'), ensure_ascii=False, indent=1)
print('应用真实封面: %d 场' % applied)
print('保留占位图  : %d 场' % skipped)
if blank:
    print('疑似空白图  : %d 张 %s' % (len(blank), blank[:5]))
print('总数        : %d' % len(data['events']))
