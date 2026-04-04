// server/routes/auth.js - 认证路由 (Redis 存储验证码版)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const authenticate = require('../middleware/auth');
const { createClient } = require('redis');

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const CAPTCHA_EXPIRY = 5 * 60;

let redisClient = null;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({
      socket: { host: '127.0.0.1', port: 6379 }
    });
    redisClient.on('error', (err) => console.error('Redis 错误:', err));
    await redisClient.connect();
  }
  return redisClient;
};

const generateCaptcha = async () => {
  const client = await getRedisClient();
  const code = crypto.randomInt(100000, 999999).toString();
  const captchaId = crypto.randomBytes(16).toString('hex');
  await client.setEx(`captcha:${captchaId}`, CAPTCHA_EXPIRY, code);
  return captchaId;
};

const verifyCaptcha = async (captchaId, code) => {
  if (!captchaId || !code) return false;
  try {
    const client = await getRedisClient();
    const storedCode = await client.get(`captcha:${captchaId}`);
    if (!storedCode) return false;
    if (storedCode !== code) return false;
    await client.del(`captcha:${captchaId}`);
    return true;
  } catch (e) {
    console.error('验证码校验失败:', e);
    return false;
  }
};

/**
 * @swagger
 * /api/auth/captcha:
 *   get:
 *     tags: [认证]
 *     summary: 获取验证码
 *     description: 获取登录验证码（开发环境直接返回）
 *     responses:
 *       200:
 *         description: 成功的响应
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     captchaId:
 *                       type: string
 *                       description: 验证码 ID
 *                     code:
 *                       type: string
 *                       description: 验证码内容（开发环境）
 *       500:
 *         description: 服务器错误
 */
router.get('/captcha', async (req, res) => {
  try {
    const captchaId = await generateCaptcha();
    const client = await getRedisClient();
    const code = await client.get(`captcha:${captchaId}`);
    res.json({ success: true, data: { captchaId, code } });
  } catch (e) {
    console.error('生成验证码失败:', e);
    res.status(500).json({ success: false, message: '生成验证码失败' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [认证]
 *     summary: 用户登录
 *     description: 用户登录接口，使用用户名密码和验证码获取 JWT Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - captchaId
 *               - captchaCode
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *               captchaId:
 *                 type: string
 *                 description: 验证码 ID
 *               captchaCode:
 *                 type: string
 *                 description: 验证码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT Token
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: 验证码错误
 *       401:
 *         description: 用户名或密码错误
 *       500:
 *         description: 服务器错误
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, captchaId, captchaCode } = req.body;

    const captchaValid = await verifyCaptcha(captchaId, captchaCode);
    if (!captchaId || !captchaCode || !captchaValid) {
      return res.status(400).json({ success: false, message: '验证码错误或已过期' });
    }

    const user = db.users.findByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ success: false, message: '账号已被锁定，请联系管理员' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const isSecureCookie = config.SECURE_COOKIE;
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, phone, role = 'trainer', captchaId, captchaCode } = req.body;

    const captchaValid = await verifyCaptcha(captchaId, captchaCode);
    if (!captchaId || !captchaCode || !captchaValid) {
      return res.status(400).json({ success: false, message: '验证码错误或已过期' });
    }

    const existingUser = db.users.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const keyId = crypto.randomBytes(8).toString('hex');
    const user = db.users.create({
      username,
      password: hashedPassword,
      phone,
      role,
      key_id: keyId,
      status: 'active'
    });

    res.json({ success: true, data: { user: { id: user.id, username: user.username, role: user.role } } });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  res.json({ 
    success: true, 
    data: { id: user.id, username: user.username, role: user.role, phone: user.phone, avatar: user.avatar }
  });
});

module.exports = router;
