<template>
  <div class="runtime-status-bar">
    <SidePanelToggleButton />
    <span>Loaded: {{ images.length }}.</span>
    <span>Visible: {{ visibleImages.length }}.</span>
    <span>Tags: {{ tagStats.length }}.</span>
    <HistoryActionButton action="undo" variant="plain" />
    <HistoryActionButton action="redo" variant="plain" />
    <span class="runtime-status-bar__status" :class="{ 'runtime-status-bar__status--busy': isBusy }" :title="statusText">{{ statusText }}</span>
    <HeaderPanelToggleButton class="runtime-status-bar__header-toggle" />
  </div>
</template>

<script setup lang="ts">
import HeaderPanelToggleButton from "~/components/HeaderPanelToggleButton.vue";
import HistoryActionButton from "~/components/HistoryActionButton.vue";
import SidePanelToggleButton from "~/components/SidePanelToggleButton.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  images,
  visibleImages,
  tagStats,
  isBusy,
  statusText
} = useImageTaggerContext();
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
  gap: 6px;
  margin: 0;
  padding: 6px 0;
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

  &__header-toggle {
    margin-left: auto;
  }
}
</style>
