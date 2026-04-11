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
import { ad as getPromotionPublic, ae as createPromotionSignup } from "./index-bbe34993.js";
/* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                */import { _ as _export_sfc, av as useRoute, c as computed, o as onMounted, a as openBlock, b as createElementBlock, g as createVNode, f as withCtx, d as createBaseVNode, t as toDisplayString, k as createCommentVNode, r as ref, y as reactive, aq as Result, H as Tag, h as Form, j as createTextVNode, F as Fragment, x as renderList, e as createBlock, M as Message, S as Skeleton, B as Button, ai as Divider, I as Input, m as FormItem, O as Option, N as Select } from "./main-d1235cdf.js";
import { S as SafeHtml } from "./SafeHtml-20ee0346.js";
const PromotionPublic_vue_vue_type_style_index_0_scoped_3d43d37d_lang = "";
const _hoisted_1 = {
  class: "promotion-public-page"
};
const _hoisted_2 = {
  key: 0,
  class: "promotion-container"
};
const _hoisted_3 = {
  key: 1,
  class: "promotion-container"
};
const _hoisted_4 = {
  key: 2,
  class: "promotion-container"
};
const _hoisted_5 = {
  class: "promotion-header"
};
const _hoisted_6 = {
  class: "promotion-title"
};
const _hoisted_7 = {
  class: "promotion-meta"
};
const _hoisted_8 = {
  class: "publish-time"
};
const _hoisted_9 = {
  key: 0,
  class: "signup-area"
};
const _hoisted_10 = {
  key: 0,
  class: "signup-section"
};
const _hoisted_11 = {
  key: 1,
  class: "signup-section"
};
const _hoisted_12 = {
  key: 0,
  class: "class-quota"
};
const _hoisted_13 = {
  key: 1,
  class: "class-full"
};
const _hoisted_14 = {
  key: 2,
  class: "signup-ended"
};
const _hoisted_15 = {
  key: 3,
  class: "signup-ended"
};
const _sfc_main = {
  __name: "PromotionPublic",
  setup(__props) {
    const route = useRoute();
    const loading = ref(true);
    const error = ref(null);
    const promotion = ref(null);
    const submitting = ref(false);
    const signupSuccess = ref(false);
    const formData = reactive({
      name: "",
      unit: "",
      phone: "",
      class_id: ""
    });
    const availableClasses = computed(() => {
      var _a, _b;
      return ((_b = (_a = promotion.value) == null ? void 0 : _a.signup_config) == null ? void 0 : _b.classes) || [];
    });
    const getStatusColor = (status) => {
      const colors = {
        draft: "gray",
        published: "green",
        archived: "orange"
      };
      return colors[status] || "gray";
    };
    const getStatusText = (status) => {
      const texts = {
        draft: "草稿",
        published: "已发布",
        archived: "已归档"
      };
      return texts[status] || status;
    };
    const formatDate = (date) => {
      if (!date)
        return "-";
      return new Date(date).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    };
    const fetchPromotion = () => __async(this, null, function* () {
      var _a, _b, _c, _d;
      const id = route.params.id;
      if (!id) {
        error.value = {
          message: "无效的访问链接"
        };
        loading.value = false;
        return;
      }
      try {
        const res = yield getPromotionPublic(id);
        if (res.success) {
          promotion.value = res.data;
        }
      } catch (err) {
        error.value = {
          message: ((_b = (_a = err.response) == null ? void 0 : _a.data) == null ? void 0 : _b.message) || "获取文案失败",
          code: (_d = (_c = err.response) == null ? void 0 : _c.data) == null ? void 0 : _d.code
        };
      } finally {
        loading.value = false;
      }
    });
    const handleSubmit = () => __async(this, null, function* () {
      if (!formData.name || !formData.phone || !formData.class_id) {
        Message.warning("请填写必填项");
        return;
      }
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        Message.warning("请输入正确的手机号码");
        return;
      }
      submitting.value = true;
      try {
        const res = yield createPromotionSignup(promotion.value.id, formData);
        if (res.success) {
          signupSuccess.value = true;
          formData.name = "";
          formData.unit = "";
          formData.phone = "";
          formData.class_id = "";
        }
      } catch (err) {
        Message.error(err.message || "报名失败");
      } finally {
        submitting.value = false;
      }
    });
    onMounted(() => {
      fetchPromotion();
    });
    return (_ctx, _cache) => {
      const _component_a_skeleton = Skeleton;
      const _component_a_button = Button;
      const _component_a_result = Result;
      const _component_a_tag = Tag;
      const _component_a_divider = Divider;
      const _component_a_input = Input;
      const _component_a_form_item = FormItem;
      const _component_a_option = Option;
      const _component_a_select = Select;
      const _component_a_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [loading.value ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(_component_a_skeleton, {
        active: "",
        paragraph: {
          rows: 10
        }
      })])) : error.value ? (openBlock(), createElementBlock("div", _hoisted_3, [createVNode(_component_a_result, {
        status: error.value.code === "NOT_PUBLISHED" ? "403" : "404",
        title: error.value.message
      }, {
        extra: withCtx(() => [createVNode(_component_a_button, {
          type: "primary",
          onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/"))
        }, {
          default: withCtx(() => [..._cache[6] || (_cache[6] = [createTextVNode("返回首页", -1)])]),
          _: 1
        })]),
        _: 1
      }, 8, ["status", "title"])])) : promotion.value ? (openBlock(), createElementBlock("div", _hoisted_4, [createBaseVNode("div", _hoisted_5, [createBaseVNode("h1", _hoisted_6, toDisplayString(promotion.value.title), 1), createBaseVNode("div", _hoisted_7, [createVNode(_component_a_tag, {
        color: getStatusColor(promotion.value.status)
      }, {
        default: withCtx(() => [createTextVNode(toDisplayString(getStatusText(promotion.value.status)), 1)]),
        _: 1
      }, 8, ["color"]), createBaseVNode("span", _hoisted_8, "发布时间：" + toDisplayString(formatDate(promotion.value.created_at)), 1)])]), createVNode(SafeHtml, {
        html: promotion.value.content,
        class: "promotion-content"
      }, null, 8, ["html"]), promotion.value.enable_signup ? (openBlock(), createElementBlock("div", _hoisted_9, [signupSuccess.value ? (openBlock(), createElementBlock("div", _hoisted_10, [createVNode(_component_a_divider), createVNode(_component_a_result, {
        status: "success",
        title: "报名成功！",
        "sub-title": "我们会通过手机号与您联系，请保持电话畅通"
      }, {
        extra: withCtx(() => [createVNode(_component_a_button, {
          type: "primary",
          onClick: _cache[1] || (_cache[1] = ($event) => signupSuccess.value = false)
        }, {
          default: withCtx(() => [..._cache[7] || (_cache[7] = [createTextVNode("继续报名", -1)])]),
          _: 1
        })]),
        _: 1
      })])) : promotion.value.status === "published" && !promotion.value.signup_ended ? (openBlock(), createElementBlock("div", _hoisted_11, [createVNode(_component_a_divider), _cache[9] || (_cache[9] = createBaseVNode("div", {
        class: "signup-header"
      }, [createBaseVNode("h3", null, "报名信息"), createBaseVNode("p", {
        class: "signup-desc"
      }, "请填写以下信息完成报名")], -1)), createVNode(_component_a_form, {
        model: formData,
        layout: "vertical",
        class: "signup-form"
      }, {
        default: withCtx(() => [createVNode(_component_a_form_item, {
          label: "姓名",
          required: ""
        }, {
          default: withCtx(() => [createVNode(_component_a_input, {
            modelValue: formData.name,
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => formData.name = $event),
            placeholder: "请输入您的姓名",
            size: "large"
          }, null, 8, ["modelValue"])]),
          _: 1
        }), createVNode(_component_a_form_item, {
          label: "单位"
        }, {
          default: withCtx(() => [createVNode(_component_a_input, {
            modelValue: formData.unit,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => formData.unit = $event),
            placeholder: "请输入您的单位（选填）",
            size: "large"
          }, null, 8, ["modelValue"])]),
          _: 1
        }), createVNode(_component_a_form_item, {
          label: "手机号码",
          required: ""
        }, {
          default: withCtx(() => [createVNode(_component_a_input, {
            modelValue: formData.phone,
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => formData.phone = $event),
            placeholder: "请输入您的手机号码",
            size: "large"
          }, null, 8, ["modelValue"])]),
          _: 1
        }), createVNode(_component_a_form_item, {
          label: "报名班次",
          required: ""
        }, {
          default: withCtx(() => [createVNode(_component_a_select, {
            modelValue: formData.class_id,
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => formData.class_id = $event),
            placeholder: "请选择报名班次",
            size: "large"
          }, {
            default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(availableClasses.value, (cls) => {
              return openBlock(), createBlock(_component_a_option, {
                key: cls.id,
                value: cls.id,
                disabled: cls.max_count && cls.current_count >= cls.max_count
              }, {
                default: withCtx(() => [createTextVNode(toDisplayString(cls.name) + " ", 1), cls.max_count ? (openBlock(), createElementBlock("span", _hoisted_12, " (" + toDisplayString(cls.current_count || 0) + "/" + toDisplayString(cls.max_count) + ") ", 1)) : createCommentVNode("", true), cls.max_count && cls.current_count >= cls.max_count ? (openBlock(), createElementBlock("span", _hoisted_13, "已满")) : createCommentVNode("", true)]),
                _: 2
              }, 1032, ["value", "disabled"]);
            }), 128))]),
            _: 1
          }, 8, ["modelValue"])]),
          _: 1
        }), createVNode(_component_a_form_item, null, {
          default: withCtx(() => [createVNode(_component_a_button, {
            type: "primary",
            size: "large",
            block: "",
            loading: submitting.value,
            onClick: handleSubmit
          }, {
            default: withCtx(() => [..._cache[8] || (_cache[8] = [createTextVNode(" 立即报名 ", -1)])]),
            _: 1
          }, 8, ["loading"])]),
          _: 1
        })]),
        _: 1
      }, 8, ["model"])])) : promotion.value.signup_ended ? (openBlock(), createElementBlock("div", _hoisted_14, [createVNode(_component_a_divider), createVNode(_component_a_result, {
        status: "info",
        title: "报名已截止"
      }, {
        subtitle: withCtx(() => [..._cache[10] || (_cache[10] = [createTextVNode("该项目的报名已经结束，感谢您的关注", -1)])]),
        _: 1
      })])) : promotion.value.status === "archived" ? (openBlock(), createElementBlock("div", _hoisted_15, [createVNode(_component_a_divider), createVNode(_component_a_result, {
        status: "info",
        title: "项目已结束报名"
      }, {
        subtitle: withCtx(() => [..._cache[11] || (_cache[11] = [createTextVNode("该项目已归档，不再接受报名", -1)])]),
        _: 1
      })])) : createCommentVNode("", true)])) : createCommentVNode("", true)])) : createCommentVNode("", true)]);
    };
  }
};
const PromotionPublic = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3d43d37d"]]);
export {
  PromotionPublic as default
};
