import { and, eq, inArray, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff } from './auth-guard'
import { rombel, siswa, siswaRombel, tahunAjaran } from '../database/schema'

type Row = Record<string, any>

/** Pratinjau satu rombel beserta tunggakan, untuk peringatan sebelum kenaikan kelas (FR-KLS-02). */
export async function handleKenaikanPreview(event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const rombelId = String(getQuery(event).rombelId ?? '')
  if (!rombelId) return { rombel: null, items: [], totalTunggakan: 0, jumlahBertunggakan: 0 }

  const rbRows = await db
    .select({
      id: rombel.id,
      nama: rombel.nama,
      tingkat: rombel.tingkat,
      sekolahId: rombel.sekolahId,
      tahunAjaranId: rombel.tahunAjaranId,
      tahunAjaranNama: tahunAjaran.nama,
    })
    .from(rombel)
    .innerJoin(tahunAjaran, eq(rombel.tahunAjaranId, tahunAjaran.id))
    .where(eq(rombel.id, rombelId))
    .limit(1)
  const rb = rbRows[0]
  if (!rb) throw createError({ statusCode: 404, statusMessage: 'Rombel tidak ditemukan.' })

  const rows = (await db.execute(sql`
    select sw.id as siswa_id, sw.nis, sw.nama, sw.status,
           coalesce(t.sisa, 0)::bigint as sisa
    from siswa_rombel sr
    join siswa sw on sw.id = sr.siswa_id
    left join (
      select siswa_id, sum(nominal_tagihan - total_terbayar)::bigint as sisa
      from tagihan
      where status not in ('lunas', 'dibatalkan') and nominal_tagihan > total_terbayar
      group by siswa_id
    ) t on t.siswa_id = sw.id
    where sr.rombel_id = ${rombelId}::uuid and sw.status = 'aktif'
      -- Siswa yang sudah punya penempatan di tahun ajaran yang lebih baru tidak ditampilkan lagi.
      and not exists (
        select 1
        from siswa_rombel sr2
        join tahun_ajaran ta2 on ta2.id = sr2.tahun_ajaran_id
        join tahun_ajaran ta1 on ta1.id = sr.tahun_ajaran_id
        where sr2.siswa_id = sr.siswa_id and ta2.tanggal_mulai > ta1.tanggal_mulai
      )
    order by sw.nama
  `)) as Row[]

  const items = rows.map((r) => ({
    siswaId: r.siswa_id as string,
    nis: r.nis as string,
    nama: r.nama as string,
    status: r.status as string,
    sisa: Number(r.sisa ?? 0),
  }))

  return {
    rombel: rb,
    items,
    totalTunggakan: items.reduce((acc, i) => acc + i.sisa, 0),
    jumlahBertunggakan: items.filter((i) => i.sisa > 0).length,
  }
}

const kenaikanSchema = z.object({
  rombelAsalId: z.string().uuid(),
  tahunAjaranTujuanId: z.string().uuid().nullable().optional(),
  rombelTujuanId: z.string().uuid().nullable().optional(),
  rombelTinggalId: z.string().uuid().nullable().optional(),
  siswa: z
    .array(z.object({ siswaId: z.string().uuid(), tujuan: z.enum(['naik', 'tinggal', 'lulus']) }))
    .min(1, 'Pilih minimal satu siswa.'),
})

/** Pindahkan siswa ke rombel tahun ajaran baru (naik / tinggal kelas) atau tandai lulus. */
export async function handleKenaikanProses(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()
  const body = kenaikanSchema.parse(await readBody(event))

  const asalRows = await db.select().from(rombel).where(eq(rombel.id, body.rombelAsalId)).limit(1)
  const asal = asalRows[0]
  if (!asal) throw createError({ statusCode: 404, statusMessage: 'Rombel asal tidak ditemukan.' })

  if (body.siswa.some((s) => s.tujuan !== 'lulus') && !body.tahunAjaranTujuanId) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih tahun ajaran tujuan untuk siswa yang naik / tinggal kelas.' })
  }

  const targetIds = [body.rombelTujuanId, body.rombelTinggalId].filter(Boolean) as string[]
  const targetRows = targetIds.length
    ? await db.select().from(rombel).where(inArray(rombel.id, targetIds))
    : []

  const target = body.rombelTujuanId ? targetRows.find((r) => r.id === body.rombelTujuanId) ?? null : null
  if (body.rombelTujuanId && !target) {
    throw createError({ statusCode: 404, statusMessage: 'Rombel tujuan tidak ditemukan.' })
  }
  if (body.siswa.some((s) => s.tujuan === 'naik') && !target) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih rombel tujuan untuk siswa yang naik kelas.' })
  }
  if (target && target.tahunAjaranId !== body.tahunAjaranTujuanId) {
    throw createError({ statusCode: 400, statusMessage: 'Rombel tujuan bukan milik tahun ajaran tujuan.' })
  }
  if (target && target.sekolahId !== asal.sekolahId) {
    throw createError({ statusCode: 400, statusMessage: 'Rombel tujuan harus dari sekolah yang sama.' })
  }
  const tinggal = body.rombelTinggalId ? targetRows.find((r) => r.id === body.rombelTinggalId) ?? null : null
  if (body.siswa.some((s) => s.tujuan === 'tinggal') && !tinggal) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih rombel untuk siswa yang tinggal kelas.' })
  }
  if (tinggal && (tinggal.tahunAjaranId !== body.tahunAjaranTujuanId || tinggal.sekolahId !== asal.sekolahId)) {
    throw createError({ statusCode: 400, statusMessage: 'Rombel tinggal kelas tidak sesuai tahun ajaran / sekolah tujuan.' })
  }

  const ids = body.siswa.map((s) => s.siswaId)
  const anggota = await db
    .select({ siswaId: siswaRombel.siswaId })
    .from(siswaRombel)
    .where(and(eq(siswaRombel.rombelId, asal.id), inArray(siswaRombel.siswaId, ids)))
  const anggotaSet = new Set(anggota.map((a) => a.siswaId))
  if (ids.some((id) => !anggotaSet.has(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Ada siswa yang bukan anggota rombel asal.' })
  }

  const hasil = { naik: 0, tinggal: 0, lulus: 0 }
  await db.transaction(async (tx) => {
    for (const s of body.siswa) {
      if (s.tujuan === 'lulus') {
        await tx.update(siswa).set({ status: 'lulus', updatedAt: new Date() }).where(eq(siswa.id, s.siswaId))
        hasil.lulus++
        continue
      }
      const rombelId = s.tujuan === 'tinggal' ? tinggal!.id : target!.id
      await tx
        .delete(siswaRombel)
        .where(and(eq(siswaRombel.siswaId, s.siswaId), eq(siswaRombel.tahunAjaranId, body.tahunAjaranTujuanId!)))
      await tx.insert(siswaRombel).values({ siswaId: s.siswaId, rombelId, tahunAjaranId: body.tahunAjaranTujuanId! })
      hasil[s.tujuan as 'naik' | 'tinggal']++
    }
  })

  for (const s of body.siswa) {
    await writeAudit({
      penggunaId: user.id,
      aksi: s.tujuan === 'lulus' ? 'siswa.lulus' : 'siswa.kenaikan_kelas',
      entitas: 'siswa',
      entitasId: s.siswaId,
      sebelum: { rombelId: asal.id, status: 'aktif' },
      sesudah: {
        tujuan: s.tujuan,
        rombelId: s.tujuan === 'lulus' ? null : s.tujuan === 'tinggal' ? tinggal!.id : target!.id,
        status: s.tujuan === 'lulus' ? 'lulus' : 'aktif',
      },
      event,
    })
  }

  return hasil
}
