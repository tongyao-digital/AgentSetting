const { describe, expect, it, afterEach } = require('vitest');
const http = require('node:http');
const { createApp } = require('../../src/app');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

describe('API Integration Tests', () => {
  let server;
  let port;

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/v1/ability-management/categories', () => {
    it('应该返回分类列表', async () => {
      const app = createApp({
        categories: [
          { id: '1', name: '外部应用', sort: '10', is_builtin: '0', is_deleted: '0', version: '1' },
          { id: '2', name: '外部工作流', sort: '20', is_builtin: '0', is_deleted: '0', version: '1' },
        ],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories`);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.code).toBe('0');
      expect(body.message).toBe('ok');
      expect(body.data.list.length).toBe(2);
      expect(body.data.list[0].name).toBe('外部应用');
      expect(body.data.list[1].name).toBe('外部工作流');
    });
  });

  describe('POST /api/v1/ability-management/categories', () => {
    it('应该创建新分类', async () => {
      const app = createApp({
        categories: [],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新分类', sort: '30' }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.code).toBe('0');
      expect(body.data.name).toBe('新分类');
      expect(body.data.sort).toBe('30');
    });

    it('应该拒绝重复的分类名称', async () => {
      const app = createApp({
        categories: [
          { id: '1', name: '外部应用', sort: '10', is_builtin: '0', is_deleted: '0', version: '1', normalized_name: '外部应用' },
        ],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '外部应用', sort: '30' }),
      });

      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.code).toBe('CAP_4002');
    });

    it('应该拒绝无效的sort值', async () => {
      const app = createApp({
        categories: [],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新分类', sort: '10a' }),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe('CAP_4001');
    });
  });

  describe('GET /api/v1/ability-management/capabilities', () => {
    it('应该返回空能力列表', async () => {
      const app = createApp({
        categories: [],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities`);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.code).toBe('0');
      expect(body.data.list.length).toBe(0);
      expect(body.data.total).toBe('0');
    });
  });

  describe('POST /api/v1/ability-management/capabilities', () => {
    it('应该创建新能力', async () => {
      const app = createApp({
        categories: [
          { id: '1', name: '外部应用', sort: '10', is_builtin: '0', is_deleted: '0', version: '1' },
        ],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com/weather',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.code).toBe('0');
      expect(body.data.capability_name).toBe('天气查询');
      expect(body.data.source).toBe('manual');
    });

    it('应该拒绝无效的URL', async () => {
      const app = createApp({
        categories: [
          { id: '1', name: '外部应用', sort: '10', is_builtin: '0', is_deleted: '0', version: '1' },
        ],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        request_config: {
          method: 'GET',
          url: 'http://127.0.0.1:8080',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe('CAP_4006');
    });

    it('应该拒绝不存在的分类', async () => {
      const app = createApp({
        categories: [
          { id: '1', name: '外部应用', sort: '10', is_builtin: '0', is_deleted: '0', version: '1' },
        ],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const input = {
        capability_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '999',
        request_config: {
          method: 'GET',
          url: 'https://api.example.com/weather',
          body_type: 'none',
          connect_timeout_ms: '3000',
          read_timeout_ms: '10000',
          write_timeout_ms: '10000',
        },
      };

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.code).toBe('CAP_4003');
    });
  });

  describe('GET /api/v1/ability-management/sync-jobs', () => {
    it('应该返回空同步任务列表', async () => {
      const app = createApp({
        categories: [],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/sync-jobs`);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.code).toBe('0');
      expect(body.data.list.length).toBe(0);
    });
  });

  describe('POST /api/v1/ability-management/sync-jobs/trigger', () => {
    it('应该触发同步任务', async () => {
      const app = createApp({
        categories: [],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/sync-jobs/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.code).toBe('0');
      expect(body.data.status).toBe('running');
    });
  });

  describe('DELETE /api/v1/ability-management/categories/:id', () => {
    it('应该删除空分类', async () => {
      const app = createApp({
        categories: [
          { id: '1', name: '外部应用', sort: '10', is_builtin: '0', is_deleted: '0', version: '1' },
          { id: '2', name: '外部工作流', sort: '20', is_builtin: '0', is_deleted: '0', version: '1' },
        ],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories/2`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.code).toBe('0');
      expect(body.data.id).toBe('2');
    });

    it('应该拒绝删除不存在的分类', async () => {
      const app = createApp({
        categories: [
          { id: '1', name: '外部应用', sort: '10', is_builtin: '0', is_deleted: '0', version: '1' },
        ],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories/999`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.code).toBe('CAP_4003');
    });
  });

  describe('404 handling', () => {
    it('应该返回404对于未知路径', async () => {
      const app = createApp({
        categories: [],
        capabilities: [],
        syncJobs: [],
      });
      server = http.createServer(app);
      port = await listen(server);

      const res = await fetch(`http://127.0.0.1:${port}/unknown/path`);

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.code).toBe('CAP_4003');
    });
  });
});
