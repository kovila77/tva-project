<template>
  <details class="history-panel" open>
    <summary title="Undo/redo preview and compact dataset statistics.">History and stats</summary>
    <div class="history-panel__content">
      <div class="history-panel__stats">
        <div class="history-panel__stat">
          <strong>{{ images.length }}</strong>
          <span>images</span>
        </div>
        <div class="history-panel__stat">
          <strong>{{ visibleImages.length }}</strong>
          <span>visible</span>
        </div>
        <div class="history-panel__stat">
          <strong>{{ dirtyImages.length }}</strong>
          <span>changed</span>
        </div>
        <div class="history-panel__stat">
          <strong>{{ tagStats.length }}</strong>
          <span>tags</span>
        </div>
      </div>
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
  images,
  visibleImages,
  dirtyImages,
  tagStats,
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

  &__content {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  &__stats {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  &__stat {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-soft);
    padding: 6px 8px;

    strong,
    span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: var(--text);
      font-size: 16px;
      line-height: 1.1;
    }

    span {
      color: var(--muted);
      font-size: 11px;
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

@media (max-width: 860px) {
  .history-panel {
    &__content {
      grid-template-columns: 1fr;
    }

    &__stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
