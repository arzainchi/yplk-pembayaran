<script setup lang="ts">
definePageMeta({ title: 'Sekolah' })

const columns: YColumn[] = [
  { key: 'kode', label: 'Kode', width: '120px' },
  { key: 'nama', label: 'Nama sekolah' },
  { key: 'jenjang', label: 'Jenjang', width: '110px' },
  { key: 'alamat', label: 'Alamat', hideOnMobile: true },
  { key: 'aktif', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '90px' },
]

const fields: FieldDef[] = [
  { key: 'kode', label: 'Kode sekolah', type: 'text', required: true, placeholder: 'mis. SMP-TT' },
  { key: 'nama', label: 'Nama sekolah', type: 'text', required: true, placeholder: 'mis. SMP Teknologi Tenggarong' },
  {
    key: 'jenjang',
    label: 'Jenjang',
    type: 'select',
    required: true,
    options: [
      { label: 'SMP', value: 'SMP' },
      { label: 'SMK', value: 'SMK' },
    ],
  },
  { key: 'alamat', label: 'Alamat', type: 'textarea', colSpan: 2 },
  { key: 'aktif', label: 'Aktif', type: 'switch' },
]
</script>

<template>
  <MasterCrudPage
    title="Sekolah"
    entitas="sekolah"
    add-label="Tambah sekolah"
    search-placeholder="Cari nama atau kode sekolah…"
    description="Sekolah yang dinaungi YPLK beserta jenjangnya."
    :columns="columns"
    :fields="fields"
    :default-values="{ jenjang: 'SMP', aktif: true }"
  />
</template>
