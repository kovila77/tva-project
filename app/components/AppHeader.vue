<template>
  <header ref="headerElement" class="app-header" title="Dataset files are loaded into browser memory. Source files are not modified.">
    <div class="app-header__topline">
      <div class="app-header__brand">
        <h1>TVA Image Tagger</h1>
        <div class="app-header__status" :class="{ 'app-header__status--busy': isBusy }" :title="statusText">{{ statusText }}</div>
      </div>
    </div>

    <details class="app-header__section" open>
      <summary>Config and image folders</summary>
      <div class="app-header__actions">
        <button class="btn primary" type="button" title="Upload a local folder containing images and matching .txt prompt files. Files are read into memory only." @click="openFolderPicker"><AppIcon name="upload" class="icon" /> Upload Folder</button>
        <button class="btn" type="button" title="Import editor configuration JSON. This changes UI/tag-set settings, not loaded image files." @click="openConfigPicker"><AppIcon name="import" class="icon" /> Import Config</button>
        <button class="btn" type="button" title="Download the current editor configuration as JSON." @click="exportConfig"><AppIcon name="export" class="icon" /> Export Config</button>
        <button class="btn success" type="button" title="Download edited tag .txt files for all loaded images as a ZIP archive." :disabled="!images.length" @click="exportTagsZip(false)"><AppIcon name="download" class="icon" /> Export Tags</button>
        <button class="btn" type="button" title="Download edited tag .txt files only for currently visible images." :disabled="!visibleImages.length" @click="exportTagsZip(true)"><AppIcon name="exportFile" class="icon" /> Export Visible</button>
        <button class="btn" type="button" title="Resize visible images in memory and download them with their edited tag files. Source files are not changed." :disabled="!visibleImages.length" @click="exportResizedImagesZip"><AppIcon name="resize" class="icon" /> Export Resized</button>
      </div>
    </details>

    <QuickControls />

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
  </header>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import QuickControls from "~/components/QuickControls.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  folderInput,
  configInput,
  images,
  visibleImages,
  isBusy,
  statusText,
  openFolderPicker,
  openConfigPicker,
  exportConfig,
  exportTagsZip,
  exportResizedImagesZip,
  onFolderSelected,
  onConfigSelected
} = useImageTaggerContext();

const headerElement = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

function updateHeaderOffset(): void {
  const height = headerElement.value?.offsetHeight ?? 0;
  document.documentElement.style.setProperty("--app-header-height", `${height}px`);
}

onMounted(() => {
  void nextTick(updateHeaderOffset);
  if (headerElement.value) {
    resizeObserver = new ResizeObserver(updateHeaderOffset);
    resizeObserver.observe(headerElement.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  document.documentElement.style.removeProperty("--app-header-height");
});
</script>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  max-height: calc(100vh - 16px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);

  &__topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__brand {
    min-width: 220px;

    h1 {
      margin: 0;
      font-size: 18px;
      line-height: 1.2;
    }
  }

  &__status {
    min-height: 18px;
    margin-top: 3px;
    color: var(--muted);
    font-size: 12px;

    &--busy {
      color: var(--blue-dark);
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  &__section {
    border-top: 1px solid var(--border);
    padding-top: 8px;

    summary {
      margin-bottom: 8px;
      cursor: pointer;
      font-weight: 750;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }
  }
}

@media (max-width: 860px) {
  .app-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
