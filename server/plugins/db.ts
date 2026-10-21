import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { resolveSsl } from '../utils/db'

// Migrasi otomatis saat server dev start. Di produksi jalankan `pnpm db:migrate`.
export default defineNitroPlugin(async () => {
  if (!import.meta.dev) return
  if ((process.env.DB_AUTO_MIGRATE ?? 'true').toLowerCase() === 'false') return

  // Migrasi memakai koneksi langsung (bukan pooler) sesuai anjuran Neon.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) return

  const sql = postgres(url, { max: 1, ssl: resolveSsl(url), onnotice: () => {} })
  try {
    await migrate(drizzle(sql), { migrationsFolder: 'server/database/migrations' })
  } catch (error) {
    console.error('[db] migrasi otomatis gagal:', error)
  } finally {
    await sql.end()
  }
})
