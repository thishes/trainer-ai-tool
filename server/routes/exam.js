// server/routes/exam.js - 考试路由
const express = require('express');
const router = express.Router();
const repo = require('../repository');
const authenticate = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const schemas = require('../middleware/schemas');
const resp = require('../utils/response');

// 问答题类型判断函数
const isEssayQuestion = (type) => ['subjective', 'essay', 'question'].includes(type);
const PASS_SCORE = 60;

const statsCache = new Map();
const STATS_CACHE_TTL = 10000;

function getCachedStats(paperId) {
  const key = `stats:${paperId}`;
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.timestamp < STATS_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedStats(paperId, data) {
  statsCache.set(`stats:${paperId}`, { data, timestamp: Date.now() });
}

function invalidateStatsCache(paperId) {
  statsCache.delete(`stats:${paperId}`);
}

// 测试接口
router.get('/test', authenticate, (req, res) => {
  res.json({ success: true, message: '后端服务正常运行', user: req.user });
});

// 开始考试
router.post('/start', rateLimiters.api, validate(schemas.examStart), asyncHandler(async (req, res) => {
  const { paper_id, student_name, user_id, access_code } = req.body;

  if (student_name && /<[^>]*>/.test(student_name)) {
    return resp.error(res, '参数包含非法字符', 400);
  }

  const paper = await repo.getPublicPaper(paper_id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在或未发布');
  }

  // 检查访问密码
  if (paper.access_code) {
    if (access_code !== paper.access_code) {
      return resp.forbidden(res, '访问密码错误');
    }
  }

  // IP限制检查 - 通过 repository 统一查询
  if (paper.ip_limit > 0) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const ipCount = await repo.getExamRecordCountByIp(paper.id, clientIp, 'submitted');

    if (ipCount >= paper.ip_limit) {
      return resp.forbidden(res, `此试卷限制每个IP只能考${paper.ip_limit}次，您已完成考试`);
    }
  }

  // 指定考生检查
  if (paper.allow_all_users === false) {
    const { student_no } = req.body;
    const paperStudents = await repo.getPaperStudentsByPaperKeyId(paper.key_id);
    const student = paperStudents.find(ps => {
      if (!ps.student) return false;
      if (student_no) {
        return ps.student.student_no === student_no && ps.student.name === student_name;
      }
      return ps.student.name === student_name;
    });

    if (!student) {
      return resp.forbidden(res, '考生号或姓名不匹配，无法参加考试');
    }
  }

  // 创建考试记录
  const examRecord = await repo.createExamRecord({
    paper_id: paper.id,
    paper_key_id: paper.key_id,
    student_id: user_id ? parseInt(user_id) : null,
    student_name: student_name || '匿名学员',
    ip_address: req.ip,
    start_time: new Date().toISOString(),
    status: 'in_progress',
    answers: {}
  });

  console.log('[EXAM_START] {', JSON.stringify({
    paper_id: paper.id,
    paper_title: paper.title,
    student_name: student_name || '匿名学员',
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    exam_id: examRecord.id,
    timestamp: new Date().toISOString()
  }), '}');

  res.json({
    success: true,
    data: {
      exam_id: examRecord.id,
      paper_id: paper.id,
      title: paper.title,
      time_limit: paper.time_limit,
      start_time: examRecord.start_time
    }
  });
}));

// 获取考试题目
router.get('/:examId/questions', asyncHandler(async (req, res) => {
  const examRecord = await repo.getExamRecordById(req.params.examId);
  if (!examRecord) {
    return resp.notFound(res, '考试记录不存在');
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const isOwner = examRecord.ip_address && examRecord.ip_address !== 'unknown' && examRecord.ip_address === clientIp;

  if (!isOwner && !examRecord.student_name) {
    return resp.forbidden(res, '无权限获取此考试题目');
  }

  let paper;
  if (examRecord.paper_id) {
    paper = await repo.getPaperById(examRecord.paper_id);
  } else if (examRecord.paper_key_id) {
    paper = await repo.getPaperByKeyId(examRecord.paper_key_id);
  }

  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (!paper.key_id) {
    return resp.error(res, '试卷缺少key_id', 500);
  }

  const paperQuestions = await repo.getPaperQuestionsByPaperKeyId(paper.key_id);

  // 批量获取题目 - 解决 N+1 查询问题
  const questionIds = paperQuestions.map(pq => pq.question_id).filter(Boolean);
  const questionsList = await repo.getQuestionsByIds(questionIds);
  const questionsMap = {};
  for (const q of questionsList) {
    questionsMap[q.id] = q;
  }

  let questions = [];
  for (const pq of paperQuestions) {
    const q = questionsMap[pq.question_id];
    if (!q) continue;
    questions.push({
      id: q.id,
      title: q.title,
      type: q.type,
      options: q.options,
      score: pq.score,
      order: pq.order,
      user_answer: examRecord.answers ? examRecord.answers[q.id] : null
    });
  }

  // 如果设置了随机顺序
  if (paper.shuffle) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  res.json({
    success: true,
    data: {
      exam_id: examRecord.id,
      title: paper.title,
      time_limit: paper.time_limit,
      start_time: examRecord.start_time,
      questions
    }
  });
}));

// 保存答题进度
router.post('/save-progress', rateLimiters.api, validate(schemas.examSaveProgress), asyncHandler(async (req, res) => {
  const { exam_id, answers } = req.body;

  const examRecord = await repo.getExamRecordById(exam_id);
  if (!examRecord) {
    return resp.notFound(res, '考试记录不存在');
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const isOwner = examRecord.ip_address && examRecord.ip_address !== 'unknown' && examRecord.ip_address === clientIp;

  if (!isOwner && examRecord.student_name !== req.body.student_name) {
    return resp.forbidden(res, '无权限修改此考试记录');
  }

  const currentAnswers = examRecord.answers || {};
  const mergedAnswers = { ...currentAnswers, ...answers };

  await repo.updateExamRecord(exam_id, { answers: mergedAnswers });
  res.json({ success: true, message: '保存成功' });
}));

// 提交试卷
router.post('/submit', rateLimiters.api, validate(schemas.examSubmit), asyncHandler(async (req, res) => {
  const { exam_id, answers } = req.body;

  const examRecord = await repo.getExamRecordById(exam_id);
  if (!examRecord) {
    return resp.notFound(res, '考试记录不存在');
  }

  if (examRecord.status === 'submitted' || examRecord.status === 'graded') {
    return resp.error(res, '试卷已提交');
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const isOwner = examRecord.ip_address && examRecord.ip_address !== 'unknown' && examRecord.ip_address === clientIp;

  if (!isOwner && examRecord.student_name !== req.body.student_name) {
    return resp.forbidden(res, '无权限提交此试卷');
  }

  // 获取试卷和题目
  let paper;
  if (examRecord.paper_id) {
    paper = await repo.getPaperById(examRecord.paper_id);
  } else if (examRecord.paper_key_id) {
    paper = await repo.getPaperByKeyId(examRecord.paper_key_id);
  }
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }
  const paperQuestions = paper.key_id ? await repo.getPaperQuestionsByPaperKeyId(paper.key_id) : [];

  // 批量获取题目 - 解决 N+1 查询（原来每道题一次查询）
  const questionIds = paperQuestions.map(pq => pq.question_id).filter(Boolean);
  const questionsList = await repo.getQuestionsByIds(questionIds);
  const questionsMap = {};
  for (const q of questionsList) {
    questionsMap[q.id] = q;
  }

  // 自动批改客观题
  let totalScore = 0;
  let correctCount = 0;
  const results = {};
  let hasEssay = false;

  const objectiveQuestionIds = [];
  const essayAnswers = {};

  for (const pq of paperQuestions) {
    const question = questionsMap[pq.question_id];
    if (!question) continue;

    // 检查是否是主观题
    if (isEssayQuestion(question.type)) {
      hasEssay = true;
      essayAnswers[question.id] = {
        user_answer: answers[question.id] || '',
        max_score: pq.score
      };
      // 主观题不自动批改
      results[question.id] = {
        user_answer: answers[question.id],
        correct_answer: question.answer,
        is_correct: null,
        score: 0,
        explanation: question.explanation
      };
      continue;
    }

    objectiveQuestionIds.push(pq.question_id);

    // 客观题自动批改
    const userAnswer = answers[question.id];
    const questionAnswer = question.answer;
    let isCorrect = false;
    let score = 0;

    if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
      if (question.type === 'single' || question.type === 'choice') {
        isCorrect = String(userAnswer).trim() === String(questionAnswer).trim();
      } else if (question.type === 'judge') {
        let userChoice = String(userAnswer).trim();
        let correctChoice = String(questionAnswer).trim().toUpperCase();
        if (userChoice.toLowerCase() === 'true') {
          userChoice = 'A';
        } else if (userChoice.toLowerCase() === 'false') {
          userChoice = 'B';
        }
        isCorrect = userChoice.toUpperCase() === correctChoice;
      } else if (question.type === 'multiple') {
        const userAns = Array.isArray(userAnswer) ? userAnswer.map(a => String(a).trim()).sort() : [String(userAnswer).trim()];
        const correctAns = Array.isArray(questionAnswer) ? questionAnswer.map(a => String(a).trim()).sort() : [String(questionAnswer).trim()];
        isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
      }

      if (isCorrect) {
        score = pq.score;
        totalScore += score;
        correctCount++;
      }
    }

    results[question.id] = {
      user_answer: userAnswer,
      correct_answer: questionAnswer,
      is_correct: isCorrect,
      score,
      explanation: question.explanation
    };
  }

  // ========== 科学计分算法：客观题/主观题分离 ==========
  
  // 1. 计算客观题得分和满分
  const objectiveQuestions = paperQuestions.filter(pq => {
    const q = questionsMap[pq.question_id];
    return q && !isEssayQuestion(q.type);
  });
  const objectiveTotalScore = objectiveQuestions.reduce((sum, pq) => sum + (pq.score || 0), 0);
  
  // 2. 计算主观题满分（主观题不自动批改，待人工/AI评分）
  const essayQuestions = paperQuestions.filter(pq => {
    const q = questionsMap[pq.question_id];
    return q && isEssayQuestion(q.type);
  });
  const subjectiveTotalScore = essayQuestions.reduce((sum, pq) => sum + (pq.score || 0), 0);

  // 3. 计算最终百分比
  let finalPercentage;
  if (!hasEssay) {
    // 纯客观题：百分比 = 客观题得分 / 客观题满分 × 100
    finalPercentage = objectiveTotalScore > 0 ? Math.round((totalScore / objectiveTotalScore) * 100) : 0;
  } else {
    // 有主观题：当前只显示客观题部分得分率（标注"待评主观题"）
    // 最终百分比需在主观题评分后重新计算
    const totalPossible = objectiveTotalScore + subjectiveTotalScore;
    if (totalPossible > 0) {
      finalPercentage = Math.round((totalScore / totalPossible) * 100);
    } else {
      finalPercentage = Math.round((totalScore / objectiveTotalScore) * 100);
    }
  }

  // 4. 更新考试记录（包含分离计分字段）
  await repo.updateExamRecord(exam_id, {
    answers,
    score: totalScore,
    percentage: finalPercentage,
    objective_score: totalScore,
    objective_total: objectiveTotalScore,
    subjective_score: null, // 主观题待评分
    subjective_total: subjectiveTotalScore || 0,
    end_time: new Date().toISOString(),
    status: hasEssay ? 'submitted' : 'graded'
  });

  // WebSocket 推送
  try {
    const io = req.app.get('io');
    const paperKeyId = examRecord.paper_key_id || (paper ? paper.key_id : null);
    const paperIdForQuery = examRecord.paper_id ? parseInt(examRecord.paper_id) : null;
    if (io && paperKeyId) {
      const allRecords = await repo.getExamRecordsByPaperId(paperIdForQuery, ['submitted', 'graded']);
      const ranking = allRecords
        .filter(r => r.percentage !== null && r.percentage !== undefined)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 20)
        .map((r, i) => ({
          rank: i + 1,
          student_name: r.student_name,
          score: r.percentage,
          end_time: r.end_time,
          isNew: r.id === parseInt(exam_id)
        }));

      const emitData = {
        paper_key_id: paperKeyId,
        paper_id: paperIdForQuery,
        ranking,
        newEntry: ranking.find(r => r.isNew),
        total_submitted: allRecords.length
      };
      io.to(`paper-${paperKeyId}`).emit('rank-update', emitData);
      if (paperIdForQuery) {
        io.to(`paper-${paperIdForQuery}`).emit('rank-update', emitData);
      }

      if (hasEssay && Object.keys(essayAnswers).length > 0) {
        io.emit('pending-essay-grade', {
          type: 'pending-essay-grade',
          paper_id: paperIdForQuery,
          paper_key_id: paperKeyId,
          paper_title: paper.title,
          exam_record_id: examRecord.id,
          student_name: examRecord.student_name,
          essay_count: Object.keys(essayAnswers).length,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (wsError) {
    console.error('WebSocket通知失败:', wsError);
  }

  res.json({
    success: true,
    data: {
      exam_id: examRecord.id,
      paper_id: examRecord.paper_id,
      paper_key_id: paper.key_id,
      title: paper.title,
      student_name: examRecord.student_name,
      score: totalScore,
      total_score: objectiveTotalScore + subjectiveTotalScore,
      objective_score: totalScore,
      objective_total: objectiveTotalScore,
      subjective_score: null,
      subjective_total: subjectiveTotalScore || 0,
      percentage: finalPercentage,
      correct_count: correctCount,
      total_count: paperQuestions.length,
      has_essay: hasEssay,
      has_essay_questions: hasEssay,
      essay_count: essayQuestions.length,
      status: hasEssay ? 'submitted' : 'graded',
      start_time: examRecord.start_time,
      end_time: new Date().toISOString(),
      show_score: paper.show_score,
      show_answer: paper.show_answer
    }
  });

  console.log('[EXAM_SUBMIT] {', JSON.stringify({
    exam_id: examRecord.id,
    paper_id: examRecord.paper_id,
    paper_title: paper.title,
    student_name: examRecord.student_name,
    score: totalScore,
    percentage: finalPercentage,
    ip: clientIp,
    status: hasEssay ? 'submitted' : 'graded',
    timestamp: new Date().toISOString()
  }), '}');

  if (examRecord.paper_id) {
    invalidateStatsCache(examRecord.paper_id);
  }
}));

// AI批改主观题
router.post('/ai-grade', authenticate, asyncHandler(async (req, res) => {
  const { exam_id } = req.body;

  const examRecord = await repo.getExamRecordById(exam_id);
  if (!examRecord) {
    return resp.notFound(res, '考试记录不存在');
  }

  const paper = await repo.getPaperById(examRecord.paper_id);
  if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
    return resp.forbidden(res, '无权限');
  }

  const paperQuestions = await repo.getPaperQuestionsByPaperId(paper.id);

  // 批量获取题目
  const questionIds = paperQuestions.map(pq => pq.question_id).filter(Boolean);
  const questionsList = await repo.getQuestionsByIds(questionIds);
  const questionsMap = {};
  for (const q of questionsList) {
    questionsMap[q.id] = q;
  }

  const subjectiveQuestions = paperQuestions.filter(pq => {
    const q = questionsMap[pq.question_id];
    return q && q.type === 'subjective';
  });

  if (subjectiveQuestions.length === 0) {
    return res.json({ success: true, message: '没有主观题', data: { graded: 0 } });
  }

  res.json({
    success: true,
    message: 'AI批改功能开发中，请等待后续版本',
    data: {
      subjective_count: subjectiveQuestions.length,
      note: 'AI批改功能需要配置AI_API_KEY环境变量'
    }
  });
}));

// 获取考试结果
router.get('/:examId/result', asyncHandler(async (req, res) => {
  const examRecord = await repo.getExamRecordById(req.params.examId);
  if (!examRecord) {
    return resp.notFound(res, '考试记录不存在');
  }

  const queryName = req.query.student_name;

  if (queryName) {
    if (/<[^>]*>/.test(queryName)) {
      return resp.error(res, '参数包含非法字符', 400);
    }
  }

  if (req.user) {
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer';
    const isOwner = examRecord.student_name && examRecord.student_name === queryName;

    if (!isAdmin && !isTrainer && !isOwner) {
      return resp.forbidden(res, '无权限查看此考试结果');
    }
  } else {
    if (!queryName) {
      return resp.error(res, '请提供考生姓名参数', 400);
    }
    if (examRecord.student_name && examRecord.student_name !== queryName) {
      return resp.forbidden(res, '无权限查看此考试结果');
    }
  }

  const paper = await repo.getPaperById(examRecord.paper_id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }
  const paperQuestions = await repo.getPaperQuestionsByPaperId(paper.id);

  // 批量获取题目 - 修复 N+1 查询
  const questionIds = paperQuestions.map(pq => pq.question_id).filter(Boolean);
  const questionsList = await repo.getQuestionsByIds(questionIds);
  const questionsMap = {};
  for (const q of questionsList) {
    questionsMap[q.id] = q;
  }

  const hasEssay = paperQuestions.some(pq => {
    const q = questionsMap[pq.question_id];
    return q && isEssayQuestion(q.type);
  });

  const totalQuestions = paperQuestions.length;
  const answers = examRecord.answers || {};
  let correctCount = 0;
  let wrongCount = 0;

  paperQuestions.forEach(pq => {
    const q = questionsMap[pq.question_id];
    if (q && !isEssayQuestion(q.type)) {
      const userAnswer = answers[pq.question_id];
      if (userAnswer !== undefined && userAnswer !== null) {
        if (String(userAnswer) === String(q.correct_answer || q.answer)) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    }
  });

  const duration = examRecord.end_time && examRecord.start_time
    ? Math.floor((new Date(examRecord.end_time) - new Date(examRecord.start_time)) / 1000)
    : 0;

  const allRecords = await repo.getExamRecordsByPaperId(examRecord.paper_id, ['submitted', 'graded']);
  const sortedRecords = allRecords
    .filter(r => r.percentage !== null && r.percentage !== undefined)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  const rank = sortedRecords.findIndex(r => r.id === examRecord.id) + 1;

  const distribution = [
    { range: '90-100', count: 0 },
    { range: '80-89', count: 0 },
    { range: '70-79', count: 0 },
    { range: '60-69', count: 0 },
    { range: '0-59', count: 0 }
  ];

  sortedRecords.forEach(r => {
    const p = r.percentage || 0;
    if (p >= 90) distribution[0].count++;
    else if (p >= 80) distribution[1].count++;
    else if (p >= 70) distribution[2].count++;
    else if (p >= PASS_SCORE) distribution[3].count++;
    else distribution[4].count++;
  });

  res.json({
    success: true,
    data: {
      exam_id: examRecord.id,
      title: paper.title,
      score: examRecord.score,
      objective_score: examRecord.objective_score,
      objective_total: examRecord.objective_total,
      percentage: examRecord.percentage,
      status: examRecord.status,
      start_time: examRecord.start_time,
      end_time: examRecord.end_time,
      duration,
      show_score: paper.show_score,
      show_answer: paper.show_answer,
      has_essay_questions: hasEssay,
      student_name: examRecord.student_name,
      total_questions: totalQuestions,
      correct_count: correctCount,
      wrong_count: wrongCount,
      rank: rank > 0 ? rank : null,
      total_examinees: sortedRecords.length,
      distribution
    }
  });
}));

// 获取大屏数据
router.get('/stats/:paperId', authenticate, asyncHandler(async (req, res) => {
  const { paperId } = req.params;

  const cached = getCachedStats(paperId);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const paper = await repo.getPaperById(paperId);

  if (!paper || (req.user.role !== "admin" && paper.user_id !== req.user.id)) {
    return resp.forbidden(res, '无权限');
  }

  const records = await repo.getExamRecordsByPaperId(paperId, ['submitted', 'graded']);

  const ranking = records
    .filter(r => r.percentage !== null && r.percentage !== undefined)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 50)
    .map((r, i) => ({
      rank: i + 1,
      student_name: r.student_name,
      score: r.percentage,
      end_time: r.end_time
    }));

  const scores = records.map(r => r.percentage || 0);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const passCount = scores.filter(s => s >= 60).length;
  const passRate = scores.length > 0 ? (passCount / scores.length * 100).toFixed(1) : 0;

  const distribution = [
    { range: '90-100', count: scores.filter(s => s >= 90).length },
    { range: '80-89', count: scores.filter(s => s >= 80 && s < 90).length },
    { range: '70-79', count: scores.filter(s => s >= 70 && s < 80).length },
    { range: '60-69', count: scores.filter(s => s >= PASS_SCORE && s < 70).length },
    { range: '0-59', count: scores.filter(s => s < 60).length }
  ];

  const statsData = {
    paper_id: paperId,
    title: paper.title,
    total_submitted: records.length,
    avg_score: avgScore.toFixed(1),
    pass_rate: passRate,
    highest_score: scores.length > 0 ? Math.max(...scores).toFixed(1) : 0,
    ranking,
    distribution
  };

  setCachedStats(paperId, statsData);

  res.json({
    success: true,
    data: statsData
  });
}));

// 获取学员成绩列表
router.get('/records/:paperId', authenticate, asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

  const paper = await repo.getPaperById(paperId);
  if (!paper || (req.user.role !== "admin" && paper.user_id !== req.user.id)) {
    return resp.forbidden(res, '无权限');
  }

  const allRecords = await repo.getExamRecordsByPaperId(paperId, ['submitted', 'graded']);

  const isAdmin = req.user.role === 'admin';
  const safeRecords = allRecords.map(r => {
    if (isAdmin) return r;
    const { answers, ...safe } = r;
    return safe;
  });

  const total = safeRecords.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedRecords = safeRecords.slice(startIndex, startIndex + pageSize);

  const scores = allRecords.map(r => r.percentage).filter(s => s !== null && s !== undefined);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

  res.json({
    success: true,
    data: {
      list: paginatedRecords,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        avg_score: Math.round(avgScore),
        max_score: maxScore,
        total
      }
    }
  });
}));

// 获取待评分列表
router.get('/pending-grading/:paperId', authenticate, asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  const paper = await repo.getPaperById(paperId);

  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  const currentUserId = String(req.user.id);
  const paperOwnerId = String(paper.user_id || '');
  const isAdmin = req.user.role === 'admin';
  const isOwner = paperOwnerId && paperOwnerId === currentUserId;

  if (!isAdmin && !isOwner) {
    return resp.forbidden(res, '无权限');
  }

  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

  // 并行获取考试记录和题目
  const [records, questions] = await Promise.all([
    repo.getExamRecordsByPaperId(paperId, 'submitted'),
    repo.getQuestions()
  ]);

  // 构建问答题 ID 集合
  const essayQuestionIds = new Set();
  const questionsMap = new Map();
  for (const q of questions) {
    questionsMap.set(q.id, q);
    if (isEssayQuestion(q.type)) {
      essayQuestionIds.add(q.id);
    }
  }

  // 过滤出需要评分的记录（有主观题且尚未完全评分）
  const pendingGrading = records.filter(r => {
    if (r.subjective_total > 0 && r.subjective_score === null) return true;
    if (r.essay_answers && Object.keys(r.essay_answers).length > 0) return true;
    if (r.status === 'submitted') return true;
    return false;
  });

  const total = pendingGrading.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedRecords = pendingGrading.slice(startIndex, startIndex + pageSize);

  const enrichedRecords = await Promise.all(paginatedRecords.map(async (r) => {
    const essayList = [];

    if (r.essay_answers && Object.keys(r.essay_answers).length > 0) {
      for (const qId of Object.keys(r.essay_answers)) {
        const qIdNum = parseInt(qId);
        if (essayQuestionIds.has(qIdNum)) {
          const q = questionsMap.get(qIdNum);
          if (q) {
            essayList.push({
              question_id: qIdNum,
              title: q.title,
              max_score: r.essay_answers[qId].max_score,
              user_answer: r.essay_answers[qId].user_answer
            });
          }
        }
      }
    } else if (r.status === 'submitted' || (r.subjective_total > 0 && r.subjective_score === null)) {
      const recordPaperQuestions = await repo.getPaperQuestionsByPaperId(paperId);
      const recordAnswers = r.answers || {};
      for (const pq of recordPaperQuestions) {
        const q = questionsMap.get(pq.question_id);
        if (q && isEssayQuestion(q.type)) {
          essayList.push({
            question_id: pq.question_id,
            title: q.title,
            max_score: pq.score || 0,
            user_answer: recordAnswers[pq.question_id] || ''
          });
        }
      }
    }

    return { ...r, essay_questions: essayList };
  }));

  res.json({
    success: true,
    data: {
      list: enrichedRecords,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  });
}));

// 评分问答题
router.post('/grade-essay', authenticate, validate(schemas.examGradeEssay), asyncHandler(async (req, res) => {
  const { exam_record_id, scores } = req.body;

  const examRecord = await repo.getExamRecordById(exam_record_id);
  if (!examRecord) {
    return resp.notFound(res, '考试记录不存在');
  }

  const paper = await repo.getPaperById(examRecord.paper_id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  const currentUserId = String(req.user.id);
  const paperOwnerId = String(paper.user_id || '');
  const isAdmin = req.user.role === 'admin';
  const isOwner = paperOwnerId && paperOwnerId === currentUserId;

  if (!isAdmin && !isOwner) {
    return resp.forbidden(res, '无权限访问此试卷的评分');
  }

  let totalEssayScore = 0;
  let totalMaxScore = 0;

  const gradePaperQuestions = paper.key_id ? await repo.getPaperQuestionsByPaperKeyId(paper.key_id) : await repo.getPaperQuestionsByPaperId(paper.id);

  // 保存每题评分
  for (const item of scores) {
    const { question_id, score, remark } = item;
    let maxScore = examRecord.essay_answers?.[question_id]?.max_score;
    if (!maxScore) {
      const pq = gradePaperQuestions.find(p => p.question_id === parseInt(question_id));
      maxScore = pq?.score || 0;
    }
    maxScore = maxScore || 0;

    await repo.upsertEssayScore({
      exam_record_id,
      question_id,
      score: Math.max(0, Math.min(score, maxScore)),
      max_score: maxScore,
      remark: remark || '',
      graded_by: req.user.id,
      graded_at: new Date().toISOString()
    });

    totalEssayScore += Math.min(score, maxScore);
    totalMaxScore += maxScore;
  }

  // 检查是否所有问答题都已评分（兼容新旧数据模型）
  let essayQuestionIds = [];
  if (examRecord.essay_answers && Object.keys(examRecord.essay_answers).length > 0) {
    essayQuestionIds = Object.keys(examRecord.essay_answers).map(k => parseInt(k));
  } else {
    const gqIds = gradePaperQuestions.map(pq => pq.question_id).filter(Boolean);
    const gqsList = await repo.getQuestionsByIds(gqIds);
    essayQuestionIds = gqsList.filter(q => isEssayQuestion(q.type)).map(q => q.id);
  }
  let allGraded = true;
  for (const qId of essayQuestionIds) {
    const existingScore = await repo.findEssayScoreByRecordAndQuestion(exam_record_id, qId);
    if (!existingScore) {
      allGraded = false;
      break;
    }
  }

  // 如果全部评分完成，更新总分和状态
  if (allGraded) {
    const objectiveScore = examRecord.score || 0;

    const gqIds2 = gradePaperQuestions.map(pq => pq.question_id).filter(Boolean);
    const questionsList2 = await repo.getQuestionsByIds(gqIds2);
    const questionsMap2 = {};
    for (const q of questionsList2) {
      questionsMap2[q.id] = q;
    }

    const totalObjectiveScore = gradePaperQuestions
      .filter(pq => {
        const q = questionsMap2[pq.question_id];
        return q && !isEssayQuestion(q.type);
      })
      .reduce((sum, pq) => sum + pq.score, 0);

    const finalScore = objectiveScore + totalEssayScore;
    const totalPaperMaxScore = totalObjectiveScore + totalMaxScore;
    const finalPercentage = totalPaperMaxScore > 0
      ? Math.round((finalScore / totalPaperMaxScore) * 100) : 0;

    await repo.updateExamRecord(exam_record_id, {
      score: finalScore,
      percentage: finalPercentage,
      subjective_score: totalEssayScore,  // 更新主观题得分
      status: 'graded'
    });
  }

  res.json({
    success: true,
    data: {
      exam_record_id,
      total_essay_score: totalEssayScore,
      all_graded: allGraded
    }
  });

  console.log('[ESSAY_GRADE] {', JSON.stringify({
    exam_record_id,
    paper_id: examRecord.paper_id,
    student_name: examRecord.student_name,
    graded_by: req.user.id,
    graded_by_name: req.user.name || req.user.username,
    total_essay_score: totalEssayScore,
    questions_graded: scores.length,
    all_graded: allGraded,
    timestamp: new Date().toISOString()
  }), '}');
}));

module.exports = router;
