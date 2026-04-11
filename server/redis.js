// server/redis.js - Redis 客户端管理
const { createClient } = require('redis');
const config = require('./config');

let redisClient = null;
let isConnected = false;
let isConnecting = false;

async function getRedisClient() {
  // 已连接，直接返回
  if (redisClient && isConnected) {
    return redisClient;
  }

  // 正在连接中，等待完成
  if (isConnecting) {
    // 简单等待：轮询直到连接完成或超时
    const maxWait = 5000;
    const start = Date.now();
    while (isConnecting && (Date.now() - start) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (isConnected && redisClient) return redisClient;
    return null;
  }

  // 需要重新连接（旧客户端已断开）
  if (redisClient && !isConnected) {
    try {
      isConnecting = true;
      await redisClient.connect();
      isConnected = true;
      isConnecting = false;
      return redisClient;
    } catch (error) {
      console.error('[Redis] Reconnection failed:', error.message);
      isConnecting = false;
      redisClient = null; // 重置以便下次重新创建
      return null;
    }
  }

  // 首次创建客户端
  const redisUrl = config.REDIS_PASSWORD
    ? `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`
    : `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;

  redisClient = createClient({ url: redisUrl });

  redisClient.on('error', (err) => {
    console.error('[Redis] Error:', err.message);
    isConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected successfully');
    isConnected = true;
  });

  redisClient.on('disconnect', () => {
    console.warn('[Redis] Disconnected');
    isConnected = false;
  });

  redisClient.on('end', () => {
    isConnected = false;
    isConnecting = false;
  });

  try {
    isConnecting = true;
    await redisClient.connect();
    isConnected = true;
    isConnecting = false;
  } catch (error) {
    console.error('[Redis] Connection failed:', error.message);
    isConnected = false;
    isConnecting = false;
    return null;
  }

  return redisClient;
}

async function setWithExpiry(key, value, ttlSeconds = 300) {
  try {
    const client = await getRedisClient();
    if (client && isConnected) {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    }
  } catch (error) {
    console.error('[Redis] Set failed:', error.message);
  }
  return false;
}

async function get(key) {
  try {
    const client = await getRedisClient();
    if (client && isConnected) {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    }
  } catch (error) {
    console.error('[Redis] Get failed:', error.message);
  }
  return null;
}

async function del(key) {
  try {
    const client = await getRedisClient();
    if (client && isConnected) {
      await client.del(key);
      return true;
    }
  } catch (error) {
    console.error('[Redis] Del failed:', error.message);
  }
  return false;
}

async function healthCheck() {
  try {
    const client = await getRedisClient();
    if (client && isConnected) {
      await client.ping();
      return true;
    }
  } catch (error) {
    console.error('[Redis] Health check failed:', error.message);
  }
  return false;
}

module.exports = {
  getRedisClient,
  setWithExpiry,
  get,
  del,
  healthCheck,
  isConnected: () => isConnected
};
