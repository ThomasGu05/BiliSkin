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
