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

  try {
    const first = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities/1`, {
      method: 'DELETE',
    });
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(firstBody.code, '0');

    const second = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities/1`, {
      method: 'DELETE',
    });
    assert.equal(second.status, 200);
    const secondBody = await second.json();
    assert.equal(secondBody.code, '0');

    console.log('PASS capability-delete-idempotent');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL capability-delete-idempotent');
  console.error(err);
  process.exitCode = 1;
});
