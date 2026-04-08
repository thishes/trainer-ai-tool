const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'kb.thishe.com',
  port: parseInt(process.env.DB_PORT) || 33060,
  user: process.env.DB_USER || 'lankong',
  password: process.env.DB_PASSWORD || 'Hejinqiang860612!',
  database: process.env.DB_NAME || 'trainer_ai_tool',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  idleTimeout: 60000,
  maxIdle: 2,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

let pool = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
    pool.on('connection', () => {
      isConnected = true;
      reconnectAttempts = 0;
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
  try {
    const [rows] = await getPool().execute('SELECT 1');
    isConnected = true;
    return true;
  } catch (error) {
    isConnected = false;
    console.error('[MySQL] Health check failed:', error.message);
    return false;
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
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    getPool();
    const healthy = await healthCheck();
    if (healthy) {
      console.log('[MySQL] Reconnection successful');
      reconnectAttempts = 0;
    }
    return healthy;
  } catch (error) {
    console.error('[MySQL] Reconnection failed:', error.message);
    return false;
  }
}

function normalizeQuestionType(type) {
  if (type === 'choice') return 'single';
  return type;
}

const counters = { users: 1, categories: 1, questions: 1, papers: 1, exam_records: 1, essay_scores: 1, announcements: 1, promotions: 1, promotion_signups: 1 };

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

function nextId(collection) {
  return counters[collection]++;
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
    const id = nextId('users');
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
    const id = nextId('categories');
    await insert(
      'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
      [id, category.name, category.description || null]
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
    const id = nextId('questions');
    const type = normalizeQuestionType(question.type);
    await insert(
      'INSERT INTO questions (id, title, type, options, answer, difficulty, score, explanation, category_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, question.title, type, JSON.stringify(question.options || []), question.answer, question.difficulty || 'medium', question.score || 10, question.explanation || '', question.category_id || null, question.status || 'draft']
    );
    return { id, ...question };
  },

  async updateQuestion(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        if (key === 'options') {
          fields.push('options = ?');
          values.push(JSON.stringify(value));
        } else if (key === 'type' && value === 'choice') {
          fields.push('type = ?');
          values.push('single');
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
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
    let sql = 'SELECT * FROM papers';
    const params = [];
    if (ownerId) {
      sql += ' WHERE owner_id = ?';
      params.push(ownerId);
    }
    sql += ' ORDER BY id DESC';
    const rows = await findAll(sql, params);
    return rows.map(p => ({
      ...p,
      question_ids: parseJSONField(p.question_ids),
      random_config: parseJSONField(p.random_config)
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

  async createPaper(paper) {
    const id = nextId('papers');
    await insert(
      'INSERT INTO papers (id, title, description, owner_id, duration, total_score, question_ids, random_config, status, passing_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, paper.title, paper.description || '', paper.owner_id, paper.duration || 60, paper.total_score || 100, JSON.stringify(paper.question_ids || []), JSON.stringify(paper.random_config || {}), paper.status || 'draft', paper.passing_score || 60]
    );
    return { id, ...paper };
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

  async deletePaper(id) {
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

  async getExamRecordById(id) {
    const r = await findOne('SELECT * FROM exam_records WHERE id = ?', [id]);
    if (r) {
      r.answers = parseJSONField(r.answers);
    }
    return r;
  },

  async createExamRecord(record) {
    const id = nextId('exam_records');
    await insert(
      'INSERT INTO exam_records (id, paper_id, student_id, student_name, objective_score, essay_score, total_score, start_time, end_time, answers, status, graded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, record.paper_id, record.student_id, record.student_name, record.objective_score || 0, record.essay_score || 0, record.total_score || 0, record.start_time || null, record.end_time || null, JSON.stringify(record.answers || {}), record.status || 'pending', record.graded || false]
    );
    return { id, ...record };
  },

  async updateExamRecord(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        if (key === 'answers') {
          fields.push('answers = ?');
          values.push(JSON.stringify(value));
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
      const id = nextId('essay_scores');
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
    const id = nextId('announcements');
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
    return findOne('SELECT * FROM promotions WHERE id = ?', [id]);
  },

  async createPromotion(promotion) {
    const id = nextId('promotions');
    await insert(
      'INSERT INTO promotions (id, title, content, status, enable_signup, locked, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, promotion.title, promotion.content || '', promotion.status || 'draft', promotion.enable_signup ? 1 : 0, promotion.locked ? 1 : 0, promotion.created_by]
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
    const id = nextId('promotion_signups');
    await insert(
      'INSERT INTO promotion_signups (id, promotion_id, user_id) VALUES (?, ?, ?)',
      [id, signup.promotion_id, signup.user_id]
    );
    return { id, ...signup };
  },

  async init() {
    try {
      await initializeCounters();
      const healthy = await healthCheck();
      if (healthy) {
        console.log('[MySQL] Database connection established successfully');
      } else {
        console.warn('[MySQL] Database connection failed, will retry on demand');
      }
    } catch (error) {
      console.error('[MySQL] Initialization failed:', error.message);
    }
  }
};

module.exports = db;