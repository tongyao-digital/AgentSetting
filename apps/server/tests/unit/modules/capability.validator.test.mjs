import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// 从 tests/unit/modules/ 到 src/modules/capability/
const validatorPath = resolve(__dirname, '../../../src/modules/capability/capability.validator.js');
const { normalizeCapabilityName, validateCreateCapabilityInput } = require(validatorPath);

describe('capability.validator', () => {
  describe('normalizeCapabilityName', () => {
    it('应该去除首尾空格并转为小写', () => {
      expect(normalizeCapabilityName('  Hello World  ')).toBe('helloworld');
    });

    it('应该将多个空格替换为单个空格', () => {
      expect(normalizeCapabilityName('Hello   World')).toBe('helloworld');
    });

    it('应该处理空字符串', () => {
      expect(normalizeCapabilityName('')).toBe('');
    });
  });

  describe('validateCreateCapabilityInput', () => {
    it('应该验证有效的创建输入', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        intro: '查询天气信息',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com/weather',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      const result = validateCreateCapabilityInput(input);
      expect(result.kind).toBe('ok');
      expect(result.data.capability_name).toBe('天气查询');
      expect(result.data.capability_type).toBe('EXT_APP');
    });

    it('应该拒绝非对象输入', () => {
      expect(validateCreateCapabilityInput(null)).toEqual({ kind: 'invalid_param' });
      expect(validateCreateCapabilityInput('string')).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝空名称', () => {
      const input = {
        capability_name: '',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝超过10个字符的名称', () => {
      const input = {
        capability_name: '这是一个超过十个字符的名称',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝WX类型', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'WX_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝包含非数字字符的分类ID', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1a',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝无效的HTTP方法', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'INVALID',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝私有IP地址', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'http://127.0.0.1:8080',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_url' });
    });

    it('应该拒绝超时值小于1000ms', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '500',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝超时值大于60000ms', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '70000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝包含黑名单头部的配置', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
          headers_json: { host: 'example.com' },
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });

    it('应该拒绝超过10个字符的intro', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        intro: '这是一个超过十个字符的intro',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };
      expect(validateCreateCapabilityInput(input)).toEqual({ kind: 'invalid_param' });
    });
  });
});
