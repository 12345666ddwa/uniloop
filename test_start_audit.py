#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始界面：对齐/尺寸/触控/溢出 的量化审计"""
import json, time, urllib.request, websocket
APP = 'http://localhost:3400/start.html?t=%d' % int(__import__('time').time())
def http(p, t=8):
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
bws.close(); time.sleep(3.5)
tab = next((t for t in http('/json') if t.get('id') == tid), None)
ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=25, suppress_origin=True)
cid=[44000]
def send(m,p=None):
    cid[0]+=1; ws.send(json.dumps({'id':cid[0],'method':m,'params':p or {}})); return cid[0]
def wait(c,t=25):
    dl=time.time()+t
    while time.time()<dl:
        try:
            ws.settimeout(max(0.2,dl-time.time())); d=json.loads(ws.recv())
        except Exception: break
        if d.get('id')==c: return d
    return None
def ev(e,t=25):
    c=send('Runtime.evaluate',{'expression':e,'returnByValue':True}); r=wait(c,t)
    if not r or 'error' in r: return None
    return r.get('result',{}).get('result',{}).get('value')

send('Page.enable')
send('Emulation.setDeviceMetricsOverride', {'width':390,'height':844,'deviceScaleFactor':2,'mobile':True})
send('Page.bringToFront'); time.sleep(3)

audit = ev("""(function(){
  function rect(el){var b=el.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};}
  var out={};
  // 1) 左边缘对齐（静态元素）
  out.leftEdges = Array.from(document.querySelectorAll('.hero h1,.hero .search,.sec h2,.sec button,.campuses')).map(function(el){return Math.round(el.getBoundingClientRect().left);});
  // 2) rail 卡片尺寸一致
  var cards=Array.from(document.querySelectorAll('#trackSoon .card')).slice(0,6).map(rect);
  out.cardSizes = cards.map(function(c){return c.w+'x'+c.h;});
  var thumbs=Array.from(document.querySelectorAll('#trackSoon .thumb')).slice(0,6).map(rect);
  out.thumbSizes = thumbs.map(function(t){return t.w+'x'+t.h;});
  // 3) 触控目标
  var small=[];
  document.querySelectorAll('button,a').forEach(function(el){
    var b=el.getBoundingClientRect();
    if(b.width>0 && (b.width<44 || b.height<44)) small.push((el.className||el.tagName)+' '+Math.round(b.width)+'x'+Math.round(b.height));
  });
  out.smallTargets = small.slice(0,10);
  // 4) 横向溢出
  out.overflow = document.documentElement.scrollWidth - window.innerWidth;
  // 5) 间距是否 8 的倍数（检查主要 padding/gap）
  var els=['.hero','.sec','.card .body','.row','.campuses'];
  out.spacing = {};
  els.forEach(function(sel){
    var el=document.querySelector(sel); if(!el) return;
    var cs=getComputedStyle(el);
    out.spacing[sel]=[cs.paddingTop,cs.paddingLeft,cs.gap].join(' / ');
  });
  // 6) 行高与字号
  out.type = {
    h1: getComputedStyle(document.querySelector('.hero h1')).fontSize + ' / ' + getComputedStyle(document.querySelector('.hero h1')).lineHeight,
    sec: getComputedStyle(document.querySelector('.sec h2')).fontSize,
    cardTitle: getComputedStyle(document.querySelector('.card .title')).fontSize,
    meta: getComputedStyle(document.querySelector('.card .meta')).fontSize
  };
  return JSON.stringify(out,null,1);
})()""", 20)
print(audit)
ws.close()
