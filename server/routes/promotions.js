// server/routes/promotions.js - 文案促销管理路由
const express = require('express');
const router = express.Router();
const db = require('../db');
const mysqlDb = require('../db-mysql');
const authenticate = require('../middleware/auth');
const redis = require('../redis');
const QRCode = require('qrcode');
const XLSX = require('xlsx');

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, locked } = req.query;
    const cacheKey = `promotions:list:${req.user.role}:${status || 'all'}:${locked || 'all'}`;
    
    // 检查缓存
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, fromCache: true });
    }

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

    // 批量获取用户信息
    const creatorIds = [...new Set(promotions.map(p => p.created_by).filter(Boolean))];
    const creatorsMap = {};
    
    if (creatorIds.length > 0) {
      if (mysqlDb.isConnected()) {
        try {
          const users = await mysqlDb.getUsers();
          users.forEach(u => {
            if (creatorIds.includes(u.id)) {
              creatorsMap[u.id] = { id: u.id, username: u.username };
            }
          });
        } catch (e) {
          creatorIds.forEach(id => {
            const user = db.users.findById(id);
            if (user) creatorsMap[id] = { id: user.id, username: user.username };
          });
        }
      } else {
        creatorIds.forEach(id => {
          const user = db.users.findById(id);
          if (user) creatorsMap[id] = { id: user.id, username: user.username };
        });
      }
    }

    // 批量获取报名数量
    const promotionIds = promotions.map(p => p.id);
    const signupCountsMap = {};
    
    if (promotionIds.length > 0) {
      if (mysqlDb.isConnected()) {
        try {
          // 使用单个查询获取所有报名数量
          const { query } = require('../db-mysql');
          const rows = await query(
            'SELECT promotion_id, COUNT(*) as count FROM promotion_signups WHERE promotion_id IN (?) GROUP BY promotion_id',
            [promotionIds]
          );
          rows.forEach(row => {
            signupCountsMap[row.promotion_id] = row.count;
          });
        } catch (e) {
          promotions.forEach(p => {
            signupCountsMap[p.id] = db.promotionSignups.findAll({ promotion_id: p.id }).length;
          });
        }
      } else {
        promotions.forEach(p => {
          signupCountsMap[p.id] = db.promotionSignups.findAll({ promotion_id: p.id }).length;
        });
      }
    }

    const list = promotions.map(p => ({
      ...p,
      creator: creatorsMap[p.created_by] || null,
      signup_count: signupCountsMap[p.id] || 0
    }));

    const result = { list, total: list.length };
    
    // 缓存结果2分钟
    await redis.setWithExpiry(cacheKey, result, 120);

    res.json({ success: true, data: result });
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

    // 清除文案列表缓存
    await clearPromotionsCache();

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

    // 清除文案列表缓存
    await clearPromotionsCache();

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

    // 清除文案列表缓存
    await clearPromotionsCache();

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除文案错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 清除文案列表缓存
async function clearPromotionsCache() {
  try {
    const client = await redis.getRedisClient();
    if (client && redis.isConnected()) {
      const keys = await client.keys('promotions:list:*');
      if (keys.length > 0) {
        await client.del(keys);
        console.log(`[Cache] Cleared ${keys.length} promotions cache entries`);
      }
    }
  } catch (error) {
    console.error('[Cache] Failed to clear promotions cache:', error.message);
  }
}

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

// ==================== 预览功能 ====================

// 获取预览数据（生成二维码和外链）
router.get('/:id/preview', authenticate, async (req, res) => {
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

    // 权限检查
    if (req.user.role !== 'admin' && promotion.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限预览此文案' });
    }

    // 生成外链URL
    const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/promotion/${promotion.id}`;
    
    // 生成二维码
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        promotion: {
          id: promotion.id,
          title: promotion.title,
          content: promotion.content,
          status: promotion.status,
          enable_signup: promotion.enable_signup,
          signup_config: promotion.signup_config
        },
        public_url: publicUrl,
        qr_code: qrCodeDataUrl
      }
    });
  } catch (error) {
    console.error('获取预览数据错误:', error);
    res.status(500).json({ success: false, message: '获取预览数据失败' });
  }
});

// ==================== 公开访问（无需登录） ====================

// 公开获取文案详情（用于外链访问）
router.get('/:id/public', async (req, res) => {
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

    // 草稿状态不允许公开访问
    if (promotion.status === 'draft') {
      return res.status(403).json({ success: false, message: '内容暂未发布', code: 'NOT_PUBLISHED' });
    }

    // 检查报名是否截止
    let signupEnded = false;
    if (promotion.enable_signup && promotion.signup_config?.deadline) {
      signupEnded = new Date() > new Date(promotion.signup_config.deadline);
    }

    res.json({
      success: true,
      data: {
        id: promotion.id,
        title: promotion.title,
        content: promotion.content,
        status: promotion.status,
        enable_signup: promotion.enable_signup,
        signup_config: promotion.signup_config,
        signup_ended: signupEnded,
        created_at: promotion.created_at
      }
    });
  } catch (error) {
    console.error('获取公开文案错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// ==================== 报名配置 ====================

// 更新报名配置
router.put('/:id/signup-config', authenticate, async (req, res) => {
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

    const { enable_signup, signup_config } = req.body;

    const updates = {
      enable_signup: enable_signup || false,
      signup_config: signup_config || {
        require_approval: false,
        max_signups: null,
        deadline: null,
        classes: []
      }
    };

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.updatePromotion(req.params.id, updates);
    } else {
      updated = db.promotions.update(req.params.id, updates);
    }

    // 清除缓存
    await clearPromotionsCache();

    res.json({ success: true, message: '报名配置更新成功', data: updated });
  } catch (error) {
    console.error('更新报名配置错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// ==================== 报名管理 ====================

// 获取报名列表
router.get('/:id/signups', authenticate, async (req, res) => {
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
      return res.status(403).json({ success: false, message: '无权限查看此名单' });
    }

    const { keyword, class_id, status, page = 1, limit = 50 } = req.query;

    let signups = [];
    if (mysqlDb.isConnected()) {
      try {
        const { query } = require('../db-mysql');
        let sql = 'SELECT * FROM promotion_signups WHERE promotion_id = ?';
        const params = [req.params.id];

        if (class_id) {
          sql += ' AND class_id = ?';
          params.push(class_id);
        }
        if (status) {
          sql += ' AND status = ?';
          params.push(status);
        }
        if (keyword) {
          sql += ' AND (name LIKE ? OR phone LIKE ?)';
          params.push(`%${keyword}%`, `%${keyword}%`);
        }

        sql += ' ORDER BY created_at DESC';
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        signups = await query(sql, params);

        // 获取总数
        let countSql = 'SELECT COUNT(*) as total FROM promotion_signups WHERE promotion_id = ?';
        const countParams = [req.params.id];
        if (class_id) {
          countSql += ' AND class_id = ?';
          countParams.push(class_id);
        }
        if (status) {
          countSql += ' AND status = ?';
          countParams.push(status);
        }
        if (keyword) {
          countSql += ' AND (name LIKE ? OR phone LIKE ?)';
          countParams.push(`%${keyword}%`, `%${keyword}%`);
        }

        const countResult = await query(countSql, countParams);
        var total = countResult[0]?.total || 0;
      } catch (e) {
        signups = db.promotionSignups.findAll({ promotion_id: parseInt(req.params.id) });
        // 应用过滤
        if (class_id) signups = signups.filter(s => s.class_id === class_id);
        if (status) signups = signups.filter(s => s.status === status);
        if (keyword) {
          signups = signups.filter(s => 
            s.name?.includes(keyword) || s.phone?.includes(keyword)
          );
        }
        total = signups.length;
        // 分页
        const start = (parseInt(page) - 1) * parseInt(limit);
        signups = signups.slice(start, start + parseInt(limit));
      }
    } else {
      signups = db.promotionSignups.findAll({ promotion_id: parseInt(req.params.id) });
      if (class_id) signups = signups.filter(s => s.class_id === class_id);
      if (status) signups = signups.filter(s => s.status === status);
      if (keyword) {
        signups = signups.filter(s => 
          s.name?.includes(keyword) || s.phone?.includes(keyword)
        );
      }
      total = signups.length;
      const start = (parseInt(page) - 1) * parseInt(limit);
      signups = signups.slice(start, start + parseInt(limit));
    }

    // 统计各班次人数
    const classStats = {};
    signups.forEach(s => {
      const className = s.class_name || '未分类';
      classStats[className] = (classStats[className] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        list: signups,
        total: total || signups.length,
        page: parseInt(page),
        limit: parseInt(limit),
        class_stats: classStats
      }
    });
  } catch (error) {
    console.error('获取报名列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

// 提交报名（学员）
router.post('/:id/signups', async (req, res) => {
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

    if (!promotion.enable_signup) {
      return res.status(400).json({ success: false, message: '该文案未开启报名' });
    }

    // 检查报名截止时间
    if (promotion.signup_config?.deadline) {
      if (new Date() > new Date(promotion.signup_config.deadline)) {
        return res.status(400).json({ success: false, message: '报名已截止' });
      }
    }

    const { name, unit, phone, class_id } = req.body;

    if (!name || !phone || !class_id) {
      return res.status(400).json({ success: false, message: '姓名、手机号和报名班次为必填项' });
    }

    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: '手机号格式不正确' });
    }

    // 检查是否已报名（同一手机号）
    let existingSignup;
    if (mysqlDb.isConnected()) {
      const { query } = require('../db-mysql');
      const rows = await query(
        'SELECT * FROM promotion_signups WHERE promotion_id = ? AND phone = ?',
        [req.params.id, phone]
      );
      existingSignup = rows[0];
    } else {
      const signups = db.promotionSignups.findAll({ promotion_id: parseInt(req.params.id) });
      existingSignup = signups.find(s => s.phone === phone);
    }

    if (existingSignup) {
      return res.status(400).json({ success: false, message: '该手机号已报名，无需重复报名' });
    }

    // 检查班次是否存在
    const selectedClass = promotion.signup_config?.classes?.find(c => c.id === class_id);
    if (!selectedClass) {
      return res.status(400).json({ success: false, message: '所选班次不存在' });
    }

    // 检查班次名额
    if (selectedClass.max_count) {
      let currentCount;
      if (mysqlDb.isConnected()) {
        const { query } = require('../db-mysql');
        const rows = await query(
          'SELECT COUNT(*) as count FROM promotion_signups WHERE promotion_id = ? AND class_id = ? AND status != ?',
          [req.params.id, class_id, 'rejected']
        );
        currentCount = rows[0]?.count || 0;
      } else {
        const signups = db.promotionSignups.findAll({ promotion_id: parseInt(req.params.id), class_id });
        currentCount = signups.filter(s => s.status !== 'rejected').length;
      }

      if (currentCount >= selectedClass.max_count) {
        return res.status(400).json({ success: false, message: '该班次名额已满' });
      }
    }

    const signupData = {
      promotion_id: parseInt(req.params.id),
      name: name.trim(),
      unit: unit?.trim() || '',
      phone: phone.trim(),
      class_id: class_id,
      class_name: selectedClass.name,
      status: promotion.signup_config?.require_approval ? 'pending' : 'approved',
      source: 'online',
      created_at: new Date().toISOString()
    };

    let signup;
    if (mysqlDb.isConnected()) {
      signup = await mysqlDb.createPromotionSignup(signupData);
    } else {
      signup = db.promotionSignups.create(signupData);
    }

    res.json({ 
      success: true, 
      message: promotion.signup_config?.require_approval ? '报名提交成功，等待审核' : '报名成功',
      data: signup 
    });
  } catch (error) {
    console.error('报名错误:', error);
    res.status(500).json({ success: false, message: '报名失败' });
  }
});

// 手动添加报名（创建者）
router.post('/:id/signups/manual', authenticate, async (req, res) => {
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
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { name, unit, phone, class_id } = req.body;

    if (!name || !phone || !class_id) {
      return res.status(400).json({ success: false, message: '姓名、手机号和报名班次为必填项' });
    }

    const selectedClass = promotion.signup_config?.classes?.find(c => c.id === class_id);
    if (!selectedClass) {
      return res.status(400).json({ success: false, message: '所选班次不存在' });
    }

    const signupData = {
      promotion_id: parseInt(req.params.id),
      name: name.trim(),
      unit: unit?.trim() || '',
      phone: phone.trim(),
      class_id: class_id,
      class_name: selectedClass.name,
      status: 'approved', // 手动添加直接通过
      source: 'manual',
      created_at: new Date().toISOString()
    };

    let signup;
    if (mysqlDb.isConnected()) {
      signup = await mysqlDb.createPromotionSignup(signupData);
    } else {
      signup = db.promotionSignups.create(signupData);
    }

    res.json({ success: true, message: '添加成功', data: signup });
  } catch (error) {
    console.error('手动添加报名错误:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

// 修改报名信息
router.put('/:id/signups/:signupId', authenticate, async (req, res) => {
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
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { name, unit, phone, class_id, class_name } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (unit !== undefined) updates.unit = unit?.trim() || '';
    if (phone !== undefined) updates.phone = phone.trim();
    if (class_id !== undefined) updates.class_id = class_id;
    if (class_name !== undefined) updates.class_name = class_name;
    updates.updated_at = new Date().toISOString();

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.updatePromotionSignup(req.params.signupId, updates);
    } else {
      updated = db.promotionSignups.update(req.params.signupId, updates);
    }

    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新报名信息错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除报名
router.delete('/:id/signups/:signupId', authenticate, async (req, res) => {
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
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (mysqlDb.isConnected()) {
      await mysqlDb.deletePromotionSignup(req.params.signupId);
    } else {
      db.promotionSignups.delete(req.params.signupId);
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除报名错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 审核报名
router.patch('/:id/signups/:signupId/status', authenticate, async (req, res) => {
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
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态' });
    }

    const updates = {
      status: status,
      updated_at: new Date().toISOString()
    };

    let updated;
    if (mysqlDb.isConnected()) {
      updated = await mysqlDb.updatePromotionSignup(req.params.signupId, updates);
    } else {
      updated = db.promotionSignups.update(req.params.signupId, updates);
    }

    const statusText = { approved: '通过', rejected: '拒绝', pending: '设为待审核' };
    res.json({ success: true, message: `审核${statusText[status]}成功`, data: updated });
  } catch (error) {
    console.error('审核报名错误:', error);
    res.status(500).json({ success: false, message: '审核失败' });
  }
});

// 导出报名Excel
router.get('/:id/signups/export', authenticate, async (req, res) => {
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
      return res.status(403).json({ success: false, message: '无权限' });
    }

    let signups = [];
    if (mysqlDb.isConnected()) {
      const { query } = require('../db-mysql');
      signups = await query(
        'SELECT * FROM promotion_signups WHERE promotion_id = ? ORDER BY created_at DESC',
        [req.params.id]
      );
    } else {
      signups = db.promotionSignups.findAll({ promotion_id: parseInt(req.params.id) });
    }

    // 准备Excel数据
    const data = signups.map((s, index) => ({
      '序号': index + 1,
      '姓名': s.name,
      '单位': s.unit || '-',
      '手机号': s.phone,
      '报名班次': s.class_name || '-',
      '报名时间': new Date(s.created_at).toLocaleString('zh-CN'),
      '状态': s.status === 'approved' ? '已通过' : s.status === 'rejected' ? '已拒绝' : '待审核',
      '来源': s.source === 'online' ? '在线报名' : '手动添加'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '报名名单');

    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 12 },  // 姓名
      { wch: 20 },  // 单位
      { wch: 15 },  // 手机号
      { wch: 15 },  // 报名班次
      { wch: 20 },  // 报名时间
      { wch: 10 },  // 状态
      { wch: 10 }   // 来源
    ];

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=报名名单-${promotion.title}-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('导出报名Excel错误:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

module.exports = router;
