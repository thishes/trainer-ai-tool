const express = require('express');
const router = express.Router();
const db = require('../db');
const QRCode = require('qrcode');

// 获取试卷列表
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    let papers = db.papers.getAll();
    
    if (status) {
      papers = papers.filter(p => p.status === status);
    }
    
    const total = papers.length;
    const start = (page - 1) * pageSize;
    papers = papers.slice(start, start + pageSize);
    
    res.json({ success: true, data: { list: papers, total, page, pageSize } });
  } catch (error) {
    console.error('获取试卷列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取单个试卷
router.get('/:id', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error('获取试卷错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取公开试卷（不需要认证）
router.get('/public/:id', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (paper.status !== 'published') {
      return res.status(403).json({ success: false, message: '试卷不存在或未发布' });
    }
    
    let paperQuestions = db.paperQuestions.findByPaperId(paper.id);
    const questions = paperQuestions.map(pq => {
      const question = db.questions.findById(pq.question_id);
      return question ? { ...question, score: pq.score } : null;
    }).filter(q => q !== null);
    
    res.json({
      success: true,
      data: {
        id: paper.id,
        title: paper.title,
        description: paper.description,
        time_limit: paper.time_limit,
        status: paper.status,
        shuffle: paper.shuffle,
        show_score: paper.show_score,
        show_answer: paper.show_answer,
        total_score: paper.total_score || questions.reduce((sum, q) => sum + (q.score || 0), 0),
        question_count: questions.length,
        start_time: paper.start_time,
        end_time: paper.end_time,
        access_code: undefined,
        ip_limit: paper.ip_limit,
        allow_all_users: paper.allow_all_users
      }
    });
  } catch (error) {
    console.error('获取公开试卷错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 生成考试访问链接
router.get('/:id/exam-url', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (paper.status !== 'published') {
      return res.status(403).json({ success: false, message: '试卷未发布' });
    }
    
    // 支持代理后的域名
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('X-Forwarded-Host') || req.get('Host') || req.hostname;
    const baseUrl = protocol + '://' + host;
    
    let accessUrl = baseUrl + '/exam/' + paper.id;
    
    if (paper.access_code) {
      accessUrl += '?code=' + paper.access_code;
    }
    
    const qrcodeDataUrl = await QRCode.toDataURL(accessUrl);
    
    res.json({
      success: true,
      data: {
        url: accessUrl,
        qrcode: qrcodeDataUrl,
        paper_id: paper.id,
        title: paper.title
      }
    });
  } catch (error) {
    console.error('生成考试链接错误:', error);
    res.status(500).json({ success: false, message: '生成失败' });
  }
});

// 创建试卷
router.post('/', async (req, res) => {
  try {
    const { title, description, time_limit, shuffle, show_score, show_answer, access_code, ip_limit, allow_all_users } = req.body;
    
    const paper = db.papers.create({
      title,
      description,
      time_limit,
      shuffle,
      show_score,
      show_answer,
      access_code,
      ip_limit,
      allow_all_users
    });
    
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error('创建试卷错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 更新试卷
router.put('/:id', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    const updated = db.papers.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新试卷错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除试卷
router.delete('/:id', async (req, res) => {
  try {
    db.papers.remove(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除试卷错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 发布试卷
router.post('/:id/publish', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    db.papers.update(req.params.id, { status: 'published' });
    res.json({ success: true, message: '发布成功' });
  } catch (error) {
    console.error('发布试卷错误:', error);
    res.status(500).json({ success: false, message: '发布失败' });
  }
});

// 取消发布
router.post('/:id/unpublish', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    db.papers.update(req.params.id, { status: 'draft' });
    res.json({ success: true, message: '取消发布成功' });
  } catch (error) {
    console.error('取消发布错误:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// 获取试卷题目
router.get('/:id/manage-questions', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    let paperQuestions = db.paperQuestions.findByPaperId(paper.id);
    const questions = paperQuestions.map(pq => {
      const question = db.questions.findById(pq.question_id);
      return question ? { ...question, score: pq.score } : null;
    }).filter(q => q !== null);
    
    res.json({ success: true, data: { list: questions } });
  } catch (error) {
    console.error('获取题目错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 添加题目到试卷
router.post('/:id/questions/add', async (req, res) => {
  try {
    const { question_ids } = req.body;
    const paperId = parseInt(req.params.id);
    
    if (!question_ids || !Array.isArray(question_ids)) {
      return res.status(400).json({ success: false, message: '请选择题目' });
    }
    
    question_ids.forEach(questionId => {
      db.paperQuestions.create({
        paper_id: paperId,
        question_id: questionId,
        score: 5
      });
    });
    
    res.json({ success: true, message: '添加成功' });
  } catch (error) {
    console.error('添加题目错误:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

// 从试卷移除题目
router.delete('/:id/questions/:questionId', async (req, res) => {
  try {
    db.paperQuestions.remove(req.params.id, req.params.questionId);
    res.json({ success: true, message: '移除成功' });
  } catch (error) {
    console.error('移除题目错误:', error);
    res.status(500).json({ success: false, message: '移除失败' });
  }
});

// 随机生成试卷
router.post('/random', async (req, res) => {
  try {
    const { title, count, category_id, time_limit } = req.body;
    
    let questions = db.questions.getAll();
    if (category_id) {
      questions = questions.filter(q => q.category_id === category_id);
    }
    
    const shuffled = questions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    const paper = db.papers.create({
      title,
      time_limit,
      status: 'draft'
    });
    
    selected.forEach(q => {
      db.paperQuestions.create({
        paper_id: paper.id,
        question_id: q.id,
        score: 5
      });
    });
    
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error('随机生成试卷错误:', error);
    res.status(500).json({ success: false, message: '生成失败' });
  }
});

module.exports = router;
