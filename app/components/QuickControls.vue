<template>
  <section class="quickbar" title="Sticky quick controls. Use display controls to move tag sets, stats, and tags beside images.">
    <div class="filter-bar">
      <label class="field grow">
        <span>Filter</span>
        <input
          v-model="config.filterText"
          class="control"
          type="search"
          placeholder="tag, filename, or regex"
          title="Tags mode requires all comma-separated terms. Regex mode matches filename or any tag."
          @keydown.enter.prevent="applyFilter"
        >
      </label>

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
        <button class="btn primary" type="button" title="Show images matching the current filter." @click="applyFilter"><span class="icon">⌕</span> Apply</button>
        <button class="btn" type="button" title="Invert the current filter, showing images that do not match." @click="invertFilter"><span class="icon">◑</span> Invert</button>
        <button class="btn" type="button" title="Clear the filter and show all loaded images." @click="clearFilter"><span class="icon">×</span> Clear</button>
      </div>

      <div class="button-cluster history-actions">
        <button class="btn warn" type="button" :title="undoTitle" :disabled="!history.past.length" @click="undoDataset"><span class="icon">↶</span> Undo</button>
        <button class="btn warn" type="button" :title="redoTitle" :disabled="!history.future.length" @click="redoDataset"><span class="icon">↷</span> Redo</button>
      </div>
    </div>

    <div class="layout-controls">
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
      <label class="check-field" title="Show the clickable tag chips beside each image. Hide this to make the image/editor columns wider.">
        <input v-model="config.showTagsColumn" type="checkbox">
        <span>Row tags</span>
      </label>
      <label class="field compact">
        <span>Image size</span>
        <select v-model="config.imageSize" class="control" title="Controls thumbnail size for quick scanning or closer image comparison.">
          <option value="tiny">Tiny</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
    </div>

    <div v-if="config.tagSetsPlacement === 'top'" class="top-config-panel">
      <TagSetFields />
    </div>

    <div class="summary-grid">
      <div class="metric">
        <strong>{{ images.length }}</strong>
        <span>images</span>
      </div>
      <div class="metric">
        <strong>{{ visibleImages.length }}</strong>
        <span>visible</span>
      </div>
      <div class="metric">
        <strong>{{ dirtyImages.length }}</strong>
        <span>changed</span>
      </div>
      <div class="metric">
        <strong>{{ tagStats.length }}</strong>
        <span>unique tags</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import TagSetFields from "~/components/TagSetFields.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  config,
  images,
  visibleImages,
  dirtyImages,
  tagStats,
  history,
  undoTitle,
  redoTitle,
  applyFilter,
  invertFilter,
  clearFilter,
  undoDataset,
  redoDataset
} = useImageTaggerContext();
</script>
