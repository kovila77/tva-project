<template>
  <div class="app-layout image-tagger" :data-theme="config.theme" :class="layoutClasses">
    <AppHeader />
    <RuntimeStatusBar />

    <main
      class="image-tagger__workspace"
      :style="{ '--side-panel-width': `${config.sidePanelWidth}px` }"
    >
      <button
        v-if="hasSidePanelContent"
        class="image-tagger__drawer-backdrop"
        type="button"
        title="Hide side panel"
        aria-label="Hide side panel"
        @click="hideSidePanel"
      />
      <SidePanel />
      <DatasetPanel />
    </main>

    <ImageViewer />
    <SettingsModal />
  </div>
</template>

<script setup lang="ts">
import AppHeader from "~/components/AppHeader.vue";
import DatasetPanel from "~/components/DatasetPanel.vue";
import ImageViewer from "~/components/ImageViewer.vue";
import SettingsModal from "~/components/SettingsModal.vue";
import RuntimeStatusBar from "~/components/RuntimeStatusBar.vue";
import SidePanel from "~/components/SidePanel.vue";
import { provideImageTagger } from "~/composables/useImageTagger";

const {
  config,
  layoutClasses,
  hasSidePanelContent
} = provideImageTagger();

function hideSidePanel(): void {
  config.sidePanelMode = "hidden";
}
</script>

<style scoped lang="scss">
.image-tagger {
  &__workspace {
    display: grid;
    grid-template-columns: var(--side-panel-width, 340px) minmax(0, 1fr);
    grid-template-areas: "side dataset";
    gap: var(--app-space-layout);
    align-items: start;
    margin-top: var(--app-space-layout);
  }

  &__workspace > :deep(.side-panel) {
    grid-area: side;
  }

  &__workspace > :deep(.dataset-panel) {
    grid-area: dataset;
  }

  &__drawer-backdrop {
    display: none;
  }

  &.side-panel-right &__workspace {
    grid-template-columns: minmax(0, 1fr) var(--side-panel-width, 340px);
    grid-template-areas: "dataset side";
  }

  &.side-panel-hidden &__workspace {
    grid-template-columns: 1fr;
    grid-template-areas: "dataset";
  }
}

@media (max-width: 860px) {
  .image-tagger {
    &__workspace {
      grid-template-columns: 1fr;
      grid-template-areas: "dataset";
    }

    &.side-panel-right &__workspace {
      grid-template-columns: 1fr;
      grid-template-areas: "dataset";
    }

    &__drawer-backdrop {
      display: block;
      position: fixed;
      top: calc(var(--app-header-height, 0px) + var(--app-runtime-status-height, 0px) + var(--app-space-sticky-offset));
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 997;
      border: 0;
      background: transparent;
      padding: 0;
      cursor: default;
    }
  }
}

@media (max-width: 860px) {
  .app-layout {
    padding: var(--app-space-panel);
  }
}
</style>
