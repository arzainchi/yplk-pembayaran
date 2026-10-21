# DESIGN.md — Aplikasi Pembayaran Siswa YPLK

Sistem desain admin dashboard terang untuk pencatatan tagihan dan pembayaran siswa Yayasan Pendidikan Latimojong Kukar (YPLK). Diadaptasi dari Metoric Design System: aksen ungu tunggal, kartu shell ganda 18/12, Plus Jakarta Sans, badge status teks + ikon.

Dokumen ini adalah sumber kebenaran tampilan. Bila ada keraguan, ikuti dokumen ini dan PRD (`PRD — Aplikasi Pencatatan Pembayaran Siswa YPLK`). Antarmuka berbahasa Indonesia.

## Overview

Aplikasi dipakai dua peran:

- **Staf Keuangan / Pengurus Yayasan**: mengelola siswa, tarif, tagihan, pembayaran, kuitansi, dan semua laporan.
- **Wali Kelas**: hanya melihat dan mengunduh laporan status dan riwayat tunggakan siswa di kelasnya.

Karakter visual: canvas abu mendingin `#f6f6f8`, aksen ungu tunggal `#7a5af8`, kartu berlapis dua (shell luar `#fafafc` radius 18 + kartu dalam putih radius 12), tipografi Plus Jakarta Sans, ikon garis `lucide:*`. Semua halaman memakai shell yang sama: sidebar 296px + area utama (topbar judul → toolbar tab + aksi → konten). Status tidak pernah disampaikan dengan warna saja; selalu badge berisi teks + ikon.

Hanya tema terang pada rilis awal (tidak ada dark mode).

### Halaman

| Area | Halaman | Peran |
|---|---|---|
| Menu | Dashboard | Staf |
| Menu | Siswa (daftar, detail siswa dengan tagihan, riwayat, saldo) | Staf |
| Menu | Tagihan | Staf |
| Menu | Pembayaran (daftar, input pembayaran, kuitansi) | Staf |
| Laporan | Rekap Penerimaan, Tunggakan | Staf |
| Laporan | Tunggakan Kelas | Wali Kelas |
| Master Data | Sekolah, Tahun Ajaran, Jurusan, Rombel, Jenis Pembayaran, Tarif | Staf |
| Pengaturan | Pengguna, Audit Log | Staf |

Wali Kelas hanya melihat satu item navigasi: **Tunggakan Kelas**.

## Colors

Satu hue aksen (ungu) + satu ramp netral + empat ramp status. Pakai token, jangan hardcode.

- **Aksen**: `--color-primary #7a5af8` untuk satu aksi primer per view, item nav aktif, dan angka fokus; `--color-primary-deep #6a48f0` untuk hover/border tombol primer.
- **Netral**: teks `--color-text #17171d`; teks sekunder `--color-text-muted #5b5c66`; teks redup/label `--color-text-subtle #9c9daa`; garis `--color-border #e9e9f0`.
- **Permukaan**: `--color-canvas #f6f6f8` (latar halaman), `--color-surface #ffffff` (kartu dalam), `--color-surface-subtle #fafafc` (shell kartu/KPI luar), `--color-surface-raised #fbfbfc` (sidebar/topbar).
- **Status** (selalu pasangan teks + latar untuk badge):
  - success `#189a4f` / `#e4f6ec`
  - warning `#f0a51f` / `#fdf3df`
  - danger `#e5484d` / `#fdebeb`
  - info `#2f6fed` / `#e9f0fd`
- Arti arah delta mengikuti makna bisnis, bukan arah panah: **tunggakan turun = hijau (baik)**, tunggakan naik = merah. Penerimaan naik = hijau.
- Jangan menambah warna status baru; jangan memakai warna status untuk dekorasi.

### Token tambahan

Nilai berikut muncul di Metoric sebagai angka mentah. Di proyek ini dijadikan token supaya tidak ada hardcode.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--color-primary-soft` | `#f1ecfe` | Latar count pill tab aktif |
| `--color-hover` | `#f5f5f8` | Hover tombol sekunder, item nav |
| `--color-active` | `#f2f2f5` | Latar item nav aktif |
| `--color-row-hover` | `#fafafd` | Hover baris tabel |
| `--color-row-selected` | `#f7f4ff` | Baris tabel terpilih |
| `--color-focus-border` | `#c8b6fb` | Border search saat fokus |
| `--color-focus-ring` | `rgba(122, 90, 248, .14)` | Ring fokus search/input |
| `--color-toggle-on` | `#c9b7fa` | Latar toggle aktif |

Status memakai pasangan token: `--color-success` + `--color-success-bg`, dan seterusnya untuk `warning`, `danger`, `info`.

## Typography

Keluarga font tunggal: `--font-family-sans` = "Plus Jakarta Sans" (fallback "Segoe UI", system-ui). Dimuat dengan `display=swap`; saat offline jatuh mulus ke fallback. Jangan tambah keluarga kedua.

| Token | Ukuran | Dipakai untuk |
|---|---|---|
| `--text-xs` | 12 | Label uppercase, letter-spacing `.09em` |
| `--text-sm` | 13.5 | Meta, tanggal, info pager |
| `--text-base` | 14.5 | Tabel, tombol, nav |
| `--text-body` | 15 | Dasar halaman, line-height 1.45 |
| `--text-title` | 21 | Nama aplikasi di sidebar |
| `--text-display` | 26 | Judul halaman dan judul kartu, letter-spacing `-.02em` |

Bobot: `--weight-regular` 400 teks isi; `--weight-medium` 500 label dan tab; `--weight-semibold` 600 tombol, badge, nilai tabel, nav aktif; `--weight-bold` 700 angka KPI, nominal, total, judul.

- Label kartu/KPI selalu uppercase 12px semibold subtle.
- Angka penting (nilai KPI, total tagihan, nominal pembayaran, saldo) tampil bold dengan letter-spacing `-.02em`.
- **Angka uang memakai `font-variant-numeric: tabular-nums`** dan rata kanan di tabel supaya digit sejajar (penyesuaian untuk aplikasi keuangan).

### Format data

- Uang: rupiah bulat tanpa desimal, titik sebagai pemisah ribuan, tanpa spasi: `Rp1.500.000`. Satu fungsi `formatRupiah()` dipakai di seluruh aplikasi.
- Tanggal: `21 Okt 2026`; dengan jam: `21 Okt 2026, 14.30`. Zona waktu WITA (Asia/Makassar).
- Tingkat dan periode: `Kelas 10`, `Semester Ganjil`, `Tahun ajaran 2026/2027`.

## Layout

Grid shell dua kolom: sidebar 296px + `minmax(0, 1fr)`; sidebar sticky full-height.

- Konten: padding `22px 28px 30px`, gap antar-section `--space-5` (20px).
- Baris KPI: grid 4 kolom; ≤1400px jatuh ke 2 kolom; sidebar menyusut ke 250px.
- ≤980px: sidebar disembunyikan (diganti tombol menu di topbar), padding halaman 18px, tabel scroll horizontal (`.y-table-wrap { overflow-x: auto }`), toolbar dan pager wrap.
- Pola halaman konsisten: topbar (judul `--text-display` + aksi ikon) → toolbar (tab pill + aksi kanan) → konten (KPI → kartu utama).
- Semua sel grid memakai `minmax(0, …)` supaya tidak overflow.
- Skala spasi: `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-5` 20, `--space-6` 24, `--space-7` 32.
- **Halaman Wali Kelas (disarankan)**: wali kelas kemungkinan membuka dari ponsel. Di ≤640px, baris laporan tunggakan boleh berubah menjadi daftar kartu (nama + total tunggakan + rincian), bukan tabel scroll.

## Elevation & Depth

Desain datar: kedalaman dari border 1px + bayangan sangat lembut.

- Kartu dan KPI: `--shadow-card` = `0 1px 2px rgba(23, 23, 43, .02–.05)` + `--color-border`.
- Search field: `0 1px 2px rgba(23, 23, 43, .04)`; saat fokus ganti ke ring `0 0 0 3px var(--color-focus-ring)` + border `--color-focus-border`.
- Tombol primer: `--shadow-primary` = `0 1px 2px rgba(122, 90, 248, .35)`.
- Elemen mengambang (tooltip chart, dialog, menu): `--shadow-overlay` = `0 12px 28px rgba(23, 23, 43, .12)`. Satu-satunya bayangan besar, hanya untuk overlay.
- Hover interaksi memakai perubahan latar (`--color-hover`, `--color-row-hover`), bukan elevasi baru.
- Focus ring global: `outline: 2px solid var(--color-primary); outline-offset: 2px`.

## Shapes

Radius berlapis untuk kartu: shell luar `--radius-lg` (18) + kartu dalam `--radius-md` (12) dengan padding shell 8px. Ini ciri khas sistem desain ini; pertahankan pada kartu besar (KPI, chart, tabel).

- `--radius-md` 12: tombol, input/search, select group, kartu dalam, thumbnail 36–46px.
- `--radius-sm` 8: kbd, tab aktif di dalam group (13px), aksi baris.
- `--radius-full` 999: badge status, delta pill, count tab, toggle switch, avatar.
- Group select/tabs memakai pembatas 1px `--color-border` antar item, bukan gap.

## Components

Semua komponen milik halaman/aplikasi memakai prefix kelas **`y-`** (mis. `y-card`, `y-table`, `y-badge`). Jangan mencampur dengan prefix lain.

- **Sidebar**: logo `lucide:school` ungu 30px + nama aplikasi 21px bold; search ⌘K (**cari siswa berdasarkan nama, NIS, atau NISN**); label grup menu `--text-xs` uppercase (MENU, LAPORAN, MASTER DATA, PENGATURAN); nav item 40px radius 11 dengan ikon 20px; item aktif `--color-active` + teks/ikon aksen.
- **Topbar**: judul halaman 26px bold; aksi ikon 40px radius 11; avatar gradient `#9d85fb → #6a48f0` 36px, membuka menu akun (nama petugas, peran, keluar).
- **Tabs**: group pill putih radius 13 border; tab aktif putih + inner ring; count pill 12px bold (aktif: aksen di `--color-primary-soft`).
- **Tombol**: primer aksen solid + ikon; sekunder putih border; icon-btn 40px; semua radius 12, teks 14.5 semibold.
- **KPI card**: shell ganda; label uppercase; nilai 26px bold + delta pill; kaki kartu strong + span + panah.
- **Badge status**: pill 12.5 semibold = ikon 14px + teks, pasangan warna status; teks wajib ada.
- **Data table**: header 13.5 subtle; sel `13px 16px`; baris hover `--color-row-hover`, terpilih `--color-row-selected`; checkbox aksen 16px; kolom uang rata kanan.
- **Toggle**: 46×27, on = `--color-toggle-on`; knob 21px; `role="switch"`.
- **Chart**: area gradient aksen/amber opacity ≤ .16, garis 2.5, dot putih 2.5, gridline dashed `3 6`. Seri dibedakan juga lewat legenda teks, bukan warna saja.
- **Pager**: info kiri `--text-sm` subtle + tombol 36px; halaman aktif solid aksen. Semua daftar besar memakai paginasi sisi server.
- **Search**: ikon kiri 18px, input 14.5, kbd kanan; fokus ring aksen.

### Pemetaan badge status

Hanya empat warna status yang tersedia; pemetaan di bawah ini wajib konsisten di semua halaman.

| Konteks | Nilai | Warna | Ikon |
|---|---|---|---|
| Tagihan | Lunas | success | `lucide:circle-check` |
| Tagihan | Sebagian | info | `lucide:circle-dashed` |
| Tagihan | Belum Bayar | warning | `lucide:clock` |
| Tagihan | Dibatalkan | danger | `lucide:ban` |
| Tunggakan | Tahun ajaran berjalan | warning | `lucide:clock` |
| Tunggakan | Tahun ajaran sebelumnya | danger | `lucide:triangle-alert` |
| Pembayaran | Aktif | success | `lucide:circle-check` |
| Pembayaran | Batal | danger | `lucide:ban` |
| Siswa | Aktif | success | `lucide:user-check` |
| Siswa | Lulus | info | `lucide:graduation-cap` |
| Siswa | Pindah | warning | `lucide:log-out` |
| Siswa | Keluar | danger | `lucide:user-x` |

### KPI Dashboard

Empat kartu dalam satu baris:

| Kartu | Delta baik jika |
|---|---|
| Penerimaan hari ini | naik |
| Penerimaan bulan ini | naik |
| Total tunggakan | turun |
| Siswa bertunggakan | turun |

Kartu utama di bawah KPI: chart penerimaan per bulan, satu seri per sekolah (SMP Teknologi, SMK Geologi Pertambangan), dengan filter sekolah di toolbar.

## Pola tambahan (tidak ada di Metoric)

Pola berikut dibutuhkan aplikasi ini dan hanya memakai token yang sudah ada.

### Input pembayaran

Satu halaman, dua kartu shell ganda berdampingan (≤980px ditumpuk):

- **Kiri**: search siswa → daftar tagihan siswa (checkbox, jenis, asal tahun ajaran, sisa, badge status). Tagihan tertua di atas. Tunggakan tahun ajaran sebelumnya ditandai badge danger.
- **Kanan** (ringkasan): total dipilih, metode bayar (select group tunai/transfer), nominal, nomor referensi (jika transfer), kelebihan bayar → ditampilkan sebagai "Masuk saldo". Pemakaian saldo dipilih petugas lewat checkbox.
- Satu tombol primer: **Simpan dan cetak kuitansi**. Aksi sekunder: **Simpan saja**.

### Form dan dialog

- Form dalam kartu dalam; label 14.5 medium di atas input; teks bantu `--text-sm` subtle; error `--color-danger` + ikon `lucide:circle-alert` + pesan yang menjelaskan cara memperbaiki.
- Dialog dan drawer memakai `--shadow-overlay`, radius 18, overlay gelap transparan tanpa blur.
- **Void pembayaran**: dialog konfirmasi dengan kolom alasan wajib. Tombol konfirmasi bergaya sekunder dengan teks `--color-danger`; ini satu-satunya pengecualian pemakaian warna status pada tombol. Setelah berhasil, tampilkan toast "Pembayaran dibatalkan".
- Peringatan kenaikan kelas (tunggakan): banner info dengan ikon + teks + daftar siswa; tidak memblokir tombol primer.

### Toast, kosong, dan memuat

- Toast: kartu dalam kecil kanan-atas, ikon + teks, hilang sendiri; kata kerja sama dengan tombolnya ("Simpan" → "Tersimpan").
- Kondisi kosong: ikon `lucide:*` 32px subtle, satu kalimat penjelas, satu aksi (mis. "Belum ada tagihan. Terbitkan tagihan untuk rombel ini.").
- Memuat: skeleton `--color-surface-subtle`, tanpa animasi saat `prefers-reduced-motion`.

### Kuitansi thermal

Kuitansi adalah halaman HTML dengan stylesheet cetak sendiri, **tidak** memakai shell dan kartu.

- Lebar lewat variabel `--receipt-width`: **80mm** (awal), dapat diganti **58mm** lewat pengaturan. `@page { size: var(--receipt-width) auto; margin: 4mm; }` (jika variabel tidak didukung di `@page`, hasilkan nilai literal dari pengaturan).
- Hitam di atas putih, tanpa latar, tanpa warna aksen, tanpa bayangan, tanpa gradient. Font tetap keluarga sistem desain dengan fallback system-ui; ukuran dasar 12px, total 14px bold.
- Isi: identitas yayasan dan sekolah, nomor, tanggal, nama + NIS siswa, rincian tagihan yang dibayar, nominal, terbilang, sisa tagihan, saldo (jika ada), metode bayar, nama petugas.
- Cetak ulang diberi penanda **SALINAN**; transaksi yang di-void diberi penanda **BATAL**.
- Sembunyikan semua elemen aplikasi saat `@media print`.

## Implementasi di Nuxt

- Token ditulis sekali sebagai CSS custom properties di `assets/css/tokens.css` (`:root`), diimpor global dari `nuxt.config`. Jika memakai Tailwind atau Nuxt UI, petakan token ini ke tema dan jangan menulis nilai warna/radius/ukuran font langsung di komponen.
- Font: Plus Jakarta Sans via `@nuxt/fonts` atau Google Fonts dengan `display=swap`; bobot yang dimuat 400, 500, 600, 700.
- Ikon: `lucide:*` lewat `@nuxt/icon` (`<Icon name="lucide:school" />`); tidak memakai web component `<iconify-icon>`.
- Layout: `layouts/default.vue` memegang shell (sidebar + topbar). Menu sidebar dibangun dari peran pengguna; Wali Kelas hanya mendapat item **Tunggakan Kelas**. Penegakan akses tetap di server; menu hanya cerminan.
- Komponen dasar (prefix `y-`): `YCard` (shell ganda), `YKpi`, `YBadge`, `YTable`, `YTabs`, `YPager`, `YSearch`, `YButton`, `YDialog`. Komponen halaman memakai komponen ini, bukan menulis ulang gaya.
- Uang dan tanggal hanya lewat util format bersama (`formatRupiah`, `formatTanggal`); jangan memformat manual di template.

## Do's and Don'ts

### Do

- Pakai token `--color-*`, `--text-*`, `--radius-*`, `--space-*`; ikon dari set `lucide:*`.
- Beri `aria-label` pada tombol ikon-only; ikon dekoratif `aria-hidden="true"`.
- Status = warna + ikon + teks sekaligus; delta memakai arah sesuai makna bisnis (tunggakan turun = baik).
- Jaga pola halaman: topbar → toolbar → konten; kartu besar selalu shell ganda 18/12.
- Sertakan state: hover, fokus ring, baris terpilih, disabled pager, kosong, memuat, galat; `prefers-reduced-motion` menonaktifkan animasi.
- Tulis teks antarmuka dalam bahasa Indonesia, sentence case, kata kerja yang jelas ("Simpan dan cetak kuitansi", bukan "Submit"); satu aksi memakai nama yang sama di tombol, dialog, dan toast.
- Uji kuitansi di printer thermal yang dipakai sebelum rilis.

### Don't

- Jangan menambah hue baru, gradien dekoratif, glassmorphism, atau bayangan besar di luar overlay.
- Jangan hardcode nilai yang sudah ada tokennya (warna, radius, spasi, ukuran font).
- Jangan memakai warna status untuk aksi atau dekorasi biasa (satu pengecualian: konfirmasi void); satu tombol primer solid per view.
- Jangan menyembunyikan status hanya di balik warna (mis. titik tanpa teks).
- Jangan menambah keluarga font kedua atau bobot di luar 400–700.
- Jangan menampilkan riwayat pembayaran atau data keuangan lain kepada Wali Kelas; layar mereka hanya status dan riwayat tunggakan serta jenis tunggakan.
- Jangan memformat uang dengan desimal atau simbol selain `Rp`.
