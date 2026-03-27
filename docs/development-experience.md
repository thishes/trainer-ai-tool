# 开发经验文档

## 一、Vue 3 项目开发经验

### 1. setup() 组件初始化顺序
**问题描述：**
在 Vue 3 的 `setup()` 中，变量定义顺序会影响功能。如果在 `route` 定义之前就使用它，会导致获取不到路由参数。

**正确写法：**
```javascript
setup() {
  const router = useRouter()      // 先初始化 router
  const route = useRoute()         // 再初始化 route
  const paperId = route.params.id  // 最后使用 route
}
```

### 2. setup() 返回值完整性
**问题描述：**
所有在模板中使用的变量和方法都必须包含在 `setup()` 的 `return` 语句中。

**正确写法：**
```javascript
setup() {
  const paperId = ref(2)

  const loadData = () => { /* ... */ }

  return {
    paperId,      // 必须返回所有模板中使用的变量
    loadData       // 必须返回所有模板中使用的方法
  }
}
```

### 3. 调试日志管理
**问题描述：**
生产环境不应保留 `console.log` 调试语句。

**正确做法：**
- 开发完成后删除所有 `console.log` 语句
- 或使用条件编译：
```javascript
if (import.meta.env.DEV) {
  console.log('debug info')
}
```

### 4. a-table 组件数据不显示
**问题描述：**
Arco Design Vue 的 `a-table` 组件在某些情况下不显示数据，但 Vue 响应式数据是正确的。

**排查方法：**
1. 先用简单的 HTML 列表验证数据是否正确传递
2. 如果 HTML 列表正常显示，说明数据没问题
3. 检查 `a-table` 的属性配置

**临时解决方案：**
```vue
<!-- 使用简单的 div 列表代替 a-table -->
<div v-for="item in dataList" :key="item.id">
  {{ item.name }}
</div>
```

---

## 二、API 数据处理经验

### 1. axios 响应拦截器理解
**问题描述：**
API 拦截器配置 `response => response.data` 会自动解包响应数据。

**数据流分析：**
```javascript
// 拦截器配置：response => response.data
// 服务器返回：{ success: true, data: { list: [...] } }
// 拦截后：{ list: [...] }
// 代码中使用：res.list 即可，不需要 res.data.list
```

### 2. API 响应格式一致性
**问题描述：**
不同接口返回格式可能不一致，有的需要 `res.data.list`，有的需要 `res.list`。

**排查方法：**
添加临时日志确认数据结构：
```javascript
console.log('API response:', res)
console.log('res.data:', res.data)
console.log('res.data.list:', res.data?.list)
```

---

## 三、异步操作经验

### 1. Modal.confirm 确认对话框
**问题描述：**
`Modal.confirm()` 是异步的，需要正确 await 并检查返回值。

**正确写法：**
```javascript
const handleDelete = async (id) => {
  try {
    const confirmed = await Modal.confirm({
      title: '确认删除',
      content: '确定要删除吗？',
      okText: '确认',
      cancelText: '取消'
    })
    // Arco Design 的 Modal.confirm 点击确定返回 'cancel'，点击取消返回 false
    if (confirmed !== 'cancel') {
      await deleteItem(id)
      Message.success('删除成功')
    }
  } catch (e) {
    // 用户取消或出错
  }
}
```

### 2. async/await 顺序执行
**问题描述：**
多个异步操作需要按顺序执行时，应使用 await。

**正确写法：**
```javascript
onMounted(async () => {
  await loadPaper()           // 先加载试卷
  await loadPaperQuestions()  // 再加载题目
  await loadAllQuestions()    // 最后加载题库
})
```

---

## 四、路由相关经验

### 1. 路由守卫路径匹配
**问题描述：**
使用 `startsWith` 匹配路径可能误匹配，例如 `/exam` 会匹配 `/example`。

**正确写法：**
```javascript
const publicPaths = ['/login', '/exam', '/exam/result']
const isPublicPath = publicPaths.some(p =>
  to.path === p || to.path.startsWith(p + '/')
)
```

### 2. 路由注释准确性
**问题描述：**
注释应准确描述代码功能，避免误导。

**正确写法：**
```javascript
// 好的注释
// 获取单个试卷（管理用）
router.get('/:id', authenticate, async (req, res) => { /* ... */ })

// 避免歧义的注释
// 必须在 /public/:id 之后  ← 这种注释容易误导
```

---

## 五、常见错误处理

### 1. Cannot access 'x' before initialization
**原因：** 变量在定义前被使用（Temporal Dead Zone）

### 2. net::ERR_ABORTED 请求被中止
**可能原因：**
- 浏览器缓存了旧的 JavaScript
- 服务器没有正确响应
- 路由配置问题

**解决方案：**
1. 强制刷新：Cmd + Shift + R
2. 清理浏览器缓存
3. 检查服务器日志

### 3. 表格组件不显示数据
**排查步骤：**
1. 确认 API 返回了正确的数据
2. 用简单 HTML 列表验证数据传递
3. 检查组件属性配置

### 4. Maximum call stack size exceeded（无限递归）
**原因：** 局部函数名与导入的API函数名重名，导致函数调用自身造成死循环。

**问题示例：**
```javascript
import { createRandomPaper } from '@/api'  // 导入API函数

export default {
  setup() {
    // 局部函数名与导入的API函数名相同！
    const createRandomPaper = (done) => {
      // 这里调用的是自己，不是API！
      await createRandomPaper(randomForm.value)  // 无限递归！
      // ...
    }
  }
}
```

**正确写法：**
```javascript
import { createRandomPaper } from '@/api'

export default {
  setup() {
    // 使用不同的函数名避免冲突
    const createRandomPaperAction = (done) => {
      await createRandomPaper(randomForm.value)  // 调用API函数
      // ...
    }
    return { createRandomPaperAction }
  }
}
```

**排查方法：**
1. 检查报错堆栈，如果函数调用自身形成循环，就是这个问题
2. 搜索函数定义，确认没有重名冲突
3. 特别检查 `import` 的API函数名是否与局部函数名冲突

---

## 六、开发建议

### 1. 添加临时调试代码
遇到问题时，可以添加临时调试代码确认数据流：
```javascript
console.log('变量名:', 变量名)
```

### 2. 逐步排查
从简单到复杂：
1. 先用最简单的方式验证功能（例如 HTML 列表）
2. 确认数据正确后再处理 UI 组件问题

### 3. 清理调试代码
功能验证正常后，删除所有临时调试代码。

### 4. 提交前检查清单
- [ ] 删除所有 console.log
- [ ] 确认所有 return 语句完整
- [ ] 检查异步操作是否正确 await
- [ ] 验证 API 响应数据处理正确
