<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    value: string
    /** Perubahan persen (mis. +5.2). */
    delta?: number | null
    /** Kapan delta dianggap baik. */
    goodWhen?: 'up' | 'down'
    footerLabel?: string
    footerValue?: string
    icon?: string
  }>(),
  { delta: null, goodWhen: 'up', footerLabel: '', footerValue: '', icon: '' },
)

const hasDelta = computed(() => props.delta !== null && props.delta !== undefined && Number.isFinite(props.delta))

const isGood = computed(() => {
  if (!hasDelta.value) return true
  return props.goodWhen === 'up' ? (props.delta as number) >= 0 : (props.delta as number) <= 0
})

const deltaText = computed(() => {
  const d = props.delta as number
  const sign = d > 0 ? '+' : d < 0 ? '−' : ''
  return `${sign}${Math.abs(d).toFixed(1)}%`
})

const deltaIcon = computed(() => ((props.delta as number) >= 0 ? 'lucide:arrow-up' : 'lucide:arrow-down'))

const deltaStyle = computed(() =>
  isGood.value
    ? { color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' }
    : { color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' },
)
</script>

<template>
  <div class="rounded-lg bg-[var(--color-surface-subtle)] p-2 shadow-[0_1px_2px_rgba(23,23,43,.04)]">
    <div class="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
      <div class="flex items-start justify-between gap-2">
        <p class="y-label">{{ label }}</p>
        <UIcon v-if="icon" :name="icon" class="size-[18px] text-[var(--color-text-subtle)]" aria-hidden="true" />
      </div>

      <div class="mt-2 flex items-center gap-2">
        <p class="tnum text-display font-bold tracking-[-0.02em] text-[var(--color-text)]">{{ value }}</p>
        <span
          v-if="hasDelta"
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
          :style="deltaStyle"
        >
          <UIcon :name="deltaIcon" class="size-3" aria-hidden="true" />
          {{ deltaText }}
        </span>
      </div>

      <div v-if="footerValue || footerLabel" class="mt-2 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <span v-if="footerValue" class="font-semibold text-[var(--color-text)]">{{ footerValue }}</span>
        <span v-if="footerLabel">{{ footerLabel }}</span>
      </div>
    </div>
  </div>
</template>
