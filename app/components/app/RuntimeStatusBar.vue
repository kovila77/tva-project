<template>
  <div ref="statusBarElement" class="runtime-status-bar">
    <HeaderPanelToggleButton v-if="isRightPanel" />
    <SidePanelToggleButton v-else />
    <span>Loaded: {{ images.length }}.</span>
    <span>Visible: {{ visibleImages.length }}.</span>
    <span>Tags: {{ tagStats.length }}.</span>
    <HistoryActionButton action="undo" variant="plain" />
    <HistoryActionButton action="redo" variant="plain" />
    <span class="runtime-status-bar__status" :class="{ 'runtime-status-bar__status--busy': isBusy }" :title="statusText">{{ statusText }}</span>
    <AppIconButton
      icon="filter"
      :title="filterToggleTitle"
      :aria-label="filterToggleTitle"
      :active="config.filterBarMode === 'open'"
      @click="toggleFilterBar"
    />
    <AppIconButton icon="settings" title="Open settings." aria-label="Open settings" @click="openSettingsModal()" />
    <SidePanelToggleButton v-if="isRightPanel" class="runtime-status-bar__end-toggle" />
    <HeaderPanelToggleButton v-else class="runtime-status-bar__end-toggle" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import HeaderPanelToggleButton from "~/components/app/HeaderPanelToggleButton.vue";
import HistoryActionButton from "~/components/app/HistoryActionButton.vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
import SidePanelToggleButton from "~/components/app/SidePanelToggleButton.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  images,
  visibleImages,
  tagStats,
  isBusy,
  statusText,
  config,
  openSettingsModal,
} = useImageTaggerContext();

const isRightPanel = computed(() => config.sidePanelPosition === "right");
const filterToggleTitle = computed(() => config.filterBarMode === "open" ? "Hide filter bar" : "Show filter bar");
const statusBarElement = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

function toggleFilterBar(): void {
  config.filterBarMode = config.filterBarMode === "open" ? "hidden" : "open";
}

function updateStatusBarOffset(): void {
  const height = statusBarElement.value?.offsetHeight ?? 0;
  document.documentElement.style.setProperty("--app-runtime-status-height", `${height}px`);
}

onMounted(() => {
  void nextTick(updateStatusBarOffset);
  if (statusBarElement.value) {
    resizeObserver = new ResizeObserver(updateStatusBarOffset);
    resizeObserver.observe(statusBarElement.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  document.documentElement.style.removeProperty("--app-runtime-status-height");
});
</script>

<style scoped lang="scss">
.runtime-status-bar {
  position: sticky;
  top: var(--app-header-height, 0);
  z-index: 999;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: var(--app-space-gap);
  margin: var(--app-space-layout) 0 0;
  padding: var(--app-space-button-y) var(--app-space-panel);
  border: 1px solid var(--border);
  border-radius: var(--control-radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;

  span {
    white-space: nowrap;
  }

  &__status {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;

    &--busy {
      color: var(--blue-dark);
    }
  }

  &__end-toggle {
    margin-left: auto;
  }
}
</style>
