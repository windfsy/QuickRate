// content.js - 内容脚本 (网页注入)

import { DomReplacer } from './replacer.js';
import { DEFAULT_CONFIG } from '../shared/constants.js';

/**
 * QuickRate 主控制器
 */
class QuickRate {
  constructor() {
    this.replacer = new DomReplacer();
    this.config = { ...DEFAULT_CONFIG };
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    try {
      // 加载配置
      await this.loadConfig();

      // 初始化替换器
      this.replacer.init(this.config);

      // 处理页面
      if (this.config.enabled) {
        await this.replacer.processPage();
      }

      // 监听消息
      this.setupMessageListener();

      console.log('QuickRate 初始化完成');
    } catch (error) {
      console.error('QuickRate 初始化失败:', error);
    }
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sourceCurrency', 'targetCurrency', 'enabled', 'showOriginal'], (result) => {
        this.config = {
          ...DEFAULT_CONFIG,
          ...result
        };
        resolve();
      });
    });
  }

  /**
   * 设置消息监听
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'configUpdated':
          this.handleConfigUpdate(request.config);
          sendResponse({ success: true });
          break;

        case 'getStatus':
          sendResponse({
            enabled: this.config.enabled,
            stats: this.replacer.getStats()
          });
          break;

        case 'reprocess':
          this.replacer.reprocess();
          sendResponse({ success: true });
          break;

        case 'toggle':
          this.config.enabled = request.enabled;
          this.replacer.updateConfig(this.config);
          chrome.storage.local.set({ enabled: request.enabled });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: '未知操作' });
      }

      return true;
    });
  }

  /**
   * 处理配置更新
   * @param {Object} config - 新配置
   */
  handleConfigUpdate(config) {
    this.config = {
      ...this.config,
      ...config
    };

    this.replacer.updateConfig(this.config);
  }

  /**
   * 销毁
   */
  destroy() {
    this.replacer.destroy();
  }
}

// 启动 QuickRate
const quickRate = new QuickRate();

// 页面卸载时销毁
window.addEventListener('unload', () => {
  quickRate.destroy();
});