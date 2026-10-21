CREATE TYPE "public"."jenis_kelamin" AS ENUM('L', 'P');--> statement-breakpoint
CREATE TYPE "public"."jenjang" AS ENUM('SMP', 'SMK');--> statement-breakpoint
CREATE TYPE "public"."metode_bayar" AS ENUM('tunai', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."pola_penagihan" AS ENUM('bulanan', 'sekali_bayar', 'tahunan', 'cicilan', 'paket');--> statement-breakpoint
CREATE TYPE "public"."status_pembayaran" AS ENUM('aktif', 'batal');--> statement-breakpoint
CREATE TYPE "public"."status_siswa" AS ENUM('aktif', 'lulus', 'pindah', 'keluar');--> statement-breakpoint
CREATE TYPE "public"."status_tagihan" AS ENUM('belum_bayar', 'sebagian', 'lunas', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."tipe_mutasi_saldo" AS ENUM('masuk', 'keluar');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jenis_pembayaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jenis_pembayaran_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "jurusan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sekolah_id" uuid NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rombel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sekolah_id" uuid NOT NULL,
	"tahun_ajaran_id" uuid NOT NULL,
	"jurusan_id" uuid,
	"tingkat" integer NOT NULL,
	"nama" text NOT NULL,
	"wali_kelas_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sekolah" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"jenjang" "jenjang" NOT NULL,
	"alamat" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sekolah_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "siswa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nis" text NOT NULL,
	"nisn" text,
	"nama" text NOT NULL,
	"jenis_kelamin" "jenis_kelamin" NOT NULL,
	"tanggal_lahir" date,
	"sekolah_id" uuid NOT NULL,
	"jurusan_id" uuid,
	"nama_wali" text,
	"no_hp_wali" text,
	"tahun_masuk" integer NOT NULL,
	"status" "status_siswa" DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "siswa_nis_unique" UNIQUE("nis"),
	CONSTRAINT "siswa_nisn_unique" UNIQUE("nisn")
);
--> statement-breakpoint
CREATE TABLE "siswa_rombel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siswa_id" uuid NOT NULL,
	"rombel_id" uuid NOT NULL,
	"tahun_ajaran_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tahun_ajaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"tanggal_mulai" date NOT NULL,
	"tanggal_selesai" date NOT NULL,
	"is_aktif" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tahun_ajaran_nama_unique" UNIQUE("nama")
);
--> statement-breakpoint
CREATE TABLE "tarif" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sekolah_id" uuid NOT NULL,
	"tahun_ajaran_id" uuid NOT NULL,
	"jenis_pembayaran_id" uuid NOT NULL,
	"tingkat" integer NOT NULL,
	"semester" text,
	"nominal" bigint NOT NULL,
	"pola_penagihan" "pola_penagihan" NOT NULL,
	"batas_lunas" text,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarif_jurusan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarif_id" uuid NOT NULL,
	"jurusan_id" uuid NOT NULL,
	"is_exclude" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pengguna_id" text,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" text,
	"data_sebelum" jsonb,
	"data_sesudah" jsonb,
	"ip_address" text,
	"waktu" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nomor_urut_kuitansi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sekolah_id" uuid NOT NULL,
	"tahun" integer NOT NULL,
	"bulan" integer NOT NULL,
	"urutan_terakhir" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pembayaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomor_kuitansi" text NOT NULL,
	"siswa_id" uuid NOT NULL,
	"tanggal_bayar" timestamp DEFAULT now() NOT NULL,
	"metode" "metode_bayar" NOT NULL,
	"nomor_referensi" text,
	"total_bayar" bigint NOT NULL,
	"kelebihan_ke_saldo" bigint DEFAULT 0 NOT NULL,
	"petugas_id" text NOT NULL,
	"status" "status_pembayaran" DEFAULT 'aktif' NOT NULL,
	"alasan_batal" text,
	"dibatalkan_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pembayaran_nomor_kuitansi_unique" UNIQUE("nomor_kuitansi")
);
--> statement-breakpoint
CREATE TABLE "pembayaran_detail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pembayaran_id" uuid NOT NULL,
	"tagihan_id" uuid NOT NULL,
	"nominal_dialokasikan" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saldo_siswa_mutasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siswa_id" uuid NOT NULL,
	"tipe" "tipe_mutasi_saldo" NOT NULL,
	"nominal" bigint NOT NULL,
	"pembayaran_id" uuid,
	"tagihan_id" uuid,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siswa_id" uuid NOT NULL,
	"tarif_id" uuid,
	"tahun_ajaran_id" uuid NOT NULL,
	"tingkat" integer NOT NULL,
	"periode_ke" integer,
	"jatuh_tempo" date,
	"nominal_tagihan" bigint NOT NULL,
	"total_terbayar" bigint DEFAULT 0 NOT NULL,
	"status" "status_tagihan" DEFAULT 'belum_bayar' NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurusan" ADD CONSTRAINT "jurusan_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel" ADD CONSTRAINT "rombel_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel" ADD CONSTRAINT "rombel_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel" ADD CONSTRAINT "rombel_jurusan_id_jurusan_id_fk" FOREIGN KEY ("jurusan_id") REFERENCES "public"."jurusan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel" ADD CONSTRAINT "rombel_wali_kelas_user_id_user_id_fk" FOREIGN KEY ("wali_kelas_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_jurusan_id_jurusan_id_fk" FOREIGN KEY ("jurusan_id") REFERENCES "public"."jurusan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_rombel" ADD CONSTRAINT "siswa_rombel_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_rombel" ADD CONSTRAINT "siswa_rombel_rombel_id_rombel_id_fk" FOREIGN KEY ("rombel_id") REFERENCES "public"."rombel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_rombel" ADD CONSTRAINT "siswa_rombel_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif" ADD CONSTRAINT "tarif_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif" ADD CONSTRAINT "tarif_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif" ADD CONSTRAINT "tarif_jenis_pembayaran_id_jenis_pembayaran_id_fk" FOREIGN KEY ("jenis_pembayaran_id") REFERENCES "public"."jenis_pembayaran"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif_jurusan" ADD CONSTRAINT "tarif_jurusan_tarif_id_tarif_id_fk" FOREIGN KEY ("tarif_id") REFERENCES "public"."tarif"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif_jurusan" ADD CONSTRAINT "tarif_jurusan_jurusan_id_jurusan_id_fk" FOREIGN KEY ("jurusan_id") REFERENCES "public"."jurusan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_pengguna_id_user_id_fk" FOREIGN KEY ("pengguna_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomor_urut_kuitansi" ADD CONSTRAINT "nomor_urut_kuitansi_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_petugas_id_user_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_detail" ADD CONSTRAINT "pembayaran_detail_pembayaran_id_pembayaran_id_fk" FOREIGN KEY ("pembayaran_id") REFERENCES "public"."pembayaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_detail" ADD CONSTRAINT "pembayaran_detail_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saldo_siswa_mutasi" ADD CONSTRAINT "saldo_siswa_mutasi_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saldo_siswa_mutasi" ADD CONSTRAINT "saldo_siswa_mutasi_pembayaran_id_pembayaran_id_fk" FOREIGN KEY ("pembayaran_id") REFERENCES "public"."pembayaran"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saldo_siswa_mutasi" ADD CONSTRAINT "saldo_siswa_mutasi_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_tarif_id_tarif_id_fk" FOREIGN KEY ("tarif_id") REFERENCES "public"."tarif"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jurusan_sekolah_kode_uq" ON "jurusan" USING btree ("sekolah_id","kode");--> statement-breakpoint
CREATE UNIQUE INDEX "rombel_unik_uq" ON "rombel" USING btree ("tahun_ajaran_id","tingkat","nama","sekolah_id");--> statement-breakpoint
CREATE INDEX "rombel_wali_idx" ON "rombel" USING btree ("wali_kelas_user_id");--> statement-breakpoint
CREATE INDEX "siswa_nama_idx" ON "siswa" USING btree ("nama");--> statement-breakpoint
CREATE INDEX "siswa_sekolah_idx" ON "siswa" USING btree ("sekolah_id");--> statement-breakpoint
CREATE UNIQUE INDEX "siswa_rombel_unik_uq" ON "siswa_rombel" USING btree ("siswa_id","tahun_ajaran_id");--> statement-breakpoint
CREATE INDEX "siswa_rombel_rombel_idx" ON "siswa_rombel" USING btree ("rombel_id");--> statement-breakpoint
CREATE INDEX "tarif_scope_idx" ON "tarif" USING btree ("sekolah_id","tahun_ajaran_id","tingkat");--> statement-breakpoint
CREATE UNIQUE INDEX "tarif_jurusan_unik_uq" ON "tarif_jurusan" USING btree ("tarif_id","jurusan_id");--> statement-breakpoint
CREATE INDEX "audit_log_waktu_idx" ON "audit_log" USING btree ("waktu");--> statement-breakpoint
CREATE INDEX "audit_log_entitas_idx" ON "audit_log" USING btree ("entitas");--> statement-breakpoint
CREATE UNIQUE INDEX "nomor_urut_kuitansi_uq" ON "nomor_urut_kuitansi" USING btree ("sekolah_id","tahun","bulan");--> statement-breakpoint
CREATE INDEX "pembayaran_siswa_idx" ON "pembayaran" USING btree ("siswa_id");--> statement-breakpoint
CREATE INDEX "pembayaran_tanggal_idx" ON "pembayaran" USING btree ("tanggal_bayar");--> statement-breakpoint
CREATE INDEX "pembayaran_detail_pembayaran_idx" ON "pembayaran_detail" USING btree ("pembayaran_id");--> statement-breakpoint
CREATE INDEX "saldo_mutasi_siswa_idx" ON "saldo_siswa_mutasi" USING btree ("siswa_id");--> statement-breakpoint
CREATE INDEX "tagihan_siswa_status_idx" ON "tagihan" USING btree ("siswa_id","status");--> statement-breakpoint
CREATE INDEX "tagihan_tarif_idx" ON "tagihan" USING btree ("tarif_id");