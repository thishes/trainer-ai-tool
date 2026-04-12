// server/routes/auth.js - 认证路由 (统一数据访问层)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const repo = require('../repository');
const config = require('../config');
const authenticate = require('../middleware/auth');
const redis = require('../redis');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const schemas = require('../middleware/schemas');
const resp = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 300;

router.get('/captcha', rateLimiters.strict, async (req, res) => {
  const captchaId = crypto.randomBytes(16).toString('hex');
  const code = crypto.randomInt(100000, 999999).toString();

  await redis.setWithExpiry(
    `${CAPTCHA_PREFIX}${captchaId}`,
    { code, attempts: 0 },
    CAPTCHA_TTL
  );

  // 生成SVG验证码图片，不返回明文code
  const svgCaptcha = generateSvgCaptcha(code);

  res.json({ success: true, data: { captchaId, svg: svgCaptcha } });
});

/**
 * 生成SVG验证码图片
 */
function generateSvgCaptcha(code) {
  const width = 120;
  const height = 40;
  const fontSize = 28;
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];

  let textElements = '';
  for (let i = 0; i < code.length; i++) {
    const x = 15 + i * 17;
    const y = 28 + Math.random() * 6 - 3;
    const rotate = Math.random() * 20 - 10;
    const color = colors[Math.floor(Math.random() * colors.length)];
    textElements += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" transform="rotate(${rotate}, ${x}, ${y})">${code[i]}</text>`;
  }

  // 干扰线
  let lineElements = '';
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    lineElements += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.5"/>`;
  }

  // 干扰点
  let dotElements = '';
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    dotElements += `<circle cx="${cx}" cy="${cy}" r="1" fill="${color}" opacity="0.6"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f0f0f0" rx="4"/>${lineElements}${dotElements}${textElements}</svg>`;
}

router.post('/login', rateLimiters.login, validate(schemas.login), asyncHandler(async (req, res) => {
  const { username, password, captchaId, captchaCode } = req.body;

  console.log(`[Auth] Login attempt: username="${username}", hasCaptchaId=${!!captchaId}, captchaCode="${captchaCode}"`);

  if (!captchaId || !captchaCode) {
    return resp.error(res, '请输入验证码');
  }

  const storedCaptcha = await redis.get(`${CAPTCHA_PREFIX}${captchaId}`);
  if (!storedCaptcha) {
    return resp.error(res, '验证码已过期，请重新获取');
  }
  if (storedCaptcha.attempts >= 3) {
    await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);
    return resp.error(res, '验证码错误次数过多，请重新获取');
  }
  if (storedCaptcha.code !== captchaCode) {
    storedCaptcha.attempts++;
    await redis.setWithExpiry(`${CAPTCHA_PREFIX}${captchaId}`, storedCaptcha, CAPTCHA_TTL);
    return resp.error(res, '验证码错误');
  }

  await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);

  // 查找用户（通过统一数据层）— 不缓存含密码哈希的完整信息
  const user = await repo.getUserByUsername(username);

  if (!user) {
    console.warn(`[Auth] Login failed: user not found - username="${username}"`);
    return resp.unauthorized(res, '用户名或密码错误');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    console.warn(`[Auth] Login failed: wrong password - username="${username}", user.id=${user.id}`);
    return resp.unauthorized(res, '用户名或密码错误');
  }
  console.log(`[Auth] Login success: username="${username}", user.id=${user.id}, role=${user.role}`);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // 先清除旧 token Cookie（防止旧 secret 签发的 token 残留）
  res.clearCookie('token', { path: '/' });

  const isSecureCookie = config.SECURE_COOKIE;
  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  // 同时返回 token 用于 Authorization header（双重保障）
  resp.success(res, {
    user: { id: user.id, username: user.username, role: user.role, status: user.status, avatar: user.avatar },
    token
  });
}));

router.post('/register', rateLimiters.register, validate(schemas.register), asyncHandler(async (req, res) => {
  const { username, password, phone, role = 'trainer', captchaId, captchaCode } = req.body;

  if (!captchaId || !captchaCode) {
    return resp.error(res, '请输入验证码');
  }

  const storedCaptcha = await redis.get(`${CAPTCHA_PREFIX}${captchaId}`);
  if (!storedCaptcha || storedCaptcha.code !== captchaCode) {
    if (storedCaptcha) await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);
    return resp.error(res, '验证码错误');
  }

  await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);

  const existingUser = await repo.getUserByUsername(username);

  if (existingUser) {
    return resp.error(res, '用户名已存在');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await repo.createUser({
    username,
    password: hashedPassword,
    phone: phone || null,
    role: role || 'trainer'
  });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const isSecureCookie = config.SECURE_COOKIE;
  // 先清除旧 token Cookie
  res.clearCookie('token', { path: '/' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  // 不再在 response body 中返回 token
  resp.success(res, {
    user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar },
    token
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await repo.getUserById(req.user.id);

  if (!user) {
    return resp.notFound(res, '用户不存在');
  }

  resp.success(res, {
    id: user.id,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    status: user.status
  });
}));

router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { avatar, phone } = req.body;

  const user = await repo.updateUser(req.user.id, { avatar, phone });

  if (!user) {
    return resp.notFound(res, '用户不存在');
  }

  resp.success(res, { id: user.id, username: user.username, role: user.role, avatar: user.avatar, phone: user.phone });
}));

// 登出 - 清除 HttpOnly Cookie
router.post('/logout', asyncHandler(async (req, res) => {
  res.clearCookie('token', { path: '/' });
  resp.success(res, null, '已退出登录');
}));

module.exports = router;
