import type {
  AppConfig,
  BatchToolsPlacement,
  FilterMode,
  FilterTarget,
  HeaderPanelMode,
  HeaderSectionPlacement,
  ImageRowHeightMode,
  ImageWidthMode,
  RowChipMode,
  SidePanelMode,
  SidePanelPosition,
  StatsPlacement,
  TagSetsPlacement,
  ThemeMode
} from "~/types/imageTagger";

const tagSetPlacements: TagSetsPlacement[] = ["side", "top", "hidden"];
const filterTargets: FilterTarget[] = ["filename", "caption"];
const statsPlacements: StatsPlacement[] = ["tab", "side", "hidden"];
const batchToolsPlacements: BatchToolsPlacement[] = ["tab", "side"];
const headerSectionPlacements: HeaderSectionPlacement[] = ["header"];
const sidePanelPositions: SidePanelPosition[] = ["left", "right"];
const rowChipModes: RowChipMode[] = ["hidden", "common-deleted", "deleted", "common", "everything"];
const imageRowHeightModes: ImageRowHeightMode[] = ["full", "fixed"];
const imageWidthModes: ImageWidthMode[] = ["compact", "flexible", "fixed"];
const defaultFixedRowHeight = 360;
const defaultFixedImageWidth = 240;
const defaultSidePanelWidth = 340;
const defaultConfigName = "tva-dataset";
const windowsReservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const invalidFileNameCharacters = /[<>:"/\\|?*\u0000-\u001f]/g;

type ConfigSource = Partial<Record<keyof AppConfig | string, unknown>>;

export function normalizeConfig(source: ConfigSource = {}): AppConfig {
  return {
    name: normalizeConfigName(source.name),
    commonTagsText: stringValue(source.commonTagsText),
    knownTagsText: stringValue(source.knownTagsText),
    highlightTagsText: stringValue(source.highlightTagsText ?? source.highlightedTagsText),
    highlightText: stringValue(source.highlightText ?? source.highlightedText),
    orderTagsText: stringValue(source.orderTagsText ?? source.orderOfTags),
    removePatternsText: stringValue(source.removePatternsText ?? source.scriptRemoveTags),
    filterText: stringValue(source.filterText ?? source.tagFilter),
    filterMode: normalizeFilterMode(source.filterMode, source.isFilterRegex),
    filterTarget: includesValue(filterTargets, source.filterTarget) ? source.filterTarget : "caption",
    ignoreCase: Boolean(source.ignoreCase ?? source.filterIgnoreCase ?? false),
    theme: source.theme === "light" ? "light" : "dark",
    headerPanelMode: source.headerPanelMode === "hidden" ? "hidden" : "open",
    sidePanelMode: source.sidePanelMode === "hidden" ? "hidden" : "open",
    tagSetsPlacement: includesValue(tagSetPlacements, source.tagSetsPlacement) ? source.tagSetsPlacement : "side",
    commonTagsPlacement: normalizeTagSetPlacement(source.commonTagsPlacement, source.tagSetsPlacement),
    knownTagsPlacement: normalizeTagSetPlacement(source.knownTagsPlacement, source.tagSetsPlacement),
    highlightTagsPlacement: normalizeTagSetPlacement(source.highlightTagsPlacement, source.tagSetsPlacement),
    highlightTextPlacement: normalizeTagSetPlacement(source.highlightTextPlacement, source.tagSetsPlacement),
    orderTagsPlacement: normalizeTagSetPlacement(source.orderTagsPlacement, source.tagSetsPlacement),
    statsPlacement: includesValue(statsPlacements, source.statsPlacement) ? source.statsPlacement : "tab",
    batchToolsPlacement: includesValue(batchToolsPlacements, source.batchToolsPlacement) ? source.batchToolsPlacement : "side",
    fileManagementPlacement: "header",
    layoutConfigPlacement: "header",
    filterPlacement: includesValue(headerSectionPlacements, source.filterPlacement) ? source.filterPlacement : "header",
    sidePanelWidth: normalizeSidePanelWidth(source.sidePanelWidth),
    sidePanelPosition: includesValue(sidePanelPositions, source.sidePanelPosition) ? source.sidePanelPosition : "left",
    headerHeight: normalizeHeaderHeight(source.headerHeight),
    showTagsColumn: source.showTagsColumn !== false,
    rowChipMode: normalizeRowChipMode(source.rowChipMode, source.showTagsColumn),
    imageRowHeightMode: includesValue(imageRowHeightModes, source.imageRowHeightMode) ? source.imageRowHeightMode : "full",
    imageRowFixedHeight: normalizeFixedDimension(source.imageRowFixedHeight, defaultFixedRowHeight),
    imageWidthMode: normalizeImageWidthMode(source.imageWidthMode),
    imageFixedWidth: normalizeFixedDimension(source.imageFixedWidth, defaultFixedImageWidth)
  };
}

export function normalizeConfigName(value: unknown): string {
  const name = typeof value === "string" ? value : "";
  const sanitized = sanitizeConfigNameInput(name)
    .replace(/[ .]+$/g, "")
    .trim();

  if (!sanitized || windowsReservedNames.test(sanitized)) {
    return defaultConfigName;
  }

  return sanitized;
}

export function sanitizeConfigNameInput(value: string): string {
  return value.replace(invalidFileNameCharacters, "");
}

export function isValidConfigName(value: string): boolean {
  return normalizeConfigName(value) === value;
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

function normalizeHeaderHeight(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.min(1200, Math.max(0, Math.round(numberValue)));
}

function normalizeRowChipMode(value: unknown, legacyShowTagsColumn: unknown): RowChipMode {
  if (includesValue(rowChipModes, value)) {
    return value;
  }

  return legacyShowTagsColumn === false ? "hidden" : "common-deleted";
}

function normalizeImageWidthMode(value: unknown): ImageWidthMode {
  if (value === "current") {
    return "compact";
  }

  return includesValue(imageWidthModes, value) ? value : "compact";
}

function normalizeTagSetPlacement(value: unknown, fallback: unknown): TagSetsPlacement {
  if (includesValue(tagSetPlacements, value)) {
    return value;
  }

  return includesValue(tagSetPlacements, fallback) ? fallback : "side";
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function isSidePanelMode(value: unknown): value is SidePanelMode {
  return value === "open" || value === "hidden";
}

export function isHeaderPanelMode(value: unknown): value is HeaderPanelMode {
  return value === "open" || value === "hidden";
}
