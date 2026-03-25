import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SyncJobPanel } from '../src/pages/sync-job-panel';
import { ApiError } from '../src/services/api-client';
import type { SyncJobItem } from '../src/types/api-contract';

function buildJob(overrides: Partial<SyncJobItem> = {}): SyncJobItem {
  return {
    id: '1',
    job_type: 'incremental',
    status: 'running',
    started_at: '2026-03-26T00:00:00.000Z',
    ended_at: null,
    success_count: '0',
    fail_count: '0',
    error_summary: null,
    cursor_token: null,
    ...overrides,
  };
}

describe('SyncJobPanel', () => {
  it('loads and displays sync jobs', async () => {
    const api = {
      listSyncJobs: vi.fn().mockResolvedValue({ list: [buildJob()] }),
      triggerSync: vi.fn(),
    } as any;

    render(<SyncJobPanel api={api} />);

    await waitFor(() => expect(api.listSyncJobs).toHaveBeenCalledTimes(1));
    expect(screen.getByText('incremental')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('shows conflict message when trigger is rejected', async () => {
    const api = {
      listSyncJobs: vi.fn().mockResolvedValue({ list: [buildJob()] }),
      triggerSync: vi
        .fn()
        .mockRejectedValue(new ApiError('CAP_4091', '并发冲突', 409, 'req-sync-1')),
    } as any;

    render(<SyncJobPanel api={api} />);

    await waitFor(() => expect(api.listSyncJobs).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '手动触发同步' }));

    await waitFor(() => expect(api.triggerSync).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('并发冲突')).toBeInTheDocument();
  });
});
