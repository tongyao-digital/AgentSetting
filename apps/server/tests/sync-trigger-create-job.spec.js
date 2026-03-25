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
  const app = createApp({ syncJobs: [] });
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/sync-jobs/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.code, '0');
    assert.equal(body.data.job_id, '1');
    assert.equal(body.data.status, 'running');

    console.log('PASS sync-trigger-create-job');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL sync-trigger-create-job');
  console.error(err);
  process.exitCode = 1;
});
