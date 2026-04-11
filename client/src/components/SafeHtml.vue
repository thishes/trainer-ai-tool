<template>
  <div class="safe-html" v-html="sanitizedHtml"></div>
</template>

<script>
import DOMPurify from 'dompurify'

// 配置 DOMPurify，允许安全的 HTML 标签和属性
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'a', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption',
    'div', 'span',
    'del', 'ins',
    'video', 'source'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',
    'src', 'alt', 'title', 'width', 'height',
    'class', 'style',
    'colspan', 'rowspan',
    'controls', 'autoplay', 'muted'
  ],
  // 强制给 a 标签添加 rel="noopener noreferrer"
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'button', 'textarea', 'select'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
}

// 为所有 a 标签添加安全属性
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer')
    // 只允许 _blank 和 _self
    const target = node.getAttribute('target')
    if (target && target !== '_blank' && target !== '_self') {
      node.removeAttribute('target')
    }
  }
})

export default {
  name: 'SafeHtml',
  props: {
    html: {
      type: String,
      default: ''
    }
  },
  computed: {
    sanitizedHtml() {
      if (!this.html) return ''
      return DOMPurify.sanitize(this.html, PURIFY_CONFIG)
    }
  }
}
</script>

<style scoped>
.safe-html {
  word-break: break-word;
  overflow-wrap: break-word;
}
</style>
