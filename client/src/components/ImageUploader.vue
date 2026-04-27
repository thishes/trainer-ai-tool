<template>
  <div class="image-uploader" :class="{ 'is-dragging': isDragging, 'is-uploading': uploading, 'has-value': modelValue }">
    <div
      class="upload-zone"
      :class="{ 'has-image': previewUrl || modelValue }"
      @click="triggerInput"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div v-if="!previewUrl && !modelValue" class="upload-placeholder">
        <div class="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p class="upload-text">拖拽图片到此处，或 <span class="link">点击上传</span></p>
        <p class="upload-hint">支持 JPG、PNG、WebP，最大 {{ maxSizeMB }}MB，建议尺寸 {{ hintSize }}</p>
      </div>

      <div v-else class="image-preview">
        <img :src="previewUrl || resolveUrl(modelValue)" :alt="alt" @load="onImageLoad" @error="onImageError" />
        <div class="preview-overlay">
          <span v-if="uploading" class="uploading-info">
            <a-spin size="small" />
            {{ uploadProgress }}%
          </span>
          <template v-else>
            <button class="overlay-btn" title="重新上传" @click.stop="triggerInput">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            <button class="overlay-btn danger" title="删除" @click.stop="handleRemove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </template>
        </div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style="display: none"
        @change="onFileChange"
      />
    </div>

    <div v-if="showCrop && cropVisible" class="crop-panel">
      <div class="crop-header">
        <span>裁剪图片</span>
        <div class="crop-actions">
          <a-button size="small" @click="resetCrop">重置</a-button>
          <a-button size="small" type="primary" @click="confirmCrop">确认裁剪</a-button>
          <a-button size="small" @click="cancelCrop">取消</a-button>
        </div>
      </div>
      <div class="crop-container" ref="cropContainerRef">
        <canvas ref="cropCanvasRef" class="crop-canvas" />
        <div class="crop-box" :style="cropBoxStyle" @mousedown.stop="startCropDrag">
          <div class="crop-handle nw" @mousedown.stop.prevent="startResize('nw', $event)"></div>
          <div class="crop-handle ne" @mousedown.stop.prevent="startResize('ne', $event)"></div>
          <div class="crop-handle sw" @mousedown.stop.prevent="startResize('sw', $event)"></div>
          <div class="crop-handle se" @mousedown.stop.prevent="startResize('se', $event)"></div>
          <div class="crop-line-h"></div>
          <div class="crop-line-v"></div>
          <div class="crop-grid"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Message } from '@arco-design/web-vue'
import { uploadImage } from '@/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  alt: { type: String, default: '封面图' },
  maxWidth: { type: Number, default: 1920 },
  maxHeight: { type: Number, default: 1080 },
  quality: { type: Number, default: 0.85 },
  maxSizeMB: { type: Number, default: 5 },
  aspectRatio: { type: Number, default: 0 },
  showCrop: { type: Boolean, default: true },
  hintSize: { type: String, default: '1200×630' }
})

const emit = defineEmits(['update:modelValue', 'change', 'success', 'error'])

const fileInputRef = ref(null)
const previewUrl = ref('')
const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const imageLoaded = ref(false)

const cropVisible = ref(false)
const cropContainerRef = ref(null)
const cropCanvasRef = ref(null)
const cropImage = ref(null)
const cropBox = ref({ x: 0, y: 0, w: 0, h: 0 })
const cropDragging = ref(false)
const cropResizing = ref({ active: false, handle: '', startX: 0, startY: 0, startBox: null })

function triggerInput() {
  if (!uploading.value) fileInputRef.value?.click()
}

function onDragOver(e) {
  isDragging.value = true
}
function onDragLeave() {
  isDragging.value = false
}

function onDrop(e) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) processFile(files[0])
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) processFile(file)
  e.target.value = ''
}

function validateFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    Message.error('仅支持 JPG、PNG、WebP、GIF 格式')
    return false
  }
  if (file.size > props.maxSizeMB * 1024 * 1024) {
    Message.error(`图片大小不能超过 ${props.maxSizeMB}MB`)
    return false
  }
  return true
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        if (width > props.maxWidth || height > props.maxHeight) {
          const ratio = Math.min(props.maxWidth / width, props.maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('压缩失败')); return }
            const compressedFile = new File([blob], file.name, { type: 'image/webp', lastModified: Date.now() })
            resolve({ file: compressedFile, width, height, originalSize: file.size, compressedSize: blob.size })
          },
          'image/webp',
          props.quality
        )
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function processFile(file) {
  if (!validateFile(file)) return

  try {
    const result = await compressImage(file)
    console.log(`[ImageUploader] Compressed: ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.compressedSize / 1024).toFixed(1)}KB (${result.width}×${result.height})`)

    const objectUrl = URL.createObjectURL(result.file)
    previewUrl.value = objectUrl
    cropImage.value = { file: result.file, element: null, naturalWidth: result.width, naturalHeight: result.height }

    if (props.showCrop && props.aspectRatio > 0) {
      await initCrop(objectUrl)
    } else {
      await doUpload(result.file)
    }
  } catch (err) {
    Message.error(err.message || '处理图片失败')
    emit('error', err)
  }
}

function initCrop(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      cropImage.value.element = img
      const container = cropContainerRef.value
      const canvas = cropCanvasRef.value
      if (!container || !canvas) { resolve(); return }

      const maxW = container.clientWidth - 20
      const maxH = 400
      let displayW = img.naturalWidth
      let displayH = img.naturalHeight
      const scale = Math.min(maxW / displayW, maxH / displayH, 1)
      displayW = Math.round(displayW * scale)
      displayH = Math.round(displayH * scale)

      canvas.width = displayW
      canvas.height = displayH
      canvas.style.width = displayW + 'px'
      canvas.style.height = displayH + 'px'

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, displayW, displayH)

      let cw = displayW, ch = displayH
      if (props.aspectRatio > 0) {
        ch = cw / props.aspectRatio
        if (ch > displayH) {
          ch = displayH
          cw = ch * props.aspectRatio
        }
      }

      cropBox.value = {
        x: Math.round((displayW - cw) / 2),
        y: Math.round((displayH - ch) / 2),
        w: Math.round(cw),
        h: Math.round(ch)
      }
      cropVisible.value = true
      resolve()
    }
    img.src = src
  })
}

const cropBoxStyle = computed(() => ({
  left: cropBox.value.x + 'px',
  top: cropBox.value.y + 'px',
  width: cropBox.value.w + 'px',
  height: cropBox.value.h + 'px'
}))

function startCropDrag(e) {
  cropDragging.value = true
  const startX = e.clientX, startY = e.clientY
  const startBox = { ...cropBox.value }
  const onMove = (ev) => {
    const dx = ev.clientX - startX, dy = ev.clientY - startY
    cropBox.value.x = Math.max(0, Math.min(startBox.x + dx, (cropCanvasRef.value?.width || 0) - cropBox.value.w))
    cropBox.value.y = Math.max(0, Math.min(startBox.y + dy, (cropCanvasRef.value?.height || 0) - cropBox.value.h))
  }
  const onUp = () => {
    cropDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function startResize(handle, e) {
  cropResizing.value = { active: true, handle, startX: e.clientX, startY: e.clientY, startBox: { ...cropBox.value } }
  const onMove = (ev) => {
    const r = cropResizing.value
    const dx = ev.clientX - r.startX, dy = ev.clientY - r.startY
    const sb = r.startBox
    const cw = cropCanvasRef.value?.width || 0
    const ch = cropCanvasRef.value?.height || 0
    let nx = sb.x, ny = sb.y, nw = sb.w, nh = sb.h

    if (handle.includes('e')) nw = Math.min(Math.max(sb.w + dx, 40), cw - nx)
    if (handle.includes('w')) { const newW = Math.min(Math.max(sb.w - dx, 40), cw); nx = sb.x + sb.w - newW; nw = newW; }
    if (handle.includes('s')) nh = Math.min(Math.max(sb.h + dy, 40), ch - ny)
    if (handle.includes('n')) { const newH = Math.min(Math.max(sb.h - dy, 40), ch); ny = sb.y + sb.h - newH; nh = newH; }

    if (props.aspectRatio > 0) {
      if (handle === 'se' || handle === 'nw') nh = nw / props.aspectRatio
      else if (handle === 'ne' || handle === 'sw') { const targetW = nh * props.aspectRatio; if (Math.abs(targetW - nw) < 100) nw = targetW }
      if (nh / props.aspectRatio > cw - nx) { nw = cw - nx; nh = nw / props.aspectRatio }
      if (nh > ch - ny) { nh = ch - ny; nw = nh * props.aspectRatio }
    }

    cropBox.value = { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) }
  }
  const onUp = () => {
    cropResizing.value.active = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function resetCrop() {
  if (!cropCanvasRef.value || !cropImage.value?.element) return
  const cw = cropCanvasRef.value.width
  const ch = cropCanvasRef.value.height
  let bw = cw, bh = ch
  if (props.aspectRatio > 0) {
    bh = bw / props.aspectRatio
    if (bh > ch) { bh = ch; bw = bh * props.aspectRatio }
  }
  cropBox.value = { x: Math.round((cw - bw) / 2), y: Math.round((ch - bh) / 2), w: Math.round(bw), h: Math.round(bh) }
}

function cancelCrop() {
  cropVisible.value = false
  cleanupPreview()
}

async function confirmCrop() {
  if (!cropImage.value?.element || !cropCanvasRef.value) return
  const b = cropBox.value
  const canvas = cropCanvasRef.value
  const scale = cropImage.value.naturalWidth / canvas.width

  const sx = b.x * scale, sy = b.y * scale
  const sw = b.w * scale, sh = b.h * scale

  const outCanvas = document.createElement('canvas')
  outCanvas.width = Math.round(sw)
  outCanvas.height = Math.round(sh)
  const ctx = outCanvas.getContext('2d')
  ctx.drawImage(cropImage.value.element, sx, sy, sw, sh, 0, 0, sw, sh)

  outCanvas.toBlob(async (blob) => {
    if (!blob) return
    const croppedFile = new File([blob], 'cropped.webp', { type: 'image/webp' })
    cropVisible.value = false
    previewUrl.value = URL.createObjectURL(blob)
    await doUpload(croppedFile)
  }, 'image/webp', props.quality)
}

async function doUpload(file) {
  uploading.value = true
  uploadProgress.value = 0
  try {
    const res = await uploadImage(file, (progress) => {
      uploadProgress.value = Math.round(progress * 100)
    })
    if (res?.success) {
      const url = res.url
      emit('update:modelValue', url)
      emit('change', url)
      emit('success', url)
      Message.success('上传成功')
    } else {
      throw new Error(res?.message || '上传失败')
    }
  } catch (err) {
    Message.error(err.message || '上传失败')
    emit('error', err)
    cleanupPreview()
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function handleRemove() {
  emit('update:modelValue', '')
  emit('change', '')
  cleanupPreview()
}

function cleanupPreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  cropVisible.value = false
  cropImage.value = null
}

function resolveUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return window.location.origin + url
}

function onImageLoad() { imageLoaded.value = true }
function onImageError() { imageLoaded.value = false }

watch(() => props.modelValue, (val) => {
  if (!val) cleanupPreview()
})

onBeforeUnmount(() => {
  cleanupPreview()
})
</script>

<style scoped>
.image-uploader { width: 100%; user-select: none; }
.upload-zone {
  position: relative;
  border: 2px dashed var(--border-color-light, #e5e6eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
  background: #fafbfc;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-zone:hover { border-color: var(--color-primary, #165dff); background: #f0f5ff; }
.upload-zone.is-dragging { border-color: var(--color-primary, #165dff); background: #e8f3ff; box-shadow: 0 0 0 3px rgba(22,93,255,0.1); }
.upload-zone.has-image { border-style: solid; border-color: var(--border-color-light, #e5e6eb); min-height: auto; }

.upload-placeholder { text-align: center; padding: 28px 20px; }
.upload-icon { color: #c9cdd4; margin-bottom: 10px; transition: color 0.2s; }
.upload-zone:hover .upload-icon { color: var(--color-primary, #165dff); }
.is-dragging .upload-icon { color: var(--color-primary, #165dff); }
.upload-text { margin: 0 0 6px; font-size: 14px; color: var(--text-secondary, #86909c); }
.upload-text .link { color: var(--color-primary, #165dff); font-weight: 500; cursor: pointer; }
.upload-hint { margin: 0; font-size: 12px; color: var(--text-quaternary, #c9cdd4); }

.image-preview { position: relative; width: 100%; padding-top: 56.25%; overflow: hidden; border-radius: 6px; }
.image-preview img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.preview-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  gap: 8px; opacity: 0; transition: opacity 0.2s;
}
.image-preview:hover .preview-overlay { opacity: 1; }
.overlay-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #4e5969; transition: all 0.15s;
}
.overlay-btn:hover { background: #fff; transform: scale(1.1); }
.overlay-btn.danger:hover { color: #f53f3f; }
.uploading-info {
  display: flex; align-items: center; gap: 8px;
  color: #fff; font-size: 13px; font-weight: 500;
}

.crop-panel { margin-top: 12px; border: 1px solid var(--border-color-light, #e5e6eb); border-radius: 8px; overflow: hidden; background: #fff; }
.crop-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #fafbfc;
  border-bottom: 1px solid var(--border-color-light, #e5e6eb);
  font-size: 13px; font-weight: 600; color: var(--text-primary, #1d2129);
}
.crop-actions { display: flex; gap: 6px; }
.crop-container { position: relative; display: inline-block; line-height: 0; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px; overflow: hidden; }
.crop-canvas { display: block; vertical-align: top; }
.crop-box {
  position: absolute;
  border: 2px solid #fff;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.45);
  cursor: move; z-index: 2;
}
.crop-handle {
  position: absolute; width: 10px; height: 10px;
  background: #fff; border: 1.5px solid var(--color-primary, #165dff);
  border-radius: 2px; z-index: 3;
}
.nw { top: -5px; left: -5px; cursor: nw-resize; }
.ne { top: -5px; right: -5px; cursor: ne-resize; }
.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
.se { bottom: -5px; right: -5px; cursor: se-resize; }
.crop-line-h {
  position: absolute; left: 0; right: 0; top: 50%;
  height: 1px; background: rgba(255,255,255,0.3);
  transform: translateY(-50%);
}
.crop-line-v {
  position: absolute; top: 0; bottom: 0; left: 50%;
  width: 1px; background: rgba(255,255,255,0.3);
  transform: translateX(-50%);
}
.crop-grid {
  position: absolute; inset: 0;
  background:
    linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px);
  background-size: 33.33% 33.33%;
  pointer-events: none;
}
</style>