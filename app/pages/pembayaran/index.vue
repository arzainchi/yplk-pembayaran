<script setup lang="ts">
definePageMeta({ title: 'Pembayaran' })

const toast = useToast()
const router = useRouter()
const { sekolahOptions } = useOpsi()

const page = ref(1)
const pageSize = ref(25)
const q = ref('')
const fSekolah = ref('all')
const fMetode = ref('all')
const fStatus = ref('all')
const fDari = ref('')
const fSampai = ref('')

const query = computed(() => {
  const out: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
  if (q.value.trim()) out.q = q.value.trim()
  if (fSekolah.value !== 'all') out.sekolahId = fSekolah.value
  if (fMetode.value !== 'all') out.metode = fMetode.value
  if (fStatus.value !== 'all') out.status = fStatus.value
  if (fDari.value) out.dari = fDari.value
  if (fSampai.value) out.sampai = fSampai.value
  return out
})

const { data, refresh, pending } = await useFetch<any>('/api/pembayaran', { query, default: () => ({ items: [], total: 0 }) })
watch([q, fSekolah, fMetode, fStatus, fDari, fSampai], () => { page.value = 1 })

const columns: YColumn[] = [
  { key: 'nomorKuitansi', label: 'No. kuitansi', width: '200px' },
  { key: 'siswaNama', label: 'Siswa' },
  { key: 'tanggalBayar', label: 'Tanggal' },
  { key: 'metode', label: 'Metode', width: '110px' },
  { key: 'totalBayar', label: 'Total', align: 'right' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '130px' },
]

const voidOpen = ref(false)
const voidTarget = ref<any>(null)
const voidAlasan = ref('')
const voidSaving = ref(false)

function askVoid(row: any) {
  voidTarget.value = row
  voidAlasan.value = ''
  voidOpen.value = true
}

async function confirmVoid() {
  if (!voidAlasan.value.trim()) {
    toast.add({ title: 'Alasan wajib diisi', description: 'Tuliskan alasan pembatalan.', icon: 'lucide:circle-alert', color: 'warning' })
    return
  }
  voidSaving.value = true
  try {
    await $fetch(`/api/pembayaran/${voidTarget.value.id}/void`, { method: 'POST', body: { alasan: voidAlasan.value } })
    toast.add({ title: 'Pembayaran dibatalkan', description: 'Sisa tagihan telah dipulihkan.', icon: 'lucide:ban', color: 'success' })
    voidOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Gagal membatalkan', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    voidSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput v-model="q" icon="lucide:search" placeholder="Cari nomor kuitansi atau siswa…" class="w-full sm:w-[240px]" />
        <UInput v-model="fDari" type="date" class="w-full sm:w-[160px]" />
        <UInput v-model="fSampai" type="date" class="w-full sm:w-[160px]" />
        <USelect v-model="fSekolah" :items="[{ label: 'Semua sekolah', value: 'all' }, ...sekolahOptions]" class="w-full sm:w-[170px]" />
        <USelect v-model="fMetode" :items="[{ label: 'Semua metode', value: 'all' }, { label: 'Tunai', value: 'tunai' }, { label: 'Transfer', value: 'transfer' }]" class="w-full sm:w-[160px]" />
        <USelect v-model="fStatus" :items="[{ label: 'Semua status', value: 'all' }, { label: 'Aktif', value: 'aktif' }, { label: 'Batal', value: 'batal' }]" class="w-full sm:w-[150px]" />
      </div>
      <UButton icon="lucide:plus" to="/pembayaran/baru">Input pembayaran</UButton>
    </div>

    <YCard description="Transaksi tidak dapat diubah. Koreksi dilakukan lewat pembatalan lalu input ulang.">
      <YTable :columns="columns" :rows="data?.items ?? []" :loading="pending" empty="Belum ada transaksi pembayaran.">
        <template #cell-nomorKuitansi="{ value }">
          <span class="tnum font-semibold">{{ value }}</span>
        </template>
        <template #cell-siswaNama="{ row }">
          <button type="button" class="text-left font-semibold text-[var(--color-primary)] hover:underline" @click="router.push(`/siswa/${row.siswaId}`)">
            {{ row.siswaNama }}
          </button>
          <span class="block text-sm text-[var(--color-text-subtle)]">{{ row.siswaNis }}</span>
        </template>
        <template #cell-tanggalBayar="{ value }">{{ formatTanggalJam(value as string) }}</template>
        <template #cell-metode="{ row }">
          {{ METODE_BAYAR[row.metode] ?? row.metode }}
          <span v-if="row.nomorReferensi" class="block text-sm text-[var(--color-text-subtle)]">{{ row.nomorReferensi }}</span>
        </template>
        <template #cell-totalBayar="{ value }">{{ formatRupiah(value as number) }}</template>
        <template #cell-status="{ value }"><YStatusBadge :status="String(value)" jenis="pembayaran" /></template>
        <template #cell-__actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UButton icon="lucide:printer" color="neutral" variant="ghost" size="xs" square aria-label="Cetak kuitansi" @click="router.push(`/pembayaran/${row.id}/kuitansi?salinan=1`)" />
            <UButton v-if="row.status === 'aktif'" icon="lucide:ban" color="error" variant="ghost" size="xs" square aria-label="Batalkan" @click="askVoid(row)" />
          </div>
        </template>
      </YTable>

      <YPager :page="page" :page-size="pageSize" :total="data?.total ?? 0" @update:page="(v:number)=>page=v" @update:page-size="(v:number)=>pageSize=v" />
    </YCard>

    <UModal v-model:open="voidOpen" title="Batalkan pembayaran" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="subtle"
            icon="lucide:triangle-alert"
            title="Data tidak dihapus"
            description="Status berubah menjadi Dibatalkan, sisa tagihan dipulihkan, dan kuitansi ditandai BATAL."
          />
          <p v-if="voidTarget" class="text-sm text-[var(--color-text-muted)]">
            Kuitansi <strong class="tnum">{{ voidTarget.nomorKuitansi }}</strong> — {{ formatRupiah(voidTarget.totalBayar) }}
          </p>
          <UFormField label="Alasan pembatalan" required>
            <UTextarea v-model="voidAlasan" class="w-full" placeholder="mis. salah input nominal" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="voidOpen = false">Batal</UButton>
          <UButton color="error" variant="soft" icon="lucide:ban" :loading="voidSaving" @click="confirmVoid">Batalkan pembayaran</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
