import type { H3Event } from 'h3'
import { getRequestHeaders } from 'h3'
import { auth } from './auth'

export interface AuthUser {
  id: string
  name: string
  email: string
  username: string | null
  role: string | null
  banned: boolean | null
}

// Catatan: jangan memakai toWebRequest(event) di sini, karena ia mengonsumsi
// aliran body sehingga readBody(event) pada handler akan menggantung.
export function sessionHeaders(event: H3Event): Headers {
  return new Headers(getRequestHeaders(event) as Record<string, string>)
}

export async function getSessionUser(event: H3Event): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: sessionHeaders(event) })
  if (!session?.user) return null
  const u = session.user as Record<string, unknown>
  return {
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    username: (u.username as string | null) ?? null,
    role: (u.role as string | null) ?? null,
    banned: (u.banned as boolean | null) ?? false,
  }
}

/** Wajib login & akun tidak diblokir. */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu.' })
  }
  if (user.banned) {
    throw createError({ statusCode: 403, statusMessage: 'Akun ini dinonaktifkan.' })
  }
  return user
}

/** Hanya Staf Keuangan / Pengurus Yayasan. */
export async function requireStaff(event: H3Event): Promise<AuthUser> {
  const user = await requireAuth(event)
  if (user.role !== 'keuangan_pengurus') {
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak untuk peran ini.' })
  }
  return user
}

/** Hanya Wali Kelas. */
export async function requireWaliKelas(event: H3Event): Promise<AuthUser> {
  const user = await requireAuth(event)
  if (user.role !== 'wali_kelas') {
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak untuk peran ini.' })
  }
  return user
}

export function isStaff(user: AuthUser | null): boolean {
  return user?.role === 'keuangan_pengurus'
}
