<template>
  <aside v-if="config.sidePanelMode !== 'hidden'" class="side-panel">
    <details v-if="config.tagSetsPlacement === 'side'" open>
      <summary title="Editable tag sets used by row chips, unknown-tag detection, highlighting, and ordering.">Tag Sets</summary>
      <TagSetFields />
    </details>

    <BatchTools />
    <HistoryPanel />

    <details v-if="config.statsPlacement === 'side'" open>
      <summary title="Tag count statistics. Long natural-language tags wrap instead of being clipped.">Tag Statistics</summary>
      <TagStatsList />
    </details>
  </aside>
</template>

<script setup lang="ts">
import BatchTools from "~/components/BatchTools.vue";
import HistoryPanel from "~/components/HistoryPanel.vue";
import TagSetFields from "~/components/TagSetFields.vue";
import TagStatsList from "~/components/TagStatsList.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const { config } = useImageTaggerContext();
</script>

<style scoped lang="scss">
.side-panel {
  position: sticky;
  top: 86px;
  max-height: calc(100vh - 98px);
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);

  :deep(details) {
    border-bottom: 1px solid var(--border);
    padding: 8px 0;

    &:last-child {
      border-bottom: 0;
    }
  }

  :deep(summary) {
    margin-bottom: 8px;
    cursor: pointer;
    font-weight: 750;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }
}

@media (max-width: 1260px) {
  .side-panel {
    position: static;
    max-height: none;
  }
}
</style>
