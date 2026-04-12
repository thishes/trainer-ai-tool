const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function initMySQLTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trainer_ai_tool',
    connectTimeout: 15000
  });

  try {
    await pool.execute(`
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
    `);
    console.log('promotions 表创建成功');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS promotion_signups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        promotion_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_promotion_id (promotion_id),
        INDEX idx_user_id (user_id),
        UNIQUE KEY uk_promotion_user (promotion_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('promotion_signups 表创建成功');

    const [promos] = await pool.execute('SELECT COUNT(*) as cnt FROM promotions');
    console.log('当前 promotions 数量:', promos[0].cnt);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

initMySQLTables();
