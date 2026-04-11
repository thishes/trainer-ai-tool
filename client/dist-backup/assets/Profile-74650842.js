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
import { a as getUserInfo, x as updateUser, a0 as changePassword } from "./index-bbe34993.js";
/* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                *//* empty css                */import { _ as _export_sfc, u as useRouter, c as computed, o as onMounted, a as openBlock, b as createElementBlock, g as createVNode, f as withCtx, r as ref, M as Message, U as Tabs, d as createBaseVNode, n as normalizeStyle, j as createTextVNode, t as toDisplayString, k as createCommentVNode, e as createBlock, i as Modal, az as PageHeader, ah as Avatar, m as FormItem, J as Col, I as Input, O as Option, N as Select, R as Row, ai as Divider, B as Button, G as Space, h as Form, C as Card, T as TabPane, p as InputPassword, L as Alert } from "./main-d1235cdf.js";
const index = "";
const Profile_vue_vue_type_style_index_0_scoped_21cb36b0_lang = "";
const _hoisted_1 = {
  class: "profile-page"
};
const _hoisted_2 = {
  class: "avatar-upload"
};
const _hoisted_3 = {
  key: 0,
  class: "password-strength"
};
const _hoisted_4 = {
  class: "strength-bar"
};
const _sfc_main = {
  __name: "Profile",
  setup(__props) {
    const router = useRouter();
    const activeTab = ref("basic");
    const loading = ref(true);
    const saving = ref(false);
    const changingPwd = ref(false);
    const profileForm = ref({
      username: "",
      role: "trainer",
      phone: "",
      avatar: "",
      id: 0
    });
    const passwordForm = ref({
      oldPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    const passwordStrength = ref({
      percent: 0,
      text: "",
      color: "#999"
    });
    const avatarColor = computed(() => {
      var _a;
      const colors = ["#165DFF", "#0FC6C2", "#F53F3F", "#F7BA1E", "#722ED1", "#00B42A"];
      const index2 = ((_a = profileForm.value.username) == null ? void 0 : _a.charCodeAt(0)) % colors.length || 0;
      return colors[index2];
    });
    const canChangePassword = computed(() => {
      return passwordForm.value.oldPassword && passwordForm.value.newPassword && passwordForm.value.newPassword.length >= 6 && passwordForm.value.newPassword === passwordForm.value.confirmPassword;
    });
    const goBack = () => {
      router.back();
    };
    const resetForm = () => {
      loadUserInfo();
      Message.success("已重置表单");
    };
    const loadUserInfo = () => __async(this, null, function* () {
      loading.value = true;
      try {
        const res = yield getUserInfo();
        if (res.data) {
          profileForm.value = __spreadValues({}, res.data);
        }
      } catch (e) {
        console.error("加载用户信息失败:", e);
        Message.error("加载用户信息失败，请刷新页面重试");
      } finally {
        loading.value = false;
      }
    });
    const saveProfile = () => {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!profileForm.value.phone) {
        Message.warning("请输入手机号");
        return;
      }
      if (!phoneRegex.test(profileForm.value.phone)) {
        Message.warning("手机号格式不正确，请输入 11 位手机号");
        return;
      }
      Modal.confirm({
        title: "确认修改",
        content: "确定要修改手机号吗？修改后需要使用新手机号登录。",
        okText: "确认修改",
        cancelText: "取消",
        onOk: () => __async(this, null, function* () {
          var _a, _b;
          saving.value = true;
          try {
            const res = yield updateUser(profileForm.value.id, {
              phone: profileForm.value.phone
            });
            if (res.success) {
              Message.success("保存成功");
              localStorage.setItem("user", JSON.stringify({
                id: profileForm.value.id,
                role: profileForm.value.role
              }));
            } else {
              if (res.message && res.message.includes("超级管理员")) {
                Message.warning("超级管理员信息不可修改");
              } else {
                Message.error(res.message || "保存失败");
              }
            }
          } catch (e) {
            console.error("保存失败:", e);
            if (e.response && e.response.status === 403) {
              const errorMsg = ((_a = e.response.data) == null ? void 0 : _a.message) || ((_b = e.response.data) == null ? void 0 : _b.error) || "无权限操作";
              if (errorMsg.includes("超级管理员")) {
                Message.warning("超级管理员信息不可修改");
              } else {
                Message.warning(errorMsg);
              }
            } else {
              Message.error("保存失败，请稍后重试");
            }
          } finally {
            saving.value = false;
          }
        })
      });
    };
    const checkPasswordStrength = () => {
      const pwd = passwordForm.value.newPassword;
      if (!pwd) {
        passwordStrength.value = {
          percent: 0,
          text: "",
          color: "#999"
        };
        return;
      }
      let score = 0;
      if (pwd.length >= 6)
        score += 1;
      if (pwd.length >= 8)
        score += 1;
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd))
        score += 1;
      if (/\d/.test(pwd))
        score += 1;
      if (/[^a-zA-Z0-9]/.test(pwd))
        score += 1;
      const levels = [{
        percent: 20,
        text: "太弱",
        color: "#F53F3F"
      }, {
        percent: 40,
        text: "弱",
        color: "#F7BA1E"
      }, {
        percent: 60,
        text: "一般",
        color: "#165DFF"
      }, {
        percent: 80,
        text: "强",
        color: "#00B42A"
      }, {
        percent: 100,
        text: "非常强",
        color: "#00B42A"
      }];
      passwordStrength.value = levels[Math.min(score, 4)];
    };
    const changePassword$1 = () => {
      if (!canChangePassword.value) {
        return;
      }
      Modal.confirm({
        title: "确认修改密码",
        content: "确定要修改密码吗？修改后需要重新登录。",
        okText: "确认修改",
        cancelText: "取消",
        onOk: () => __async(this, null, function* () {
          changingPwd.value = true;
          try {
            const res = yield changePassword({
              oldPassword: passwordForm.value.oldPassword,
              newPassword: passwordForm.value.newPassword
            });
            if (res.success) {
              localStorage.removeItem("loggedIn");
              localStorage.removeItem("user");
              Message.success("密码修改成功，请重新登录");
              passwordForm.value = {
                oldPassword: "",
                newPassword: "",
                confirmPassword: ""
              };
              setTimeout(() => {
                window.location.href = "/login";
              }, 1500);
            } else {
              Message.error(res.message || "密码修改失败");
            }
          } catch (e) {
            console.error("密码修改失败:", e);
            Message.error("密码修改失败，请检查当前密码是否正确");
          } finally {
            changingPwd.value = false;
          }
        })
      });
    };
    onMounted(() => {
      loadUserInfo();
    });
    return (_ctx, _cache) => {
      const _component_a_page_header = PageHeader;
      const _component_a_avatar = Avatar;
      const _component_a_form_item = FormItem;
      const _component_a_col = Col;
      const _component_a_input = Input;
      const _component_a_option = Option;
      const _component_a_select = Select;
      const _component_a_row = Row;
      const _component_a_divider = Divider;
      const _component_a_button = Button;
      const _component_a_space = Space;
      const _component_a_form = Form;
      const _component_a_card = Card;
      const _component_a_tab_pane = TabPane;
      const _component_a_input_password = InputPassword;
      const _component_a_alert = Alert;
      const _component_a_tabs = Tabs;
      return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(_component_a_page_header, {
        title: "用户中心",
        onBack: goBack
      }), createVNode(_component_a_tabs, {
        activeKey: activeTab.value,
        "onUpdate:activeKey": _cache[6] || (_cache[6] = ($event) => activeTab.value = $event),
        class: "profile-tabs"
      }, {
        default: withCtx(() => [createVNode(_component_a_tab_pane, {
          key: "basic",
          title: "基本信息"
        }, {
          default: withCtx(() => [createVNode(_component_a_card, {
            class: "profile-card",
            bordered: false
          }, {
            default: withCtx(() => [createVNode(_component_a_form, {
              model: profileForm.value,
              layout: "vertical",
              onSubmit: saveProfile
            }, {
              default: withCtx(() => [createVNode(_component_a_row, {
                gutter: 24
              }, {
                default: withCtx(() => [createVNode(_component_a_col, {
                  span: 8
                }, {
                  default: withCtx(() => [createVNode(_component_a_form_item, {
                    label: "头像"
                  }, {
                    default: withCtx(() => [createBaseVNode("div", _hoisted_2, [createVNode(_component_a_avatar, {
                      size: 80,
                      style: normalizeStyle({
                        backgroundColor: avatarColor.value
                      })
                    }, {
                      default: withCtx(() => {
                        var _a;
                        return [createTextVNode(toDisplayString((_a = profileForm.value.username) == null ? void 0 : _a.charAt(0).toUpperCase()), 1)];
                      }),
                      _: 1
                    }, 8, ["style"]), _cache[7] || (_cache[7] = createBaseVNode("div", {
                      class: "avatar-tip"
                    }, "暂不支持修改", -1))])]),
                    _: 1
                  })]),
                  _: 1
                }), createVNode(_component_a_col, {
                  span: 16
                }, {
                  default: withCtx(() => [createVNode(_component_a_form_item, {
                    label: "用户名"
                  }, {
                    default: withCtx(() => [createVNode(_component_a_input, {
                      modelValue: profileForm.value.username,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => profileForm.value.username = $event),
                      disabled: ""
                    }, null, 8, ["modelValue"]), _cache[8] || (_cache[8] = createBaseVNode("div", {
                      class: "form-tip"
                    }, "用户名不可修改", -1))]),
                    _: 1
                  }), createVNode(_component_a_form_item, {
                    label: "角色"
                  }, {
                    default: withCtx(() => [createVNode(_component_a_select, {
                      modelValue: profileForm.value.role,
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => profileForm.value.role = $event),
                      disabled: ""
                    }, {
                      default: withCtx(() => [createVNode(_component_a_option, {
                        value: "admin"
                      }, {
                        default: withCtx(() => [..._cache[9] || (_cache[9] = [createTextVNode("管理员", -1)])]),
                        _: 1
                      }), createVNode(_component_a_option, {
                        value: "trainer"
                      }, {
                        default: withCtx(() => [..._cache[10] || (_cache[10] = [createTextVNode("培训师", -1)])]),
                        _: 1
                      }), createVNode(_component_a_option, {
                        value: "student"
                      }, {
                        default: withCtx(() => [..._cache[11] || (_cache[11] = [createTextVNode("学员", -1)])]),
                        _: 1
                      })]),
                      _: 1
                    }, 8, ["modelValue"]), _cache[12] || (_cache[12] = createBaseVNode("div", {
                      class: "form-tip"
                    }, "角色不可修改", -1))]),
                    _: 1
                  })]),
                  _: 1
                })]),
                _: 1
              }), createVNode(_component_a_divider), createVNode(_component_a_form_item, {
                label: "手机号"
              }, {
                default: withCtx(() => [createVNode(_component_a_input, {
                  modelValue: profileForm.value.phone,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => profileForm.value.phone = $event),
                  placeholder: "请输入手机号",
                  style: {
                    "max-width": "300px"
                  }
                }, null, 8, ["modelValue"]), _cache[13] || (_cache[13] = createBaseVNode("div", {
                  class: "form-tip"
                }, "用于接收通知和找回密码", -1))]),
                _: 1
              }), createVNode(_component_a_form_item, null, {
                default: withCtx(() => [createVNode(_component_a_space, null, {
                  default: withCtx(() => [createVNode(_component_a_button, {
                    type: "primary",
                    "html-type": "submit",
                    loading: saving.value
                  }, {
                    default: withCtx(() => [createTextVNode(toDisplayString(saving.value ? "保存中..." : "保存修改"), 1)]),
                    _: 1
                  }, 8, ["loading"]), createVNode(_component_a_button, {
                    onClick: resetForm
                  }, {
                    default: withCtx(() => [..._cache[14] || (_cache[14] = [createTextVNode("重置", -1)])]),
                    _: 1
                  })]),
                  _: 1
                })]),
                _: 1
              })]),
              _: 1
            }, 8, ["model"])]),
            _: 1
          })]),
          _: 1
        }), createVNode(_component_a_tab_pane, {
          key: "security",
          title: "安全中心"
        }, {
          default: withCtx(() => [createVNode(_component_a_card, {
            class: "profile-card",
            bordered: false
          }, {
            default: withCtx(() => [createVNode(_component_a_form, {
              model: passwordForm.value,
              layout: "vertical",
              onSubmit: changePassword$1
            }, {
              default: withCtx(() => [createVNode(_component_a_form_item, {
                label: "当前密码",
                required: ""
              }, {
                default: withCtx(() => [createVNode(_component_a_input_password, {
                  modelValue: passwordForm.value.oldPassword,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => passwordForm.value.oldPassword = $event),
                  placeholder: "请输入当前密码",
                  style: {
                    "max-width": "300px"
                  }
                }, null, 8, ["modelValue"])]),
                _: 1
              }), createVNode(_component_a_form_item, {
                label: "新密码",
                required: ""
              }, {
                default: withCtx(() => [createVNode(_component_a_input_password, {
                  modelValue: passwordForm.value.newPassword,
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => passwordForm.value.newPassword = $event),
                  placeholder: "请输入新密码（至少 6 位）",
                  onInput: checkPasswordStrength,
                  style: {
                    "max-width": "300px"
                  }
                }, null, 8, ["modelValue"]), passwordForm.value.newPassword ? (openBlock(), createElementBlock("div", _hoisted_3, [createBaseVNode("div", _hoisted_4, [createBaseVNode("div", {
                  class: "strength-fill",
                  style: normalizeStyle({
                    width: passwordStrength.value.percent + "%",
                    backgroundColor: passwordStrength.value.color
                  })
                }, null, 4)]), createBaseVNode("span", {
                  style: normalizeStyle({
                    color: passwordStrength.value.color
                  })
                }, toDisplayString(passwordStrength.value.text), 5)])) : createCommentVNode("", true), _cache[15] || (_cache[15] = createBaseVNode("div", {
                  class: "form-tip"
                }, "密码长度至少 6 位，建议包含大小写字母、数字和特殊字符", -1))]),
                _: 1
              }), createVNode(_component_a_form_item, {
                label: "确认新密码",
                required: ""
              }, {
                default: withCtx(() => [createVNode(_component_a_input_password, {
                  modelValue: passwordForm.value.confirmPassword,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => passwordForm.value.confirmPassword = $event),
                  placeholder: "请再次输入新密码",
                  style: {
                    "max-width": "300px"
                  }
                }, null, 8, ["modelValue"])]),
                _: 1
              }), canChangePassword.value ? (openBlock(), createBlock(_component_a_alert, {
                key: 0,
                type: "info",
                style: {
                  "max-width": "300px",
                  "margin-bottom": "16px"
                }
              }, {
                default: withCtx(() => [..._cache[16] || (_cache[16] = [createTextVNode(" 修改密码后需要重新登录 ", -1)])]),
                _: 1
              })) : createCommentVNode("", true), createVNode(_component_a_form_item, null, {
                default: withCtx(() => [createVNode(_component_a_button, {
                  type: "primary",
                  "html-type": "submit",
                  loading: changingPwd.value,
                  disabled: !canChangePassword.value
                }, {
                  default: withCtx(() => [createTextVNode(toDisplayString(changingPwd.value ? "修改中..." : "修改密码"), 1)]),
                  _: 1
                }, 8, ["loading", "disabled"])]),
                _: 1
              })]),
              _: 1
            }, 8, ["model"])]),
            _: 1
          })]),
          _: 1
        })]),
        _: 1
      }, 8, ["activeKey"])]);
    };
  }
};
const Profile = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-21cb36b0"]]);
export {
  Profile as default
};
