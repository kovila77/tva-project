<template>
  <div class="runtime-status-bar">
    <span>Loaded: {{ images.length }}.</span>
    <span>Visible: {{ visibleImages.length }}.</span>
    <span>Tags: {{ tagStats.length }}.</span>
    <button class="btn warn icon-btn" type="button" :title="undoTitle" aria-label="Undo" :disabled="!history.past.length" @click="undoDataset"><AppIcon name="undo" class="icon" /></button>
    <button class="btn warn icon-btn" type="button" :title="redoTitle" aria-label="Redo" :disabled="!history.future.length" @click="redoDataset"><AppIcon name="redo" class="icon" /></button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  images,
  visibleImages,
  tagStats,
  history,
  undoTitle,
  redoTitle,
  undoDataset,
  redoDataset
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
}
</style>
