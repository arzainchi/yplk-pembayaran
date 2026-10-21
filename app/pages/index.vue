<script setup lang="ts">
definePageMeta({ title: 'Dashboard' })

const summary = await useFetch<any>('/api/dashboard/summary', {
  default: () => ({
    hariIni: 0, hariIniDelta: 0, bulanIni: 0, bulanIniDelta: 0,
    totalTunggakan: 0, siswaBertunggakan: 0, chart: { labels: [], series: [] },
  }),
})

const filterSekolah = ref('all')

const chartSeries = computed(() => {
  const all = summary.data.value?.chart?.series ?? []
  return filterSekolah.value === 'all' ? all : all.filter((s: any) => s.name === filterSekolah.value)
})

const sekolahOptions = computed(() => [
  { label: 'Semua sekolah', value: 'all' },
  ...(summary.data.value?.chart?.series ?? []).map((s: any) => ({ label: s.name, value: s.name })),
])
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <YKpi
        label="Penerimaan hari ini"
        :value="formatRupiah(summary.data.value?.hariIni)"
        :delta="summary.data.value?.hariIniDelta"
        good-when="up"
        icon="lucide:wallet"
        footer-label="dibanding kemarin"
      />
      <YKpi
        label="Penerimaan bulan ini"
        :value="formatRupiah(summary.data.value?.bulanIni)"
        :delta="summary.data.value?.bulanIniDelta"
        good-when="up"
        icon="lucide:calendar-check"
        footer-label="dibanding bulan lalu"
      />
      <YKpi
        label="Total tunggakan"
        :value="formatRupiah(summary.data.value?.totalTunggakan)"
        icon="lucide:triangle-alert"
        :footer-value="String(summary.data.value?.siswaBertunggakan ?? 0)"
        footer-label="siswa bertunggakan"
      />
      <YKpi
        label="Siswa bertunggakan"
        :value="String(summary.data.value?.siswaBertunggakan ?? 0)"
        icon="lucide:users"
        footer-label="dari seluruh sekolah"
      />
    </div>

    <YCard title="Penerimaan per bulan" description="12 bulan terakhir, satu seri per sekolah.">
      <template #actions>
        <USelect v-model="filterSekolah" :items="sekolahOptions" size="sm" class="w-[200px]" />
      </template>
      <YChart
        v-if="summary.data.value?.chart?.labels?.length"
        :labels="summary.data.value.chart.labels"
        :series="chartSeries"
      />
    </YCard>

    <YCard title="Pintasan">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink to="/pembayaran/baru" class="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-hover)]">
          <UIcon name="lucide:banknote" class="size-6 text-[var(--color-primary)]" aria-hidden="true" />
          <span class="text-base font-semibold">Input pembayaran</span>
        </NuxtLink>
        <NuxtLink to="/tagihan" class="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-hover)]">
          <UIcon name="lucide:receipt-text" class="size-6 text-[var(--color-primary)]" aria-hidden="true" />
          <span class="text-base font-semibold">Generate tagihan</span>
        </NuxtLink>
        <NuxtLink to="/laporan/tunggakan" class="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-hover)]">
          <UIcon name="lucide:triangle-alert" class="size-6 text-[var(--color-primary)]" aria-hidden="true" />
          <span class="text-base font-semibold">Laporan tunggakan</span>
        </NuxtLink>
        <NuxtLink to="/siswa" class="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-hover)]">
          <UIcon name="lucide:users" class="size-6 text-[var(--color-primary)]" aria-hidden="true" />
          <span class="text-base font-semibold">Data siswa</span>
        </NuxtLink>
      </div>
    </YCard>
  </div>
</template>
