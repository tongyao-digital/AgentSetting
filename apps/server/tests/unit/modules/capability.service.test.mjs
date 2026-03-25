import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const servicePath = resolve(__dirname, '../../../src/modules/capability/capability.service.js');
const { CapabilityService } = require(servicePath);

describe('CapabilityService', () => {
  let service;
  let mockCapabilityRepository;
  let mockCategoryRepository;

  beforeEach(() => {
    mockCapabilityRepository = {
      create: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockCategoryRepository = {
      list: vi.fn(),
    };
    service = new CapabilityService(mockCapabilityRepository, mockCategoryRepository);
  });

  describe('createCapability', () => {
    it('应该在验证通过时创建能力', () => {
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
        },
      };

      mockCategoryRepository.list.mockReturnValue([{ id: '1', is_deleted: '0' }]);
      mockCapabilityRepository.create.mockReturnValue({ kind: 'ok', data: { id: '1', ...input } });

      const result = service.createCapability(input);

      expect(result.kind).toBe('ok');
      expect(mockCategoryRepository.list).toHaveBeenCalled();
      expect(mockCapabilityRepository.create).toHaveBeenCalled();
    });

    it('应该在验证失败时返回错误', () => {
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

      const result = service.createCapability(input);

      expect(result.kind).toBe('invalid_param');
      expect(mockCategoryRepository.list).not.toHaveBeenCalled();
      expect(mockCapabilityRepository.create).not.toHaveBeenCalled();
    });

    it('应该在分类不存在时返回错误', () => {
      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '999',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };

      mockCategoryRepository.list.mockReturnValue([{ id: '1', is_deleted: '0' }]);

      const result = service.createCapability(input);

      expect(result).toEqual({ kind: 'category_not_found' });
      expect(mockCapabilityRepository.create).not.toHaveBeenCalled();
    });

    it('应该在分类已删除时返回错误', () => {
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
        },
      };

      mockCategoryRepository.list.mockReturnValue([{ id: '1', is_deleted: '1' }]);

      const result = service.createCapability(input);

      expect(result).toEqual({ kind: 'category_not_found' });
      expect(mockCapabilityRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('listCapabilities', () => {
    it('应该返回能力列表', () => {
      const capabilities = [
        { id: '1', capability_name: '天气查询' },
        { id: '2', capability_name: '新闻查询' },
      ];
      mockCapabilityRepository.list.mockReturnValue(capabilities);

      const result = service.listCapabilities();

      expect(result.list).toEqual(capabilities);
      expect(result.total).toBe('2');
      expect(result.page).toBe('1');
      expect(result.page_size).toBe('2');
    });

    it('应该返回空列表', () => {
      mockCapabilityRepository.list.mockReturnValue([]);

      const result = service.listCapabilities();

      expect(result.list).toEqual([]);
      expect(result.total).toBe('0');
    });
  });

  describe('updateCapability', () => {
    it('应该更新能力', () => {
      const id = '1';
      const input = { capability_name: '新名称' };
      const updated = { id: '1', capability_name: '新名称' };

      mockCapabilityRepository.update.mockReturnValue({ kind: 'ok', data: updated });

      const result = service.updateCapability(id, input);

      expect(result.kind).toBe('ok');
      expect(mockCapabilityRepository.update).toHaveBeenCalledWith(id, input);
    });
  });

  describe('deleteCapability', () => {
    it('应该删除能力', () => {
      const id = '1';

      mockCapabilityRepository.delete.mockReturnValue({ kind: 'ok', data: { id } });

      const result = service.deleteCapability(id);

      expect(result.kind).toBe('ok');
      expect(mockCapabilityRepository.delete).toHaveBeenCalledWith(id);
    });
  });
});
