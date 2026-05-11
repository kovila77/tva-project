<template>
  <section class="dataset-panel">
    <div class="dataset-panel__header">
      <div>
        <h2>Dataset</h2>
        <p>{{ datasetName }}</p>
      </div>
      <div class="dataset-panel__actions">
        <div class="dataset-panel__tabs">
          <button class="btn" type="button" title="Show the image editing dataset." :class="{ active: activeMainTab === 'images' }" @click="activeMainTab = 'images'"><AppIcon name="images" class="icon" /> Images</button>
          <button v-if="config.statsPlacement === 'tab'" class="btn" type="button" title="Show tag statistics as a separate tab." :class="{ active: activeMainTab === 'stats' }" @click="activeMainTab = 'stats'"><AppIcon name="stats" class="icon" /> Stats</button>
          <button v-if="config.batchToolsPlacement === 'tab'" class="btn" type="button" title="Show batch tools as a separate tab." :class="{ active: activeMainTab === 'batch' }" @click="activeMainTab = 'batch'"><AppIcon name="tools" class="icon" /> Batch</button>
        </div>
        <button v-if="activeMainTab === 'images' && visibleLimit < visibleImages.length" class="btn" type="button" title="Render another batch of visible images. Large datasets render in batches to keep the browser fast." @click="showMore">
          <AppIcon name="showMore" class="icon" /> Show More
        </button>
      </div>
    </div>

    <div v-if="loadError" class="dataset-panel__notice dataset-panel__notice--danger">{{ loadError }}</div>

    <div v-if="activeMainTab === 'stats' && config.statsPlacement === 'tab'" class="dataset-panel__tab">
      <TagStatsList tab />
    </div>

    <div v-else-if="activeMainTab === 'batch' && config.batchToolsPlacement === 'tab'" class="dataset-panel__tab">
      <BatchTools />
    </div>

    <div v-else-if="activeMainTab === 'images' && !images.length" class="dataset-panel__empty">
      <strong>No dataset loaded.</strong>
      <span>Upload a folder containing images and matching .txt prompt files.</span>
    </div>

    <div v-else-if="activeMainTab === 'images'" class="dataset-panel__render-note">
      Rendering {{ renderedImages.length }} of {{ visibleImages.length }} visible images.
    </div>

    <div
      v-if="activeMainTab === 'images'"
      class="dataset-panel__image-list"
      :style="{
        '--image-row-fixed-height': `${config.imageRowFixedHeight}px`,
        '--image-fixed-width': `${config.imageFixedWidth}px`
      }"
    >
      <ImageRow
        v-for="image in renderedImages"
        :key="image.id"
        :image="image"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from "~/components/core/AppIcon.vue";
import BatchTools from "~/components/tools/BatchTools.vue";
import ImageRow from "~/components/dataset/ImageRow.vue";
import TagStatsList from "~/components/tags/TagStatsList.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  config,
  activeMainTab,
  datasetName,
  visibleLimit,
  visibleImages,
  renderedImages,
  images,
  loadError,
  showMore
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.dataset-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--app-space-gap);
    padding: var(--app-space-page);
    border-bottom: 1px solid var(--border);

    h2 {
      margin: 0;
      font-size: 18px;
    }

    p {
      margin: min(var(--app-space-layout), 2px) 0 0;
      color: var(--muted);
      font-size: 12px;
    }
  }

  &__actions,
  &__tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--app-space-gap);
  }

  &__tab {
    padding: var(--app-space-page);
  }

  &__notice {
    margin: var(--app-space-panel) var(--app-space-page) 0;
    padding: var(--app-space-panel) var(--app-space-button-x);
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
    background: var(--surface-soft);

    &--danger {
      border-color: #fecaca;
      background: var(--red-soft);
      color: var(--red);
    }
  }

  &__empty,
  &__render-note {
    margin: var(--app-space-page);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-layout);
    padding: calc(var(--app-space-page) + var(--app-space-button-x));
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius);
    background: var(--surface-soft);
    color: var(--muted);
    text-align: center;

    strong {
      color: var(--text);
    }
  }

  &__render-note {
    color: var(--muted);
    font-size: 12px;
  }

  &__image-list {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-gap);
    padding: 0 var(--app-space-page) var(--app-space-page);

  }
}

@media (max-width: 860px) {
  .dataset-panel {
    &__header {
      align-items: stretch;
      flex-direction: column;
    }
  }
}
</style>
