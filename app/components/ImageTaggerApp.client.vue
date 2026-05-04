<template>
  <div ref="appRoot" class="app-shell" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { createImageTaggerApp } from "~/utils/createImageTaggerApp";

const appRoot = ref(null);
let cleanup = null;

onMounted(() => {
  if (!appRoot.value) {
    return;
  }

  cleanup = createImageTaggerApp(appRoot.value);
});

onBeforeUnmount(() => {
  cleanup?.();
});
</script>
