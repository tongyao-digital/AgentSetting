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
  const app = createApp({ categories: [] });
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '外部应用', sort: '10' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.code, '0');
    assert.equal(body.message, 'ok');
    assert.equal(body.data.name, '外部应用');
    assert.equal(body.data.sort, '10');
    assert.equal(typeof body.data.id, 'string');
    assert.equal(body.data.version, '1');

    console.log('PASS category-create');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL category-create');
  console.error(err);
  process.exitCode = 1;
});
