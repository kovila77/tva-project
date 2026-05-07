import type { ComputedRef, Ref } from "vue";
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
    if (!image) {
      return;
    }

    const nextTags = orderTags(parseTags(image.editText), orderTagsText.value);
    const nextEditText = formatTags(nextTags);
    const currentEditText = formatTags(image.tags);
    if (!image.draftDirty && image.editText === currentEditText) {
      return;
    }

    const committed = commitOperation(label, [
      {
        image,
        after: {
          ...snapshotImage(image),
          tags: nextTags,
          editText: nextEditText
        }
      }
    ]);

    if (committed) {
      setStatus(`Applied tags for ${image.fileName}.`);
    } else {
      image.editText = nextEditText;
      image.draftDirty = false;
      refreshImages();
    }
  }

  function markDraftDirty(image: ImageRecord): void {
    image.draftDirty = true;
    refreshImages();
  }

  function onEditorInput(image: ImageRecord): void {
    markDraftDirty(image);
  }

  function hasTag(image: ImageRecord, tag: string): boolean {
    return includesTag(image.tags, tag);
  }

  function nonCommonTags(image: ImageRecord): string[] {
    const common = new Set(commonTags.value.map((tag) => tag.toLowerCase()));
    return image.tags.filter((tag) => !common.has(tag.toLowerCase()));
  }

  function toggleTag(image: ImageRecord, tag: string): void {
    const active = hasTag(image, tag);
    const nextTags = active ? removeTag(image.tags, tag) : addTag(image.tags, tag);
    const nextRemovedTags = active ? addTag(image.removedTags, tag) : removeTag(image.removedTags, tag);
    const orderedTags = orderTags(nextTags, orderTagsText.value);

    commitOperation(`Toggle ${tag}`, [{
      image,
      after: {
        ...snapshotImage(image),
        tags: orderedTags,
        removedTags: nextRemovedTags,
        editText: formatTags(orderedTags)
      }
    }]);
  }

  function removeTagFromImage(image: ImageRecord, tag: string, selectRemoved = true): void {
    const nextTags = removeTag(image.tags, tag);
    const nextRemovedTags = addTag(image.removedTags, tag);
    commitOperation(`Remove ${tag}`, [{
      image,
      after: {
        ...snapshotImage(image),
        tags: nextTags,
        removedTags: nextRemovedTags,
        selectedTag: selectRemoved ? tag : image.selectedTag === tag ? "" : image.selectedTag,
        editText: formatTags(nextTags)
      }
    }]);
  }

  function restoreRemovedTag(image: ImageRecord, tag: string): void {
    const nextTags = orderTags(addTag(image.tags, tag), orderTagsText.value);
    const nextRemovedTags = removeTag(image.removedTags, tag);
    commitOperation(`Restore ${tag}`, [{
      image,
      after: {
        ...snapshotImage(image),
        tags: nextTags,
        removedTags: nextRemovedTags,
        selectedTag: image.selectedTag,
        editText: formatTags(nextTags)
      }
    }]);
  }

  function appendConfigTag(key: ConfigTextKey, tag: string): void {
    const tags = addTag(parseTags(config[key]), tag);
    config[key] = formatTags(tags);
  }

  function setSelectedTag(image: ImageRecord, tag: string): void {
    if (!image || image.selectedTag === tag) {
      return;
    }

    image.selectedTag = tag;
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
    appendConfigTag,
    setSelectedTag,
    tagClass,
    tagTextParts,
    refreshAllEditTextFormatting,
    tagsEqual,
    formatTags
  };
}

function tagsEqual(left: string[] | null | undefined, right: string[] | null | undefined): boolean {
  const leftTags = left ?? [];
  const rightTags = right ?? [];
  return leftTags.length === rightTags.length && leftTags.every((tag, index) => tag === rightTags[index]);
}
