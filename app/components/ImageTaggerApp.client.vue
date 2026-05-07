<template>
  <div class="app-layout image-tagger" :data-theme="config.theme" :class="layoutClasses">
    <AppHeader />
    <RuntimeStatusBar />

    <main
      class="image-tagger__workspace"
      :style="{ '--side-panel-width': `${config.sidePanelWidth}px` }"
    >
      <SidePanel />
      <DatasetPanel />
    </main>

    <ImageViewer />
  </div>
</template>

<script setup lang="ts">
import AppHeader from "~/components/AppHeader.vue";
import DatasetPanel from "~/components/DatasetPanel.vue";
import ImageViewer from "~/components/ImageViewer.vue";
import RuntimeStatusBar from "~/components/RuntimeStatusBar.vue";
import SidePanel from "~/components/SidePanel.vue";
import { provideImageTagger } from "~/composables/useImageTagger";

const {
  config,
  layoutClasses
} = provideImageTagger();
</script>

<style scoped lang="scss">
.image-tagger {
  &__workspace {
    display: grid;
    grid-template-columns: var(--side-panel-width, 340px) minmax(0, 1fr);
    grid-template-areas: "side dataset";
    gap: 10px;
    align-items: start;
    margin-top: 10px;
  }

  &__workspace > :deep(.side-panel) {
    grid-area: side;
  }

  &__workspace > :deep(.dataset-panel) {
    grid-area: dataset;
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
  }
}

@media (max-width: 860px) {
  .app-layout {
    padding: 8px;
  }
}
</style>
