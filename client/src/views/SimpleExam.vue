<template>
  <div style="padding: 20px; text-align: center;">
    <h1>考生端</h1>
    <p>试卷ID: {{ $route.params.id }}</p>
    <p>请稍候...</p>
  </div>
</template>

<script>
import { useRoute } from 'vue-router'

export default {
  name: 'SimpleExam',
  setup() {
    const route = useRoute()
    return {}
  }
}
</script>
