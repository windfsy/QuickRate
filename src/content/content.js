// content.js - 内容脚本 (网页注入)

/**
 * 金额识别模块
 */
const AmountDetector = {
  // 货币符号映射
  CURRENCY_SYMBOLS: {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'CNY',
    '₩': 'KRW',
    '₹': 'INR',
    '₽': 'RUB'
  },

  // 货币代码正则
  CURRENCY_CODES: Object.values(this.CURRENCY_SYMBOLS).join('|'),

  /**
   * 检测文本中的金额
   * @param {string} text - 输入文本
   * @returns {Array} 检测到的金额列表
   */
  detect(text) {
    const results = [];

    // 匹配货币符号 + 数字 (如 $100, €1,000.50)
    const symbolPattern = /([\$€£¥₩₹₽])\s*(\d{1,3}(?:[,. ]\d{3})*(?:[,.]\d{1,2})?)/g;

    // 匹配数字 + 货币代码 (如 100 USD, 1,000 EUR)
    const codePattern = /(\d{1,3}(?:[,. ]\d{3})*(?:[,.]\d{1,2})?)\s*(USD|EUR|GBP|CNY|JPY|KRW|INR|RUB)/gi;

    let match;

    // 匹配符号前置
    while ((match = symbolPattern.exec(text)) !== null) {
      const symbol = match[1];
      const valueStr = match[2].replace(/[,. ]/g, '');
      const value = parseFloat(valueStr);

      if (!isNaN(value) && value > 0) {
        results.push({
          raw: match[0],
          value,
          currency: this.CURRENCY_SYMBOLS[symbol],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    // 匹配代码后置
    while ((match = codePattern.exec(text)) !== null) {
      const valueStr = match[1].replace(/[,. ]/g, '');
      const value = parseFloat(valueStr);

      if (!isNaN(value) && value > 0) {
        results.push({
          raw: match[0],
          value,
          currency: match[2].toUpperCase(),
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return results;
  }
};

/**
 * 汇率转换模块
 */
const CurrencyConverter = {
  /**
   * 转换金额
   * @param {number} value - 原始金额
   * @param {string} from - 源货币
   * @param {string} to - 目标货币
   * @returns {Promise<string>} 格式化后的金额
   */
  async convert(value, from, to) {
    if (from === to) {
      return this.format(value, to);
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getRate',
        from,
        to
      });

      if (response && response.rate) {
        const converted = value * response.rate;
        return this.format(converted, to);
      }
    } catch (error) {
      console.error('转换失败:', error);
    }

    return null;
  },

  /**
   * 格式化金额
   * @param {number} value - 金额
   * @param {string} currency - 货币代码
   * @returns {string} 格式化后的字符串
   */
  format(value, currency) {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CNY: '¥',
      JPY: '¥',
      KRW: '₩',
      INR: '₹',
      RUB: '₽'
    };

    const symbol = symbols[currency] || currency;
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${symbol}${formatted}`;
  }
};

/**
 * DOM 替换模块
 */
const DomReplacer = {
  processedNodes: new WeakSet(),

  /**
   * 处理文本节点
   * @param {Text} textNode - 文本节点
   * @param {Object} config - 配置
   */
  async processTextNode(textNode, config) {
    if (this.processedNodes.has(textNode)) {
      return;
    }

    const text = textNode.textContent;
    const amounts = AmountDetector.detect(text);

    if (amounts.length === 0) {
      return;
    }

    this.processedNodes.add(textNode);

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
      const converted = await CurrencyConverter.convert(
        amount.value,
        amount.currency,
        config.targetCurrency
      );

      if (converted) {
        const span = document.createElement('span');
        span.className = 'quickrate-converted';
        span.dataset.original = amount.raw;
        span.dataset.converted = converted;
        span.textContent = converted;
        span.title = `原始: ${amount.raw}`;
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(amount.raw));
      }

      lastIndex = amount.end;
    }

    // 添加剩余文本
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    // 替换原始节点
    textNode.parentNode.replaceChild(fragment, textNode);
  },

  /**
   * 处理 DOM 节点
   * @param {Node} node - DOM 节点
   * @param {Object} config - 配置
   */
  async processNode(node, config) {
    if (node.nodeType === Node.TEXT_NODE) {
      await this.processTextNode(node, config);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 跳过特定标签
      const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT'];
      if (skipTags.includes(node.tagName)) {
        return;
      }

      // 递归处理子节点
      const children = Array.from(node.childNodes);
      for (const child of children) {
        await this.processNode(child, config);
      }
    }
  },

  /**
   * 处理整个页面
   * @param {Object} config - 配置
   */
  async processPage(config) {
    await this.processNode(document.body, config);
  }
};

/**
 * 主控制器
 */
const QuickRate = {
  config: {
    sourceCurrency: 'USD',
    targetCurrency: 'CNY',
    enabled: true
  },

  observer: null,

  /**
   * 初始化
   */
  async init() {
    // 加载配置
    await this.loadConfig();

    // 处理页面
    if (this.config.enabled) {
      await this.processPage();
    }

    // 监听动态内容
    this.setupObserver();

    // 监听配置变化
    this.setupMessageListener();
  },

  /**
   * 加载配置
   */
  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sourceCurrency', 'targetCurrency', 'enabled'], (result) => {
        if (result.sourceCurrency) this.config.sourceCurrency = result.sourceCurrency;
        if (result.targetCurrency) this.config.targetCurrency = result.targetCurrency;
        if (result.enabled !== undefined) this.config.enabled = result.enabled;
        resolve();
      });
    });
  },

  /**
   * 处理页面
   */
  async processPage() {
    await DomReplacer.processPage(this.config);
  },

  /**
   * 设置 MutationObserver
   */
  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (!this.config.enabled) return;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          DomReplacer.processNode(node, this.config);
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  /**
   * 设置消息监听
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'configUpdated') {
        this.config = request.config;

        if (this.config.enabled) {
          this.processPage();
        }
      }
    });
  }
};

// 启动
QuickRate.init();