import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build output goes to dist/ so the nginx image can copy from there.
// The dev-server proxy is LOCAL DEV ONLY — in production nginx proxies /api.
// App code always uses relative /api paths (hard constraint from CLAUDE.md).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
