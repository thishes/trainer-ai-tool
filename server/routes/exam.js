// server/routes/exam.js - 考试路由 (MySQL优先)
const express = require('express');
const router = express.Router();
const fs = require('fs');
const db = require('../db');
const mysqlDb = require('../db-mysql');
const authenticate = require('../middleware/auth');

// 问答题类型判断函数
const isEssayQuestion = (type) => ['subjective', 'essay', 'question'].includes(type);

// 测试接口 - 验证后端是否正常运行
router.get('/test', authenticate, (req, res) => {
  console.log('=== 测试接口被调用 ===');
  console.log('req.user:', req.user);
  res.json({ 
    success: true, 
    message: '后端服务正常运行',
    user: req.user 
  });
});

// 开始考试
router.post('/start', async (req, res) => {
  try {
    const { paper_id, student_name, user_id, access_code } = req.body;
    
    const paper = db.papers.findPublic(paper_id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在或未发布' });
    }
    
    // 检查访问密码
    if (paper.access_code) {
      if (access_code !== paper.access_code) {
        return res.status(403).json({ success: false, message: '访问密码错误' });
      }
    }
    
    // IP限制检查
    if (paper.ip_limit > 0) {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const existingRecords = db.examRecords.findAll({
        paper_id: paper.id,
        status: 'submitted'
      }).filter(r => r.ip_address === clientIp);

      if (existingRecords.length >= paper.ip_limit) {
        return res.status(403).json({
          success: false,
          message: `此试卷限制每个IP只能考${paper.ip_limit}次，您已完成考试`
        });
      }
    }

    // 指定考生检查
    if (paper.allow_all_users === false) {
      const { student_no } = req.body;
      const paperStudents = db.paperStudents.findByPaperKeyId(paper.key_id);
      const student = paperStudents.find(ps => {
        if (!ps.student) return false;
        if (student_no) {
          return ps.student.student_no === student_no && ps.student.name === student_name;
        }
        return ps.student.name === student_name;
      });

      if (!student) {
        return res.status(403).json({
          success: false,
          message: '考生号或姓名不匹配，无法参加考试'
        });
      }
    }

    // 创建考试记录
    const examRecord = db.examRecords.create({
      paper_id: paper.id,
      paper_key_id: paper.key_id,
      user_id: user_id ? parseInt(user_id) : null,
      student_name: student_name || '匿名学员',
      ip_address: req.ip,
      start_time: new Date().toISOString(),
      status: 'in_progress',
      answers: {}
    });
    
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
  } catch (error) {
    console.error('开始考试错误:', error);
    res.status(500).json({ success: false, message: '创建考试记录失败' });
  }
});

// 获取考试题目
router.get('/:examId/questions', async (req, res) => {
  try {
    const examRecord = db.examRecords.findById(req.params.examId);
    if (!examRecord) {
      return res.status(404).json({ success: false, message: '考试记录不存在' });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const isOwner = examRecord.ip_address && examRecord.ip_address !== 'unknown' && examRecord.ip_address === clientIp;
    
    if (!isOwner && !examRecord.student_name) {
      return res.status(403).json({ success: false, message: '无权限获取此考试题目' });
    }

    let paper;
    if (examRecord.paper_id) {
      paper = db.papers.findById(examRecord.paper_id);
    } else if (examRecord.paper_key_id) {
      paper = db.papers.findByKeyId(examRecord.paper_key_id);
    }
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    // 获取试卷题目 - 使用key_id系统
    if (!paper.key_id) {
      return res.status(500).json({ success: false, message: '试卷缺少key_id' });
    }
    let paperQuestions = db.paperQuestions.findByPaperKeyId(paper.key_id);

    // 获取题目详情
    let questions = paperQuestions.map(pq => {
      const q = db.questions.findById(pq.question_id);
      if (!q) return null;
      return {
        id: q.id,
        title: q.title,
        type: q.type,
        options: q.options,
        score: pq.score,
        order: pq.order,
        user_answer: examRecord.answers ? examRecord.answers[q.id] : null
      };
    }).filter(q => q !== null);
    
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
  } catch (error) {
    console.error('获取考试题目错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 保存答题进度（离线保存）
router.post('/save-progress', async (req, res) => {
  try {
    const { exam_id, answers } = req.body;
    
    const examRecord = db.examRecords.findById(exam_id);
    if (!examRecord) {
      return res.status(404).json({ success: false, message: '考试记录不存在' });
    }
    
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const isOwner = examRecord.ip_address && examRecord.ip_address !== 'unknown' && examRecord.ip_address === clientIp;
    
    if (!isOwner && examRecord.student_name !== req.body.student_name) {
      return res.status(403).json({ success: false, message: '无权限修改此考试记录' });
    }
    
    // 合并答案
    const currentAnswers = examRecord.answers || {};
    const mergedAnswers = { ...currentAnswers, ...answers };
    
    db.examRecords.update(exam_id, { answers: mergedAnswers });
    
    res.json({ success: true, message: '保存成功' });
  } catch (error) {
    console.error('保存进度错误:', error);
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

// 提交试卷
router.post('/submit', async (req, res) => {
  try {
    const { exam_id, answers } = req.body;
    
    const examRecord = db.examRecords.findById(exam_id);
    if (!examRecord) {
      return res.status(404).json({ success: false, message: '考试记录不存在' });
    }
    
    if (examRecord.status === 'submitted') {
      return res.status(400).json({ success: false, message: '试卷已提交' });
    }
    
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const isOwner = examRecord.ip_address && examRecord.ip_address !== 'unknown' && examRecord.ip_address === clientIp;
    
    if (!isOwner && examRecord.student_name !== req.body.student_name) {
      return res.status(403).json({ success: false, message: '无权限提交此试卷' });
    }
    
    // 获取试卷和题目
    let paper;
    if (examRecord.paper_id) {
      paper = db.papers.findById(examRecord.paper_id);
    } else if (examRecord.paper_key_id) {
      paper = db.papers.findByKeyId(examRecord.paper_key_id);
    }
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    const paperQuestions = paper.key_id ? db.paperQuestions.findByPaperKeyId(paper.key_id) : [];
    
    // 自动批改客观题
    let totalScore = 0;
    let correctCount = 0;
    const results = {};
    const totalPaperScore = paperQuestions.reduce((sum, pq) => sum + pq.score, 0);

    for (const pq of paperQuestions) {
      const question = db.questions.findById(pq.question_id);
      if (!question) continue;

      const userAnswer = answers[question.id];
      const questionAnswer = question.answer;
      let isCorrect = false;
      let score = 0;

      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        if (question.type === 'single' || question.type === 'choice') {
          isCorrect = String(userAnswer).trim() === String(questionAnswer).trim();
        } else if (question.type === 'judge') {
          // 判断题：用户答案可能是 "true"/"false" 或选项 key "A"/"B"
          // 正确答案存储为选项 key "A"(正确) 或 "B"(错误)
          let userChoice = String(userAnswer).trim();
          let correctChoice = String(questionAnswer).trim().toUpperCase();

          // 如果用户答案是布尔值，转换为选项 key
          if (userChoice.toLowerCase() === 'true') {
            userChoice = 'A'; // 选择"正确"选项
          } else if (userChoice.toLowerCase() === 'false') {
            userChoice = 'B'; // 选择"错误"选项
          }

          // 比较选项 key
          isCorrect = userChoice.toUpperCase() === correctChoice;
        } else if (question.type === 'multiple') {
          const userAns = Array.isArray(userAnswer) ? userAnswer.map(a => String(a).trim()).sort() : [String(userAnswer).trim()];
          const correctAns = Array.isArray(questionAnswer) ? questionAnswer.map(a => String(a).trim()).sort() : [String(questionAnswer).trim()];
          isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
        } else if (question.type === 'subjective' || question.type === 'essay' || question.type === 'question') {
          isCorrect = null;
        }

        if (isCorrect === true) {
          score = pq.score;
          totalScore += score;
          correctCount++;
        }
      }

      results[question.id] = {
        user_answer: userAnswer,
        correct_answer: questionAnswer,
        is_correct: isCorrect,
        score: score,
        explanation: question.explanation
      };
    }

    // 收集问答题答案
    const essayAnswers = {};
    for (const pq of paperQuestions) {
      const question = db.questions.findById(pq.question_id);
      if (question && question.type === 'subjective') {
        essayAnswers[question.id] = {
          user_answer: answers[question.id] || '',
          max_score: pq.score
        };
      }
    }

    // 检查是否有问答题
    const hasEssay = paperQuestions.some(pq => {
      const q = db.questions.findById(pq.question_id);
      return q && isEssayQuestion(q.type);
    });
    
    // 计算客观题总分（排除问答题）
    const objectiveTotalScore = paperQuestions
      .filter(pq => {
        const q = db.questions.findById(pq.question_id);
        return q && !isEssayQuestion(q.type);
      })
      .reduce((sum, pq) => sum + pq.score, 0);
    
    // 更新考试记录 - 保持客观题分数，问答题单独计分
    const finalPercentage = objectiveTotalScore > 0 ? Math.round((totalScore / objectiveTotalScore) * 100) : 0;
    db.examRecords.update(exam_id, {
      answers,
      essay_answers: Object.keys(essayAnswers).length > 0 ? essayAnswers : null,
      score: totalScore, // 保持客观题分数
      percentage: finalPercentage, // 基于客观题计算百分比
      objective_score: totalScore,
      objective_total: objectiveTotalScore,
      end_time: new Date().toISOString(),
      status: hasEssay ? 'submitted' : 'graded'
    });

    // 通过WebSocket推送实时排名更新
    try {
      const io = req.app.get('io');
      const paperKeyId = examRecord.paper_key_id || (paper ? paper.key_id : null);
      const paperIdForQuery = examRecord.paper_id ? parseInt(examRecord.paper_id) : null;
      if (io && paperKeyId) {
        const filter = { status: 'submitted' };
        if (paperIdForQuery) filter.paper_id = paperIdForQuery;
        if (paperKeyId) filter.paper_key_id = paperKeyId;
        const allRecords = db.examRecords.findAll(filter);
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

        const newEntry = ranking.find(r => r.isNew);
        const emitData = {
          paper_key_id: paperKeyId,
          paper_id: paperIdForQuery,
          ranking,
          newEntry,
          total_submitted: allRecords.length
        };
        io.to(`paper-${paperKeyId}`).emit('rank-update', emitData);
        if (paperIdForQuery) {
          io.to(`paper-${paperIdForQuery}`).emit('rank-update', emitData);
        }
        
        if (hasEssay && Object.keys(essayAnswers).length > 0) {
          const pendingNotification = {
            type: 'pending-essay-grade',
            paper_id: paperIdForQuery,
            paper_key_id: paperKeyId,
            paper_title: paper.title,
            exam_record_id: examRecord.id,
            student_name: examRecord.student_name,
            essay_count: Object.keys(essayAnswers).length,
            timestamp: new Date().toISOString()
          };
          io.emit('pending-essay-grade', pendingNotification);
        }
      }
    } catch (wsError) {
      console.error('WebSocket通知失败:', wsError);
    }

    // 返回结果
    res.json({
      success: true,
      data: {
        exam_id: examRecord.id,
        paper_id: examRecord.paper_id,
        paper_key_id: paper.key_id,
        title: paper.title,
        student_name: examRecord.student_name,
        score: totalScore,
        total_score: objectiveTotalScore,
        objective_score: totalScore,
        objective_total: objectiveTotalScore,
        percentage: finalPercentage,
        correct_count: correctCount,
        total_count: paperQuestions.length,
        has_essay: hasEssay,
        has_essay_questions: hasEssay,
        start_time: examRecord.start_time,
        end_time: new Date().toISOString(),
        show_score: paper.show_score,
        show_answer: paper.show_answer
      }
    });
  } catch (error) {
    console.error('提交试卷错误:', error);
    res.status(500).json({ success: false, message: '提交失败' });
  }
});

// AI批改主观题
router.post('/ai-grade', authenticate, async (req, res) => {
  try {
    const { exam_id } = req.body;
    
    const examRecord = db.examRecords.findById(exam_id);
    if (!examRecord) {
      return res.status(404).json({ success: false, message: '考试记录不存在' });
    }
    
      const paper = db.papers.findById(examRecord.paper_id);
    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    // 获取主观题
    const paperQuestions = db.paperQuestions.findByPaperId(paper.id).filter(pq => {
      const q = db.questions.findById(pq.question_id);
      return q && q.type === 'subjective';
    });
    
    if (paperQuestions.length === 0) {
      return res.json({ success: true, message: '没有主观题', data: { graded: 0 } });
    }

    res.json({
      success: true,
      message: 'AI批改功能开发中，请等待后续版本',
      data: {
        subjective_count: paperQuestions.length,
        note: 'AI批改功能需要配置AI_API_KEY环境变量'
      }
    });
  } catch (error) {
    console.error('AI批改错误:', error);
    res.status(500).json({ success: false, message: '批改失败' });
  }
});

// 获取考试结果
router.get('/:examId/result', authenticate, async (req, res) => {
  try {
    const examRecord = db.examRecords.findById(req.params.examId);
    if (!examRecord) {
      return res.status(404).json({ success: false, message: '考试记录不存在' });
    }
    
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer';
    const queryName = req.query.student_name || req.body.student_name;
    const isOwner = examRecord.student_name && examRecord.student_name === queryName;
    
    if (!isAdmin && !isTrainer && !isOwner) {
      return res.status(403).json({ success: false, message: '无权限查看此考试结果' });
    }
    
    const paper = db.papers.findById(examRecord.paper_id);
    
    // 判断试卷是否包含问答题
    const paperQuestions = db.paperQuestions.findByPaperId(paper.id);
    const hasEssay = paperQuestions.some(pq => {
      const q = db.questions.findById(pq.question_id);
      return q && isEssayQuestion(q.type);
    });
    
    // 计算答题统计
    const totalQuestions = paperQuestions.length;
    const answers = examRecord.answers || {};
    let correctCount = 0;
    let wrongCount = 0;
    
    // 统计客观题对错
    paperQuestions.forEach(pq => {
      const q = db.questions.findById(pq.question_id);
      if (q && !isEssayQuestion(q.type)) {
        const userAnswer = answers[pq.question_id];
        if (userAnswer !== undefined && userAnswer !== null) {
          if (String(userAnswer) === String(q.correct_answer)) {
            correctCount++;
          } else {
            wrongCount++;
          }
        }
      }
    });
    
    // 计算用时（秒）
    const duration = examRecord.end_time && examRecord.start_time 
      ? Math.floor((new Date(examRecord.end_time) - new Date(examRecord.start_time)) / 1000)
      : 0;
    
    // 获取排名信息
    const allRecords = db.examRecords.findAll({
      paper_id: examRecord.paper_id,
      status: ['submitted', 'graded']
    });
    
    // 按分数排序计算排名
    const sortedRecords = allRecords
      .filter(r => r.percentage !== null && r.percentage !== undefined)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    
    const rank = sortedRecords.findIndex(r => r.id === examRecord.id) + 1;
    
    // 计算分数分布
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
      else if (p >= 60) distribution[3].count++;
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
        duration: duration,
        show_score: paper.show_score,
        show_answer: paper.show_answer,
        has_essay_questions: hasEssay,
        student_name: examRecord.student_name,
        // 答题统计
        total_questions: totalQuestions,
        correct_count: correctCount,
        wrong_count: wrongCount,
        // 排名信息
        rank: rank > 0 ? rank : null,
        total_examinees: sortedRecords.length,
        // 分数分布
        distribution: distribution
      }
    });
  } catch (error) {
    console.error('获取结果错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取大屏数据
router.get('/stats/:paperId', authenticate, async (req, res) => {
  try {
    const { paperId } = req.params;

    let paper;
    if (mysqlDb.isConnected()) {
      try {
        paper = await mysqlDb.getPaperById(paperId);
      } catch (e) {
        paper = db.papers.findById(paperId);
      }
    } else {
      paper = db.papers.findById(paperId);
    }

    if (!paper || (req.user.role !== "admin" && paper.user_id !== req.user.id)) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    let records;
    if (mysqlDb.isConnected()) {
      try {
        const allRecords = await mysqlDb.getExamRecords();
        records = allRecords.filter(r => r.paper_id === parseInt(paperId) && (r.status === 'submitted' || r.status === 'graded'));
      } catch (e) {
        records = db.examRecords.findAll({ paper_id: parseInt(paperId), status: ['submitted', 'graded'] });
      }
    } else {
      records = db.examRecords.findAll({ paper_id: parseInt(paperId), status: ['submitted', 'graded'] });
    }

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
      { range: '90-100', count: scores.filter(s => s >= 90 && s <= 100).length },
      { range: '80-89', count: scores.filter(s => s >= 80 && s < 90).length },
      { range: '70-79', count: scores.filter(s => s >= 70 && s < 80).length },
      { range: '60-69', count: scores.filter(s => s >= 60 && s < 70).length },
      { range: '0-59', count: scores.filter(s => s < 60).length }
    ];

    res.json({
      success: true,
      data: {
        paper_id: paperId,
        title: paper.title,
        total_submitted: records.length,
        avg_score: avgScore.toFixed(1),
        pass_rate: passRate,
        highest_score: scores.length > 0 ? Math.max(...scores).toFixed(1) : 0,
        ranking,
        distribution
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取学员成绩列表（培训师查看）
router.get('/records/:paperId', authenticate, async (req, res) => {
  try {
    const { paperId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const paper = db.papers.findById(paperId);
    if (!paper || (req.user.role !== "admin" && paper.user_id !== req.user.id)) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const allRecords = db.examRecords.findAll({
      paper_id: parseInt(paperId),
      status: ['submitted', 'graded']
    });

    const isAdmin = req.user.role === 'admin';
    const safeRecords = allRecords.map(r => {
      if (isAdmin) return r;
      const { answers, ...safe } = r;
      return safe;
    });

    // 分页处理
    const total = safeRecords.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRecords = safeRecords.slice(startIndex, endIndex);

    // 统计数据 - 使用 percentage（百分制）进行统计
    const scores = allRecords.map(r => r.percentage).filter(s => s !== null && s !== undefined);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    res.json({
      success: true,
      data: {
        list: paginatedRecords,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize),
        stats: {
          avg_score: Math.round(avgScore),
          max_score: maxScore,
          total: total
        }
      }
    });
  } catch (error) {
    console.error('获取成绩列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取待评分列表（包含问答题且未完成评分的记录）
router.get('/pending-grading/:paperId', authenticate, async (req, res) => {
  try {
    const { paperId } = req.params;
    let paper;

    if (mysqlDb.isConnected()) {
      try {
        paper = await mysqlDb.getPaperById(paperId);
      } catch (e) {
        paper = db.papers.findById(paperId);
      }
    } else {
      paper = db.papers.findById(paperId);
    }

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    const currentUserId = String(req.user.id);
    const paperOwnerId = String(paper.user_id || '');
    const isAdmin = req.user.role === 'admin';
    const isOwner = paperOwnerId && paperOwnerId === currentUserId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    // 并行获取考试记录和题目，减少等待时间
    let records, questions;
    
    const fetchRecords = async () => {
      if (mysqlDb.isConnected()) {
        try {
          const allRecords = await mysqlDb.getExamRecords();
          return allRecords.filter(r => r.paper_id === parseInt(paperId) && r.status === 'submitted');
        } catch (e) {
          return db.examRecords.findAll({ paper_id: parseInt(paperId), status: 'submitted' });
        }
      } else {
        return db.examRecords.findAll({ paper_id: parseInt(paperId), status: 'submitted' });
      }
    };
    
    const fetchQuestions = async () => {
      if (mysqlDb.isConnected()) {
        try {
          return await mysqlDb.getQuestions();
        } catch (e) {
          return db.getQuestions();
        }
      } else {
        return db.getQuestions();
      }
    };
    
    [records, questions] = await Promise.all([fetchRecords(), fetchQuestions()]);

    // 构建问答题 ID 集合，用于快速查找
    const essayQuestionIds = new Set();
    const questionsMap = new Map();
    for (const q of questions) {
      questionsMap.set(q.id, q);
      if (isEssayQuestion(q.type)) {
        essayQuestionIds.add(q.id);
      }
    }

    // 过滤出有问答题答案的记录
    const pendingGrading = records.filter(r => {
      if (!r.essay_answers) return false;
      return Object.keys(r.essay_answers).length > 0;
    });

    const total = pendingGrading.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRecords = pendingGrading.slice(startIndex, endIndex);

    const enrichedRecords = paginatedRecords.map(r => {
      const essayList = [];
      for (const qId of Object.keys(r.essay_answers || {})) {
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
      return { ...r, essay_questions: essayList };
    });

    res.json({
      success: true,
      data: {
        list: enrichedRecords,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('获取待评分列表失败:', error);
    res.status(500).json({ success: false, message: '获取失败：' + error.message });
  }
});

// 评分问答题
router.post('/grade-essay', authenticate, async (req, res) => {
  try {
    console.log('=== 评分请求 ===');
    console.log('req.user:', req.user);
    console.log('用户角色:', req.user?.role);
    
    const { exam_record_id, scores } = req.body;
    
    if (!exam_record_id || !scores || !Array.isArray(scores)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    
    const examRecord = db.examRecords.findById(exam_record_id);
    if (!examRecord) {
      return res.status(404).json({ success: false, message: '考试记录不存在' });
    }

    // 获取试卷信息
    const paper = db.papers.findById(examRecord.paper_id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    // 权限验证（统一类型比较）
    const currentUserId = String(req.user.id);
    const paperOwnerId = String(paper.user_id || '');
    const isAdmin = req.user.role === 'admin';
    const isOwner = paperOwnerId && paperOwnerId === currentUserId;
    
    console.log('[评分权限] 用户ID:', currentUserId, '角色:', req.user.role, '试卷OwnerID:', paperOwnerId, 'isAdmin:', isAdmin, 'isOwner:', isOwner);
    
    if (!isAdmin && !isOwner) {
      const debugInfo = { userId: currentUserId, role: req.user.role, paperOwnerId, isAdmin, isOwner, paperUserId: paper.user_id };
      console.log('[评分权限拒绝]', debugInfo);
      return res.status(403).json({ success: false, message: '无权限访问此试卷的评分', debug: debugInfo });
    }

    if (!db.essayScores || !db.essayScores.upsert) {
      return res.status(500).json({ success: false, message: '评分系统未初始化' });
    }

    let totalEssayScore = 0;
    let totalMaxScore = 0;
    
    // 保存每题评分
    for (const item of scores) {
      const { question_id, score, remark } = item;
      const maxScore = examRecord.essay_answers?.[question_id]?.max_score || 0;
      
      db.essayScores.upsert({
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
    
    // 检查是否所有问答题都已评分
    const essayQuestionIds = Object.keys(examRecord.essay_answers || {}).map(k => parseInt(k));
    let allGraded = true;
    const findByRecordAndQuestion = db.essayScores?.findByRecordAndQuestion;
    for (const qId of essayQuestionIds) {
      if (!findByRecordAndQuestion) { allGraded = false; break; }
      const existingScore = findByRecordAndQuestion(exam_record_id, qId);
      if (!existingScore) {
        allGraded = false;
        break;
      }
    }
    
    // 如果全部评分完成，更新总分和状态
    if (allGraded && examRecord.essay_answers) {
      const objectiveScore = examRecord.score || 0;
      const allPaperQuestions = paper.key_id ? db.paperQuestions.findByPaperKeyId(paper.key_id) : [];
      const totalObjectiveScore = allPaperQuestions
        .filter(pq => db.questions.findById(pq.question_id)?.type !== 'subjective')
        .reduce((sum, pq) => sum + pq.score, 0);
      
      const finalScore = objectiveScore + totalEssayScore;
      const totalPaperMaxScore = totalObjectiveScore + totalMaxScore;
      const finalPercentage = totalPaperMaxScore > 0 
        ? Math.round((finalScore / totalPaperMaxScore) * 100) : 0;
      
      db.examRecords.update(exam_record_id, {
        score: finalScore,
        percentage: finalPercentage,
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
  } catch (error) {
    console.error('评分错误:', error);
    res.status(500).json({ success: false, message: '评分失败' });
  }
});

module.exports = router;
