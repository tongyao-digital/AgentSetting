const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/app');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

function createBody(overrides = {}) {
  return {
    capability_name: '天气查询',
    capability_type: 'EXT_APP',
    category_id: '1',
    intro: '查询天气',
    request_config: {
      method: 'GET',
      url: 'https://example.com/weather',
      body_type: 'none',
      connect_timeout_ms: '3000',
      read_timeout_ms: '10000',
      write_timeout_ms: '10000',
    },
    ...overrides,
  };
}

async function postCapability(port, body) {
  return fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST /api/v1/ability-management/capabilities creates manual capability', async (t) => {
  const app = createApp({ categories: [{ id: '1', name: '默认分类', sort: '10' }] });
  const server = http.createServer(app);
  const port = await listen(server);
  t.after(() => server.close());

  const res = await postCapability(port, createBody());
  assert.equal(res.status, 200);

  const payload = await res.json();
  assert.equal(payload.code, '0');
  assert.equal(payload.data.capability_name, '天气查询');
  assert.equal(payload.data.capability_type, 'EXT_APP');
  assert.equal(payload.data.category_id, '1');
  assert.equal(payload.data.source, 'manual');
  assert.equal(payload.data.version, '1');
});

test('POST /api/v1/ability-management/capabilities rejects WX capability type', async (t) => {
  const app = createApp({ categories: [{ id: '1', name: '默认分类', sort: '10' }] });
  const server = http.createServer(app);
  const port = await listen(server);
  t.after(() => server.close());

  const res = await postCapability(port, createBody({ capability_type: 'WX_APP' }));
  assert.equal(res.status, 400);

  const payload = await res.json();
  assert.equal(payload.code, 'CAP_4001');
});

test('POST /api/v1/ability-management/capabilities returns CAP_4003 when category missing', async (t) => {
  const app = createApp({ categories: [{ id: '1', name: '默认分类', sort: '10' }] });
  const server = http.createServer(app);
  const port = await listen(server);
  t.after(() => server.close());

  const res = await postCapability(port, createBody({ category_id: '999' }));
  assert.equal(res.status, 404);

  const payload = await res.json();
  assert.equal(payload.code, 'CAP_4003');
});

test('POST /api/v1/ability-management/capabilities checks duplicate in same category', async (t) => {
  const app = createApp({
    categories: [{ id: '1', name: '默认分类', sort: '10' }],
    capabilities: [
      {
        id: '1',
        capability_name: '天气查询',
        normalized_name: '天气查询',
        capability_type: 'EXT_APP',
        category_id: '1',
        source: 'manual',
        intro: null,
        request_config: null,
        is_deleted: '0',
        version: '1',
      },
    ],
  });
  const server = http.createServer(app);
  const port = await listen(server);
  t.after(() => server.close());

  const res = await postCapability(port, createBody({ capability_name: ' 天气 查询 ' }));
  assert.equal(res.status, 409);

  const payload = await res.json();
  assert.equal(payload.code, 'CAP_4002');
});

test('POST /api/v1/ability-management/capabilities validates URL policy', async (t) => {
  const app = createApp({ categories: [{ id: '1', name: '默认分类', sort: '10' }] });
  const server = http.createServer(app);
  const port = await listen(server);
  t.after(() => server.close());

  const res = await postCapability(port, createBody({ request_config: { ...createBody().request_config, url: 'http://127.0.0.1:8080/ping' } }));
  assert.equal(res.status, 400);

  const payload = await res.json();
  assert.equal(payload.code, 'CAP_4006');
});
