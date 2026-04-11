<template>
  <a-modal
    :visible="visible"
    @cancel="handleClose"
    :footer="null"
    :width="1200"
    :mask-closable="true"
    class="preview-dialog"
  >
    <template #title>
      <div class="preview-header">
        <span>文案预览</span>
        <a-tag :color="getStatusColor(promotion?.status)">
          {{ getStatusText(promotion?.status) }}
        </a-tag>
      </div>
    </template>

    <div class="preview-container" v-if="loading">
      <a-skeleton active :paragraph="{ rows: 10 }" />
    </div>

    <div class="preview-container" v-else-if="previewData">
      <!-- 网页版预览 -->
      <div class="preview-section">
        <div class="preview-label">
          <icon-desktop />
          网页版预览
        </div>
        <div class="device-frame desktop">
          <div class="device-header">
            <div class="qrcode-section">
              <img :src="previewData.qr_code" alt="二维码" class="qrcode-img" />
              <div class="qrcode-tip">扫码预览</div>
            </div>
            <div class="url-section">
              <div class="url-label">访问链接</div>
              <div class="url-input-group">
                <a-input
                  :model-value="previewData.public_url"
                  readonly
                  class="url-input"
                />
                <a-button type="primary" @click="copyUrl">
                  <icon-copy />
                  复制
                </a-button>
              </div>
            </div>
          </div>
          <div class="device-content">
            <div class="promotion-title">{{ promotion?.title }}</div>
            <SafeHtml :html="promotion?.content" class="promotion-content" />
            <div class="signup-section" v-if="promotion?.enable_signup && promotion?.status === 'published'">
              <a-button type="primary" size="large" class="signup-btn">
                立即报名
              </a-button>
            </div>
            <div class="signup-ended" v-else-if="promotion?.signup_ended">
              报名已截止
            </div>
          </div>
        </div>
      </div>

      <!-- 手机版预览 -->
      <div class="preview-section">
        <div class="preview-label">
          <icon-mobile />
          手机版预览
        </div>
        <div class="device-frame mobile">
          <div class="device-header mobile-header">
            <div class="qrcode-section">
              <img :src="previewData.qr_code" alt="二维码" class="qrcode-img small" />
              <div class="qrcode-tip">扫码预览</div>
            </div>
            <div class="url-section">
              <div class="url-input-group">
                <a-input
                  :model-value="previewData.public_url"
                  readonly
                  size="small"
                  class="url-input"
                />
                <a-button type="primary" size="small" @click="copyUrl">
                  <icon-copy />
                </a-button>
              </div>
            </div>
          </div>
          <div class="device-content mobile-content">
            <div class="promotion-title">{{ promotion?.title }}</div>
            <SafeHtml :html="promotion?.content" class="promotion-content" />
            <div class="signup-section" v-if="promotion?.enable_signup && promotion?.status === 'published'">
              <a-button type="primary" size="large" block class="signup-btn">
                立即报名
              </a-button>
            </div>
            <div class="signup-ended" v-else-if="promotion?.signup_ended">
              报名已截止
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconDesktop, IconMobile, IconCopy } from '@arco-design/web-vue/es/icon'
import SafeHtml from '@/components/SafeHtml.vue'
import { getPromotionPreview } from '@/api'

const props = defineProps({
  visible: Boolean,
  promotionId: Number
})

const emit = defineEmits(['update:visible'])

const loading = ref(false)
const previewData = ref(null)
const promotion = ref(null)

const getStatusColor = (status) => {
  const colors = {
    draft: 'gray',
    published: 'green',
    archived: 'orange'
  }
  return colors[status] || 'gray'
}

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档'
  }
  return texts[status] || status
}

const fetchPreviewData = async () => {
  if (!props.promotionId) return
  
  loading.value = true
  try {
    const res = await getPromotionPreview(props.promotionId)
    if (res.success) {
      previewData.value = res.data
      promotion.value = res.data.promotion
    }
  } catch (error) {
    Message.error('获取预览数据失败')
  } finally {
    loading.value = false
  }
}

const copyUrl = () => {
  if (!previewData.value?.public_url) return
  
  navigator.clipboard.writeText(previewData.value.public_url).then(() => {
    Message.success('链接已复制')
  }).catch(() => {
    Message.error('复制失败')
  })
}

const handleClose = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (val && props.promotionId) {
    fetchPreviewData()
  }
})
</script>

<style scoped>
.preview-dialog :deep(.arco-modal-body) {
  padding: 0;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-container {
  display: flex;
  gap: 24px;
  padding: 24px;
  min-height: 500px;
}

.preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-1);
  margin-bottom: 16px;
}

.device-frame {
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  overflow: hidden;
  background: #f5f5f5;
}

.device-frame.desktop {
  max-width: 800px;
}

.device-frame.mobile {
  max-width: 375px;
  margin: 0 auto;
}

.device-header {
  background: #fff;
  padding: 16px;
  border-bottom: 1px solid var(--color-border-2);
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-header {
  flex-direction: column;
  padding: 12px;
  gap: 12px;
}

.qrcode-section {
  text-align: center;
}

.qrcode-img {
  width: 120px;
  height: 120px;
  border-radius: 4px;
}

.qrcode-img.small {
  width: 80px;
  height: 80px;
}

.qrcode-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

.url-section {
  flex: 1;
}

.url-label {
  font-size: 14px;
  color: var(--color-text-2);
  margin-bottom: 8px;
}

.url-input-group {
  display: flex;
  gap: 8px;
}

.url-input {
  flex: 1;
}

.device-content {
  background: #fff;
  padding: 24px;
  min-height: 400px;
}

.mobile-content {
  padding: 16px;
}

.promotion-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 16px;
  text-align: center;
}

.mobile-content .promotion-title {
  font-size: 18px;
}

.promotion-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text-1);
}

.promotion-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.signup-section {
  margin-top: 32px;
  text-align: center;
  padding: 24px;
  border-top: 1px solid var(--color-border-2);
}

.signup-btn {
  min-width: 200px;
}

.signup-ended {
  margin-top: 32px;
  text-align: center;
  padding: 24px;
  color: var(--color-text-3);
  font-size: 14px;
  border-top: 1px solid var(--color-border-2);
}

@media (max-width: 1024px) {
  .preview-container {
    flex-direction: column;
  }
}
</style>
