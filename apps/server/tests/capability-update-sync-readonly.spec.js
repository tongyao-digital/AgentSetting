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
        capability_name: '问学天气',
        normalized_name: '问学天气',
        capability_type: 'WX_APP',
        category_id: '1',
        source: 'sync',
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
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability_name: '问学天气新版本',
        capability_type: 'WX_APP',
        version: '1',
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.code, 'CAP_4004');
    console.log('PASS capability-update-sync-readonly');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL capability-update-sync-readonly');
  console.error(err);
  process.exitCode = 1;
});
