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
    <div class="image-row__image-cell">
      <button class="image-row__thumb" type="button" :title="`Open image viewer for ${image.fileName}. Source file is not modified.`" @click="openViewer(image)">
        <img :src="image.objectUrl" :alt="image.fileName" loading="lazy" decoding="async">
      </button>
      <span
        v-if="config.imageWidthMode === 'flexible'"
        class="image-row__image-resize"
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize image columns for all rows."
        @click.stop
        @pointerdown.stop.prevent="startImageWidthResize"
      />
    </div>

    <div class="image-row__editor">
      <div class="image-row__title">
        <div>
          <h3>
            <template v-for="part in fileNameParts" :key="part.key">
              <span :class="{ 'tag-text-filtered-blink': part.highlighted }">{{ part.text }}</span>
            </template>
          </h3>
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
        <AppIconButton class="image-row__plain-action" icon="filter" title="Filter the dataset by the selected tag." aria-label="Filter by selected tag" :disabled="!image.selectedTag" @click="filterByTag(image.selectedTag)" />
        <AppIconButton class="image-row__plain-action" icon="filterAdd" title="Append the selected tag to the current filter." aria-label="Add selected tag to filter" :disabled="!image.selectedTag" @click="addSelectedToFilter(image)" />
        <AppIconButton class="image-row__plain-action" icon="common" title="Add selected tag to common tags, making it available as a row chip." aria-label="Add selected tag to common tags" :disabled="!image.selectedTag" @click="appendConfigTag('commonTagsText', image.selectedTag)" />
        <AppIconButton class="image-row__plain-action" icon="known" title="Add selected tag to known tags so it is no longer marked unknown." aria-label="Add selected tag to known tags" :disabled="!image.selectedTag" @click="appendConfigTag('knownTagsText', image.selectedTag)" />
        <AppIconButton class="image-row__plain-action" icon="highlight" title="Add selected tag to highlighted tags." aria-label="Add selected tag to highlighted tags" :disabled="!image.selectedTag" @click="appendConfigTag('highlightTagsText', image.selectedTag)" />
        <AppIconButton class="image-row__plain-action" icon="text" title="Add selected text/tag to highlighted text fragments." aria-label="Add selected tag to highlighted text" :disabled="!image.selectedTag" @click="appendConfigTag('highlightText', image.selectedTag)" />
        <AppIconButton class="image-row__plain-action" icon="remove" title="Remove the selected tag from this image and keep it restorable in Deleted tags." aria-label="Remove selected tag" :disabled="!image.selectedTag" danger @click="removeTagFromImage(image, image.selectedTag)" />
        <AppIconButton class="image-row__plain-action" icon="undo" :title="imageUndoTitle(image)" :aria-label="`Undo operation for ${image.fileName}`" :disabled="!canUndoImage(image)" @click="undoImage(image)" />
        <AppIconButton class="image-row__plain-action" icon="redo" :title="imageRedoTitle(image)" :aria-label="`Redo operation for ${image.fileName}`" :disabled="!canRedoImage(image)" @click="redoImage(image)" />
        <AppIconButton class="image-row__plain-action" icon="revert" :title="`Restore ${image.fileName} to the tags loaded from disk. This is undoable.`" :aria-label="`Restore original tags for ${image.fileName}`" :disabled="tagsEqual(image.tags, image.originalTags)" @click="revertImage(image)" />
        <AppIconButton class="image-row__plain-action" icon="removeItem" :title="`Hide ${image.fileName} from this in-memory session. Source files are not deleted and global Undo restores this row.`" :aria-label="`Remove ${image.fileName} from memory`" danger @click="removeImage(image)" />
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
      <div
        v-if="visibleCommonTags.length"
        class="image-row__chip-group"
        data-tag-drop-target="active"
      >
        <TagChip
          v-for="tag in visibleCommonTags"
          :key="`${image.id}-common-${tag}`"
          :tag="tag"
          :image-id="image.id"
          drag-source="active"
          variant="common"
          :icon="hasTag(image, tag) ? 'remove' : 'add'"
          :active="hasTag(image, tag)"
          :title="hasTag(image, tag) ? `Remove common tag '${tag}' from this image. Undoable.` : `Add common tag '${tag}' to this image. Undoable.`"
          data-tag-drop-target="active"
          :data-before-tag="tag"
          @tag-drop="onChipTagDrop"
          @click="toggleTag(image, tag)"
        />
      </div>

      <div
        v-if="visibleNonCommonTags.length"
        class="image-row__chip-group"
        data-tag-drop-target="active"
      >
        <TagChip
          v-for="tag in visibleNonCommonTags"
          :key="`${image.id}-tag-${tag}`"
          :tag="tag"
          :image-id="image.id"
          drag-source="active"
          icon="remove"
          :title="`Remove tag '${tag}' and store it in Deleted tags. Undoable.`"
          data-tag-drop-target="active"
          :data-before-tag="tag"
          @tag-drop="onChipTagDrop"
          @click="removeTagFromImage(image, tag, false)"
        />
      </div>

      <div
        v-if="visibleRemovedTags.length"
        class="image-row__chip-group image-row__deleted-tags"
        data-tag-drop-target="deleted"
      >
        <span class="image-row__chip-heading">Deleted</span>
        <TagChip
          v-for="tag in visibleRemovedTags"
          :key="`${image.id}-removed-${tag}`"
          :tag="tag"
          :image-id="image.id"
          drag-source="deleted"
          icon="add"
          variant="removed"
          :decorate-states="false"
          :title="`Return deleted tag '${tag}' to this image. Undoable.`"
          data-tag-drop-target="deleted"
          @tag-drop="onChipTagDrop"
          @click="restoreRemovedTag(image, tag)"
        />
      </div>

      <div v-if="!hasVisibleChips" class="image-row__chip-placeholder">...</div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import AppIconButton from "~/components/AppIconButton.vue";
import TagChip from "~/components/TagChip.vue";
import TagField from "~/components/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ImageRecord } from "~/types/imageTagger";

const props = defineProps<{
  image: ImageRecord;
}>();

const {
  config,
  filteredBlinkPatterns,
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
  restoreRemovedTag,
  moveTagToDeleted,
  moveDeletedTagToImage,
  reorderImageTag
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
const fileNameParts = computed(() => {
  if (config.filterMode !== "regex" || config.filterTarget !== "filename" || !filteredBlinkPatterns.value.length) {
    return [{ key: "plain-0", text: props.image.fileName, highlighted: false }];
  }

  return splitRegexMatches(props.image.fileName, filteredBlinkPatterns.value, config.ignoreCase);
});

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

function onChipTagDrop(event: { clientX: number; clientY: number; source: "active" | "deleted"; tag: string }): void {
  const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-tag-drop-target]");
  const target = dropTarget?.dataset.tagDropTarget;
  if (target !== "active" && target !== "deleted") {
    return;
  }

  if (target === "deleted") {
    if (event.source === "active") {
      moveTagToDeleted(props.image, event.tag);
    }
    return;
  }

  const beforeTag = dropTarget?.dataset.beforeTag ?? "";
  if (event.source === "deleted") {
    moveDeletedTagToImage(props.image, event.tag, beforeTag);
    return;
  }

  reorderImageTag(props.image, event.tag, beforeTag);
}

onBeforeUnmount(() => {
  stopImageWidthResize();
});

function splitRegexMatches(text: string, patterns: string[], ignoreCase: boolean): Array<{ key: string; text: string; highlighted: boolean }> {
  const highlighted = Array.from({ length: text.length }, () => false);

  for (const source of patterns) {
    try {
      const pattern = new RegExp(source, ignoreCase ? "gi" : "g");
      let match: RegExpExecArray | null = pattern.exec(text);
      while (match) {
        const found = match[0];
        if (found) {
          for (let index = match.index; index < match.index + found.length; index += 1) {
            highlighted[index] = true;
          }
        }
        pattern.lastIndex = found ? pattern.lastIndex : pattern.lastIndex + 1;
        match = pattern.exec(text);
      }
    } catch {
      // Invalid regexes are handled by filter validation; highlighting can ignore them.
    }
  }

  const parts: Array<{ key: string; text: string; highlighted: boolean }> = [];
  let start = 0;
  while (start < text.length) {
    const isHighlighted = highlighted[start];
    let end = start + 1;
    while (end < text.length && highlighted[end] === isHighlighted) {
      end += 1;
    }

    parts.push({
      key: `${isHighlighted ? "match" : "plain"}-${start}`,
      text: text.slice(start, end),
      highlighted: isHighlighted
    });
    start = end;
  }

  return parts.length ? parts : [{ key: "plain-0", text, highlighted: false }];
}
</script>

<style scoped lang="scss">
.image-row {
  display: grid;
  grid-template-columns: minmax(160px, 240px) minmax(280px, 1fr) minmax(260px, 0.9fr);
  gap: var(--app-space-gap);
  padding: var(--app-space-panel);
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

  &__image-cell {
    position: relative;
    width: 100%;
    min-width: 0;
  }

  &__thumb {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
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

  &__image-resize {
    position: absolute;
    top: 0;
    right: -8px;
    bottom: 0;
    z-index: 2;
    width: 16px;
    cursor: col-resize;

    &::after {
      position: absolute;
      top: 12px;
      right: 6px;
      bottom: 12px;
      width: 3px;
      border-radius: var(--pill-radius);
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

  &--fixed &__image-cell {
    height: 100%;
  }

  &__editor,
  &__tag-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--app-space-gap);
  }

  &--fixed &__editor {
    min-height: 0;
    overflow: auto;
  }

  &__title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--app-space-gap);

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
    gap: var(--app-space-layout);
  }

  &__plain-action {
    --app-icon-button-size: 30px;
  }

  &__history {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-gap);
    border: 1px solid var(--border);
    border-radius: var(--control-radius);
    background: var(--surface-soft);
    padding: var(--app-space-panel);
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
    padding-top: var(--app-space-panel);
  }

  &__chip-heading {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
  }

  &__chip-placeholder {
    border: 1px dashed var(--border);
    border-radius: var(--control-radius);
    background: var(--surface-soft);
    padding: var(--app-space-panel);
    color: var(--muted);
    font-size: 12px;
    font-weight: 750;
    text-align: center;
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
