import type { Ref, ShallowRef } from "vue";
import placeholder001Caption from "~/assets/placeholder-dataset/placeholder-001.txt?raw";
import placeholder001Url from "~/assets/placeholder-dataset/placeholder-001.png";
import placeholder002Caption from "~/assets/placeholder-dataset/placeholder-002.txt?raw";
import placeholder002Url from "~/assets/placeholder-dataset/placeholder-002.png";
import placeholder003Caption from "~/assets/placeholder-dataset/placeholder-003.txt?raw";
import placeholder003Url from "~/assets/placeholder-dataset/placeholder-003.png";
import placeholder004Caption from "~/assets/placeholder-dataset/placeholder-004.txt?raw";
import placeholder004Url from "~/assets/placeholder-dataset/placeholder-004.png";
import placeholder005Caption from "~/assets/placeholder-dataset/placeholder-005.txt?raw";
import placeholder005Url from "~/assets/placeholder-dataset/placeholder-005.png";
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

  async function loadPlaceholderDataset(): Promise<void> {
    isBusy.value = true;
    loadError.value = "";
    setStatus("Creating placeholder dataset...");

    try {
      revokeImageUrls();
      history.past.splice(0);
      history.future.splice(0);

      const nextImages: ImageRecord[] = [];
      for (let index = 0; index < placeholderAssets.length; index += 1) {
        const asset = placeholderAssets[index];
        const imageNumber = index + 1;
        const tags = parseTags(asset.caption);
        const file = await createPlaceholderImageFile(asset.url, asset.fileName, imageNumber);
        const objectUrl = URL.createObjectURL(file);

        nextImages.push({
          id: `placeholder-${imageNumber}-${file.size}`,
          index,
          file,
          relativePath: `placeholder-dataset/${asset.fileName}`,
          fileName: asset.fileName,
          originalFileName: asset.fileName,
          objectUrl,
          tagFileName: asset.tagFileName,
          outputTagPath: `placeholder-dataset/${asset.tagFileName}`,
          width: placeholderImageSize,
          height: placeholderImageSize,
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
      datasetName.value = "Placeholder dataset";
      visibleLimit.value = visibleBatchSize;
      recalculateDerivedTags();
      setStatus("Loaded placeholder dataset.");
    } catch (error) {
      console.error(error);
      loadError.value = `Could not create placeholder dataset: ${getErrorMessage(error)}`;
      setStatus("Placeholder dataset failed.");
    } finally {
      isBusy.value = false;
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
    loadPlaceholderDataset,
    persistCurrentDataset,
    imageMetadataLine
  };
}

const placeholderImageSize = 1024;
const placeholderAssets = [
  { url: placeholder001Url, caption: placeholder001Caption, fileName: "placeholder-001.png", tagFileName: "placeholder-001.txt" },
  { url: placeholder002Url, caption: placeholder002Caption, fileName: "placeholder-002.png", tagFileName: "placeholder-002.txt" },
  { url: placeholder003Url, caption: placeholder003Caption, fileName: "placeholder-003.png", tagFileName: "placeholder-003.txt" },
  { url: placeholder004Url, caption: placeholder004Caption, fileName: "placeholder-004.png", tagFileName: "placeholder-004.txt" },
  { url: placeholder005Url, caption: placeholder005Caption, fileName: "placeholder-005.png", tagFileName: "placeholder-005.txt" }
] as const;

async function createPlaceholderImageFile(url: string, fileName: string, imageNumber: number): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${fileName}.`);
  }

  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/png", lastModified: Date.now() + imageNumber });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
