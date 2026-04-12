const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trainer_ai_tool'
  });

  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]).join(', '));

    for (const t of ['users', 'categories', 'questions', 'papers', 'announcements']) {
      try {
        const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM ' + t);
        console.log(t + ': ' + rows[0].cnt + ' rows');
      } catch (e) {
        console.log(t + ': ERROR - ' + e.message);
      }
    }
  } finally {
    await pool.end();
  }
}
check().catch(e => console.error('Error:', e.message));
