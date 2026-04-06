import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'
import { vitePluginForArco } from '@arco-plugins/vite-vue'
import viteCompression from 'vite-plugin-compression'

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [
    vue(),
    vitePluginForArco({
      style: 'css'
    }),
    // Gzip 压缩
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
      filter: (file) => {
        // 不压缩已经压缩的图片
        return !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
      }
    }),
    // Brotli 压缩（更好的压缩率）
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
      filter: (file) => {
        return !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.assert', 'console.log', 'console.warn']
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        // 优化代码分割策略
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Vue 核心库 - 最高优先级
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-core'
            }
            // UI 组件库
            if (id.includes('@arco-design')) {
              return 'ui-vendor'
            }
            // 工具库
            if (id.includes('lodash') || id.includes('dayjs') || id.includes('moment')) {
              return 'utils'
            }
            // 其他第三方库
            return 'vendor'
          }
          // 按路由分割业务代码
          if (id.includes('/src/views/')) {
            const match = id.match(/\/src\/views\/([^/]+)\.vue/)
            if (match) {
              return `view-${match[1].toLowerCase()}`
            }
          }
        },
        // 优化 chunk 文件名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/\.css$/i.test(assetInfo.name)) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 禁用 sourcemap 以减小体积
    sourcemap: false,
    // 包体积警告阈值
    chunkSizeWarningLimit: 1000,
    // 构建输出目录
    outDir: 'dist',
    // 静态资源目录
    assetsDir: 'assets',
    // 静态资源内联阈值 - 增大小文件内联限制
    assetsInlineLimit: 8192,
    // 预加载主要依赖
    cssTarget: 'chrome61'
  },
  server: {
    port: 3001,
    // 预加载模块请求
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/App.vue',
        './src/views/Login.vue'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@arco-design/web-vue',
      'axios'
    ],
    exclude: ['lodash-es']
  },
  // 实验性功能：预构建缓存
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      }
      return `/${filename}`
    }
  }
})
