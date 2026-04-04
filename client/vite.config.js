import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { vitePluginForArco } from '@arco-plugins/vite-vue'
import viteCompression from 'vite-plugin-compression'

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
      distDir: 'dist'
    }),
    // Brotli 压缩（更好的压缩率）
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
      distDir: 'dist'
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
        // 生产环境移除 console，开发环境保留
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.assert'] : []
      }
    },
    rollupOptions: {
      output: {
        // 更细粒度的代码分割
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Vue 相关库
            if (id.includes('vue') || id.includes('vue-router')) {
              return 'vue-vendor'
            }
            // Arco Design
            if (id.includes('@arco-design')) {
              return 'arco-vendor'
            }
            // Element Plus
            if (id.includes('element-plus')) {
              return 'element-vendor'
            }
            // 其他大型库
            if (id.includes('lodash') || id.includes('dayjs')) {
              return 'utils-vendor'
            }
            // 默认第三方库
            return 'vendor'
          }
        }
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 禁用 sourcemap 以减小体积
    sourcemap: false,
    // 包体积警告阈值 (kB)
    chunkSizeWarningLimit: 500,
    // 构建输出目录
    outDir: 'dist',
    // 静态资源目录
    assetsDir: 'assets',
    // 静态资源内联阈值 (bytes)
    assetsInlineLimit: 4096,
    // 预加载主要依赖
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: 8080,
    // 预加载模块请求
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/App.vue',
        './src/views/Dashboard.vue',
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
  }
})
