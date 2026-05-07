import type {
  AppConfig,
  FilterMode,
  ImageRowHeightMode,
  SidePanelMode,
  StatsPlacement,
  TagSetsPlacement,
  ThemeMode
} from "~/types/imageTagger";

const tagSetPlacements: TagSetsPlacement[] = ["side", "top", "hidden"];
const statsPlacements: StatsPlacement[] = ["tab", "side", "hidden"];
const imageRowHeightModes: ImageRowHeightMode[] = ["full", "fixed"];
const defaultFixedRowHeight = 360;
const minFixedRowHeight = 100;
const maxFixedRowHeight = 2500;

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
    showTagsColumn: source.showTagsColumn !== false,
    imageRowHeightMode: includesValue(imageRowHeightModes, source.imageRowHeightMode) ? source.imageRowHeightMode : "full",
    imageRowFixedHeight: normalizeFixedRowHeight(source.imageRowFixedHeight)
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

function normalizeFixedRowHeight(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return defaultFixedRowHeight;
  }

  return Math.min(maxFixedRowHeight, Math.max(minFixedRowHeight, Math.round(numberValue)));
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function isSidePanelMode(value: unknown): value is SidePanelMode {
  return value === "open" || value === "hidden";
}
