export type FilterMode = "tags" | "regex";
export type FilterTarget = "filename" | "caption";
export type ThemeMode = "dark" | "light";
export type SidePanelMode = "open" | "hidden";
export type HeaderPanelMode = "open" | "hidden";
export type TagSetsPlacement = "side" | "top" | "hidden";
export type StatsPlacement = "tab" | "side" | "hidden";
export type BatchToolsPlacement = "tab" | "side";
export type HeaderSectionPlacement = "header" | "side";
export type SidePanelPosition = "left" | "right";
export type RowChipMode = "hidden" | "common-deleted" | "deleted" | "common" | "everything";
export type ImageRowHeightMode = "full" | "fixed";
export type ImageWidthMode = "compact" | "flexible" | "fixed";
export type MainTab = "images" | "stats" | "batch";
export type TagTextFieldMode = "tags" | "single-tag" | "filter" | "regex" | "text";
export type TagTextStyleMatch = "tag" | "fragment" | "regex" | "unmatched-tag" | "all-tags";

export type ConfigTextKey =
  | "commonTagsText"
  | "knownTagsText"
  | "highlightTagsText"
  | "highlightText"
  | "orderTagsText"
  | "removePatternsText"
  | "filterText";

export interface AppConfig {
  name: string;
  commonTagsText: string;
  knownTagsText: string;
  highlightTagsText: string;
  highlightText: string;
  orderTagsText: string;
  removePatternsText: string;
  filterText: string;
  filterMode: FilterMode;
  filterTarget: FilterTarget;
  ignoreCase: boolean;
  theme: ThemeMode;
  headerPanelMode: HeaderPanelMode;
  sidePanelMode: SidePanelMode;
  tagSetsPlacement: TagSetsPlacement;
  commonTagsPlacement: TagSetsPlacement;
  knownTagsPlacement: TagSetsPlacement;
  highlightTagsPlacement: TagSetsPlacement;
  highlightTextPlacement: TagSetsPlacement;
  orderTagsPlacement: TagSetsPlacement;
  statsPlacement: StatsPlacement;
  batchToolsPlacement: BatchToolsPlacement;
  fileManagementPlacement: HeaderSectionPlacement;
  layoutConfigPlacement: HeaderSectionPlacement;
  filterPlacement: HeaderSectionPlacement;
  sidePanelWidth: number;
  sidePanelPosition: SidePanelPosition;
  headerHeight: number;
  showTagsColumn: boolean;
  rowChipMode: RowChipMode;
  imageRowHeightMode: ImageRowHeightMode;
  imageRowFixedHeight: number;
  imageWidthMode: ImageWidthMode;
  imageFixedWidth: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
}

export interface ImageRecord {
  id: string;
  index: number;
  file: File;
  relativePath: string;
  fileName: string;
  originalFileName: string;
  objectUrl: string;
  tagFileName: string;
  outputTagPath: string;
  width: number;
  height: number;
  fileSize: number;
  tags: string[];
  originalTags: string[];
  removedTags: string[];
  selectedTag: string;
  historyOpen: boolean;
  editText: string;
  draftDirty: boolean;
  dirty: boolean;
  lastSavedAt: number;
}

export interface PersistedImageState {
  id: string;
  index: number;
  relativePath: string;
  fileName: string;
  originalFileName: string;
  tagFileName: string;
  outputTagPath: string;
  width: number;
  height: number;
  fileSize: number;
  tags: string[];
  originalTags: string[];
  removedTags: string[];
  selectedTag: string;
  editText: string;
  draftDirty: boolean;
  dirty: boolean;
  lastSavedAt: number;
}

export interface PersistedFileRecord {
  id: string;
  file: File;
}

export interface PersistedDatasetState {
  version: 1;
  savedAt: number;
  datasetName: string;
  images: PersistedImageState[];
}

export interface PersistedDataset {
  state: PersistedDatasetState;
  filesById: Map<string, File>;
}

export interface ImageSnapshot {
  id: string;
  fileName: string;
  tagFileName: string;
  outputTagPath: string;
  tags: string[];
  removedTags: string[];
  selectedTag: string;
  editText: string;
  dirty: boolean;
}

export interface RemovedImageRecord {
  image: ImageRecord;
  index: number;
}

export interface DatasetOperation {
  label: string;
  time: number;
  before: ImageSnapshot[];
  after: ImageSnapshot[];
  removedRecords?: RemovedImageRecord[];
}

export interface OperationChange {
  image?: ImageRecord | null;
  after: ImageSnapshot;
}

export interface HistoryState {
  past: DatasetOperation[];
  future: DatasetOperation[];
}

export interface BatchState {
  addTag: string;
}

export interface TagTextStyleRule {
  key: string;
  className: string;
  match: TagTextStyleMatch;
  tags?: string[];
  fragments?: string[];
  patterns?: string[];
  caseSensitive?: boolean;
}

export interface ViewerState {
  image: ImageRecord | null;
  scale: number;
  x: number;
  y: number;
  dragging: boolean;
  pointerId: number | null;
  dragStartX: number;
  dragStartY: number;
}

export interface SettingsModalState {
  open: boolean;
}

export interface TagStat {
  tag: string;
  count: number;
}

export interface FilterMatcherInput {
  text: string;
  mode: FilterMode;
  target: FilterTarget;
  ignoreCase: boolean;
}

export interface ImageHistoryRow {
  key: string;
  text: string;
}

export type ZipEntryData = Blob | ArrayBuffer | Uint8Array | string | null | undefined;

export interface ZipEntry {
  name: string;
  data: ZipEntryData;
}
