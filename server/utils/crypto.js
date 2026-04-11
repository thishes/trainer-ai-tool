// server/utils/crypto.js - 敏感字段加密/解密工具
// 使用 AES-256-GCM 对手机号、邮箱等 PII 字段加密存储
const crypto = require('crypto');

// 加密密钥，从环境变量读取，32 字节 = AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;     // GCM 推荐 12 字节
const TAG_LENGTH = 16;    // GCM 认证标签 16 字节

/**
 * 加密明文
 * @param {string} plaintext - 明文
 * @returns {string} - 格式: iv:tag:ciphertext (hex 编码)
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.length === 64 ? ENCRYPTION_KEY : ENCRYPTION_KEY.padEnd(64, '0'), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * 解密密文
 * @param {string} ciphertext - 格式: iv:tag:ciphertext
 * @returns {string|null} - 明文，失败返回 null
 */
function decrypt(ciphertext) {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = Buffer.from(ENCRYPTION_KEY.length === 64 ? ENCRYPTION_KEY : ENCRYPTION_KEY.padEnd(64, '0'), 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // 解密失败（密钥变更或数据损坏），返回原始值
    console.warn('[Crypto] Decryption failed:', error.message);
    return ciphertext;
  }
}

/**
 * 对手机号做脱敏显示：138****1234
 * @param {string} phone - 原始手机号
 * @returns {string}
 */
function maskPhone(phone) {
  if (!phone) return '';
  const plain = phone.includes(':') ? decrypt(phone) : phone;
  if (plain && plain.length >= 7) {
    return plain.slice(0, 3) + '****' + plain.slice(-4);
  }
  return plain || '';
}

/**
 * 检查值是否已加密（包含 iv:tag:ciphertext 格式）
 * @param {string} value
 * @returns {boolean}
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
}

module.exports = { encrypt, decrypt, maskPhone, isEncrypted };
