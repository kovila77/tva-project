<template>
  <div class="file-management-controls">
    <label class="file-management-controls__name">
      <span class="sr-only">Dataset name</span>
      <input
        v-model="datasetNameValue"
        class="control"
        type="text"
        placeholder="Dataset name"
        title="Used as the ZIP archive name and the single folder name inside the archive. Invalid Windows/Linux filename characters are removed."
        autocomplete="off"
        @blur="commitDatasetName"
      >
    </label>
    <button class="btn" type="button" title="Load the built-in placeholder dataset and cache it for reload restore. This replaces the current in-memory dataset." :disabled="isBusy" @click="loadPlaceholderDataset"><AppIcon name="images" class="icon" /> Load Placeholder</button>
    <button class="btn primary" type="button" title="Upload a local folder containing images and matching .txt prompt files. Files are read into memory only." @click="openFolderPicker"><AppIcon name="upload" class="icon" /> Upload Folder</button>
    <button class="btn" type="button" title="Import editor configuration JSON. This changes UI/tag-set settings, not loaded image files." @click="openConfigPicker"><AppIcon name="import" class="icon" /> Import Config</button>
    <button class="btn" type="button" title="Download the current editor configuration as JSON." @click="exportConfig"><AppIcon name="export" class="icon" /> Export Config</button>
    <button class="btn success" type="button" title="Download all loaded images with edited tag .txt files as a ZIP archive." :disabled="!images.length" @click="exportDatasetZip(false)"><AppIcon name="download" class="icon" /> Export Dataset</button>
    <button class="btn" type="button" title="Download currently visible images with edited tag .txt files as a ZIP archive." :disabled="!visibleImages.length" @click="exportDatasetZip(true)"><AppIcon name="exportFile" class="icon" /> Export Visible</button>
    <input
      ref="folderInput"
      class="sr-only"
      type="file"
      multiple
      webkitdirectory
      directory
      @change="onFolderSelected"
    >
    <input
      ref="configInput"
      class="sr-only"
      type="file"
      accept="application/json,.json"
      @change="onConfigSelected"
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import { normalizeConfigName, sanitizeConfigNameInput } from "~/utils/config";

const {
  config,
  folderInput,
  configInput,
  images,
  visibleImages,
  isBusy,
  openFolderPicker,
  openConfigPicker,
  loadPlaceholderDataset,
  exportConfig,
  exportDatasetZip,
  onFolderSelected,
  onConfigSelected
} = useImageTaggerContext();

const datasetNameValue = computed({
  get: () => config.name,
  set: (value: string) => {
    config.name = sanitizeConfigNameInput(value);
  }
});

function commitDatasetName(): void {
  config.name = normalizeConfigName(config.name);
}
</script>

<style scoped lang="scss">
.file-management-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(auto-fit, minmax(150px, max-content));
  align-items: end;
  gap: var(--app-space-gap);

  &__name {
    margin: 0;
  }
}
</style>
