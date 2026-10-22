import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import ExcelJS from 'exceljs'
import { useDb } from './db'
import { requireStaff, requireWaliKelas } from './auth-guard'
import { namaBulan, rombelLabel } from '#shared/utils/format'
import { auditLog, pembayaran, rombel, siswa, tahunAjaran, user } from '../database/schema'

type Row = Record<string, any>

function num(value: unknown): number {
  return Number(value ?? 0)
}

/** Rentang tanggal default: awal bulan berjalan hingga hari ini (zona WITA). */
function defaultRange(from?: string, to?: string): { dari: string; sampai: string } {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())
  const firstOfMonth = `${today.slice(0, 7)}-01`
  return { dari: from || firstOfMonth, sampai: to || today }
}

// ---------------------------------------------------------------- Dashboard

export async function handleDashboardSummary(event: H3Event) {
  await requireStaff(event)
  const db = useDb()

  const headline = (await db.execute(sql`
    select
      coalesce(sum(case when (tanggal_bayar at time zone 'Asia/Makassar')::date = (now() at time zone 'Asia/Makassar')::date then total_bayar end), 0)::bigint as hari_ini,
      coalesce(sum(case when (tanggal_bayar at time zone 'Asia/Makassar')::date = ((now() at time zone 'Asia/Makassar')::date - 1) then total_bayar end), 0)::bigint as kemarin,
      coalesce(sum(case when date_trunc('month', tanggal_bayar at time zone 'Asia/Makassar') = date_trunc('month', now() at time zone 'Asia/Makassar') then total_bayar end), 0)::bigint as bulan_ini,
      coalesce(sum(case when date_trunc('month', tanggal_bayar at time zone 'Asia/Makassar') = date_trunc('month', (now() at time zone 'Asia/Makassar') - interval '1 month') then total_bayar end), 0)::bigint as bulan_lalu
    from pembayaran
    where status = 'aktif'
  `)) as Row[]

  const tunggakan = (await db.execute(sql`
    select
      coalesce(sum(nominal_tagihan - total_terbayar), 0)::bigint as total,
      count(distinct siswa_id)::int as siswa
    from tagihan
    where status not in ('lunas', 'dibatalkan') and nominal_tagihan > total_terbayar
  `)) as Row[]

  const sekolahRows = (await db.execute(sql`
    select id, kode, nama from sekolah where aktif = true order by jenjang, nama
  `)) as Row[]

  const seriesRaw = (await db.execute(sql`
    select to_char(date_trunc('month', p.tanggal_bayar at time zone 'Asia/Makassar'), 'YYYY-MM') as bulan,
           s.id as sekolah_id,
           sum(p.total_bayar)::bigint as total
    from pembayaran p
    join siswa sw on sw.id = p.siswa_id
    join sekolah s on s.id = sw.sekolah_id
    where p.status = 'aktif'
      and p.tanggal_bayar >= date_trunc('month', now() at time zone 'Asia/Makassar') - interval '11 months'
    group by 1, 2
    order by 1
  `)) as Row[]

  // Label 12 bulan terakhir.
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  const colors = ['var(--color-primary)', '#f0a51f', '#2f6fed', '#189a4f']
  const series = sekolahRows.map((s, idx) => ({
    name: s.kode,
    color: colors[idx % colors.length]!,
    values: months.map((m) => {
      const found = seriesRaw.find((r) => r.bulan === m && r.sekolah_id === s.id)
      return num(found?.total)
    }),
  }))
  const labels = months.map((m) => namaBulan(Number(m.slice(5, 7))).slice(0, 3))

  const h = headline[0] ?? {}
  const percent = (current: number, previous: number) => {
    if (previous <= 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  return {
    hariIni: num(h.hari_ini),
    hariIniDelta: percent(num(h.hari_ini), num(h.kemarin)),
    bulanIni: num(h.bulan_ini),
    bulanIniDelta: percent(num(h.bulan_ini), num(h.bulan_lalu)),
    totalTunggakan: num(tunggakan[0]?.total),
    siswaBertunggakan: num(tunggakan[0]?.siswa),
    chart: { labels, series },
  }
}

// --------------------------------------------------------------- Penerimaan

interface PenerimaanFilter {
  dari: string
  sampai: string
  sekolahId?: string
  jenisPembayaranId?: string
  metode?: string
}

function penerimaanConditions(f: PenerimaanFilter) {
  return sql`
    p.status = 'aktif'
    and (p.tanggal_bayar at time zone 'Asia/Makassar')::date between ${f.dari}::date and ${f.sampai}::date
    ${f.sekolahId ? sql`and sw.sekolah_id = ${f.sekolahId}::uuid` : sql``}
    ${f.metode ? sql`and p.metode = ${f.metode}` : sql``}
  `
}

async function penerimaanData(f: PenerimaanFilter) {
  const db = useDb()
  const cond = penerimaanConditions(f)

  const ringkasan = (await db.execute(sql`
    select coalesce(sum(p.total_bayar), 0)::bigint as total, count(*)::int as transaksi
    from pembayaran p
    join siswa sw on sw.id = p.siswa_id
    where ${cond}
  `)) as Row[]

  const jenisCond = f.jenisPembayaranId ? sql`and jp.id = ${f.jenisPembayaranId}::uuid` : sql``
  const perJenis = (await db.execute(sql`
    select coalesce(jp.nama, t.keterangan, 'Tagihan manual') as jenis,
           sum(pd.nominal_dialokasikan)::bigint as total
    from pembayaran_detail pd
    join pembayaran p on p.id = pd.pembayaran_id
    join siswa sw on sw.id = p.siswa_id
    join tagihan tg on tg.id = pd.tagihan_id
    left join tarif t on t.id = tg.tarif_id
    left join jenis_pembayaran jp on jp.id = t.jenis_pembayaran_id
    where ${cond} ${jenisCond}
    group by 1
    order by total desc
  `)) as Row[]

  const perMetode = (await db.execute(sql`
    select p.metode, coalesce(sum(p.total_bayar), 0)::bigint as total, count(*)::int as transaksi
    from pembayaran p
    join siswa sw on sw.id = p.siswa_id
    where ${cond}
    group by 1
  `)) as Row[]

  const perSekolah = (await db.execute(sql`
    select sc.nama as sekolah, coalesce(sum(p.total_bayar), 0)::bigint as total
    from pembayaran p
    join siswa sw on sw.id = p.siswa_id
    join sekolah sc on sc.id = sw.sekolah_id
    where ${cond}
    group by 1
    order by total desc
  `)) as Row[]

  const transaksi = (await db.execute(sql`
    select p.nomor_kuitansi, p.tanggal_bayar, sw.nama as siswa_nama, sw.nis,
           sc.nama as sekolah, p.metode, p.total_bayar, u.name as petugas
    from pembayaran p
    join siswa sw on sw.id = p.siswa_id
    join sekolah sc on sc.id = sw.sekolah_id
    join "user" u on u.id = p.petugas_id
    where ${cond}
    order by p.tanggal_bayar desc
    limit 500
  `)) as Row[]

  return { ringkasan, perJenis, perMetode, perSekolah, transaksi }
}

export async function handleLaporanPenerimaan(event: H3Event) {
  await requireStaff(event)
  const q = getQuery(event)
  const range = defaultRange(q.dari as string, q.sampai as string)
  const data = await penerimaanData({
    ...range,
    sekolahId: q.sekolahId as string | undefined,
    jenisPembayaranId: q.jenisPembayaranId as string | undefined,
    metode: q.metode as string | undefined,
  })
  return { periode: range, ...data }
}

// ---------------------------------------------------------------- Tunggakan

interface TunggakanFilter {
  sekolahId?: string
  jurusanId?: string
  tingkat?: string
  rombelId?: string
  jenisPembayaranId?: string
  usia?: string
}

async function tunggakanRows(f: TunggakanFilter) {
  const db = useDb()
  const aktif = await db.select({ id: tahunAjaran.id }).from(tahunAjaran).where(eq(tahunAjaran.isAktif, true)).limit(1)
  const aktifId = aktif[0]?.id ?? null

  return (await db.execute(sql`
    select tg.id as tagihan_id, tg.siswa_id, sw.nama as siswa_nama, sw.nis,
           sc.nama as sekolah, sc.id as sekolah_id, rb.nama as rombel_nama, rb.tingkat as tingkat,
           ta.nama as tahun_ajaran, ta.id as tahun_ajaran_id,
           coalesce(jp.nama, tg.keterangan, 'Tagihan manual') as jenis,
           (tg.nominal_tagihan - tg.total_terbayar)::bigint as sisa
    from tagihan tg
    join siswa sw on sw.id = tg.siswa_id
    join sekolah sc on sc.id = sw.sekolah_id
    join tahun_ajaran ta on ta.id = tg.tahun_ajaran_id
    left join tarif t on t.id = tg.tarif_id
    left join jenis_pembayaran jp on jp.id = t.jenis_pembayaran_id
    left join siswa_rombel sr on sr.siswa_id = sw.id and sr.tahun_ajaran_id = tg.tahun_ajaran_id
    left join rombel rb on rb.id = sr.rombel_id
    where tg.status not in ('lunas', 'dibatalkan')
      and tg.nominal_tagihan > tg.total_terbayar
      ${f.sekolahId ? sql`and sw.sekolah_id = ${f.sekolahId}::uuid` : sql``}
      ${f.jurusanId ? sql`and sw.jurusan_id = ${f.jurusanId}::uuid` : sql``}
      ${f.tingkat ? sql`and rb.tingkat = ${Number(f.tingkat)}` : sql``}
      ${f.rombelId ? sql`and rb.id = ${f.rombelId}::uuid` : sql``}
      ${f.jenisPembayaranId ? sql`and jp.id = ${f.jenisPembayaranId}::uuid` : sql``}
      ${f.usia === 'berjalan' && aktifId ? sql`and tg.tahun_ajaran_id = ${aktifId}::uuid` : sql``}
      ${f.usia === 'lampau' && aktifId ? sql`and tg.tahun_ajaran_id <> ${aktifId}::uuid` : sql``}
    order by sw.nama, ta.nama, tg.periode_ke
  `)) as Row[]
}

function groupTunggakan(rows: Row[], aktifId: string | null) {
  const bySiswa = new Map<string, any>()
  for (const r of rows) {
    const key = r.siswa_id
    const entry = bySiswa.get(key) ?? {
      siswaId: r.siswa_id,
      siswaNama: r.siswa_nama,
      nis: r.nis,
      sekolah: r.sekolah,
      rombel: r.rombel_nama ? rombelLabel(r.tingkat, r.rombel_nama) : '—',
      total: 0,
      rincian: [] as any[],
    }
    entry.total += num(r.sisa)
    entry.rincian.push({
      tagihanId: r.tagihan_id,
      jenis: r.jenis,
      tahunAjaran: r.tahun_ajaran,
      sisa: num(r.sisa),
      lampau: aktifId ? r.tahun_ajaran_id !== aktifId : false,
    })
    bySiswa.set(key, entry)
  }
  const items = [...bySiswa.values()].sort((a, b) => b.total - a.total)
  const total = items.reduce((acc, i) => acc + i.total, 0)
  return { items, total, jumlahSiswa: items.length }
}

export async function handleLaporanTunggakan(event: H3Event) {
  await requireStaff(event)
  const q = getQuery(event)
  const db = useDb()
  const aktif = await db.select({ id: tahunAjaran.id }).from(tahunAjaran).where(eq(tahunAjaran.isAktif, true)).limit(1)
  const rows = await tunggakanRows({
    sekolahId: q.sekolahId as string,
    jurusanId: q.jurusanId as string,
    tingkat: q.tingkat as string,
    rombelId: q.rombelId as string,
    jenisPembayaranId: q.jenisPembayaranId as string,
    usia: q.usia as string,
  })
  return groupTunggakan(rows, aktif[0]?.id ?? null)
}

// ------------------------------------------------------- Tunggakan kelas (wali)

async function rombelWaliKelas(userId: string) {
  const db = useDb()
  const rows = await db
    .select({
      rombelId: rombel.id,
      nama: rombel.nama,
      tingkat: rombel.tingkat,
      sekolahId: rombel.sekolahId,
      tahunAjaranId: rombel.tahunAjaranId,
    })
    .from(rombel)
    .innerJoin(tahunAjaran, eq(rombel.tahunAjaranId, tahunAjaran.id))
    .where(and(eq(rombel.waliKelasUserId, userId), eq(tahunAjaran.isAktif, true)))
    .limit(1)
  return rows[0] ?? null
}

export async function handleTunggakanKelas(event: H3Event) {
  const wali = await requireWaliKelas(event)
  const db = useDb()
  const rb = await rombelWaliKelas(wali.id)
  const aktif = await db.select({ id: tahunAjaran.id }).from(tahunAjaran).where(eq(tahunAjaran.isAktif, true)).limit(1)

  if (!rb) return { rombel: null, items: [], total: 0, jumlahSiswa: 0, tahunAjaranAktif: aktif[0]?.id ?? null }

  const rows = await tunggakanRows({ rombelId: rb.rombelId })
  const grouped = groupTunggakan(rows, aktif[0]?.id ?? null)
  return { rombel: rb, ...grouped, tahunAjaranAktif: aktif[0]?.id ?? null }
}

// ------------------------------------------------------- Void & audit log

export async function handleLaporanVoid(event: H3Event) {
  await requireStaff(event)
  const db = useDb()

  const batal = await db
    .select({
      id: pembayaran.id,
      nomorKuitansi: pembayaran.nomorKuitansi,
      siswaNama: siswa.nama,
      siswaNis: siswa.nis,
      totalBayar: pembayaran.totalBayar,
      alasanBatal: pembayaran.alasanBatal,
      dibatalkanAt: pembayaran.dibatalkanAt,
      petugasNama: user.name,
    })
    .from(pembayaran)
    .innerJoin(siswa, eq(pembayaran.siswaId, siswa.id))
    .innerJoin(user, eq(pembayaran.petugasId, user.id))
    .where(eq(pembayaran.status, 'batal'))
    .orderBy(desc(pembayaran.dibatalkanAt))
    .limit(200)

  const audit = await db
    .select({
      id: auditLog.id,
      aksi: auditLog.aksi,
      entitas: auditLog.entitas,
      entitasId: auditLog.entitasId,
      waktu: auditLog.waktu,
      ipAddress: auditLog.ipAddress,
      penggunaNama: user.name,
    })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.penggunaId, user.id))
    .orderBy(desc(auditLog.waktu))
    .limit(200)

  return { batal, audit }
}

export async function handleAuditLogList(event: H3Event) {
  await requireStaff(event)
  const db = useDb()
  const q = getQuery(event)
  const limit = Math.min(500, Math.max(1, Number(q.pageSize ?? 50)))
  const page = Math.max(1, Number(q.page ?? 1))

  const conds: any[] = []
  if (typeof q.entitas === 'string' && q.entitas && q.entitas !== 'all') conds.push(eq(auditLog.entitas, q.entitas))
  if (typeof q.aksi === 'string' && q.aksi && q.aksi !== 'all') conds.push(eq(auditLog.aksi, q.aksi))
  const term = typeof q.q === 'string' ? q.q.trim() : ''
  if (term) {
    conds.push(or(ilike(auditLog.entitasId, `%${term}%`), ilike(user.name, `%${term}%`)))
  }
  const where = conds.length ? and(...conds) : undefined

  const join = () =>
    db
      .select({
        id: auditLog.id,
        aksi: auditLog.aksi,
        entitas: auditLog.entitas,
        entitasId: auditLog.entitasId,
        dataSebelum: auditLog.dataSebelum,
        dataSesudah: auditLog.dataSesudah,
        waktu: auditLog.waktu,
        ipAddress: auditLog.ipAddress,
        penggunaNama: user.name,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.penggunaId, user.id))

  const rows = await join().where(where).orderBy(desc(auditLog.waktu)).limit(limit).offset((page - 1) * limit)
  const totalRows = await db
    .select({ value: count() })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.penggunaId, user.id))
    .where(where)

  const [entitasRows, aksiRows] = await Promise.all([
    db.selectDistinct({ nilai: auditLog.entitas }).from(auditLog).orderBy(asc(auditLog.entitas)),
    db.selectDistinct({ nilai: auditLog.aksi }).from(auditLog).orderBy(asc(auditLog.aksi)),
  ])

  return {
    items: rows,
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize: limit,
    opsi: { entitas: entitasRows.map((r) => r.nilai), aksi: aksiRows.map((r) => r.nilai) },
  }
}

// ---------------------------------------------------------------- Excel

async function workbookResponse(event: H3Event, sheet: string, filename: string, columns: string[], rows: (string | number)[][]) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheet)
  ws.columns = columns.map((c) => ({ header: c, key: c, width: Math.max(14, c.length + 4) }))
  ws.getRow(1).font = { bold: true }
  for (const r of rows) ws.addRow(r)
  const buffer = await wb.xlsx.writeBuffer()

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function handlePenerimaanExcel(event: H3Event) {
  await requireStaff(event)
  const q = getQuery(event)
  const range = defaultRange(q.dari as string, q.sampai as string)
  const data = await penerimaanData({
    ...range,
    sekolahId: q.sekolahId as string | undefined,
    jenisPembayaranId: q.jenisPembayaranId as string | undefined,
    metode: q.metode as string | undefined,
  })
  const rows = data.transaksi.map((t) => [
    t.nomor_kuitansi, new Date(t.tanggal_bayar).toISOString().slice(0, 10),
    t.siswa_nama, t.nis, t.sekolah, t.metode, num(t.total_bayar), t.petugas,
  ])
  return workbookResponse(
    event, 'Rekap Penerimaan', `rekap-penerimaan-${range.dari}-${range.sampai}.xlsx`,
    ['No. Kuitansi', 'Tanggal', 'Siswa', 'NIS', 'Sekolah', 'Metode', 'Total', 'Petugas'],
    rows,
  )
}

export async function handleTunggakanExcel(event: H3Event) {
  await requireStaff(event)
  const q = getQuery(event)
  const rows = await tunggakanRows({
    sekolahId: q.sekolahId as string,
    jurusanId: q.jurusanId as string,
    tingkat: q.tingkat as string,
    rombelId: q.rombelId as string,
    jenisPembayaranId: q.jenisPembayaranId as string,
    usia: q.usia as string,
  })
  const data = rows.map((r) => [
    r.siswa_nama, r.nis, r.sekolah, r.rombel_nama ? rombelLabel(r.tingkat, r.rombel_nama) : '—',
    r.jenis, r.tahun_ajaran, num(r.sisa),
  ])
  return workbookResponse(
    event, 'Tunggakan', 'laporan-tunggakan.xlsx',
    ['Siswa', 'NIS', 'Sekolah', 'Rombel', 'Jenis tunggakan', 'Asal tahun ajaran', 'Sisa'],
    data,
  )
}

export async function handleTunggakanKelasExcel(event: H3Event) {
  const wali = await requireWaliKelas(event)
  const rb = await rombelWaliKelas(wali.id)
  if (!rb) {
    return workbookResponse(event, 'Tunggakan', 'tunggakan-kelas.xlsx', ['Siswa'], [])
  }
  const rows = await tunggakanRows({ rombelId: rb.rombelId })
  const data = rows.map((r) => [r.siswa_nama, r.nis, r.jenis, r.tahun_ajaran, num(r.sisa)])
  return workbookResponse(
    event, 'Tunggakan Kelas', `tunggakan-kelas-${rb.nama.replace(/\s+/g, '-')}.xlsx`,
    ['Siswa', 'NIS', 'Jenis tunggakan', 'Asal tahun ajaran', 'Sisa'],
    data,
  )
}
