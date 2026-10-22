<script setup lang="ts">
definePageMeta({ title: 'Kenaikan Kelas' })

const toast = useToast()
const { opsi } = useOpsi()

const semuaRombel = computed(() => opsi.value?.rombel ?? [])
const taById = computed<Record<string, any>>(() =>
  Object.fromEntries((opsi.value?.tahunAjaran ?? []).map((t) => [t.id, t])),
)
const sekolahById = computed<Record<string, any>>(() =>
  Object.fromEntries((opsi.value?.sekolah ?? []).map((s) => [s.id, s])),
)

const rombelAsalId = ref('')
const tahunTujuanId = ref('')
const rombelTujuanId = ref('')
const rombelTinggalId = ref('')

const asal = computed(() => semuaRombel.value.find((r) => r.id === rombelAsalId.value) ?? null)

const rombelAsalOptions = computed(() =>
  semuaRombel.value.map((r) => ({
    label: `${rombelLabel(r.tingkat, r.nama)} · ${sekolahById.value[r.sekolahId]?.kode ?? '—'} · ${taById.value[r.tahunAjaranId]?.nama ?? '—'}`,
    value: r.id,
  })),
)

const tahunTujuanOptions = computed(() =>
  (opsi.value?.tahunAjaran ?? [])
    .filter((t) => t.id !== asal.value?.tahunAjaranId)
    .map((t) => ({ label: t.nama, value: t.id })),
)

const rombelSekolah = (tingkat: number) =>
  semuaRombel.value.filter(
    (r) => r.tahunAjaranId === tahunTujuanId.value && r.sekolahId === asal.value?.sekolahId && r.tingkat === tingkat,
  )

const opsiTujuan = computed(() =>
  rombelSekolah((asal.value?.tingkat ?? 0) + 1).map((r) => ({ label: rombelLabel(r.tingkat, r.nama), value: r.id })),
)
const opsiTinggal = computed(() =>
  rombelSekolah(asal.value?.tingkat ?? 0).map((r) => ({ label: rombelLabel(r.tingkat, r.nama), value: r.id })),
)

watch(asal, (r) => {
  const daftarTa = [...(opsi.value?.tahunAjaran ?? [])].sort((a, b) => a.nama.localeCompare(b.nama))
  const asalTa = daftarTa.find((t) => t.id === r?.tahunAjaranId)
  const berikut = asalTa ? daftarTa.find((t) => t.nama > asalTa.nama) : undefined
  tahunTujuanId.value = berikut?.id ?? daftarTa.find((t) => t.id !== r?.tahunAjaranId)?.id ?? ''
})

watch(
  [asal, tahunTujuanId],
  () => {
    rombelTujuanId.value = opsiTujuan.value[0]?.value ?? ''
    rombelTinggalId.value = opsiTinggal.value[0]?.value ?? ''
  },
  { immediate: true },
)

const { data: preview, pending, refresh } = useLazyFetch<any>('/api/akademik/kenaikan-kelas', {
  query: computed(() => ({ rombelId: rombelAsalId.value || undefined })),
  immediate: false,
  watch: [rombelAsalId],
  default: () => ({ rombel: null, items: [], totalTunggakan: 0, jumlahBertunggakan: 0 }),
})

const tujuanSiswa = reactive<Record<string, 'naik' | 'tinggal' | 'lulus'>>({})
const dipilih = reactive<Record<string, boolean>>({})

watch(preview, (d) => {
  for (const k of Object.keys(tujuanSiswa)) delete tujuanSiswa[k]
  for (const k of Object.keys(dipilih)) delete dipilih[k]
  const bawaan = opsiTujuan.value.length ? 'naik' : 'lulus'
  for (const it of d?.items ?? []) {
    tujuanSiswa[it.siswaId] = bawaan
    dipilih[it.siswaId] = true
  }
})

const items = computed<any[]>(() => preview.value?.items ?? [])

const tujuanItems = computed(() => [
  ...(opsiTujuan.value.length ? [{ label: 'Naik kelas', value: 'naik' }] : []),
  ...(opsiTinggal.value.length ? [{ label: 'Tinggal kelas', value: 'tinggal' }] : []),
  { label: 'Luluskan', value: 'lulus' },
])

const terpilih = computed(() => items.value.filter((i) => dipilih[i.siswaId]))
const jumlah = computed(() => ({
  naik: terpilih.value.filter((i) => tujuanSiswa[i.siswaId] === 'naik').length,
  tinggal: terpilih.value.filter((i) => tujuanSiswa[i.siswaId] === 'tinggal').length,
  lulus: terpilih.value.filter((i) => tujuanSiswa[i.siswaId] === 'lulus').length,
}))
const bertunggakan = computed(() => items.value.filter((i) => i.sisa > 0))
const bisaProses = computed(
  () =>
    terpilih.value.length > 0 &&
    (jumlah.value.naik === 0 || !!rombelTujuanId.value) &&
    (jumlah.value.tinggal === 0 || !!rombelTinggalId.value),
)

function pilihSemua(nilai: boolean) {
  for (const i of items.value) dipilih[i.siswaId] = nilai
}

const konfirmasiOpen = ref(false)
const saving = ref(false)

async function proses() {
  saving.value = true
  try {
    const res = await $fetch<{ naik: number; tinggal: number; lulus: number }>('/api/akademik/kenaikan-kelas', {
      method: 'POST',
      body: {
        rombelAsalId: rombelAsalId.value,
        tahunAjaranTujuanId: tahunTujuanId.value || null,
        rombelTujuanId: rombelTujuanId.value || null,
        rombelTinggalId: rombelTinggalId.value || null,
        siswa: terpilih.value.map((i) => ({ siswaId: i.siswaId, tujuan: tujuanSiswa[i.siswaId] })),
      },
    })
    toast.add({
      title: 'Kenaikan kelas selesai',
      description: `${res.naik} naik kelas, ${res.tinggal} tinggal kelas, ${res.lulus} diluluskan.`,
      icon: 'lucide:check',
      color: 'success',
    })
    konfirmasiOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Gagal memproses',
      description: error?.data?.statusMessage || 'Terjadi kesalahan saat memproses kenaikan kelas.',
      icon: 'lucide:circle-alert',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

const columns: YColumn[] = [
  { key: '__pilih', label: '', width: '48px' },
  { key: 'nama', label: 'Siswa' },
  { key: 'nis', label: 'NIS', width: '130px' },
  { key: 'sisa', label: 'Tunggakan', align: 'right', width: '150px' },
  { key: 'tujuan', label: 'Setelah proses', width: '200px' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap items-end gap-2">
        <UFormField label="Rombel asal">
          <USelect v-model="rombelAsalId" :items="rombelAsalOptions" placeholder="Pilih rombel…" class="w-full sm:w-[260px]" />
        </UFormField>
        <UFormField label="Tahun ajaran tujuan">
          <USelect v-model="tahunTujuanId" :items="tahunTujuanOptions" class="w-full sm:w-[150px]" />
        </UFormField>
        <UFormField label="Rombel naik kelas">
          <USelect v-model="rombelTujuanId" :items="opsiTujuan" placeholder="Angkatan akhir / tidak ada" class="w-full sm:w-[190px]" />
        </UFormField>
        <UFormField label="Rombel tinggal kelas">
          <USelect v-model="rombelTinggalId" :items="opsiTinggal" placeholder="—" class="w-full sm:w-[190px]" />
        </UFormField>
      </div>
      <UButton icon="lucide:arrow-up-right" :disabled="!bisaProses" @click="konfirmasiOpen = true">
        Proses kenaikan kelas
      </UButton>
    </div>

    <UAlert
      v-if="bertunggakan.length"
      color="warning"
      variant="subtle"
      icon="lucide:triangle-alert"
      title="Ada siswa bertunggakan"
      :description="`${bertunggakan.length} siswa dengan total tunggakan ${formatRupiah(preview?.totalTunggakan)}. Tunggakan tidak menghalangi kenaikan kelas dan tetap melekat pada siswa.`"
    />

    <YCard description="Tagihan yang belum lunas tidak ikut dipindah; tetap melekat pada siswa dan terbawa otomatis.">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-[var(--color-text-subtle)]">
          {{ items.length }} siswa aktif<template v-if="terpilih.length"> · {{ terpilih.length }} dipilih</template>
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <UButton size="xs" color="neutral" variant="ghost" @click="pilihSemua(true)">Pilih semua</UButton>
          <UButton size="xs" color="neutral" variant="ghost" @click="pilihSemua(false)">Kosongkan</UButton>
        </div>
      </div>

      <YTable
        :columns="columns"
        :rows="items"
        :loading="pending"
        :empty="rombelAsalId ? 'Tidak ada siswa aktif di rombel ini.' : 'Pilih rombel asal untuk melihat daftar siswa.'"
      >
        <template #cell-__pilih="{ row }">
          <UCheckbox
            :model-value="!!dipilih[String(row.siswaId)]"
            @update:model-value="(v: boolean | 'indeterminate') => (dipilih[String(row.siswaId)] = v === true)"
          />
        </template>
        <template #cell-nama="{ row }">
          <NuxtLink :to="`/siswa/${row.siswaId}`" class="font-semibold text-[var(--color-primary)] hover:underline">
            {{ row.nama }}
          </NuxtLink>
        </template>
        <template #cell-sisa="{ value }">
          <span :class="Number(value) > 0 ? 'font-semibold text-[var(--color-warning)]' : 'text-[var(--color-text-subtle)]'">
            {{ Number(value) > 0 ? formatRupiah(Number(value)) : '—' }}
          </span>
        </template>
        <template #cell-tujuan="{ row }">
          <USelect
            :model-value="tujuanSiswa[String(row.siswaId)]"
            :items="tujuanItems"
            size="sm"
            class="w-full"
            @update:model-value="(v: string) => (tujuanSiswa[String(row.siswaId)] = v as 'naik' | 'tinggal' | 'lulus')"
          />
        </template>
      </YTable>
    </YCard>

    <UModal v-model:open="konfirmasiOpen" title="Konfirmasi kenaikan kelas" :ui="{ content: 'max-w-xl' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-[var(--color-text-muted)]">
            {{ jumlah.naik }} siswa naik kelas, {{ jumlah.tinggal }} tinggal kelas, {{ jumlah.lulus }} diluluskan.
            Tindakan ini mengubah penempatan rombel dan/atau status siswa.
          </p>

          <div v-if="bertunggakan.length" class="space-y-1 rounded-md border border-[var(--color-border)] p-3">
            <p class="text-sm font-semibold">Peringatan tunggakan</p>
            <ul class="max-h-[180px] space-y-0.5 overflow-y-auto text-sm text-[var(--color-text-muted)]">
              <li v-for="b in bertunggakan" :key="b.siswaId" class="flex justify-between gap-3">
                <span class="truncate">{{ b.nama }}</span>
                <span class="tnum shrink-0">{{ formatRupiah(b.sisa) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="konfirmasiOpen = false">Batal</UButton>
          <UButton icon="lucide:check" :loading="saving" @click="proses">Ya, proses sekarang</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
