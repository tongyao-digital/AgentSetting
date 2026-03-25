import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../src/services/api-client';
import { CategoryManagement } from '../src/pages/category-management';
import type { CategoryItem } from '../src/types/api-contract';

function buildCategory(overrides: Partial<CategoryItem> = {}): CategoryItem {
  return {
    id: '1',
    name: '外部应用',
    normalized_name: '外部应用',
    sort: '10',
    is_builtin: '0',
    is_deleted: '0',
    created_by: 'admin',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'admin',
    updated_at: '2026-01-01T00:00:00.000Z',
    version: '1',
    ...overrides,
  };
}

describe('CategoryManagement', () => {
  it('loads category list on mount', async () => {
    const api = {
      listCategories: vi.fn().mockResolvedValue({
        list: [buildCategory({ name: '外部应用' }), buildCategory({ id: '2', name: '外部工作流', sort: '20' })],
      }),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    } as any;

    render(<CategoryManagement api={api} />);

    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(1));
    expect(screen.getByText('外部应用')).toBeInTheDocument();
    expect(screen.getByText('外部工作流')).toBeInTheDocument();
  });

  it('disables edit and delete for builtin category', async () => {
    const api = {
      listCategories: vi.fn().mockResolvedValue({
        list: [buildCategory({ id: '99', name: '问学应用', is_builtin: '1' })],
      }),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    } as any;

    render(<CategoryManagement api={api} />);

    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '编辑' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled();
  });

  it('creates category from modal form', async () => {
    const created = buildCategory({ id: '3', name: '检索能力', sort: '08' });
    const api = {
      listCategories: vi
        .fn()
        .mockResolvedValueOnce({ list: [] })
        .mockResolvedValueOnce({ list: [created] }),
      createCategory: vi.fn().mockResolvedValue(created),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    } as any;

    render(<CategoryManagement api={api} />);

    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '新增分类' }));
    fireEvent.change(screen.getByLabelText('分类名称'), { target: { value: '检索能力' } });
    fireEvent.change(screen.getByLabelText('排序'), { target: { value: '08' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(api.createCategory).toHaveBeenCalledWith({
        name: '检索能力',
        sort: '08',
      });
    });

    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(2));
    expect(screen.getByText('检索能力')).toBeInTheDocument();
  });

  it('shows server error when delete fails', async () => {
    const api = {
      listCategories: vi.fn().mockResolvedValue({ list: [buildCategory()] }),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn().mockRejectedValue(new ApiError('CAP_4005', '分类下存在能力，无法删除', 409, 'req-1')),
    } as any;

    render(<CategoryManagement api={api} />);

    await waitFor(() => expect(api.listCategories).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledWith({ id: '1' }));
    expect(await screen.findByText('分类下存在能力，无法删除')).toBeInTheDocument();
  });
});
