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
