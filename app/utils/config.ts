import type {
  AppConfig,
  BatchToolsPlacement,
  FilterMode,
  HistoryPlacement,
  ImageRowHeightMode,
  ImageWidthMode,
  SidePanelMode,
  StatsPlacement,
  TagSetsPlacement,
  ThemeMode
} from "~/types/imageTagger";

const tagSetPlacements: TagSetsPlacement[] = ["side", "top", "hidden"];
const statsPlacements: StatsPlacement[] = ["tab", "side", "hidden"];
const batchToolsPlacements: BatchToolsPlacement[] = ["tab", "side"];
const historyPlacements: HistoryPlacement[] = ["top", "side"];
const imageRowHeightModes: ImageRowHeightMode[] = ["full", "fixed"];
const imageWidthModes: ImageWidthMode[] = ["current", "fixed"];
const defaultFixedRowHeight = 360;
const defaultFixedImageWidth = 240;
const defaultSidePanelWidth = 340;

type ConfigSource = Partial<Record<keyof AppConfig | string, unknown>>;

export function normalizeConfig(source: ConfigSource = {}): AppConfig {
  return {
    commonTagsText: stringValue(source.commonTagsText),
    knownTagsText: stringValue(source.knownTagsText),
    highlightTagsText: stringValue(source.highlightTagsText ?? source.highlightedTagsText),
    highlightText: stringValue(source.highlightText ?? source.highlightedText),
    orderTagsText: stringValue(source.orderTagsText ?? source.orderOfTags),
    removePatternsText: stringValue(source.removePatternsText ?? source.scriptRemoveTags),
    filterText: stringValue(source.filterText ?? source.tagFilter),
    filterMode: normalizeFilterMode(source.filterMode, source.isFilterRegex),
    ignoreCase: Boolean(source.ignoreCase ?? source.filterIgnoreCase ?? false),
    theme: source.theme === "light" ? "light" : "dark",
    sidePanelMode: source.sidePanelMode === "hidden" ? "hidden" : "open",
    tagSetsPlacement: includesValue(tagSetPlacements, source.tagSetsPlacement) ? source.tagSetsPlacement : "side",
    statsPlacement: includesValue(statsPlacements, source.statsPlacement) ? source.statsPlacement : "tab",
    batchToolsPlacement: includesValue(batchToolsPlacements, source.batchToolsPlacement) ? source.batchToolsPlacement : "side",
    historyPlacement: includesValue(historyPlacements, source.historyPlacement) ? source.historyPlacement : "side",
    sidePanelWidth: normalizeSidePanelWidth(source.sidePanelWidth),
    showTagsColumn: source.showTagsColumn !== false,
    imageRowHeightMode: includesValue(imageRowHeightModes, source.imageRowHeightMode) ? source.imageRowHeightMode : "full",
    imageRowFixedHeight: normalizeFixedDimension(source.imageRowFixedHeight, defaultFixedRowHeight),
    imageWidthMode: includesValue(imageWidthModes, source.imageWidthMode) ? source.imageWidthMode : "current",
    imageFixedWidth: normalizeFixedDimension(source.imageFixedWidth, defaultFixedImageWidth)
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeFilterMode(mode: unknown, legacyRegexFlag: unknown): FilterMode {
  if (mode === "regex" || mode === "tags") {
    return mode;
  }

  return legacyRegexFlag ? "regex" : "tags";
}

function includesValue<T extends string>(values: T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function normalizeFixedDimension(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(1, Math.round(numberValue));
}

function normalizeSidePanelWidth(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return defaultSidePanelWidth;
  }

  return Math.min(720, Math.max(260, Math.round(numberValue)));
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function isSidePanelMode(value: unknown): value is SidePanelMode {
  return value === "open" || value === "hidden";
}
