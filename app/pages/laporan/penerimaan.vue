<script setup lang="ts">
definePageMeta({ title: 'Rekap Penerimaan' })

const { sekolahOptions, jenisOptions } = useOpsi()

const today = new Date()
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
const dari = ref(firstOfMonth)
const sampai = ref(new Intl.DateTimeFormat('en-CA').format(today))
const fSekolah = ref('all')
const fJenis = ref('all')
const fMetode = ref('all')

const query = computed(() => {
  const out: Record<string, string> = { dari: dari.value, sampai: sampai.value }
  if (fSekolah.value !== 'all') out.sekolahId = fSekolah.value
  if (fJenis.value !== 'all') out.jenisPembayaranId = fJenis.value
  if (fMetode.value !== 'all') out.metode = fMetode.value
  return out
})

const { data, pending } = await useFetch<any>('/api/laporan/penerimaan', {
  query,
  default: () => ({ ringkasan: [], perJenis: [], perMetode: [], perSekolah: [], transaksi: [], periode: {} }),
})

const excelUrl = computed(() => `/api/laporan/penerimaan.xlsx?${new URLSearchParams(query.value).toString()}`)

const columns: YColumn[] = [
  { key: 'nomor_kuitansi', label: 'No. kuitansi', width: '200px' },
  { key: 'tanggal_bayar', label: 'Tanggal' },
  { key: 'siswa_nama', label: 'Siswa' },
  { key: 'sekolah', label: 'Sekolah', hideOnMobile: true },
  { key: 'metode', label: 'Metode', width: '100px' },
  { key: 'total_bayar', label: 'Total', align: 'right' },
  { key: 'petugas', label: 'Petugas', hideOnMobile: true },
]

const total = computed(() => Number(data.value?.ringkasan?.[0]?.total ?? 0))
const jumlah = computed(() => Number(data.value?.ringkasan?.[0]?.transaksi ?? 0))
</script>

<template>
  <div class="space-y-5">
    <div class="no-print flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput v-model="dari" type="date" class="w-full sm:w-[160px]" />
        <span class="text-sm text-[var(--color-text-subtle)]">s/d</span>
        <UInput v-model="sampai" type="date" class="w-full sm:w-[160px]" />
        <USelect v-model="fSekolah" :items="[{ label: 'Semua sekolah', value: 'all' }, ...sekolahOptions]" class="w-full sm:w-[170px]" />
        <USelect v-model="fJenis" :items="[{ label: 'Semua jenis', value: 'all' }, ...jenisOptions]" class="w-full sm:w-[150px]" />
        <USelect v-model="fMetode" :items="[{ label: 'Semua metode', value: 'all' }, { label: 'Tunai', value: 'tunai' }, { label: 'Transfer', value: 'transfer' }]" class="w-full sm:w-[150px]" />
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="lucide:printer" color="neutral" variant="outline" @click="() => window.print()">Cetak / PDF</UButton>
        <UButton icon="lucide:file-spreadsheet" :to="excelUrl" external>Ekspor Excel</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <YKpi label="Total penerimaan" :value="formatRupiah(total)" icon="lucide:wallet" />
      <YKpi label="Jumlah transaksi" :value="String(jumlah)" icon="lucide:receipt-text" />
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <YCard title="Per jenis pembayaran">
        <ul class="space-y-2">
          <li v-for="j in data?.perJenis ?? []" :key="j.jenis" class="flex items-center justify-between gap-3 text-base">
            <span class="truncate text-[var(--color-text-muted)]">{{ j.jenis }}</span>
            <span class="tnum font-semibold">{{ formatRupiah(j.total) }}</span>
          </li>
          <li v-if="!(data?.perJenis ?? []).length" class="text-sm text-[var(--color-text-subtle)]">Tidak ada data.</li>
        </ul>
      </YCard>

      <YCard title="Per metode bayar">
        <ul class="space-y-2">
          <li v-for="m in data?.perMetode ?? []" :key="m.metode" class="flex items-center justify-between gap-3 text-base">
            <span class="text-[var(--color-text-muted)]">{{ METODE_BAYAR[m.metode] ?? m.metode }} · {{ m.transaksi }} trx</span>
            <span class="tnum font-semibold">{{ formatRupiah(m.total) }}</span>
          </li>
          <li v-if="!(data?.perMetode ?? []).length" class="text-sm text-[var(--color-text-subtle)]">Tidak ada data.</li>
        </ul>
      </YCard>

      <YCard title="Per sekolah">
        <ul class="space-y-2">
          <li v-for="s in data?.perSekolah ?? []" :key="s.sekolah" class="flex items-center justify-between gap-3 text-base">
            <span class="truncate text-[var(--color-text-muted)]">{{ s.sekolah }}</span>
            <span class="tnum font-semibold">{{ formatRupiah(s.total) }}</span>
          </li>
          <li v-if="!(data?.perSekolah ?? []).length" class="text-sm text-[var(--color-text-subtle)]">Tidak ada data.</li>
        </ul>
      </YCard>
    </div>

    <YCard :title="`Transaksi (${data?.transaksi?.length ?? 0})`">
      <YTable :columns="columns" :rows="data?.transaksi ?? []" :loading="pending" empty="Belum ada penerimaan pada periode ini.">
        <template #cell-nomor_kuitansi="{ value }"><span class="tnum font-semibold">{{ value }}</span></template>
        <template #cell-tanggal_bayar="{ value }">{{ formatTanggalJam(value as string) }}</template>
        <template #cell-metode="{ value }">{{ METODE_BAYAR[value as string] ?? value }}</template>
        <template #cell-total_bayar="{ value }">{{ formatRupiah(value as number) }}</template>
      </YTable>
    </YCard>
  </div>
</template>
