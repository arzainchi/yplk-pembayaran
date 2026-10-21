import { defineConfig } from 'drizzle-kit'

try {
  process.loadEnvFile()
} catch {
  // .env opsional (mis. di CI sudah lewat environment)
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema',
  out: './server/database/migrations',
  dbCredentials: {
    // Koneksi langsung (bukan pooler) untuk drizzle-kit, sesuai anjuran Neon.
    url: (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)!,
  },
  verbose: true,
  strict: true,
})
