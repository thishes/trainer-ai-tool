// server/routes/auth.js - 认证路由 (MySQL优先)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const mysqlDb = require('../db-mysql');
const config = require('../config');
const authenticate = require('../middleware/auth');
const redis = require('../redis');

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 300;

router.get('/captcha', async (req, res) => {
  const captchaId = crypto.randomBytes(16).toString('hex');
  const code = crypto.randomInt(100000, 999999).toString();

  await redis.setWithExpiry(
    `${CAPTCHA_PREFIX}${captchaId}`,
    { code, attempts: 0 },
    CAPTCHA_TTL
  );

  res.json({ success: true, data: { captchaId, code } });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, captchaId, captchaCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (!captchaId || !captchaCode) {
      return res.status(400).json({ success: false, message: '请输入验证码' });
    }

    const storedCaptcha = await redis.get(`${CAPTCHA_PREFIX}${captchaId}`);
    if (!storedCaptcha) {
      return res.status(400).json({ success: false, message: '验证码已过期，请重新获取' });
    }
    if (storedCaptcha.attempts >= 3) {
      await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);
      return res.status(400).json({ success: false, message: '验证码错误次数过多，请重新获取' });
    }
    if (storedCaptcha.code !== captchaCode) {
      storedCaptcha.attempts++;
      await redis.setWithExpiry(`${CAPTCHA_PREFIX}${captchaId}`, storedCaptcha, CAPTCHA_TTL);
      return res.status(400).json({ success: false, message: '验证码错误' });
    }

    await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);

    // 检查用户缓存
    const cacheKey = `user:login:${username}`;
    let user = await redis.get(cacheKey);
    
    if (!user) {
      if (mysqlDb.isConnected()) {
        try {
          const users = await mysqlDb.getUsers();
          user = users.find(u => u.username === username);
        } catch (e) {
          user = await db.users.findByUsername(username);
        }
      } else {
        user = await db.users.findByUsername(username);
      }
      // 缓存用户信息5分钟
      if (user) {
        await redis.setWithExpiry(cacheKey, user, 300);
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
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
        user: { id: user.id, username: user.username, role: user.role, status: user.status, avatar: user.avatar }
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

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码至少6位' });
    }

    if (!captchaId || !captchaCode) {
      return res.status(400).json({ success: false, message: '请输入验证码' });
    }

    const storedCaptcha = await redis.get(`${CAPTCHA_PREFIX}${captchaId}`);
    if (!storedCaptcha || storedCaptcha.code !== captchaCode) {
      if (storedCaptcha) await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);
      return res.status(400).json({ success: false, message: '验证码错误' });
    }

    await redis.del(`${CAPTCHA_PREFIX}${captchaId}`);

    let existingUser;
    if (mysqlDb.isConnected()) {
      try {
        const users = await mysqlDb.getUsers();
        existingUser = users.find(u => u.username === username);
      } catch (e) {
        existingUser = await db.users.findByUsername(username);
      }
    } else {
      existingUser = await db.users.findByUsername(username);
    }

    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user;
    if (mysqlDb.isConnected()) {
      try {
        user = await mysqlDb.createUser({
          username,
          password: hashedPassword,
          phone: phone || null,
          role: role || 'trainer'
        });
      } catch (e) {
        user = await db.users.create({
          username,
          password: hashedPassword,
          phone: phone || null,
          role: role || 'trainer'
        });
      }
    } else {
      user = await db.users.create({
        username,
        password: hashedPassword,
        phone: phone || null,
        role: role || 'trainer'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar }
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    let user;
    if (mysqlDb.isConnected()) {
      try {
        user = await mysqlDb.getUserById(req.user.id);
      } catch (e) {
        user = await db.getUserById(req.user.id);
      }
    } else {
      user = await db.getUserById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { avatar, phone } = req.body;

    let user;
    if (mysqlDb.isConnected()) {
      try {
        user = await mysqlDb.updateUser(req.user.id, { avatar, phone });
      } catch (e) {
        user = await db.updateUser(req.user.id, { avatar, phone });
      }
    } else {
      user = await db.updateUser(req.user.id, { avatar, phone });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({
      success: true,
      data: { id: user.id, username: user.username, role: user.role, avatar: user.avatar, phone: user.phone }
    });
  } catch (error) {
    console.error('更新个人资料错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

module.exports = router;
