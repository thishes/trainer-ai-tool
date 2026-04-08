const { createClient } = require('redis');
const config = require('./config');

let redisClient = null;
let isConnected = false;

async function getRedisClient() {
  if (redisClient && isConnected) {
    return redisClient;
  }

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

  try {
    await redisClient.connect();
    isConnected = true;
  } catch (error) {
    console.error('[Redis] Connection failed:', error.message);
    isConnected = false;
  }

  return redisClient;
}

async function setWithExpiry(key, value, ttlSeconds = 300) {
  try {
    const client = await getRedisClient();
    if (isConnected) {
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
    if (isConnected) {
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
    if (isConnected) {
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
    if (isConnected) {
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