<template>
  <article
    class="image-row"
    :class="{
      'image-row--dirty': image.dirty,
      'image-row--fixed': config.imageRowHeightMode === 'fixed',
      'image-row--image-fixed': config.imageWidthMode === 'fixed',
      'image-row--no-tags': !config.showTagsColumn
    }"
  >
    <button class="image-row__thumb" type="button" :title="`Open image viewer for ${image.fileName}. Source file is not modified.`" @click="openViewer(image)">
      <img :src="image.objectUrl" :alt="image.fileName" loading="lazy" decoding="async">
    </button>

    <div class="image-row__editor">
      <div class="image-row__title">
        <div>
          <h3>{{ image.fileName }}</h3>
          <span>{{ imageMetadataLine(image) }}</span>
        </div>
        <span v-if="image.dirty" class="pill warn">changed</span>
      </div>

      <TagField
        v-model="image.editText"
        :selected-tag="image.selectedTag"
        class="image-row__tag-field"
        mode="tags"
        :rows="5"
        :autocomplete-items="autocompleteTags"
        :style-rules="imageTagTextStyleRules"
        selectable
        show-selected
        show-history-buttons
        title="Edit comma- or newline-separated tags. Ctrl+Enter applies the draft. Blur also applies the draft."
        @input="onEditorInput(image)"
        @selected-change="setSelectedTag(image, $event)"
        @blur="commitEditor(image, 'edit')"
        @commit="commitEditor(image, 'edit')"
      />

      <div class="image-row__actions">
        <button class="btn icon-btn" type="button" :title="`Preview ${image.fileName} with zoom and pan.`" :aria-label="`Preview ${image.fileName}`" @click="openViewer(image)"><AppIcon name="preview" class="icon" /></button>
        <button class="btn icon-btn" type="button" :title="`Copy temporary browser object URL for ${image.fileName}.`" :aria-label="`Copy temporary URL for ${image.fileName}`" @click="copyImageUrl(image)"><AppIcon name="copy" class="icon" /></button>
        <button class="btn success icon-btn" type="button" :title="`Apply the current text draft for ${image.fileName}. Creates one undoable history entry.`" :aria-label="`Apply tag draft for ${image.fileName}`" :disabled="!image.draftDirty" @click="commitEditor(image, 'edit')"><AppIcon name="apply" class="icon" /></button>
        <button class="btn warn icon-btn" type="button" :title="imageUndoTitle(image)" :aria-label="`Undo operation for ${image.fileName}`" :disabled="!canUndoImage(image)" @click="undoImage(image)"><AppIcon name="undo" class="icon" /></button>
        <button class="btn warn icon-btn" type="button" :title="imageRedoTitle(image)" :aria-label="`Redo operation for ${image.fileName}`" :disabled="!canRedoImage(image)" @click="redoImage(image)"><AppIcon name="redo" class="icon" /></button>
        <button class="btn icon-btn" type="button" :title="imageHistoryTitle(image)" :aria-label="`Toggle history for ${image.fileName}`" @click="toggleImageHistory(image)"><AppIcon name="history" class="icon" /></button>
        <button class="btn icon-btn" type="button" :title="`Restore ${image.fileName} to the tags loaded from disk. This is undoable.`" :aria-label="`Restore original tags for ${image.fileName}`" :disabled="tagsEqual(image.tags, image.originalTags)" @click="revertImage(image)"><AppIcon name="revert" class="icon" /></button>
        <button class="btn danger icon-btn" type="button" :title="`Hide ${image.fileName} from this in-memory session. Source files are not deleted and global Undo restores this row.`" :aria-label="`Remove ${image.fileName} from memory`" @click="removeImage(image)"><AppIcon name="removeItem" class="icon" /></button>
      </div>

      <div class="image-row__actions">
        <button class="btn icon-btn" type="button" title="Filter the dataset by the selected tag." aria-label="Filter by selected tag" :disabled="!image.selectedTag" @click="filterByTag(image.selectedTag)"><AppIcon name="filter" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Append the selected tag to the current filter." aria-label="Add selected tag to filter" :disabled="!image.selectedTag" @click="addSelectedToFilter(image)"><AppIcon name="filterAdd" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected tag to common tags, making it available as a row chip." aria-label="Add selected tag to common tags" :disabled="!image.selectedTag" @click="appendConfigTag('commonTagsText', image.selectedTag)"><AppIcon name="common" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected tag to known tags so it is no longer marked unknown." aria-label="Add selected tag to known tags" :disabled="!image.selectedTag" @click="appendConfigTag('knownTagsText', image.selectedTag)"><AppIcon name="known" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected tag to highlighted tags." aria-label="Add selected tag to highlighted tags" :disabled="!image.selectedTag" @click="appendConfigTag('highlightTagsText', image.selectedTag)"><AppIcon name="highlight" class="icon" /></button>
        <button class="btn icon-btn" type="button" title="Add selected text/tag to highlighted text fragments." aria-label="Add selected tag to highlighted text" :disabled="!image.selectedTag" @click="appendConfigTag('highlightText', image.selectedTag)"><AppIcon name="text" class="icon" /></button>
        <button class="btn danger icon-btn" type="button" title="Remove the selected tag from this image and keep it restorable in Deleted tags." aria-label="Remove selected tag" :disabled="!image.selectedTag" @click="removeTagFromImage(image, image.selectedTag)"><AppIcon name="remove" class="icon" /></button>
      </div>

      <div v-if="image.historyOpen" class="image-row__history" :title="`Recent undo/redo entries touching ${image.fileName}.`">
        <strong>History preview</strong>
        <div v-for="entry in imageHistory(image)" :key="entry.key" class="image-row__history-line">
          {{ entry.text }}
        </div>
        <div v-if="!imageHistory(image).length" class="empty-inline">No committed history for this image yet.</div>
      </div>
    </div>

    <div v-if="config.showTagsColumn" class="image-row__tag-column" title="Clickable row tags. Use display controls to hide this column when image/editor width matters more.">
      <div class="image-row__chip-group">
        <TagChip
          v-for="tag in commonTags"
          :key="`${image.id}-common-${tag}`"
          :tag="tag"
          variant="common"
          :icon="hasTag(image, tag) ? 'remove' : 'add'"
          :active="hasTag(image, tag)"
          :title="hasTag(image, tag) ? `Remove common tag '${tag}' from this image. Undoable.` : `Add common tag '${tag}' to this image. Undoable.`"
          @click="toggleTag(image, tag)"
        />
      </div>

      <div class="image-row__chip-group">
        <TagChip
          v-for="tag in nonCommonTags(image)"
          :key="`${image.id}-tag-${tag}`"
          :tag="tag"
          icon="remove"
          :title="`Remove tag '${tag}' and store it in Deleted tags. Undoable.`"
          @click="removeTagFromImage(image, tag, false)"
        />
      </div>

      <div v-if="image.removedTags.length" class="image-row__chip-group image-row__deleted-tags">
        <span class="image-row__chip-heading">Deleted</span>
        <TagChip
          v-for="tag in image.removedTags"
          :key="`${image.id}-removed-${tag}`"
          :tag="tag"
          icon="add"
          variant="removed"
          :decorate-states="false"
          :title="`Return deleted tag '${tag}' to this image. Undoable.`"
          @click="restoreRemovedTag(image, tag)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
import TagChip from "~/components/TagChip.vue";
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ImageRecord } from "~/types/imageTagger";

defineProps<{
  image: ImageRecord;
}>();

const {
  config,
  commonTags,
  autocompleteTags,
  imageTagTextStyleRules,
  imageMetadataLine,
  openViewer,
  copyImageUrl,
  commitEditor,
  onEditorInput,
  setSelectedTag,
  imageUndoTitle,
  imageRedoTitle,
  imageHistoryTitle,
  canUndoImage,
  canRedoImage,
  undoImage,
  redoImage,
  toggleImageHistory,
  revertImage,
  removeImage,
  filterByTag,
  addSelectedToFilter,
  appendConfigTag,
  removeTagFromImage,
  imageHistory,
  tagsEqual,
  hasTag,
  toggleTag,
  nonCommonTags,
  restoreRemovedTag
} = useImageTaggerContext();
</script>

<style scoped lang="scss">
.image-row {
  display: grid;
  grid-template-columns: minmax(160px, 240px) minmax(280px, 1fr) minmax(260px, 0.9fr);
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-raised);

  &--dirty {
    border-color: #f59e0b;
    box-shadow: inset 3px 0 0 #f59e0b;
  }

  &--fixed {
    height: var(--image-row-fixed-height, 360px);
    min-height: 100px;
  }

  &--no-tags {
    grid-template-columns: minmax(160px, 240px) minmax(280px, 1fr);
  }

  &--image-fixed {
    grid-template-columns: var(--image-fixed-width, 240px) minmax(280px, 1fr) minmax(260px, 0.9fr);
  }

  &--image-fixed#{&}--no-tags {
    grid-template-columns: var(--image-fixed-width, 240px) minmax(280px, 1fr);
  }

  &__thumb {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-soft);
    padding: 0;

    img {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
    }
  }

  &--image-fixed &__thumb {
    width: var(--image-fixed-width, 240px);
  }

  &--fixed &__thumb {
    height: 100%;

    img {
      height: 100%;
    }
  }

  &__editor,
  &__tag-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &--fixed &__editor {
    min-height: 0;
    overflow: auto;
  }

  &__title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    h3 {
      margin: 0;
      font-size: 14px;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    span {
      color: var(--muted);
      font-size: 12px;
    }
  }

  &__tag-field {
    :deep(.tag-field__editor .cm-content) {
      min-height: 126px;
    }

    :deep(.tag-field__editor .cm-scroller) {
      max-height: none;
      overflow: visible;
    }
  }

  &--fixed &__tag-field {
    :deep(.tag-field__editor .cm-scroller) {
      max-height: min(46vh, calc((var(--tag-field-rows, 4) * 1.45em) + 18px));
      overflow: auto;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
  }

  &__history {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-soft);
    padding: 8px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;

    strong {
      color: var(--text);
    }
  }

  &__history-line {
    overflow-wrap: anywhere;
  }

  &__tag-column {
    overflow: visible;
  }

  &--fixed &__tag-column {
    align-self: stretch;
    min-height: 0;
    max-height: none;
    overflow: auto;
    contain: size layout;
  }

  &__chip-group {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  &__deleted-tags {
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }

  &__chip-heading {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
  }
}

@media (max-width: 1260px) {
  .image-row {
    grid-template-columns: 150px minmax(0, 1fr);
  }

  .image-row--image-fixed {
    grid-template-columns: var(--image-fixed-width, 240px) minmax(0, 1fr);
  }

  .image-row__tag-column {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .image-row {
    grid-template-columns: 1fr;
  }

  .image-row--fixed {
    overflow: auto;
  }

  .image-row--fixed .image-row__thumb {
    min-height: 100px;
  }
}
</style>
