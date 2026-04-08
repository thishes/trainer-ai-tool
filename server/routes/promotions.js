// server/routes/promotions.js - 文案促销管理路由
const express = require('express');
const router = express.Router();
const db = require('../db');
const mysqlDb = require('../db-mysql');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, locked } = req.query;

    const filters = {};
    if (req.user.role !== 'admin') {
      filters.user_id = req.user.id;
    }
    if (status) filters.status = status;
    if (locked !== undefined) filters.locked = locked === 'true';

    let promotions = [];
    if (mysqlDb.isConnected()) {
      promotions = await mysqlDb.getPromotions(filters);
    } else {
      promotions = db.promotions.findAll(filters);
    }

    const list = await Promise.all(promotions.map(async p => {
      const creator = db.users.findById(p.created_by);
      let signupCount = 0;
      if (mysqlDb.isConnected()) {
        const signups = await mysqlDb.getPromotionSignups(p.id);
        signupCount = signups.length;
      } else {
        signupCount = db.promotionSignups.findAll({ promotion_id: p.id }).length;
      }
      return {
        ...p,
        creator: creator ? { id: creator.id, username: creator.username } : null,
        signup_count: signupCount
      };
    }));

    res.json({
      success: true,
      data: {
        list,
        total: list.length
      }
    });
  } catch (error) {
    console.error('获取文案列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    let promotion;
    if (mysqlDb.isConnected()) {
      promotion = await mysqlDb.getPromotionById(req.params.id);
    } else {
      promotion = db.promotions.findById(req.params.id);
    }

    if (!promotion) {
      return res.status(404).json({ success: false, message: '文案不存在' });
    }

    if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限查看此文案' });
    }

    const creator = db.users.findById(promotion.created_by);
    let signups = [];
    if (mysqlDb.isConnected()) {
      signups = await mysqlDb.getPromotionSignups(promotion.id);
    } else {
      signups = db.promotionSignups.findAll({ promotion_id: promotion.id });
    }
    const signupUsers = signups.map(s => {
      const user = db.users.findById(s.user_id);
      return { ...s, user: user ? { id: user.id, username: user.username } : null };
    });

    res.json({
      success: true,
      data: {
        ...promotion,
        creator: creator ? { id: creator.id, username: creator.username } : null,
        signups: signupUsers
      }
    });
  } catch (error) {
    console.error('获取文案详情错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, status, enable_signup } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    const promotionData = {
      title,
      content: content || '',
      status: status || 'draft',
      enable_signup: enable_signup || false,
      locked: false,
      created_by: req.user.id
    };

    let promotion;
    if (mysqlDb.isConnected()) {
      promotion = await mysqlDb.createPromotion(promotionData);
    } else {
      promotion = db.promotions.create(promotionData);
    }

    res.json({ success: true, message: '创建成功', data: promotion });
  } catch (error) {
    console.error('创建文案错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    let promotion;
    if (mysqlDb.isConnected()) {
      promotion = await mysqlDb.getPromotionById(req.params.id);
    } else {
      promotion = db.promotions.findById(req.params.id);
    }

    if (!promotion) {
      return res.status(404).json({ success: false, message: '文案不存在' });
    }

    if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限编辑此文案' });
    }

    if (promotion.locked && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '文案已锁定，无法编辑' });
    }

    const { title, content, status, enable_signup } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    if (enable_signup !== undefined) updates.enable_signup = enable_signup;

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.updatePromotion(req.params.id, updates);
    } else {
      updated = db.promotions.update(req.params.id, updates);
    }

    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新文案错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    let promotion;
    if (mysqlDb.isConnected()) {
      promotion = await mysqlDb.getPromotionById(req.params.id);
    } else {
      promotion = db.promotions.findById(req.params.id);
    }

    if (!promotion) {
      return res.status(404).json({ success: false, message: '文案不存在' });
    }

    if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限删除此文案' });
    }

    if (promotion.locked && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '文案已锁定，无法删除' });
    }

    if (mysqlDb.isConnected()) {
      await mysqlDb.deletePromotion(req.params.id);
    } else {
      db.promotions.delete(req.params.id);
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除文案错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

router.post('/:id/lock', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '只有管理员可以锁定文案' });
    }

    let promotion;
    if (mysqlDb.isConnected()) {
      promotion = await mysqlDb.getPromotionById(req.params.id);
    } else {
      promotion = db.promotions.findById(req.params.id);
    }

    if (!promotion) {
      return res.status(404).json({ success: false, message: '文案不存在' });
    }

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.lockPromotion(req.params.id);
    } else {
      updated = db.promotions.update(req.params.id, { locked: true });
    }

    res.json({ success: true, message: '锁定成功', data: updated });
  } catch (error) {
    console.error('锁定文案错误:', error);
    res.status(500).json({ success: false, message: '锁定失败' });
  }
});

router.post('/:id/unlock', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '只有管理员可以解锁文案' });
    }

    let promotion;
    if (mysqlDb.isConnected()) {
      promotion = await mysqlDb.getPromotionById(req.params.id);
    } else {
      promotion = db.promotions.findById(req.params.id);
    }

    if (!promotion) {
      return res.status(404).json({ success: false, message: '文案不存在' });
    }

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.unlockPromotion(req.params.id);
    } else {
      updated = db.promotions.update(req.params.id, { locked: false });
    }

    res.json({ success: true, message: '解锁成功', data: updated });
  } catch (error) {
    console.error('解锁文案错误:', error);
    res.status(500).json({ success: false, message: '解锁失败' });
  }
});

router.post('/:id/signup', authenticate, async (req, res) => {
  try {
    let promotion;
    if (mysqlDb.isConnected()) {
      promotion = await mysqlDb.getPromotionById(req.params.id);
    } else {
      promotion = db.promotions.findById(req.params.id);
    }

    if (!promotion) {
      return res.status(404).json({ success: false, message: '文案不存在' });
    }

    if (promotion.status !== 'published') {
      return res.status(400).json({ success: false, message: '文案未发布，无法报名' });
    }

    let existingSignup;
    if (mysqlDb.isConnected()) {
      const signups = await mysqlDb.getPromotionSignups(promotion.id);
      existingSignup = signups.find(s => s.user_id === req.user.id);
    } else {
      existingSignup = db.promotionSignups.findByPromotionAndUser(promotion.id, req.user.id);
    }
    if (existingSignup) {
      return res.status(400).json({ success: false, message: '已报名，无需重复报名' });
    }

    let signup;
    if (mysqlDb.isConnected()) {
      signup = await mysqlDb.createPromotionSignup({ promotion_id: promotion.id, user_id: req.user.id });
    } else {
      signup = db.promotionSignups.create({ promotion_id: promotion.id, user_id: req.user.id });
    }

    res.json({ success: true, message: '报名成功', data: signup });
  } catch (error) {
    console.error('报名错误:', error);
    res.status(500).json({ success: false, message: '报名失败' });
  }
});

module.exports = router;
