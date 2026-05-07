<template>
  <article
    class="image-row"
    :class="{
      'image-row--dirty': image.dirty,
      'image-row--fixed': config.imageRowHeightMode === 'fixed',
      'image-row--image-fixed': config.imageWidthMode === 'fixed',
      'image-row--image-flexible': config.imageWidthMode === 'flexible',
      'image-row--no-tags': !showChipColumn
    }"
  >
    <button class="image-row__thumb" type="button" :title="`Open image viewer for ${image.fileName}. Source file is not modified.`" @click="openViewer(image)">
      <img :src="image.objectUrl" :alt="image.fileName" loading="lazy" decoding="async">
      <span
        v-if="config.imageWidthMode === 'flexible'"
        class="image-row__thumb-resize"
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize image columns for all rows."
        @click.stop
        @pointerdown.stop.prevent="startImageWidthResize"
      />
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
        <button class="image-row__plain-action" type="button" title="Filter the dataset by the selected tag." aria-label="Filter by selected tag" :disabled="!image.selectedTag" @click="filterByTag(image.selectedTag)"><AppIcon name="filter" class="icon" /></button>
        <button class="image-row__plain-action" type="button" title="Append the selected tag to the current filter." aria-label="Add selected tag to filter" :disabled="!image.selectedTag" @click="addSelectedToFilter(image)"><AppIcon name="filterAdd" class="icon" /></button>
        <button class="image-row__plain-action" type="button" title="Add selected tag to common tags, making it available as a row chip." aria-label="Add selected tag to common tags" :disabled="!image.selectedTag" @click="appendConfigTag('commonTagsText', image.selectedTag)"><AppIcon name="common" class="icon" /></button>
        <button class="image-row__plain-action" type="button" title="Add selected tag to known tags so it is no longer marked unknown." aria-label="Add selected tag to known tags" :disabled="!image.selectedTag" @click="appendConfigTag('knownTagsText', image.selectedTag)"><AppIcon name="known" class="icon" /></button>
        <button class="image-row__plain-action" type="button" title="Add selected tag to highlighted tags." aria-label="Add selected tag to highlighted tags" :disabled="!image.selectedTag" @click="appendConfigTag('highlightTagsText', image.selectedTag)"><AppIcon name="highlight" class="icon" /></button>
        <button class="image-row__plain-action" type="button" title="Add selected text/tag to highlighted text fragments." aria-label="Add selected tag to highlighted text" :disabled="!image.selectedTag" @click="appendConfigTag('highlightText', image.selectedTag)"><AppIcon name="text" class="icon" /></button>
        <button class="image-row__plain-action image-row__plain-action--danger" type="button" title="Remove the selected tag from this image and keep it restorable in Deleted tags." aria-label="Remove selected tag" :disabled="!image.selectedTag" @click="removeTagFromImage(image, image.selectedTag)"><AppIcon name="remove" class="icon" /></button>
        <button class="image-row__plain-action" type="button" :title="imageUndoTitle(image)" :aria-label="`Undo operation for ${image.fileName}`" :disabled="!canUndoImage(image)" @click="undoImage(image)"><AppIcon name="undo" class="icon" /></button>
        <button class="image-row__plain-action" type="button" :title="imageRedoTitle(image)" :aria-label="`Redo operation for ${image.fileName}`" :disabled="!canRedoImage(image)" @click="redoImage(image)"><AppIcon name="redo" class="icon" /></button>
        <button class="image-row__plain-action" type="button" :title="`Restore ${image.fileName} to the tags loaded from disk. This is undoable.`" :aria-label="`Restore original tags for ${image.fileName}`" :disabled="tagsEqual(image.tags, image.originalTags)" @click="revertImage(image)"><AppIcon name="revert" class="icon" /></button>
        <button class="image-row__plain-action image-row__plain-action--danger" type="button" :title="`Hide ${image.fileName} from this in-memory session. Source files are not deleted and global Undo restores this row.`" :aria-label="`Remove ${image.fileName} from memory`" @click="removeImage(image)"><AppIcon name="removeItem" class="icon" /></button>
      </div>

      <div v-if="image.historyOpen" class="image-row__history" :title="`Recent undo/redo entries touching ${image.fileName}.`">
        <strong>History preview</strong>
        <div v-for="entry in imageHistory(image)" :key="entry.key" class="image-row__history-line">
          {{ entry.text }}
        </div>
        <div v-if="!imageHistory(image).length" class="empty-inline">No committed history for this image yet.</div>
      </div>
    </div>

    <div v-if="showChipColumn" class="image-row__tag-column" title="Clickable row tags. Use display controls to choose which chips are shown.">
      <div v-if="visibleCommonTags.length" class="image-row__chip-group">
        <TagChip
          v-for="tag in visibleCommonTags"
          :key="`${image.id}-common-${tag}`"
          :tag="tag"
          variant="common"
          :icon="hasTag(image, tag) ? 'remove' : 'add'"
          :active="hasTag(image, tag)"
          :title="hasTag(image, tag) ? `Remove common tag '${tag}' from this image. Undoable.` : `Add common tag '${tag}' to this image. Undoable.`"
          @click="toggleTag(image, tag)"
        />
      </div>

      <div v-if="visibleNonCommonTags.length" class="image-row__chip-group">
        <TagChip
          v-for="tag in visibleNonCommonTags"
          :key="`${image.id}-tag-${tag}`"
          :tag="tag"
          icon="remove"
          :title="`Remove tag '${tag}' and store it in Deleted tags. Undoable.`"
          @click="removeTagFromImage(image, tag, false)"
        />
      </div>

      <div v-if="visibleRemovedTags.length" class="image-row__chip-group image-row__deleted-tags">
        <span class="image-row__chip-heading">Deleted</span>
        <TagChip
          v-for="tag in visibleRemovedTags"
          :key="`${image.id}-removed-${tag}`"
          :tag="tag"
          icon="add"
          variant="removed"
          :decorate-states="false"
          :title="`Return deleted tag '${tag}' to this image. Undoable.`"
          @click="restoreRemovedTag(image, tag)"
        />
      </div>

      <div v-if="!hasVisibleChips" class="image-row__chip-placeholder">&lt;no tags&gt;</div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import TagChip from "~/components/TagChip.vue";
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ImageRecord } from "~/types/imageTagger";

const props = defineProps<{
  image: ImageRecord;
}>();

const {
  config,
  commonTags,
  autocompleteTags,
  imageTagTextStyleRules,
  imageMetadataLine,
  openViewer,
  commitEditor,
  onEditorInput,
  setSelectedTag,
  imageUndoTitle,
  imageRedoTitle,
  canUndoImage,
  canRedoImage,
  undoImage,
  redoImage,
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

const showChipColumn = computed(() => config.rowChipMode !== "hidden");
const visibleCommonTags = computed(() => (
  config.rowChipMode === "common"
  || config.rowChipMode === "common-deleted"
  || config.rowChipMode === "everything"
    ? commonTags.value
    : []
));
const visibleNonCommonTags = computed(() => (
  config.rowChipMode === "everything" ? nonCommonTags(props.image) : []
));
const visibleRemovedTags = computed(() => (
  config.rowChipMode === "deleted"
  || config.rowChipMode === "common-deleted"
  || config.rowChipMode === "everything"
    ? props.image.removedTags
    : []
));
const hasVisibleChips = computed(() => (
  Boolean(visibleCommonTags.value.length)
  || Boolean(visibleNonCommonTags.value.length)
  || Boolean(visibleRemovedTags.value.length)
));

let resizeStartX = 0;
let resizeStartWidth = 0;

function startImageWidthResize(event: PointerEvent): void {
  resizeStartX = event.clientX;
  resizeStartWidth = config.imageFixedWidth;
  event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", resizeImageWidth);
  window.addEventListener("pointerup", stopImageWidthResize, { once: true });
}

function resizeImageWidth(event: PointerEvent): void {
  config.imageFixedWidth = Math.max(50, Math.round(resizeStartWidth + event.clientX - resizeStartX));
}

function stopImageWidthResize(): void {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  window.removeEventListener("pointermove", resizeImageWidth);
}

onBeforeUnmount(() => {
  stopImageWidthResize();
});
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

  &--image-fixed,
  &--image-flexible {
    grid-template-columns: var(--image-fixed-width, 240px) minmax(280px, 1fr) minmax(260px, 0.9fr);
  }

  &--image-fixed#{&}--no-tags,
  &--image-flexible#{&}--no-tags {
    grid-template-columns: var(--image-fixed-width, 240px) minmax(280px, 1fr);
  }

  &__thumb {
    position: relative;
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

  &--image-fixed &__thumb,
  &--image-flexible &__thumb {
    width: var(--image-fixed-width, 240px);
  }

  &__thumb-resize {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 10px;
    cursor: col-resize;

    &::after {
      position: absolute;
      top: 12px;
      right: 3px;
      bottom: 12px;
      width: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--text) 46%, transparent);
      content: "";
      opacity: 0.75;
    }

    &:hover::after {
      background: var(--blue);
      opacity: 1;
    }
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

  &__plain-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    min-width: 30px;
    height: 30px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    padding: 0;
    line-height: 1;

    &:hover:not(:disabled),
    &:focus-visible {
      color: var(--text);
    }

    &--danger {
      color: var(--red);
    }
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

  &__chip-placeholder {
    border: 1px dashed var(--border);
    border-radius: 6px;
    background: var(--surface-soft);
    padding: 8px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 750;
  }
}

@media (max-width: 1260px) {
  .image-row {
    grid-template-columns: 150px minmax(0, 1fr);
  }

  .image-row--image-fixed,
  .image-row--image-flexible {
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
