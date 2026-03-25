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
      {
        id: '1',
        name: '外部应用',
        normalized_name: '外部应用',
        sort: '10',
        is_builtin: '0',
        is_deleted: '0',
        version: '1',
      },
    ],
  });

  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '外部应用-改', sort: '20', version: '1' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.code, '0');
    assert.equal(body.data.id, '1');
    assert.equal(body.data.name, '外部应用-改');
    assert.equal(body.data.sort, '20');
    assert.equal(body.data.version, '2');

    console.log('PASS category-update');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL category-update');
  console.error(err);
  process.exitCode = 1;
});
