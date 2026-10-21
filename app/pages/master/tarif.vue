<script setup lang="ts">
definePageMeta({ title: 'Tarif' })

const toast = useToast()
const { opsi, sekolahOptions, tahunAjaranOptions, jenisOptions, jurusanOptions, tahunAjaranAktif } = useOpsi()

const page = ref(1)
const pageSize = ref(25)
const fSekolah = ref('all')
const fTahun = ref('all')
const fJenis = ref('all')
const fTingkat = ref('all')

const query = computed(() => {
  const out: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
  if (fSekolah.value !== 'all') out.sekolahId = fSekolah.value
  if (fTahun.value !== 'all') out.tahunAjaranId = fTahun.value
  if (fJenis.value !== 'all') out.jenisPembayaranId = fJenis.value
  if (fTingkat.value !== 'all') out.tingkat = fTingkat.value
  return out
})

const { data, refresh, pending } = await useFetch<any>('/api/tarif', {
  query,
  default: () => ({ items: [], total: 0 }),
})

watch([fSekolah, fTahun, fJenis, fTingkat], () => { page.value = 1 })

const tingkatOptions = [7, 8, 9, 10, 11, 12].map((t) => ({ label: `Kelas ${t}`, value: t }))
const semesterOptions = [
  { label: 'Ganjil', value: 'ganjil' },
  { label: 'Genap', value: 'genap' },
]
const polaOptions = [
  { label: 'Bulanan', value: 'bulanan' },
  { label: 'Sekali Bayar', value: 'sekali_bayar' },
  { label: 'Tahunan', value: 'tahunan' },
  { label: 'Cicilan', value: 'cicilan' },
  { label: 'Paket', value: 'paket' },
]
const modeTargetOptions = [
  { label: 'Semua jurusan', value: 'semua' },
  { label: 'Jurusan tertentu', value: 'tertentu' },
  { label: 'Semua kecuali', value: 'kecuali' },
]

const columns: YColumn[] = [
  { key: 'sekolahNama', label: 'Sekolah' },
  { key: 'tahunAjaranNama', label: 'Tahun ajaran', width: '130px' },
  { key: 'jenisNama', label: 'Jenis', },
  { key: 'tingkat', label: 'Tingkat', width: '100px' },
  { key: 'semester', label: 'Semester', width: '110px' },
  { key: 'nominal', label: 'Nominal', align: 'right', width: '150px' },
  { key: 'polaPenagihan', label: 'Pola', width: '120px' },
  { key: 'jurusanNama', label: 'Target jurusan', hideOnMobile: true },
  { key: '__actions', label: '', align: 'right', width: '90px' },
]

const modalOpen = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const errors = reactive<Record<string, string>>({})
const form = reactive<any>({
  sekolahId: '', tahunAjaranId: '', jenisPembayaranId: '', tingkat: 7, semester: 'none',
  nominal: 0, polaPenagihan: 'bulanan', batasLunas: '', keterangan: '',
  targetMode: 'semua', targetJurusan: [] as string[],
})

function resetForm() {
  for (const key of Object.keys(errors)) delete errors[key]
  if (editing.value) {
    const t = editing.value
    Object.assign(form, {
      sekolahId: t.sekolahId, tahunAjaranId: t.tahunAjaranId, jenisPembayaranId: t.jenisPembayaranId,
      tingkat: t.tingkat, semester: t.semester ?? 'none', nominal: t.nominal, polaPenagihan: t.polaPenagihan,
      batasLunas: t.batasLunas ?? '', keterangan: t.keterangan ?? '',
      targetMode: t.jurusanTarget?.mode ?? 'semua', targetJurusan: t.jurusanTarget?.jurusanIds ?? [],
    })
  } else {
    Object.assign(form, {
      sekolahId: '', tahunAjaranId: tahunAjaranAktif.value?.id ?? '', jenisPembayaranId: '',
      tingkat: 7, semester: 'none', nominal: 0, polaPenagihan: 'bulanan', batasLunas: '', keterangan: '',
      targetMode: 'semua', targetJurusan: [],
    })
  }
}

function openCreate() {
  editing.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(row: any) {
  editing.value = row
  resetForm()
  modalOpen.value = true
}

function validate() {
  for (const key of Object.keys(errors)) delete errors[key]
  if (!form.sekolahId) errors.sekolahId = 'Sekolah wajib dipilih.'
  if (!form.tahunAjaranId) errors.tahunAjaranId = 'Tahun ajaran wajib dipilih.'
  if (!form.jenisPembayaranId) errors.jenisPembayaranId = 'Jenis pembayaran wajib dipilih.'
  if (!form.tingkat) errors.tingkat = 'Tingkat wajib diisi.'
  if (Number(form.nominal) <= 0) errors.nominal = 'Nominal harus lebih dari nol.'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = {
      sekolahId: form.sekolahId, tahunAjaranId: form.tahunAjaranId, jenisPembayaranId: form.jenisPembayaranId,
      tingkat: Number(form.tingkat), semester: form.semester === 'none' ? null : form.semester, nominal: Number(form.nominal),
      polaPenagihan: form.polaPenagihan, batasLunas: form.batasLunas || null, keterangan: form.keterangan || null,
      jurusanTarget: { mode: form.targetMode, jurusanIds: form.targetJurusan ?? [] },
    }
    if (editing.value) {
      await $fetch(`/api/tarif/${editing.value.id}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Tersimpan', description: 'Tarif berhasil diperbarui.', icon: 'lucide:check', color: 'success' })
    } else {
      await $fetch('/api/tarif', { method: 'POST', body: payload })
      toast.add({ title: 'Ditambahkan', description: 'Tarif baru berhasil dibuat.', icon: 'lucide:check', color: 'success' })
    }
    modalOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Gagal menyimpan',
      description: error?.data?.statusMessage || 'Periksa kembali data yang diisi.',
      icon: 'lucide:circle-alert', color: 'error',
    })
  } finally {
    saving.value = false
  }
}

const deleteOpen = ref(false)
const deleting = ref<any>(null)
function askDelete(row: any) { deleting.value = row; deleteOpen.value = true }
async function confirmDelete() {
  if (!deleting.value) return
  try {
    await $fetch(`/api/tarif/${deleting.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Terhapus', description: 'Tarif telah dihapus.', icon: 'lucide:trash-2', color: 'success' })
    deleteOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Tidak dapat menghapus', description: error?.data?.statusMessage || 'Tarif sudah dipakai tagihan.', icon: 'lucide:circle-alert', color: 'error' })
  }
}

const salinOpen = ref(false)
const salin = reactive({ dariTahunAjaranId: '', keTahunAjaranId: '', sekolahId: 'all' })
const salinLoading = ref(false)
function openSalin() {
  salin.dariTahunAjaranId = ''
  salin.keTahunAjaranId = tahunAjaranAktif.value?.id ?? ''
  salin.sekolahId = 'all'
  salinOpen.value = true
}
async function submitSalin() {
  if (!salin.dariTahunAjaranId || !salin.keTahunAjaranId) {
    toast.add({ title: 'Lengkapi pilihan', description: 'Pilih tahun ajaran asal dan tujuan.', icon: 'lucide:circle-alert', color: 'warning' })
    return
  }
  salinLoading.value = true
  try {
    const res = await $fetch<{ copied: number; skipped: number }>('/api/tarif/salin', {
      method: 'POST',
      body: { dariTahunAjaranId: salin.dariTahunAjaranId, keTahunAjaranId: salin.keTahunAjaranId, sekolahId: salin.sekolahId === 'all' ? undefined : salin.sekolahId },
    })
    toast.add({
      title: 'Salin selesai',
      description: `${res.copied} tarif disalin, ${res.skipped} dilewati karena sudah ada.`,
      icon: 'lucide:copy-check', color: 'success',
    })
    salinOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Gagal menyalin', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    salinLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <USelect v-model="fSekolah" :items="[{ label: 'Semua sekolah', value: 'all' }, ...sekolahOptions]" size="md" class="w-full sm:w-[200px]" />
        <USelect v-model="fTahun" :items="[{ label: 'Semua tahun ajaran', value: 'all' }, ...tahunAjaranOptions]" size="md" class="w-full sm:w-[190px]" />
        <USelect v-model="fJenis" :items="[{ label: 'Semua jenis', value: 'all' }, ...jenisOptions]" size="md" class="w-full sm:w-[170px]" />
        <USelect v-model="fTingkat" :items="[{ label: 'Semua tingkat', value: 'all' }, ...tingkatOptions]" size="md" class="w-full sm:w-[150px]" />
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="lucide:copy" color="neutral" variant="outline" @click="openSalin">Salin tarif</UButton>
        <UButton icon="lucide:plus" @click="openCreate">Tambah tarif</UButton>
      </div>
    </div>

    <YCard description="Tarif diinput manual per sekolah, tahun ajaran, jenis pembayaran, dan tingkat.">
      <YTable :columns="columns" :rows="data?.items ?? []" :loading="pending" empty="Belum ada tarif.">
        <template #cell-tingkat="{ value }">{{ tingkatLabel(value as number) }}</template>
        <template #cell-semester="{ value }">{{ value ? semesterLabel(value as string) : '—' }}</template>
        <template #cell-nominal="{ value }">{{ formatRupiah(value as number) }}</template>
        <template #cell-polaPenagihan="{ value }">{{ POLA_PENAGIHAN[value as string] ?? value }}</template>
        <template #cell-jurusanNama="{ row }">
          <span v-if="row.jurusanTarget?.mode === 'semua'" class="text-[var(--color-text-subtle)]">Semua jurusan</span>
          <span v-else>
            {{ row.jurusanTarget?.mode === 'kecuali' ? 'Kecuali: ' : '' }}{{ (row.jurusanTarget?.jurusanNama ?? []).join(', ') }}
          </span>
        </template>
        <template #cell-__actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UButton icon="lucide:pencil" color="neutral" variant="ghost" size="xs" square aria-label="Ubah" @click="openEdit(row)" />
            <UButton icon="lucide:trash-2" color="error" variant="ghost" size="xs" square aria-label="Hapus" @click="askDelete(row)" />
          </div>
        </template>
      </YTable>

      <YPager :page="page" :page-size="pageSize" :total="data?.total ?? 0" @update:page="(v:number)=>page=v" @update:page-size="(v:number)=>pageSize=v" />
    </YCard>

    <UModal v-model:open="modalOpen" :title="editing ? 'Ubah tarif' : 'Tambah tarif'" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Sekolah" required :error="errors.sekolahId">
            <USelect v-model="form.sekolahId" :items="sekolahOptions" class="w-full" />
          </UFormField>
          <UFormField label="Tahun ajaran" required :error="errors.tahunAjaranId">
            <USelect v-model="form.tahunAjaranId" :items="tahunAjaranOptions" class="w-full" />
          </UFormField>
          <UFormField label="Jenis pembayaran" required :error="errors.jenisPembayaranId">
            <USelect v-model="form.jenisPembayaranId" :items="jenisOptions" class="w-full" />
          </UFormField>
          <UFormField label="Tingkat" required :error="errors.tingkat">
            <USelect v-model="form.tingkat" :items="tingkatOptions" class="w-full" />
          </UFormField>
          <UFormField label="Semester (opsional)" help="Diisi untuk tarif bulanan.">
            <USelect v-model="form.semester" :items="[{ label: 'Tanpa semester', value: 'none' }, ...semesterOptions]" class="w-full" />
          </UFormField>
          <UFormField label="Nominal (Rp)" required :error="errors.nominal">
            <UInput v-model="form.nominal" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Pola penagihan" required>
            <USelect v-model="form.polaPenagihan" :items="polaOptions" class="w-full" />
          </UFormField>
          <UFormField label="Batas pelunasan (opsional)" help="mis. Tingkat 12 atau Akhir masa sekolah.">
            <UInput v-model="form.batasLunas" class="w-full" placeholder="mis. Tingkat 12" />
          </UFormField>
          <UFormField label="Target jurusan" class="sm:col-span-2">
            <USelect v-model="form.targetMode" :items="modeTargetOptions" class="w-full" />
          </UFormField>
          <UFormField v-if="form.targetMode !== 'semua'" label="Pilih jurusan" class="sm:col-span-2">
            <USelectMenu v-model="form.targetJurusan" :items="jurusanOptions" multiple class="w-full" />
          </UFormField>
          <UFormField label="Keterangan" class="sm:col-span-2">
            <UTextarea v-model="form.keterangan" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="modalOpen = false">Batal</UButton>
          <UButton icon="lucide:save" :loading="saving" @click="submit">Simpan</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="salinOpen" title="Salin tarif dari tahun ajaran sebelumnya" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Dari tahun ajaran" required>
            <USelect v-model="salin.dariTahunAjaranId" :items="tahunAjaranOptions" class="w-full" />
          </UFormField>
          <UFormField label="Ke tahun ajaran" required>
            <USelect v-model="salin.keTahunAjaranId" :items="tahunAjaranOptions" class="w-full" />
          </UFormField>
          <UFormField label="Batasi ke sekolah (opsional)">
            <USelect v-model="salin.sekolahId" :items="[{ label: 'Semua sekolah', value: 'all' }, ...sekolahOptions]" class="w-full" />
          </UFormField>
          <p class="text-sm text-[var(--color-text-subtle)]">
            Tarif yang sudah ada di tahun ajaran tujuan akan dilewati.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="salinOpen = false">Batal</UButton>
          <UButton icon="lucide:copy" :loading="salinLoading" @click="submitSalin">Salin tarif</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="Hapus tarif" :ui="{ content: 'max-w-md' }">
      <template #body>
        <p class="text-base text-[var(--color-text-muted)]">Yakin ingin menghapus tarif ini?</p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="deleteOpen = false">Batal</UButton>
          <UButton color="error" variant="soft" icon="lucide:trash-2" @click="confirmDelete">Hapus</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
