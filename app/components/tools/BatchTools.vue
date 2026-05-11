<template>
  <details class="batch-tools" open>
    <summary title="Batch tools operate on loaded or currently visible images in browser memory. Every batch mutation is added to undo history.">Batch Tools</summary>
    <div class="batch-tools__description">
      Batch tools never edit source files directly. They change the in-memory dataset, then you export ZIP files when ready. Undo/redo can reverse each batch operation.
    </div>
    <TagField
      v-model="config.removePatternsText"
      label="Batch remove multiple tags with regex"
      :rows="4"
      mode="regex"
      placeholder="artist:.*, lowres"
      title="Comma- or newline-separated regular expressions. Any tag matching one of these patterns is removed from visible images and saved in each image's deleted-tags list."
      :autocomplete="false"
      :style-rules="regexTextStyleRules"
      show-history-buttons
    />
    <div class="batch-tools__description">
      Clean Visible removes matching tags only from currently visible rows. Removed tags remain restorable on each image.
    </div>
    <button class="btn danger full" type="button" title="Remove tags matching the regex list from visible images. Undo restores the prior tag lists." :disabled="!config.removePatternsText.trim()" @click="removeRegexFromVisible">
      <AppIcon name="clean" class="icon" /> Clean Visible
    </button>

    <div class="batch-tools__description">
      Rename Visible changes export names only, using the current visible order. Apply Tag Order moves configured tags to the front of visible rows without deleting unlisted tags.
    </div>
    <button class="btn full" type="button" title="Rename visible image/tag output names to 00001, 00002, etc. This changes export names only, not source files." :disabled="!visibleImages.length" @click="renameVisibleFiles">
      <AppIcon name="hashtag" class="icon" /> Rename Visible In Order
    </button>
    <button class="btn full" type="button" title="Apply the configured tag order to currently visible images. This is useful before export and can be undone." :disabled="!config.orderTagsText.trim() || !visibleImages.length" @click="applyOrderToVisible">
      <AppIcon name="order" class="icon" /> Apply Tag Order To Visible
    </button>
  </details>
</template>

<script setup lang="ts">
import AppIcon from "~/components/core/AppIcon.vue";
import TagField from "~/components/tags/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  config,
  regexTextStyleRules,
  visibleImages,
  removeRegexFromVisible,
  renameVisibleFiles,
  applyOrderToVisible
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.batch-tools {
  padding: var(--app-space-panel) 0;

  summary {
    margin-bottom: var(--app-space-panel);
    cursor: pointer;
    font-weight: 750;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &__description {
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
    background: var(--surface-soft);
    padding: var(--app-space-panel);
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }

}
</style>
