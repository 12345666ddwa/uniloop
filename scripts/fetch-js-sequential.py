#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch-js-sequential.py — 单标签页顺序抓取（稳定），按开课时间优先

用法：python3 scripts/fetch-js-sequential.py [数量]
默认抓 80 场（首页/rails 优先），已有的真实图不计入。
"""
import hashlib
import json
import os
import re
import ssl
import sys
import time
import urllib.request
from datetime import datetime, timezone

import websocket
from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data-real.json')
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'events', 'real')
CACHE = os.path.join(ROOT, '.cache', 'event-images')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

EXTRACT_JS = r"""
(function(){
  function good(u){ return u && !/fallback-image|logo|icon|sprite|favicon|avatar|placeholder|empty_state|sell_merch|google\.png|apple\.png/i.test(u); }
  var all = Array.from(document.querySelectorAll('img')).map(function(i){
    return { u: i.currentSrc || i.src || '', w: i.naturalWidth || 0, h: i.naturalHeight || 0 };
  }).filter(function(x){ return x.w > 0 && good(x.u); });
  var out = [];
  function push(u){ if (u && good(u) && out.indexOf(u) === -1) out.push(u); }

  // 大图优先（>=600 宽），相册目录加权
  all.filter(function(x){ return x.w >= 600 && x.h >= 300; })
     .sort(function(a,b){ return b.w*b.h - a.w*a.h; })
     .forEach(function(x){ if (/club-exec|uploaded_assets|uploadedimgs|\/uploads?\/|\/media\//i.test(x.u)) push(x.u); });
  all.filter(function(x){ return x.w >= 600 && x.h >= 300; })
     .sort(function(a,b){ return b.w*b.h - a.w*a.h; })
     .forEach(function(x){ push(x.u); });
  var m = document.querySelector('meta[property="og:image"]');
  if (m && m.content) push(m.content);
  all.filter(function(x){ return x.w >= 400 && x.h >= 200; })
     .sort(function(a,b){ return b.w*b.h - a.w*a.h; })
     .forEach(function(x){ push(x.u); });
  performance.getEntriesByType('resource')
    .filter(function(r){ return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(r.name) && good(r.name); })
    .forEach(function(r){ push(r.name); });
  return JSON.stringify(out.slice(0, 10));
})()
"""


def download(url):
    key = hashlib.md5(url.encode()).hexdigest()
    for ext in ('.jpg', '.png', '.webp'):
        p = os.path.join(CACHE, 'img', key + ext)
        if os.path.exists(p):
            return p
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
        raw = r.read(4_000_000)
    ext = '.png' if raw[:4] == b'\x89PNG' else ('.webp' if raw[:4] == b'RIFF' else '.jpg')
    p = os.path.join(CACHE, 'img', key + ext)
    open(p, 'wb').write(raw)
    return p


def save(im, eid):
    w, h = im.size
    im2 = im.resize((720, max(1, round(h * 720 / w))), getattr(Image, 'Resampling', Image).LANCZOS)
    if im2.height > 480:
        top = max(0, (im2.height - 480) // 2)
        im2 = im2.crop((0, top, 720, top + 480))
    im2.save(os.path.join(OUT_DIR, eid + '.jpg'), 'JPEG', quality=78, optimize=True, progressive=True)


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    with urllib.request.urlopen('http://localhost:9222/json/version', timeout=10) as r:
        ver = json.loads(r.read())
    bws = websocket.create_connection(ver['webSocketDebuggerUrl'], timeout=20, suppress_origin=True)
    bws.send(json.dumps({'id': 1, 'method': 'Target.createTarget', 'params': {'url': 'about:blank'}}))
    tid = None
    dl = time.time() + 15
    while time.time() < dl:
        try:
            bws.settimeout(max(0.2, dl - time.time()))
            d = json.loads(bws.recv())
        except Exception:
            break
        if d.get('id') == 1:
            tid = d.get('result', {}).get('targetId')
            break
    bws.close()
    time.sleep(0.4)
    with urllib.request.urlopen('http://localhost:9222/json', timeout=10) as r:
        tabs = json.loads(r.read())
    tab = next((t for t in tabs if t.get('id') == tid), None)
    ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=60, suppress_origin=True)
    cid = [960000]

    def send(method, params=None):
        cid[0] += 1
        ws.send(json.dumps({'id': cid[0], 'method': method, 'params': params or {}}))
        return cid[0]

    def wait(c, t=45):
        end = time.time() + t
        while time.time() < end:
            try:
                ws.settimeout(max(0.2, end - time.time()))
                d = json.loads(ws.recv())
            except Exception:
                break
            if d.get('id') == c:
                return d
        return None

    def ev(expr, t=25):
        c = send('Runtime.evaluate', {'expression': expr, 'returnByValue': True})
        r = wait(c, t)
        if not r or 'error' in r:
            return None
        return r.get('result', {}).get('result', {}).get('value')

    send('Page.enable')
    send('Page.bringToFront')

    data = json.load(open(DATA))
    now = datetime.now(timezone.utc)
    used_hashes = {}
    for e in data['events']:
        if '/real/' in e['coverImageUrl']:
            p = os.path.join(ROOT, 'public', e['coverImageUrl'].lstrip('/'))
            if os.path.exists(p):
                h = hashlib.md5(open(p, 'rb').read()).hexdigest()
                used_hashes[h] = used_hashes.get(h, 0) + 1

    todo = [e for e in data['events']
            if '/real/' not in e['coverImageUrl']
            and re.search(r'activateuts|hellorubric', e.get('source') or '', re.I)]
    todo.sort(key=lambda e: e['startsAt'])
    todo = todo[:limit]
    print('本次抓取:', len(todo), '场（按时间优先）')

    ok = 0
    for i, e in enumerate(todo, 1):
        send('Page.navigate', {'url': e['source']})
        time.sleep(4.4)
        raw = ev(EXTRACT_JS, 15)
        if not raw:
            time.sleep(1.2)
            raw = ev(EXTRACT_JS, 15)
        try:
            cands = json.loads(raw) if raw else []
        except Exception:
            cands = [raw] if raw else []
        picked = False
        for img in cands[:8]:
            try:
                p = download(img)
                im = Image.open(p).convert('RGB')
                w, h = im.size
                st = ImageStat.Stat(im.convert('L'))
                if w < 600 or h < 300 or st.stddev[0] < 8:
                    continue
                hsh = hashlib.md5(open(p, 'rb').read()).hexdigest()
                if used_hashes.get(hsh, 0) >= 4:
                    continue
                used_hashes[hsh] = used_hashes.get(hsh, 0) + 1
                save(im, e['id'])
                e['coverImageUrl'] = '/assets/events/real/%s.jpg' % e['id']
                ok += 1
                picked = True
                print('  %d/%d  ✓ %s' % (i, len(todo), e['title'][:40]), flush=True)
                break
            except Exception:
                continue
        if not picked:
            print('  %d/%d  ✗ no usable image (%d candidates)' % (i, len(todo), len(cands)), flush=True)
        if i % 10 == 0:
            json.dump(data, open(DATA, 'w'), ensure_ascii=False, indent=1)

    json.dump(data, open(DATA, 'w'), ensure_ascii=False, indent=1)
    real = sum(1 for e in data['events'] if '/real/' in e['coverImageUrl'])
    print('\n本次成功 %d | 真实照片总数 %d / %d' % (ok, real, len(data['events'])))
    ws.close()


if __name__ == '__main__':
    main()
