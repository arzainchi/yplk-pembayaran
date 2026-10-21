<script setup lang="ts">
definePageMeta({ title: 'Rombel' })

const { opsi, sekolahOptions, tahunAjaranOptions, jurusanOptions, waliOptions } = useOpsi()

const sekolahMap = computed(() => new Map((opsi.value?.sekolah ?? []).map((s) => [s.id, s.nama])))
const jurusanMap = computed(() => new Map((opsi.value?.jurusan ?? []).map((j) => [j.id, j.nama])))
const waliMap = computed(() => new Map((opsi.value?.waliKelas ?? []).map((w) => [w.id, w.name])))

const columns: YColumn[] = [
  { key: 'sekolahId', label: 'Sekolah' },
  { key: 'tingkat', label: 'Tingkat', width: '110px' },
  { key: 'nama', label: 'Rombel', width: '140px' },
  { key: 'jurusanId', label: 'Jurusan' },
  { key: 'waliKelasUserId', label: 'Wali kelas', hideOnMobile: true },
  { key: '__actions', label: '', align: 'right', width: '90px' },
]

const fields = computed<FieldDef[]>(() => [
  { key: 'sekolahId', label: 'Sekolah', type: 'select', required: true, options: sekolahOptions.value },
  { key: 'tahunAjaranId', label: 'Tahun ajaran', type: 'select', required: true, options: tahunAjaranOptions.value },
  { key: 'tingkat', label: 'Tingkat', type: 'number', required: true, placeholder: 'mis. 10' },
  { key: 'nama', label: 'Nama rombel', type: 'text', required: true, placeholder: 'mis. 10 GP' },
  { key: 'jurusanId', label: 'Jurusan (opsional)', type: 'select', options: jurusanOptions.value },
  { key: 'waliKelasUserId', label: 'Wali kelas (opsional)', type: 'select', options: waliOptions.value },
])

const filters = computed(() => [
  { key: 'sekolahId', label: 'Sekolah', options: sekolahOptions.value },
  { key: 'tahunAjaranId', label: 'Tahun ajaran', options: tahunAjaranOptions.value },
])
</script>

<template>
  <MasterCrudPage
    title="Rombel"
    entitas="rombel"
    add-label="Tambah rombel"
    search-placeholder="Cari rombel…"
    description="Satu akun wali kelas hanya memegang satu rombel per tahun ajaran."
    :columns="columns"
    :fields="fields"
    :filters="filters"
  >
    <template #cell-sekolahId="{ value }">{{ sekolahMap.get(value as string) ?? '—' }}</template>
    <template #cell-tingkat="{ value }">{{ tingkatLabel(value as number) }}</template>
    <template #cell-jurusanId="{ value }">{{ value ? (jurusanMap.get(value as string) ?? '—') : '—' }}</template>
    <template #cell-waliKelasUserId="{ value }">
      <template v-if="value">{{ waliMap.get(value as string) ?? '—' }}</template>
      <span v-else class="text-[var(--color-text-subtle)]">Belum ditentukan</span>
    </template>
  </MasterCrudPage>
</template>
