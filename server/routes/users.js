// server/routes/users.js - 用户管理路由 (MySQL优先)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const mysqlDb = require('../db-mysql');
const config = require('../config');
const authenticate = require('../middleware/auth');

const JWT_SECRET = config.JWT_SECRET;

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user;
    if (mysqlDb.isConnected()) {
      try {
        user = await mysqlDb.getUserById(decoded.id);
      } catch (e) {}
    }
    if (!user) {
      user = await db.getUserById(decoded.id);
    }
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
};

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let users;

    if (mysqlDb.isConnected()) {
      try {
        users = await mysqlDb.getUsers();
      } catch (e) {
        users = await db.getUsers();
      }
    } else {
      users = await db.getUsers();
    }

    users = users.map(u => ({
      id: u.id,
      username: u.username,
      phone: u.phone,
      role: u.role,
      status: u.status || 'active',
      created_at: u.created_at
    }));

    if (keyword) {
      users = users.filter(u => u.username.includes(keyword) || (u.phone && u.phone.includes(keyword)));
    }

    const total = users.length;
    const start = (parseInt(page) - 1) * parseInt(pageSize);
    users = users.slice(start, start + parseInt(pageSize));

    res.json({ success: true, data: { list: users, total, page, pageSize } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { username, phone, role, status } = req.body;

    let user;
    if (mysqlDb.isConnected()) {
      try {
        user = await mysqlDb.updateUser(req.params.id, { username, phone, role, status });
      } catch (e) {
        user = await db.updateUser(req.params.id, { username, phone, role, status });
      }
    } else {
      user = await db.updateUser(req.params.id, { username, phone, role, status });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, message: '更新成功', data: { id: user.id, username: user.username, phone: user.phone, role: user.role, status: user.status } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (mysqlDb.isConnected()) {
      try {
        await mysqlDb.deleteUser(req.params.id);
      } catch (e) {
        await db.deleteUser(req.params.id);
      }
    } else {
      await db.deleteUser(req.params.id);
    }

    res.json({ success: true, message: '删除成功' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
