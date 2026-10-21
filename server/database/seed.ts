import { eq, sql } from 'drizzle-orm'

try {
  process.loadEnvFile()
} catch {
  // .env opsional
}

// Pseudo-random deterministik agar seed dapat diulang.
let seedState = 20261021
function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

const NAMA_DEPAN = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hana', 'Indra', 'Jihan',
  'Kurnia', 'Lestari', 'Muhammad', 'Nadia', 'Oktavianus', 'Putri', 'Rizky', 'Sari',
  'Taufik', 'Umi', 'Vina', 'Wahyu', 'Yusuf', 'Zahra', 'Arif', 'Bella', 'Cahyo', 'Dinda',
]
const NAMA_BELAKANG = [
  'Pratama', 'Saputra', 'Wijaya', 'Anugrah', 'Maulana', 'Ramadhan', 'Hidayat', 'Nugroho',
  'Puspita', 'Sari', 'Utami', 'Kusuma', 'Firmansyah', 'Anggara', 'Sabrina', 'Wulandari',
]

async function main() {
  const { auth } = await import('../utils/auth')
  const { useDb } = await import('../utils/db')
  const s = await import('../database/schema')
  const db = useDb()

  console.log('Membersihkan data lama…')
  await db.execute(sql`
    TRUNCATE TABLE
      pembayaran_detail, saldo_siswa_mutasi, pembayaran, tagihan,
      siswa_rombel, siswa, rombel, tarif_jurusan, tarif, jurusan,
      jenis_pembayaran, tahun_ajaran, sekolah, nomor_urut_kuitansi, audit_log,
      session, account, verification, "user"
    RESTART IDENTITY CASCADE
  `)

  // ---------- Akun ----------
  async function buatAkun(username: string, password: string, nama: string, role: string) {
    const email = `${username}@yplk.local`
    const res = await auth.api.signUpEmail({ body: { email, password, name: nama, username } })
    await db
      .update(s.user)
      .set({ role, displayUsername: username, username, banned: false })
      .where(eq(s.user.id, res.user.id))
    return res.user.id
  }

  console.log('Membuat akun…')
  const adminId = await buatAkun('admin', 'admin123', 'Petugas Keuangan YPLK', 'keuangan_pengurus')
  const waliId = await buatAkun('walikelas', 'walikelas123', 'Wali Kelas SMP 7A', 'wali_kelas')
  const waliId2 = await buatAkun('walikelas2', 'walikelas123', 'Wali Kelas SMK 10 GP', 'wali_kelas')

  // ---------- Sekolah ----------
  const [smp, smk] = await db
    .insert(s.sekolah)
    .values([
      { kode: 'SMP-TT', nama: 'SMP Teknologi Tenggarong', jenjang: 'SMP', alamat: 'Jl. Pendidikan No. 1, Tenggarong' },
      { kode: 'SMK-GP', nama: 'SMK Geologi Pertambangan Tenggarong', jenjang: 'SMK', alamat: 'Jl. Pertambangan No. 2, Tenggarong' },
    ])
    .returning()
  if (!smp || !smk) throw new Error('Gagal membuat sekolah')

  // ---------- Jurusan ----------
  const [jurGp, jurTkj] = await db
    .insert(s.jurusan)
    .values([
      { sekolahId: smk.id, kode: 'GP', nama: 'Geologi Pertambangan' },
      { sekolahId: smk.id, kode: 'TKJ', nama: 'Teknik Komputer dan Jaringan' },
    ])
    .returning()
  if (!jurGp || !jurTkj) throw new Error('Gagal membuat jurusan')

  // ---------- Tahun ajaran ----------
  const [taLalu, taAktif] = await db
    .insert(s.tahunAjaran)
    .values([
      { nama: '2025/2026', tanggalMulai: '2025-07-14', tanggalSelesai: '2026-06-20', isAktif: false },
      { nama: '2026/2027', tanggalMulai: '2026-07-13', tanggalSelesai: '2027-06-19', isAktif: true },
    ])
    .returning()
  if (!taAktif || !taLalu) throw new Error('Gagal membuat tahun ajaran')

  // ---------- Jenis pembayaran ----------
  const jenis = await db
    .insert(s.jenisPembayaran)
    .values([
      { kode: 'SPP', nama: 'SPP' },
      { kode: 'PARTISIPASI', nama: 'Partisipasi' },
      { kode: 'PRAKTEK', nama: 'Praktek' },
      { kode: 'SERAGAM', nama: 'Seragam' },
      { kode: 'ASURANSI', nama: 'Asuransi' },
      { kode: 'ASURANSI-PAKET', nama: 'Asuransi Paket' },
      { kode: 'PRAKERIN', nama: 'Prakerin' },
      { kode: 'UJIKOM', nama: 'Ujikom' },
      { kode: 'PERPISAHAN', nama: 'Perpisahan' },
      { kode: 'FOTO', nama: 'Foto' },
    ])
    .returning()
  const jById = Object.fromEntries(jenis.map((x) => [x.kode, x]))
  const jId = (kode: string) => jById[kode]!.id

  // ---------- Rombel ----------
  const rombelValues: Array<typeof s.rombel.$inferInsert> = [
    { sekolahId: smp.id, tahunAjaranId: taAktif.id, jurusanId: null, tingkat: 7, nama: '7A', waliKelasUserId: waliId },
    { sekolahId: smp.id, tahunAjaranId: taAktif.id, jurusanId: null, tingkat: 8, nama: '8A', waliKelasUserId: null },
    { sekolahId: smp.id, tahunAjaranId: taAktif.id, jurusanId: null, tingkat: 9, nama: '9A', waliKelasUserId: null },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jurusanId: jurGp.id, tingkat: 10, nama: '10 GP', waliKelasUserId: waliId2 },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jurusanId: jurTkj.id, tingkat: 10, nama: '10 TKJ', waliKelasUserId: null },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jurusanId: jurGp.id, tingkat: 11, nama: '11 GP', waliKelasUserId: null },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jurusanId: jurTkj.id, tingkat: 11, nama: '11 TKJ', waliKelasUserId: null },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jurusanId: jurGp.id, tingkat: 12, nama: '12 GP', waliKelasUserId: null },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jurusanId: jurTkj.id, tingkat: 12, nama: '12 TKJ', waliKelasUserId: null },
  ]
  const rombel = await db.insert(s.rombel).values(rombelValues).returning()

  // ---------- Tarif ----------
  const tarifValues: Array<typeof s.tarif.$inferInsert> = []
  for (const tingkat of [7, 8, 9]) {
    for (const semester of ['ganjil', 'genap']) {
      tarifValues.push({
        sekolahId: smp.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('SPP'),
        tingkat, semester, nominal: 250000, polaPenagihan: 'bulanan', keterangan: 'SPP bulanan SMP',
      })
    }
  }
  for (const tingkat of [10, 11, 12]) {
    for (const semester of ['ganjil', 'genap']) {
      tarifValues.push({
        sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('SPP'),
        tingkat, semester, nominal: 300000, polaPenagihan: 'bulanan', keterangan: 'SPP bulanan SMK',
      })
    }
  }
  tarifValues.push(
    { sekolahId: smp.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('SERAGAM'), tingkat: 7, nominal: 400000, polaPenagihan: 'sekali_bayar' },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('SERAGAM'), tingkat: 10, nominal: 450000, polaPenagihan: 'sekali_bayar' },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('PARTISIPASI'), tingkat: 10, nominal: 3000000, polaPenagihan: 'cicilan', keterangan: 'Partisipasi kelas 10, dibayar bertahap' },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('PRAKTEK'), tingkat: 11, nominal: 600000, polaPenagihan: 'tahunan' },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('ASURANSI'), tingkat: 10, nominal: 100000, polaPenagihan: 'tahunan' },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('ASURANSI-PAKET'), tingkat: 10, nominal: 150000, polaPenagihan: 'paket', keterangan: 'Asuransi paket 3 tahun' },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('UJIKOM'), tingkat: 12, nominal: 500000, polaPenagihan: 'sekali_bayar' },
    { sekolahId: smk.id, tahunAjaranId: taAktif.id, jenisPembayaranId: jId('PERPISAHAN'), tingkat: 12, nominal: 350000, polaPenagihan: 'sekali_bayar' },
  )
  const tarif = await db.insert(s.tarif).values(tarifValues).returning()
  const tarifByJenisTingkat = (sekolahId: string, tingkat: number, kode: string, semester?: string) =>
    tarif.find(
      (t) => t.sekolahId === sekolahId && t.tingkat === tingkat && t.jenisPembayaranId === jId(kode)
        && (semester ? t.semester === semester : true),
    )

  const tarifPraktek = tarifByJenisTingkat(smk.id, 11, 'PRAKTEK')
  if (tarifPraktek) {
    await db.insert(s.tarifJurusan).values({ tarifId: tarifPraktek.id, jurusanId: jurGp.id, isExclude: false })
  }
  const tarifAsuransiPaket = tarifByJenisTingkat(smk.id, 10, 'ASURANSI-PAKET')
  if (tarifAsuransiPaket) {
    await db.insert(s.tarifJurusan).values({ tarifId: tarifAsuransiPaket.id, jurusanId: jurTkj.id, isExclude: true })
  }

  // ---------- Siswa + penempatan ----------
  const siswaValues: Array<typeof s.siswa.$inferInsert> = []
  const placement: Array<{ key: string; rombelId: string; tingkat: number; sekolahId: string }> = []
  let nisCounter = 20260001

  for (const rb of rombel) {
    const jumlah = rb.sekolahId === smp.id ? 6 : 7
    for (let i = 0; i < jumlah; i++) {
      const nis = `S${nisCounter}`
      siswaValues.push({
        nis,
        nisn: String(randInt(3000000000, 3999999999)),
        nama: `${pick(NAMA_DEPAN)} ${pick(NAMA_BELAKANG)}`,
        jenisKelamin: rand() > 0.5 ? 'L' : 'P',
        tanggalLahir: `${randInt(2008, 2013)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
        sekolahId: rb.sekolahId,
        jurusanId: rb.jurusanId,
        namaWali: `${pick(NAMA_DEPAN)} ${pick(NAMA_BELAKANG)}`,
        noHpWali: `08${randInt(1000000000, 9999999999)}`,
        tahunMasuk: 2026 - (rb.tingkat - 7) - (rb.sekolahId === smk.id ? 3 : 0),
        status: 'aktif',
      })
      placement.push({ key: nis, rombelId: rb.id, tingkat: rb.tingkat, sekolahId: rb.sekolahId })
      nisCounter++
    }
  }

  const siswa = await db.insert(s.siswa).values(siswaValues).returning()
  const siswaByNis = Object.fromEntries(siswa.map((x) => [x.nis, x]))

  await db.insert(s.siswaRombel).values(
    placement.map((p) => ({ siswaId: siswaByNis[p.key]!.id, rombelId: p.rombelId, tahunAjaranId: taAktif.id })),
  )

  // ---------- Tagihan ----------
  console.log('Menerbitkan tagihan…')
  const tagihanValues: Array<typeof s.tagihan.$inferInsert> = []
  for (const p of placement) {
    const siswaId = siswaByNis[p.key]!.id
    const spp = tarifByJenisTingkat(p.sekolahId, p.tingkat, 'SPP', 'ganjil')
    if (spp) {
      for (const bulan of [7, 8, 9, 10, 11, 12]) {
        tagihanValues.push({
          siswaId, tarifId: spp.id, tahunAjaranId: taAktif.id, tingkat: p.tingkat,
          periodeKe: bulan, nominalTagihan: spp.nominal, status: 'belum_bayar',
        })
      }
    }
    const tambahan: Array<[string, string]> = [
      ['SERAGAM', 'Seragam sekolah'],
      ['PARTISIPASI', 'Partisipasi kelas 10'],
      ['UJIKOM', 'Ujikom kelas 12'],
    ]
    for (const [kode, keterangan] of tambahan) {
      const t = tarifByJenisTingkat(p.sekolahId, p.tingkat, kode)
      if (t) {
        tagihanValues.push({
          siswaId, tarifId: t.id, tahunAjaranId: taAktif.id, tingkat: p.tingkat,
          periodeKe: null, nominalTagihan: t.nominal, status: 'belum_bayar', keterangan,
        })
      }
    }
  }

  const tagihan = await db.insert(s.tagihan).values(tagihanValues).returning()
  const tagihanBySiswa = new Map<string, typeof tagihan>()
  for (const t of tagihan) {
    const list = tagihanBySiswa.get(t.siswaId) ?? []
    list.push(t)
    tagihanBySiswa.set(t.siswaId, list)
  }

  // ---------- Pembayaran ----------
  console.log('Mencatat pembayaran…')
  const counters = new Map<string, number>()
  function nextKuitansi(sekolahId: string, tahun: number, bulan: number): string {
    const key = `${sekolahId}|${tahun}|${bulan}`
    const next = (counters.get(key) ?? 0) + 1
    counters.set(key, next)
    const kode = sekolahId === smp.id ? 'SMP-TT' : 'SMK-GP'
    return `KW/${kode}/${tahun}/${String(bulan).padStart(2, '0')}/${String(next).padStart(4, '0')}`
  }

  let paidCount = 0
  for (const sw of siswa) {
    const list = (tagihanBySiswa.get(sw.id) ?? [])
      .slice()
      .sort((a, b) => (a.periodeKe ?? 0) - (b.periodeKe ?? 0))
    if (list.length === 0) continue
    if (rand() > 0.65) continue

    const dipilih = list.slice(0, randInt(1, Math.min(4, list.length)))
    const bulan = randInt(7, 12)
    const isTransfer = rand() > 0.7
    const total = dipilih.reduce((acc, t) => acc + t.nominalTagihan, 0)

    const [bayar] = await db
      .insert(s.pembayaran)
      .values({
        nomorKuitansi: nextKuitansi(sw.sekolahId, 2026, bulan),
        siswaId: sw.id,
        tanggalBayar: new Date(Date.UTC(2026, bulan - 1, randInt(1, 28), randInt(1, 8))),
        metode: isTransfer ? 'transfer' : 'tunai',
        nomorReferensi: isTransfer ? `TRF-${randInt(100000, 999999)}` : null,
        totalBayar: total,
        petugasId: adminId,
        status: 'aktif',
      })
      .returning()
    if (!bayar) throw new Error('Gagal membuat pembayaran')

    for (const t of dipilih) {
      await db.insert(s.pembayaranDetail).values({
        pembayaranId: bayar.id, tagihanId: t.id, nominalDialokasikan: t.nominalTagihan,
      })
      await db.update(s.tagihan).set({ totalTerbayar: t.nominalTagihan, status: 'lunas' }).where(eq(s.tagihan.id, t.id))
    }
    await db.insert(s.auditLog).values({
      penggunaId: adminId, aksi: 'pembayaran.create', entitas: 'pembayaran', entitasId: bayar.id,
      dataSesudah: { nomorKuitansi: bayar.nomorKuitansi, total },
    })
    paidCount++
  }

  // Siswa dengan kelebihan bayar → saldo
  const saldoSiswa = siswa.find((x) => (tagihanBySiswa.get(x.id) ?? []).length > 0)
  if (saldoSiswa) {
    const target = (tagihanBySiswa.get(saldoSiswa.id) ?? [])
      .slice()
      .sort((a, b) => (a.periodeKe ?? 0) - (b.periodeKe ?? 0))[0]!
    const total = target.nominalTagihan + 50000
    const [bayar] = await db
      .insert(s.pembayaran)
      .values({
        nomorKuitansi: nextKuitansi(saldoSiswa.sekolahId, 2026, 10),
        siswaId: saldoSiswa.id,
        tanggalBayar: new Date(Date.UTC(2026, 9, 15, 3)),
        metode: 'tunai',
        totalBayar: total,
        kelebihanKeSaldo: 50000,
        petugasId: adminId,
        status: 'aktif',
      })
      .returning()
    if (bayar) {
      await db.insert(s.pembayaranDetail).values({
        pembayaranId: bayar.id, tagihanId: target.id, nominalDialokasikan: target.nominalTagihan,
      })
      await db.update(s.tagihan).set({ totalTerbayar: target.nominalTagihan, status: 'lunas' }).where(eq(s.tagihan.id, target.id))
      await db.insert(s.saldoSiswaMutasi).values({
        siswaId: saldoSiswa.id, tipe: 'masuk', nominal: 50000, pembayaranId: bayar.id,
        keterangan: 'Kelebihan pembayaran',
      })
    }
  }

  // ---------- Nomor urut kuitansi ----------
  for (const [key, urutan] of counters) {
    const [sekolahId, tahunStr, bulanStr] = key.split('|')
    await db.insert(s.nomorUrutKuitansi).values({
      sekolahId: sekolahId!, tahun: Number(tahunStr), bulan: Number(bulanStr), urutanTerakhir: urutan,
    })
  }

  console.log('\nSeed selesai:')
  console.log('  Sekolah    : 2')
  console.log(`  Rombel     : ${rombel.length}`)
  console.log(`  Siswa      : ${siswa.length}`)
  console.log(`  Tarif      : ${tarif.length}`)
  console.log(`  Tagihan    : ${tagihan.length}`)
  console.log(`  Pembayaran : ${paidCount + (saldoSiswa ? 1 : 0)}`)
  console.log('\nAkun:')
  console.log('  admin      / admin123       (Staf Keuangan / Pengurus)')
  console.log('  walikelas  / walikelas123   (Wali Kelas SMP 7A)')
  console.log('  walikelas2 / walikelas123   (Wali Kelas SMK 10 GP)')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
