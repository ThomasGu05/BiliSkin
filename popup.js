/**
 * popup.js —— 设置界面逻辑
 */
(function () {
  'use strict';

  var SK = window.BiliSkin;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var settings = SK.normalize(null);
  var ready = false;
  var scene = { tab: null, isBili: false, page: '', status: null };
  var fileDataUrl = '';
  var fileMeta = { name: '', size: 0 };
  var toastTimer = 0;
  var saveTimer = 0;
  var saveSeq = 0;

  var MAX_UPLOAD = 20 * 1024 * 1024;

  /* ------------------------------------------------------------------ *
   * 小工具
   * ------------------------------------------------------------------ */
  function toast(text, isError) {
    var el = $('toast');
    el.textContent = text;
    el.classList.toggle('is-error', !!isError);
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-show');
    }, 2200);
  }

  function modeHint(mode) {
    var map = {
      plain: '纯背景：只替换页面底色，保留 B 站原生的白色卡片与所有浮层。',
      glass: '毛玻璃：内容区铺一层半透明磨砂玻璃，视频卡片更透气。',
      immersive: '沉浸式：隐藏首屏大图和顶部频道，内容直接浮在背景上。'
    };
    return map[mode] || map.glass;
  }

  function sourceLabel(s) {
    var map = {
      none: '未设置',
      file: '本地图片',
      url: '图片链接',
      preset: '渐变预设',
      banner: '首页横幅'
    };
    return map[s] || '未设置';
  }

  /* ------------------------------------------------------------------ *
   * 场景（当前标签页）
   * ------------------------------------------------------------------ */
  function syncScene() {
    return new Promise(function (resolve) {
      if (!chrome.tabs || !chrome.tabs.query) {
        resolve();
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs && tabs[0];
        scene.tab = tab || null;
        var url = (tab && tab.url) || '';
        scene.isBili = /^https?:\/\/([^/]*\.)?bilibili\.com\//i.test(url);
        if (!scene.isBili) {
          scene.page = '';
          scene.status = null;
          renderStatus();
          resolve();
          return;
        }
        chrome.tabs.sendMessage(tab.id, { type: 'BS_STATUS' }, function (res) {
          if (chrome.runtime.lastError || !res) {
            scene.status = null;
            scene.page = '';
          } else {
            scene.status = res;
            scene.page = res.page || '';
          }
          renderStatus();
          resolve();
        });
      });
    });
  }

  function renderStatus() {
    var el = $('status');
    var text;
    var cls = 'status';

    if (!scene.isBili) {
      text = '当前不是 B 站页面 · 请打开 bilibili.com 查看效果';
      cls += ' is-warn';
    } else if (!settings.enabled) {
      text = '皮肤已关闭 · 打开开关即可生效';
      cls += ' is-off';
    } else if (!scene.status) {
      text = '刷新一下页面即可应用（扩展刚安装/更新时）';
      cls += ' is-warn';
    } else {
      var pageNames = {
        home: '首页',
        watch: '播放页',
        channel: '分区页',
        other: 'B 站页面'
      };
      var name = pageNames[scene.page] || 'B 站页面';
      if (scene.page === 'watch' && !settings.videoPages) {
        text = name + ' · 未开启播放页皮肤';
        cls += ' is-off';
      } else {
        text = name + ' · 已生效' + (settings.enabled ? '' : '（已暂停）');
      }
    }
    el.textContent = text;
    el.className = cls;
  }

  /* ------------------------------------------------------------------ *
   * 渲染
   * ------------------------------------------------------------------ */
  function pct(input) {
    var min = Number(input.min);
    var max = Number(input.max);
    var v = Number(input.value);
    var p = max > min ? ((v - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--pct', p.toFixed(2) + '%');
  }

  function renderSourceBadge() {
    var badge = $('source-badge');
    var has = false;
    if (settings.source === 'file') has = !!settings.imageKey;
    else if (settings.source === 'url') has = !!settings.url;
    else if (settings.source === 'banner') has = !!settings.bannerKey;
    else if (settings.source === 'preset') has = true;

    badge.textContent = has ? sourceLabel(settings.source) : '未设置';
    badge.classList.toggle('is-empty', !has);
  }

  function renderPresets() {
    var box = $('presets');
    if (box.childElementCount) return;
    SK.PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset';
      b.dataset.preset = p.id;
      b.style.background = p.css;
      b.title = p.name;
      var label = document.createElement('span');
      label.textContent = p.name;
      b.appendChild(label);
      box.appendChild(b);
    });
  }

  function renderPanels() {
    $$('.src').forEach(function (btn) {
      var active = btn.dataset.source === settings.source;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    $$('.panel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'panel-' + settings.source);
    });
    renderSourceBadge();
  }

  function render() {
    $('enabled').checked = settings.enabled;

    // 滑杆
    $$('.slider').forEach(function (wrap) {
      var field = wrap.dataset.field;
      var input = wrap.querySelector('input[type="range"]');
      var out = wrap.querySelector('output');
      input.value = settings[field];
      out.textContent = settings[field] + ' ' + wrap.dataset.unit;
      pct(input);
    });

    // 模式
    $$('#mode button').forEach(function (b) {
      var active = b.dataset.mode === settings.mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    $('mode-hint').textContent = modeHint(settings.mode);

    // 高级
    $('fit').value = settings.fit;
    $('position').value = settings.position;
    $('theme').value = settings.theme;
    $('videoPages').checked = settings.videoPages;
    $('headerDim').value = String(settings.headerDim);

    // 来源
    renderPresets();
    renderPanels();
    $$('.preset').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.preset === settings.preset);
    });
    if (document.activeElement !== $('url-input')) {
      $('url-input').value = settings.url || '';
    }
    renderFileMeta();
    renderStatus();
  }

  function renderFileMeta() {
    var meta = $('file-meta');
    var has = settings.source === 'file' && (fileDataUrl || settings.imageKey);
    meta.hidden = !has;
    if (!has) return;
    var img = $('file-preview');
    if (fileDataUrl) {
      img.src = fileDataUrl;
    } else if (!img.src) {
      // 已预热的图片（初始化时读取）
      if (SK.ImageStore.peek()) img.src = SK.ImageStore.peek();
    }
    $('file-name').textContent = fileMeta.name || '已保存的背景图';
    $('file-size').textContent = fileMeta.size
      ? SK.formatBytes(fileMeta.size)
      : '已保存在本机';
  }

  /* ------------------------------------------------------------------ *
   * 保存（防抖，保证顺序）
   * ------------------------------------------------------------------ */
  function saveNow() {
    if (!ready) return Promise.resolve();
    var snapshot = SK.normalize(settings);
    var seq = ++saveSeq;
    return SK.Store.saveSettings(snapshot)
      .then(function () {
        if (seq === saveSeq) renderStatus();
      })
      .catch(function (err) {
        toast('保存失败：' + ((err && err.message) || err), true);
      });
  }

  function scheduleSave() {
    if (!ready) return Promise.resolve();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 120);
    return Promise.resolve();
  }

  /* ------------------------------------------------------------------ *
   * 消息
   * ------------------------------------------------------------------ */
  function sendToTab(msg) {
    return new Promise(function (resolve) {
      if (!scene.isBili || !scene.tab) {
        resolve(null);
        return;
      }
      chrome.tabs.sendMessage(scene.tab.id, msg, function (res) {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(res || null);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 本地上传
   * ------------------------------------------------------------------ */
  function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast('请选择图片文件', true);
      return;
    }
    if (file.size > MAX_UPLOAD) {
      toast('图片太大了（上限 20 MB），请先压缩', true);
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result || '');
      var key = SK.randomId();

      SK.ImageStore.put(key, dataUrl)
        .then(function () {
          fileDataUrl = dataUrl;
          fileMeta = { name: file.name, size: file.size };
          settings.source = 'file';
          settings.imageKey = key;
          render();
          saveNow().then(function () {
            toast('背景已更新');
          });
        })
        .catch(function (err) {
          toast('保存图片失败：' + ((err && err.message) || err), true);
        });
    };
    reader.onerror = function () {
      toast('读取图片失败', true);
    };
    reader.readAsDataURL(file);
  }

  function removeFile() {
    fileDataUrl = '';
    fileMeta = { name: '', size: 0 };
    settings.imageKey = '';
    if (settings.source === 'file') settings.source = 'preset';
    render();
    SK.ImageStore.remove().then(function () {
      return saveNow();
    }).then(function () {
      toast('已移除本地背景');
    });
    var img = $('file-preview');
    img.removeAttribute('src');
  }

  /* ------------------------------------------------------------------ *
   * 首页横幅 / 随机封面
   * ------------------------------------------------------------------ */
  function grabBanner() {
    if (!scene.isBili) {
      toast('请先在标签页打开 bilibili 首页', true);
      return;
    }
    sendToTab({ type: 'BS_GET_BANNER' }).then(function (res) {
      if (!res || !res.ok) {
        toast('无法与页面通信，请刷新页面后重试', true);
        return;
      }
      if (!res.url) {
        toast('没找到首页头图，请确认当前在 B 站首页', true);
        return;
      }
      settings.source = 'banner';
      settings.bannerKey = res.url;
      render();
      saveNow();
      toast('已使用首页头图作为背景');
    });
  }

  function randomCover() {
    if (!scene.isBili) {
      toast('请先在标签页打开 bilibili', true);
      return;
    }
    toast('正在从热门里挑一张…');
    sendToTab({ type: 'BS_RANDOM_COVER' }).then(function (res) {
      if (!res || !res.ok || !res.url) {
        toast('获取热门封面失败：' + ((res && res.error) || '未知错误'), true);
        return;
      }
      settings.source = 'url';
      settings.url = res.url;
      render();
      saveNow();
      toast('已换成随机热门封面');
    });
  }

  /* ------------------------------------------------------------------ *
   * 导入 / 导出
   * ------------------------------------------------------------------ */
  function exportConfig() {
    var dataUrl = settings.source === 'file' ? fileDataUrl || SK.ImageStore.peek() : null;
    try {
      var text = SK.exportPayload(settings, dataUrl);
      var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = 'bili-skin-config.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 3000);
      toast('配置已导出');
    } catch (err) {
      toast('导出失败：' + ((err && err.message) || err), true);
    }
  }

  function importConfig(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var payload;
      try {
        payload = SK.parsePayload(String(reader.result || ''));
      } catch (err) {
        toast('导入失败：' + ((err && err.message) || '文件格式不正确'), true);
        return;
      }

      var apply = function (dataUrl) {
        settings = SK.normalize(payload.settings);
        if (dataUrl) {
          settings.source = 'file';
          settings.imageKey = SK.randomId();
          fileDataUrl = dataUrl;
          fileMeta = { name: '导入的背景图', size: 0 };
        } else {
          if (settings.source === 'file') settings.source = 'preset';
          settings.imageKey = '';
          fileDataUrl = '';
          fileMeta = { name: '', size: 0 };
        }
        render();
        saveNow().then(function () {
          toast('配置已导入');
        });
      };

      if (payload.image) {
        SK.ImageStore.put(SK.randomId(), payload.image).then(function () {
          apply(payload.image);
        }).catch(function () {
          apply('');
        });
      } else {
        SK.ImageStore.remove().then(function () {
          apply('');
        });
      }
    };
    reader.onerror = function () {
      toast('读取文件失败', true);
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------ *
   * 事件绑定
   * ------------------------------------------------------------------ */
  function bind() {
    // 总开关
    $('enabled').addEventListener('change', function (e) {
      settings.enabled = e.target.checked;
      renderStatus();
      saveNow().then(function () {
        toast(settings.enabled ? '皮肤已开启' : '皮肤已关闭');
      });
    });

    // 来源
    $$('.src').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.dataset.source;
        var oldKey = settings.imageKey;
        settings.source = src;
        if (src !== 'file' && oldKey) {
          SK.ImageStore.remove();
          settings.imageKey = '';
        }
        if (src === 'file' && !settings.imageKey) {
          // 没图片时直接唤起文件选择
          $('file-input').click();
        }
        if (src === 'preset') settings.preset = settings.preset || SK.PRESETS[0].id;
        if (src === 'banner' && !settings.bannerKey && scene.page === 'home') {
          grabBanner();
          return;
        }
        render();
        saveNow();
      });
    });

    // 文件选择 / 拖拽
    $('file-input').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      handleFile(f);
    });

    var drop = $('drop');
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.remove('is-over');
      });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handleFile(f);
    });
    $('file-remove').addEventListener('click', removeFile);

    // 链接
    function applyUrl() {
      var raw = $('url-input').value.trim();
      if (!raw) {
        toast('请先粘贴图片链接', true);
        return;
      }
      var url = SK.sanitizeUrl(raw);
      if (!url) {
        toast('链接格式不对，需要以 http(s):// 开头', true);
        return;
      }
      settings.source = 'url';
      settings.url = url;
      render();
      saveNow();
      toast('已应用图片链接');
    }
    $('url-apply').addEventListener('click', applyUrl);
    $('url-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyUrl();
    });

    // 预设
    $('presets').addEventListener('click', function (e) {
      var btn = e.target.closest('.preset');
      if (!btn) return;
      settings.source = 'preset';
      settings.preset = btn.dataset.preset;
      render();
      saveNow();
    });

    // 横幅
    $('banner-grab').addEventListener('click', grabBanner);
    $('banner-random').addEventListener('click', randomCover);

    // 风格
    $$('#mode button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        settings.mode = btn.dataset.mode;
        render();
        saveNow();
      });
    });

    // 滑杆（实时预览，防抖保存）
    $$('.slider').forEach(function (wrap) {
      var field = wrap.dataset.field;
      var input = wrap.querySelector('input[type="range"]');
      var out = wrap.querySelector('output');
      input.addEventListener('input', function () {
        var v = Number(input.value);
        settings[field] = v;
        out.textContent = v + ' ' + wrap.dataset.unit;
        pct(input);
        scheduleSave();
      });
      input.addEventListener('change', saveNow);
    });

    // 下拉
    $('fit').addEventListener('change', function (e) {
      settings.fit = e.target.value;
      saveNow();
    });
    $('position').addEventListener('change', function (e) {
      settings.position = e.target.value;
      saveNow();
    });
    $('theme').addEventListener('change', function (e) {
      settings.theme = e.target.value;
      saveNow();
    });
    $('headerDim').addEventListener('change', function (e) {
      settings.headerDim = Number(e.target.value);
      saveNow();
    });
    $('videoPages').addEventListener('change', function (e) {
      settings.videoPages = e.target.checked;
      renderStatus();
      saveNow();
    });

    // 重置外观
    $('reset-appearance').addEventListener('click', function () {
      var d = SK.DEFAULTS;
      ['blur', 'dim', 'glass', 'backdrop', 'brightness', 'saturation', 'fit', 'position', 'mode', 'headerDim'].forEach(
        function (k) {
          settings[k] = d[k];
        }
      );
      render();
      saveNow();
      toast('外观已恢复默认');
    });

    // 预览
    $('preview-btn').addEventListener('click', function () {
      chrome.tabs.create({ url: 'https://www.bilibili.com/' });
      window.close();
    });

    // 导入导出
    $('export-btn').addEventListener('click', exportConfig);
    $('import-btn').addEventListener('click', function () {
      $('import-input').click();
    });
    $('import-input').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      importConfig(f);
    });
  }

  /* ------------------------------------------------------------------ *
   * 启动
   * ------------------------------------------------------------------ */
  function boot() {
    bind();
    Promise.all([SK.Store.getSettings(), SK.ImageStore.warm()])
      .then(function (res) {
        settings = res[0];
        ready = true;
        render();
        // 图片已预热到内存，直接作为预览
        if (settings.source === 'file' && SK.ImageStore.peek()) {
          fileDataUrl = SK.ImageStore.peek();
          renderFileMeta();
        }
        return syncScene();
      })
      .catch(function (err) {
        ready = true;
        toast('读取设置失败：' + ((err && err.message) || err), true);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
