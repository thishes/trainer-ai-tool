// server/routes/announcements.js - 公告管理路由 (MySQL优先)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const mysqlDb = require('../db-mysql');
const config = require('../config');
const authenticate = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '.webp');
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 JPG、PNG、GIF、WebP 格式的图片'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const processImage = async (file) => {
  const webpFilename = file.filename;
  console.log('File uploaded:', webpFilename);
  return webpFilename;
};

const handleUpload = [
  authenticate,
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择图片文件' });
    }

    const webpFilename = await processImage(req.file);
    const fileUrl = `/uploads/${webpFilename}`;
    res.json({ success: true, url: fileUrl });
  }
];

router.post('/upload', upload.single('image'), ...handleUpload);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let announcements;

    if (mysqlDb.isConnected()) {
      try {
        announcements = await mysqlDb.getAnnouncements(status);
      } catch (e) {
        announcements = await db.getAnnouncements(status);
      }
    } else {
      announcements = await db.getAnnouncements(status);
    }

    res.json({ success: true, data: { list: announcements, total: announcements.length } });
  } catch (error) {
    console.error('获取公告错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    let announcement;

    if (mysqlDb.isConnected()) {
      try {
        announcement = await mysqlDb.getAnnouncementById(req.params.id);
      } catch (e) {
        announcement = await db.getAnnouncementById(req.params.id);
      }
    } else {
      announcement = await db.getAnnouncementById(req.params.id);
    }

    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }
    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('获取公告错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { title, content, importance, status } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    let announcement;
    if (mysqlDb.isConnected()) {
      try {
        announcement = await mysqlDb.createAnnouncement({
          title,
          content: content || '',
          importance: importance || 'normal',
          status: status || 'published',
          author_id: req.user.id
        });
      } catch (e) {
        announcement = await db.createAnnouncement({
          title,
          content: content || '',
          importance: importance || 'normal',
          status: status || 'published',
          author_id: req.user.id
        });
      }
    } else {
      announcement = await db.createAnnouncement({
        title,
        content: content || '',
        importance: importance || 'normal',
        status: status || 'published',
        author_id: req.user.id
      });
    }

    res.json({ success: true, message: '创建成功', data: announcement });
  } catch (error) {
    console.error('创建公告错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    let announcement;
    if (mysqlDb.isConnected()) {
      try {
        announcement = await mysqlDb.getAnnouncementById(req.params.id);
      } catch (e) {
        announcement = await db.getAnnouncementById(req.params.id);
      }
    } else {
      announcement = await db.getAnnouncementById(req.params.id);
    }

    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }

    const { title, content, importance, status } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (importance !== undefined) updates.importance = importance;
    if (status !== undefined) updates.status = status;

    let updated;
    if (mysqlDb.isConnected()) {
      try {
        updated = await mysqlDb.updateAnnouncement(req.params.id, updates);
      } catch (e) {
        updated = await db.updateAnnouncement(req.params.id, updates);
      }
    } else {
      updated = await db.updateAnnouncement(req.params.id, updates);
    }

    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新公告错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    let announcement;
    if (mysqlDb.isConnected()) {
      try {
        announcement = await mysqlDb.getAnnouncementById(req.params.id);
      } catch (e) {
        announcement = await db.getAnnouncementById(req.params.id);
      }
    } else {
      announcement = await db.getAnnouncementById(req.params.id);
    }

    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }

    if (mysqlDb.isConnected()) {
      try {
        await mysqlDb.deleteAnnouncement(req.params.id);
      } catch (e) {
        await db.deleteAnnouncement(req.params.id);
      }
    } else {
      await db.deleteAnnouncement(req.params.id);
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除公告错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

module.exports = router;
