// server/routes/questions.js - 题目管理路由
const express = require('express');
const router = express.Router();
const repo = require('../repository');
const authenticate = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');
const schemas = require('../middleware/schemas');
const resp = require('../utils/response');
const cache = require('../utils/cache');
const crypto = require('crypto');

// 获取题目列表
router.get('/', authenticate, validate(schemas.questionList), asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, category_id, type, keyword, status } = req.query;

  // 使用 hash 作为缓存 key，避免超长拼接字符串
  const cacheKeyRaw = `${page}:${pageSize}:${category_id || 'all'}:${type || 'all'}:${keyword || 'all'}:${status || 'all'}`;
  const cacheKey = keyword
    ? cache.namespaces.questions(`kw:${crypto.createHash('sha256').update(cacheKeyRaw).digest('hex')}`)
    : cache.namespaces.questions(cacheKeyRaw);

  // 使用 withCache 统一缓存读写
  const { data, fromCache } = await cache.withCache(
    cacheKey,
    async () => {
      const result = await repo.searchQuestions({ page, pageSize, category_id, type, keyword, status });

      // 【优化】只获取需要的分类信息，避免全表查询
      const categoryIds = [...new Set(result.list.filter(q => q.category_id).map(q => q.category_id))];
      let categoriesMap = {};
      if (categoryIds.length > 0) {
        // 批量获取指定分类，而非全部分类
        const categories = await Promise.all(
          categoryIds.map(id => repo.getCategoryById(id).catch(() => null))
        );
        categories.filter(Boolean).forEach(c => { categoriesMap[c.id] = c; });
      }

      const list = result.list.map(q => {
        const category = q.category_id ? categoriesMap[q.category_id] : null;
        return { ...q, Category: category ? { id: category.id, name: category.name } : null };
      });

      return {
        list,
        total: result.total || list.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil((result.total || list.length) / parseInt(pageSize)),
        pagination: { total: result.total || list.length, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil((result.total || list.length) / parseInt(pageSize)) }
      };
    },
    { ttl: 180, skipCache: !!keyword }
  );

  res.json({ success: true, data, ...(fromCache ? { fromCache: true } : {}) });
}));

// 获取题目详情
router.get('/:id', asyncHandler(async (req, res) => {
  const question = await repo.getQuestionById(req.params.id);
  if (!question) {
    return resp.notFound(res, '题目不存在');
  }
  resp.success(res, question);
}));

// 创建题目
router.post('/', authenticate, validate(schemas.questionCreate), asyncHandler(async (req, res) => {
  const { title, type, options, answer, explanation, difficulty, score, tags, category_id, status } = req.body;

  const questionData = {
    title,
    type,
    options,
    answer,
    explanation,
    difficulty: difficulty || 'medium',
    score: score || 10,
    tags: tags || [],
    category_id: category_id ? parseInt(category_id) : null,
    status: status || 'draft',
    user_id: req.user.id
  };

  const question = await repo.createQuestion(questionData);
  await cache.clearCache('questions:list:*', 'Questions');

  resp.created(res, question, '创建成功');
}));

// 更新题目
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const question = await repo.getQuestionById(req.params.id);
  if (!question) {
    return resp.notFound(res, '题目不存在');
  }

  const { title, type, options, answer, explanation, difficulty, score, tags, category_id, status } = req.body;
  const updateData = { title, type, options, answer, explanation, difficulty, score, tags, category_id: category_id ? parseInt(category_id) : null, status };

  const updated = await repo.updateQuestion(req.params.id, updateData);
  await cache.clearCache('questions:list:*', 'Questions');

  resp.success(res, updated, '更新成功');
}));

// 删除题目
router.delete('/:id', authenticate, validate(schemas.idParam), asyncHandler(async (req, res) => {
  const question = await repo.getQuestionById(req.params.id);
  if (!question) {
    return resp.notFound(res, '题目不存在');
  }

  await repo.deleteQuestion(req.params.id);
  await cache.clearCache('questions:list:*', 'Questions');

  resp.success(res, null, '删除成功');
}));

// 批量导入题目
router.post('/import', authenticate, validate(schemas.questionImport), asyncHandler(async (req, res) => {
  const { questions: importQuestions, category_id } = req.body;

  if (!Array.isArray(importQuestions) || importQuestions.length === 0) {
    return resp.error(res, '请提供题目列表', 400);
  }

  // 限制批量导入数量
  if (importQuestions.length > 500) {
    return resp.error(res, '单次最多导入500道题目', 400);
  }

  let count = 0;
  const errors = [];

  // 【P1-5】使用事务保护批量导入
  const mysqlDb = require('../db-mysql');
  if (mysqlDb.isConnected() && mysqlDb.sequelize) {
    const transaction = await mysqlDb.sequelize.transaction();
    try {
      for (const q of importQuestions) {
        const questionData = {
          title: q.title,
          type: q.type || 'single',
          options: q.options || [],
          answer: q.answer,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
          score: q.score || 10,
          tags: q.tags || [],
          category_id: category_id ? parseInt(category_id) : (q.category_id ? parseInt(q.category_id) : null),
          status: 'draft',
          user_id: req.user.id
        };

        try {
          await repo.createQuestion(questionData);
          count++;
        } catch (err) {
          errors.push({ title: q.title, error: err.message });
        }
      }

      if (errors.length > 0 && count === 0) {
        // 全部失败，回滚
        await transaction.rollback();
        return resp.error(res, `导入失败：${errors[0].error}`, 400);
      }

      // 部分或全部成功，提交事务
      await transaction.commit();

      if (errors.length > 0) {
        console.warn(`[IMPORT_PARTIAL] ${count} success, ${errors.length} failed`);
        resp.created(res, { count, errors }, `成功导入 ${count} 道题目，${errors.length} 道失败`);
      } else {
        resp.created(res, { count }, `成功导入 ${count} 道题目`);
      }
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  } else {
    // MySQL未配置时降级为逐条插入（无事务）
    for (const q of importQuestions) {
      const questionData = {
        title: q.title,
        type: q.type || 'single',
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
        score: q.score || 10,
        tags: q.tags || [],
        category_id: category_id ? parseInt(category_id) : (q.category_id ? parseInt(q.category_id) : null),
        status: 'draft',
        user_id: req.user.id
      };

      await repo.createQuestion(questionData);
      count++;
    }
    resp.created(res, { count }, `成功导入 ${count} 道题目`);
  }
}));

module.exports = router;
