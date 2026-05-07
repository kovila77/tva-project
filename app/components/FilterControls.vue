<template>
  <div class="filter-controls">
    <TagField
      v-model="config.filterText"
      class="filter-controls__field"
      label="Filter"
      :rows="1"
      :mode="config.filterMode === 'regex' ? 'regex' : 'filter'"
      :placeholder="filterPlaceholder"
      :title="filterTitle"
      :autocomplete="config.filterMode === 'tags' && config.filterTarget === 'caption'"
      :autocomplete-items="autocompleteTags"
      :style-rules="filterTextStyleRules"
      @commit="applyFilter"
    />

    <div class="filter-controls__bar">
      <label class="field compact filter-controls__select">
        <span>Mode</span>
        <select v-model="config.filterMode" class="control" title="Full tag mode matches full caption tags. Regex mode uses regular expressions.">
          <option value="tags">Full tag</option>
          <option value="regex">Regex</option>
        </select>
      </label>

      <label class="field compact filter-controls__select">
        <span>Search</span>
        <select v-model="config.filterTarget" class="control" title="Choose whether the filter searches image filenames or caption tags.">
          <option value="caption">Caption</option>
          <option value="filename">Filename</option>
        </select>
      </label>

      <label class="check-field filter-controls__case" :class="{ muted: config.filterMode !== 'regex' }" title="Regex-only option. When enabled, regex filters ignore letter case.">
        <input v-model="config.ignoreCase" type="checkbox" :disabled="config.filterMode !== 'regex'">
        <span>Ignore case</span>
      </label>

      <div class="filter-controls__actions">
        <button class="filter-controls__action" type="button" title="Search images with the current filter." aria-label="Search images" @click="applyFilter"><AppIcon name="filter" class="icon" /></button>
        <button class="filter-controls__action" type="button" title="Invert the current filter, showing images that do not match." aria-label="Invert filter" @click="invertFilter"><AppIcon name="filterInvert" class="icon" /></button>
        <button class="filter-controls__action" type="button" title="Clear the filter and show all loaded images." aria-label="Clear filter" @click="clearFilter"><AppIcon name="clear" class="icon" /></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
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

const filterPlaceholder = computed(() => {
  if (config.filterMode === "regex") {
    return config.filterTarget === "filename" ? "filename regex" : "caption tag regex";
  }

  return config.filterTarget === "filename" ? "filename text" : "tag, another tag";
});

const filterTitle = computed(() => {
  if (config.filterMode === "regex") {
    return config.filterTarget === "filename"
      ? "Regex mode searches image filenames."
      : "Regex mode searches caption tags.";
  }

  return config.filterTarget === "filename"
    ? "Full tag mode searches filenames by text terms when Filename is selected."
    : "Full tag mode requires exact caption tags for all comma-separated terms.";
});
</script>

<style scoped lang="scss">
.filter-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 8px;
  align-items: end;

  &__field {
    min-width: 0;
  }

  &__bar {
    display: grid;
    grid-template-columns: minmax(96px, 1fr) minmax(104px, 1fr);
    gap: 8px;
    align-items: end;
  }

  &__select {
    min-width: 0;
  }

  &__case {
    align-self: center;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    min-width: 26px;
    height: 26px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    padding: 0;
    line-height: 1;

    &:hover:not(:disabled),
    &:focus-visible {
      color: var(--text);
    }

    .icon {
      width: 14px;
      height: 14px;
    }
  }
}

@media (max-width: 1120px) {
  .filter-controls {
    grid-template-columns: 1fr;
  }
}
</style>
