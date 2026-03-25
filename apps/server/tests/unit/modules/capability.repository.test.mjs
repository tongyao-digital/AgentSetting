import { describe, expect, it, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const repositoryPath = resolve(__dirname, '../../../src/modules/capability/capability.repository.js');
const { CapabilityRepository } = require(repositoryPath);

describe('CapabilityRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new CapabilityRepository();
  });

  describe('create', () => {
    it('应该创建新能力', () => {
      const input = {
        capability_name: '天气查询',
        normalized_name: '天气查询',
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

      const result = repository.create(input);

      expect(result.kind).toBe('ok');
      expect(result.data.id).toBe('1');
      expect(result.data.capability_name).toBe('天气查询');
      expect(result.data.source).toBe('manual');
      expect(result.data.version).toBe('1');
    });

    it('应该在重复时返回duplicate', () => {
      const input = {
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      };

      repository.create(input);
      const result = repository.create(input);

      expect(result.kind).toBe('duplicate');
    });

    it('应该忽略已删除的重复能力', () => {
      const input = {
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      };

      const first = repository.create(input);
      repository.delete(first.data.id);
      const result = repository.create(input);

      expect(result.kind).toBe('ok');
    });

    it('应该为不同分类创建相同名称的能力', () => {
      const input1 = {
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      };
      const input2 = {
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '2',
      };

      const result1 = repository.create(input1);
      const result2 = repository.create(input2);

      expect(result1.kind).toBe('ok');
      expect(result2.kind).toBe('ok');
      expect(result2.data.id).toBe('2');
    });
  });

  describe('list', () => {
    it('应该返回所有未删除的能力', () => {
      repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });
      repository.create({
        capability_name: '新闻查询',
        normalized_name: '新闻查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });

      const result = repository.list();

      expect(result.length).toBe(2);
    });

    it('应该过滤已删除的能力', () => {
      const first = repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });
      repository.delete(first.data.id);

      const result = repository.list();

      expect(result.length).toBe(0);
    });

    it('应该支持关键词过滤', () => {
      repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });
      repository.create({
        capability_name: '新闻查询',
        normalized_name: '新闻查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });

      const result = repository.list({ keyword: '天气' });

      expect(result.length).toBe(1);
      expect(result[0].capability_name).toBe('天气查询');
    });

    it('应该支持类型过滤', () => {
      repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });
      repository.create({
        capability_name: '新闻查询',
        normalized_name: '新闻查询',
        capability_type: 'EXT_FLOW',
        category_id: '1',
      });

      const result = repository.list({ capability_type: 'EXT_APP' });

      expect(result.length).toBe(1);
      expect(result[0].capability_type).toBe('EXT_APP');
    });
  });

  describe('update', () => {
    it('应该更新能力', () => {
      const created = repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });

      const result = repository.update(created.data.id, {
        capability_name: '新名称',
        version: '1',
      });

      expect(result.kind).toBe('ok');
      expect(result.data.capability_name).toBe('新名称');
      expect(result.data.version).toBe('2');
    });

    it('应该在ID不存在时返回not_found', () => {
      const result = repository.update('999', {
        capability_name: '新名称',
        version: '1',
      });

      expect(result.kind).toBe('not_found');
    });

    it('应该在版本冲突时返回version_conflict', () => {
      const created = repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });

      const result = repository.update(created.data.id, {
        capability_name: '新名称',
        version: '999',
      });

      expect(result.kind).toBe('version_conflict');
    });

    it('应该拒绝更新sync来源的能力', () => {
      repository.capabilities.push({
        id: '1',
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        source: 'sync',
        version: '1',
      });

      const result = repository.update('1', {
        capability_name: '新名称',
        version: '1',
      });

      expect(result.kind).toBe('readonly');
    });

    it('应该在类型变更时清空request_config', () => {
      const created = repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
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
      });

      const result = repository.update(created.data.id, {
        capability_type: 'EXT_FLOW',
        version: '1',
      });

      expect(result.kind).toBe('ok');
      expect(result.data.request_config).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该删除能力', () => {
      const created = repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });

      const result = repository.delete(created.data.id);

      expect(result.kind).toBe('ok');
      expect(result.data.id).toBe(created.data.id);
    });

    it('应该在ID不存在时返回not_found', () => {
      const result = repository.delete('999');

      expect(result.kind).toBe('not_found');
    });

    it('应该拒绝删除sync来源的能力', () => {
      repository.capabilities.push({
        id: '1',
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        source: 'sync',
        version: '1',
      });

      const result = repository.delete('1');

      expect(result.kind).toBe('readonly');
    });

    it('应该支持幂等删除', () => {
      const created = repository.create({
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
      });

      const first = repository.delete(created.data.id);
      const second = repository.delete(created.data.id);

      expect(first.kind).toBe('ok');
      expect(second.kind).toBe('ok');
    });
  });
});
