<template>
  <div
    v-if="config.filterBarMode === 'open'"
    ref="filterBarElement"
    class="filter-bar"
  >
    <FilterControls />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import FilterControls from "~/components/FilterControls.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config } = useImageTaggerContext();
const filterBarElement = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

function updateFilterBarOffset(): void {
  const height = config.filterBarMode === "open" ? filterBarElement.value?.offsetHeight ?? 0 : 0;
  document.documentElement.style.setProperty("--app-filter-bar-height", `${height}px`);
}

function observeFilterBar(): void {
  resizeObserver?.disconnect();
  resizeObserver = null;

  if (filterBarElement.value) {
    resizeObserver = new ResizeObserver(updateFilterBarOffset);
    resizeObserver.observe(filterBarElement.value);
  }
}

onMounted(() => {
  void nextTick(() => {
    observeFilterBar();
    updateFilterBarOffset();
  });
});

watch(
  () => config.filterBarMode,
  () => {
    void nextTick(() => {
      observeFilterBar();
      updateFilterBarOffset();
    });
  }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  document.documentElement.style.removeProperty("--app-filter-bar-height");
});
</script>

<style scoped lang="scss">
.filter-bar {
  position: sticky;
  top: calc(var(--app-header-height, 0px) + var(--app-runtime-status-height, 0px));
  z-index: 998;
  margin: var(--app-space-layout) 0 0;
  padding: var(--app-space-button-y) var(--app-space-panel);
  border: 1px solid var(--border);
  border-radius: var(--control-radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}
</style>
