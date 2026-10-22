<script setup lang="ts">
definePageMeta({ title: 'Siswa' })

const { sekolahOptions, jurusanOptions, rombelOptions } = useOpsi()
const router = useRouter()
const toast = useToast()
const crud = ref<any>(null)

// Impor Excel (FR-MST-07)
const imporOpen = ref(false)
const imporSaving = ref(false)
const imporFile = ref<File | null>(null)
const imporHasil = ref<{ total: number; berhasil: number; gagal: Array<{ baris: number; pesan: string }> } | null>(null)

function bukaImpor() {
  imporFile.value = null
  imporHasil.value = null
  imporOpen.value = true
}

function pilihBerkas(event: Event) {
  imporFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
  imporHasil.value = null
}

async function jalankanImpor() {
  if (!imporFile.value) return
  imporSaving.value = true
  try {
    const body = new FormData()
    body.append('file', imporFile.value)
    imporHasil.value = await $fetch('/api/siswa/impor', { method: 'POST', body })
    toast.add({
      title: 'Impor selesai',
      description: `${imporHasil.value.berhasil} siswa ditambahkan, ${imporHasil.value.gagal.length} baris gagal.`,
      icon: 'lucide:file-spreadsheet',
      color: imporHasil.value.gagal.length ? 'warning' : 'success',
    })
    await crud.value?.refresh()
  } catch (error: any) {
    toast.add({
      title: 'Impor gagal',
      description: error?.data?.statusMessage || 'Berkas tidak dapat diproses.',
      icon: 'lucide:circle-alert',
      color: 'error',
    })
  } finally {
    imporSaving.value = false
  }
}

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
  <div>
    <MasterCrudPage
      ref="crud"
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
      <template #header-actions>
        <UButton color="neutral" variant="outline" icon="lucide:file-spreadsheet" @click="bukaImpor">
          Impor Excel
        </UButton>
      </template>

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

    <UModal v-model:open="imporOpen" title="Impor siswa dari Excel" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-[var(--color-text-muted)]">
            Unduh template, isi satu baris per siswa, lalu unggah kembali. Baris yang gagal divalidasi
            dilaporkan dan tidak disimpan.
          </p>

          <UButton
            to="/api/siswa/impor/template"
            target="_blank"
            color="neutral"
            variant="outline"
            icon="lucide:download"
            size="sm"
          >
            Unduh template Excel
          </UButton>

          <UFormField label="Berkas Excel (.xlsx)">
            <input
              type="file"
              accept=".xlsx"
              class="block w-full cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              @change="pilihBerkas"
            >
          </UFormField>

          <div v-if="imporHasil" class="space-y-3">
            <p class="text-sm font-semibold">
              {{ imporHasil.berhasil }} dari {{ imporHasil.total }} baris berhasil diimpor.
            </p>
            <div v-if="imporHasil.gagal.length" class="max-h-[260px] overflow-y-auto rounded-md border border-[var(--color-border)]">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-[var(--color-surface-subtle)] text-left">
                  <tr>
                    <th class="px-3 py-2 font-medium">Baris</th>
                    <th class="px-3 py-2 font-medium">Pesan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="g in imporHasil.gagal" :key="g.baris" class="border-t border-[var(--color-border)]">
                    <td class="px-3 py-2 tnum">{{ g.baris }}</td>
                    <td class="px-3 py-2 text-[var(--color-text-muted)]">{{ g.pesan }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="imporOpen = false">Tutup</UButton>
          <UButton icon="lucide:upload" :loading="imporSaving" :disabled="!imporFile" @click="jalankanImpor">
            Impor sekarang
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
