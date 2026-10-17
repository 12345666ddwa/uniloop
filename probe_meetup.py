#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""拆解 Meetup 发现页：区块标题 / 导航 / 筛选器 / 卡片结构 + 分屏截图"""
import base64, json, os, time, urllib.request, websocket
OUT = '/home/gaogao/workspace/sym-ai-open-2026/shots/refs'
os.makedirs(OUT, exist_ok=True)
URL = 'https://www.meetup.com/find/?location=au--Sydney&source=EVENTS'

def http(p, t=10):
    with urllib.request.urlopen('http://localhost:9222' + p, timeout=t) as r:
        return json.loads(r.read())

ver = http('/json/version')
bws = websocket.create_connection(ver['webSocketDebuggerUrl'], timeout=15, suppress_origin=True)
bws.send(json.dumps({'id': 1, 'method': 'Target.createTarget', 'params': {'url': URL}}))
tid = None; dl = time.time() + 15
while time.time() < dl:
    try:
        bws.settimeout(max(0.2, dl - time.time())); d = json.loads(bws.recv())
    except Exception: break
    if d.get('id') == 1: tid = d.get('result', {}).get('targetId'); break
bws.close(); time.sleep(6)
tab = next((t for t in http('/json') if t.get('id') == tid), None)
ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=30, suppress_origin=True)
cid = [51000]
def send(m, p=None):
    cid[0] += 1; ws.send(json.dumps({'id': cid[0], 'method': m, 'params': p or {}})); return cid[0]
def wait(c, t=30):
    dl = time.time() + t
    while time.time() < dl:
        try:
            ws.settimeout(max(0.2, dl - time.time())); d = json.loads(ws.recv())
        except Exception: break
        if d.get('id') == c: return d
    return None
def ev(e, t=30):
    c = send('Runtime.evaluate', {'expression': e, 'returnByValue': True}); r = wait(c, t)
    if not r or 'error' in r: return None
    return r.get('result', {}).get('result', {}).get('value')
def shot(n):
    c = send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 82}); r = wait(c, 30)
    d = (r or {}).get('result', {}).get('data')
    if d: open(os.path.join(OUT, n), 'wb').write(base64.b64decode(d)); print('📸', n, flush=True)

send('Page.enable')
send('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False})
time.sleep(3)

info = ev("""(function(){
  function txt(el){return (el.innerText||'').trim().replace(/\\s+/g,' ');}
  var out={};
  out.title=document.title;
  out.h1=Array.from(document.querySelectorAll('h1')).map(txt).slice(0,4);
  out.h2=Array.from(document.querySelectorAll('h2')).map(txt).filter(Boolean).slice(0,20);
  out.h3=Array.from(document.querySelectorAll('h3')).map(txt).filter(Boolean).slice(0,25);
  out.nav=Array.from(document.querySelectorAll('nav a, header a')).map(txt).filter(function(t){return t && t.length<40;}).slice(0,25);
  out.buttons=Array.from(document.querySelectorAll('button,[role="button"]')).map(txt).filter(function(t){return t && t.length<40;}).slice(0,40);
  out.inputs=Array.from(document.querySelectorAll('input')).map(function(i){return (i.placeholder||i.getAttribute('aria-label')||i.type||'').slice(0,60);}).slice(0,10);
  out.links=Array.from(document.querySelectorAll('a[href]')).map(function(a){var t=txt(a);return t?{t:t.slice(0,60),h:a.getAttribute('href').slice(0,80)}:null;}).filter(Boolean).slice(0,40);
  out.bodyLen=(document.body.innerText||'').length;
  return JSON.stringify(out,null,1);
})()""", 25)
print('=== MEETUP DOM ===')
print(info[:6000] if info else 'FAIL')

shot('meetup_full_1.jpg')
# 向下滚动，分屏截图
for i, y in enumerate([900, 1800, 2700, 3600], start=2):
    ev("window.scrollTo(0,%d)" % y, 10); time.sleep(1.6)
    shot('meetup_full_%d.jpg' % i)
ev("window.scrollTo(0,0)", 10)
ws.close()
print('DONE')
