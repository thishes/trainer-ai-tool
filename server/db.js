// server/db.json - 轻量级数据存储（无需数据库）
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

const defaultData = {
  users: [],
  categories: [],
  questions: [],
  papers: [],
  paperQuestions: [],
  examRecords: [],
  scoreRecords: []
};

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('读取数据库失败:', e);
  }
  return { ...defaultData };
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('写入数据库失败:', e);
    return false;
  }
}

// 自增ID生成器
let idCounters = {
  users: 0,
  categories: 0,
  questions: 0,
  papers: 0,
  paperQuestions: 0,
  examRecords: 0,
  scoreRecords: 0
};

function initCounters(data) {
  const tables = ['users', 'categories', 'questions', 'papers', 'paperQuestions', 'examRecords', 'scoreRecords'];
  tables.forEach(table => {
    if (data[table] && data[table].length > 0) {
      idCounters[table] = Math.max(...data[table].map(item => item.id));
    }
  });
}

function getNextId(table) {
  idCounters[table]++;
  return idCounters[table];
}

// 初始化
const db = readDB();
initCounters(db);

// 导出工具函数
module.exports = {
  db,
  
  // 用户表
  users: {
    findAll: () => db.users,
    findById: (id) => db.users.find(u => u.id === id),
    findByUsername: (username) => db.users.find(u => u.username === username),
    findByWechatOpenid: (openid) => db.users.find(u => u.wechat_openid === openid),
    create: (data) => {
      const user = { id: getNextId('users'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.users.push(user);
      writeDB(db);
      return user;
    },
    update: (id, data) => {
      const index = db.users.findIndex(u => u.id === id);
      if (index !== -1) {
        db.users[index] = { ...db.users[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.users[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.users.findIndex(u => u.id === id);
      if (index !== -1) {
        db.users.splice(index, 1);
        writeDB(db);
        return true;
      }
      return false;
    }
  },
  
  // 分类表
  categories: {
    findAll: () => db.categories,
    findById: (id) => db.categories.find(c => c.id === id),
    findByUserId: (userId) => db.categories.filter(c => c.user_id === userId),
    create: (data) => {
      const category = { id: getNextId('categories'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.categories.push(category);
      writeDB(db);
      return category;
    },
    update: (id, data) => {
      const index = db.categories.findIndex(c => c.id === id);
      if (index !== -1) {
        db.categories[index] = { ...db.categories[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.categories[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.categories.findIndex(c => c.id === id);
      if (index !== -1) {
        db.categories.splice(index, 1);
        writeDB(db);
        return true;
      }
      return false;
    }
  },
  
  // 题目表
  questions: {
    findAll: (filters = {}) => {
      let result = [...db.questions];
      if (filters.user_id !== undefined && filters.user_id !== null) result = result.filter(q => q.user_id === filters.user_id);
      if (filters.category_id) result = result.filter(q => q.category_id === filters.category_id);
      if (filters.type) result = result.filter(q => q.type === filters.type);
      if (filters.status) result = result.filter(q => q.status === filters.status);
      if (filters.keyword) result = result.filter(q => q.title.includes(filters.keyword));
      return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    findById: (id) => db.questions.find(q => q.id === parseInt(id)),
    create: (data) => {
      const question = { id: getNextId('questions'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.questions.push(question);
      writeDB(db);
      return question;
    },
    bulkCreate: (items) => {
      const questions = items.map(data => ({
        id: getNextId('questions'),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      db.questions.push(...questions);
      writeDB(db);
      return questions;
    },
    update: (id, data) => {
      const index = db.questions.findIndex(q => q.id === parseInt(id));
      if (index !== -1) {
        db.questions[index] = { ...db.questions[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.questions[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.questions.findIndex(q => q.id === parseInt(id));
      if (index !== -1) {
        db.questions.splice(index, 1);
        writeDB(db);
        return true;
      }
      return false;
    },
    random: (userId, categoryId, count) => {
      let pool;
      if (userId === null) {
        pool = db.questions.filter(q => (!categoryId || q.category_id === categoryId));
      } else {
        pool = db.questions.filter(q => q.user_id === userId && (!categoryId || q.category_id === categoryId));
      }
      // 洗牌算法
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, count);
    }
  },
  
  // 试卷表
  papers: {
    findAll: (filters = {}) => {
      let result = [...db.papers];
      if (filters.user_id !== undefined && filters.user_id !== null) result = result.filter(p => p.user_id === filters.user_id);
      if (filters.status) result = result.filter(p => p.status === filters.status);
      return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    findById: (id) => db.papers.find(p => p.id === parseInt(id)),
    findPublic: (id) => db.papers.find(p => p.id === parseInt(id) && p.status === 'published'),
    create: (data) => {
      const paper = { id: getNextId('papers'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.papers.push(paper);
      writeDB(db);
      return paper;
    },
    update: (id, data) => {
      const index = db.papers.findIndex(p => p.id === parseInt(id));
      if (index !== -1) {
        db.papers[index] = { ...db.papers[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.papers[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.papers.findIndex(p => p.id === parseInt(id));
      if (index !== -1) {
        db.papers.splice(index, 1);
        // 同时删除关联题目
        db.paperQuestions = db.paperQuestions.filter(pq => pq.paper_id !== parseInt(id));
        writeDB(db);
        return true;
      }
      return false;
    }
  },
  
  // 试卷题目关联表
  paperQuestions: {
    findByPaperId: (paperId) => db.paperQuestions.filter(pq => pq.paper_id === parseInt(paperId)),
    create: (data) => {
      const pq = { id: getNextId('paperQuestions'), ...data };
      db.paperQuestions.push(pq);
      writeDB(db);
      return pq;
    },
    bulkCreate: (items) => {
      const pqs = items.map(data => ({ id: getNextId('paperQuestions'), ...data }));
      db.paperQuestions.push(...pqs);
      writeDB(db);
      return pqs;
    },
    deleteByPaperId: (paperId) => {
      db.paperQuestions = db.paperQuestions.filter(pq => pq.paper_id !== parseInt(paperId));
      writeDB(db);
    },
    deleteByPaperIdAndQuestionId: (paperId, questionId) => {
      db.paperQuestions = db.paperQuestions.filter(pq => 
        !(pq.paper_id === parseInt(paperId) && pq.question_id === parseInt(questionId))
      );
      writeDB(db);
    }
  },
  
  // 考试记录表
  examRecords: {
    findAll: (filters = {}) => {
      let result = [...db.examRecords];
      if (filters.paper_id) result = result.filter(e => e.paper_id === filters.paper_id);
      if (filters.user_id !== undefined && filters.user_id !== null) result = result.filter(e => e.user_id === filters.user_id);
      if (filters.status) result = result.filter(e => e.status === filters.status);
      return result.sort((a, b) => b.score - a.score);
    },
    findById: (id) => db.examRecords.find(e => e.id === parseInt(id)),
    create: (data) => {
      const record = { id: getNextId('examRecords'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.examRecords.push(record);
      writeDB(db);
      return record;
    },
    update: (id, data) => {
      const index = db.examRecords.findIndex(e => e.id === parseInt(id));
      if (index !== -1) {
        db.examRecords[index] = { ...db.examRecords[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.examRecords[index];
      }
      return null;
    }
  },
  
  // 积分记录表
  scoreRecords: {
    findAll: (filters = {}) => {
      let result = [...db.scoreRecords];
      if (filters.user_id !== undefined && filters.user_id !== null) result = result.filter(s => s.user_id === filters.user_id);
      return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    create: (data) => {
      const record = { id: getNextId('scoreRecords'), ...data, created_at: new Date().toISOString() };
      db.scoreRecords.push(record);
      writeDB(db);
      return record;
    }
  }
};
