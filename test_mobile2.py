#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v2 移动端 390px 横向溢出检查"""
import json, time, urllib.request, websocket
APP = 'http://localhost:3400'
def http(p, t=8):
    with urllib.request.urlopen('http://localhost:9222' + p, timeout=t) as r: return json.loads(r.read())
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
cid = [41000]
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
    return r.get('result', {}).get('result', {}).get('value')
send('Page.enable')
send('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 2, 'mobile': True})
time.sleep(2)
ev("""(async()=>{ await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'student@uniloop.demo',password:'demo1234'})}); return 1; })()""", 20, True)
routes = ['#/', '#/societies', '#/saved', '#/my', '#/event/evt_1', '#/society/soc_outdoors', '#/preview']
print('=== 390px 溢出 ===')
for r in routes:
    ev("location.hash='%s'" % r, 10); time.sleep(2.4)
    m = ev("""(function(){var d=document.documentElement;var w=0,worst=null;document.querySelectorAll('body *').forEach(function(el){var b=el.getBoundingClientRect();if(b.width>window.innerWidth+2&&b.width>w){w=b.width;worst=el.className||el.tagName;}});return JSON.stringify({overflow:d.scrollWidth-window.innerWidth,worst:worst,worstW:Math.round(w)});})()""", 15)
    print(' ', r, '->', m)
ev("""(async()=>{ await fetch('/api/auth/logout',{method:'POST'}); await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'exec@uniloop.demo',password:'demo1234'})}); return 1; })()""", 20, True)
ev("location.hash='#/organiser'", 10); time.sleep(4)
m = ev("""(function(){var d=document.documentElement;var w=0,worst=null;document.querySelectorAll('body *').forEach(function(el){var b=el.getBoundingClientRect();if(b.width>window.innerWidth+2&&b.width>w){w=b.width;worst=el.className||el.tagName;}});return JSON.stringify({overflow:d.scrollWidth-window.innerWidth,worst:worst,worstW:Math.round(w),kpis:document.querySelectorAll('.kpi2').length});})()""", 15)
print('  #/organiser ->', m)
ws.close()
