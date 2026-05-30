// detector.js - 金额识别模块

import { CURRENCY_SYMBOLS } from '../shared/constants.js';

/**
 * 金额识别器
 */
export class AmountDetector {
  /**
   * 检测文本中的金额
   * @param {string} text - 输入文本
   * @returns {Array} 检测到的金额列表
   */
  static detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const results = [];

    // 匹配各种货币格式
    const patterns = [
      // 符号前置: $100, €1,000.50, ¥ 100
      {
        regex: /([\$€£¥₩₹₽])\s*(\d{1,3}(?:[,. ]\d{3})*(?:[,.]\d{1,2})?)/g,
        type: 'symbol-prefix'
      },
      // 符号后置: 100$, 1,000€
      {
        regex: /(\d{1,3}(?:[,. ]\d{3})*(?:[,.]\d{1,2})?)\s*([\$€£¥₩₹₽])/g,
        type: 'symbol-suffix'
      },
      // 代码后置: 100 USD, 1,000.50 EUR
      {
        regex: /(\d{1,3}(?:[,. ]\d{3})*(?:[,.]\d{1,2})?)\s*(USD|EUR|GBP|CNY|JPY|KRW|INR|RUB|BRL|AUD|CAD|CHF|NZD)/gi,
        type: 'code-suffix'
      },
      // 代码前置: USD 100, EUR 1,000
      {
        regex: /(USD|EUR|GBP|CNY|JPY|KRW|INR|RUB|BRL|AUD|CAD|CHF|NZD)\s*(\d{1,3}(?:[,. ]\d{3})*(?:[,.]\d{1,2})?)/gi,
        type: 'code-prefix'
      }
    ];

    patterns.forEach(({ regex, type }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const amount = this.parseMatch(match, type);
        if (amount && this.isValidAmount(amount)) {
          results.push(amount);
        }
      }
    });

    // 去重和排序
    return this.deduplicate(results).sort((a, b) => a.start - b.start);
  }

  /**
   * 解析匹配结果
   * @param {Array} match - 正则匹配结果
   * @param {string} type - 匹配类型
   * @returns {Object|null} 解析后的金额对象
   */
  static parseMatch(match, type) {
    let raw, valueStr, currency;

    switch (type) {
      case 'symbol-prefix':
        raw = match[0];
        currency = CURRENCY_SYMBOLS[match[1]];
        valueStr = match[2];
        break;
      case 'symbol-suffix':
        raw = match[0];
        currency = CURRENCY_SYMBOLS[match[2]];
        valueStr = match[1];
        break;
      case 'code-suffix':
        raw = match[0];
        currency = match[2].toUpperCase();
        valueStr = match[1];
        break;
      case 'code-prefix':
        raw = match[0];
        currency = match[1].toUpperCase();
        valueStr = match[2];
        break;
      default:
        return null;
    }

    if (!currency || !valueStr) {
      return null;
    }

    // 解析数值
    const value = this.parseValue(valueStr);
    if (isNaN(value)) {
      return null;
    }

    return {
      raw,
      value,
      currency,
      start: match.index,
      end: match.index + raw.length
    };
  }

  /**
   * 解析数值字符串
   * @param {string} valueStr - 数值字符串
   * @returns {number} 解析后的数值
   */
  static parseValue(valueStr) {
    // 移除千位分隔符，保留小数点
    const cleaned = valueStr
      .replace(/\s/g, '') // 移除空格
      .replace(/,(?=\d{3})/g, '') // 移除千位逗号
      .replace(/(?<=\d),(?=\d{2}$)/g, '.'); // 将小数逗号转换为点

    return parseFloat(cleaned);
  }

  /**
   * 验证金额是否有效
   * @param {Object} amount - 金额对象
   * @returns {boolean} 是否有效
   */
  static isValidAmount(amount) {
    // 排除负值
    if (amount.value <= 0) {
      return false;
    }

    // 排除明显非金额的数字
    const invalidPatterns = [
      /^\d{4}$/, // 年份 (2024)
      /^\d{5,}$/, // 过长的数字 (订单号等)
      /^0+$/, // 全零
      /^\d+\.\d{3,}$/ // 过多小数位
    ];

    const valueStr = amount.value.toString();
    return !invalidPatterns.some(pattern => pattern.test(valueStr));
  }

  /**
   * 去重
   * @param {Array} amounts - 金额列表
   * @returns {Array} 去重后的列表
   */
  static deduplicate(amounts) {
    const seen = new Set();
    return amounts.filter(amount => {
      const key = `${amount.start}-${amount.end}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 检测单个货币符号
   * @param {string} text - 输入文本
   * @returns {boolean} 是否包含货币符号
   */
  static hasCurrencySymbol(text) {
    const symbols = Object.keys(CURRENCY_SYMBOLS).join('|');
    const regex = new RegExp(`[${symbols}]`);
    return regex.test(text);
  }

  /**
   * 获取文本中的货币类型
   * @param {string} text - 输入文本
   * @returns {Array} 检测到的货币类型列表
   */
  static detectCurrencyTypes(text) {
    const amounts = this.detect(text);
    return [...new Set(amounts.map(a => a.currency))];
  }
}