const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'kb.thishe.com',
    port: parseInt(process.env.DB_PORT) || 33060,
    user: process.env.DB_USER || 'lankong',
    password: process.env.DB_PASSWORD || 'Hejinqiang860612!',
    database: process.env.DB_NAME || 'trainer_ai_tool'
  });

  try {
    const [rows] = await pool.query('SELECT id, title, status, enable_signup, signup_config FROM promotions');
    console.log('Promotions data:');
    rows.forEach(r => {
      console.log(JSON.stringify({
        id: r.id,
        title: r.title,
        status: r.status,
        enable_signup: r.enable_signup,
        signup_config: r.signup_config
      }, null, 2));
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
check();