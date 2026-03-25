import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const responsePath = resolve(__dirname, '../../../src/common/response.js');
const { sendJson, parseJsonBody } = require(responsePath);

describe('response', () => {
  describe('sendJson', () => {
    it('应该发送JSON响应', () => {
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      const payload = { code: '0', message: 'ok' };

      sendJson(res, 200, payload);

      expect(res.statusCode).toBe(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', expect.any(Number));
      expect(res.end).toHaveBeenCalledWith(JSON.stringify(payload));
    });

    it('应该设置正确的状态码', () => {
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };

      sendJson(res, 404, { code: 'CAP_4003' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('parseJsonBody', () => {
    it('应该解析JSON请求体', async () => {
      const req = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback('{"name":"test"}');
          }
          if (event === 'end') {
            callback();
          }
        }),
      };

      const result = await parseJsonBody(req);

      expect(result).toEqual({ name: 'test' });
    });

    it('应该返回空对象当请求体为空', async () => {
      const req = {
        on: vi.fn((event, callback) => {
          if (event === 'end') {
            callback();
          }
        }),
      };

      const result = await parseJsonBody(req);

      expect(result).toEqual({});
    });

    it('应该在JSON解析失败时拒绝', async () => {
      const req = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback('invalid json');
          }
          if (event === 'end') {
            callback();
          }
        }),
      };

      await expect(parseJsonBody(req)).rejects.toThrow();
    });

    it('应该在请求错误时拒绝', async () => {
      const req = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Request error'));
          }
        }),
      };

      await expect(parseJsonBody(req)).rejects.toThrow('Request error');
    });
  });
});
