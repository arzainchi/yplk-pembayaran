import { sql } from 'drizzle-orm'

function witaParts(date: Date): { tahun: number; bulan: number } {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const [year, month] = formatted.split('-')
  return { tahun: Number(year), bulan: Number(month) }
}

/**
 * Nomor kuitansi unik dan berurutan: KW/{KODE_SEKOLAH}/{TAHUN}/{BULAN}/{URUT}.
 * Aman terhadap input bersamaan lewat upsert atomik (FR-KWT-01, aturan §10).
 */
export async function nextNomorKuitansi(
  tx: any,
  sekolahId: string,
  kodeSekolah: string,
  tanggal: Date,
): Promise<string> {
  const { tahun, bulan } = witaParts(tanggal)
  const result = await tx.execute(sql`
    INSERT INTO nomor_urut_kuitansi (sekolah_id, tahun, bulan, urutan_terakhir)
    VALUES (${sekolahId}, ${tahun}, ${bulan}, 1)
    ON CONFLICT (sekolah_id, tahun, bulan)
    DO UPDATE SET urutan_terakhir = nomor_urut_kuitansi.urutan_terakhir + 1, updated_at = now()
    RETURNING urutan_terakhir
  `)
  const urutan = Number((result as any[])[0]?.urutan_terakhir ?? 1)
  return `KW/${kodeSekolah}/${tahun}/${String(bulan).padStart(2, '0')}/${String(urutan).padStart(4, '0')}`
}
