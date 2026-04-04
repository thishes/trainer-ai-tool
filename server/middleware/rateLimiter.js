// server/middleware/rateLimiter.js - 请求限流中间件
const config = require('../config');

// 内存存储（生产环境建议使用 Redis）
const requestStore = new Map();

// 清理过期数据的定时器
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (now - data.startTime > data.windowMs) {
      requestStore.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

/**
 * 创建限流器
 * @param {Object} options - 限流配置
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求数
 * @param {string} options.message - 超限时的错误消息
 * @returns {Function} 限流中间件
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 默认 15 分钟
    max = 100, // 默认最多 100 次请求
    message = '请求过于频繁，请稍后再试',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    // 获取标识符（IP 或用户 ID）
    const identifier = req.user?.id || req.ip || req.connection.remoteAddress;
    const key = `${req.method}:${req.originalUrl || req.url}:${identifier}`;
    
    const now = Date.now();
    let record = requestStore.get(key);

    if (!record) {
      record = {
        count: 0,
        startTime: now,
        windowMs
      };
      requestStore.set(key, record);
    }

    // 如果时间窗口已过，重置计数
    if (now - record.startTime > windowMs) {
      record.count = 0;
      record.startTime = now;
    }

    // 增加计数
    record.count++;

    // 检查是否超限
    if (record.count > max) {
      const retryAfter = Math.ceil((record.startTime + windowMs - now) / 1000);
      
      res.set({
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.startTime + windowMs).toISOString()
      });

      return res.status(429).json({
        success: false,
        message,
        retryAfter
      });
    }

    // 设置响应头
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.startTime + windowMs).toISOString()
    });

    // 监听响应完成，根据配置跳过成功/失败的请求
    if (skipSuccessfulRequests || skipFailedRequests) {
      res.on('finish', () => {
        if (skipSuccessfulRequests && res.statusCode < 400) {
          record.count--;
        } else if (skipFailedRequests && res.statusCode >= 400) {
          record.count--;
        }
      });
    }

    next();
  };
}

// 预定义的限流器配置
const rateLimiters = {
  // API 通用限流：15 分钟内最多 100 次请求
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'API 请求过于频繁，请稍后再试'
  }),

  // 登录限流：5 分钟内最多 5 次尝试
  login: createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: '登录尝试过于频繁，请 5 分钟后再试'
  }),

  // 注册限流：1 小时内最多 3 次注册
  register: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: '注册请求过于频繁，请 1 小时后再试'
  }),

  // 文件上传限流：1 分钟内最多 10 次
  upload: createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: '文件上传过于频繁，请稍后再试'
  }),

  // 严格限流：1 分钟内最多 10 次请求（用于敏感操作）
  strict: createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: '操作过于频繁，请稍后再试'
  })
};

module.exports = {
  createRateLimiter,
  rateLimiters,
  requestStore
};
