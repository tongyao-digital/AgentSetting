import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const validatorPath = resolve(__dirname, '../../../src/common/validator.js');
const { isNumberString } = require(validatorPath);

describe('validator', () => {
  describe('isNumberString', () => {
    it('应该验证有效的数字字符串', () => {
      expect(isNumberString('0')).toBe(true);
      expect(isNumberString('1')).toBe(true);
      expect(isNumberString('123')).toBe(true);
      expect(isNumberString('999999')).toBe(true);
    });

    it('应该验证带前导零的数字字符串', () => {
      expect(isNumberString('001')).toBe(true);
      expect(isNumberString('0000')).toBe(true);
      expect(isNumberString('0123')).toBe(true);
    });

    it('应该拒绝非字符串值', () => {
      expect(isNumberString(123)).toBe(false);
      expect(isNumberString(null)).toBe(false);
      expect(isNumberString(undefined)).toBe(false);
      expect(isNumberString(true)).toBe(false);
      expect(isNumberString([])).toBe(false);
      expect(isNumberString({})).toBe(false);
    });

    it('应该拒绝包含非数字字符的字符串', () => {
      expect(isNumberString('12a')).toBe(false);
      expect(isNumberString('abc')).toBe(false);
      expect(isNumberString('12.34')).toBe(false);
      expect(isNumberString('-123')).toBe(false);
      expect(isNumberString('123 ')).toBe(false);
      expect(isNumberString(' 123')).toBe(false);
    });

    it('应该拒绝空字符串', () => {
      expect(isNumberString('')).toBe(false);
    });
  });
});
