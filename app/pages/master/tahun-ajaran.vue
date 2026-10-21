<script setup lang="ts">
definePageMeta({ title: 'Tahun Ajaran' })

const columns: YColumn[] = [
  { key: 'nama', label: 'Tahun ajaran' },
  { key: 'tanggalMulai', label: 'Mulai' },
  { key: 'tanggalSelesai', label: 'Selesai' },
  { key: 'isAktif', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '90px' },
]

const fields: FieldDef[] = [
  { key: 'nama', label: 'Nama tahun ajaran', type: 'text', required: true, placeholder: 'mis. 2026/2027' },
  { key: 'tanggalMulai', label: 'Tanggal mulai', type: 'date', required: true },
  { key: 'tanggalSelesai', label: 'Tanggal selesai', type: 'date', required: true },
  { key: 'isAktif', label: 'Jadikan tahun ajaran aktif', type: 'switch', help: 'Hanya satu tahun ajaran yang aktif.' },
]
</script>

<template>
  <MasterCrudPage
    title="Tahun Ajaran"
    entitas="tahun-ajaran"
    add-label="Tambah tahun ajaran"
    search-placeholder="Cari tahun ajaran…"
    description="Satu tahun ajaran aktif dipakai untuk penempatan dan laporan."
    :columns="columns"
    :fields="fields"
    :default-values="{ isAktif: false }"
  >
    <template #cell-tanggalMulai="{ value }">{{ formatTanggal(value as string) }}</template>
    <template #cell-tanggalSelesai="{ value }">{{ formatTanggal(value as string) }}</template>
  </MasterCrudPage>
</template>
