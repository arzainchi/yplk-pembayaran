import { and, asc, count, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff } from './auth-guard'
import {
  jenisPembayaran,
  rombel,
  sekolah,
  siswa,
  siswaRombel,
  tagihan,
  tahunAjaran,
  tarif,
  tarifJurusan,
} from '../database/schema'

export async function handleTagihanList(event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 25)))

  const conds: any[] = []
  const term = typeof query.q === 'string' ? query.q.trim() : ''
  if (term) conds.push(or(ilike(siswa.nama, `%${term}%`), ilike(siswa.nis, `%${term}%`)))
  if (query.siswaId && query.siswaId !== 'all') conds.push(eq(tagihan.siswaId, String(query.siswaId)))
  if (query.sekolahId && query.sekolahId !== 'all') conds.push(eq(siswa.sekolahId, String(query.sekolahId)))
  if (query.tahunAjaranId && query.tahunAjaranId !== 'all') conds.push(eq(tagihan.tahunAjaranId, String(query.tahunAjaranId)))
  if (query.tarifId && query.tarifId !== 'all') conds.push(eq(tagihan.tarifId, String(query.tarifId)))
  if (query.jenisPembayaranId && query.jenisPembayaranId !== 'all') conds.push(eq(tarif.jenisPembayaranId, String(query.jenisPembayaranId)))
  if (query.status && query.status !== 'all') conds.push(eq(tagihan.status, String(query.status) as never))
  if (query.rombelId && query.rombelId !== 'all') conds.push(eq(rombel.id, String(query.rombelId)))
  const where = conds.length ? and(...conds) : undefined

  const joinQuery = () =>
    db
      .select({
        id: tagihan.id,
        siswaId: tagihan.siswaId,
        siswaNama: siswa.nama,
        siswaNis: siswa.nis,
        sekolahNama: sekolah.nama,
        tahunAjaranId: tagihan.tahunAjaranId,
        tahunAjaranNama: tahunAjaran.nama,
        tingkat: tagihan.tingkat,
        periodeKe: tagihan.periodeKe,
        nominalTagihan: tagihan.nominalTagihan,
        totalTerbayar: tagihan.totalTerbayar,
        status: tagihan.status,
        keterangan: tagihan.keterangan,
        jenisNama: jenisPembayaran.nama,
        tarifId: tagihan.tarifId,
        rombelNama: rombel.nama,
      })
      .from(tagihan)
      .innerJoin(siswa, eq(tagihan.siswaId, siswa.id))
      .innerJoin(sekolah, eq(siswa.sekolahId, sekolah.id))
      .innerJoin(tahunAjaran, eq(tagihan.tahunAjaranId, tahunAjaran.id))
      .leftJoin(tarif, eq(tagihan.tarifId, tarif.id))
      .leftJoin(jenisPembayaran, eq(tarif.jenisPembayaranId, jenisPembayaran.id))
      .leftJoin(
        siswaRombel,
        and(eq(siswaRombel.siswaId, siswa.id), eq(siswaRombel.tahunAjaranId, tagihan.tahunAjaranId)),
      )
      .leftJoin(rombel, eq(siswaRombel.rombelId, rombel.id))

  const rows = await joinQuery().where(where).orderBy(asc(siswa.nama), asc(tagihan.tahunAjaranId), asc(tagihan.periodeKe)).limit(pageSize).offset((page - 1) * pageSize)

  const countRows = await db
    .select({ value: count() })
    .from(tagihan)
    .innerJoin(siswa, eq(tagihan.siswaId, siswa.id))
    .leftJoin(tarif, eq(tagihan.tarifId, tarif.id))
    .leftJoin(
      siswaRombel,
      and(eq(siswaRombel.siswaId, siswa.id), eq(siswaRombel.tahunAjaranId, tagihan.tahunAjaranId)),
    )
    .leftJoin(rombel, eq(siswaRombel.rombelId, rombel.id))
    .where(where)

  return { items: rows, total: Number(countRows[0]?.value ?? 0), page, pageSize }
}

const manualSchema = z.object({
  siswaId: z.string().uuid(),
  jenisPembayaranId: z.string().uuid(),
  nominal: z.number().int().positive(),
  keterangan: z.string().trim().nullable().optional(),
})

export async function handleTagihanManual(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const body = manualSchema.parse(await readBody(event))

  const sw = await db.select().from(siswa).where(eq(siswa.id, body.siswaId)).limit(1)
  if (!sw.length) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan.' })

  const ta = await db.select().from(tahunAjaran).where(eq(tahunAjaran.isAktif, true)).limit(1)
  if (!ta.length) throw createError({ statusCode: 400, statusMessage: 'Belum ada tahun ajaran aktif.' })

  const jen = await db.select().from(jenisPembayaran).where(eq(jenisPembayaran.id, body.jenisPembayaranId)).limit(1)

  const placement = await db
    .select({ tingkat: rombel.tingkat })
    .from(siswaRombel)
    .innerJoin(rombel, eq(siswaRombel.rombelId, rombel.id))
    .where(and(eq(siswaRombel.siswaId, body.siswaId), eq(siswaRombel.tahunAjaranId, ta[0]!.id)))
    .limit(1)

  const inserted = await db
    .insert(tagihan)
    .values({
      siswaId: body.siswaId,
      tarifId: null,
      tahunAjaranId: ta[0]!.id,
      tingkat: placement[0]?.tingkat ?? 0,
      periodeKe: null,
      nominalTagihan: body.nominal,
      status: 'belum_bayar',
      keterangan: body.keterangan || `Tagihan manual ${jen[0]?.nama ?? ''}`.trim(),
    })
    .returning()

  await writeAudit({
    penggunaId: user.id, aksi: 'tagihan.manual', entitas: 'tagihan',
    entitasId: inserted[0]!.id, sesudah: inserted[0], event,
  })
  return inserted[0]
}

const generateSchema = z
  .object({
    mode: z.enum(['tarif', 'rombel']),
    tarifId: z.string().uuid().optional(),
    rombelId: z.string().uuid().optional(),
  })
  .refine((v) => (v.mode === 'tarif' ? !!v.tarifId : !!v.rombelId), {
    message: 'Pilihan generate belum lengkap.',
  })

function bulanSemester(semester: string | null): number[] {
  return semester === 'genap' ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12]
}

export async function handleTagihanGenerate(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const body = generateSchema.parse(await readBody(event))

  // Kumpulkan tarif yang akan diterbitkan.
  let tarifList: Array<typeof tarif.$inferSelect> = []
  let targetRombelId: string | null = null
  let scopeSekolahId: string | null = null
  let scopeTahunAjaranId: string | null = null
  let scopeTingkat: number | null = null

  if (body.mode === 'tarif') {
    const rows = await db.select().from(tarif).where(eq(tarif.id, body.tarifId!))
    if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Tarif tidak ditemukan.' })
    tarifList = rows
    scopeSekolahId = rows[0]!.sekolahId
    scopeTahunAjaranId = rows[0]!.tahunAjaranId
    scopeTingkat = rows[0]!.tingkat
  } else {
    const rb = await db.select().from(rombel).where(eq(rombel.id, body.rombelId!)).limit(1)
    if (!rb.length) throw createError({ statusCode: 404, statusMessage: 'Rombel tidak ditemukan.' })
    targetRombelId = rb[0]!.id
    scopeSekolahId = rb[0]!.sekolahId
    scopeTahunAjaranId = rb[0]!.tahunAjaranId
    scopeTingkat = rb[0]!.tingkat
    tarifList = await db
      .select()
      .from(tarif)
      .where(and(eq(tarif.sekolahId, scopeSekolahId), eq(tarif.tahunAjaranId, scopeTahunAjaranId), eq(tarif.tingkat, scopeTingkat)))
  }

  if (tarifList.length === 0) return { created: 0, skipped: 0 }

  // Ambil siswa target beserta jurusannya.
  const targetRows = targetRombelId
    ? await db
        .select({ siswaId: siswaRombel.siswaId, jurusanId: siswa.jurusanId })
        .from(siswaRombel)
        .innerJoin(siswa, eq(siswaRombel.siswaId, siswa.id))
        .where(eq(siswaRombel.rombelId, targetRombelId))
    : await db
        .select({ siswaId: siswaRombel.siswaId, jurusanId: siswa.jurusanId })
        .from(siswaRombel)
        .innerJoin(siswa, eq(siswaRombel.siswaId, siswa.id))
        .innerJoin(rombel, eq(siswaRombel.rombelId, rombel.id))
        .where(
          and(
            eq(siswaRombel.tahunAjaranId, scopeTahunAjaranId!),
            eq(rombel.sekolahId, scopeSekolahId!),
            eq(rombel.tingkat, scopeTingkat!),
          ),
        )

  if (targetRows.length === 0) return { created: 0, skipped: 0 }

  const tarifIds = tarifList.map((t) => t.id)
  const targets = await db.select().from(tarifJurusan).where(inArray(tarifJurusan.tarifId, tarifIds))
  const existing = await db
    .select({ siswaId: tagihan.siswaId, tarifId: tagihan.tarifId, periodeKe: tagihan.periodeKe })
    .from(tagihan)
    .where(inArray(tagihan.tarifId, tarifIds))
  const existingKeys = new Set(existing.map((e) => `${e.siswaId}|${e.tarifId}|${e.periodeKe ?? ''}`))

  const values: Array<typeof tagihan.$inferInsert> = []
  let skipped = 0

  for (const t of tarifList) {
    const targetJur = targets.filter((x) => x.tarifId === t.id)
    for (const row of targetRows) {
      if (targetJur.length) {
        const exclude = targetJur.some((x) => x.isExclude)
        const listed = row.jurusanId ? targetJur.some((x) => x.jurusanId === row.jurusanId) : false
        if (exclude && listed) continue
        if (!exclude && !listed) continue
      }
      const periods = t.polaPenagihan === 'bulanan' ? bulanSemester(t.semester) : [null]
      for (const periode of periods) {
        const key = `${row.siswaId}|${t.id}|${periode ?? ''}`
        if (existingKeys.has(key)) {
          skipped++
          continue
        }
        existingKeys.add(key)
        values.push({
          siswaId: row.siswaId,
          tarifId: t.id,
          tahunAjaranId: t.tahunAjaranId,
          tingkat: t.tingkat,
          periodeKe: periode,
          nominalTagihan: t.nominal,
          status: 'belum_bayar',
          keterangan: t.keterangan,
        })
      }
    }
  }

  if (values.length) {
    await db.insert(tagihan).values(values)
  }

  await writeAudit({
    penggunaId: user.id, aksi: 'tagihan.generate', entitas: 'tagihan',
    entitasId: body.tarifId ?? body.rombelId ?? null,
    sesudah: { mode: body.mode, created: values.length, skipped }, event,
  })

  return { created: values.length, skipped }
}
