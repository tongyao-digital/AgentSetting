import { describe, expect, it, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const repositoryPath = resolve(__dirname, '../../../src/modules/sync/sync.repository.js');
const { SyncRepository } = require(repositoryPath);

describe('SyncRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new SyncRepository();
  });

  describe('list', () => {
    it('应该返回所有任务', () => {
      repository.createRunningJob();
      repository.createRunningJob();

      const result = repository.list();

      expect(result.length).toBe(2);
    });

    it('应该返回空列表', () => {
      const result = repository.list();

      expect(result).toEqual([]);
    });
  });

  describe('hasRunningJob', () => {
    it('应该在有运行中的任务时返回true', () => {
      repository.createRunningJob();

      const result = repository.hasRunningJob();

      expect(result).toBe(true);
    });

    it('应该在没有运行中的任务时返回false', () => {
      const result = repository.hasRunningJob();

      expect(result).toBe(false);
    });

    it('应该在任务完成时返回false', () => {
      repository.createRunningJob();
      repository.jobs[0].status = 'success';

      const result = repository.hasRunningJob();

      expect(result).toBe(false);
    });
  });

  describe('createRunningJob', () => {
    it('应该创建运行中的任务', () => {
      const job = repository.createRunningJob();

      expect(job.id).toBe('1');
      expect(job.job_type).toBe('incremental');
      expect(job.status).toBe('running');
      expect(job.started_at).toBeDefined();
      expect(job.ended_at).toBeNull();
      expect(job.success_count).toBe('0');
      expect(job.fail_count).toBe('0');
      expect(job.error_summary).toBeNull();
      expect(job.cursor_token).toBeNull();
    });

    it('应该为多个任务分配递增ID', () => {
      const job1 = repository.createRunningJob();
      const job2 = repository.createRunningJob();

      expect(job1.id).toBe('1');
      expect(job2.id).toBe('2');
    });

    it('应该将任务添加到列表中', () => {
      repository.createRunningJob();

      const result = repository.list();

      expect(result.length).toBe(1);
    });
  });
});
