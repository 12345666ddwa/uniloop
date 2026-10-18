#!/bin/bash
# package.sh — 打包成可独立运行的 zip（放到桌面）
set -e
cd "$(dirname "$0")/.."
python3 - <<'PY'
import os, shutil, zipfile, time
SRC='.'; PKG='/tmp/uniloop_pkg/uniloop'
shutil.rmtree('/tmp/uniloop_pkg', ignore_errors=True); os.makedirs(PKG)
def cp(src,dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src,dst)
for f in ['server.js','seed.js','data-real.json','package.json','CHANGELOG.md']:
    if os.path.exists(f): cp(f, os.path.join(PKG,f))
if os.path.exists('README_PACKAGE.md'): cp('README_PACKAGE.md', os.path.join(PKG,'README.md'))
for sub in ['v3','demo','assets']:
    s=os.path.join('public',sub)
    if os.path.isdir(s): shutil.copytree(s, os.path.join(PKG,'public',sub), dirs_exist_ok=True)
os.makedirs(os.path.join(PKG,'docs'), exist_ok=True)
for d in ['FEATURE_AUDIT.md','UniLoop_Demo_Guide_EN.docx','MOBILE_UI_RESEARCH.md','PREMIUM_HERO_NOTES.md','MEETUP_AIRBNB_RESEARCH.md','GIT_WORKFLOW.md']:
    p=os.path.join('docs',d)
    if os.path.exists(p): cp(p, os.path.join(PKG,'docs',d))
os.makedirs(os.path.join(PKG,'bin'), exist_ok=True)
for b in ['save.sh','push.sh','tunnel.sh']:
    if os.path.exists(os.path.join('bin',b)): cp(os.path.join('bin',b), os.path.join(PKG,'bin',b))
os.makedirs(os.path.join(PKG,'tests'), exist_ok=True)
for t in ['test_api2.py','test_mobile2.py']:
    if os.path.exists(t): cp(t, os.path.join(PKG,'tests',t))
out='/mnt/c/Users/18613/Desktop/UniLoop_v3_%s.zip' % time.strftime('%Y-%m-%d')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for root,dirs,fs in os.walk(PKG):
        for f in fs:
            fp=os.path.join(root,f); z.write(fp, os.path.relpath(fp, os.path.dirname(PKG)))
print('zip ->', out, '%.2f MB' % (os.path.getsize(out)/1024/1024))
PY
