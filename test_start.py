#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试并截图初始界面原型 /start.html"""
import base64, json, os, time, urllib.request, websocket
OUT = '/home/gaogao/workspace/sym-ai-open-2026/shots'
APP = 'http://localhost:3400/start.html?t=%d' % int(__import__('time').time())

def http(p, t=8):
    with urllib.request.urlopen('http://localhost:9222' + p, timeout=t) as r:
        return json.loads(r.read())

ver = http('/json/version')
bws = websocket.create_connection(ver['webSocketDebuggerUrl'], timeout=15, suppress_origin=True)
bws.send(json.dumps({'id': 1, 'method': 'Target.createTarget', 'params': {'url': APP}}))
tid = None; dl = time.time() + 15
while time.time() < dl:
    try:
        bws.settimeout(max(0.2, dl - time.time())); d = json.loads(bws.recv())
    except Exception: break
    if d.get('id') == 1: tid = d.get('result', {}).get('targetId'); break
bws.close(); time.sleep(3)
tab = next((t for t in http('/json') if t.get('id') == tid), None)
ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=25, suppress_origin=True)
cid = [43000]
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
def ev(e, t=25, awaitp=False):
    c = send('Runtime.evaluate', {'expression': e, 'returnByValue': True, 'awaitPromise': awaitp})
    r = wait(c, t)
    if not r or 'error' in r: return None
    res = r.get('result', {})
    if 'exceptionDetails' in res: return 'EXC ' + str(res['exceptionDetails'])[:200]
    return res.get('result', {}).get('value')
def shot(n):
    c = send('Page.captureScreenshot', {'format': 'png'}); r = wait(c, 30)
    d = (r or {}).get('result', {}).get('data')
    if d: open(os.path.join(OUT, n), 'wb').write(base64.b64decode(d)); print('📸', n, flush=True)

send('Page.enable')
send('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 2, 'mobile': True})
send('Page.bringToFront'); time.sleep(3.5)
print('title:', ev('document.title'), flush=True)
print('cards:', ev("document.querySelectorAll('.card').length"), '| campuses:', ev("document.querySelectorAll('.campus').length"), flush=True)
print('overflow:', ev("document.documentElement.scrollWidth - window.innerWidth"), flush=True)
print('align left edges:', ev("""(function(){var xs=[];document.querySelectorAll('.hero h1, .sec h2, .card, .row, .campus').forEach(function(el){xs.push(Math.round(el.getBoundingClientRect().left));});return JSON.stringify(xs.slice(0,12));})()""", 15), flush=True)
shot('start_1_mobile.png')

# 打开抽屉
print('open card:', ev("""(function(){var c=document.querySelector('.card'); if(!c) return 'no card'; c.click(); return 'ok';})()""", 15), flush=True)
time.sleep(1.2); shot('start_2_sheet.png')
ev("document.getElementById('scrim').click()", 10); time.sleep(0.6)

# 搜索
ev("""(function(){var q=document.getElementById('q'); q.value='free saturday morning'; q.dispatchEvent(new Event('input')); return 'ok';})()""", 12); time.sleep(1.6)
print('results:', ev("document.getElementById('resCount') ? document.getElementById('resCount').textContent : 'none'"), '| rows:', ev("document.querySelectorAll('.row').length"), flush=True)
shot('start_3_results.png')

# 分类 + 清空
ev("document.getElementById('clearBtn').click()", 10); time.sleep(0.8)
ev("""(function(){var b=document.querySelector('[data-cat="creative"]'); b.click(); return 1;})()""", 10); time.sleep(1.2)
print('creative rows:', ev("document.querySelectorAll('.row').length"), flush=True)
shot('start_4_creative.png')

# 桌面视图
send('Emulation.clearDeviceMetricsOverride')
send('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False})
time.sleep(2)
shot('start_5_desktop.png')
ws.close(); print('DONE')
