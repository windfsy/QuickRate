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
    this.observer = null;
    this.config = null;
    this.isProcessing = false;
    this.stats = {
      convertedCount: 0,
      startTime: null
    };
  }

  /**
   * 初始化替换器
   * @param {Object} config - 配置
   */
  init(config) {
    this.config = config;
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
        display: inline;
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

    // 用于批量处理的缓冲区和定时器
    let pendingNodes = [];
    let debounceTimer = null;

    this.observer = new MutationObserver((mutations) => {
      if (!this.config || !this.config.enabled || this.isProcessing) {
        return;
      }

      // 收集需要处理的节点，过滤掉插件自身创建的节点
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          // 跳过插件自己创建的元素
          if (this.isQuickRateNode(node)) {
            continue;
          }
          pendingNodes.push(node);
        }
      }

      // 使用防抖批量处理，避免频繁触发
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        const nodes = [...pendingNodes];
        pendingNodes = [];
        debounceTimer = null;
        if (nodes.length > 0) {
          this.processNodes(nodes);
        }
      }, 300);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 检查是否是插件创建的节点
   * @param {Node} node - DOM 节点
   * @returns {boolean}
   */
  isQuickRateNode(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 检查元素是否有插件的类名
      if (node.classList && (
        node.classList.contains(CSS_CLASSES.CONVERTED) ||
        node.classList.contains(CSS_CLASSES.CONVERTING) ||
        node.classList.contains(CSS_CLASSES.ERROR)
      )) {
        return true;
      }

      // 检查是否有插件的 style 标签
      if (node.id === 'quickrate-styles') {
        return true;
      }

      // 检查父元素
      if (node.closest && node.closest(`.${CSS_CLASSES.CONVERTED}`)) {
        return true;
      }
    }

    // 检查文本节点的父元素
    if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
      if (node.parentNode.classList && node.parentNode.classList.contains(CSS_CLASSES.CONVERTED)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 处理整个页面
   */
  async processPage() {
    if (!this.config || !this.config.enabled || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.stats.startTime = Date.now();

    // 临时断开 Observer 防止无限循环
    if (this.observer) {
      this.observer.disconnect();
    }

    try {
      await this.processNode(document.body);
    } catch (error) {
      console.error('处理页面失败:', error);
    } finally {
      this.isProcessing = false;

      // 重新连接 Observer
      this.setupObserver();
    }
  }

  /**
   * 批量处理节点
   * @param {Node[]} nodes - 节点数组
   */
  async processNodes(nodes) {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    // 临时断开 Observer
    if (this.observer) {
      this.observer.disconnect();
    }

    try {
      for (const node of nodes) {
        if (!this.isQuickRateNode(node)) {
          await this.processNode(node);
        }
      }
    } catch (error) {
      console.error('批量处理节点失败:', error);
    } finally {
      this.isProcessing = false;

      // 重新连接 Observer
      this.setupObserver();
    }
  }

  /**
   * 处理节点
   * @param {Node} node - DOM 节点
   */
  async processNode(node) {
    if (!node) {
      return;
    }

    // 跳过插件创建的节点
    if (this.isQuickRateNode(node)) {
      return;
    }

    // 跳过特定标签
    if (node.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.includes(node.tagName)) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      await this.processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 递归处理子节点（先复制一份，因为处理过程中可能修改 DOM）
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
    // 检查节点是否还在 DOM 中
    if (!textNode.parentNode) {
      return;
    }

    // 检查父元素是否是插件创建的
    if (this.isQuickRateNode(textNode)) {
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
        span.dataset.quickrate = 'true';

        // 异步转换（不等待完成，避免阻塞）
        this.converter.convert(amount.value, amount.currency, this.config.targetCurrency)
          .then(result => {
            if (result && span.parentNode) {
              span.className = CSS_CLASSES.CONVERTED;
              span.dataset.original = amount.raw;
              span.dataset.converted = result.formatted;
              span.dataset.rate = result.rate;
              span.textContent = result.formatted;
              span.title = `原始: ${amount.raw}\n汇率: 1 ${amount.currency} = ${result.rate} ${this.config.targetCurrency}`;

              // 更新统计
              this.stats.convertedCount++;
            }
          })
          .catch(error => {
            console.error('转换失败:', error);
            if (span.parentNode) {
              span.className = CSS_CLASSES.ERROR;
            }
          });

        fragment.appendChild(span);
        lastIndex = amount.end;
      }

      // 添加剩余文本
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      // 替换原始节点
      if (fragment.childNodes.length > 0 && textNode.parentNode) {
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
    // 临时断开 Observer
    if (this.observer) {
      this.observer.disconnect();
    }

    const convertedElements = document.querySelectorAll(`.${CSS_CLASSES.CONVERTED}, .${CSS_CLASSES.CONVERTING}, .${CSS_CLASSES.ERROR}`);
    convertedElements.forEach(element => {
      const original = element.dataset.original || element.textContent;
      if (original) {
        const textNode = document.createTextNode(original);
        element.parentNode.replaceChild(textNode, element);
      }
    });

    // 合并相邻的文本节点
    document.body.normalize();

    // 重新连接 Observer
    this.setupObserver();
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
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const convertedElements = document.querySelectorAll(`.${CSS_CLASSES.CONVERTED}`);
    return {
      convertedCount: convertedElements.length || this.stats.convertedCount,
      startTime: this.stats.startTime,
      duration: this.stats.startTime ? Date.now() - this.stats.startTime : 0
    };
  }
}