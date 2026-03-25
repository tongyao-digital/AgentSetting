#!/usr/bin/env node
import { main } from '../src/cli.mjs';

main(process.argv.slice(2)).catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[dev-skills] unexpected error: ${msg}\n`);
  process.exit(1);
});
