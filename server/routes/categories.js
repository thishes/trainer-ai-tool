// server/routes/categories.js - 分类管理路由 (MySQL优先)
const express = require('express');
const router = express.Router();
const db = require('../db');
const mysqlDb = require('../db-mysql');
const authenticate = require('../middleware/auth');

async function getCategoriesFromMySQL() {
  if (!mysqlDb.isConnected()) return null;
  try {
    return await mysqlDb.getCategories();
  } catch (e) {
    console.warn('[Categories] MySQL query failed:', e.message);
    return null;
  }
}

async function getCategoryFromMySQL(id) {
  if (!mysqlDb.isConnected()) return null;
  try {
    return await mysqlDb.getCategoryById(id);
  } catch (e) {
    console.warn('[Categories] MySQL query failed:', e.message);
    return null;
  }
}

router.get('/', authenticate, async (req, res) => {
  try {
    let categories = null;
    if (mysqlDb.isConnected()) {
      try {
        categories = await mysqlDb.getCategories();
      } catch (e) {
        console.warn('[Categories] MySQL getCategories failed:', e.message);
      }
    }
    if (!categories) {
      categories = db.categories.findAll();
    }
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }
    const categoryData = {
      name: name.trim(),
      parent_id: parent_id ? parseInt(parent_id) : null,
      description: description || '',
      user_id: req.user.id
    };

    let category;
    if (mysqlDb.isConnected()) {
      category = await mysqlDb.createCategory(categoryData);
    } else {
      category = db.categories.create(categoryData);
    }
    res.json({ success: true, message: '创建成功', data: category });
  } catch (error) {
    console.error('创建分类错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    let category = await getCategoryFromMySQL(req.params.id);
    if (!category) {
      category = db.categories.findById(req.params.id);
    }

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

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.updateCategory(req.params.id, updateData);
    } else {
      updated = db.categories.update(req.params.id, updateData);
    }
    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    let category = await getCategoryFromMySQL(req.params.id);
    if (!category) {
      category = db.categories.findById(req.params.id);
    }

    if (!category) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }
    if (req.user.role !== "admin" && category.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (mysqlDb.isConnected()) {
      await mysqlDb.deleteCategory(req.params.id);
    } else {
      db.categories.delete(req.params.id);
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

module.exports = router;
