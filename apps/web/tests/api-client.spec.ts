import type { AxiosInstance, AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiError } from '../src/services/api-client';

function createAxiosMock(response: Partial<AxiosResponse>) {
  return {
    request: vi.fn().mockResolvedValue(response),
  } as unknown as AxiosInstance;
}

describe('ApiClient', () => {
  it('returns data when code is 0', async () => {
    const axiosMock = createAxiosMock({
      status: 200,
      data: {
        code: '0',
        message: 'ok',
        data: { id: '1' },
        request_id: 'req-1',
      },
    });

    const client = new ApiClient('/api/v1/ability-management', axiosMock);
    const data = await client.request<{ id: string }>('/categories');

    expect(data).toEqual({ id: '1' });
  });

  it('throws ApiError when code is not 0', async () => {
    const axiosMock = createAxiosMock({
      status: 409,
      data: {
        code: 'CAP_4002',
        message: '名称已存在',
        request_id: 'req-2',
      },
    });

    const client = new ApiClient('/api/v1/ability-management', axiosMock);

    await expect(client.request('/categories')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'CAP_4002',
      status: 409,
      message: '名称已存在',
      requestId: 'req-2',
    });
  });

  it('throws ApiError for malformed payload', async () => {
    const axiosMock = createAxiosMock({
      status: 200,
      data: {
        foo: 'bar',
      },
    });

    const client = new ApiClient('/api/v1/ability-management', axiosMock);

    await expect(client.request('/categories')).rejects.toBeInstanceOf(ApiError);
  });
});