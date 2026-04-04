#!/usr/bin/env python3
# -*- coding: utf-8 -*-

file_path = '/Volumes/共享盘/openclaw/main/projects/trainer-ai-tool/client/src/views/Dashboard.vue'

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 要替换的旧内容
old_content = '''        <a-table v-else :data="filteredPendingGradingList" :columns="pendingGradingColumns" row-key="id" :pagination="false" :bordered="false">
          <div v-for="record in pendingGradingList" :key="record.id" class="grading-card" :data-record-id="record.id">
            <div class="grading-header">
              <div class="grading-info">
                <span class="student-name">{{ record.student_name }}</span>
                <span class="paper-title">{{ record.paper_title }}</span>
              </div>
              <div class="grading-meta">
                <span>提交时间：{{ new Date(record.end_time).toLocaleString() }}</span>
              </div>
            </div>
            <div class="grading-questions">
              <div v-for="eq in record.essay_questions" :key="eq.question_id" class="grading-item">
                <div class="grading-question-title">
                  <strong>{{ eq.title }}</strong>
                  <span class="max-score">满分：{{ eq.max_score }}分</span>
                </div>
                <div class="grading-answer">
                  <div class="answer-label">考生答案:</div>
                  <div class="answer-content">{{ eq.user_answer || '(未作答)' }}</div>
                </div>
                <div class="grading-score-input">
                  <a-input-number v-model="eq.currentScore" :min="0" :max="eq.max_score" size="small" style="width: 80px" />
                  <span class="score-unit">分</span>
                  <a-input v-model="eq.remark" placeholder="评语 (可选)" size="small" style="width: 150px; margin-left: 10px" />
                </div>
              </div>
            </div>
            <div class="grading-actions">
              <a-button type="primary" size="small" @click="submitEssayScore(record)">提交评分</a-button>
            </div>
          </div>
        </div>
      </a-card>
    </div>'''

# 新的表格内容
new_content = '''        <a-table v-else :data="filteredPendingGradingList" :columns="pendingGradingColumns" row-key="id" :pagination="false" :bordered="false">
          <template #student_name="{ record }">
            <span class="student-name-link">{{ record.student_name }}</span>
          </template>
          <template #paper_title="{ record }">
            <span class="paper-title-text">{{ record.paper_title }}</span>
          </template>
          <template #objective_score="{ record }">
            <span v-if="record.objective_score !== null && record.objective_total !== null" class="score-badge">
              {{ record.objective_score }}/{{ record.objective_total }}分
            </span>
            <span v-else class="score-badge score-badge-empty">-</span>
          </template>
          <template #essay_count="{ record }">
            <a-tag v-if="record.essay_questions && record.essay_questions.length > 0" color="arcoblue">
              {{ record.essay_questions.length }}道题
            </a-tag>
            <span v-else>-</span>
          </template>
          <template #end_time="{ record }">
            {{ formatTime(record.end_time) }}
          </template>
          <template #action="{ record }">
            <a-button type="primary" size="small" @click="openGradingDrawer(record)">评卷</a-button>
          </template>
        </a-table>
      </a-card>
    </div>
    
    <a-drawer v-model:visible="showGradingDrawer" :title="'评卷 - ' + (currentGradingRecord?.student_name || '') + ' - ' + (currentGradingRecord?.paper_title || '')" :width="800" :footer="false">
      <div v-if="currentGradingRecord" class="grading-drawer-content">
        <div class="grading-drawer-header">
          <div class="header-info">
            <a-avatar :size="48" :style="{ backgroundColor: '#165DFF' }">
              {{ currentGradingRecord.student_name?.charAt(0) }}
            </a-avatar>
            <div class="header-meta">
              <div class="meta-row">
                <span class="meta-label">考生：</span>
                <span class="meta-value">{{ currentGradingRecord.student_name }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">试卷：</span>
                <span class="meta-value">{{ currentGradingRecord.paper_title }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">提交时间：</span>
                <span class="meta-value">{{ formatTime(currentGradingRecord.end_time) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">客观题得分：</span>
                <span class="meta-value score-highlight">
                  {{ currentGradingRecord.objective_score !== null ? currentGradingRecord.objective_score + '/' + currentGradingRecord.objective_total + '分' : '-' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <a-divider style="margin: 16px 0" />
        
        <div class="grading-drawer-body">
          <div v-if="!currentGradingRecord.essay_questions || currentGradingRecord.essay_questions.length === 0" style="text-align: center; padding: 40px 0; color: var(--text-secondary)">
            <p>该考生没有问答题</p>
          </div>
          <div v-else>
            <div v-for="(eq, idx) in currentGradingRecord.essay_questions" :key="eq.question_id" class="grading-drawer-item">
              <div class="item-header">
                <div class="item-index">题目 {{ idx + 1 }}</div>
                <a-tag color="arcoblue">满分 {{ eq.max_score }}分</a-tag>
              </div>
              <div class="item-content">
                <div class="question-title">{{ eq.title }}</div>
                <div class="answer-section">
                  <div class="answer-label">
                    <icon-user /> 考生答案
                  </div>
                  <div class="answer-text">{{ eq.user_answer || '(未作答)' }}</div>
                </div>
                <div class="score-section">
                  <a-input-number v-model="eq.currentScore" :min="0" :max="eq.max_score" :step="1" style="width: 120px" placeholder="评分" />
                  <span class="score-unit">分</span>
                  <a-input v-model="eq.remark" placeholder="评语 (可选)" style="width: 200px; margin-left: 12px" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="grading-drawer-footer">
          <a-button @click="showGradingDrawer = false" style="margin-right: 8px">取消</a-button>
          <a-button type="primary" @click="submitEssayScore(currentGradingRecord)" :loading="submittingScore">
            提交评分
          </a-button>
        </div>
      </div>
    </a-drawer>'''

# 替换内容
if old_content in content:
    new_content_file = content.replace(old_content, new_content)
    
    # 写回文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content_file)
    
    print("✅ Dashboard.vue 已成功修复！")
    print("已将错误的卡片布局替换为正确的表格插槽语法")
else:
    print("❌ 未找到匹配的内容")
    print("文件可能已被修改，请检查当前状态")
