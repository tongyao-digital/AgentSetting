import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const servicePath = resolve(__dirname, '../../../src/modules/category/category.service.js');
const { CategoryService } = require(servicePath);

describe('CategoryService', () => {
  let service;
  let mockCategoryRepository;

  beforeEach(() => {
    mockCategoryRepository = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new CategoryService(mockCategoryRepository);
  });

  describe('listCategories', () => {
    it('应该返回分类列表', () => {
      const categories = [
        { id: '1', name: '外部应用' },
        { id: '2', name: '外部工作流' },
      ];
      mockCategoryRepository.list.mockReturnValue(categories);

      const result = service.listCategories();

      expect(result.list).toEqual(categories);
      expect(result.total).toBe('2');
      expect(mockCategoryRepository.list).toHaveBeenCalled();
    });

    it('应该返回空列表', () => {
      mockCategoryRepository.list.mockReturnValue([]);

      const result = service.listCategories();

      expect(result.list).toEqual([]);
      expect(result.total).toBe('0');
    });
  });

  describe('createCategory', () => {
    it('应该创建分类', () => {
      const input = { name: '新分类', sort: '10' };
      const created = { id: '1', ...input };

      mockCategoryRepository.create.mockReturnValue({ kind: 'ok', data: created });

      const result = service.createCategory(input);

      expect(result.kind).toBe('ok');
      expect(result.data.name).toBe('新分类');
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(input);
    });

    it('应该在重复时返回duplicate', () => {
      const input = { name: '外部应用', sort: '10' };

      mockCategoryRepository.create.mockReturnValue({ kind: 'duplicate' });

      const result = service.createCategory(input);

      expect(result.kind).toBe('duplicate');
    });
  });

  describe('updateCategory', () => {
    it('应该更新分类', () => {
      const id = '1';
      const input = { name: '新名称', sort: '20', version: '1' };
      const updated = { id: '1', name: '新名称', sort: '20', version: '2' };

      mockCategoryRepository.update.mockReturnValue({ kind: 'ok', data: updated });

      const result = service.updateCategory(id, input);

      expect(result.kind).toBe('ok');
      expect(result.data.name).toBe('新名称');
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(id, input);
    });

    it('应该在ID不存在时返回not_found', () => {
      mockCategoryRepository.update.mockReturnValue({ kind: 'not_found' });

      const result = service.updateCategory('999', { name: '新名称' });

      expect(result.kind).toBe('not_found');
    });

    it('应该在版本冲突时返回version_conflict', () => {
      mockCategoryRepository.update.mockReturnValue({ kind: 'version_conflict' });

      const result = service.updateCategory('1', { name: '新名称', version: '999' });

      expect(result.kind).toBe('version_conflict');
    });
  });

  describe('deleteCategory', () => {
    it('应该删除分类', () => {
      const id = '1';

      mockCategoryRepository.delete.mockReturnValue({ kind: 'ok', data: { id } });

      const result = service.deleteCategory(id);

      expect(result.kind).toBe('ok');
      expect(result.data.id).toBe('1');
      expect(mockCategoryRepository.delete).toHaveBeenCalledWith(id);
    });

    it('应该在ID不存在时返回not_found', () => {
      mockCategoryRepository.delete.mockReturnValue({ kind: 'not_found' });

      const result = service.deleteCategory('999');

      expect(result.kind).toBe('not_found');
    });
  });
});
