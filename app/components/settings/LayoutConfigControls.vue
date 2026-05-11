<template>
  <div class="layout-config-controls">
    <label class="field compact">
      <span>Theme</span>
      <select v-model="config.theme" class="control" title="Switch between dark and light UI themes.">
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </label>
    <label class="field compact">
      <span>Corners style</span>
      <select v-model="config.cornersStyle" class="control" title="Choose rounded corners or square UI corners.">
        <option value="round">Round</option>
        <option value="square">Square</option>
      </select>
    </label>
    <label class="field compact">
      <span>Spacing</span>
      <select v-model="config.spacingMode" class="control" title="Choose how much padding and gap space the interface uses.">
        <option value="default">Default</option>
        <option value="minimal">Minimal</option>
        <option value="super-minimal">Super minimal</option>
        <option value="none">No spacings</option>
      </select>
    </label>
    <label class="field compact">
      <span>Panel</span>
      <select v-model="config.sidePanelMode" class="control" title="Show or hide the side panel. Hidden mode gives more width to images.">
        <option value="open">Open</option>
        <option value="hidden">Hidden</option>
      </select>
    </label>
    <label class="field compact">
      <span>Panel side</span>
      <select v-model="config.sidePanelPosition" class="control" title="Dock the side panel on the left or right of the image dataset.">
        <option value="left">Left</option>
        <option value="right">Right</option>
      </select>
    </label>
    <label class="field compact">
      <span>Tag sets</span>
      <select v-model="bulkTagSetsPlacement" class="control" title="Choose where all editable tag sets are shown. Individual tag-set sections can override this from their headings.">
        <option v-if="bulkTagSetsPlacement === 'mixed'" value="mixed" disabled>Mixed</option>
        <option value="side">Side</option>
        <option value="top">Header</option>
        <option value="hidden">Hidden</option>
      </select>
    </label>
    <label class="field compact">
      <span>Stats</span>
      <select v-model="config.statsPlacement" class="control" title="Choose where tag statistics are shown. Tab mode keeps thin windows usable.">
        <option value="tab">Tab</option>
        <option value="side">Side</option>
        <option value="hidden">Hidden</option>
      </select>
    </label>
    <label class="field compact">
      <span>Batch tools</span>
      <select v-model="config.batchToolsPlacement" class="control" title="Choose whether batch tools are shown in the side panel or as a dataset tab.">
        <option value="side">Side</option>
        <option value="tab">Tab</option>
      </select>
    </label>
    <label class="field compact">
      <span>Row chips</span>
      <select v-model="config.rowChipMode" class="control" title="Choose which clickable tag chips are shown beside each image.">
        <option value="hidden">Don't show</option>
        <option value="common-deleted">Common and deleted</option>
        <option value="deleted">Deleted</option>
        <option value="common">Common</option>
        <option value="everything">Everything</option>
      </select>
    </label>
    <ImageDimensionControl
      v-model:mode="config.imageRowHeightMode"
      v-model:value="config.imageRowFixedHeight"
      label="Row height"
      default-mode="full"
      default-option-label="Full"
      fixed-label="Height"
      :slider-min="100"
      :slider-max="2500"
      mode-title="Full rows use image/content height. Fixed rows use the configured row height."
      slider-title="Fixed image row height slider from 100px to 2500px."
    />
    <ImageDimensionControl
      v-model:mode="config.imageWidthMode"
      v-model:value="config.imageFixedWidth"
      label="Image width"
      default-mode="compact"
      default-option-label="Compact"
      :extra-modes="[{ value: 'flexible', label: 'Flexible' }]"
      fixed-label="Width"
      :slider-min="50"
      :slider-max="5000"
      mode-title="Compact image width uses the default row thumbnail column. Flexible lets image rows resize the shared width by dragging. Fixed uses the configured image width."
      slider-title="Fixed image width slider from 50px to 5000px."
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ImageDimensionControl from "~/components/settings/ImageDimensionControl.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { TagSetsPlacement } from "~/types/imageTagger";

const { config } = useImageTaggerContext();

const tagSetPlacementKeys = [
  "commonTagsPlacement",
  "knownTagsPlacement",
  "highlightTagsPlacement",
  "highlightTextPlacement",
  "orderTagsPlacement"
] as const;

const bulkTagSetsPlacement = computed<TagSetsPlacement | "mixed">({
  get: () => {
    const firstPlacement = config[tagSetPlacementKeys[0]];
    return tagSetPlacementKeys.every((key) => config[key] === firstPlacement) ? firstPlacement : "mixed";
  },
  set: (placement) => {
    if (placement === "mixed") {
      return;
    }

    config.tagSetsPlacement = placement;
    for (const key of tagSetPlacementKeys) {
      config[key] = placement;
    }
  }
});
</script>

<style scoped lang="scss">
.layout-config-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--app-space-gap);
  align-items: end;
}
</style>
