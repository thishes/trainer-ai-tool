// server/routes/categories.js - 分类管理路由
const express = require('express');
const router = express.Router();
const repo = require('../repository');
const authenticate = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const resp = require('../utils/response');
const cache = require('../utils/cache');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const cacheKey = cache.namespaces.categories('all');
  const { data, fromCache } = await cache.withCache(cacheKey, () => repo.getCategories(), { ttl: 600 });

  res.json({ success: true, data, ...(fromCache ? { fromCache: true } : {}) });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, parent_id, description } = req.body;
  if (!name || name.trim() === '') {
    return resp.error(res, '分类名称不能为空', 400);
  }
  const categoryData = {
    name: name.trim(),
    parent_id: parent_id ? parseInt(parent_id) : null,
    description: description || '',
    user_id: req.user.id
  };

  const category = await repo.createCategory(categoryData);
  await cache.clearCache('categories:*', 'Categories');

  resp.created(res, category, '创建成功');
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const category = await repo.getCategoryById(req.params.id);
  if (!category) {
    return resp.notFound(res, '分类不存在');
  }
  if (req.user.role !== 'admin' && category.user_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }
  const { name, description } = req.body;
  const updateData = {};
  if (name) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description;

  const updated = await repo.updateCategory(req.params.id, updateData);
  await cache.clearCache('categories:*', 'Categories');

  resp.success(res, updated, '更新成功');
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const category = await repo.getCategoryById(req.params.id);
  if (!category) {
    return resp.notFound(res, '分类不存在');
  }
  if (req.user.role !== 'admin' && category.user_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  await repo.deleteCategory(req.params.id);
  await cache.clearCache('categories:*', 'Categories');

  resp.success(res, null, '删除成功');
}));

module.exports = router;
