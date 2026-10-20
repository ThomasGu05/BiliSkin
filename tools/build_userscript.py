#!/usr/bin/env python3
"""把扩展的核心逻辑打包成单文件用户脚本（Tampermonkey / Violentmonkey）。

用法: python3 tools/build_userscript.py
产物: bili-skin.user.js

设计：
  - 把 skin.css / shared.js / content.js 原样内联，避免两套逻辑分叉；
  - 用户脚本环境没有 chrome.storage，shared.js 会自动退回 localStorage；
  - 额外注入一个轻量浮动面板（右下角小圆点），没有 popup 也能改设置。
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
VERSION = json.load(open(os.path.join(ROOT, "manifest.json"), encoding="utf-8"))["version"]


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def indent_css(css):
    return "\n".join("  " + line if line.strip() else "" for line in css.splitlines())


PANEL_JS = r"""
/* ------------------------------------------------------------------ *
 * 用户脚本专用：右下角浮动设置面板
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  if (window.__biliSkinPanel) return;
  window.__biliSkinPanel = true;

  var SK = window.BiliSkin;
  if (!SK) return;

  var host = document.createElement('div');
  host.id = 'bili-skin-panel-host';
  host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;';
  document.documentElement.appendChild(host);

  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = [
    '<style>',
    '  .dot{width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;',
    '    background:linear-gradient(135deg,#00aeec,#fb7299);color:#fff;font-size:19px;',
    '    box-shadow:0 8px 24px rgba(0,0,0,.35);display:grid;place-items:center;transition:transform .15s;}',
    '  .dot:hover{transform:scale(1.06)}',
    '  .panel{position:absolute;right:0;bottom:56px;width:280px;padding:14px;border-radius:14px;',
    '    background:rgba(20,21,26,.97);color:#f2f3f5;border:1px solid rgba(255,255,255,.1);',
    '    box-shadow:0 18px 50px rgba(0,0,0,.5);display:none;font-size:13px;backdrop-filter:blur(14px);}',
    '  .panel.open{display:block}',
    '  h3{margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:.3px;display:flex;justify-content:space-between;align-items:center}',
    '  h3 small{font-weight:400;color:#9aa0aa;font-size:11px}',
    '  .row{display:flex;gap:6px;margin-bottom:8px}',
    '  .seg{display:flex;gap:4px;background:#23262f;padding:4px;border-radius:9px;margin-bottom:10px}',
    '  .seg button{flex:1;border:0;background:transparent;color:#9aa0aa;font-size:11.5px;padding:6px 0;border-radius:6px;cursor:pointer;font-family:inherit}',
    '  .seg button.on{background:rgba(251,114,153,.18);color:#fff}',
    '  label{display:block;color:#9aa0aa;font-size:11.5px;margin:8px 0 4px;display:flex;justify-content:space-between}',
    '  label b{color:#f2f3f5;font-weight:500}',
    '  input[type=range]{width:100%;accent-color:#fb7299;margin:0}',
    '  input[type=url]{flex:1;min-width:0;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.16);',
    '    background:#23262f;color:#f2f3f5;padding:0 8px;font-size:11.5px;outline:none}',
    '  .btn{height:30px;padding:0 10px;border-radius:8px;border:1px solid rgba(255,255,255,.16);',
    '    background:#23262f;color:#f2f3f5;font-size:11.5px;cursor:pointer;font-family:inherit;white-space:nowrap}',
    '  .btn.pink{background:linear-gradient(135deg,#fb7299,#f45c8a);border-color:transparent;color:#fff}',
    '  .presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}',
    '  .presets button{height:34px;border-radius:8px;border:2px solid transparent;cursor:pointer;outline:1px solid rgba(255,255,255,.08);outline-offset:-1px}',
    '  .presets button.on{border-color:#fb7299}',
    '  .foot{display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}',
    '  .foot .btn{flex:1}',
    '</style>',
    '<button class="dot" title="B站自定义皮肤（Alt+B 开关）">🎨</button>',
    '<div class="panel">',
    '  <h3>B站自定义皮肤 <small>__VERSION__</small></h3>',
    '  <div class="seg" data-seg="mode">',
    '    <button data-v="plain">纯背景</button><button data-v="glass">毛玻璃</button><button data-v="immersive">沉浸式</button>',
    '  </div>',
    '  <div class="row">',
    '    <input type="url" placeholder="粘贴图片地址，回车应用" />',
    '    <button class="btn pink" data-act="url">使用</button>',
    '  </div>',
    '  <div class="presets"></div>',
    '  <label>背景模糊 <b data-out="blur">0 px</b></label>',
    '  <input type="range" data-range="blur" min="0" max="40" step="1" />',
    '  <label>压暗遮罩 <b data-out="dim">25 %</b></label>',
    '  <input type="range" data-range="dim" min="0" max="90" step="1" />',
    '  <label>卡片透明度 <b data-out="glass">55 %</b></label>',
    '  <input type="range" data-range="glass" min="0" max="100" step="1" />',
    '  <div class="foot">',
    '    <button class="btn" data-act="toggle">暂停皮肤</button>',
    '    <button class="btn" data-act="export">导出</button>',
    '    <button class="btn" data-act="import">导入</button>',
    '  </div>',
    '</div>'
  ].join('\n').replace('__VERSION__', __VER__);

  var q = function (sel) { return root.querySelector(sel); };
  var qa = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var settings = null;

  function paint(s) {
    settings = s;
    qa('.seg[data-seg="mode"] button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.v === (s.mode || 'glass'));
    });
    qa('[data-range]').forEach(function (inp) {
      var k = inp.dataset.range;
      inp.value = s[k];
      q('[data-out="' + k + '"]').textContent = s[k] + (k === 'blur' ? ' px' : ' %');
    });
    qa('.presets button').forEach(function (b) {
      b.classList.toggle('on', s.source === 'preset' && b.dataset.v === s.preset);
    });
    q('[data-act="toggle"]').textContent = s.enabled ? '暂停皮肤' : '开启皮肤';
  }

  function save(patch) {
    var next = SK.normalize(Object.assign({}, settings, patch));
    SK.Store.saveSettings(next).then(function (s) {
      paint(s);
    });
  }

  // 预设色块
  var presets = q('.presets');
  SK.PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.dataset.v = p.id;
    b.title = p.name;
    b.style.background = p.css;
    b.addEventListener('click', function () {
      save({ source: 'preset', preset: p.id });
    });
    presets.appendChild(b);
  });

  // 事件
  qa('.seg[data-seg="mode"] button').forEach(function (b) {
    b.addEventListener('click', function () { save({ mode: b.dataset.v }); });
  });
  qa('[data-range]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var k = inp.dataset.range;
      var v = Number(inp.value);
      q('[data-out="' + k + '"]').textContent = v + (k === 'blur' ? ' px' : ' %');
    });
    inp.addEventListener('change', function () {
      var patch = {};
      patch[inp.dataset.range] = Number(inp.value);
      save(patch);
    });
  });
  q('[data-act="url"]').addEventListener('click', function () {
    var url = SK.sanitizeUrl(q('input[type=url]').value);
    if (!url) { q('input[type=url]').focus(); return; }
    save({ source: 'url', url: url });
  });
  q('input[type=url]').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') q('[data-act="url"]').click();
  });
  q('[data-act="toggle"]').addEventListener('click', function () {
    save({ enabled: !settings.enabled });
  });
  q('[data-act="export"]').addEventListener('click', function () {
    var blob = new Blob([SK.exportPayload(settings, null)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bili-skin-config.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  });
  q('[data-act="import"]').addEventListener('click', function () {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var payload = SK.parsePayload(String(reader.result || ''));
          SK.ImageStore.put('', payload.image || '').then(function () {
            var next = SK.normalize(payload.settings);
            if (payload.image) next.source = 'file';
            return SK.Store.saveSettings(next);
          }).then(paint);
        } catch (e) {}
      };
      reader.readAsText(f);
    });
    inp.click();
  });

  // 开合
  var open = false;
  q('.dot').addEventListener('click', function () {
    open = !open;
    q('.panel').classList.toggle('open', open);
    if (open) SK.Store.getSettings().then(paint);
  });
  document.addEventListener('keydown', function (e) {
    if (e.altKey && (e.key === 'b' || e.key === 'B')) {
      setTimeout(function () { SK.Store.getSettings().then(paint); }, 50);
    }
  }, true);

  SK.Store.getSettings().then(paint);
})();
"""


def main():
    css = read("src/skin.css")
    shared = read("src/shared.js")
    content = read("src/content.js")

    header = f"""// ==UserScript==
// @name         B站自定义皮肤 · Bili Skin
// @namespace    https://github.com/bili-skin
// @version      {VERSION}
// @description  给网页版 bilibili 换背景：自定义图片/渐变、毛玻璃卡片、沉浸式排版。快捷键 Alt+B 开关。
// @author       bili-skin
// @match        *://*.bilibili.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

/* 由 tools/build_userscript.py 生成，请勿直接编辑。 */
"""

    body = (
        header
        + "\n(function () {\n  'use strict';\n\n"
        + "  /* ---------- skin.css ---------- */\n"
        + "  var __CSS = "
        + json.dumps(css, ensure_ascii=False)
        + ";\n\n"
        + "  var __style = document.createElement('style');\n"
        + "  __style.id = 'bili-skin-style';\n"
        + "  __style.textContent = __CSS;\n"
        + "  (document.head || document.documentElement).appendChild(__style);\n\n"
        + "  /* ---------- shared.js ---------- */\n"
        + "  (function (root) {\n"
        + shared
        + "\n  })(window);\n\n"
        + "  /* ---------- 首次使用时写入默认背景（content.js 之前执行） ---------- */\n"
        + "  try {\n"
        + "    if (!localStorage.getItem(window.BiliSkin.STORAGE_KEY)) {\n"
        + "      var __initial = window.BiliSkin.normalize(Object.assign({}, window.BiliSkin.DEFAULTS, {\n"
        + "        source: 'preset', preset: 'aurora', mode: 'glass'\n"
        + "      }));\n"
        + "      localStorage.setItem(window.BiliSkin.STORAGE_KEY, JSON.stringify(__initial));\n"
        + "    }\n"
        + "  } catch (e) {}\n\n"
        + "  /* ---------- content.js ---------- */\n"
        + "  (function () {\n"
        + content
        + "\n  })();\n\n"
        + "})();\n\n"
        + "/* ---------- 浮动面板 ---------- */\n"
        + PANEL_JS.replace("__VER__", json.dumps(VERSION))
    )

    out = os.path.join(ROOT, "bili-skin.user.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(body)
    print("written", out, os.path.getsize(out), "bytes")


if __name__ == "__main__":
    main()
