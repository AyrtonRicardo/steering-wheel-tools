<template>
  <span class="status-badge" :class="statusClass">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'ok' }, // 'ok' | 'warn' | 'bad'
  text: { type: String, required: true },
})

const statusClass = computed(() => ({
  'status-ok': props.type === 'ok',
  'status-warn': props.type === 'warn',
  'status-bad': props.type === 'bad',
}))
</script>
