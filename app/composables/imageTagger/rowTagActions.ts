import type { ComputedRef } from "vue";
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

  function onEditorInput(image: ImageRecord, event: Event): void {
    markDraftDirty(image);
    updateSelectedTagFromEditor(image, event);
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

  function updateSelectedTagFromEditor(image: ImageRecord, event: Event): void {
    const editor = event?.target;
    if (!image || !(editor instanceof HTMLTextAreaElement)) {
      return;
    }
    if (document.activeElement !== editor) {
      return;
    }

    const selectedText = editor.value
      .slice(editor.selectionStart, editor.selectionEnd)
      .replace(/^,\s*/, "")
      .replace(/\s*,?\s*$/, "")
      .trim();

    image.selectedTag = selectedText && !/[,\n]/.test(selectedText)
      ? selectedText
      : getTagAtPosition(editor.value, editor.selectionStart);
  }

  function tagClass(tag: string): Record<string, boolean> {
    const key = String(tag).toLowerCase();
    const known = new Set([...knownTags.value, ...commonTags.value].map((item) => item.toLowerCase()));
    const highlighted = highlightedTags.value.some((item) => item.toLowerCase() === key);
    const textHighlighted = highlightedText.value.some((item) => item && key.includes(item.toLowerCase()));

    return {
      unknown: known.size > 0 && !known.has(key),
      highlighted,
      textHighlighted
    };
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
    updateSelectedTagFromEditor,
    tagClass,
    refreshAllEditTextFormatting,
    tagsEqual,
    formatTags
  };
}

function getTagAtPosition(text: string, position: number): string {
  const value = String(text ?? "");
  const left = value.slice(0, position);
  const right = value.slice(position);
  const start = Math.max(left.lastIndexOf(","), left.lastIndexOf("\n"));
  const commaEnd = right.indexOf(",");
  const lineEnd = right.indexOf("\n");
  const candidates = [commaEnd, lineEnd].filter((index) => index >= 0);
  const absoluteStart = start >= 0 ? start + 1 : 0;
  const absoluteEnd = position + (candidates.length ? Math.min(...candidates) : right.length);
  const rawSegment = value.slice(absoluteStart, absoluteEnd);
  const trimmed = rawSegment.trim();
  if (!trimmed) {
    return "";
  }

  const leadingWhitespace = rawSegment.search(/\S/);
  const tagStart = absoluteStart + (leadingWhitespace < 0 ? 0 : leadingWhitespace);
  const tagEnd = absoluteStart + rawSegment.trimEnd().length;
  return position >= tagStart && position <= tagEnd ? trimmed : "";
}

function tagsEqual(left: string[] | null | undefined, right: string[] | null | undefined): boolean {
  const leftTags = left ?? [];
  const rightTags = right ?? [];
  return leftTags.length === rightTags.length && leftTags.every((tag, index) => tag === rightTags[index]);
}
