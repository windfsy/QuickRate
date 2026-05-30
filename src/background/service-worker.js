// service-worker.js - 后台服务工作者

const API_BASE_URL = 'https://api.frankfurter.app';
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

/**
 * 获取汇率
 * @param {string} from - 源货币代码
 * @param {string} to - 目标货币代码
 * @returns {Promise<Object>} 汇率数据
 */
async function getExchangeRate(from, to) {
  const cacheKey = `rate_${from}_${to}`;

  // 检查缓存
  const cached = await getCachedRate(cacheKey);
  if (cached) {
    return cached;
  }

  // 调用 API
  try {
    const response = await fetch(`${API_BASE_URL}/latest?from=${from}&to=${to}`);
    const data = await response.json();

    if (data.rates && data.rates[to]) {
      const rateData = {
        from,
        to,
        rate: data.rates[to],
        timestamp: Date.now(),
        cached: false
      };

      // 缓存结果
      await cacheRate(cacheKey, rateData);

      return rateData;
    }
  } catch (error) {
    console.error('获取汇率失败:', error);
  }

  return null;
}

/**
 * 获取缓存的汇率
 * @param {string} key - 缓存键
 * @returns {Promise<Object|null>} 缓存的汇率数据
 */
async function getCachedRate(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      if (result[key]) {
        const data = result[key];
        const age = Date.now() - data.timestamp;

        if (age < CACHE_DURATION) {
          resolve({ ...data, cached: true });
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * 缓存汇率数据
 * @param {string} key - 缓存键
 * @param {Object} data - 汇率数据
 */
async function cacheRate(key, data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: data }, resolve);
  });
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRate') {
    getExchangeRate(request.from, request.to).then(sendResponse);
    return true; // 保持消息通道开放
  }
});

console.log('QuickRate background service worker loaded');