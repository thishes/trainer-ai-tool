// server/routes/papers.js - 试卷管理路由 (MySQL优先)
const express = require('express');
const router = express.Router();
const db = require('../db');
const mysqlDb = require('../db-mysql');
const QRCode = require('qrcode');
const authenticate = require('../middleware/auth');

async function getPapersFromMySQL(ownerId = null) {
  if (!mysqlDb.isConnected()) return null;
  try {
    return await mysqlDb.getPapers(ownerId);
  } catch (e) {
    console.warn('[Papers] MySQL query failed:', e.message);
    return null;
  }
}

async function getPaperFromMySQL(id) {
  if (!mysqlDb.isConnected()) return null;
  try {
    return await mysqlDb.getPaperById(id);
  } catch (e) {
    console.warn('[Papers] MySQL query failed:', e.message);
    return null;
  }
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filters = { page, limit };
    if (req.user.role !== 'admin') {
      filters.user_id = req.user.id;
    }
    if (status) {
      filters.status = status;
    }

    let result;
    const mysqlPapers = await getPapersFromMySQL(filters.user_id);
    if (mysqlPapers) {
      result = { list: mysqlPapers, total: mysqlPapers.length, page: parseInt(page), limit: parseInt(limit) };
    } else {
      result = await db.papers.findAll(filters);
    }

    const list = await Promise.all(result.list.map(async p => {
      let owner = null;
      const ownerId = p.user_id || p.owner_id;
      if (mysqlDb.isConnected()) {
        try {
          owner = await mysqlDb.getUserById(ownerId);
        } catch (e) {}
      }
      if (!owner) {
        owner = await db.users.findById(ownerId);
      }
      return {
        ...p,
        owner: owner ? { id: owner.id, username: owner.username, avatar: owner.avatar } : null
      };
    }));

    res.json({
      success: true,
      data: { list, total: result.total, page: result.page, limit: result.limit }
    });
  } catch (error) {
    console.error('获取试卷列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/public/:id', async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper || paper.status !== 'published') {
      return res.status(404).json({ success: false, message: '试卷不存在或未发布' });
    }

    let owner = null;
    if (mysqlDb.isConnected()) {
      try {
        owner = await mysqlDb.getUserById(paper.owner_id);
      } catch (e) {}
    }
    if (!owner) {
      owner = await db.getUserById(paper.owner_id);
    }

    res.json({
      success: true,
      data: {
        id: paper.id,
        title: paper.title,
        description: paper.description,
        duration: paper.duration,
        status: paper.status,
        total_score: paper.total_score,
        passing_score: paper.passing_score,
        trainer: owner ? { id: owner.id, username: owner.username, avatar: owner.avatar } : null
      }
    });
  } catch (error) {
    console.error('获取公开试卷信息错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    let owner = null;
    if (mysqlDb.isConnected()) {
      try {
        owner = await mysqlDb.getUserById(paper.owner_id);
      } catch (e) {}
    }
    if (!owner) {
      owner = await db.getUserById(paper.owner_id);
    }

    res.json({
      success: true,
      data: {
        ...paper,
        owner: owner ? { id: owner.id, username: owner.username, avatar: owner.avatar } : null
      }
    });
  } catch (error) {
    console.error('获取试卷信息错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:id/questions', async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper || paper.status !== 'published') {
      return res.status(404).json({ success: false, message: '试卷不存在或未发布' });
    }

    let questions;
    if (mysqlDb.isConnected()) {
      try {
        questions = await mysqlDb.getQuestions();
      } catch (e) {
        questions = await db.getQuestions();
      }
    } else {
      questions = await db.getQuestions();
    }
    const questionIds = paper.question_ids || [];

    const paperQuestions = questionIds.map((qid, index) => {
      const q = questions.find(q => q.id === qid);
      if (!q) return null;
      return { id: q.id, title: q.title, type: q.type, options: q.options, score: q.score, order: index };
    }).filter(q => q !== null);

    res.json({
      success: true,
      data: {
        paper_id: paper.id,
        title: paper.title,
        duration: paper.duration,
        questions: paperQuestions
      }
    });
  } catch (error) {
    console.error('获取试卷题目错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, duration, question_ids, random_config, status, passing_score } = req.body;

    const paperData = {
      title,
      description: description || '',
      owner_id: req.user.id,
      duration: duration || 60,
      total_score: 0,
      question_ids: question_ids || [],
      random_config: random_config || {},
      status: status || 'draft',
      passing_score: passing_score || 60
    };

    let paper;
    if (mysqlDb.isConnected()) {
      paper = await mysqlDb.createPaper(paperData);
    } else {
      paper = await db.createPaper(paperData);
    }

    if (question_ids && question_ids.length > 0) {
      let questions;
      if (mysqlDb.isConnected()) {
        try {
          questions = await mysqlDb.getQuestions();
        } catch (e) {
          questions = await db.getQuestions();
        }
      } else {
        questions = await db.getQuestions();
      }
      let totalScore = 0;
      for (const qid of question_ids) {
        const q = questions.find(q => q.id === qid);
        if (q) totalScore += q.score;
      }
      if (mysqlDb.isConnected()) {
        await mysqlDb.updatePaper(paper.id, { total_score: totalScore });
      } else {
        await db.updatePaper(paper.id, { total_score: totalScore });
      }
      paper.total_score = totalScore;
    }

    res.json({ success: true, message: '创建成功', data: paper });
  } catch (error) {
    console.error('创建试卷错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { title, description, duration, question_ids, status, passing_score } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (duration !== undefined) updates.duration = duration;
    if (status !== undefined) updates.status = status;
    if (passing_score !== undefined) updates.passing_score = passing_score;
    if (question_ids !== undefined) {
      updates.question_ids = question_ids;
      let questions;
      if (mysqlDb.isConnected()) {
        try {
          questions = await mysqlDb.getQuestions();
        } catch (e) {
          questions = await db.getQuestions();
        }
      } else {
        questions = await db.getQuestions();
      }
      let totalScore = 0;
      for (const qid of question_ids) {
        const q = questions.find(q => q.id === qid);
        if (q) totalScore += q.score;
      }
      updates.total_score = totalScore;
    }

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.updatePaper(req.params.id, updates);
    } else {
      updated = await db.updatePaper(req.params.id, updates);
    }

    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新试卷错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.post('/:id/publish', authenticate, async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (!paper.question_ids || paper.question_ids.length === 0) {
      return res.status(400).json({ success: false, message: '试卷暂无题目' });
    }

    const baseUrl = req.app.locals.BASE_URL;
    const accessUrl = baseUrl ? `${baseUrl}/exam/${paper.id}` : `http://localhost:${process.env.PORT || 3000}/exam/${paper.id}`;
    const qrcodeDataUrl = await QRCode.toDataURL(accessUrl);

    if (mysqlDb.isConnected()) {
      await mysqlDb.updatePaper(paper.id, { status: 'published' });
    } else {
      await db.updatePaper(paper.id, { status: 'published' });
    }

    res.json({
      success: true,
      message: '发布成功',
      data: { paper_id: paper.id, access_url: accessUrl, qrcode: qrcodeDataUrl }
    });
  } catch (error) {
    console.error('发布试卷错误:', error);
    res.status(500).json({ success: false, message: '发布失败' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (mysqlDb.isConnected()) {
      await mysqlDb.deletePaper(req.params.id);
    } else {
      await db.deletePaper(req.params.id);
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除试卷错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 取消发布试卷
router.post('/:id/unpublish', authenticate, async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (paper.status !== 'published') {
      return res.status(400).json({ success: false, message: '试卷未发布' });
    }

    const updateData = { status: 'draft' };

    if (mysqlDb.isConnected()) {
      await mysqlDb.updatePaper(req.params.id, updateData);
    } else {
      await db.updatePaper(req.params.id, updateData);
    }

    res.json({ success: true, message: '取消发布成功' });
  } catch (error) {
    console.error('取消发布试卷错误:', error);
    res.status(500).json({ success: false, message: '取消发布失败' });
  }
});

// 获取试卷考试地址
router.get('/:id/exam-url', authenticate, async (req, res) => {
  try {
    let paper = await getPaperFromMySQL(req.params.id);
    if (!paper) {
      paper = await db.getPaperById(req.params.id);
    }

    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (req.user.role !== 'admin' && paper.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (paper.status !== 'published') {
      return res.status(400).json({ success: false, message: '试卷未发布' });
    }

    const baseUrl = req.app.locals.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const accessUrl = `${baseUrl}/exam/${paper.id}`;

    res.json({
      success: true,
      data: {
        paper_id: paper.id,
        access_url: accessUrl
      }
    });
  } catch (error) {
    console.error('获取考试地址错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

module.exports = router;
