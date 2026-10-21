<script setup lang="ts">
const route = useRoute()
const { user, signOut } = useAuth()
const sidebarOpen = useSidebarOpen()
const searchOpen = useSearchOpen()

const title = computed(() => (route.meta.title as string | undefined) ?? 'YPLK')
const initials = computed(() => (user.value?.name?.trim()?.[0] ?? '?').toUpperCase())

const items = computed(() => [
  [
    { type: 'label' as const, label: user.value?.name ?? 'Pengguna' },
    { type: 'label' as const, label: peranLabel(user.value?.role) },
  ],
  [
    { label: 'Keluar', icon: 'lucide:log-out', color: 'error' as const, onSelect: () => signOut() },
  ],
])
</script>

<template>
  <header class="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-3.5 sm:px-7">
    <UButton
      icon="lucide:menu"
      color="neutral"
      variant="ghost"
      square
      class="no-print lg:hidden"
      aria-label="Buka menu"
      @click="sidebarOpen = true"
    />

    <h1 class="min-w-0 flex-1 truncate text-display font-bold text-[var(--color-text)]">{{ title }}</h1>

    <UButton
      v-if="user?.role === 'keuangan_pengurus'"
      icon="lucide:search"
      color="neutral"
      variant="ghost"
      square
      class="no-print"
      aria-label="Cari siswa"
      @click="searchOpen = true"
    />

    <UDropdownMenu :items="items" :content="{ align: 'end' }">
      <button
        type="button"
        class="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#9d85fb,#6a48f0)] text-sm font-semibold text-white"
        aria-label="Menu akun"
      >
        {{ initials }}
      </button>
    </UDropdownMenu>
  </header>
</template>
