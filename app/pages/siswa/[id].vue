<script setup lang="ts">
definePageMeta({ title: 'Detail Siswa' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const id = computed(() => String(route.params.id))

const { jenisOptions, tahunAjaranAktif, opsi } = useOpsi()

const { data, refresh, pending } = useLazyFetch<any>(() => `/api/siswa/${id.value}`, {
  default: () => null,
})

const siswa = computed(() => data.value?.siswa ?? null)
const ringkasan = computed(() => data.value?.ringkasan ?? { saldo: 0, totalTagihan: 0, totalTerbayar: 0, sisa: 0 })

const tab = ref('tagihan')
const tagihanRows = computed<any[]>(() => data.value?.tagihan ?? [])
const tunggakan = computed(() =>
  tagihanRows.value.filter((t) => t.status !== 'lunas' && t.status !== 'dibatalkan'),
)
const riwayat = computed<any[]>(() => data.value?.pembayaran ?? [])
const mutasi = computed<any[]>(() => data.value?.mutasi ?? [])

const activeTaName = computed(() => tahunAjaranAktif.value?.nama ?? '')

function isLampau(t: any): boolean {
  return t.status !== 'lunas' && t.status !== 'dibatalkan' && t.tahunAjaranNama !== activeTaName.value
}

const tagihanColumns: YColumn[] = [
  { key: 'jenis', label: 'Jenis tagihan' },
  { key: 'tahunAjaranNama', label: 'Asal tahun ajaran', width: '160px' },
  { key: 'periodeKe', label: 'Periode', width: '110px' },
  { key: 'nominalTagihan', label: 'Nominal', align: 'right' },
  { key: 'totalTerbayar', label: 'Terbayar', align: 'right' },
  { key: 'sisa', label: 'Sisa', align: 'right' },
  { key: 'status', label: 'Status', width: '140px' },
]

const tagihanTable = computed(() =>
  tagihanRows.value.map((t) => ({
    ...t,
    jenis: t.jenisNama ?? t.keterangan ?? 'Tagihan manual',
    sisa: t.nominalTagihan - t.totalTerbayar,
  })),
)

const pembayaranColumns: YColumn[] = [
  { key: 'nomorKuitansi', label: 'No. kuitansi', width: '210px' },
  { key: 'tanggalBayar', label: 'Tanggal' },
  { key: 'metode', label: 'Metode', width: '110px' },
  { key: 'totalBayar', label: 'Total', align: 'right' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '80px' },
]

const mutasiRows = computed(() =>
  mutasi.value.map((m) => ({
    ...m,
    tanda: m.tipe === 'masuk' ? '+' : '−',
  })),
)

const mutasiColumns: YColumn[] = [
  { key: 'createdAt', label: 'Tanggal' },
  { key: 'tipe', label: 'Tipe', width: '110px' },
  { key: 'nominal', label: 'Nominal', align: 'right' },
  { key: 'keterangan', label: 'Keterangan' },
]

// Tambah tagihan manual
const tagihanModal = ref(false)
const tagihanForm = reactive({ jenisPembayaranId: '', nominal: 0, keterangan: '' })
const tagihanSaving = ref(false)

async function submitTagihan() {
  if (!tagihanForm.jenisPembayaranId || Number(tagihanForm.nominal) <= 0) {
    toast.add({ title: 'Lengkapi data', description: 'Pilih jenis dan isi nominal lebih dari nol.', icon: 'lucide:circle-alert', color: 'warning' })
    return
  }
  tagihanSaving.value = true
  try {
    await $fetch('/api/tagihan/manual', {
      method: 'POST',
      body: {
        siswaId: id.value,
        jenisPembayaranId: tagihanForm.jenisPembayaranId,
        nominal: Number(tagihanForm.nominal),
        keterangan: tagihanForm.keterangan || null,
      },
    })
    toast.add({ title: 'Tagihan diterbitkan', description: 'Tagihan manual berhasil dibuat.', icon: 'lucide:check', color: 'success' })
    tagihanModal.value = false
    tagihanForm.jenisPembayaranId = ''
    tagihanForm.nominal = 0
    tagihanForm.keterangan = ''
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Gagal', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    tagihanSaving.value = false
  }
}

// Saldo keluar
const saldoModal = ref(false)
const saldoForm = reactive({ nominal: 0, keterangan: '' })
const saldoSaving = ref(false)

async function submitSaldo() {
  if (Number(saldoForm.nominal) <= 0 || !saldoForm.keterangan) {
    toast.add({ title: 'Lengkapi data', description: 'Isi nominal dan keterangan.', icon: 'lucide:circle-alert', color: 'warning' })
    return
  }
  saldoSaving.value = true
  try {
    await $fetch(`/api/siswa/${id.value}/saldo-keluar`, {
      method: 'POST',
      body: { nominal: Number(saldoForm.nominal), keterangan: saldoForm.keterangan },
    })
    toast.add({ title: 'Saldo dikembalikan', description: 'Mutasi saldo keluar tercatat.', icon: 'lucide:check', color: 'success' })
    saldoModal.value = false
    saldoForm.nominal = 0
    saldoForm.keterangan = ''
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Gagal', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    saldoSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <UButton icon="lucide:arrow-left" color="neutral" variant="ghost" size="sm" to="/siswa">Kembali ke daftar siswa</UButton>

    <div v-if="pending && !siswa" class="text-sm text-[var(--color-text-subtle)]">Memuat…</div>

    <template v-else-if="siswa">
      <YCard>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-title font-bold text-[var(--color-primary)]">
              {{ siswa.nama?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h2 class="text-title font-bold text-[var(--color-text)]">{{ siswa.nama }}</h2>
              <p class="mt-0.5 text-sm text-[var(--color-text-muted)]">
                NIS {{ siswa.nis }}
                <template v-if="siswa.nisn"> · NISN {{ siswa.nisn }}</template>
                · {{ siswa.sekolahNama }}
                <template v-if="siswa.jurusanNama"> · {{ siswa.jurusanNama }}</template>
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <YStatusBadge :status="siswa.status" jenis="siswa" />
                <span v-if="data?.penempatan?.[0]">
                  Rombel {{ rombelLabel(data.penempatan[0].tingkat, data.penempatan[0].rombelNama) }}
                  · {{ data.penempatan[0].tahunAjaranNama }}
                </span>
                <span v-else class="text-[var(--color-text-subtle)]">Belum ditempatkan</span>
              </div>
              <p v-if="siswa.namaWali" class="mt-1 text-sm text-[var(--color-text-subtle)]">
                Wali: {{ siswa.namaWali }}<template v-if="siswa.noHpWali"> · {{ siswa.noHpWali }}</template>
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton icon="lucide:receipt-text" color="neutral" variant="outline" @click="tagihanModal = true">Tambah tagihan</UButton>
            <UButton icon="lucide:banknote" :to="`/pembayaran/baru?siswa=${id}`">Input pembayaran</UButton>
          </div>
        </div>
      </YCard>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <YKpi label="Total tagihan" :value="formatRupiah(ringkasan.totalTagihan)" icon="lucide:receipt-text" />
        <YKpi label="Total terbayar" :value="formatRupiah(ringkasan.totalTerbayar)" icon="lucide:circle-check" />
        <YKpi label="Sisa tagihan" :value="formatRupiah(ringkasan.sisa)" icon="lucide:triangle-alert" />
        <YKpi label="Saldo siswa" :value="formatRupiah(ringkasan.saldo)" icon="lucide:wallet" />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <YTabs
          v-model="tab"
          :items="[
            { label: 'Tagihan', value: 'tagihan', count: tagihanRows.length },
            { label: 'Riwayat pembayaran', value: 'pembayaran', count: riwayat.length },
            { label: 'Saldo', value: 'saldo', count: mutasi.length },
          ]"
        />
        <UButton v-if="tab === 'saldo' && ringkasan.saldo > 0" icon="lucide:hand-coins" color="neutral" variant="outline" @click="saldoModal = true">
          Kembalikan saldo
        </UButton>
      </div>

      <YCard v-if="tab === 'tagihan'">
        <p v-if="tunggakan.length" class="mb-3 text-sm text-[var(--color-danger)]">
          <UIcon name="lucide:triangle-alert" class="mr-1 inline size-4" aria-hidden="true" />
          Siswa memiliki {{ tunggakan.length }} tagihan belum lunas. Tagihan tetap terbawa saat naik kelas.
        </p>
        <YTable :columns="tagihanColumns" :rows="tagihanTable" :loading="pending" empty="Belum ada tagihan.">
          <template #cell-periodeKe="{ value }">{{ value ? periodeLabel(value as number) : '—' }}</template>
          <template #cell-nominalTagihan="{ value }">{{ formatRupiah(value as number) }}</template>
          <template #cell-totalTerbayar="{ value }">{{ formatRupiah(value as number) }}</template>
          <template #cell-sisa="{ value }">{{ formatRupiah(value as number) }}</template>
          <template #cell-tahunAjaranNama="{ row }">
            <span :class="isLampau(row) ? 'font-semibold text-[var(--color-danger)]' : ''">
              {{ row.tahunAjaranNama }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <YStatusBadge :status="row.status" />
              <span
                v-if="isLampau(row)"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                :style="{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' }"
              >
                <UIcon name="lucide:triangle-alert" class="size-3.5" aria-hidden="true" />
                Tunggakan lampau
              </span>
            </span>
          </template>
        </YTable>
      </YCard>

      <YCard v-else-if="tab === 'pembayaran'">
        <YTable :columns="pembayaranColumns" :rows="riwayat" :loading="pending" empty="Belum ada pembayaran.">
          <template #cell-tanggalBayar="{ value }">{{ formatTanggalJam(value as string) }}</template>
          <template #cell-metode="{ value }">{{ METODE_BAYAR[value as string] ?? value }}</template>
          <template #cell-totalBayar="{ value }">{{ formatRupiah(value as number) }}</template>
          <template #cell-status="{ value }"><YStatusBadge :status="String(value)" jenis="pembayaran" /></template>
          <template #cell-__actions="{ row }">
            <UButton icon="lucide:printer" color="neutral" variant="ghost" size="xs" square aria-label="Kuitansi" @click="router.push(`/pembayaran/${row.id}/kuitansi?salinan=1`)" />
          </template>
        </YTable>
      </YCard>

      <YCard v-else>
        <YTable :columns="mutasiColumns" :rows="mutasiRows" :loading="pending" empty="Belum ada mutasi saldo.">
          <template #cell-createdAt="{ value }">{{ formatTanggalJam(value as string) }}</template>
          <template #cell-tipe="{ value }">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              :style="value === 'masuk'
                ? { color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' }
                : { color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }"
            >
              <UIcon :name="value === 'masuk' ? 'lucide:arrow-down-left' : 'lucide:arrow-up-right'" class="size-3.5" aria-hidden="true" />
              {{ value === 'masuk' ? 'Masuk' : 'Keluar' }}
            </span>
          </template>
          <template #cell-nominal="{ row }">
            <span class="tnum font-semibold">{{ row.tanda }}{{ formatRupiah(row.nominal) }}</span>
          </template>
        </YTable>
      </YCard>
    </template>

    <UModal v-model:open="tagihanModal" title="Tambah tagihan manual" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Jenis pembayaran" required>
            <USelect v-model="tagihanForm.jenisPembayaranId" :items="jenisOptions" class="w-full" />
          </UFormField>
          <UFormField label="Nominal (Rp)" required>
            <UInput v-model="tagihanForm.nominal" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Alasan / keterangan" help="mis. tagihan khusus atau susulan.">
            <UTextarea v-model="tagihanForm.keterangan" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="tagihanModal = false">Batal</UButton>
          <UButton icon="lucide:save" :loading="tagihanSaving" @click="submitTagihan">Simpan</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="saldoModal" title="Kembalikan saldo siswa" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-[var(--color-text-muted)]">
            Saldo tersedia: <strong class="tnum">{{ formatRupiah(ringkasan.saldo) }}</strong>. Pengembalian dicatat sebagai mutasi keluar.
          </p>
          <UFormField label="Nominal (Rp)" required>
            <UInput v-model="saldoForm.nominal" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Keterangan" required>
            <UInput v-model="saldoForm.keterangan" class="w-full" placeholder="mis. dikembalikan karena lulus" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="saldoModal = false">Batal</UButton>
          <UButton icon="lucide:hand-coins" :loading="saldoSaving" @click="submitSaldo">Kembalikan saldo</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
