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
import { aa as getExamResult } from "./index-bbe34993.js";
/* empty css                */import { f as formatDateTime } from "./index-e9e35c08.js";
/* empty css                *//* empty css                *//* empty css                */import { W as _export_sfc, X as defineComponent, Y as getPrefixCls, c as computed, Z as isNumber, a as openBlock, b as createElementBlock, d as createBaseVNode, $ as normalizeClass, n as normalizeStyle, _ as _export_sfc$1, av as useRoute, u as useRouter, o as onMounted, g as createVNode, f as withCtx, r as ref, C as Card, j as createTextVNode, t as toDisplayString, F as Fragment, e as createBlock, k as createCommentVNode, x as renderList, H as Tag, ar as Spin, B as Button, aq as Result, ai as Divider, D as DescriptionsItem, A as Descriptions } from "./main-d1235cdf.js";
const _sfc_main$2 = defineComponent({
  name: "IconInfoCircle",
  props: {
    size: {
      type: [Number, String]
    },
    strokeWidth: {
      type: Number,
      default: 4
    },
    strokeLinecap: {
      type: String,
      default: "butt",
      validator: (value) => {
        return ["butt", "round", "square"].includes(value);
      }
    },
    strokeLinejoin: {
      type: String,
      default: "miter",
      validator: (value) => {
        return ["arcs", "bevel", "miter", "miter-clip", "round"].includes(value);
      }
    },
    rotate: Number,
    spin: Boolean
  },
  emits: {
    click: (ev) => true
  },
  setup(props, {
    emit
  }) {
    const prefixCls = getPrefixCls("icon");
    const cls = computed(() => [prefixCls, `${prefixCls}-info-circle`, {
      [`${prefixCls}-spin`]: props.spin
    }]);
    const innerStyle = computed(() => {
      const styles = {};
      if (props.size) {
        styles.fontSize = isNumber(props.size) ? `${props.size}px` : props.size;
      }
      if (props.rotate) {
        styles.transform = `rotate(${props.rotate}deg)`;
      }
      return styles;
    });
    const onClick = (ev) => {
      emit("click", ev);
    };
    return {
      cls,
      innerStyle,
      onClick
    };
  }
});
const _hoisted_1$2 = ["stroke-width", "stroke-linecap", "stroke-linejoin"];
function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("svg", {
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    class: normalizeClass(_ctx.cls),
    style: normalizeStyle(_ctx.innerStyle),
    "stroke-width": _ctx.strokeWidth,
    "stroke-linecap": _ctx.strokeLinecap,
    "stroke-linejoin": _ctx.strokeLinejoin,
    onClick: _cache[0] || (_cache[0] = (...args) => _ctx.onClick && _ctx.onClick(...args))
  }, _cache[1] || (_cache[1] = [createBaseVNode("path", {
    d: "M24 20v14m0-16v-4m18 10c0 9.941-8.059 18-18 18S6 33.941 6 24 14.059 6 24 6s18 8.059 18 18Z"
  }, null, -1)]), 14, _hoisted_1$2);
}
var _IconInfoCircle = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$2]]);
const IconInfoCircle = Object.assign(_IconInfoCircle, {
  install: (app, options) => {
    var _a;
    const iconPrefix = (_a = options == null ? void 0 : options.iconPrefix) != null ? _a : "";
    app.component(iconPrefix + _IconInfoCircle.name, _IconInfoCircle);
  }
});
const _sfc_main$1 = defineComponent({
  name: "IconHome",
  props: {
    size: {
      type: [Number, String]
    },
    strokeWidth: {
      type: Number,
      default: 4
    },
    strokeLinecap: {
      type: String,
      default: "butt",
      validator: (value) => {
        return ["butt", "round", "square"].includes(value);
      }
    },
    strokeLinejoin: {
      type: String,
      default: "miter",
      validator: (value) => {
        return ["arcs", "bevel", "miter", "miter-clip", "round"].includes(value);
      }
    },
    rotate: Number,
    spin: Boolean
  },
  emits: {
    click: (ev) => true
  },
  setup(props, {
    emit
  }) {
    const prefixCls = getPrefixCls("icon");
    const cls = computed(() => [prefixCls, `${prefixCls}-home`, {
      [`${prefixCls}-spin`]: props.spin
    }]);
    const innerStyle = computed(() => {
      const styles = {};
      if (props.size) {
        styles.fontSize = isNumber(props.size) ? `${props.size}px` : props.size;
      }
      if (props.rotate) {
        styles.transform = `rotate(${props.rotate}deg)`;
      }
      return styles;
    });
    const onClick = (ev) => {
      emit("click", ev);
    };
    return {
      cls,
      innerStyle,
      onClick
    };
  }
});
const _hoisted_1$1 = ["stroke-width", "stroke-linecap", "stroke-linejoin"];
function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("svg", {
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    class: normalizeClass(_ctx.cls),
    style: normalizeStyle(_ctx.innerStyle),
    "stroke-width": _ctx.strokeWidth,
    "stroke-linecap": _ctx.strokeLinecap,
    "stroke-linejoin": _ctx.strokeLinejoin,
    onClick: _cache[0] || (_cache[0] = (...args) => _ctx.onClick && _ctx.onClick(...args))
  }, _cache[1] || (_cache[1] = [createBaseVNode("path", {
    d: "M7 17 24 7l17 10v24H7V17Z"
  }, null, -1), createBaseVNode("path", {
    d: "M20 28h8v13h-8V28Z"
  }, null, -1)]), 14, _hoisted_1$1);
}
var _IconHome = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1]]);
const IconHome = Object.assign(_IconHome, {
  install: (app, options) => {
    var _a;
    const iconPrefix = (_a = options == null ? void 0 : options.iconPrefix) != null ? _a : "";
    app.component(iconPrefix + _IconHome.name, _IconHome);
  }
});
const ExamResult_vue_vue_type_style_index_0_scoped_d5d4f104_lang = "";
const _sfc_main = {
  name: "ExamResult",
  setup() {
    const route = useRoute();
    useRouter();
    const result = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const loadResult = () => __async(this, null, function* () {
      var _a, _b;
      loading.value = true;
      error.value = null;
      try {
        const examId = route.params.id;
        if (!examId) {
          error.value = "缺少考试记录ID";
          return;
        }
        const res = yield getExamResult(examId);
        result.value = res.data;
      } catch (e) {
        console.error("加载考试结果失败:", e);
        error.value = ((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.message) || e.message || "加载结果失败，请稍后重试";
      } finally {
        loading.value = false;
      }
    });
    const displayScore = computed(() => {
      if (!result.value)
        return 0;
      if (result.value.score !== null && result.value.score !== void 0) {
        return result.value.score;
      }
      return result.value.objective_score || 0;
    });
    const essayScore = computed(() => {
      if (!result.value || result.value.score === null)
        return 0;
      return result.value.essay_score || 0;
    });
    const essayTotal = computed(() => {
      if (!result.value)
        return 0;
      return result.value.essay_total || 0;
    });
    const scoreClass = computed(() => {
      const score = displayScore.value;
      if (score >= 90)
        return "excellent";
      if (score >= 70)
        return "good";
      if (score >= 60)
        return "pass";
      return "fail";
    });
    const scoreTagColor = computed(() => {
      const score = displayScore.value;
      if (score >= 90)
        return "green";
      if (score >= 70)
        return "arcoblue";
      if (score >= 60)
        return "orange";
      return "red";
    });
    const scoreText = computed(() => {
      var _a;
      const score = displayScore.value;
      if (hasEssayQuestions.value && ((_a = result.value) == null ? void 0 : _a.score) === null) {
        return "待批改";
      }
      if (score >= 90)
        return "优秀";
      if (score >= 70)
        return "良好";
      if (score >= 60)
        return "及格";
      return "不及格";
    });
    const hasEssayQuestions = computed(() => {
      if (!result.value)
        return false;
      if (result.value.has_essay_questions !== void 0 && result.value.has_essay_questions !== null) {
        return result.value.has_essay_questions;
      }
      if (result.value.objective_score === null)
        return true;
      if (result.value.score !== null && result.value.score !== result.value.objective_score)
        return true;
      return false;
    });
    const formatDuration = (seconds) => {
      if (!seconds)
        return "--";
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins > 0) {
        return `${mins}分${secs}秒`;
      }
      return `${secs}秒`;
    };
    const getDistributionWidth = (count) => {
      var _a;
      if (!((_a = result.value) == null ? void 0 : _a.total_examinees))
        return "0%";
      return `${count / result.value.total_examinees * 100}%`;
    };
    const getDistColor = (range) => {
      if (range === "90-100")
        return "#00b42a";
      if (range === "80-89")
        return "#165dff";
      if (range === "70-79")
        return "#ff7d00";
      if (range === "60-69")
        return "#ff9a2e";
      return "#f53f3f";
    };
    onMounted(() => {
      loadResult();
    });
    return {
      result,
      loading,
      error,
      loadResult,
      displayScore,
      essayScore,
      essayTotal,
      scoreClass,
      scoreTagColor,
      scoreText,
      hasEssayQuestions,
      formatDateTime,
      formatDuration,
      getDistributionWidth,
      getDistColor
    };
  }
};
const _hoisted_1 = {
  class: "result-page"
};
const _hoisted_2 = {
  class: "result-header"
};
const _hoisted_3 = {
  key: 0,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
};
const _hoisted_4 = {
  key: 1,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
};
const _hoisted_5 = {
  key: 2,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
};
const _hoisted_6 = {
  key: 0,
  class: "loading"
};
const _hoisted_7 = {
  key: 1,
  class: "error-state"
};
const _hoisted_8 = {
  key: 2,
  class: "result-content"
};
const _hoisted_9 = {
  class: "score-overview"
};
const _hoisted_10 = {
  class: "score-card-value"
};
const _hoisted_11 = {
  key: 0,
  class: "pending-text"
};
const _hoisted_12 = {
  class: "score-card objective"
};
const _hoisted_13 = {
  class: "score-card-value"
};
const _hoisted_14 = {
  class: "score-card-unit"
};
const _hoisted_15 = {
  key: 0,
  class: "score-card essay"
};
const _hoisted_16 = {
  class: "score-card-value"
};
const _hoisted_17 = {
  key: 0,
  class: "score-card-unit"
};
const _hoisted_18 = {
  key: 0,
  class: "essay-notice"
};
const _hoisted_19 = {
  class: "stats-section"
};
const _hoisted_20 = {
  class: "stats-grid"
};
const _hoisted_21 = {
  class: "stat-item"
};
const _hoisted_22 = {
  class: "stat-value"
};
const _hoisted_23 = {
  class: "stat-item correct"
};
const _hoisted_24 = {
  class: "stat-value"
};
const _hoisted_25 = {
  class: "stat-item wrong"
};
const _hoisted_26 = {
  class: "stat-value"
};
const _hoisted_27 = {
  class: "stat-item"
};
const _hoisted_28 = {
  class: "stat-value"
};
const _hoisted_29 = {
  key: 0,
  class: "stat-item"
};
const _hoisted_30 = {
  class: "stat-value"
};
const _hoisted_31 = {
  class: "stat-item"
};
const _hoisted_32 = {
  class: "stat-value"
};
const _hoisted_33 = {
  key: 1,
  class: "distribution-section"
};
const _hoisted_34 = {
  class: "distribution-bars"
};
const _hoisted_35 = {
  class: "dist-label"
};
const _hoisted_36 = {
  class: "dist-bar-wrapper"
};
const _hoisted_37 = {
  class: "dist-count"
};
const _hoisted_38 = {
  key: 0,
  class: "my-position"
};
const _hoisted_39 = {
  class: "exam-info"
};
const _hoisted_40 = {
  class: "action-buttons"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_a_tag = Tag;
  const _component_a_spin = Spin;
  const _component_a_button = Button;
  const _component_a_result = Result;
  const _component_icon_info_circle = IconInfoCircle;
  const _component_a_divider = Divider;
  const _component_a_descriptions_item = DescriptionsItem;
  const _component_a_descriptions = Descriptions;
  const _component_icon_home = IconHome;
  const _component_a_card = Card;
  return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(_component_a_card, {
    class: "result-card"
  }, {
    default: withCtx(() => [createBaseVNode("div", _hoisted_2, [createBaseVNode("div", {
      class: normalizeClass(["result-icon", $setup.scoreClass])
    }, [$setup.scoreClass === "excellent" ? (openBlock(), createElementBlock("svg", _hoisted_3, [..._cache[2] || (_cache[2] = [createBaseVNode("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }, null, -1), createBaseVNode("path", {
      d: "M8 14s1.5 2 4 2 4-2 4-2"
    }, null, -1), createBaseVNode("line", {
      x1: "9",
      y1: "9",
      x2: "9.01",
      y2: "9"
    }, null, -1), createBaseVNode("line", {
      x1: "15",
      y1: "9",
      x2: "15.01",
      y2: "9"
    }, null, -1)])])) : $setup.scoreClass === "fail" ? (openBlock(), createElementBlock("svg", _hoisted_4, [..._cache[3] || (_cache[3] = [createBaseVNode("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }, null, -1), createBaseVNode("path", {
      d: "M8 15h8M9 9h.01M15 9h.01"
    }, null, -1)])])) : (openBlock(), createElementBlock("svg", _hoisted_5, [..._cache[4] || (_cache[4] = [createBaseVNode("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }, null, -1), createBaseVNode("path", {
      d: "M8 14s1.5 2 4 2 4-2 4-2"
    }, null, -1), createBaseVNode("line", {
      x1: "9",
      y1: "9",
      x2: "9.01",
      y2: "9"
    }, null, -1), createBaseVNode("line", {
      x1: "15",
      y1: "9",
      x2: "15.01",
      y2: "9"
    }, null, -1)])]))], 2), _cache[5] || (_cache[5] = createBaseVNode("h1", null, "考试成绩", -1)), createVNode(_component_a_tag, {
      color: $setup.scoreTagColor,
      size: "large",
      class: "score-badge"
    }, {
      default: withCtx(() => [createTextVNode(toDisplayString($setup.scoreText), 1)]),
      _: 1
    }, 8, ["color"])]), $setup.loading ? (openBlock(), createElementBlock("div", _hoisted_6, [createVNode(_component_a_spin, {
      size: "large"
    }), _cache[6] || (_cache[6] = createBaseVNode("p", null, "加载中...", -1))])) : $setup.error ? (openBlock(), createElementBlock("div", _hoisted_7, [createVNode(_component_a_result, {
      status: "error",
      title: $setup.error
    }, {
      extra: withCtx(() => [createVNode(_component_a_button, {
        type: "primary",
        onClick: $setup.loadResult
      }, {
        default: withCtx(() => [..._cache[7] || (_cache[7] = [createTextVNode("重新加载", -1)])]),
        _: 1
      }, 8, ["onClick"]), createVNode(_component_a_button, {
        onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/"))
      }, {
        default: withCtx(() => [..._cache[8] || (_cache[8] = [createTextVNode("返回首页", -1)])]),
        _: 1
      })]),
      _: 1
    }, 8, ["title"])])) : $setup.result ? (openBlock(), createElementBlock("div", _hoisted_8, [createBaseVNode("div", _hoisted_9, [createBaseVNode("div", {
      class: normalizeClass(["score-card total", $setup.scoreClass])
    }, [_cache[9] || (_cache[9] = createBaseVNode("div", {
      class: "score-card-label"
    }, "总分", -1)), createBaseVNode("div", _hoisted_10, [$setup.hasEssayQuestions && $setup.result.score === null ? (openBlock(), createElementBlock("span", _hoisted_11, "--")) : (openBlock(), createElementBlock(Fragment, {
      key: 1
    }, [createTextVNode(toDisplayString($setup.displayScore), 1)], 64))]), _cache[10] || (_cache[10] = createBaseVNode("div", {
      class: "score-card-unit"
    }, "分", -1))], 2), createBaseVNode("div", _hoisted_12, [_cache[11] || (_cache[11] = createBaseVNode("div", {
      class: "score-card-label"
    }, "客观题", -1)), createBaseVNode("div", _hoisted_13, toDisplayString($setup.result.objective_score || 0), 1), createBaseVNode("div", _hoisted_14, "/" + toDisplayString($setup.result.objective_total || 0) + "分", 1)]), $setup.hasEssayQuestions ? (openBlock(), createElementBlock("div", _hoisted_15, [_cache[13] || (_cache[13] = createBaseVNode("div", {
      class: "score-card-label"
    }, "问答题", -1)), createBaseVNode("div", _hoisted_16, [$setup.result.score === null ? (openBlock(), createBlock(_component_a_tag, {
      key: 0,
      color: "orange",
      size: "small"
    }, {
      default: withCtx(() => [..._cache[12] || (_cache[12] = [createTextVNode("待批改", -1)])]),
      _: 1
    })) : (openBlock(), createElementBlock(Fragment, {
      key: 1
    }, [createTextVNode(toDisplayString($setup.essayScore), 1)], 64))]), $setup.result.score !== null ? (openBlock(), createElementBlock("div", _hoisted_17, "/" + toDisplayString($setup.essayTotal) + "分", 1)) : createCommentVNode("", true)])) : createCommentVNode("", true)]), $setup.hasEssayQuestions && $setup.result.score === null ? (openBlock(), createElementBlock("div", _hoisted_18, [createVNode(_component_icon_info_circle), _cache[14] || (_cache[14] = createBaseVNode("span", null, "问答题待老师批改后显示总分", -1))])) : createCommentVNode("", true), createBaseVNode("div", _hoisted_19, [_cache[21] || (_cache[21] = createBaseVNode("div", {
      class: "stats-title"
    }, "答题统计", -1)), createBaseVNode("div", _hoisted_20, [createBaseVNode("div", _hoisted_21, [createBaseVNode("div", _hoisted_22, toDisplayString($setup.result.total_questions || 0), 1), _cache[15] || (_cache[15] = createBaseVNode("div", {
      class: "stat-label"
    }, "总题数", -1))]), createBaseVNode("div", _hoisted_23, [createBaseVNode("div", _hoisted_24, toDisplayString($setup.result.correct_count || 0), 1), _cache[16] || (_cache[16] = createBaseVNode("div", {
      class: "stat-label"
    }, "答对", -1))]), createBaseVNode("div", _hoisted_25, [createBaseVNode("div", _hoisted_26, toDisplayString($setup.result.wrong_count || 0), 1), _cache[17] || (_cache[17] = createBaseVNode("div", {
      class: "stat-label"
    }, "答错", -1))]), createBaseVNode("div", _hoisted_27, [createBaseVNode("div", _hoisted_28, toDisplayString($setup.formatDuration($setup.result.duration)), 1), _cache[18] || (_cache[18] = createBaseVNode("div", {
      class: "stat-label"
    }, "用时", -1))]), $setup.result.rank ? (openBlock(), createElementBlock("div", _hoisted_29, [createBaseVNode("div", _hoisted_30, "第" + toDisplayString($setup.result.rank) + "名", 1), _cache[19] || (_cache[19] = createBaseVNode("div", {
      class: "stat-label"
    }, "排名", -1))])) : createCommentVNode("", true), createBaseVNode("div", _hoisted_31, [createBaseVNode("div", _hoisted_32, toDisplayString($setup.result.percentage || 0) + "%", 1), _cache[20] || (_cache[20] = createBaseVNode("div", {
      class: "stat-label"
    }, "得分率", -1))])])]), $setup.result.distribution ? (openBlock(), createElementBlock("div", _hoisted_33, [_cache[23] || (_cache[23] = createBaseVNode("div", {
      class: "section-title"
    }, "分数分布", -1)), createBaseVNode("div", _hoisted_34, [(openBlock(true), createElementBlock(Fragment, null, renderList($setup.result.distribution, (d) => {
      return openBlock(), createElementBlock("div", {
        key: d.range,
        class: "dist-item"
      }, [createBaseVNode("div", _hoisted_35, toDisplayString(d.range), 1), createBaseVNode("div", _hoisted_36, [createBaseVNode("div", {
        class: "dist-bar",
        style: normalizeStyle({
          width: $setup.getDistributionWidth(d.count),
          backgroundColor: $setup.getDistColor(d.range)
        })
      }, null, 4)]), createBaseVNode("div", _hoisted_37, toDisplayString(d.count) + "人", 1)]);
    }), 128))]), $setup.result.rank ? (openBlock(), createElementBlock("div", _hoisted_38, [createTextVNode(" 您在 " + toDisplayString($setup.result.total_examinees || 0) + " 人中排名第 ", 1), createBaseVNode("strong", null, toDisplayString($setup.result.rank), 1), _cache[22] || (_cache[22] = createTextVNode(" 位 ", -1))])) : createCommentVNode("", true)])) : createCommentVNode("", true), createVNode(_component_a_divider), createBaseVNode("div", _hoisted_39, [_cache[24] || (_cache[24] = createBaseVNode("div", {
      class: "info-title"
    }, "考试信息", -1)), createVNode(_component_a_descriptions, {
      column: 1,
      size: "small",
      bordered: ""
    }, {
      default: withCtx(() => [createVNode(_component_a_descriptions_item, {
        label: "试卷名称"
      }, {
        default: withCtx(() => [createTextVNode(toDisplayString($setup.result.title), 1)]),
        _: 1
      }), createVNode(_component_a_descriptions_item, {
        label: "考试时间"
      }, {
        default: withCtx(() => [createTextVNode(toDisplayString($setup.formatDateTime($setup.result.start_time)), 1)]),
        _: 1
      }), createVNode(_component_a_descriptions_item, {
        label: "交卷时间"
      }, {
        default: withCtx(() => [createTextVNode(toDisplayString($setup.formatDateTime($setup.result.end_time)), 1)]),
        _: 1
      }), $setup.result.student_name ? (openBlock(), createBlock(_component_a_descriptions_item, {
        key: 0,
        label: "考生姓名"
      }, {
        default: withCtx(() => [createTextVNode(toDisplayString($setup.result.student_name), 1)]),
        _: 1
      })) : createCommentVNode("", true)]),
      _: 1
    })]), createBaseVNode("div", _hoisted_40, [createVNode(_component_a_button, {
      type: "primary",
      onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$router.push("/"))
    }, {
      icon: withCtx(() => [createVNode(_component_icon_home)]),
      default: withCtx(() => [_cache[25] || (_cache[25] = createTextVNode(" 返回首页 ", -1))]),
      _: 1
    })])])) : createCommentVNode("", true)]),
    _: 1
  })]);
}
const ExamResult = /* @__PURE__ */ _export_sfc$1(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d5d4f104"]]);
export {
  ExamResult as default
};
