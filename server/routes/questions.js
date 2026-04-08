// server/routes/questions.js - 题目管理路由 (MySQL版)
const express = require('express');
const router = express.Router();
const db = require('../db');
const mysqlDb = require('../db-mysql');
const authenticate = require('../middleware/auth');

async function getQuestionsFromMySQL(filters = {}) {
  if (!mysqlDb.isConnected()) return null;
  try {
    return await mysqlDb.getQuestions(filters.category_id);
  } catch (e) {
    console.warn('[Questions] MySQL query failed:', e.message);
    return null;
  }
}

async function getQuestionFromMySQL(id) {
  if (!mysqlDb.isConnected()) return null;
  try {
    return await mysqlDb.getQuestionById(id);
  } catch (e) {
    console.warn('[Questions] MySQL query failed:', e.message);
    return null;
  }
}

// 获取题目列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, category_id, type, keyword, status } = req.query;

    let questions;
    const mysqlQuestions = await getQuestionsFromMySQL({ category_id });
    if (mysqlQuestions) {
      questions = mysqlQuestions;
    } else {
      questions = await db.getQuestions();
    }

    if (category_id) {
      questions = questions.filter(q => q.category_id === parseInt(category_id));
    }
    if (type) {
      questions = questions.filter(q => q.type === type);
    }
    if (keyword) {
      questions = questions.filter(q => q.title.includes(keyword));
    }
    if (status) {
      questions = questions.filter(q => q.status === status);
    }

    const total = questions.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const rows = questions.slice(start, end);

    // 批量获取所有需要的分类信息，避免 N+1 查询
    const categoryIds = [...new Set(rows.filter(q => q.category_id).map(q => q.category_id))];
    let categoriesMap = {};
    
    if (categoryIds.length > 0) {
      if (mysqlDb.isConnected()) {
        try {
          const categories = await mysqlDb.getCategories();
          categories.forEach(c => {
            categoriesMap[c.id] = c;
          });
        } catch (e) {
          // MySQL 失败，使用 JSON
        }
      }
      
      // 如果 MySQL 没有数据或失败，从 JSON 获取
      if (Object.keys(categoriesMap).length === 0) {
        const allCategories = await db.getCategories();
        allCategories.forEach(c => {
          categoriesMap[c.id] = c;
        });
      }
    }
    
    const list = rows.map(q => {
      const category = q.category_id ? categoriesMap[q.category_id] : null;
      return { ...q, Category: category ? { id: category.id, name: category.name } : null };
    });

    res.json({
      success: true,
      data: {
        list,
        total,
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
    let question = await getQuestionFromMySQL(req.params.id);
    if (!question) {
      question = await db.getQuestionById(req.params.id);
    }

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

    const questionData = {
      title,
      type,
      options,
      answer,
      explanation,
      difficulty: difficulty || 'medium',
      score: score || 10,
      tags: tags || [],
      category_id: category_id ? parseInt(category_id) : null,
      status: status || 'draft'
    };

    let question;
    if (mysqlDb.isConnected()) {
      question = await mysqlDb.createQuestion(questionData);
    } else {
      question = await db.createQuestion(questionData);
    }

    res.json({ success: true, message: '创建成功', data: question });
  } catch (error) {
    console.error('创建题目错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 更新题目
router.put('/:id', authenticate, async (req, res) => {
  try {
    let question = await getQuestionFromMySQL(req.params.id);
    if (!question) {
      question = await db.getQuestionById(req.params.id);
    }

    if (!question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }

    const { title, type, options, answer, explanation, difficulty, score, tags, category_id, status } = req.body;

    const updateData = { title, type, options, answer, explanation, difficulty, score, tags, category_id: category_id ? parseInt(category_id) : null, status };

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.updateQuestion(req.params.id, updateData);
    } else {
      updated = await db.updateQuestion(req.params.id, updateData);
    }

    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新题目错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除题目
router.delete('/:id', authenticate, async (req, res) => {
  try {
    let question = await getQuestionFromMySQL(req.params.id);
    if (!question) {
      question = await db.getQuestionById(req.params.id);
    }

    if (!question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }

    if (mysqlDb.isConnected()) {
      await mysqlDb.deleteQuestion(req.params.id);
    } else {
      await db.deleteQuestion(req.params.id);
    }

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

    let count = 0;
    for (const q of importQuestions) {
      const questionData = {
        title: q.title,
        type: q.type || 'single',
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
        score: q.score || 10,
        tags: q.tags || [],
        category_id: category_id ? parseInt(category_id) : (q.category_id ? parseInt(q.category_id) : null),
        status: 'draft'
      };

      if (mysqlDb.isConnected()) {
        await mysqlDb.createQuestion(questionData);
      } else {
        await db.createQuestion(questionData);
      }
      count++;
    }

    res.json({
      success: true,
      message: `成功导入 ${count} 道题目`,
      data: { count }
    });
  } catch (error) {
    console.error('批量导入错误:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
});

module.exports = router;
