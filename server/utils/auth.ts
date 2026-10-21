import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, username } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/admin/access'
import { useDb } from './db'
import { user, session, account, verification } from '../database/schema'

const betterAuthUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

// Dua peran domain: staf keuangan/pengurus (admin) & wali kelas (viewer).
const ac = createAccessControl(defaultStatements)
const staffRole = ac.newRole({
  user: ['create', 'list', 'set-role', 'ban', 'impersonate', 'delete', 'set-password', 'set-email', 'get', 'update'],
  session: ['list', 'revoke', 'delete'],
})
const waliRole = ac.newRole({ user: [], session: [] })

export const auth = betterAuth({
  appName: 'YPLK · Pembayaran Siswa',
  baseURL: betterAuthUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(useDb(), {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    // Sesi berakhir otomatis setelah tidak aktif (FR-AUTH-01).
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 15,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    // Pembatasan percobaan login gagal (FR-AUTH-04).
    enabled: true,
    window: 60,
    max: 10,
  },
  trustedOrigins: [betterAuthUrl],
  plugins: [
    username(),
    admin({
      ac,
      roles: { keuangan_pengurus: staffRole, wali_kelas: waliRole },
      adminRoles: ['keuangan_pengurus'],
      defaultRole: 'wali_kelas',
    }),
  ],
})

export type Peran = 'keuangan_pengurus' | 'wali_kelas'
