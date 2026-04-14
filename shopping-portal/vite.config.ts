import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { spawn, execSync } from 'node:child_process'
import { SIBLING_DEV_APPS } from './src/siblingDevApps'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Parent of `shopping-portal/` — monorepo root (for “start all apps” copy command). */
const monorepoRoot = path.resolve(__dirname, '..')

/** GitHub Pages project URL path, e.g. `/mosaictestportal/` — set in CI via `VITE_BASE_PATH`. */
function publicBase(): string {
  const raw = process.env.VITE_BASE_PATH ?? '/'
  if (raw === '/' || raw === '') return '/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

const certKeyPath = path.resolve(__dirname, 'certs/server.key')
const certCrtPath = path.resolve(__dirname, 'certs/server.crt')
const hasLocalHttpsCerts = fs.existsSync(certKeyPath) && fs.existsSync(certCrtPath)

function isLocalhost(addr: string | undefined): boolean {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

function isPortListening(port: number): boolean {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null`, {
      encoding: 'utf8',
    })
    return out.trim().length > 0
  } catch {
    return false
  }
}

const SIBLING_DEV_PORTS = SIBLING_DEV_APPS.map((a) => a.port)

/** macOS / Linux: SIGTERM processes listening on the given ports (used to stop sibling Vite apps, not port 3000). */
function killListenersOnPorts(ports: readonly number[]): { killed: number[]; notSupported: boolean } {
  if (process.platform === 'win32') {
    return { killed: [], notSupported: true }
  }
  const killed: number[] = []
  const seen = new Set<number>()
  for (const port of ports) {
    try {
      const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null`, {
        encoding: 'utf8',
      })
      const pids = out
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n))
      for (const pid of pids) {
        if (seen.has(pid)) continue
        seen.add(pid)
        try {
          process.kill(pid, 'SIGTERM')
          killed.push(pid)
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* no listener on this port */
    }
  }
  return { killed, notSupported: false }
}

/** Dev-only: POST /__dev/start-all-apps and POST /__dev/stop-all-apps */
function portalHubDevControlPlugin(): Plugin {
  let lastSpawnAt = 0
  const spawnCooldownMs = 12_000
  let lastStopAt = 0
  const stopCooldownMs = 3000

  return {
    name: 'portal-hub-dev-control',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = req.url?.split('?')[0] ?? ''

        if (pathOnly === '/__dev/sibling-apps-status' && req.method === 'GET') {
          if (!isLocalhost(req.socket.remoteAddress)) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'forbidden' }))
            return
          }
          const apps = SIBLING_DEV_APPS.map((a) => ({
            id: a.id,
            port: a.port,
            label: a.label,
            listening: isPortListening(a.port),
          }))
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, apps }))
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        if (pathOnly === '/__dev/stop-all-apps') {
          if (!isLocalhost(req.socket.remoteAddress)) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'forbidden' }))
            return
          }
          const now = Date.now()
          if (now - lastStopAt < stopCooldownMs) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, pending: true }))
            return
          }
          lastStopAt = now

          const wasAnyListening = SIBLING_DEV_PORTS.some(isPortListening)
          const { killed, notSupported } = killListenersOnPorts(SIBLING_DEV_PORTS)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          if (notSupported) {
            res.end(JSON.stringify({ ok: false, error: 'stop-not-supported-on-windows' }))
            return
          }
          res.end(
            JSON.stringify({
              ok: true,
              stopped: killed.length > 0,
              killedPids: killed,
              noneRunning: !wasAnyListening,
            }),
          )
          return
        }

        if (pathOnly !== '/__dev/start-all-apps') {
          next()
          return
        }
        if (!isLocalhost(req.socket.remoteAddress)) {
          res.statusCode = 403
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'forbidden' }))
          return
        }

        if (SIBLING_DEV_PORTS.some(isPortListening)) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, already: true }))
          return
        }

        const now = Date.now()
        if (now - lastSpawnAt < spawnCooldownMs) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, pending: true }))
          return
        }
        lastSpawnAt = now

        const child = spawn('npm', ['run', 'start:all'], {
          cwd: monorepoRoot,
          detached: true,
          stdio: 'ignore',
          env: { ...process.env },
          shell: process.platform === 'win32',
        })
        child.unref()

        res.statusCode = 202
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, started: true }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: publicBase(),
  plugins: [react(), portalHubDevControlPlugin()],
  define: {
    __MONOREPO_ROOT__: JSON.stringify(monorepoRoot),
  },
  server: {
    port: 3000,
    ...(hasLocalHttpsCerts
      ? {
          https: {
            key: fs.readFileSync(certKeyPath),
            cert: fs.readFileSync(certCrtPath),
          },
        }
      : {}),
  },
})
