<script setup lang="ts">
definePageMeta({ title: 'Audit Log' })

const page = ref(1)
const pageSize = ref(50)
const q = ref('')
const fEntitas = ref('all')
const fAksi = ref('all')

const query = computed(() => {
  const out: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
  if (q.value.trim()) out.q = q.value.trim()
  if (fEntitas.value !== 'all') out.entitas = fEntitas.value
  if (fAksi.value !== 'all') out.aksi = fAksi.value
  return out
})

const { data, pending } = useLazyFetch<any>('/api/audit-log', {
  query,
  default: () => ({ items: [], total: 0, opsi: { entitas: [], aksi: [] } }),
})

watch([q, fEntitas, fAksi], () => {
  page.value = 1
})
watch(pageSize, () => {
  page.value = 1
})

const entitasOptions = computed(() =>
  (data.value?.opsi?.entitas ?? []).map((v: string) => ({ label: v, value: v })),
)
const aksiOptions = computed(() => (data.value?.opsi?.aksi ?? []).map((v: string) => ({ label: v, value: v })))

const columns: YColumn[] = [
  { key: 'waktu', label: 'Waktu', width: '190px' },
  { key: 'penggunaNama', label: 'Pengguna', width: '170px' },
  { key: 'aksi', label: 'Aksi' },
  { key: 'entitas', label: 'Entitas', width: '140px' },
  { key: 'entitasId', label: 'ID entitas', hideOnMobile: true },
  { key: 'ipAddress', label: 'IP', hideOnMobile: true, width: '130px' },
  { key: '__detail', label: '', align: 'right', width: '110px' },
]

const detail = ref<any>(null)
const detailOpen = computed({
  get: () => !!detail.value,
  set: (value: boolean) => {
    if (!value) detail.value = null
  },
})

function nilai(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const perubahan = computed(() => {
  const sebelum = (detail.value?.dataSebelum ?? {}) as Record<string, unknown>
  const sesudah = (detail.value?.dataSesudah ?? {}) as Record<string, unknown>
  if (typeof sebelum !== 'object' || typeof sesudah !== 'object') return []
  return [...new Set([...Object.keys(sebelum), ...Object.keys(sesudah)])]
    .filter((key) => nilai(sebelum[key]) !== nilai(sesudah[key]))
    .map((key) => ({ key, sebelum: nilai(sebelum[key]), sesudah: nilai(sesudah[key]) }))
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-2">
      <UInput v-model="q" icon="lucide:search" placeholder="Cari nama petugas atau ID entitas…" class="w-full sm:w-[280px]" />
      <USelect v-model="fEntitas" :items="[{ label: 'Semua entitas', value: 'all' }, ...entitasOptions]" class="w-full sm:w-[180px]" />
      <USelect v-model="fAksi" :items="[{ label: 'Semua aksi', value: 'all' }, ...aksiOptions]" class="w-full sm:w-[220px]" />
    </div>

    <YCard description="Catatan perubahan data penting dan pembatalan transaksi, atas nama akun petugas.">
      <YTable :columns="columns" :rows="data?.items ?? []" :loading="pending" empty="Belum ada catatan audit.">
        <template #cell-waktu="{ value }">{{ formatTanggalJam(value as string) }}</template>
        <template #cell-penggunaNama="{ value }">{{ value || 'Sistem' }}</template>
        <template #cell-aksi="{ value }">
          <span class="rounded-full bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">{{ value }}</span>
        </template>
        <template #cell-entitasId="{ value }">
          <span class="tnum text-sm text-[var(--color-text-subtle)]">{{ value ?? '—' }}</span>
        </template>
        <template #cell-__detail="{ row }">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="lucide:eye"
            @click="detail = row"
          >
            Detail
          </UButton>
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

    <UModal v-model:open="detailOpen" title="Detail audit" :ui="{ content: 'max-w-3xl' }">
      <template #body>
        <div v-if="detail" class="space-y-4">
          <dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt class="text-[var(--color-text-subtle)]">Waktu</dt><dd>{{ formatTanggalJam(detail.waktu) }}</dd></div>
            <div><dt class="text-[var(--color-text-subtle)]">Pengguna</dt><dd>{{ detail.penggunaNama || 'Sistem' }}</dd></div>
            <div><dt class="text-[var(--color-text-subtle)]">Aksi</dt><dd>{{ detail.aksi }}</dd></div>
            <div><dt class="text-[var(--color-text-subtle)]">Entitas</dt><dd>{{ detail.entitas }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-[var(--color-text-subtle)]">ID entitas</dt><dd class="break-all tnum">{{ detail.entitasId ?? '—' }}</dd></div>
          </dl>

          <div v-if="perubahan.length" class="overflow-x-auto rounded-md border border-[var(--color-border)]">
            <table class="w-full text-sm">
              <thead class="bg-[var(--color-surface-subtle)] text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">Field</th>
                  <th class="px-3 py-2 font-medium">Sebelum</th>
                  <th class="px-3 py-2 font-medium">Sesudah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in perubahan" :key="p.key" class="border-t border-[var(--color-border)] align-top">
                  <td class="whitespace-nowrap px-3 py-2 font-semibold">{{ p.key }}</td>
                  <td class="break-all px-3 py-2 text-[var(--color-text-muted)]">{{ p.sebelum }}</td>
                  <td class="break-all px-3 py-2">{{ p.sesudah }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-[var(--color-text-subtle)]">
            Tidak ada detail perubahan yang tersimpan untuk catatan ini.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end">
          <UButton color="neutral" variant="outline" @click="detail = null">Tutup</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
