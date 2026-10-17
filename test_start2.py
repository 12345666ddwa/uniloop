#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试 start.html v2：分步搜索 + 结果 + 详情 + 对齐审计"""
import base64, json, os, time, urllib.request, websocket
OUT = '/home/gaogao/workspace/sym-ai-open-2026/shots'
APP = 'http://localhost:3400/start.html?t=%d' % int(time.time())

def http(p, t=10):
    with urllib.request.urlopen('http://localhost:9222' + p, timeout=t) as r: return json.loads(r.read())
ver = http('/json/version')
bws = websocket.create_connection(ver['webSocketDebuggerUrl'], timeout=15, suppress_origin=True)
bws.send(json.dumps({'id': 1, 'method': 'Target.createTarget', 'params': {'url': APP}}))
tid=None; dl=time.time()+15
while time.time()<dl:
    try:
        bws.settimeout(max(0.2,dl-time.time())); d=json.loads(bws.recv())
    except Exception: break
    if d.get('id')==1: tid=d.get('result',{}).get('targetId'); break
bws.close(); time.sleep(4)
tab = next((t for t in http('/json') if t.get('id') == tid), None)
ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=30, suppress_origin=True)
cid=[53000]
def send(m,p=None):
    cid[0]+=1; ws.send(json.dumps({'id':cid[0],'method':m,'params':p or {}})); return cid[0]
def wait(c,t=30):
    dl=time.time()+t
    while time.time()<dl:
        try:
            ws.settimeout(max(0.2,dl-time.time())); d=json.loads(ws.recv())
        except Exception: break
        if d.get('id')==c: return d
    return None
def ev(e,t=30):
    c=send('Runtime.evaluate',{'expression':e,'returnByValue':True}); r=wait(c,t)
    if not r or 'error' in r: return None
    return r.get('result',{}).get('result',{}).get('value')
def shot(n):
    c=send('Page.captureScreenshot',{'format':'png'}); r=wait(c,30)
    d=(r or {}).get('result',{}).get('data')
    if d: open(os.path.join(OUT,n),'wb').write(base64.b64decode(d)); print('📸',n,flush=True)

send('Page.enable')
send('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':2,'mobile':True})
send('Page.bringToFront'); time.sleep(3.5)
print('title:', ev('document.title'), flush=True)
print('sugg chips:', ev("document.querySelectorAll('#suggRow button').length"), flush=True)
print('cards:', ev("document.querySelectorAll('.card').length"), '| pills:', ev("document.querySelectorAll('#pillRow .pill').length"), flush=True)
print('overflow:', ev("document.documentElement.scrollWidth - window.innerWidth"), flush=True)
shot('v2s_1_home.png')

# 打开搜索 Step 1
ev("document.getElementById('segWhere').click()", 12); time.sleep(1.0)
print('step1 opts:', ev("document.querySelectorAll('#searchOpts .opt').length"), '|', ev("document.getElementById('searchTitle').textContent"), flush=True)
shot('v2s_2_step1.png')
# 选 MQ
ev("""(function(){var o=Array.from(document.querySelectorAll('#searchOpts .opt')).find(function(x){return /Macquarie/.test(x.innerText);}); if(o)o.click(); return !!o;})()""", 12)
time.sleep(0.6)
# 下一步
ev("document.getElementById('searchShow').click()", 12); time.sleep(0.8)
print('step2:', ev("document.getElementById('searchTitle').textContent"), flush=True)
shot('v2s_3_step2.png')
ev("""(function(){var o=Array.from(document.querySelectorAll('#searchOpts .opt')).find(function(x){return /This weekend/.test(x.innerText);}); if(o)o.click(); return !!o;})()""", 12)
time.sleep(0.5)
ev("document.getElementById('searchShow').click()", 12); time.sleep(0.8)
print('step3:', ev("document.getElementById('searchTitle').textContent"), flush=True)
ev("""(function(){var o=Array.from(document.querySelectorAll('#searchOpts .opt')).find(function(x){return /Outdoors/.test(x.innerText);}); if(o)o.click(); return !!o;})()""", 12)
time.sleep(0.5)
print('preview count:', ev("document.getElementById('searchCount').textContent"), flush=True)
shot('v2s_4_step3.png')
# 应用
ev("document.getElementById('searchShow').click()", 12); time.sleep(1.2)
print('results:', ev("document.getElementById('resCount').textContent"), '| rows:', ev("document.querySelectorAll('.row').length"), flush=True)
print('pills now:', ev("Array.from(document.querySelectorAll('#pillRow .pill')).map(function(b){return b.innerText.replace(/\\s+/g,' ');}).join(' | ')"), flush=True)
shot('v2s_5_results.png')
# 打开第一行
ev("""(function(){var r=document.querySelector('.row'); if(r){r.click();return 'ok';} return 'none';})()""", 12); time.sleep(1.0)
shot('v2s_6_event.png')

audit = ev("""(function(){
  function L(sel){var el=document.querySelector(sel);return el?Math.round(el.getBoundingClientRect().left):null;}
  var cards=Array.from(document.querySelectorAll('#trackSoon .card')).slice(0,4).map(function(c){var b=c.getBoundingClientRect();return Math.round(b.width)+'x'+Math.round(b.height);});
  var thumbs=Array.from(document.querySelectorAll('#trackSoon .thumb')).slice(0,4).map(function(c){var b=c.getBoundingClientRect();return Math.round(b.width)+'x'+Math.round(b.height);});
  var small=[];
  document.querySelectorAll('button').forEach(function(b){var r=b.getBoundingClientRect(); if(r.width>0&&(r.width<44||r.height<44)) small.push((b.className||b.tagName)+' '+Math.round(r.width)+'x'+Math.round(r.height));});
  return JSON.stringify({left:{h1:L('h1'),search:L('.searchbar'),pills:L('.pills'),sec:L('.sec h2')},cards:cards,thumbs:thumbs,small:small.slice(0,8),overflow:document.documentElement.scrollWidth-window.innerWidth},null,1);
})()""", 20)
print('=== AUDIT ===')
print(audit)
ws.close(); print('DONE')
