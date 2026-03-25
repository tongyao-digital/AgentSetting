import { describe, expect, it, vi } from 'vitest';
import { createAbilityApi } from '../src/services/ability-api';

describe('ability-api', () => {
  describe('createAbilityApi', () => {
    it('应该创建API实例', () => {
      const api = createAbilityApi();

      expect(api).toBeDefined();
      expect(api.listCategories).toBeDefined();
      expect(api.createCategory).toBeDefined();
      expect(api.updateCategory).toBeDefined();
      expect(api.deleteCategory).toBeDefined();
      expect(api.listCapabilities).toBeDefined();
      expect(api.createCapability).toBeDefined();
      expect(api.updateCapability).toBeDefined();
      expect(api.deleteCapability).toBeDefined();
      expect(api.listSyncJobs).toBeDefined();
      expect(api.triggerSync).toBeDefined();
    });

    it('应该使用默认基础路径', () => {
      const mockAxios = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: { code: '0', message: 'ok', data: [], request_id: 'req-1' },
        }),
      };

      const api = createAbilityApi('/api/v1/ability-management', mockAxios as any);

      api.listCategories();

      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/categories',
        }),
      );
    });

    it('应该支持自定义基础路径', () => {
      const mockAxios = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: { code: '0', message: 'ok', data: [], request_id: 'req-1' },
        }),
      };

      const api = createAbilityApi('/custom/path', mockAxios as any);

      api.listCategories();

      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/categories',
        }),
      );
    });

    it('应该正确构建查询参数', () => {
      const mockAxios = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: { code: '0', message: 'ok', data: { list: [], total: '0', page: '1', page_size: '10' }, request_id: 'req-1' },
        }),
      };

      const api = createAbilityApi('/api/v1/ability-management', mockAxios as any);

      api.listCapabilities({ keyword: '天气', capability_type: 'EXT_APP' });

      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/capabilities?keyword=%E5%A4%A9%E6%B0%94&capability_type=EXT_APP',
        }),
      );
    });

    it('应该不包含空查询参数', () => {
      const mockAxios = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: { code: '0', message: 'ok', data: { list: [], total: '0', page: '1', page_size: '10' }, request_id: 'req-1' },
        }),
      };

      const api = createAbilityApi('/api/v1/ability-management', mockAxios as any);

      api.listCapabilities({});

      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/capabilities',
        }),
      );
    });

    it('应该只包含keyword参数', () => {
      const mockAxios = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: { code: '0', message: 'ok', data: { list: [], total: '0', page: '1', page_size: '10' }, request_id: 'req-1' },
        }),
      };

      const api = createAbilityApi('/api/v1/ability-management', mockAxios as any);

      api.listCapabilities({ keyword: '天气' });

      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/capabilities?keyword=%E5%A4%A9%E6%B0%94',
        }),
      );
    });

    it('应该只包含capability_type参数', () => {
      const mockAxios = {
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: { code: '0', message: 'ok', data: { list: [], total: '0', page: '1', page_size: '10' }, request_id: 'req-1' },
        }),
      };

      const api = createAbilityApi('/api/v1/ability-management', mockAxios as any);

      api.listCapabilities({ capability_type: 'EXT_APP' });

      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/capabilities?capability_type=EXT_APP',
        }),
      );
    });
  });
});
