#!/usr/bin/env node
// build.js — 把 src/ 的 CSS/JS 内联成 public/index.html（与队友版一致的"单文件"结构）
'use strict';
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const templateCss = read('src/template.css');
const extraCss = read('src/app.css');
const appJs = read('src/app.js');
let html = read('src/index.template.html');

// 用函数替换，避免 $& 等替换语法误伤代码
html = html.replace('/*__TEMPLATE_CSS__*/', () => templateCss);
html = html.replace('/*__EXTRA_CSS__*/', () => extraCss);
html = html.replace('/*__APP_JS__*/', () => appJs);

const out = path.join(root, 'public/index.html');
fs.writeFileSync(out, html);
console.log('built', out, (html.length / 1024).toFixed(1) + ' KB');
