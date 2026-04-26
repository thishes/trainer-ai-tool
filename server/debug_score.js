const mysql = require('mysql2/promise');

async function debug() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'trainer_user',
    password: 'Trainer@2025!Secure',
    database: 'trainer_ai_tool'
  });

  console.log('=== 检查最新的考试记录 ===');
  const [records] = await conn.execute(`
    SELECT id, paper_id, score, status, answers, start_time, end_time
    FROM exam_records
    ORDER BY id DESC
    LIMIT 3
  `);

  for (const r of records) {
    console.log(`\n--- 记录 ID: ${r.id}, 分数: ${r.score}, 状态: ${r.status} ---`);
    console.log('answers 字段:', r.answers);
    
    if (r.answers) {
      try {
        const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
        console.log('解析后的 answers:', JSON.stringify(answers, null, 2));
        console.log('answers keys:', Object.keys(answers));
      } catch (e) {
        console.log('解析失败:', e.message);
      }
    }
  }

  console.log('\n\n=== 检查试卷关联的题目 ===');
  const [questions] = await conn.execute(`
    SELECT pq.paper_id, pq.question_id, pq.score, q.id as qid, q.type, q.answer, q.title
    FROM paper_questions pq
    LEFT JOIN questions q ON pq.question_id = q.id
    WHERE pq.paper_id = 1
  `);
  
  for (const q of questions) {
    console.log(`题目ID: ${q.question_id}, 类型: ${q.type}, 正确答案: ${q.answer}, 分值: ${q.score}`);
    console.log(`  标题: ${q.title?.substring(0, 50)}...`);
  }

  await conn.end();
}

debug().catch(console.error);