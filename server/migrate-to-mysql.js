const mysql = require('mysql2/promise');

function getEnv(name, defaultValue = null) {
  return process.env[name] || defaultValue;
}

const DB_CONFIG = {
  host: getEnv('DB_HOST', 'localhost'),
  port: parseInt(getEnv('DB_PORT', '33060')),
  user: getEnv('DB_USER', 'root'),
  password: getEnv('DB_PASSWORD', ''),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const DB_NAME = getEnv('DB_NAME', 'trainer_ai_tool');

const db = require('./db.json');

async function migrate() {
  console.log('🔄 开始MySQL迁移...\n');

  let connection;
  try {
    // 先连接不带数据库
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 连接到MySQL成功\n');

    // 创建数据库
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✅ 数据库 ${DB_NAME} 已创建/选中\n`);

    // 创建表结构
    console.log('📦 创建表结构...\n');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        avatar VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        type VARCHAR(20) NOT NULL,
        options JSON,
        answer TEXT,
        difficulty VARCHAR(20) DEFAULT 'medium',
        score INT DEFAULT 10,
        explanation TEXT,
        category_id INT,
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS papers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INT NOT NULL,
        duration INT DEFAULT 60,
        total_score INT DEFAULT 100,
        question_ids JSON,
        random_config JSON,
        status VARCHAR(20) DEFAULT 'draft',
        passing_score INT DEFAULT 60,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paper_id INT NOT NULL,
        student_id INT NOT NULL,
        student_name VARCHAR(100),
        objective_score INT DEFAULT 0,
        essay_score INT DEFAULT 0,
        total_score INT DEFAULT 0,
        start_time TIMESTAMP NULL,
        end_time TIMESTAMP NULL,
        answers JSON,
        status VARCHAR(20) DEFAULT 'pending',
        graded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS essay_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_record_id INT NOT NULL,
        question_id INT NOT NULL,
        score INT DEFAULT 0,
        feedback TEXT,
        graded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_record_id) REFERENCES exam_records(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        author_id INT,
        importance VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'published',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ 表结构创建完成\n');

    // 迁移数据
    console.log('📥 迁移数据...\n');

    // 迁移用户
    if (db.users && db.users.length > 0) {
      for (const user of db.users) {
        await connection.query(
          `INSERT IGNORE INTO users (id, username, password, role, avatar) VALUES (?, ?, ?, ?, ?)`,
          [user.id, user.username, user.password, user.role, user.avatar || null]
        );
      }
      console.log(`✅ 迁移了 ${db.users.length} 个用户`);
    }

    // 迁移分类
    if (db.categories && db.categories.length > 0) {
      for (const cat of db.categories) {
        await connection.query(
          `INSERT IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)`,
          [cat.id, cat.name, cat.description || null]
        );
      }
      console.log(`✅ 迁移了 ${db.categories.length} 个分类`);
    }

    // 迁移题目
    if (db.questions && db.questions.length > 0) {
      for (const q of db.questions) {
        await connection.query(
          `INSERT IGNORE INTO questions (id, title, type, options, answer, difficulty, score, explanation, category_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, q.title, q.type, JSON.stringify(q.options || []), q.answer, q.difficulty, q.score, q.explanation, q.category_id, q.status]
        );
      }
      console.log(`✅ 迁移了 ${db.questions.length} 道题目`);
    }

    // 迁移试卷
    if (db.papers && db.papers.length > 0) {
      for (const paper of db.papers) {
        await connection.query(
          `INSERT IGNORE INTO papers (id, title, description, owner_id, duration, total_score, question_ids, random_config, status, passing_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [paper.id, paper.title, paper.description, paper.owner_id, paper.duration, paper.total_score, JSON.stringify(paper.question_ids || []), JSON.stringify(paper.random_config || {}), paper.status, paper.passing_score]
        );
      }
      console.log(`✅ 迁移了 ${db.papers.length} 份试卷`);
    }

    // 迁移考试记录
    if (db.examRecords && db.examRecords.length > 0) {
      for (const record of db.examRecords) {
        await connection.query(
          `INSERT IGNORE INTO exam_records (id, paper_id, student_id, student_name, objective_score, essay_score, total_score, start_time, end_time, answers, status, graded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.paper_id, record.student_id, record.student_name, record.objective_score, record.essay_score, record.total_score, record.start_time, record.end_time, JSON.stringify(record.answers || {}), record.status, record.graded || false]
        );
      }
      console.log(`✅ 迁移了 ${db.examRecords.length} 条考试记录`);
    }

    // 迁移主观评分
    if (db.essayScores && db.essayScores.length > 0) {
      for (const score of db.essayScores) {
        await connection.query(
          `INSERT IGNORE INTO essay_scores (id, exam_record_id, question_id, score, feedback, graded_by) VALUES (?, ?, ?, ?, ?, ?)`,
          [score.id, score.exam_record_id, score.question_id, score.score, score.feedback, score.graded_by]
        );
      }
      console.log(`✅ 迁移了 ${db.essayScores.length} 条主观评分`);
    }

    // 迁移公告
    if (db.announcements && db.announcements.length > 0) {
      for (const ann of db.announcements) {
        await connection.query(
          `INSERT IGNORE INTO announcements (id, title, content, author_id, importance, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [ann.id, ann.title, ann.content, ann.author_id, ann.importance, ann.status]
        );
      }
      console.log(`✅ 迁移了 ${db.announcements.length} 条公告`);
    }

    console.log('\n🎉 MySQL迁移完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate().catch(console.error);
