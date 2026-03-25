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
      body: JSON.stringify({ name: '非法分类', sort: '10a' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'CAP_4001');

    console.log('PASS number-string-invalid');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL number-string-invalid');
  console.error(err);
  process.exitCode = 1;
});
