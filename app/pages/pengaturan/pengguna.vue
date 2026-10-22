<script setup lang="ts">
definePageMeta({ title: 'Pengguna' })

const toast = useToast()
const { rombelOptions } = useOpsi()

const { data, refresh, pending } = useLazyFetch<any>('/api/pengguna', {
  default: () => ({ items: [] }),
})

const peranOptions = [
  { label: 'Staf Keuangan / Pengurus', value: 'keuangan_pengurus' },
  { label: 'Wali Kelas', value: 'wali_kelas' },
]

const columns: YColumn[] = [
  { key: 'nama', label: 'Nama' },
  { key: 'username', label: 'Username', width: '160px' },
  { key: 'role', label: 'Peran' },
  { key: 'rombelNama', label: 'Rombel', width: '150px' },
  { key: 'banned', label: 'Status', width: '120px' },
  { key: '__actions', label: '', align: 'right', width: '160px' },
]

const modalOpen = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const errors = reactive<Record<string, string>>({})
const form = reactive({ username: '', password: '', nama: '', peran: 'wali_kelas', rombelId: 'none' })

function resetForm() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (editing.value) {
    Object.assign(form, { username: editing.value.username ?? '', password: '', nama: editing.value.nama, peran: editing.value.role, rombelId: 'none' })
  } else {
    Object.assign(form, { username: '', password: '', nama: '', peran: 'wali_kelas', rombelId: 'none' })
  }
}

function openCreate() { editing.value = null; resetForm(); modalOpen.value = true }
function openEdit(row: any) { editing.value = row; resetForm(); modalOpen.value = true }

async function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!form.nama) errors.nama = 'Nama wajib diisi.'
  if (!editing.value) {
    if (!form.username) errors.username = 'Username wajib diisi.'
    if (!form.password || form.password.length < 6) errors.password = 'Password minimal 6 karakter.'
  }
  if (Object.keys(errors).length) return

  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/pengguna/${editing.value.id}`, {
        method: 'PUT',
        body: { nama: form.nama, peran: form.peran, rombelId: form.rombelId === 'none' ? null : form.rombelId },
      })
      toast.add({ title: 'Tersimpan', description: 'Data pengguna diperbarui.', icon: 'lucide:check', color: 'success' })
    } else {
      await $fetch('/api/pengguna', {
        method: 'POST',
        body: { username: form.username, password: form.password, nama: form.nama, peran: form.peran, rombelId: form.rombelId === 'none' ? null : form.rombelId },
      })
      toast.add({ title: 'Ditambahkan', description: 'Akun baru berhasil dibuat.', icon: 'lucide:check', color: 'success' })
    }
    modalOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Gagal menyimpan', description: error?.data?.statusMessage || 'Periksa kembali data.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    saving.value = false
  }
}

const resetOpen = ref(false)
const resetTarget = ref<any>(null)
const resetPassword = ref('')
const resetSaving = ref(false)

function openReset(row: any) { resetTarget.value = row; resetPassword.value = ''; resetOpen.value = true }

async function submitReset() {
  if (resetPassword.value.length < 6) {
    toast.add({ title: 'Password terlalu pendek', description: 'Minimal 6 karakter.', icon: 'lucide:circle-alert', color: 'warning' })
    return
  }
  resetSaving.value = true
  try {
    await $fetch(`/api/pengguna/${resetTarget.value.id}/reset-password`, { method: 'POST', body: { password: resetPassword.value } })
    toast.add({ title: 'Password direset', description: 'Password pengguna telah diganti.', icon: 'lucide:key-round', color: 'success' })
    resetOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Gagal reset', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  } finally {
    resetSaving.value = false
  }
}

async function toggleAktif(row: any) {
  try {
    await $fetch(`/api/pengguna/${row.id}/aktif`, { method: 'POST', body: { aktif: !!row.banned } })
    toast.add({
      title: row.banned ? 'Diaktifkan' : 'Dinonaktifkan',
      description: `Akun ${row.nama} ${row.banned ? 'kembali aktif' : 'tidak dapat masuk'}.`,
      icon: 'lucide:check', color: 'success',
    })
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Gagal', description: error?.data?.statusMessage || 'Terjadi kesalahan.', icon: 'lucide:circle-alert', color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-[var(--color-text-muted)]">
        Setiap petugas memakai akun sendiri agar transaksi tercatat atas namanya.
      </p>
      <UButton icon="lucide:plus" @click="openCreate">Tambah pengguna</UButton>
    </div>

    <YCard>
      <YTable :columns="columns" :rows="data?.items ?? []" :loading="pending" empty="Belum ada pengguna.">
        <template #cell-role="{ value }">{{ peranLabel(value as string) }}</template>
        <template #cell-rombelNama="{ value }">
          <template v-if="value">{{ value }}</template>
          <span v-else class="text-[var(--color-text-subtle)]">—</span>
        </template>
        <template #cell-banned="{ value }">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :style="!value
              ? { color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' }
              : { color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' }"
          >
            <UIcon :name="!value ? 'lucide:circle-check' : 'lucide:ban'" class="size-3.5" aria-hidden="true" />
            {{ !value ? 'Aktif' : 'Nonaktif' }}
          </span>
        </template>
        <template #cell-__actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UButton icon="lucide:pencil" color="neutral" variant="ghost" size="xs" square aria-label="Ubah" @click="openEdit(row)" />
            <UButton icon="lucide:key-round" color="neutral" variant="ghost" size="xs" square aria-label="Reset password" @click="openReset(row)" />
            <UButton
              :icon="row.banned ? 'lucide:user-check' : 'lucide:user-x'"
              :color="row.banned ? 'success' : 'error'"
              variant="ghost"
              size="xs"
              square
              :aria-label="row.banned ? 'Aktifkan' : 'Nonaktifkan'"
              @click="toggleAktif(row)"
            />
          </div>
        </template>
      </YTable>
    </YCard>

    <UModal v-model:open="modalOpen" :title="editing ? 'Ubah pengguna' : 'Tambah pengguna'" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nama lengkap" required :error="errors.nama">
            <UInput v-model="form.nama" class="w-full" />
          </UFormField>
          <template v-if="!editing">
            <UFormField label="Username" required :error="errors.username">
              <UInput v-model="form.username" class="w-full" placeholder="mis. budi" />
            </UFormField>
            <UFormField label="Password awal" required :error="errors.password">
              <UInput v-model="form.password" type="password" class="w-full" />
            </UFormField>
          </template>
          <UFormField label="Peran" required>
            <USelect v-model="form.peran" :items="peranOptions" class="w-full" />
          </UFormField>
          <UFormField
            v-if="form.peran === 'wali_kelas'"
            label="Rombel yang diampu"
            help="Satu wali kelas hanya memegang satu rombel per tahun ajaran."
          >
            <USelect v-model="form.rombelId" :items="[{ label: 'Belum ditentukan', value: 'none' }, ...rombelOptions]" class="w-full" />
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

    <UModal v-model:open="resetOpen" title="Reset password" :ui="{ content: 'max-w-md' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-[var(--color-text-muted)]">
            Tetapkan password baru untuk <strong>{{ resetTarget?.nama }}</strong>.
          </p>
          <UFormField label="Password baru" required>
            <UInput v-model="resetPassword" type="password" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="resetOpen = false">Batal</UButton>
          <UButton icon="lucide:key-round" :loading="resetSaving" @click="submitReset">Reset password</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
