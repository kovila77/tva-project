import type { ComputedRef, Ref, ShallowRef } from "vue";
import type { AppConfig, ConfigTextKey, ImageRecord, ImageSnapshot, OperationChange } from "~/types/imageTagger";
import {
  addTag,
  distinctTags,
  formatTags,
  includesTag,
  orderTags,
  parseTags,
  removeTag
} from "~/utils/tagDataset";

interface RowTagActionOptions {
  images: ShallowRef<ImageRecord[]>;
  config: AppConfig;
  commonTags: ComputedRef<string[]>;
  knownTags: ComputedRef<string[]>;
  highlightedTags: ComputedRef<string[]>;
  highlightedText: ComputedRef<string[]>;
  filteredBlinkTags: Ref<string[]>;
  orderTagsText: ComputedRef<string>;
  commitOperation: (label: string, changes: OperationChange[]) => boolean;
  snapshotImage: (image: ImageRecord) => ImageSnapshot;
  refreshImages: () => void;
  setStatus: (message: string) => void;
}

export function createRowTagActions({
  images,
  config,
  commonTags,
  knownTags,
  highlightedTags,
  highlightedText,
  filteredBlinkTags,
  orderTagsText,
  commitOperation,
  snapshotImage,
  refreshImages,
  setStatus
}: RowTagActionOptions) {
  function commitEditor(image: ImageRecord, label: string): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage) {
      return;
    }

    const nextTags = orderTags(parseTags(currentImage.editText), orderTagsText.value);
    const nextRemovedTags = reconcileRemovedTags(currentImage.tags, nextTags, currentImage.removedTags);
    const nextEditText = formatTags(nextTags);
    const currentEditText = formatTags(currentImage.tags);
    if (!currentImage.draftDirty && currentImage.editText === currentEditText) {
      return;
    }

    const committed = commitOperation(label, [
      {
        image: currentImage,
        after: {
          ...snapshotImage(currentImage),
          tags: nextTags,
          removedTags: nextRemovedTags,
          selectedTag: includesTag(nextTags, currentImage.selectedTag) ? currentImage.selectedTag : "",
          editText: nextEditText
        }
      }
    ]);

    if (committed) {
      setStatus(`Applied tags for ${currentImage.fileName}.`);
    } else {
      currentImage.editText = nextEditText;
      currentImage.removedTags = nextRemovedTags;
      currentImage.selectedTag = includesTag(nextTags, currentImage.selectedTag) ? currentImage.selectedTag : "";
      currentImage.draftDirty = false;
      refreshImages();
    }
  }

  function markDraftDirty(image: ImageRecord): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage) {
      return;
    }

    currentImage.editText = image.editText;
    currentImage.draftDirty = true;
    refreshImages();
  }

  function onEditorInput(image: ImageRecord): void {
    markDraftDirty(image);
  }

  function hasTag(image: ImageRecord, tag: string): boolean {
    return includesTag(getCurrentImage(image)?.tags ?? image.tags, tag);
  }

  function nonCommonTags(image: ImageRecord): string[] {
    const currentImage = getCurrentImage(image) ?? image;
    const common = new Set(commonTags.value.map((tag) => tag.toLowerCase()));
    return currentImage.tags.filter((tag) => !common.has(tag.toLowerCase()));
  }

  function toggleTag(image: ImageRecord, tag: string): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage) {
      return;
    }

    const active = hasTag(currentImage, tag);
    const nextTags = active ? removeTag(currentImage.tags, tag) : addTag(currentImage.tags, tag);
    const nextRemovedTags = active ? addTag(currentImage.removedTags, tag) : removeTag(currentImage.removedTags, tag);
    const orderedTags = orderTags(nextTags, orderTagsText.value);

    commitOperation(`Toggle ${tag}`, [{
      image: currentImage,
      after: {
        ...snapshotImage(currentImage),
        tags: orderedTags,
        removedTags: nextRemovedTags,
        editText: formatTags(orderedTags)
      }
    }]);
  }

  function removeTagFromImage(image: ImageRecord, tag: string, selectRemoved = true): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage) {
      return;
    }

    const nextTags = removeTag(currentImage.tags, tag);
    const nextRemovedTags = addTag(currentImage.removedTags, tag);
    commitOperation(`Remove ${tag}`, [{
      image: currentImage,
      after: {
        ...snapshotImage(currentImage),
        tags: nextTags,
        removedTags: nextRemovedTags,
        selectedTag: selectRemoved ? tag : currentImage.selectedTag === tag ? "" : currentImage.selectedTag,
        editText: formatTags(nextTags)
      }
    }]);
  }

  function restoreRemovedTag(image: ImageRecord, tag: string): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage) {
      return;
    }

    const nextTags = orderTags(addTag(currentImage.tags, tag), orderTagsText.value);
    const nextRemovedTags = removeTag(currentImage.removedTags, tag);
    commitOperation(`Restore ${tag}`, [{
      image: currentImage,
      after: {
        ...snapshotImage(currentImage),
        tags: nextTags,
        removedTags: nextRemovedTags,
        selectedTag: currentImage.selectedTag,
        editText: formatTags(nextTags)
      }
    }]);
  }

  function moveTagToDeleted(image: ImageRecord, tag: string): void {
    removeTagFromImage(image, tag, false);
  }

  function moveDeletedTagToImage(image: ImageRecord, tag: string, beforeTag = ""): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage) {
      return;
    }

    const nextTags = insertTagBefore(currentImage.tags, tag, beforeTag);
    const nextRemovedTags = removeTag(currentImage.removedTags, tag);
    commitOperation(`Restore ${tag}`, [{
      image: currentImage,
      after: {
        ...snapshotImage(currentImage),
        tags: nextTags,
        removedTags: nextRemovedTags,
        selectedTag: currentImage.selectedTag,
        editText: formatTags(nextTags)
      }
    }]);
  }

  function reorderImageTag(image: ImageRecord, tag: string, beforeTag = ""): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage || !includesTag(currentImage.tags, tag)) {
      return;
    }

    const nextTags = insertTagBefore(removeTag(currentImage.tags, tag), tag, beforeTag);
    commitOperation(`Move ${tag}`, [{
      image: currentImage,
      after: {
        ...snapshotImage(currentImage),
        tags: nextTags,
        editText: formatTags(nextTags)
      }
    }]);
  }

  function appendConfigTag(key: ConfigTextKey, tag: string): void {
    const tags = addTag(parseTags(config[key]), tag);
    config[key] = formatTags(tags);
  }

  function setSelectedTag(image: ImageRecord, tag: string): void {
    const currentImage = getCurrentImage(image);
    if (!currentImage || currentImage.selectedTag === tag) {
      return;
    }

    currentImage.selectedTag = tag;
    refreshImages();
  }

  function tagClass(tag: string): Record<string, boolean> {
    const key = String(tag).toLowerCase();
    const known = new Set(knownTags.value.map((item) => item.toLowerCase()));
    const common = commonTags.value.some((item) => item.toLowerCase() === key);
    const highlighted = highlightedTags.value.some((item) => item.toLowerCase() === key);
    const filteredBlink = filteredBlinkTags.value.some((item) => item.toLowerCase() === key);

    return {
      "tag-token--unknown": known.size > 0 && !known.has(key),
      "tag-token--common": common,
      "tag-token--highlighted": highlighted,
      "tag-token--filtered-blink": filteredBlink
    };
  }

  function tagTextParts(tag: string): Array<{ key: string; text: string; highlighted: boolean }> {
    const text = String(tag ?? "");
    const fragments = highlightedText.value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);

    if (!text || !fragments.length) {
      return [{ key: "plain-0", text, highlighted: false }];
    }

    const highlighted = Array.from({ length: text.length }, () => false);
    const lowerText = text.toLowerCase();

    for (const fragment of fragments) {
      const lowerFragment = fragment.toLowerCase();
      let start = 0;
      while (start < lowerText.length) {
        const index = lowerText.indexOf(lowerFragment, start);
        if (index < 0) {
          break;
        }

        for (let offset = 0; offset < fragment.length; offset += 1) {
          highlighted[index + offset] = true;
        }
        start = index + Math.max(fragment.length, 1);
      }
    }

    const parts: Array<{ key: string; text: string; highlighted: boolean }> = [];
    let partStart = 0;
    while (partStart < text.length) {
      const isHighlighted = highlighted[partStart];
      let partEnd = partStart + 1;
      while (partEnd < text.length && highlighted[partEnd] === isHighlighted) {
        partEnd += 1;
      }

      parts.push({
        key: `${isHighlighted ? "highlight" : "plain"}-${partStart}`,
        text: text.slice(partStart, partEnd),
        highlighted: isHighlighted
      });
      partStart = partEnd;
    }

    return parts;
  }

  function refreshAllEditTextFormatting(images: ImageRecord[]): void {
    for (const image of images) {
      if (!image.draftDirty) {
        image.editText = formatTags(image.tags);
      }
    }
    refreshImages();
  }

  return {
    commitEditor,
    markDraftDirty,
    onEditorInput,
    hasTag,
    nonCommonTags,
    toggleTag,
    removeTagFromImage,
    restoreRemovedTag,
    moveTagToDeleted,
    moveDeletedTagToImage,
    reorderImageTag,
    appendConfigTag,
    setSelectedTag,
    tagClass,
    tagTextParts,
    refreshAllEditTextFormatting,
    tagsEqual,
    formatTags
  };

  function getCurrentImage(image: ImageRecord | null | undefined): ImageRecord | null {
    if (!image) {
      return null;
    }

    return images.value.find((item) => item.id === image.id) ?? null;
  }
}

function insertTagBefore(tags: string[], tag: string, beforeTag: string): string[] {
  const cleanTag = String(tag ?? "").trim();
  if (!cleanTag) {
    return distinctTags(tags);
  }

  const withoutTag = removeTag(tags, cleanTag);
  const targetKey = String(beforeTag ?? "").trim().toLowerCase();
  if (!targetKey || targetKey === cleanTag.toLowerCase()) {
    return distinctTags([...withoutTag, cleanTag]);
  }

  const index = withoutTag.findIndex((item) => item.toLowerCase() === targetKey);
  if (index < 0) {
    return distinctTags([...withoutTag, cleanTag]);
  }

  return distinctTags([
    ...withoutTag.slice(0, index),
    cleanTag,
    ...withoutTag.slice(index)
  ]);
}

function tagsEqual(left: string[] | null | undefined, right: string[] | null | undefined): boolean {
  const leftTags = left ?? [];
  const rightTags = right ?? [];
  return leftTags.length === rightTags.length && leftTags.every((tag, index) => tag === rightTags[index]);
}

function reconcileRemovedTags(previousTags: string[], nextTags: string[], removedTags: string[]): string[] {
  const nextKeys = new Set(nextTags.map((tag) => tag.toLowerCase()));
  const restoredKeys = new Set(nextTags.map((tag) => tag.toLowerCase()));
  const removedByEdit = previousTags.filter((tag) => !nextKeys.has(tag.toLowerCase()));
  const stillRemoved = removedTags.filter((tag) => !restoredKeys.has(tag.toLowerCase()));

  return distinctTags([...stillRemoved, ...removedByEdit]);
}
