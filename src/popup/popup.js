// popup.js - 弹出窗口交互逻辑

document.addEventListener('DOMContentLoaded', () => {
  const sourceCurrency = document.getElementById('sourceCurrency');
  const targetCurrency = document.getElementById('targetCurrency');
  const exchangeRate = document.getElementById('exchangeRate');
  const enableConversion = document.getElementById('enableConversion');
  const status = document.getElementById('status');

  // 加载保存的配置
  loadConfig();

  // 事件监听
  sourceCurrency.addEventListener('change', handleCurrencyChange);
  targetCurrency.addEventListener('change', handleCurrencyChange);
  enableConversion.addEventListener('change', handleToggleChange);

  /**
   * 加载保存的配置
   */
  function loadConfig() {
    chrome.storage.local.get(['sourceCurrency', 'targetCurrency', 'enabled'], (result) => {
      if (result.sourceCurrency) {
        sourceCurrency.value = result.sourceCurrency;
      }
      if (result.targetCurrency) {
        targetCurrency.value = result.targetCurrency;
      }
      if (result.enabled !== undefined) {
        enableConversion.checked = result.enabled;
      }
      updateExchangeRate();
    });
  }

  /**
   * 处理货币选择变化
   */
  function handleCurrencyChange() {
    const config = {
      sourceCurrency: sourceCurrency.value,
      targetCurrency: targetCurrency.value
    };

    chrome.storage.local.set(config, () => {
      updateExchangeRate();
      notifyContentScript();
    });
  }

  /**
   * 处理开关变化
   */
  function handleToggleChange() {
    const enabled = enableConversion.checked;

    chrome.storage.local.set({ enabled }, () => {
      notifyContentScript();
      updateStatus(enabled ? '转换已启用' : '转换已禁用');
    });
  }

  /**
   * 更新汇率显示
   */
  function updateExchangeRate() {
    const from = sourceCurrency.value;
    const to = targetCurrency.value;

    exchangeRate.textContent = '加载中...';

    // 通过 background script 获取汇率
    chrome.runtime.sendMessage(
      { action: 'getRate', from, to },
      (response) => {
        if (response && response.rate) {
          exchangeRate.textContent = `1 ${from} = ${response.rate} ${to}`;
        } else {
          exchangeRate.textContent = '获取失败';
        }
      }
    );
  }

  /**
   * 通知 content script 配置变化
   */
  function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'configUpdated',
          config: {
            sourceCurrency: sourceCurrency.value,
            targetCurrency: targetCurrency.value,
            enabled: enableConversion.checked
          }
        });
      }
    });
  }

  /**
   * 更新状态显示
   */
  function updateStatus(message) {
    status.textContent = message;
  }
});