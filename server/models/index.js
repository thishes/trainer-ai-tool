// server/models/index.js - 数据库模型定义
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  process.env.DB_NAME || 'trainer_ai_tool',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 用户模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true // 微信登录时可能为空
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('trainer', 'student', 'admin'),
    defaultValue: 'student'
  },
  wechat_openid: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'users',
  timestamps: true
});

// 题库分类模型
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  parent_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: null
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  }
}, {
  tableName: 'categories',
  timestamps: true
});

// 题目模型
const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('single', 'multiple', 'judge', 'subjective'),
    allowNull: false
  },
  options: {
    type: DataTypes.JSON, // 存储选项数组
    allowNull: true
  },
  answer: {
    type: DataTypes.JSON, // 存储答案
    allowNull: false
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium'
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  tags: {
    type: DataTypes.JSON, // 存储标签数组
    allowNull: true
  },
  category_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    defaultValue: 'draft'
  }
}, {
  tableName: 'questions',
  timestamps: true
});

// 试卷模型
const Paper = sequelize.define('Paper', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  total_score: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  time_limit: {
    type: DataTypes.INTEGER, // 分钟
    defaultValue: 60
  },
  shuffle: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // 是否随机题目顺序
  },
  show_score: {
    type: DataTypes.BOOLEAN,
    defaultValue: true // 交卷后是否显示分数
  },
  show_answer: {
    type: DataTypes.BOOLEAN,
    defaultValue: true // 交卷后是否显示答案
  },
  access_code: {
    type: DataTypes.STRING(20),
    allowNull: true // 访问密码
  },
  qrcode_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'closed'),
    defaultValue: 'draft'
  }
}, {
  tableName: 'papers',
  timestamps: true
});

// 试卷题目关联模型
const PaperQuestion = sequelize.define('PaperQuestion', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  paper_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  question_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  }
}, {
  tableName: 'paper_questions',
  timestamps: true
});

// 考试记录模型
const ExamRecord = sequelize.define('ExamRecord', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  paper_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true // 学员可以不登录
  },
  student_name: {
    type: DataTypes.STRING(50),
    allowNull: true // 匿名答题时的姓名
  },
  ip_address: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'submitted', 'graded'),
    defaultValue: 'in_progress'
  },
  answers: {
    type: DataTypes.JSON, // 存储学员答案
    allowNull: true
  }
}, {
  tableName: 'exam_records',
  timestamps: true
});

// 积分记录模型
const ScoreRecord = sequelize.define('ScoreRecord', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  exam_record_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('exam', 'first_submit', 'perfect_score', 'streak'),
    defaultValue: 'exam'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'score_records',
  timestamps: true
});

// 定义关联关系
User.hasMany(Category, { foreignKey: 'user_id' });
Category.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Question, { foreignKey: 'user_id' });
Question.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Question, { foreignKey: 'category_id' });
Question.belongsTo(Category, { foreignKey: 'category_id' });

User.hasMany(Paper, { foreignKey: 'user_id' });
Paper.belongsTo(User, { foreignKey: 'user_id' });

Paper.belongsToMany(Question, { through: PaperQuestion, foreignKey: 'paper_id' });
Question.belongsToMany(Paper, { through: PaperQuestion, foreignKey: 'question_id' });

Paper.hasMany(ExamRecord, { foreignKey: 'paper_id' });
ExamRecord.belongsTo(Paper, { foreignKey: 'paper_id' });

User.hasMany(ExamRecord, { foreignKey: 'user_id' });
ExamRecord.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(ScoreRecord, { foreignKey: 'user_id' });
ScoreRecord.belongsTo(User, { foreignKey: 'user_id' });

// 导出
module.exports = {
  sequelize,
  User,
  Category,
  Question,
  Paper,
  PaperQuestion,
  ExamRecord,
  ScoreRecord
};
