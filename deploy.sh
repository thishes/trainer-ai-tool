#!/bin/bash

# 培训师AI工具 - 一键部署脚本

echo "========================================="
echo "   培训师AI工具 - 一键部署"
echo "========================================="

# 1. 创建项目目录
mkdir -p ~/trainer-ai-tool
cd ~/trainer-ai-tool

# 2. 创建必要文件
cat > package.json << 'PKGEOF'
{
  "name": "trainer-ai-tool",
  "version": "1.0.0",
  "description": "培训师AI测试工具",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "better-sqlite3": "^9.2.2",
    "uuid": "^9.0.1"
  }
}
PKGEOF

mkdir -p server/routes server/middleware server/models

# 3. 创建后端入口
cat > server/index.js << 'SVREOF'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务 - 前端
app.use(express.static(path.join(__dirname, '../client/public')));

// API路由
const authRouter = require('./routes/auth');
const questionsRouter = require('./routes/questions');
const papersRouter = require('./routes/papers');
const examRouter = require('./routes/exam');

app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/papers', papersRouter);
app.use('/api/exam', examRouter);

// 初始化数据库
const Database = require('better-sqlite3');
const db = new Database('exam.db');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    type TEXT,
    content TEXT,
    options TEXT,
    answer TEXT,
    explanation TEXT,
    difficulty TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    time_limit INTEGER,
    password TEXT,
    random_order INTEGER,
    published INTEGER DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS paper_questions (
    id TEXT PRIMARY KEY,
    paper_id TEXT,
    question_id TEXT,
    order_num INTEGER,
    FOREIGN KEY (paper_id) REFERENCES papers(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
  
  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    paper_id TEXT,
    student_name TEXT,
    start_time DATETIME,
    end_time DATETIME,
    score REAL,
    status TEXT DEFAULT 'in_progress',
    answers TEXT,
    FOREIGN KEY (paper_id) REFERENCES papers(id)
  );
`);

// 预设管理员账号
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(uuidv4(), 'admin', hashedPassword, 'admin');
  console.log('默认管理员账号: admin / admin123');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});
SVREOF

# 4. 创建路由文件
cat > server/routes/auth.js << 'AUTHEOF'
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const db = new Database('../../exam.db');

router.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  try {
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(id, username, hashedPassword, role || 'student');
    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    res.status(400).json({ success: false, message: '用户名已存在' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (user && bcrypt.compareSync(password, user.password)) {
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

module.exports = router;
AUTHEOF

cat > server/routes/questions.js << 'QUESEOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const db = new Database('../../exam.db');

router.get('/', (req, res) => {
  const questions = db.prepare('SELECT * FROM questions ORDER BY created_at DESC').all();
  res.json(questions);
});

router.post('/', (req, res) => {
  const { type, content, options, answer, explanation, difficulty, category } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO questions (id, type, content, options, answer, explanation, difficulty, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, type, content, JSON.stringify(options), answer, explanation, difficulty, category);
  res.json({ success: true, id });
});

router.put('/:id', (req, res) => {
  const { type, content, options, answer, explanation, difficulty, category } = req.body;
  db.prepare('UPDATE questions SET type=?, content=?, options=?, answer=?, explanation=?, difficulty=?, category=? WHERE id=?').run(type, content, JSON.stringify(options), answer, explanation, difficulty, category, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
QUESEOF

cat > server/routes/papers.js << 'PAPEREOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const db = new Database('../../exam.db');

router.get('/', (req, res) => {
  const papers = db.prepare('SELECT * FROM papers ORDER BY created_at DESC').all();
  res.json(papers);
});

router.post('/', (req, res) => {
  const { title, description, time_limit, password, random_order } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO papers (id, title, description, time_limit, password, random_order) VALUES (?, ?, ?, ?, ?, ?)').run(id, title, description, time_limit || 60, password || '', random_order ? 1 : 0);
  res.json({ success: true, id });
});

router.put('/:id', (req, res) => {
  const { title, description, time_limit, password, random_order, published } = req.body;
  db.prepare('UPDATE papers SET title=?, description=?, time_limit=?, password=?, random_order=?, published=? WHERE id=?').run(title, description, time_limit, password, random_order ? 1 : 0, published ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM papers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/publish', (req, res) => {
  db.prepare('UPDATE papers SET published = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/:id/questions', (req, res) => {
  const questions = db.prepare('SELECT q.* FROM questions q JOIN paper_questions pq ON q.id = pq.question_id WHERE pq.paper_id = ? ORDER BY pq.order_num').all(req.params.id);
  res.json(questions);
});

router.post('/:id/questions', (req, res) => {
  const { questionIds } = req.body;
  questionIds.forEach((qid, idx) => {
    db.prepare('INSERT INTO paper_questions (id, paper_id, question_id, order_num) VALUES (?, ?, ?, ?)').run(uuidv4(), req.params.id, qid, idx);
  });
  res.json({ success: true });
});

module.exports = router;
PAPEREOF

cat > server/routes/exam.js << 'EXAMEOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const db = new Database('../../exam.db');

router.post('/start', (req, res) => {
  const { paper_id, student_name, password } = req.body;
  const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paper_id);
  if (!paper) return res.status(404).json({ success: false, message: '试卷不存在' });
  if (paper.published !== 1) return res.status(400).json({ success: false, message: '试卷未发布' });
  if (paper.password && paper.password !== password) return res.status(400).json({ success: false, message: '密码错误' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO exams (id, paper_id, student_name, start_time) VALUES (?, ?, ?, datetime("now"))').run(id, paper_id, student_name);
  res.json({ success: true, examId: id, timeLimit: paper.time_limit });
});

router.get('/:id/questions', (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ success: false, message: '考试不存在' });
  
  let questions = db.prepare('SELECT q.id, q.type, q.content, q.options FROM questions q JOIN paper_questions pq ON q.id = pq.question_id WHERE pq.paper_id = ? ORDER BY pq.order_num').all(exam.paper_id);
  
  const paper = db.prepare('SELECT random_order FROM papers WHERE id = ?').get(exam.paper_id);
  if (paper.random_order) {
    questions = questions.sort(() => Math.random() - 0.5);
  }
  
  questions = questions.map(q => ({ ...q, options: JSON.parse(q.options || '[]') }));
  res.json(questions);
});

router.post('/submit', (req, res) => {
  const { exam_id, answers } = req.body;
  const exam = db.prepare('SELECT e.*, p.questions FROM exams e JOIN papers p ON e.paper_id = p.id WHERE e.id = ?').get(exam_id);
  
  let score = 0;
  const questions = db.prepare('SELECT id, answer FROM questions').all();
  const questionMap = {};
  questions.forEach(q => questionMap[q.id] = q.answer);
  
  Object.entries(answers).forEach(([qid, answer]) => {
    if (questionMap[qid] === answer) score += 10;
  });
  
  const total = Object.keys(answers).length * 10;
  score = Math.round((score / total) * 100);
  
  db.prepare('UPDATE exams SET score = ?, status = "completed", answers = ?, end_time = datetime("now") WHERE id = ?').run(score, JSON.stringify(answers), exam_id);
  res.json({ success: true, score });
});

router.get('/:id/result', (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  res.json(exam);
});

router.get('/records/:paperId', (req, res) => {
  const records = db.prepare('SELECT * FROM exams WHERE paper_id = ? AND status = "completed" ORDER BY end_time DESC').all(req.params.paperId);
  res.json(records);
});

module.exports = router;
EXAMEOF

# 5. 创建前端
mkdir -p client/public client/src/views client/src/api

cat > client/public/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>培训师AI工具</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://unpkg.com/element-plus"></script>
  <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center; }
    .card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #409eff; color: #fff; }
    .btn-success { background: #67c23a; color: #fff; }
    .btn-danger { background: #f56c6c; color: #fff; }
    .question { padding: 15px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 15px; }
    .option { padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; }
    .option:hover { background: #f5f7fa; }
    .option.selected { background: #e6f7ff; border-color: #409eff; }
    .login-box { max-width: 400px; margin: 100px auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    input, select { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="app">
    <!-- 登录页 -->
    <div v-if="!isLoggedIn" class="login-box">
      <h2 style="text-align:center;margin-bottom:30px;">培训师AI工具</h2>
      <input v-model="loginForm.username" placeholder="用户名" @keyup.enter="login">
      <input v-model="loginForm.password" type="password" placeholder="密码" @keyup.enter="login">
      <button class="btn btn-primary" style="width:100%;margin-top:20px;" @click="login">登录</button>
      <p style="text-align:center;margin-top:20px;">
        <a href="#" @click.prevent="showRegister=true">注册账号</a>
      </p>
    </div>

    <!-- 注册弹窗 -->
    <div v-if="showRegister" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;padding:30px;border-radius:12px;width:350px;">
        <h3>注册账号</h3>
        <input v-model="registerForm.username" placeholder="用户名">
        <input v-model="registerForm.password" type="password" placeholder="密码">
        <select v-model="registerForm.role">
          <option value="student">学员</option>
          <option value="teacher">教师</option>
        </select>
        <div style="margin-top:20px;display:flex;gap:10px;">
          <button class="btn btn-primary" @click="register">注册</button>
          <button class="btn" @click="showRegister=false">取消</button>
        </div>
      </div>
    </div>

    <!-- 首页 -->
    <div v-else class="container">
      <div class="header">
        <h2>培训师AI工具</h2>
        <div>
          <span>欢迎, {{ user.username }}</span>
          <button class="btn" style="margin-left:15px;" @click="logout">退出</button>
        </div>
      </div>

      <!-- 教师功能 -->
      <div v-if="user.role === 'teacher'">
        <div style="display:flex;gap:15px;margin-bottom:20px;">
          <button class="btn btn-primary" @click="currentView='questions'">题库管理</button>
          <button class="btn btn-primary" @click="currentView='papers'">试卷管理</button>
          <button class="btn btn-primary" @click="currentView='records'">成绩管理</button>
        </div>

        <!-- 题库管理 -->
        <div v-if="currentView === 'questions'">
          <div class="card">
            <h3>添加题目</h3>
            <select v-model="newQuestion.type">
              <option value="single">单选题</option>
              <option value="multi">多选题</option>
              <option value="judge">判断题</option>
            </select>
            <input v-model="newQuestion.content" placeholder="题目内容">
            <input v-model="newQuestion.optionsText" placeholder="选项（每行一个）" rows="4" style="resize:vertical;">
            <input v-model="newQuestion.answer" placeholder="正确答案">
            <input v-model="newQuestion.difficulty" placeholder="难度（easy/medium/hard）">
            <button class="btn btn-primary" @click="addQuestion">添加</button>
          </div>
          <div class="card">
            <h3>题目列表</h3>
            <div v-for="q in questions" :key="q.id" class="question">
              <p><strong>{{ q.type }}</strong> - {{ q.content }}</p>
              <button class="btn btn-danger" style="padding:5px 10px;font-size:12px;" @click="deleteQuestion(q.id)">删除</button>
            </div>
          </div>
        </div>

        <!-- 试卷管理 -->
        <div v-if="currentView === 'papers'">
          <div class="card">
            <h3>创建试卷</h3>
            <input v-model="newPaper.title" placeholder="试卷标题">
            <input v-model="newPaper.description" placeholder="试卷描述">
            <input v-model.number="newPaper.time_limit" type="number" placeholder="时间限制（分钟）">
            <input v-model="newPaper.password" placeholder="访问密码（可选）">
            <label><input type="checkbox" v-model="newPaper.random_order"> 随机顺序</label>
            <div style="margin-top:15px;">
              <button class="btn btn-primary" @click="createPaper">创建</button>
            </div>
          </div>
          <div class="card">
            <h3>试卷列表</h3>
            <div v-for="p in papers" :key="p.id" class="question">
              <p><strong>{{ p.title }}</strong> - {{ p.description }}</p>
              <p>时间: {{ p.time_limit }}分钟 | {{ p.published ? '已发布' : '未发布' }}</p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-success" style="padding:5px 10px;font-size:12px;" @click="publishPaper(p.id)" v-if="!p.published">发布</button>
                <button class="btn btn-primary" style="padding:5px 10px;font-size:12px;" @click="copyLink(p.id)">复制链接</button>
                <button class="btn btn-danger" style="padding:5px 10px;font-size:12px;" @click="deletePaper(p.id)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 成绩管理 -->
        <div v-if="currentView === 'records'">
          <div class="card">
            <h3>成绩列表</h3>
            <div v-for="r in records" :key="r.id" class="question">
              <p><strong>{{ r.student_name }}</strong> - 分数: {{ r.score }}分</p>
              <p>交卷时间: {{ r.end_time }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 学员考试入口 -->
      <div v-if="user.role === 'student'">
        <div class="card">
          <h3>开始考试</h3>
          <input v-model="examInput.paperId" placeholder="请输入试卷ID">
          <input v-model="examInput.name" placeholder="请输入姓名">
          <input v-model="examInput.password" placeholder="试卷密码（如有）">
          <button class="btn btn-primary" @click="startExam">开始考试</button>
        </div>
      </div>

      <!-- 考试页面 -->
      <div v-if="currentView === 'exam' && examQuestions.length" class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3>考试中 - 剩余时间: {{ timeLeft }}分钟</h3>
          <button class="btn btn-success" @click="submitExam">交卷</button>
        </div>
        <div v-for="(q, idx) in examQuestions" :key="q.id" class="question">
          <p><strong>{{ idx+1 }}.</strong> {{ q.content }}</p>
          <div v-if="q.type === 'single' || q.type === 'judge'">
            <div v-for="opt in q.options" :key="opt" class="option" :class="{selected: answers[q.id] === opt}" @click="answers[q.id] = opt">
              {{ opt }}
            </div>
          </div>
          <div v-if="q.type === 'multi'">
            <div v-for="opt in q.options" :key="opt" class="option" :class="{selected: (answers[q.id]||[]).includes(opt)}" @click="toggleMulti(q.id, opt)">
              {{ opt }}
            </div>
          </div>
        </div>
        <button class="btn btn-success" @click="submitExam">提交试卷</button>
      </div>

      <!-- 成绩展示 -->
      <div v-if="currentView === 'result'" class="card" style="text-align:center;padding:50px;">
        <h2>考试完成！</h2>
        <p style="font-size:48px;color:#67c23a;margin:30px 0;">{{ examResult }}分</p>
        <button class="btn btn-primary" @click="currentView='';examId='';">返回</button>
      </div>
    </div>
  </div>

  <script>
    const { createApp, ref, onMounted } = Vue;
    const API = 'http://localhost:3000/api';

    createApp({
      setup() {
        const isLoggedIn = ref(false);
        const user = ref({});
        const currentView = ref('');
        const showRegister = ref(false);
        const loginForm = ref({ username: '', password: '' });
        const registerForm = ref({ username: '', password: '', role: 'student' });
        const questions = ref([]);
        const papers = ref([]);
        const records = ref([]);
        const newQuestion = ref({ type: 'single', content: '', optionsText: '', answer: '', difficulty: 'medium' });
        const newPaper = ref({ title: '', description: '', time_limit: 60, password: '', random_order: false });
        const examInput = ref({ paperId: '', name: '', password: '' });
        const examId = ref('');
        const examQuestions = ref([]);
        const answers = ref({});
        const timeLeft = ref(0);
        const examResult = ref(0);

        const login = async () => {
          const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginForm.value)
          });
          const data = await res.json();
          if (data.success) {
            user.value = data.user;
            isLoggedIn.value = true;
            localStorage.user = JSON.stringify(data.user);
            loadQuestions();
            loadPapers();
          } else {
            alert(data.message);
          }
        };

        const register = async () => {
          const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerForm.value)
          });
          const data = await res.json();
          if (data.success) {
            showRegister.value = false;
            alert('注册成功，请登录');
          } else {
            alert(data.message);
          }
        };

        const logout = () => {
          isLoggedIn.value = false;
          user.value = {};
          localStorage.removeItem('user');
        };

        const loadQuestions = async () => {
          const res = await fetch(`${API}/questions`);
          questions.value = await res.json();
        };

        const addQuestion = async () => {
          const options = newQuestion.value.optionsText.split('\n').filter(o => o.trim());
          await fetch(`${API}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newQuestion.value, options })
          });
          newQuestion.value = { type: 'single', content: '', optionsText: '', answer: '', difficulty: 'medium' };
          loadQuestions();
        };

        const deleteQuestion = async (id) => {
          await fetch(`${API}/questions/${id}`, { method: 'DELETE' });
          loadQuestions();
        };

        const loadPapers = async () => {
          const res = await fetch(`${API}/papers`);
          papers.value = await res.json();
        };

        const createPaper = async () => {
          await fetch(`${API}/papers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPaper.value)
          });
          newPaper.value = { title: '', description: '', time_limit: 60, password: '', random_order: false };
          loadPapers();
        };

        const publishPaper = async (id) => {
          await fetch(`${API}/papers/${id}/publish`, { method: 'POST' });
          loadPapers();
        };

        const deletePaper = async (id) => {
          await fetch(`${API}/papers/${id}`, { method: 'DELETE' });
          loadPapers();
        };

        const copyLink = (id) => {
          const link = `${window.location.origin}/exam.html?paper=${id}`;
          navigator.clipboard.writeText(link);
          alert('链接已复制: ' + link);
        };

        const startExam = async () => {
          const res = await fetch(`${API}/exam/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paper_id: examInput.value.paperId, student_name: examInput.value.name, password: examInput.value.password })
          });
          const data = await res.json();
          if (data.success) {
            examId.value = data.examId;
            timeLeft.value = data.timeLimit;
            const qRes = await fetch(`${API}/exam/${data.examId}/questions`);
            examQuestions.value = await qRes.json();
            currentView.value = 'exam';
            const timer = setInterval(() => {
              timeLeft.value--;
              if (timeLeft.value <= 0) submitExam();
            }, 60000);
          } else {
            alert(data.message);
          }
        };

        const toggleMulti = (qid, opt) => {
          if (!answers.value[qid]) answers.value[qid] = [];
          const idx = answers.value[qid].indexOf(opt);
          if (idx >= 0) answers.value[qid].splice(idx, 1);
          else answers.value[qid].push(opt);
        };

        const submitExam = async () => {
          const res = await fetch(`${API}/exam/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exam_id: examId.value, answers: answers.value })
          });
          const data = await res.json();
          examResult.value = data.score;
          currentView.value = 'result';
        };

        onMounted(() => {
          const saved = localStorage.user;
          if (saved) {
            user.value = JSON.parse(saved);
            isLoggedIn.value = true;
            loadQuestions();
            loadPapers();
          }
        });

        return { isLoggedIn, user, currentView, showRegister, loginForm, registerForm, login, register, logout, questions, papers, records, newQuestion, newPaper, examInput, examQuestions, answers, timeLeft, examResult, addQuestion, deleteQuestion, createPaper, publishPaper, deletePaper, copyLink, startExam, toggleMulti, submitExam };
      }
    }).mount('#app');
  </script>
</body>
</html>
HTMLEOF

# 5. 安装依赖并启动
echo ""
echo "正在安装依赖..."
npm install

echo ""
echo "========================================="
echo "   启动中..."
echo "========================================="
node server/index.js
