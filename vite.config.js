import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/steering-wheel-tools/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
