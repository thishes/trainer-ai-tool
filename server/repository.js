// server/repository.js - 统一数据访问层
// MySQL 为唯一数据源，JSON 仅用于纯 JSON 模式（无 MySQL 配置时）
// MySQL 失败时尝试 Redis 缓存降级，不再 fallback 到 JSON 数据文件
const mysqlDb = require('./db-mysql');
const jsonDb = require('./db');
const redis = require('./redis');
const { encrypt, decrypt, maskPhone } = require('./utils/crypto');

// JSON 字段解析（MySQL 存储 JSON 字段为字符串，需要解析）
function parseJSONField(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

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
    console.log(`[${label}] MySQL not configured, using JSON fallback`);
    return jsonFn();
  }

  // MySQL 已配置但未连接，尝试建立连接（带超时）
  if (!mysqlDb.isConnected()) {
    console.log(`[${label}] MySQL not connected, attempting health check with 8s timeout...`);
    try {
      const result = await Promise.race([
        mysqlDb.healthCheck(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 8000))
      ]);
      console.log(`[${label}] Health check result:`, result, ', isConnected:', mysqlDb.isConnected());
    } catch (e) {
      console.warn(`[${label}] Health check failed:`, e.message, ', isConnected:', mysqlDb.isConnected());
    }
  }

  // MySQL 已配置，尝试走 MySQL
  if (mysqlDb.isConnected()) {
    console.log(`[${label}] MySQL connected, executing query...`);
    try {
      const result = await Promise.race([
        mysqlFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MySQL query timeout')), 8000))
      ]);
      console.log(`[${label}] Query successful, returned`, Array.isArray(result) ? result.length : 'non-array', 'items');
      return result;
    } catch (e) {
      if (e.message !== 'MySQL query timeout') {
        console.warn(`[${label}] MySQL query failed:`, e.message);
      } else {
        console.warn(`[${label}] MySQL query timeout (15s)`);
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
  } else {
    console.log(`[${label}] MySQL still not connected, falling back to JSON`);
  }

  // 最后兜底：走 JSON（仅用于读取，不用于写入）
  console.warn(`[${label}] All fallbacks exhausted, trying JSON (read-only)`);
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
  changePassword: (id, oldPassword, newPassword) => withFallback(() => mysqlDb.changePassword(id, oldPassword, newPassword), () => { throw new Error('JSON fallback not supported'); }, 'changePassword'),
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
  getQuestionsByIds: (ids) => withFallback(
    async () => {
      if (!ids || ids.length === 0) return [];
      const placeholders = ids.map(() => '?').join(',');
      const rows = await mysqlDb.findAll(`SELECT * FROM questions WHERE id IN (${placeholders})`, ids);
      return rows.map(q => ({ ...q, options: parseJSONField(q.options) }));
    },
    () => {
      return ids.map(id => jsonDb.getQuestionById(id)).filter(Boolean);
    },
    'getQuestionsByIds'
  ),
  searchQuestions: async ({ page = 1, pageSize = 20, category_id, type, keyword, status } = {}) => {
    if (!MYSQL_CONFIGURED) {
      // JSON 模式
      let questions = jsonDb.getQuestions();
      if (category_id) questions = questions.filter(q => q.category_id === parseInt(category_id));
      if (type) questions = questions.filter(q => q.type === type);
      if (status) questions = questions.filter(q => q.status === status);
      if (keyword) {
        const kw = keyword.toLowerCase();
        questions = questions.filter(q => q.title && q.title.toLowerCase().includes(kw));
      }
      const total = questions.length;
      const start = (page - 1) * pageSize;
      return { list: questions.slice(start, start + pageSize), total, page, pageSize };
    }

    // MySQL 模式
    let sql = 'SELECT * FROM questions WHERE 1=1';
    const params = [];
    if (category_id) { sql += ' AND category_id = ?'; params.push(parseInt(category_id)); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (keyword) {
      const escapedKeyword = keyword.replace(/[%_\\]/g, '\\$&');
      sql += ' AND title LIKE ?';
      params.push('%' + escapedKeyword + '%');
    }

    // Count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countRows = await mysqlDb.findAll(countSql, params);
    const total = countRows[0]?.total || 0;

    // Paginate - LIMIT/OFFSET 不能用占位符（mysql2 会传字符串导致类型错误）
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limitVal = parseInt(pageSize);
    sql += ' ORDER BY id DESC LIMIT ' + limitVal + ' OFFSET ' + offset;
    const rows = await mysqlDb.findAll(sql, params);
    const list = rows.map(q => ({ ...q, options: parseJSONField(q.options) }));

    return { list, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  },
  randomQuestions: async ({ category_ids, question_types, difficulty, count } = {}) => {
    const numQuestions = Math.min(parseInt(count) || 10, 100);

    if (!MYSQL_CONFIGURED) {
      let questions = jsonDb.getQuestions();
      if (category_ids && category_ids.length) questions = questions.filter(q => category_ids.includes(q.category_id));
      if (question_types && question_types.length) questions = questions.filter(q => question_types.includes(q.type));
      if (difficulty) questions = questions.filter(q => q.difficulty === difficulty);
      // Shuffle and take count
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      return questions.slice(0, numQuestions);
    }

    // MySQL mode
    let sql = 'SELECT * FROM questions WHERE status = ?';
    const params = ['published'];
    if (category_ids && category_ids.length) {
      sql += ' AND category_id IN (' + category_ids.map(() => '?').join(',') + ')';
      params.push(...category_ids.map(id => parseInt(id)));
    }
    if (question_types && question_types.length) {
      sql += ' AND type IN (' + question_types.map(() => '?').join(',') + ')';
      params.push(...question_types);
    }
    if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
    sql += ' ORDER BY RAND() LIMIT ' + numQuestions;
    const rows = await mysqlDb.findAll(sql, params);
    return rows.map(q => ({ ...q, options: parseJSONField(q.options) }));
  },

  // ========== 试卷 ==========
  getPapers: (ownerId) => withFallback(() => mysqlDb.getPapers(ownerId), () => jsonDb.getPapers(ownerId), 'getPapers'),
  getPaperById: (id) => withFallback(() => mysqlDb.getPaperById(id), () => jsonDb.getPaperById(id), 'getPaperById'),
  getPublicPaper: (id) => withFallback(() => mysqlDb.getPaperById(id), () => jsonDb.getPaperById(id), 'getPublicPaper'),
  getPaperByKeyId: (keyId) => withFallback(() => mysqlDb.getPaperByKeyId(keyId), () => null, 'getPaperByKeyId'),
  getPaperQuestionsByPaperKeyId: (keyId) => withFallback(() => mysqlDb.getPaperQuestionsByPaperKeyId(keyId), () => [], 'getPaperQuestionsByPaperKeyId'),
  getPaperStudentsByPaperKeyId: (keyId) => withFallback(() => mysqlDb.getPaperStudentsByPaperKeyId(keyId), () => [], 'getPaperStudentsByPaperKeyId'),
  createPaper: (data) => withFallback(() => mysqlDb.createPaper(data), () => jsonDb.createPaper(data), 'createPaper'),
  updatePaper: (id, updates) => withFallback(() => mysqlDb.updatePaper(id, updates), () => jsonDb.updatePaper(id, updates), 'updatePaper'),
  addQuestionsToPaper: (paperId, questionIds) => withFallback(() => mysqlDb.addQuestionsToPaper(paperId, questionIds), () => { throw new Error('JSON fallback not supported'); }, 'addQuestionsToPaper'),
  getPaperQuestions: (paperId) => withFallback(() => mysqlDb.getPaperQuestions(paperId), () => [], 'getPaperQuestions'),
  removeQuestionFromPaper: (paperId, questionId) => withFallback(() => mysqlDb.removeQuestionFromPaper(paperId, questionId), () => { throw new Error('JSON fallback not supported'); }, 'removeQuestionFromPaper'),
  deletePaper: (id) => withFallback(() => mysqlDb.deletePaper(id), () => jsonDb.deletePaper(id), 'deletePaper'),

  // ========== 考试记录 ==========
  getExamRecordCountByIp: (paperId, ip, status = null) => withFallback(
    async () => {
      let sql = 'SELECT COUNT(*) as count FROM exam_records WHERE paper_id = ? AND ip_address = ?';
      const params = [paperId, ip];
      if (status) { sql += ' AND status = ?'; params.push(status); }
      const rows = await mysqlDb.findAll(sql, params);
      return rows[0]?.count || 0;
    },
    () => {
      // JSON 模式没有 IP 字段，返回 0
      return 0;
    },
    'getExamRecordCountByIp'
  ),
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
    () => mysqlDb.getAnnouncements(filters?.status || null),
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
