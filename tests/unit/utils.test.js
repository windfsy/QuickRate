// utils.test.js - 工具函数测试

const {
  debounce,
  throttle,
  sleep,
  formatNumber,
  formatCurrency,
  formatDate,
  generateId,
  deepClone,
  merge,
  isValidUrl,
  getDomain,
  safeJsonParse
} = require('../../src/shared/utils.js');

describe('Utils', () => {
  describe('debounce', () => {
    test('应该延迟执行', async () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      debouncedFunc();
      debouncedFunc();

      expect(func).not.toHaveBeenCalled();

      await sleep(150);

      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    test('应该限制执行频率', async () => {
      const func = jest.fn();
      const throttledFunc = throttle(func, 100);

      throttledFunc();
      throttledFunc();
      throttledFunc();

      expect(func).toHaveBeenCalledTimes(1);

      await sleep(150);

      throttledFunc();

      expect(func).toHaveBeenCalledTimes(2);
    });
  });

  describe('formatNumber', () => {
    test('应该格式化数字', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
    });

    test('应该处理小数位数', () => {
      expect(formatNumber(1234.5678, 3)).toBe('1,234.568');
    });

    test('应该处理零', () => {
      expect(formatNumber(0)).toBe('0.00');
    });
  });

  describe('formatCurrency', () => {
    test('应该格式化货币', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
    });

    test('应该处理无效货币', () => {
      const result = formatCurrency(1234.56, 'INVALID');
      expect(result).toContain('1,234.56');
    });
  });

  describe('formatDate', () => {
    test('应该格式化日期', () => {
      const date = new Date(2024, 0, 15, 10, 30, 0);
      const result = formatDate(date, 'YYYY-MM-DD HH:mm:ss');
      expect(result).toBe('2024-01-15 10:30:00');
    });

    test('应该处理时间戳', () => {
      const timestamp = new Date(2024, 0, 15).getTime();
      const result = formatDate(timestamp, 'YYYY-MM-DD');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('generateId', () => {
    test('应该生成唯一 ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('deepClone', () => {
    test('应该深拷贝对象', () => {
      const original = {
        a: 1,
        b: { c: 2, d: [3, 4] },
        e: new Date()
      };

      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
    });

    test('应该处理 null', () => {
      expect(deepClone(null)).toBeNull();
    });

    test('应该处理基本类型', () => {
      expect(deepClone(123)).toBe(123);
      expect(deepClone('abc')).toBe('abc');
    });
  });

  describe('merge', () => {
    test('应该合并对象', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 }, e: 4 };

      const result = merge(target, source);

      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      });
    });

    test('应该覆盖简单属性', () => {
      const target = { a: 1, b: 2 };
      const source = { a: 10, c: 3 };

      const result = merge(target, source);

      expect(result).toEqual({
        a: 10,
        b: 2,
        c: 3
      });
    });
  });

  describe('isValidUrl', () => {
    test('应该验证有效 URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    test('应该拒绝无效 URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('getDomain', () => {
    test('应该获取域名', () => {
      expect(getDomain('https://www.example.com/path')).toBe('www.example.com');
    });

    test('应该处理无效 URL', () => {
      expect(getDomain('not-a-url')).toBe('');
    });
  });

  describe('safeJsonParse', () => {
    test('应该解析有效 JSON', () => {
      const result = safeJsonParse('{"a": 1}');
      expect(result).toEqual({ a: 1 });
    });

    test('应该处理无效 JSON', () => {
      const result = safeJsonParse('invalid', { default: true });
      expect(result).toEqual({ default: true });
    });

    test('应该返回 null 作为默认值', () => {
      const result = safeJsonParse('invalid');
      expect(result).toBeNull();
    });
  });
});