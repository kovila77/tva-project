<template>
  <details open>
    <summary title="Undo/redo preview. Shows what the next undo or redo will affect.">History</summary>
    <div class="history-preview">
      <div class="history-card">
        <strong>Next undo</strong>
        <span>{{ operationPreview(lastUndoOperation) }}</span>
        <button class="btn warn full" type="button" :title="undoTitle" :disabled="!lastUndoOperation" @click="undoDataset"><span class="icon">↶</span> Undo</button>
      </div>
      <div class="history-card">
        <strong>Next redo</strong>
        <span>{{ operationPreview(lastRedoOperation) }}</span>
        <button class="btn warn full" type="button" :title="redoTitle" :disabled="!lastRedoOperation" @click="redoDataset"><span class="icon">↷</span> Redo</button>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
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
