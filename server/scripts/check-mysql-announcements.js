const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: 'kb.thishe.com',
    port: 33060,
    user: 'lankong',
    password: 'Hejinqiang860612!',
    database: 'trainer_ai_tool'
  });

  try {
    console.log('Testing direct query...');
    const [rows] = await pool.query('SELECT * FROM announcements LIMIT 5');
    console.log('Direct query result:', rows.length, 'rows');
    if (rows.length > 0) {
      console.log('First:', rows[0].id, rows[0].title);
    }
  } finally {
    await pool.end();
  }
}
check().catch(e => console.error('Error:', e.message));
