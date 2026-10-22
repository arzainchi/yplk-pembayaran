import { and, asc, count, eq, ilike, or } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff } from './auth-guard'

export interface CrudConfig {
  table: any
  entitas: string
  create: z.ZodTypeAny
  update: z.ZodTypeAny
  searchColumns?: any[]
  filters?: Record<string, any>
  orderBy?: any[]
  unique?: { columns: any[]; message: string }
  beforeCreate?: (values: Record<string, unknown>, event: H3Event) => Promise<Record<string, unknown>> | Record<string, unknown>
  beforeUpdate?: (id: string, values: Record<string, unknown>, event: H3Event) => Promise<Record<string, unknown>> | Record<string, unknown>
  afterChange?: (action: 'create' | 'update' | 'delete', id: string, event: H3Event) => Promise<void> | void
}

function fieldKey(column: any): string {
  return String(column?.name ?? '').replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function coerce(column: any, value: string): unknown {
  switch (column?.dataType) {
    case 'boolean':
      return value === 'true' || value === '1'
    case 'number':
      return Number(value)
    default:
      return value
  }
}

function buildWhere(cfg: CrudConfig, query: Record<string, any>) {
  const conds: any[] = []
  const term = typeof query.q === 'string' ? query.q.trim() : ''
  if (term && cfg.searchColumns?.length) {
    conds.push(or(...cfg.searchColumns.map((col) => ilike(col, `%${term}%`))))
  }
  if (cfg.filters) {
    for (const [key, col] of Object.entries(cfg.filters)) {
      const raw = query[key]
      if (raw === undefined || raw === '' || raw === 'all' || raw === 'undefined') continue
      conds.push(eq(col, coerce(col, String(raw))))
    }
  }
  return conds.length ? and(...conds) : undefined
}

export function getCrudConfig(map: Record<string, CrudConfig>, event: H3Event): CrudConfig {
  const entitas = getRouterParam(event, 'entitas') ?? ''
  const cfg = map[entitas]
  if (!cfg) throw createError({ statusCode: 404, statusMessage: 'Jenis data tidak dikenal.' })
  return cfg
}

export async function handleList(cfg: CrudConfig, event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(500, Math.max(1, Number(query.pageSize ?? 25)))
  const where = buildWhere(cfg, query)

  const rows = await db
    .select()
    .from(cfg.table)
    .where(where)
    .orderBy(...(cfg.orderBy ?? [asc(cfg.table.createdAt)]))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalRows = await db.select({ value: count() }).from(cfg.table).where(where)
  return { items: rows, total: Number(totalRows[0]?.value ?? 0), page, pageSize }
}

export async function handleCreate(cfg: CrudConfig, event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  let values = cfg.create.parse(await readBody(event)) as Record<string, unknown>

  if (cfg.unique) {
    // Nama kolom di database (snake_case) berbeda dengan kunci payload (camelCase).
    const conds = cfg.unique.columns.map((col) => eq(col, values[fieldKey(col)]))
    const existing = await db.select().from(cfg.table).where(and(...conds)).limit(1)
    if (existing.length) throw createError({ statusCode: 409, statusMessage: cfg.unique.message })
  }

  if (cfg.beforeCreate) values = await cfg.beforeCreate(values, event)

  const inserted = await db.insert(cfg.table).values(values as never).returning()
  const row = inserted[0] as Record<string, unknown>
  await writeAudit({
    penggunaId: user.id, aksi: `${cfg.entitas}.create`, entitas: cfg.entitas,
    entitasId: String(row.id), sesudah: row, event,
  })
  await cfg.afterChange?.('create', String(row.id), event)
  return row
}

export async function handleUpdate(cfg: CrudConfig, event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  let values = cfg.update.parse(await readBody(event)) as Record<string, unknown>

  const before = await db.select().from(cfg.table).where(eq(cfg.table.id, id)).limit(1)
  if (!before.length) throw createError({ statusCode: 404, statusMessage: 'Data tidak ditemukan.' })

  values = { ...values, updatedAt: new Date() }
  if (cfg.beforeUpdate) values = await cfg.beforeUpdate(id, values, event)

  const updated = await db.update(cfg.table).set(values as never).where(eq(cfg.table.id, id)).returning()
  const row = updated[0] as Record<string, unknown>
  await writeAudit({
    penggunaId: user.id, aksi: `${cfg.entitas}.update`, entitas: cfg.entitas,
    entitasId: id, sebelum: before[0], sesudah: row, event,
  })
  await cfg.afterChange?.('update', id, event)
  return row
}

export async function handleDelete(cfg: CrudConfig, event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const before = await db.select().from(cfg.table).where(eq(cfg.table.id, id)).limit(1)
  if (!before.length) throw createError({ statusCode: 404, statusMessage: 'Data tidak ditemukan.' })

  try {
    await db.delete(cfg.table).where(eq(cfg.table.id, id))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/foreign key|violates|constraint/i.test(message)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Data tidak dapat dihapus karena masih dipakai data lain. Nonaktifkan saja.',
      })
    }
    throw error
  }

  await writeAudit({
    penggunaId: user.id, aksi: `${cfg.entitas}.delete`, entitas: cfg.entitas,
    entitasId: id, sebelum: before[0], event,
  })
  await cfg.afterChange?.('delete', id, event)
  return { ok: true }
}
