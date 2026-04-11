import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Parent of `shopping-portal/` — monorepo root (for “start all apps” copy command). */
const monorepoRoot = path.resolve(__dirname, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __MONOREPO_ROOT__: JSON.stringify(monorepoRoot),
  },
  server: {
    port: 3000,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/server.crt')),
    },
  }
})
