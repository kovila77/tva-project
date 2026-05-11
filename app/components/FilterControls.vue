<template>
  <div
    ref="filterRoot"
    class="filter-controls"
    :class="{ 'filter-controls--side': config.filterPlacement === 'side' }"
  >
    <TagField
      ref="filterField"
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
        <AppIconButton class="filter-controls__action" icon="filter" title="Search images with the current filter. Shortcut: Ctrl+K focuses this filter." aria-label="Search images" @click="applyFilter" />
        <AppIconButton class="filter-controls__action" icon="filterInvert" title="Invert the current filter, showing images that do not match." aria-label="Invert filter" @click="invertFilter" />
        <AppIconButton class="filter-controls__action" icon="clear" title="Clear the filter and show all loaded images." aria-label="Clear filter" @click="clearFilter" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import AppIconButton from "~/components/AppIconButton.vue";
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const focusFilterEventName = "tva-image-tagger:focus-filter";

const {
  config,
  autocompleteTags,
  filterTextStyleRules,
  applyFilter,
  invertFilter,
  clearFilter
} = useImageTaggerContext();

const filterField = ref<InstanceType<typeof TagField> | null>(null);
const filterRoot = ref<HTMLElement | null>(null);

const filterPlaceholder = computed(() => {
  if (config.filterMode === "regex") {
    return config.filterTarget === "filename" ? "filename regex" : "caption regex";
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
    ? "Full tag mode searches filenames by text terms when Filename is selected. Shortcut: Ctrl+K focuses this filter."
    : "Full tag mode requires exact caption tags for all comma-separated terms. Shortcut: Ctrl+K focuses this filter.";
});

function focusFilter(): void {
  void nextTick(() => {
    const activeElement = document.activeElement;
    const hasFilterFocus = activeElement instanceof Node && filterRoot.value?.contains(activeElement);
    if (filterRoot.value && !hasFilterFocus && !isElementVisible(filterRoot.value)) {
      scrollNearestContainerToElement(filterRoot.value);
    }
    filterField.value?.focus();
  });
}

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const parent = findScrollParent(element);
  const bounds = parent
    ? parent.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight };

  return rect.top >= bounds.top && rect.bottom <= bounds.bottom && rect.top >= 0 && rect.bottom <= window.innerHeight;
}

function scrollNearestContainerToElement(element: HTMLElement): void {
  const parent = findScrollParent(element);
  const elementRect = element.getBoundingClientRect();
  const parentRect = parent
    ? parent.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight };

  if (elementRect.top < parentRect.top) {
    const delta = elementRect.top - parentRect.top - 8;
    parent ? parent.scrollTop += delta : window.scrollBy({ top: delta });
    return;
  }

  if (elementRect.bottom > parentRect.bottom) {
    const delta = elementRect.bottom - parentRect.bottom + 8;
    parent ? parent.scrollTop += delta : window.scrollBy({ top: delta });
  }
}

function findScrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll)/.test(`${style.overflow}${style.overflowY}${style.overflowX}`) && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}

onMounted(() => {
  window.addEventListener(focusFilterEventName, focusFilter);
});

onBeforeUnmount(() => {
  window.removeEventListener(focusFilterEventName, focusFilter);
});
</script>

<style scoped lang="scss">
.filter-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: var(--app-space-gap);
  align-items: end;

  &__field {
    min-width: 0;
  }

  &__bar {
    display: grid;
    grid-template-columns: minmax(96px, 1fr) minmax(104px, 1fr);
    gap: var(--app-space-gap);
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
    gap: var(--app-space-layout);
  }

  &__action {
    --app-icon-button-size: 26px;
    --app-icon-button-radius: 4px;
    --app-icon-size: 14px;
  }
}

@media (max-width: 1120px) {
  .filter-controls {
    grid-template-columns: 1fr;
  }
}

:global(.side-panel) .filter-controls {
  @extend .filter-controls--side;
}

.filter-controls--side {
  grid-template-columns: 1fr;
  max-width: 100%;
  overflow: visible;

  > * {
    min-width: 0;
    max-width: 100%;
  }

  &__bar {
    display: flex;
    flex-wrap: wrap;
    min-width: 0;
    max-width: 100%;
    gap: var(--app-space-gap);
  }

  &__actions {
    justify-content: flex-start;
    flex: 0 0 auto;
  }

  &__select {
    flex: 1 1 104px;
    width: auto;
    min-width: 0;
  }

  &__case {
    flex: 1 1 112px;
    min-width: 0;
    white-space: normal;
  }

  :deep(.tag-field),
  :deep(.tag-field__editor),
  :deep(.cm-editor),
  :deep(.cm-scroller),
  :deep(.cm-content) {
    min-width: 0;
    max-width: 100%;
  }
}
</style>
