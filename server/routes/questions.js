// server/routes/questions.js - 题目管理路由 (JSON版)
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticate = require('../middleware/auth');

// 获取题目列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, category_id, type, keyword, status } = req.query;
    
    let questions;
    if (req.user.role === "admin") {
      questions = db.questions.findAll({
        category_id: category_id ? parseInt(category_id) : null,
        type,
        keyword,
        status
      });
    } else {
      questions = db.questions.findAll({
        user_id: req.user.id,
        category_id: category_id ? parseInt(category_id) : null,
        type,
        keyword,
        status
      });
    }
    
    // 分页
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const rows = questions.slice(start, end);
    
    // 填充分类信息
    const list = rows.map(q => {
      const category = db.categories.findById(q.category_id);
      return { ...q, Category: category ? { id: category.id, name: category.name } : null };
    });
    
    res.json({
      success: true,
      data: {
        list,
        total: questions.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取题目列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 获取题目详情
router.get('/:id', async (req, res) => {
  try {
    const question = db.questions.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    
    res.json({ success: true, data: question });
  } catch (error) {
    console.error('获取题目详情错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 创建题目
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, type, options, answer, explanation, difficulty, score, tags, category_id, status } = req.body;
    
    const question = db.questions.create({
      title,
      type,
      options,
      answer,
      explanation,
      difficulty: difficulty || 'medium',
      score: score || 10,
      tags: tags || [],
      category_id: category_id ? parseInt(category_id) : null,
      user_id: req.user.id,
      status: status || 'draft'
    });
    
    res.json({ success: true, message: '创建成功', data: question });
  } catch (error) {
    console.error('创建题目错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 更新题目
router.put('/:id', authenticate, async (req, res) => {
  try {
    const question = db.questions.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    
    if (req.user.role !== "admin" && question.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    const { title, type, options, answer, explanation, difficulty, score, tags, category_id, status } = req.body;
    
    const updated = db.questions.update(req.params.id, {
      title, type, options, answer, explanation, difficulty, score, tags, category_id: category_id ? parseInt(category_id) : null, status
    });
    
    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新题目错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除题目
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const question = db.questions.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    
    if (req.user.role !== "admin" && question.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    
    db.questions.delete(req.params.id);
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除题目错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 批量导入题目
router.post('/import', authenticate, async (req, res) => {
  try {
    const { questions: importQuestions, category_id } = req.body;
    
    if (!Array.isArray(importQuestions) || importQuestions.length === 0) {
      return res.status(400).json({ success: false, message: '请提供题目列表' });
    }
    
    const questions = db.questions.bulkCreate(
      importQuestions.map(q => ({
        title: q.title,
        type: q.type || 'single',
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
        score: q.score || 10,
        tags: q.tags || [],
        category_id: category_id ? parseInt(category_id) : (q.category_id ? parseInt(q.category_id) : null),
        user_id: req.user.id,
        status: 'draft'
      }))
    );
    
    res.json({ 
      success: true, 
      message: `成功导入 ${questions.length} 道题目`,
      data: { count: questions.length }
    });
  } catch (error) {
    console.error('批量导入错误:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
});

module.exports = router;
