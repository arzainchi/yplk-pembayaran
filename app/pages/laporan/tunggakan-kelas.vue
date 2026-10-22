<script setup lang="ts">
definePageMeta({ title: 'Tunggakan Kelas' })

const { data, pending } = useLazyFetch<any>('/api/laporan/tunggakan-kelas', {
  default: () => ({ rombel: null, items: [], total: 0, jumlahSiswa: 0 }),
})

const columns: YColumn[] = [
  { key: 'siswaNama', label: 'Siswa' },
  { key: 'nis', label: 'NIS', width: '130px' },
  { key: 'rincian', label: 'Jenis tunggakan & asal tahun ajaran' },
  { key: 'total', label: 'Total tunggakan', align: 'right', width: '170px' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p v-if="data?.rombel" class="text-base text-[var(--color-text-muted)]">
          <strong class="text-[var(--color-text)]">{{ rombelLabel(data.rombel.tingkat, data.rombel.nama) }}</strong>
        </p>
        <p v-else class="text-sm text-[var(--color-text-subtle)]">Anda belum ditugaskan sebagai wali kelas pada tahun ajaran aktif.</p>
      </div>
      <UButton
        v-if="data?.rombel"
        icon="lucide:file-spreadsheet"
        color="neutral"
        variant="outline"
        to="/api/laporan/tunggakan-kelas.xlsx"
        external
      >
        Unduh Excel
      </UButton>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <YKpi label="Total tunggakan kelas" :value="formatRupiah(data?.total ?? 0)" icon="lucide:triangle-alert" />
      <YKpi label="Siswa bertunggakan" :value="String(data?.jumlahSiswa ?? 0)" icon="lucide:users" />
    </div>

    <YCard v-if="data?.rombel" description="Menampilkan status dan riwayat tunggakan siswa di kelas Anda (real-time).">
      <!-- Tabel untuk layar lebar -->
      <div class="hidden md:block">
        <YTable :columns="columns" :rows="data?.items ?? []" :loading="pending" empty="Tidak ada tunggakan di kelas ini.">
          <template #cell-rincian="{ row }">
            <ul class="space-y-1">
              <li v-for="(r, i) in row.rincian" :key="i" class="flex flex-wrap items-center gap-2 text-sm">
                <span class="text-[var(--color-text-muted)]">{{ r.jenis }} · {{ r.tahunAjaran }}</span>
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                  :style="r.lampau
                    ? { color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' }
                    : { color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }"
                >
                  <UIcon :name="r.lampau ? 'lucide:triangle-alert' : 'lucide:clock'" class="size-3" aria-hidden="true" />
                  {{ r.lampau ? 'Tahun sebelumnya' : 'Tahun berjalan' }}
                </span>
                <span class="tnum font-semibold">{{ formatRupiah(r.sisa) }}</span>
              </li>
            </ul>
          </template>
          <template #cell-total="{ value }">
            <span class="tnum font-bold text-[var(--color-danger)]">{{ formatRupiah(value as number) }}</span>
          </template>
        </YTable>
      </div>

      <!-- Kartu untuk ponsel (≤640px) -->
      <div class="space-y-3 md:hidden">
        <div v-if="!(data?.items ?? []).length" class="py-8 text-center text-sm text-[var(--color-text-subtle)]">
          Tidak ada tunggakan di kelas ini.
        </div>
        <div
          v-for="row in data?.items ?? []"
          :key="row.siswaId"
          class="rounded-md border border-[var(--color-border)] p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-semibold">{{ row.siswaNama }}</p>
              <p class="text-sm text-[var(--color-text-subtle)]">{{ row.nis }}</p>
            </div>
            <span class="tnum shrink-0 font-bold text-[var(--color-danger)]">{{ formatRupiah(row.total) }}</span>
          </div>
          <ul class="mt-2 space-y-1">
            <li v-for="(r, i) in row.rincian" :key="i" class="flex items-center justify-between gap-2 text-sm">
              <span class="truncate text-[var(--color-text-muted)]">{{ r.jenis }} · {{ r.tahunAjaran }}</span>
              <span class="tnum shrink-0">{{ formatRupiah(r.sisa) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </YCard>
  </div>
</template>
