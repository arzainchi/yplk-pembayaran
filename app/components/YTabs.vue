<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; value: string; count?: number }>
  modelValue: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="inline-flex items-stretch divide-x divide-[var(--color-border)] rounded-[13px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="inline-flex items-center gap-2 rounded-[9px] px-3 py-1.5 text-base transition-colors"
      :class="item.value === modelValue
        ? 'bg-[var(--color-surface)] font-semibold text-[var(--color-text)] shadow-[0_1px_2px_rgba(23,23,43,.06)] ring-1 ring-[var(--color-border)]'
        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'"
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
      <span
        v-if="item.count !== undefined"
        class="rounded-full px-2 py-0.5 text-xs font-bold"
        :class="item.value === modelValue
          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
          : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-subtle)]'"
      >
        {{ item.count }}
      </span>
    </button>
  </div>
</template>
