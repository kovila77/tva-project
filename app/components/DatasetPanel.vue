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
        </div>
        <button class="btn" type="button" title="Render another batch of visible images. Large datasets render in batches to keep the browser fast." :disabled="visibleLimit >= visibleImages.length" @click="showMore">
          <AppIcon name="showMore" class="icon" /> Show More
        </button>
      </div>
    </div>

    <div v-if="loadError" class="dataset-panel__notice dataset-panel__notice--danger">{{ loadError }}</div>

    <div v-if="activeMainTab === 'stats' && config.statsPlacement === 'tab'" class="dataset-panel__tab">
      <TagStatsList tab />
    </div>

    <div v-else-if="!images.length" class="dataset-panel__empty">
      <strong>No dataset loaded.</strong>
      <span>Upload a folder containing images and matching .txt prompt files.</span>
    </div>

    <div v-else class="dataset-panel__render-note">
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
import AppIcon from "~/components/AppIcon.vue";
import ImageRow from "~/components/ImageRow.vue";
import TagStatsList from "~/components/TagStatsList.vue";
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
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid var(--border);

    h2 {
      margin: 0;
      font-size: 18px;
    }

    p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 12px;
    }
  }

  &__actions,
  &__tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  &__notice {
    margin: 10px 12px 0;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-soft);

    &--danger {
      border-color: #fecaca;
      background: var(--red-soft);
      color: var(--red);
    }
  }

  &__empty,
  &__render-note {
    margin: 12px;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 22px;
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
    gap: 8px;
    padding: 0 12px 12px;

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
