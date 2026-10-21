import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  bigint,
  timestamp,
  date,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import {
  jenjangEnum,
  jenisKelaminEnum,
  statusSiswaEnum,
  polaPenagihanEnum,
} from './enums'

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}

export const sekolah = pgTable('sekolah', {
  id: uuid('id').primaryKey().defaultRandom(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  jenjang: jenjangEnum('jenjang').notNull(),
  alamat: text('alamat'),
  aktif: boolean('aktif').notNull().default(true),
  ...timestamps,
})

export const tahunAjaran = pgTable('tahun_ajaran', {
  id: uuid('id').primaryKey().defaultRandom(),
  nama: text('nama').notNull().unique(),
  tanggalMulai: date('tanggal_mulai', { mode: 'string' }).notNull(),
  tanggalSelesai: date('tanggal_selesai', { mode: 'string' }).notNull(),
  isAktif: boolean('is_aktif').notNull().default(false),
  ...timestamps,
})

export const jurusan = pgTable(
  'jurusan',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sekolahId: uuid('sekolah_id')
      .notNull()
      .references(() => sekolah.id, { onDelete: 'cascade' }),
    kode: text('kode').notNull(),
    nama: text('nama').notNull(),
    aktif: boolean('aktif').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('jurusan_sekolah_kode_uq').on(t.sekolahId, t.kode)],
)

export const rombel = pgTable(
  'rombel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sekolahId: uuid('sekolah_id')
      .notNull()
      .references(() => sekolah.id, { onDelete: 'cascade' }),
    tahunAjaranId: uuid('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    jurusanId: uuid('jurusan_id').references(() => jurusan.id, { onDelete: 'set null' }),
    tingkat: integer('tingkat').notNull(),
    nama: text('nama').notNull(),
    waliKelasUserId: text('wali_kelas_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('rombel_unik_uq').on(t.tahunAjaranId, t.tingkat, t.nama, t.sekolahId),
    index('rombel_wali_idx').on(t.waliKelasUserId),
  ],
)

export const siswa = pgTable(
  'siswa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nis: text('nis').notNull().unique(),
    nisn: text('nisn').unique(),
    nama: text('nama').notNull(),
    jenisKelamin: jenisKelaminEnum('jenis_kelamin').notNull(),
    tanggalLahir: date('tanggal_lahir', { mode: 'string' }),
    sekolahId: uuid('sekolah_id')
      .notNull()
      .references(() => sekolah.id, { onDelete: 'restrict' }),
    jurusanId: uuid('jurusan_id').references(() => jurusan.id, { onDelete: 'set null' }),
    namaWali: text('nama_wali'),
    noHpWali: text('no_hp_wali'),
    tahunMasuk: integer('tahun_masuk').notNull(),
    status: statusSiswaEnum('status').notNull().default('aktif'),
    ...timestamps,
  },
  (t) => [index('siswa_nama_idx').on(t.nama), index('siswa_sekolah_idx').on(t.sekolahId)],
)

export const siswaRombel = pgTable(
  'siswa_rombel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siswaId: uuid('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    rombelId: uuid('rombel_id')
      .notNull()
      .references(() => rombel.id, { onDelete: 'cascade' }),
    tahunAjaranId: uuid('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('siswa_rombel_unik_uq').on(t.siswaId, t.tahunAjaranId),
    index('siswa_rombel_rombel_idx').on(t.rombelId),
  ],
)

export const jenisPembayaran = pgTable('jenis_pembayaran', {
  id: uuid('id').primaryKey().defaultRandom(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  aktif: boolean('aktif').notNull().default(true),
  ...timestamps,
})

export const tarif = pgTable(
  'tarif',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sekolahId: uuid('sekolah_id')
      .notNull()
      .references(() => sekolah.id, { onDelete: 'cascade' }),
    tahunAjaranId: uuid('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    jenisPembayaranId: uuid('jenis_pembayaran_id')
      .notNull()
      .references(() => jenisPembayaran.id, { onDelete: 'restrict' }),
    tingkat: integer('tingkat').notNull(),
    semester: text('semester'),
    nominal: bigint('nominal', { mode: 'number' }).notNull(),
    polaPenagihan: polaPenagihanEnum('pola_penagihan').notNull(),
    batasLunas: text('batas_lunas'),
    keterangan: text('keterangan'),
    ...timestamps,
  },
  (t) => [index('tarif_scope_idx').on(t.sekolahId, t.tahunAjaranId, t.tingkat)],
)

export const tarifJurusan = pgTable(
  'tarif_jurusan',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tarifId: uuid('tarif_id')
      .notNull()
      .references(() => tarif.id, { onDelete: 'cascade' }),
    jurusanId: uuid('jurusan_id')
      .notNull()
      .references(() => jurusan.id, { onDelete: 'cascade' }),
    isExclude: boolean('is_exclude').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('tarif_jurusan_unik_uq').on(t.tarifId, t.jurusanId)],
)
