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
    // 数字部分：支持整数、千位分隔符、小数（最多6位）
    const numPattern = '\\d{1,3}(?:[,\\. ]\\d{3})*(?:[,\\.]\\d{1,6})?|\\d+(?:[,\\.]\\d{1,6})';

    const patterns = [
      // 多字符符号前置: R$100, A$50, C$100, NZ$200
      {
        regex: new RegExp(`(R\\$|A\\$|C\\$|NZ\\$)\\s*(${numPattern})`, 'g'),
        type: 'symbol-prefix'
      },
      // 多字符符号后置: 100R$, 50A$
      {
        regex: new RegExp(`(${numPattern})\\s*(R\\$|A\\$|C\\$|NZ\\$)`, 'g'),
        type: 'symbol-suffix'
      },
      // 单字符符号前置: $100, €1,000.50, ¥ 100, $0.375
      {
        regex: new RegExp(`([\\$€£¥₩₹₽])\\s*(${numPattern})`, 'g'),
        type: 'symbol-prefix'
      },
      // 单字符符号后置: 100$, 1,000€
      {
        regex: new RegExp(`(${numPattern})\\s*([\\$€£¥₩₹₽])`, 'g'),
        type: 'symbol-suffix'
      },
      // 代码后置: 100 USD, 1,000.50 EUR, 0.375 USD
      {
        regex: new RegExp(`(${numPattern})\\s*(USD|EUR|GBP|CNY|JPY|KRW|INR|RUB|BRL|AUD|CAD|CHF|NZD)`, 'gi'),
        type: 'code-suffix'
      },
      // 代码前置: USD 100, EUR 1,000
      {
        regex: new RegExp(`(USD|EUR|GBP|CNY|JPY|KRW|INR|RUB|BRL|AUD|CAD|CHF|NZD)\\s*(${numPattern})`, 'gi'),
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
    const valueStr = amount.value.toString();

    // 年份 (2024, 1999)
    if (/^(19|20)\d{2}$/.test(valueStr)) {
      return false;
    }

    // 过长的数字 (订单号、ID等) - 超过10位整数
    if (/^\d{10,}$/.test(valueStr)) {
      return false;
    }

    // 全零
    if (/^0+(\.0+)?$/.test(valueStr)) {
      return false;
    }

    return true;
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
    const singleSymbols = ['\\$', '€', '£', '¥', '₩', '₹', '₽'];
    const multiSymbols = ['R\\$', 'A\\$', 'C\\$', 'NZ\\$'];
    const singleRegex = new RegExp(`[${singleSymbols.join('')}]`);
    const multiRegex = new RegExp(multiSymbols.join('|'));
    return singleRegex.test(text) || multiRegex.test(text);
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