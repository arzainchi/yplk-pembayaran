import { and, asc, count, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff } from './auth-guard'
import {
  jenisPembayaran,
  jurusan,
  sekolah,
  tahunAjaran,
  tarif,
  tarifJurusan,
} from '../database/schema'

const uuid = z.string().uuid()

const tarifSchema = z.object({
  sekolahId: uuid,
  tahunAjaranId: uuid,
  jenisPembayaranId: uuid,
  tingkat: z.number().int().min(1),
  semester: z.string().trim().nullable().optional(),
  nominal: z.number().int().min(0),
  polaPenagihan: z.enum(['bulanan', 'sekali_bayar', 'tahunan', 'cicilan', 'paket']),
  batasLunas: z.string().trim().nullable().optional(),
  keterangan: z.string().trim().nullable().optional(),
  jurusanTarget: z
    .object({
      mode: z.enum(['semua', 'tertentu', 'kecuali']),
      jurusanIds: z.array(uuid).default([]),
    })
    .optional(),
})

function normalize<T extends Record<string, unknown>>(values: T) {
  const out: Record<string, unknown> = { ...values }
  for (const key of ['semester', 'batasLunas', 'keterangan']) {
    if (out[key] === '') out[key] = null
  }
  return out
}

async function syncTarget(
  tx: { insert: any; delete: any },
  tarifId: string,
  target?: { mode: 'semua' | 'tertentu' | 'kecuali'; jurusanIds: string[] },
) {
  await tx.delete(tarifJurusan).where(eq(tarifJurusan.tarifId, tarifId))
  if (!target || target.mode === 'semua' || target.jurusanIds.length === 0) return
  await tx.insert(tarifJurusan).values(
    target.jurusanIds.map((jurusanId) => ({
      tarifId,
      jurusanId,
      isExclude: target.mode === 'kecuali',
    })),
  )
}

function enrich(rows: any[], targets: any[]) {
  const byTarif = new Map<string, any[]>()
  for (const t of targets) {
    const list = byTarif.get(t.tarifId) ?? []
    list.push(t)
    byTarif.set(t.tarifId, list)
  }
  return rows.map((row) => {
    const list = byTarif.get(row.id) ?? []
    const exclude = list.some((x) => x.isExclude)
    const mode = list.length === 0 ? 'semua' : exclude ? 'kecuali' : 'tertentu'
    return {
      ...row,
      jurusanTarget: {
        mode,
        jurusanIds: list.map((x) => x.jurusanId),
        jurusanNama: list.map((x) => x.jurusanNama),
      },
    }
  })
}

export async function handleTarifList(event: any) {
  await requireStaff(event)
  const db = useDb()
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(500, Math.max(1, Number(query.pageSize ?? 25)))

  const conds: any[] = []
  if (query.sekolahId && query.sekolahId !== 'all') conds.push(eq(tarif.sekolahId, String(query.sekolahId)))
  if (query.tahunAjaranId && query.tahunAjaranId !== 'all') conds.push(eq(tarif.tahunAjaranId, String(query.tahunAjaranId)))
  if (query.jenisPembayaranId && query.jenisPembayaranId !== 'all') conds.push(eq(tarif.jenisPembayaranId, String(query.jenisPembayaranId)))
  if (query.tingkat && query.tingkat !== 'all') conds.push(eq(tarif.tingkat, Number(query.tingkat)))
  const where = conds.length ? and(...conds) : undefined

  const rows = await db
    .select({
      id: tarif.id,
      sekolahId: tarif.sekolahId,
      sekolahNama: sekolah.nama,
      sekolahKode: sekolah.kode,
      tahunAjaranId: tarif.tahunAjaranId,
      tahunAjaranNama: tahunAjaran.nama,
      jenisPembayaranId: tarif.jenisPembayaranId,
      jenisNama: jenisPembayaran.nama,
      jenisKode: jenisPembayaran.kode,
      tingkat: tarif.tingkat,
      semester: tarif.semester,
      nominal: tarif.nominal,
      polaPenagihan: tarif.polaPenagihan,
      batasLunas: tarif.batasLunas,
      keterangan: tarif.keterangan,
      createdAt: tarif.createdAt,
    })
    .from(tarif)
    .innerJoin(sekolah, eq(tarif.sekolahId, sekolah.id))
    .innerJoin(tahunAjaran, eq(tarif.tahunAjaranId, tahunAjaran.id))
    .innerJoin(jenisPembayaran, eq(tarif.jenisPembayaranId, jenisPembayaran.id))
    .where(where)
    .orderBy(asc(tahunAjaran.nama), asc(sekolah.nama), asc(tarif.tingkat), asc(jenisPembayaran.nama))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const ids = rows.map((r) => r.id)
  const targets = ids.length
    ? await db
        .select({
          tarifId: tarifJurusan.tarifId,
          jurusanId: tarifJurusan.jurusanId,
          jurusanNama: jurusan.nama,
          isExclude: tarifJurusan.isExclude,
        })
        .from(tarifJurusan)
        .innerJoin(jurusan, eq(tarifJurusan.jurusanId, jurusan.id))
        .where(inArray(tarifJurusan.tarifId, ids))
    : []

  const totalRows = await db.select({ value: count() }).from(tarif).where(where)
  return {
    items: enrich(rows, targets),
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  }
}

export async function handleTarifCreate(event: any) {
  const user = await requireStaff(event)
  const db = useDb()
  const body = tarifSchema.parse(await readBody(event))
  const { jurusanTarget, ...values } = body

  const row = await db.transaction(async (tx) => {
    const inserted = await tx.insert(tarif).values(normalize(values) as never).returning()
    const created = inserted[0]!
    await syncTarget(tx, created.id, jurusanTarget)
    return created
  })

  await writeAudit({
    penggunaId: user.id, aksi: 'tarif.create', entitas: 'tarif', entitasId: row.id, sesudah: row, event,
  })
  return row
}

export async function handleTarifUpdate(event: any) {
  const user = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const body = tarifSchema.parse(await readBody(event))
  const { jurusanTarget, ...values } = body

  const before = await db.select().from(tarif).where(eq(tarif.id, id)).limit(1)
  if (!before.length) throw createError({ statusCode: 404, statusMessage: 'Tarif tidak ditemukan.' })

  const row = await db.transaction(async (tx) => {
    const updated = await tx
      .update(tarif)
      .set({ ...normalize(values), updatedAt: new Date() } as never)
      .where(eq(tarif.id, id))
      .returning()
    await syncTarget(tx, id, jurusanTarget)
    return updated[0]!
  })

  await writeAudit({
    penggunaId: user.id, aksi: 'tarif.update', entitas: 'tarif', entitasId: id,
    sebelum: before[0], sesudah: row, event,
  })
  return row
}

export async function handleTarifDelete(event: any) {
  const user = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const before = await db.select().from(tarif).where(eq(tarif.id, id)).limit(1)
  if (!before.length) throw createError({ statusCode: 404, statusMessage: 'Tarif tidak ditemukan.' })
  try {
    await db.delete(tarif).where(eq(tarif.id, id))
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: 'Tarif tidak dapat dihapus karena sudah dipakai tagihan.',
    })
  }
  await writeAudit({
    penggunaId: user.id, aksi: 'tarif.delete', entitas: 'tarif', entitasId: id, sebelum: before[0], event,
  })
  return { ok: true }
}

const salinSchema = z.object({
  dariTahunAjaranId: uuid,
  keTahunAjaranId: uuid,
  sekolahId: uuid.optional(),
})

/** Salin tarif dari tahun ajaran sebelumnya (FR-TRF-03). */
export async function handleTarifSalin(event: any) {
  const user = await requireStaff(event)
  const db = useDb()
  const body = salinSchema.parse(await readBody(event))

  const conds: any[] = [eq(tarif.tahunAjaranId, body.dariTahunAjaranId)]
  if (body.sekolahId) conds.push(eq(tarif.sekolahId, body.sekolahId))
  const sumber = await db.select().from(tarif).where(and(...conds))
  if (sumber.length === 0) {
    return { copied: 0, skipped: 0 }
  }
  const sumberIds = sumber.map((t) => t.id)
  const sumberTarget = await db
    .select()
    .from(tarifJurusan)
    .where(inArray(tarifJurusan.tarifId, sumberIds))

  const existing = await db
    .select({
      sekolahId: tarif.sekolahId,
      jenisPembayaranId: tarif.jenisPembayaranId,
      tingkat: tarif.tingkat,
      semester: tarif.semester,
    })
    .from(tarif)
    .where(eq(tarif.tahunAjaranId, body.keTahunAjaranId))

  const keyOf = (t: { sekolahId: string; jenisPembayaranId: string; tingkat: number; semester: string | null }) =>
    `${t.sekolahId}|${t.jenisPembayaranId}|${t.tingkat}|${t.semester ?? ''}`
  const existingKeys = new Set(existing.map(keyOf))

  let copied = 0
  let skipped = 0

  await db.transaction(async (tx) => {
    for (const t of sumber) {
      if (existingKeys.has(keyOf(t))) {
        skipped++
        continue
      }
      const inserted = await tx
        .insert(tarif)
        .values({
          sekolahId: t.sekolahId,
          tahunAjaranId: body.keTahunAjaranId,
          jenisPembayaranId: t.jenisPembayaranId,
          tingkat: t.tingkat,
          semester: t.semester,
          nominal: t.nominal,
          polaPenagihan: t.polaPenagihan,
          batasLunas: t.batasLunas,
          keterangan: t.keterangan,
        })
        .returning()
      const baru = inserted[0]!
      const targets = sumberTarget.filter((x) => x.tarifId === t.id)
      if (targets.length) {
        await tx.insert(tarifJurusan).values(
          targets.map((x) => ({ tarifId: baru.id, jurusanId: x.jurusanId, isExclude: x.isExclude })),
        )
      }
      existingKeys.add(keyOf(t))
      copied++
    }
  })

  await writeAudit({
    penggunaId: user.id, aksi: 'tarif.salin', entitas: 'tarif', entitasId: body.keTahunAjaranId,
    sesudah: { dari: body.dariTahunAjaranId, ke: body.keTahunAjaranId, copied, skipped }, event,
  })
  return { copied, skipped }
}
