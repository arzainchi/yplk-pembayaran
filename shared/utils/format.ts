// Util format bersama (dipakai app & server). Zona waktu WITA (Asia/Makassar).

const TZ = 'Asia/Makassar'

type DateInput = string | number | Date | null | undefined

function toDate(value: Exclude<DateInput, null | undefined>): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatRupiah(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0))
  return `Rp${new Intl.NumberFormat('id-ID').format(n)}`
}

export function formatAngka(value: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID').format(Number(value ?? 0))
}

export function formatTanggal(value: DateInput): string {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  }).format(toDate(value))
}

export function formatTanggalJam(value: DateInput): string {
  if (value === null || value === undefined || value === '') return '—'
  const d = toDate(value)
  const tanggal = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  }).format(d)
  const jam = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).format(d)
  return `${tanggal}, ${jam}`
}

const ANGKA = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas',
]

function terbilangRec(n: number): string {
  if (n < 12) return ANGKA[n]!
  if (n < 20) return `${terbilangRec(n - 10)} belas`
  if (n < 100) {
    const sisa = n % 10
    return `${terbilangRec(Math.floor(n / 10))} puluh${sisa ? ` ${terbilangRec(sisa)}` : ''}`
  }
  if (n < 200) return `seratus${n % 100 ? ` ${terbilangRec(n % 100)}` : ''}`
  if (n < 1000) {
    const sisa = n % 100
    return `${terbilangRec(Math.floor(n / 100))} ratus${sisa ? ` ${terbilangRec(sisa)}` : ''}`
  }
  if (n < 2000) return `seribu${n % 1000 ? ` ${terbilangRec(n % 1000)}` : ''}`
  if (n < 1000000) {
    const sisa = n % 1000
    return `${terbilangRec(Math.floor(n / 1000))} ribu${sisa ? ` ${terbilangRec(sisa)}` : ''}`
  }
  if (n < 1000000000) {
    const sisa = n % 1000000
    return `${terbilangRec(Math.floor(n / 1000000))} juta${sisa ? ` ${terbilangRec(sisa)}` : ''}`
  }
  if (n < 1000000000000) {
    const sisa = n % 1000000000
    return `${terbilangRec(Math.floor(n / 1000000000))} miliar${sisa ? ` ${terbilangRec(sisa)}` : ''}`
  }
  const sisa = n % 1000000000000
  return `${terbilangRec(Math.floor(n / 1000000000000))} triliun${sisa ? ` ${terbilangRec(sisa)}` : ''}`
}

/** Angka menjadi kata dalam bahasa Indonesia, mis. 1500000 → "satu juta lima ratus ribu rupiah". */
export function terbilang(value: number | null | undefined): string {
  const n = Math.floor(Math.abs(Number(value ?? 0)))
  if (n === 0) return 'nol rupiah'
  return `${terbilangRec(n).replace(/\s+/g, ' ').trim()} rupiah`
}

export interface StatusMeta {
  label: string
  color: 'success' | 'info' | 'warning' | 'error' | 'neutral'
  icon: string
}

export const STATUS_TAGIHAN: Record<string, StatusMeta> = {
  lunas: { label: 'Lunas', color: 'success', icon: 'lucide:circle-check' },
  sebagian: { label: 'Sebagian', color: 'info', icon: 'lucide:circle-dashed' },
  belum_bayar: { label: 'Belum Bayar', color: 'warning', icon: 'lucide:clock' },
  dibatalkan: { label: 'Dibatalkan', color: 'error', icon: 'lucide:ban' },
}

export const STATUS_PEMBAYARAN: Record<string, StatusMeta> = {
  aktif: { label: 'Aktif', color: 'success', icon: 'lucide:circle-check' },
  batal: { label: 'Batal', color: 'error', icon: 'lucide:ban' },
}

export const STATUS_SISWA: Record<string, StatusMeta> = {
  aktif: { label: 'Aktif', color: 'success', icon: 'lucide:user-check' },
  lulus: { label: 'Lulus', color: 'info', icon: 'lucide:graduation-cap' },
  pindah: { label: 'Pindah', color: 'warning', icon: 'lucide:log-out' },
  keluar: { label: 'Keluar', color: 'error', icon: 'lucide:user-x' },
}

export function statusTagihan(status: string): StatusMeta {
  return STATUS_TAGIHAN[status] ?? { label: status, color: 'neutral', icon: 'lucide:circle-help' }
}
export function statusPembayaran(status: string): StatusMeta {
  return STATUS_PEMBAYARAN[status] ?? { label: status, color: 'neutral', icon: 'lucide:circle-help' }
}
export function statusSiswa(status: string): StatusMeta {
  return STATUS_SISWA[status] ?? { label: status, color: 'neutral', icon: 'lucide:circle-help' }
}

export const POLA_PENAGIHAN: Record<string, string> = {
  bulanan: 'Bulanan',
  sekali_bayar: 'Sekali Bayar',
  tahunan: 'Tahunan',
  cicilan: 'Cicilan',
  paket: 'Paket',
}

export const METODE_BAYAR: Record<string, string> = {
  tunai: 'Tunai',
  transfer: 'Transfer',
}

const NAMA_BULAN = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function namaBulan(bulan: number | null | undefined): string {
  return NAMA_BULAN[bulan ?? 0] ?? ''
}

export function tingkatLabel(tingkat: number | null | undefined): string {
  return tingkat ? `Kelas ${tingkat}` : '—'
}

/** Label rombel tanpa mengulang tingkat bila nama rombel sudah memuatnya. */
export function rombelLabel(tingkat: number | null | undefined, nama: string | null | undefined): string {
  const t = tingkat ? String(tingkat) : ''
  const n = (nama ?? '').trim()
  if (!n && !t) return '—'
  if (!n) return `Kelas ${t}`
  if (t && n.startsWith(t)) return `Kelas ${n}`
  return t ? `Kelas ${t} ${n}` : `Kelas ${n}`
}

export function semesterLabel(semester: string | null | undefined): string {
  if (semester === 'ganjil') return 'Semester Ganjil'
  if (semester === 'genap') return 'Semester Genap'
  return semester ?? '—'
}

export function periodeLabel(periodeKe: number | null | undefined): string {
  return periodeKe ? namaBulan(periodeKe) : '—'
}

export function peranLabel(role: string | null | undefined): string {
  if (role === 'keuangan_pengurus') return 'Staf Keuangan / Pengurus'
  if (role === 'wali_kelas') return 'Wali Kelas'
  return 'Pengguna'
}

export function jenisKelaminLabel(jenis: string | null | undefined): string {
  if (jenis === 'L') return 'Laki-laki'
  if (jenis === 'P') return 'Perempuan'
  return '—'
}
