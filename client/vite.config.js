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
    minify: false,
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
