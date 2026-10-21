<script setup lang="ts">
definePageMeta({ title: 'Jurusan' })

const { opsi, sekolahOptions } = useOpsi()

const sekolahMap = computed(() =>
  new Map((opsi.value?.sekolah ?? []).map((s) => [s.id, s.nama])),
)

const columns: YColumn[] = [
  { key: 'sekolahId', label: 'Sekolah' },
  { key: 'kode', label: 'Kode', width: '120px' },
  { key: 'nama', label: 'Nama jurusan' },
  { key: 'aktif', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '90px' },
]

const fields = computed<FieldDef[]>(() => [
  { key: 'sekolahId', label: 'Sekolah', type: 'select', required: true, options: sekolahOptions.value },
  { key: 'kode', label: 'Kode jurusan', type: 'text', required: true, placeholder: 'mis. GP' },
  { key: 'nama', label: 'Nama jurusan', type: 'text', required: true, placeholder: 'mis. Geologi Pertambangan' },
  { key: 'aktif', label: 'Aktif', type: 'switch' },
])

const filters = computed(() => [
  { key: 'sekolahId', label: 'Sekolah', options: sekolahOptions.value },
])
</script>

<template>
  <MasterCrudPage
    title="Jurusan"
    entitas="jurusan"
    add-label="Tambah jurusan"
    search-placeholder="Cari jurusan…"
    description="Jurusan hanya ada di jenjang SMK."
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :default-values="{ aktif: true }"
  >
    <template #cell-sekolahId="{ value }">
      {{ sekolahMap.get(value as string) ?? '—' }}
    </template>
  </MasterCrudPage>
</template>
