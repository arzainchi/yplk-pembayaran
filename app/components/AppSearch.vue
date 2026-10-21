<script setup lang="ts">
const open = useSearchOpen()
const q = ref('')
const loading = ref(false)
const results = ref<Array<{ id: string; nis: string; nama: string; sekolahNama: string | null; tingkat: number | null }>>([])
let timer: ReturnType<typeof setTimeout> | undefined

watch(open, (value) => {
  if (value) {
    q.value = ''
    results.value = []
    nextTick(() => document.getElementById('y-search-input')?.focus())
  }
})

watch(q, (value) => {
  clearTimeout(timer)
  const term = value.trim()
  if (term.length < 2) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    loading.value = true
    try {
      const res = await $fetch<{ items: typeof results.value }>('/api/siswa', {
        query: { q: term, limit: 8, page: 1 },
      })
      results.value = res.items ?? []
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 250)
})

async function select(id: string) {
  open.value = false
  await navigateTo(`/siswa/${id}`)
}

function onKey(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    if (useAuthState().value?.role !== 'keuangan_pengurus') return
    event.preventDefault()
    open.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-lg' }">
    <template #body>
      <UInput
        id="y-search-input"
        v-model="q"
        icon="lucide:search"
        size="lg"
        class="w-full"
        placeholder="Cari nama, NIS, atau NISN…"
        :loading="loading"
        autofocus
      />
      <div class="mt-3 max-h-[50vh] overflow-y-auto">
        <p v-if="q.trim().length < 2" class="px-2 py-6 text-center text-sm text-[var(--color-text-subtle)]">
          Ketik minimal 2 karakter untuk mencari siswa.
        </p>
        <p v-else-if="!loading && results.length === 0" class="px-2 py-6 text-center text-sm text-[var(--color-text-subtle)]">
          Tidak ada siswa yang cocok.
        </p>
        <ul class="space-y-1">
          <li v-for="item in results" :key="item.id">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-hover)]"
              @click="select(item.id)"
            >
              <UIcon name="lucide:user-round" class="size-5 text-[var(--color-text-subtle)]" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-base font-semibold text-[var(--color-text)]">{{ item.nama }}</span>
                <span class="block truncate text-sm text-[var(--color-text-muted)]">
                  {{ item.nis }}<template v-if="item.sekolahNama"> · {{ item.sekolahNama }}</template>
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </UModal>
</template>
