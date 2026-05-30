// index.js - 国际化管理模块

import zhCN from './zh-CN.js';
import en from './en.js';
import ja from './ja.js';
import ko from './ko.js';

// 支持的语言
const locales = {
  'zh-CN': zhCN,
  'zh': zhCN,
  'en': en,
  'en-US': en,
  'en-GB': en,
  'ja': ja,
  'ja-JP': ja,
  'ko': ko,
  'ko-KR': ko
};

// 默认语言
const DEFAULT_LOCALE = 'zh-CN';

// 当前语言
let currentLocale = DEFAULT_LOCALE;
let messages = zhCN;

/**
 * 获取浏览器语言
 * @returns {string} 浏览器语言代码
 */
function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || DEFAULT_LOCALE;
  return lang;
}

/**
 * 匹配最接近的语言
 * @param {string} lang - 语言代码
 * @returns {string} 匹配的语言代码
 */
function matchLocale(lang) {
  // 精确匹配
  if (locales[lang]) {
    return lang;
  }

  // 前缀匹配 (zh-TW -> zh-CN)
  const prefix = lang.split('-')[0];
  if (locales[prefix]) {
    return prefix;
  }

  // 默认
  return DEFAULT_LOCALE;
}

/**
 * 初始化语言
 * @param {string} [preferredLang] - 优先语言
 */
export function initLocale(preferredLang) {
  const browserLang = getBrowserLanguage();
  const lang = preferredLang || browserLang;

  currentLocale = matchLocale(lang);
  messages = locales[currentLocale] || zhCN;

  console.log(`[i18n] Language: ${currentLocale} (browser: ${browserLang})`);
}

/**
 * 获取翻译文本
 * @param {string} key - 键名 (支持点号路径，如 'currencies.USD')
 * @param {Object} [params] - 替换参数
 * @returns {string} 翻译后的文本
 */
export function t(key, params = {}) {
  // 支持点号路径
  const keys = key.split('.');
  let value = messages;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // 回退到默认语言
      value = getFromDefault(key);
      break;
    }
  }

  // 如果不是字符串，返回键名
  if (typeof value !== 'string') {
    console.warn(`[i18n] Missing key: ${key}`);
    return key;
  }

  // 替换参数 {name} -> params.name
  return value.replace(/\{(\w+)\}/g, (match, param) => {
    return params[param] !== undefined ? params[param] : match;
  });
}

/**
 * 从默认语言获取
 * @param {string} key - 键名
 * @returns {string|null}
 */
function getFromDefault(key) {
  const keys = key.split('.');
  let value = zhCN;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return null;
    }
  }

  return typeof value === 'string' ? value : null;
}

/**
 * 获取当前语言
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * 获取支持的语言列表
 * @returns {Array}
 */
export function getSupportedLocales() {
  return [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' }
  ];
}

/**
 * 应用翻译到 DOM
 * 扫描所有 [data-i18n] 属性并替换文本
 */
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);

    if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });

  // 翻译 title 属性
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}