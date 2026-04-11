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
import { g as getCaptcha, l as login, r as register } from "./index-bbe34993.js";
/* empty css                *//* empty css                *//* empty css                */import { _ as _export_sfc, u as useRouter, c as computed, o as onMounted, w as watch, a as openBlock, b as createElementBlock, d as createBaseVNode, e as createBlock, f as withCtx, F as Fragment, g as createVNode, t as toDisplayString, r as ref, M as Message, S as Skeleton, h as Form, i as Modal, j as createTextVNode, n as normalizeStyle, k as createCommentVNode, l as SkeletonShape, I as Input, m as FormItem, p as InputPassword, B as Button } from "./main-d1235cdf.js";
import { A as APP_VERSION, _ as _imports_0 } from "./logo-3a011774.js";
const Login_vue_vue_type_style_index_0_scoped_9bfd30bf_lang = "";
const _sfc_main = {
  name: "Login",
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const pageLoading = ref(true);
    const showRegister = ref(false);
    const form = ref({
      username: "",
      password: "",
      captchaCode: "",
      captchaId: ""
    });
    const registerForm = ref({
      username: "",
      password: "",
      phone: "",
      captchaCode: "",
      captchaId: ""
    });
    const captchaDisplay = ref("------");
    const registerCaptchaDisplay = ref("------");
    const captchaSvg = ref("");
    const registerCaptchaSvg = ref("");
    const passwordStrength = computed(() => {
      const pwd = registerForm.value.password;
      if (!pwd)
        return {
          percent: 0,
          label: "",
          color: "#c9cdd4"
        };
      let score = 0;
      if (pwd.length >= 6)
        score++;
      if (pwd.length >= 10)
        score++;
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd))
        score++;
      if (/\d/.test(pwd))
        score++;
      if (/[^a-zA-Z0-9]/.test(pwd))
        score++;
      const levels = [{
        percent: 20,
        label: "非常弱",
        color: "#f53f3f"
      }, {
        percent: 40,
        label: "弱",
        color: "#ff7d00"
      }, {
        percent: 60,
        label: "一般",
        color: "#ffb400"
      }, {
        percent: 80,
        label: "强",
        color: "#00b42a"
      }, {
        percent: 100,
        label: "非常强",
        color: "#009a29"
      }];
      return levels[Math.min(score, 4)];
    });
    const onRegisterPasswordInput = () => {
    };
    const refreshCaptcha = () => __async(this, null, function* () {
      try {
        const res = yield getCaptcha();
        if (res.data && res.data.captchaId) {
          form.value.captchaId = res.data.captchaId;
          if (res.data.svg) {
            captchaSvg.value = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(res.data.svg)));
            captchaDisplay.value = "";
          } else {
            captchaSvg.value = "";
            captchaDisplay.value = "------";
          }
        }
      } catch (e) {
        console.error("获取验证码失败", e);
      }
    });
    const refreshRegisterCaptcha = () => __async(this, null, function* () {
      try {
        const res = yield getCaptcha();
        if (res.data && res.data.captchaId) {
          registerForm.value.captchaId = res.data.captchaId;
          if (res.data.svg) {
            registerCaptchaSvg.value = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(res.data.svg)));
            registerCaptchaDisplay.value = "";
          } else {
            registerCaptchaSvg.value = "";
            registerCaptchaDisplay.value = "------";
          }
        }
      } catch (e) {
        console.error("获取验证码失败", e);
      }
    });
    const handleLogin = () => __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f;
      loading.value = true;
      try {
        const res = yield login(form.value);
        console.log("[Login] Response:", res);
        console.log("[Login] res.data:", res == null ? void 0 : res.data);
        console.log("[Login] res.data.user:", (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.user);
        if ((_b = res == null ? void 0 : res.data) == null ? void 0 : _b.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          localStorage.setItem("loggedIn", "true");
          Message.success("登录成功");
          router.push("/dashboard");
        } else {
          console.error("[Login] No user in response:", res);
          Message.error("登录响应异常");
        }
      } catch (error) {
        console.error("[Login] Error:", error);
        const msg = ((_d = (_c = error.response) == null ? void 0 : _c.data) == null ? void 0 : _d.message) || error.message || "登录失败";
        const details = (_f = (_e = error.response) == null ? void 0 : _e.data) == null ? void 0 : _f.details;
        if (details && details.length > 0) {
          Message.error(details.map((d) => d.message).join("; "));
        } else {
          Message.error(msg);
        }
        form.value.captchaCode = "";
        refreshCaptcha();
      } finally {
        loading.value = false;
      }
    });
    const handleRegister = (done) => {
      (() => __async(this, null, function* () {
        var _a, _b;
        if (!registerForm.value.username || !registerForm.value.password) {
          Message.warning("请输入用户名和密码");
          done(false);
          return;
        }
        if (!registerForm.value.captchaCode) {
          Message.warning("请输入验证码");
          done(false);
          return;
        }
        loading.value = true;
        try {
          yield register(registerForm.value);
          Message.success("注册成功，请登录");
          showRegister.value = false;
          form.value.username = registerForm.value.username;
          registerForm.value = {
            username: "",
            password: "",
            phone: "",
            captchaCode: "",
            captchaId: ""
          };
          done(true);
        } catch (error) {
          Message.error(((_b = (_a = error.response) == null ? void 0 : _a.data) == null ? void 0 : _b.message) || error.message || "注册失败");
          registerForm.value.captchaCode = "";
          refreshRegisterCaptcha();
          done(false);
        } finally {
          loading.value = false;
        }
      }))();
    };
    onMounted(() => {
      refreshCaptcha();
      pageLoading.value = false;
    });
    watch(showRegister, (val) => {
      if (val && !registerCaptchaSvg.value && registerCaptchaDisplay.value === "------") {
        refreshRegisterCaptcha();
      }
    });
    return {
      loading,
      pageLoading,
      showRegister,
      form,
      registerForm,
      handleLogin,
      handleRegister,
      APP_VERSION,
      captchaDisplay,
      registerCaptchaDisplay,
      captchaSvg,
      registerCaptchaSvg,
      refreshCaptcha,
      refreshRegisterCaptcha,
      passwordStrength,
      onRegisterPasswordInput
    };
  }
};
const _hoisted_1 = {
  class: "login-container"
};
const _hoisted_2 = {
  class: "login-box"
};
const _hoisted_3 = {
  style: {
    "text-align": "center",
    "padding": "40px 0"
  }
};
const _hoisted_4 = {
  class: "captcha-wrapper"
};
const _hoisted_5 = ["src"];
const _hoisted_6 = {
  key: 1
};
const _hoisted_7 = {
  class: "login-register-link"
};
const _hoisted_8 = {
  class: "login-footer"
};
const _hoisted_9 = {
  key: 0,
  class: "password-strength"
};
const _hoisted_10 = {
  class: "strength-bar"
};
const _hoisted_11 = {
  class: "captcha-wrapper"
};
const _hoisted_12 = ["src"];
const _hoisted_13 = {
  key: 1
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_a_skeleton_shape = SkeletonShape;
  const _component_a_skeleton = Skeleton;
  const _component_a_input = Input;
  const _component_a_form_item = FormItem;
  const _component_a_input_password = InputPassword;
  const _component_a_button = Button;
  const _component_a_form = Form;
  const _component_a_modal = Modal;
  return openBlock(), createElementBlock("div", _hoisted_1, [createBaseVNode("div", _hoisted_2, [$setup.pageLoading ? (openBlock(), createBlock(_component_a_skeleton, {
    key: 0,
    animation: true
  }, {
    default: withCtx(() => [createBaseVNode("div", _hoisted_3, [createVNode(_component_a_skeleton_shape, {
      style: {
        "width": "60px",
        "height": "60px",
        "border-radius": "50%",
        "margin": "0 auto 20px"
      }
    }), createVNode(_component_a_skeleton_shape, {
      style: {
        "width": "200px",
        "height": "32px",
        "margin": "0 auto 10px"
      }
    }), createVNode(_component_a_skeleton_shape, {
      style: {
        "width": "150px",
        "height": "20px",
        "margin": "0 auto"
      }
    })])]),
    _: 1
  })) : (openBlock(), createElementBlock(Fragment, {
    key: 1
  }, [_cache[12] || (_cache[12] = createBaseVNode("div", {
    class: "login-icon"
  }, [createBaseVNode("img", {
    src: _imports_0,
    alt: "logo",
    style: {
      "width": "40px",
      "height": "40px",
      "object-fit": "contain"
    }
  })], -1)), _cache[13] || (_cache[13] = createBaseVNode("h1", null, "培训师小助手", -1)), _cache[14] || (_cache[14] = createBaseVNode("p", {
    class: "login-subtitle"
  }, "登录感受教学数字化", -1))], 64)), createVNode(_component_a_form, {
    model: $setup.form,
    onSubmitSuccess: $setup.handleLogin
  }, {
    default: withCtx(() => [createVNode(_component_a_form_item, {
      field: "username",
      rules: [{
        required: true,
        message: "请输入用户名"
      }]
    }, {
      default: withCtx(() => [createVNode(_component_a_input, {
        modelValue: $setup.form.username,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.username = $event),
        placeholder: "用户名",
        size: "large"
      }, {
        prefix: withCtx(() => [..._cache[15] || (_cache[15] = [createBaseVNode("svg", {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          width: "16",
          height: "16"
        }, [createBaseVNode("path", {
          d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        }), createBaseVNode("circle", {
          cx: "12",
          cy: "7",
          r: "4"
        })], -1)])]),
        _: 1
      }, 8, ["modelValue"])]),
      _: 1
    }), createVNode(_component_a_form_item, {
      field: "password",
      rules: [{
        required: true,
        message: "请输入密码"
      }, {
        minLength: 6,
        message: "密码至少6位"
      }]
    }, {
      default: withCtx(() => [createVNode(_component_a_input_password, {
        modelValue: $setup.form.password,
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.password = $event),
        placeholder: "密码",
        size: "large"
      }, {
        prefix: withCtx(() => [..._cache[16] || (_cache[16] = [createBaseVNode("svg", {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          width: "16",
          height: "16"
        }, [createBaseVNode("rect", {
          x: "3",
          y: "11",
          width: "18",
          height: "11",
          rx: "2",
          ry: "2"
        }), createBaseVNode("path", {
          d: "M7 11V7a5 5 0 0 1 10 0v4"
        })], -1)])]),
        _: 1
      }, 8, ["modelValue"])]),
      _: 1
    }), createVNode(_component_a_form_item, {
      field: "captchaCode",
      rules: [{
        required: true,
        message: "请输入验证码"
      }]
    }, {
      default: withCtx(() => [createBaseVNode("div", _hoisted_4, [createVNode(_component_a_input, {
        modelValue: $setup.form.captchaCode,
        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.form.captchaCode = $event),
        placeholder: "验证码",
        size: "large",
        class: "captcha-input"
      }, {
        prefix: withCtx(() => [..._cache[17] || (_cache[17] = [createBaseVNode("svg", {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          width: "16",
          height: "16"
        }, [createBaseVNode("rect", {
          x: "3",
          y: "3",
          width: "18",
          height: "18",
          rx: "2",
          ry: "2"
        }), createBaseVNode("circle", {
          cx: "8.5",
          cy: "8.5",
          r: "1.5"
        }), createBaseVNode("polyline", {
          points: "21 15 16 10 5 21"
        })], -1)])]),
        _: 1
      }, 8, ["modelValue"]), createBaseVNode("div", {
        class: "captcha-display",
        onClick: _cache[3] || (_cache[3] = (...args) => $setup.refreshCaptcha && $setup.refreshCaptcha(...args)),
        title: "点击刷新验证码"
      }, [$setup.captchaSvg ? (openBlock(), createElementBlock("img", {
        key: 0,
        src: $setup.captchaSvg,
        alt: "验证码",
        class: "captcha-img"
      }, null, 8, _hoisted_5)) : (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString($setup.captchaDisplay), 1))])])]),
      _: 1
    }), createVNode(_component_a_form_item, null, {
      default: withCtx(() => [createVNode(_component_a_button, {
        type: "primary",
        loading: $setup.loading,
        "html-type": "submit",
        style: {
          "width": "100%",
          "height": "40px",
          "font-size": "15px"
        }
      }, {
        default: withCtx(() => [..._cache[18] || (_cache[18] = [createTextVNode(" 登录 ", -1)])]),
        _: 1
      }, 8, ["loading"])]),
      _: 1
    }), createBaseVNode("div", _hoisted_7, [createVNode(_component_a_button, {
      type: "text",
      size: "small",
      onClick: _cache[4] || (_cache[4] = ($event) => $setup.showRegister = true)
    }, {
      default: withCtx(() => [..._cache[19] || (_cache[19] = [createTextVNode("没有账号？注册", -1)])]),
      _: 1
    })])]),
    _: 1
  }, 8, ["model", "onSubmitSuccess"])]), createBaseVNode("div", _hoisted_8, [createBaseVNode("span", null, "培训师小助手 v" + toDisplayString($setup.APP_VERSION), 1), _cache[20] || (_cache[20] = createBaseVNode("span", {
    class: "divider"
  }, "|", -1)), _cache[21] || (_cache[21] = createBaseVNode("span", null, "© 2026 Thishe. All Rights Reserved.", -1))]), createVNode(_component_a_modal, {
    visible: $setup.showRegister,
    "onUpdate:visible": _cache[10] || (_cache[10] = ($event) => $setup.showRegister = $event),
    title: "注册",
    width: 380,
    onBeforeOk: $setup.handleRegister,
    onCancel: _cache[11] || (_cache[11] = ($event) => $setup.showRegister = false),
    "ok-text": "注册",
    "cancel-text": "取消"
  }, {
    default: withCtx(() => [createVNode(_component_a_form, {
      model: $setup.registerForm,
      layout: "vertical"
    }, {
      default: withCtx(() => [createVNode(_component_a_form_item, {
        label: "用户名",
        rules: [{
          required: true,
          message: "请输入用户名"
        }]
      }, {
        default: withCtx(() => [createVNode(_component_a_input, {
          modelValue: $setup.registerForm.username,
          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.registerForm.username = $event),
          placeholder: "请输入用户名"
        }, null, 8, ["modelValue"])]),
        _: 1
      }), createVNode(_component_a_form_item, {
        label: "密码",
        rules: [{
          required: true,
          message: "请输入密码"
        }]
      }, {
        default: withCtx(() => [createVNode(_component_a_input_password, {
          modelValue: $setup.registerForm.password,
          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.registerForm.password = $event),
          placeholder: "请输入密码（至少6位）",
          onInput: $setup.onRegisterPasswordInput
        }, null, 8, ["modelValue", "onInput"]), $setup.registerForm.password ? (openBlock(), createElementBlock("div", _hoisted_9, [createBaseVNode("div", _hoisted_10, [createBaseVNode("div", {
          class: "strength-fill",
          style: normalizeStyle({
            width: $setup.passwordStrength.percent + "%",
            background: $setup.passwordStrength.color
          })
        }, null, 4)]), createBaseVNode("span", {
          class: "strength-text",
          style: normalizeStyle({
            color: $setup.passwordStrength.color
          })
        }, toDisplayString($setup.passwordStrength.label), 5)])) : createCommentVNode("", true)]),
        _: 1
      }), createVNode(_component_a_form_item, {
        label: "手机号（可选）"
      }, {
        default: withCtx(() => [createVNode(_component_a_input, {
          modelValue: $setup.registerForm.phone,
          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.registerForm.phone = $event),
          placeholder: "请输入手机号"
        }, null, 8, ["modelValue"])]),
        _: 1
      }), createVNode(_component_a_form_item, {
        label: "验证码"
      }, {
        default: withCtx(() => [createBaseVNode("div", _hoisted_11, [createVNode(_component_a_input, {
          modelValue: $setup.registerForm.captchaCode,
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.registerForm.captchaCode = $event),
          placeholder: "验证码",
          class: "captcha-input"
        }, null, 8, ["modelValue"]), createBaseVNode("div", {
          class: "captcha-display",
          onClick: _cache[9] || (_cache[9] = (...args) => $setup.refreshRegisterCaptcha && $setup.refreshRegisterCaptcha(...args))
        }, [$setup.registerCaptchaSvg ? (openBlock(), createElementBlock("img", {
          key: 0,
          src: $setup.registerCaptchaSvg,
          alt: "验证码",
          class: "captcha-img"
        }, null, 8, _hoisted_12)) : (openBlock(), createElementBlock("span", _hoisted_13, toDisplayString($setup.registerCaptchaDisplay), 1))])])]),
        _: 1
      })]),
      _: 1
    }, 8, ["model"])]),
    _: 1
  }, 8, ["visible", "onBeforeOk"])]);
}
const Login = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-9bfd30bf"]]);
export {
  Login as default
};
