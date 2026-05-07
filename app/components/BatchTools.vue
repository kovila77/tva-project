<template>
  <details open>
    <summary title="Batch tools operate on loaded or currently visible images in browser memory. Every batch mutation is added to undo history.">Batch Tools</summary>
    <div class="batch-tools__description">
      Batch tools never edit source files directly. They change the in-memory dataset, then you export ZIP files when ready. Undo/redo can reverse each batch operation.
    </div>
    <TagField
      v-model="batch.addTag"
      label="Add tag to visible"
      :rows="1"
      mode="single-tag"
      placeholder="tag"
      title="One tag to append to every currently visible image that does not already contain it."
      :autocomplete-items="autocompleteTags"
      :style-rules="imageTagTextStyleRules"
    />
    <div class="batch-tools__description">
      Adds one exact tag to each currently visible image that does not already have it. Filtered-out rows are untouched and the whole batch is one undo step.
    </div>
    <button class="btn primary full" type="button" title="Append the typed tag to each visible image. This is one undoable operation." :disabled="!batch.addTag.trim() || !visibleImages.length" @click="addTagToVisible">
      <AppIcon name="add" class="icon" /> Add To Visible
    </button>

    <TagField
      v-model="config.removePatternsText"
      label="Remove regex"
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
    <div class="batch-tools__split-actions">
      <button class="btn danger" type="button" title="Remove tags matching the regex list from visible images. Undo restores the prior tag lists." :disabled="!config.removePatternsText.trim()" @click="removeRegexFromVisible">
        <AppIcon name="clean" class="icon" /> Clean Visible
      </button>
      <button class="btn" type="button" title="Convert tags like artist:name to by name across all loaded images. Undo restores previous tags." :disabled="!images.length" @click="replaceArtistTags">
        <AppIcon name="replace" class="icon" /> artist:* -> by *
      </button>
    </div>

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
import AppIcon from "~/components/AppIcon.vue";
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  config,
  batch,
  autocompleteTags,
  imageTagTextStyleRules,
  regexTextStyleRules,
  images,
  visibleImages,
  addTagToVisible,
  removeRegexFromVisible,
  replaceArtistTags,
  renameVisibleFiles,
  applyOrderToVisible
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.batch-tools {
  &__description {
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-soft);
    padding: 8px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }

  &__split-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
}
</style>
