<template>
  <article
    ref="rowElement"
    class="image-row"
    :class="{
      'image-row--dirty': image.dirty,
      'image-row--fixed': config.imageRowHeightMode === 'fixed',
      'image-row--image-fixed': config.imageWidthMode === 'fixed',
      'image-row--image-flexible': config.imageWidthMode === 'flexible',
      'image-row--no-tags': !showChipColumn,
      'image-row--row-dragging': rowDragging,
      'image-row--drop-before': rowDropPlacement === 'before',
      'image-row--drop-after': rowDropPlacement === 'after'
    }"
    @dragover="onImageRowDragOver"
    @dragleave="onImageRowDragLeave"
    @drop="onImageRowDrop"
  >
    <div class="image-row__image-cell">
      <button
        class="image-row__thumb"
        type="button"
        :title="imageThumbTitle"
        :draggable="canReorderImages"
        @click="onImageThumbClick"
        @dragstart="startImageRowDrag"
        @dragend="stopImageRowDrag"
      >
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
        <AppIconButton class="image-row__plain-action" icon="filter" title="Filter the dataset by the selected tag." aria-label="Filter by selected tag" :disabled="!hasSelectedTag" :active="selectedTagInFilter" @click="filterByTag(selectedTagText)" />
        <AppIconButton class="image-row__plain-action" icon="filterAdd" title="Append the selected tag to the current filter." aria-label="Add selected tag to filter" :disabled="!hasSelectedTag" :active="selectedTagInFilter" @click="addSelectedToFilter(image)" />
        <AppIconButton class="image-row__plain-action" icon="common" title="Add selected tag to common tags, making it available as a row chip." aria-label="Add selected tag to common tags" :disabled="!hasSelectedTag" :active="selectedTagInCommon" @click="appendConfigTag('commonTagsText', selectedTagText)" />
        <AppIconButton class="image-row__plain-action" icon="known" title="Add selected tag to known tags so it is no longer marked unknown." aria-label="Add selected tag to known tags" :disabled="!hasSelectedTag" :active="selectedTagInKnown" @click="appendConfigTag('knownTagsText', selectedTagText)" />
        <AppIconButton class="image-row__plain-action" icon="highlight" title="Add selected tag to highlighted tags." aria-label="Add selected tag to highlighted tags" :disabled="!hasSelectedTag" :active="selectedTagIsHighlighted" @click="appendConfigTag('highlightTagsText', selectedTagText)" />
        <AppIconButton class="image-row__plain-action" icon="text" title="Add selected text/tag to highlighted text fragments." aria-label="Add selected tag to highlighted text" :disabled="!hasSelectedTag" :active="selectedTagTextIsHighlighted" @click="appendConfigTag('highlightText', selectedTagText)" />
        <AppIconButton class="image-row__plain-action" icon="remove" title="Remove the selected tag from this image and keep it restorable in Deleted tags." aria-label="Remove selected tag" :disabled="!hasSelectedTag" danger @click="removeTagFromImage(image, selectedTagText)" />
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

    <div
      v-if="showChipColumn"
      ref="tagColumnElement"
      class="image-row__tag-column"
      title="Clickable row tags. Use display controls to choose which chips are shown."
    >
      <span
        v-if="chipDropCursor"
        class="image-row__chip-drop-cursor"
        :style="chipDropCursorStyle"
        aria-hidden="true"
      />
      <div
        v-if="visibleCommonTags.length"
        class="image-row__chip-group"
        data-tag-drop-target="active"
        data-tag-drop-group="common"
      >
        <template v-for="tag in visibleCommonTags" :key="`${image.id}-common-${tag}`">
          <TagChip
            :tag="tag"
            :image-id="image.id"
            drag-source="active"
            variant="common"
            :icon="hasTag(image, tag) ? 'remove' : 'add'"
            :active="hasTag(image, tag)"
            :title="hasTag(image, tag) ? `Remove common tag '${tag}' from this image. Undoable.` : `Add common tag '${tag}' to this image. Undoable.`"
            data-tag-drop-target="active"
            data-tag-drop-group="common"
            :data-before-tag="tag"
            @tag-drag-move="onChipTagDragMove"
            @tag-drag-end="clearChipDropCursor"
            @tag-drop="onChipTagDrop"
            @click="toggleTag(image, tag)"
          />
        </template>
      </div>

      <div
        v-if="visibleNonCommonTags.length"
        class="image-row__chip-group"
        data-tag-drop-target="active"
        data-tag-drop-group="non-common"
      >
        <template v-for="tag in visibleNonCommonTags" :key="`${image.id}-tag-${tag}`">
          <TagChip
            :tag="tag"
            :image-id="image.id"
            drag-source="active"
            icon="remove"
            :title="`Remove tag '${tag}' and store it in Deleted tags. Undoable.`"
            data-tag-drop-target="active"
            data-tag-drop-group="non-common"
            :data-before-tag="tag"
            @tag-drag-move="onChipTagDragMove"
            @tag-drag-end="clearChipDropCursor"
            @tag-drop="onChipTagDrop"
            @click="removeTagFromImage(image, tag, false)"
          />
        </template>
      </div>

      <div
        v-if="visibleRemovedTags.length"
        class="image-row__chip-group image-row__deleted-tags"
        data-tag-drop-target="deleted"
        data-tag-drop-group="deleted"
      >
        <span class="image-row__chip-heading">Deleted</span>
        <template v-for="tag in visibleRemovedTags" :key="`${image.id}-removed-${tag}`">
          <TagChip
            :tag="tag"
            :image-id="image.id"
            drag-source="deleted"
            icon="add"
            variant="removed"
            :decorate-states="false"
            :title="`Return deleted tag '${tag}' to this image. Undoable.`"
            data-tag-drop-target="deleted"
            data-tag-drop-group="deleted"
            @tag-drag-move="onChipTagDragMove"
            @tag-drag-end="clearChipDropCursor"
            @tag-drop="onChipTagDrop"
            @click="restoreRemovedTag(image, tag)"
          />
        </template>
      </div>

      <div v-if="!hasVisibleChips" class="image-row__chip-placeholder">...</div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
import TagChip from "~/components/dataset/TagChip.vue";
import TagField from "~/components/tags/TagField.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { ImageRecord } from "~/types/imageTagger";
import { parseTags } from "~/utils/tagDataset";

const props = defineProps<{
  image: ImageRecord;
}>();

type ChipDropTarget = "active" | "deleted";
type ChipDropGroup = "common" | "non-common" | "deleted";
type ChipDropMarkerSide = "before" | "after" | "end";

interface ChipDragEvent {
  clientX: number;
  clientY: number;
  source: ChipDropTarget;
  tag: string;
}

interface ChipDropPlacement {
  target: ChipDropTarget;
  group: ChipDropGroup;
  beforeTag: string;
  draggedTag: string;
  markerTag: string;
  markerSide: ChipDropMarkerSide;
}

interface ChipDropCursor {
  left: number;
  top: number;
  height: number;
}

const {
  config,
  filteredBlinkPatterns,
  commonTags,
  knownTags,
  highlightedTags,
  highlightedText,
  autocompleteTags,
  imageTagTextStyleRules,
  imageMetadataLine,
  openViewer,
  canReorderImages,
  moveImageRow,
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
const selectedTagText = computed(() => props.image.selectedTag.trim());
const hasSelectedTag = computed(() => Boolean(selectedTagText.value));
const selectedTagInFilter = computed(() => (
  hasSelectedTag.value
  && config.filterTarget === "caption"
  && (
    config.filterMode === "tags"
      ? tagListIncludes(parseTags(config.filterText), selectedTagText.value)
      : regexListMatchesTag(parseTags(config.filterText, false), selectedTagText.value, config.ignoreCase)
  )
));
const selectedTagInCommon = computed(() => (
  hasSelectedTag.value && tagListIncludes(commonTags.value, selectedTagText.value)
));
const selectedTagInKnown = computed(() => (
  hasSelectedTag.value && tagListIncludes(knownTags.value, selectedTagText.value)
));
const selectedTagIsHighlighted = computed(() => (
  hasSelectedTag.value && tagListIncludes(highlightedTags.value, selectedTagText.value)
));
const selectedTagTextIsHighlighted = computed(() => (
  hasSelectedTag.value && tagListIncludes(highlightedText.value, selectedTagText.value)
));
const fileNameParts = computed(() => {
  if (config.filterMode !== "regex" || config.filterTarget !== "filename" || !filteredBlinkPatterns.value.length) {
    return [{ key: "plain-0", text: props.image.fileName, highlighted: false }];
  }

  return splitRegexMatches(props.image.fileName, filteredBlinkPatterns.value, config.ignoreCase);
});
const imageThumbTitle = computed(() => canReorderImages.value
  ? `Open image viewer for ${props.image.fileName}. Drag this image to reorder dataset rows.`
  : `Open image viewer for ${props.image.fileName}. Row dragging is available only when all loaded images are visible.`);
const rowElement = ref<HTMLElement | null>(null);
const tagColumnElement = ref<HTMLElement | null>(null);
const chipDropCursor = ref<ChipDropCursor | null>(null);
const rowDragging = ref(false);
const rowDropPlacement = ref<ImageRowDropPlacement | null>(null);
const chipDropCursorStyle = computed(() => (
  chipDropCursor.value
    ? {
        height: `${chipDropCursor.value.height}px`,
        left: `${chipDropCursor.value.left}px`,
        top: `${chipDropCursor.value.top}px`
      }
    : undefined
));

let resizeStartX = 0;
let resizeStartWidth = 0;
let imageDragClickSuppressed = false;

type ImageRowDropPlacement = "before" | "after";

const imageRowDragMimeType = "application/x-tva-image-row";

function onImageThumbClick(): void {
  if (imageDragClickSuppressed) {
    return;
  }

  openViewer(props.image);
}

function startImageRowDrag(event: DragEvent): void {
  if (!canReorderImages.value) {
    event.preventDefault();
    return;
  }

  rowDragging.value = true;
  imageDragClickSuppressed = true;
  event.dataTransfer?.setData(imageRowDragMimeType, props.image.id);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function stopImageRowDrag(): void {
  rowDragging.value = false;
  clearImageRowDropState();
  window.setTimeout(() => {
    imageDragClickSuppressed = false;
  }, 0);
}

function onImageRowDragOver(event: DragEvent): void {
  const isImageRowDrag = event.dataTransfer?.types.includes(imageRowDragMimeType) ?? false;
  if (!canReorderImages.value || rowDragging.value || !isImageRowDrag) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  rowDropPlacement.value = resolveImageRowDropPlacement(event);
}

function onImageRowDragLeave(event: DragEvent): void {
  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node && rowElement.value?.contains(nextTarget)) {
    return;
  }

  clearImageRowDropState();
}

function onImageRowDrop(event: DragEvent): void {
  const draggedId = event.dataTransfer?.getData(imageRowDragMimeType) ?? "";
  if (!canReorderImages.value || !draggedId || draggedId === props.image.id) {
    clearImageRowDropState();
    return;
  }

  event.preventDefault();
  moveImageRow(draggedId, props.image.id, rowDropPlacement.value ?? resolveImageRowDropPlacement(event));
  clearImageRowDropState();
}

function resolveImageRowDropPlacement(event: DragEvent): ImageRowDropPlacement {
  const rect = rowElement.value?.getBoundingClientRect();
  if (!rect) {
    return "after";
  }

  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function clearImageRowDropState(): void {
  rowDropPlacement.value = null;
}

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

function onChipTagDragMove(event: ChipDragEvent): void {
  const placement = resolveChipDropPlacement(event);
  chipDropCursor.value = placement ? resolveChipDropCursor(placement) : null;
}

function clearChipDropCursor(): void {
  chipDropCursor.value = null;
}

function onChipTagDrop(event: ChipDragEvent): void {
  const placement = resolveChipDropPlacement(event);
  clearChipDropCursor();
  if (!placement) {
    return;
  }

  if (placement.target === "deleted") {
    if (event.source === "active") {
      moveTagToDeleted(props.image, event.tag);
    }
    return;
  }

  if (event.source === "deleted") {
    moveDeletedTagToImage(props.image, event.tag, placement.beforeTag);
    return;
  }

  reorderImageTag(props.image, event.tag, placement.beforeTag);
}

function resolveChipDropPlacement(event: ChipDragEvent): ChipDropPlacement | null {
  const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-tag-drop-target]");
  if (!dropTarget || !rowElement.value?.contains(dropTarget)) {
    return null;
  }

  const target = dropTarget?.dataset.tagDropTarget;
  if (target !== "active" && target !== "deleted") {
    return null;
  }

  if (target === "deleted") {
    if (event.source !== "active" || !hasTag(props.image, event.tag)) {
      return null;
    }

    return {
      target,
      group: "deleted",
      beforeTag: "",
      draggedTag: event.tag,
      markerTag: "",
      markerSide: "end"
    };
  }

  if (event.source === "active" && !hasTag(props.image, event.tag)) {
    return null;
  }

  if (event.source === "deleted" && !tagListIncludes(props.image.removedTags, event.tag)) {
    return null;
  }

  const hoveredTag = resolveChipElementTag(dropTarget);
  const insertionSide = resolveChipInsertionSide(dropTarget, event.clientX);
  const beforeTag = resolveActiveDropBeforeTag(hoveredTag, insertionSide, event.tag);
  const marker = resolveActiveDropMarker(hoveredTag, insertionSide, event.tag);
  const group = resolveChipDropGroup(dropTarget?.dataset.tagDropGroup);
  return {
    target,
    group,
    beforeTag,
    draggedTag: event.tag,
    markerTag: marker.tag,
    markerSide: marker.side
  };
}

function resolveChipDropCursor(placement: ChipDropPlacement): ChipDropCursor | null {
  const tagColumn = tagColumnElement.value;
  const markerRect = resolveChipDropMarkerRect(placement);
  if (!tagColumn || !markerRect) {
    return null;
  }

  const columnRect = tagColumn.getBoundingClientRect();
  return {
    left: markerRect.left - columnRect.left + tagColumn.scrollLeft,
    top: markerRect.top - columnRect.top + tagColumn.scrollTop,
    height: markerRect.height
  };
}

function resolveChipDropMarkerRect(placement: ChipDropPlacement): DOMRect | null {
  const groupElement = findChipDropGroupElement(placement.group);
  if (!groupElement) {
    return null;
  }

  if (placement.markerSide !== "end" && placement.markerTag) {
    const beforeElement = chipElementsInGroup(groupElement, placement.draggedTag)
      .find((element) => sameTag(resolveChipElementTag(element), placement.markerTag));
    const rect = beforeElement?.getBoundingClientRect();
    if (rect) {
      return new DOMRect(
        placement.markerSide === "after" ? rect.right : rect.left,
        rect.top,
        0,
        rect.height
      );
    }
  }

  const chips = chipElementsInGroup(groupElement, placement.draggedTag);
  const lastChipRect = chips.at(-1)?.getBoundingClientRect();
  if (lastChipRect) {
    return new DOMRect(lastChipRect.right, lastChipRect.top, 0, lastChipRect.height);
  }

  const groupRect = groupElement.getBoundingClientRect();
  return new DOMRect(groupRect.left, groupRect.top, 0, Math.max(22, groupRect.height));
}

function findChipDropGroupElement(group: ChipDropGroup): HTMLElement | null {
  return Array.from(rowElement.value?.querySelectorAll<HTMLElement>(".image-row__chip-group") ?? [])
    .find((element) => element.dataset.tagDropGroup === group) ?? null;
}

function chipElementsInGroup(groupElement: HTMLElement, draggedTag: string): HTMLElement[] {
  return Array.from(groupElement.querySelectorAll<HTMLElement>("[data-tag-drop-target]"))
    .filter((element) => (
      element.dataset.tagDropGroup === groupElement.dataset.tagDropGroup
      && !sameTag(element.dataset.tagValue ?? "", draggedTag)
    ));
}

function resolveActiveDropBeforeTag(hoveredTag: string, side: ChipDropMarkerSide, draggedTag: string): string {
  const cleanHoveredTag = hoveredTag.trim();
  if (!cleanHoveredTag || !tagListIncludes(props.image.tags, cleanHoveredTag)) {
    return "";
  }

  if (sameTag(cleanHoveredTag, draggedTag) || side === "after") {
    return tagAfterInImageTags(cleanHoveredTag, draggedTag);
  }

  return cleanHoveredTag;
}

function resolveActiveDropMarker(
  hoveredTag: string,
  side: ChipDropMarkerSide,
  draggedTag: string
): { tag: string; side: ChipDropMarkerSide } {
  const cleanHoveredTag = hoveredTag.trim();
  if (!cleanHoveredTag || sameTag(cleanHoveredTag, draggedTag) || !tagListIncludes(props.image.tags, cleanHoveredTag)) {
    return { tag: "", side: "end" };
  }

  return {
    tag: cleanHoveredTag,
    side
  };
}

function resolveChipElementTag(element: HTMLElement): string {
  return element.dataset.beforeTag ?? element.dataset.tagValue ?? "";
}

function resolveChipInsertionSide(element: HTMLElement, clientX: number): ChipDropMarkerSide {
  if (!element.dataset.beforeTag && !element.dataset.tagValue) {
    return "end";
  }

  const rect = element.getBoundingClientRect();
  return clientX > rect.left + rect.width / 2 ? "after" : "before";
}

function tagAfterInImageTags(tag: string, draggedTag: string): string {
  const tagIndex = props.image.tags.findIndex((item) => sameTag(item, tag));
  if (tagIndex < 0) {
    return "";
  }

  return props.image.tags.slice(tagIndex + 1).find((item) => !sameTag(item, draggedTag)) ?? "";
}

function resolveChipDropGroup(group: string | undefined): ChipDropGroup {
  return group === "common" || group === "deleted" ? group : "non-common";
}

function regexListMatchesTag(patterns: string[], tag: string, ignoreCase: boolean): boolean {
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern, ignoreCase ? "i" : "").test(tag)) {
        return true;
      }
    } catch {
      // Invalid regexes are handled by filter validation; active button state can ignore them.
    }
  }

  return false;
}

function tagListIncludes(tags: string[], tag: string): boolean {
  return tags.some((item) => sameTag(item, tag));
}

function sameTag(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

onBeforeUnmount(() => {
  stopImageRowDrag();
  stopImageWidthResize();
  clearChipDropCursor();
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

  &--row-dragging {
    opacity: 0.62;
  }

  &--drop-before {
    box-shadow: inset 0 3px 0 var(--blue);
  }

  &--drop-after {
    box-shadow: inset 0 -3px 0 var(--blue);
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
    cursor: pointer;

    &[draggable="true"] {
      cursor: grab;
    }

    .image-row--row-dragging & {
      cursor: grabbing;
    }

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
    --app-icon-button-active-bg: color-mix(in srgb, var(--blue) 16%, transparent);
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
    position: relative;
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

  &__chip-drop-cursor {
    position: absolute;
    z-index: 4;
    width: 3px;
    border-radius: var(--pill-radius);
    background: var(--blue);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--blue) 20%, transparent);
    pointer-events: none;
    transform: translateX(-1px);
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
