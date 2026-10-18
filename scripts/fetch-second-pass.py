#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch-second-pass.py — 对仍在用占位图的活动，从已缓存的官方页面里再找真实图

思路：第一遍抓到的 og:image 在很多站点上是"站点默认横幅"（一张被上百场共用）。
这一遍从缓存 HTML 里挖候选图（上传目录 / 活动图片），逐张验证：
  · 尺寸 ≥ 400×200
  · 像素哈希此前没被大量使用（< 4 次）
命中就写入 public/assets/events/real/<id>.jpg 并更新 data-real.json。
"""
import hashlib
import json
import os
import re
import ssl
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data-real.json')
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'events', 'real')
CACHE = os.path.join(ROOT, '.cache', 'event-images')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

JUNK = re.compile(r'(logo|icon|sprite|favicon|fallback|placeholder|empty_state|default_img|sell_merch|google\.png|apple\.png|avatar|banner_generic)', re.I)
GOOD_PATH = re.compile(r'(upload|uploads|uploaded|media|images|r3_image|revolvapp|content)/', re.I)
IMG_EXT = re.compile(r'\.(jpg|jpeg|png|webp)(\?|$)', re.I)

hash_counts = Counter()   # 已被占用图片的哈希（含第一遍结果）
accepted = {}             # id -> rel path


def image_hash_bytes(raw):
    return hashlib.md5(raw).hexdigest()


def fetch_bytes(url):
    key = hashlib.md5(url.encode()).hexdigest()
    for ext in ('.jpg', '.png', '.webp', ''):
        p = os.path.join(CACHE, 'img', key + ext)
        if os.path.exists(p):
            return open(p, 'rb').read()
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
        raw = r.read(4_000_000)
    return raw


def try_candidate(url):
    """返回 (raw, PIL.Image) 或 None"""
    try:
        raw = fetch_bytes(url)
        tmp = os.path.join(CACHE, 'img', hashlib.md5(url.encode()).hexdigest() + '.bin')
        open(tmp, 'wb').write(raw)
        im = Image.open(tmp).convert('RGB')
        w, h = im.size
        if w < 400 or h < 200:
            return None
        st = ImageStat.Stat(im.convert('L'))
        if st.stddev[0] < 8:
            return None
        return raw, im
    except Exception:
        return None


def candidates_for(ev):
    src = ev.get('source') or ''
    key = hashlib.md5(src.encode()).hexdigest()
    p = os.path.join(CACHE, 'html', key + '.html')
    if not os.path.exists(p):
        return []
    html = open(p, encoding='utf-8', errors='ignore').read()
    abs_urls = re.findall(r'https?://[^"\'\s>]+?\.(?:jpg|jpeg|png|webp)', html, re.I)
    rel_urls = re.findall(r'["\'](/[^"\']+?\.(?:jpg|jpeg|png|webp))["\']', html, re.I)
    urls = [u for u in abs_urls if not JUNK.search(u)]
    urls += [urllib.parse.urljoin(src, u) for u in rel_urls if not JUNK.search(u)]
    # 优先"上传目录"里的图
    urls.sort(key=lambda u: (0 if GOOD_PATH.search(u) else 1, len(u)))
    seen, out = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u); out.append(u)
    return out[:8]


def process(ev):
    eid = ev['id']
    for url in candidates_for(ev):
        got = try_candidate(url)
        if not got:
            continue
        raw, im = got
        h = image_hash_bytes(raw)
        if hash_counts[h] >= 4:
            continue
        w, hh = im.size
        im2 = im.resize((720, max(1, round(hh * 720 / w))), getattr(Image, 'Resampling', Image).LANCZOS)
        if im2.height > 480:
            top = max(0, (im2.height - 480) // 2)
            im2 = im2.crop((0, top, 720, top + 480))
        out = os.path.join(OUT_DIR, eid + '.jpg')
        im2.save(out, 'JPEG', quality=78, optimize=True, progressive=True)
        hash_counts[h] += 1
        return (eid, '/assets/events/real/%s.jpg' % eid, url)
    return None


def main():
    data = json.load(open(DATA))
    events = data['events']
    # 先把第一遍已经接受的图片哈希计入
    for e in events:
        u = e.get('coverImageUrl', '')
        if '/real/' in u:
            p = os.path.join(ROOT, 'public', u.lstrip('/'))
            if os.path.exists(p):
                hash_counts[hashlib.md5(open(p, 'rb').read()).hexdigest()] += 1

    targets = [e for e in events if '/real/' not in e.get('coverImageUrl', '') and e.get('source', '').startswith('http')]
    print('待抢救活动:', len(targets))
    recovered = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(process, e): e for e in targets}
        for i, f in enumerate(as_completed(futs), 1):
            r = f.result()
            if r:
                recovered.append(r)
            if i % 40 == 0:
                print('  ...%d/%d  recovered=%d' % (i, len(targets), len(recovered)), flush=True)

    by_id = {e['id']: e for e in events}
    for eid, rel, url in recovered:
        by_id[eid]['coverImageUrl'] = rel

    # 再排一次重复：把 ≥5 次的图退回占位
    counts = Counter()
    for e in events:
        u = e.get('coverImageUrl', '')
        if '/real/' in u:
            p = os.path.join(ROOT, 'public', u.lstrip('/'))
            if os.path.exists(p):
                counts[hashlib.md5(open(p, 'rb').read()).hexdigest()] += 1
    generic = {h for h, c in counts.items() if c >= 5}
    reverted = 0
    for i, e in enumerate(events):
        u = e.get('coverImageUrl', '')
        if '/real/' in u:
            p = os.path.join(ROOT, 'public', u.lstrip('/'))
            if os.path.exists(p):
                h = hashlib.md5(open(p, 'rb').read()).hexdigest()
                if h in generic:
                    e['coverImageUrl'] = '/assets/events/ev%d.jpg' % ((i % 31) + 1)
                    reverted += 1

    json.dump(data, open(DATA, 'w'), ensure_ascii=False, indent=1)
    real_now = sum(1 for e in events if '/real/' in e.get('coverImageUrl', ''))
    print('\n第二遍找回: %d 场' % len(recovered))
    print('因重复退回占位: %d 场' % reverted)
    print('当前真实照片: %d / %d 场' % (real_now, len(events)))

    # 清理未引用图片
    used = {os.path.basename(e['coverImageUrl']) for e in events if '/real/' in e['coverImageUrl']}
    removed = 0
    for f in os.listdir(OUT_DIR):
        if f not in used:
            os.remove(os.path.join(OUT_DIR, f)); removed += 1
    print('清理未引用: %d 张 | 剩余 %d 张' % (removed, len(os.listdir(OUT_DIR))))


if __name__ == '__main__':
    main()
