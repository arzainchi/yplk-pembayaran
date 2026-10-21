<script setup lang="ts">
definePageMeta({ title: 'Siswa' })

const { sekolahOptions, jurusanOptions, rombelOptions } = useOpsi()
const router = useRouter()

const statusOptions = [
  { label: 'Aktif', value: 'aktif' },
  { label: 'Lulus', value: 'lulus' },
  { label: 'Pindah', value: 'pindah' },
  { label: 'Keluar', value: 'keluar' },
]

const columns: YColumn[] = [
  { key: 'nis', label: 'NIS', width: '120px' },
  { key: 'nama', label: 'Nama siswa' },
  { key: 'sekolahNama', label: 'Sekolah', hideOnMobile: true },
  { key: 'rombelNama', label: 'Rombel', width: '140px' },
  { key: 'noHpWali', label: 'HP wali', hideOnMobile: true },
  { key: 'status', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '130px' },
]

const fields = computed<FieldDef[]>(() => [
  { key: 'nis', label: 'NIS', type: 'text', required: true, placeholder: 'mis. S20260001' },
  { key: 'nisn', label: 'NISN (opsional)', type: 'text' },
  { key: 'nama', label: 'Nama lengkap', type: 'text', required: true },
  {
    key: 'jenisKelamin', label: 'Jenis kelamin', type: 'select', required: true,
    options: [{ label: 'Laki-laki', value: 'L' }, { label: 'Perempuan', value: 'P' }],
  },
  { key: 'tanggalLahir', label: 'Tanggal lahir', type: 'date' },
  { key: 'sekolahId', label: 'Sekolah', type: 'select', required: true, options: sekolahOptions.value },
  { key: 'jurusanId', label: 'Jurusan (opsional)', type: 'select', options: jurusanOptions.value },
  { key: 'namaWali', label: 'Nama orang tua / wali', type: 'text' },
  { key: 'noHpWali', label: 'Nomor HP wali', type: 'text', placeholder: 'mis. 081234567890' },
  { key: 'tahunMasuk', label: 'Tahun masuk', type: 'number', required: true },
  { key: 'status', label: 'Status siswa', type: 'select', required: true, options: statusOptions },
  {
    key: 'rombelId', label: 'Rombel (tahun ajaran aktif)', type: 'select', options: rombelOptions.value,
    help: 'Menempatkan siswa pada tahun ajaran aktif.',
  },
])

const filters = computed(() => [
  { key: 'sekolahId', label: 'sekolah', options: sekolahOptions.value },
  { key: 'jurusanId', label: 'jurusan', options: jurusanOptions.value },
  { key: 'rombelId', label: 'rombel', options: rombelOptions.value },
  { key: 'status', label: 'status', options: statusOptions },
])
</script>

<template>
  <MasterCrudPage
    title="Siswa"
    entitas="siswa"
    api-prefix="/api"
    add-label="Tambah siswa"
    search-placeholder="Cari nama, NIS, atau NISN…"
    description="Tagihan melekat pada siswa dan terbawa saat naik kelas."
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :default-values="{ jenisKelamin: 'L', status: 'aktif', tahunMasuk: 2026 }"
  >
    <template #cell-rombelNama="{ row }">
      <template v-if="row.rombelId">{{ rombelLabel(row.rombelTingkat as number, row.rombelNama as string) }}</template>
      <span v-else class="text-[var(--color-text-subtle)]">Belum ditempatkan</span>
    </template>
    <template #cell-noHpWali="{ value }">{{ value || '—' }}</template>
    <template #cell-status="{ value }">
      <YStatusBadge :status="String(value)" jenis="siswa" />
    </template>
    <template #row-actions="{ row }">
      <UButton
        icon="lucide:eye"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        aria-label="Lihat detail"
        @click="router.push(`/siswa/${row.id}`)"
      />
    </template>
  </MasterCrudPage>
</template>
