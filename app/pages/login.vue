<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ layout: 'blank', title: 'Masuk' })

const route = useRoute()
const { user, signIn } = useAuth()
const isSubmitting = ref(false)
const formError = ref('')

const schema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
})

const state = reactive({ username: '', password: '' })

async function onSubmit() {
  formError.value = ''
  isSubmitting.value = true
  try {
    await signIn(state.username, state.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    await navigateTo(redirect || (user.value?.role === 'wali_kelas' ? '/laporan/tunggakan-kelas' : '/'))
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Gagal masuk. Silakan coba lagi.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen place-items-center px-4 py-10">
    <div class="w-full max-w-[400px]">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <div class="grid size-14 place-items-center rounded-[16px] bg-[var(--color-primary-soft)]">
          <UIcon name="lucide:school" class="size-8 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <h1 class="text-title font-bold text-[var(--color-text)]">YPLK · Pembayaran Siswa</h1>
        <p class="text-sm text-[var(--color-text-muted)]">
          Masuk dengan akun petugas atau wali kelas.
        </p>
      </div>

      <div class="rounded-[18px] bg-[var(--color-surface-subtle)] p-2 shadow-[0_1px_2px_rgba(23,23,43,.04)]">
        <div class="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
            <UFormField label="Username" name="username" required>
              <UInput
                v-model="state.username"
                icon="lucide:user-round"
                size="lg"
                class="w-full"
                placeholder="mis. admin"
                autocomplete="username"
              />
            </UFormField>

            <UFormField label="Password" name="password" required>
              <UInput
                v-model="state.password"
                type="password"
                icon="lucide:lock"
                size="lg"
                class="w-full"
                placeholder="••••••••"
                autocomplete="current-password"
              />
            </UFormField>

            <UAlert
              v-if="formError"
              color="error"
              variant="subtle"
              icon="lucide:circle-alert"
              :title="formError"
            />

            <UButton
              type="submit"
              block
              size="lg"
              icon="lucide:log-in"
              :loading="isSubmitting"
            >
              Masuk
            </UButton>
          </UForm>
        </div>
      </div>

      <p class="mt-4 text-center text-xs text-[var(--color-text-subtle)]">
        Setiap petugas memiliki akun sendiri agar transaksi tercatat atas namanya.
      </p>
    </div>
  </div>
</template>
