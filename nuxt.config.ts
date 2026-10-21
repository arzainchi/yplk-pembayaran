export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/fonts'],

  css: ['~/assets/css/main.css', '~/assets/css/print.css'],

  // Rilis awal hanya tema terang (design.md).
  ui: {
    colorMode: false,
  },

  fonts: {
    families: [
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'YPLK · Pembayaran Siswa',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Pencatatan tagihan dan pembayaran siswa YPLK' },
      ],
    },
  },
})
