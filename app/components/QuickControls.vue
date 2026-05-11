<template>
  <div v-if="hasQuickControls" class="quick-controls" title="Top controls. Sections can be collapsed to keep the image workspace close to the header.">
    <div v-if="hasHeaderTagSets" class="quick-controls__tag-sets">
      <TagSetFields placement="top" collapsible />
    </div>

    <details v-if="config.filterPlacement === 'header'" class="quick-controls__section" open>
      <summary>
        <span>Filter</span>
        <SectionPlacementButtons v-model="config.filterPlacement" />
      </summary>
      <FilterControls />
    </details>

  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FilterControls from "~/components/FilterControls.vue";
import SectionPlacementButtons from "~/components/SectionPlacementButtons.vue";
import TagSetFields from "~/components/TagSetFields.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config, hasHeaderTagSets } = useImageTaggerContext();

const hasQuickControls = computed(() => (
  config.filterPlacement === "header"
  || hasHeaderTagSets.value
));
</script>

<style scoped lang="scss">
.quick-controls {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-gap);

  &__section {
    border-top: 1px solid var(--border);
    padding-top: var(--app-space-panel);

    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--app-space-gap);
      margin-bottom: var(--app-space-panel);
      cursor: pointer;
      font-weight: 750;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }
  }

  &__tag-sets {
    border-top: 1px solid var(--border);
    padding-top: var(--app-space-panel);
  }
}
</style>
