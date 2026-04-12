// server/routes/users.js - 用户管理路由 (统一数据访问层)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const repo = require('../repository');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const resp = require('../utils/response');

router.get('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, keyword = '' } = req.query;
  let users = await repo.getUsers();

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

  resp.success(res, { list: users, total, page: parseInt(page), pageSize: parseInt(pageSize) });
}));

router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { username, password, phone, role } = req.body;
  if (!username || !password) {
    return resp.error(res, '用户名和密码不能为空');
  }

  const existingUser = await repo.getUserByUsername(username);
  if (existingUser) {
    return resp.error(res, '用户名已存在', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await repo.createUser({
    username,
    password: hashedPassword,
    phone: phone || null,
    role: role || 'user',
    status: 'active'
  });

  resp.success(res, {
    id: user.id,
    username: user.username,
    phone: user.phone,
    role: user.role,
    status: user.status || 'active',
    created_at: user.created_at
  }, '创建成功');
}));

router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { username, phone, role, status } = req.body;
  const user = await repo.updateUser(req.params.id, { username, phone, role, status });
  if (!user) {
    return resp.notFound(res, '用户不存在');
  }
  resp.success(res, { id: user.id, username: user.username, phone: user.phone, role: user.role, status: user.status }, '更新成功');
}));

router.patch('/:id/status', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || !['active', 'locked'].includes(status)) {
    return resp.error(res, '状态值无效，必须是 active 或 locked');
  }

  const user = await repo.updateUser(req.params.id, { status });
  if (!user) {
    return resp.notFound(res, '用户不存在');
  }

  resp.success(res, {
    id: user.id,
    username: user.username,
    phone: user.phone,
    role: user.role,
    status: user.status
  }, status === 'active' ? '解锁成功' : '锁定成功');
}));

router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return resp.error(res, '旧密码和新密码都是必填项');
  }
  if (newPassword.length < 6) {
    return resp.error(res, '新密码长度不能少于6位');
  }
  const user = await repo.changePassword(req.user.id, oldPassword, newPassword);
  if (!user) {
    return resp.error(res, '旧密码不正确');
  }
  resp.success(res, null, '密码修改成功');
}));

router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await repo.deleteUser(req.params.id);
  resp.success(res, null, '删除成功');
}));

module.exports = router;
