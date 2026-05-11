<template>
  <div v-if="hasQuickControls" class="quick-controls" title="Top controls. Sections can be collapsed to keep the image workspace close to the header.">
    <div v-if="hasHeaderTagSets" class="quick-controls__tag-sets">
      <TagSetFields placement="top" collapsible />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import TagSetFields from "~/components/TagSetFields.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { hasHeaderTagSets } = useImageTaggerContext();

const hasQuickControls = computed(() => (
  hasHeaderTagSets.value
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
