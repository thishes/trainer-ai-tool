const mysql = require('mysql2/promise');
async function test() {
  const c = await mysql.createConnection({host:'localhost',port:3306,user:'root',password:'Hejinqiang860612!',database:'trainer_ai_tool'});
  const [papers] = await c.query('SELECT id, key_id FROM papers WHERE id=2');
  console.log('Paper:', JSON.stringify(papers[0]));
  const [pByKey] = await c.query('SELECT * FROM papers WHERE key_id=?', [papers[0].key_id]);
  console.log('By key_id:', pByKey.length ? 'found' : 'NOT FOUND');
  const [pqs] = await c.query('SELECT * FROM paper_questions WHERE paper_id=2');
  console.log('paper_questions for paper_id=2:', pqs.length, 'records');
  for (const pq of pqs) console.log(' ', JSON.stringify(pq));
  const [qs] = await c.query('SELECT id, type, title FROM questions WHERE id=1');
  console.log('Question 1:', qs.length ? JSON.stringify(qs[0]) : 'NOT FOUND');
  await c.end();
}
test().catch(e => console.error(e));
