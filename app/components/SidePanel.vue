<template>
  <aside v-if="hasSidePanelContent" class="side-panel">
    <button
      class="side-panel__resize"
      type="button"
      title="Drag to resize the side panel."
      aria-label="Resize side panel"
      @pointerdown="startResize"
    />
    <details v-if="config.fileManagementPlacement === 'side'" open>
      <summary title="Import/export files and editor configuration.">Config and image folders</summary>
      <FileManagementControls />
    </details>

    <details v-if="config.layoutConfigPlacement === 'side'" open>
      <summary title="Layout and display configuration.">Layout config</summary>
      <LayoutConfigControls />
    </details>

    <details v-if="config.filterPlacement === 'side'" open>
      <summary title="Filter the loaded image dataset.">Filter</summary>
      <FilterControls />
    </details>

    <details v-if="config.tagSetsPlacement === 'side'" open>
      <summary title="Editable tag sets used by row chips, unknown-tag detection, highlighting, and ordering.">Tag Sets</summary>
      <TagSetFields />
    </details>

    <BatchTools v-if="config.batchToolsPlacement === 'side'" />

    <details v-if="config.statsPlacement === 'side'" open>
      <summary title="Tag count statistics. Long natural-language tags wrap instead of being clipped.">Tag Statistics</summary>
      <TagStatsList />
    </details>
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import BatchTools from "~/components/BatchTools.vue";
import FileManagementControls from "~/components/FileManagementControls.vue";
import FilterControls from "~/components/FilterControls.vue";
import LayoutConfigControls from "~/components/LayoutConfigControls.vue";
import TagSetFields from "~/components/TagSetFields.vue";
import TagStatsList from "~/components/TagStatsList.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config, hasSidePanelContent } = useImageTaggerContext();

const minimumSidePanelWidth = 260;
const maximumSidePanelWidth = 720;
let resizeStartX = 0;
let resizeStartWidth = 0;

function startResize(event: PointerEvent): void {
  resizeStartX = event.clientX;
  resizeStartWidth = config.sidePanelWidth;
  event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", resizeSidePanel);
  window.addEventListener("pointerup", stopResize, { once: true });
}

function resizeSidePanel(event: PointerEvent): void {
  const delta = event.clientX - resizeStartX;
  const nextWidth = config.sidePanelPosition === "right"
    ? resizeStartWidth - delta
    : resizeStartWidth + delta;
  config.sidePanelWidth = Math.min(maximumSidePanelWidth, Math.max(minimumSidePanelWidth, Math.round(nextWidth)));
}

function stopResize(): void {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  window.removeEventListener("pointermove", resizeSidePanel);
}

onBeforeUnmount(stopResize);
</script>

<style scoped lang="scss">
.side-panel {
  position: sticky;
  min-width: 0;
  top: calc(var(--app-header-height, 0px) + 44px);
  max-height: calc(100vh - var(--app-header-height, 0px) - 56px);
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);

  &__resize {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    width: 12px;
    height: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    cursor: col-resize;

    &::after {
      content: "";
      position: absolute;
      top: 12px;
      right: 4px;
      bottom: 12px;
      width: 2px;
      border-radius: 999px;
      background: transparent;
    }

    &:hover::after,
    &:focus-visible::after {
      background: var(--blue);
    }
  }

  :global(.side-panel-right) &__resize {
    right: auto;
    left: 0;

    &::after {
      right: auto;
      left: 4px;
    }
  }

  :deep(details) {
    border-bottom: 1px solid var(--border);
    padding: 8px 0;

    &:last-child {
      border-bottom: 0;
    }
  }

  :deep(summary) {
    margin-bottom: 8px;
    cursor: pointer;
    font-weight: 750;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }
}

@media (max-width: 860px) {
  .side-panel {
    display: block;
    position: fixed;
    top: calc(var(--app-header-height, 0px) + 38px);
    bottom: 8px;
    left: 8px;
    z-index: 998;
    width: min(var(--side-panel-width, 340px), calc(100vw - 16px));
    max-height: none;

    &__resize {
      display: none;
    }
  }

  :global(.side-panel-right) .side-panel {
    right: 8px;
    left: auto;
  }
}
</style>
