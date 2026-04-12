const crypto = require('crypto');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

function getEnv(name, defaultValue = null, required = false) {
  const value = process.env[name];
  if (value !== undefined) return value;
  if (required && isProduction) {
    throw new Error(`Environment variable ${name} is required in production`);
  }
  return defaultValue;
}

const config = {
  JWT_SECRET: getEnv('JWT_SECRET', null, isProduction),
  DEBUG: getEnv('DEBUG', 'false') === 'true',
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  SECURE_COOKIE: getEnv('SECURE_COOKIE', null) === 'true' || isProduction,

  CORS_ORIGINS: getEnv('ALLOWED_ORIGINS', isProduction ? '' : 'http://localhost:3000,http://localhost:5173'),

  FRONTEND_URL: getEnv('FRONTEND_URL', isProduction ? '' : 'http://localhost:3000'),

  DB_HOST: getEnv('DB_HOST', 'localhost'),
  DB_PORT: parseInt(getEnv('DB_PORT', '3306')),
  DB_USER: getEnv('DB_USER', 'root'),
  DB_PASSWORD: getEnv('DB_PASSWORD', null, isProduction),
  DB_NAME: getEnv('DB_NAME', 'trainer_ai_tool'),

  REDIS_HOST: getEnv('REDIS_HOST', 'localhost'),
  REDIS_PORT: parseInt(getEnv('REDIS_PORT', '6379')),
  REDIS_PASSWORD: getEnv('REDIS_PASSWORD', null),

  CACHE_TTL: parseInt(getEnv('CACHE_TTL', '3600')),
  CACHE_ENABLED: getEnv('CACHE_ENABLED', isProduction ? 'false' : 'true') === 'true',

  DB_POOL: {
    max: parseInt(getEnv('DB_POOL_MAX', '10')),
    min: parseInt(getEnv('DB_POOL_MIN', '2')),
    acquire: parseInt(getEnv('DB_POOL_ACQUIRE', '30000')),
    idle: parseInt(getEnv('DB_POOL_IDLE', '10000'))
  },

  DB_LOGGING: getEnv('DB_LOGGING', isProduction ? 'false' : 'true') === 'true',
  SLOW_QUERY_THRESHOLD: parseInt(getEnv('SLOW_QUERY_THRESHOLD', '1000')),

  APP_PORT: parseInt(getEnv('PORT', '3000')),

  UPLOAD_DIR: path.join(__dirname, '../uploads'),
  LOG_DIR: path.join(__dirname, '../logs'),

  GITHUB_REPO: getEnv('GITHUB_REPO', 'thishes/trainer-ai-tool'),
  GITHUB_TOKEN: getEnv('GITHUB_TOKEN', null)
};

if (isProduction) {
  if (!process.env.JWT_SECRET) {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('生产环境 JWT_SECRET 必须至少 32 位字符');
  }
  if (!process.env.DB_PASSWORD) {
    throw new Error('生产环境必须设置 DB_PASSWORD 环境变量');
  }
}

if (isProduction && !process.env.SECURE_COOKIE) {
  console.warn('⚠️ 警告：生产环境建议设置 SECURE_COOKIE=true');
}

// 开发环境使用固定默认密钥，避免服务器重启导致 token 失效
const DEV_JWT_SECRET = 'dev-trainai-tool-jwt-secret-2024';

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
  }
  config.JWT_SECRET = DEV_JWT_SECRET;
}

if (!process.env.DB_PASSWORD && !isProduction) {
  console.warn('⚠️ 警告：使用默认数据库密码，请设置 DB_PASSWORD 环境变量');
}

module.exports = config;