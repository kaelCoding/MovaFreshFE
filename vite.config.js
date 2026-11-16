import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      // Hai app trong cùng repo: web khách (index.html) và app vận hành (ops.html)
      input: {
        main: resolve(__dirname, 'index.html'),
        ops: resolve(__dirname, 'ops.html')
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/shared/**/*.test.js']
  }
})
