const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
  }
  console.warn('⚠️ 警告：使用默认 JWT_SECRET，请在前端设置复杂密钥');
}

if (isProduction && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  throw new Error('生产环境 JWT_SECRET 必须至少 32 位字符');
}

if (isProduction && !process.env.SECURE_COOKIE) {
  console.warn('⚠️ 警告：生产环境建议设置 SECURE_COOKIE=true');
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  DEBUG: process.env.DEBUG === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SECURE_COOKIE: process.env.SECURE_COOKIE === 'true' || isProduction,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (isProduction ? [] : ['http://localhost:3000', 'http://localhost:5173']),
  // Redis 缓存配置
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || null,
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600, // 默认缓存 1 小时
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true' || !isProduction, // 默认开发环境启用缓存
  // 数据库连接池配置
  DB_POOL: {
    max: parseInt(process.env.DB_POOL_MAX) || 10, // 最大连接数
    min: parseInt(process.env.DB_POOL_MIN) || 2, // 最小连接数
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000, // 获取连接超时时间 (ms)
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000 // 连接空闲超时时间 (ms)
  },
  // 数据库查询日志
  DB_LOGGING: process.env.DB_LOGGING === 'true' || !isProduction,
  // 慢查询阈值 (ms)
  SLOW_QUERY_THRESHOLD: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000
};
