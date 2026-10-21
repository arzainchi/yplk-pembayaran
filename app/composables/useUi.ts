/** Status buka/tutup sidebar (mobile). */
export function useSidebarOpen() {
  return useState<boolean>('sidebar-open', () => false)
}

/** Status buka/tutup pencarian ⌘K. */
export function useSearchOpen() {
  return useState<boolean>('search-open', () => false)
}
