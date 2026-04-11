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
import { ab as getPromotion, ac as signupPromotion } from "./index-bbe34993.js";
/* empty css                *//* empty css                *//* empty css                *//* empty css                */import { _ as _export_sfc, av as useRoute, o as onMounted, an as resolveComponent, a as openBlock, b as createElementBlock, g as createVNode, f as withCtx, r as ref, M as Message, ar as Spin, e as createBlock, j as createTextVNode, d as createBaseVNode, t as toDisplayString, k as createCommentVNode, B as Button, aq as Result, I as Input, m as FormItem, G as Space, h as Form, C as Card } from "./main-d1235cdf.js";
import { S as SafeHtml } from "./SafeHtml-20ee0346.js";
const PromotionView_vue_vue_type_style_index_0_scoped_f307fcb5_lang = "";
const _sfc_main = {
  components: {
    SafeHtml
  },
  name: "PromotionView",
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const notFound = ref(false);
    const loadError = ref(false);
    const promotion = ref(null);
    const showSignupForm = ref(false);
    const signupSuccess = ref(false);
    const submitting = ref(false);
    const signupForm = ref({
      name: "",
      phone: ""
    });
    const loadPromotion = () => __async(this, null, function* () {
      var _a;
      loading.value = true;
      notFound.value = false;
      loadError.value = false;
      try {
        const res = yield getPromotion(route.params.id);
        if (res.data) {
          promotion.value = res.data;
        } else {
          notFound.value = true;
        }
      } catch (e) {
        if (((_a = e.response) == null ? void 0 : _a.status) === 404) {
          notFound.value = true;
        } else {
          loadError.value = true;
        }
      } finally {
        loading.value = false;
      }
    });
    const handleSignup = () => __async(this, null, function* () {
      if (!signupForm.value.name.trim()) {
        Message.warning("请输入姓名");
        return;
      }
      if (!signupForm.value.phone.trim()) {
        Message.warning("请输入手机号");
        return;
      }
      const phoneReg = /^1[3-9]\d{9}$/;
      if (!phoneReg.test(signupForm.value.phone)) {
        Message.warning("请输入正确的手机号");
        return;
      }
      submitting.value = true;
      try {
        yield signupPromotion(route.params.id, signupForm.value);
        signupSuccess.value = true;
        signupForm.value = {
          name: "",
          phone: ""
        };
      } catch (e) {
        Message.error(e.message || "报名失败，请稍后重试");
      } finally {
        submitting.value = false;
      }
    });
    onMounted(() => {
      loadPromotion();
    });
    return {
      loading,
      notFound,
      loadError,
      promotion,
      showSignupForm,
      signupSuccess,
      submitting,
      signupForm,
      loadPromotion,
      handleSignup
    };
  }
};
const _hoisted_1 = {
  class: "promotion-view"
};
const _hoisted_2 = {
  key: 2,
  class: "promotion-content"
};
const _hoisted_3 = {
  class: "promotion-title"
};
const _hoisted_4 = {
  key: 0,
  class: "promotion-action"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_a_button = Button;
  const _component_a_result = Result;
  const _component_SafeHtml = resolveComponent("SafeHtml");
  const _component_a_input = Input;
  const _component_a_form_item = FormItem;
  const _component_a_space = Space;
  const _component_a_form = Form;
  const _component_a_card = Card;
  const _component_a_spin = Spin;
  return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(_component_a_spin, {
    loading: $setup.loading
  }, {
    default: withCtx(() => [$setup.notFound ? (openBlock(), createBlock(_component_a_result, {
      key: 0,
      status: "404",
      title: "文案不存在",
      "sub-title": "该报名文案已下架或不存在"
    }, {
      extra: withCtx(() => [createVNode(_component_a_button, {
        type: "primary",
        onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/"))
      }, {
        default: withCtx(() => [..._cache[6] || (_cache[6] = [createTextVNode("返回首页", -1)])]),
        _: 1
      })]),
      _: 1
    })) : $setup.loadError ? (openBlock(), createBlock(_component_a_result, {
      key: 1,
      status: "error",
      title: "加载失败",
      "sub-title": "请稍后重试"
    }, {
      extra: withCtx(() => [createVNode(_component_a_button, {
        type: "primary",
        onClick: $setup.loadPromotion
      }, {
        default: withCtx(() => [..._cache[7] || (_cache[7] = [createTextVNode("重新加载", -1)])]),
        _: 1
      }, 8, ["onClick"])]),
      _: 1
    })) : $setup.promotion ? (openBlock(), createElementBlock("div", _hoisted_2, [createBaseVNode("h1", _hoisted_3, toDisplayString($setup.promotion.title), 1), createVNode(_component_SafeHtml, {
      html: $setup.promotion.content,
      class: "promotion-body"
    }, null, 8, ["html"]), $setup.promotion.enable_signup ? (openBlock(), createElementBlock("div", _hoisted_4, [!$setup.showSignupForm ? (openBlock(), createBlock(_component_a_button, {
      key: 0,
      type: "primary",
      size: "large",
      onClick: _cache[1] || (_cache[1] = ($event) => $setup.showSignupForm = true)
    }, {
      default: withCtx(() => [..._cache[8] || (_cache[8] = [createTextVNode(" 立即报名 ", -1)])]),
      _: 1
    })) : createCommentVNode("", true), $setup.showSignupForm ? (openBlock(), createBlock(_component_a_card, {
      key: 1,
      class: "signup-card"
    }, {
      default: withCtx(() => [$setup.signupSuccess ? (openBlock(), createBlock(_component_a_result, {
        key: 0,
        status: "success",
        title: "报名成功",
        "sub-title": "我们已收到您的报名信息，请保持手机畅通"
      }, {
        extra: withCtx(() => [createVNode(_component_a_button, {
          type: "primary",
          onClick: _cache[2] || (_cache[2] = ($event) => {
            $setup.showSignupForm = false;
            $setup.signupSuccess = false;
          })
        }, {
          default: withCtx(() => [..._cache[9] || (_cache[9] = [createTextVNode("关闭", -1)])]),
          _: 1
        })]),
        _: 1
      })) : (openBlock(), createBlock(_component_a_form, {
        key: 1,
        model: $setup.signupForm,
        layout: "vertical",
        onSubmit: $setup.handleSignup
      }, {
        default: withCtx(() => [createVNode(_component_a_form_item, {
          label: "姓名",
          required: ""
        }, {
          default: withCtx(() => [createVNode(_component_a_input, {
            modelValue: $setup.signupForm.name,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.signupForm.name = $event),
            placeholder: "请输入您的姓名"
          }, null, 8, ["modelValue"])]),
          _: 1
        }), createVNode(_component_a_form_item, {
          label: "手机号",
          required: ""
        }, {
          default: withCtx(() => [createVNode(_component_a_input, {
            modelValue: $setup.signupForm.phone,
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.signupForm.phone = $event),
            placeholder: "请输入您的手机号"
          }, null, 8, ["modelValue"])]),
          _: 1
        }), createVNode(_component_a_form_item, null, {
          default: withCtx(() => [createVNode(_component_a_space, null, {
            default: withCtx(() => [createVNode(_component_a_button, {
              type: "primary",
              "html-type": "submit",
              loading: $setup.submitting,
              disabled: $setup.submitting
            }, {
              default: withCtx(() => [..._cache[10] || (_cache[10] = [createTextVNode(" 提交报名 ", -1)])]),
              _: 1
            }, 8, ["loading", "disabled"]), createVNode(_component_a_button, {
              onClick: _cache[5] || (_cache[5] = ($event) => $setup.showSignupForm = false)
            }, {
              default: withCtx(() => [..._cache[11] || (_cache[11] = [createTextVNode("取消", -1)])]),
              _: 1
            })]),
            _: 1
          })]),
          _: 1
        })]),
        _: 1
      }, 8, ["model", "onSubmit"]))]),
      _: 1
    })) : createCommentVNode("", true)])) : createCommentVNode("", true)])) : createCommentVNode("", true)]),
    _: 1
  }, 8, ["loading"])]);
}
const PromotionView = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f307fcb5"]]);
export {
  PromotionView as default
};
