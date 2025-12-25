import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 关键配置：使用相对路径，适配 GitHub Pages 或任意子目录
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})