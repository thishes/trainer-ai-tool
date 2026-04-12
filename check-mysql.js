const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trainer_ai_tool',
    connectTimeout: 10000
  });

  const [rows] = await pool.execute('SHOW TABLES');
  console.log('MySQL Tables:', rows.map(r => Object.values(r)[0]).join(', '));

  const tables = ['users', 'categories', 'questions', 'papers', 'promotions'];
  for (const t of tables) {
    try {
      const [r] = await pool.execute(`SELECT COUNT(*) as cnt FROM ${t}`);
      console.log(`${t}: ${r[0].cnt} rows`);
    } catch (e) {
      console.log(`${t}: ERROR - ${e.message}`);
    }
  }

  await pool.end();
}

check().catch(e => console.error('Error:', e.message));
