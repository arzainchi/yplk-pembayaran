import { and, asc, eq, ne } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDb } from './db'
import { writeAudit } from './audit'
import { requireStaff, sessionHeaders } from './auth-guard'
import { auth } from './auth'
import { rombelLabel } from '#shared/utils/format'
import { rombel, tahunAjaran, user } from '../database/schema'

export async function handlePenggunaList(event: H3Event) {
  await requireStaff(event)
  const db = useDb()

  const users = await db
    .select({
      id: user.id,
      nama: user.name,
      username: user.username,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.name))

  const waliRombel = await db
    .select({
      waliKelasUserId: rombel.waliKelasUserId,
      rombelNama: rombel.nama,
      tingkat: rombel.tingkat,
      isAktif: tahunAjaran.isAktif,
      tahunAjaranNama: tahunAjaran.nama,
    })
    .from(rombel)
    .innerJoin(tahunAjaran, eq(rombel.tahunAjaranId, tahunAjaran.id))

  const items = users.map((u) => {
    const rb = waliRombel.find((r) => r.waliKelasUserId === u.id && r.isAktif)
    return {
      ...u,
      rombelNama: rb ? rombelLabel(rb.tingkat, rb.rombelNama) : null,
    }
  })

  return { items, total: items.length }
}

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .regex(/^[a-z0-9._-]+$/i, 'Username hanya boleh huruf, angka, titik, garis bawah, atau strip'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  nama: z.string().trim().min(1, 'Nama wajib diisi'),
  peran: z.enum(['keuangan_pengurus', 'wali_kelas']),
  rombelId: z.string().uuid().nullable().optional(),
})

export async function handlePenggunaCreate(event: H3Event) {
  const staff = await requireStaff(event)
  const db = useDb()
  const body = createSchema.parse(await readBody(event))
  const email = `${body.username.toLowerCase()}@yplk.local`

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.username, body.username)).limit(1)
  if (existing.length) throw createError({ statusCode: 409, statusMessage: 'Username sudah dipakai.' })

  let created: { id: string }
  try {
    const res = await auth.api.signUpEmail({
      body: { email, password: body.password, name: body.nama, username: body.username },
    })
    created = { id: res.user.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat akun.'
    throw createError({ statusCode: 400, statusMessage: message })
  }

  await db
    .update(user)
    .set({ role: body.peran, displayUsername: body.username, banned: false })
    .where(eq(user.id, created.id))

  if (body.peran === 'wali_kelas' && body.rombelId) {
    await assignRombel(created.id, body.rombelId)
  }

  await writeAudit({
    penggunaId: staff.id, aksi: 'pengguna.create', entitas: 'user', entitasId: created.id,
    sesudah: { username: body.username, peran: body.peran }, event,
  })
  return { id: created.id }
}

async function assignRombel(userId: string, rombelId: string) {
  const db = useDb()
  const rb = await db.select().from(rombel).where(eq(rombel.id, rombelId)).limit(1)
  if (!rb.length) throw createError({ statusCode: 404, statusMessage: 'Rombel tidak ditemukan.' })
  const tahunAjaranId = rb[0]!.tahunAjaranId
  // Satu wali kelas satu rombel per tahun ajaran.
  await db
    .update(rombel)
    .set({ waliKelasUserId: null })
    .where(and(eq(rombel.waliKelasUserId, userId), eq(rombel.tahunAjaranId, tahunAjaranId), ne(rombel.id, rombelId)))
  await db.update(rombel).set({ waliKelasUserId: userId, updatedAt: new Date() }).where(eq(rombel.id, rombelId))
}

const updateSchema = z.object({
  nama: z.string().trim().min(1).optional(),
  peran: z.enum(['keuangan_pengurus', 'wali_kelas']).optional(),
  rombelId: z.string().uuid().nullable().optional(),
})

export async function handlePenggunaUpdate(event: H3Event) {
  const staff = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const body = updateSchema.parse(await readBody(event))

  const before = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!before.length) throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan.' })

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (body.nama) values.name = body.nama
  if (body.peran) values.role = body.peran
  await db.update(user).set(values as never).where(eq(user.id, id))

  if (body.rombelId !== undefined && body.peran !== 'keuangan_pengurus') {
    if (body.rombelId) await assignRombel(id, body.rombelId)
    else await db.update(rombel).set({ waliKelasUserId: null }).where(eq(rombel.waliKelasUserId, id))
  }

  await writeAudit({
    penggunaId: staff.id, aksi: 'pengguna.update', entitas: 'user', entitasId: id,
    sebelum: { role: before[0]!.role }, sesudah: values, event,
  })
  return { ok: true }
}

export async function handlePenggunaResetPassword(event: H3Event) {
  const staff = await requireStaff(event)
  const id = getRouterParam(event, 'id')!
  const body = z.object({ password: z.string().min(6, 'Password minimal 6 karakter') }).parse(await readBody(event))

  await auth.api.setUserPassword({
    body: { userId: id, newPassword: body.password },
    headers: sessionHeaders(event),
  })

  await writeAudit({
    penggunaId: staff.id, aksi: 'pengguna.reset_password', entitas: 'user', entitasId: id, event,
  })
  return { ok: true }
}

export async function handlePenggunaToggleAktif(event: H3Event) {
  const staff = await requireStaff(event)
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const body = z.object({ aktif: z.boolean() }).parse(await readBody(event))

  if (id === staff.id) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak dapat menonaktifkan akun sendiri.' })
  }

  if (body.aktif) {
    await auth.api.unbanUser({ body: { userId: id }, headers: sessionHeaders(event) })
  } else {
    await auth.api.banUser({ body: { userId: id, banReason: 'Dinonaktifkan oleh staf' }, headers: sessionHeaders(event) })
  }

  await db.update(user).set({ banned: !body.aktif, updatedAt: new Date() }).where(eq(user.id, id))
  await writeAudit({
    penggunaId: staff.id, aksi: body.aktif ? 'pengguna.aktifkan' : 'pengguna.nonaktifkan',
    entitas: 'user', entitasId: id, event,
  })
  return { ok: true }
}
