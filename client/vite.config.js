import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { vitePluginForArco } from '@arco-plugins/vite-vue'

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [
    vue(),
    vitePluginForArco({
      style: 'css'
    })
    // 压缩插件暂时禁用 - 由 Express 预压缩中间件在运行时处理
    // 重新启用时确保 filter 排除 .gz/.br 文件避免递归压缩
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    },
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 8192,
    cssTarget: 'chrome61',
    reportCompressedSize: false
  },
  server: {
    port: 3000,  // 【固定】前端必须使用3000端口
    strictPort: true,  // 如果被占用则报错，不自动切换
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
      clientPort: 3000
    },
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/App.vue',
        './src/views/Login.vue'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // 后端API服务
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',  // 文件上传服务
        changeOrigin: true
      },
      '/socket.io': {  // WebSocket代理
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@arco-design/web-vue',
      'axios',
      'socket.io-client',
      'nprogress'
    ],
    exclude: ['lodash-es']
  },
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      }
      return `/${filename}`
    }
  }
})
