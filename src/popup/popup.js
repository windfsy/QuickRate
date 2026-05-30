// popup.js - 弹出窗口交互逻辑
import './popup.css';

/**
 * 弹出窗口控制器
 */
class PopupController {
  constructor() {
    this.elements = {};
    this.config = {
      sourceCurrency: 'USD',
      targetCurrency: 'CNY',
      enabled: true,
      showOriginal: true
    };
    this.init();
  }

  /**
   * 初始化
   */
  init() {
    this.bindElements();
    this.loadConfig();
    this.setupEventListeners();
  }

  /**
   * 绑定 DOM 元素
   */
  bindElements() {
    this.elements = {
      sourceCurrency: document.getElementById('sourceCurrency'),
      targetCurrency: document.getElementById('targetCurrency'),
      exchangeRate: document.getElementById('exchangeRate'),
      rateTime: document.getElementById('rateTime'),
      enableConversion: document.getElementById('enableConversion'),
      showOriginal: document.getElementById('showOriginal'),
      status: document.getElementById('status'),
      convertedCount: document.getElementById('convertedCount'),
      refreshBtn: document.getElementById('refreshBtn'),
      swapBtn: document.getElementById('swapBtn')
    };
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      const result = await chrome.storage.local.get([
        'sourceCurrency',
        'targetCurrency',
        'enabled',
        'showOriginal'
      ]);

      this.config = {
        ...this.config,
        ...result
      };

      this.updateUI();
      this.updateExchangeRate();
      this.updateStats();
    } catch (error) {
      console.error('加载配置失败:', error);
      this.updateStatus('Load failed');
    }
  }

  /**
   * 更新 UI 状态
   */
  updateUI() {
    const { sourceCurrency, targetCurrency, enabled, showOriginal } = this.config;

    if (this.elements.sourceCurrency) {
      this.elements.sourceCurrency.value = sourceCurrency;
    }

    if (this.elements.targetCurrency) {
      this.elements.targetCurrency.value = targetCurrency;
    }

    if (this.elements.enableConversion) {
      this.elements.enableConversion.checked = enabled;
    }

    if (this.elements.showOriginal) {
      this.elements.showOriginal.checked = showOriginal;
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 货币选择变化
    if (this.elements.sourceCurrency) {
      this.elements.sourceCurrency.addEventListener('change', () => {
        this.config.sourceCurrency = this.elements.sourceCurrency.value;
        this.saveConfig();
        this.updateExchangeRate();
        this.notifyContentScript();
      });
    }

    if (this.elements.targetCurrency) {
      this.elements.targetCurrency.addEventListener('change', () => {
        this.config.targetCurrency = this.elements.targetCurrency.value;
        this.saveConfig();
        this.updateExchangeRate();
        this.notifyContentScript();
      });
    }

    // 开关变化
    if (this.elements.enableConversion) {
      this.elements.enableConversion.addEventListener('change', () => {
        this.config.enabled = this.elements.enableConversion.checked;
        this.saveConfig();
        this.notifyContentScript();
        this.updateStatus(this.config.enabled ? 'Enabled' : 'Disabled');
      });
    }

    // 显示原金额开关
    if (this.elements.showOriginal) {
      this.elements.showOriginal.addEventListener('change', () => {
        this.config.showOriginal = this.elements.showOriginal.checked;
        this.saveConfig();
        this.notifyContentScript();
      });
    }

    // 刷新按钮
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', () => {
        this.refreshRates();
      });
    }

    // 交换按钮
    if (this.elements.swapBtn) {
      this.elements.swapBtn.addEventListener('click', () => {
        this.swapCurrencies();
      });
    }
  }

  /**
   * 保存配置
   */
  async saveConfig() {
    try {
      await chrome.storage.local.set(this.config);
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }

  /**
   * 更新汇率显示
   */
  async updateExchangeRate() {
    const { sourceCurrency, targetCurrency } = this.config;

    if (this.elements.exchangeRate) {
      this.elements.exchangeRate.textContent = '...';
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getRate',
        from: sourceCurrency,
        to: targetCurrency
      });

      if (response && response.rate) {
        if (this.elements.exchangeRate) {
          this.elements.exchangeRate.textContent = `1 ${sourceCurrency} = ${response.rate.toFixed(4)} ${targetCurrency}`;
        }

        if (this.elements.rateTime) {
          this.elements.rateTime.textContent = response.cached ? 'Cached' : 'Just now';
        }

        this.updateStatus('Ready');
      } else {
        if (this.elements.exchangeRate) {
          this.elements.exchangeRate.textContent = '--';
        }
        this.updateStatus('Failed to get rate');
      }
    } catch (error) {
      console.error('获取汇率失败:', error);
      if (this.elements.exchangeRate) {
        this.elements.exchangeRate.textContent = '--';
      }
      this.updateStatus('Network error');
    }
  }

  /**
   * 更新统计信息
   */
  async updateStats() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        if (response && response.stats) {
          if (this.elements.convertedCount) {
            this.elements.convertedCount.textContent = response.stats.convertedCount || 0;
          }
        }
      }
    } catch (error) {
      // 忽略错误，可能是页面没有加载 content script
      if (this.elements.convertedCount) {
        this.elements.convertedCount.textContent = '0';
      }
    }
  }

  /**
   * 刷新汇率
   */
  async refreshRates() {
    this.updateStatus('Refreshing...');
    await chrome.runtime.sendMessage({ action: 'clearCache' });
    await this.updateExchangeRate();
  }

  /**
   * 交换源货币和目标货币
   */
  swapCurrencies() {
    const { sourceCurrency, targetCurrency } = this.config;
    this.config.sourceCurrency = targetCurrency;
    this.config.targetCurrency = sourceCurrency;

    this.updateUI();
    this.saveConfig();
    this.updateExchangeRate();
    this.notifyContentScript();
  }

  /**
   * 通知 content script 配置变化
   */
  async notifyContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'configUpdated',
          config: this.config
        });
      }
    } catch (error) {
      // 忽略错误，可能是页面没有加载 content script
    }
  }

  /**
   * 更新状态显示
   */
  updateStatus(message) {
    if (this.elements.status) {
      this.elements.status.textContent = message;
    }
  }
}

// 初始化弹出窗口
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});