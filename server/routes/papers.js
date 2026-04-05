// server/routes/papers.js - 试卷管理路由 (JSON版)
const express = require('express');
const router = express.Router();
const db = require('../db');
const QRCode = require('qrcode');
const authenticate = require('../middleware/auth');

// 获取试卷列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let papers;
    if (req.user.role === "admin") {
      papers = db.papers.findAll({});
    } else {
      papers = db.papers.findAll({ user_id: req.user.id, status });
    }
    
    // 分页
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const rows = papers.slice(start, end);
    
    res.json({
      success: true,
      data: {
        list: rows,
        total: papers.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取试卷列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取公开试卷信息（学员访问）- 必须放在 /:id 之前
router.get('/public/:id', async (req, res) => {
  try {
    const paper = db.papers.findPublic(req.params.id);

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在或未发布' });
    }

    // 注意：访问密码验证不在此处进行，只在开始考试时验证

    // 获取创建者信息
    const user = db.users.findById(paper.user_id);

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
        access_code: paper.access_code,
        ip_limit: paper.ip_limit,
        question_count: paper.question_count,
        total_score: paper.total_score,
        allow_all_users: paper.allow_all_users,
        start_time: paper.start_time,
        end_time: paper.end_time,
        trainer: user ? { id: user.id, username: user.username, avatar: user.avatar } : null
      }
    });
  } catch (error) {
    console.error('获取公开试卷信息错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取单个试卷（管理用）
router.get('/:id', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const user = db.users.findById(paper.user_id);

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
        access_code: paper.access_code,
        ip_limit: paper.ip_limit,
        question_count: paper.question_count,
        total_score: paper.total_score,
        trainer: user ? { id: user.id, username: user.username, avatar: user.avatar } : null
      }
    });
  } catch (error) {
    console.error('获取试卷信息错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取试卷题目详情
router.get('/:id/questions', async (req, res) => {
  try {
    const paper = db.papers.findPublic(req.params.id);

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在或未发布' });
    }

    // 检查访问密码
    if (paper.access_code) {
      const { access_code } = req.query;
      if (access_code !== paper.access_code) {
        return res.status(403).json({ success: false, message: '访问密码错误' });
      }
    }
    
    // 获取试卷题目
    const paperQuestions = db.paperQuestions.findByPaperId(paper.id);
    
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
        order: pq.order
      };
    }).filter(q => q !== null);
    
    // 如果设置了随机顺序
    if (paper.shuffle) {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    
    res.json({
      success: true,
      data: {
        paper_id: paper.id,
        title: paper.title,
        time_limit: paper.time_limit,
        questions
      }
    });
  } catch (error) {
    console.error('获取试卷题目错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 创建试卷
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, time_limit, shuffle, show_score, show_answer, access_code, question_ids, ip_limit, allow_all_users, start_time, end_time } = req.body;

    const paper = db.papers.create({
      title,
      description,
      time_limit: time_limit || 60,
      shuffle: shuffle || false,
      show_score: show_score !== false,
      show_answer: show_answer !== false,
      access_code: access_code || null,
      ip_limit: ip_limit || 0,
      allow_all_users: allow_all_users !== false,
      user_id: req.user.id,
      status: 'draft',
      total_score: 0,
      start_time: start_time || null,
      end_time: end_time || null
    });
    
    // 添加题目到试卷
    if (question_ids && question_ids.length > 0) {
      const paperQuestions = question_ids.map((question_id, index) => {
        const q = db.questions.findById(question_id);
        return {
          paper_id: paper.id,
          paper_key_id: paper.key_id,
          question_id,
          question_key_id: q ? q.key_id : null,
          order: index,
          score: q ? q.score : 10
        };
      });
      db.paperQuestions.bulkCreate(paperQuestions);

      // 更新总分和题目数量
      const totalScore = paperQuestions.reduce((sum, pq) => sum + pq.score, 0);
      db.papers.update(paper.id, {
        total_score: totalScore,
        question_count: question_ids.length
      });
    }
    
    res.json({ success: true, message: '创建成功', data: paper });
  } catch (error) {
    console.error('创建试卷错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 更新试卷
router.put('/:id', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    const { title, description, time_limit, shuffle, show_score, show_answer, access_code, question_ids, status, allow_all_users } = req.body;
    
    // 更新题目关联
    if (question_ids) {
      db.paperQuestions.deleteByPaperKeyId(paper.key_id);
      const paperQuestions = question_ids.map((question_id, index) => {
        const q = db.questions.findById(question_id);
        return {
          paper_id: paper.id,
          paper_key_id: paper.key_id,
          question_id,
          question_key_id: q ? q.key_id : null,
          order: index,
          score: q ? q.score : 10
        };
      });
      db.paperQuestions.bulkCreate(paperQuestions);
      
      // 更新总分
      const totalScore = paperQuestions.reduce((sum, pq) => sum + pq.score, 0);
      req.body.total_score = totalScore;
    }
    
    const updated = db.papers.update(req.params.id, req.body);
    
    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新试卷错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 发布试卷并生成二维码
router.post('/:id/publish', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (!paper.question_count || paper.question_count === 0) {
      return res.status(400).json({ success: false, message: '试卷暂无题目，请先添加题目后再发布' });
    }
    
    // 生成访问链接
    const baseUrl = req.app.locals.BASE_URL;
    if (!baseUrl || baseUrl.includes('localhost')) {
      console.warn('警告: BASE_URL 未设置或使用 localhost，生产环境应配置实际访问地址');
    }
    const accessUrl = baseUrl ? `${baseUrl}/exam/${paper.id}` : `http://localhost:${process.env.PORT || 3000}/exam/${paper.id}`;
    
    // 生成二维码
    const qrcodeDataUrl = await QRCode.toDataURL(accessUrl);
    
    // 更新试卷状态
    const updated = db.papers.update(paper.id, {
      status: 'published',
      qrcode_url: qrcodeDataUrl
    });
    
    res.json({ 
      success: true, 
      message: '发布成功', 
      data: {
        paper_id: paper.id,
        access_url: accessUrl,
        qrcode: qrcodeDataUrl
      }
    });
  } catch (error) {
    console.error('发布试卷错误:', error);
    res.status(500).json({ success: false, message: '发布失败' });
  }
});

// 取消发布试卷
router.post('/:id/unpublish', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    if (paper.status !== 'published') {
      return res.status(400).json({ success: false, message: '试卷未发布' });
    }
    
    // 更新试卷状态为草稿
    const updated = db.papers.update(paper.id, {
      status: 'draft',
      qrcode_url: null
    });
    
    res.json({ 
      success: true, 
      message: '取消发布成功', 
      data: updated
    });
  } catch (error) {
    console.error('取消发布试卷错误:', error);
    res.status(500).json({ success: false, message: '取消发布失败' });
  }
});

// 删除试卷
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    db.papers.delete(req.params.id);
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除试卷错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 获取试卷的考试链接（不需要登录）
router.get('/:id/exam-url', async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    // 只有已发布的试卷才能查看
    if (paper.status !== 'published') {
      return res.status(403).json({ success: false, message: '试卷未发布' });
    }

    // 生成访问链接 - 使用请求的协议和主机作为基础
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = req.app.locals.BASE_URL || `${protocol}://${host}`;
    let accessUrl = `${baseUrl}/exam/${paper.key_id}`;

    // 如果有访问密码，添加到链接
    if (paper.access_code) {
      accessUrl += `?code=${paper.access_code}`;
    }

    // 生成二维码
    const qrcodeDataUrl = await QRCode.toDataURL(accessUrl);

    res.json({
      success: true,
      data: {
        paper_id: paper.id,
        paper_key_id: paper.key_id,
        title: paper.title,
        status: paper.status,
        access_url: accessUrl,
        qrcode: qrcodeDataUrl,
        access_code: paper.access_code
      }
    });
  } catch (error) {
    console.error('获取考试链接错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 随机抽题组卷
router.post('/random', authenticate, async (req, res) => {
  try {
    const { title, category_ids, question_types, count, time_limit, shuffle, show_score, show_answer } = req.body;

    // 随机抽取题目
    // admin可以抽所有用户的题目，普通用户只能抽自己的
    const userId = req.user.role === "admin" ? null : req.user.id;
    const questions = db.questions.random(
      userId,
      category_ids || [],
      question_types || [],
      count
    );

    if (questions.length < count) {
      return res.status(400).json({ success: false, message: `题库中只有 ${questions.length} 道题目` });
    }

    // 创建试卷
    const paper = db.papers.create({
      title,
      description: `随机抽取${count}道题目`,
      time_limit: time_limit || 60,
      shuffle: shuffle || false,
      show_score: show_score !== false,
      show_answer: show_answer !== false,
      allow_all_users: true,
      user_id: req.user.id,
      status: 'draft',
      total_score: questions.reduce((sum, q) => sum + q.score, 0)
    });
    
    // 添加题目到试卷
    const paperQuestions = questions.map((q, index) => ({
      paper_id: paper.id,
      paper_key_id: paper.key_id,
      question_id: q.id,
      question_key_id: q.key_id,
      order: index,
      score: q.score
    }));
    db.paperQuestions.bulkCreate(paperQuestions);

    // 更新试卷的题目数量
    db.papers.update(paper.id, { question_count: questions.length });

    res.json({ 
      success: true, 
      message: '创建成功', 
      data: {
        paper,
        question_count: questions.length
      }
    });
  } catch (error) {
    console.error('随机组卷错误:', error);
    res.status(500).json({ success: false, message: '组卷失败' });
  }
});

// 获取试卷的题目列表（管理用）
router.get('/:id/manage-questions', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    // 获取试卷题目关联
    const paperQuestions = db.paperQuestions.findByPaperId(paper.id);
    
    // 获取题目详情
    const questions = paperQuestions.map(pq => {
      const q = db.questions.findById(pq.question_id);
      if (!q) return null;
      return {
        id: q.id,
        title: q.title,
        type: q.type,
        options: q.options,
        score: pq.score,
        order: pq.order
      };
    }).filter(q => q !== null);
    
    res.json({
      success: true,
      data: {
        list: questions,
        total: questions.length
      }
    });
  } catch (error) {
    console.error('获取试卷题目错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 添加题目到试卷
router.post('/:id/questions/add', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    const { question_ids } = req.body;
    
    if (!question_ids || !Array.isArray(question_ids)) {
      return res.status(400).json({ success: false, message: '无效的题目ID' });
    }
    
    // 获取当前最大order
    const existingQuestions = db.paperQuestions.findByPaperId(paper.id);
    let maxOrder = existingQuestions.length > 0
      ? Math.max(...existingQuestions.map(pq => pq.order))
      : 0;

    // 添加新题目
    const newPaperQuestions = question_ids.map(question_id => {
      const q = db.questions.findById(question_id);
      maxOrder++;
      return {
        paper_id: paper.id,
        paper_key_id: paper.key_id,
        question_id,
        question_key_id: q ? q.key_id : null,
        order: maxOrder,
        score: q ? q.score : 10
      };
    });

    db.paperQuestions.bulkCreate(newPaperQuestions);

    // 更新试卷总分和题目数量
    const allPaperQuestions = db.paperQuestions.findByPaperId(paper.id);
    const totalScore = allPaperQuestions.reduce((sum, pq) => sum + pq.score, 0);
    db.papers.update(paper.id, {
      total_score: totalScore,
      question_count: allPaperQuestions.length
    });
    
    res.json({
      success: true,
      message: `成功添加 ${question_ids.length} 道题目`
    });
  } catch (error) {
    console.error('添加题目错误:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

// 从试卷移除题目
router.delete('/:id/questions/:questionId', authenticate, async (req, res) => {
  try {
    const paper = db.papers.findById(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }
    
    if (req.user.role !== "admin" && paper.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    db.paperQuestions.deleteByPaperIdAndQuestionId(paper.id, parseInt(req.params.questionId));

    // 更新试卷总分和题目数量
    const allPaperQuestions = db.paperQuestions.findByPaperId(paper.id);
    const totalScore = allPaperQuestions.reduce((sum, pq) => sum + pq.score, 0);
    db.papers.update(paper.id, {
      total_score: totalScore,
      question_count: allPaperQuestions.length
    });
    
    res.json({
      success: true,
      message: '移除成功'
    });
  } catch (error) {
    console.error('移除题目错误:', error);
    res.status(500).json({ success: false, message: '移除失败' });
  }
});

module.exports = router;
