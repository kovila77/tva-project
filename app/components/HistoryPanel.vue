<template>
  <details open>
    <summary title="Undo/redo preview. Shows what the next undo or redo will affect.">History</summary>
    <div class="history-preview">
      <div class="history-card">
        <strong>Next undo</strong>
        <span>{{ operationPreview(lastUndoOperation) }}</span>
        <button class="btn warn full" type="button" :title="undoTitle" aria-label="Undo" :disabled="!lastUndoOperation" @click="undoDataset"><AppIcon name="undo" class="icon" /></button>
      </div>
      <div class="history-card">
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
