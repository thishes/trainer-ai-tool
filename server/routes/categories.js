// server/routes/categories.js - 分类管理路由 (JSON版)
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticate = require('../middleware/auth');

// 获取分类列表
router.get('/', authenticate, async (req, res) => {
  try {
    let categories;
    if (req.user.role === "admin") {
      categories = db.categories.findAll();
    } else {
      categories = db.categories.findByUserId(req.user.id);
    }
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 创建分类
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }
    const category = db.categories.create({
      name: name.trim(),
      parent_id: parent_id ? parseInt(parent_id) : null,
      description: description || '',
      user_id: req.user.id
    });
    res.json({ success: true, message: '创建成功', data: category });
  } catch (error) {
    console.error('创建分类错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 更新分类
router.put('/:id', authenticate, async (req, res) => {
  try {
    const category = db.categories.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }
    if (req.user.role !== "admin" && category.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    const { name, description } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    const updated = db.categories.update(req.params.id, updateData);
    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除分类
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const category = db.categories.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }
    if (req.user.role !== "admin" && category.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    db.categories.delete(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

module.exports = router;
