// server/routes/papers.js - 试卷管理路由
const express = require('express');
const router = express.Router();
const repo = require('../repository');
const QRCode = require('qrcode');
const authenticate = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');
const schemas = require('../middleware/schemas');
const resp = require('../utils/response');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, status } = req.query;

  const filters = {};
  if (req.user.role !== 'admin') {
    filters.user_id = req.user.id;
  }
  if (status) {
    filters.status = status;
  }

  let papers = await repo.getPapers(filters.user_id);

  // 状态过滤
  if (status) {
    papers = papers.filter(p => p.status === status);
  }

  // 批量获取所有者信息 - 使用 Set 去重 + 并行查询
  const ownerIds = [...new Set(papers.map(p => p.user_id || p.owner_id).filter(Boolean))];
  const ownersMap = {};

  await Promise.all(ownerIds.map(async id => {
    const owner = await repo.getUserById(id);
    if (owner) ownersMap[id] = { id: owner.id, username: owner.username, avatar: owner.avatar };
  }));

  const allList = papers.map(p => ({
    ...p,
    owner: ownersMap[p.user_id || p.owner_id] || null
  }));

  // 分页
  const total = allList.length;
  const start = (parseInt(page) - 1) * parseInt(pageSize);
  const list = allList.slice(start, start + parseInt(pageSize));

  resp.success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
}));

router.get('/public/:id', asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper || paper.status !== 'published') {
    return resp.notFound(res, '试卷不存在或未发布');
  }

  const owner = paper.owner_id ? await repo.getUserById(paper.owner_id) : null;

  resp.success(res, {
    id: paper.id,
    title: paper.title,
    description: paper.description,
    duration: paper.duration,
    time_limit: paper.duration || 60,
    status: paper.status,
    total_score: paper.total_score || 0,
    passing_score: paper.passing_score || 60,
    allow_all_users: true,
    trainer: owner ? { id: owner.id, username: owner.username, avatar: owner.avatar } : null
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const owner = paper.owner_id ? await repo.getUserById(paper.owner_id) : null;

  resp.success(res, {
    ...paper,
    owner: owner ? { id: owner.id, username: owner.username, avatar: owner.avatar } : null
  });
}));

router.get('/:id/questions', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  try {
    const paperQuestionRelations = await repo.getPaperQuestions(req.params.id);

    if (paperQuestionRelations.length === 0) {
      return resp.success(res, { list: [], total: 0 });
    }

    const questionIds = paperQuestionRelations.map(r => r.question_id);
    const allQuestions = await repo.getQuestions();
    const questionsMap = {};
    (allQuestions || []).forEach(q => { questionsMap[q.id] = q; });

    const paperQuestions = paperQuestionRelations.map(r => {
      const q = questionsMap[r.question_id];
      if (!q) return null;
      return {
        id: q.id,
        title: q.title,
        type: q.type,
        options: q.options,
        answer: q.answer,
        score: r.score || q.score || 10,
        order: r.order,
        explanation: q.explanation
      };
    }).filter(q => q !== null);

    resp.success(res, { list: paperQuestions, total: paperQuestions.length });
  } catch (e) {
    console.error('[Papers] getPaperQuestions error:', e.message);
    resp.error(res, e.message || '获取题目失败');
  }
}));

router.post('/', authenticate, validate(schemas.paperCreate), asyncHandler(async (req, res) => {
  const { title, description, duration, question_ids, random_config, status, passing_score } = req.body;

  const paperData = {
    title,
    description: description || '',
    owner_id: req.user.id,
    duration: duration || 60,
    total_score: 0,
    question_ids: question_ids || [],
    random_config: random_config || {},
    status: status || 'draft',
    passing_score: passing_score || 60
  };

  const paper = await repo.createPaper(paperData);

  if (question_ids && question_ids.length > 0) {
    // 批量获取题目 - 修复 N+1
    const questionsMap = await repo.getQuestionsByIds(question_ids);
    let totalScore = 0;
    for (const qid of question_ids) {
      const q = questionsMap[qid];
      if (q) totalScore += q.score || 10;
    }
    await repo.updatePaper(paper.id, { total_score: totalScore });
    paper.total_score = totalScore;
  }

  resp.success(res, paper, '创建成功');
}));

router.put('/:id', authenticate, validate(schemas.paperUpdate), asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const { title, description, duration, question_ids, status, passing_score } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (duration !== undefined) updates.duration = duration;
  if (status !== undefined) updates.status = status;
  if (passing_score !== undefined) updates.passing_score = passing_score;
  if (question_ids !== undefined) {
    updates.question_ids = question_ids;
    // 批量获取题目
    const questionsMap = await repo.getQuestionsByIds(question_ids);
    let totalScore = 0;
    for (const qid of question_ids) {
      const q = questionsMap[qid];
      if (q) totalScore += q.score || 10;
    }
    updates.total_score = totalScore;
  }

  const updated = await repo.updatePaper(req.params.id, updates);
  resp.success(res, updated, '更新成功');
}));

router.post('/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  if (!paper.question_ids || paper.question_ids.length === 0) {
    return resp.error(res, '试卷暂无题目');
  }

  const baseUrl = req.app.locals.BASE_URL || process.env.FRONTEND_URL || config.FRONTEND_URL;
  const accessUrl = baseUrl ? `${baseUrl}/exam/${paper.id}` : `http://localhost:${process.env.PORT || 3000}/exam/${paper.id}`;
  const qrcodeDataUrl = await QRCode.toDataURL(accessUrl);

  await repo.updatePaper(paper.id, { status: 'published' });

  resp.success(res, { paper_id: paper.id, access_url: accessUrl, qrcode: qrcodeDataUrl }, '发布成功');
}));

// 从试卷移除单题
router.delete('/:id/questions/:questionId', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }
  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  try {
    const questionId = parseInt(req.params.questionId);
    if (isNaN(questionId)) {
      return resp.error(res, '无效的题目ID');
    }

    const result = await repo.removeQuestionFromPaper(req.params.id, questionId);

    if (result && result.affectedRows > 0) {
      resp.success(res, null, '移除成功');
    } else {
      resp.error(res, '题目不在试卷中');
    }
  } catch (e) {
    console.error('[Papers] removeQuestion error:', e.message);
    resp.error(res, e.message || '移除失败');
  }
}));

// 批量添加题目到试卷
router.post('/:id/questions', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }
  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const { question_ids } = req.body;
  if (!Array.isArray(question_ids)) {
    return resp.error(res, 'question_ids 必须是数组');
  }

  try {
    const result = await repo.addQuestionsToPaper(paper.id, question_ids);
    resp.success(res, result, `成功添加 ${result.addedCount} 道题目`);
  } catch (e) {
    console.error('[Papers] addQuestionsToPaper error:', e.message);
    resp.error(res, e.message || '添加题目失败');
  }
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  await repo.deletePaper(req.params.id);
  resp.success(res, null, '删除成功');
}));

// 取消发布试卷
router.post('/:id/unpublish', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  if (paper.status !== 'published') {
    return resp.error(res, '试卷未发布');
  }

  await repo.updatePaper(req.params.id, { status: 'draft' });
  resp.success(res, null, '取消发布成功');
}));

// 获取试卷考试地址
router.get('/:id/exam-url', authenticate, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  if (paper.status !== 'published') {
    return resp.error(res, '试卷未发布');
  }

  const baseUrl = req.app.locals.BASE_URL || process.env.FRONTEND_URL || config.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const accessUrl = `${baseUrl}/exam/${paper.id}`;

  resp.success(res, { paper_id: paper.id, access_url: accessUrl });
}));

// 随机组卷
router.post('/random', authenticate, validate(schemas.randomPaper), asyncHandler(async (req, res) => {
  const { title, count, duration, category_ids, question_types, difficulty } = req.body;

  // 白名单校验
  const safeCategoryIds = Array.isArray(category_ids)
    ? category_ids.map(id => parseInt(id)).filter(id => !isNaN(id))
    : [];

  const safeQuestionTypes = Array.isArray(question_types)
    ? question_types.filter(t => ['single', 'multiple', 'judge', 'subjective'].includes(t))
    : [];

  const safeDifficulty = Array.isArray(difficulty)
    ? difficulty.filter(d => ['easy', 'medium', 'hard'].includes(d))
    : [];

  // 通过 repository 统一查询
  const questions = await repo.randomQuestions({
    count,
    user_id: req.user.role !== 'admin' ? req.user.id : null,
    category_ids: safeCategoryIds,
    question_types: safeQuestionTypes,
    difficulty: safeDifficulty
  });

  if (questions.length === 0) {
    return resp.error(res, '没有符合条件的题目');
  }

  if (questions.length < count) {
    return resp.error(res, `符合条件的题目只有 ${questions.length} 道，少于要求的 ${count} 道`);
  }

  const totalScore = questions.reduce((sum, q) => sum + (q.score || 10), 0);

  const paperData = {
    title,
    description: `随机抽取${questions.length}道题目`,
    owner_id: req.user.id,
    duration: duration || 60,
    total_score: totalScore,
    question_ids: questions.map(q => q.id),
    random_config: { category_ids: safeCategoryIds, question_types: safeQuestionTypes, difficulty: safeDifficulty, count },
    status: 'draft',
    passing_score: Math.round(totalScore * 0.6)
  };

  const paper = await repo.createPaper(paperData);

  resp.success(res, { paper, question_count: questions.length }, '创建成功');
}));

module.exports = router;
