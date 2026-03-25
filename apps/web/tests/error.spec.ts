import { describe, expect, it } from 'vitest';
import { getErrorMessage, getErrorCode } from '../src/utils/error';
import { ApiError } from '../src/services/api-client';

describe('error utils', () => {
  describe('getErrorMessage', () => {
    it('应该返回ApiError的消息', () => {
      const error = new ApiError('CAP_4002', '名称已存在', 409, 'req-1');

      const result = getErrorMessage(error, '默认错误');

      expect(result).toBe('名称已存在');
    });

    it('应该返回fallback当错误不是ApiError', () => {
      const error = new Error('普通错误');

      const result = getErrorMessage(error, '默认错误');

      expect(result).toBe('默认错误');
    });

    it('应该返回fallback当错误是null', () => {
      const result = getErrorMessage(null, '默认错误');

      expect(result).toBe('默认错误');
    });

    it('应该返回fallback当错误是undefined', () => {
      const result = getErrorMessage(undefined, '默认错误');

      expect(result).toBe('默认错误');
    });

    it('应该返回fallback当错误是字符串', () => {
      const result = getErrorMessage('错误字符串', '默认错误');

      expect(result).toBe('默认错误');
    });
  });

  describe('getErrorCode', () => {
    it('应该返回ApiError的错误码', () => {
      const error = new ApiError('CAP_4002', '名称已存在', 409, 'req-1');

      const result = getErrorCode(error);

      expect(result).toBe('CAP_4002');
    });

    it('应该返回null当错误不是ApiError', () => {
      const error = new Error('普通错误');

      const result = getErrorCode(error);

      expect(result).toBeNull();
    });

    it('应该返回null当错误是null', () => {
      const result = getErrorCode(null);

      expect(result).toBeNull();
    });

    it('应该返回null当错误是undefined', () => {
      const result = getErrorCode(undefined);

      expect(result).toBeNull();
    });
  });
});
