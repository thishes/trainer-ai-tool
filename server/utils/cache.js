// server/utils/cache.js - 统一缓存层
// 消除各路由中重复的 clearXxxCache + 缓存读写模式
const redis = require('../redis');

/**
 * 通配符清除缓存 - 替代各路由中重复的 clearXxxCache 函数
 * 使用 SCAN 游标迭代代替阻塞式 keys 命令
 * @param {string} pattern - Redis key 通配符，如 'questions:list:*'
 * @param {string} [label] - 日志标签
 */
async function clearCache(pattern, label = 'Cache') {
  try {
    const client = await redis.getRedisClient();
    if (client && redis.isConnected()) {
      // 使用 SCAN 游标迭代，避免阻塞 Redis
      const keys = [];
      let cursor = '0';
      do {
        const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor || result[0];
        const scannedKeys = result.keys || result[1] || [];
        keys.push(...scannedKeys);
      } while (cursor !== '0' && String(cursor) !== '0');

      if (keys.length > 0) {
        await client.del(keys);
        console.log(`[${label}] Cleared ${keys.length} cache entries for pattern: ${pattern}`);
      }
    }
  } catch (error) {
    console.error(`[${label}] Failed to clear cache (${pattern}):`, error.message);
  }
}

/**
 * 读取缓存 - 如果命中则返回数据，否则返回 null
 * @param {string} key - 缓存 key
 * @returns {Promise<*|null>}
 */
async function getCache(key) {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('[Cache] Get failed:', error.message);
    return null;
  }
}

/**
 * 写入缓存（带 TTL）
 * @param {string} key - 缓存 key
 * @param {*} value - 要缓存的数据
 * @param {number} [ttlSeconds=300] - 过期时间（秒）
 */
async function setCache(key, value, ttlSeconds = 300) {
  try {
    await redis.setWithExpiry(key, value, ttlSeconds);
  } catch (error) {
    console.error('[Cache] Set failed:', error.message);
  }
}

/**
 * 缓存包装器 - 先查缓存，未命中则执行 fetchFn 并缓存结果
 * 自动处理缓存命中/未命中的完整流程
 *
 * @param {string} key - 缓存 key
 * @param {Function} fetchFn - 数据获取函数（异步）
 * @param {Object} [options] - 配置选项
 * @param {number} [options.ttl=300] - 缓存过期时间（秒）
 * @param {boolean} [options.skipCache=false] - 是否跳过缓存读取（仍会写入）
 * @returns {Promise<{data: *, fromCache: boolean}>}
 */
async function withCache(key, fetchFn, options = {}) {
  const { ttl = 300, skipCache = false } = options;

  // 尝试读取缓存
  if (!skipCache) {
    const cached = await getCache(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
  }

  // 缓存未命中，执行查询
  const data = await fetchFn();

  // 写入缓存
  await setCache(key, data, ttl);

  return { data, fromCache: false };
}

/**
 * 预置缓存命名空间 - 方便各模块使用
 */
const namespaces = {
  questions: (suffix) => `questions:list:${suffix}`,
  categories: (suffix) => `categories:${suffix}`,
  promotions: (suffix) => `promotions:list:${suffix}`,
  system: (suffix) => `system:${suffix}`,
  auth: (suffix) => `auth:${suffix}`
};

module.exports = {
  clearCache,
  getCache,
  setCache,
  withCache,
  namespaces
};
