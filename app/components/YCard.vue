<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="rounded-lg bg-[var(--color-surface-subtle)] p-2 shadow-[0_1px_2px_rgba(23,23,43,.04)]">
    <div class="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header
        v-if="title || description || $slots.actions || $slots.header"
        class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4"
      >
        <div class="min-w-0">
          <h2 v-if="title" class="truncate text-[17px] font-bold text-[var(--color-text)]">{{ title }}</h2>
          <p v-if="description" class="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </header>
      <div class="p-5">
        <slot />
      </div>
    </div>
  </div>
</template>
