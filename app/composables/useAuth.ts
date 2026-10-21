import type { Ref } from 'vue'
import { authClient } from '~/lib/auth-client'

export interface AuthUser {
  id: string
  name: string
  email: string
  username: string | null
  role: string | null
  banned: boolean | null
}

export function useAuthState() {
  return useState<AuthUser | null>('auth-user', () => null)
}

/** Ambil pengguna dari sesi server (meneruskan cookie saat SSR). */
export async function fetchAuthUser(target?: Ref<AuthUser | null>): Promise<AuthUser | null> {
  const state = target ?? useAuthState()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const res = await $fetch<{ user: AuthUser | null }>('/api/me', { headers })
  state.value = res?.user ?? null
  return state.value
}

export function useAuth() {
  const user = useAuthState()
  const isStaff = computed(() => user.value?.role === 'keuangan_pengurus')
  const isWaliKelas = computed(() => user.value?.role === 'wali_kelas')

  async function signIn(username: string, password: string) {
    const { error } = await authClient.signIn.username({ username, password })
    if (error) {
      throw new Error(error.message || 'Username atau password salah.')
    }
    await fetchAuthUser(user)
  }

  async function signOut() {
    try {
      await authClient.signOut()
    } catch {
      // abaikan; sesi lokal tetap dibersihkan
    }
    user.value = null
    await navigateTo('/login')
  }

  return { user, isStaff, isWaliKelas, signIn, signOut }
}
