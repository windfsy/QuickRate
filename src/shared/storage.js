// storage.js - Chrome Storage 封装

import { DEFAULT_CONFIG } from './constants.js';

/**
 * 存储管理器
 */
export class StorageManager {
  /**
   * 获取配置
   * @param {string|string[]} keys - 配置键
   * @returns {Promise<Object>} 配置值
   */
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    });
  }

  /**
   * 设置配置
   * @param {Object} items - 配置项
   * @returns {Promise<void>}
   */
  static async set(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  }

  /**
   * 删除配置
   * @param {string|string[]} keys - 配置键
   * @returns {Promise<void>}
   */
  static async remove(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
  }

  /**
   * 清除所有配置
   * @returns {Promise<void>}
   */
  static async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }

  /**
   * 获取完整配置
   * @returns {Promise<Object>} 完整配置
   */
  static async getConfig() {
    const result = await this.get([
      'sourceCurrency',
      'targetCurrency',
      'enabled',
      'showOriginal',
      'cacheEnabled'
    ]);

    return {
      ...DEFAULT_CONFIG,
      ...result
    };
  }

  /**
   * 保存配置
   * @param {Object} config - 配置
   * @returns {Promise<void>}
   */
  static async saveConfig(config) {
    await this.set(config);
  }

  /**
   * 重置配置为默认值
   * @returns {Promise<void>}
   */
  static async resetConfig() {
    await this.set(DEFAULT_CONFIG);
  }

  /**
   * 监听存储变化
   * @param {Function} callback - 回调函数
   */
  static onChanged(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }

  /**
   * 获取汇率缓存
   * @param {string} key - 缓存键
   * @returns {Promise<Object|null>} 缓存的汇率数据
   */
  static async getRateCache(key) {
    const result = await this.get(key);
    if (result[key]) {
      const data = result[key];
      const age = Date.now() - data.timestamp;

      // 检查是否过期 (1小时)
      if (age < 60 * 60 * 1000) {
        return data;
      }

      // 过期则删除
      await this.remove(key);
    }

    return null;
  }

  /**
   * 设置汇率缓存
   * @param {string} key - 缓存键
   * @param {Object} data - 汇率数据
   * @returns {Promise<void>}
   */
  static async setRateCache(key, data) {
    await this.set({
      [key]: {
        ...data,
        timestamp: Date.now()
      }
    });
  }

  /**
   * 清除所有汇率缓存
   * @returns {Promise<void>}
   */
  static async clearRateCache() {
    const all = await this.get(null);
    const rateKeys = Object.keys(all).filter(key => key.startsWith('rate_'));

    if (rateKeys.length > 0) {
      await this.remove(rateKeys);
    }
  }

  /**
   * 获取存储使用情况
   * @returns {Promise<Object>} 使用情况
   */
  static async getUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        resolve({
          bytesInUse,
          quota: chrome.storage.local.QUOTA_BYTES,
          usagePercent: (bytesInUse / chrome.storage.local.QUOTA_BYTES * 100).toFixed(2)
        });
      });
    });
  }
}