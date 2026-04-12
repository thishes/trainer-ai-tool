const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'kb.thishe.com',
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER || 'lankong',
    password: process.env.DB_PASSWORD || 'Hejinqiang860612!',
    database: process.env.DB_NAME || 'trainer_ai_tool'
  });

  try {
    const [rows] = await pool.query('SELECT * FROM announcements LIMIT 5');
    console.log('Announcements count:', rows.length);
    if (rows.length > 0) {
      console.log('First announcement:', JSON.stringify(rows[0], null, 2));
    }
  } finally {
    await pool.end();
  }
}
check().catch(e => console.error('Error:', e.message));
