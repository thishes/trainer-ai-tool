<template>
  <a-modal
    :visible="visible"
    title="报名配置"
    :width="720"
    :mask-closable="false"
    :footer="null"
    class="signup-config-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <a-form :model="form" layout="vertical">
      <!-- 基础设置 -->
      <a-divider orientation="left">基础设置</a-divider>

      <a-form-item label="开启报名">
        <a-switch v-model="form.enable_signup" />
      </a-form-item>

      <template v-if="form.enable_signup">
        <a-form-item label="报名截止时间">
          <a-date-picker
            v-model="form.signup_config.deadline"
            show-time
            format="YYYY-MM-DD HH:mm"
            placeholder="不设置则长期有效"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="需要审核">
          <a-switch v-model="form.signup_config.require_approval" />
          <span class="form-hint">开启后报名需要管理员审核通过才生效</span>
        </a-form-item>

        <!-- 班次设置 -->
        <a-divider orientation="left">班次设置</a-divider>

        <div class="classes-section">
          <div v-for="(cls, index) in form.signup_config.classes" :key="index" class="class-item">
            <a-input v-model="cls.name" placeholder="班次名称" style="width: 200px" />
            <a-input-number v-model="cls.max_count" placeholder="名额限制" :min="1" style="width: 120px" />
            <a-button type="text" status="danger" @click="removeClass(index)">
              <icon-delete />
            </a-button>
          </div>
          <a-button type="dashed" @click="addClass" style="width: 100%">
            <icon-plus />
            添加班次
          </a-button>
        </div>

        <!-- 自定义表单字段 -->
        <a-divider orientation="left">
          自定义表单字段
          <a-tooltip content="除了姓名、手机号、班次外，额外收集的信息">
            <icon-question-circle />
          </a-tooltip>
        </a-divider>

        <div class="fields-section">
          <div v-for="(field, index) in form.signup_config.fields" :key="index" class="field-item">
            <div class="field-header">
              <span class="field-title">字段 {{ index + 1 }}</span>
              <a-button type="text" status="danger" size="small" @click="removeField(index)">
                <icon-delete />
              </a-button>
            </div>
            <div class="field-content">
              <a-input v-model="field.label" placeholder="字段标签（如：单位、职位）" />
              <a-input v-model="field.name" placeholder="字段名（英文，如：company）" />
              <a-select v-model="field.type" placeholder="字段类型">
                <a-option value="text">文本</a-option>
                <a-option value="textarea">多行文本</a-option>
                <a-option value="number">数字</a-option>
                <a-option value="select">下拉选择</a-option>
                <a-option value="radio">单选</a-option>
                <a-option value="checkbox">多选</a-option>
                <a-option value="date">日期</a-option>
                <a-option value="email">邮箱</a-option>
              </a-select>
              <a-checkbox v-model="field.required">必填</a-checkbox>
              <template v-if="['select', 'radio', 'checkbox'].includes(field.type)">
                <a-textarea
                  v-model="field.options"
                  placeholder="选项（每行一个）"
                  :auto-size="{ minRows: 2, maxRows: 4 }"
                />
              </template>
            </div>
          </div>
          <a-button type="dashed" @click="addField" style="width: 100%">
            <icon-plus />
            添加字段
          </a-button>
        </div>

        <!-- 自动回复设置 -->
        <a-divider orientation="left">自动回复</a-divider>

        <a-form-item>
          <a-checkbox v-model="form.signup_config.auto_reply.enabled">
            启用报名成功自动回复
          </a-checkbox>
        </a-form-item>

        <template v-if="form.signup_config.auto_reply.enabled">
          <a-form-item label="回复标题">
            <a-input v-model="form.signup_config.auto_reply.title" placeholder="报名成功！" />
          </a-form-item>
          <a-form-item label="回复内容">
            <a-textarea
              v-model="form.signup_config.auto_reply.content"
              placeholder="感谢您的报名，我们会尽快与您联系！"
              :auto-size="{ minRows: 3 }"
            />
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model="form.signup_config.auto_reply.sms_enabled">
              同时发送短信通知
            </a-checkbox>
          </a-form-item>
          <template v-if="form.signup_config.auto_reply.sms_enabled">
            <a-form-item label="短信模板">
              <a-textarea
                v-model="form.signup_config.auto_reply.sms_template"
                placeholder="【培训师小助手】{name}您好，您已成功报名《{promotion_title}》，请留意后续通知。"
                :auto-size="{ minRows: 2 }"
              />
              <span class="form-hint">
                可用变量：{name} 姓名, {promotion_title} 文案标题, {class_name} 班次名称
              </span>
            </a-form-item>
          </template>
        </template>
      </template>

      <div class="form-actions">
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" @click="handleSave" :loading="saving">保存</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus, IconDelete, IconQuestionCircle } from '@arco-design/web-vue/es/icon'
import { updatePromotionSignupConfig } from '@/api'

const props = defineProps({
  visible: Boolean,
  promotion: Object
})

const emit = defineEmits(['update:visible', 'success'])

const saving = ref(false)

const form = reactive({
  enable_signup: false,
  signup_config: {
    require_approval: false,
    max_signups: null,
    deadline: null,
    classes: [],
    fields: [],
    auto_reply: {
      enabled: false,
      title: '报名成功！',
      content: '感谢您的报名，我们会尽快与您联系！',
      sms_enabled: false,
      sms_template: '【培训师小助手】{name}您好，您已成功报名《{promotion_title}》，请留意后续通知。'
    }
  }
})

const addClass = () => {
  form.signup_config.classes.push({
    id: 'class_' + Date.now(),
    name: '',
    max_count: null
  })
}

const removeClass = (index) => {
  form.signup_config.classes.splice(index, 1)
}

const addField = () => {
  form.signup_config.fields.push({
    name: '',
    label: '',
    type: 'text',
    required: false,
    options: ''
  })
}

const removeField = (index) => {
  form.signup_config.fields.splice(index, 1)
}

const handleSave = async () => {
  if (!props.promotion?.id) return

  // 验证班次
  if (form.enable_signup && form.signup_config.classes.length === 0) {
    Message.warning('请至少添加一个班次')
    return
  }

  // 验证自定义字段
  for (const field of form.signup_config.fields) {
    if (!field.name || !field.label) {
      Message.warning('请填写所有自定义字段的名称和标签')
      return
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
      Message.warning(`字段名 "${field.name}" 格式不正确，只能包含字母、数字和下划线`)
      return
    }
  }

  saving.value = true
  try {
    // 处理options为数组
    const config = JSON.parse(JSON.stringify(form.signup_config))
    config.fields = config.fields.map(f => ({
      ...f,
      options: f.options ? f.options.split('\n').filter(Boolean) : undefined
    }))

    await updatePromotionSignupConfig(props.promotion.id, {
      enable_signup: form.enable_signup,
      signup_config: config
    })
    Message.success('保存成功')
    emit('success')
    handleClose()
  } catch (error) {
    Message.error(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (val && props.promotion) {
    const config = props.promotion.signup_config || {}
    form.enable_signup = props.promotion.enable_signup || false
    form.signup_config.require_approval = config.require_approval || false
    form.signup_config.max_signups = config.max_signups || null
    form.signup_config.deadline = config.deadline || null
    form.signup_config.classes = config.classes ? JSON.parse(JSON.stringify(config.classes)) : []

    // 处理自定义字段
    form.signup_config.fields = (config.fields || []).map(f => ({
      ...f,
      options: Array.isArray(f.options) ? f.options.join('\n') : f.options
    }))

    // 处理自动回复
    const autoReply = config.auto_reply || {}
    form.signup_config.auto_reply = {
      enabled: autoReply.enabled || false,
      title: autoReply.title || '报名成功！',
      content: autoReply.content || '感谢您的报名，我们会尽快与您联系！',
      sms_enabled: autoReply.sms_enabled || false,
      sms_template: autoReply.sms_template || '【培训师小助手】{name}您好，您已成功报名《{promotion_title}》，请留意后续通知。'
    }
  }
})
</script>

<style scoped>
.signup-config-dialog :deep(.arco-modal-body) {
  max-height: 70vh;
  overflow-y: auto;
}

.form-hint {
  margin-left: 8px;
  color: var(--color-text-3);
  font-size: 12px;
}

.classes-section {
  margin-bottom: 16px;
}

.class-item {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.fields-section {
  margin-bottom: 16px;
}

.field-item {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.field-title {
  font-weight: 500;
  color: var(--color-text-2);
}

.field-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-2);
}
</style>
