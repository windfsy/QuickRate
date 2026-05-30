// converter.js - 金额转换模块

import { CURRENCY_CODES } from '../shared/constants.js';

/**
 * 货币转换器
 */
export class CurrencyConverter {
  constructor() {
    this.rateCache = new Map();
    this.pendingRatePromise = null;
    this.pendingRateKey = null;
  }

  /**
   * 转换金额
   * @param {number} value - 原始金额
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @returns {Promise<Object>} 转换结果
   */
  async convert(value, from, to) {
    if (from === to) {
      return {
        original: value,
        converted: value,
        from,
        to,
        rate: 1,
        formatted: this.format(value, to)
      };
    }

    const rate = await this.getRate(from, to);
    return this.performConversion(value, from, to, rate);
  }

  /**
   * 执行转换
   * @param {number} value - 原始金额
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @param {number} rate - 汇率
   * @returns {Object} 转换结果
   */
  performConversion(value, from, to, rate) {
    const converted = value * rate;

    return {
      original: value,
      converted,
      from,
      to,
      rate,
      formatted: this.format(converted, to)
    };
  }

  /**
   * 获取汇率
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @returns {Promise<number>} 汇率
   */
  async getRate(from, to) {
    const cacheKey = `${from}_${to}`;

    // 检查内存缓存
    const cached = this.rateCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < 60 * 60 * 1000) { // 1小时
        return cached.rate;
      }
      this.rateCache.delete(cacheKey);
    }

    // 如果有相同的请求正在进行，复用它
    if (this.pendingRatePromise && this.pendingRateKey === cacheKey) {
      return this.pendingRatePromise;
    }

    // 发起新请求
    this.pendingRateKey = cacheKey;
    this.pendingRatePromise = this.fetchRate(from, to);

    try {
      const rate = await this.pendingRatePromise;
      return rate;
    } finally {
      this.pendingRatePromise = null;
      this.pendingRateKey = null;
    }
  }

  /**
   * 从 API 获取汇率
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @returns {Promise<number>} 汇率
   */
  async fetchRate(from, to) {
    const cacheKey = `${from}_${to}`;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getRate',
        from,
        to
      });

      if (response && response.rate) {
        // 缓存汇率
        this.rateCache.set(cacheKey, {
          rate: response.rate,
          timestamp: Date.now()
        });
        return response.rate;
      }

      // 响应无效，使用默认汇率
      console.warn('API 响应无效，使用默认汇率');
      return this.getDefaultRate(from, to);
    } catch (error) {
      console.error('获取汇率失败:', error.message);
      return this.getDefaultRate(from, to);
    }
  }

  /**
   * 获取默认汇率 (用于测试或离线)
   * @param {string} from - 源货币代码
   * @param {string} to - 目标货币代码
   * @returns {number} 默认汇率
   */
  getDefaultRate(from, to) {
    // 一些常见货币的默认汇率 (相对于 USD)
    const usdRates = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      CNY: 7.24,
      JPY: 149.50,
      KRW: 1320.50,
      INR: 83.12,
      RUB: 91.50,
      BRL: 4.97,
      AUD: 1.53,
      CAD: 1.36,
      CHF: 0.88,
      NZD: 1.67
    };

    const fromRate = usdRates[from] || 1;
    const toRate = usdRates[to] || 1;

    return toRate / fromRate;
  }

  /**
   * 格式化金额
   * @param {number} value - 金额
   * @param {string} currency - 货币代码
   * @returns {string} 格式化后的字符串
   */
  format(value, currency) {
    const symbol = CURRENCY_CODES[currency] || currency;

    // 根据货币调整小数位数
    const decimals = this.getDecimalPlaces(currency);

    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return `${symbol}${formatted}`;
  }

  /**
   * 获取货币的小数位数
   * @param {string} currency - 货币代码
   * @returns {number} 小数位数
   */
  getDecimalPlaces(currency) {
    // 某些货币通常不使用小数
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
    return noDecimalCurrencies.includes(currency) ? 0 : 2;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.rateCache.clear();
  }
}