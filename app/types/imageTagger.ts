export type FilterMode = "tags" | "regex";
export type DensityMode = "comfortable" | "compact";
export type ThemeMode = "dark" | "light";
export type SidePanelMode = "open" | "hidden";
export type TagSetsPlacement = "side" | "top" | "hidden";
export type StatsPlacement = "tab" | "side" | "hidden";
export type ImageSizeMode = "tiny" | "small" | "medium" | "large";
export type MainTab = "images" | "stats";

export type ConfigTextKey =
  | "commonTagsText"
  | "knownTagsText"
  | "highlightTagsText"
  | "highlightText"
  | "orderTagsText"
  | "removePatternsText"
  | "filterText";

export interface AppConfig {
  commonTagsText: string;
  knownTagsText: string;
  highlightTagsText: string;
  highlightText: string;
  orderTagsText: string;
  removePatternsText: string;
  filterText: string;
  filterMode: FilterMode;
  ignoreCase: boolean;
  density: DensityMode;
  theme: ThemeMode;
  sidePanelMode: SidePanelMode;
  tagSetsPlacement: TagSetsPlacement;
  statsPlacement: StatsPlacement;
  showTagsColumn: boolean;
  imageSize: ImageSizeMode;
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

export interface TagStat {
  tag: string;
  count: number;
}

export interface FilterMatcherInput {
  text: string;
  mode: FilterMode;
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
