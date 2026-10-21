# PRD — Aplikasi Pencatatan Pembayaran Siswa YPLK

Yayasan Pendidikan Latimojong Kukar (YPLK) · Versi 1.1 (draf) · 21 Oktober 2026

## 1. Ringkasan

Aplikasi web untuk mencatat tagihan dan penerimaan pembayaran siswa di dua sekolah yang dinaungi YPLK: **SMP Teknologi Tenggarong** dan **SMK Geologi Pertambangan Tenggarong**. Aplikasi menggantikan pencatatan manual agar status tagihan, tunggakan, kuitansi, dan laporan keuangan tersedia secara akurat dan real-time.

Prinsip utama desain: **tagihan melekat pada siswa**, bukan pada tahun ajaran atau kelas. Siswa yang naik kelas membawa tagihan yang belum lunas dari kelas sebelumnya.

## 2. Latar Belakang dan Masalah

YPLK mengelola administrasi keuangan dan penerimaan pembayaran siswa dari dua sekolah. Masalah yang ingin diselesaikan:

- Rekap pembayaran dan tunggakan disusun manual sehingga lambat dan rawan salah.
- Wali kelas harus meminta rekap tunggakan ke staf keuangan setiap kali ingin menagih atau memberi informasi ke orang tua.
- Jenis iuran beragam (cicilan, bulanan, tahunan, sekali bayar, lunas di kelas tertentu) dan berbeda per tingkat serta jurusan, sehingga sulit dilacak tanpa sistem.
- Pengurus yayasan belum memiliki pemantauan keuangan lintas sekolah secara real-time.

## 3. Tujuan dan Metrik Keberhasilan

| Tujuan | Metrik |
| --- | --- |
| Semua penerimaan pembayaran tercatat di sistem | 100% transaksi harian tercatat dan berkuitansi bernomor unik |
| Status tunggakan akurat dan real-time | Selisih antara saldo sistem dan pembukuan kas = 0 pada rekonsiliasi bulanan |
| Wali kelas tidak lagi bergantung pada rekap manual | Wali kelas dapat mengunduh laporan tunggakan kelasnya tanpa bantuan staf |
| Input pembayaran cepat | Satu transaksi pembayaran dapat dicatat dan kuitansi dicetak kurang dari 1 menit |
| Pengawasan eksekutif | Pengurus dapat melihat rekap per sekolah, per periode, dan per jenis pembayaran kapan saja |

## 4. Ruang Lingkup

**Termasuk (in scope)**

- Manajemen data master: sekolah, tahun ajaran, jurusan, rombel (kelas), siswa, jenis pembayaran, dan tarif (tarif diinput manual oleh admin).
- Penerbitan tagihan otomatis dan manual per siswa.
- Pencatatan pembayaran (tunai atau transfer), pembayaran sebagian (cicilan), alokasi ke beberapa tagihan, dan pencatatan kelebihan bayar sebagai saldo siswa.
- Pembatalan transaksi (void) dengan alasan dan jejak audit.
- Cetak kuitansi untuk printer thermal.
- Laporan rekapitulasi keuangan dan laporan tunggakan.
- Proses kenaikan kelas, kelulusan, dan perpindahan siswa (tunggakan hanya menampilkan peringatan).
- Manajemen pengguna dengan dua peran; setiap petugas memiliki akun sendiri.

**Di luar cakupan (out of scope) untuk rilis awal**

- Pembayaran online / payment gateway.
- Portal untuk orang tua atau siswa.
- Notifikasi otomatis WhatsApp atau SMS.
- Akuntansi lengkap (jurnal, buku besar, pengeluaran yayasan).
- Aplikasi mobile native (cukup web responsif).
- Denda keterlambatan, potongan, keringanan, dan beasiswa (tidak berlaku di yayasan ini).
- Tindakan terhadap tunggakan, mis. penahanan ijazah: dilakukan di luar sistem; sistem hanya mencatat.

## 5. Pengguna dan Hak Akses

| Peran | Pengguna | Hak akses |
| --- | --- | --- |
| **Staf Keuangan / Pengurus Yayasan** | Satu peran; setiap petugas memiliki akun sendiri | Akses penuh: kelola master siswa, tarif, tagihan, input transaksi harian (SPP dan iuran lain), verifikasi data, cetak kuitansi, kelola akun, akses semua laporan rekapitulasi lintas sekolah |
| **Wali Kelas** | Satu akun per wali kelas; satu wali kelas hanya memegang satu kelas | Hanya viewer: melihat dan mengunduh laporan status dan riwayat tunggakan siswa di kelas yang diampunya, real-time. Tidak dapat mengubah data dan tidak melihat riwayat pembayaran |

Staf Keuangan dan Pengurus Yayasan adalah satu peran dengan hak akses yang sama, tetapi setiap petugas memakai akun sendiri sehingga transaksi dan perubahan data tercatat atas nama petugas yang login. Saat wali kelas berganti, rombel dialihkan ke akun wali kelas yang baru, dan akun itu langsung melihat laporan kelas tersebut.

## 6. Alur Bisnis Utama

1. **Persiapan tahun ajaran**: admin membuat tahun ajaran, rombel, dan tarif per sekolah dan tingkat (diinput manual). Siswa ditempatkan ke rombel.
2. **Penerbitan tagihan**: sistem menerbitkan tagihan per siswa sesuai tarif yang berlaku untuk tingkat dan jurusannya (tagihan bulanan dibuat per bulan sesuai semester).
3. **Penerimaan pembayaran**: siswa atau wali membayar ke kasir. Petugas mencari siswa, memilih tagihan (atau membiarkan sistem melunasi dari tagihan tertua), memasukkan nominal, lalu menyimpan. Kelebihan bayar dicatat sebagai saldo siswa.
4. **Kuitansi**: sistem membuat nomor kuitansi unik secara otomatis dan mencetaknya di printer thermal.
5. **Pemantauan**: wali kelas membuka laporan status dan riwayat tunggakan kelasnya untuk mengingatkan siswa agar segera membayar; pengurus membuka rekap keuangan.
6. **Kenaikan kelas**: pada akhir tahun ajaran, siswa dipindah ke rombel tingkat berikutnya. Tunggakan tidak menghalangi kenaikan kelas, hanya memunculkan peringatan. Tagihan yang belum lunas tidak dipindah atau disalin, tetap melekat pada siswa dan terbawa otomatis.

## 7. Kebutuhan Fungsional

### 7.1 Autentikasi dan Pengguna

- **FR-AUTH-01**: Login dengan username dan password; sesi berakhir otomatis setelah tidak aktif.
- **FR-AUTH-02**: Pembatasan akses berdasarkan peran, ditegakkan di sisi server (bukan hanya menyembunyikan menu).
- **FR-AUTH-03**: Peran Staf Keuangan/Pengurus dapat membuat, menonaktifkan, dan mereset password akun petugas dan akun wali kelas.
- **FR-AUTH-04**: Pembatasan percobaan login gagal (rate limiting).
- **FR-AUTH-05**: Setiap akun wali kelas terhubung ke tepat satu rombel; saat wali kelas berganti, rombel dialihkan ke akun yang baru dan akun itu langsung melihat laporan kelas tersebut.

### 7.2 Data Master

- **FR-MST-01**: CRUD sekolah (saat ini 2: SMP Teknologi Tenggarong, SMK Geologi Pertambangan Tenggarong).
- **FR-MST-02**: CRUD tahun ajaran dengan satu tahun ajaran aktif.
- **FR-MST-03**: CRUD jurusan per sekolah (SMP tidak memiliki jurusan).
- **FR-MST-04**: CRUD rombel/kelas per sekolah dan tahun ajaran: tingkat, jurusan (jika ada), nama rombel, wali kelas.
- **FR-MST-05**: CRUD siswa: NIS, NISN, nama, jenis kelamin, tanggal lahir, sekolah, jurusan, nama orang tua/wali, nomor HP wali, tahun masuk, status (aktif, lulus, pindah, keluar).
- **FR-MST-06**: Riwayat penempatan siswa per tahun ajaran (siswa-rombel).
- **FR-MST-07**: Impor siswa dari Excel dengan validasi dan laporan baris gagal.
- **FR-MST-08**: CRUD jenis pembayaran yang diinput admin (mis. SPP, Partisipasi, Praktek, Seragam, Asuransi, Prakerin, Ujikom, Perpisahan, Foto); jenis baru dapat ditambah kapan saja karena akan ada iuran pendidikan lain.

### 7.3 Tarif

- **FR-TRF-01**: Tarif diinput manual oleh admin per sekolah (SMP dan SMK), tahun ajaran, jenis pembayaran, dan tingkat. Atribut: semester (opsional), nominal, pola penagihan (bulanan, sekali bayar, tahunan, cicilan, paket), batas pelunasan (tingkat atau akhir masa sekolah, opsional), keterangan.
- **FR-TRF-02**: Target jurusan fleksibel: semua jurusan, jurusan tertentu saja, atau semua kecuali jurusan tertentu.
- **FR-TRF-03**: Tarif dapat disalin dari tahun ajaran sebelumnya lalu disesuaikan.
- **FR-TRF-04**: Perubahan tarif tidak mengubah tagihan yang sudah terbit (nominal tagihan disimpan pada tagihan).
- **FR-TRF-05**: Tarif bertipe cicilan (mis. Partisipasi kelas 10 Rp3.000.000) menghasilkan satu tagihan yang dibayar bertahap dengan nominal bebas, tanpa jatuh tempo pasti hingga siswa lulus, dan tanpa denda.
- **FR-TRF-06**: Skema yang berbeda dicatat sebagai jenis pembayaran terpisah oleh admin (mis. Asuransi Rp100.000 per tahun dan Asuransi Paket Rp150.000 untuk 3 tahun); tagihan mengikuti apa yang diinput admin.

### 7.4 Tagihan

- **FR-TGH-01**: Generate tagihan massal per rombel atau per tarif; sistem melewati siswa yang sudah memiliki tagihan yang sama (idempoten).
- **FR-TGH-02**: Generate otomatis tagihan bulanan sesuai semester (Ganjil/Genap); tagihan bulanan tidak memiliki jatuh tempo.
- **FR-TGH-03**: Tagihan manual per siswa dengan alasan (mis. tagihan khusus).
- **FR-TGH-04**: Tidak ada potongan, keringanan, beasiswa, atau denda keterlambatan; nominal tagihan sama dengan nominal tarif.
- **FR-TGH-05**: Status tagihan otomatis: Belum Bayar, Sebagian, Lunas, Dibatalkan.
- **FR-TGH-06**: Tagihan melekat pada siswa. Tahun ajaran dan tingkat pada tagihan hanya label asal tagihan, bukan penentu kepemilikan.
- **FR-TGH-07**: Halaman detail siswa menampilkan semua tagihan (termasuk tunggakan tahun ajaran sebelumnya), total tagihan, total terbayar, dan sisa.

### 7.5 Pembayaran

- **FR-PAY-01**: Cari siswa berdasarkan nama, NIS, atau NISN dengan hasil cepat.
- **FR-PAY-02**: Satu pembayaran dapat dialokasikan ke beberapa tagihan.
- **FR-PAY-03**: Pembayaran sebagian (cicilan) pada satu tagihan didukung.
- **FR-PAY-04**: Jika petugas tidak memilih tagihan, sistem otomatis melunasi dari tagihan dengan jatuh tempo/asal terlama (tunggakan lama lebih dulu).
- **FR-PAY-05**: Metode bayar: tunai, transfer (dengan nomor referensi dan tanggal).
- **FR-PAY-06**: Kelebihan bayar (nominal melebihi total sisa tagihan siswa) dicatat sebagai saldo siswa; mutasi saldo tercatat. Pemakaian saldo untuk melunasi tagihan dipilih petugas saat pembayaran (tidak otomatis). Saldo yang tersisa saat siswa lulus atau pindah dikembalikan kepada siswa/wali dan dicatat sebagai mutasi keluar.
- **FR-PAY-07**: Pembatalan (void) transaksi dengan alasan wajib; data tidak dihapus, status berubah menjadi Dibatalkan dan sisa tagihan dipulihkan.
- **FR-PAY-08**: Setiap transaksi mencatat petugas penginput secara otomatis dari akun yang sedang login, serta waktu pencatatan.
- **FR-PAY-09**: Transaksi tidak dapat diubah setelah disimpan; koreksi dilakukan lewat void dan input ulang.

### 7.6 Kuitansi

- **FR-KWT-01**: Nomor kuitansi dibuat otomatis oleh sistem, unik dan berurutan, dengan format `KW/{KODE_SEKOLAH}/{TAHUN}/{BULAN}/{URUT}` (yayasan tidak mensyaratkan format khusus).
- **FR-KWT-02**: Kuitansi memuat: identitas yayasan dan sekolah, nomor, tanggal, nama dan NIS siswa, rincian tagihan yang dibayar, nominal, terbilang, sisa tagihan, saldo (jika ada), metode bayar, nama petugas.
- **FR-KWT-03**: Tata letak kuitansi dirancang untuk printer thermal (awalnya 80 mm; lebar kertas dapat diganti ke 58 mm lewat pengaturan) dan dicetak langsung dari browser; cetak ulang diberi penanda “SALINAN”.
- **FR-KWT-04**: Kuitansi dari transaksi yang di-void ditandai “BATAL”.

### 7.7 Kenaikan Kelas dan Status Siswa

- **FR-KLS-01**: Proses kenaikan kelas massal per rombel: siswa dipindah ke rombel tahun ajaran baru; siswa tertentu dapat ditandai tinggal kelas.
- **FR-KLS-02**: Tunggakan tidak menghalangi kenaikan kelas; sistem hanya menampilkan peringatan daftar siswa bertunggakan sebelum proses dikonfirmasi.
- **FR-KLS-03**: Kelulusan dan perpindahan siswa mengubah status siswa; tagihan yang belum lunas tetap tercatat dan muncul di laporan tunggakan alumni/pindahan.

### 7.8 Laporan

- **FR-LAP-01** (Staf): Rekap penerimaan harian, mingguan, bulanan, dan rentang bebas; filter sekolah, jenis pembayaran, metode bayar.
- **FR-LAP-02** (Staf): Rekap penerimaan per jenis pembayaran dan per sekolah.
- **FR-LAP-03** (Staf): Laporan tunggakan seluruh sekolah dengan filter sekolah, jurusan, tingkat, rombel, jenis pembayaran, usia tunggakan.
- **FR-LAP-04** (Staf): Riwayat pembayaran per siswa.
- **FR-LAP-05** (Staf): Daftar transaksi yang dibatalkan dan log audit.
- **FR-LAP-06** (Wali Kelas): Laporan status dan riwayat tunggakan siswa di kelasnya: nama, NIS, jenis tunggakan (jenis tagihan, asal tahun ajaran, sisa), total tunggakan per siswa dan total kelas. Riwayat pembayaran tidak ditampilkan.
- **FR-LAP-07**: Semua laporan dapat diunduh (Excel dan PDF) dan datanya real-time.
- **FR-LAP-08**: Dashboard ringkas untuk Staf/Pengurus: total penerimaan hari ini dan bulan ini, total tunggakan, grafik penerimaan per sekolah.

## 8. Aturan Bisnis

1. Tagihan dimiliki siswa. Tunggakan siswa dihitung dari seluruh tagihan siswa yang belum lunas, tanpa filter tahun ajaran atau tingkat.
2. Tarif bergantung pada sekolah, tahun ajaran, tingkat, dan jurusan. Perubahan tarif hanya berlaku untuk tagihan baru.
3. Nominal uang disimpan sebagai bilangan bulat rupiah (tanpa pecahan) atau `numeric` dengan presisi tetap, bukan tipe floating point.
4. Pembayaran tidak boleh dihapus; hanya dapat dibatalkan (void) dengan alasan.
5. Nomor kuitansi tidak boleh duplikat dan tidak boleh dipakai ulang, termasuk untuk transaksi yang dibatalkan.
6. Satu wali kelas hanya memegang satu rombel dan hanya dapat melihat siswa di rombel itu pada tahun ajaran aktif; wali kelas pengganti langsung melihat laporan rombel yang sama.
7. Tagihan bulanan dibuat per bulan sesuai semester tarif (Ganjil atau Genap) dan tidak memiliki jatuh tempo.
8. Pelunasan otomatis mengikuti urutan tagihan terlama lebih dulu.
9. Tidak ada potongan, keringanan, beasiswa, maupun denda keterlambatan.
10. Kelebihan bayar dicatat sebagai saldo siswa.
11. Tunggakan tidak menghalangi kenaikan kelas dan hanya memunculkan peringatan. Tindakan terhadap tunggakan (mis. penahanan ijazah) dilakukan di luar sistem.
12. Zona waktu aplikasi: WITA (Asia/Makassar).

## 9. Model Data (Tabel Utama)

Semua tabel memiliki `id` (UUID atau bigserial), `created_at`, `updated_at`. Data transaksi tidak dihapus fisik.

### 9.1 Master

| Tabel | Kolom utama |
| --- | --- |
| `sekolah` | kode, nama, jenjang (SMP/SMK), alamat, aktif |
| `tahun_ajaran` | nama (mis. 2026/2027), tanggal\_mulai, tanggal\_selesai, is\_aktif |
| `jurusan` | sekolah\_id, kode, nama, aktif |
| `rombel` | sekolah\_id, tahun\_ajaran\_id, jurusan\_id (nullable), tingkat, nama, wali\_kelas\_user\_id (nullable; satu akun hanya untuk satu rombel per tahun ajaran) |
| `siswa` | nis, nisn, nama, jenis\_kelamin, tanggal\_lahir, sekolah\_id, jurusan\_id (nullable), nama\_wali, no\_hp\_wali, tahun\_masuk, status |
| `siswa_rombel` | siswa\_id, rombel\_id, tahun\_ajaran\_id (riwayat penempatan) |
| `jenis_pembayaran` | kode, nama, aktif (ditambah admin sesuai kebutuhan) |
| `tarif` | sekolah\_id, tahun\_ajaran\_id, jenis\_pembayaran\_id, tingkat, semester (nullable), nominal, pola\_penagihan (bulanan, sekali\_bayar, tahunan, cicilan, paket), batas\_lunas (nullable), keterangan |
| `tarif_jurusan` | tarif\_id, jurusan\_id, is\_exclude |
| `pengguna` | username, password\_hash, nama, peran (keuangan\_pengurus, wali\_kelas), aktif, last\_login\_at |

### 9.2 Transaksi

| Tabel | Kolom utama |
| --- | --- |
| `tagihan` | siswa\_id, tarif\_id (nullable untuk tagihan manual), tahun\_ajaran\_id, tingkat, periode\_ke (bulan/angsuran, nullable), jatuh\_tempo (nullable), nominal\_tagihan, total\_terbayar, status |
| `pembayaran` | nomor\_kuitansi, siswa\_id, tanggal\_bayar, metode, nomor\_referensi, total\_bayar, kelebihan\_ke\_saldo, petugas\_id, status (aktif, batal), alasan\_batal, dibatalkan\_at |
| `pembayaran_detail` | pembayaran\_id, tagihan\_id, nominal\_dialokasikan |
| `saldo_siswa_mutasi` | siswa\_id, tipe (masuk, keluar), nominal, pembayaran\_id (nullable), tagihan\_id (nullable), keterangan |
| `audit_log` | pengguna\_id, aksi, entitas, entitas\_id, data\_sebelum, data\_sesudah, ip\_address, waktu |
| `nomor_urut_kuitansi` | sekolah\_id, tahun, bulan, urutan\_terakhir |

### 9.3 Relasi Penting

- `tagihan.siswa_id` adalah pemilik tagihan; `tahun_ajaran_id` dan `tingkat` hanya label asal.
- `pembayaran_detail` menghubungkan satu pembayaran ke banyak tagihan, dan satu tagihan ke banyak pembayaran (cicilan).
- Wali kelas melihat siswa melalui `rombel.wali_kelas_user_id` lalu `siswa_rombel`.
- Tunggakan = tagihan milik siswa dengan status bukan Lunas dan bukan Dibatalkan.
- Saldo siswa = total mutasi masuk dikurangi total mutasi keluar di `saldo_siswa_mutasi`; kelebihan bayar menambah mutasi masuk.

## 10. Kebutuhan Non-Fungsional

- **Keamanan**: HTTPS wajib; password di-hash dengan algoritma kuat bawaan pustaka autentikasi; validasi otorisasi peran di server; perlindungan CSRF dan XSS; query berparameter; pembatasan percobaan login.
- **Privasi**: data keuangan siswa hanya dapat diakses sesuai peran; wali kelas hanya melihat kelasnya.
- **Integritas data**: transaksi pembayaran dan alokasi disimpan dalam satu transaksi database (atomik); penomoran kuitansi aman terhadap input bersamaan.
- **Audit**: setiap perubahan data penting dan void transaksi tercatat di `audit_log`.
- **Kinerja**: halaman daftar dan pencarian siswa dimuat kurang dari 2 detik untuk beberapa ribu siswa; laporan dengan paginasi sisi server.
- **Ketersediaan dan cadangan**: memanfaatkan backup otomatis dari penyedia PostgreSQL terkelola (retensi diperiksa pada paket yang dipilih), ekspor berkala bila perlu, dan uji pemulihan berkala.
- **Kegunaan**: antarmuka bahasa Indonesia, responsif (desktop utama, tablet/ponsel untuk wali kelas), format rupiah dan tanggal Indonesia.
- **Kompatibilitas**: browser modern (Chrome, Edge, Firefox, Safari versi terbaru).

## 11. Arsitektur dan Teknologi

- **Framework**: Nuxt.js (versi stabil terbaru) untuk frontend dan backend sekaligus lewat server routes (Nitro).
- **Database**: PostgreSQL pada penyedia terkelola yang dapat diakses dari Vercel; kemungkinan besar Neon (belum final). Batas koneksi dan retensi backup diperiksa pada paket yang dipilih.
- **ORM**: Drizzle ORM dengan skema TypeScript dan migrasi berversi (drizzle-kit); driver koneksi disesuaikan dengan lingkungan serverless dan penyedia database.
- **Autentikasi**: Better Auth dengan sesi cookie httpOnly dan adapter Drizzle; peran keuangan\_pengurus dan wali\_kelas ditegakkan di sisi server. Tabel pengguna disesuaikan dengan tabel milik Better Auth.
- **Pendukung** (rekomendasi, dapat disesuaikan): Zod untuk validasi input; Nuxt UI atau Tailwind untuk komponen; ExcelJS untuk ekspor Excel; kuitansi thermal berupa halaman HTML dengan CSS cetak sesuai lebar kertas, sehingga tidak butuh generator PDF berat di serverless.
- **Deployment**: Vercel, terhubung ke repositori GitHub; production dari branch `main`, preview deployment otomatis per pull request; variabel lingkungan dikelola di Vercel.
- **Lingkungan**: development lokal (PostgreSQL lokal atau Docker), preview, dan production, dengan database production yang terpisah.

### 11.1 Version Control (Git dan GitHub)

- Kode disimpan di repositori Git yang akan dikoneksikan ke GitHub.
- Branch `main` selalu siap rilis dan dilindungi; pekerjaan dilakukan di branch fitur (mis. `feat/pembayaran`, `fix/kuitansi`) lalu digabung lewat pull request.
- Pesan commit mengikuti Conventional Commits (mis. `feat: tambah input pembayaran`).
- `.gitignore` mengecualikan `.env`, `node_modules`, `.nuxt`, dan `.output`; repositori menyertakan `.env.example` tanpa nilai rahasia.
- Skema dan migrasi Drizzle ikut di repositori sehingga struktur database dapat dibangun ulang dari kode.

## 12. Rencana Rilis

| Fase | Isi |
| --- | --- |
| **Fase 1 (MVP)** | Setup repositori Git/GitHub, proyek Nuxt + Drizzle + PostgreSQL, deploy awal ke Vercel; autentikasi dan peran, data master (sekolah, tahun ajaran, jurusan, rombel, siswa, jenis pembayaran, tarif), generate tagihan, input pembayaran dan saldo, kuitansi thermal, riwayat siswa |
| **Fase 2** | Laporan rekapitulasi dan tunggakan, akun dan laporan wali kelas, ekspor Excel/PDF, dashboard |
| **Fase 3** | Kenaikan kelas massal, impor Excel siswa, audit log lengkap, penyempurnaan dan pelatihan pengguna |
| **Pasca-rilis (opsional)** | Notifikasi WhatsApp, portal orang tua, pembayaran online |

## 13. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Tarif salah input atau berubah | Tagihan salah terbit | Admin memeriksa tarif sebelum generate tagihan; nominal disimpan di tagihan agar perubahan tarif tidak berdampak mundur |
| Data siswa awal tidak rapi | Impor gagal atau duplikat | Template impor, validasi NIS/NISN unik, laporan baris gagal |
| Kehilangan data | Pembukuan rusak | Backup otomatis dari penyedia database, ekspor berkala, uji pemulihan |
| Void transaksi disalahgunakan | Saldo kas tidak cocok | Alasan void wajib, tercatat di audit log atas nama akun petugas |
| Batas waktu eksekusi fungsi serverless di Vercel | Laporan atau ekspor besar bisa gagal | Paginasi sisi server, query berindeks, ekspor dibatasi per periode atau per sekolah |
| Lebar kertas dan driver printer thermal berbeda | Kuitansi terpotong atau tidak terbaca | Lebar kertas dapat diatur di CSS cetak; uji di printer yang dipakai sebelum rilis |
| Pengguna sulit beradaptasi | Sistem tidak dipakai | Pelatihan singkat, panduan penggunaan, antarmuka sederhana |

## 14. Keputusan, Asumsi, dan Pertanyaan Terbuka

**Keputusan dari yayasan**

| Topik | Keputusan |
| --- | --- |
| Tarif SMP dan SMK | Diinput manual oleh admin per sekolah, tingkat, dan tahun ajaran; file daftar pembayaran SMK adalah contoh data nyata |
| SPP dan iuran lain | SPP hanya salah satu jenis pembayaran; admin menambah jenis pembayaran lain sesuai kebutuhan |
| Partisipasi kelas 10 | Satu tagihan Rp3.000.000 yang dibayar bertahap, tanpa jatuh tempo pasti hingga lulus dan tanpa denda; tindakan bila belum lunas dilakukan di luar sistem |
| Asuransi | Dua skema (Rp100.000 per tahun dan paket Rp150.000 untuk 3 tahun) diinput admin sebagai dua jenis pembayaran |
| Ujikom kelas 12 | Dibayar di kelas 12 |
| Potongan, keringanan, beasiswa | Tidak ada |
| Denda keterlambatan | Tidak ada |
| Jatuh tempo tagihan bulanan | Tidak ada |
| Kelebihan bayar | Dicatat sebagai saldo siswa; pemakaian saldo dipilih petugas saat pembayaran; saldo tersisa saat lulus atau pindah dikembalikan |
| Tunggakan dan kenaikan kelas | Tidak memengaruhi kenaikan kelas, hanya peringatan |
| Kuitansi | Printer thermal, awalnya 80 mm dan dapat diganti ke 58 mm; nomor dibuat otomatis oleh sistem |
| Akun | Akun terpisah per petugas; Staf Keuangan/Pengurus Yayasan dijadikan satu peran |
| Wali kelas | Satu wali kelas satu kelas; wali kelas pengganti langsung melihat laporan kelas yang dipegang |
| Laporan wali kelas | Hanya status dan riwayat tunggakan serta jenis tunggakan, tanpa riwayat pembayaran |
| Teknologi | Nuxt.js, PostgreSQL, Drizzle ORM, Better Auth, deployment di Vercel; kode di Git dan GitHub |

**Asumsi**

- Pembayaran dilakukan langsung di kasir yayasan (tunai atau transfer) dan dicatat oleh petugas; belum ada pembayaran online.
- Tarif SMP diinput admin dengan cara yang sama seperti tarif SMK.
- Sistem hanya mencatat; penagihan dan tindakan atas tunggakan dilakukan di luar sistem.

**Keputusan yang belum final**

1. Penyedia PostgreSQL: kemungkinan Neon; perlu dipastikan paket, batas koneksi, dan retensi backup sebelum rilis.
2. Lebar kertas thermal: sementara 80 mm; dikonfirmasi ulang saat printer dipilih (sistem mendukung penggantian ke 58 mm).
