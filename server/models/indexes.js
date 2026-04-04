// server/models/indexes.js - 数据库索引定义
const { sequelize } = require('./index');

/**
 * 为所有模型添加索引
 * 注意：这些索引需要在数据库迁移时创建
 */
const indexes = {
  // 用户表索引
  users: [
    {
      name: 'idx_users_username',
      fields: ['username'],
      unique: true,
      desc: '用户名字段唯一索引，用于快速查找和登录验证'
    },
    {
      name: 'idx_users_phone',
      fields: ['phone'],
      unique: true,
      desc: '手机号唯一索引，用于快速查找'
    },
    {
      name: 'idx_users_wechat_openid',
      fields: ['wechat_openid'],
      unique: true,
      desc: '微信 OpenID 唯一索引，用于微信登录'
    },
    {
      name: 'idx_users_role_status',
      fields: ['role', 'status'],
      desc: '角色和状态复合索引，用于权限筛选和状态过滤'
    },
    {
      name: 'idx_users_created_at',
      fields: ['created_at'],
      desc: '创建时间索引，用于按时间排序和统计'
    }
  ],

  // 题库分类表索引
  categories: [
    {
      name: 'idx_categories_parent_id',
      fields: ['parent_id'],
      desc: '父分类 ID 索引，用于构建树形结构'
    },
    {
      name: 'idx_categories_user_id',
      fields: ['user_id'],
      desc: '用户 ID 索引，用于查询用户创建的分类'
    },
    {
      name: 'idx_categories_name',
      fields: ['name'],
      desc: '分类名称索引，用于搜索'
    }
  ],

  // 题目表索引
  questions: [
    {
      name: 'idx_questions_user_id',
      fields: ['user_id'],
      desc: '创建者 ID 索引，用于查询用户创建的题目'
    },
    {
      name: 'idx_questions_category_id',
      fields: ['category_id'],
      desc: '分类 ID 索引，用于按分类筛选题目'
    },
    {
      name: 'idx_questions_type',
      fields: ['type'],
      desc: '题目类型索引，用于按题型筛选'
    },
    {
      name: 'idx_questions_difficulty',
      fields: ['difficulty'],
      desc: '难度等级索引，用于按难度筛选'
    },
    {
      name: 'idx_questions_status',
      fields: ['status'],
      desc: '发布状态索引，用于筛选已发布题目'
    },
    {
      name: 'idx_questions_user_category_status',
      fields: ['user_id', 'category_id', 'status'],
      desc: '复合索引，优化题库管理列表查询'
    },
    {
      name: 'idx_questions_created_at',
      fields: ['created_at'],
      desc: '创建时间索引，用于按时间排序'
    }
  ],

  // 试卷表索引
  papers: [
    {
      name: 'idx_papers_user_id',
      fields: ['user_id'],
      desc: '创建者 ID 索引，用于查询用户创建的试卷'
    },
    {
      name: 'idx_papers_status',
      fields: ['status'],
      desc: '状态索引，用于筛选已发布试卷'
    },
    {
      name: 'idx_papers_user_status',
      fields: ['user_id', 'status'],
      desc: '复合索引，优化试卷列表查询'
    },
    {
      name: 'idx_papers_created_at',
      fields: ['created_at'],
      desc: '创建时间索引，用于按时间排序'
    }
  ],

  // 试卷题目关联表索引
  paper_questions: [
    {
      name: 'idx_paper_questions_paper_id',
      fields: ['paper_id'],
      desc: '试卷 ID 索引，用于查询试卷包含的题目'
    },
    {
      name: 'idx_paper_questions_question_id',
      fields: ['question_id'],
      desc: '题目 ID 索引，用于查询题目被哪些试卷使用'
    },
    {
      name: 'idx_paper_questions_paper_order',
      fields: ['paper_id', 'order'],
      desc: '复合索引，优化试卷题目排序查询'
    }
  ],

  // 考试记录表索引
  exam_records: [
    {
      name: 'idx_exam_records_paper_id',
      fields: ['paper_id'],
      desc: '试卷 ID 索引，用于查询某试卷的所有考试记录'
    },
    {
      name: 'idx_exam_records_user_id',
      fields: ['user_id'],
      desc: '用户 ID 索引，用于查询用户的考试记录'
    },
    {
      name: 'idx_exam_records_status',
      fields: ['status'],
      desc: '状态索引，用于筛选未提交/待评分的记录'
    },
    {
      name: 'idx_exam_records_paper_status',
      fields: ['paper_id', 'status'],
      desc: '复合索引，优化待评分列表查询'
    },
    {
      name: 'idx_exam_records_start_time',
      fields: ['start_time'],
      desc: '开始时间索引，用于按时间排序和统计'
    }
  ],

  // 积分记录表索引
  score_records: [
    {
      name: 'idx_score_records_user_id',
      fields: ['user_id'],
      desc: '用户 ID 索引，用于查询用户积分记录'
    },
    {
      name: 'idx_score_records_exam_record_id',
      fields: ['exam_record_id'],
      desc: '考试记录 ID 索引，用于关联查询'
    },
    {
      name: 'idx_score_records_type',
      fields: ['type'],
      desc: '积分类型索引，用于按类型统计'
    },
    {
      name: 'idx_score_records_created_at',
      fields: ['created_at'],
      desc: '创建时间索引，用于按时间排序'
    }
  ]
};

/**
 * 生成创建索引的 SQL 语句
 */
function generateCreateIndexSQL() {
  const sqlStatements = [];

  for (const [tableName, tableIndexes] of Object.entries(indexes)) {
    for (const index of tableIndexes) {
      const unique = index.unique ? 'UNIQUE ' : '';
      const fields = index.fields.join(', ');
      const sql = `CREATE ${unique}INDEX ${index.name} ON ${tableName} (${fields});`;
      sqlStatements.push({
        sql,
        table: tableName,
        indexName: index.name,
        description: index.desc
      });
    }
  }

  return sqlStatements;
}

/**
 * 生成删除索引的 SQL 语句
 */
function generateDropIndexSQL() {
  const sqlStatements = [];

  for (const [tableName, tableIndexes] of Object.entries(indexes)) {
    for (const index of tableIndexes) {
      const sql = `DROP INDEX ${index.name} ON ${tableName};`;
      sqlStatements.push({
        sql,
        table: tableName,
        indexName: index.name
      });
    }
  }

  return sqlStatements;
}

/**
 * 检查索引是否已存在
 */
async function checkIndexExists(indexName) {
  try {
    const [results] = await sequelize.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME = ?`,
      { replacements: [indexName] }
    );
    return results.length > 0;
  } catch (error) {
    console.error(`检查索引 ${indexName} 失败:`, error);
    return false;
  }
}

/**
 * 创建所有缺失的索引
 */
async function createMissingIndexes() {
  const statements = generateCreateIndexSQL();
  const created = [];
  const skipped = [];
  const errors = [];

  for (const stmt of statements) {
    try {
      const exists = await checkIndexExists(stmt.indexName);
      if (exists) {
        skipped.push(stmt);
        console.log(`跳过已存在的索引：${stmt.indexName}`);
      } else {
        await sequelize.query(stmt.sql);
        created.push(stmt);
        console.log(`创建索引：${stmt.indexName} (${stmt.description})`);
      }
    } catch (error) {
      errors.push({ ...stmt, error: error.message });
      console.error(`创建索引 ${stmt.indexName} 失败:`, error.message);
    }
  }

  return { created, skipped, errors };
}

/**
 * 删除所有索引
 */
async function dropAllIndexes() {
  const statements = generateDropIndexSQL();
  const dropped = [];
  const errors = [];

  for (const stmt of statements) {
    try {
      await sequelize.query(stmt.sql);
      dropped.push(stmt);
      console.log(`删除索引：${stmt.indexName}`);
    } catch (error) {
      errors.push({ ...stmt, error: error.message });
      console.error(`删除索引 ${stmt.indexName} 失败:`, error.message);
    }
  }

  return { dropped, errors };
}

module.exports = {
  indexes,
  generateCreateIndexSQL,
  generateDropIndexSQL,
  createMissingIndexes,
  dropAllIndexes
};
