<template>
  <div v-if="hasQuickControls" class="quick-controls" title="Top controls. Sections can be collapsed to keep the image workspace close to the header.">
    <details v-if="config.layoutConfigPlacement === 'header'" class="quick-controls__section" open>
      <summary>Layout config</summary>
      <LayoutConfigControls />
    </details>

    <div v-if="config.tagSetsPlacement === 'top'" class="quick-controls__tag-sets">
      <TagSetFields collapsible />
    </div>

    <details v-if="config.filterPlacement === 'header'" class="quick-controls__section" open>
      <summary>Filter</summary>
      <FilterControls />
    </details>

  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FilterControls from "~/components/FilterControls.vue";
import LayoutConfigControls from "~/components/LayoutConfigControls.vue";
import TagSetFields from "~/components/TagSetFields.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config } = useImageTaggerContext();

const hasQuickControls = computed(() => (
  config.layoutConfigPlacement === "header"
  || config.filterPlacement === "header"
  || config.tagSetsPlacement === "top"
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
