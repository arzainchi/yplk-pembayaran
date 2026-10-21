interface OpsiData {
  sekolah: Array<{ id: string; kode: string; nama: string; jenjang: string; aktif: boolean }>
  tahunAjaran: Array<{ id: string; nama: string; isAktif: boolean }>
  jurusan: Array<{ id: string; kode: string; nama: string; sekolahId: string; aktif: boolean }>
  rombel: Array<{
    id: string; nama: string; tingkat: number; sekolahId: string
    tahunAjaranId: string; jurusanId: string | null; waliKelasUserId: string | null
  }>
  jenisPembayaran: Array<{ id: string; kode: string; nama: string; aktif: boolean }>
  waliKelas: Array<{ id: string; name: string; username: string | null }>
}

const emptyOpsi: OpsiData = {
  sekolah: [], tahunAjaran: [], jurusan: [], rombel: [], jenisPembayaran: [], waliKelas: [],
}

export function useOpsi() {
  const { data, refresh, pending } = useFetch<OpsiData>('/api/opsi', {
    key: 'opsi',
    default: () => emptyOpsi,
  })

  const sekolahOptions = computed(() => (data.value?.sekolah ?? []).map((s) => ({ label: s.nama, value: s.id })))
  const tahunAjaranOptions = computed(() =>
    (data.value?.tahunAjaran ?? []).map((t) => ({ label: t.isAktif ? `${t.nama} · aktif` : t.nama, value: t.id })),
  )
  const jurusanOptions = computed(() => (data.value?.jurusan ?? []).map((j) => ({ label: j.nama, value: j.id })))
  const jenisOptions = computed(() => (data.value?.jenisPembayaran ?? []).map((j) => ({ label: j.nama, value: j.id })))
  const waliOptions = computed(() =>
    (data.value?.waliKelas ?? []).map((w) => ({ label: `${w.name}${w.username ? ` (${w.username})` : ''}`, value: w.id })),
  )
  const rombelOptions = computed(() =>
    (data.value?.rombel ?? []).map((r) => ({ label: rombelLabel(r.tingkat, r.nama), value: r.id })),
  )

  const tahunAjaranAktif = computed(() => data.value?.tahunAjaran?.find((t) => t.isAktif) ?? null)

  return {
    opsi: data,
    pending,
    refresh,
    sekolahOptions,
    tahunAjaranOptions,
    jurusanOptions,
    jenisOptions,
    waliOptions,
    rombelOptions,
    tahunAjaranAktif,
  }
}
