import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function runGit(command, fallback = 'unknown') {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return fallback
  }
}

function formatBuildTimestamp(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}:${milliseconds}Z`
}

const buildDate = new Date()
const commitHash = runGit('git rev-parse HEAD')
const shortCommitHash = runGit('git rev-parse --short HEAD')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(formatBuildTimestamp(buildDate)),
    'import.meta.env.VITE_BUILD_COMMIT': JSON.stringify(commitHash),
    'import.meta.env.VITE_BUILD_COMMIT_SHORT': JSON.stringify(shortCommitHash),
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
