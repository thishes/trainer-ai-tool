// src/stores/paper.js - 试卷状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getPapers, createPaper, updatePaper, deletePaper,
  publishPaper, unpublishPaper, createRandomPaper,
  getPaperExamUrl, getExamRecords, getPaperStudents,
  addPaperStudents, removePaperStudent, exportPaperStudents,
  getExamStats, getPendingGrading, gradeEssay
} from '@/api'

export const usePaperStore = defineStore('paper', () => {
  const papers = ref([])
  const papersLoading = ref(false)
  const pendingGradingList = ref([])
  const papersWithPendingGrading = ref({})

  const publishedPapers = computed(() => papers.value.filter(p => p.status === 'published'))
  const pendingGradingCount = computed(() => pendingGradingList.value?.length || 0)

  async function loadPapers() {
    papersLoading.value = true
    try {
      const res = await getPapers({ limit: 100 })
      if (res.data) {
        const paperList = res.data.list || res.data.papers || []
        papers.value = paperList.map(p => ({ ...p, _showMenu: false }))
      }
    } catch (e) {
      console.error('加载试卷失败:', e)
      throw e
    } finally {
      papersLoading.value = false
    }
  }

  async function loadPendingGrading(questions = []) {
    if (!papers.value || papers.value.length === 0) {
      pendingGradingList.value = []
      papersWithPendingGrading.value = {}
      return
    }
    try {
      let allPending = []
      const pendingMap = {}
      for (const paper of papers.value) {
        try {
          const res = await getPendingGrading(paper.id)
          if (res.data && res.data.list) {
            if (res.data.list.length > 0) {
              pendingMap[paper.id] = res.data.list.length
            }
            for (const record of res.data.list) {
              record.paper_title = paper.title
              if (!record.essay_questions) record.essay_questions = []
              for (const eq of record.essay_questions) {
                eq.currentScore = 0
                eq.remark = ''
                if (!eq.max_score) {
                  const question = questions.find(q => q.id === eq.question_id)
                  eq.max_score = question?.score || 0
                }
              }
            }
            allPending = allPending.concat(res.data.list)
          }
        } catch (e) { console.error('加载待评分失败', e) }
      }
      pendingGradingList.value = allPending
      papersWithPendingGrading.value = pendingMap
    } catch (e) {
      console.error('加载待评分列表失败', e)
    }
  }

  return {
    papers, papersLoading, publishedPapers,
    pendingGradingList, pendingGradingCount, papersWithPendingGrading,
    loadPapers, loadPendingGrading
  }
})
