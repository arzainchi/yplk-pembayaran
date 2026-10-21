<script setup lang="ts">
withDefaults(
  defineProps<{
    columns: YColumn[]
    rows: Record<string, unknown>[]
    loading?: boolean
    empty?: string
    emptyIcon?: string
    rowKey?: string
    clickable?: boolean
  }>(),
  {
    loading: false,
    empty: 'Belum ada data.',
    emptyIcon: 'lucide:inbox',
    rowKey: 'id',
    clickable: false,
  },
)

const emit = defineEmits<{ rowClick: [row: Record<string, unknown>] }>()

function alignClass(align?: string) {
  if (align === 'right') return 'text-right tnum'
  if (align === 'center') return 'text-center'
  return 'text-left'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-base">
      <thead>
        <tr class="border-b border-[var(--color-border)]">
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            class="whitespace-nowrap px-4 py-[13px] text-sm font-medium text-[var(--color-text-subtle)]"
            :class="[alignClass(col.align), col.hideOnMobile ? 'hidden md:table-cell' : '']"
            :style="col.width ? { width: col.width } : undefined"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-10 text-center text-sm text-[var(--color-text-subtle)]">
            Memuat…
          </td>
        </tr>
        <tr v-else-if="rows.length === 0">
          <td :colspan="columns.length" class="px-4 py-12">
            <div class="flex flex-col items-center gap-2 text-center">
              <UIcon :name="emptyIcon" class="size-8 text-[var(--color-text-subtle)]" aria-hidden="true" />
              <p class="text-sm text-[var(--color-text-subtle)]">{{ empty }}</p>
            </div>
          </td>
        </tr>
        <tr
          v-for="row in rows"
          v-else
          :key="String(row[rowKey])"
          class="border-b border-[var(--color-border)] transition-colors last:border-0"
          :class="clickable ? 'cursor-pointer hover:bg-[var(--color-row-hover)]' : ''"
          @click="clickable ? emit('rowClick', row) : undefined"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-[13px] align-middle text-[var(--color-text)]"
            :class="[alignClass(col.align), col.hideOnMobile ? 'hidden md:table-cell' : '']"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
