import { asc, eq } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { requireStaff } from '../utils/auth-guard'
import {
  jenisPembayaran,
  jurusan,
  rombel,
  sekolah,
  tahunAjaran,
  user,
} from '../database/schema'

/** Daftar pilihan untuk select di halaman staf. */
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const db = useDb()

  const [sekolahRows, tahunRows, jurusanRows, rombelRows, jenisRows, waliRows] = await Promise.all([
    db.select({ id: sekolah.id, kode: sekolah.kode, nama: sekolah.nama, jenjang: sekolah.jenjang, aktif: sekolah.aktif })
      .from(sekolah).orderBy(asc(sekolah.jenjang), asc(sekolah.nama)),
    db.select({ id: tahunAjaran.id, nama: tahunAjaran.nama, isAktif: tahunAjaran.isAktif })
      .from(tahunAjaran).orderBy(asc(tahunAjaran.nama)),
    db.select({ id: jurusan.id, kode: jurusan.kode, nama: jurusan.nama, sekolahId: jurusan.sekolahId, aktif: jurusan.aktif })
      .from(jurusan).orderBy(asc(jurusan.nama)),
    db.select({
      id: rombel.id, nama: rombel.nama, tingkat: rombel.tingkat, sekolahId: rombel.sekolahId,
      tahunAjaranId: rombel.tahunAjaranId, jurusanId: rombel.jurusanId, waliKelasUserId: rombel.waliKelasUserId,
    }).from(rombel).orderBy(asc(rombel.tingkat), asc(rombel.nama)),
    db.select({ id: jenisPembayaran.id, kode: jenisPembayaran.kode, nama: jenisPembayaran.nama, aktif: jenisPembayaran.aktif })
      .from(jenisPembayaran).orderBy(asc(jenisPembayaran.nama)),
    db.select({ id: user.id, name: user.name, username: user.username })
      .from(user).where(eq(user.role, 'wali_kelas')).orderBy(asc(user.name)),
  ])

  return {
    sekolah: sekolahRows,
    tahunAjaran: tahunRows,
    jurusan: jurusanRows,
    rombel: rombelRows,
    jenisPembayaran: jenisRows,
    waliKelas: waliRows,
  }
})
