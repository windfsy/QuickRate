// constants.js - 常量定义

/**
 * 货币符号到代码的映射
 */
export const CURRENCY_SYMBOLS = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'CNY',
  '₩': 'KRW',
  '₹': 'INR',
  '₽': 'RUB',
  'R$': 'BRL',
  'A$': 'AUD',
  'C$': 'CAD',
  'CHF': 'CHF',
  'NZ$': 'NZD'
};

/**
 * 货币代码到符号的映射
 */
export const CURRENCY_CODES = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
  INR: '₹',
  RUB: '₽',
  BRL: 'R$',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  NZD: 'NZ$'
};

/**
 * API 配置
 */
export const API_CONFIG = {
  BASE_URL: 'https://api.frankfurter.app',
  CACHE_DURATION: 60 * 60 * 1000, // 1小时
  REQUEST_TIMEOUT: 10000 // 10秒
};

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  sourceCurrency: 'USD',
  targetCurrency: 'CNY',
  enabled: true,
  showOriginal: true,
  cacheEnabled: true
};

/**
 * 需要跳过的 HTML 标签
 */
export const SKIP_TAGS = [
  'SCRIPT',
  'STYLE',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'NOSCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED'
];

/**
 * CSS 类名
 */
export const CSS_CLASSES = {
  CONVERTED: 'quickrate-converted',
  CONVERTING: 'quickrate-converting',
  ERROR: 'quickrate-error'
};