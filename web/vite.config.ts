/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    fs: {
      // Authored content lives in the repo-level data/ directory (ADR 0020).
      allow: [path.resolve(rootDir, '..')],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
