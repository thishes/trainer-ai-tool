const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { resp } = require('../utils/response');
const { authenticate, requireAdminOrOwner } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { asyncHandler } = require('../middleware/asyncHandler');
const { Joi } = require('../middleware/schemas');
const repo = require('../repository');

function buildChapterTree(chapters) {
  const map = {};
  const roots = [];
  for (const ch of chapters) {
    ch.children = [];
    map[ch.id] = ch;
  }
  for (const ch of chapters) {
    if (ch.parent_id && map[ch.parent_id]) {
      map[ch.parent_id].children.push(ch);
    } else {
      roots.push(ch);
    }
  }
  return roots;
}

router.get('/', authenticate, validateRequest('courseList'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 12, 50);
  const isAdmin = req.user.role === 'admin';
  const options = {
    userId: isAdmin ? null : req.user.id,
    isAdmin,
    status: req.query.status || undefined,
    search: req.query.search || undefined,
    page, pageSize
  };
  const [list, total] = await Promise.all([
    repo.getCourses(options),
    repo.getCourseCount(options)
  ]);
  resp.success(res, {
    list, records: list,
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  });
}));

router.post('/', authenticate, validateRequest('courseCreate'), asyncHandler(async (req, res) => {
  const data = {
    ...req.body,
    user_id: req.user.id,
    status: 'draft',
    slug: req.body.slug || `course-${Date.now()}`
  };
  const course = await repo.createCourse(data);
  console.log(`[COURSE_CREATE] { course_id: ${course.id}, title: "${data.title}", user_id: ${req.user.id}, timestamp: "${new Date().toISOString()}" }`);
  resp.success(res, course, 201);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限查看此课程');
  const chapters = await repo.getChapters(course.id);
  resp.success(res, { ...course, chapters: buildChapterTree(chapters), chapterCount: chapters.length });
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限编辑此课程');
  await repo.updateCourse(course.id, req.body);
  const updated = await repo.getCourseById(course.id);
  resp.success(res, updated);
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限删除此课程');
  await repo.deleteCourse(course.id);
  console.log(`[COURSE_DELETE] { course_id: ${course.id}, deleted_by: ${req.user.id} }`);
  resp.success(res, { message: '删除成功' });
}));

router.patch('/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限操作此课程');
  const newStatus = course.status === 'published' ? 'draft' : 'published';
  if (newStatus === 'published') {
    const chapters = await repo.getChapters(course.id, { status: 'published' });
    if (!chapters.length) return resp.error(res, '发布前至少需要一个已发布的章节', 400);
  }
  await repo.publishCourse(course.id, newStatus);
  console.log(`[COURSE_PUBLISH] { course_id: ${course.id}, status: "${newStatus}", by: ${req.user.id } }`);
  resp.success(res, { id: course.id, status: newStatus });
}));

// ========== 章节管理 ==========

router.get('/:id/chapters', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限查看此课程章节');
  const options = {};
  if (req.query.status) options.status = req.query.status;
  const chapters = await repo.getChapters(course.id, options);
  resp.success(res, { chapters: buildChapterTree(chapters), flatList: chapters });
}));

router.post('/:id/chapters', authenticate, validateRequest('chapterCreate'), asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限操作此课程');
  const maxOrder = await repo.getChapters(course.id);
  const data = {
    ...req.body,
    course_id: course.id,
    sort_order: maxOrder.length
  };
  const chapter = await repo.createChapter(data);
  resp.success(res, chapter, 201);
}));

router.put('/:courseId/chapters/:chapterId', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.courseId);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限操作此课程章节');
  await repo.updateChapter(req.params.chapterId, req.body);
  const updated = await repo.getChapterById(req.params.chapterId);
  resp.success(res, updated);
}));

router.delete('/:courseId/chapters/:chapterId', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.courseId);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限删除此章节');
  const allChapters = await repo.getChapters(course.id);
  if (allChapters.length <= 1) return resp.error(res, '至少需要保留一个章节', 400);
  await repo.deleteChapter(req.params.chapterId);
  resp.success(res, { message: '删除成功' });
}));

router.put('/:id/chapters/reorder', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const orders = Array.isArray(req.body.orders) ? req.body.orders : [];
  if (orders.length > 200) return resp.error(res, '排序数量超出限制', 400);
  await repo.reorderChapters(course.id, orders);
  resp.success(res, { message: '排序更新成功' });
}));

// ========== 权限管理 ==========

router.get('/:id/access', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限查看授权列表');
  const accessList = await repo.getCourseAccessList(course.id);
  resp.success(res, { access_list: accessList });
}));

router.post('/:id/access', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限管理授权');
  const userIds = Array.isArray(req.body.user_ids) ? req.body.user_ids : [req.body.user_id];
  for (const uid of userIds) {
    if (uid) await repo.addCourseAccess(course.id, uid, req.user.id);
  }
  resp.success(res, { message: '授权添加成功' });
}));

router.delete('/:id/access/:userId', authenticate, asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  const isAdmin = req.user.role === 'admin';
  const isOwner = course.user_id === req.user.id;
  if (!isAdmin && !isOwner) return resp.forbidden(res, '无权限移除授权');
  await repo.removeCourseAccess(course.id, req.params.userId);
  resp.success(res, { message: '授权移除成功' });
}));

// ========== 公开访问（无需认证）==========

router.get('/public/courses/:id', asyncHandler(async (req, res) => {
  let course;
  if (/^\d+$/.test(req.params.id)) {
    course = await repo.getCourseById(req.params.id);
  } else {
    course = await repo.getCourseBySlug(req.params.id);
  }
  if (!course) return resp.notFound(res, '课程不存在');
  if (course.status !== 'published') return resp.error(res, '该课程暂未发布', 403);
  if (course.visibility === 'private') {
    if (!req.user) return resp.error(res, '该课程需要登录后访问', 401);
    if (req.user.role !== 'admin') {
      const hasAccess = await repo.checkCourseAccess(course.id, req.user.id);
      if (!hasAccess) return resp.error(res, '您没有访问该课程的权限', 403);
    }
  }
  const chapters = await repo.getChapters(course.id, { status: 'published' });
  await repo.incrementCourseView(course.id);
  resp.success(res, { ...course, chapters: buildChapterTree(chapters), chapterCount: chapters.length });
}));

router.get('/public/courses/:id/chapters', asyncHandler(async (req, res) => {
  let course;
  if (/^\d+$/.test(req.params.id)) {
    course = await repo.getCourseById(req.params.id);
  } else {
    course = await repo.getCourseBySlug(req.params.id);
  }
  if (!course) return resp.notFound(res, '课程不存在');
  if (course.status !== 'published') return resp.error(res, '该课程暂未发布', 403);
  const chapters = await repo.getChapters(course.id, { status: 'published' });
  resp.success(res, { chapters: buildChapterTree(chapters), flatList: chapters });
}));

router.get('/public/courses/:courseId/chapters/:chapterId', asyncHandler(async (req, res) => {
  const chapter = await repo.getChapterById(req.params.chapterId);
  if (!chapter) return resp.notFound(res, '章节不存在');
  let course = await repo.getCourseById(chapter.course_id);
  if (!course) return resp.notFound(res, '所属课程不存在');
  if (course.status !== 'published') return resp.error(res, '该课程暂未发布', 403);
  if (chapter.status !== 'published') return resp.notFound(res, '该章节暂未发布');
  await repo.incrementCourseView(course.id);
  resp.success(res, { ...chapter, course_title: course.title, course_id: course.id });
}));

router.post('/public/courses/:id/unlock', asyncHandler(async (req, res) => {
  const course = await repo.getCourseById(req.params.id);
  if (!course) return resp.notFound(res, '课程不存在');
  if (course.visibility !== 'password') return resp.error(res, '该课程不需要密码', 400);
  if (!req.body.password) return resp.error(res, '请输入密码', 400);
  if (course.access_password !== req.body.password) return resp.error(res, '密码错误', 401);
  resp.success(res, { unlocked: true, course_id: course.id });
}));

module.exports = router;
