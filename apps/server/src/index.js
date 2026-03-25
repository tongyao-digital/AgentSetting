const http = require('node:http');

const { createApp } = require('./app');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const app = createApp();
const server = http.createServer(app);

server.listen(port, host, () => {
  process.stdout.write(`[server] listening on http://${host}:${port}\n`);
});

function shutdown(signal) {
  process.stdout.write(`[server] received ${signal}, shutting down...\n`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

