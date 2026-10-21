<script setup lang="ts">
definePageMeta({ title: 'Jenis Pembayaran' })

const columns: YColumn[] = [
  { key: 'kode', label: 'Kode', width: '160px' },
  { key: 'nama', label: 'Nama jenis pembayaran' },
  { key: 'aktif', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '90px' },
]

const fields: FieldDef[] = [
  { key: 'kode', label: 'Kode', type: 'text', required: true, placeholder: 'mis. SPP' },
  { key: 'nama', label: 'Nama jenis pembayaran', type: 'text', required: true, placeholder: 'mis. SPP' },
  { key: 'aktif', label: 'Aktif', type: 'switch' },
]
</script>

<template>
  <MasterCrudPage
    title="Jenis Pembayaran"
    entitas="jenis-pembayaran"
    add-label="Tambah jenis"
    search-placeholder="Cari jenis pembayaran…"
    description="Jenis iuran pendidikan yang ditagihkan ke siswa."
    :columns="columns"
    :fields="fields"
    :default-values="{ aktif: true }"
  />
</template>
