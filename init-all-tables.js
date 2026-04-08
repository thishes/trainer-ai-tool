require('dotenv').config();
const mysql = require('mysql2/promise');

const TABLES = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      avatar VARCHAR(500),
      phone VARCHAR(50),
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      user_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  questions: `
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      options JSON,
      answer TEXT,
      difficulty VARCHAR(50) DEFAULT 'medium',
      score INT DEFAULT 10,
      explanation TEXT,
      category_id INT,
      user_id INT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  papers: `
    CREATE TABLE IF NOT EXISTS papers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      owner_id INT,
      user_id INT,
      duration INT DEFAULT 60,
      total_score INT DEFAULT 100,
      passing_score INT DEFAULT 60,
      question_ids JSON,
      random_config JSON,
      status VARCHAR(50) DEFAULT 'draft',
      shuffle TINYINT(1) DEFAULT 0,
      show_score TINYINT(1) DEFAULT 1,
      show_answer TINYINT(1) DEFAULT 1,
      access_code VARCHAR(100),
      ip_limit INT DEFAULT 0,
      allow_all_users TINYINT(1) DEFAULT 1,
      start_time DATETIME,
      end_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  paper_questions: `
    CREATE TABLE IF NOT EXISTS paper_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paper_id INT NOT NULL,
      paper_key_id VARCHAR(100),
      question_id INT NOT NULL,
      question_key_id VARCHAR(100),
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  exam_records: `
    CREATE TABLE IF NOT EXISTS exam_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_id VARCHAR(100),
      paper_id INT NOT NULL,
      paper_key_id VARCHAR(100),
      student_id INT,
      student_name VARCHAR(100),
      objective_score INT DEFAULT 0,
      essay_score INT DEFAULT 0,
      total_score INT DEFAULT 0,
      percentage DECIMAL(5,2),
      start_time DATETIME,
      end_time DATETIME,
      answers JSON,
      status VARCHAR(50) DEFAULT 'pending',
      graded TINYINT(1) DEFAULT 0,
      user_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  score_records: `
    CREATE TABLE IF NOT EXISTS score_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_id VARCHAR(100),
      paper_id INT NOT NULL,
      paper_key_id VARCHAR(100),
      student_id INT,
      student_name VARCHAR(100),
      score INT DEFAULT 0,
      percentage DECIMAL(5,2),
      user_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  students: `
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_no VARCHAR(100) NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  paper_students: `
    CREATE TABLE IF NOT EXISTS paper_students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paper_id INT NOT NULL,
      paper_key_id VARCHAR(100),
      student_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_paper_student (paper_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  essay_scores: `
    CREATE TABLE IF NOT EXISTS essay_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      exam_record_id INT NOT NULL,
      question_id INT NOT NULL,
      score INT DEFAULT 0,
      feedback TEXT,
      graded_by INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  announcements: `
    CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      author_id INT,
      importance VARCHAR(50) DEFAULT 'normal',
      status VARCHAR(50) DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  promotions: `
    CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      enable_signup TINYINT(1) DEFAULT 0,
      locked TINYINT(1) DEFAULT 0,
      created_by INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_created_by (created_by),
      INDEX idx_status (status),
      INDEX idx_locked (locked)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  promotion_signups: `
    CREATE TABLE IF NOT EXISTS promotion_signups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      promotion_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_promotion_id (promotion_id),
      INDEX idx_user_id (user_id),
      UNIQUE KEY uk_promotion_user (promotion_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `
};

async function initAllTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 15000
  });

  try {
    // Check existing tables
    const [existing] = await pool.execute('SHOW TABLES');
    const existingTables = existing.map(r => Object.values(r)[0]);
    console.log('Existing tables:', existingTables.join(', '));

    // Create missing tables
    for (const [tableName, createSQL] of Object.entries(TABLES)) {
      if (!existingTables.includes(tableName)) {
        await pool.execute(createSQL);
        console.log(`[CREATED] Table '${tableName}'`);
      } else {
        console.log(`[EXISTS] Table '${tableName}'`);
      }
    }

    // Verify all tables
    const [after] = await pool.execute('SHOW TABLES');
    console.log('\nAll tables now:', after.map(r => Object.values(r)[0]).join(', '));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

initAllTables();
