<template>
  <aside
    v-if="hasSidePanelContent"
    class="side-panel"
    :class="{ 'side-panel--right': config.sidePanelPosition === 'right' }"
  >
    <button
      class="side-panel__resize"
      type="button"
      title="Drag to resize the side panel."
      aria-label="Resize side panel"
      @pointerdown="startResize"
    />
    <details v-if="hasSideTagSets" open>
      <summary title="Editable tag sets used by row chips, unknown-tag detection, highlighting, and ordering.">Tag Sets</summary>
      <TagSetFields placement="side" />
    </details>

    <BatchTools v-if="config.batchToolsPlacement === 'side'" />

    <div v-if="config.statsPlacement === 'side'" class="side-panel__section" title="Tag count statistics. Long natural-language tags wrap instead of being clipped.">
      <TagStatsList />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import BatchTools from "~/components/BatchTools.vue";
import TagSetFields from "~/components/TagSetFields.vue";
import TagStatsList from "~/components/TagStatsList.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config, hasSidePanelContent, hasSideTagSets } = useImageTaggerContext();

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
  top: calc(var(--app-header-height, 0px) + var(--app-runtime-status-height, 0px) + var(--app-filter-bar-height, 0px) + var(--app-space-sticky-offset));
  max-height: calc(100vh - var(--app-header-height, 0px) - var(--app-runtime-status-height, 0px) - var(--app-filter-bar-height, 0px) - var(--app-space-sticky-offset) - var(--app-space-page));
  overflow: auto;
  padding: var(--app-space-panel);
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

  &--right &__resize {
    right: auto;
    left: 0;

    &::after {
      right: auto;
      left: 4px;
    }
  }

  :deep(details) {
    border-bottom: 1px solid var(--border);
    padding: var(--app-space-section) 0;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__section {
    border-bottom: 1px solid var(--border);
    padding: var(--app-space-section) 0;

    &:last-child {
      border-bottom: 0;
    }
  }

  :deep(summary) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--app-space-gap);
    margin-bottom: var(--app-space-section);
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
    top: calc(var(--app-header-height, 0px) + var(--app-runtime-status-height, 0px) + var(--app-filter-bar-height, 0px) + var(--app-space-sticky-offset));
    bottom: var(--app-space-page);
    left: var(--app-space-page);
    z-index: 998;
    width: min(var(--side-panel-width, 340px), calc(100vw - (var(--app-space-page) * 2)));
    max-height: none;

    &--right {
      right: var(--app-space-page);
      left: auto;
    }

    &__resize {
      display: none;
    }
  }
}
</style>
