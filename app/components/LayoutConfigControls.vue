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
      <span>Files</span>
      <select v-model="config.fileManagementPlacement" class="control" title="Show file and config management in the header or side panel.">
        <option value="header">Header</option>
        <option value="side">Side</option>
      </select>
    </label>
    <label class="field compact">
      <span>Layout</span>
      <select v-model="config.layoutConfigPlacement" class="control" title="Show layout configuration in the header or side panel.">
        <option value="header">Header</option>
        <option value="side">Side</option>
      </select>
    </label>
    <label class="field compact">
      <span>Filter</span>
      <select v-model="config.filterPlacement" class="control" title="Show filter controls in the header or side panel.">
        <option value="header">Header</option>
        <option value="side">Side</option>
      </select>
    </label>
    <label class="field compact">
      <span>Tag sets</span>
      <select v-model="config.tagSetsPlacement" class="control" title="Choose where editable tag sets are shown. Header keeps them near filters; side saves vertical space; hidden keeps image area wide.">
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
      default-mode="current"
      default-option-label="Current"
      fixed-label="Width"
      :slider-min="50"
      :slider-max="5000"
      mode-title="Current image width uses the default row thumbnail column. Fixed uses the configured image width."
      slider-title="Fixed image width slider from 50px to 5000px."
    />
  </div>
</template>

<script setup lang="ts">
import ImageDimensionControl from "~/components/ImageDimensionControl.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config } = useImageTaggerContext();
</script>

<style scoped lang="scss">
.layout-config-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
}
</style>
