import { pgEnum } from 'drizzle-orm/pg-core'

export const jenjangEnum = pgEnum('jenjang', ['SMP', 'SMK'])
export const jenisKelaminEnum = pgEnum('jenis_kelamin', ['L', 'P'])
export const statusSiswaEnum = pgEnum('status_siswa', ['aktif', 'lulus', 'pindah', 'keluar'])
export const polaPenagihanEnum = pgEnum('pola_penagihan', [
  'bulanan',
  'sekali_bayar',
  'tahunan',
  'cicilan',
  'paket',
])
export const statusTagihanEnum = pgEnum('status_tagihan', [
  'belum_bayar',
  'sebagian',
  'lunas',
  'dibatalkan',
])
export const metodeBayarEnum = pgEnum('metode_bayar', ['tunai', 'transfer'])
export const statusPembayaranEnum = pgEnum('status_pembayaran', ['aktif', 'batal'])
export const tipeMutasiSaldoEnum = pgEnum('tipe_mutasi_saldo', ['masuk', 'keluar'])
