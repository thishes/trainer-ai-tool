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
        pure_funcs: ['console.assert', 'console.log', 'console.warn', 'console.info'],
        passes: 2,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true
      },
      mangle: {
        safari10: true,
        properties: false
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('vue-router')) {
              return 'vue-core'
            }
            if (id.includes('@arco-design')) {
              return 'ui-vendor'
            }
            if (id.includes('lodash') || id.includes('dayjs') || id.includes('moment')) {
              return 'utils'
            }
            if (id.includes('xlsx') || id.includes('wangeditor')) {
              return 'heavy-vendor'
            }
            return 'vendor'
          }
          if (id.includes('/src/views/')) {
            const match = id.match(/\/src\/views\/([^/]+)\.vue/)
            if (match) {
              return `view-${match[1].toLowerCase()}`
            }
          }
        },
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
    port: 3001,
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
