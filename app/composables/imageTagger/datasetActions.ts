import type { Ref, ShallowRef } from "vue";
import type { AppConfig, HistoryState, ImageRecord } from "~/types/imageTagger";
import { normalizeConfig } from "~/utils/config";
import {
  createPersistedDatasetState,
  createPersistedFileRecords,
  loadPersistedDataset,
  savePersistedDataset
} from "~/utils/datasetPersistence";
import { formatBytes, getDatasetName, getRelativePath, readImageMetadata } from "~/utils/imageFiles";
import {
  formatTags,
  getPathBaseName,
  getTagFileCandidates,
  getTagFileName,
  isImageFileName,
  parseTags
} from "~/utils/tagDataset";

interface DatasetActionOptions {
  folderInput: Ref<HTMLInputElement | null>;
  configInput: Ref<HTMLInputElement | null>;
  config: AppConfig;
  images: ShallowRef<ImageRecord[]>;
  history: HistoryState;
  isBusy: Ref<boolean>;
  loadError: Ref<string>;
  datasetName: Ref<string>;
  visibleLimit: Ref<number>;
  visibleBatchSize: number;
  recalculateDerivedTags: () => void;
  revokeImageUrls: () => void;
  setStatus: (message: string) => void;
}

export function createDatasetActions({
  folderInput,
  configInput,
  config,
  images,
  history,
  isBusy,
  loadError,
  datasetName,
  visibleLimit,
  visibleBatchSize,
  recalculateDerivedTags,
  revokeImageUrls,
  setStatus
}: DatasetActionOptions) {
  function openFolderPicker(): void {
    folderInput.value?.click();
  }

  function openConfigPicker(): void {
    configInput.value?.click();
  }

  async function onFolderSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (input) {
      input.value = "";
    }

    await loadFolder(files);
  }

  async function onConfigSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (input) {
      input.value = "";
    }
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      Object.assign(config, normalizeConfig(parsed));
      setStatus(`Imported config from ${file.name}.`);
    } catch (error) {
      loadError.value = `Could not import config: ${getErrorMessage(error)}`;
    }
  }

  async function loadFolder(files: File[]): Promise<void> {
    if (!files.length) {
      return;
    }

    isBusy.value = true;
    loadError.value = "";
    setStatus("Loading folder...");

    try {
      revokeImageUrls();
      history.past.splice(0);
      history.future.splice(0);

      const tagFiles = new Map<string, File>();
      const imageFiles: File[] = [];

      for (const file of files) {
        const relativePath = getRelativePath(file);
        const fileName = getPathBaseName(relativePath);
        const lowerPath = relativePath.toLowerCase();
        const lowerName = fileName.toLowerCase();

        if (lowerName.endsWith(".txt")) {
          tagFiles.set(lowerPath, file);
          tagFiles.set(lowerName, file);
        } else if (isImageFileName(fileName)) {
          imageFiles.push(file);
        }
      }

      imageFiles.sort((left, right) => getRelativePath(left).localeCompare(getRelativePath(right)));

      const nextImages: ImageRecord[] = [];
      for (let index = 0; index < imageFiles.length; index += 1) {
        const file = imageFiles[index];
        const relativePath = getRelativePath(file);
        const fileName = getPathBaseName(relativePath);
        const tagFile = findTagFile(file, tagFiles);
        const tagText = tagFile ? await tagFile.text() : "";
        const tags = parseTags(tagText);
        const tagFileName = tagFile ? getPathBaseName(getRelativePath(tagFile)) : getTagFileName(fileName);
        const objectUrl = URL.createObjectURL(file);
        const metadata = await readImageMetadata(objectUrl);
        const outputTagPath = relativePath.includes("/")
          ? `${relativePath.slice(0, relativePath.lastIndexOf("/") + 1)}${getTagFileName(fileName)}`
          : getTagFileName(fileName);

        nextImages.push({
          id: `${index}-${fileName}-${file.lastModified}-${file.size}`,
          index,
          file,
          relativePath,
          fileName,
          originalFileName: fileName,
          objectUrl,
          tagFileName,
          outputTagPath,
          width: metadata.width,
          height: metadata.height,
          fileSize: file.size,
          tags,
          originalTags: [...tags],
          removedTags: [],
          selectedTag: "",
          historyOpen: false,
          editText: formatTags(tags),
          draftDirty: false,
          dirty: false,
          lastSavedAt: 0
        });
      }

      images.value = nextImages;
      datasetName.value = getDatasetName(files);
      visibleLimit.value = visibleBatchSize;
      recalculateDerivedTags();
      await persistCurrentDataset(true);
      setStatus(`Loaded ${nextImages.length} images from ${datasetName.value}.`);
    } catch (error) {
      console.error(error);
      loadError.value = `Could not load folder: ${getErrorMessage(error)}`;
      setStatus("Folder load failed.");
    } finally {
      isBusy.value = false;
    }
  }

  function imageMetadataLine(image: ImageRecord): string {
    const resolution = image.width && image.height ? `${image.width}x${image.height}` : "unknown resolution";
    return `${image.tags.length} tags / ${resolution} / ${formatBytes(image.fileSize)}${image.tagFileName ? ` / ${image.tagFileName}` : ""}`;
  }

  async function restorePersistedDataset(): Promise<boolean> {
    loadError.value = "";

    try {
      const persisted = await loadPersistedDataset();
      if (!persisted) {
        return false;
      }

      const restoredImages: ImageRecord[] = [];
      for (const imageState of persisted.state.images) {
        const file = persisted.filesById.get(imageState.id);
        if (!file) {
          throw new Error(`Cached file is missing for ${imageState.fileName}.`);
        }

        restoredImages.push({
          ...imageState,
          file,
          objectUrl: URL.createObjectURL(file),
          historyOpen: false
        });
      }

      revokeImageUrls();
      history.past.splice(0);
      history.future.splice(0);
      images.value = restoredImages;
      datasetName.value = persisted.state.datasetName || "Restored browser dataset";
      visibleLimit.value = visibleBatchSize;
      recalculateDerivedTags();
      setStatus(`Restored ${restoredImages.length} images from browser storage.`);
      return true;
    } catch (error) {
      console.error(error);
      loadError.value = `Could not restore saved folder: ${getErrorMessage(error)}`;
      setStatus("Saved folder restore failed.");
      return false;
    }
  }

  async function persistCurrentDataset(includeFiles = false): Promise<void> {
    if (!images.value.length) {
      return;
    }

    try {
      const state = createPersistedDatasetState(datasetName.value, images.value);
      const fileRecords = includeFiles ? createPersistedFileRecords(images.value) : undefined;
      await savePersistedDataset(state, fileRecords);
    } catch (error) {
      console.error(error);
      loadError.value = `Could not persist folder for reload: ${getErrorMessage(error)}`;
    }
  }

  function findTagFile(imageFile: File, tagFiles: Map<string, File>): File | null {
    const relativePath = getRelativePath(imageFile);
    const fileName = getPathBaseName(relativePath);
    const directory = relativePath.includes("/") ? relativePath.slice(0, relativePath.lastIndexOf("/") + 1) : "";

    for (const candidate of getTagFileCandidates(fileName)) {
      const relativeCandidate = `${directory}${candidate}`.toLowerCase();
      const nameCandidate = candidate.toLowerCase();
      if (tagFiles.has(relativeCandidate)) {
        return tagFiles.get(relativeCandidate) ?? null;
      }
      if (tagFiles.has(nameCandidate)) {
        return tagFiles.get(nameCandidate) ?? null;
      }
    }

    return null;
  }

  return {
    openFolderPicker,
    openConfigPicker,
    onFolderSelected,
    onConfigSelected,
    loadFolder,
    restorePersistedDataset,
    persistCurrentDataset,
    imageMetadataLine
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
