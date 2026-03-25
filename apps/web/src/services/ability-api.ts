import type { AxiosInstance } from 'axios';

import type { CapabilityAPI, CategoryAPI, SyncAPI } from '../types/api-contract';

import { ApiClient } from './api-client';

const DEFAULT_BASE_PATH = '/api/v1/ability-management';

export function createAbilityApi(basePath = DEFAULT_BASE_PATH, axiosInstance?: AxiosInstance) {
  const client = new ApiClient(basePath, axiosInstance);

  return {
    listCategories: () => client.request<CategoryAPI.ListData>('/categories'),
    createCategory: (body: CategoryAPI.CreateBody) =>
      client.request('/categories', { method: 'POST', body: JSON.stringify(body) }),
    updateCategory: (params: CategoryAPI.UpdateParams, body: CategoryAPI.UpdateBody) =>
      client.request(`/categories/${params.id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteCategory: (params: CategoryAPI.DeleteParams) =>
      client.request(`/categories/${params.id}`, { method: 'DELETE' }),

    listCapabilities: (query: CapabilityAPI.ListQuery = {}) => {
      const search = new URLSearchParams();
      if (query.keyword) {
        search.set('keyword', query.keyword);
      }
      if (query.capability_type) {
        search.set('capability_type', query.capability_type);
      }

      const suffix = search.toString() ? `?${search.toString()}` : '';
      return client.request<CapabilityAPI.ListData>(`/capabilities${suffix}`);
    },
    createCapability: (body: CapabilityAPI.CreateBody) =>
      client.request('/capabilities', { method: 'POST', body: JSON.stringify(body) }),
    updateCapability: (params: CapabilityAPI.UpdateParams, body: CapabilityAPI.UpdateBody) =>
      client.request(`/capabilities/${params.id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteCapability: (params: CapabilityAPI.DeleteParams) =>
      client.request(`/capabilities/${params.id}`, { method: 'DELETE' }),

    listSyncJobs: () => client.request<SyncAPI.ListData>('/sync-jobs'),
    triggerSync: () => client.request<SyncAPI.TriggerData>('/sync-jobs/trigger', { method: 'POST', body: '{}' }),
  };
}

export type AbilityApi = ReturnType<typeof createAbilityApi>;

export const abilityApi = createAbilityApi();