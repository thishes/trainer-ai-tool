const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'root', password: 'Hejinqiang860612!',
    database: 'trainer_ai_tool'
  });
  
  // 检查并添加缺失的列
  const cols = [
    { name: 'owner_id', sql: 'BIGINT NOT NULL DEFAULT 1' },
    { name: 'duration', sql: 'INT DEFAULT 60' },
    { name: 'passing_score', sql: 'INT DEFAULT 60' },
    { name: 'question_ids', sql: 'JSON' },
    { name: 'random_config', sql: 'JSON' },
    { name: 'user_id', sql: 'BIGINT NULL' }
  ];
  
  for (const c of cols) {
    const [rows] = await conn.execute(
      'SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME="papers" AND COLUMN_NAME=?',
      [c.name]
    );
    if (rows[0].cnt === 0) {
      try {
        await conn.execute('ALTER TABLE papers ADD COLUMN ' + c.name + ' ' + c.sql);
        console.log('✅ Added:', c.name);
      } catch(e) {
        console.log('❌ Failed:', c.name, e.message);
      }
    } else {
      console.log('✅ Exists:', c.name);
    }
  }
  
  // 创建索引
  try { await conn.execute('CREATE INDEX idx_owner ON papers(owner_id)'); } catch(e) {}
  try { await conn.execute('CREATE INDEX idx_user ON papers(user_id)'); } catch(e) {}
  
  // 验证
  const [result] = await conn.execute('DESCRIBE papers');
  console.log('\n📋 Papers table columns:');
  result.forEach(r => console.log('  -', r.Field, r.Type));
  
  await conn.end();
  console.log('\nDone!');
})();
