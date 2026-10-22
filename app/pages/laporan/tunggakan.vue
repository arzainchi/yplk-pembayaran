<script setup lang="ts">
definePageMeta({ title: 'Laporan Tunggakan' })

const { sekolahOptions, jurusanOptions, jenisOptions, rombelOptions } = useOpsi()

const fSekolah = ref('all')
const fJurusan = ref('all')
const fTingkat = ref('all')
const fRombel = ref('all')
const fJenis = ref('all')
const fUsia = ref('all')

const tingkatOptions = [7, 8, 9, 10, 11, 12].map((t) => ({ label: `Kelas ${t}`, value: t }))

const query = computed(() => {
  const out: Record<string, string> = {}
  if (fSekolah.value !== 'all') out.sekolahId = fSekolah.value
  if (fJurusan.value !== 'all') out.jurusanId = fJurusan.value
  if (fTingkat.value !== 'all') out.tingkat = fTingkat.value
  if (fRombel.value !== 'all') out.rombelId = fRombel.value
  if (fJenis.value !== 'all') out.jenisPembayaranId = fJenis.value
  if (fUsia.value !== 'all') out.usia = fUsia.value
  return out
})

const { data, pending } = useLazyFetch<any>('/api/laporan/tunggakan', {
  query,
  default: () => ({ items: [], total: 0, jumlahSiswa: 0 }),
})

const excelUrl = computed(() => `/api/laporan/tunggakan.xlsx?${new URLSearchParams(query.value).toString()}`)

const columns: YColumn[] = [
  { key: 'siswaNama', label: 'Siswa' },
  { key: 'nis', label: 'NIS', width: '120px' },
  { key: 'sekolah', label: 'Sekolah', hideOnMobile: true },
  { key: 'rombel', label: 'Rombel', width: '150px' },
  { key: 'rincian', label: 'Rincian tunggakan' },
  { key: 'total', label: 'Total', align: 'right', width: '150px' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="no-print flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <USelect v-model="fSekolah" :items="[{ label: 'Semua sekolah', value: 'all' }, ...sekolahOptions]" class="w-full sm:w-[170px]" />
        <USelect v-model="fJurusan" :items="[{ label: 'Semua jurusan', value: 'all' }, ...jurusanOptions]" class="w-full sm:w-[160px]" />
        <USelect v-model="fTingkat" :items="[{ label: 'Semua tingkat', value: 'all' }, ...tingkatOptions]" class="w-full sm:w-[150px]" />
        <USelect v-model="fRombel" :items="[{ label: 'Semua rombel', value: 'all' }, ...rombelOptions]" class="w-full sm:w-[160px]" />
        <USelect v-model="fJenis" :items="[{ label: 'Semua jenis', value: 'all' }, ...jenisOptions]" class="w-full sm:w-[150px]" />
        <USelect
          v-model="fUsia"
          :items="[
            { label: 'Semua usia tunggakan', value: 'all' },
            { label: 'Tahun ajaran berjalan', value: 'berjalan' },
            { label: 'Tahun ajaran sebelumnya', value: 'lampau' },
          ]"
          class="w-full sm:w-[220px]"
        />
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="lucide:printer" color="neutral" variant="outline" @click="() => window.print()">Cetak / PDF</UButton>
        <UButton icon="lucide:file-spreadsheet" :to="excelUrl" external>Ekspor Excel</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <YKpi label="Total tunggakan" :value="formatRupiah(data?.total ?? 0)" icon="lucide:triangle-alert" />
      <YKpi label="Siswa bertunggakan" :value="String(data?.jumlahSiswa ?? 0)" icon="lucide:users" />
    </div>

    <YCard description="Tunggakan dihitung dari seluruh tagihan siswa yang belum lunas, lintas tahun ajaran.">
      <YTable :columns="columns" :rows="data?.items ?? []" :loading="pending" empty="Tidak ada tunggakan pada filter ini.">
        <template #cell-siswaNama="{ row }">
          <NuxtLink :to="`/siswa/${row.siswaId}`" class="font-semibold text-[var(--color-primary)] hover:underline">
            {{ row.siswaNama }}
          </NuxtLink>
        </template>
        <template #cell-rincian="{ row }">
          <ul class="space-y-1">
            <li v-for="(r, i) in row.rincian" :key="i" class="flex flex-wrap items-center gap-2 text-sm">
              <span class="text-[var(--color-text-muted)]">{{ r.jenis }} · {{ r.tahunAjaran }}</span>
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                :style="r.lampau
                  ? { color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' }
                  : { color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }"
              >
                <UIcon :name="r.lampau ? 'lucide:triangle-alert' : 'lucide:clock'" class="size-3" aria-hidden="true" />
                {{ r.lampau ? 'Tahun sebelumnya' : 'Tahun berjalan' }}
              </span>
              <span class="tnum font-semibold">{{ formatRupiah(r.sisa) }}</span>
            </li>
          </ul>
        </template>
        <template #cell-total="{ value }">
          <span class="tnum font-bold text-[var(--color-danger)]">{{ formatRupiah(value as number) }}</span>
        </template>
      </YTable>
    </YCard>
  </div>
</template>
