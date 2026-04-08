const mysql = require('mysql2/promise');

async function initDatabase() {
  console.log('[DB Init] 开始初始化数据库...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'kb.thishe.com',
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER || 'lankong',
    password: process.env.DB_PASSWORD || 'Hejinqiang860612!',
    database: process.env.DB_NAME || 'trainer_ai_tool'
  });

  const createTableSQL = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'trainer',
      status VARCHAR(20) DEFAULT 'active',
      avatar TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      parent_id INT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT,
      type VARCHAR(20) DEFAULT 'objective',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      options JSON,
      answer TEXT,
      difficulty VARCHAR(20) DEFAULT 'medium',
      score INT DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS papers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_id VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      user_id INT,
      owner_id INT,
      duration INT DEFAULT 60,
      total_score INT DEFAULT 100,
      status VARCHAR(20) DEFAULT 'draft',
      question_ids JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS exam_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_id VARCHAR(50) UNIQUE NOT NULL,
      paper_key_id VARCHAR(50) NOT NULL,
      student_id INT NOT NULL,
      student_name VARCHAR(100),
      score INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      answers JSON,
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submit_time TIMESTAMP NULL,
      graded_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      type VARCHAR(20) DEFAULT 'info',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      student_number VARCHAR(50) UNIQUE,
      phone VARCHAR(20),
      email VARCHAR(100),
      class_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS essay_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      exam_record_id INT NOT NULL,
      question_id INT NOT NULL,
      score INT DEFAULT 0,
      feedback TEXT,
      graded_by INT,
      graded_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of createTableSQL) {
    try {
      await conn.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log(`[DB Init] 表 ${tableName} 创建/检查完成`);
    } catch (e) {
      console.error('[DB Init] 建表失败:', e.message);
    }
  }

  await conn.end();
  console.log('[DB Init] 数据库初始化完成');
}

initDatabase().catch(e => {
  console.error('[DB Init] 初始化失败:', e.message);
  process.exit(1);
});