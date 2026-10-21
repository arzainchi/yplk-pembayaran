<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const sidebarOpen = useSidebarOpen()
const searchOpen = useSearchOpen()

interface NavItem { label: string; icon: string; to: string }
interface NavGroup { label: string; items: NavItem[] }

const staffGroups: NavGroup[] = [
  {
    label: 'Menu',
    items: [
      { label: 'Dashboard', icon: 'lucide:layout-dashboard', to: '/' },
      { label: 'Siswa', icon: 'lucide:users', to: '/siswa' },
      { label: 'Tagihan', icon: 'lucide:receipt-text', to: '/tagihan' },
      { label: 'Pembayaran', icon: 'lucide:banknote', to: '/pembayaran' },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { label: 'Rekap Penerimaan', icon: 'lucide:chart-column', to: '/laporan/penerimaan' },
      { label: 'Tunggakan', icon: 'lucide:triangle-alert', to: '/laporan/tunggakan' },
      { label: 'Transaksi Batal', icon: 'lucide:ban', to: '/laporan/void' },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { label: 'Sekolah', icon: 'lucide:school', to: '/master/sekolah' },
      { label: 'Tahun Ajaran', icon: 'lucide:calendar-range', to: '/master/tahun-ajaran' },
      { label: 'Jurusan', icon: 'lucide:book-marked', to: '/master/jurusan' },
      { label: 'Rombel', icon: 'lucide:door-open', to: '/master/rombel' },
      { label: 'Jenis Pembayaran', icon: 'lucide:tags', to: '/master/jenis-pembayaran' },
      { label: 'Tarif', icon: 'lucide:list-ordered', to: '/master/tarif' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { label: 'Pengguna', icon: 'lucide:user-cog', to: '/pengaturan/pengguna' },
      { label: 'Audit Log', icon: 'lucide:scroll-text', to: '/pengaturan/audit-log' },
    ],
  },
]

const waliGroups: NavGroup[] = [
  {
    label: 'Menu',
    items: [
      { label: 'Tunggakan Kelas', icon: 'lucide:triangle-alert', to: '/laporan/tunggakan-kelas' },
    ],
  },
]

const groups = computed(() => (user.value?.role === 'wali_kelas' ? waliGroups : staffGroups))

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-[296px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-raised)] transition-transform duration-200 max-[1400px]:w-[250px] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
    :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex items-center gap-2.5 px-5 pb-4 pt-5">
      <UIcon name="lucide:school" class="size-[30px] shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      <div class="min-w-0">
        <p class="truncate text-title font-bold leading-tight text-[var(--color-text)]">YPLK</p>
        <p class="truncate text-xs text-[var(--color-text-subtle)]">Pembayaran Siswa</p>
      </div>
    </div>

    <div v-if="user?.role === 'keuangan_pengurus'" class="px-4 pb-3">
      <button
        type="button"
        class="flex h-[38px] w-full items-center gap-2 rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-left text-sm text-[var(--color-text-subtle)] shadow-[0_1px_2px_rgba(23,23,43,.04)] transition-colors hover:border-[var(--color-focus-border)]"
        @click="searchOpen = true"
      >
        <UIcon name="lucide:search" class="size-[18px] shrink-0" aria-hidden="true" />
        <span class="flex-1 truncate">Cari siswa…</span>
        <kbd class="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-subtle)]">⌘K</kbd>
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-6">
      <div v-for="group in groups" :key="group.label" class="mb-3">
        <p class="y-label px-2.5 pb-1.5 pt-2">{{ group.label }}</p>
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="mb-0.5 flex h-10 items-center gap-2.5 rounded-[11px] px-2.5 text-base transition-colors"
          :class="isActive(item.to)
            ? 'bg-[var(--color-active)] font-semibold text-[var(--color-primary)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]'"
          @click="sidebarOpen = false"
        >
          <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </aside>
</template>
