// replacer.js - DOM 替换模块

import { AmountDetector } from './detector.js';
import { CurrencyConverter } from './converter.js';
import { SKIP_TAGS, CSS_CLASSES } from '../shared/constants.js';

/**
 * DOM 替换器
 */
export class DomReplacer {
  constructor() {
    this.converter = new CurrencyConverter();
    this.processedNodes = new WeakSet();
    this.observer = null;
    this.config = null;
    this.isProcessing = false;
    this.processingQueue = [];
  }

  /**
   * 初始化替换器
   * @param {Object} config - 配置
   */
  init(config) {
    this.config = config;
    this.setupObserver();
    this.injectStyles();
  }

  /**
   * 注入样式
   */
  injectStyles() {
    if (document.getElementById('quickrate-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'quickrate-styles';
    style.textContent = `
      .${CSS_CLASSES.CONVERTED} {
        cursor: help;
        border-bottom: 1px dashed #3498db;
        position: relative;
      }

      .${CSS_CLASSES.CONVERTED}:hover::after {
        content: attr(data-original);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10000;
        pointer-events: none;
      }

      .${CSS_CLASSES.CONVERTING} {
        opacity: 0.7;
      }

      .${CSS_CLASSES.ERROR} {
        color: #e74c3c;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 设置 MutationObserver
   */
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      if (!this.config || !this.config.enabled) {
        return;
      }

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          this.processNode(node);
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 处理整个页面
   */
  async processPage() {
    if (!this.config || !this.config.enabled) {
      return;
    }

    await this.processNode(document.body);
  }

  /**
   * 处理节点
   * @param {Node} node - DOM 节点
   */
  async processNode(node) {
    if (!node || this.processedNodes.has(node)) {
      return;
    }

    // 跳过特定标签
    if (node.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.includes(node.tagName)) {
      return;
    }

    // 跳过已处理的转换元素
    if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains(CSS_CLASSES.CONVERTED)) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      await this.processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 递归处理子节点
      const children = Array.from(node.childNodes);
      for (const child of children) {
        await this.processNode(child);
      }
    }
  }

  /**
   * 处理文本节点
   * @param {Text} textNode - 文本节点
   */
  async processTextNode(textNode) {
    if (this.processedNodes.has(textNode)) {
      return;
    }

    const text = textNode.textContent;
    if (!text || !text.trim()) {
      return;
    }

    // 快速检查是否包含货币符号
    if (!AmountDetector.hasCurrencySymbol(text)) {
      return;
    }

    const amounts = AmountDetector.detect(text);
    if (amounts.length === 0) {
      return;
    }

    this.processedNodes.add(textNode);

    try {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      for (const amount of amounts) {
        // 添加金额前的文本
        if (amount.start > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, amount.start))
          );
        }

        // 创建转换后的金额元素
        const span = document.createElement('span');
        span.className = CSS_CLASSES.CONVERTING;
        span.textContent = amount.raw;

        // 异步转换
        this.converter.convert(amount.value, amount.currency, this.config.targetCurrency)
          .then(result => {
            if (result) {
              span.className = CSS_CLASSES.CONVERTED;
              span.dataset.original = amount.raw;
              span.dataset.converted = result.formatted;
              span.dataset.rate = result.rate;
              span.textContent = result.formatted;
              span.title = `原始: ${amount.raw}\n汇率: 1 ${amount.currency} = ${result.rate} ${this.config.targetCurrency}`;
            }
          })
          .catch(error => {
            console.error('转换失败:', error);
            span.className = CSS_CLASSES.ERROR;
          });

        fragment.appendChild(span);
        lastIndex = amount.end;
      }

      // 添加剩余文本
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      // 替换原始节点
      if (fragment.childNodes.length > 0) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    } catch (error) {
      console.error('处理文本节点失败:', error);
    }
  }

  /**
   * 更新配置
   * @param {Object} config - 新配置
   */
  updateConfig(config) {
    this.config = config;

    if (config.enabled) {
      this.processPage();
    } else {
      this.restoreOriginal();
    }
  }

  /**
   * 恢复原始内容
   */
  restoreOriginal() {
    const convertedElements = document.querySelectorAll(`.${CSS_CLASSES.CONVERTED}`);
    convertedElements.forEach(element => {
      const original = element.dataset.original;
      if (original) {
        const textNode = document.createTextNode(original);
        element.parentNode.replaceChild(textNode, element);
      }
    });

    this.processedNodes = new WeakSet();
  }

  /**
   * 重新处理页面
   */
  async reprocess() {
    this.restoreOriginal();
    await this.processPage();
  }

  /**
   * 销毁替换器
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.restoreOriginal();
    this.processedNodes = new WeakSet();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const convertedElements = document.querySelectorAll(`.${CSS_CLASSES.CONVERTED}`);
    return {
      convertedCount: convertedElements.length,
      processedNodes: this.processedNodes.constructor.name === 'WeakSet' ? 'N/A' : this.processedNodes.size
    };
  }
}