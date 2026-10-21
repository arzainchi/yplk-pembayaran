<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    data: any
    reprint?: boolean
  }>(),
  { reprint: false },
)

const bayar = computed(() => props.data?.pembayaran ?? {})
const detail = computed<any[]>(() => props.data?.detail ?? [])
const batal = computed(() => bayar.value.status === 'batal')
</script>

<template>
  <div class="receipt" :class="{ 'receipt--batal': batal }">
    <div class="receipt__head">
      <p class="receipt__yayasan">Yayasan Pendidikan Latimojong Kukar</p>
      <p class="receipt__sekolah">{{ bayar.sekolahNama }}</p>
      <p class="receipt__addr">Tenggarong, Kutai Kartanegara</p>
    </div>

    <div class="receipt__title">
      <span>KUITANSI</span>
      <span v-if="batal" class="receipt__mark receipt__mark--batal">BATAL</span>
      <span v-else-if="reprint" class="receipt__mark">SALINAN</span>
    </div>

    <div class="receipt__meta">
      <div><span>No.</span><span class="tnum">{{ bayar.nomorKuitansi }}</span></div>
      <div><span>Tanggal</span><span>{{ formatTanggalJam(bayar.tanggalBayar) }}</span></div>
      <div><span>Nama</span><span>{{ bayar.siswaNama }}</span></div>
      <div><span>NIS</span><span class="tnum">{{ bayar.siswaNis }}</span></div>
    </div>

    <div class="receipt__sep" />

    <table class="receipt__table">
      <tbody>
        <tr v-for="(d, i) in detail" :key="i">
          <td>
            {{ d.jenisNama ?? d.keterangan ?? 'Tagihan' }}
            <template v-if="d.periodeKe"> · {{ periodeLabel(d.periodeKe) }}</template>
            <template v-else-if="d.semester"> · {{ semesterLabel(d.semester) }}</template>
          </td>
          <td class="tnum">{{ formatRupiah(d.nominalDialokasikan) }}</td>
        </tr>
        <tr v-if="detail.length === 0">
          <td colspan="2">Tidak ada rincian.</td>
        </tr>
      </tbody>
    </table>

    <div class="receipt__sep" />

    <div class="receipt__row receipt__row--total">
      <span>TOTAL</span>
      <span class="tnum">{{ formatRupiah(bayar.totalBayar) }}</span>
    </div>
    <p class="receipt__terbilang">{{ terbilang(bayar.totalBayar) }}</p>

    <div class="receipt__row">
      <span>Sisa tagihan</span>
      <span class="tnum">{{ formatRupiah(data?.sisaTagihan ?? 0) }}</span>
    </div>
    <div v-if="(data?.saldo ?? 0) !== 0" class="receipt__row">
      <span>Saldo siswa</span>
      <span class="tnum">{{ formatRupiah(data?.saldo ?? 0) }}</span>
    </div>
    <div class="receipt__row">
      <span>Metode bayar</span>
      <span>{{ METODE_BAYAR[bayar.metode] ?? bayar.metode }}<template v-if="bayar.nomorReferensi"> · {{ bayar.nomorReferensi }}</template></span>
    </div>

    <div class="receipt__sep" />

    <div class="receipt__row">
      <span>Petugas</span>
      <span>{{ bayar.petugasNama }}</span>
    </div>
    <p v-if="batal" class="receipt__batalnote">
      Dibatalkan: {{ bayar.alasanBatal }}
    </p>
    <p class="receipt__thanks">Terima kasih atas pembayaran Anda.</p>
  </div>
</template>

<style scoped>
.receipt {
  width: var(--receipt-width, 80mm);
  max-width: var(--receipt-width, 80mm);
  margin: 0 auto;
  padding: 3mm 1mm;
  background: #fff;
  color: #000;
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.35;
}
.receipt--batal {
  border: 1px dashed #000;
}
.receipt__head {
  text-align: center;
  margin-bottom: 4px;
}
.receipt__yayasan {
  font-weight: 700;
  font-size: 12.5px;
}
.receipt__sekolah {
  font-weight: 600;
}
.receipt__addr {
  font-size: 11px;
}
.receipt__title {
  display: flex;
  justify-content: center;
  gap: 6px;
  align-items: center;
  margin: 6px 0;
  font-weight: 700;
  letter-spacing: .12em;
}
.receipt__mark {
  font-size: 10px;
  font-weight: 700;
  border: 1px solid #000;
  padding: 0 3px;
  letter-spacing: .06em;
}
.receipt__mark--batal {
  background: #000;
  color: #fff;
}
.receipt__meta div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.receipt__meta div > span:first-child {
  color: #000;
}
.receipt__sep {
  border-top: 1px dashed #000;
  margin: 5px 0;
}
.receipt__table {
  width: 100%;
  border-collapse: collapse;
}
.receipt__table td {
  vertical-align: top;
  padding: 1px 0;
}
.receipt__table td:last-child {
  text-align: right;
  white-space: nowrap;
}
.receipt__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 1px 0;
}
.receipt__row--total {
  font-weight: 700;
  font-size: 14px;
}
.receipt__terbilang {
  font-style: italic;
  font-size: 11px;
  margin: 2px 0 4px;
}
.receipt__batalnote {
  font-weight: 600;
  margin-top: 4px;
}
.receipt__thanks {
  text-align: center;
  margin-top: 8px;
  font-size: 11px;
}
</style>
