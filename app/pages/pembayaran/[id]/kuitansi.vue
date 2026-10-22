<script setup lang="ts">
definePageMeta({ layout: 'print', title: 'Kuitansi' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const reprint = computed(() => route.query.salinan === '1')

const { data, pending } = useLazyFetch<any>(() => `/api/pembayaran/${id.value}`, { default: () => null })

useHead({ title: () => `Kuitansi ${data.value?.pembayaran?.nomorKuitansi ?? ''}` })

const width = ref('80mm')

function injectPageSize() {
  let el = document.getElementById('y-page-size') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'y-page-size'
    document.head.appendChild(el)
  }
  el.textContent = `@page { size: ${width.value} auto; margin: 4mm; } .receipt { --receipt-width: ${width.value}; }`
}

onMounted(() => {
  const saved = localStorage.getItem('yplk.receiptWidth')
  if (saved === '58mm' || saved === '80mm') width.value = saved
  injectPageSize()
  setTimeout(() => window.print(), 350)
})

watch(width, () => {
  localStorage.setItem('yplk.receiptWidth', width.value)
  injectPageSize()
})
</script>

<template>
  <div class="py-6">
    <div class="no-print mx-auto mb-5 flex w-full max-w-[80mm] flex-wrap items-center justify-between gap-2">
      <UButton icon="lucide:arrow-left" color="neutral" variant="ghost" size="sm" to="/pembayaran">Kembali</UButton>
      <div class="flex items-center gap-2">
        <USelect
          v-model="width"
          :items="[{ label: '80 mm', value: '80mm' }, { label: '58 mm', value: '58mm' }]"
          size="sm"
          class="w-[110px]"
        />
        <UButton icon="lucide:printer" size="sm" @click="() => window.print()">Cetak</UButton>
      </div>
    </div>

    <div v-if="pending && !data" class="no-print text-center text-sm text-[var(--color-text-subtle)]">Memuat kuitansi…</div>
    <YReceipt v-else-if="data" :data="data" :reprint="reprint" />
  </div>
</template>
