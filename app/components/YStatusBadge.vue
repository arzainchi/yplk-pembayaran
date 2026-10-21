<script setup lang="ts">
import type { StatusMeta } from '#shared/utils/format'

const props = withDefaults(
  defineProps<{
    status: string
    jenis?: 'tagihan' | 'pembayaran' | 'siswa'
    /** Tebal badge tunggakan tahun ajaran sebelumnya. */
    lampau?: boolean
  }>(),
  { jenis: 'tagihan', lampau: false },
)

const meta = computed<StatusMeta>(() => {
  if (props.jenis === 'pembayaran') return statusPembayaran(props.status)
  if (props.jenis === 'siswa') return statusSiswa(props.status)
  return statusTagihan(props.status)
})

const palette = computed<Record<StatusMeta['color'], { fg: string; bg: string }>>(() => ({
  success: { fg: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  warning: { fg: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  error: { fg: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  info: { fg: 'var(--color-info)', bg: 'var(--color-info-bg)' },
  neutral: { fg: 'var(--color-text-muted)', bg: 'var(--color-surface-subtle)' },
}))

const style = computed(() => {
  const tone = palette.value[meta.value.color]
  return { color: tone.fg, backgroundColor: tone.bg }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
    :style="style"
  >
    <UIcon :name="meta.icon" class="size-3.5 shrink-0" aria-hidden="true" />
    {{ meta.label }}
  </span>
</template>
