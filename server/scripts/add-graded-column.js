const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'kb.thishe.com',
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER || 'lankong',
    password: process.env.DB_PASSWORD || 'Hejinqiang860612!',
    database: process.env.DB_NAME || 'trainer_ai_tool'
  });

  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM exam_records LIKE "graded"');
    if (cols.length === 0) {
      console.log('添加 graded 列到 exam_records 表...');
      await pool.query('ALTER TABLE exam_records ADD COLUMN graded BOOLEAN DEFAULT FALSE AFTER status');
      console.log('✅ graded 列添加成功');
    } else {
      console.log('✅ graded 列已存在');
    }
  } catch (e) {
    console.error('迁移失败:', e.message);
  } finally {
    await pool.end();
  }
}
migrate();