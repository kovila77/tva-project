import type { ImageMetadata, ThemeMode } from "~/types/imageTagger";
import { getFileExtension } from "~/utils/tagDataset";

type BrowserFile = File & {
  webkitRelativePath?: string;
  relativePath?: string;
};

export function getRelativePath(file: File): string {
  const browserFile = file as BrowserFile;
  return String(browserFile.webkitRelativePath || browserFile.relativePath || file.name || "");
}

export function getDatasetName(files: File[]): string {
  const firstPath = files[0] ? getRelativePath(files[0]) : "";
  return firstPath.includes("/") ? firstPath.split("/")[0] : "Uploaded folder";
}

export async function readImageMetadata(objectUrl: string): Promise<ImageMetadata> {
  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = objectUrl;
  });
}

export function formatBytes(value: number): string {
  const bytes = Number(value) || 0;
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function resizeImage(file: File, maxPixels: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPixels / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: getFileExtension(file.name) === ".png" });
  if (!context) {
    bitmap.close?.();
    throw new Error("Could not create canvas context.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const mimeType = getFileExtension(file.name) === ".png" ? "image/png" : "image/jpeg";
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not create resized image blob."));
      }
    }, mimeType, 0.94);
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
}
