<script setup lang="ts">
definePageMeta({ title: 'Transaksi Batal' })

const tab = ref('batal')

const { data, pending } = useLazyFetch<any>('/api/laporan/void', {
  default: () => ({ batal: [], audit: [] }),
})

const batalColumns: YColumn[] = [
  { key: 'nomorKuitansi', label: 'No. kuitansi', width: '200px' },
  { key: 'siswaNama', label: 'Siswa' },
  { key: 'totalBayar', label: 'Total', align: 'right' },
  { key: 'alasanBatal', label: 'Alasan' },
  { key: 'dibatalkanAt', label: 'Dibatalkan' },
  { key: 'petugasNama', label: 'Petugas', hideOnMobile: true },
]

const auditColumns: YColumn[] = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'penggunaNama', label: 'Pengguna', width: '180px' },
  { key: 'aksi', label: 'Aksi' },
  { key: 'entitas', label: 'Entitas', width: '140px' },
  { key: 'ipAddress', label: 'IP', hideOnMobile: true },
]
</script>

<template>
  <div class="space-y-5">
    <YTabs
      v-model="tab"
      :items="[
        { label: 'Transaksi dibatalkan', value: 'batal', count: data?.batal?.length ?? 0 },
        { label: 'Log audit', value: 'audit', count: data?.audit?.length ?? 0 },
      ]"
    />

    <YCard v-if="tab === 'batal'" description="Transaksi tidak dihapus; status berubah menjadi Dibatalkan dan tercatat atas nama petugas.">
      <YTable :columns="batalColumns" :rows="data?.batal ?? []" :loading="pending" empty="Belum ada transaksi yang dibatalkan.">
        <template #cell-nomorKuitansi="{ value }"><span class="tnum font-semibold">{{ value }}</span></template>
        <template #cell-totalBayar="{ value }">{{ formatRupiah(value as number) }}</template>
        <template #cell-dibatalkanAt="{ value }">{{ formatTanggalJam(value as string) }}</template>
      </YTable>
    </YCard>

    <YCard v-else description="Jejak perubahan data penting dan pembatalan transaksi.">
      <YTable :columns="auditColumns" :rows="data?.audit ?? []" :loading="pending" empty="Belum ada catatan audit.">
        <template #cell-waktu="{ value }">{{ formatTanggalJam(value as string) }}</template>
        <template #cell-penggunaNama="{ value }">{{ value || 'Sistem' }}</template>
        <template #cell-aksi="{ value }">
          <span class="rounded-full bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">{{ value }}</span>
        </template>
      </YTable>
    </YCard>
  </div>
</template>
