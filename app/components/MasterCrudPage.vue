<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    entitas: string
    columns: YColumn[]
    fields: FieldDef[]
    defaultValues?: Record<string, unknown>
    filters?: Array<{ key: string; label: string; options: Array<{ label: string; value: string | number }> }>
    addLabel?: string
    searchPlaceholder?: string
    apiPrefix?: string
    description?: string
  }>(),
  {
    defaultValues: () => ({}),
    filters: () => [],
    addLabel: 'Tambah',
    searchPlaceholder: 'Cari…',
    apiPrefix: '/api/master',
    description: '',
  },
)

const toast = useToast()
const endpoint = computed(() => `${props.apiPrefix}/${props.entitas}`)

const page = ref(1)
const pageSize = ref(25)
const q = ref('')
const filterState = reactive<Record<string, string>>({})
for (const f of props.filters) filterState[f.key] = 'all'

const query = computed(() => {
  const out: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
  if (q.value.trim()) out.q = q.value.trim()
  for (const [k, v] of Object.entries(filterState)) if (v && v !== 'all') out[k] = v
  return out
})

const { data, refresh, pending } = useLazyFetch<{ items: Record<string, unknown>[]; total: number }>(
  endpoint,
  { query, default: () => ({ items: [], total: 0 }) },
)

watch([q, () => ({ ...filterState })], () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })

const modalOpen = ref(false)
const editing = ref<Record<string, unknown> | null>(null)
const form = reactive<Record<string, any>>({})
const errors = reactive<Record<string, string>>({})
const saving = ref(false)

const modalTitle = computed(() => (editing.value ? `Ubah ${props.title}` : `${props.addLabel} ${props.title}`))

function resetForm() {
  for (const key of Object.keys(form)) delete form[key]
  for (const key of Object.keys(errors)) delete errors[key]
  if (editing.value) {
    for (const f of props.fields) form[f.key] = editing.value[f.key] ?? null
  } else {
    for (const f of props.fields) {
      form[f.key] = props.defaultValues[f.key] ?? (f.type === 'switch' ? false : f.type === 'multiselect' ? [] : '')
    }
  }
}

function openCreate() {
  editing.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(row: Record<string, unknown>) {
  editing.value = row
  resetForm()
  modalOpen.value = true
}

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  for (const f of props.fields) {
    if (!f.required) continue
    const value = form[f.key]
    const empty = value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)
    if (empty) errors[f.key] = `${f.label} wajib diisi.`
  }
  return Object.keys(errors).length === 0
}

function buildPayload(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of props.fields) {
    const value = form[f.key]
    if (f.type === 'number') out[f.key] = value === '' || value === null ? 0 : Number(value)
    else if (f.type === 'switch') out[f.key] = Boolean(value)
    else if (f.type === 'multiselect') out[f.key] = Array.isArray(value) ? value : []
    else out[f.key] = value === '' ? null : value
  }
  return out
}

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = buildPayload()
    if (editing.value) {
      await $fetch(`${endpoint.value}/${editing.value.id}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Tersimpan', description: `${props.title} berhasil diperbarui.`, icon: 'lucide:check', color: 'success' })
    } else {
      await $fetch(endpoint.value, { method: 'POST', body: payload })
      toast.add({ title: 'Ditambahkan', description: `${props.title} baru berhasil dibuat.`, icon: 'lucide:check', color: 'success' })
    }
    modalOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Gagal menyimpan',
      description: error?.data?.statusMessage || error?.statusMessage || 'Periksa kembali data yang diisi.',
      icon: 'lucide:circle-alert',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

const deleteOpen = ref(false)
const deleting = ref<Record<string, unknown> | null>(null)

function askDelete(row: Record<string, unknown>) {
  deleting.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  try {
    await $fetch(`${endpoint.value}/${deleting.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Terhapus', description: `${props.title} telah dihapus.`, icon: 'lucide:trash-2', color: 'success' })
    deleteOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Tidak dapat menghapus',
      description: error?.data?.statusMessage || 'Data masih dipakai.',
      icon: 'lucide:circle-alert',
      color: 'error',
    })
  }
}

defineExpose({ refresh: () => refresh(), openEdit })
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="q"
          icon="lucide:search"
          size="md"
          :placeholder="searchPlaceholder"
          class="w-full sm:w-[260px]"
        />
        <USelect
          v-for="f in filters"
          :key="f.key"
          v-model="filterState[f.key]"
          :items="[{ label: `Semua ${f.label.toLowerCase()}`, value: 'all' }, ...f.options]"
          size="md"
          class="w-full sm:w-[190px]"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="header-actions" />
        <UButton icon="lucide:plus" @click="openCreate">{{ addLabel }}</UButton>
      </div>
    </div>

    <YCard :description="description">
      <YTable
        :columns="columns"
        :rows="data?.items ?? []"
        :loading="pending"
        :empty="`Belum ada data ${title.toLowerCase()}.`"
      >
        <template
          v-for="col in columns.filter((c) => !['__actions', 'aktif', 'isAktif'].includes(c.key))"
          :key="col.key"
          #[`cell-${col.key}`]="slotProps"
        >
          <slot :name="`cell-${col.key}`" v-bind="slotProps" />
        </template>

        <template #cell-aktif="{ value }">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :style="value
              ? { color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' }
              : { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-subtle)' }"
          >
            <UIcon :name="value ? 'lucide:circle-check' : 'lucide:circle-slash'" class="size-3.5" aria-hidden="true" />
            {{ value ? 'Aktif' : 'Nonaktif' }}
          </span>
        </template>

        <template #cell-isAktif="{ value }">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :style="value
              ? { color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' }
              : { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-subtle)' }"
          >
            <UIcon :name="value ? 'lucide:circle-check' : 'lucide:circle-slash'" class="size-3.5" aria-hidden="true" />
            {{ value ? 'Aktif' : 'Nonaktif' }}
          </span>
        </template>

        <template #cell-__actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <slot name="row-actions" :row="row" />
            <UButton
              icon="lucide:pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              aria-label="Ubah"
              @click="openEdit(row)"
            />
            <UButton
              icon="lucide:trash-2"
              color="error"
              variant="ghost"
              size="xs"
              square
              aria-label="Hapus"
              @click="askDelete(row)"
            />
          </div>
        </template>
      </YTable>

      <YPager
        :page="page"
        :page-size="pageSize"
        :total="data?.total ?? 0"
        @update:page="(v: number) => (page = v)"
        @update:page-size="(v: number) => (pageSize = v)"
      />
    </YCard>

    <UModal v-model:open="modalOpen" :title="modalTitle" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            v-for="f in fields"
            :key="f.key"
            :class="f.colSpan === 2 || f.type === 'textarea' ? 'sm:col-span-2' : ''"
          >
            <UFormField :label="f.label" :error="errors[f.key]" :help="f.help" :required="f.required">
              <UInput
                v-if="f.type === 'text' || f.type === 'number' || f.type === 'date'"
                v-model="form[f.key]"
                :type="f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'"
                :placeholder="f.placeholder"
                class="w-full"
              />
              <UTextarea v-else-if="f.type === 'textarea'" v-model="form[f.key]" :placeholder="f.placeholder" class="w-full" />
              <USelect
                v-else-if="f.type === 'select'"
                v-model="form[f.key]"
                :items="f.options ?? []"
                class="w-full"
              />
              <USelectMenu
                v-else-if="f.type === 'multiselect'"
                v-model="form[f.key]"
                :items="f.options ?? []"
                multiple
                class="w-full"
              />
              <USwitch v-else-if="f.type === 'switch'" v-model="form[f.key]" />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="modalOpen = false">Batal</UButton>
          <UButton icon="lucide:save" :loading="saving" @click="submit">Simpan</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="Hapus data" :ui="{ content: 'max-w-md' }">
      <template #body>
        <p class="text-base text-[var(--color-text-muted)]">
          Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
        </p>
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
