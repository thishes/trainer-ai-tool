const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env.local', override: true });
process.env.NODE_ENV = 'production';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME || 'trainer_ai_tool'
};

async function createTables() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('已连接到数据库:', dbConfig.database);

  try {
    // 创建 courses 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(100),
        title VARCHAR(200) NOT NULL DEFAULT '',
        description TEXT,
        cover_image VARCHAR(500),
        visibility ENUM('public','password','private','link') NOT NULL DEFAULT 'public',
        access_password VARCHAR(100),
        user_id INT,
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        view_count INT NOT NULL DEFAULT 0,
        like_count INT NOT NULL DEFAULT 0,
        settings JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_courses_user_status (user_id, status),
        INDEX idx_courses_visibility (visibility),
        INDEX idx_courses_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ courses 表创建成功');

    // 创建 chapters 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chapters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        parent_id INT,
        title VARCHAR(200) NOT NULL DEFAULT '',
        content LONGTEXT,
        sort_order INT NOT NULL DEFAULT 0,
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_chapters_course_parent (course_id, parent_id),
        INDEX idx_chapters_course_order (course_id, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ chapters 表创建成功');

    // 创建 course_access 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS course_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        user_id INT NOT NULL,
        granted_by INT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_course_user (course_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ course_access 表创建成功');

    console.log('\n✅ 课程服务数据表创建完成！');
  } catch (e) {
    console.error('✗ 错误:', e.message);
    throw e;
  } finally {
    await connection.end();
  }
}

createTables().catch(e => { console.error(e); process.exit(1); });