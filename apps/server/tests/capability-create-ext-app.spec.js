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
  const app = createApp({ categories: [{ id: '1', name: '默认分类', sort: '10' }] });
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.code, '0');
    assert.equal(body.data.capability_name, '天气查询');
    assert.equal(body.data.capability_type, 'EXT_APP');
    assert.equal(body.data.source, 'manual');
    assert.equal(body.data.version, '1');

    console.log('PASS capability-create-ext-app');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL capability-create-ext-app');
  console.error(err);
  process.exitCode = 1;
});
