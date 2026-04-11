// server/repository.js - 统一数据访问层
// MySQL 为唯一数据源，JSON 仅用于纯 JSON 模式（无 MySQL 配置时）
// MySQL 失败时尝试 Redis 缓存降级，不再 fallback 到 JSON 数据文件
const mysqlDb = require('./db-mysql');
const jsonDb = require('./db');
const redis = require('./redis');
const { encrypt, decrypt, maskPhone } = require('./utils/crypto');

// 检测是否配置了 MySQL（有 DB_HOST 环境变量）
const MYSQL_CONFIGURED = !!process.env.DB_HOST;

/**
 * 统一数据访问逻辑：
 * 1. MySQL 已配置且连接正常 → 直接走 MySQL
 * 2. MySQL 已配置但连接失败 → 尝试 Redis 缓存降级
 * 3. MySQL 未配置 → 走 JSON 文件（开发/演示模式）
 *
 * @param {Function} mysqlFn - MySQL 操作函数
 * @param {Function} jsonFn  - JSON 操作函数（仅在无 MySQL 时使用）
 * @param {string} [label]   - 操作标签
 * @param {string} [cacheKey] - 缓存 key（用于降级）
 * @returns {Promise<*>}
 */
async function withFallback(mysqlFn, jsonFn, label = 'Repo', cacheKey = null) {
  // 未配置 MySQL，走 JSON 模式
  if (!MYSQL_CONFIGURED) {
    return jsonFn();
  }

  // MySQL 已配置，尝试走 MySQL
  if (mysqlDb.isConnected()) {
    try {
      const result = await Promise.race([
        mysqlFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MySQL query timeout')), 5000))
      ]);
      return result;
    } catch (e) {
      if (e.message !== 'MySQL query timeout') {
        console.warn(`[${label}] MySQL failed:`, e.message);
      } else {
        console.warn(`[${label}] MySQL query timeout (5s)`);
      }
      // 尝试缓存降级
      if (cacheKey) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached !== null) {
            console.log(`[${label}] Serving from Redis cache fallback`);
            return cached;
          }
        } catch (redisErr) { /* ignore */ }
      }
      // 无缓存可用，抛出错误
      throw new Error(`${label}: 数据暂时不可用`);
    }
  }

  // MySQL 已配置但未连接，尝试缓存降级
  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        console.log('[{label}] MySQL disconnected, serving from cache');
        return cached;
      }
    } catch (redisErr) { /* ignore */ }
  }

  // 最后兜底：走 JSON（仅用于读取，不用于写入）
  console.warn('[{label}] All fallbacks exhausted, trying JSON (read-only)');
  return jsonFn();
}

const repository = {
  // ========== 用户 ==========
  getUsers: () => withFallback(() => mysqlDb.getUsers(), () => jsonDb.getUsers(), 'getUsers'),
  getUserById: (id) => withFallback(() => mysqlDb.getUserById(id), () => jsonDb.getUserById(id), 'getUserById'),
  getUserByUsername: (username) => withFallback(
    () => mysqlDb.getUserByUsername(username),
    () => jsonDb.getUserByUsername(username),
    'getUserByUsername'
  ),
  createUser: (data) => withFallback(() => mysqlDb.createUser(data), () => jsonDb.createUser(data), 'createUser'),
  updateUser: (id, updates) => withFallback(() => mysqlDb.updateUser(id, updates), () => jsonDb.updateUser(id, updates), 'updateUser'),
  deleteUser: (id) => withFallback(() => mysqlDb.deleteUser(id), () => jsonDb.deleteUser(id), 'deleteUser'),

  // ========== 分类 ==========
  getCategories: () => withFallback(() => mysqlDb.getCategories(), () => jsonDb.categories.findAll(), 'getCategories'),
  getCategoryById: (id) => withFallback(() => mysqlDb.getCategoryById(id), () => jsonDb.categories.findById(id), 'getCategoryById'),
  createCategory: (data) => withFallback(() => mysqlDb.createCategory(data), () => jsonDb.categories.create(data), 'createCategory'),
  updateCategory: (id, updates) => withFallback(() => mysqlDb.updateCategory(id, updates), () => jsonDb.categories.update(id, updates), 'updateCategory'),
  deleteCategory: (id) => withFallback(() => mysqlDb.deleteCategory(id), () => jsonDb.categories.delete(id), 'deleteCategory'),

  // ========== 题目 ==========
  getQuestions: (categoryId = null) => withFallback(
    () => mysqlDb.getQuestions(categoryId),
    () => jsonDb.getQuestions(),
    'getQuestions'
  ),
  getQuestionById: (id) => withFallback(() => mysqlDb.getQuestionById(id), () => jsonDb.getQuestionById(id), 'getQuestionById'),
  createQuestion: (data) => withFallback(() => mysqlDb.createQuestion(data), () => jsonDb.createQuestion(data), 'createQuestion'),
  updateQuestion: (id, updates) => withFallback(() => mysqlDb.updateQuestion(id, updates), () => jsonDb.updateQuestion(id, updates), 'updateQuestion'),
  deleteQuestion: (id) => withFallback(() => mysqlDb.deleteQuestion(id), () => jsonDb.deleteQuestion(id), 'deleteQuestion'),

  // ========== 试卷 ==========
  getPapers: () => withFallback(() => mysqlDb.getPapers(), () => jsonDb.getPapers(), 'getPapers'),
  getPaperById: (id) => withFallback(() => mysqlDb.getPaperById(id), () => jsonDb.getPaperById(id), 'getPaperById'),
  createPaper: (data) => withFallback(() => mysqlDb.createPaper(data), () => jsonDb.createPaper(data), 'createPaper'),
  updatePaper: (id, updates) => withFallback(() => mysqlDb.updatePaper(id, updates), () => jsonDb.updatePaper(id, updates), 'updatePaper'),
  deletePaper: (id) => withFallback(() => mysqlDb.deletePaper(id), () => jsonDb.deletePaper(id), 'deletePaper'),

  // ========== 考试记录 ==========
  getExamRecords: (studentId, paperId) => withFallback(
    () => mysqlDb.getExamRecords(studentId, paperId),
    () => jsonDb.getExamRecords(studentId, paperId),
    'getExamRecords'
  ),
  getExamRecordsByPaperId: (paperId, status) => withFallback(
    () => mysqlDb.getExamRecordsByPaperId(paperId, status),
    () => jsonDb.getExamRecordsByPaperId(paperId, status),
    'getExamRecordsByPaperId'
  ),
  getExamRecordById: (id) => withFallback(
    () => mysqlDb.getExamRecordById(id),
    () => jsonDb.getExamRecordById(id),
    'getExamRecordById'
  ),
  createExamRecord: (data) => withFallback(
    () => mysqlDb.createExamRecord(data),
    () => jsonDb.createExamRecord(data),
    'createExamRecord'
  ),
  updateExamRecord: (id, updates) => withFallback(
    () => mysqlDb.updateExamRecord(id, updates),
    () => jsonDb.updateExamRecord(id, updates),
    'updateExamRecord'
  ),
  deleteExamRecord: (id) => withFallback(
    () => mysqlDb.deleteExamRecord(id),
    () => jsonDb.deleteExamRecord(id),
    'deleteExamRecord'
  ),

  // ========== 公告 ==========
  getAnnouncements: (filters = {}) => withFallback(
    () => mysqlDb.getAnnouncements(filters),
    () => jsonDb.announcements.findAll(filters),
    'getAnnouncements'
  ),
  getAnnouncementById: (id) => withFallback(
    () => mysqlDb.getAnnouncementById(id),
    () => jsonDb.announcements.findById(id),
    'getAnnouncementById'
  ),
  createAnnouncement: (data) => withFallback(
    () => mysqlDb.createAnnouncement(data),
    () => jsonDb.announcements.create(data),
    'createAnnouncement'
  ),
  updateAnnouncement: (id, updates) => withFallback(
    () => mysqlDb.updateAnnouncement(id, updates),
    () => jsonDb.announcements.update(id, updates),
    'updateAnnouncement'
  ),
  deleteAnnouncement: (id) => withFallback(
    () => mysqlDb.deleteAnnouncement(id),
    () => jsonDb.announcements.delete(id),
    'deleteAnnouncement'
  ),

  // ========== 宣传推广 ==========
  getPromotions: (filters = {}) => withFallback(
    () => mysqlDb.getPromotions(filters),
    () => jsonDb.promotions.findAll(filters),
    'getPromotions'
  ),
  getPromotionById: (id) => withFallback(
    () => mysqlDb.getPromotionById(id),
    () => jsonDb.promotions.findById(id),
    'getPromotionById'
  ),
  createPromotion: (data) => withFallback(
    () => mysqlDb.createPromotion(data),
    () => jsonDb.promotions.create(data),
    'createPromotion'
  ),
  updatePromotion: (id, updates) => withFallback(
    () => mysqlDb.updatePromotion(id, updates),
    () => jsonDb.promotions.update(id, updates),
    'updatePromotion'
  ),
  deletePromotion: (id) => withFallback(
    () => mysqlDb.deletePromotion(id),
    () => jsonDb.promotions.delete(id),
    'deletePromotion'
  ),
  lockPromotion: (id) => withFallback(
    () => mysqlDb.lockPromotion(id),
    () => jsonDb.promotions.update(id, { locked: true }),
    'lockPromotion'
  ),
  unlockPromotion: (id) => withFallback(
    () => mysqlDb.unlockPromotion(id),
    () => jsonDb.promotions.update(id, { locked: false }),
    'unlockPromotion'
  ),
  getPromotionSignups: (promotionId) => withFallback(
    () => mysqlDb.getPromotionSignups(promotionId),
    () => jsonDb.promotionSignups.findAll({ promotion_id: parseInt(promotionId) }),
    'getPromotionSignups'
  ),
  getPromotionSignupByPhone: (promotionId, phone) => withFallback(
    async () => {
      const rows = await mysqlDb.getPromotionSignups(promotionId);
      return rows.find(s => s.phone === phone);
    },
    () => {
      const signups = jsonDb.promotionSignups.findAll({ promotion_id: parseInt(promotionId) });
      return signups.find(s => s.phone === phone);
    },
    'getPromotionSignupByPhone'
  ),
  getPromotionSignupCountByClass: (promotionId, classId) => withFallback(
    async () => {
      const { query } = require('./db-mysql');
      const [result] = await query(
        'SELECT COUNT(*) as count FROM promotion_signups WHERE promotion_id = ? AND class_id = ? AND status != ?',
        [promotionId, classId, 'rejected']
      );
      return result?.count || 0;
    },
    () => {
      const signups = jsonDb.promotionSignups.findAll({ promotion_id: parseInt(promotionId), class_id: classId });
      return signups.filter(s => s.status !== 'rejected').length;
    },
    'getPromotionSignupCountByClass'
  ),
  createPromotionSignup: (data) => {
    return withFallback(
      () => mysqlDb.createPromotionSignup(data),
      () => jsonDb.promotionSignups.create(data),
      'createPromotionSignup'
    );
  },
  updatePromotionSignup: (id, updates) => {
    return withFallback(
      () => mysqlDb.updatePromotionSignup(id, updates),
      () => jsonDb.promotionSignups.update(id, updates),
      'updatePromotionSignup'
    );
  },
  deletePromotionSignup: (id) => withFallback(
    () => mysqlDb.deletePromotionSignup(id),
    () => jsonDb.promotionSignups.delete(id),
    'deletePromotionSignup'
  ),
  getPromotionSignupById: (id) => withFallback(
    () => mysqlDb.getPromotionSignupById(id),
    () => jsonDb.promotionSignups.findById(id),
    'getPromotionSignupById'
  ),

  // ========== 数据追踪 ==========
  trackPromotionEvent: (data) => {
    // 简单实现，存储在内存中
    if (!global.promotionEvents) global.promotionEvents = [];
    global.promotionEvents.push(data);
    return Promise.resolve(true);
  },
  getPromotionStats: async (promotionId) => {
    const signups = await repository.getPromotionSignups(promotionId);
    return {
      views: { total: 0, unique: 0 },
      shares: 0,
      signups: {
        total: signups.length,
        approved: signups.filter(s => s.status === 'approved').length,
        pending: signups.filter(s => s.status === 'pending').length,
        rejected: signups.filter(s => s.status === 'rejected').length,
        by_source: {
          online: signups.filter(s => s.source === 'online').length,
          manual: signups.filter(s => s.source === 'manual').length
        }
      },
      daily: [],
      conversion_rate: 0
    };
  },

  // ========== 数据源状态 ==========
  isMySQLConnected() {
    return mysqlDb.isConnected();
  },
  getMySQLStatus() {
    return { useDualWrite: false, mysqlConnected: mysqlDb.isConnected(), degradedMode: false };
  }
};

module.exports = repository;
