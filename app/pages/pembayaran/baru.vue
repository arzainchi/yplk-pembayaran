<script setup lang="ts">
definePageMeta({ title: 'Input Pembayaran' })

const toast = useToast()
const route = useRoute()

const siswaQuery = ref('')
const siswaResults = ref<any[]>([])
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const detail = ref<any>(null)
const loadingDetail = ref(false)

const metode = ref<'tunai' | 'transfer'>('tunai')
const nomorReferensi = ref('')
const totalBayar = ref(0)
const pakaiSaldo = ref(false)
const saving = ref(false)

const selected = reactive<Record<string, boolean>>({})
const nominal = reactive<Record<string, number>>({})

const siswa = computed(() => detail.value?.siswa ?? null)
const saldo = computed(() => Number(detail.value?.ringkasan?.saldo ?? 0))

const belumLunas = computed<any[]>(() =>
  (detail.value?.tagihan ?? []).filter(
    (t: any) => t.status !== 'lunas' && t.status !== 'dibatalkan' && t.nominalTagihan - t.totalTerbayar > 0,
  ),
)

const dipilih = computed(() => belumLunas.value.filter((t) => selected[t.id]))

const totalDipilih = computed(() =>
  dipilih.value.reduce((acc, t) => acc + Math.min(Number(nominal[t.id] ?? 0), t.nominalTagihan - t.totalTerbayar), 0),
)

const saldoDipakai = computed(() => (pakaiSaldo.value ? Math.min(saldo.value, Math.max(0, totalDipilih.value - totalBayar.value)) : 0))
const kurang = computed(() => Math.max(0, totalDipilih.value - totalBayar.value - saldoDipakai.value))
const kelebihan = computed(() => Math.max(0, totalBayar.value + saldoDipakai.value - totalDipilih.value))

function isLampau(t: any): boolean {
  return t.tahunAjaranNama !== activeTaNama.value
}
const activeTa = useOpsi().tahunAjaranAktif
const activeTaNama = computed(() => activeTa.value?.nama ?? '')

async function searchSiswa() {
  const term = siswaQuery.value.trim()
  if (term.length < 2) {
    siswaResults.value = []
    return
  }
  searching.value = true
  try {
    const res = await $fetch<any>('/api/siswa', { query: { q: term, pageSize: 8, page: 1 } })
    siswaResults.value = res.items ?? []
  } finally {
    searching.value = false
  }
}

watch(siswaQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(searchSiswa, 250)
})

async function pilihSiswa(row: any) {
  siswaQuery.value = ''
  siswaResults.value = []
  await loadDetail(row.id)
}

async function loadDetail(id: string) {
  loadingDetail.value = true
  try {
    detail.value = await $fetch<any>(`/api/siswa/${id}`)
    for (const key of Object.keys(selected)) delete selected[key]
    for (const key of Object.keys(nominal)) delete nominal[key]
    totalBayar.value = 0
    pakaiSaldo.value = false
    metode.value = 'tunai'
    nomorReferensi.value = ''
  } catch (error: any) {
    toast.add({ title: 'Gagal memuat siswa', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    loadingDetail.value = false
  }
}

function toggleTagihan(t: any) {
  selected[t.id] = !selected[t.id]
  if (selected[t.id]) {
    nominal[t.id] = t.nominalTagihan - t.totalTerbayar
  }
  syncTotal()
}

function syncTotal() {
  const cashNeeded = Math.max(0, totalDipilih.value - (pakaiSaldo.value ? Math.min(saldo.value, totalDipilih.value) : 0))
  totalBayar.value = cashNeeded
}

watch(pakaiSaldo, syncTotal)
watch(totalDipilih, syncTotal)

async function simpan(cetak: boolean) {
  if (!siswa.value) return
  if (dipilih.value.length === 0) {
    toast.add({ title: 'Pilih tagihan', description: 'Centang minimal satu tagihan yang dibayar.', icon: 'lucide:circle-alert', color: 'warning' })
    return
  }
  if (kurang.value > 0) {
    toast.add({ title: 'Nominal kurang', description: `Masih kurang ${formatRupiah(kurang.value)} dari total yang dialokasikan.`, icon: 'lucide:circle-alert', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const res = await $fetch<any>('/api/pembayaran', {
      method: 'POST',
      body: {
        siswaId: siswa.value.id,
        metode: metode.value,
        nomorReferensi: nomorReferensi.value || null,
        totalBayar: Number(totalBayar.value),
        pakaiSaldo: pakaiSaldo.value,
        alokasi: dipilih.value.map((t) => ({ tagihanId: t.id, nominal: Number(nominal[t.id]) })),
      },
    })
    toast.add({ title: 'Tersimpan', description: `Kuitansi ${res.pembayaran.nomorKuitansi} dibuat.`, icon: 'lucide:check', color: 'success' })
    if (cetak) {
      await navigateTo(`/pembayaran/${res.pembayaran.id}/kuitansi`)
    } else {
      await navigateTo('/pembayaran')
    }
  } catch (error: any) {
    toast.add({ title: 'Gagal menyimpan', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const prefill = route.query.siswa
  if (typeof prefill === 'string' && prefill) await loadDetail(prefill)
})
</script>

<template>
  <div class="space-y-5">
    <UButton icon="lucide:arrow-left" color="neutral" variant="ghost" size="sm" to="/pembayaran">Kembali ke daftar pembayaran</UButton>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <!-- Kiri: siswa + tagihan -->
      <YCard title="Pilih siswa & tagihan">
        <div class="relative">
          <UInput
            v-model="siswaQuery"
            icon="lucide:search"
            size="lg"
            class="w-full"
            placeholder="Cari nama, NIS, atau NISN…"
            :loading="searching"
          />
          <div v-if="siswaResults.length" class="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)]">
            <button
              v-for="item in siswaResults"
              :key="item.id"
              type="button"
              class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-hover)]"
              @click="pilihSiswa(item)"
            >
              <span class="min-w-0">
                <span class="block truncate font-semibold">{{ item.nama }}</span>
                <span class="block truncate text-sm text-[var(--color-text-subtle)]">{{ item.nis }} · {{ item.sekolahNama }}</span>
              </span>
              <UIcon name="lucide:chevron-right" class="size-4 shrink-0 text-[var(--color-text-subtle)]" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div v-if="loadingDetail" class="py-8 text-center text-sm text-[var(--color-text-subtle)]">Memuat tagihan…</div>

        <template v-else-if="siswa">
          <div class="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
            <p class="font-semibold text-[var(--color-text)]">{{ siswa.nama }}</p>
            <p class="text-sm text-[var(--color-text-muted)]">
              NIS {{ siswa.nis }} · {{ siswa.sekolahNama }}
              <template v-if="siswa.jurusanNama"> · {{ siswa.jurusanNama }}</template>
            </p>
            <p v-if="saldo > 0" class="mt-1 text-sm text-[var(--color-success)]">Saldo tersedia: {{ formatRupiah(saldo) }}</p>
          </div>

          <p v-if="!belumLunas.length" class="mt-4 text-sm text-[var(--color-text-subtle)]">
            Tidak ada tagihan yang perlu dibayar. Siswa ini lunas.
          </p>

          <ul v-else class="mt-4 space-y-2">
            <li
              v-for="t in belumLunas"
              :key="t.id"
              class="rounded-md border p-3 transition-colors"
              :class="selected[t.id] ? 'border-[var(--color-focus-border)] bg-[var(--color-row-selected)]' : 'border-[var(--color-border)]'"
            >
              <div class="flex items-start gap-3">
                <UCheckbox :model-value="!!selected[t.id]" @update:model-value="toggleTagihan(t)" />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold">{{ t.jenisNama ?? t.keterangan ?? 'Tagihan' }}</span>
                    <YStatusBadge :status="t.status" />
                    <span
                      v-if="isLampau(t)"
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                      :style="{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' }"
                    >
                      <UIcon name="lucide:triangle-alert" class="size-3.5" aria-hidden="true" />
                      Tunggakan lampau
                    </span>
                  </div>
                  <p class="mt-0.5 text-sm text-[var(--color-text-muted)]">
                    Asal {{ t.tahunAjaranNama }}<template v-if="t.periodeKe"> · {{ periodeLabel(t.periodeKe) }}</template>
                    · Sisa <span class="tnum font-semibold">{{ formatRupiah(t.nominalTagihan - t.totalTerbayar) }}</span>
                  </p>
                </div>
                <div v-if="selected[t.id]" class="w-[140px] shrink-0">
                  <UInput v-model="nominal[t.id]" type="number" size="sm" class="w-full text-right" @update:model-value="syncTotal" />
                </div>
              </div>
            </li>
          </ul>
        </template>

        <p v-else class="mt-4 text-sm text-[var(--color-text-subtle)]">
          Cari siswa untuk menampilkan daftar tagihannya. Tagihan tertua tampil paling atas.
        </p>
      </YCard>

      <!-- Kanan: ringkasan -->
      <YCard title="Ringkasan pembayaran">
        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-md bg-[var(--color-surface-subtle)] px-3 py-2.5">
            <span class="text-sm text-[var(--color-text-muted)]">Total dipilih</span>
            <span class="tnum text-title font-bold">{{ formatRupiah(totalDipilih) }}</span>
          </div>

          <div>
            <p class="mb-1.5 text-sm font-medium text-[var(--color-text-muted)]">Metode bayar</p>
            <div class="inline-flex items-stretch divide-x divide-[var(--color-border)] rounded-md border border-[var(--color-border)] p-1">
              <button
                type="button"
                class="rounded-[9px] px-3 py-1.5 text-base transition-colors"
                :class="metode === 'tunai' ? 'bg-[var(--color-surface)] font-semibold shadow-[0_1px_2px_rgba(23,23,43,.06)] ring-1 ring-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'"
                @click="metode = 'tunai'"
              >
                Tunai
              </button>
              <button
                type="button"
                class="rounded-[9px] px-3 py-1.5 text-base transition-colors"
                :class="metode === 'transfer' ? 'bg-[var(--color-surface)] font-semibold shadow-[0_1px_2px_rgba(23,23,43,.06)] ring-1 ring-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'"
                @click="metode = 'transfer'"
              >
                Transfer
              </button>
            </div>
          </div>

          <UFormField v-if="metode === 'transfer'" label="Nomor referensi">
            <UInput v-model="nomorReferensi" class="w-full" placeholder="mis. TRF-123456" />
          </UFormField>

          <UFormField label="Nominal diterima (Rp)">
            <UInput v-model="totalBayar" type="number" size="lg" class="w-full" />
          </UFormField>

          <div v-if="saldo > 0" class="rounded-md border border-[var(--color-border)] p-3">
            <UCheckbox v-model="pakaiSaldo" label="Gunakan saldo siswa" />
            <p class="mt-1 text-sm text-[var(--color-text-subtle)]">
              Saldo tersedia {{ formatRupiah(saldo) }}<template v-if="saldoDipakai > 0"> · dipakai {{ formatRupiah(saldoDipakai) }}</template>
            </p>
          </div>

          <div class="space-y-1.5 border-t border-[var(--color-border)] pt-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-[var(--color-text-muted)]">Masuk saldo</span>
              <span class="tnum font-semibold text-[var(--color-success)]">{{ formatRupiah(kelebihan) }}</span>
            </div>
            <div v-if="kurang > 0" class="flex items-center justify-between text-sm">
              <span class="text-[var(--color-danger)]">Kurang</span>
              <span class="tnum font-semibold text-[var(--color-danger)]">{{ formatRupiah(kurang) }}</span>
            </div>
          </div>

          <div class="space-y-2 pt-1">
            <UButton
              block
              size="lg"
              icon="lucide:printer"
              :loading="saving"
              :disabled="!siswa || dipilih.length === 0 || kurang > 0"
              @click="simpan(true)"
            >
              Simpan dan cetak kuitansi
            </UButton>
            <UButton
              block
              size="lg"
              color="neutral"
              variant="outline"
              icon="lucide:save"
              :loading="saving"
              :disabled="!siswa || dipilih.length === 0 || kurang > 0"
              @click="simpan(false)"
            >
              Simpan saja
            </UButton>
          </div>
        </div>
      </YCard>
    </div>
  </div>
</template>
