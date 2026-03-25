import { describe, expect, it, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const repositoryPath = resolve(__dirname, '../../../src/modules/category/category.repository.js');
const { CategoryRepository } = require(repositoryPath);

describe('CategoryRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new CategoryRepository();
  });

  describe('list', () => {
    it('应该返回所有分类并按sort排序', () => {
      repository.create({ name: '分类B', sort: '20' });
      repository.create({ name: '分类A', sort: '10' });

      const result = repository.list();

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('分类A');
      expect(result[1].name).toBe('分类B');
    });

    it('应该返回空列表', () => {
      const result = repository.list();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('应该创建新分类', () => {
      const input = { name: '外部应用', sort: '10' };

      const result = repository.create(input);

      expect(result.kind).toBe('ok');
      expect(result.data.id).toBe('1');
      expect(result.data.name).toBe('外部应用');
      expect(result.data.normalized_name).toBe('外部应用');
      expect(result.data.sort).toBe('10');
      expect(result.data.is_builtin).toBe('0');
      expect(result.data.is_deleted).toBe('0');
      expect(result.data.version).toBe('1');
    });

    it('应该在重复时返回duplicate', () => {
      const input = { name: '外部应用', sort: '10' };

      repository.create(input);
      const result = repository.create(input);

      expect(result.kind).toBe('duplicate');
    });

    it('应该在重复时忽略大小写', () => {
      repository.create({ name: '外部应用', sort: '10' });
      const result = repository.create({ name: '外部应用', sort: '20' });

      expect(result.kind).toBe('duplicate');
    });

    it('应该在重复时忽略空格', () => {
      repository.create({ name: '外部应用', sort: '10' });
      const result = repository.create({ name: '  外部应用  ', sort: '20' });

      expect(result.kind).toBe('duplicate');
    });

    it('应该为多个分类分配递增ID', () => {
      repository.create({ name: '分类A', sort: '10' });
      repository.create({ name: '分类B', sort: '20' });
      const result = repository.create({ name: '分类C', sort: '30' });

      expect(result.data.id).toBe('3');
    });
  });

  describe('update', () => {
    it('应该更新分类', () => {
      const created = repository.create({ name: '外部应用', sort: '10' });

      const result = repository.update(created.data.id, {
        name: '新名称',
        sort: '20',
        version: '1',
      });

      expect(result.kind).toBe('ok');
      expect(result.data.name).toBe('新名称');
      expect(result.data.sort).toBe('20');
      expect(result.data.version).toBe('2');
    });

    it('应该在ID不存在时返回not_found', () => {
      const result = repository.update('999', {
        name: '新名称',
        sort: '20',
        version: '1',
      });

      expect(result.kind).toBe('not_found');
    });

    it('应该在版本冲突时返回version_conflict', () => {
      const created = repository.create({ name: '外部应用', sort: '10' });

      const result = repository.update(created.data.id, {
        name: '新名称',
        sort: '20',
        version: '999',
      });

      expect(result.kind).toBe('version_conflict');
    });

    it('应该更新normalized_name', () => {
      const created = repository.create({ name: '外部应用', sort: '10' });

      const result = repository.update(created.data.id, {
        name: '新分类',
        sort: '20',
        version: '1',
      });

      expect(result.data.normalized_name).toBe('新分类');
    });
  });

  describe('delete', () => {
    it('应该删除分类', () => {
      const created = repository.create({ name: '外部应用', sort: '10' });

      const result = repository.delete(created.data.id);

      expect(result.kind).toBe('ok');
      expect(result.data.id).toBe(created.data.id);
    });

    it('应该在ID不存在时返回not_found', () => {
      const result = repository.delete('999');

      expect(result.kind).toBe('not_found');
    });

    it('应该从列表中移除分类', () => {
      const created = repository.create({ name: '外部应用', sort: '10' });
      repository.delete(created.data.id);

      const result = repository.list();

      expect(result.length).toBe(0);
    });
  });
});
