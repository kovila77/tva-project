<template>
  <div class="filter-controls">
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
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
import TagField from "~/components/TagField.vue";
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
.filter-controls {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 120px auto auto;
  gap: 8px;
  align-items: end;
}

@media (max-width: 860px) {
  .filter-controls {
    grid-template-columns: 1fr;
  }
}
</style>
