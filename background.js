/**
 * background.js —— 安装时初始化默认设置。
 * 真正的皮肤渲染全部由 content.js 在各标签页内完成，这里保持极简。
 */
'use strict';

// 复用与 popup / content 相同的设置模型，避免默认值在多处不一致
importScripts('src/shared.js');

const SK = self.BiliSkin;
const SETTINGS_KEY = SK.STORAGE_KEY;

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.get(SETTINGS_KEY, (res) => {
    // 只补默认值，绝不覆盖老用户已有的配置
    if (res && res[SETTINGS_KEY]) return;

    const initial = Object.assign({}, SK.DEFAULTS, {
      source: 'preset',
      preset: 'aurora',
      mode: 'glass'
    });
    chrome.storage.local.set({ [SETTINGS_KEY]: SK.normalize(initial) });
  });

  if (details.reason === 'install') {
    // 首次安装：尝试打开工具栏面板，提示用户去 B 站使用
    // （openPopup 在部分版本/场景下不可用，失败时静默忽略）
    try {
      if (chrome.action && chrome.action.openPopup) {
        var p = chrome.action.openPopup();
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) {}
  }
});
