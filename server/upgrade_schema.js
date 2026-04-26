const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function upgradeSchema() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'trainer_ai_tool'
  });
  
  try {
    // 添加客观题/主观题分离计分字段
    const columns = [
      { name: 'objective_score', type: 'INT', after: 'percentage', desc: '客观题得分' },
      { name: 'objective_total', type: 'INT', after: 'objective_score', desc: '客观题满分' },
      { name: 'subjective_score', type: 'INT', after: 'objective_total', desc: '主观题得分' },
      { name: 'subjective_total', type: 'INT', after: 'subjective_score', desc: '主观题满分' }
    ];
    
    for (const col of columns) {
      try {
        await conn.execute(`ALTER TABLE exam_records ADD COLUMN ${col.name} ${col.type} DEFAULT NULL AFTER ${col.after}`);
        console.log(`✅ 添加列 ${col.name} (${col.desc})`);
      } catch (e) {
        if (e.message.includes('duplicate column')) {
          console.log(`⚠️ 列 ${col.name} 已存在`);
        } else {
          throw e;
        }
      }
    }

    // 回填已有记录的客观题分数
    const [records] = await conn.execute(
      `SELECT id, paper_id, score, percentage, status FROM exam_records WHERE status IN ('submitted', 'graded')`
    );
    
    let updated = 0;
    for (const r of records) {
      const [questions] = await conn.execute(`
        SELECT pq.question_id, pq.score, q.type 
        FROM paper_questions pq 
        LEFT JOIN questions q ON pq.question_id = q.id 
        WHERE pq.paper_id = ?
      `, [r.paper_id]);
      
      if (!questions || questions.length === 0) continue;
      
      const objectiveQuestions = questions.filter(q => 
        !['subjective', 'essay', 'question'].includes(q.type)
      );
      const essayQuestions = questions.filter(q => 
        ['subjective', 'essay', 'question'].includes(q.type)
      );
      
      const objTotal = objectiveQuestions.reduce((s, q) => s + (q.score || 0), 0);
      const essayTotal = essayQuestions.reduce((s, q) => s + (q.score || 0), 0);
      
      let objScore = r.score;
      let subjScore = null;
      
      if (essayTotal > 0) {
        // 有主观题：现有 score 视为客观题分数
        objScore = r.score || 0;
        subjScore = null; // 待评分
      }
      
      await conn.execute(`
        UPDATE exam_records SET 
          objective_score = ?, 
          objective_total = ?, 
          subjective_score = ?, 
          subjective_total = ?
        WHERE id = ?
      `, [objScore, objTotal, subjScore, essayTotal, r.id]);
      updated++;
    }
    
    console.log(`✅ 已回填 ${updated} 条记录的分离计分字段`);
    
  } catch (e) {
    console.error('❌ 错误:', e.message);
  } finally {
    await conn.end();
  }
}

upgradeSchema();