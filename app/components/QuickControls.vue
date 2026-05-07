<template>
  <div v-if="hasQuickControls" class="quick-controls" title="Top controls. Sections can be collapsed to keep the image workspace close to the header.">
    <details v-if="config.layoutConfigPlacement === 'header'" class="quick-controls__section" open>
      <summary>
        <span>Layout config</span>
        <SectionPlacementButtons v-model="config.layoutConfigPlacement" />
      </summary>
      <LayoutConfigControls />
    </details>

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
import LayoutConfigControls from "~/components/LayoutConfigControls.vue";
import SectionPlacementButtons from "~/components/SectionPlacementButtons.vue";
import TagSetFields from "~/components/TagSetFields.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config, hasHeaderTagSets } = useImageTaggerContext();

const hasQuickControls = computed(() => (
  config.layoutConfigPlacement === "header"
  || config.filterPlacement === "header"
  || hasHeaderTagSets.value
));
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
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
    padding-top: 8px;
  }
}
</style>
