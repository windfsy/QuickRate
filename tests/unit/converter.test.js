// converter.test.js - 金额转换模块测试

// 模拟 Chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn()
  }
};

// 模拟模块导入
jest.mock('../../src/shared/constants.js', () => ({
  CURRENCY_CODES: {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CNY: '¥',
    JPY: '¥'
  }
}));

const { CurrencyConverter } = require('../../src/content/converter.js');

describe('CurrencyConverter', () => {
  let converter;

  beforeEach(() => {
    converter = new CurrencyConverter();
    jest.clearAllMocks();
  });

  describe('convert', () => {
    test('应该转换相同货币', async () => {
      const result = await converter.convert(100, 'USD', 'USD');

      expect(result).toMatchObject({
        original: 100,
        converted: 100,
        from: 'USD',
        to: 'USD',
        rate: 1
      });
    });

    test('应该转换不同货币', async () => {
      // 模拟汇率响应
      chrome.runtime.sendMessage.mockResolvedValue({ rate: 7.24 });

      const result = await converter.convert(100, 'USD', 'CNY');

      expect(result).toMatchObject({
        original: 100,
        converted: 724,
        from: 'USD',
        to: 'CNY',
        rate: 7.24
      });
    });

    test('应该处理 API 错误', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('API Error'));

      const result = await converter.convert(100, 'USD', 'CNY');

      // 应该使用默认汇率
      expect(result).toBeDefined();
      expect(result.rate).toBeGreaterThan(0);
    });
  });

  describe('format', () => {
    test('应该格式化美元', () => {
      const formatted = converter.format(1234.56, 'USD');
      expect(formatted).toBe('$1,234.56');
    });

    test('应该格式化欧元', () => {
      const formatted = converter.format(1234.56, 'EUR');
      expect(formatted).toBe('€1,234.56');
    });

    test('应该格式化人民币', () => {
      const formatted = converter.format(1234.56, 'CNY');
      expect(formatted).toBe('¥1,234.56');
    });

    test('应该处理零值', () => {
      const formatted = converter.format(0, 'USD');
      expect(formatted).toBe('$0.00');
    });

    test('应该处理大数值', () => {
      const formatted = converter.format(1234567.89, 'USD');
      expect(formatted).toBe('$1,234,567.89');
    });
  });

  describe('getDefaultRate', () => {
    test('应该返回默认汇率', () => {
      const rate = converter.getDefaultRate('USD', 'CNY');
      expect(rate).toBeGreaterThan(0);
    });

    test('应该处理相同货币', () => {
      const rate = converter.getDefaultRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    test('应该计算交叉汇率', () => {
      const rate = converter.getDefaultRate('EUR', 'CNY');
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('batchConvert', () => {
    test('应该批量转换', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ rate: 7.24 });

      const amounts = [
        { value: 100, from: 'USD', to: 'CNY' },
        { value: 200, from: 'USD', to: 'CNY' },
        { value: 300, from: 'USD', to: 'CNY' }
      ];

      const results = await converter.batchConvert(amounts);

      expect(results).toHaveLength(3);
      expect(results[0].converted).toBe(724);
      expect(results[1].converted).toBe(1448);
      expect(results[2].converted).toBe(2172);
    });

    test('应该处理混合货币', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ rate: 7.24 });

      const amounts = [
        { value: 100, from: 'USD', to: 'CNY' },
        { value: 100, from: 'EUR', to: 'CNY' }
      ];

      const results = await converter.batchConvert(amounts);

      expect(results).toHaveLength(2);
    });
  });

  describe('clearCache', () => {
    test('应该清除缓存', () => {
      converter.rateCache.set('USD_CNY', { rate: 7.24, timestamp: Date.now() });
      converter.clearCache();

      expect(converter.rateCache.size).toBe(0);
    });
  });
});