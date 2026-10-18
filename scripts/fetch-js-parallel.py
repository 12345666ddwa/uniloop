#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch-js-parallel.py — 双标签页并行抓取 JS 站点的真实封面

目标：data-real.json 中仍在使用占位图、且 source 指向 activateuts / hellorubric 的活动。
每个工作线程持有一个 CDP 标签页：navigate → 等 readyState=complete（最多 8s）→ 再等 1.2s → 提取图片。
"""
import hashlib
import json
import os
import re
import ssl
import threading
import time
import urllib.request

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
  var m = document.querySelector('meta[property="og:image"]');
  if (m && m.content && good(m.content) && !/fallback-image/i.test(m.content)) return m.content;
  var imgs = Array.from(document.querySelectorAll('img')).map(function(i){ return i.currentSrc || i.src || ''; }).filter(good);
  var album = imgs.filter(function(u){ return /club-exec|uploaded_assets|uploadedimgs|\/uploads?\/|\/media\//i.test(u); });
  if (album.length) return album[0];
  var best = null, area = 0;
  document.querySelectorAll('img').forEach(function(i){
    var w = i.naturalWidth || 0, h = i.naturalHeight || 0;
    if (w >= 400 && h >= 200 && good(i.currentSrc || i.src || '')) { if (w*h > area) { area = w*h; best = i.currentSrc || i.src; } }
  });
  if (best) return best;
  var res = performance.getEntriesByType('resource').filter(function(r){ return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(r.name) && good(r.name); }).map(function(r){ return r.name; });
  return res.length ? res[0] : null;
})()
"""

lock = threading.Lock()
results = {'ok': {}, 'fail': []}
hash_used = {}


def make_tab():
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
    time.sleep(0.3)
    with urllib.request.urlopen('http://localhost:9222/json', timeout=10) as r:
        tabs = json.loads(r.read())
    tab = next((t for t in tabs if t.get('id') == tid), None)
    ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=45, suppress_origin=True)
    cid = [800000 + int(time.time() * 1000) % 100000]

    def drain():
        # 清掉导航产生的海量事件，避免后续命令的响应被淹没
        ws.settimeout(0.05)
        for _ in range(400):
            try:
                ws.recv()
            except Exception:
                break
        ws.settimeout(45)

    def send(method, params=None):
        drain()
        cid[0] += 1
        ws.send(json.dumps({'id': cid[0], 'method': method, 'params': params or {}}))
        return cid[0]

    def wait(c, t=40):
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
    return ws, send, wait, ev


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


def worker(targets, idx, total):
    ws, send, wait, ev = make_tab()
    try:
        for e in targets:
            url = e.get('source', '')
            send('Page.navigate', {'url': url})
            time.sleep(5.5)          # 固定等待：JS 站点渲染（轮询会在导航中被销毁的 context 上失败）
            ready = True
            img = ev(EXTRACT_JS, 15)
            if not img:
                time.sleep(1.5)
                img = ev(EXTRACT_JS, 15)
            if not img:
                with lock:
                    results['fail'].append({'id': e['id'], 'url': url})
                continue
            try:
                p = download(img)
                im = Image.open(p).convert('RGB')
                w, h = im.size
                st = ImageStat.Stat(im.convert('L'))
                if w < 400 or h < 200 or st.stddev[0] < 8:
                    raise ValueError('bad image %dx%d' % (w, h))
                hsh = hashlib.md5(open(p, 'rb').read()).hexdigest()
                with lock:
                    if hash_used.get(hsh, 0) >= 4:
                        results['fail'].append({'id': e['id'], 'url': url, 'reason': 'duplicate'})
                        continue
                    hash_used[hsh] = hash_used.get(hsh, 0) + 1
                    save(im, e['id'])
                    results['ok'][e['id']] = '/assets/events/real/%s.jpg' % e['id']
            except Exception as ex:
                with lock:
                    results['fail'].append({'id': e['id'], 'url': url, 'reason': str(ex)[:50]})
            with lock:
                done = len(results['ok']) + len(results['fail'])
            if done % 10 == 0:
                print('  worker%d: %d/%d ok=%d fail=%d' % (idx, done, total, len(results['ok']), len(results['fail'])), flush=True)
    finally:
        ws.close()


def main():
    data = json.load(open(DATA))
    targets = [e for e in data['events']
               if '/real/' not in e.get('coverImageUrl', '')
               and re.search(r'activateuts|hellorubric', e.get('source') or '', re.I)]
    print('待抓取（JS 站点）:', len(targets))
    # 已有的真实图哈希计入
    for e in data['events']:
        if '/real/' in e.get('coverImageUrl', ''):
            p = os.path.join(ROOT, 'public', e['coverImageUrl'].lstrip('/'))
            if os.path.exists(p):
                h = hashlib.md5(open(p, 'rb').read()).hexdigest()
                hash_used[h] = hash_used.get(h, 0) + 1

    half = len(targets) // 2
    chunks = [targets[:half], targets[half:]]
    threads = [threading.Thread(target=worker, args=(c, i + 1, len(targets))) for i, c in enumerate(chunks)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    by_id = {e['id']: e for e in data['events']}
    for eid, rel in results['ok'].items():
        by_id[eid]['coverImageUrl'] = rel
    json.dump(data, open(DATA, 'w'), ensure_ascii=False, indent=1)
    print('\n成功 %d，失败 %d' % (len(results['ok']), len(results['fail'])))
    real = sum(1 for e in data['events'] if '/real/' in e['coverImageUrl'])
    print('当前真实照片: %d / %d' % (real, len(data['events'])))


if __name__ == '__main__':
    main()
