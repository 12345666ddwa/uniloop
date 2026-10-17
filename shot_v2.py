#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v2 截图：发现页/详情(地图)/社团/社团主页/收藏/主办方 Hub/竖版预览"""
import base64, json, os, time, urllib.request, websocket
OUT = '/home/gaogao/workspace/sym-ai-open-2026/shots'
APP = 'http://localhost:3400'

def http(p, t=8):
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
    ws.close(); time.sleep(3.5)
    return next((t for t in http('/json') if t.get('id') == tid), None)

tab = new_tab(APP + '/?t=' + str(int(time.time())))
ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=25, suppress_origin=True)
cid = [40000]
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
def shot(n, full=False):
    p = {'format': 'png'}
    c = send('Page.captureScreenshot', p); r = wait(c, 30)
    d = (r or {}).get('result', {}).get('data')
    if d: open(os.path.join(OUT, n), 'wb').write(base64.b64decode(d)); print('📸', n, flush=True)

send('Page.bringToFront'); time.sleep(2)
print('title:', ev('document.title'), '| events:', ev("document.querySelectorAll('[data-open]').length"), flush=True)

# 登录学生
print('login:', ev("""(async()=>{ const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'student@uniloop.demo',password:'demo1234'})}); location.href='/?t='+Date.now()+'#/'; return r.status; })()""", 25, True), flush=True)
time.sleep(5)
shot('v2_1_discover.png')

# 详情（带地图）
print('detail:', ev("""(async()=>{ const r=await fetch('/api/events?when=all'); const j=await r.json(); const e=j.events.find(x=>x.category==='outdoors')||j.events[0]; location.hash='#/event/'+e.id; return e.title; })()""", 20, True), flush=True)
time.sleep(4)
print('map iframe:', ev("!!document.querySelector('.mapcard iframe')"), flush=True)
shot('v2_2_detail.png')

# 社团目录
ev("location.hash='#/societies'", 10); time.sleep(3.5)
print('soc cards:', ev("document.querySelectorAll('[data-soc]').length"), '| crests:', ev("document.querySelectorAll('.campus-head img').length"), flush=True)
shot('v2_3_societies.png')

# 社团主页
ev("location.hash='#/society/soc_outdoors'", 10); time.sleep(3.5)
print('hub stats:', ev("document.querySelectorAll('.hub-stats .cell').length"), flush=True)
shot('v2_4_society_hub.png')
# 相册 tab
print('tab past:', ev("""(function(){var b=document.querySelector('[data-soctab="past"]'); if(b){b.click(); return 'ok';} return 'NF';})()""", 15), flush=True)
time.sleep(2.5); shot('v2_5_society_gallery.png')

# 收藏
ev("location.hash='#/saved'", 10); time.sleep(2.5); shot('v2_6_saved.png')

# 主办方
print('exec:', ev("""(async()=>{ await fetch('/api/auth/logout',{method:'POST'}); const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'exec@uniloop.demo',password:'demo1234'})}); location.href='/?t='+Date.now()+'#/organiser'; return r.status; })()""", 25, True), flush=True)
time.sleep(6)
print('kpis:', ev("document.querySelectorAll('.kpi2').length"), '| chart:', ev("!!document.querySelector('.chart')"), '| gallery:', ev("document.querySelectorAll('.gallery figure').length"), flush=True)
shot('v2_7_organiser.png')

# 竖版预览
ev("location.hash='#/preview'", 10); time.sleep(3.5); shot('v2_8_preview.png')
ws.close(); print('DONE')
