var __defProp = Object.defineProperty;
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
import { a1 as getPaper, a2 as getPaperQuestions, F as getQuestions, a3 as addQuestionsToPaper, a4 as removeQuestionFromPaper, I as createQuestion } from "./index-bbe34993.js";
/* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                */import { _ as _export_sfc, u as useRouter, av as useRoute, c as computed, o as onMounted, a as openBlock, b as createElementBlock, d as createBaseVNode, g as createVNode, f as withCtx, t as toDisplayString, r as ref, M as Message, i as Modal, B as Button, C as Card, j as createTextVNode, F as Fragment, x as renderList, e as createBlock, n as normalizeStyle, k as createCommentVNode, H as Tag, I as Input, as as Checkbox, ao as Textarea, m as FormItem, O as Option, N as Select, aj as InputNumber, h as Form, L as Alert, Q as Empty } from "./main-d1235cdf.js";
const PaperQuestions_vue_vue_type_style_index_0_scoped_ca2cc013_lang = "";
const _sfc_main = {
  name: "PaperQuestions",
  setup() {
    const router = useRouter();
    const route = useRoute();
    const paperId = route.params.id;
    const paper = ref(null);
    const paperQuestions = ref([]);
    const allQuestions = ref([]);
    const searchText = ref("");
    const showAddFromBank = ref(false);
    const showNewQuestion = ref(false);
    const showImport = ref(false);
    const selectedQuestions = ref([]);
    const importText = ref("");
    const questionForm = ref({
      title: "",
      type: "single",
      difficulty: "medium",
      score: 10,
      options: [{
        key: "A",
        value: ""
      }, {
        key: "B",
        value: ""
      }],
      answer: "",
      explanation: ""
    });
    const totalScore = computed(() => {
      return paperQuestions.value.reduce((sum, q) => sum + (q.score || 0), 0);
    });
    const filteredQuestions = computed(() => {
      if (!searchText.value)
        return allQuestions.value;
      return allQuestions.value.filter((q) => q.title.includes(searchText.value));
    });
    const goBack = () => {
      router.push("/dashboard");
    };
    const loadPaper = () => __async(this, null, function* () {
      try {
        const res = yield getPaper(paperId);
        paper.value = res.data;
      } catch (e) {
        Message.error("加载试卷失败");
      }
    });
    const loadPaperQuestions = () => __async(this, null, function* () {
      var _a;
      try {
        const res = yield getPaperQuestions(paperId);
        paperQuestions.value = ((_a = res.data) == null ? void 0 : _a.list) || [];
      } catch (e) {
        Message.error("加载题目失败");
      }
    });
    const loadAllQuestions = () => __async(this, null, function* () {
      var _a;
      try {
        const res = yield getQuestions({
          limit: 100
        });
        const usedIds = new Set(paperQuestions.value.map((q) => q.id));
        allQuestions.value = (((_a = res.data) == null ? void 0 : _a.list) || []).filter((q) => !usedIds.has(q.id));
      } catch (e) {
        Message.error("加载题库失败");
      }
    });
    const handleSelection = (selection) => {
      selectedQuestions.value = selection;
    };
    const toggleQuestionSelection = (q) => {
      const idx = selectedQuestions.value.findIndex((s) => s.id === q.id);
      if (idx >= 0) {
        selectedQuestions.value.splice(idx, 1);
      } else {
        selectedQuestions.value.push(q);
      }
    };
    const addFromBank = () => {
      (() => __async(this, null, function* () {
        if (selectedQuestions.value.length === 0) {
          Message.warning("请选择题目");
          return;
        }
        try {
          const questionIds = selectedQuestions.value.map((q) => q.id);
          yield addQuestionsToPaper(paperId, questionIds);
          Message.success(`成功添加 ${questionIds.length} 道题目`);
          showAddFromBank.value = false;
          selectedQuestions.value = [];
          loadPaperQuestions();
          loadAllQuestions();
        } catch (e) {
          Message.error("添加失败");
        }
      }))();
    };
    const removeQuestion = (questionId) => __async(this, null, function* () {
      Modal.confirm({
        title: "确认移除",
        content: "确定要从试卷中移除这道题吗？此操作不可撤销。",
        okText: "确认移除",
        cancelText: "取消",
        type: "warning",
        onOk: () => __async(this, null, function* () {
          try {
            yield removeQuestionFromPaper(paperId, questionId);
            Message.success("移除成功");
            loadPaperQuestions();
            loadAllQuestions();
          } catch (e) {
            Message.error(e.message || "移除失败");
          }
        })
      });
    });
    const createQuestionAndAdd = (done) => {
      (() => __async(this, null, function* () {
        try {
          const data = __spreadValues({}, questionForm.value);
          if (data.type === "multiple") {
            data.answer = data.answer.split(",").map((a) => a.trim());
          }
          const res = yield createQuestion(data);
          yield addQuestionsToPaper(paperId, [res.data.id]);
          Message.success("创建成功并已添加到试卷");
          showNewQuestion.value = false;
          questionForm.value = {
            title: "",
            type: "single",
            difficulty: "medium",
            score: 10,
            options: [{
              key: "A",
              value: ""
            }, {
              key: "B",
              value: ""
            }],
            answer: "",
            explanation: ""
          };
          loadPaperQuestions();
          loadAllQuestions();
          done(true);
        } catch (e) {
          Message.error("创建失败");
          done(false);
        }
      }))();
    };
    const batchImport = (done) => {
      (() => __async(this, null, function* () {
        if (!importText.value.trim()) {
          Message.warning("请输入题目");
          done(false);
          return;
        }
        try {
          const lines = importText.value.trim().split("\n");
          let successCount = 0;
          for (const line of lines) {
            const parts = line.split("|");
            if (parts.length < 2)
              continue;
            const title = parts[0].trim();
            if (!title)
              continue;
            let type = "single";
            let answer = "";
            let options = [];
            if (parts.length >= 6 && parts[5]) {
              type = "multiple";
              answer = parts[5];
              options = [{
                key: "A",
                value: parts[1]
              }, {
                key: "B",
                value: parts[2]
              }, {
                key: "C",
                value: parts[3]
              }, {
                key: "D",
                value: parts[4]
              }].filter((o) => o.value);
            } else if (title.includes("判断") || parts.length === 3) {
              type = "judge";
              answer = parts[2] === "对" ? "true" : "false";
              options = [{
                key: "true",
                value: parts[1] || "对"
              }, {
                key: "false",
                value: parts[2] || "错"
              }];
            } else if (parts.length >= 5) {
              type = "single";
              answer = parts[4];
              options = [{
                key: "A",
                value: parts[1]
              }, {
                key: "B",
                value: parts[2]
              }, {
                key: "C",
                value: parts[3]
              }, {
                key: "D",
                value: parts[4]
              }].filter((o) => o.value);
            } else {
              type = "subjective";
              answer = parts[1] || "";
            }
            const q = yield createQuestion({
              title,
              type,
              difficulty: "medium",
              score: 10,
              options,
              answer,
              explanation: ""
            });
            yield addQuestionsToPaper(paperId, [q.data.id]);
            successCount++;
          }
          Message.success(`成功导入 ${successCount} 道题目`);
          showImport.value = false;
          importText.value = "";
          loadPaperQuestions();
          loadAllQuestions();
          done(true);
        } catch (e) {
          console.error(e);
          Message.error("导入失败，请检查格式");
          done(false);
        }
      }))();
    };
    onMounted(() => __async(this, null, function* () {
      yield loadPaper();
      yield loadPaperQuestions();
      yield loadAllQuestions();
    }));
    return {
      paperId,
      paper,
      paperQuestions,
      allQuestions,
      searchText,
      totalScore,
      filteredQuestions,
      showAddFromBank,
      showNewQuestion,
      showImport,
      selectedQuestions,
      questionForm,
      importText,
      goBack,
      handleSelection,
      toggleQuestionSelection,
      addFromBank,
      removeQuestion,
      createQuestion: createQuestionAndAdd,
      batchImport
    };
  }
};
const _hoisted_1 = {
  class: "paper-questions"
};
const _hoisted_2 = {
  class: "header"
};
const _hoisted_3 = {
  class: "header-left"
};
const _hoisted_4 = {
  class: "header-right"
};
const _hoisted_5 = {
  key: 0
};
const _hoisted_6 = {
  style: {
    "color": "#666",
    "margin-left": "10px"
  }
};
const _hoisted_7 = {
  key: 0
};
const _hoisted_8 = ["onClick"];
const _hoisted_9 = {
  style: {
    "flex": "1"
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  const _component_a_button = Button;
  const _component_a_tag = Tag;
  const _component_a_empty = Empty;
  const _component_a_card = Card;
  const _component_a_input = Input;
  const _component_a_checkbox = Checkbox;
  const _component_a_modal = Modal;
  const _component_a_textarea = Textarea;
  const _component_a_form_item = FormItem;
  const _component_a_option = Option;
  const _component_a_select = Select;
  const _component_a_input_number = InputNumber;
  const _component_a_form = Form;
  const _component_a_alert = Alert;
  return openBlock(), createElementBlock("div", _hoisted_1, [createBaseVNode("div", _hoisted_2, [createBaseVNode("div", _hoisted_3, [createVNode(_component_a_button, {
    onClick: $setup.goBack
  }, {
    default: withCtx(() => [..._cache[18] || (_cache[18] = [createTextVNode("← 返回", -1)])]),
    _: 1
  }, 8, ["onClick"]), createBaseVNode("h2", null, toDisplayString(((_a = $setup.paper) == null ? void 0 : _a.title) || "加载中...") + " - 题目管理", 1)]), createBaseVNode("div", _hoisted_4, [createVNode(_component_a_button, {
    type: "primary",
    onClick: _cache[0] || (_cache[0] = ($event) => $setup.showAddFromBank = true)
  }, {
    default: withCtx(() => [..._cache[19] || (_cache[19] = [createTextVNode("📥 从题库选择", -1)])]),
    _: 1
  }), createVNode(_component_a_button, {
    type: "success",
    onClick: _cache[1] || (_cache[1] = ($event) => $setup.showNewQuestion = true)
  }, {
    default: withCtx(() => [..._cache[20] || (_cache[20] = [createTextVNode("➕ 新建题目", -1)])]),
    _: 1
  }), createVNode(_component_a_button, {
    onClick: _cache[2] || (_cache[2] = ($event) => $setup.showImport = true)
  }, {
    default: withCtx(() => [..._cache[21] || (_cache[21] = [createTextVNode("📤 批量导入", -1)])]),
    _: 1
  })])]), createVNode(_component_a_card, {
    style: {
      "margin-top": "20px"
    }
  }, {
    header: withCtx(() => [createBaseVNode("span", null, "已关联题目 (" + toDisplayString($setup.paperQuestions.length) + ") - 总分: " + toDisplayString($setup.totalScore) + "分", 1)]),
    default: withCtx(() => [$setup.paperQuestions.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_5, [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.paperQuestions, (q) => {
      return openBlock(), createElementBlock("div", {
        key: q.id,
        style: {
          "display": "flex",
          "justify-content": "space-between",
          "align-items": "center",
          "padding": "12px",
          "border-bottom": "1px solid var(--border-color-light)"
        }
      }, [createBaseVNode("div", null, [createBaseVNode("strong", null, toDisplayString(q.id) + ".", 1), createTextVNode(" " + toDisplayString(q.title) + " ", 1), q.type === "single" ? (openBlock(), createBlock(_component_a_tag, {
        key: 0,
        color: "blue",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[22] || (_cache[22] = [createTextVNode("单选", -1)])]),
        _: 1
      })) : q.type === "multiple" ? (openBlock(), createBlock(_component_a_tag, {
        key: 1,
        color: "orange",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[23] || (_cache[23] = [createTextVNode("多选", -1)])]),
        _: 1
      })) : q.type === "judge" ? (openBlock(), createBlock(_component_a_tag, {
        key: 2,
        color: "gray",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[24] || (_cache[24] = [createTextVNode("判断", -1)])]),
        _: 1
      })) : (openBlock(), createBlock(_component_a_tag, {
        key: 3,
        color: "green",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[25] || (_cache[25] = [createTextVNode("问答", -1)])]),
        _: 1
      })), createBaseVNode("span", _hoisted_6, toDisplayString(q.score) + "分", 1)]), createVNode(_component_a_button, {
        size: "small",
        status: "danger",
        onClick: ($event) => $setup.removeQuestion(q.id)
      }, {
        default: withCtx(() => [..._cache[26] || (_cache[26] = [createTextVNode("移除", -1)])]),
        _: 1
      }, 8, ["onClick"])]);
    }), 128))])) : (openBlock(), createBlock(_component_a_empty, {
      key: 1,
      description: "暂无题目，请添加题目"
    }))]),
    _: 1
  }), createVNode(_component_a_modal, {
    visible: $setup.showAddFromBank,
    "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => $setup.showAddFromBank = $event),
    title: "从题库选择题目",
    width: 700,
    onCancel: _cache[5] || (_cache[5] = ($event) => $setup.showAddFromBank = false),
    onOk: $setup.addFromBank,
    "ok-text": "添加已选 (" + $setup.selectedQuestions.length + ")",
    "cancel-text": "取消",
    "ok-disabled": $setup.selectedQuestions.length === 0
  }, {
    default: withCtx(() => [createVNode(_component_a_input, {
      modelValue: $setup.searchText,
      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.searchText = $event),
      placeholder: "搜索题目...",
      style: {
        "margin-bottom": "10px"
      },
      "allow-clear": ""
    }, null, 8, ["modelValue"]), $setup.filteredQuestions.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_7, [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.filteredQuestions, (q) => {
      return openBlock(), createElementBlock("div", {
        key: q.id,
        style: normalizeStyle({
          display: "flex",
          alignItems: "center",
          padding: "10px",
          borderBottom: "1px solid var(--border-color-light)",
          cursor: "pointer",
          background: $setup.selectedQuestions.includes(q) ? "var(--color-primary-light-1)" : "transparent"
        }),
        onClick: ($event) => $setup.toggleQuestionSelection(q)
      }, [createVNode(_component_a_checkbox, {
        checked: $setup.selectedQuestions.includes(q),
        style: {
          "margin-right": "10px"
        }
      }, null, 8, ["checked"]), createBaseVNode("div", _hoisted_9, [createBaseVNode("strong", null, toDisplayString(q.id) + ".", 1), createTextVNode(" " + toDisplayString(q.title) + " ", 1), q.type === "single" ? (openBlock(), createBlock(_component_a_tag, {
        key: 0,
        color: "blue",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[27] || (_cache[27] = [createTextVNode("单选", -1)])]),
        _: 1
      })) : q.type === "multiple" ? (openBlock(), createBlock(_component_a_tag, {
        key: 1,
        color: "orange",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[28] || (_cache[28] = [createTextVNode("多选", -1)])]),
        _: 1
      })) : q.type === "judge" ? (openBlock(), createBlock(_component_a_tag, {
        key: 2,
        color: "gray",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[29] || (_cache[29] = [createTextVNode("判断", -1)])]),
        _: 1
      })) : (openBlock(), createBlock(_component_a_tag, {
        key: 3,
        color: "green",
        size: "small"
      }, {
        default: withCtx(() => [..._cache[30] || (_cache[30] = [createTextVNode("问答", -1)])]),
        _: 1
      }))])], 12, _hoisted_8);
    }), 128))])) : (openBlock(), createBlock(_component_a_empty, {
      key: 1,
      description: "题库中暂无题目"
    }))]),
    _: 1
  }, 8, ["visible", "onOk", "ok-text", "ok-disabled"]), createVNode(_component_a_modal, {
    visible: $setup.showNewQuestion,
    "onUpdate:visible": _cache[13] || (_cache[13] = ($event) => $setup.showNewQuestion = $event),
    title: "新建题目",
    width: 600,
    onBeforeOk: _ctx.createQuestionAndAdd,
    onCancel: _cache[14] || (_cache[14] = ($event) => $setup.showNewQuestion = false),
    "ok-text": "保存并添加到试卷",
    "cancel-text": "取消"
  }, {
    default: withCtx(() => [createVNode(_component_a_form, {
      model: $setup.questionForm,
      layout: "vertical",
      "label-col-props": {
        span: 6
      },
      "wrapper-col-props": {
        span: 18
      }
    }, {
      default: withCtx(() => [createVNode(_component_a_form_item, {
        label: "题目内容"
      }, {
        default: withCtx(() => [createVNode(_component_a_textarea, {
          modelValue: $setup.questionForm.title,
          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.questionForm.title = $event),
          rows: 3
        }, null, 8, ["modelValue"])]),
        _: 1
      }), createVNode(_component_a_form_item, {
        label: "题型"
      }, {
        default: withCtx(() => [createVNode(_component_a_select, {
          modelValue: $setup.questionForm.type,
          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.questionForm.type = $event)
        }, {
          default: withCtx(() => [createVNode(_component_a_option, {
            label: "单选题",
            value: "single"
          }), createVNode(_component_a_option, {
            label: "多选题",
            value: "multiple"
          }), createVNode(_component_a_option, {
            label: "判断题",
            value: "judge"
          }), createVNode(_component_a_option, {
            label: "问答题",
            value: "subjective"
          })]),
          _: 1
        }, 8, ["modelValue"])]),
        _: 1
      }), createVNode(_component_a_form_item, {
        label: "难度"
      }, {
        default: withCtx(() => [createVNode(_component_a_select, {
          modelValue: $setup.questionForm.difficulty,
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.questionForm.difficulty = $event)
        }, {
          default: withCtx(() => [createVNode(_component_a_option, {
            label: "简单",
            value: "easy"
          }), createVNode(_component_a_option, {
            label: "中等",
            value: "medium"
          }), createVNode(_component_a_option, {
            label: "困难",
            value: "hard"
          })]),
          _: 1
        }, 8, ["modelValue"])]),
        _: 1
      }), createVNode(_component_a_form_item, {
        label: "分值"
      }, {
        default: withCtx(() => [createVNode(_component_a_input_number, {
          modelValue: $setup.questionForm.score,
          "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $setup.questionForm.score = $event),
          min: 1,
          max: 100
        }, null, 8, ["modelValue"])]),
        _: 1
      }), $setup.questionForm.type !== "subjective" ? (openBlock(), createBlock(_component_a_form_item, {
        key: 0,
        label: "选项"
      }, {
        default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.questionForm.options, (opt, idx) => {
          return openBlock(), createElementBlock("div", {
            key: idx,
            style: {
              "display": "flex",
              "margin-bottom": "5px"
            }
          }, [createVNode(_component_a_input, {
            modelValue: opt.key,
            "onUpdate:modelValue": ($event) => opt.key = $event,
            placeholder: "A",
            style: {
              "width": "60px"
            }
          }, null, 8, ["modelValue", "onUpdate:modelValue"]), createVNode(_component_a_input, {
            modelValue: opt.value,
            "onUpdate:modelValue": ($event) => opt.value = $event,
            placeholder: "选项内容",
            style: {
              "margin-left": "5px"
            }
          }, null, 8, ["modelValue", "onUpdate:modelValue"]), createVNode(_component_a_button, {
            type: "danger",
            onClick: ($event) => $setup.questionForm.options.splice(idx, 1),
            style: {
              "margin-left": "5px"
            }
          }, {
            default: withCtx(() => [..._cache[31] || (_cache[31] = [createTextVNode("-", -1)])]),
            _: 1
          }, 8, ["onClick"])]);
        }), 128)), createVNode(_component_a_button, {
          size: "small",
          onClick: _cache[10] || (_cache[10] = ($event) => $setup.questionForm.options.push({
            key: "",
            value: ""
          }))
        }, {
          default: withCtx(() => [..._cache[32] || (_cache[32] = [createTextVNode("+ 添加选项", -1)])]),
          _: 1
        })]),
        _: 1
      })) : createCommentVNode("", true), createVNode(_component_a_form_item, {
        label: "正确答案"
      }, {
        default: withCtx(() => [createVNode(_component_a_input, {
          modelValue: $setup.questionForm.answer,
          "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.questionForm.answer = $event),
          placeholder: "单选/判断: A 或 true/false; 多选: A,B"
        }, null, 8, ["modelValue"])]),
        _: 1
      }), createVNode(_component_a_form_item, {
        label: "解析"
      }, {
        default: withCtx(() => [createVNode(_component_a_textarea, {
          modelValue: $setup.questionForm.explanation,
          "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => $setup.questionForm.explanation = $event),
          rows: 2
        }, null, 8, ["modelValue"])]),
        _: 1
      })]),
      _: 1
    }, 8, ["model"])]),
    _: 1
  }, 8, ["visible", "onBeforeOk"]), createVNode(_component_a_modal, {
    visible: $setup.showImport,
    "onUpdate:visible": _cache[16] || (_cache[16] = ($event) => $setup.showImport = $event),
    title: "批量导入题目",
    width: 500,
    onBeforeOk: $setup.batchImport,
    onCancel: _cache[17] || (_cache[17] = ($event) => $setup.showImport = false),
    "ok-text": "导入",
    "cancel-text": "取消"
  }, {
    default: withCtx(() => [createVNode(_component_a_alert, null, {
      title: withCtx(() => [..._cache[33] || (_cache[33] = [createBaseVNode("strong", null, "格式说明：", -1)])]),
      default: withCtx(() => [_cache[34] || (_cache[34] = createTextVNode(" 每行一道题，格式如下： 单选：题目内容|A|B|C|D|A 多选：题目内容|A|B|C|D|AB 判断：题目内容|对|错|对 问答：题目内容||||||||答案 ", -1))]),
      _: 1
    }), createVNode(_component_a_textarea, {
      modelValue: $setup.importText,
      "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => $setup.importText = $event),
      rows: 10,
      placeholder: "请按格式输入题目...",
      style: {
        "margin-top": "15px"
      }
    }, null, 8, ["modelValue"])]),
    _: 1
  }, 8, ["visible", "onBeforeOk"])]);
}
const PaperQuestions = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ca2cc013"]]);
export {
  PaperQuestions as default
};
