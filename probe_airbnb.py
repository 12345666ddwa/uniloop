#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""拆解 Airbnb Experiences 搜索：点开搜索 → 分步面板（Where / When / What）+ 推荐词"""
import base64, json, os, time, urllib.request, websocket
OUT = '/home/gaogao/workspace/sym-ai-open-2026/shots/refs'
URL = 'https://www.airbnb.com.au/s/Sydney/experiences'

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
bws.close(); time.sleep(7)
tab = next((t for t in http('/json') if t.get('id') == tid), None)
ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=30, suppress_origin=True)
cid = [52000]
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
# 关 cookie 弹窗（如果有）
ev("""(function(){var b=Array.from(document.querySelectorAll('button')).find(function(x){return /accept|ok|got it|agree/i.test(x.innerText||'');}); if(b){b.click();return 'closed';} return 'none';})()""", 12)
time.sleep(1.2)
shot('airbnb_1_page.jpg')

# 找搜索入口
print('search inputs:', ev("""JSON.stringify(Array.from(document.querySelectorAll('input,button[role="combobox"],[data-testid*="search"]')).slice(0,12).map(function(el){return {tag:el.tagName,ph:el.placeholder||el.getAttribute('aria-label')||'',tid:el.getAttribute('data-testid')||'',txt:(el.innerText||'').slice(0,40)};}))""", 15), flush=True)

# 点击"搜索"区域
clicked = ev("""(function(){
  var cands=Array.from(document.querySelectorAll('button,input,[role="combobox"],[data-testid]'));
  var el=cands.find(function(x){var t=(x.innerText||'')+' '+(x.placeholder||'')+' '+(x.getAttribute('aria-label')||''); return /search|where|experiences/i.test(t) && x.offsetParent!==null;});
  if(!el) return 'NF';
  el.click(); return (el.tagName+'/'+(el.getAttribute('data-testid')||'')).slice(0,60);
})()""", 15)
print('clicked:', clicked, flush=True)
time.sleep(2.5)
shot('airbnb_2_search_open.jpg')

panel = ev("""(function(){
  var dlg=document.querySelector('[role="dialog"]')||document.body;
  var t=(dlg.innerText||'').replace(/\\s+/g,' ').trim();
  return t.slice(0,2500);
})()""", 20)
print('=== 搜索面板文本 ===')
print(panel, flush=True)

# 尝试点 "Where"/destination 输入，看第二步建议
step2 = ev("""(function(){
  var el=Array.from(document.querySelectorAll('input,button,div[role="button"]')).find(function(x){return /where|search destinations|destination/i.test((x.placeholder||'')+' '+(x.getAttribute('aria-label')||'')+' '+(x.innerText||''));});
  if(!el) return 'NF'; el.click(); return 'ok';
})()""", 15)
print('step2 click:', step2, flush=True)
time.sleep(2)
shot('airbnb_3_where.jpg')
print('=== 第二步面板 ===')
print(ev("""(function(){var d=document.querySelector('[role="dialog"]')||document.body;return (d.innerText||'').replace(/\\s+/g,' ').slice(0,1600);})()""", 20), flush=True)
ws.close(); print('DONE')
