import type {
  AppConfig,
  DensityMode,
  FilterMode,
  ImageSizeMode,
  SidePanelMode,
  StatsPlacement,
  TagSetsPlacement,
  ThemeMode
} from "~/types/imageTagger";

const tagSetPlacements: TagSetsPlacement[] = ["side", "top", "hidden"];
const statsPlacements: StatsPlacement[] = ["tab", "side", "hidden"];
const imageSizes: ImageSizeMode[] = ["tiny", "small", "medium", "large"];

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
    density: source.density === "compact" ? "compact" : "comfortable",
    theme: source.theme === "light" ? "light" : "dark",
    sidePanelMode: source.sidePanelMode === "hidden" ? "hidden" : "open",
    tagSetsPlacement: includesValue(tagSetPlacements, source.tagSetsPlacement) ? source.tagSetsPlacement : "side",
    statsPlacement: includesValue(statsPlacements, source.statsPlacement) ? source.statsPlacement : "tab",
    showTagsColumn: source.showTagsColumn !== false,
    imageSize: includesValue(imageSizes, source.imageSize) ? source.imageSize : "medium"
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

export function isDensityMode(value: unknown): value is DensityMode {
  return value === "comfortable" || value === "compact";
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function isSidePanelMode(value: unknown): value is SidePanelMode {
  return value === "open" || value === "hidden";
}
