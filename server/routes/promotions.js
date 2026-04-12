// server/routes/promotions.js - 文案促销管理路由 (统一数据访问层)
const express = require('express');
const router = express.Router();
const repo = require('../repository');
const authenticate = require('../middleware/auth');
const { requireAdminOrOwner } = require('../middleware/auth');
const cache = require('../utils/cache');
const { asyncHandler } = require('../middleware/errorHandler');
const resp = require('../utils/response');
const QRCode = require('qrcode');
const XLSX = require('xlsx');

const { rateLimiters } = require('../middleware/rateLimiter');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, locked } = req.query;
  const cacheKey = cache.namespaces.promotions(`${req.user.role}:${status || 'all'}:${locked || 'all'}`);

  const { data, fromCache } = await cache.withCache(
    cacheKey,
    async () => {
      const filters = {};
      if (req.user.role !== 'admin') {
        filters.user_id = req.user.id;
      }
      if (status) filters.status = status;
      if (locked !== undefined) filters.locked = locked === 'true';

      const promotions = await repo.getPromotions(filters);

      // 批量获取创建者信息
      const creatorIds = [...new Set(promotions.map(p => p.created_by).filter(Boolean))];
      const creatorsMap = {};
      await Promise.all(creatorIds.map(async (id) => {
        const user = await repo.getUserById(id);
        if (user) creatorsMap[id] = { id: user.id, username: user.username };
      }));

      // 批量获取报名数量
      const signupCountsMap = {};
      await Promise.all(promotions.map(async (p) => {
        const signups = await repo.getPromotionSignups(p.id);
        signupCountsMap[p.id] = signups.length;
      }));

      const list = promotions.map(p => ({
        ...p,
        creator: creatorsMap[p.created_by] || null,
        signup_count: signupCountsMap[p.id] || 0
      }));

      return { list, total: list.length };
    },
    { ttl: 120 }
  );

  resp.success(res, data);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限查看此文案');
  }

  const creator = await repo.getUserById(promotion.created_by);
  const signups = await repo.getPromotionSignups(promotion.id);
  const signupUsers = await Promise.all(signups.map(async s => {
    const user = s.user_id ? await repo.getUserById(s.user_id) : null;
    return { ...s, user: user ? { id: user.id, username: user.username } : null };
  }));

  resp.success(res, {
    ...promotion,
    creator: creator ? { id: creator.id, username: creator.username } : null,
    signups: signupUsers
  });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { title, content, status, enable_signup } = req.body;

  if (!title) {
    return resp.error(res, '标题不能为空');
  }

  const promotionData = {
    title,
    content: content || '',
    status: status || 'draft',
    enable_signup: enable_signup || false,
    locked: false,
    created_by: req.user.id
  };

  const promotion = await repo.createPromotion(promotionData);
  await cache.clearCache('promotions:list:*', 'Promotions');

  resp.success(res, promotion, '创建成功');
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限编辑此文案');
  }

  if (promotion.locked && req.user.role !== 'admin') {
    return resp.forbidden(res, '文案已锁定，无法编辑');
  }

  const { title, content, status, enable_signup } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (status !== undefined) updates.status = status;
  if (enable_signup !== undefined) updates.enable_signup = enable_signup;

  const updated = await repo.updatePromotion(req.params.id, updates);
  await cache.clearCache('promotions:list:*', 'Promotions');

  resp.success(res, updated, '更新成功');
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限删除此文案');
  }

  if (promotion.locked && req.user.role !== 'admin') {
    return resp.forbidden(res, '文案已锁定，无法删除');
  }

  await repo.deletePromotion(req.params.id);
  await cache.clearCache('promotions:list:*', 'Promotions');

  resp.success(res, null, '删除成功');
}));

router.post('/:id/lock', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return resp.forbidden(res, '只有管理员可以锁定文案');
  }

  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  const updated = await repo.lockPromotion(req.params.id);
  resp.success(res, updated, '锁定成功');
}));

router.post('/:id/unlock', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return resp.forbidden(res, '只有管理员可以解锁文案');
  }

  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  const updated = await repo.unlockPromotion(req.params.id);
  resp.success(res, updated, '解锁成功');
}));

// ==================== 预览功能 ====================

router.get('/:id/preview', asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  const publicUrl = `${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:3000'}/promotion/${promotion.id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });

  resp.success(res, {
    promotion: {
      id: promotion.id,
      title: promotion.title,
      content: promotion.content,
      status: promotion.status,
      enable_signup: promotion.enable_signup,
      signup_config: promotion.signup_config
    },
    public_url: publicUrl,
    qr_code: qrCodeDataUrl
  });
}));

// ==================== 公开访问 ====================

router.get('/:id/public', asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (promotion.status === 'draft') {
    return resp.forbidden(res, '内容暂未发布');
  }

  let signupEnded = false;
  if (promotion.enable_signup && promotion.signup_config?.deadline) {
    signupEnded = new Date() > new Date(promotion.signup_config.deadline);
  }

  resp.success(res, {
    id: promotion.id,
    title: promotion.title,
    content: promotion.content,
    status: promotion.status,
    enable_signup: promotion.enable_signup,
    signup_config: promotion.signup_config,
    signup_ended: signupEnded,
    created_at: promotion.created_at
  });
}));

// ==================== 报名配置 ====================

router.put('/:id/signup-config', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限编辑此文案');
  }

  const { enable_signup, signup_config } = req.body;

  // 验证自定义表单字段配置
  if (signup_config?.fields) {
    const validTypes = ['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'phone', 'email'];
    const invalidFields = signup_config.fields.filter(f => !validTypes.includes(f.type));
    if (invalidFields.length > 0) {
      return resp.error(res, `不支持的字段类型: ${invalidFields.map(f => f.type).join(', ')}`);
    }
  }

  const updates = {
    enable_signup: enable_signup || false,
    signup_config: signup_config || {
      require_approval: false,
      max_signups: null,
      deadline: null,
      classes: [],
      fields: [], // 自定义表单字段
      auto_reply: { // 自动回复配置
        enabled: false,
        title: '报名成功',
        content: '感谢您的报名，我们会尽快与您联系！',
        sms_enabled: false,
        sms_template: '【培训师小助手】{name}您好，您已成功报名《{promotion_title}》，请留意后续通知。'
      }
    }
  };

  const updated = await repo.updatePromotion(req.params.id, updates);
  await cache.clearCache('promotions:list:*', 'Promotions');

  resp.success(res, updated, '报名配置更新成功');
}));

// ==================== 报名管理 ====================

router.get('/:id/signups', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限查看此名单');
  }

  const { keyword, class_id, status, page = 1, pageSize = 50 } = req.query;

  let signups = await repo.getPromotionSignups(req.params.id);

  // 过滤
  if (class_id) signups = signups.filter(s => s.class_id === class_id);
  if (status) signups = signups.filter(s => s.status === status);
  if (keyword) {
    signups = signups.filter(s =>
      s.name?.includes(keyword) || s.phone?.includes(keyword)
    );
  }

  const total = signups.length;
  const start = (parseInt(page) - 1) * parseInt(pageSize);
  signups = signups.slice(start, start + parseInt(pageSize));

  // 统计各班次人数
  const classStats = {};
  signups.forEach(s => {
    const className = s.class_name || '未分类';
    classStats[className] = (classStats[className] || 0) + 1;
  });

  resp.success(res, {
    list: signups,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    class_stats: classStats
  });
}));

// 提交报名（学员）
router.post('/:id/signups', asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (promotion.status !== 'published') {
    return resp.error(res, '文案未发布，无法报名');
  }

  if (!promotion.enable_signup) {
    return resp.error(res, '该文案未开启报名');
  }

  if (promotion.signup_config?.deadline) {
    if (new Date() > new Date(promotion.signup_config.deadline)) {
      return resp.error(res, '报名已截止');
    }
  }

  const { name, phone, class_id } = req.body;

  if (!name || !phone || !class_id) {
    return resp.error(res, '姓名、手机号和报名班次为必填项');
  }

  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return resp.error(res, '手机号格式不正确');
  }

  // 检查是否已报名
  const existingSignup = await repo.getPromotionSignupByPhone(req.params.id, phone);
  if (existingSignup) {
    return resp.error(res, '该手机号已报名，无需重复报名');
  }

  const selectedClass = promotion.signup_config?.classes?.find(c => c.id === class_id);
  if (!selectedClass) {
    return resp.error(res, '所选班次不存在');
  }

  // 检查班次名额
  if (selectedClass.max_count) {
    const currentCount = await repo.getPromotionSignupCountByClass(req.params.id, class_id);
    if (currentCount >= selectedClass.max_count) {
      return resp.error(res, '该班次名额已满');
    }
  }

  // 处理自定义表单字段
  const customFields = {};
  const customFieldsConfig = promotion.signup_config?.fields || [];
  for (const field of customFieldsConfig) {
    if (field.required && !req.body[field.name]) {
      return resp.error(res, `${field.label}为必填项`);
    }
    if (req.body[field.name] !== undefined) {
      customFields[field.name] = req.body[field.name];
    }
  }

  const signupData = {
    promotion_id: parseInt(req.params.id),
    name: name.trim(),
    phone: phone.trim(),
    class_id: class_id,
    class_name: selectedClass.name,
    status: promotion.signup_config?.require_approval ? 'pending' : 'approved',
    source: 'online',
    custom_fields: customFields, // 存储自定义字段数据
    created_at: new Date().toISOString()
  };

  const signup = await repo.createPromotionSignup(signupData);

  // 自动回复信息
  const autoReply = promotion.signup_config?.auto_reply;
  const replyData = autoReply?.enabled ? {
    auto_reply: {
      title: autoReply.title || '报名成功！',
      content: autoReply.content || '感谢您的报名，我们会尽快与您联系！',
      sms_enabled: autoReply.sms_enabled || false
    }
  } : null;

  resp.success(res, { ...signup, ...replyData }, promotion.signup_config?.require_approval ? '报名提交成功，等待审核' : '报名成功');
}));

// 手动添加报名
router.post('/:id/signups/manual', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const { name, unit, phone, class_id } = req.body;
  if (!name || !phone || !class_id) {
    return resp.error(res, '姓名、手机号和报名班次为必填项');
  }

  const selectedClass = promotion.signup_config?.classes?.find(c => c.id === class_id);
  if (!selectedClass) {
    return resp.error(res, '所选班次不存在');
  }

  const signupData = {
    promotion_id: parseInt(req.params.id),
    name: name.trim(),
    unit: unit?.trim() || '',
    phone: phone.trim(),
    class_id: class_id,
    class_name: selectedClass.name,
    status: 'approved',
    source: 'manual',
    created_at: new Date().toISOString()
  };

  const signup = await repo.createPromotionSignup(signupData);
  resp.success(res, signup, '添加成功');
}));

// 修改报名信息
router.put('/:id/signups/:signupId', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const { name, unit, phone, class_id, class_name } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (unit !== undefined) updates.unit = unit?.trim() || '';
  if (phone !== undefined) updates.phone = phone.trim();
  if (class_id !== undefined) updates.class_id = class_id;
  if (class_name !== undefined) updates.class_name = class_name;
  updates.updated_at = new Date().toISOString();

  const updated = await repo.updatePromotionSignup(req.params.signupId, updates);
  resp.success(res, updated, '更新成功');
}));

// 删除报名
router.delete('/:id/signups/:signupId', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  await repo.deletePromotionSignup(req.params.signupId);
  resp.success(res, null, '删除成功');
}));

// 批量审核报名
router.patch('/:id/signups/batch-status', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const { signup_ids, status } = req.body;
  if (!Array.isArray(signup_ids) || signup_ids.length === 0) {
    return resp.error(res, '请选择要操作的报名记录');
  }
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return resp.error(res, '无效的状态');
  }

  const results = [];
  for (const signupId of signup_ids) {
    try {
      const updated = await repo.updatePromotionSignup(signupId, {
        status: status,
        updated_at: new Date().toISOString()
      });
      results.push({ id: signupId, success: true, data: updated });
    } catch (error) {
      results.push({ id: signupId, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const statusText = { approved: '通过', rejected: '拒绝', pending: '设为待审核' };
  resp.success(res, { results, success_count: successCount, total: signup_ids.length }, `批量审核完成，${successCount}/${signup_ids.length} 成功${statusText[status]}`);
}));

// 审核报名
router.patch('/:id/signups/:signupId/status', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return resp.error(res, '无效的状态');
  }

  const updated = await repo.updatePromotionSignup(req.params.signupId, {
    status: status,
    updated_at: new Date().toISOString()
  });

  const statusText = { approved: '通过', rejected: '拒绝', pending: '设为待审核' };
  resp.success(res, updated, `审核${statusText[status]}成功`);
}));

// 查询报名（通过手机号）
router.post('/:id/signups/query', asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  const { phone } = req.body;
  if (!phone) {
    return resp.error(res, '请输入手机号');
  }

  const signup = await repo.getPromotionSignupByPhone(req.params.id, phone);
  if (!signup) {
    return resp.error(res, '未找到报名记录');
  }

  resp.success(res, {
    id: signup.id,
    name: signup.name,
    phone: signup.phone,
    class_name: signup.class_name,
    status: signup.status,
    status_text: { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[signup.status],
    created_at: signup.created_at
  });
}));

// 取消报名
router.post('/:id/signups/:signupId/cancel', asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  const { phone } = req.body;
  if (!phone) {
    return resp.error(res, '请输入手机号验证身份');
  }

  const signup = await repo.getPromotionSignupById(req.params.signupId);
  if (!signup || signup.promotion_id !== parseInt(req.params.id)) {
    return resp.notFound(res, '报名记录不存在');
  }

  if (signup.phone !== phone) {
    return resp.forbidden(res, '手机号不匹配');
  }

  if (signup.status === 'rejected') {
    return resp.error(res, '报名已被拒绝，无需取消');
  }

  // 检查截止时间
  if (promotion.signup_config?.deadline) {
    if (new Date() > new Date(promotion.signup_config.deadline)) {
      return resp.error(res, '报名已截止，无法取消');
    }
  }

  await repo.updatePromotionSignup(req.params.signupId, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString()
  });

  resp.success(res, null, '报名已取消');
}));

// 导出报名Excel
router.get('/:id/signups/export', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const signups = await repo.getPromotionSignups(req.params.id);

  const data = signups.map((s, index) => ({
    '序号': index + 1,
    '姓名': s.name,
    '单位': s.unit || '-',
    '手机号': s.phone,
    '报名班次': s.class_name || '-',
    '报名时间': new Date(s.created_at).toLocaleString('zh-CN'),
    '状态': s.status === 'approved' ? '已通过' : s.status === 'rejected' ? '已拒绝' : '待审核',
    '来源': s.source === 'online' ? '在线报名' : '手动添加'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '报名名单');

  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
    { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 }
  ];

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=报名名单-${promotion.title}-${Date.now()}.xlsx`);
  res.send(buffer);
}));

// ==================== 数据追踪 ====================

// 记录访问/分享事件
router.post('/:id/track', asyncHandler(async (req, res) => {
  const { type, source } = req.body; // type: view, share, signup; source: wechat, link, qr
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  // 记录追踪数据
  await repo.trackPromotionEvent({
    promotion_id: parseInt(req.params.id),
    type,
    source: source || 'direct',
    ip: req.ip,
    user_agent: req.headers['user-agent'],
    created_at: new Date().toISOString()
  });

  resp.success(res, { tracked: true });
}));

// 获取统计数据
router.get('/:id/stats', authenticate, asyncHandler(async (req, res) => {
  const promotion = await repo.getPromotionById(req.params.id);
  if (!promotion) {
    return resp.notFound(res, '文案不存在');
  }

  if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
    return resp.forbidden(res, '无权限查看统计数据');
  }

  const { start_date, end_date } = req.query;
  const stats = await repo.getPromotionStats(req.params.id, { start_date, end_date });

  resp.success(res, stats);
}));

module.exports = router;
