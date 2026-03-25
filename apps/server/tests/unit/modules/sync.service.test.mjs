import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const servicePath = resolve(__dirname, '../../../src/modules/sync/sync.service.js');
const { SyncService } = require(servicePath);

describe('SyncService', () => {
  let service;
  let mockSyncRepository;

  beforeEach(() => {
    mockSyncRepository = {
      list: vi.fn(),
      hasRunningJob: vi.fn(),
      createRunningJob: vi.fn(),
    };
    service = new SyncService(mockSyncRepository);
  });

  describe('trigger', () => {
    it('应该在没有运行中的任务时创建新任务', () => {
      const job = {
        id: '1',
        job_type: 'incremental',
        status: 'running',
        started_at: new Date().toISOString(),
      };

      mockSyncRepository.hasRunningJob.mockReturnValue(false);
      mockSyncRepository.createRunningJob.mockReturnValue(job);

      const result = service.trigger();

      expect(result.kind).toBe('ok');
      expect(result.data.job_id).toBe('1');
      expect(result.data.status).toBe('running');
      expect(mockSyncRepository.hasRunningJob).toHaveBeenCalled();
      expect(mockSyncRepository.createRunningJob).toHaveBeenCalled();
    });

    it('应该在有运行中的任务时返回冲突', () => {
      mockSyncRepository.hasRunningJob.mockReturnValue(true);

      const result = service.trigger();

      expect(result).toEqual({ kind: 'running_conflict' });
      expect(mockSyncRepository.createRunningJob).not.toHaveBeenCalled();
    });
  });

  describe('listJobs', () => {
    it('应该返回任务列表', () => {
      const jobs = [
        { id: '1', job_type: 'incremental', status: 'success' },
        { id: '2', job_type: 'full', status: 'running' },
      ];
      mockSyncRepository.list.mockReturnValue(jobs);

      const result = service.listJobs();

      expect(result.list).toEqual(jobs);
      expect(result.total).toBe('2');
      expect(mockSyncRepository.list).toHaveBeenCalled();
    });

    it('应该返回空列表', () => {
      mockSyncRepository.list.mockReturnValue([]);

      const result = service.listJobs();

      expect(result.list).toEqual([]);
      expect(result.total).toBe('0');
    });
  });
});
