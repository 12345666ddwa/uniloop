#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""抓取候选产品主页截图（桌面 1440×900 + 部分移动端 390×844）"""
import base64, json, os, time, urllib.request, websocket

OUT = '/home/gaogao/workspace/sym-ai-open-2026/shots/refs'
os.makedirs(OUT, exist_ok=True)

SITES = [
    ('01_luma',        'https://luma.com/discover'),
    ('02_eventbrite',  'https://www.eventbrite.com.au/d/australia--sydney/events/'),
    ('03_meetup',      'https://www.meetup.com/find/?location=au--Sydney&source=EVENTS'),
    ('04_dice',        'https://dice.fm/browse/sydney'),
    ('05_fever',       'https://feverup.com/en/sydney'),
    ('06_airbnb_exp',  'https://www.airbnb.com.au/s/Sydney/experiences'),
    ('07_timeout',     'https://www.timeout.com/sydney/whats-on'),
    ('08_ra',          'https://ra.co/events/au/sydney'),
    ('09_classpass',   'https://classpass.com/explore'),
    ('10_partiful',    'https://partiful.com/discover'),
]

MOBILE = {'01_luma', '04_dice', '05_fever'}

def http(p, t=10):
    with urllib.request.urlopen('http://localhost:9222' + p, timeout=t) as r:
        return json.loads(r.read())

def new_tab(url):
    ver = http('/json/version')
    ws = websocket.create_connection(ver['webSocketDebuggerUrl'], timeout=15, suppress_origin=True)
    ws.send(json.dumps({'id': 1, 'method': 'Target.createTarget', 'params': {'url': url}}))
    tid = None; dl = time.time() + 15
    while time.time() < dl:
        try:
            ws.settimeout(max(0.2, dl - time.time())); d = json.loads(ws.recv())
        except Exception: break
        if d.get('id') == 1: tid = d.get('result', {}).get('targetId'); break
    ws.close()
    return tid

def close_tab(tid):
    ver = http('/json/version')
    ws = websocket.create_connection(ver['webSocketDebuggerUrl'], timeout=10, suppress_origin=True)
    ws.send(json.dumps({'id': 1, 'method': 'Target.closeTarget', 'params': {'targetId': tid}}))
    try: ws.recv()
    except Exception: pass
    ws.close()

def shoot(tid, name, w, h, mobile):
    tab = next((t for t in http('/json') if t.get('id') == tid), None)
    if not tab: return None, 'no tab'
    ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=25, suppress_origin=True)
    cid = [50000]
    def send(m, p=None):
        cid[0] += 1; ws.send(json.dumps({'id': cid[0], 'method': m, 'params': p or {}})); return cid[0]
    def wait(c, t=25):
        dl = time.time() + t
        while time.time() < dl:
            try:
                ws.settimeout(max(0.2, dl - time.time())); d = json.loads(ws.recv())
            except Exception: break
            if d.get('id') == c: return d
        return None
    send('Page.enable')
    send('Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': 2 if mobile else 1, 'mobile': mobile})
    time.sleep(5.5)
    title = None
    c = send('Runtime.evaluate', {'expression': 'document.title', 'returnByValue': True})
    r = wait(c, 10)
    if r and 'result' in r: title = r['result'].get('result', {}).get('value')
    c = send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 82})
    r = wait(c, 30)
    data = (r or {}).get('result', {}).get('data')
    path = os.path.join(OUT, name + '.jpg')
    if data: open(path, 'wb').write(base64.b64decode(data))
    ws.close()
    return (path if data else None), title

results = []
for key, url in SITES:
    try:
        tid = new_tab(url)
        path, title = shoot(tid, key + '_desktop', 1440, 900, False)
        results.append((key, url, title, path, ''))
        print(key, '| desktop |', title, '|', 'ok' if path else 'fail', flush=True)
        if key in MOBILE:
            p2, _ = shoot(tid, key + '_mobile', 390, 844, True)
            print('   └ mobile', 'ok' if p2 else 'fail', flush=True)
        close_tab(tid)
    except Exception as e:
        results.append((key, url, None, None, str(e)[:80]))
        print(key, 'ERROR', str(e)[:120], flush=True)
    time.sleep(0.5)

print('\n=== SUMMARY ===')
for k, u, t, p, e in results:
    print(k, '|', (t or '')[:60], '|', 'IMG' if p else 'NO IMG', '|', e)
