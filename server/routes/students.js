const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const db = require('../db');
const authenticate = require('../middleware/auth');

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    const students = db.students.findAll();
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('获取考生列表错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    const student = db.students.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: '考生不存在' });
    }
    res.json({ success: true, data: student });
  } catch (error) {
    console.error('获取考生信息错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '考生姓名不能为空' });
    }

    const student = db.students.create({
      name: name.trim(),
      phone: phone ? phone.trim() : null
    });

    res.json({ success: true, message: '添加成功', data: student });
  } catch (error) {
    console.error('创建考生错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const student = db.students.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: '考生不存在' });
    }

    const { name, phone } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: '考生姓名不能为空' });
    }

    const updated = db.students.update(req.params.id, {
      name: name !== undefined ? name.trim() : student.name,
      phone: phone !== undefined ? (phone ? phone.trim() : null) : student.phone
    });

    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新考生错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const student = db.students.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: '考生不存在' });
    }

    db.students.delete(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除考生错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

router.post('/import', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return res.status(400).json({ success: false, message: '只支持Excel文件(.xlsx, .xls)' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel文件为空' });
    }

    const students = [];
    const errors = [];

    data.forEach((row, index) => {
      const name = row['考生姓名'] || row['姓名'] || row['name'];
      const phone = row['考生手机'] || row['手机'] || row['phone'] || null;

      if (!name || !String(name).trim()) {
        errors.push(`第${index + 2}行: 考生姓名不能为空`);
        return;
      }

      students.push({
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null
      });
    });

    if (students.length === 0) {
      return res.status(400).json({ success: false, message: '没有有效的考生数据', errors });
    }

    const created = db.students.bulkCreate(students);

    res.json({
      success: true,
      message: `成功导入${created.length}名考生`,
      data: { imported: created.length, errors: errors.length > 0 ? errors : undefined }
    });
  } catch (error) {
    console.error('导入考生错误:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
});

router.get('/paper/:paperId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const paperStudents = db.paperStudents.findByPaperId(req.params.paperId);
    res.json({ success: true, data: paperStudents });
  } catch (error) {
    console.error('获取试卷考生错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/paper/:paperId/export', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const paper = db.papers.findById(req.params.paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    const paperStudents = db.paperStudents.findByPaperId(req.params.paperId);
    const data = paperStudents.map(ps => ({
      '考生号': ps.student ? ps.student.student_no : '',
      '考生姓名': ps.student ? ps.student.name : '',
      '考生手机': ps.student ? (ps.student.phone || '') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '考生名单');
    const fileName = `${paper.title}_考生名单.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  } catch (error) {
    console.error('导出考生错误:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

router.post('/paper/:paperId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const paper = db.papers.findById(req.params.paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    const { student_ids } = req.body;

    if (!Array.isArray(student_ids)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    const validStudentIds = student_ids.filter(id => db.students.findById(id)).map(id => parseInt(id));
    const created = db.paperStudents.bulkCreate(req.params.paperId, validStudentIds);

    res.json({ success: true, message: `成功添加${created.length}名考生`, data: created });
  } catch (error) {
    console.error('添加试卷考生错误:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

router.delete('/paper/:paperId/:studentId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    db.paperStudents.deleteByPaperIdAndStudentId(req.params.paperId, req.params.studentId);
    res.json({ success: true, message: '移除成功' });
  } catch (error) {
    console.error('移除试卷考生错误:', error);
    res.status(500).json({ success: false, message: '移除失败' });
  }
});

router.delete('/paper/:paperId/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    db.paperStudents.deleteByPaperId(req.params.paperId);
    res.json({ success: true, message: '清空成功' });
  } catch (error) {
    console.error('清空试卷考生错误:', error);
    res.status(500).json({ success: false, message: '清空失败' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { paper_id, student_no, name } = req.body;

    if (!paper_id || !name) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    const paper = db.papers.findById(paper_id);
    if (!paper) {
      return res.status(404).json({ success: false, message: '试卷不存在' });
    }

    if (!paper.allow_all_users) {
      const paperStudents = db.paperStudents.findByPaperId(paper_id);
      const student = paperStudents.find(ps => ps.student && ps.student.name === name);

      if (!student) {
        return res.status(403).json({ success: false, message: '您不在允许参加考试的名单中' });
      }

      return res.json({ success: true, message: '验证成功', data: { student_id: student.student_id } });
    }

    res.json({ success: true, message: '验证成功' });
  } catch (error) {
    console.error('验证考生错误:', error);
    res.status(500).json({ success: false, message: '验证失败' });
  }
});

module.exports = router;