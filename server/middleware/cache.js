// server/middleware/cache.js - Redis 缓存中间件
const Redis = require('ioredis');
const config = require('../config');

let redisClient = null;

// 初始化 Redis 连接
function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (!config.CACHE_ENABLED) {
    return null;
  }

  try {
    redisClient = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      retryDelayOnFail: 1000,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    redisClient.on('error', (err) => {
      console.warn('Redis 连接错误:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis 连接成功');
    });

    return redisClient;
  } catch (e) {
    console.warn('Redis 初始化失败，缓存功能将不可用:', e.message);
    return null;
  }
}

// 缓存中间件
function cacheMiddleware(keyPrefix, ttl = null) {
  return async (req, res, next) => {
    // 只缓存 GET 请求
    if (req.method !== 'GET') {
      return next();
    }

    const client = getRedisClient();
    if (!client) {
      return next();
    }

    // 生成缓存键
    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;
    const cacheTTL = ttl || config.CACHE_TTL;

    try {
      // 尝试从缓存获取
      const cached = await client.get(cacheKey);
      if (cached) {
        console.log(`✓ 缓存命中：${cacheKey}`);
        const data = JSON.parse(cached);
        return res.json(data);
      }

      // 缓存未命中，继续处理
      console.log(`⏳ 缓存未命中：${cacheKey}`);
      
      // 拦截 res.json 方法
      const originalJson = res.json;
      let jsonCalled = false;
      res.json = (data) => {
        if (jsonCalled) {
          // 防止重复调用
          return originalJson.call(res, data);
        }
        jsonCalled = true;

        // 将数据写入缓存（异步，不阻塞响应）
        client.setex(cacheKey, cacheTTL, JSON.stringify(data)).catch(err => {
          console.warn('缓存写入失败:', err.message);
        }).finally(() => {
          // 确保恢复原始方法
          res.json = originalJson;
        });

        // 使用原始方法返回响应
        return originalJson.call(res, data);
      };

      next();
    } catch (e) {
      console.warn('缓存操作失败:', e.message);
      next();
    }
  };
}

// 清除缓存的辅助函数
async function invalidateCache(keyPrefix, pattern = '*') {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const keys = await client.keys(`${keyPrefix}:${pattern}`);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`✓ 清除缓存：${keys.length} 条记录`);
    }
  } catch (e) {
    console.warn('清除缓存失败:', e.message);
  }
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  getRedisClient
};
