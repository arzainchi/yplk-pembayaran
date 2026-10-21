<script setup lang="ts">
definePageMeta({ title: 'Tagihan' })

const toast = useToast()
const router = useRouter()
const { sekolahOptions, tahunAjaranOptions, jenisOptions, rombelOptions, opsi, tahunAjaranAktif } = useOpsi()

const page = ref(1)
const pageSize = ref(25)
const q = ref('')
const fSekolah = ref('all')
const fTahun = ref('all')
const fJenis = ref('all')
const fStatus = ref('all')
const fRombel = ref('all')

const query = computed(() => {
  const out: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
  if (q.value.trim()) out.q = q.value.trim()
  if (fSekolah.value !== 'all') out.sekolahId = fSekolah.value
  if (fTahun.value !== 'all') out.tahunAjaranId = fTahun.value
  if (fJenis.value !== 'all') out.jenisPembayaranId = fJenis.value
  if (fStatus.value !== 'all') out.status = fStatus.value
  if (fRombel.value !== 'all') out.rombelId = fRombel.value
  return out
})

const { data, refresh, pending } = await useFetch<any>('/api/tagihan', { query, default: () => ({ items: [], total: 0 }) })

watch([q, fSekolah, fTahun, fJenis, fStatus, fRombel], () => { page.value = 1 })

const statusOptions = [
  { label: 'Belum Bayar', value: 'belum_bayar' },
  { label: 'Sebagian', value: 'sebagian' },
  { label: 'Lunas', value: 'lunas' },
  { label: 'Dibatalkan', value: 'dibatalkan' },
]

const columns: YColumn[] = [
  { key: 'siswaNama', label: 'Siswa' },
  { key: 'sekolahNama', label: 'Sekolah', hideOnMobile: true },
  { key: 'jenisNama', label: 'Jenis' },
  { key: 'tahunAjaranNama', label: 'Asal tahun ajaran', width: '150px' },
  { key: 'periodeKe', label: 'Periode', width: '110px' },
  { key: 'nominalTagihan', label: 'Nominal', align: 'right' },
  { key: 'sisa', label: 'Sisa', align: 'right' },
  { key: 'status', label: 'Status', width: '140px' },
]

const rows = computed(() =>
  (data.value?.items ?? []).map((t: any) => ({ ...t, sisa: t.nominalTagihan - t.totalTerbayar, jenis: t.jenisNama ?? t.keterangan ?? 'Manual' })),
)

// Generate
const genOpen = ref(false)
const genSaving = ref(false)
const gen = reactive({ mode: 'tarif', tarifId: '', rombelId: '' })

const { data: tarifData } = await useFetch<any>('/api/tarif', {
  query: { pageSize: 500 },
  default: () => ({ items: [] }),
})
const tarifOptions = computed(() =>
  (tarifData.value?.items ?? []).map((t: any) => ({
    label: `${t.sekolahKode} · ${tingkatLabel(t.tingkat)} · ${t.jenisNama}${t.semester ? ` (${semesterLabel(t.semester)})` : ''} — ${formatRupiah(t.nominal)}`,
    value: t.id,
  })),
)

function openGenerate() {
  gen.mode = 'tarif'
  gen.tarifId = ''
  gen.rombelId = ''
  genOpen.value = true
}

async function submitGenerate() {
  genSaving.value = true
  try {
    const body = gen.mode === 'tarif' ? { mode: 'tarif', tarifId: gen.tarifId } : { mode: 'rombel', rombelId: gen.rombelId }
    const res = await $fetch<{ created: number; skipped: number }>('/api/tagihan/generate', { method: 'POST', body })
    toast.add({
      title: 'Generate selesai',
      description: `${res.created} tagihan diterbitkan, ${res.skipped} dilewati karena sudah ada.`,
      icon: 'lucide:check', color: 'success',
    })
    genOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Gagal generate', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    genSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput v-model="q" icon="lucide:search" :placeholder="'Cari nama atau NIS siswa…'" class="w-full sm:w-[240px]" />
        <USelect v-model="fSekolah" :items="[{ label: 'Semua sekolah', value: 'all' }, ...sekolahOptions]" class="w-full sm:w-[180px]" />
        <USelect v-model="fTahun" :items="[{ label: 'Semua tahun ajaran', value: 'all' }, ...tahunAjaranOptions]" class="w-full sm:w-[180px]" />
        <USelect v-model="fJenis" :items="[{ label: 'Semua jenis', value: 'all' }, ...jenisOptions]" class="w-full sm:w-[160px]" />
        <USelect v-model="fStatus" :items="[{ label: 'Semua status', value: 'all' }, ...statusOptions]" class="w-full sm:w-[160px]" />
      </div>
      <UButton icon="lucide:plus" @click="openGenerate">Generate tagihan</UButton>
    </div>

    <YCard description="Tagihan yang belum lunas tetap terlihat sebagai tunggakan meskipun siswa sudah naik kelas.">
      <YTable :columns="columns" :rows="rows" :loading="pending" empty="Belum ada tagihan. Terbitkan tagihan untuk rombel atau tarif.">
        <template #cell-siswaNama="{ row }">
          <button
            type="button"
            class="text-left font-semibold text-[var(--color-primary)] hover:underline"
            @click="router.push(`/siswa/${row.siswaId}`)"
          >
            {{ row.siswaNama }}
          </button>
          <span class="block text-sm text-[var(--color-text-subtle)]">{{ row.siswaNis }}</span>
        </template>
        <template #cell-jenisNama="{ row }">{{ row.jenisNama ?? row.keterangan ?? 'Manual' }}</template>
        <template #cell-periodeKe="{ value }">{{ value ? periodeLabel(value as number) : '—' }}</template>
        <template #cell-nominalTagihan="{ value }">{{ formatRupiah(value as number) }}</template>
        <template #cell-sisa="{ value }">{{ formatRupiah(value as number) }}</template>
        <template #cell-status="{ value }"><YStatusBadge :status="String(value)" /></template>
      </YTable>

      <YPager :page="page" :page-size="pageSize" :total="data?.total ?? 0" @update:page="(v:number)=>page=v" @update:page-size="(v:number)=>pageSize=v" />
    </YCard>

    <UModal v-model:open="genOpen" title="Generate tagihan" :ui="{ content: 'max-w-xl' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-[var(--color-text-muted)]">
            Sistem melewati siswa yang sudah memiliki tagihan yang sama, jadi aman dijalankan berulang.
          </p>
          <UFormField label="Dasar generate">
            <USelect
              v-model="gen.mode"
              :items="[
                { label: 'Berdasarkan tarif', value: 'tarif' },
                { label: 'Berdasarkan rombel', value: 'rombel' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField v-if="gen.mode === 'tarif'" label="Tarif" required>
            <USelect v-model="gen.tarifId" :items="tarifOptions" class="w-full" />
          </UFormField>
          <UFormField v-else label="Rombel" required>
            <USelect v-model="gen.rombelId" :items="rombelOptions" class="w-full" />
          </UFormField>
          <p v-if="tahunAjaranAktif" class="text-sm text-[var(--color-text-subtle)]">
            Tahun ajaran aktif: {{ tahunAjaranAktif.nama }}.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="genOpen = false">Batal</UButton>
          <UButton icon="lucide:wand-2" :loading="genSaving" @click="submitGenerate">Terbitkan tagihan</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
