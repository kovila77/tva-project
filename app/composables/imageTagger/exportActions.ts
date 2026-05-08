import type { ComputedRef, Ref, ShallowRef } from "vue";
import type { AppConfig, ImageRecord, ZipEntry } from "~/types/imageTagger";
import { normalizeConfigName } from "~/utils/config";
import { downloadBlob } from "~/utils/imageFiles";
import { formatTags, makeDatasetSnapshot } from "~/utils/tagDataset";
import { createZipBlob } from "~/utils/zipWriter";

interface ExportActionOptions {
  config: AppConfig;
  images: ShallowRef<ImageRecord[]>;
  visibleImages: ComputedRef<ImageRecord[]>;
  isBusy: Ref<boolean>;
  loadError: Ref<string>;
  setStatus: (message: string) => void;
}

export function createExportActions({
  config,
  images,
  visibleImages,
  isBusy,
  loadError,
  setStatus
}: ExportActionOptions) {
  function exportConfig(): void {
    const blob = new Blob([JSON.stringify(makeDatasetSnapshot(config), null, 2)], { type: "application/json" });
    downloadBlob(blob, "tva-config.json");
  }

  async function exportDatasetZip(visibleOnly: boolean): Promise<void> {
    const targets = visibleOnly ? visibleImages.value : images.value;
    if (!targets.length) {
      return;
    }

    isBusy.value = true;
    setStatus("Preparing dataset archive...");

    try {
      const entries: ZipEntry[] = [];
      const usedNames = new Set<string>();
      const archiveName = normalizeConfigName(config.name);
      for (let index = 0; index < targets.length; index += 1) {
        const image = targets[index];
        setStatus(`Adding ${index + 1}/${targets.length}: ${image.fileName}`);
        entries.push(
          { name: datasetEntryPath(archiveName, image.fileName, usedNames), data: image.file },
          { name: datasetEntryPath(archiveName, image.tagFileName, usedNames), data: `${formatTags(image.tags)}\n` }
        );
      }

      const blob = await createZipBlob(entries);
      downloadBlob(blob, `${archiveName}${visibleOnly ? "-visible" : ""}.zip`);
      setStatus(`Exported ${targets.length} image/tag pairs.`);
    } catch (error) {
      loadError.value = `Could not export dataset: ${getErrorMessage(error)}`;
    } finally {
      isBusy.value = false;
    }
  }

  async function copyImageUrl(image: ImageRecord): Promise<void> {
    if (!image?.objectUrl) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(image.objectUrl);
      setStatus(`Copied temporary URL for ${image.fileName}.`);
    } catch (error) {
      loadError.value = `Could not copy image URL: ${getErrorMessage(error)}`;
    }
  }

  return {
    exportConfig,
    exportDatasetZip,
    copyImageUrl
  };
}

function datasetEntryPath(rootName: string, fileName: string, usedNames: Set<string>): string {
  const safeName = fileName.split(/[\\/]/).at(-1) || "file";
  const uniqueName = makeUniqueFileName(safeName, usedNames);
  return `${rootName}/${uniqueName}`;
}

function makeUniqueFileName(fileName: string, usedNames: Set<string>): string {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex > 0 ? fileName.slice(dotIndex) : "";
  let nextIndex = 2;
  let candidate = `${baseName}-${nextIndex}${extension}`;

  while (usedNames.has(candidate)) {
    nextIndex += 1;
    candidate = `${baseName}-${nextIndex}${extension}`;
  }

  usedNames.add(candidate);
  return candidate;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
