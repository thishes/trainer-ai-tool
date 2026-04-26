const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function addColumn() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'trainer_ai_tool'
  });
  
  try {
    await conn.execute('ALTER TABLE exam_records ADD COLUMN percentage INT DEFAULT NULL AFTER score');
    console.log('✅ percentage 列添加成功');
    
    const [records] = await conn.execute(
      'SELECT id, score FROM exam_records WHERE status IN ("submitted", "graded") AND score IS NOT NULL'
    );
    
    for (const r of records) {
      const pct = Math.round((r.score / 10) * 100);
      await conn.execute('UPDATE exam_records SET percentage = ? WHERE id = ?', [pct, r.id]);
    }
    console.log(`✅ 已回填 ${records.length} 条记录的百分比`);
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('⚠️ percentage 列已存在，跳过');
    } else {
      console.error('❌ 错误:', e.message);
    }
  }
  await conn.end();
}

addColumn();