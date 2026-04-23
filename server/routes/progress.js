// server/routes/progress.js - 学习进度追踪API
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const repo = require('../repository');
const resp = require('../utils/response');

/**
 * 获取用户的所有课程学习进度列表
 * GET /api/progress
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return resp.unauthorized(res, '请先登录');

  const status = req.query.status || 'all';
  const progressList = await repo.getUserCourseProgress(userId, status);

  const courseIds = [...new Set((progressList || []).map(p => p.course_id))];
  let coursesMap = {};
  if (courseIds.length > 0) {
    const courses = await Promise.all(
      courseIds.map(id => repo.getCourseById(id).catch(() => null))
    );
    courses.filter(Boolean).forEach(c => { coursesMap[c.id] = c; });
  }

  return resp.success(res, (progressList || []).map(p => ({
    ...p,
    course: coursesMap[p.course_id] ? {
      id: coursesMap[p.course_id].id,
      title: coursesMap[p.course_id].title,
      cover_url: coursesMap[p.course_id].cover_url,
      slug: coursesMap[p.course_id].slug,
      chapter_count: coursesMap[p.course_id].chapter_count || 0
    } : null
  })));
}));

/**
 * 获取某课程的详细进度 + 断点续学信息
 * GET /api/progress/course/:courseId
 */
router.get('/course/:courseId', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return resp.unauthorized(res, '请先登录');

  const progress = await repo.getCourseProgress(userId, req.params.courseId);
  if (!progress) return resp.success(res, { exists: false });

  return resp.success(res, {
    exists: true,
    ...progress,
    chapters_completed: typeof progress.chapters_completed === 'string'
      ? JSON.parse(progress.chapters_completed || '[]')
      : (progress.chapters_completed || []),
    formatted_time_spent: formatTimeSpent(progress.time_spent),
    last_accessed_relative: getRelativeTime(progress.last_accessed_at)
  });
}));

/**
 * 自动保存学习进度（前端定时调用）
 * POST /api/progress/update
 */
router.post('/update', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return resp.unauthorized(res, '请先登录');

  const { course_id, chapter_id, progress_percent, last_position } = req.body;
  if (!course_id) return resp.error(res, '缺少course_id', 400);

  const course = await repo.getCourseById(course_id);
  if (!course) return resp.notFound(res, '课程不存在');

  let progress = await repo.getCourseProgress(userId, course_id);

  const updateData = {
    chapter_id: chapter_id || (progress?.chapter_id || 0),
    progress_percent: Math.min(100, Math.max(0, progress_percent || 0)),
    last_position: last_position ? JSON.stringify(last_position) : null,
    time_spent: (progress?.time_spent || 0) + 30,
    status: 'in_progress',
    updated_at: new Date()
  };

  if (chapter_id > 0) {
    try {
      const ch = await repo.getChapterById(course_id, chapter_id);
      if (ch) updateData.last_chapter_title = ch.title;
    } catch(e) {}
  }

  // 更新已完成章节列表（进度>=80%才标记）
  let completed = [];
  if (progress?.chapters_completed) {
    completed = typeof progress.chapters_completed === 'string'
      ? JSON.parse(progress.chapters_completed)
      : progress.chapters_completed;
  }
  if (chapter_id && !completed.includes(chapter_id) && (updateData.progress_percent >= 80)) {
    completed.push(chapter_id);
    updateData.chapters_completed = JSON.stringify(completed);
  }

  if (updateData.progress_percent >= 100) {
    updateData.status = 'completed';
    updateData.completed_at = new Date();
  }

  let result;
  if (progress) {
    result = await repo.updateCourseProgress(userId, course_id, updateData);
  } else {
    result = await repo.createCourseProgress({
      user_id: userId, course_id, ...updateData,
      started_at: new Date()
    });
  }

  return resp.success(res, { success: true, progress: result });
}));

/**
 * 标记完成
 * POST /api/progress/:courseId/complete
 */
router.post('/:courseId/complete', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return resp.unauthorized(res, '请先登录');

  const result = await repo.updateCourseProgress(userId, req.params.courseId, {
    status: 'completed', progress_percent: 100, completed_at: new Date()
  });
  return result
    ? resp.success(res, { success: true, message: '恭喜！您已完成本课程' })
    : resp.error(res, '未找到学习记录', 404);
}));

/**
 * "继续学习"推荐
 * GET /api/progress/continue-learning
 */
router.get('/continue-learning', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return resp.unauthorized(res, '请先登录');

  const recent = await repo.getRecentCourseProgress(userId, 5);
  return resp.success(res, (recent || [])
    .filter(p => p.status === 'in_progress' && p.progress_percent < 100)
    .slice(0, 3));
}));

function formatTimeSpent(s) {
  if (!s) return '0分钟';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
}

function getRelativeTime(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hrs < 24) return `${hrs}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(d).toLocaleDateString();
}

module.exports = router;
