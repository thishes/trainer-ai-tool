// server/routes/auth.js - 认证路由 (安全加固版)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'trainer-ai-tool-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
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
    // 设置 HttpOnly Cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
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

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, phone, role = 'trainer' } = req.body;
    const existingUser = db.users.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = db.users.create({ username, password: hashedPassword, phone, role });
    res.json({ success: true, message: '注册成功', data: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

// 微信登录
router.post('/wechat/login', async (req, res) => {
  try {
    const { openid, nickname, avatar } = req.body;
    let user = db.users.findByWechatOpenid(openid);
    if (!user) {
      user = db.users.create({
        username: `wx_${openid.slice(0, 8)}`,
        wechat_openid: openid,
        nickname,
        avatar,
        role: 'student'
      });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, data: { token, user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar } } });
  } catch (error) {
    console.error('微信登录错误:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 获取当前用户信息 (支持 Cookie 或 Header)
router.get('/me', async (req, res) => {
  try {
    let token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: { id: user.id, username: user.username, role: user.role, avatar: user.avatar, phone: user.phone } });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(401).json({ success: false, message: 'token无效' });
  }
});

// 登出
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: '登出成功' });
});

// 刷新 Token
router.post('/refresh', async (req, res) => {
  try {
    let token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const user = db.users.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const newToken = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', newToken, { httpOnly: true, secure: isProduction, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, data: { token: newToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'token无效' });
  }
});

module.exports = router;
