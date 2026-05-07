import type { ComputedRef, Ref, ShallowRef } from "vue";
import type { AppConfig, BatchState, ImageRecord, ImageSnapshot, OperationChange } from "~/types/imageTagger";
import {
  addTag,
  distinctTags,
  formatTags,
  getFileExtension,
  includesTag,
  orderTags,
  parseTags,
  removeTag
} from "~/utils/tagDataset";

interface BatchActionOptions {
  config: AppConfig;
  batch: BatchState;
  images: ShallowRef<ImageRecord[]>;
  visibleImages: ComputedRef<ImageRecord[]>;
  loadError: Ref<string>;
  orderTagsText: ComputedRef<string>;
  commitOperation: (label: string, changes: OperationChange[]) => boolean;
  snapshotImage: (image: ImageRecord) => ImageSnapshot;
  setStatus: (message: string) => void;
}

export function createBatchActions({
  config,
  batch,
  images,
  visibleImages,
  loadError,
  orderTagsText,
  commitOperation,
  snapshotImage,
  setStatus
}: BatchActionOptions) {
  function addTagToVisible(): void {
    const tag = batch.addTag.trim();
    if (!tag) {
      return;
    }

    const changes = visibleImages.value
      .filter((image) => !includesTag(image.tags, tag))
      .map((image) => {
        const nextTags = orderTags(addTag(image.tags, tag), orderTagsText.value);
        return {
          image,
          after: {
            ...snapshotImage(image),
            tags: nextTags,
            editText: formatTags(nextTags)
          }
        };
      });

    if (commitOperation(`Add ${tag} to visible`, changes)) {
      setStatus(`Added ${tag} to ${changes.length} visible images.`);
    }
  }

  function removeRegexFromVisible(): void {
    const patterns = compileRemovePatterns();
    if (!patterns.length) {
      return;
    }

    const changes = visibleImages.value.map((image) => {
      const removed = image.tags.filter((tag) => patterns.some((pattern) => pattern.test(tag)));
      const nextTags = image.tags.filter((tag) => !patterns.some((pattern) => pattern.test(tag)));
      return {
        image,
        after: {
          ...snapshotImage(image),
          tags: nextTags,
          removedTags: distinctTags([...(image.removedTags ?? []), ...removed]),
          editText: formatTags(nextTags)
        }
      };
    });

    if (commitOperation("Regex cleanup", changes)) {
      setStatus("Removed matching tags from visible images.");
    }
  }

  function compileRemovePatterns(): RegExp[] {
    const patterns: RegExp[] = [];
    loadError.value = "";

    for (const source of parseTags(config.removePatternsText, false)) {
      try {
        patterns.push(new RegExp(source, config.ignoreCase ? "i" : ""));
      } catch (error) {
        loadError.value = `Invalid remove regex "${source}": ${getErrorMessage(error)}`;
        return [];
      }
    }

    return patterns;
  }

  function replaceArtistTags(): void {
    const changes = images.value.map((image) => {
      const nextTags = image.tags.map((tag) => tag.replace(/^artist:(.*)$/i, "by $1").trim());
      return {
        image,
        after: {
          ...snapshotImage(image),
          tags: distinctTags(nextTags),
          editText: formatTags(nextTags)
        }
      };
    });

    if (commitOperation("Replace artist tags", changes)) {
      setStatus("Replaced artist tags.");
    }
  }

  function renameVisibleFiles(): void {
    const changes = visibleImages.value.map((image, index) => {
      const extension = getFileExtension(image.fileName) || getFileExtension(image.originalFileName);
      const nextBase = String(index + 1).padStart(5, "0");
      const nextFileName = `${nextBase}${extension}`;
      const nextTagFileName = `${nextBase}.txt`;
      return {
        image,
        after: {
          ...snapshotImage(image),
          fileName: nextFileName,
          tagFileName: nextTagFileName,
          outputTagPath: nextTagFileName
        }
      };
    });

    if (commitOperation("Rename visible files", changes)) {
      setStatus("Renamed visible files in memory.");
    }
  }

  function renameTagEverywhere(tag: string): void {
    const replacement = window.prompt(`Rename "${tag}" to:`, tag);
    if (replacement === null) {
      return;
    }

    renameTagEverywhereTo(tag, replacement);
  }

  function renameTagEverywhereTo(tag: string, replacement: string): void {
    const nextTag = replacement.trim();
    if (!nextTag || nextTag.toLowerCase() === tag.toLowerCase()) {
      return;
    }

    const changes = images.value.map((image) => {
      const renamedTags = image.tags.map((item) => item.toLowerCase() === tag.toLowerCase() ? nextTag : item);
      const renamedRemovedTags = image.removedTags.map((item) => item.toLowerCase() === tag.toLowerCase() ? nextTag : item);
      const nextTags = orderTags(distinctTags(renamedTags), orderTagsText.value);
      return {
        image,
        after: {
          ...snapshotImage(image),
          tags: nextTags,
          removedTags: distinctTags(renamedRemovedTags),
          selectedTag: image.selectedTag.toLowerCase() === tag.toLowerCase() ? nextTag : image.selectedTag,
          editText: formatTags(nextTags)
        }
      };
    });

    if (commitOperation(`Rename ${tag}`, changes)) {
      setStatus(`Renamed ${tag} to ${nextTag}.`);
    }
  }

  function addTagToAllAtStart(tag: string): void {
    const nextTag = tag.trim();
    if (!nextTag) {
      return;
    }

    const changes = images.value.map((image) => {
      const nextTags = distinctTags([nextTag, ...removeTag(image.tags, nextTag)]);
      return {
        image,
        after: {
          ...snapshotImage(image),
          tags: nextTags,
          editText: formatTags(nextTags)
        }
      };
    });

    if (commitOperation(`Add ${nextTag} to all`, changes)) {
      setStatus(`Added ${nextTag} to all images.`);
    }
  }

  function removeTagEverywhere(tag: string): void {
    const changes = images.value.map((image) => {
      const nextTags = removeTag(image.tags, tag);
      return {
        image,
        after: {
          ...snapshotImage(image),
          tags: nextTags,
          removedTags: includesTag(image.tags, tag) ? addTag(image.removedTags, tag) : image.removedTags,
          editText: formatTags(nextTags)
        }
      };
    });

    if (commitOperation(`Remove ${tag}`, changes)) {
      setStatus(`Removed ${tag}.`);
    }
  }

  function applyOrderToVisible(): void {
    const changes = visibleImages.value.map((image) => {
      const nextTags = orderTags(image.tags, orderTagsText.value);
      return {
        image,
        after: {
          ...snapshotImage(image),
          tags: nextTags,
          editText: formatTags(nextTags)
        }
      };
    });

    if (commitOperation("Apply tag order", changes)) {
      setStatus("Applied tag order to visible images.");
    }
  }

  return {
    addTagToVisible,
    addTagToAllAtStart,
    removeRegexFromVisible,
    replaceArtistTags,
    renameVisibleFiles,
    renameTagEverywhere,
    renameTagEverywhereTo,
    removeTagEverywhere,
    applyOrderToVisible
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
