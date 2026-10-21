<script setup lang="ts">
interface Series {
  name: string
  color: string
  values: number[]
}

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: Series[]
    height?: number
  }>(),
  { height: 240 },
)

const W = 720
const PAD = { left: 62, right: 18, top: 16, bottom: 30 }

const points = computed(() => props.labels.length)
const innerW = computed(() => W - PAD.left - PAD.right)
const innerH = computed(() => props.height - PAD.top - PAD.bottom)

const maxValue = computed(() => {
  let max = 0
  for (const s of props.series) for (const v of s.values) max = Math.max(max, v)
  return max <= 0 ? 1 : max
})

function x(i: number): number {
  const n = points.value
  if (n <= 1) return PAD.left + innerW.value / 2
  return PAD.left + (innerW.value * i) / (n - 1)
}

function y(v: number): number {
  return PAD.top + innerH.value - (v / maxValue.value) * innerH.value
}

function linePath(values: number[]): string {
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
}

function areaPath(values: number[]): string {
  if (values.length === 0) return ''
  const base = PAD.top + innerH.value
  const first = `M ${x(0).toFixed(1)} ${base.toFixed(1)}`
  const top = values.map((v, i) => `L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const last = `L ${x(values.length - 1).toFixed(1)} ${base.toFixed(1)} Z`
  return `${first} ${top} ${last}`
}

const gridLines = computed(() => {
  const lines: { y: number; label: string }[] = []
  for (let i = 0; i <= 4; i++) {
    const value = (maxValue.value * i) / 4
    lines.push({ y: y(value), label: compact(value) })
  }
  return lines.reverse()
})

function compact(value: number): string {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)} rb`
  return `Rp${Math.round(value)}`
}
</script>

<template>
  <div>
    <svg :viewBox="`0 0 ${W} ${height}`" class="h-auto w-full" role="img" :aria-label="`Grafik ${series.map((s) => s.name).join(', ')}`">
      <defs>
        <linearGradient v-for="(s, si) in series" :id="`y-chart-fill-${si}`" :key="`grad-${si}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.16" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <g>
        <line
          v-for="(gl, gi) in gridLines"
          :key="`grid-${gi}`"
          :x1="PAD.left"
          :x2="W - PAD.right"
          :y1="gl.y"
          :y2="gl.y"
          stroke="var(--color-border)"
          stroke-width="1"
          stroke-dasharray="3 6"
        />
        <text
          v-for="(gl, gi) in gridLines"
          :key="`glabel-${gi}`"
          :x="PAD.left - 10"
          :y="gl.y + 4"
          text-anchor="end"
          class="fill-[var(--color-text-subtle)]"
          style="font-size: 11px; font-variant-numeric: tabular-nums"
        >
          {{ gl.label }}
        </text>
      </g>

      <g v-for="(s, si) in series" :key="`series-${si}`">
        <path :d="areaPath(s.values)" :fill="`url(#y-chart-fill-${si})`" />
        <path :d="linePath(s.values)" fill="none" :stroke="s.color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        <circle
          v-for="(v, vi) in s.values"
          :key="`dot-${si}-${vi}`"
          :cx="x(vi)"
          :cy="y(v)"
          r="2.5"
          fill="#fff"
          :stroke="s.color"
          stroke-width="2"
        />
      </g>

      <g>
        <text
          v-for="(label, li) in labels"
          :key="`xlabel-${li}`"
          :x="x(li)"
          :y="height - 10"
          text-anchor="middle"
          class="fill-[var(--color-text-subtle)]"
          style="font-size: 11px"
        >
          {{ label }}
        </text>
      </g>
    </svg>

    <div class="mt-3 flex flex-wrap items-center gap-4 px-1">
      <div v-for="(s, si) in series" :key="`legend-${si}`" class="flex items-center gap-2">
        <span class="size-2.5 rounded-full" :style="{ backgroundColor: s.color }" aria-hidden="true" />
        <span class="text-sm text-[var(--color-text-muted)]">{{ s.name }}</span>
      </div>
    </div>
  </div>
</template>
