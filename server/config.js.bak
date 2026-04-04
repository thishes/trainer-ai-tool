const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
  }
  console.warn('⚠️ 警告: 使用默认 JWT_SECRET，请在前端设置复杂密钥');
}

if (isProduction && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  throw new Error('生产环境 JWT_SECRET 必须至少32位字符');
}

if (isProduction && !process.env.SECURE_COOKIE) {
  console.warn('⚠️ 警告: 生产环境建议设置 SECURE_COOKIE=true');
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  DEBUG: process.env.DEBUG === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SECURE_COOKIE: process.env.SECURE_COOKIE === 'true' || isProduction,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (isProduction ? [] : ['http://localhost:3000', 'http://localhost:5173'])
};
