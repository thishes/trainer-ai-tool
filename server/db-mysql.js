const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 33060,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'trainer_ai_tool',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000
};

let pool = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      waitForConnections: DB_CONFIG.waitForConnections,
      connectionLimit: DB_CONFIG.connectionLimit,
      queueLimit: DB_CONFIG.queueLimit,
      connectTimeout: DB_CONFIG.connectTimeout,
      enableKeepAlive: DB_CONFIG.enableKeepAlive,
      keepAliveInitialDelay: DB_CONFIG.keepAliveInitialDelay
    });

    pool.on('connection', (conn) => {
      isConnected = true;
      reconnectAttempts = 0;
    });

    pool.on('error', (err) => {
      console.error('[MySQL] Pool error:', err.code, err.message);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
        isConnected = false;
      }
    });
  }
  return pool;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryWithRetry(sql, params = [], maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(sql, params);
      isConnected = true;
      reconnectAttempts = 0;
      return rows;
    } catch (error) {
      lastError = error;
      isConnected = false;
      console.error(`[MySQL] Query attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = RECONNECT_DELAY_BASE * Math.pow(2, attempt - 1);
        console.log(`[MySQL] Retrying in ${delay}ms...`);
        await sleep(delay);

        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'PROTOCOL_CONNECTION_LOST') {
          pool = null;
        }
      }
    }
  }
  throw lastError;
}

async function query(sql, params = []) {
  return queryWithRetry(sql, params);
}

async function findOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function findAll(sql, params = []) {
  return query(sql, params);
}

async function insert(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

async function update(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

async function remove(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

async function healthCheck() {
  const timeout = parseInt(process.env.DB_CONNECT_TIMEOUT) || 5000;
  try {
    const pool = getPool();
    const result = await Promise.race([
      pool.execute('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), timeout))
    ]);
    isConnected = true;
    return true;
  } catch (error) {
    isConnected = false;
    console.error('[MySQL] Health check failed:', error.code, error.message);

    // 连接池失败时，销毁旧池以便下次 getPool() 重建
    if (pool) {
      try {
        await pool.end();
      } catch (e) { /* ignore */ }
      pool = null;
      console.log('[MySQL] Pool destroyed, will recreate on next query');
    }

    // 尝试独立连接验证 MySQL 服务是否可用
    try {
      const standalone = await mysql.createConnection({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
        connectTimeout: timeout
      });
      try {
        await standalone.execute('SELECT 1');
        console.log('[MySQL] ✅ Standalone connection works (pool has issues), threadId:', standalone.threadId);
        isConnected = true;
        return true;
      } finally {
        await standalone.end();
      }
    } catch(e2) {
      console.error('[MySQL] ❌ MySQL server unreachable:', e2.code, e2.message);
      isConnected = false;
      return false;
    }
  }
}

async function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[MySQL] Max reconnection attempts reached');
    return false;
  }

  reconnectAttempts++;
  console.log(`[MySQL] Attempting reconnection (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  try {
    // 先销毁旧池
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
      isConnected = false;
    }

    // 先用独立连接验证 MySQL 可达
    const testConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      connectTimeout: 15000
    });
    await testConn.end();
    console.log('[MySQL] ✅ Standalone test connection successful');

    // MySQL 可达，重建连接池
    const newPool = getPool();
    await newPool.execute('SELECT 1');
    isConnected = true;
    reconnectAttempts = 0;
    console.log('[MySQL] Reconnection successful');
    return true;
  } catch (error) {
    console.error('[MySQL] Reconnection failed:', error.code, error.message);
    return false;
  }
}

function normalizeQuestionType(type) {
  if (type === 'choice') return 'single';
  return type;
}

const counters = { users: 1, categories: 1, questions: 1, papers: 1, exam_records: 1, essay_scores: 1, announcements: 1, promotions: 1, promotion_signups: 1 };
const counterLocks = new Map();
const counterPromises = new Map();

async function initializeCounters() {
  try {
    const tables = ['users', 'categories', 'questions', 'papers', 'exam_records', 'essay_scores', 'announcements', 'promotions', 'promotion_signups'];
    for (const table of tables) {
      try {
        const [rows] = await getPool().execute(`SELECT MAX(id) as maxId FROM ${table}`);
        if (rows[0] && rows[0].maxId) {
          counters[table] = rows[0].maxId + 1;
        }
      } catch (err) {
        console.warn(`[MySQL] Failed to initialize counter for ${table}:`, err.message);
      }
    }
    isConnected = true;
    console.log('[MySQL] Counters initialized:', counters);
  } catch (error) {
    console.error('[MySQL] Counter initialization failed:', error.message);
    isConnected = false;
  }
}

async function nextId(collection) {
  if (counterPromises.has(collection)) {
    return counterPromises.get(collection);
  }

  const promise = (async () => {
    try {
      const [rows] = await getPool().execute(`SELECT COALESCE(MAX(id), 0) as maxId FROM ${collection}`);
      const maxId = rows[0] ? rows[0].maxId : 0;
      const newId = maxId + 1;
      counters[collection] = newId + 1;
      return newId;
    } catch (e) {
      console.warn(`[nextId] Failed to get max id for ${collection}, using counter:`, e.message);
      const fallbackId = counters[collection]++;
      return fallbackId;
    }
  })();

  counterPromises.set(collection, promise);
  return promise.then(result => {
    counterPromises.delete(collection);
    return result;
  });
}

function parseJSONField(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function generateKeyId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `${prefix}${timestamp}${randomPart}`.toUpperCase();
}

const db = {
  query,
  findOne,
  findAll,
  insert,
  update,
  remove,
  counters,
  nextId,
  healthCheck,
  reconnect,
  isConnected: () => isConnected,

  async getUsers() {
    const rows = await findAll('SELECT * FROM users ORDER BY id');
    return rows;
  },

  async getUserById(id) {
    return findOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  async getUserByUsername(username) {
    return findOne('SELECT * FROM users WHERE username = ?', [username]);
  },

  async createUser(user) {
    const id = await nextId('users');
    await insert(
      'INSERT INTO users (id, username, password, role, avatar) VALUES (?, ?, ?, ?, ?)',
      [id, user.username, user.password, user.role || 'user', user.avatar || null]
    );
    return { id, ...user };
  },

  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(id);
    await update(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getUserById(id);
  },

  async changePassword(id, oldPassword, newPassword) {
    const user = await this.getUserById(id);
    if (!user) return null;
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return null;
    const hashed = await bcrypt.hash(newPassword, 10);
    await update('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);
    return user;
  },

  async deleteUser(id) {
    await remove('DELETE FROM users WHERE id = ?', [id]);
    return true;
  },

  async getCategories() {
    const rows = await findAll('SELECT * FROM categories ORDER BY id');
    return rows;
  },

  async getCategoryById(id) {
    return findOne('SELECT * FROM categories WHERE id = ?', [id]);
  },

  async createCategory(category) {
    const id = await nextId('categories');
    await insert(
      'INSERT INTO categories (id, name, description, user_id) VALUES (?, ?, ?, ?)',
      [id, category.name, category.description || null, category.user_id || null]
    );
    return { id, ...category };
  },

  async updateCategory(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(id);
    await update(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getCategoryById(id);
  },

  async deleteCategory(id) {
    await remove('DELETE FROM categories WHERE id = ?', [id]);
    return true;
  },

  async getQuestions(categoryId = null) {
    let sql = 'SELECT * FROM questions';
    const params = [];
    if (categoryId) {
      sql += ' WHERE category_id = ?';
      params.push(categoryId);
    }
    sql += ' ORDER BY id';
    const rows = await findAll(sql, params);
    return rows.map(q => ({
      ...q,
      options: parseJSONField(q.options)
    }));
  },

  async getQuestionById(id) {
    const q = await findOne('SELECT * FROM questions WHERE id = ?', [id]);
    if (q) {
      q.options = parseJSONField(q.options);
    }
    return q;
  },

  async createQuestion(question) {
    const id = await nextId('questions');
    const type = normalizeQuestionType(question.type);
    await insert(
      'INSERT INTO questions (id, title, type, options, answer, difficulty, score, explanation, category_id, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, question.title, type, JSON.stringify(question.options || []), JSON.stringify(question.answer || null), question.difficulty || 'medium', question.score || 10, question.explanation || '', question.category_id || null, question.status || 'draft', question.user_id || null]
    );
    return { id, ...question };
  },

  async updateQuestion(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        // 处理undefined值，转换为null
        const safeValue = value === undefined ? null : value;
        if (key === 'options') {
          fields.push('options = ?');
          values.push(JSON.stringify(safeValue || []));
        } else if (key === 'answer') {
          fields.push('answer = ?');
          values.push(JSON.stringify(safeValue || null));
        } else if (key === 'type' && safeValue === 'choice') {
          fields.push('type = ?');
          values.push('single');
        } else {
          fields.push(`${key} = ?`);
          values.push(safeValue);
        }
      }
    }
    values.push(id);
    await update(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getQuestionById(id);
  },

  async deleteQuestion(id) {
    await remove('DELETE FROM questions WHERE id = ?', [id]);
    return true;
  },

  async getPapers(ownerId = null) {
    let sql = `SELECT p.*, (SELECT COUNT(*) FROM paper_questions WHERE paper_id = p.id) AS question_count FROM papers p`;
    const params = [];
    if (ownerId) {
      sql += ' WHERE p.owner_id = ?';
      params.push(ownerId);
    }
    sql += ' ORDER BY p.id DESC';
    const rows = await findAll(sql, params);
    return rows.map(p => ({
      ...p,
      question_ids: parseJSONField(p.question_ids),
      random_config: parseJSONField(p.random_config),
      question_count: parseInt(p.question_count) || 0
    }));
  },

  async getPaperById(id) {
    const p = await findOne('SELECT * FROM papers WHERE id = ?', [id]);
    if (p) {
      p.question_ids = parseJSONField(p.question_ids);
      p.random_config = parseJSONField(p.random_config);
    }
    return p;
  },

  async getPaperByKeyId(keyId) {
    const p = await findOne('SELECT * FROM papers WHERE key_id = ?', [keyId]);
    if (p) {
      p.question_ids = parseJSONField(p.question_ids);
      p.random_config = parseJSONField(p.random_config);
    }
    return p;
  },

  async getPaperQuestionsByPaperKeyId(keyId) {
    const paper = await this.getPaperByKeyId(keyId);
    if (!paper) return [];
    return this.getPaperQuestions(paper.id);
  },

  async createPaper(paper) {
    const id = await nextId('papers');
    const keyId = paper.key_id || generateKeyId('P');
    await insert(
      'INSERT INTO papers (id, key_id, title, description, owner_id, user_id, duration, total_score, question_ids, random_config, status, passing_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, keyId, paper.title, paper.description || '', paper.owner_id || null, paper.user_id || null, paper.duration || 60, paper.total_score || 100, JSON.stringify(paper.question_ids || []), JSON.stringify(paper.random_config || {}), paper.status || 'draft', paper.passing_score || 60]
    );
    return { id, key_id: keyId, ...paper };
  },

  async updatePaper(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        if (key === 'question_ids' || key === 'random_config') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    values.push(id);
    await update(`UPDATE papers SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getPaperById(id);
  },

  async addQuestionsToPaper(paperId, questionIds) {
    let addedCount = 0;
    const existingQuestions = await this.getPaperQuestions(paperId);
    const existingIds = new Set(existingQuestions.map(q => q.question_id));

    for (const questionId of questionIds) {
      if (!existingIds.has(questionId)) {
        try {
          await insert(
            `INSERT INTO paper_questions (paper_id, question_id, \`order\`, score) VALUES (?, ?, ?, ?)`,
            [paperId, questionId, existingQuestions.length + addedCount + 1, 10]
          );
          addedCount++;
          console.log(`[DB] Added question ${questionId} to paper ${paperId}`);
        } catch (e) {
          if (e.code !== 'ER_DUP_ENTRY') {
            console.error(`[DB] Failed to add question ${questionId}:`, e.message);
            throw e;
          }
        }
      }
    }

    return { paperId, addedCount, total: existingQuestions.length + addedCount };
  },

  async getPaperQuestions(paperId) {
    const rows = await findAll(
      `SELECT * FROM paper_questions WHERE paper_id = ? ORDER BY \`order\` ASC`,
      [paperId]
    );
    return rows || [];
  },

  async getPaperQuestionsByPaperId(paperId) {
    return this.getPaperQuestions(paperId);
  },

  async removeQuestionFromPaper(paperId, questionId) {
    const result = await remove(
      'DELETE FROM paper_questions WHERE paper_id = ? AND question_id = ?',
      [paperId, questionId]
    );
    return result;
  },

  async getPaperStudentsByPaperKeyId(keyId) {
    try {
      const rows = await findAll(
        `SELECT ps.*, s.name as student_name, s.student_no, s.id as student_id
         FROM paper_students ps
         LEFT JOIN students s ON ps.student_id = s.id
         WHERE ps.paper_key_id = ?`,
        [keyId]
      );
      return (rows || []).map(row => ({
        ...row,
        student: row.student_id ? {
          id: row.student_id,
          name: row.student_name,
          student_no: row.student_no
        } : null
      }));
    } catch (e) {
      console.error('[getPaperStudentsByPaperKeyId] Error:', e.message);
      return [];
    }
  },

  async getPaperStudentsByPaperId(paperId) {
    try {
      const rows = await findAll(
        `SELECT ps.*, s.name as student_name, s.student_no, s.id as student_id
         FROM paper_students ps
         LEFT JOIN students s ON ps.student_id = s.id
         WHERE ps.paper_id = ?`,
        [paperId]
      );
      return (rows || []).map(row => ({
        ...row,
        student: row.student_id ? {
          id: row.student_id,
          name: row.student_name,
          student_no: row.student_no
        } : null
      }));
    } catch (e) {
      console.error('[getPaperStudentsByPaperId] Error:', e.message);
      return [];
    }
  },

  async deletePaper(id) {
    await remove('DELETE FROM exam_records WHERE paper_id = ?', [id]);
    await remove('DELETE FROM paper_questions WHERE paper_id = ?', [id]);
    await remove('DELETE FROM papers WHERE id = ?', [id]);
    return true;
  },

  async getExamRecords(studentId = null, paperId = null) {
    let sql = 'SELECT * FROM exam_records WHERE 1=1';
    const params = [];
    if (studentId) {
      sql += ' AND student_id = ?';
      params.push(studentId);
    }
    if (paperId) {
      sql += ' AND paper_id = ?';
      params.push(paperId);
    }
    sql += ' ORDER BY id DESC';
    const rows = await findAll(sql, params);
    return rows.map(r => ({
      ...r,
      answers: parseJSONField(r.answers)
    }));
  },

  async getExamRecordsByPaperId(paperId, status = null) {
    let sql = 'SELECT * FROM exam_records WHERE paper_id = ?';
    const params = [paperId];
    if (status) {
      if (Array.isArray(status)) {
        sql += ` AND status IN (${status.map(() => '?').join(', ')})`;
        params.push(...status);
      } else {
        sql += ' AND status = ?';
        params.push(status);
      }
    }
    sql += ' ORDER BY id DESC';
    const rows = await findAll(sql, params);
    return rows.map(r => ({
      ...r,
      answers: parseJSONField(r.answers),
      essay_answers: parseJSONField(r.essay_answers)
    }));
  },

  async getExamRecordById(id) {
    const r = await findOne('SELECT * FROM exam_records WHERE id = ?', [id]);
    if (r) {
      r.answers = parseJSONField(r.answers);
    }
    return r;
  },

  async createExamRecord(record) {
    const id = await nextId('exam_records');
    const now = new Date();
    const toMysqlDatetime = (val) => val ? new Date(val).toISOString().slice(0, 19).replace('T', ' ') : null;
    await insert(
      'INSERT INTO exam_records (id, paper_id, user_id, student_name, ip_address, start_time, end_time, score, answers, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, record.paper_id, record.user_id || record.student_id || null, record.student_name || '匿名学员', record.ip_address || null, toMysqlDatetime(record.start_time) || now.toISOString().slice(0, 19).replace('T', ' '), toMysqlDatetime(record.end_time), record.score || null, JSON.stringify(record.answers || {}), record.status || 'in_progress']
    );
    return { id, ...record };
  },

  async updateExamRecord(id, updates) {
    const fields = [];
    const values = [];
    const toMysqlDatetime = (val) => val ? new Date(val).toISOString().slice(0, 19).replace('T', ' ') : null;
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        if (key === 'answers') {
          fields.push('answers = ?');
          values.push(JSON.stringify(value));
        } else if (key === 'start_time' || key === 'end_time') {
          fields.push(`${key} = ?`);
          values.push(toMysqlDatetime(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    values.push(id);
    await update(`UPDATE exam_records SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getExamRecordById(id);
  },

  async deleteExamRecord(id) {
    await remove('DELETE FROM exam_records WHERE id = ?', [id]);
    return true;
  },

  async getEssayScores(examRecordId = null) {
    let sql = 'SELECT * FROM essay_scores';
    const params = [];
    if (examRecordId) {
      sql += ' WHERE exam_record_id = ?';
      params.push(examRecordId);
    }
    sql += ' ORDER BY id';
    return findAll(sql, params);
  },

  async getEssayScoreById(id) {
    return findOne('SELECT * FROM essay_scores WHERE id = ?', [id]);
  },

  async upsertEssayScore(examRecordId, questionId, score, feedback, gradedBy) {
    const existing = await findOne(
      'SELECT * FROM essay_scores WHERE exam_record_id = ? AND question_id = ?',
      [examRecordId, questionId]
    );
    if (existing) {
      await update(
        'UPDATE essay_scores SET score = ?, feedback = ?, graded_by = ? WHERE id = ?',
        [score, feedback, gradedBy, existing.id]
      );
      return { ...existing, score, feedback, graded_by: gradedBy };
    } else {
      const id = await nextId('essay_scores');
      await insert(
        'INSERT INTO essay_scores (id, exam_record_id, question_id, score, feedback, graded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [id, examRecordId, questionId, score, feedback, gradedBy]
      );
      return { id, exam_record_id: examRecordId, question_id: questionId, score, feedback, graded_by: gradedBy };
    }
  },

  async getAnnouncements(status = null) {
    let sql = 'SELECT * FROM announcements';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id DESC';
    return findAll(sql, params);
  },

  async getAnnouncementById(id) {
    return findOne('SELECT * FROM announcements WHERE id = ?', [id]);
  },

  async createAnnouncement(announcement) {
    const id = await nextId('announcements');
    await insert(
      'INSERT INTO announcements (id, title, content, author_id, importance, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, announcement.title, announcement.content || '', announcement.author_id || null, announcement.importance || 'normal', announcement.status || 'published']
    );
    return { id, ...announcement };
  },

  async updateAnnouncement(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(id);
    await update(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getAnnouncementById(id);
  },

  async deleteAnnouncement(id) {
    await remove('DELETE FROM announcements WHERE id = ?', [id]);
    return true;
  },

  async getPromotions(filters = {}) {
    let sql = 'SELECT * FROM promotions WHERE 1=1';
    const params = [];
    if (filters.user_id) {
      sql += ' AND created_by = ?';
      params.push(filters.user_id);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.locked !== undefined) {
      sql += ' AND locked = ?';
      params.push(filters.locked);
    }
    sql += ' ORDER BY id DESC';
    return findAll(sql, params);
  },

  async getPromotionById(id) {
    const row = await findOne('SELECT * FROM promotions WHERE id = ?', [id]);
    if (row) {
      row.enable_signup = row.enable_signup === 1;
      row.locked = row.locked === 1;
      if (row.signup_config && typeof row.signup_config === 'string') {
        try {
          row.signup_config = JSON.parse(row.signup_config);
        } catch (e) {
          row.signup_config = null;
        }
      }
    }
    return row;
  },

  async createPromotion(promotion) {
    const id = await nextId('promotions');
    const signupConfig = promotion.signup_config ? JSON.stringify(promotion.signup_config) : null;
    await insert(
      'INSERT INTO promotions (id, title, content, status, enable_signup, signup_config, locked, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, promotion.title, promotion.content || '', promotion.status || 'draft', promotion.enable_signup ? 1 : 0, signupConfig, promotion.locked ? 1 : 0, promotion.created_by]
    );
    return { id, ...promotion };
  },

  async updatePromotion(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        if (key === 'enable_signup' || key === 'locked') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else if (key === 'signup_config') {
          fields.push(`${key} = ?`);
          values.push(value ? JSON.stringify(value) : null);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    values.push(id);
    await update(`UPDATE promotions SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getPromotionById(id);
  },

  async deletePromotion(id) {
    await remove('DELETE FROM promotion_signups WHERE promotion_id = ?', [id]);
    await remove('DELETE FROM promotions WHERE id = ?', [id]);
    return true;
  },

  async lockPromotion(id) {
    await update('UPDATE promotions SET locked = 1 WHERE id = ?', [id]);
    return this.getPromotionById(id);
  },

  async unlockPromotion(id) {
    await update('UPDATE promotions SET locked = 0 WHERE id = ?', [id]);
    return this.getPromotionById(id);
  },

  async getPromotionSignups(promotionId = null) {
    let sql = 'SELECT * FROM promotion_signups';
    const params = [];
    if (promotionId) {
      sql += ' WHERE promotion_id = ?';
      params.push(promotionId);
    }
    sql += ' ORDER BY id DESC';
    return findAll(sql, params);
  },

  async createPromotionSignup(signup) {
    const id = await nextId('promotion_signups');
    const now = new Date();
    const createdAt = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');
    const customFieldsJson = JSON.stringify(signup.custom_fields || {});

    try {
      await insert(
        'INSERT INTO promotion_signups (id, promotion_id, user_id, name, unit, phone, class_id, class_name, status, source, custom_fields, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, signup.promotion_id, signup.user_id || 0, signup.name, signup.unit || '', signup.phone, signup.class_id, signup.class_name || '', signup.status || 'approved', signup.source || 'online', customFieldsJson, createdAt]
      );
    } catch (e) {
      if (e.message && e.message.includes("Unknown column")) {
        console.log('[MySQL] custom_fields column not found, inserting without it');
        await insert(
          'INSERT INTO promotion_signups (id, promotion_id, user_id, name, unit, phone, class_id, class_name, status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, signup.promotion_id, signup.user_id || 0, signup.name, signup.unit || '', signup.phone, signup.class_id, signup.class_name || '', signup.status || 'approved', signup.source || 'online', createdAt]
        );
      } else {
        throw e;
      }
    }
    return { id, ...signup, custom_fields: signup.custom_fields || {} };
  },

  async updatePromotionSignup(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(id);
    await update(`UPDATE promotion_signups SET ${fields.join(', ')} WHERE id = ?`, values);
    return findOne('SELECT * FROM promotion_signups WHERE id = ?', [id]);
  },

  async deletePromotionSignup(id) {
    await remove('DELETE FROM promotion_signups WHERE id = ?', [id]);
    return true;
  },

  async ensureIndexes() {
    // 兼容所有 MySQL 版本：先查出已有索引，再批量创建缺失的
    const indexes = [
      { name: 'idx_users_username', table: 'users', columns: 'username' },
      { name: 'idx_users_role', table: 'users', columns: 'role' },
      { name: 'idx_questions_category_id', table: 'questions', columns: 'category_id' },
      { name: 'idx_questions_type', table: 'questions', columns: 'type' },
      { name: 'idx_questions_difficulty', table: 'questions', columns: 'difficulty' },
      { name: 'idx_questions_user_id', table: 'questions', columns: 'user_id' },
      { name: 'idx_questions_status', table: 'questions', columns: 'status' },
      { name: 'idx_papers_user_id', table: 'papers', columns: 'user_id' },
      { name: 'idx_papers_status', table: 'papers', columns: 'status' },
      { name: 'idx_exam_records_paper_id', table: 'exam_records', columns: 'paper_id' },
      { name: 'idx_exam_records_user_id', table: 'exam_records', columns: 'user_id' },
      { name: 'idx_exam_records_status', table: 'exam_records', columns: 'status' },
      { name: 'idx_essay_scores_exam_record_id', table: 'essay_scores', columns: 'exam_record_id' },
      { name: 'idx_essay_scores_graded_by', table: 'essay_scores', columns: 'graded_by' },
      { name: 'idx_promotions_created_by', table: 'promotions', columns: 'created_by' },
      { name: 'idx_promotions_status', table: 'promotions', columns: 'status' },
      { name: 'idx_promotion_signups_promotion_id', table: 'promotion_signups', columns: 'promotion_id' },
      { name: 'idx_promotion_signups_phone', table: 'promotion_signups', columns: 'phone' },
      { name: 'idx_exam_records_paper_status', table: 'exam_records', columns: 'paper_id, status' },
      { name: 'idx_paper_questions_paper_id', table: 'paper_questions', columns: 'paper_id' },
    ];

    try {
      // 一次性查出所有已有索引（比逐个查询快得多）
      const existing = await getPool().execute(
        'SELECT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?',
        [DB_CONFIG.database]
      );
      const existingSet = new Set();
      for (const row of existing[0]) {
        const key = (row.TABLE_NAME || row.table_name) + '.' + (row.INDEX_NAME || row.index_name);
        existingSet.add(key);
      }

      // 只创建缺失的索引
      const toCreate = indexes.filter(idx => !existingSet.has(idx.table + '.' + idx.name));
      if (toCreate.length === 0) return;

      // 按表分组，同表的索引用一条 ALTER TABLE 批量创建
      const byTable = {};
      for (const idx of toCreate) {
        if (!byTable[idx.table]) byTable[idx.table] = [];
        byTable[idx.table].push(`ADD INDEX ${idx.name} (${idx.columns})`);
      }

      let created = 0;
      for (const [table, addStatements] of Object.entries(byTable)) {
        try {
          await getPool().execute(`ALTER TABLE ${table} ${addStatements.join(', ')}`);
          created += addStatements.length;
        } catch (e) {
          if (e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_DUP_ENTRY') {
            // 并发创建导致重复，忽略
          } else {
            console.warn(`[MySQL] Failed to create indexes on ${table}:`, e.message);
          }
        }
      }
      if (created > 0) console.log(`[MySQL] ${created} indexes created`);
    } catch (e) {
      console.warn('[MySQL] ensureIndexes failed:', e.message);
    }
  },

  async init() {
    try {
      const healthy = await healthCheck();
      if (!healthy) {
        console.warn('[MySQL] Database connection failed, will retry on demand');
        return;
      }
      // 计数器初始化失败不影响连接
      await initializeCounters().catch(e => console.warn('[MySQL] Counter init skipped:', e.message));
      // 索引创建失败不影响连接
      await this.ensureIndexes().catch(e => console.warn('[MySQL] Index creation skipped:', e.message));
      // 自动添加缺失的列
      await this.ensureColumns().catch(e => console.warn('[MySQL] Column check skipped:', e.message));
      // 再次确认连接状态
      isConnected = true;
      console.log('[MySQL] Database connection established successfully');
    } catch (error) {
      console.error('[MySQL] Initialization failed:', error.message);
      isConnected = false;
    }
  },

  async ensureColumns() {
    try {
      const requiredColumns = [
        { table: 'promotion_signups', column: 'custom_fields', type: 'TEXT', defaultVal: null },
        { table: 'promotion_signups', column: 'unit', type: 'VARCHAR(255)', defaultVal: "''" },
        { table: 'exam_records', column: 'objective_score', type: 'INT', defaultVal: null },
        { table: 'exam_records', column: 'objective_total', type: 'INT', defaultVal: null },
        { table: 'exam_records', column: 'subjective_score', type: 'INT', defaultVal: null },
        { table: 'exam_records', column: 'subjective_total', type: 'INT', defaultVal: null },
        { table: 'exam_records', column: 'percentage', type: 'INT', defaultVal: null }
      ];

      for (const col of requiredColumns) {
        try {
          const [rows] = await getPool().execute(
            `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [DB_CONFIG.database, col.table, col.column]
          );
          if (rows[0].cnt === 0) {
            let sql;
            if (col.defaultVal === null) {
              sql = `ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`;
            } else {
              sql = `ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type} DEFAULT ${col.defaultVal}`;
            }
            await getPool().execute(sql);
            console.log(`[MySQL] ✅ Added column ${col.column} to ${col.table}`);
          }
        } catch (e) {
          if (e.code === 'ER_DUP_COLUMN') {
            // 列已存在，忽略
          } else {
            console.warn(`[MySQL] ⚠️ Failed to check/add column ${col.column}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.warn('[MySQL] ensureColumns failed:', e.message);
    }
  },
};

module.exports = db;