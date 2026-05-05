import type { ComputedRef, Ref, ShallowRef } from "vue";
import type { AppConfig, ImageRecord, ZipEntry } from "~/types/imageTagger";
import { downloadBlob, resizeImage } from "~/utils/imageFiles";
import { formatTags, makeDatasetSnapshot } from "~/utils/tagDataset";
import { createZipBlob } from "~/utils/zipWriter";

interface ExportActionOptions {
  config: AppConfig;
  images: ShallowRef<ImageRecord[]>;
  visibleImages: ComputedRef<ImageRecord[]>;
  isBusy: Ref<boolean>;
  loadError: Ref<string>;
  resizedMaxPixels: number;
  setStatus: (message: string) => void;
}

export function createExportActions({
  config,
  images,
  visibleImages,
  isBusy,
  loadError,
  resizedMaxPixels,
  setStatus
}: ExportActionOptions) {
  function exportConfig(): void {
    const blob = new Blob([JSON.stringify(makeDatasetSnapshot(config), null, 2)], { type: "application/json" });
    downloadBlob(blob, "tva-config.json");
  }

  async function exportTagsZip(visibleOnly: boolean): Promise<void> {
    const targets = visibleOnly ? visibleImages.value : images.value;
    if (!targets.length) {
      return;
    }

    isBusy.value = true;
    setStatus("Preparing tag archive...");

    try {
      const blob = await createZipBlob(targets.map((image) => ({
        name: image.outputTagPath || image.tagFileName,
        data: `${formatTags(image.tags)}\n`
      })));
      downloadBlob(blob, visibleOnly ? "tva-visible-tags.zip" : "tva-tags.zip");
      setStatus(`Exported ${targets.length} tag files.`);
    } finally {
      isBusy.value = false;
    }
  }

  async function exportResizedImagesZip(): Promise<void> {
    const targets = visibleImages.value;
    if (!targets.length) {
      return;
    }

    isBusy.value = true;
    setStatus("Preparing resized image archive...");

    try {
      const entries: ZipEntry[] = [];
      for (let index = 0; index < targets.length; index += 1) {
        const image = targets[index];
        setStatus(`Resizing ${index + 1}/${targets.length}: ${image.fileName}`);
        const resized = await resizeImage(image.file, resizedMaxPixels);
        entries.push(
          { name: image.fileName, data: resized },
          { name: image.outputTagPath || image.tagFileName, data: `${formatTags(image.tags)}\n` }
        );
      }

      const blob = await createZipBlob(entries);
      downloadBlob(blob, "tva-resized-visible.zip");
      setStatus(`Exported ${targets.length} resized images.`);
    } catch (error) {
      loadError.value = `Could not export resized images: ${getErrorMessage(error)}`;
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
    exportTagsZip,
    exportResizedImagesZip,
    copyImageUrl
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
