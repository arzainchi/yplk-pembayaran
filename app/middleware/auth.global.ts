export default defineNuxtRouteMiddleware(async (to) => {
  const state = useAuthState()

  // Halaman login: alihkan bila sudah masuk.
  if (to.path === '/login') {
    if (state.value) {
      return navigateTo(state.value.role === 'wali_kelas' ? '/laporan/tunggakan-kelas' : '/')
    }
    return
  }

  let user = state.value
  if (!user) user = await fetchAuthUser(state)

  if (!user) {
    return navigateTo({
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {},
    })
  }

  // Cerminan penjaga peran di sisi klien (server tetap menegakkan).
  if (user.role !== 'keuangan_pengurus' && !to.path.startsWith('/laporan/tunggakan-kelas')) {
    return navigateTo('/laporan/tunggakan-kelas')
  }
})
