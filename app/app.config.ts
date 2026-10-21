export default defineAppConfig({
  ui: {
    // Pemetaan warna semantik Nuxt UI ke palet tema (design.md).
    // Nilai presisi (hex) diatur lewat variabel --ui-* di main.css.
    colors: {
      primary: 'brand',
      secondary: 'brand',
      success: 'green',
      info: 'blue',
      warning: 'amber',
      error: 'red',
      neutral: 'slate',
    },
    button: {
      slots: {
        base: 'font-semibold',
      },
    },
    badge: {
      slots: {
        base: 'font-semibold',
      },
    },
  },
})
