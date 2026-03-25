#!/usr/bin/env node
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, '.agentctl');
const LOG_DIR = path.join(STATE_DIR, 'logs');
const DEV_STATE_FILE = path.join(STATE_DIR, 'dev-state.json');

const npmCmd = 'npm';
const nodeCmd = process.execPath;

function print(msg) {
  process.stdout.write(`${msg}\n`);
}

function printErr(msg) {
  process.stderr.write(`${msg}\n`);
}

function ensureStateDirs() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function runCommand(command, args, options = {}) {
  const useShell = options.shell ?? process.platform === 'win32';
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    stdio: options.stdio || 'inherit',
    env: { ...process.env, ...(options.env || {}) },
    shell: useShell,
  });

  if (result.error) {
    printErr(`[agentctl] failed to run command: ${command} ${args.join(' ')}`);
    printErr(`[agentctl] reason: ${result.error.message}`);
    return { status: 1, error: result.error };
  }

  return { status: result.status ?? 1 };
}

function commandExists(command) {
  const result = runCommand(command, ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function packageScripts(packageJsonPath) {
  const pkg = readJson(packageJsonPath, {});
  return pkg.scripts || {};
}

function hasScript(packageJsonPath, scriptName) {
  return Boolean(packageScripts(packageJsonPath)[scriptName]);
}

function composeHasServices() {
  const composePath = path.join(ROOT, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) {
    return false;
  }

  const text = fs.readFileSync(composePath, 'utf8');
  if (!/^\s*services\s*:/m.test(text)) {
    return false;
  }

  return /^\s{2,}[A-Za-z0-9_-]+\s*:/m.test(text);
}

function readDevState() {
  return readJson(DEV_STATE_FILE, { processes: [] });
}

function writeDevState(state) {
  ensureStateDirs();
  writeJson(DEV_STATE_FILE, state);
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function spawnDetachedProcess(name, command, args, cwd) {
  ensureStateDirs();
  const logFile = path.join(LOG_DIR, `${name}.log`);
  const out = fs.openSync(logFile, 'a');

  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: ['ignore', out, out],
    shell: process.platform === 'win32',
    env: process.env,
  });

  child.unref();
  fs.closeSync(out);

  return {
    name,
    pid: child.pid,
    cwd,
    command: [command, ...args].join(' '),
    logFile,
    startedAt: new Date().toISOString(),
  };
}

function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', shell: true });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // noop
    }
  }
}

function parseCodes(text) {
  const matches = text.match(/CAP_\d{4}|"0"/g) || [];
  return new Set(matches.map((item) => item.replaceAll('"', '')));
}

async function checkPort(host, port, timeoutMs = 600) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (ok) => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function printHelp() {
  print('AgentSetting CLI (agentctl)');
  print('');
  print('Usage:');
  print('  agentctl doctor');
  print('  agentctl dev up|down');
  print('  agentctl db migrate|seed|reset');
  print('  agentctl test unit|integration|all');
  print('  agentctl contract check');
  print('  agentctl lint');
  print('  agentctl typecheck');
}

async function cmdDoctor() {
  const checks = [];

  const major = Number(process.versions.node.split('.')[0] || '0');
  checks.push({ name: 'Node.js >= 18', ok: major >= 18, info: process.versions.node });
  checks.push({ name: 'npm available', ok: commandExists(npmCmd), info: npmCmd });

  const requiredDirs = ['apps/web', 'apps/server', 'docs'];
  for (const dir of requiredDirs) {
    checks.push({
      name: `path exists: ${dir}`,
      ok: fs.existsSync(path.join(ROOT, dir)),
      info: path.join(ROOT, dir),
    });
  }

  const hasCompose = composeHasServices();
  checks.push({ name: 'docker compose services', ok: hasCompose, info: hasCompose ? 'configured' : 'not configured' });
  if (hasCompose) {
    checks.push({ name: 'docker command', ok: commandExists('docker'), info: 'docker --version' });
  }

  const mysqlOpen = await checkPort('127.0.0.1', 3306);
  const redisOpen = await checkPort('127.0.0.1', 6379);
  checks.push({ name: 'mysql localhost:3306', ok: mysqlOpen, info: mysqlOpen ? 'open' : 'closed' });
  checks.push({ name: 'redis localhost:6379', ok: redisOpen, info: redisOpen ? 'open' : 'closed' });

  print('doctor report:');
  for (const item of checks) {
    const status = item.ok ? 'OK' : 'WARN';
    print(`- [${status}] ${item.name} (${item.info})`);
  }

  const criticalFailed = checks.some(
    (item) => !item.ok && (item.name.startsWith('Node.js') || item.name.startsWith('npm') || item.name.startsWith('path exists')),
  );

  return criticalFailed ? 1 : 0;
}

function cmdDevUp() {
  const state = readDevState();
  const active = state.processes.filter((item) => isProcessAlive(item.pid));
  const next = { processes: [...active] };

  if (composeHasServices()) {
    if (!commandExists('docker')) {
      printErr('[agentctl] docker not found, skip docker compose up.');
    } else {
      const result = runCommand('docker', ['compose', 'up', '-d']);
      if (result.status !== 0) {
        return result.status;
      }
    }
  }

  const webPkg = path.join(ROOT, 'apps/web/package.json');
  const webAlready = active.find((item) => item.name === 'web-dev');
  if (hasScript(webPkg, 'dev') && !webAlready) {
    const proc = spawnDetachedProcess('web-dev', npmCmd, ['run', 'dev'], path.join(ROOT, 'apps/web'));
    next.processes.push(proc);
    print(`[agentctl] started web dev server pid=${proc.pid}, log=${proc.logFile}`);
  } else if (webAlready) {
    print(`[agentctl] web dev server already running pid=${webAlready.pid}`);
  } else {
    print('[agentctl] web dev script not found, skip web startup.');
  }

  const serverPkg = path.join(ROOT, 'apps/server/package.json');
  const serverAlready = active.find((item) => item.name === 'server-dev');
  if (hasScript(serverPkg, 'dev') && !serverAlready) {
    const proc = spawnDetachedProcess('server-dev', npmCmd, ['run', 'dev'], path.join(ROOT, 'apps/server'));
    next.processes.push(proc);
    print(`[agentctl] started server dev pid=${proc.pid}, log=${proc.logFile}`);
  } else if (serverAlready) {
    print(`[agentctl] server dev already running pid=${serverAlready.pid}`);
  } else {
    print('[agentctl] server dev script not found, skip server startup.');
  }

  writeDevState(next);
  return 0;
}

function cmdDevDown() {
  const state = readDevState();

  for (const proc of state.processes) {
    if (isProcessAlive(proc.pid)) {
      killProcessTree(proc.pid);
      print(`[agentctl] stopped ${proc.name} pid=${proc.pid}`);
    }
  }

  writeDevState({ processes: [] });

  if (composeHasServices() && commandExists('docker')) {
    const result = runCommand('docker', ['compose', 'down']);
    if (result.status !== 0) {
      return result.status;
    }
  }

  return 0;
}

function cmdDb(action) {
  const dbDir = path.join(ROOT, 'apps/server/src/db');
  const files = fs.existsSync(dbDir)
    ? fs.readdirSync(dbDir).filter((item) => item !== '.gitkeep')
    : [];

  if (files.length === 0) {
    printErr('[agentctl] database layer is not wired yet (apps/server/src/db is placeholder).');
    printErr(`[agentctl] unable to run: db ${action}`);
    return 2;
  }

  print(`[agentctl] running db ${action} ...`);
  return 0;
}

function runWebTests(files) {
  const args = ['run', 'test', '--prefix', 'apps/web'];
  if (files.length > 0) {
    args.push('--', ...files);
  }
  return runCommand(npmCmd, args).status;
}

function runServerSpecTests() {
  const dir = path.join(ROOT, 'apps/server/tests');
  if (!fs.existsSync(dir)) {
    printErr('[agentctl] server tests directory not found.');
    return 1;
  }

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.spec.js'))
    .map((file) => path.join(dir, file));

  for (const file of files) {
    const status = runCommand(nodeCmd, [file], { shell: false }).status;
    if (status !== 0) {
      return status;
    }
  }

  return 0;
}

function cmdTest(kind) {
  const unitFiles = [
    'tests/api-client.spec.ts',
    'tests/capability-form.spec.ts',
    'tests/capability-utils.spec.ts',
  ];

  const integrationWebFiles = [
    'tests/app.spec.tsx',
    'tests/category-management.spec.tsx',
    'tests/capability-management.spec.tsx',
    'tests/sync-job-panel.spec.tsx',
  ];

  if (kind === 'unit') {
    return runWebTests(unitFiles);
  }

  if (kind === 'integration') {
    const webStatus = runWebTests(integrationWebFiles);
    if (webStatus !== 0) {
      return webStatus;
    }
    return runServerSpecTests();
  }

  if (kind === 'all') {
    const unitStatus = cmdTest('unit');
    if (unitStatus !== 0) {
      return unitStatus;
    }
    return cmdTest('integration');
  }

  printErr(`[agentctl] unsupported test target: ${kind}`);
  return 1;
}

function cmdContractCheck() {
  const contractPath = path.join(ROOT, 'apps/web/src/types/api-contract.ts');
  const appPath = path.join(ROOT, 'apps/server/src/app.js');

  if (!fs.existsSync(contractPath) || !fs.existsSync(appPath)) {
    printErr('[agentctl] contract files not found.');
    return 1;
  }

  const contractText = fs.readFileSync(contractPath, 'utf8');
  const appText = fs.readFileSync(appPath, 'utf8');

  const contractCodes = parseCodes(contractText);

  const mapMatch = contractText.match(/API_HTTP_STATUS_BY_CODE\s*:[^=]+?=\s*\{([\s\S]*?)\}/);
  if (!mapMatch) {
    printErr('[agentctl] API_HTTP_STATUS_BY_CODE not found in api-contract.ts');
    return 1;
  }

  const mapCodes = parseCodes(mapMatch[1]);
  const missingInMap = [...contractCodes].filter((code) => !mapCodes.has(code));
  if (missingInMap.length > 0) {
    printErr(`[agentctl] status mapping missing codes: ${missingInMap.join(', ')}`);
    return 1;
  }

  const serverCodes = new Set([...appText.matchAll(/code:\s*'([^']+)'/g)].map((m) => m[1]));
  const unknownServerCodes = [...serverCodes].filter((code) => !contractCodes.has(code));
  if (unknownServerCodes.length > 0) {
    printErr(`[agentctl] server has codes not declared in contract: ${unknownServerCodes.join(', ')}`);
    return 1;
  }

  const filterKeys = new Set([...appText.matchAll(/searchParams\.get\('([^']+)'\)/g)].map((m) => m[1]));
  const allowedFilterKeys = new Set(['keyword', 'capability_type']);
  const invalidKeys = [...filterKeys].filter((key) => !allowedFilterKeys.has(key));
  if (invalidKeys.length > 0) {
    printErr(`[agentctl] invalid capability filter keys found: ${invalidKeys.join(', ')}`);
    return 1;
  }

  print('[agentctl] contract check passed.');
  return 0;
}

function cmdLint() {
  let hasLint = false;

  const webPkg = path.join(ROOT, 'apps/web/package.json');
  if (hasScript(webPkg, 'lint')) {
    hasLint = true;
    const status = runCommand(npmCmd, ['run', 'lint', '--prefix', 'apps/web']).status;
    if (status !== 0) {
      return status;
    }
  }

  const serverPkg = path.join(ROOT, 'apps/server/package.json');
  if (hasScript(serverPkg, 'lint')) {
    hasLint = true;
    const status = runCommand(npmCmd, ['run', 'lint', '--prefix', 'apps/server']).status;
    if (status !== 0) {
      return status;
    }
  }

  if (!hasLint) {
    print('[agentctl] no lint script found in apps/web or apps/server, fallback to contract check.');
    return cmdContractCheck();
  }

  return 0;
}

function cmdTypecheck() {
  let executed = false;

  const webTsconfig = path.join(ROOT, 'apps/web/tsconfig.json');
  const webTscBin = path.join(ROOT, 'apps/web/node_modules/typescript/bin/tsc');
  if (fs.existsSync(webTsconfig)) {
    executed = true;
    if (!fs.existsSync(webTscBin)) {
      printErr('[agentctl] typescript is not installed in apps/web. Run npm install in apps/web first.');
      return 1;
    }

    const status = runCommand(nodeCmd, [webTscBin, '--noEmit', '-p', webTsconfig], { shell: false }).status;
    if (status !== 0) {
      return status;
    }
  }

  const serverTsconfig = path.join(ROOT, 'apps/server/tsconfig.json');
  const serverTscBin = path.join(ROOT, 'apps/server/node_modules/typescript/bin/tsc');
  if (fs.existsSync(serverTsconfig)) {
    executed = true;
    if (!fs.existsSync(serverTscBin)) {
      printErr('[agentctl] typescript is not installed in apps/server.');
      return 1;
    }

    const status = runCommand(nodeCmd, [serverTscBin, '--noEmit', '-p', serverTsconfig], { shell: false }).status;
    if (status !== 0) {
      return status;
    }
  }

  if (!executed) {
    print('[agentctl] no tsconfig found, typecheck skipped.');
  }

  return 0;
}

async function main() {
  const [group, action] = process.argv.slice(2);

  if (!group || group === 'help' || group === '--help' || group === '-h') {
    printHelp();
    process.exit(0);
  }

  let status = 0;

  if (group === 'doctor') {
    status = await cmdDoctor();
    process.exit(status);
  }

  if (group === 'dev') {
    if (action === 'up') {
      status = cmdDevUp();
      process.exit(status);
    }
    if (action === 'down') {
      status = cmdDevDown();
      process.exit(status);
    }
    printErr('[agentctl] usage: agentctl dev up|down');
    process.exit(1);
  }

  if (group === 'db') {
    if (!action || !['migrate', 'seed', 'reset'].includes(action)) {
      printErr('[agentctl] usage: agentctl db migrate|seed|reset');
      process.exit(1);
    }
    status = cmdDb(action);
    process.exit(status);
  }

  if (group === 'test') {
    if (!action || !['unit', 'integration', 'all'].includes(action)) {
      printErr('[agentctl] usage: agentctl test unit|integration|all');
      process.exit(1);
    }
    status = cmdTest(action);
    process.exit(status);
  }

  if (group === 'contract') {
    if (action !== 'check') {
      printErr('[agentctl] usage: agentctl contract check');
      process.exit(1);
    }
    status = cmdContractCheck();
    process.exit(status);
  }

  if (group === 'lint') {
    status = cmdLint();
    process.exit(status);
  }

  if (group === 'typecheck') {
    status = cmdTypecheck();
    process.exit(status);
  }

  printErr(`[agentctl] unknown command: ${group}`);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  printErr(`[agentctl] unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
