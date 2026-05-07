<template>
  <div class="quick-controls" title="Top controls. Sections can be collapsed to keep the image workspace close to the header.">
    <details class="quick-controls__section" open>
      <summary>Layout config</summary>
      <div class="quick-controls__layout">
        <label class="field compact">
          <span>Theme</span>
          <select v-model="config.theme" class="control" title="Switch between dark and light UI themes.">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label class="field compact">
          <span>Left panel</span>
          <select v-model="config.sidePanelMode" class="control" title="Show or hide the left side panel. Hidden mode gives more width to images.">
            <option value="open">Open</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label class="field compact">
          <span>Tag sets</span>
          <select v-model="config.tagSetsPlacement" class="control" title="Choose where editable tag sets are shown. Top keeps them near filters; side saves vertical space; hidden keeps image area wide.">
            <option value="side">Side</option>
            <option value="top">Top</option>
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
        <label class="check-field" title="Show the clickable tag chips beside each image. Hide this to make the image/editor columns wider.">
          <input v-model="config.showTagsColumn" type="checkbox">
          <span>Row tags</span>
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
    </details>

    <div v-if="config.tagSetsPlacement === 'top'" class="quick-controls__tag-sets">
      <TagSetFields collapsible />
    </div>

    <details class="quick-controls__section" open>
      <summary>Filter</summary>
      <div class="quick-controls__filters">
        <TagField
          v-model="config.filterText"
          class="grow"
          label="Filter"
          :rows="1"
          :mode="config.filterMode === 'regex' ? 'regex' : 'filter'"
          placeholder="tag, filename, or regex"
          title="Tags mode requires all comma-separated terms. Regex mode matches filename or any tag."
          :autocomplete="config.filterMode === 'tags'"
          :autocomplete-items="autocompleteTags"
          :style-rules="filterTextStyleRules"
          @commit="applyFilter"
        />

        <label class="field compact">
          <span>Mode</span>
          <select v-model="config.filterMode" class="control" title="Choose whether filter terms are exact tags or regular expressions.">
            <option value="tags">Tags</option>
            <option value="regex">Regex</option>
          </select>
        </label>

        <label class="check-field" :class="{ muted: config.filterMode !== 'regex' }" title="Regex-only option. When enabled, regex filters ignore letter case.">
          <input v-model="config.ignoreCase" type="checkbox" :disabled="config.filterMode !== 'regex'">
          <span>Ignore case</span>
        </label>

        <div class="button-cluster">
          <button class="btn primary" type="button" title="Show images matching the current filter." @click="applyFilter"><AppIcon name="filter" class="icon" /> Apply</button>
          <button class="btn icon-btn" type="button" title="Invert the current filter, showing images that do not match." aria-label="Invert filter" @click="invertFilter"><AppIcon name="filterInvert" class="icon" /></button>
          <button class="btn icon-btn" type="button" title="Clear the filter and show all loaded images." aria-label="Clear filter" @click="clearFilter"><AppIcon name="clear" class="icon" /></button>
        </div>
      </div>
    </details>

  </div>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
import ImageDimensionControl from "~/components/ImageDimensionControl.vue";
import TagField from "~/components/TagField.vue";
import TagSetFields from "~/components/TagSetFields.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  config,
  autocompleteTags,
  filterTextStyleRules,
  applyFilter,
  invertFilter,
  clearFilter
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.quick-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__section {
    border-top: 1px solid var(--border);
    padding-top: 8px;

    summary {
      margin-bottom: 8px;
      cursor: pointer;
      font-weight: 750;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }
  }

  &__filters {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) 120px auto auto;
    gap: 8px;
    align-items: end;
  }

  &__layout {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: end;
  }

  &__tag-sets {
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }

}

@media (max-width: 860px) {
  .quick-controls {
    &__filters {
      grid-template-columns: 1fr;
    }
  }
}
</style>
