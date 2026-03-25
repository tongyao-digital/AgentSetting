import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CapabilityManagement } from '../src/pages/capability-management';
import type { CapabilityDetail } from '../src/types/api-contract';

function buildCapability(overrides: Partial<CapabilityDetail> = {}): CapabilityDetail {
  return {
    id: '1',
    capability_name: '天气查询',
    normalized_name: '天气查询',
    capability_type: 'EXT_APP',
    category_id: '1',
    source: 'manual',
    external_id: null,
    intro: null,
    request_config: {
      method: 'GET',
      url: 'https://api.example.com/weather',
      body_type: 'none',
      connect_timeout_ms: '3000',
      read_timeout_ms: '10000',
      write_timeout_ms: '10000',
    },
    is_deleted: '0',
    created_by: 'admin',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'admin',
    updated_at: '2026-01-01T00:00:00.000Z',
    version: '1',
    ...overrides,
  };
}

describe('CapabilityManagement', () => {
  it('disables edit/delete for sync capabilities', async () => {
    const api = {
      listCapabilities: vi.fn().mockResolvedValue({
        list: [buildCapability({ source: 'sync' })],
        total: '1',
        page: '1',
        page_size: '10',
      }),
      createCapability: vi.fn(),
      updateCapability: vi.fn(),
      deleteCapability: vi.fn(),
    } as any;

    render(<CapabilityManagement api={api} />);

    await waitFor(() => expect(api.listCapabilities).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '编辑' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled();
  });

  it('creates manual capability with request config', async () => {
    const created = buildCapability({ id: '2', capability_name: '工单创建' });

    const api = {
      listCapabilities: vi
        .fn()
        .mockResolvedValueOnce({ list: [], total: '0', page: '1', page_size: '10' })
        .mockResolvedValueOnce({ list: [created], total: '1', page: '1', page_size: '10' }),
      createCapability: vi.fn().mockResolvedValue(created),
      updateCapability: vi.fn(),
      deleteCapability: vi.fn(),
    } as any;

    render(<CapabilityManagement api={api} />);

    await waitFor(() => expect(api.listCapabilities).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '新增能力' }));
    fireEvent.change(screen.getByLabelText('能力名称'), { target: { value: '工单创建' } });
    fireEvent.change(screen.getByLabelText('分类ID'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('请求URL'), { target: { value: 'https://api.example.com/ticket' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(api.createCapability).toHaveBeenCalledWith(
        expect.objectContaining({
          capability_name: '工单创建',
          capability_type: 'EXT_APP',
          category_id: '1',
          request_config: expect.objectContaining({
            method: 'GET',
            url: 'https://api.example.com/ticket',
          }),
        }),
      );
    });
  });
});
