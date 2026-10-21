import { and, asc, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from './db'
import {
  jenisPembayaran,
  jurusan,
  rombel,
  sekolah,
  tahunAjaran,
} from '../database/schema'
import type { CrudConfig } from './crud'

const uuid = z.string().uuid()
const nullableText = z.string().trim().nullable().optional()

export const masterConfigs: Record<string, CrudConfig> = {
  sekolah: {
    table: sekolah,
    entitas: 'sekolah',
    create: z.object({
      kode: z.string().trim().min(1, 'Kode wajib diisi'),
      nama: z.string().trim().min(1, 'Nama wajib diisi'),
      jenjang: z.enum(['SMP', 'SMK']),
      alamat: nullableText,
      aktif: z.boolean().default(true),
    }),
    update: z
      .object({
        kode: z.string().trim().min(1),
        nama: z.string().trim().min(1),
        jenjang: z.enum(['SMP', 'SMK']),
        alamat: nullableText,
        aktif: z.boolean(),
      })
      .partial(),
    searchColumns: [sekolah.nama, sekolah.kode],
    unique: { columns: [sekolah.kode], message: 'Kode sekolah sudah dipakai.' },
    orderBy: [asc(sekolah.jenjang), asc(sekolah.nama)],
  },

  'tahun-ajaran': {
    table: tahunAjaran,
    entitas: 'tahun_ajaran',
    create: z.object({
      nama: z.string().trim().min(1, 'Nama wajib diisi'),
      tanggalMulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
      tanggalSelesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
      isAktif: z.boolean().default(false),
    }),
    update: z
      .object({
        nama: z.string().trim().min(1),
        tanggalMulai: z.string().min(1),
        tanggalSelesai: z.string().min(1),
        isAktif: z.boolean(),
      })
      .partial(),
    searchColumns: [tahunAjaran.nama],
    unique: { columns: [tahunAjaran.nama], message: 'Nama tahun ajaran sudah dipakai.' },
    orderBy: [asc(tahunAjaran.nama)],
    afterChange: async (action, id) => {
      if (action === 'delete') return
      const db = useDb()
      const rows = await db.select().from(tahunAjaran).where(eq(tahunAjaran.id, id)).limit(1)
      if (rows[0]?.isAktif) {
        await db
          .update(tahunAjaran)
          .set({ isAktif: false })
          .where(ne(tahunAjaran.id, id))
      }
    },
  },

  jurusan: {
    table: jurusan,
    entitas: 'jurusan',
    create: z.object({
      sekolahId: uuid,
      kode: z.string().trim().min(1, 'Kode wajib diisi'),
      nama: z.string().trim().min(1, 'Nama wajib diisi'),
      aktif: z.boolean().default(true),
    }),
    update: z
      .object({
        sekolahId: uuid,
        kode: z.string().trim().min(1),
        nama: z.string().trim().min(1),
        aktif: z.boolean(),
      })
      .partial(),
    searchColumns: [jurusan.nama, jurusan.kode],
    filters: { sekolahId: jurusan.sekolahId },
    unique: { columns: [jurusan.sekolahId, jurusan.kode], message: 'Kode jurusan sudah dipakai di sekolah ini.' },
    orderBy: [asc(jurusan.nama)],
  },

  rombel: {
    table: rombel,
    entitas: 'rombel',
    create: z.object({
      sekolahId: uuid,
      tahunAjaranId: uuid,
      jurusanId: uuid.nullable().optional(),
      tingkat: z.number().int().min(1),
      nama: z.string().trim().min(1, 'Nama rombel wajib diisi'),
      waliKelasUserId: z.string().nullable().optional(),
    }),
    update: z
      .object({
        sekolahId: uuid,
        tahunAjaranId: uuid,
        jurusanId: uuid.nullable(),
        tingkat: z.number().int().min(1),
        nama: z.string().trim().min(1),
        waliKelasUserId: z.string().nullable(),
      })
      .partial(),
    searchColumns: [rombel.nama],
    filters: { sekolahId: rombel.sekolahId, tahunAjaranId: rombel.tahunAjaranId, tingkat: rombel.tingkat },
    unique: {
      columns: [rombel.tahunAjaranId, rombel.tingkat, rombel.nama, rombel.sekolahId],
      message: 'Rombel dengan tingkat dan nama ini sudah ada.',
    },
    orderBy: [asc(rombel.tingkat), asc(rombel.nama)],
    afterChange: async (action, id) => {
      if (action === 'delete') return
      const db = useDb()
      const rows = await db.select().from(rombel).where(eq(rombel.id, id)).limit(1)
      const row = rows[0]
      if (row?.waliKelasUserId) {
        // Satu akun wali kelas hanya memegang satu rombel per tahun ajaran (FR-AUTH-05).
        await db
          .update(rombel)
          .set({ waliKelasUserId: null })
          .where(
            and(
              eq(rombel.waliKelasUserId, row.waliKelasUserId),
              eq(rombel.tahunAjaranId, row.tahunAjaranId),
              ne(rombel.id, id),
            ),
          )
      }
    },
  },

  'jenis-pembayaran': {
    table: jenisPembayaran,
    entitas: 'jenis_pembayaran',
    create: z.object({
      kode: z.string().trim().min(1, 'Kode wajib diisi'),
      nama: z.string().trim().min(1, 'Nama wajib diisi'),
      aktif: z.boolean().default(true),
    }),
    update: z
      .object({
        kode: z.string().trim().min(1),
        nama: z.string().trim().min(1),
        aktif: z.boolean(),
      })
      .partial(),
    searchColumns: [jenisPembayaran.nama, jenisPembayaran.kode],
    unique: { columns: [jenisPembayaran.kode], message: 'Kode jenis pembayaran sudah dipakai.' },
    orderBy: [asc(jenisPembayaran.nama)],
  },
}
