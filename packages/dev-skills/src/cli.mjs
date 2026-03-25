import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, '.dev-skills');
const LOG_DIR = path.join(STATE_DIR, 'logs');
const DEV_STATE_FILE = path.join(STATE_DIR, 'dev-state.json');
const PROJECT_CONFIG_PATH = path.join(ROOT, 'dev-skills.config.json');

const npmCmd = 'npm';
const nodeCmd = process.execPath;

const DEFAULT_CONFIG = {
  project: 'AgentSetting',
  required_paths: ['apps/web', 'apps/server', 'docs'],
  test_sets: {
    unit: ['tests/api-client.spec.ts', 'tests/capability-form.spec.ts', 'tests/capability-utils.spec.ts'],
    integration_web: [
      'tests/app.spec.tsx',
      'tests/category-management.spec.tsx',
      'tests/capability-management.spec.tsx',
      'tests/sync-job-panel.spec.tsx',
    ],
  },
  contract: {
    frontend_contract_file: 'apps/web/src/types/api-contract.ts',
    backend_entry_file: 'apps/server/src/app.js',
    allowed_capability_filters: ['keyword', 'capability_type'],
  },
};

const PROJECT_CONFIG = loadProjectConfig();

function loadProjectConfig() {
  if (!fs.existsSync(PROJECT_CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(PROJECT_CONFIG_PATH, 'utf8'));
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      test_sets: {
        ...DEFAULT_CONFIG.test_sets,
        ...(raw.test_sets || {}),
      },
      contract: {
        ...DEFAULT_CONFIG.contract,
        ...(raw.contract || {}),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

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
    printErr(`[dev-skills] failed to run command: ${command} ${args.join(' ')}`);
    printErr(`[dev-skills] reason: ${result.error.message}`);
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
  print(`Dev Skills CLI (${PROJECT_CONFIG.project})`);
  print('');
  print('Usage:');
  print('  dev-skills doctor');
  print('  dev-skills dev up|down');
  print('  dev-skills db migrate|seed|reset');
  print('  dev-skills test unit|integration|all');
  print('  dev-skills contract check');
  print('  dev-skills lint');
  print('  dev-skills typecheck');
  print('  dev-skills init');
}

async function cmdDoctor() {
  const checks = [];

  const major = Number(process.versions.node.split('.')[0] || '0');
  checks.push({ name: 'Node.js >= 18', ok: major >= 18, info: process.versions.node });
  checks.push({ name: 'npm available', ok: commandExists(npmCmd), info: npmCmd });

  for (const dir of PROJECT_CONFIG.required_paths || []) {
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
      printErr('[dev-skills] docker not found, skip docker compose up.');
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
    print(`[dev-skills] started web dev server pid=${proc.pid}, log=${proc.logFile}`);
  } else if (webAlready) {
    print(`[dev-skills] web dev server already running pid=${webAlready.pid}`);
  } else {
    print('[dev-skills] web dev script not found, skip web startup.');
  }

  const serverPkg = path.join(ROOT, 'apps/server/package.json');
  const serverAlready = active.find((item) => item.name === 'server-dev');
  if (hasScript(serverPkg, 'dev') && !serverAlready) {
    const proc = spawnDetachedProcess('server-dev', npmCmd, ['run', 'dev'], path.join(ROOT, 'apps/server'));
    next.processes.push(proc);
    print(`[dev-skills] started server dev pid=${proc.pid}, log=${proc.logFile}`);
  } else if (serverAlready) {
    print(`[dev-skills] server dev already running pid=${serverAlready.pid}`);
  } else {
    print('[dev-skills] server dev script not found, skip server startup.');
  }

  writeDevState(next);
  return 0;
}

function cmdDevDown() {
  const state = readDevState();

  for (const proc of state.processes) {
    if (isProcessAlive(proc.pid)) {
      killProcessTree(proc.pid);
      print(`[dev-skills] stopped ${proc.name} pid=${proc.pid}`);
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
    printErr('[dev-skills] database layer is not wired yet (apps/server/src/db is placeholder).');
    printErr(`[dev-skills] unable to run: db ${action}`);
    return 2;
  }

  print(`[dev-skills] running db ${action} ...`);
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
    printErr('[dev-skills] server tests directory not found.');
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
  const unitFiles = PROJECT_CONFIG.test_sets?.unit || [];
  const integrationWebFiles = PROJECT_CONFIG.test_sets?.integration_web || [];

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

  printErr(`[dev-skills] unsupported test target: ${kind}`);
  return 1;
}

function cmdContractCheck() {
  const contractPath = path.join(ROOT, PROJECT_CONFIG.contract.frontend_contract_file);
  const appPath = path.join(ROOT, PROJECT_CONFIG.contract.backend_entry_file);

  if (!fs.existsSync(contractPath) || !fs.existsSync(appPath)) {
    printErr('[dev-skills] contract files not found.');
    return 1;
  }

  const contractText = fs.readFileSync(contractPath, 'utf8');
  const appText = fs.readFileSync(appPath, 'utf8');

  const contractCodes = parseCodes(contractText);

  const mapMatch = contractText.match(/API_HTTP_STATUS_BY_CODE\s*:[^=]+?=\s*\{([\s\S]*?)\}/);
  if (!mapMatch) {
    printErr('[dev-skills] API_HTTP_STATUS_BY_CODE not found in contract file');
    return 1;
  }

  const mapCodes = parseCodes(mapMatch[1]);
  const missingInMap = [...contractCodes].filter((code) => !mapCodes.has(code));
  if (missingInMap.length > 0) {
    printErr(`[dev-skills] status mapping missing codes: ${missingInMap.join(', ')}`);
    return 1;
  }

  const serverCodes = new Set([...appText.matchAll(/code:\s*'([^']+)'/g)].map((m) => m[1]));
  const unknownServerCodes = [...serverCodes].filter((code) => !contractCodes.has(code));
  if (unknownServerCodes.length > 0) {
    printErr(`[dev-skills] server has codes not declared in contract: ${unknownServerCodes.join(', ')}`);
    return 1;
  }

  const filterKeys = new Set([...appText.matchAll(/searchParams\.get\('([^']+)'\)/g)].map((m) => m[1]));
  const allowedFilterKeys = new Set(PROJECT_CONFIG.contract.allowed_capability_filters || []);
  const invalidKeys = [...filterKeys].filter((key) => !allowedFilterKeys.has(key));
  if (invalidKeys.length > 0) {
    printErr(`[dev-skills] invalid capability filter keys found: ${invalidKeys.join(', ')}`);
    return 1;
  }

  print('[dev-skills] contract check passed.');
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
    print('[dev-skills] no lint script found in apps/web or apps/server, fallback to contract check.');
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
      printErr('[dev-skills] typescript is not installed in apps/web. Run npm install in apps/web first.');
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
      printErr('[dev-skills] typescript is not installed in apps/server.');
      return 1;
    }

    const status = runCommand(nodeCmd, [serverTscBin, '--noEmit', '-p', serverTsconfig], { shell: false }).status;
    if (status !== 0) {
      return status;
    }
  }

  if (!executed) {
    print('[dev-skills] no tsconfig found, typecheck skipped.');
  }

  return 0;
}

function cmdInit() {
  if (fs.existsSync(PROJECT_CONFIG_PATH)) {
    print('[dev-skills] dev-skills.config.json already exists, skip init.');
    return 0;
  }

  const currentFile = fileURLToPath(import.meta.url);
  const templatePath = path.join(path.dirname(currentFile), '../templates/agentsetting.config.json');
  try {
    const content = fs.readFileSync(templatePath, 'utf8');
    fs.writeFileSync(PROJECT_CONFIG_PATH, content, 'utf8');
    print('[dev-skills] generated dev-skills.config.json from template.');
    return 0;
  } catch {
    printErr('[dev-skills] failed to generate config file.');
    return 1;
  }
}

export async function main(args = process.argv.slice(2)) {
  const [group, action] = args;

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
    printErr('[dev-skills] usage: dev-skills dev up|down');
    process.exit(1);
  }

  if (group === 'db') {
    if (!action || !['migrate', 'seed', 'reset'].includes(action)) {
      printErr('[dev-skills] usage: dev-skills db migrate|seed|reset');
      process.exit(1);
    }
    status = cmdDb(action);
    process.exit(status);
  }

  if (group === 'test') {
    if (!action || !['unit', 'integration', 'all'].includes(action)) {
      printErr('[dev-skills] usage: dev-skills test unit|integration|all');
      process.exit(1);
    }
    status = cmdTest(action);
    process.exit(status);
  }

  if (group === 'contract') {
    if (action !== 'check') {
      printErr('[dev-skills] usage: dev-skills contract check');
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

  if (group === 'init') {
    status = cmdInit();
    process.exit(status);
  }

  printErr(`[dev-skills] unknown command: ${group}`);
  printHelp();
  process.exit(1);
}
