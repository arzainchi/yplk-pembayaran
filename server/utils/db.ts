import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

export type Database = PostgresJsDatabase<typeof schema>

let client: ReturnType<typeof postgres> | undefined
let db: Database | undefined

export function resolveSsl(url: string): 'require' | false {
  const flag = (process.env.DB_SSL ?? '').trim().toLowerCase()
  if (flag === 'true' || flag === '1') return 'require'
  if (flag === 'false' || flag === '0') return false
  try {
    const host = new URL(url).hostname
    if (['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(host)) return false
    return 'require'
  } catch {
    return false
  }
}

/** Koneksi database tunggal (aman untuk HMR dev). */
export function useDb(): Database {
  if (db) return db
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL belum diatur. Salin .env.example menjadi .env lalu isi nilainya.')
  }
  client = postgres(url, { ssl: resolveSsl(url), max: 10, onnotice: () => {} })
  db = drizzle(client, { schema })
  return db
}

export { schema }
