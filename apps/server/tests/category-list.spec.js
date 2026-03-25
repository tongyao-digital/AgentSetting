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

async function run() {
  const app = createApp({
    categories: [
      { id: '1', name: '外部应用', sort: '10' },
      { id: '2', name: '外部工作流', sort: '20' },
    ],
  });

  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.code, '0');
    assert.equal(body.message, 'ok');
    assert.equal(typeof body.request_id, 'string');
    assert.ok(Array.isArray(body.data.list));
    assert.equal(body.data.list.length, 2);
    assert.equal(body.data.list[0].name, '外部应用');
    assert.equal(body.data.total, '2');

    console.log('PASS category-list');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL category-list');
  console.error(err);
  process.exitCode = 1;
});
