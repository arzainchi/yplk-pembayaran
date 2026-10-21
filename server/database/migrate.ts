import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { resolveSsl } from '../utils/db'

try {
  process.loadEnvFile()
} catch {
  // .env opsional
}

async function main() {
  // Migrasi memakai koneksi langsung (bukan pooler) sesuai anjuran Neon.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL belum diatur. Salin .env.example menjadi .env.')

  const sql = postgres(url, { max: 1, ssl: resolveSsl(url), onnotice: () => {} })
  const db = drizzle(sql)

  console.log('Menjalankan migrasi…')
  await migrate(db, { migrationsFolder: 'server/database/migrations' })
  await sql.end()
  console.log('Migrasi selesai.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
