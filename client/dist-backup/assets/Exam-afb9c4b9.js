var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
import { a5 as getPaperPublic, B as getAnnouncements, a6 as startExamApi, a7 as getExamQuestions, a8 as saveProgress, a9 as submitExam } from "./index-bbe34993.js";
/* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                */import { f as formatDateTime } from "./index-e9e35c08.js";
import { _ as _export_sfc, av as useRoute, u as useRouter, r as ref, c as computed, o as onMounted, M as Message, w as watch, s as onUnmounted, an as resolveComponent, a as openBlock, b as createElementBlock, d as createBaseVNode, v as createStaticVNode, t as toDisplayString, g as createVNode, f as withCtx, k as createCommentVNode, e as createBlock, F as Fragment, x as renderList, $ as normalizeClass, j as createTextVNode, n as normalizeStyle, A as Descriptions, h as Form, L as Alert, B as Button, C as Card, i as Modal, aw as withKeys, aA as withModifiers, D as DescriptionsItem, I as Input, m as FormItem, H as Tag, ai as Divider, ao as Textarea } from "./main-d1235cdf.js";
import { S as SafeHtml, p as purify } from "./SafeHtml-20ee0346.js";
const Exam_vue_vue_type_style_index_0_scoped_4dbc4019_lang = "";
const _sfc_main = {
  name: "ExamPage",
  components: {
    SafeHtml
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const paperId = ref(route.params.id);
    const paperInfo = ref({});
    const examId = ref(null);
    const examInfo = ref({});
    const examStarted = ref(false);
    const questions = ref([]);
    const currentIndex = ref(0);
    const answers = ref({});
    const timeLeft = ref(0);
    const submitDialogVisible = ref(false);
    const loading = ref(false);
    const startError = ref("");
    const startForm = ref({
      student_no: "",
      student_name: "",
      access_code: route.query.code || ""
    });
    const announcements = ref([]);
    const saveStatus = ref("saved");
    const isOnline = ref(navigator.onLine !== false);
    const currentTypeGroup = ref("");
    const showAllUnanswered = ref(false);
    let timer = null;
    let countdownTimer = null;
    const countdownTime = ref(0);
    const formatCountdown = (seconds) => {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor(seconds % 86400 / 3600);
      const m = Math.floor(seconds % 3600 / 60);
      const s = seconds % 60;
      let str = "";
      if (d > 0)
        str += `${d}天`;
      if (h > 0)
        str += `${h}时`;
      if (m > 0)
        str += `${m}分`;
      str += `${s}秒`;
      return str;
    };
    const loadAnnouncements = () => __async(this, null, function* () {
      var _a;
      try {
        const res = yield getAnnouncements({
          status: "published"
        });
        const list = ((_a = res.data) == null ? void 0 : _a.list) || res.data || [];
        announcements.value = (Array.isArray(list) ? list : []).map((a) => __spreadProps(__spreadValues({}, a), {
          content: purify.sanitize(a.content || "", {
            USE_PROFILES: {
              html: true
            }
          })
        }));
      } catch (e) {
        console.error(e);
      }
    });
    const currentQuestion = computed(() => questions.value[currentIndex.value] || {});
    const answeredCount = computed(() => {
      return Object.keys(answers.value).filter((key) => {
        const val = answers.value[key];
        return val !== void 0 && val !== "" && val !== null && (Array.isArray(val) ? val.length > 0 : true);
      }).length;
    });
    const unansweredCount = computed(() => questions.value.length - answeredCount.value);
    const progressPercent = computed(() => {
      if (questions.value.length === 0)
        return 0;
      return Math.round(answeredCount.value / questions.value.length * 100);
    });
    const unansweredList = computed(() => {
      return questions.value.map((q, index) => __spreadProps(__spreadValues({}, q), {
        _index: index
      })).filter((q) => !isAnswered(q.id));
    });
    const displayUnanswered = computed(() => {
      if (showAllUnanswered.value || unansweredList.value.length <= 10) {
        return unansweredList.value;
      }
      return unansweredList.value.slice(0, 10);
    });
    const essayWordCount = computed(() => {
      const val = answers.value[currentQuestion.value.id];
      if (!val || typeof val !== "string")
        return 0;
      return val.length;
    });
    const isSubjective = (type) => {
      return type === "subjective" || type === "essay" || type === "question";
    };
    const questionTypeGroups = computed(() => {
      const typeMap = {};
      questions.value.forEach((q, index) => {
        const type = q.type || "unknown";
        if (!typeMap[type]) {
          typeMap[type] = {
            type,
            label: questionTypeName(type),
            count: 0,
            questions: []
          };
        }
        typeMap[type].count++;
        typeMap[type].questions.push(__spreadProps(__spreadValues({}, q), {
          _originalIndex: index
        }));
      });
      const order = ["single", "multiple", "judge", "subjective", "essay", "question", "unknown"];
      const groups = order.filter((t) => typeMap[t]).map((t) => typeMap[t]);
      Object.values(typeMap).forEach((g) => {
        if (!groups.find((gg) => gg.type === g.type))
          groups.push(g);
      });
      return groups;
    });
    const currentGroupQuestions = computed(() => {
      if (questionTypeGroups.value.length <= 1) {
        return questions.value.map((q, i) => __spreadProps(__spreadValues({}, q), {
          _originalIndex: i
        }));
      }
      const group = questionTypeGroups.value.find((g) => g.type === currentTypeGroup.value);
      return group ? group.questions : [];
    });
    const questionTypeName = (type) => {
      const map = {
        single: "单选题",
        multiple: "多选题",
        judge: "判断题",
        subjective: "问答题",
        essay: "问答题",
        question: "问答题"
      };
      return map[type] || "未知题型";
    };
    const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    };
    const isAnswered = (questionId) => {
      const val = answers.value[questionId];
      return val !== void 0 && val !== "" && val !== null && (Array.isArray(val) ? val.length > 0 : true);
    };
    const selectAnswer = (key) => {
      answers.value[currentQuestion.value.id] = key;
    };
    const toggleMultipleAnswer = (key) => {
      if (!answers.value[currentQuestion.value.id]) {
        answers.value[currentQuestion.value.id] = [];
      }
      const arr = answers.value[currentQuestion.value.id];
      const idx = arr.indexOf(key);
      if (idx > -1) {
        arr.splice(idx, 1);
      } else {
        arr.push(key);
      }
    };
    const prevQuestion = () => {
      if (currentIndex.value > 0)
        currentIndex.value--;
    };
    const nextQuestion = () => {
      if (currentIndex.value < questions.value.length - 1)
        currentIndex.value++;
    };
    const goToQuestion = (index) => {
      currentIndex.value = index;
    };
    const goToTypeGroup = (type) => {
      currentTypeGroup.value = type;
      const group = questionTypeGroups.value.find((g) => g.type === type);
      if (group && group.questions.length > 0) {
        currentIndex.value = group.questions[0]._originalIndex;
      }
    };
    const showSubmitConfirm = () => {
      submitDialogVisible.value = true;
    };
    const jumpToUnanswered = (index) => {
      submitDialogVisible.value = false;
      currentIndex.value = index;
    };
    const onSubmitCancel = () => {
      submitDialogVisible.value = false;
    };
    const beginExam = () => __async(this, null, function* () {
      var _a, _b;
      if (!startForm.value.student_name) {
        Message.warning("请输入姓名");
        return;
      }
      if (paperInfo.value.allow_all_users === false && !startForm.value.student_no) {
        Message.warning("请输入考生号");
        return;
      }
      loading.value = true;
      try {
        const paperRes = yield getPaperPublic(paperId.value, {
          access_code: startForm.value.access_code
        });
        paperInfo.value = paperRes.data;
        const startRes = yield startExamApi({
          paper_id: paperId.value,
          student_name: startForm.value.student_name,
          student_no: startForm.value.student_no || null,
          access_code: startForm.value.access_code
        });
        examId.value = startRes.data.exam_id;
        examInfo.value = startRes.data;
        const questionsRes = yield getExamQuestions(examId.value);
        questions.value = questionsRes.data.questions || [];
        if (questionsRes.data.answers) {
          answers.value = questionsRes.data.answers;
        }
        timeLeft.value = paperInfo.value.time_limit * 60;
        startTimer();
        examStarted.value = true;
        startError.value = "";
        if (questionTypeGroups.value.length > 0) {
          currentTypeGroup.value = questionTypeGroups.value[0].type;
        }
      } catch (error) {
        const msg = ((_b = (_a = error.response) == null ? void 0 : _a.data) == null ? void 0 : _b.message) || "加载试卷信息失败，请检查链接是否正确";
        startError.value = msg;
        Message.error(msg);
      } finally {
        loading.value = false;
      }
    });
    const startTimer = () => {
      timer = setInterval(() => {
        if (timeLeft.value > 0) {
          timeLeft.value--;
          if (timeLeft.value % 30 === 0) {
            doSaveProgress();
          }
          if (timeLeft.value === 300 || timeLeft.value === 60) {
            try {
              const ac = new AudioContext();
              const osc = ac.createOscillator();
              const gain = ac.createGain();
              osc.connect(gain);
              gain.connect(ac.destination);
              osc.frequency.value = timeLeft.value === 60 ? 880 : 660;
              gain.gain.value = 0.15;
              osc.start();
              osc.stop(ac.currentTime + 0.3);
            } catch (e) {
            }
          }
        } else {
          clearInterval(timer);
          submitExam$1();
        }
      }, 1e3);
    };
    const doSaveProgress = () => __async(this, null, function* () {
      if (!examId.value)
        return;
      saveStatus.value = "saving";
      try {
        yield saveProgress({
          exam_id: examId.value,
          answers: answers.value
        });
        saveStatus.value = "saved";
      } catch (e) {
        saveStatus.value = "error";
        setTimeout(() => {
          if (saveStatus.value === "error")
            saveStatus.value = "saved";
        }, 5e3);
      }
    });
    const submitExam$1 = () => __async(this, null, function* () {
      clearInterval(timer);
      try {
        const res = yield submitExam({
          exam_id: examId.value,
          answers: answers.value
        });
        if (res.success !== false && res.data) {
          router.push(`/exam/result/${examId.value}`);
          submitDialogVisible.value = false;
          return true;
        } else {
          Message.error(res.message || "提交失败");
          if (timeLeft.value > 0)
            startTimer();
          return false;
        }
      } catch (error) {
        console.error("提交失败:", error);
        Message.error("提交失败，请重试");
        if (timeLeft.value > 0)
          startTimer();
        return false;
      }
    });
    const handleOnline = () => {
      isOnline.value = true;
      doSaveProgress();
      Message.success("网络已恢复，进度已同步");
    };
    const handleOffline = () => {
      isOnline.value = false;
    };
    onMounted(() => __async(this, null, function* () {
      try {
        const paperRes = yield getPaperPublic(paperId.value);
        paperInfo.value = paperRes.data;
        if (paperInfo.value.start_time) {
          startCountdown();
        }
      } catch (error) {
        Message.error("加载试卷信息失败，请检查链接是否正确");
      }
      loadAnnouncements();
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }));
    const startCountdown = () => {
      if (countdownTimer)
        clearInterval(countdownTimer);
      const updateCountdown = () => {
        const now = Date.now();
        const start = new Date(paperInfo.value.start_time).getTime();
        const diff = Math.floor((start - now) / 1e3);
        if (diff <= 0) {
          countdownTime.value = 0;
          if (countdownTimer)
            clearInterval(countdownTimer);
        } else {
          countdownTime.value = diff;
        }
      };
      updateCountdown();
      countdownTimer = setInterval(updateCountdown, 1e3);
    };
    watch(() => startForm.value.access_code, () => {
      if (startError.value) {
        startError.value = "";
      }
    });
    watch(submitDialogVisible, (visible) => {
      if (!visible && examStarted.value && timeLeft.value > 0) {
        startTimer();
      }
    });
    watch(currentIndex, (idx) => {
      const q = questions.value[idx];
      if (q && questionTypeGroups.value.length > 1) {
        currentTypeGroup.value = q.type || "unknown";
      }
    });
    onUnmounted(() => {
      if (timer)
        clearInterval(timer);
      if (countdownTimer)
        clearInterval(countdownTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    });
    return {
      paperInfo,
      examInfo,
      examStarted,
      questions,
      currentIndex,
      currentQuestion,
      answers,
      timeLeft,
      submitDialogVisible,
      loading,
      startForm,
      startError,
      answeredCount,
      unansweredCount,
      progressPercent,
      questionTypeName,
      formatTime,
      isAnswered,
      isSubjective,
      essayWordCount,
      saveStatus,
      isOnline,
      selectAnswer,
      toggleMultipleAnswer,
      prevQuestion,
      nextQuestion,
      goToQuestion,
      showSubmitConfirm,
      beginExam,
      submitExam: submitExam$1,
      announcements,
      onSubmitCancel,
      countdownTime,
      formatDateTime,
      formatCountdown,
      jumpToUnanswered,
      unansweredList,
      displayUnanswered,
      showAllUnanswered,
      questionTypeGroups,
      currentTypeGroup,
      currentGroupQuestions,
      goToTypeGroup
    };
  }
};
const _hoisted_1 = {
  class: "exam-page"
};
const _hoisted_2 = {
  key: 0,
  class: "start-exam"
};
const _hoisted_3 = {
  class: "start-card"
};
const _hoisted_4 = {
  class: "exam-info"
};
const _hoisted_5 = {
  key: 0,
  style: {
    "color": "#00b42a",
    "font-weight": "500"
  }
};
const _hoisted_6 = {
  key: 1,
  style: {
    "color": "#ff7d00",
    "font-weight": "500"
  }
};
const _hoisted_7 = {
  key: 0,
  class: "countdown-section"
};
const _hoisted_8 = {
  class: "countdown-time"
};
const _hoisted_9 = {
  key: 2,
  class: "announcements-section"
};
const _hoisted_10 = {
  key: 1,
  class: "exam-container"
};
const _hoisted_11 = {
  key: 0,
  class: "offline-banner"
};
const _hoisted_12 = {
  key: 0
};
const _hoisted_13 = {
  key: 1
};
const _hoisted_14 = {
  class: "exam-header"
};
const _hoisted_15 = {
  class: "exam-header-right"
};
const _hoisted_16 = {
  key: 0,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  width: "14",
  height: "14"
};
const _hoisted_17 = {
  key: 1,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  width: "14",
  height: "14",
  class: "spin"
};
const _hoisted_18 = {
  key: 2,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  width: "14",
  height: "14"
};
const _hoisted_19 = {
  key: 3
};
const _hoisted_20 = {
  key: 4
};
const _hoisted_21 = {
  key: 5
};
const _hoisted_22 = ["aria-label"];
const _hoisted_23 = {
  class: "exam-content"
};
const _hoisted_24 = {
  class: "question-header"
};
const _hoisted_25 = {
  class: "question-title"
};
const _hoisted_26 = ["aria-label"];
const _hoisted_27 = ["aria-checked", "onClick", "onKeydown"];
const _hoisted_28 = {
  class: "option-key"
};
const _hoisted_29 = {
  class: "option-text"
};
const _hoisted_30 = ["aria-label"];
const _hoisted_31 = ["aria-checked", "onClick", "onKeydown"];
const _hoisted_32 = {
  class: "option-key"
};
const _hoisted_33 = {
  class: "option-text"
};
const _hoisted_34 = ["aria-label"];
const _hoisted_35 = ["aria-checked"];
const _hoisted_36 = ["aria-checked"];
const _hoisted_37 = {
  key: 3,
  class: "subjective-answer"
};
const _hoisted_38 = {
  class: "word-count"
};
const _hoisted_39 = {
  class: "question-nav"
};
const _hoisted_40 = {
  class: "nav-center"
};
const _hoisted_41 = {
  key: 0,
  class: "type-tabs"
};
const _hoisted_42 = ["onClick"];
const _hoisted_43 = {
  class: "question-dots"
};
const _hoisted_44 = ["onClick", "title"];
const _hoisted_45 = {
  class: "progress-bar-wrapper"
};
const _hoisted_46 = {
  class: "progress-info"
};
const _hoisted_47 = {
  class: "progress-bar"
};
const _hoisted_48 = {
  style: {
    "padding": "12px 0"
  }
};
const _hoisted_49 = {
  style: {
    "text-align": "center",
    "margin-bottom": "20px"
  }
};
const _hoisted_50 = {
  style: {
    "color": "var(--color-danger)",
    "font-size": "16px"
  }
};
const _hoisted_51 = {
  key: 2,
  class: "unanswered-links"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_a_descriptions_item = DescriptionsItem;
  const _component_a_descriptions = Descriptions;
  const _component_a_input = Input;
  const _component_a_form_item = FormItem;
  const _component_a_form = Form;
  const _component_a_alert = Alert;
  const _component_a_button = Button;
  const _component_SafeHtml = resolveComponent("SafeHtml");
  const _component_a_tag = Tag;
  const _component_a_divider = Divider;
  const _component_a_textarea = Textarea;
  const _component_a_card = Card;
  const _component_a_modal = Modal;
  return openBlock(), createElementBlock("div", _hoisted_1, [!$setup.examStarted ? (openBlock(), createElementBlock("div", _hoisted_2, [createBaseVNode("div", _hoisted_3, [_cache[14] || (_cache[14] = createStaticVNode('<div class="start-card-icon" data-v-4dbc4019><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-v-4dbc4019><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" data-v-4dbc4019></path><polyline points="14 2 14 8 20 8" data-v-4dbc4019></polyline><line x1="16" y1="13" x2="8" y2="13" data-v-4dbc4019></line><line x1="16" y1="17" x2="8" y2="17" data-v-4dbc4019></line><polyline points="10 9 9 9 8 9" data-v-4dbc4019></polyline></svg></div>', 1)), createBaseVNode("h2", null, toDisplayString($setup.paperInfo.title), 1), _cache[15] || (_cache[15] = createBaseVNode("p", {
    class: "subtitle"
  }, "请认真阅读考试信息，准备好后开始答题", -1)), createBaseVNode("div", _hoisted_4, [createVNode(_component_a_descriptions, {
    column: 1,
    size: "small"
  }, {
    default: withCtx(() => [createVNode(_component_a_descriptions_item, {
      label: "时间限制"
    }, {
      default: withCtx(() => [createTextVNode(toDisplayString($setup.paperInfo.time_limit) + " 分钟", 1)]),
      _: 1
    }), createVNode(_component_a_descriptions_item, {
      label: "总分"
    }, {
      default: withCtx(() => [createTextVNode(toDisplayString($setup.paperInfo.total_score) + " 分", 1)]),
      _: 1
    }), $setup.paperInfo.trainer ? (openBlock(), createBlock(_component_a_descriptions_item, {
      key: 0,
      label: "出题人"
    }, {
      default: withCtx(() => {
        var _a;
        return [createTextVNode(toDisplayString((_a = $setup.paperInfo.trainer) == null ? void 0 : _a.username), 1)];
      }),
      _: 1
    })) : createCommentVNode("", true), createVNode(_component_a_descriptions_item, {
      label: "考生范围"
    }, {
      default: withCtx(() => [$setup.paperInfo.allow_all_users !== false ? (openBlock(), createElementBlock("span", _hoisted_5, "开放考试")) : (openBlock(), createElementBlock("span", _hoisted_6, "指定考生"))]),
      _: 1
    }), $setup.paperInfo.start_time || $setup.paperInfo.end_time ? (openBlock(), createBlock(_component_a_descriptions_item, {
      key: 1,
      label: "考试时间"
    }, {
      default: withCtx(() => [createBaseVNode("span", null, toDisplayString($setup.formatDateTime($setup.paperInfo.start_time)) + " 至 " + toDisplayString($setup.formatDateTime($setup.paperInfo.end_time)), 1)]),
      _: 1
    })) : createCommentVNode("", true)]),
    _: 1
  })]), _cache[16] || (_cache[16] = createStaticVNode('<div class="exam-notice" data-v-4dbc4019><div class="notice-title" data-v-4dbc4019><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" data-v-4dbc4019><circle cx="12" cy="12" r="10" data-v-4dbc4019></circle><line x1="12" y1="16" x2="12" y2="12" data-v-4dbc4019></line><line x1="12" y1="8" x2="12.01" y2="8" data-v-4dbc4019></line></svg> 考试须知 </div><ul class="notice-list" data-v-4dbc4019><li data-v-4dbc4019>点击「开始考试」后计时开始，中途不可暂停</li><li data-v-4dbc4019>系统每 30 秒自动保存答题进度</li><li data-v-4dbc4019>倒计时结束将自动交卷，请合理分配时间</li><li data-v-4dbc4019>剩余 5 分钟时将出现时间预警提示</li><li data-v-4dbc4019>交卷前请确认所有题目已作答</li></ul></div>', 1)), $setup.countdownTime > 0 ? (openBlock(), createElementBlock("div", _hoisted_7, [_cache[12] || (_cache[12] = createBaseVNode("div", {
    class: "countdown-title"
  }, "距离考试开始还有", -1)), createBaseVNode("div", _hoisted_8, toDisplayString($setup.formatCountdown($setup.countdownTime)), 1)])) : createCommentVNode("", true), createVNode(_component_a_form, {
    model: $setup.startForm,
    layout: "vertical",
    style: {
      "text-align": "left"
    }
  }, {
    default: withCtx(() => [$setup.paperInfo.access_code ? (openBlock(), createBlock(_component_a_form_item, {
      key: 0,
      label: "访问密码"
    }, {
      default: withCtx(() => [createVNode(_component_a_input, {
        modelValue: $setup.startForm.access_code,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.startForm.access_code = $event),
        placeholder: "请输入访问密码"
      }, null, 8, ["modelValue"])]),
      _: 1
    })) : createCommentVNode("", true), $setup.paperInfo.allow_all_users === false ? (openBlock(), createBlock(_component_a_form_item, {
      key: 1,
      label: "考生号"
    }, {
      default: withCtx(() => [createVNode(_component_a_input, {
        modelValue: $setup.startForm.student_no,
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.startForm.student_no = $event),
        placeholder: "请输入考生号"
      }, null, 8, ["modelValue"])]),
      _: 1
    })) : createCommentVNode("", true), createVNode(_component_a_form_item, {
      label: $setup.paperInfo.allow_all_users === false ? "考生姓名" : "您的姓名"
    }, {
      default: withCtx(() => [createVNode(_component_a_input, {
        modelValue: $setup.startForm.student_name,
        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.startForm.student_name = $event),
        placeholder: "请输入姓名"
      }, null, 8, ["modelValue"])]),
      _: 1
    }, 8, ["label"])]),
    _: 1
  }, 8, ["model"]), $setup.startError ? (openBlock(), createBlock(_component_a_alert, {
    key: 1,
    type: "error",
    style: {
      "margin-bottom": "16px"
    }
  }, {
    default: withCtx(() => [createTextVNode(toDisplayString($setup.startError), 1)]),
    _: 1
  })) : createCommentVNode("", true), createVNode(_component_a_button, {
    type: "primary",
    style: {
      "width": "100%",
      "margin-top": "16px"
    },
    loading: $setup.loading,
    disabled: !!$setup.startError || $setup.countdownTime > 0,
    onClick: $setup.beginExam
  }, {
    default: withCtx(() => [createTextVNode(toDisplayString($setup.loading ? "加载中..." : $setup.countdownTime > 0 ? "请等待倒计时结束" : "开始考试"), 1)]),
    _: 1
  }, 8, ["loading", "disabled", "onClick"]), $setup.announcements.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_9, [_cache[13] || (_cache[13] = createBaseVNode("h3", null, "公告", -1)), (openBlock(true), createElementBlock(Fragment, null, renderList($setup.announcements, (a) => {
    return openBlock(), createElementBlock("div", {
      key: a.id,
      class: "announcement-item"
    }, [createBaseVNode("h4", null, toDisplayString(a.title), 1), createVNode(_component_SafeHtml, {
      html: a.content,
      class: "announcement-content"
    }, null, 8, ["html"])]);
  }), 128))])) : createCommentVNode("", true)])])) : (openBlock(), createElementBlock("div", _hoisted_10, [!$setup.isOnline ? (openBlock(), createElementBlock("div", _hoisted_11, [..._cache[17] || (_cache[17] = [createStaticVNode('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" data-v-4dbc4019><line x1="1" y1="1" x2="23" y2="23" data-v-4dbc4019></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" data-v-4dbc4019></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" data-v-4dbc4019></path><path d="M10.71 5.05A16 16 0 0 1 22.56 9" data-v-4dbc4019></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" data-v-4dbc4019></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0" data-v-4dbc4019></path><line x1="12" y1="20" x2="12.01" y2="20" data-v-4dbc4019></line></svg> 网络已断开，答题进度将在本地暂存，恢复网络后自动同步 ', 2)])])) : createCommentVNode("", true), $setup.timeLeft <= 300 && $setup.timeLeft > 0 ? (openBlock(), createElementBlock("div", {
    key: 1,
    class: normalizeClass(["time-warning-banner", {
      urgent: $setup.timeLeft <= 60
    }])
  }, [_cache[18] || (_cache[18] = createBaseVNode("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    width: "16",
    height: "16"
  }, [createBaseVNode("path", {
    d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), createBaseVNode("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "13"
  }), createBaseVNode("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  })], -1)), $setup.timeLeft <= 60 ? (openBlock(), createElementBlock("span", _hoisted_12, "⚠️ 最后 " + toDisplayString($setup.timeLeft) + " 秒，即将自动交卷！", 1)) : (openBlock(), createElementBlock("span", _hoisted_13, "⏰ 距离考试结束还有 " + toDisplayString(Math.ceil($setup.timeLeft / 60)) + " 分钟", 1))], 2)) : createCommentVNode("", true), createBaseVNode("div", _hoisted_14, [createBaseVNode("h2", null, toDisplayString($setup.examInfo.title || $setup.paperInfo.title), 1), createBaseVNode("div", _hoisted_15, [createBaseVNode("div", {
    class: normalizeClass(["save-indicator", $setup.saveStatus])
  }, [$setup.saveStatus === "saved" ? (openBlock(), createElementBlock("svg", _hoisted_16, [..._cache[19] || (_cache[19] = [createBaseVNode("polyline", {
    points: "20 6 9 17 4 12"
  }, null, -1)])])) : $setup.saveStatus === "saving" ? (openBlock(), createElementBlock("svg", _hoisted_17, [..._cache[20] || (_cache[20] = [createBaseVNode("path", {
    d: "M21 12a9 9 0 1 1-6.219-8.56"
  }, null, -1)])])) : (openBlock(), createElementBlock("svg", _hoisted_18, [..._cache[21] || (_cache[21] = [createBaseVNode("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }, null, -1), createBaseVNode("line", {
    x1: "15",
    y1: "9",
    x2: "9",
    y2: "15"
  }, null, -1), createBaseVNode("line", {
    x1: "9",
    y1: "9",
    x2: "15",
    y2: "15"
  }, null, -1)])])), $setup.saveStatus === "saved" ? (openBlock(), createElementBlock("span", _hoisted_19, "已保存")) : $setup.saveStatus === "saving" ? (openBlock(), createElementBlock("span", _hoisted_20, "保存中...")) : (openBlock(), createElementBlock("span", _hoisted_21, "保存失败"))], 2), createBaseVNode("div", {
    class: normalizeClass(["exam-timer", {
      warning: $setup.timeLeft < 300,
      urgent: $setup.timeLeft <= 60
    }]),
    role: "timer",
    "aria-label": `剩余时间 ${$setup.formatTime($setup.timeLeft)}`,
    "aria-live": "polite"
  }, [_cache[22] || (_cache[22] = createBaseVNode("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2"
  }, [createBaseVNode("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), createBaseVNode("polyline", {
    points: "12 6 12 12 16 14"
  })], -1)), createTextVNode(" " + toDisplayString($setup.formatTime($setup.timeLeft)), 1)], 10, _hoisted_22)])]), createBaseVNode("div", _hoisted_23, [createVNode(_component_a_card, {
    class: "question-card"
  }, {
    default: withCtx(() => [createBaseVNode("div", _hoisted_24, [createVNode(_component_a_tag, {
      color: "arcoblue",
      size: "large"
    }, {
      default: withCtx(() => [createTextVNode("第 " + toDisplayString($setup.currentIndex + 1) + " 题", 1)]),
      _: 1
    }), createVNode(_component_a_tag, {
      size: "large"
    }, {
      default: withCtx(() => [createTextVNode(toDisplayString($setup.questionTypeName($setup.currentQuestion.type)), 1)]),
      _: 1
    }), createVNode(_component_a_tag, {
      color: "green",
      size: "large"
    }, {
      default: withCtx(() => [createTextVNode(toDisplayString($setup.currentQuestion.score || 0) + "分", 1)]),
      _: 1
    })]), createVNode(_component_a_divider, {
      style: {
        "margin": "12px 0"
      }
    }), createBaseVNode("div", _hoisted_25, toDisplayString($setup.currentQuestion.title), 1), $setup.currentQuestion.type === "single" ? (openBlock(), createElementBlock("div", {
      key: 0,
      class: "options",
      role: "radiogroup",
      "aria-label": `第${$setup.currentIndex + 1}题 - 单选`
    }, [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.currentQuestion.options, (option, index) => {
      return openBlock(), createElementBlock("div", {
        key: index,
        class: normalizeClass(["option-item", {
          selected: $setup.answers[$setup.currentQuestion.id] === option.key
        }]),
        role: "radio",
        "aria-checked": $setup.answers[$setup.currentQuestion.id] === option.key,
        tabindex: "0",
        onClick: ($event) => $setup.selectAnswer(option.key),
        onKeydown: [withKeys(($event) => $setup.selectAnswer(option.key), ["enter"]), withKeys(withModifiers(($event) => $setup.selectAnswer(option.key), ["prevent"]), ["space"])]
      }, [createBaseVNode("span", _hoisted_28, toDisplayString(option.key), 1), createBaseVNode("span", _hoisted_29, toDisplayString(option.value), 1)], 42, _hoisted_27);
    }), 128))], 8, _hoisted_26)) : createCommentVNode("", true), $setup.currentQuestion.type === "multiple" ? (openBlock(), createElementBlock("div", {
      key: 1,
      class: "options",
      role: "group",
      "aria-label": `第${$setup.currentIndex + 1}题 - 多选`
    }, [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.currentQuestion.options, (option, index) => {
      return openBlock(), createElementBlock("div", {
        key: index,
        class: normalizeClass(["option-item", {
          selected: ($setup.answers[$setup.currentQuestion.id] || []).includes(option.key)
        }]),
        role: "checkbox",
        "aria-checked": ($setup.answers[$setup.currentQuestion.id] || []).includes(option.key),
        tabindex: "0",
        onClick: ($event) => $setup.toggleMultipleAnswer(option.key),
        onKeydown: [withKeys(($event) => $setup.toggleMultipleAnswer(option.key), ["enter"]), withKeys(withModifiers(($event) => $setup.toggleMultipleAnswer(option.key), ["prevent"]), ["space"])]
      }, [createBaseVNode("span", _hoisted_32, toDisplayString(option.key), 1), createBaseVNode("span", _hoisted_33, toDisplayString(option.value), 1)], 42, _hoisted_31);
    }), 128))], 8, _hoisted_30)) : createCommentVNode("", true), $setup.currentQuestion.type === "judge" ? (openBlock(), createElementBlock("div", {
      key: 2,
      class: "options judge",
      role: "radiogroup",
      "aria-label": `第${$setup.currentIndex + 1}题 - 判断`
    }, [createBaseVNode("div", {
      class: normalizeClass(["option-item", {
        selected: $setup.answers[$setup.currentQuestion.id] === "true"
      }]),
      role: "radio",
      "aria-checked": $setup.answers[$setup.currentQuestion.id] === "true",
      tabindex: "0",
      onClick: _cache[3] || (_cache[3] = ($event) => $setup.selectAnswer("true")),
      onKeydown: [_cache[4] || (_cache[4] = withKeys(($event) => $setup.selectAnswer("true"), ["enter"])), _cache[5] || (_cache[5] = withKeys(withModifiers(($event) => $setup.selectAnswer("true"), ["prevent"]), ["space"]))]
    }, [..._cache[23] || (_cache[23] = [createBaseVNode("span", {
      class: "option-key"
    }, "✓", -1), createBaseVNode("span", {
      class: "option-text"
    }, "对", -1)])], 42, _hoisted_35), createBaseVNode("div", {
      class: normalizeClass(["option-item", {
        selected: $setup.answers[$setup.currentQuestion.id] === "false"
      }]),
      role: "radio",
      "aria-checked": $setup.answers[$setup.currentQuestion.id] === "false",
      tabindex: "0",
      onClick: _cache[6] || (_cache[6] = ($event) => $setup.selectAnswer("false")),
      onKeydown: [_cache[7] || (_cache[7] = withKeys(($event) => $setup.selectAnswer("false"), ["enter"])), _cache[8] || (_cache[8] = withKeys(withModifiers(($event) => $setup.selectAnswer("false"), ["prevent"]), ["space"]))]
    }, [..._cache[24] || (_cache[24] = [createBaseVNode("span", {
      class: "option-key"
    }, "✗", -1), createBaseVNode("span", {
      class: "option-text"
    }, "错", -1)])], 42, _hoisted_36)], 8, _hoisted_34)) : createCommentVNode("", true), $setup.isSubjective($setup.currentQuestion.type) ? (openBlock(), createElementBlock("div", _hoisted_37, [_cache[25] || (_cache[25] = createBaseVNode("div", {
      class: "answer-instruction"
    }, "请在下方输入你的答案：", -1)), createVNode(_component_a_textarea, {
      modelValue: $setup.answers[$setup.currentQuestion.id],
      "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $setup.answers[$setup.currentQuestion.id] = $event),
      placeholder: "请输入你的答案...",
      rows: 8,
      class: "answer-textarea"
    }, null, 8, ["modelValue"]), createBaseVNode("div", _hoisted_38, "已输入 " + toDisplayString($setup.essayWordCount) + " 字", 1)])) : createCommentVNode("", true)]),
    _: 1
  }), createBaseVNode("div", _hoisted_39, [createVNode(_component_a_button, {
    class: "nav-btn",
    disabled: $setup.currentIndex === 0,
    onClick: $setup.prevQuestion
  }, {
    icon: withCtx(() => [..._cache[26] || (_cache[26] = [createBaseVNode("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      width: "16",
      height: "16"
    }, [createBaseVNode("polyline", {
      points: "15 18 9 12 15 6"
    })], -1)])]),
    default: withCtx(() => [_cache[27] || (_cache[27] = createTextVNode(" 上一题 ", -1))]),
    _: 1
  }, 8, ["disabled", "onClick"]), createBaseVNode("div", _hoisted_40, [$setup.questionTypeGroups.length > 1 ? (openBlock(), createElementBlock("div", _hoisted_41, [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.questionTypeGroups, (group) => {
    return openBlock(), createElementBlock("button", {
      key: group.type,
      class: normalizeClass(["type-tab", {
        active: $setup.currentTypeGroup === group.type
      }]),
      onClick: ($event) => $setup.goToTypeGroup(group.type)
    }, toDisplayString(group.label) + "(" + toDisplayString(group.count) + ") ", 11, _hoisted_42);
  }), 128))])) : createCommentVNode("", true), createBaseVNode("div", _hoisted_43, [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.currentGroupQuestions, (q) => {
    return openBlock(), createElementBlock("span", {
      key: q.id,
      class: normalizeClass(["dot", {
        current: q.id === $setup.currentQuestion.id,
        answered: $setup.isAnswered(q.id)
      }]),
      onClick: ($event) => $setup.goToQuestion(q._originalIndex),
      title: `第${q._originalIndex + 1}题`
    }, null, 10, _hoisted_44);
  }), 128))])]), $setup.currentIndex < $setup.questions.length - 1 ? (openBlock(), createBlock(_component_a_button, {
    key: 0,
    type: "primary",
    onClick: $setup.nextQuestion
  }, {
    icon: withCtx(() => [..._cache[28] || (_cache[28] = [createBaseVNode("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      width: "16",
      height: "16"
    }, [createBaseVNode("polyline", {
      points: "9 18 15 12 9 6"
    })], -1)])]),
    default: withCtx(() => [_cache[29] || (_cache[29] = createTextVNode(" 下一题 ", -1))]),
    _: 1
  }, 8, ["onClick"])) : (openBlock(), createBlock(_component_a_button, {
    key: 1,
    type: "primary",
    status: "warning",
    onClick: $setup.showSubmitConfirm
  }, {
    default: withCtx(() => [..._cache[30] || (_cache[30] = [createTextVNode(" 交卷 ", -1)])]),
    _: 1
  }, 8, ["onClick"]))]), createBaseVNode("div", _hoisted_45, [createBaseVNode("div", _hoisted_46, [_cache[31] || (_cache[31] = createBaseVNode("span", null, "答题进度", -1)), createBaseVNode("span", null, toDisplayString($setup.answeredCount) + " / " + toDisplayString($setup.questions.length), 1)]), createBaseVNode("div", _hoisted_47, [createBaseVNode("div", {
    class: "progress-fill",
    style: normalizeStyle({
      width: $setup.progressPercent + "%"
    })
  }, null, 4)])])])])), createVNode(_component_a_modal, {
    visible: $setup.submitDialogVisible,
    "onUpdate:visible": _cache[11] || (_cache[11] = ($event) => $setup.submitDialogVisible = $event),
    title: "确认交卷",
    width: 440,
    onBeforeOk: $setup.submitExam,
    onCancel: $setup.onSubmitCancel,
    "ok-text": "确认交卷",
    "cancel-text": "再检查一下",
    "ok-button-props": {
      status: $setup.unansweredCount > 0 ? "warning" : "primary"
    }
  }, {
    default: withCtx(() => [createBaseVNode("div", _hoisted_48, [createBaseVNode("div", _hoisted_49, [createBaseVNode("div", {
      style: normalizeStyle([{
        "font-size": "48px",
        "font-weight": "700",
        "margin-bottom": "4px"
      }, {
        color: $setup.unansweredCount > 0 ? "var(--color-warning)" : "var(--color-success)"
      }])
    }, toDisplayString($setup.answeredCount) + " / " + toDisplayString($setup.questions.length), 5), _cache[32] || (_cache[32] = createBaseVNode("div", {
      style: {
        "color": "var(--text-secondary)",
        "font-size": "14px"
      }
    }, "已答题数", -1))]), $setup.unansweredCount > 0 ? (openBlock(), createBlock(_component_a_alert, {
      key: 0,
      type: "warning",
      style: {
        "margin-bottom": "16px"
      }
    }, {
      icon: withCtx(() => [..._cache[33] || (_cache[33] = [createBaseVNode("svg", {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        width: "16",
        height: "16"
      }, [createBaseVNode("path", {
        d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      }), createBaseVNode("line", {
        x1: "12",
        y1: "9",
        x2: "12",
        y2: "13"
      }), createBaseVNode("line", {
        x1: "12",
        y1: "17",
        x2: "12.01",
        y2: "17"
      })], -1)])]),
      default: withCtx(() => [_cache[34] || (_cache[34] = createTextVNode(" 还有 ", -1)), createBaseVNode("strong", _hoisted_50, toDisplayString($setup.unansweredCount), 1), _cache[35] || (_cache[35] = createTextVNode(" 道题未作答，交卷后将无法修改！ ", -1))]),
      _: 1
    })) : (openBlock(), createBlock(_component_a_alert, {
      key: 1,
      type: "success"
    }, {
      default: withCtx(() => [..._cache[36] || (_cache[36] = [createTextVNode(" 所有题目已作答，确认无误后请交卷 ", -1)])]),
      _: 1
    })), $setup.unansweredList.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_51, [_cache[37] || (_cache[37] = createBaseVNode("span", {
      style: {
        "color": "var(--text-secondary)",
        "font-size": "13px"
      }
    }, "点击跳转到未答题：", -1)), (openBlock(true), createElementBlock(Fragment, null, renderList($setup.displayUnanswered, (q) => {
      return openBlock(), createBlock(_component_a_button, {
        key: q.id,
        size: "mini",
        type: "outline",
        status: "warning",
        onClick: ($event) => $setup.jumpToUnanswered(q._index)
      }, {
        default: withCtx(() => [createTextVNode(" 第" + toDisplayString(q._index + 1) + "题 ", 1)]),
        _: 2
      }, 1032, ["onClick"]);
    }), 128)), $setup.unansweredList.length > 10 ? (openBlock(), createBlock(_component_a_button, {
      key: 0,
      size: "mini",
      type: "text",
      onClick: _cache[10] || (_cache[10] = ($event) => $setup.showAllUnanswered = !$setup.showAllUnanswered)
    }, {
      default: withCtx(() => [createTextVNode(toDisplayString($setup.showAllUnanswered ? "收起" : `还有 ${$setup.unansweredList.length - 10} 题...`), 1)]),
      _: 1
    })) : createCommentVNode("", true)])) : createCommentVNode("", true)])]),
    _: 1
  }, 8, ["visible", "onBeforeOk", "onCancel", "ok-button-props"]), _cache[38] || (_cache[38] = createBaseVNode("div", {
    class: "footer"
  }, [createBaseVNode("span", null, "© thishe.com")], -1))]);
}
const Exam = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4dbc4019"]]);
export {
  Exam as default
};
