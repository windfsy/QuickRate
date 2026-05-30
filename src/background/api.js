// api.js - Frankfurter API 封装

import { API_CONFIG } from '../shared/constants.js';

/**
 * Frankfurter API 客户端
 */
export class FrankfurterAPI {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * 获取汇率
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @returns {Promise<Object>} 汇率数据
   */
  async getRate(from, to) {
    const cacheKey = `${from}_${to}`;

    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // 发起新请求
    const request = this.fetchRate(from, to);
    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * 从 API 获取汇率
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @returns {Promise<Object>} 汇率数据
   */
  async fetchRate(from, to) {
    const url = `${this.baseUrl}/latest?from=${from}&to=${to}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();

      if (!data.rates || !data.rates[to]) {
        throw new Error('无效的汇率数据');
      }

      const rateData = {
        from,
        to,
        rate: data.rates[to],
        timestamp: Date.now(),
        date: data.date
      };

      // 缓存结果
      this.setCache(cacheKey, rateData);

      return rateData;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('API 请求超时');
      }
      throw error;
    }
  }

  /**
   * 获取支持的货币列表
   * @returns {Promise<Object>} 货币列表
   */
  async getCurrencies() {
    const cacheKey = 'currencies';

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}/currencies`);
      const data = await response.json();

      this.setCache(cacheKey, data, 24 * 60 * 60 * 1000); // 缓存24小时

      return data;
    } catch (error) {
      console.error('获取货币列表失败:', error);
      return null;
    }
  }

  /**
   * 获取历史汇率
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Promise<Object>} 历史汇率数据
   */
  async getHistoricalRates(from, to, startDate, endDate) {
    const url = `${this.baseUrl}/${startDate}..${endDate}?from=${from}&to=${to}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      return {
        from,
        to,
        rates: data.rates,
        startDate: data.start_date,
        endDate: data.end_date
      };
    } catch (error) {
      console.error('获取历史汇率失败:', error);
      return null;
    }
  }

  /**
   * 从缓存获取数据
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存的数据
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {Object} data - 数据
   * @param {number} ttl - 缓存时间 (毫秒)
   */
  setCache(key, data, ttl = API_CONFIG.CACHE_DURATION) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  getCacheStats() {
    let valid = 0;
    let expired = 0;

    this.cache.forEach((cached) => {
      const age = Date.now() - cached.timestamp;
      if (age > cached.ttl) {
        expired++;
      } else {
        valid++;
      }
    });

    return {
      total: this.cache.size,
      valid,
      expired
    };
  }
}