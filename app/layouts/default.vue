<script setup lang="ts">
const sidebarOpen = useSidebarOpen()
</script>

<template>
  <div class="grid min-h-screen grid-cols-1 lg:grid-cols-[296px_minmax(0,1fr)] max-[1400px]:lg:grid-cols-[250px_minmax(0,1fr)]">
    <AppSidebar />

    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-[rgba(23,23,43,.35)] lg:hidden"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />

    <div class="flex min-w-0 flex-col">
      <AppTopbar />
      <main class="mx-auto w-full max-w-[1600px] px-5 pb-[30px] pt-[22px] sm:px-7">
        <slot />
      </main>
    </div>

    <ClientOnly>
      <AppSearch />
    </ClientOnly>
  </div>
</template>
