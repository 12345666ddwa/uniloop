#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch-event-images.py — 从每个活动的官方页面抓真实封面图

流程：
1) 请求 source 页面（带缓存），依次尝试 og:image / twitter:image / JSON-LD image / 正文大图
2) 下载图片，校验尺寸与比例，缩放到 720px 宽，存 public/assets/events/real/<event_id>.jpg
3) 输出 report（按域名统计命中率 + 失败清单），供浏览器兜底使用

用法：
  python3 scripts/fetch-event-images.py            # 全量
  python3 scripts/fetch-event-images.py --limit 20 # 只跑前 20 条（试跑）
"""
import argparse
import hashlib
import json
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data-real.json')
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'events', 'real')
CACHE = os.path.join(ROOT, '.cache', 'event-images')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'en-AU,en;q=0.9'}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(os.path.join(CACHE, 'html'), exist_ok=True)
os.makedirs(os.path.join(CACHE, 'img'), exist_ok=True)

BAD = re.compile(r'(logo|icon|favicon|sprite|avatar|placeholder|default|banner-generic|spacer)', re.I)


def get(url, timeout=15, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        raw = r.read(3_000_000 if binary else 600_000)
    return raw if binary else raw.decode('utf-8', 'ignore')


def cached_html(url):
    key = hashlib.md5(url.encode()).hexdigest()
    p = os.path.join(CACHE, 'html', key + '.html')
    if os.path.exists(p):
        return open(p, encoding='utf-8', errors='ignore').read()
    html = get(url)
    open(p, 'w', encoding='utf-8').write(html)
    return html


def pick_image(html, base):
    # 1) og:image / twitter:image（两种属性顺序都试）
    for pat in (r'property=["\']og:image(?::secure_url)?["\'][^>]*content=["\']([^"\']+)',
                r'content=["\']([^"\']+)["\'][^>]*property=["\']og:image',
                r'name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)',
                r'content=["\']([^"\']+)["\'][^>]*name=["\']twitter:image'):
        m = re.search(pat, html, re.I)
        if m:
            return urllib.parse.urljoin(base, m.group(1))
    # 2) JSON-LD "image"
    for m in re.finditer(r'application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        block = m.group(1)
        for pat in (r'"image"\s*:\s*"([^"]+)"', r'"image"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"',
                    r'"image"\s*:\s*\[\s*"([^"]+)"'):
            mm = re.search(pat, block)
            if mm:
                return urllib.parse.urljoin(base, mm.group(1).replace('\\/', '/'))
    # 3) 正文里的 <img>，排除 logo/icon，优先 upload/content/media 路径
    cands = []
    for m in re.finditer(r'<img[^>]+>', html, re.I):
        tag = m.group(0)
        src = re.search(r'(?:data-src|data-original|src)=["\']([^"\']+)', tag, re.I)
        if not src:
            continue
        u = urllib.parse.urljoin(base, src.group(1))
        if u.startswith('data:') or BAD.search(u):
            continue
        score = 0
        if re.search(r'(upload|uploads|media|content|images)/', u, re.I):
            score += 2
        if re.search(r'\.(jpg|jpeg|png|webp)', u, re.I):
            score += 1
        w = re.search(r'width=["\']?(\d+)', tag)
        if w and int(w.group(1)) >= 400:
            score += 2
        cands.append((score, u))
    if cands:
        cands.sort(key=lambda x: -x[0])
        return cands[0][1]
    return None


def download_image(url):
    key = hashlib.md5(url.encode()).hexdigest()
    for ext in ('', '.jpg', '.png', '.webp'):
        p = os.path.join(CACHE, 'img', key + ext)
        if os.path.exists(p):
            return p
    raw = get(url, timeout=20, binary=True)
    ext = '.jpg'
    if raw[:4] == b'\x89PNG':
        ext = '.png'
    elif raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
        ext = '.webp'
    p = os.path.join(CACHE, 'img', key + ext)
    open(p, 'wb').write(raw)
    return p


def process(ev):
    src = ev.get('source') or ''
    eid = ev.get('id')
    if not src.startswith('http') or not eid:
        return ('skip', eid, 'no source')
    try:
        html = cached_html(src)
    except Exception as e:
        return ('html-fail', eid, '%s: %s' % (type(e).__name__, str(e)[:60]))
    img_url = pick_image(html, src)
    if not img_url:
        return ('no-image', eid, src)
    try:
        p = download_image(img_url)
        im = Image.open(p).convert('RGB')
    except Exception as e:
        return ('img-fail', eid, '%s: %s' % (type(e).__name__, str(e)[:50]))
    w, h = im.size
    if w < 300 or h < 160:
        return ('too-small', eid, '%dx%d' % (w, h))
    ratio = w / h
    if ratio < 0.45 or ratio > 3.2:
        return ('bad-ratio', eid, '%.2f' % ratio)
    # 缩放到 720 宽（保持比例，过长则中心裁切 3:2）
    target_w = 720
    im2 = im.resize((target_w, max(1, round(h * target_w / w))), getattr(Image, 'Resampling', Image).LANCZOS)
    if im2.height > 480:
        top = max(0, (im2.height - 480) // 2)
        im2 = im2.crop((0, top, target_w, top + 480))
    out = os.path.join(OUT_DIR, '%s.jpg' % eid)
    im2.save(out, 'JPEG', quality=78, optimize=True, progressive=True)
    return ('ok', eid, img_url)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--workers', type=int, default=8)
    args = ap.parse_args()

    data = json.load(open(DATA))
    events = data['events']
    if args.limit:
        events = events[:args.limit]

    results = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process, e): e for e in events}
        for i, f in enumerate(as_completed(futs), 1):
            r = f.result()
            results.append(r)
            if i % 25 == 0:
                print('  ...%d/%d  (%.0fs)' % (i, len(events), time.time() - t0), flush=True)

    ok = [r for r in results if r[0] == 'ok']
    print('\n=== 结果 ===')
    print('成功 %d / %d  (%.0f%%)  用时 %.0fs' % (len(ok), len(results), 100 * len(ok) / max(1, len(results)), time.time() - t0))
    from collections import Counter
    print('原因分布:', Counter(r[0] for r in results).most_common())
    miss = [r for r in results if r[0] != 'ok']
    dom = Counter(urllib.parse.urlparse(r[2] if r[2].startswith('http') else '').netloc or r[0] for r in miss)
    print('失败域名 top:', dom.most_common(6))

    # 记录映射（供后续把 coverImageUrl 指向本地图）
    mapping = {r[1]: '/assets/events/real/%s.jpg' % r[1] for r in ok}
    json.dump({'mapping': mapping, 'misses': [{'id': r[1], 'reason': r[0], 'detail': r[2]} for r in miss]},
              open(os.path.join(ROOT, 'scripts', 'event-images-report.json'), 'w'), indent=1)
    print('映射写入 scripts/event-images-report.json（%d 条）' % len(mapping))


if __name__ == '__main__':
    main()
