<script setup lang="ts">
definePageMeta({ title: 'Audit Log' })

const page = ref(1)
const pageSize = ref(50)

const { data, pending } = await useFetch<any>('/api/audit-log', {
  query: computed(() => ({ page: page.value, pageSize: pageSize.value })),
  default: () => ({ items: [] }),
})

const columns: YColumn[] = [
  { key: 'waktu', label: 'Waktu', width: '200px' },
  { key: 'penggunaNama', label: 'Pengguna', width: '180px' },
  { key: 'aksi', label: 'Aksi' },
  { key: 'entitas', label: 'Entitas', width: '140px' },
  { key: 'entitasId', label: 'ID entitas', hideOnMobile: true },
  { key: 'ipAddress', label: 'IP', hideOnMobile: true },
]
</script>

<template>
  <div class="space-y-5">
    <YCard description="Catatan perubahan data penting dan pembatalan transaksi, atas nama akun petugas.">
      <YTable :columns="columns" :rows="data?.items ?? []" :loading="pending" empty="Belum ada catatan audit.">
        <template #cell-waktu="{ value }">{{ formatTanggalJam(value as string) }}</template>
        <template #cell-penggunaNama="{ value }">{{ value || 'Sistem' }}</template>
        <template #cell-aksi="{ value }">
          <span class="rounded-full bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">{{ value }}</span>
        </template>
        <template #cell-entitasId="{ value }">
          <span class="tnum text-sm text-[var(--color-text-subtle)]">{{ value ?? '—' }}</span>
        </template>
      </YTable>

      <YPager :page="page" :page-size="pageSize" :total="(page - 1) * pageSize + (data?.items?.length ?? 0) + 1" @update:page="(v:number)=>page=v" @update:page-size="(v:number)=>pageSize=v" />
    </YCard>
  </div>
</template>
