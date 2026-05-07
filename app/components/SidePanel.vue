<template>
  <aside v-if="hasSidePanelContent" class="side-panel">
    <button
      class="side-panel__resize"
      type="button"
      title="Drag to resize the side panel."
      aria-label="Resize side panel"
      @pointerdown="startResize"
    />
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
  const nextWidth = resizeStartWidth + event.clientX - resizeStartX;
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
  top: 86px;
  max-height: calc(100vh - 98px);
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

@media (max-width: 1260px) {
  .side-panel {
    position: static;
    max-height: none;

    &__resize {
      display: none;
    }
  }
}
</style>
