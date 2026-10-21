// ==UserScript==
// @name         B站自定义皮肤 · Bili Skin
// @namespace    https://github.com/bili-skin
// @version      1.0.1
// @description  给网页版 bilibili 换背景：自定义图片/渐变、毛玻璃卡片、沉浸式排版。快捷键 Alt+B 开关。
// @author       bili-skin
// @match        *://*.bilibili.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

/* 由 tools/build_userscript.py 生成，请勿直接编辑。 */

(function () {
  'use strict';

  /* ---------- skin.css ---------- */
  var __CSS = "/* =====================================================================\n * B站自定义皮肤 · skin.css\n * ---------------------------------------------------------------------\n * 设计要点：\n *  1. 背景层是 <html> 的第一个子元素 .bili-skin-bg（由 content.js 注入），\n *     position:fixed + z-index:-1，位于页面所有内容之下，不会被 SPA 重渲染移除。\n *  2. <html> 使用 isolation:isolate 建立独立层叠上下文，使负 z-index 元素\n *     位于页面内容之下、画布之上；body 强制透明，露出背景层。\n *  3. 所有样式只在 html[data-bskin=\"on\"] 时生效，关闭皮肤时对 B 站零影响。\n *  4. 站点选择器集中在本文件下半部分，B 站改版时通常只需要改这里。\n * ===================================================================== */\n\n/* ---------- 可调变量（content.js 会以行内样式覆盖） ---------- */\nhtml[data-bskin] {\n  --bs-bg-image: none;\n  --bs-bg-size: cover;\n  --bs-bg-position: center;\n  --bs-blur: 0px;\n  --bs-brightness: 100%;\n  --bs-saturate: 100%;\n  --bs-dim: 25%;\n  --bs-scale: 1.04;\n\n  --bs-glass-alpha: 0.55;\n  --bs-glass-blur: 14px;\n  --bs-header-dim: 30%;\n\n  /* 自绘的浅色/深色表面色 */\n  --bs-surface: rgba(255, 255, 255, 0.55);\n  --bs-surface-strong: rgba(255, 255, 255, 0.9);\n  --bs-border: rgba(0, 0, 0, 0.08);\n  --bs-text: #18191c;\n  --bs-text-2: #61666d;\n}\n\nhtml[data-bskin][data-bskin-theme=\"dark\"] {\n  --bs-surface: rgba(24, 25, 28, 0.6);\n  --bs-surface-strong: rgba(24, 25, 28, 0.92);\n  --bs-border: rgba(255, 255, 255, 0.12);\n  --bs-text: #e3e5e7;\n  --bs-text-2: #aeb3b9;\n}\n\n/* =====================================================================\n * 一、背景层\n * ===================================================================== */\nhtml[data-bskin] {\n  background-color: var(--bs-fallback-color, #0b0c10) !important;\n  background-image: none !important;\n  isolation: isolate;\n  min-height: 100%;\n}\n\n/* 防止浏览器/站点给 body 设置背景色盖住背景层 */\nhtml[data-bskin] > body {\n  background: transparent !important;\n  background-color: transparent !important;\n  background-image: none !important;\n}\n\n/* B 站的 #app 自带白色底，会整体盖住背景层，必须一起透明化 */\nhtml[data-bskin] #app,\nhtml[data-bskin] .bili-feed4,\nhtml[data-bskin] .bili-feed4-layout,\nhtml[data-bskin] .feed2 {\n  background-color: transparent !important;\n}\n\n/* 万一有人给 body 加了 transform/filter，背景层仍固定于视口 */\nhtml[data-bskin] .bili-skin-bg {\n  position: fixed;\n  left: 0;\n  top: 0;\n  width: 100vw;\n  height: 100vh;\n  z-index: -1;\n  overflow: hidden;\n  pointer-events: none;\n  contain: strict;\n  background: var(--bs-fallback-color, #0b0c10);\n}\n\n.bili-skin-bg__img {\n  position: absolute;\n  inset: -2px;\n  background-image: var(--bs-bg-image);\n  background-position: var(--bs-bg-position);\n  background-size: var(--bs-bg-size);\n  background-repeat: no-repeat;\n  transform: scale(var(--bs-scale));\n  transform-origin: center;\n  filter: blur(var(--bs-blur)) brightness(var(--bs-brightness)) saturate(var(--bs-saturate));\n  will-change: filter;\n}\n\n/* 压暗/压亮遮罩，让前景文字更容易看清 */\n.bili-skin-bg__tint {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, var(--bs-dim));\n}\n\nhtml[data-bskin][data-bskin-theme=\"light\"] .bili-skin-bg__tint {\n  background: rgba(255, 255, 255, calc(var(--bs-dim) * 0.85));\n}\n\n/* =====================================================================\n * 二、顶栏 / 频道栏\n * ===================================================================== */\n\n/* 2.0 隐藏 B 站横幅里的插画资源（静态图 + 动态图层），让背景层露出来 */\nhtml[data-bskin] .bili-header__banner .banner-img,\nhtml[data-bskin] .bili-header__banner .animated-banner,\nhtml[data-bskin] .bili-header__banner .header-banner__inner,\nhtml[data-bskin] .bili-header__banner .taper-line {\n  display: none !important;\n}\n\n/* 2.1 让顶栏区域透出背景（毛玻璃 / 沉浸模式） */\nhtml[data-bskin][data-bskin-page=\"glass\"] .bili-header,\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header,\nhtml[data-bskin][data-bskin-page=\"glass\"] .bili-header--large,\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header--large,\nhtml[data-bskin][data-bskin-page=\"glass\"] .bili-header__banner,\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header__banner {\n  background-color: transparent !important;\n  background-image: none !important;\n}\n\n/* 让频道图标区与内容区之间自然过渡 */\nhtml[data-bskin][data-bskin-page=\"glass\"] .bili-header__channel,\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header__channel {\n  background: linear-gradient(\n    to bottom,\n    rgba(8, 9, 12, calc(var(--bs-header-dim) + 10%)) 0%,\n    rgba(8, 9, 12, calc(var(--bs-header-dim) * 0.4)) 60%,\n    rgba(8, 9, 12, 0) 100%\n  );\n}\n\n/* 2.2 顶栏：半透明压暗 + 底边渐隐，保证白色导航文字清晰 */\nhtml[data-bskin] .bili-header__bar {\n  background: linear-gradient(\n    to bottom,\n    rgba(8, 9, 12, calc(var(--bs-header-dim) + 30%)) 0%,\n    rgba(8, 9, 12, calc(var(--bs-header-dim) + 8%)) 55%,\n    rgba(8, 9, 12, 0) 100%\n  ) !important;\n  box-shadow: none !important;\n  border-bottom: none !important;\n  backdrop-filter: blur(var(--bs-glass-blur));\n  -webkit-backdrop-filter: blur(var(--bs-glass-blur));\n}\n\nhtml[data-bskin] .bili-header--slide-down .bili-header__bar,\nhtml[data-bskin] .bili-header--fixed .bili-header__bar {\n  background: rgba(12, 13, 16, calc(var(--bs-header-dim) + 45%)) !important;\n  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25) !important;\n}\n\n/* 2.3 搜索框 / 顶部按钮在自定义背景上更通透 */\nhtml[data-bskin] .nav-search-content {\n  background: rgba(255, 255, 255, 0.16) !important;\n  border: 1px solid rgba(255, 255, 255, 0.16) !important;\n  backdrop-filter: blur(10px);\n  -webkit-backdrop-filter: blur(10px);\n}\n\nhtml[data-bskin] .nav-search-input {\n  color: rgba(255, 255, 255, 0.92) !important;\n}\n\nhtml[data-bskin] .nav-search-input::placeholder {\n  color: rgba(255, 255, 255, 0.7) !important;\n}\n\nhtml[data-bskin] .nav-search-btn {\n  background: transparent !important;\n}\n\nhtml[data-bskin] .nav-search-btn svg {\n  fill: rgba(255, 255, 255, 0.9) !important;\n}\n\nhtml[data-bskin] .right-entry__outside,\nhtml[data-bskin] .right-entry__item {\n  color: rgba(255, 255, 255, 0.92);\n}\n\n/* =====================================================================\n * 三、内容区：毛玻璃 / 沉浸\n * ===================================================================== */\n\n/* 3.1 glass：给首页推荐流铺一层淡淡的玻璃底，文字不再\"飘\"在图上 */\nhtml[data-bskin][data-bskin-page=\"glass\"]:not([data-bskin-kind=\"watch\"]) .bili-feed4-layout {\n  border-radius: 14px;\n  background: var(--bs-surface);\n  backdrop-filter: blur(var(--bs-glass-blur)) saturate(115%);\n  -webkit-backdrop-filter: blur(var(--bs-glass-blur)) saturate(115%);\n  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);\n  border: 1px solid var(--bs-border);\n}\n\nhtml[data-bskin][data-bskin-page=\"glass\"]:not([data-bskin-kind=\"watch\"]) .bili-feed4-layout > .feed2 {\n  padding: 10px 16px;\n}\n\n/* 深色模式下把推荐流的文本色提亮（只作用于卡片信息区） */\nhtml[data-bskin][data-bskin-page=\"glass\"][data-bskin-theme=\"dark\"] .bili-video-card__info--tit,\nhtml[data-bskin][data-bskin-page=\"glass\"][data-bskin-theme=\"dark\"] .bili-video-card__info--tit a,\nhtml[data-bskin][data-bskin-page=\"glass\"][data-bskin-theme=\"dark\"] .bili-video-card__info--author,\nhtml[data-bskin][data-bskin-page=\"glass\"][data-bskin-theme=\"dark\"] .bili-video-card__info--date,\nhtml[data-bskin][data-bskin-page=\"glass\"][data-bskin-theme=\"dark\"] .bili-video-card__stats--text {\n  color: var(--bs-text) !important;\n}\n\nhtml[data-bskin][data-bskin-page=\"glass\"][data-bskin-theme=\"dark\"] .bili-video-card__stats--icon {\n  fill: var(--bs-text-2) !important;\n}\n\n/* 3.2 immersive：隐藏横贯页面的首屏轮播与顶部频道图标，专注内容 */\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header .bili-header__banner,\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header__channel,\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header__banner .header-banner__inner {\n  display: none !important;\n}\n\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header {\n  min-height: 0 !important;\n  height: auto !important;\n}\n\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-header__bar {\n  position: fixed !important;\n  top: 0 !important;\n  left: 0 !important;\n  right: 0 !important;\n  max-width: none !important;\n  margin: 0 !important;\n}\n\nhtml[data-bskin][data-bskin-page=\"immersive\"] .bili-feed4-layout {\n  padding-top: 76px;\n}\n\n/* 3.3 播放页：页面本身透明，播放器与信息卡片各自成为玻璃面板 */\nhtml[data-bskin][data-bskin-kind=\"watch\"] .bili-feed4-layout,\nhtml[data-bskin][data-bskin-kind=\"watch\"] .feed2,\nhtml[data-bskin][data-bskin-kind=\"watch\"] .container {\n  background: transparent !important;\n  border: 0 !important;\n  box-shadow: none !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n}\n\n/* 纯背景模式下，播放页/首页都保持透明，不铺玻璃 */\nhtml[data-bskin][data-bskin-page=\"plain\"] .bili-feed4-layout {\n  background: transparent !important;\n  border: 0 !important;\n  box-shadow: none !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n}\n\nhtml[data-bskin][data-bskin-kind=\"watch\"] .main-container,\nhtml[data-bskin][data-bskin-kind=\"watch\"] #bilibili-player,\nhtml[data-bskin][data-bskin-kind=\"watch\"] .bpx-player-container {\n  border-radius: 10px;\n}\n\nhtml[data-bskin][data-bskin-page=\"glass\"] .video-info-container,\nhtml[data-bskin][data-bskin-page=\"glass\"] .video-container-v1,\nhtml[data-bskin][data-bskin-page=\"glass\"] .video-toolbar-container,\nhtml[data-bskin][data-bskin-page=\"glass\"] .up-info-container,\nhtml[data-bskin][data-bskin-page=\"glass\"] .comment-container,\nhtml[data-bskin][data-bskin-page=\"glass\"] .reply-list,\nhtml[data-bskin][data-bskin-page=\"glass\"] .video-page-card-small,\nhtml[data-bskin][data-bskin-page=\"glass\"] .recommend-list-v1,\nhtml[data-bskin][data-bskin-page=\"glass\"] .playlist-container {\n  background: var(--bs-surface) !important;\n  backdrop-filter: blur(var(--bs-glass-blur));\n  -webkit-backdrop-filter: blur(var(--bs-glass-blur));\n  border-radius: 10px;\n  border: 1px solid var(--bs-border);\n}\n\n/* 播放页的页头背景条 */\nhtml[data-bskin] .video-page__header,\nhtml[data-bskin] .bili-header__banner {\n  background-color: transparent !important;\n}\n\n/* =====================================================================\n * 四、滚动条 & 细节\n * ===================================================================== */\nhtml[data-bskin] ::-webkit-scrollbar {\n  width: 10px;\n  height: 10px;\n}\n\nhtml[data-bskin] ::-webkit-scrollbar-track {\n  background: transparent;\n}\n\nhtml[data-bskin] ::-webkit-scrollbar-thumb {\n  background: rgba(128, 128, 128, 0.45);\n  border-radius: 999px;\n  border: 2px solid transparent;\n  background-clip: content-box;\n}\n\nhtml[data-bskin] ::-webkit-scrollbar-thumb:hover {\n  background: rgba(128, 128, 128, 0.7);\n  background-clip: content-box;\n}\n\n/* 减少动画偏好 */\n@media (prefers-reduced-motion: reduce) {\n  html[data-bskin] * {\n    scroll-behavior: auto !important;\n  }\n}\n";

  var __style = document.createElement('style');
  __style.id = 'bili-skin-style';
  __style.textContent = __CSS;
  (document.head || document.documentElement).appendChild(__style);

  /* ---------- shared.js ---------- */
  (function (root) {
/**
 * shared.js —— 设置模型、默认值与通用工具
 * 该文件同时被 popup（扩展页面）与 content script（bilibili 页面）加载，
 * 因此不要在这里直接访问 DOM 或 chrome.*（运行时再判断）。
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'bili-skin:settings:v1';
  var IMAGE_KEY = 'bili-skin:image:v1';
  var DB_NAME = 'bili-skin';
  var DB_STORE = 'images';

  /* ------------------------------------------------------------------ *
   * 默认设置
   * ------------------------------------------------------------------ */
  var DEFAULTS = {
    enabled: true,

    // 背景来源：none / url / preset / file / banner
    source: 'none',
    // 网络图片地址（source = url）
    url: '',
    // 内置渐变预设 id（source = preset）
    preset: 'aurora',
    // 本地图片在 IndexedDB 中的 key（source = file）
    imageKey: '',
    // 以背景方式展示 bilibili 首页横幅图（source = banner）
    bannerKey: '',

    // 背景外观
    fit: 'cover', // cover / contain
    position: 'center', // center / top / bottom / left / right
    blur: 0, // 0 ~ 40 px
    brightness: 100, // 60 ~ 140 %
    saturation: 100, // 0 ~ 160 %
    dim: 25, // 0 ~ 90 %，压暗遮罩，越高文字越清晰

    // 页面风格：plain（只换背景）/ glass（毛玻璃）/ immersive（沉浸）
    mode: 'glass',
    // 毛玻璃面板的不透明度 0 ~ 100
    glass: 55,
    // 面板背景模糊 0 ~ 30px
    backdrop: 14,
    // 顶栏/频道栏白字的压暗程度 0 ~ 80
    headerDim: 30,

    // 视频/番剧等播放页是否也应用
    videoPages: true,
    // 自动跟随系统深浅色
    theme: 'auto' // auto / light / dark
  };

  /* ------------------------------------------------------------------ *
   * 内置渐变预设
   * ------------------------------------------------------------------ */
  var PRESETS = [
    {
      id: 'aurora',
      name: '极光',
      css: 'linear-gradient(135deg, #0f2027 0%, #203a43 45%, #2c5364 100%)'
    },
    {
      id: 'sakura',
      name: '夜樱',
      css: 'linear-gradient(160deg, #1b1035 0%, #3d1d4e 45%, #a4508b 100%)'
    },
    {
      id: 'bili',
      name: 'B站粉蓝',
      css: 'linear-gradient(120deg, #00aeec 0%, #2b6cff 45%, #fb7299 100%)'
    },
    {
      id: 'midnight',
      name: '深空',
      css: 'radial-gradient(1200px 800px at 15% 10%, #1f3b73 0%, transparent 60%), radial-gradient(1000px 700px at 90% 85%, #5b2a86 0%, transparent 55%), linear-gradient(180deg, #070b18 0%, #0d1224 100%)'
    },
    {
      id: 'sunset',
      name: '落日',
      css: 'linear-gradient(180deg, #0b1026 0%, #46246b 45%, #b34a7a 75%, #ff9a76 100%)'
    },
    {
      id: 'mint',
      name: '薄荷',
      css: 'linear-gradient(140deg, #0f2e2b 0%, #17635a 55%, #6ec6b5 100%)'
    },
    {
      id: 'paper',
      name: '素纸',
      css: 'linear-gradient(160deg, #eef1f6 0%, #dfe6f0 55%, #cfd9e8 100%)'
    },
    {
      id: 'carbon',
      name: '碳灰',
      css: 'repeating-linear-gradient(135deg, #101114 0 22px, #14161a 22px 44px)'
    }
  ];

  function getPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i].id === id) return PRESETS[i];
    }
    return PRESETS[0];
  }

  /* ------------------------------------------------------------------ *
   * 工具函数
   * ------------------------------------------------------------------ */
  function clamp(n, min, max, fallback) {
    n = Number(n);
    if (!isFinite(n)) n = fallback;
    return Math.min(max, Math.max(min, n));
  }

  function sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    var u = url.trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return 'https:' + u;
    return ''; // 只允许 http(s)，防止 javascript: 之类的注入
  }

  function normalize(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var out = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = src[k];
      var d = DEFAULTS[k];
      if (typeof d === 'boolean') out[k] = typeof v === 'boolean' ? v : d;
      else if (typeof d === 'number') out[k] = clamp(v, -9999, 9999, d);
      else out[k] = typeof v === 'string' ? v : d;
    });

    // 逐项做范围与枚举约束
    out.blur = clamp(out.blur, 0, 40, DEFAULTS.blur);
    out.brightness = clamp(out.brightness, 50, 150, DEFAULTS.brightness);
    out.saturation = clamp(out.saturation, 0, 200, DEFAULTS.saturation);
    out.dim = clamp(out.dim, 0, 90, DEFAULTS.dim);
    out.glass = clamp(out.glass, 0, 100, DEFAULTS.glass);
    out.backdrop = clamp(out.backdrop, 0, 40, DEFAULTS.backdrop);
    out.headerDim = clamp(out.headerDim, 0, 80, DEFAULTS.headerDim);

    if (['cover', 'contain'].indexOf(out.fit) < 0) out.fit = DEFAULTS.fit;
    if (['center', 'top', 'bottom', 'left', 'right'].indexOf(out.position) < 0) {
      out.position = DEFAULTS.position;
    }
    if (['plain', 'glass', 'immersive'].indexOf(out.mode) < 0) out.mode = DEFAULTS.mode;
    if (['none', 'url', 'preset', 'file', 'banner'].indexOf(out.source) < 0) {
      out.source = DEFAULTS.source;
    }
    if (['auto', 'light', 'dark'].indexOf(out.theme) < 0) out.theme = DEFAULTS.theme;

    out.url = sanitizeUrl(out.url);
    out.imageKey = typeof out.imageKey === 'string' ? out.imageKey.slice(0, 80) : '';
    out.bannerKey = typeof out.bannerKey === 'string' ? out.bannerKey : '';
    out.preset = getPreset(out.preset).id;
    return out;
  }

  function buildBackgroundCss(settings, imageDataUrl) {
    var s = normalize(settings);
    var image = '';
    if (s.source === 'file') {
      image = imageDataUrl ? 'url("' + imageDataUrl + '")' : '';
    } else if (s.source === 'url') {
      image = s.url ? 'url("' + s.url + '")' : '';
    } else if (s.source === 'preset') {
      image = getPreset(s.preset).css;
    } else if (s.source === 'banner') {
      image = s.bannerKey ? 'url("' + s.bannerKey + '")' : '';
    }
    return image;
  }

  /* ------------------------------------------------------------------ *
   * 存储：chrome.storage.local（扩展）/ localStorage（用户脚本）
   * ------------------------------------------------------------------ */
  var hasChrome = !!(root.chrome && root.chrome.storage && root.chrome.storage.local);

  var Store = {
    isExtension: hasChrome,

    getSettings: function () {
      if (hasChrome) {
        return new Promise(function (resolve) {
          chrome.storage.local.get(STORAGE_KEY, function (res) {
            resolve(normalize(res && res[STORAGE_KEY]));
          });
        });
      }
      return new Promise(function (resolve) {
        var raw = null;
        try {
          raw = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || 'null');
        } catch (e) {
          raw = null;
        }
        resolve(normalize(raw));
      });
    },

    saveSettings: function (settings) {
      var s = normalize(settings);
      if (hasChrome) {
        var obj = {};
        obj[STORAGE_KEY] = s;
        return new Promise(function (resolve, reject) {
          chrome.storage.local.set(obj, function () {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(s);
          });
        });
      }
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return Promise.resolve(s);
    },

    onChange: function (fn) {
      if (hasChrome) {
        chrome.storage.onChanged.addListener(function (changes, area) {
          if (area === 'local' && changes[STORAGE_KEY]) {
            fn(normalize(changes[STORAGE_KEY].newValue));
          }
        });
      } else {
        root.addEventListener('storage', function (e) {
          if (e.key === STORAGE_KEY) {
            var raw = null;
            try {
              raw = JSON.parse(e.newValue || 'null');
            } catch (err) {
              raw = null;
            }
            fn(normalize(raw));
          }
        });
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * 图片存储
   * ------------------------------------------------------------------
   * 关键点：content script 运行在 bilibili 的隔离世界，它访问的 IndexedDB
   * 属于**页面源**，与扩展自身源的 IndexedDB 不互通。因此图片必须放在
   * chrome.storage.local（扩展源、所有上下文共享）里。
   *
   * 为避免超大 base64 字符串拖慢每次设置读取，扩展环境把图片拆到独立
   * 的 IMAGE_KEY 下；用户脚本环境没有 chrome.storage，退回 IndexedDB。
   * ------------------------------------------------------------------ */
  var IMAGE_CACHE = { key: '', dataUrl: '' };

  var ImageStore = {
    /** 预热缓存：把当前图片读进内存，content script 只需调用一次 */
    warm: function () {
      if (!hasChrome) {
        var stored = '';
        try {
          stored = root.localStorage.getItem('bili-skin:image:data') || '';
        } catch (e) {
          stored = '';
        }
        IMAGE_CACHE.dataUrl = stored;
        return Promise.resolve(stored);
      }
      return new Promise(function (resolve) {
        var q = {};
        q[IMAGE_KEY] = '';
        chrome.storage.local.get(q, function (res) {
          IMAGE_CACHE.key = IMAGE_KEY;
          IMAGE_CACHE.dataUrl = (res && res[IMAGE_KEY]) || '';
          resolve(IMAGE_CACHE.dataUrl);
        });
      });
    },

    /** 直接读（会同时刷新缓存） */
    getCurrent: function () {
      return ImageStore.warm();
    },

    /** 同步读取已预热的图片，用于渲染路径 */
    peek: function () {
      return IMAGE_CACHE.dataUrl;
    },

    /** 保存图片，key 仅用于标记是否换过图（扩展环境忽略） */
    put: function (key, dataUrl) {
      IMAGE_CACHE.key = key || IMAGE_KEY;
      IMAGE_CACHE.dataUrl = dataUrl || '';
      if (hasChrome) {
        var obj = {};
        obj[IMAGE_KEY] = IMAGE_CACHE.dataUrl;
        return new Promise(function (resolve, reject) {
          chrome.storage.local.set(obj, function () {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(IMAGE_CACHE.key);
          });
        });
      }
      // 用户脚本：localStorage + IndexedDB 兜底
      try {
        root.localStorage.setItem('bili-skin:image:data', IMAGE_CACHE.dataUrl);
      } catch (e) {
        return idbPut(IMAGE_CACHE.key, IMAGE_CACHE.dataUrl).then(function () {
          return IMAGE_CACHE.key;
        });
      }
      return Promise.resolve(IMAGE_CACHE.key);
    },

    remove: function () {
      IMAGE_CACHE.key = '';
      IMAGE_CACHE.dataUrl = '';
      if (hasChrome) {
        return new Promise(function (resolve) {
          chrome.storage.local.remove(IMAGE_KEY, function () {
            resolve();
          });
        });
      }
      try {
        root.localStorage.removeItem('bili-skin:image:data');
      } catch (e) {}
      return Promise.resolve();
    }
  };

  /* IndexedDB 兜底（仅用户脚本环境，用于 localStorage 放不下的大图） */
  function idbPut(key, dataUrl) {
    if (!root.indexedDB) return Promise.reject(new Error('当前环境不支持 IndexedDB'));
    return new Promise(function (resolve, reject) {
      var req = root.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onerror = function () {
        reject(req.error || new Error('IndexedDB 打开失败'));
      };
      req.onsuccess = function () {
        var db = req.result;
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(dataUrl, key || 'current');
        tx.oncomplete = function () {
          db.close();
          resolve(key);
        };
        tx.onerror = function () {
          db.close();
          reject(tx.error || new Error('图片写入失败'));
        };
      };
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new root.FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function () {
        reject(reader.error || new Error('图片读取失败'));
      };
      reader.readAsDataURL(blob);
    });
  }

  function randomId() {
    return (
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    );
  }

  function formatBytes(n) {
    if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  /* ------------------------------------------------------------------ *
   * 导出/导入
   * ------------------------------------------------------------------ */
  function exportPayload(settings, imageDataUrl) {
    var data = {
      app: 'bili-skin',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: normalize(settings),
      image: imageDataUrl || null
    };
    return JSON.stringify(data, null, 2);
  }

  function parsePayload(text) {
    var data = JSON.parse(text);
    if (!data || data.app !== 'bili-skin' || !data.settings) {
      throw new Error('不是有效的皮肤配置文件');
    }
    return {
      settings: normalize(data.settings),
      image: typeof data.image === 'string' && /^data:image\//.test(data.image) ? data.image : null
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    IMAGE_KEY: IMAGE_KEY,
    DEFAULTS: DEFAULTS,
    PRESETS: PRESETS,
    getPreset: getPreset,
    normalize: normalize,
    sanitizeUrl: sanitizeUrl,
    buildBackgroundCss: buildBackgroundCss,
    Store: Store,
    ImageStore: ImageStore,
    blobToDataUrl: blobToDataUrl,
    randomId: randomId,
    formatBytes: formatBytes,
    exportPayload: exportPayload,
    parsePayload: parsePayload,
    clamp: clamp,
    hasChrome: hasChrome
  };

  root.BiliSkin = api;
})(typeof window !== 'undefined' ? window : globalThis);

  })(window);

  /* ---------- 首次使用时写入默认背景（content.js 之前执行） ---------- */
  try {
    if (!localStorage.getItem(window.BiliSkin.STORAGE_KEY)) {
      var __initial = window.BiliSkin.normalize(Object.assign({}, window.BiliSkin.DEFAULTS, {
        source: 'preset', preset: 'aurora', mode: 'glass'
      }));
      localStorage.setItem(window.BiliSkin.STORAGE_KEY, JSON.stringify(__initial));
    }
  } catch (e) {}

  /* ---------- content.js ---------- */
  (function () {
/**
 * content.js —— 注入背景层、监听设置变化、响应 popup 消息
 * 运行于 bilibili 页面（document_start）。
 */
(function () {
  'use strict';

  var SK = window.BiliSkin;
  if (!SK || window.__biliSkinLoaded) return;
  window.__biliSkinLoaded = true;

  var root = document.documentElement;
  var layer = null;
  var imgEl = null;
  var tintEl = null;

  var settings = SK.normalize(null);
  var lastBgImage = null;
  var lastSource = '';
  var media = null; // 系统深浅色媒体查询

  /* ------------------------------------------------------------------ *
   * 页面类型
   * ------------------------------------------------------------------ */
  function pageKind() {
    var host = location.hostname;
    var path = location.pathname;

    if (/^(live|space|t|message|www)\.bilibili\.com$/.test(host) && host !== 'www.bilibili.com') {
      return 'other';
    }
    if (host === 'www.bilibili.com') {
      if (path === '/' || path === '/index.html') return 'home';
      if (/^\/(video|bangumi|cheese|read)\//.test(path)) return 'watch';
      if (/^\/list\//.test(path)) return 'watch';
      if (/^\/v\//.test(path)) return 'watch';
      if (/^\/(anime|movie|tv|guochuang|documentary|variety|music|dance|game|knowledge|tech|sports|auto|life|food|animal|fashion|information|ent|film|mooc)\/?$/.test(path)) {
        return 'channel';
      }
      return 'other';
    }
    return 'other';
  }

  var kind = pageKind();

  /* ------------------------------------------------------------------ *
   * 主题（浅色/深色）
   * ------------------------------------------------------------------ */
  function systemDark() {
    if (!media) {
      try {
        media = window.matchMedia('(prefers-color-scheme: dark)');
      } catch (e) {
        return false;
      }
    }
    return !!(media && media.matches);
  }

  function effectiveTheme() {
    if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme;
    // auto：优先跟随 B 站自身的深色模式标记，其次跟随系统
    // 注意读的是 B 站自己的 data-theme，不是我们写在根节点上的 data-bskin-theme
    if (root.getAttribute('data-theme') === 'dark') return 'dark';
    if (document.body && document.body.classList.contains('dark')) return 'dark';
    return systemDark() ? 'dark' : 'light';
  }

  /* ------------------------------------------------------------------ *
   * 背景层
   * ------------------------------------------------------------------ */
  function ensureLayer() {
    if (!root) return null;
    if (layer && layer.isConnected) return layer;

    layer = document.createElement('div');
    layer.className = 'bili-skin-bg';
    layer.setAttribute('aria-hidden', 'true');

    imgEl = document.createElement('div');
    imgEl.className = 'bili-skin-bg__img';

    tintEl = document.createElement('div');
    tintEl.className = 'bili-skin-bg__tint';

    layer.appendChild(imgEl);
    layer.appendChild(tintEl);

    // 作为 <html> 的第一个子元素，避免被 Vue 重渲染 body 时移除
    root.insertBefore(layer, root.firstChild);
    return layer;
  }

  function setCss(name, value) {
    if (!layer) return;
    if (value === null || value === undefined || value === '') {
      layer.style.removeProperty(name);
    } else {
      layer.style.setProperty(name, String(value));
    }
  }

  /* 解析当前设置对应的背景值：preset 返回 CSS 渐变，其余返回纯图片地址 */
  function resolveBackground() {
    return new Promise(function (resolve) {
      var s = settings;
      if (s.source === 'preset') {
        resolve(SK.getPreset(s.preset).css);
        return;
      }
      if (s.source === 'url') {
        resolve(s.url || '');
        return;
      }
      if (s.source === 'banner') {
        resolve(s.bannerKey || '');
        return;
      }
      if (s.source === 'file' && s.imageKey) {
        // 图片以 data URL 存在 chrome.storage.local，初始化时已预热到内存
        resolve(SK.ImageStore.peek() || '');
        return;
      }
      resolve('');
    });
  }

  function positionCss(pos) {
    switch (pos) {
      case 'top':
        return 'center top';
      case 'bottom':
        return 'center bottom';
      case 'left':
        return 'left center';
      case 'right':
        return 'right center';
      default:
        return 'center center';
    }
  }

  /* bgImage：resolveBackground 的返回值；source：产生该值的来源 */
  function applyVars(bgImage, source) {
    if (!layer) return;
    // preset 是渐变（直接作为 background-image），其余来源是图片地址（包成 url()）
    var imageValue = '';
    if (bgImage) {
      imageValue =
        source === 'preset'
          ? bgImage
          : 'url("' + bgImage.replace(/"/g, '%22') + '")';
    }

    var dark = effectiveTheme() === 'dark';
    var dim = settings.dim / 100;

    setCss('--bs-bg-image', imageValue || 'none');
    setCss('--bs-bg-size', settings.fit === 'contain' ? 'contain' : 'cover');
    setCss('--bs-bg-position', positionCss(settings.position));
    setCss('--bs-blur', settings.blur + 'px');
    setCss('--bs-brightness', settings.brightness + '%');
    setCss('--bs-saturate', settings.saturation + '%');
    setCss('--bs-scale', settings.blur > 0 ? '1.06' : '1.01');
    setCss('--bs-dim', dim.toFixed(3));
    setCss('--bs-glass-alpha', (settings.glass / 100).toFixed(3));
    setCss('--bs-glass-blur', settings.backdrop + 'px');
    setCss('--bs-header-dim', (settings.headerDim / 100).toFixed(3));
    setCss(
      '--bs-fallback-color',
      imageValue ? (dark ? '#0b0c10' : '#e9edf3') : dark ? '#101114' : '#f2f4f7'
    );

    // 让卡片自身的"表面色"跟随毛玻璃不透明度
    var alpha = (settings.glass / 100) * (dark ? 0.94 : 0.94);
    var surface = dark
      ? 'rgba(24, 25, 28, ' + alpha.toFixed(3) + ')'
      : 'rgba(255, 255, 255, ' + alpha.toFixed(3) + ')';
    setCss('--bs-surface', surface);
  }

  function setPageMode() {
    var mode = settings.mode;
    // 播放页：总是套用（内容区另有样式），沉浸模式在播放页不适用
    var pageMode = mode === 'immersive' ? 'immersive' : mode;
    root.setAttribute('data-bskin-page', pageMode);
  }

  /* ------------------------------------------------------------------ *
   * 主应用逻辑
   * ------------------------------------------------------------------ */
  var applySeq = 0;

  function apply() {
    if (!root) return;

    if (!settings.enabled) {
      root.removeAttribute('data-bskin');
      root.removeAttribute('data-bskin-page');
      root.removeAttribute('data-bskin-kind');
      root.removeAttribute('data-bskin-theme');
      return;
    }

    // 播放页开关
    if (kind === 'watch' && !settings.videoPages) {
      root.removeAttribute('data-bskin');
      root.removeAttribute('data-bskin-page');
      root.removeAttribute('data-bskin-kind');
      root.removeAttribute('data-bskin-theme');
      return;
    }

    ensureLayer();
    root.setAttribute('data-bskin', 'on');
    root.setAttribute('data-bskin-theme', effectiveTheme());
    root.setAttribute('data-bskin-kind', kind);
    setPageMode();

    var seq = ++applySeq;
    var source = settings.source;
    resolveBackground().then(function (bg) {
      if (seq !== applySeq) return; // 设置已更新，丢弃过期结果
      lastBgImage = bg;
      lastSource = source;
      applyVars(bg, source);
    });
  }

  /* ------------------------------------------------------------------ *
   * 首次初始化
   * ------------------------------------------------------------------ */
  function init() {
    if (!root) return;
    // 先放好背景层，避免设置读取期间闪一下 B 站的原背景
    ensureLayer();
    // 先取设置 + 预热图片缓存（图片存在 chrome.storage.local 的独立 key）
    Promise.all([SK.Store.getSettings(), SK.ImageStore.warm()])
      .then(function (res) {
        settings = res[0];
        apply();
        // 设置读取期间若 B 站主题标记变化，重新同步
        syncTheme();
      })
      .catch(function () {
        settings = SK.normalize(null);
        apply();
      });

    SK.Store.onChange(function (s) {
      settings = s;
      // 图片可能刚被更换，重新预热后再应用
      SK.ImageStore.warm().then(apply, apply);
    });

    // B 站是 SPA：首页 -> 播放页等跳转不会刷新页面，需要重新判定页面类型
    watchRoute();

    // 监听 B 站自身的深色模式切换
    try {
      var obs = new MutationObserver(function () {
        syncTheme();
      });
      obs.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      if (document.body) {
        obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (e) {}

    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
      var onMedia = function () {
        if (settings.theme === 'auto') apply();
      };
      if (media.addEventListener) media.addEventListener('change', onMedia);
      else if (media.addListener) media.addListener(onMedia);
    } catch (e) {}
  }

  /* 监听 pushState / popstate / hashchange，路由变化时重新应用 */
  function watchRoute() {
    var lastUrl = location.href;
    var rerun = function () {
      if (location.href === lastUrl) return;
      lastUrl = location.href;
      kind = pageKind();
      apply();
    };

    try {
      ['pushState', 'replaceState'].forEach(function (name) {
        var orig = history[name];
        if (typeof orig !== 'function') return;
        history[name] = function () {
          var ret = orig.apply(this, arguments);
          setTimeout(rerun, 0);
          return ret;
        };
      });
    } catch (e) {}

    window.addEventListener('popstate', function () {
      setTimeout(rerun, 0);
    });
    window.addEventListener('hashchange', function () {
      setTimeout(rerun, 0);
    });

    // 兜底：部分路由通过整页替换 #app 完成，用轮询检查 URL（开销极低）
    setInterval(rerun, 1200);
  }

  function syncTheme() {
    if (!settings.enabled) return;
    var theme = effectiveTheme();
    if (root.getAttribute('data-bskin-theme') !== theme) {
      root.setAttribute('data-bskin-theme', theme);
      // --bs-surface 等变量是按主题算出来的，主题变了必须重算
      if (layer) applyVars(lastBgImage, lastSource || 'none');
    }
  }

  /* ------------------------------------------------------------------ *
   * 与 popup 通信
   * ------------------------------------------------------------------ */
  /** 取当前首页横幅图：静态图 / 动态图层里挑分辨率最大的一张 */
  function currentBanner() {
    var banner = document.querySelector('.bili-header__banner');
    if (!banner) return '';

    // 1) 横幅容器自身的 background-image
    var bg = getComputedStyle(banner).backgroundImage || '';
    var m = bg.match(/url\(["']?(.*?)["']?\)/);
    if (m && m[1] && m[1].indexOf('data:') !== 0) {
      var fromBg = SK.sanitizeUrl(m[1]);
      if (fromBg) return fromBg;
    }

    // 2) 静态横幅图
    var staticImg = banner.querySelector('.banner-img img, picture.banner-img');
    if (staticImg) {
      var src = staticImg.getAttribute('src') || '';
      var sanitized = SK.sanitizeUrl(src);
      if (sanitized) return sanitized;
    }

    // 3) 动态横幅：多层 <img>，取宽度最大的一张（跳过图标/logo）
    var best = '';
    var bestWidth = 0;
    Array.prototype.forEach.call(banner.querySelectorAll('img'), function (img) {
      var w = img.naturalWidth || img.width || 0;
      var url = SK.sanitizeUrl(img.currentSrc || img.getAttribute('src') || '');
      if (!url) return;
      if (w > bestWidth) {
        bestWidth = w;
        best = url;
      }
    });
    if (best) return best;

    // 4) 最后兜底：css 里的 // 开头地址
    return '';
  }

  function toast(text) {
    var el = document.createElement('div');
    el.className = 'bili-skin-toast';
    el.textContent = text;
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:48px',
      'transform:translateX(-50%)',
      'z-index:2147483647',
      'padding:10px 18px',
      'border-radius:999px',
      'background:rgba(20,21,25,.92)',
      'color:#fff',
      'font-size:13px',
      'font-family:system-ui,-apple-system,sans-serif',
      'box-shadow:0 8px 30px rgba(0,0,0,.35)',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity .18s ease, transform .18s ease',
      'backdrop-filter:blur(8px)'
    ].join(';');
    document.documentElement.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(-6px)';
    });
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () {
        el.remove();
      }, 220);
    }, 1600);
  }

  /** 随机取一个 B 站热门视频封面（页内请求，自带 Cookie/Referer） */
  function randomCover() {
    return fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all', {
      credentials: 'include'
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.data && data.data.list) || [];
        if (!list.length) throw new Error('热门列表为空');
        var item = list[Math.floor(Math.random() * list.length)];
        var pic = SK.sanitizeUrl(item.pic || '');
        if (!pic) throw new Error('封面地址无效');
        return pic;
      });
  }

  if (SK.hasChrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'BS_APPLY':
          // 设置已由 storage.onChanged 触发，这里只需确认
          sendResponse({ ok: true, page: kind });
          return;

        case 'BS_STATUS':
          sendResponse({
            ok: true,
            page: kind,
            enabled: settings.enabled,
            theme: effectiveTheme(),
            source: settings.source
          });
          return;

        case 'BS_GET_BANNER':
          sendResponse({ ok: true, url: currentBanner() });
          return;

        case 'BS_RANDOM_COVER':
          randomCover()
            .then(function (url) {
              sendResponse({ ok: true, url: url });
            })
            .catch(function (err) {
              sendResponse({ ok: false, error: String((err && err.message) || err) });
            });
          return true; // 异步响应

        case 'BS_TOAST':
          toast(String(msg.text || ''));
          sendResponse({ ok: true });
          return;

        default:
          return;
      }
    });
  }

  /* 快捷键 Alt+B：快速开关（用户脚本模式下也可用） */
  document.addEventListener(
    'keydown',
    function (e) {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.code !== 'KeyB' && e.key !== 'b' && e.key !== 'B') return;
      e.preventDefault();
      settings = SK.normalize(Object.assign({}, settings, { enabled: !settings.enabled }));
      SK.Store.saveSettings(settings).then(function () {
        apply();
        toast(settings.enabled ? 'B站皮肤：已开启' : 'B站皮肤：已关闭');
      });
    },
    true
  );

  init();
})();

  })();

})();

/* ---------- 浮动面板 ---------- */

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
  ].join('\n').replace('__VERSION__', "1.0.1");

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
