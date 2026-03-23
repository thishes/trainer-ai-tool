// server/routes/exam.js - 考试路由 (JSON版)
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticate = require('../middleware/auth');

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
    
    // 创建考试记录
    const examRecord = db.examRecords.create({
      paper_id: parseInt(paper_id),
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
    
    const paper = db.papers.findById(examRecord.paper_id);
    
    // 获取试卷题目
    let paperQuestions = db.paperQuestions.findByPaperId(paper.id);
    
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
        // 如果已有答案，返回答案（用于断线续考）
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
    
    // 获取试卷和题目
    const paper = db.papers.findById(examRecord.paper_id);
    const paperQuestions = db.paperQuestions.findByPaperId(paper.id);
    
    // 自动批改客观题
    let totalScore = 0;
    let correctCount = 0;
    const results = {};
    
    for (const pq of paperQuestions) {
      const question = db.questions.findById(pq.question_id);
      if (!question) continue;
      
      const userAnswer = answers[question.id];
      let isCorrect = false;
      let score = 0;
      
      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        if (question.type === 'single' || question.type === 'judge') {
          // 单选或判断题
          isCorrect = String(userAnswer) === String(question.answer);
        } else if (question.type === 'multiple') {
          // 多选题（需要答案完全匹配）
          const userAns = Array.isArray(userAnswer) ? userAnswer.sort() : [userAnswer].sort();
          const correctAns = Array.isArray(question.answer) ? question.answer.sort() : [question.answer].sort();
          isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
        } else if (question.type === 'subjective') {
          // 主观题暂不自动批改，分数待定
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
        correct_answer: question.answer,
        is_correct: isCorrect,
        score: score,
        explanation: question.explanation
      };
    }
    
    // 更新考试记录
    db.examRecords.update(exam_id, {
      answers,
      score: totalScore,
      end_time: new Date().toISOString(),
      status: 'submitted'
    });
    
    // 返回结果
    res.json({
      success: true,
      data: {
        exam_id: examRecord.id,
        paper_id: examRecord.paper_id,
        title: paper.title,
        student_name: examRecord.student_name,
        score: totalScore,
        correct_count: correctCount,
        total_count: paperQuestions.length,
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
    
    // TODO: 调用AI API批改
    // 这里需要接入AI服务
    
    res.json({
      success: true,
      message: 'AI批改功能需要配置AI API',
      data: { 
        subjective_count: paperQuestions.length,
        note: '请在环境变量中配置AI_API_KEY'
      }
    });
  } catch (error) {
    console.error('AI批改错误:', error);
    res.status(500).json({ success: false, message: '批改失败' });
  }
});

// 获取考试结果
router.get('/:examId/result', async (req, res) => {
  try {
    const examRecord = db.examRecords.findById(req.params.examId);
    if (!examRecord) {
      return res.status(404).json({ success: false, message: '考试记录不存在' });
    }
    
    const paper = db.papers.findById(examRecord.paper_id);
    
    res.json({
      success: true,
      data: {
        exam_id: examRecord.id,
        title: paper.title,
        score: examRecord.score,
        status: examRecord.status,
        start_time: examRecord.start_time,
        end_time: examRecord.end_time,
        show_score: paper.show_score,
        show_answer: paper.show_answer,
        student_name: examRecord.student_name
      }
    });
  } catch (error) {
    console.error('获取结果错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取学员成绩列表（培训师查看）
router.get('/records/:paperId', authenticate, async (req, res) => {
  try {
    const { paperId } = req.params;
    
    const paper = db.papers.findById(paperId);
    if (!paper || (req.user.role !== "admin" && paper.user_id !== req.user.id)) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    const records = db.examRecords.findAll({ 
      paper_id: parseInt(paperId), 
      status: 'submitted' 
    });
    
    // 统计数据
    const scores = records.map(r => r.score).filter(s => s !== null);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    
    res.json({
      success: true,
      data: {
        list: records,
        total: records.length,
        stats: {
          avg_score: Math.round(avgScore),
          max_score: maxScore,
          total: records.length
        }
      }
    });
  } catch (error) {
    console.error('获取成绩列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取大屏数据
router.get('/stats/:paperId', authenticate, async (req, res) => {
  try {
    const { paperId } = req.params;
    
    const paper = db.papers.findById(paperId);
    if (!paper || (req.user.role !== "admin" && paper.user_id !== req.user.id)) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    const records = db.examRecords.findAll({ 
      paper_id: parseInt(paperId), 
      status: 'submitted' 
    });
    
    // 排名数据
    const ranking = records
      .filter(r => r.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((r, i) => ({
        rank: i + 1,
        student_name: r.student_name,
        score: r.score,
        end_time: r.end_time
      }));
    
    // 统计
    const scores = records.map(r => r.score).filter(s => s !== null);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    // 及格人数（60分及以上）
    const passCount = scores.filter(s => s >= 60).length;
    const passRate = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;
    
    // 各分数段分布
    const distribution = [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '60-69', count: 0 },
      { range: '0-59', count: 0 }
    ];
    
    scores.forEach(s => {
      if (s >= 90) distribution[0].count++;
      else if (s >= 80) distribution[1].count++;
      else if (s >= 70) distribution[2].count++;
      else if (s >= 60) distribution[3].count++;
      else distribution[4].count++;
    });
    
    res.json({
      success: true,
      data: {
        paper_id: paperId,
        title: paper.title,
        total_submitted: records.length,
        avg_score: Math.round(avgScore),
        pass_rate: passRate,
        ranking,
        distribution
      }
    });
  } catch (error) {
    console.error('获取大屏数据错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

module.exports = router;
