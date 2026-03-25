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
    syncJobs: [
      {
        id: '1',
        job_type: 'incremental',
        status: 'running',
        started_at: '2026-03-26T10:00:00.000Z',
        ended_at: null,
        success_count: '0',
        fail_count: '0',
        error_summary: null,
        cursor_token: null,
      },
    ],
  });
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/ability-management/sync-jobs/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.code, 'CAP_4091');
    console.log('PASS sync-trigger-running-conflict');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('FAIL sync-trigger-running-conflict');
  console.error(err);
  process.exitCode = 1;
});
