// service-worker.js - 后台服务工作者

import { FrankfurterAPI } from './api.js';

/**
 * 后台服务管理器
 */
class BackgroundService {
  constructor() {
    this.api = new FrankfurterAPI();
    this.setupMessageListeners();
    this.setupAlarms();
  }

  /**
   * 设置消息监听
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'getRate':
          this.handleGetRate(request.from, request.to)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'getCurrencies':
          this.handleGetCurrencies()
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'getHistorical':
          this.handleGetHistorical(request.from, request.to, request.start, request.end)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'clearCache':
          this.api.clearCache();
          sendResponse({ success: true });
          break;

        case 'getCacheStats':
          sendResponse(this.api.getCacheStats());
          break;

        default:
          sendResponse({ error: '未知操作' });
      }

      return true;
    });
  }

  /**
   * 设置定时任务
   */
  setupAlarms() {
    // 每小时更新一次汇率缓存
    chrome.alarms.create('updateRates', {
      periodInMinutes: 60
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'updateRates') {
        this.updateCachedRates();
      }
    });
  }

  /**
   * 处理获取汇率请求
   * @param {string} from - 源货币
   * @param {string} to - 目标货币
   * @returns {Promise<Object>} 汇率数据
   */
  async handleGetRate(from, to) {
    try {
      const rateData = await this.api.getRate(from, to);
      return rateData;
    } catch (error) {
      console.error('获取汇率失败:', error);
      throw error;
    }
  }

  /**
   * 处理获取货币列表请求
   * @returns {Promise<Object>} 货币列表
   */
  async handleGetCurrencies() {
    try {
      const currencies = await this.api.getCurrencies();
      return currencies;
    } catch (error) {
      console.error('获取货币列表失败:', error);
      throw error;
    }
  }

  /**
   * 处理获取历史汇率请求
   * @param {string} from - 源货币
   * @param {string} to - 目标货币
   * @param {string} start - 开始日期
   * @param {string} end - 结束日期
   * @returns {Promise<Object>} 历史汇率数据
   */
  async handleGetHistorical(from, to, start, end) {
    try {
      const historical = await this.api.getHistoricalRates(from, to, start, end);
      return historical;
    } catch (error) {
      console.error('获取历史汇率失败:', error);
      throw error;
    }
  }

  /**
   * 更新缓存的汇率
   */
  async updateCachedRates() {
    try {
      // 获取用户配置的货币对
      const config = await this.getConfig();
      if (config.sourceCurrency && config.targetCurrency) {
        await this.api.getRate(config.sourceCurrency, config.targetCurrency);
        console.log('汇率缓存已更新');
      }
    } catch (error) {
      console.error('更新汇率缓存失败:', error);
    }
  }

  /**
   * 获取用户配置
   * @returns {Promise<Object>} 用户配置
   */
  async getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sourceCurrency', 'targetCurrency'], resolve);
    });
  }
}

// 启动后台服务
const backgroundService = new BackgroundService();

console.log('QuickRate background service worker loaded');