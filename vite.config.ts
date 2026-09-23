import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, type UserConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
} as UserConfig & {
  test: {
    environment: 'happy-dom'
    globals: boolean
    setupFiles: string
  }
})
