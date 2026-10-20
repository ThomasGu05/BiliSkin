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
