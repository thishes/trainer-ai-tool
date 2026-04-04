// server/db.json - 轻量级数据存储（无需数据库）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'db.json');

const defaultData = {
  users: [],
  categories: [],
  questions: [],
  papers: [],
  paperQuestions: [],
  examRecords: [],
  scoreRecords: [],
  announcements: [],
  students: [],
  paperStudents: [],
  essayScores: []
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
  scoreRecords: 0,
  announcements: 0,
  students: 0,
  paperStudents: 0
};

function initCounters(data) {
  const tables = ['users', 'categories', 'questions', 'papers', 'paperQuestions', 'examRecords', 'scoreRecords', 'announcements', 'students', 'paperStudents'];
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

function generateKeyId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `${prefix}${timestamp}${randomPart}`.toUpperCase();
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
    findById: (id) => db.users.find(u => u.id === parseInt(id)),
    findByUsername: (username) => db.users.find(u => u.username === username),
    findByWechatOpenid: (openid) => db.users.find(u => u.wechat_openid === openid),
    findByKeyId: (keyId) => db.users.find(u => u.key_id === keyId),
    create: (data) => {
      const user = { id: getNextId('users'), key_id: generateKeyId('U'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.users.push(user);
      writeDB(db);
      return user;
    },
    update: (id, data) => {
      const index = db.users.findIndex(u => u.id === parseInt(id));
      if (index !== -1) {
        db.users[index] = { ...db.users[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.users[index];
      }
      return null;
    },
    delete: (id) => {
      const userId = parseInt(id);
      const index = db.users.findIndex(u => u.id === userId);
      if (index === -1) return false;

      const userPapers = db.papers.filter(p => p.user_id === userId);
      const paperKeyIds = userPapers.map(p => p.key_id).filter(k => k);

      const deleteWithKeyIds = (table, keyIds) => {
        if (keyIds.length === 0) {
          db[table] = db[table].filter(row => row.user_id !== userId);
        } else {
          db[table] = db[table].filter(row => {
            if (row.user_id === userId) return false;
            const rowKeyId = row.paper_key_id;
            if (rowKeyId && keyIds.includes(rowKeyId)) return false;
            return true;
          });
        }
      };

      db.users.splice(index, 1);
      db.papers = db.papers.filter(p => p.user_id !== userId);
      db.questions = db.questions.filter(q => q.user_id !== userId);
      db.categories = db.categories.filter(c => c.user_id !== userId);
      deleteWithKeyIds('examRecords', paperKeyIds);
      deleteWithKeyIds('paperStudents', paperKeyIds);
      deleteWithKeyIds('scoreRecords', paperKeyIds);
      if (paperKeyIds.length > 0) {
        db.paperQuestions = db.paperQuestions.filter(pq => !paperKeyIds.includes(pq.paper_key_id));
      }
      writeDB(db);
      return true;
    }
  },
  
  // 分类表
  categories: {
    findAll: () => db.categories,
    findById: (id) => db.categories.find(c => c.id === parseInt(id)),
    findByUserId: (userId) => db.categories.filter(c => c.user_id === userId),
    create: (data) => {
      const category = { id: getNextId('categories'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.categories.push(category);
      writeDB(db);
      return category;
    },
    update: (id, data) => {
      const index = db.categories.findIndex(c => c.id === parseInt(id));
      if (index !== -1) {
        db.categories[index] = { ...db.categories[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.categories[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.categories.findIndex(c => c.id === parseInt(id));
      if (index !== -1) {
        db.categories.splice(index, 1);
        db.questions = db.questions.filter(q => q.category_id !== parseInt(id));
        writeDB(db);
        return true;
      }
      return false;
    }
  },
  
  // 题目表
  questions: {
    // 标准化题型：将旧类型 'choice' 转换为 'single'
    normalizeType: (type) => {
      if (type === 'choice') return 'single';
      return type;
    },
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
      const { key_id, ...rest } = data;
      // 标准化题型
      const normalizedType = db.questions.normalizeType(rest.type);
      const question = { 
        id: getNextId('questions'), 
        key_id: generateKeyId('Q'), 
        ...rest, 
        type: normalizedType,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      };
      db.questions.push(question);
      writeDB(db);
      return question;
    },
    bulkCreate: (items) => {
      const questions = items.map(data => ({
        id: getNextId('questions'),
        key_id: generateKeyId('Q'),
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
        // 如果更新包含类型，进行标准化
        const updateData = { ...data };
        if (updateData.type) {
          updateData.type = db.questions.normalizeType(updateData.type);
        }
        db.questions[index] = { ...db.questions[index], ...updateData, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.questions[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.questions.findIndex(q => q.id === parseInt(id));
      if (index !== -1) {
        const question = db.questions[index];
        const questionKeyId = question.key_id;
        db.questions.splice(index, 1);
        if (questionKeyId) {
          db.paperQuestions = db.paperQuestions.filter(pq => pq.question_key_id !== questionKeyId);
        }
        writeDB(db);
        return true;
      }
      return false;
    },
    random: (userId, categoryIds, questionTypes, count) => {
      let pool;
      const catIds = Array.isArray(categoryIds) ? categoryIds : (categoryIds ? [categoryIds] : []);
      // 向后兼容：如果 questionTypes 未提供，则使用空数组（表示所有类型）
      const types = questionTypes 
        ? (Array.isArray(questionTypes) ? questionTypes : [questionTypes])
        : [];
      
      if (userId === null) {
        pool = db.questions.filter(q => {
          const matchCategory = catIds.length === 0 || catIds.includes(q.category_id);
          const matchType = types.length === 0 || types.includes(q.type);
          return matchCategory && matchType;
        });
      } else {
        pool = db.questions.filter(q => {
          const matchUser = q.user_id === userId;
          const matchCategory = catIds.length === 0 || catIds.includes(q.category_id);
          const matchType = types.length === 0 || types.includes(q.type);
          return matchUser && matchCategory && matchType;
        });
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
    findByKeyId: (keyId) => db.papers.find(p => p.key_id === keyId),
    findPublic: (id) => {
      const paper = db.papers.find(p => p.id === parseInt(id) && p.status === 'published');
      if (paper) return paper;
      return db.papers.find(p => p.key_id === id && p.status === 'published');
    },
    create: (data) => {
      const paper = { id: getNextId('papers'), key_id: generateKeyId('P'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
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
        const paper = db.papers[index];
        const paperKeyId = paper.key_id;
        db.papers.splice(index, 1);
        if (paperKeyId) {
          db.paperQuestions = db.paperQuestions.filter(pq => pq.paper_key_id !== paperKeyId);
          db.examRecords = db.examRecords.filter(e => e.paper_key_id !== paperKeyId);
          db.paperStudents = db.paperStudents.filter(ps => ps.paper_key_id !== paperKeyId);
          db.scoreRecords = db.scoreRecords.filter(sr => sr.paper_key_id !== paperKeyId);
        }
        writeDB(db);
        return true;
      }
      return false;
    }
  },
  
  // 试卷题目关联表
  paperQuestions: {
    findByPaperId: (paperId) => db.paperQuestions.filter(pq => pq.paper_id === parseInt(paperId)),
    findByPaperKeyId: (paperKeyId) => db.paperQuestions.filter(pq => pq.paper_key_id === paperKeyId),
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
    deleteByPaperKeyId: (paperKeyId) => {
      db.paperQuestions = db.paperQuestions.filter(pq => pq.paper_key_id !== paperKeyId);
      writeDB(db);
    },
    deleteByPaperKeyIdAndQuestionKeyId: (paperKeyId, questionKeyId) => {
      db.paperQuestions = db.paperQuestions.filter(pq =>
        !(pq.paper_key_id === paperKeyId && pq.question_key_id === questionKeyId)
      );
      writeDB(db);
    }
  },
  
  // 考试记录表
  examRecords: {
    findAll: (filters = {}) => {
      let result = [...db.examRecords];
      if (filters.paper_key_id) result = result.filter(e => e.paper_key_id === filters.paper_key_id);
      if (filters.paper_id) result = result.filter(e => e.paper_id === filters.paper_id);
      if (filters.user_id !== undefined && filters.user_id !== null) result = result.filter(e => e.user_id === filters.user_id);
      if (filters.status) {
        // 支持查询多个状态（数组）或单个状态
        if (Array.isArray(filters.status)) {
          result = result.filter(e => filters.status.includes(e.status));
        } else {
          result = result.filter(e => e.status === filters.status);
        }
      }
      return result.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    },
    findById: (id) => db.examRecords.find(e => e.id === parseInt(id)),
    create: (data) => {
      const record = { id: getNextId('examRecords'), key_id: generateKeyId('E'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
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

  // 问答题评分表
  essayScores: {
    findAll: (filters = {}) => {
      let result = [...db.essayScores];
      if (filters.exam_record_id) result = result.filter(e => e.exam_record_id === filters.exam_record_id);
      if (filters.question_id) result = result.filter(e => e.question_id === filters.question_id);
      if (filters.graded_by) result = result.filter(e => e.graded_by === filters.graded_by);
      return result;
    },
    findByRecordAndQuestion: (examRecordId, questionId) => {
      return db.essayScores.find(e => e.exam_record_id === parseInt(examRecordId) && e.question_id === parseInt(questionId));
    },
    upsert: (data) => {
      const existing = db.essayScores.find(e => e.exam_record_id === parseInt(data.exam_record_id) && e.question_id === parseInt(data.question_id));
      if (existing) {
        Object.assign(existing, data, { updated_at: new Date().toISOString() });
        writeDB(db);
        return existing;
      } else {
        const record = { id: getNextId('essayScores'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db.essayScores.push(record);
        writeDB(db);
        return record;
      }
    }
  },

  // 积分记录表
  scoreRecords: {
    findAll: (filters = {}) => {
      let result = [...db.scoreRecords];
      if (filters.paper_key_id) result = result.filter(s => s.paper_key_id === filters.paper_key_id);
      if (filters.user_id !== undefined && filters.user_id !== null) result = result.filter(s => s.user_id === filters.user_id);
      return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    create: (data) => {
      const record = { id: getNextId('scoreRecords'), key_id: generateKeyId('S'), ...data, created_at: new Date().toISOString() };
      db.scoreRecords.push(record);
      writeDB(db);
      return record;
    }
  },

  // 公告表
  announcements: {
    findAll: (filters = {}) => {
      let result = [...db.announcements];
      if (filters.status) result = result.filter(a => a.status === filters.status);
      if (filters.type) result = result.filter(a => a.type === filters.type);
      return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    findById: (id) => db.announcements.find(a => a.id === parseInt(id)),
    create: (data) => {
      const announcement = { id: getNextId('announcements'), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.announcements.push(announcement);
      writeDB(db);
      return announcement;
    },
    update: (id, data) => {
      const index = db.announcements.findIndex(a => a.id === parseInt(id));
      if (index !== -1) {
        db.announcements[index] = { ...db.announcements[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.announcements[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.announcements.findIndex(a => a.id === parseInt(id));
      if (index !== -1) {
        db.announcements.splice(index, 1);
        writeDB(db);
        return true;
      }
      return false;
    }
  },

  // 考生表
  students: {
    findAll: (filters = {}) => {
      let result = [...db.students];
      if (filters.paper_id) {
        const paperStudentIds = db.paperStudents.filter(ps => ps.paper_id === parseInt(filters.paper_id)).map(ps => ps.student_id);
        result = result.filter(s => paperStudentIds.includes(s.id));
      }
      return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    findById: (id) => db.students.find(s => s.id === parseInt(id)),
    findByStudentNo: (studentNo) => db.students.find(s => s.student_no === studentNo),
    create: (data) => {
      const student = { 
        id: getNextId('students'), 
        student_no: data.student_no || `S${String(getNextId('students')).padStart(6, '0')}`,
        name: data.name,
        phone: data.phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.students.push(student);
      writeDB(db);
      return student;
    },
    bulkCreate: (items) => {
      const students = items.map(data => ({
        id: getNextId('students'),
        student_no: `S${String(getNextId('students')).padStart(6, '0')}`,
        name: data.name,
        phone: data.phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      db.students.push(...students);
      writeDB(db);
      return students;
    },
    update: (id, data) => {
      const index = db.students.findIndex(s => s.id === parseInt(id));
      if (index !== -1) {
        db.students[index] = { ...db.students[index], ...data, updated_at: new Date().toISOString() };
        writeDB(db);
        return db.students[index];
      }
      return null;
    },
    delete: (id) => {
      const index = db.students.findIndex(s => s.id === parseInt(id));
      if (index !== -1) {
        db.students.splice(index, 1);
        db.paperStudents = db.paperStudents.filter(ps => ps.student_id !== parseInt(id));
        writeDB(db);
        return true;
      }
      return false;
    }
  },

  // 试卷考生关联表
  paperStudents: {
    findByPaperId: (paperId) => {
      const paperStudents = db.paperStudents.filter(ps => ps.paper_id === parseInt(paperId));
      return paperStudents.map(ps => {
        const student = db.students.find(s => s.id === ps.student_id);
        return { ...ps, student };
      });
    },
    findByPaperKeyId: (paperKeyId) => {
      const paperStudents = db.paperStudents.filter(ps => ps.paper_key_id === paperKeyId);
      return paperStudents.map(ps => {
        const student = db.students.find(s => s.id === ps.student_id);
        return { ...ps, student };
      });
    },
    create: (data) => {
      const ps = { id: getNextId('paperStudents'), ...data };
      db.paperStudents.push(ps);
      writeDB(db);
      return ps;
    },
    bulkCreate: (paperId, paperKeyId, studentIds) => {
      const existing = db.paperStudents.filter(ps => ps.paper_key_id === paperKeyId);
      const existingIds = existing.map(ps => ps.student_id);
      const newRelations = studentIds
        .filter(id => !existingIds.includes(id))
        .map(student_id => ({ id: getNextId('paperStudents'), paper_id: parseInt(paperId), paper_key_id: paperKeyId, student_id }));
      if (newRelations.length > 0) {
        db.paperStudents.push(...newRelations);
        writeDB(db);
      }
      return newRelations;
    },
    deleteByPaperKeyId: (paperKeyId) => {
      db.paperStudents = db.paperStudents.filter(ps => ps.paper_key_id !== paperKeyId);
      writeDB(db);
    },
    deleteByPaperKeyIdAndStudentId: (paperKeyId, studentId) => {
      db.paperStudents = db.paperStudents.filter(ps =>
        !(ps.paper_key_id === paperKeyId && ps.student_id === parseInt(studentId))
      );
      writeDB(db);
    }
  }
};
