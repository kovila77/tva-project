<template>
  <div class="file-management-controls">
    <button class="btn primary" type="button" title="Upload a local folder containing images and matching .txt prompt files. Files are read into memory only." @click="openFolderPicker"><AppIcon name="upload" class="icon" /> Upload Folder</button>
    <button class="btn" type="button" title="Import editor configuration JSON. This changes UI/tag-set settings, not loaded image files." @click="openConfigPicker"><AppIcon name="import" class="icon" /> Import Config</button>
    <button class="btn" type="button" title="Download the current editor configuration as JSON." @click="exportConfig"><AppIcon name="export" class="icon" /> Export Config</button>
    <button class="btn success" type="button" title="Download edited tag .txt files for all loaded images as a ZIP archive." :disabled="!images.length" @click="exportTagsZip(false)"><AppIcon name="download" class="icon" /> Export Tags</button>
    <button class="btn" type="button" title="Download edited tag .txt files only for currently visible images." :disabled="!visibleImages.length" @click="exportTagsZip(true)"><AppIcon name="exportFile" class="icon" /> Export Visible</button>
    <button class="btn" type="button" title="Resize visible images in memory and download them with their edited tag files. Source files are not changed." :disabled="!visibleImages.length" @click="exportResizedImagesZip"><AppIcon name="resize" class="icon" /> Export Resized</button>
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
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  folderInput,
  configInput,
  images,
  visibleImages,
  openFolderPicker,
  openConfigPicker,
  exportConfig,
  exportTagsZip,
  exportResizedImagesZip,
  onFolderSelected,
  onConfigSelected
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.file-management-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
</style>
