<template>
  <section class="dataset-panel">
    <div class="dataset-header">
      <div>
        <h2>Dataset</h2>
        <p>{{ datasetName }}</p>
      </div>
      <div class="dataset-actions">
        <div class="tab-row">
          <button class="btn" type="button" title="Show the image editing dataset." :class="{ active: activeMainTab === 'images' }" @click="activeMainTab = 'images'"><span class="icon">▦</span> Images</button>
          <button v-if="config.statsPlacement === 'tab'" class="btn" type="button" title="Show tag statistics as a separate tab." :class="{ active: activeMainTab === 'stats' }" @click="activeMainTab = 'stats'"><span class="icon">▤</span> Stats</button>
        </div>
        <label class="field compact">
          <span>Density</span>
          <select v-model="config.density" class="control" title="Compact rows fit more images. Comfortable rows leave more room for editing.">
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <button class="btn" type="button" title="Render another batch of visible images. Large datasets render in batches to keep the browser fast." :disabled="visibleLimit >= visibleImages.length" @click="showMore">
          <span class="icon">＋</span> Show More
        </button>
      </div>
    </div>

    <div v-if="loadError" class="notice danger">{{ loadError }}</div>

    <div v-if="activeMainTab === 'stats' && config.statsPlacement === 'tab'" class="tab-panel">
      <TagStatsList tab />
    </div>

    <div v-else-if="!images.length" class="empty-state">
      <strong>No dataset loaded.</strong>
      <span>Upload a folder containing images and matching .txt prompt files.</span>
    </div>

    <div v-else class="render-note">
      Rendering {{ renderedImages.length }} of {{ visibleImages.length }} visible images.
    </div>

    <div v-if="activeMainTab === 'images'" class="image-list" :class="[config.density, `image-size-${config.imageSize}`, { 'hide-tag-column': !config.showTagsColumn }]">
      <ImageRow
        v-for="image in renderedImages"
        :key="image.id"
        :image="image"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
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
