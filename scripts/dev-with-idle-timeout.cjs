/**
 * Starts `npm start` (shopping-portal only) and stops the dev stack after IDLE_THRESHOLD_MINUTES of no
 * TCP ESTABLISHED connections on dev ports (browsers closed / nothing using the apps).
 *
 * Env: IDLE_THRESHOLD_MINUTES (default 30), IDLE_CHECK_INTERVAL_SEC (default 60),
 *      NPM_BIN (default npm on PATH), REPO_ROOT (optional override).
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.env.REPO_ROOT
  ? path.resolve(process.env.REPO_ROOT)
  : path.resolve(__dirname, '..');
const PORTS = [3000, 3001, 3002, 3003, 3004, 3010];
const CHECK_INTERVAL_SEC = Number(process.env.IDLE_CHECK_INTERVAL_SEC || 60);
const IDLE_THRESHOLD_MINUTES = Number(process.env.IDLE_THRESHOLD_MINUTES || 30);
const IDLE_THRESHOLD_SEC = IDLE_THRESHOLD_MINUTES * 60;
const NPM_CMD = process.env.NPM_BIN || 'npm';
const LOG = path.join(process.env.HOME || '', 'Library/Logs/drsshoppingapp-devservers.log');

function establishedCount() {
  let n = 0;
  for (const p of PORTS) {
    try {
      const out = execSync(
        `lsof -nP -iTCP:${p} -sTCP:ESTABLISHED 2>/dev/null | wc -l | tr -d ' '`,
        { encoding: 'utf8', shell: '/bin/bash' }
      );
      n += parseInt(out.trim(), 10) || 0;
    } catch {
      // empty / lsof error → treat as 0 lines
    }
  }
  return n;
}

function cleanupStack() {
  const esc = ROOT.replace(/'/g, "'\\''");
  try {
    execSync(`pkill -f '${esc}/node_modules/.bin/concurrently'`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
  try {
    execSync(`pkill -f '${esc}/node_modules/.bin/vite'`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
}

function appendLog(line) {
  try {
    fs.appendFileSync(LOG, line + '\n', 'utf8');
  } catch {
    /* ignore */
  }
}

const child = spawn(NPM_CMD, ['start'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env },
  detached: false,
});

let idleSec = 0;
let timer;

function shutdownIdle() {
  if (timer) clearInterval(timer);
  try {
    child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  cleanupStack();
  appendLog(
    `${new Date().toISOString()} dev-with-idle-timeout: no connections on ${PORTS.join(
      ' '
    )} for ${IDLE_THRESHOLD_MINUTES}m (${IDLE_THRESHOLD_SEC}s) — stopped dev servers.`
  );
  process.exit(0);
}

function onTick() {
  if (child.exitCode !== null) {
    if (timer) clearInterval(timer);
    process.exit(child.exitCode ?? 0);
    return;
  }

  if (establishedCount() === 0) {
    idleSec += CHECK_INTERVAL_SEC;
  } else {
    idleSec = 0;
  }

  if (idleSec >= IDLE_THRESHOLD_SEC) {
    shutdownIdle();
  }
}

function onSignal() {
  if (timer) clearInterval(timer);
  cleanupStack();
  try {
    child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on('SIGTERM', onSignal);
process.on('SIGINT', onSignal);

child.on('exit', (code) => {
  if (timer) clearInterval(timer);
  process.exit(code ?? 0);
});

timer = setInterval(onTick, CHECK_INTERVAL_SEC * 1000);
