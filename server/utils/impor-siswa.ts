import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import ExcelJS from 'exceljs'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff } from './auth-guard'
import { jurusan, rombel, sekolah, siswa, siswaRombel, tahunAjaran } from '../database/schema'

const KOLOM = [
  'NIS', 'NISN', 'Nama', 'L/P', 'Tanggal Lahir', 'Sekolah', 'Jurusan',
  'Nama Wali', 'HP Wali', 'Tahun Masuk', 'Rombel',
] as const

type Kolom = (typeof KOLOM)[number]

const PETUNJUK: Array<[string, string]> = [
  ['NIS', 'Wajib dan unik. Contoh: S20260001'],
  ['NISN', 'Opsional, unik bila diisi.'],
  ['Nama', 'Wajib, nama lengkap siswa.'],
  ['L/P', 'Wajib, isi L atau P (Laki-laki / Perempuan).'],
  ['Tanggal Lahir', 'Opsional, format YYYY-MM-DD (mis. 2010-05-14).'],
  ['Sekolah', 'Wajib, kode atau nama sekolah (mis. SMP-TT).'],
  ['Jurusan', 'Opsional, kode atau nama jurusan di sekolah tersebut.'],
  ['Nama Wali', 'Opsional, nama orang tua / wali.'],
  ['HP Wali', 'Opsional, nomor HP wali.'],
  ['Tahun Masuk', 'Wajib, tahun (mis. 2026).'],
  ['Rombel', 'Opsional, nama rombel pada tahun ajaran aktif (mis. 7A).'],
]

const HEADER_LOOKUP: Record<string, Kolom> = {
  nis: 'NIS',
  nisn: 'NISN',
  nama: 'Nama',
  'nama siswa': 'Nama',
  'nama lengkap': 'Nama',
  'l/p': 'L/P',
  jk: 'L/P',
  'jenis kelamin': 'L/P',
  'tanggal lahir': 'Tanggal Lahir',
  'tgl lahir': 'Tanggal Lahir',
  sekolah: 'Sekolah',
  'kode sekolah': 'Sekolah',
  'nama sekolah': 'Sekolah',
  jurusan: 'Jurusan',
  'kode jurusan': 'Jurusan',
  'nama wali': 'Nama Wali',
  'orang tua': 'Nama Wali',
  'nama orang tua': 'Nama Wali',
  'nama orang tua / wali': 'Nama Wali',
  'hp wali': 'HP Wali',
  'nomor hp wali': 'HP Wali',
  'no hp wali': 'HP Wali',
  'tahun masuk': 'Tahun Masuk',
  rombel: 'Rombel',
  kelas: 'Rombel',
}

function normal(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim().replace(/:$/, '')
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    const v = value as any
    if (v.richText) return v.richText.map((t: any) => t.text).join('').trim()
    if (v.text) return String(v.text).trim()
    if (v.result !== undefined) return String(v.result).trim()
    return ''
  }
  return String(value).trim()
}

function pad(n: string | number): string {
  return String(n).padStart(2, '0')
}

/** Terima YYYY-MM-DD, DD/MM/YYYY, atau tanggal Excel; kosong = null. */
function tanggalIso(raw: string): string | null {
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${pad(iso[2]!)}-${pad(iso[3]!)}`
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${pad(dmy[2]!)}-${pad(dmy[1]!)}`
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return null
}

function jenisKelamin(raw: string): 'L' | 'P' | null {
  const v = raw.toLowerCase()
  if (['l', 'laki-laki', 'laki laki', 'pria', 'male'].includes(v)) return 'L'
  if (['p', 'perempuan', 'wanita', 'female'].includes(v)) return 'P'
  return null
}

function tahunSekarang(): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric' }).format(new Date()))
}

function pesanError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/duplicate key|unique/i.test(message)) return 'NIS atau NISN sudah dipakai siswa lain.'
  return message.split('\n')[0] ?? 'Gagal menyimpan baris ini.'
}

function xlsxResponse(event: H3Event, buffer: unknown, filename: string) {
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function handleTemplateImporSiswa(event: H3Event) {
  await requireStaff(event)
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Siswa')
  ws.columns = KOLOM.map((k) => ({ header: k, key: k, width: Math.max(16, k.length + 4) }))
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const petunjuk = wb.addWorksheet('Petunjuk')
  petunjuk.columns = [
    { header: 'Kolom', key: 'kolom', width: 20 },
    { header: 'Keterangan', key: 'keterangan', width: 80 },
  ]
  petunjuk.getRow(1).font = { bold: true }
  for (const [kolom, keterangan] of PETUNJUK) petunjuk.addRow({ kolom, keterangan })
  petunjuk.addRow({})
  petunjuk.addRow({ kolom: 'Catatan', keterangan: 'Baris pertama lembar "Siswa" adalah judul kolom; jangan diubah. Hapus baris contoh sebelum mengunggah.' })

  return xlsxResponse(event, await wb.xlsx.writeBuffer(), 'template-impor-siswa.xlsx')
}

export async function handleImporSiswa(event: H3Event) {
  const user = await requireStaff(event)
  const db = useDb()

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.filename && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Berkas Excel belum dipilih.' })
  // shortcut: satu berkas maksimal 4 MB / 2000 baris; pecah berkas bila datanya lebih besar.
  if (file.data.length > 4 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Berkas terlalu besar (maksimal 4 MB).' })
  }

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(file.data as any)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Berkas tidak dapat dibaca. Gunakan template Excel (.xlsx).' })
  }

  const ws = wb.getWorksheet('Siswa') ?? wb.worksheets[0]
  if (!ws) throw createError({ statusCode: 400, statusMessage: 'Berkas tidak memuat lembar data.' })

  const petaKolom = new Map<number, Kolom>()
  ws.getRow(1).eachCell((cell, col) => {
    const found = HEADER_LOOKUP[normal(cellText(cell.value))]
    if (found) petaKolom.set(col, found)
  })
  if (![...petaKolom.values()].includes('NIS')) {
    throw createError({ statusCode: 400, statusMessage: 'Kolom NIS tidak ditemukan. Unduh template impor terbaru.' })
  }

  const [sekolahRows, jurusanRows, taAktifRows, semuaSiswa] = await Promise.all([
    db.select({ id: sekolah.id, kode: sekolah.kode, nama: sekolah.nama }).from(sekolah),
    db.select({ id: jurusan.id, kode: jurusan.kode, nama: jurusan.nama, sekolahId: jurusan.sekolahId }).from(jurusan),
    db.select({ id: tahunAjaran.id }).from(tahunAjaran).where(eq(tahunAjaran.isAktif, true)).limit(1),
    db.select({ nis: siswa.nis, nisn: siswa.nisn }).from(siswa),
  ])
  const taAktifId = taAktifRows[0]?.id ?? null
  const rombelAktif = taAktifId
    ? await db
        .select({ id: rombel.id, nama: rombel.nama, sekolahId: rombel.sekolahId })
        .from(rombel)
        .where(eq(rombel.tahunAjaranId, taAktifId))
    : []

  const sekolahByKey = new Map<string, (typeof sekolahRows)[number]>()
  for (const s of sekolahRows) {
    sekolahByKey.set(normal(s.kode), s)
    sekolahByKey.set(normal(s.nama), s)
  }
  const jurusanByKey = new Map<string, (typeof jurusanRows)[number]>()
  for (const j of jurusanRows) {
    jurusanByKey.set(`${j.sekolahId}|${normal(j.kode)}`, j)
    jurusanByKey.set(`${j.sekolahId}|${normal(j.nama)}`, j)
  }
  const rombelByKey = new Map<string, (typeof rombelAktif)[number]>()
  for (const r of rombelAktif) {
    rombelByKey.set(`${r.sekolahId}|${normal(r.nama)}`, r)
    rombelByKey.set(`${r.sekolahId}|${normal(r.nama.replace(/^\d+\s*/, ''))}`, r)
  }

  const nisTerpakai = new Set(semuaSiswa.map((s) => s.nis.toLowerCase()))
  const nisnTerpakai = new Set(semuaSiswa.map((s) => s.nisn?.toLowerCase()).filter(Boolean) as string[])

  const gagal: Array<{ baris: number; pesan: string }> = []
  let berhasil = 0
  let total = 0
  const batasBaris = Math.min(ws.rowCount, 2001)

  for (let r = 2; r <= batasBaris; r++) {
    const row = ws.getRow(r)
    const nilai = {} as Record<Kolom, string>
    for (const [col, key] of petaKolom) nilai[key] = cellText(row.getCell(col).value)

    if (!Object.values(nilai).some((v) => v)) continue
    total++

    const pesan: string[] = []
    const nis = nilai.NIS ?? ''
    const nama = nilai.Nama ?? ''
    if (!nis) pesan.push('NIS wajib diisi.')
    else if (nisTerpakai.has(nis.toLowerCase())) pesan.push(`NIS ${nis} sudah terdaftar.`)
    if (!nama) pesan.push('Nama wajib diisi.')

    const jk = jenisKelamin(nilai['L/P'] ?? '')
    if (!jk) pesan.push('Jenis kelamin harus L atau P.')

    const sk = sekolahByKey.get(normal(nilai.Sekolah ?? ''))
    if (!sk) pesan.push('Sekolah tidak ditemukan.')

    let jurusanId: string | null = null
    if (nilai.Jurusan && sk) {
      const jr = jurusanByKey.get(`${sk.id}|${normal(nilai.Jurusan)}`)
      if (!jr) pesan.push('Jurusan tidak ditemukan di sekolah tersebut.')
      else jurusanId = jr.id
    }

    const nisn = nilai.NISN || null
    if (nisn) {
      if (nisnTerpakai.has(nisn.toLowerCase())) pesan.push(`NISN ${nisn} sudah terdaftar.`)
    }

    let tanggalLahir: string | null = null
    if (nilai['Tanggal Lahir']) {
      tanggalLahir = tanggalIso(nilai['Tanggal Lahir'])
      if (!tanggalLahir) pesan.push('Tanggal lahir tidak dikenali (pakai YYYY-MM-DD).')
    }

    const tahunMasuk = Number(nilai['Tahun Masuk'] || tahunSekarang())
    if (!Number.isInteger(tahunMasuk) || tahunMasuk < 1900 || tahunMasuk > 2100) {
      pesan.push('Tahun masuk tidak valid.')
    }

    let rombelId: string | null = null
    if (nilai.Rombel && sk) {
      const rb = rombelByKey.get(`${sk.id}|${normal(nilai.Rombel)}`)
      if (!rb) pesan.push(`Rombel "${nilai.Rombel}" tidak ada di tahun ajaran aktif.`)
      else rombelId = rb.id
    }

    if (pesan.length || !sk || !jk) {
      gagal.push({ baris: r, pesan: pesan.join(' ') })
      continue
    }

    try {
      const inserted = await db
        .insert(siswa)
        .values({
          nis,
          nisn,
          nama,
          jenisKelamin: jk,
          tanggalLahir,
          sekolahId: sk.id,
          jurusanId,
          namaWali: nilai['Nama Wali'] || null,
          noHpWali: nilai['HP Wali'] || null,
          tahunMasuk,
          status: 'aktif',
        } as never)
        .returning({ id: siswa.id })
      const created = inserted[0]!

      if (rombelId && taAktifId) {
        await db.insert(siswaRombel).values({ siswaId: created.id, rombelId, tahunAjaranId: taAktifId })
      }

      nisTerpakai.add(nis.toLowerCase())
      if (nisn) nisnTerpakai.add(nisn.toLowerCase())
      berhasil++
    } catch (error) {
      gagal.push({ baris: r, pesan: pesanError(error) })
    }
  }

  await writeAudit({
    penggunaId: user.id,
    aksi: 'siswa.impor',
    entitas: 'siswa',
    sesudah: { berkas: file.filename, total, berhasil, gagal: gagal.length },
    event,
  })

  return { total, berhasil, gagal }
}
