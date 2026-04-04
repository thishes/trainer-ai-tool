// client/src/utils/performance.js - 前端性能监控工具

/**
 * 性能监控工具类
 * 用于收集和报告前端性能指标
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.observers = []
  }

  /**
   * 初始化性能监控
   */
  init() {
    // 收集核心 Web 指标
    this.collectCoreWebVitals()
    
    // 收集页面加载指标
    this.collectPageLoadMetrics()
    
    // 监听资源加载
    this.observeResources()
    
    // 监听错误
    this.observeErrors()
    
    console.log('[性能监控] 已初始化')
  }

  /**
   * 收集核心 Web 指标 (LCP, FID, CLS)
   */
  collectCoreWebVitals() {
    // LCP - 最大内容绘制
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.metrics.lcp = lastEntry.startTime
        console.log(`[性能] LCP: ${Math.round(lastEntry.startTime)}ms`)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    }

    // FID - 首次输入延迟 (使用 polyfill)
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          this.metrics.fid = entry.processingStart - entry.startTime
          console.log(`[性能] FID: ${Math.round(this.metrics.fid)}ms`)
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    }

    // CLS - 累积布局偏移
    if ('PerformanceObserver' in window) {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.metrics.cls = clsValue
        console.log(`[性能] CLS: ${clsValue.toFixed(3)}`)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    }
  }

  /**
   * 收集页面加载指标
   */
  collectPageLoadMetrics() {
    window.addEventListener('load', () => {
      const timing = performance.getEntriesByType('navigation')[0]
      
      this.metrics = {
        ...this.metrics,
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnection: timing.connectEnd - timing.connectStart,
        ttfb: timing.responseStart - timing.requestStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        pageLoad: timing.loadEventEnd - timing.navigationStart,
        resourceCount: performance.getEntriesByType('resource').length
      }

      console.log('[性能] 页面加载指标:', {
        'DNS 查询': `${Math.round(this.metrics.dnsLookup)}ms`,
        'TCP 连接': `${Math.round(this.metrics.tcpConnection)}ms`,
        'TTFB': `${Math.round(this.metrics.ttfb)}ms`,
        'DOM 就绪': `${Math.round(this.metrics.domContentLoaded)}ms`,
        '页面加载': `${Math.round(this.metrics.pageLoad)}ms`,
        '资源数量': this.metrics.resourceCount
      })

      // 报告性能数据
      this.report()
    })
  }

  /**
   * 监听资源加载
   */
  observeResources() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((resource) => {
          if (resource.duration > 1000) {
            console.warn(`[性能警告] 慢资源: ${resource.name} (${Math.round(resource.duration)}ms)`)
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
    }
  }

  /**
   * 监听错误
   */
  observeErrors() {
    window.addEventListener('error', (event) => {
      console.error('[性能] 资源加载错误:', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      console.error('[性能] 未处理的 Promise 拒绝:', event.reason)
    })
  }

  /**
   * 添加性能观察者
   */
  addObserver(callback) {
    this.observers.push(callback)
  }

  /**
   * 报告性能数据
   */
  report() {
    // 通知所有观察者
    this.observers.forEach(callback => callback(this.metrics))
    
    // 可以在这里发送到后端监控服务
    // fetch('/api/performance', {
    //   method: 'POST',
    //   body: JSON.stringify(this.metrics)
    // })
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return { ...this.metrics }
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor()

// 自动初始化（生产环境）
if (process.env.NODE_ENV === 'production') {
  performanceMonitor.init()
}
