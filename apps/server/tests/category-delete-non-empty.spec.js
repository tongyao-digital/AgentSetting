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
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/categories/1`, {
      method: 'DELETE',
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.code, 'CAP_4005');

    console.log('PASS category-delete-non-empty');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL category-delete-non-empty');
  console.error(err);
  process.exitCode = 1;
});
