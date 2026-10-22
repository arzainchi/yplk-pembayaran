# Aplikasi Pencatatan Pembayaran Siswa YPLK

Aplikasi web untuk mencatat tagihan dan penerimaan pembayaran siswa di dua sekolah yang dinaungi **Yayasan Pendidikan Latimojong Kukar (YPLK)**: SMP Teknologi Tenggarong dan SMK Geologi Pertambangan Tenggarong.

Dibangun sesuai `PRD — Aplikasi Pencatatan Pembayaran Siswa YPLK.md` (kebutuhan) dan `design.md` (sumber kebenaran tampilan).

## Fitur (Fase 1 + 2 + 3)

- **Autentikasi & peran**: login username/password (Better Auth), sesi berakhir otomatis, dua peran — Staf Keuangan/Pengurus dan Wali Kelas — ditegakkan di sisi server.
- **Data master**: sekolah, tahun ajaran (satu aktif), jurusan, rombel (dengan wali kelas), jenis pembayaran, tarif (target jurusan fleksibel + salin dari tahun ajaran sebelumnya).
- **Siswa**: CRUD, penempatan rombel per tahun ajaran, halaman detail dengan seluruh tagihan (termasuk tunggakan lampau), riwayat pembayaran, dan mutasi saldo.
- **Tagihan**: generate massal per rombel atau per tarif (idempoten), tagihan bulanan per semester, tagihan manual, status otomatis.
- **Pembayaran**: satu pembayaran ke beberapa tagihan, cicilan, alokasi otomatis ke tagihan terlama, metode tunai/transfer, kelebihan bayar menjadi saldo siswa, pembatalan (void) dengan alasan wajib + audit log.
- **Kuitansi thermal**: nomor unik `KW/{KODE_SEKOLAH}/{TAHUN}/{BULAN}/{URUT}`, cetak langsung dari browser (80 mm, dapat diganti 58 mm), penanda SALINAN dan BATAL.
- **Dashboard & laporan**: KPI penerimaan/tunggakan + grafik penerimaan per sekolah; rekap penerimaan (filter periode/sekolah/jenis/metode), laporan tunggakan, laporan tunggakan kelas untuk wali kelas, daftar transaksi batal, audit log; ekspor Excel (ExcelJS) dan cetak PDF via browser.
- **Pengguna**: buat/nonaktifkan/reset password akun, penautan wali kelas ke rombel.
- **Impor siswa dari Excel** (Fase 3): unduh template, unggah `.xlsx`, validasi per baris (NIS/NISN unik, sekolah/jurusan/rombel dikenal) dan laporan baris gagal; siswa valid langsung ditempatkan ke rombel tahun ajaran aktif.
- **Kenaikan kelas massal** (Fase 3): pratinjau siswa satu rombel beserta total tunggakan, pilih naik kelas / tinggal kelas / luluskan per siswa, peringatan tunggakan sebelum konfirmasi; tagihan tidak ikut dipindah.
- **Audit log lengkap** (Fase 3): filter entitas/aksi/pencarian, total baris, dan detail perubahan (field sebelum → sesudah) untuk tiap catatan.

## Teknologi

- **Nuxt 4** (frontend + backend lewat server routes/Nitro)
- **Nuxt UI v4** (Tailwind CSS v4) yang di-theme dengan token dari `design.md`
- **Drizzle ORM** + **PostgreSQL** (driver `postgres`)
- **Better Auth** (drizzle adapter, plugin username & admin)
- **Zod** untuk validasi, **ExcelJS** untuk ekspor Excel

## Prasyarat

- Node.js 22+ dan pnpm
- Proyek **Neon** (Lakebase Postgres) yang sudah tertaut — lihat `neon.ts` dan `.neon`

## Menjalankan

1. Pasang dependensi:

   ```bash
   pnpm install
   ```

2. Siapkan environment: salin `.env.example` menjadi `.env` lalu sesuaikan.

   ```bash
   cp .env.example .env
   ```

   ```dotenv
   DATABASE_URL="postgresql://...@ep-xxx-pooler...neon.tech/neondb"   # pooled, untuk aplikasi
   DATABASE_URL_UNPOOLED="postgresql://...@ep-xxx...neon.tech/neondb" # langsung, untuk migrasi
   NEON_BRANCH="production"
   DB_SSL=true
   BETTER_AUTH_SECRET="rahasia-acak-minimal-32-karakter"
   BETTER_AUTH_URL="http://localhost:3000"
   DB_AUTO_MIGRATE=true
   ```

   Variabel `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, dan `NEON_BRANCH` diisi otomatis oleh Neon CLI (`neon init` / `neon deploy` / `neon env pull`) dari layanan yang dideklarasikan di `neon.ts`. Migrasi memakai koneksi langsung (non-pooler), aplikasi memakai koneksi pooled.

3. Buat tabel dan isi data demo:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   `db:seed` mengosongkan lalu mengisi ulang data (idempoten) dengan 2 sekolah, 9 rombel, 60 siswa, 20 tarif, ratusan tagihan, dan puluhan pembayaran.

4. Jalankan server pengembangan:

   ```bash
   pnpm dev
   ```

   Buka http://localhost:3000.

### Akun demo

| Username | Password | Peran |
| --- | --- | --- |
| `admin` | `admin123` | Staf Keuangan / Pengurus |
| `walikelas` | `walikelas123` | Wali Kelas SMP 7A |
| `walikelas2` | `walikelas123` | Wali Kelas SMK 10 GP |

> Ganti password akun demo sebelum dipakai di produksi.

### Panduan singkat Fase 3

**Impor siswa** — menu *Siswa* → tombol **Impor Excel** → **Unduh template Excel** → isi satu baris per siswa di lembar `Siswa` (jangan ubah baris judul) → pilih berkas → **Impor sekarang**. Baris yang gagal ditampilkan beserta nomor baris dan alasannya; baris lain tetap masuk.

**Kenaikan kelas** — menu *Kenaikan Kelas* → pilih rombel asal. Sistem menampilkan siswa aktif yang masih berada di rombel itu beserta tunggakannya (tunggakan tidak menghalangi). Pilih tahun ajaran tujuan, rombel naik kelas, dan rombel tinggal kelas (bila ada), lalu atur kolom *Setelah proses* per siswa. Untuk angkatan akhir (kelas 9 / 12) biarkan rombel tujuan kosong dan pilih **Luluskan**. Setelah **Proses kenaikan kelas**, siswa hilang dari daftar rombel asal dan muncul pada rombel tahun ajaran tujuan.

**Audit log** — menu *Audit Log* → saring berdasarkan entitas/aksi atau cari nama petugas / ID entitas → **Detail** menampilkan perubahan field sebelum dan sesudah.

## Skrip

| Skrip | Kegunaan |
| --- | --- |
| `pnpm dev` | Server pengembangan |
| `pnpm build` | Build produksi |
| `pnpm preview` | Pratinjau hasil build |
| `pnpm db:generate` | Bikin file migrasi dari skema Drizzle |
| `pnpm db:migrate` | Terapkan migrasi |
| `pnpm db:push` | Push skema langsung (tanpa file migrasi) |
| `pnpm db:seed` | Isi data demo |
| `pnpm db:studio` | Buka Drizzle Studio |

## Struktur proyek

```
app/                 # Aplikasi Vue (Nuxt srcDir): pages, components, layouts, composables
  assets/css/        # Token tema (main.css) + gaya cetak (print.css)
  components/        # Y* (kartu shell ganda, KPI, tabel, badge status, chart, kuitansi)
  pages/             # Halaman per area: siswa, tagihan, pembayaran, laporan, master, pengaturan
server/
  api/               # Route Nitro (REST)
  database/          # Skema Drizzle, koneksi, migrasi, seed
  utils/             # Logika server: auth, guard, pembayaran, tagihan, kuitansi, laporan, crud
shared/
  utils/             # Format bersama (rupiah, tanggal, terbilang, status)
  types/             # Tipe UI bersama
```

## Catatan produksi

- Deploy di Vercel; jalankan `pnpm db:migrate` sebagai langkah rilis (plugin auto-migrate hanya aktif di dev). Migrasi memakai `DATABASE_URL_UNPOOLED`.
- Database dan layanan Neon dikelola lewat `neon.ts` (`neon config plan`, `neon deploy`). Neon Auth sudah aktif di branch `production`, tetapi login aplikasi tetap memakai Better Auth milik aplikasi (username + peran kustom).
- Zona waktu aplikasi **WITA (Asia/Makassar)**; seluruh format tanggal mengikuti zona ini.
- Uji kuitansi pada printer thermal yang dipakai sebelum rilis.
- `.env` tidak di-commit; hanya `.env.example` yang disertakan.
