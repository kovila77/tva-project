import type { ComputedRef, ShallowRef } from "vue";
import type {
  DatasetOperation,
  HistoryState,
  ImageHistoryRow,
  ImageRecord,
  ImageSnapshot,
  OperationChange
} from "~/types/imageTagger";
import { distinctTags, formatTags, getTagFileName, orderTags } from "~/utils/tagDataset";

interface HistoryActionOptions {
  images: ShallowRef<ImageRecord[]>;
  history: HistoryState;
  orderTagsText: ComputedRef<string>;
  recalculateDerivedTags: () => void;
  refreshImages: () => void;
  setStatus: (message: string) => void;
}

export function createHistoryActions({
  images,
  history,
  orderTagsText,
  recalculateDerivedTags,
  refreshImages,
  setStatus
}: HistoryActionOptions) {
  function snapshotImage(image: ImageRecord): ImageSnapshot {
    return {
      id: image.id,
      fileName: image.fileName,
      tagFileName: image.tagFileName,
      outputTagPath: image.outputTagPath,
      tags: [...image.tags],
      removedTags: [...(image.removedTags ?? [])],
      selectedTag: image.selectedTag ?? "",
      editText: image.editText,
      dirty: image.dirty
    };
  }

  function applySnapshot(snapshot: ImageSnapshot): void {
    const image = images.value.find((item) => item.id === snapshot.id);
    if (!image) {
      return;
    }

    image.fileName = snapshot.fileName;
    image.tagFileName = snapshot.tagFileName;
    image.outputTagPath = snapshot.outputTagPath;
    image.tags = [...snapshot.tags];
    image.removedTags = [...(snapshot.removedTags ?? [])];
    image.selectedTag = snapshot.selectedTag ?? "";
    image.editText = snapshot.editText || formatTags(snapshot.tags);
    image.draftDirty = false;
    image.dirty = !tagsEqual(image.tags, image.originalTags) || image.fileName !== image.originalFileName;
  }

  function commitOperation(label: string, changes: OperationChange[]): boolean {
    const validChanges = changes
      .filter((change) => change.image)
      .map((change) => ({
        image: change.image as ImageRecord,
        before: snapshotImage(change.image as ImageRecord),
        after: change.after
      }))
      .filter((change) => !snapshotsEqual(change.before, change.after));

    if (!validChanges.length) {
      return false;
    }

    for (const change of validChanges) {
      applyImageState(change.image, change.after);
    }

    history.past.push({
      label,
      time: Date.now(),
      before: validChanges.map((change) => change.before),
      after: validChanges.map((change) => snapshotImage(change.image))
    });
    history.future.splice(0);
    trimHistory();

    recalculateDerivedTags();
    refreshImages();
    return true;
  }

  function applyImageState(image: ImageRecord, state: ImageSnapshot): void {
    image.fileName = state.fileName ?? image.fileName;
    image.tagFileName = state.tagFileName ?? image.tagFileName;
    image.outputTagPath = state.outputTagPath ?? image.outputTagPath;
    image.tags = orderTags(distinctTags(state.tags ?? image.tags), orderTagsText.value);
    image.removedTags = distinctTags(state.removedTags ?? image.removedTags ?? []);
    image.selectedTag = state.selectedTag ?? image.selectedTag ?? "";
    image.editText = state.editText ?? formatTags(image.tags);
    image.draftDirty = false;
    image.dirty = !tagsEqual(image.tags, image.originalTags) || image.fileName !== image.originalFileName;
    image.lastSavedAt = Date.now();
  }

  function removeImage(image: ImageRecord): void {
    const index = images.value.findIndex((item) => item.id === image.id);
    if (index < 0) {
      return;
    }

    const snapshot = snapshotImage(image);
    images.value = images.value.filter((item) => item.id !== image.id);
    history.past.push({
      label: `Remove ${image.fileName}`,
      time: Date.now(),
      before: [snapshot],
      after: [snapshot],
      removedRecords: [{ image, index }]
    });
    history.future.splice(0);
    trimHistory();
    recalculateDerivedTags();
    setStatus(`Removed ${image.fileName} from memory. Use Undo to restore it.`);
  }

  function canUndoImage(image: ImageRecord): boolean {
    const last = history.past[history.past.length - 1];
    return Boolean(last && last.before.length === 1 && last.before[0].id === image.id);
  }

  function canRedoImage(image: ImageRecord): boolean {
    const next = history.future[history.future.length - 1];
    return Boolean(next && next.after.length === 1 && next.after[0].id === image.id);
  }

  function undoImage(image: ImageRecord): void {
    if (canUndoImage(image)) {
      undoDataset();
    }
  }

  function redoImage(image: ImageRecord): void {
    if (canRedoImage(image)) {
      redoDataset();
    }
  }

  function undoDataset(): void {
    const operation = history.past.pop();
    if (!operation) {
      return;
    }

    restoreOperationImages(operation);
    for (const snapshot of operation.before) {
      applySnapshot(snapshot);
    }
    history.future.push(operation);
    recalculateDerivedTags();
    refreshImages();
    setStatus(`Undid ${operation.label}.`);
  }

  function redoDataset(): void {
    const operation = history.future.pop();
    if (!operation) {
      return;
    }

    for (const snapshot of operation.after) {
      applySnapshot(snapshot);
    }
    hideOperationImages(operation);
    history.past.push(operation);
    recalculateDerivedTags();
    refreshImages();
    setStatus(`Redid ${operation.label}.`);
  }

  function restoreOperationImages(operation: DatasetOperation): void {
    const records = [...(operation.removedRecords ?? [])].sort((left, right) => left.index - right.index);
    if (!records.length) {
      return;
    }

    const nextImages = [...images.value];
    for (const record of records) {
      if (nextImages.some((image) => image.id === record.image.id)) {
        continue;
      }

      const safeIndex = Math.min(Math.max(record.index, 0), nextImages.length);
      nextImages.splice(safeIndex, 0, record.image);
    }

    images.value = nextImages;
  }

  function hideOperationImages(operation: DatasetOperation): void {
    const ids = new Set((operation.removedRecords ?? []).map((record) => record.image.id));
    if (!ids.size) {
      return;
    }

    images.value = images.value.filter((image) => !ids.has(image.id));
  }

  function revertImage(image: ImageRecord): void {
    commitOperation(`Revert ${image.fileName}`, [{
      image,
      after: {
        ...snapshotImage(image),
        fileName: image.originalFileName,
        tagFileName: getTagFileName(image.originalFileName),
        outputTagPath: image.outputTagPath,
        tags: [...image.originalTags],
        removedTags: [],
        selectedTag: "",
        editText: formatTags(image.originalTags)
      }
    }]);
  }

  function toggleImageHistory(image: ImageRecord): void {
    image.historyOpen = !image.historyOpen;
    refreshImages();
  }

  function imageHistory(image: ImageRecord): ImageHistoryRow[] {
    const rows: ImageHistoryRow[] = [];
    const operations = [
      ...history.past.map((operation) => ({ operation, direction: "undo" })).reverse(),
      ...history.future.map((operation) => ({ operation, direction: "redo" })).reverse()
    ];

    for (const { operation, direction } of operations) {
      const snapshot = [...operation.before, ...operation.after].find((item) => item.id === image.id);
      if (!snapshot) {
        continue;
      }

      rows.push({
        key: `${direction}-${operation.time}-${rows.length}`,
        text: `${direction}: ${operationPreview(operation)}`
      });

      if (rows.length >= 6) {
        break;
      }
    }

    return rows;
  }

  function operationPreview(operation: DatasetOperation | null | undefined): string {
    if (!operation) {
      return "No operation queued.";
    }

    const imageCount = operation.after?.length ?? operation.before?.length ?? 0;
    const firstBefore = operation.before?.[0];
    const firstAfter = operation.after?.[0];
    const tagDelta = firstBefore && firstAfter ? firstAfter.tags.length - firstBefore.tags.length : 0;
    const renameNote = firstBefore && firstAfter && firstBefore.fileName !== firstAfter.fileName
      ? `; ${firstBefore.fileName} -> ${firstAfter.fileName}`
      : "";
    const tagNote = tagDelta ? `; ${tagDelta > 0 ? "+" : ""}${tagDelta} tags on first image` : "";
    return `${operation.label}, ${imageCount} image${imageCount === 1 ? "" : "s"}${renameNote}${tagNote}`;
  }

  function revokeImageUrls(): void {
    const objectUrls = new Set<string>();
    for (const image of images.value) {
      objectUrls.add(image.objectUrl);
    }

    for (const operation of [...history.past, ...history.future]) {
      for (const record of operation.removedRecords ?? []) {
        objectUrls.add(record.image.objectUrl);
      }
    }

    for (const objectUrl of objectUrls) {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function trimHistory(): void {
    while (history.past.length > 200) {
      cleanupDroppedOperation(history.past.shift());
    }
  }

  function cleanupDroppedOperation(operation: DatasetOperation | undefined): void {
    for (const record of operation?.removedRecords ?? []) {
      if (!images.value.some((image) => image.id === record.image.id)) {
        URL.revokeObjectURL(record.image.objectUrl);
      }
    }
  }

  return {
    snapshotImage,
    applySnapshot,
    commitOperation,
    removeImage,
    canUndoImage,
    canRedoImage,
    undoImage,
    redoImage,
    undoDataset,
    redoDataset,
    revertImage,
    toggleImageHistory,
    imageHistory,
    operationPreview,
    revokeImageUrls,
    tagsEqual
  };
}

function snapshotsEqual(left: ImageSnapshot, right: ImageSnapshot): boolean {
  return left.fileName === right.fileName
    && left.tagFileName === right.tagFileName
    && left.outputTagPath === right.outputTagPath
    && tagsEqual(left.tags, right.tags)
    && tagsEqual(left.removedTags ?? [], right.removedTags ?? []);
}

function tagsEqual(left: string[] | null | undefined, right: string[] | null | undefined): boolean {
  const leftTags = left ?? [];
  const rightTags = right ?? [];
  return leftTags.length === rightTags.length && leftTags.every((tag, index) => tag === rightTags[index]);
}
