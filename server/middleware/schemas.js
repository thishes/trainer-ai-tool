// server/middleware/schemas.js - 统一路由验证规则
// 基于 Joi 的请求验证 schema，所有路由共享

const Joi = require('joi');

// ========== 通用规则 ==========

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20)
};

const idParam = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  })
};

const examIdParam = {
  params: Joi.object({
    examId: Joi.string().required()
  })
};

const paperIdParam = {
  params: Joi.object({
    paperId: Joi.number().integer().positive().required()
  })
};

// ========== Auth 验证 ==========

const login = {
  body: Joi.object({
    username: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(1).max(128).required(),
    captchaId: Joi.string().allow(''),
    captchaCode: Joi.string().allow('')
  })
};

const register = {
  body: Joi.object({
    username: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(1).max(128).required(),
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).allow('', null),
    role: Joi.string().valid('admin', 'trainer').default('trainer'),
    captchaId: Joi.string().allow(''),
    captchaCode: Joi.string().allow('')
  })
};

// ========== Questions 验证 ==========

const questionList = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    category_id: Joi.number().integer().positive().allow(null),
    type: Joi.string().valid('single', 'multiple', 'judge', 'subjective').allow(null),
    keyword: Joi.string().max(200).allow(null),
    status: Joi.string().valid('draft', 'published').allow(null)
  })
};

const questionCreate = {
  body: Joi.object({
    title: Joi.string().min(1).max(2000).required(),
    type: Joi.string().valid('single', 'multiple', 'judge', 'subjective').required(),
    options: Joi.array().items(Joi.object({
      key: Joi.string().max(5),
      value: Joi.string().allow('')
    })).allow(null),
    answer: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).allow(null),
    explanation: Joi.string().max(5000).allow(''),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
    score: Joi.number().integer().min(1).max(100).default(10),
    tags: Joi.array().items(Joi.string()).default([]),
    category_id: Joi.number().integer().positive().allow(null),
    status: Joi.string().valid('draft', 'published').default('draft')
  })
};

const questionUpdate = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  body: Joi.object({
    title: Joi.string().min(1).max(2000),
    type: Joi.string().valid('single', 'multiple', 'judge', 'subjective'),
    options: Joi.array().items(Joi.object({
      key: Joi.string().max(5),
      value: Joi.string().allow('')
    })).allow(null),
    answer: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).allow(null),
    explanation: Joi.string().max(5000).allow(''),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    score: Joi.number().integer().min(1).max(100),
    tags: Joi.array().items(Joi.string()),
    category_id: Joi.number().integer().positive().allow(null),
    status: Joi.string().valid('draft', 'published')
  })
};

const questionImport = {
  body: Joi.object({
    questions: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      type: Joi.string().valid('single', 'multiple', 'judge', 'subjective').default('single'),
      options: Joi.array().allow(null),
      answer: Joi.alternatives().try(Joi.string(), Joi.array()).allow(null),
      explanation: Joi.string().allow(''),
      difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
      score: Joi.number().integer().min(1).max(100).default(10),
      tags: Joi.array().items(Joi.string()).default([]),
      category_id: Joi.number().integer().positive().allow(null)
    })).min(1).max(500).required(),
    category_id: Joi.number().integer().positive().allow(null)
  })
};

// ========== Papers 验证 ==========

const paperCreate = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(2000).allow(''),
    duration: Joi.number().integer().min(1).max(300).default(60),
    question_ids: Joi.array().items(Joi.number().integer().positive()).default([]),
    random_config: Joi.object().allow(null),
    status: Joi.string().valid('draft', 'published').default('draft'),
    passing_score: Joi.number().integer().min(0).max(100).default(60),
    time_limit: Joi.number().integer().min(1).max(300),
    shuffle: Joi.boolean().default(false),
    show_score: Joi.boolean().default(true),
    show_answer: Joi.boolean().default(true),
    access_code: Joi.string().max(50).allow(''),
    ip_limit: Joi.number().integer().min(0).max(10).default(0),
    allow_all_users: Joi.boolean().default(true)
  })
};

const paperUpdate = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  body: Joi.object({
    title: Joi.string().min(1).max(200),
    description: Joi.string().max(2000).allow(''),
    duration: Joi.number().integer().min(1).max(300),
    question_ids: Joi.array().items(Joi.number().integer().positive()),
    status: Joi.string().valid('draft', 'published'),
    passing_score: Joi.number().integer().min(0).max(100),
    time_limit: Joi.number().integer().min(1).max(300),
    shuffle: Joi.boolean(),
    show_score: Joi.boolean(),
    show_answer: Joi.boolean(),
    access_code: Joi.string().max(50).allow(''),
    ip_limit: Joi.number().integer().min(0).max(10),
    allow_all_users: Joi.boolean()
  })
};

const randomPaper = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    count: Joi.number().integer().min(1).max(500).required(),
    duration: Joi.number().integer().min(1).max(300).default(60),
    category_ids: Joi.array().items(Joi.number().integer().positive()).default([]),
    question_types: Joi.array().items(Joi.string().valid('single', 'multiple', 'judge', 'subjective')).default([]),
    difficulty: Joi.array().items(Joi.string().valid('easy', 'medium', 'hard')).default([])
  })
};

// ========== Exam 验证 ==========

const examStart = {
  body: Joi.object({
    paper_id: Joi.number().integer().positive().required(),
    student_name: Joi.string().max(100).allow(''),
    user_id: Joi.number().integer().positive().allow(null),
    access_code: Joi.string().max(50).allow(''),
    student_no: Joi.string().max(50).allow('')
  })
};

const examSaveProgress = {
  body: Joi.object({
    exam_id: Joi.string().required(),
    answers: Joi.object().required()
  })
};

const examSubmit = {
  body: Joi.object({
    exam_id: Joi.string().required(),
    answers: Joi.object().required()
  })
};

const examGradeEssay = {
  body: Joi.object({
    exam_record_id: Joi.string().required(),
    scores: Joi.array().items(Joi.object({
      question_id: Joi.number().integer().positive().required(),
      score: Joi.number().min(0).required(),
      remark: Joi.string().max(500).allow('')
    })).min(1).required()
  })
};

// ========== Users 验证 ==========

const userCreate = {
  body: Joi.object({
    username: Joi.string().min(2).max(50).required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).allow('', null),
    role: Joi.string().valid('admin', 'trainer').default('trainer')
  })
};

const userUpdate = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  body: Joi.object({
    username: Joi.string().min(2).max(50),
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).allow('', null),
    role: Joi.string().valid('admin', 'trainer')
  })
};

// ========== Announcements 验证 ==========

const announcementCreate = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    content: Joi.string().allow(''),
    importance: Joi.string().valid('high', 'medium', 'normal').default('normal'),
    status: Joi.string().valid('draft', 'published').default('published')
  })
};

const announcementUpdate = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  body: Joi.object({
    title: Joi.string().min(1).max(200),
    content: Joi.string().allow(''),
    importance: Joi.string().valid('high', 'medium', 'normal'),
    status: Joi.string().valid('draft', 'published')
  })
};

// ========== Categories 验证 ==========

const categoryCreate = {
  body: Joi.object({
    name: Joi.string().min(1).max(50).required()
  })
};

const categoryUpdate = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(50).required()
  })
};

module.exports = {
  // 通用
  pagination,
  idParam,
  examIdParam,
  paperIdParam,
  // Auth
  login,
  register,
  // Questions
  questionList,
  questionCreate,
  questionUpdate,
  questionImport,
  // Papers
  paperCreate,
  paperUpdate,
  randomPaper,
  // Exam
  examStart,
  examSaveProgress,
  examSubmit,
  examGradeEssay,
  // Users
  userCreate,
  userUpdate,
  // Announcements
  announcementCreate,
  announcementUpdate,
  // Categories
  categoryCreate,
  categoryUpdate
};
