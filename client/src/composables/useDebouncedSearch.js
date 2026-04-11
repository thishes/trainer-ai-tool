import { ref, watch } from 'vue'

/**
 * 防抖搜索 composable
 * @param {number} delay - 防抖延迟（毫秒），默认 300ms
 * @returns {{ keyword: import('vue').Ref<string>, debouncedKeyword: import('vue').Ref<string> }}
 */
export function useDebouncedSearch(delay = 300) {
  const keyword = ref('')
  const debouncedKeyword = ref('')
  let timer = null

  watch(keyword, (val) => {
    clearTimeout(timer)
    timer = setTimeout(() => { debouncedKeyword.value = val }, delay)
  })

  return { keyword, debouncedKeyword }
}
