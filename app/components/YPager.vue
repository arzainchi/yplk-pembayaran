<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    page: number
    pageSize: number
    total: number
  }>(),
  {},
)

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.total, props.page * props.pageSize))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
    <p class="text-sm text-[var(--color-text-subtle)]">
      Menampilkan <span class="tnum font-semibold text-[var(--color-text-muted)]">{{ from }}–{{ to }}</span>
      dari <span class="tnum font-semibold text-[var(--color-text-muted)]">{{ total }}</span>
    </p>

    <div class="flex items-center gap-3">
      <USelect
        :model-value="pageSize"
        :items="[
          { label: '10 / hal', value: 10 },
          { label: '25 / hal', value: 25 },
          { label: '50 / hal', value: 50 },
          { label: '100 / hal', value: 100 },
        ]"
        size="sm"
        class="w-[110px]"
        @update:model-value="(v: number) => emit('update:pageSize', Number(v))"
      />
      <UPagination
        :page="page"
        :items-per-page="pageSize"
        :total="total"
        :sibling-count="1"
        show-edges
        size="sm"
        @update:page="(v: number) => emit('update:page', v)"
      />
    </div>
  </div>
</template>
