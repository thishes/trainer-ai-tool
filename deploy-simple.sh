#!/bin/bash
set -e
mkdir -p ~/trainer-ai-tool && cd ~/trainer-ai-tool

# 1. package.json
cat > package.json << 'EOF'
{"name":"trainer-ai-tool","version":"1.0.0","dependencies":{"express":"^4.18.2","cors":"^2.8.5","body-parser":"^1.20.2","better-sqlite3":"^9.2.2","uuid":"^9.0.1"}}
EOF

# 2. 后端
mkdir -p server/routes
cat > server/index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database('exam.db');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/public')));

db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,username TEXT UNIQUE,password TEXT,role TEXT DEFAULT 'student');
CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY,type TEXT,content TEXT,options TEXT,answer TEXT,difficulty TEXT);
CREATE TABLE IF NOT EXISTS papers (id TEXT PRIMARY KEY,title TEXT,description TEXT,time_limit INTEGER,password TEXT,random_order INTEGER,published INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS paper_questions (id TEXT PRIMARY KEY,paper_id TEXT,question_id TEXT,order_num INTEGER);
CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY,paper_id TEXT,student_name TEXT,start_time DATETIME,score REAL,status TEXT DEFAULT 'in_progress',answers TEXT);`);

const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!admin) db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(uuidv4(), 'admin', 'admin123', 'admin');

app.post('/api/auth/register', (req, res) => { try { db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(uuidv4(), req.body.username, req.body.password, req.body.role || 'student'); res.json({ success: true }); } catch { res.status(400).json({ success: false, message: '用户名已存在' }); } });
app.post('/api/auth/login', (req, res) => { const u = db.prepare('SELECT * FROM users WHERE username = ?').get(req.body.username); if (u && u.password === req.body.password) res.json({ success: true, user: { id: u.id, username: u.username, role: u.role } }); else res.status(401).json({ success: false }); });
app.get('/api/questions', (req, res) => res.json(db.prepare('SELECT * FROM questions').all()));
app.post('/api/questions', (req, res) => { const id = uuidv4(); db.prepare('INSERT INTO questions (id, type, content, options, answer, difficulty) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.body.type, req.body.content, JSON.stringify(req.body.options||[]), req.body.answer, req.body.difficulty); res.json({ success: true, id }); });
app.delete('/api/questions/:id', (req, res) => { db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id); res.json({ success: true }); });
app.get('/api/papers', (req, res) => res.json(db.prepare('SELECT * FROM papers').all()));
app.post('/api/papers', (req, res) => { const id = uuidv4(); db.prepare('INSERT INTO papers (id, title, description, time_limit, password, random_order) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.body.title, req.body.description, req.body.time_limit||60, req.body.password||'', req.body.random_order?1:0); res.json({ success: true, id }); });
app.post('/api/papers/:id/publish', (req, res) => { db.prepare('UPDATE papers SET published=1 WHERE id=?').run(req.params.id); res.json({ success: true }); });
app.delete('/api/papers/:id', (req, res) => { db.prepare('DELETE FROM papers WHERE id=?').run(req.params.id); res.json({ success: true }); });
app.post('/api/exam/start', (req, res) => { const p = db.prepare('SELECT * FROM papers WHERE id=?').get(req.body.paper_id); if (!p) return res.status(404).json({success:false}); const id = uuidv4(); db.prepare('INSERT INTO exams (id, paper_id, student_name, start_time) VALUES (?, ?, ?, datetime("now"))').run(id, req.body.paper_id, req.body.student_name); res.json({ success: true, examId: id, timeLimit: p.time_limit }); });
app.get('/api/exam/:id/questions', (req, res) => { const e = db.prepare('SELECT * FROM exams WHERE id=?').get(req.params.id); let qs = db.prepare('SELECT q.id,q.type,q.content,q.options FROM questions q JOIN paper_questions pq ON q.id=pq.question_id WHERE pq.paper_id=?').all(e.paper_id); qs=qs.map(q=>({...q,options:JSON.parse(q.options||'[]')})); res.json(qs); });
app.post('/api/exam/submit', (req, res) => { let sc=0; const qs=db.prepare('SELECT id,answer FROM questions').all(); const am={}; qs.forEach(q=>am[q.id]=q.answer); Object.entries(req.body.answers||{}).forEach(([k,v])=>{if(am[k]===v) sc+=10}); sc=Math.round((sc/((Object.keys(req.body.answers||{}).length)||1))*100)||0; db.prepare('UPDATE exams SET score=?,status="completed",answers=?,end_time=datetime("now") WHERE id=?').run(sc,JSON.stringify(req.body.answers),req.body.exam_id); res.json({success:true,score:sc}); });
app.get('/api/exam/records/:paperId', (req, res) => res.json(db.prepare('SELECT * FROM exams WHERE paper_id=? AND status="completed"').all(req.params.paperId)));

app.listen(PORT, '0.0.0.0', () => console.log(`服务已启动: http://0.0.0.0:${PORT}`));
EOF

# 3. 前端
mkdir -p client/public
cat > client/public/index.html << 'HTMLEOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>培训师AI工具</title><script src="https://unpkg.com/vue@3/dist/vue.global.js"></script><script src="https://unpkg.com/element-plus"></script><link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f7fa}.container{max-width:1200px;margin:0 auto;padding:20px}.header{background:#fff;padding:20px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center}.card{background:#fff;border-radius:8px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}.btn{padding:10px 20px;border:none;border-radius:6px;cursor:pointer;font-size:14px;background:#409eff;color:#fff}.btn-danger{background:#f56c6c}.btn-success{background:#67c23a}.question{padding:15px;border:1px solid #eee;border-radius:6px;margin-bottom:15px}.option{padding:10px;margin:8px 0;border:1px solid #ddd;border-radius:4px;cursor:pointer}.option:hover{background:#f5f7fa}.option.selected{background:#e6f7ff;border-color:#409eff}.login-box{max-width:400px;margin:100px auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)}input,select,textarea{width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:6px;box-sizing:border-box}</style></head><body><div id="app">
<div v-if="!isLoggedIn" class="login-box"><h2 style="text-align:center;margin-bottom:30px">培训师AI工具</h2><input v-model="u" placeholder="用户名" @keyup.enter="l"><input v-model="p" type="password" placeholder="密码" @keyup.enter="l"><button class="btn" style="width:100%;margin-top:20px" @click="l">登录</button><p style="text-align:center;margin-top:20px"><a href="#" @click.prevent="showR=true">注册账号</a></p></div>
<div v-if="showR" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><div style="background:#fff;padding:30px;border-radius:12px;width:350px"><h3>注册</h3><input v-model="ru" placeholder="用户名"><input v-model="rp" type="password" placeholder="密码"><select v-model="rr"><option value="student">学员</option><option value="teacher">教师</option></select><div style="margin-top:20px;display:flex;gap:10px"><button class="btn" @click="reg">注册</button><button class="btn" @click="showR=false">取消</button></div></div></div>
<div v-if="isLoggedIn" class="container"><div class="header"><h2>培训师AI工具</h2><div><span>欢迎 {{user.username}}</span><button class="btn" style="margin-left:15px;background:#666" @click="logout">退出</button></div></div>
<div v-if="user.role==='teacher'"><div style="display:flex;gap:15px;margin-bottom:20px"><button class="btn" @click="v='q'">题库</button><button class="btn" @click="v='p'">试卷</button><button class="btn" @click="v='r'">成绩</button></div>
<div v-if="v==='q'"><div class="card"><h3>添加题目</h3><select v-model="nq.t"><option value="single">单选</option><option value="multi">多选</option><option value="judge">判断</option></select><input v-model="nq.c" placeholder="题目"><textarea v-model="nq.o" placeholder="选项（每行一个）" rows="3"></textarea><input v-model="nq.a" placeholder="正确答案"><input v-model="nq.d" placeholder="难度"><button class="btn" @click="aq">添加</button></div><div class="card"><div v-for="q in qs" :key="q.id" class="question"><p>{{q.type}} - {{q.content}}</p><button class="btn btn-danger" style="padding:5px 10px;font-size:12px" @click="dq(q.id)">删除</button></div></div></div>
<div v-if="v==='p'"><div class="card"><h3>创建试卷</h3><input v-model="np.t" placeholder="标题"><input v-model="np.d" placeholder="描述"><input v-model.number="np.l" type="number" placeholder="时间"><input v-model="np.pw" placeholder="密码"><label><input type="checkbox" v-model="np.r"> 随机</label><button class="btn" style="margin-top:15px" @click="cp">创建</button></div><div class="card"><div v-for="p in ps" :key="p.id" class="question"><p>{{p.title}} - {{p.description}}</p><p>{{p.time_limit}}分钟 | {{p.published?'已发布':'未发布'}}</p><button class="btn btn-success" style="padding:5px 10px;font-size:12px" @click="pub(p.id)" v-if="!p.published">发布</button><button class="btn btn-danger" style="padding:5px 10px;font-size:12px" @click="dp(p.id)">删除</button></div></div></div>
<div v-if="v==='r'"><div class="card"><div v-for="r in rs" :key="r.id" class="question"><p>{{r.student_name}} - {{r.score}}分</p></div></div></div></div>
<div v-if="user.role==='student'"><div class="card"><h3>开始考试</h3><input v-model="ei.pid" placeholder="试卷ID"><input v-model="ei.n" placeholder="姓名"><input v-model="ei.pw" placeholder="密码"><button class="btn" @click="se">开始</button></div></div>
<div v-if="v==='e' && eq.length" class="card"><h3>考试中 <button class="btn btn-success" @click="sub">交卷</button></h3><div v-for="(q,idx) in eq" :key="q.id" class="question"><p>{{idx+1}}. {{q.content}}</p><div v-for="opt in q.options" :key="opt" class="option" :class="{selected:as[q.id]===opt}" @click="as[q.id]=opt">{{opt}}</div></div></div>
<div v-if="v==='res'" class="card" style="text-align:center;padding:50px"><h2>考试完成</h2><p style="font-size:48px;color:#67c23a;margin:30px 0">{{sc}}分</p><button class="btn" @click="v=''">返回</button></div>
</div></div><script>
const{createApp,ref,onMounted}=Vue;const API='http://'+location.host+'/api';
createApp({setup(){
const isLoggedIn=ref(false),user=ref({}),v=ref(''),showR=ref(false),u=ref(''),p=ref(''),ru=ref(''),rp=ref(''),rr=ref('student'),qs=ref([]),ps=ref([]),rs=ref([]),nq=ref({t:'single',c:'',o:'',a:'',d:'medium'}),np=ref({t:'',d:'',l:60,pw:'',r:false}),ei=ref({pid:'',n:'',pw:''}),eq=ref([]),as=ref({}),sc=ref(0);
const l=async()=>{const d=await(await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u.value,password:p.value})})).json();if(d.success){user.value=d.user;isLoggedIn.value=true;if(d.user.role==='teacher'){lq();lp();lr()}}};
const reg=async()=>{await fetch(API+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:ru.value,password:rp.value,role:rr.value})});showR.value=false};
const logout=()=>{isLoggedIn.value=false;user.value={}};
const lq=()=>fetch(API+'/questions').then(r=>r.json()).then(d=>qs.value=d);
const lp=()=>fetch(API+'/papers').then(r=>r.json()).then(d=>ps.value=d.map(p=>({id:p.id,title:p.title,description:p.description,time_limit:p.time_limit,published:p.published})));
const lr=()=>{if(ps.value[0])rs.value=fetch(API+'/exam/records/'+ps.value[0].id).then(r=>r.json()).then(d=>d)};
const aq=async()=>{await fetch(API+'/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:nq.value.t,content:nq.value.c,options:nq.value.o.split('\n').filter(x=>x.trim()),answer:nq.value.a,difficulty:nq.value.d})});lq()};
const dq=async(id)=>{await fetch(API+'/questions/'+id,{method:'DELETE'});lq()};
const cp=async()=>{await fetch(API+'/papers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:np.value.t,description:np.value.d,time_limit:np.value.l,password:np.value.pw,random_order:np.value.r})});lp()};
const pub=async(id)=>{await fetch(API+'/papers/'+id+'/publish',{method:'POST'});lp()};
const dp=async(id)=>{await fetch(API+'/papers/'+id,{method:'DELETE'});lp()};
const se=async()=>{const d=await(await fetch(API+'/exam/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paper_id:ei.value.pid,student_name:ei.value.n,password:ei.value.pw})})).json();if(d.success){eq.value=await fetch(API+'/exam/'+d.examId+'/questions').then(r=>r.json());v.value='e'}else alert(d.message)};
const sub=async()=>{const d=await(await fetch(API+'/exam/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({exam_id:eq.value[0]?.id,answers:as.value})})).json();sc.value=d.score;v.value='res'};
onMounted(()=>{const u=localStorage.u?JSON.parse(localStorage.u):null;if(u){user.value=u;isLoggedIn.value=true;if(u.role==='teacher'){lq();lp();lr()}}});
return{isLoggedIn,user,v,showR,u,p,ru,rp,rr,reg,qs,ps,rs,nq,np,ei,eq,as,sc,l,aq,dq,cp,pub,dp,se,sub,logout}}}).mount('#app');
</script></body></html>
HTMLEOF

# 4. 安装并启动
npm install
node server/index.js
