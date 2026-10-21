import type { H3Event } from 'h3'
import { getRequestHeaders } from 'h3'
import { useDb, type Database } from './db'
import { auditLog } from '../database/schema'

export interface AuditInput {
  penggunaId?: string | null
  aksi: string
  entitas: string
  entitasId?: string | null
  sebelum?: unknown
  sesudah?: unknown
  event?: H3Event
}

type Insertable = { insert: Database['insert'] }

function extractIp(event?: H3Event): string | null {
  if (!event) return null
  try {
    const headers = getRequestHeaders(event) as Record<string, string>
    const forwarded = headers['x-forwarded-for']
    if (forwarded) return forwarded.split(',')[0]?.trim() ?? null
    return headers['x-real-ip'] ?? null
  } catch {
    return null
  }
}

/** Catat perubahan data penting / void ke audit_log (dapat ikut dalam transaksi). */
export async function writeAudit(input: AuditInput, tx?: Insertable): Promise<void> {
  const db = tx ?? useDb()
  await db.insert(auditLog).values({
    penggunaId: input.penggunaId ?? null,
    aksi: input.aksi,
    entitas: input.entitas,
    entitasId: input.entitasId ?? null,
    dataSebelum: (input.sebelum ?? null) as never,
    dataSesudah: (input.sesudah ?? null) as never,
    ipAddress: extractIp(input.event),
  })
}
