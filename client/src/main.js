// client/src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import './styles/variables.css'

// 生产环境加载性能监控
if (process.env.NODE_ENV === 'production') {
  (async () => {
    try {
      const { performanceMonitor } = await import('./utils/performance')
      performanceMonitor.init()
    } catch (e) {
      console.error('性能监控初始化失败:', e)
    }
  })()
}

const app = createApp(App)

app.use(router)
app.use(ElementPlus)
app.use(ArcoVue)

app.mount('#app')