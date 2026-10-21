import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff } from './auth-guard'
import { nextNomorKuitansi } from './kuitansi'
import {
  jenisPembayaran,
  pembayaran,
  pembayaranDetail,
  saldoSiswaMutasi,
  sekolah,
  siswa,
  tagihan,
  tarif,
  user,
} from '../database/schema'

function statusFrom(totalTerbayar: number, nominal: number): 'belum_bayar' | 'sebagian' | 'lunas' {
  if (totalTerbayar <= 0) return 'belum_bayar'
  if (totalTerbayar >= nominal) return 'lunas'
  return 'sebagian'
}

async function saldoTersedia(tx: any, siswaId: string): Promise<number> {
  const rows = await tx.select().from(saldoSiswaMutasi).where(eq(saldoSiswaMutasi.siswaId, siswaId))
  return rows.reduce((acc: number, m: any) => (m.tipe === 'masuk' ? acc + m.nominal : acc - m.nominal), 0)
}

export async function handlePembayaranList(event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 25)))

  const conds: any[] = []
  const term = typeof query.q === 'string' ? query.q.trim() : ''
  if (term) {
    conds.push(or(ilike(pembayaran.nomorKuitansi, `%${term}%`), ilike(siswa.nama, `%${term}%`), ilike(siswa.nis, `%${term}%`)))
  }
  if (query.siswaId && query.siswaId !== 'all') conds.push(eq(pembayaran.siswaId, String(query.siswaId)))
  if (query.sekolahId && query.sekolahId !== 'all') conds.push(eq(siswa.sekolahId, String(query.sekolahId)))
  if (query.metode && query.metode !== 'all') conds.push(eq(pembayaran.metode, String(query.metode) as never))
  if (query.status && query.status !== 'all') conds.push(eq(pembayaran.status, String(query.status) as never))
  if (query.dari) conds.push(gte(pembayaran.tanggalBayar, new Date(String(query.dari))))
  if (query.sampai) {
    const end = new Date(String(query.sampai))
    end.setHours(23, 59, 59, 999)
    conds.push(lte(pembayaran.tanggalBayar, end))
  }
  const where = conds.length ? and(...conds) : undefined

  const rows = await db
    .select({
      id: pembayaran.id,
      nomorKuitansi: pembayaran.nomorKuitansi,
      siswaId: pembayaran.siswaId,
      siswaNama: siswa.nama,
      siswaNis: siswa.nis,
      sekolahNama: sekolah.nama,
      tanggalBayar: pembayaran.tanggalBayar,
      metode: pembayaran.metode,
      nomorReferensi: pembayaran.nomorReferensi,
      totalBayar: pembayaran.totalBayar,
      kelebihanKeSaldo: pembayaran.kelebihanKeSaldo,
      status: pembayaran.status,
      alasanBatal: pembayaran.alasanBatal,
      petugasNama: user.name,
    })
    .from(pembayaran)
    .innerJoin(siswa, eq(pembayaran.siswaId, siswa.id))
    .innerJoin(sekolah, eq(siswa.sekolahId, sekolah.id))
    .innerJoin(user, eq(pembayaran.petugasId, user.id))
    .where(where)
    .orderBy(desc(pembayaran.tanggalBayar), desc(pembayaran.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const countRows = await db
    .select({ value: count() })
    .from(pembayaran)
    .innerJoin(siswa, eq(pembayaran.siswaId, siswa.id))
    .where(where)

  return { items: rows, total: Number(countRows[0]?.value ?? 0), page, pageSize }
}

const createSchema = z.object({
  siswaId: z.string().uuid(),
  metode: z.enum(['tunai', 'transfer']),
  nomorReferensi: z.string().trim().nullable().optional(),
  tanggalBayar: z.string().nullable().optional(),
  totalBayar: z.number().int().min(0),
  pakaiSaldo: z.boolean().default(false),
  alokasi: z
    .array(z.object({ tagihanId: z.string().uuid(), nominal: z.number().int().positive() }))
    .default([]),
})

export async function handlePembayaranCreate(event: H3Event) {
  const petugas = await requireStaff(event)
  const db = useDb()
  const body = createSchema.parse(await readBody(event))
  const tanggalBayar = body.tanggalBayar ? new Date(body.tanggalBayar) : new Date()

  const result = await db.transaction(async (tx) => {
    const siswaRows = await tx
      .select({ id: siswa.id, nama: siswa.nama, nis: siswa.nis, sekolahId: siswa.sekolahId, sekolahKode: sekolah.kode, sekolahNama: sekolah.nama })
      .from(siswa)
      .innerJoin(sekolah, eq(siswa.sekolahId, sekolah.id))
      .where(eq(siswa.id, body.siswaId))
      .limit(1)
    const sw = siswaRows[0]
    if (!sw) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan.' })

    const saldo = await saldoTersedia(tx, body.siswaId)

    // Tentukan alokasi: eksplisit atau otomatis ke tagihan terlama.
    let alokasi = body.alokasi
    if (alokasi.length === 0) {
      const dana = body.totalBayar + (body.pakaiSaldo ? saldo : 0)
      if (dana <= 0) throw createError({ statusCode: 400, statusMessage: 'Nominal pembayaran belum diisi.' })
      const belumLunas = await tx
        .select()
        .from(tagihan)
        .where(and(eq(tagihan.siswaId, body.siswaId), sql`${tagihan.status} not in ('lunas','dibatalkan')`))
        .orderBy(asc(tagihan.tahunAjaranId), asc(tagihan.periodeKe), asc(tagihan.createdAt))
      let sisaDana = dana
      const auto: Array<{ tagihanId: string; nominal: number }> = []
      for (const t of belumLunas) {
        if (sisaDana <= 0) break
        const sisa = t.nominalTagihan - t.totalTerbayar
        if (sisa <= 0) continue
        const nominal = Math.min(sisa, sisaDana)
        auto.push({ tagihanId: t.id, nominal })
        sisaDana -= nominal
      }
      alokasi = auto
    }

    // Validasi alokasi terhadap sisa tagihan (lock baris tagihan).
    const tagihanIds = alokasi.map((a) => a.tagihanId)
    const tagihanRows = tagihanIds.length
      ? await tx.select().from(tagihan).where(inArray(tagihan.id, tagihanIds)).for('update')
      : []
    const map = new Map(tagihanRows.map((t: any) => [t.id, t]))

    let sumAlokasi = 0
    for (const a of alokasi) {
      const t = map.get(a.tagihanId) as any
      if (!t) throw createError({ statusCode: 400, statusMessage: 'Ada tagihan yang tidak ditemukan.' })
      if (t.siswaId !== body.siswaId) throw createError({ statusCode: 400, statusMessage: 'Tagihan tidak milik siswa ini.' })
      if (t.status === 'dibatalkan') throw createError({ statusCode: 400, statusMessage: 'Tagihan sudah dibatalkan.' })
      const sisa = t.nominalTagihan - t.totalTerbayar
      if (a.nominal > sisa) throw createError({ statusCode: 400, statusMessage: 'Ada alokasi melebihi sisa tagihan.' })
      sumAlokasi += a.nominal
    }

    const saldoDipakai = body.pakaiSaldo ? Math.min(saldo, Math.max(0, sumAlokasi - body.totalBayar)) : 0
    if (body.totalBayar + saldoDipakai < sumAlokasi) {
      throw createError({ statusCode: 400, statusMessage: 'Nominal pembayaran kurang dari total yang dialokasikan.' })
    }
    const kelebihan = body.totalBayar + saldoDipakai - sumAlokasi

    const nomorKuitansi = await nextNomorKuitansi(tx, sw.sekolahId, sw.sekolahKode, tanggalBayar)

    const bayarRows = await tx
      .insert(pembayaran)
      .values({
        nomorKuitansi,
        siswaId: body.siswaId,
        tanggalBayar,
        metode: body.metode,
        nomorReferensi: body.nomorReferensi || null,
        totalBayar: body.totalBayar,
        kelebihanKeSaldo: kelebihan,
        petugasId: petugas.id,
        status: 'aktif',
      })
      .returning()
    const bayar = bayarRows[0]!

    for (const a of alokasi) {
      await tx.insert(pembayaranDetail).values({
        pembayaranId: bayar.id,
        tagihanId: a.tagihanId,
        nominalDialokasikan: a.nominal,
      })
      const t = map.get(a.tagihanId) as any
      const totalBaru = t.totalTerbayar + a.nominal
      await tx
        .update(tagihan)
        .set({ totalTerbayar: totalBaru, status: statusFrom(totalBaru, t.nominalTagihan), updatedAt: new Date() })
        .where(eq(tagihan.id, a.tagihanId))
    }

    if (saldoDipakai > 0) {
      await tx.insert(saldoSiswaMutasi).values({
        siswaId: body.siswaId, tipe: 'keluar', nominal: saldoDipakai, pembayaranId: bayar.id,
        keterangan: `Pemakaian saldo untuk ${nomorKuitansi}`,
      })
    }
    if (kelebihan > 0) {
      await tx.insert(saldoSiswaMutasi).values({
        siswaId: body.siswaId, tipe: 'masuk', nominal: kelebihan, pembayaranId: bayar.id,
        keterangan: `Kelebihan pembayaran ${nomorKuitansi}`,
      })
    }

    await writeAudit(
      {
        penggunaId: petugas.id, aksi: 'pembayaran.create', entitas: 'pembayaran', entitasId: bayar.id,
        sesudah: { nomorKuitansi, totalBayar: body.totalBayar, kelebihan, saldoDipakai, alokasi }, event,
      },
      tx,
    )

    return { pembayaran: bayar, alokasi, saldoDipakai, kelebihan }
  })

  return result
}

export async function handlePembayaranDetail(event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const rows = await db
    .select({
      id: pembayaran.id,
      nomorKuitansi: pembayaran.nomorKuitansi,
      tanggalBayar: pembayaran.tanggalBayar,
      metode: pembayaran.metode,
      nomorReferensi: pembayaran.nomorReferensi,
      totalBayar: pembayaran.totalBayar,
      kelebihanKeSaldo: pembayaran.kelebihanKeSaldo,
      status: pembayaran.status,
      alasanBatal: pembayaran.alasanBatal,
      dibatalkanAt: pembayaran.dibatalkanAt,
      siswaId: siswa.id,
      siswaNama: siswa.nama,
      siswaNis: siswa.nis,
      sekolahNama: sekolah.nama,
      sekolahKode: sekolah.kode,
      petugasNama: user.name,
    })
    .from(pembayaran)
    .innerJoin(siswa, eq(pembayaran.siswaId, siswa.id))
    .innerJoin(sekolah, eq(siswa.sekolahId, sekolah.id))
    .innerJoin(user, eq(pembayaran.petugasId, user.id))
    .where(eq(pembayaran.id, id))
    .limit(1)

  const data = rows[0]
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Pembayaran tidak ditemukan.' })

  const detail = await db
    .select({
      id: pembayaranDetail.id,
      tagihanId: pembayaranDetail.tagihanId,
      nominalDialokasikan: pembayaranDetail.nominalDialokasikan,
      jenisNama: jenisPembayaran.nama,
      keterangan: tagihan.keterangan,
      periodeKe: tagihan.periodeKe,
      tingkat: tagihan.tingkat,
      semester: tarif.semester,
    })
    .from(pembayaranDetail)
    .innerJoin(tagihan, eq(pembayaranDetail.tagihanId, tagihan.id))
    .leftJoin(tarif, eq(tagihan.tarifId, tarif.id))
    .leftJoin(jenisPembayaran, eq(tarif.jenisPembayaranId, jenisPembayaran.id))
    .where(eq(pembayaranDetail.pembayaranId, id))

  // Sisa tagihan siswa setelah transaksi ini.
  const sisaRows = await db
    .select({ sisa: sql<number>`coalesce(sum(${tagihan.nominalTagihan} - ${tagihan.totalTerbayar}), 0)` })
    .from(tagihan)
    .where(and(eq(tagihan.siswaId, data.siswaId), sql`${tagihan.status} not in ('lunas','dibatalkan')`))

  const saldoRows = await db.select().from(saldoSiswaMutasi).where(eq(saldoSiswaMutasi.siswaId, data.siswaId))
  const saldo = saldoRows.reduce((acc, m) => (m.tipe === 'masuk' ? acc + m.nominal : acc - m.nominal), 0)

  return {
    pembayaran: data,
    detail,
    sisaTagihan: Number(sisaRows[0]?.sisa ?? 0),
    saldo,
  }
}

export async function handlePembayaranVoid(event: H3Event) {
  const petugas = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const body = z.object({ alasan: z.string().trim().min(1, 'Alasan wajib diisi') }).parse(await readBody(event))

  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(pembayaran).where(eq(pembayaran.id, id)).limit(1).for('update')
    const bayar = rows[0]
    if (!bayar) throw createError({ statusCode: 404, statusMessage: 'Pembayaran tidak ditemukan.' })
    if (bayar.status === 'batal') throw createError({ statusCode: 400, statusMessage: 'Pembayaran sudah dibatalkan.' })

    const details = await tx.select().from(pembayaranDetail).where(eq(pembayaranDetail.pembayaranId, id))

    // Pulihkan total terbayar tiap tagihan.
    for (const d of details) {
      const tRows = await tx.select().from(tagihan).where(eq(tagihan.id, d.tagihanId)).limit(1).for('update')
      const t = tRows[0]
      if (!t) continue
      const totalBaru = Math.max(0, t.totalTerbayar - d.nominalDialokasikan)
      await tx
        .update(tagihan)
        .set({ totalTerbayar: totalBaru, status: statusFrom(totalBaru, t.nominalTagihan), updatedAt: new Date() })
        .where(eq(tagihan.id, t.id))
    }

    // Balikkan mutasi saldo yang terkait pembayaran ini.
    const mutasi = await tx.select().from(saldoSiswaMutasi).where(eq(saldoSiswaMutasi.pembayaranId, id))
    const net = mutasi.reduce((acc, m) => (m.tipe === 'masuk' ? acc + m.nominal : acc - m.nominal), 0)
    if (net > 0) {
      await tx.insert(saldoSiswaMutasi).values({
        siswaId: bayar.siswaId, tipe: 'keluar', nominal: net, pembayaranId: bayar.id,
        keterangan: `Pembatalan ${bayar.nomorKuitansi}`,
      })
    } else if (net < 0) {
      await tx.insert(saldoSiswaMutasi).values({
        siswaId: bayar.siswaId, tipe: 'masuk', nominal: -net, pembayaranId: bayar.id,
        keterangan: `Pembatalan ${bayar.nomorKuitansi}`,
      })
    }

    const updated = await tx
      .update(pembayaran)
      .set({ status: 'batal', alasanBatal: body.alasan, dibatalkanAt: new Date(), updatedAt: new Date() })
      .where(eq(pembayaran.id, id))
      .returning()

    await writeAudit(
      {
        penggunaId: petugas.id, aksi: 'pembayaran.void', entitas: 'pembayaran', entitasId: id,
        sebelum: { nomorKuitansi: bayar.nomorKuitansi, totalBayar: bayar.totalBayar },
        sesudah: { alasan: body.alasan, status: 'batal' }, event,
      },
      tx,
    )

    return updated[0]!
  })

  return result
}
