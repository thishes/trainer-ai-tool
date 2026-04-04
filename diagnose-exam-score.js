#!/usr/bin/env node
/**
 * 考试分数诊断脚本
 * 检查考试记录、试卷题目和答案配置
 */

const db = require('./server/db');

console.log('=== 考试分数诊断 ===\n');

// 1. 获取最近的考试记录
const recentRecords = db.examRecords.findAll({ limit: 5 });
console.log('最近的考试记录:');
recentRecords.forEach(r => {
  console.log(`  ID: ${r.id}, 试卷: ${r.paper_id}, 学生: ${r.student_name}`);
  console.log(`    状态: ${r.status}, 分数: ${r.score}, 百分比: ${r.percentage}`);
  console.log(`    答案: ${JSON.stringify(r.answers)}`);
  console.log('');
});

// 2. 获取每个考试记录的详细分析
console.log('--- 详细分析 ---');
for (const record of recentRecords) {
  if (record.status === 'submitted' || record.status === 'graded') {
    console.log(`\n考试记录 #${record.id} (${record.student_name}):`);

    // 获取试卷
    const paper = record.paper_id ? db.papers.findById(record.paper_id) : null;
    if (!paper) {
      console.log('  ❌ 试卷不存在');
      continue;
    }
    console.log(`  试卷: ${paper.title} (ID: ${paper.id}, Key: ${paper.key_id})`);

    // 获取试卷题目
    const paperKeyId = record.paper_key_id || paper.key_id;
    const paperQuestions = db.paperQuestions.findByPaperKeyId(paperKeyId);
    console.log(`  试卷题目数: ${paperQuestions.length}`);

    // 获取用户答案
    const userAnswers = record.answers || {};
    console.log(`  用户答案键: ${Object.keys(userAnswers).join(', ')}`);

    // 分析每道题
    let totalScore = 0;
    let maxScore = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const pq of paperQuestions) {
      const question = db.questions.findById(pq.question_id);
      if (!question) {
        console.log(`  ❌ 题目 ID ${pq.question_id} 不存在`);
        continue;
      }

      maxScore += pq.score;
      const userAnswer = userAnswers[question.id];

      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        matchedCount++;

        // 自动评分
        let isCorrect = false;
        if (question.type === 'single' || question.type === 'choice') {
          isCorrect = String(userAnswer).trim() === String(question.answer).trim();
        } else if (question.type === 'judge') {
          const userAns = String(userAnswer).trim().toLowerCase();
          const correctAns = String(question.answer).trim().toLowerCase();
          const isUserTrue = ['true', 'a', '1', 'yes', '正确'].includes(userAns);
          const isCorrectTrue = ['true', 'a', '1', 'yes', '正确'].includes(correctAns);
          isCorrect = isUserTrue === isCorrectTrue;
        } else if (question.type === 'multiple') {
          const userAns = Array.isArray(userAnswer) ? userAnswer.map(a => String(a).trim()).sort() : [String(userAnswer).trim()];
          const correctAns = Array.isArray(question.answer) ? question.answer.map(a => String(a).trim()).sort() : [String(question.answer).trim()];
          isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
        }

        if (isCorrect) {
          totalScore += pq.score;
        }

        console.log(`    题 ${question.id} (${question.type}): 用户答案="${userAnswer}", 正确答案="${question.answer}", 得分=${isCorrect ? pq.score : 0}`);
      } else {
        unmatchedCount++;
        console.log(`    题 ${question.id} (${question.type}): 用户未答，正确答案="${question.answer}"`);
      }
    }

    console.log(`  得分: ${totalScore}/${maxScore} (匹配 ${matchedCount} 题, 未匹配 ${unmatchedCount} 题)`);
    console.log(`  数据库记录分数: ${record.score}`);
  }
}

console.log('\n=== 诊断完成 ===');
process.exit(0);
