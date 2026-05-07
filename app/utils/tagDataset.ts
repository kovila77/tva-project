import type { AppConfig, FilterMatcherInput, ImageRecord, TagStat } from "~/types/imageTagger";

export const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"] as const;

export function getPathBaseName(value: unknown): string {
  return String(value ?? "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop() ?? "";
}

export function getFileExtension(fileName: unknown): string {
  const value = String(fileName ?? "");
  const index = value.lastIndexOf(".");
  return index >= 0 ? value.slice(index).toLowerCase() : "";
}

export function isImageFileName(fileName: unknown): boolean {
  return imageExtensions.includes(getFileExtension(fileName) as (typeof imageExtensions)[number]);
}

export function parseTags(text: unknown, distinct = true): string[] {
  const tags = String(text ?? "")
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return distinct ? distinctTags(tags) : tags;
}

export function formatTags(tags: string[]): string {
  return distinctTags(tags).join(", ");
}

export function distinctTags(tags: unknown): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of Array.isArray(tags) ? tags : []) {
    const normalized = String(tag ?? "").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function includesTag(tags: string[], tag: unknown): boolean {
  const target = String(tag ?? "").trim().toLowerCase();
  return Boolean(target) && tags.some((item) => item.toLowerCase() === target);
}

export function addTag(tags: string[], tag: unknown): string[] {
  const nextTag = String(tag ?? "").trim();
  if (!nextTag || includesTag(tags, nextTag)) {
    return distinctTags(tags);
  }

  return distinctTags([...tags, nextTag]);
}

export function removeTag(tags: string[], tag: unknown): string[] {
  const target = String(tag ?? "").trim().toLowerCase();
  return distinctTags(tags).filter((item) => item.toLowerCase() !== target);
}

export function orderTags(tags: string[], order: unknown): string[] {
  const cleanTags = distinctTags(tags);
  const orderKeys = parseTags(order).map((tag) => tag.toLowerCase());
  if (!orderKeys.length) {
    return cleanTags;
  }

  const used = new Set<string>();
  const ordered: string[] = [];

  for (const key of orderKeys) {
    const found = cleanTags.find((tag) => tag.toLowerCase() === key);
    if (found && !used.has(found.toLowerCase())) {
      ordered.push(found);
      used.add(found.toLowerCase());
    }
  }

  for (const tag of cleanTags) {
    const key = tag.toLowerCase();
    if (!used.has(key)) {
      ordered.push(tag);
      used.add(key);
    }
  }

  return ordered;
}

export function getTagFileName(imageFileName: unknown): string {
  return `${String(imageFileName).replace(/\.[^.]*$/, "")}.txt`;
}

export function getTagFileCandidates(imageFileName: unknown): string[] {
  const lowerName = String(imageFileName).toLowerCase();
  return [
    getTagFileName(lowerName),
    `${lowerName}.txt`
  ];
}

export function countTags(images: ImageRecord[]): TagStat[] {
  const counts = new Map<string, number>();

  for (const image of images) {
    for (const tag of image.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
}

export function collectKnownTags(images: ImageRecord[], config: AppConfig): string[] {
  return distinctTags([
    ...parseTags(config.commonTagsText),
    ...parseTags(config.knownTagsText),
    ...parseTags(config.highlightTagsText),
    ...parseTags(config.orderTagsText),
    ...images.flatMap((image) => image.tags)
  ]).sort((left, right) => left.localeCompare(right));
}

export function createFilterMatcher({ text, mode, ignoreCase }: FilterMatcherInput): (image: ImageRecord) => boolean {
  const query = String(text ?? "").trim();
  if (!query) {
    return () => true;
  }

  if (mode === "regex") {
    const patterns = parseTags(query, false).map((pattern) => new RegExp(pattern, ignoreCase ? "i" : ""));
    return (image) => patterns.some((pattern) => (
      pattern.test(image.fileName)
      || image.tags.some((tag) => pattern.test(tag))
    ));
  }

  const requiredTags = parseTags(query).map((tag) => tag.toLowerCase());
  return (image) => requiredTags.every((tag) => (
    image.fileName.toLowerCase().includes(tag)
    || image.tags.some((item) => item.toLowerCase() === tag)
  ));
}

export function makeDatasetSnapshot(config: AppConfig): AppConfig {
  return {
    commonTagsText: config.commonTagsText,
    knownTagsText: config.knownTagsText,
    highlightTagsText: config.highlightTagsText,
    highlightText: config.highlightText,
    orderTagsText: config.orderTagsText,
    removePatternsText: config.removePatternsText,
    filterText: config.filterText,
    filterMode: config.filterMode,
    ignoreCase: config.ignoreCase,
    theme: config.theme,
    sidePanelMode: config.sidePanelMode,
    tagSetsPlacement: config.tagSetsPlacement,
    statsPlacement: config.statsPlacement,
    batchToolsPlacement: config.batchToolsPlacement,
    fileManagementPlacement: config.fileManagementPlacement,
    layoutConfigPlacement: config.layoutConfigPlacement,
    filterPlacement: config.filterPlacement,
    sidePanelWidth: config.sidePanelWidth,
    sidePanelPosition: config.sidePanelPosition,
    headerHeight: config.headerHeight,
    showTagsColumn: config.showTagsColumn,
    imageRowHeightMode: config.imageRowHeightMode,
    imageRowFixedHeight: config.imageRowFixedHeight,
    imageWidthMode: config.imageWidthMode,
    imageFixedWidth: config.imageFixedWidth
  };
}
