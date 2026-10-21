import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff } from './auth-guard'
import {
  jenisPembayaran,
  jurusan,
  pembayaran,
  rombel,
  saldoSiswaMutasi,
  sekolah,
  siswa,
  siswaRombel,
  tagihan,
  tahunAjaran,
  tarif,
} from '../database/schema'

async function tahunAjaranAktifId(): Promise<string | null> {
  const db = useDb()
  const rows = await db.select({ id: tahunAjaran.id }).from(tahunAjaran).where(eq(tahunAjaran.isAktif, true)).limit(1)
  return rows[0]?.id ?? null
}

function baseSelect(taId: string | null) {
  const db = useDb()
  return db
    .select({
      id: siswa.id,
      nis: siswa.nis,
      nisn: siswa.nisn,
      nama: siswa.nama,
      jenisKelamin: siswa.jenisKelamin,
      tanggalLahir: siswa.tanggalLahir,
      sekolahId: siswa.sekolahId,
      sekolahNama: sekolah.nama,
      jurusanId: siswa.jurusanId,
      jurusanNama: jurusan.nama,
      namaWali: siswa.namaWali,
      noHpWali: siswa.noHpWali,
      tahunMasuk: siswa.tahunMasuk,
      status: siswa.status,
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      rombelTingkat: rombel.tingkat,
    })
    .from(siswa)
    .innerJoin(sekolah, eq(siswa.sekolahId, sekolah.id))
    .leftJoin(jurusan, eq(siswa.jurusanId, jurusan.id))
    .leftJoin(
      siswaRombel,
      taId
        ? and(eq(siswaRombel.siswaId, siswa.id), eq(siswaRombel.tahunAjaranId, taId))
        : sql`false`,
    )
    .leftJoin(rombel, eq(siswaRombel.rombelId, rombel.id))
}

export async function handleSiswaList(event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 25)))
  const taId = await tahunAjaranAktifId()

  const conds: any[] = []
  const term = typeof query.q === 'string' ? query.q.trim() : ''
  if (term) {
    conds.push(or(ilike(siswa.nama, `%${term}%`), ilike(siswa.nis, `%${term}%`), ilike(siswa.nisn, `%${term}%`)))
  }
  if (query.sekolahId && query.sekolahId !== 'all') conds.push(eq(siswa.sekolahId, String(query.sekolahId)))
  if (query.jurusanId && query.jurusanId !== 'all') conds.push(eq(siswa.jurusanId, String(query.jurusanId)))
  if (query.status && query.status !== 'all') conds.push(eq(siswa.status, String(query.status) as never))
  if (query.rombelId && query.rombelId !== 'all') conds.push(eq(siswaRombel.rombelId, String(query.rombelId)))
  const where = conds.length ? and(...conds) : undefined

  const rows = await baseSelect(taId).where(where).orderBy(asc(siswa.nama)).limit(pageSize).offset((page - 1) * pageSize)

  const countQuery = db
    .select({ value: count() })
    .from(siswa)
    .innerJoin(sekolah, eq(siswa.sekolahId, sekolah.id))
    .leftJoin(jurusan, eq(siswa.jurusanId, jurusan.id))
    .leftJoin(
      siswaRombel,
      taId ? and(eq(siswaRombel.siswaId, siswa.id), eq(siswaRombel.tahunAjaranId, taId)) : sql`false`,
    )
    .leftJoin(rombel, eq(siswaRombel.rombelId, rombel.id))
    .where(where)

  const totalRows = await countQuery
  return { items: rows, total: Number(totalRows[0]?.value ?? 0), page, pageSize }
}

const siswaSchema = z.object({
  nis: z.string().trim().min(1, 'NIS wajib diisi'),
  nisn: z.string().trim().nullable().optional(),
  nama: z.string().trim().min(1, 'Nama wajib diisi'),
  jenisKelamin: z.enum(['L', 'P']),
  tanggalLahir: z.string().nullable().optional(),
  sekolahId: z.string().uuid(),
  jurusanId: z.string().uuid().nullable().optional(),
  namaWali: z.string().trim().nullable().optional(),
  noHpWali: z.string().trim().nullable().optional(),
  tahunMasuk: z.number().int(),
  status: z.enum(['aktif', 'lulus', 'pindah', 'keluar']).default('aktif'),
  rombelId: z.string().uuid().nullable().optional(),
})

function clean(values: Record<string, unknown>) {
  const out = { ...values }
  for (const key of ['nisn', 'tanggalLahir', 'jurusanId', 'namaWali', 'noHpWali']) {
    if (out[key] === '') out[key] = null
  }
  return out
}

async function upsertPenempatan(tx: any, siswaId: string, rombelId: string | null | undefined) {
  if (!rombelId) return
  const rows = await tx.select().from(rombel).where(eq(rombel.id, rombelId)).limit(1)
  const rb = rows[0]
  if (!rb) return
  await tx.delete(siswaRombel).where(and(eq(siswaRombel.siswaId, siswaId), eq(siswaRombel.tahunAjaranId, rb.tahunAjaranId)))
  await tx.insert(siswaRombel).values({ siswaId, rombelId, tahunAjaranId: rb.tahunAjaranId })
}

export async function handleSiswaCreate(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const body = siswaSchema.parse(await readBody(event))
  const { rombelId, ...rest } = body

  const duplicate = await db.select({ id: siswa.id }).from(siswa).where(eq(siswa.nis, rest.nis)).limit(1)
  if (duplicate.length) throw createError({ statusCode: 409, statusMessage: 'NIS sudah dipakai siswa lain.' })

  const row = await db.transaction(async (tx) => {
    const inserted = await tx.insert(siswa).values(clean(rest) as never).returning()
    const created = inserted[0]!
    await upsertPenempatan(tx, created.id, rombelId)
    return created
  })

  await writeAudit({ penggunaId: user.id, aksi: 'siswa.create', entitas: 'siswa', entitasId: row.id, sesudah: row, event })
  return row
}

export async function handleSiswaUpdate(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const body = siswaSchema.parse(await readBody(event))
  const { rombelId, ...rest } = body

  const before = await db.select().from(siswa).where(eq(siswa.id, id)).limit(1)
  if (!before.length) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan.' })

  const dup = await db
    .select({ id: siswa.id })
    .from(siswa)
    .where(and(eq(siswa.nis, rest.nis), sql`${siswa.id} <> ${id}`))
    .limit(1)
  if (dup.length) throw createError({ statusCode: 409, statusMessage: 'NIS sudah dipakai siswa lain.' })

  const row = await db.transaction(async (tx) => {
    const updated = await tx
      .update(siswa)
      .set({ ...clean(rest), updatedAt: new Date() } as never)
      .where(eq(siswa.id, id))
      .returning()
    await upsertPenempatan(tx, id, rombelId)
    return updated[0]!
  })

  await writeAudit({ penggunaId: user.id, aksi: 'siswa.update', entitas: 'siswa', entitasId: id, sebelum: before[0], sesudah: row, event })
  return row
}

export async function handleSiswaDelete(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const before = await db.select().from(siswa).where(eq(siswa.id, id)).limit(1)
  if (!before.length) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan.' })
  try {
    await db.delete(siswa).where(eq(siswa.id, id))
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: 'Siswa tidak dapat dihapus karena memiliki tagihan atau pembayaran. Ubah statusnya menjadi keluar.',
    })
  }
  await writeAudit({ penggunaId: user.id, aksi: 'siswa.delete', entitas: 'siswa', entitasId: id, sebelum: before[0], event })
  return { ok: true }
}

export async function handleSiswaDetail(event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const siswaRows = await db
    .select({
      id: siswa.id, nis: siswa.nis, nisn: siswa.nisn, nama: siswa.nama, jenisKelamin: siswa.jenisKelamin,
      tanggalLahir: siswa.tanggalLahir, sekolahId: siswa.sekolahId, sekolahNama: sekolah.nama,
      jurusanId: siswa.jurusanId, jurusanNama: jurusan.nama, namaWali: siswa.namaWali,
      noHpWali: siswa.noHpWali, tahunMasuk: siswa.tahunMasuk, status: siswa.status,
    })
    .from(siswa)
    .innerJoin(sekolah, eq(siswa.sekolahId, sekolah.id))
    .leftJoin(jurusan, eq(siswa.jurusanId, jurusan.id))
    .where(eq(siswa.id, id))
    .limit(1)

  const data = siswaRows[0]
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan.' })

  const [penempatan, tagihanRows, mutasi, pembayaranRows] = await Promise.all([
    db
      .select({
        id: siswaRombel.id, rombelId: rombel.id, rombelNama: rombel.nama, tingkat: rombel.tingkat,
        tahunAjaranId: tahunAjaran.id, tahunAjaranNama: tahunAjaran.nama, isAktif: tahunAjaran.isAktif,
      })
      .from(siswaRombel)
      .innerJoin(rombel, eq(siswaRombel.rombelId, rombel.id))
      .innerJoin(tahunAjaran, eq(siswaRombel.tahunAjaranId, tahunAjaran.id))
      .where(eq(siswaRombel.siswaId, id))
      .orderBy(desc(tahunAjaran.nama)),
    db
      .select({
        id: tagihan.id, tarifId: tagihan.tarifId, tahunAjaranId: tagihan.tahunAjaranId,
        tahunAjaranNama: tahunAjaran.nama, tingkat: tagihan.tingkat, periodeKe: tagihan.periodeKe,
        jatuhTempo: tagihan.jatuhTempo, nominalTagihan: tagihan.nominalTagihan, totalTerbayar: tagihan.totalTerbayar,
        status: tagihan.status, keterangan: tagihan.keterangan, createdAt: tagihan.createdAt,
        jenisNama: jenisPembayaran.nama, jenisKode: jenisPembayaran.kode, semester: tarif.semester,
      })
      .from(tagihan)
      .leftJoin(tarif, eq(tagihan.tarifId, tarif.id))
      .leftJoin(jenisPembayaran, eq(tarif.jenisPembayaranId, jenisPembayaran.id))
      .innerJoin(tahunAjaran, eq(tagihan.tahunAjaranId, tahunAjaran.id))
      .where(eq(tagihan.siswaId, id))
      .orderBy(asc(tahunAjaran.nama), asc(tagihan.periodeKe), asc(tagihan.createdAt)),
    db.select().from(saldoSiswaMutasi).where(eq(saldoSiswaMutasi.siswaId, id)).orderBy(desc(saldoSiswaMutasi.createdAt)),
    db.select().from(pembayaran).where(eq(pembayaran.siswaId, id)).orderBy(desc(pembayaran.tanggalBayar)),
  ])

  const saldo = mutasi.reduce((acc, m) => (m.tipe === 'masuk' ? acc + m.nominal : acc - m.nominal), 0)
  const aktif = tagihanRows.filter((t) => t.status !== 'dibatalkan')
  const totalTagihan = aktif.reduce((a, t) => a + t.nominalTagihan, 0)
  const totalTerbayar = aktif.reduce((a, t) => a + t.totalTerbayar, 0)

  return {
    siswa: data,
    penempatan,
    tagihan: tagihanRows,
    mutasi,
    pembayaran: pembayaranRows,
    ringkasan: { saldo, totalTagihan, totalTerbayar, sisa: totalTagihan - totalTerbayar },
  }
}

export async function handleSaldoKeluar(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const body = z
    .object({ nominal: z.number().int().positive(), keterangan: z.string().trim().min(1) })
    .parse(await readBody(event))

  const mutasi = await db.select().from(saldoSiswaMutasi).where(eq(saldoSiswaMutasi.siswaId, id))
  const saldo = mutasi.reduce((acc, m) => (m.tipe === 'masuk' ? acc + m.nominal : acc - m.nominal), 0)
  if (body.nominal > saldo) {
    throw createError({ statusCode: 400, statusMessage: `Nominal melebihi saldo tersedia (${saldo}).` })
  }

  const inserted = await db
    .insert(saldoSiswaMutasi)
    .values({ siswaId: id, tipe: 'keluar', nominal: body.nominal, keterangan: body.keterangan })
    .returning()

  await writeAudit({ penggunaId: user.id, aksi: 'saldo.keluar', entitas: 'siswa', entitasId: id, sesudah: inserted[0], event })
  return inserted[0]
}
