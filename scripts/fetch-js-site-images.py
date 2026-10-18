#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch-js-site-images.py — 用真实浏览器渲染 JS 站点（activateuts）并抓封面图

读取 scripts/event-images-report.json 里 no-image 的活动，逐页用 CDP 打开：
  og:image → 最大 <img>（naturalWidth≥400）→ 首个 background-image
下载后与第一批相同的尺寸校验/缩放逻辑，写入 public/assets/events/real/<id>.jpg
"""
import hashlib
import json
import os
import re
import ssl
import time
import urllib.parse
import urllib.request

import websocket
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'events', 'real')
REPORT = os.path.join(ROOT, 'scripts', 'event-images-report.json')
CACHE = os.path.join(ROOT, '.cache', 'event-images')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

EXTRACT_JS = r"""
(function(){
  function good(u){ return u && !/fallback-image|logo|icon|sprite|avatar|placeholder|empty_state/i.test(u); }
  var m = document.querySelector('meta[property="og:image"]');
  if (m && m.content && good(m.content)) return m.content;
  // 1) 活动相册/上传目录里的图（activateuts 用 /club-exec/，其他站点用 uploads/media）
  var imgs = Array.from(document.querySelectorAll('img')).map(function(i){ return i.currentSrc || i.src || ''; });
  var album = imgs.filter(function(u){ return /club-exec|uploaded_assets|\/uploads?\/|\/media\/|\/images\//i.test(u) && good(u) && !/placeholders?/i.test(u); });
  if (album.length) {
    // 选第一张足够大的
    for (var k = 0; k < album.length; k++) {
      var el = Array.from(document.querySelectorAll('img')).filter(function(i){ return (i.currentSrc||i.src) === album[k]; })[0];
      if (!el || (el.naturalWidth >= 400)) return album[k];
    }
    return album[0];
  }
  // 2) 页面里最大的图片
  var best = null, area = 0;
  document.querySelectorAll('img').forEach(function(i){
    var w = i.naturalWidth || 0, h = i.naturalHeight || 0;
    if (w >= 400 && h >= 200 && good(i.currentSrc || i.src || '')) {
      if (w*h > area) { area = w*h; best = i.currentSrc || i.src; }
    }
  });
  if (best) return best;
  // 3) 已加载的图片资源（含懒加载）
  var res = performance.getEntriesByType('resource')
    .filter(function(r){ return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(r.name) && good(r.name); })
    .map(function(r){ return r.name; });
  if (res.length) return res[0];
  // 4) background-image
  var nodes = document.querySelectorAll('[style*="background-image"], .hero, header, [class*="hero"], [class*="banner"]');
  for (var i = 0; i < nodes.length; i++) {
    var bg = getComputedStyle(nodes[i]).backgroundImage || '';
    var mm = bg.match(/url\(["']?([^"')]+)/);
    if (mm && good(mm[1])) return mm[1];
  }
  return null;
})()
"""


def cdp_connect():
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
    ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=40, suppress_origin=True)
    cid = [900000]

    def send(method, params=None):
        cid[0] += 1
        ws.send(json.dumps({'id': cid[0], 'method': method, 'params': params or {}}))
        return cid[0]

    def wait(c, t=40):
        dl2 = time.time() + t
        while time.time() < dl2:
            try:
                ws.settimeout(max(0.2, dl2 - time.time()))
                d = json.loads(ws.recv())
            except Exception:
                break
            if d.get('id') == c:
                return d
        return None

    def ev(expr, t=30):
        c = send('Runtime.evaluate', {'expression': expr, 'returnByValue': True})
        r = wait(c, t)
        if not r or 'error' in r:
            return None
        return r.get('result', {}).get('result', {}).get('value')

    send('Page.enable')
    return ws, send, wait, ev


def download(url):
    key = hashlib.md5(url.encode()).hexdigest()
    for ext in ('.jpg', '.png', '.webp', ''):
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
    if w < 300 or h < 160:
        return False
    im2 = im.resize((720, max(1, round(h * 720 / w))), getattr(Image, 'Resampling', Image).LANCZOS)
    if im2.height > 480:
        top = max(0, (im2.height - 480) // 2)
        im2 = im2.crop((0, top, 720, top + 480))
    im2.save(os.path.join(OUT_DIR, eid + '.jpg'), 'JPEG', quality=78, optimize=True, progressive=True)
    return True


def main():
    data = json.load(open(os.path.join(ROOT, 'data-real.json')))
    by_id = {e['id']: e for e in data['events']}
    report = json.load(open(REPORT))
    targets = [{'id': e['id'], 'url': e.get('source', '')} for e in data['events']
               if '/real/' not in e.get('coverImageUrl', '') and (e.get('source') or '').startswith('http')
               and re.search(r'activateuts|hellorubric', e.get('source') or '', re.I)]
    print('待处理:', len(targets))
    ws, send, wait, ev = cdp_connect()
    ok, fail = {}, []
    for i, m in enumerate(targets, 1):
        ev0 = by_id.get(m['id'])
        if not ev0:
            continue
        url = m.get('url') or ev0.get('source')
        send('Page.navigate', {'url': url})
        time.sleep(3.2)
        ev('window.scrollTo(0,0)', 8)
        img = ev(EXTRACT_JS, 20)
        if not img:
            fail.append({'id': m['id'], 'reason': 'no-image-in-browser', 'url': url})
            continue
        try:
            p = download(img)
            im = Image.open(p).convert('RGB')
            if save(im, m['id']):
                ok[m['id']] = '/assets/events/real/%s.jpg' % m['id']
            else:
                fail.append({'id': m['id'], 'reason': 'too-small', 'url': img})
        except Exception as e:
            fail.append({'id': m['id'], 'reason': '%s: %s' % (type(e).__name__, str(e)[:50]), 'url': img})
        if i % 10 == 0:
            print('  ...%d/%d  ok=%d fail=%d' % (i, len(targets), len(ok), len(fail)), flush=True)
    ws.close()

    report['mapping'].update(ok)
    report['misses'] = [m for m in report['misses'] if m['id'] not in ok] + fail
    json.dump(report, open(REPORT, 'w'), indent=1)
    for e in data['events']:
        if e['id'] in ok:
            e['coverImageUrl'] = ok[e['id']]
    json.dump(data, open(os.path.join(ROOT, 'data-real.json'), 'w'), ensure_ascii=False, indent=1)
    print('\n浏览器兜底：成功 %d，失败 %d' % (len(ok), len(fail)))
    print('总映射:', len(report['mapping']))


if __name__ == '__main__':
    main()
