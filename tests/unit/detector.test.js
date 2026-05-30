// detector.test.js - 金额识别模块测试

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
  CURRENCY_SYMBOLS: {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'CNY'
  }
}));

const { AmountDetector } = require('../../src/content/detector.js');

describe('AmountDetector', () => {
  describe('detect', () => {
    test('应该识别符号前置的金额', () => {
      const text = '价格是 $100.50';
      const results = AmountDetector.detect(text);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        raw: '$100.50',
        value: 100.50,
        currency: 'USD'
      });
    });

    test('应该识别带千位分隔符的金额', () => {
      const text = '总价 $1,234.56';
      const results = AmountDetector.detect(text);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        raw: '$1,234.56',
        value: 1234.56,
        currency: 'USD'
      });
    });

    test('应该识别多个金额', () => {
      const text = '价格 $100 或 €200';
      const results = AmountDetector.detect(text);

      expect(results).toHaveLength(2);
      expect(results[0].currency).toBe('USD');
      expect(results[1].currency).toBe('EUR');
    });

    test('应该识别3位小数的金额', () => {
      const text = '$0.375/M';
      const results = AmountDetector.detect(text);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: 0.375,
        currency: 'USD'
      });
    });

    test('应该识别带单位的金额', () => {
      const text = '输入 Token ¥2.03/M 输出 Token ¥8.12/M 缓存读取 ¥0.20/M 缓存写入 $0.375/M';
      const results = AmountDetector.detect(text);

      expect(results).toHaveLength(4);
      expect(results[0].value).toBe(2.03);
      expect(results[1].value).toBe(8.12);
      expect(results[2].value).toBe(0.20);
      expect(results[3].value).toBe(0.375);
    });

    test('应该识别代码后置的金额', () => {
      const text = '价格 100 USD';
      const results = AmountDetector.detect(text);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        raw: '100 USD',
        value: 100,
        currency: 'USD'
      });
    });

    test('应该排除年份', () => {
      const text = '年份 2024';
      const results = AmountDetector.detect(text);

      expect(results).toHaveLength(0);
    });

    test('应该处理空文本', () => {
      const results = AmountDetector.detect('');
      expect(results).toHaveLength(0);
    });

    test('应该处理 null 输入', () => {
      const results = AmountDetector.detect(null);
      expect(results).toHaveLength(0);
    });
  });

  describe('parseValue', () => {
    test('应该解析带千位分隔符的数字', () => {
      expect(AmountDetector.parseValue('1,234.56')).toBe(1234.56);
    });

    test('应该解析带空格的数字', () => {
      expect(AmountDetector.parseValue('1 234.56')).toBe(1234.56);
    });

    test('应该解析简单数字', () => {
      expect(AmountDetector.parseValue('100.50')).toBe(100.50);
    });
  });

  describe('isValidAmount', () => {
    test('应该验证有效金额', () => {
      expect(AmountDetector.isValidAmount({ value: 100 })).toBe(true);
    });

    test('应该排除零值', () => {
      expect(AmountDetector.isValidAmount({ value: 0 })).toBe(false);
    });

    test('应该排除负值', () => {
      expect(AmountDetector.isValidAmount({ value: -100 })).toBe(false);
    });
  });

  describe('hasCurrencySymbol', () => {
    test('应该检测到货币符号', () => {
      expect(AmountDetector.hasCurrencySymbol('$100')).toBe(true);
    });

    test('应该检测到欧元符号', () => {
      expect(AmountDetector.hasCurrencySymbol('€100')).toBe(true);
    });

    test('应该排除无符号文本', () => {
      expect(AmountDetector.hasCurrencySymbol('100')).toBe(false);
    });
  });

  describe('detectCurrencyTypes', () => {
    test('应该检测多种货币类型', () => {
      const text = '$100 €200 ¥300';
      const types = AmountDetector.detectCurrencyTypes(text);

      expect(types).toContain('USD');
      expect(types).toContain('EUR');
      expect(types).toContain('CNY');
    });
  });
});