import {
  pgTable,
  text,
  uuid,
  integer,
  bigint,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { siswa, tarif, tahunAjaran, sekolah } from './master'
import {
  statusTagihanEnum,
  metodeBayarEnum,
  statusPembayaranEnum,
  tipeMutasiSaldoEnum,
} from './enums'

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}

export const tagihan = pgTable(
  'tagihan',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siswaId: uuid('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    tarifId: uuid('tarif_id').references(() => tarif.id, { onDelete: 'set null' }),
    tahunAjaranId: uuid('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'restrict' }),
    tingkat: integer('tingkat').notNull(),
    periodeKe: integer('periode_ke'),
    jatuhTempo: date('jatuh_tempo', { mode: 'string' }),
    nominalTagihan: bigint('nominal_tagihan', { mode: 'number' }).notNull(),
    totalTerbayar: bigint('total_terbayar', { mode: 'number' }).notNull().default(0),
    status: statusTagihanEnum('status').notNull().default('belum_bayar'),
    keterangan: text('keterangan'),
    ...timestamps,
  },
  (t) => [
    index('tagihan_siswa_status_idx').on(t.siswaId, t.status),
    index('tagihan_tarif_idx').on(t.tarifId),
  ],
)

export const pembayaran = pgTable(
  'pembayaran',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nomorKuitansi: text('nomor_kuitansi').notNull().unique(),
    siswaId: uuid('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'restrict' }),
    tanggalBayar: timestamp('tanggal_bayar').notNull().defaultNow(),
    metode: metodeBayarEnum('metode').notNull(),
    nomorReferensi: text('nomor_referensi'),
    totalBayar: bigint('total_bayar', { mode: 'number' }).notNull(),
    kelebihanKeSaldo: bigint('kelebihan_ke_saldo', { mode: 'number' }).notNull().default(0),
    petugasId: text('petugas_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    status: statusPembayaranEnum('status').notNull().default('aktif'),
    alasanBatal: text('alasan_batal'),
    dibatalkanAt: timestamp('dibatalkan_at'),
    ...timestamps,
  },
  (t) => [
    index('pembayaran_siswa_idx').on(t.siswaId),
    index('pembayaran_tanggal_idx').on(t.tanggalBayar),
  ],
)

export const pembayaranDetail = pgTable(
  'pembayaran_detail',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pembayaranId: uuid('pembayaran_id')
      .notNull()
      .references(() => pembayaran.id, { onDelete: 'cascade' }),
    tagihanId: uuid('tagihan_id')
      .notNull()
      .references(() => tagihan.id, { onDelete: 'restrict' }),
    nominalDialokasikan: bigint('nominal_dialokasikan', { mode: 'number' }).notNull(),
    ...timestamps,
  },
  (t) => [index('pembayaran_detail_pembayaran_idx').on(t.pembayaranId)],
)

export const saldoSiswaMutasi = pgTable(
  'saldo_siswa_mutasi',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siswaId: uuid('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    tipe: tipeMutasiSaldoEnum('tipe').notNull(),
    nominal: bigint('nominal', { mode: 'number' }).notNull(),
    pembayaranId: uuid('pembayaran_id').references(() => pembayaran.id, {
      onDelete: 'set null',
    }),
    tagihanId: uuid('tagihan_id').references(() => tagihan.id, { onDelete: 'set null' }),
    keterangan: text('keterangan'),
    ...timestamps,
  },
  (t) => [index('saldo_mutasi_siswa_idx').on(t.siswaId)],
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    penggunaId: text('pengguna_id').references(() => user.id, { onDelete: 'set null' }),
    aksi: text('aksi').notNull(),
    entitas: text('entitas').notNull(),
    entitasId: text('entitas_id'),
    dataSebelum: jsonb('data_sebelum'),
    dataSesudah: jsonb('data_sesudah'),
    ipAddress: text('ip_address'),
    waktu: timestamp('waktu').notNull().defaultNow(),
  },
  (t) => [index('audit_log_waktu_idx').on(t.waktu), index('audit_log_entitas_idx').on(t.entitas)],
)

export const nomorUrutKuitansi = pgTable(
  'nomor_urut_kuitansi',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sekolahId: uuid('sekolah_id')
      .notNull()
      .references(() => sekolah.id, { onDelete: 'cascade' }),
    tahun: integer('tahun').notNull(),
    bulan: integer('bulan').notNull(),
    urutanTerakhir: integer('urutan_terakhir').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('nomor_urut_kuitansi_uq').on(t.sekolahId, t.tahun, t.bulan)],
)
