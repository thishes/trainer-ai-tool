// server/routes/users.js - 用户管理路由
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const authenticate = require('../middleware/auth');

const JWT_SECRET = config.JWT_SECRET;
if (!JWT_SECRET && config.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 环境变量未设置');
}

// 验证管理员身份
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    if (user.status === 'locked') {
      return res.status(403).json({ success: false, message: '账号已被锁定' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
};

// 获取用户列表
router.get('/', requireAdmin, (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let users = db.users.findAll().map(u => ({
      id: u.id,
      username: u.username,
      phone: u.phone,
      role: u.role,
      status: u.status || 'active',
      created_at: u.created_at
    }));
    
    // 搜索过滤
    if (keyword) {
      users = users.filter(u => u.username.includes(keyword) || (u.phone && u.phone.includes(keyword)));
    }
    
    // 分页
    const total = users.length;
    const start = (page - 1) * pageSize;
    users = users.slice(start, start + parseInt(pageSize));
    
    res.json({ success: true, data: { list: users, total, page, pageSize } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 创建用户
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, password, phone, role = 'trainer' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    
    // 检查用户名是否存在
    const existing = db.users.findByUsername(username);
    if (existing) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = db.users.create({
      username,
      password: hashedPassword,
      phone,
      role,
      status: 'active'
    });
    
    res.json({ success: true, data: { id: user.id, username: user.username, role: user.role } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 更新用户
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, phone, role } = req.body;
    
    const user = db.users.findById(parseInt(id));
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 不能修改超级管理员
    if (user.role === 'admin' && user.username === 'thishe') {
      return res.status(403).json({ success: false, message: '不能修改超级管理员' });
    }
    
    const updateData = {};
    if (username) updateData.username = username;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }
    
    db.users.update(parseInt(id), updateData);
    
    res.json({ success: true, message: '更新成功' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 锁定/解锁用户
router.patch('/:id/status', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // locked 或 active
    
    const user = db.users.findById(parseInt(id));
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 不能锁定超级管理员
    if (user.role === 'admin' && user.username === 'thishe') {
      return res.status(403).json({ success: false, message: '不能锁定超级管理员' });
    }
    
    db.users.update(parseInt(id), { status });
    
    res.json({ success: true, message: status === 'locked' ? '已锁定' : '已解锁' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 删除用户
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    const user = db.users.findById(parseInt(id));
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 不能删除超级管理员
    if (user.role === 'admin' && user.username === 'thishe') {
      return res.status(403).json({ success: false, message: '不能删除超级管理员' });
    }
    
    db.users.delete(parseInt(id));
    
    res.json({ success: true, message: '删除成功' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 修改密码
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请提供旧密码和新密码' });
    }
    
    // 密码强度验证
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: '新密码长度至少为8位' });
    }
    
    // 检查密码复杂度：至少包含一个大写字母、一个小写字母和一个数字
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({ 
        success: false, 
        message: '密码必须包含大写字母、小写字母和数字' 
      });
    }
    
    // 检查密码不能是常见弱密码
    const weakPasswords = ['12345678', 'password', 'qwerty', 'abc12345', '11111111'];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      return res.status(400).json({ success: false, message: '密码过于简单，请使用更复杂的密码' });
    }
    
    // 检查新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: '新密码不能与旧密码相同' });
    }
    
    const user = db.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: '当前密码错误' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.users.update(user.id, { password: hashedPassword });
    
    res.json({ success: true, message: '密码修改成功' });
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
