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
      {
        id: '2',
        capability_name: '新闻搜索',
        normalized_name: '新闻搜索',
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
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/capabilities?keyword=天气`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.code, '0');
    assert.equal(body.data.list.length, 1);
    assert.equal(body.data.list[0].capability_name, '天气查询');

    console.log('PASS capability-list-keyword-filter');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL capability-list-keyword-filter');
  console.error(err);
  process.exitCode = 1;
});
