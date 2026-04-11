var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
  }
  /**
   * 初始化性能监控
   */
  init() {
    this.collectCoreWebVitals();
    this.collectPageLoadMetrics();
    this.observeResources();
    this.observeErrors();
    console.log("[性能监控] 已初始化");
  }
  /**
   * 收集核心 Web 指标 (LCP, FID, CLS)
   */
  collectCoreWebVitals() {
    if ("PerformanceObserver" in window) {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        console.log(`[性能] LCP: ${Math.round(lastEntry.startTime)}ms`);
      });
      lcpObserver.observe({
        entryTypes: ["largest-contentful-paint"]
      });
    }
    if ("PerformanceObserver" in window) {
      const fidObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          console.log(`[性能] FID: ${Math.round(this.metrics.fid)}ms`);
        });
      });
      fidObserver.observe({
        entryTypes: ["first-input"]
      });
    }
    if ("PerformanceObserver" in window) {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = clsValue;
        console.log(`[性能] CLS: ${clsValue.toFixed(3)}`);
      });
      clsObserver.observe({
        entryTypes: ["layout-shift"]
      });
    }
  }
  /**
   * 收集页面加载指标
   */
  collectPageLoadMetrics() {
    window.addEventListener("load", () => {
      const timing = performance.getEntriesByType("navigation")[0];
      this.metrics = __spreadProps(__spreadValues({}, this.metrics), {
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnection: timing.connectEnd - timing.connectStart,
        ttfb: timing.responseStart - timing.requestStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        pageLoad: timing.loadEventEnd - timing.navigationStart,
        resourceCount: performance.getEntriesByType("resource").length
      });
      console.log("[性能] 页面加载指标:", {
        "DNS 查询": `${Math.round(this.metrics.dnsLookup)}ms`,
        "TCP 连接": `${Math.round(this.metrics.tcpConnection)}ms`,
        "TTFB": `${Math.round(this.metrics.ttfb)}ms`,
        "DOM 就绪": `${Math.round(this.metrics.domContentLoaded)}ms`,
        "页面加载": `${Math.round(this.metrics.pageLoad)}ms`,
        "资源数量": this.metrics.resourceCount
      });
      this.report();
    });
  }
  /**
   * 监听资源加载
   */
  observeResources() {
    if ("PerformanceObserver" in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((resource) => {
          if (resource.duration > 1e3) {
            console.warn(`[性能警告] 慢资源: ${resource.name} (${Math.round(resource.duration)}ms)`);
          }
        });
      });
      resourceObserver.observe({
        entryTypes: ["resource"]
      });
    }
  }
  /**
   * 监听错误
   */
  observeErrors() {
    window.addEventListener("error", (event) => {
      console.error("[性能] 资源加载错误:", {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      console.error("[性能] 未处理的 Promise 拒绝:", event.reason);
    });
  }
  /**
   * 添加性能观察者
   */
  addObserver(callback) {
    this.observers.push(callback);
  }
  /**
   * 报告性能数据
   */
  report() {
    this.observers.forEach((callback) => callback(this.metrics));
  }
  /**
   * 获取性能指标
   */
  getMetrics() {
    return __spreadValues({}, this.metrics);
  }
}
const performanceMonitor = new PerformanceMonitor();
{
  performanceMonitor.init();
}
export {
  performanceMonitor
};
