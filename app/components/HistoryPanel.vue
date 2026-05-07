<template>
  <details class="history-panel" open>
    <summary title="Undo/redo preview. Shows what the next undo or redo will affect.">History</summary>
    <div class="history-panel__content">
      <div class="history-panel__card">
        <strong>Next undo</strong>
        <span>{{ operationPreview(lastUndoOperation) }}</span>
        <button class="btn warn full" type="button" :title="undoTitle" aria-label="Undo" :disabled="!lastUndoOperation" @click="undoDataset"><AppIcon name="undo" class="icon" /></button>
      </div>
      <div class="history-panel__card">
        <strong>Next redo</strong>
        <span>{{ operationPreview(lastRedoOperation) }}</span>
        <button class="btn warn full" type="button" :title="redoTitle" aria-label="Redo" :disabled="!lastRedoOperation" @click="redoDataset"><AppIcon name="redo" class="icon" /></button>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  lastUndoOperation,
  lastRedoOperation,
  undoTitle,
  redoTitle,
  operationPreview,
  undoDataset,
  redoDataset
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.history-panel__content,
.history-panel__card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-panel {
  padding: 8px 0;

  summary {
    margin-bottom: 8px;
    cursor: pointer;
    font-weight: 750;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &__card {
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-soft);
    padding: 8px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;

    strong {
      color: var(--text);
    }
  }
}
</style>
