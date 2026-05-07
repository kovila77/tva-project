import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, ref, shallowRef, watch } from "vue";
import type { InjectionKey } from "vue";
import defaultConfig from "~/config/default-config.json";
import { createBatchActions } from "~/composables/imageTagger/batchActions";
import { createDatasetActions } from "~/composables/imageTagger/datasetActions";
import { createExportActions } from "~/composables/imageTagger/exportActions";
import { createFilterActions } from "~/composables/imageTagger/filterActions";
import { createHistoryActions } from "~/composables/imageTagger/historyActions";
import { createRowTagActions } from "~/composables/imageTagger/rowTagActions";
import { createViewerActions } from "~/composables/imageTagger/viewerActions";
import type {
  AppConfig,
  BatchState,
  DatasetOperation,
  HistoryState,
  ImageRecord,
  MainTab,
  TagTextStyleRule,
  TagStat,
  ViewerState
} from "~/types/imageTagger";
import { normalizeConfig } from "~/utils/config";
import { applyTheme } from "~/utils/imageFiles";
import { collectKnownTags, countTags, createFilterMatcher, makeDatasetSnapshot, parseTags } from "~/utils/tagDataset";

const configStorageKey = "tva-image-tagger.config.v2";
const visibleBatchSize = 80;
const resizedMaxPixels = 1536;

function createImageTaggerContext() {
  const folderInput = ref<HTMLInputElement | null>(null);
  const configInput = ref<HTMLInputElement | null>(null);
  const images = shallowRef<ImageRecord[]>([]);
  const autocompleteTags = shallowRef<string[]>([]);
  const tagStats = shallowRef<TagStat[]>([]);
  const filteredBlinkTags = shallowRef<string[]>([]);
  const visibleLimit = ref(visibleBatchSize);
  const isBusy = ref(false);
  const statusText = ref("Ready");
  const loadError = ref("");
  const datasetName = ref("Local browser dataset");
  const filterInverted = ref(false);
  const activeMainTab = ref<MainTab>("images");

  const config = reactive<AppConfig>(normalizeConfig(defaultConfig as Record<string, unknown>));
  const batch = reactive<BatchState>({
    addTag: ""
  });
  const history = reactive<HistoryState>({
    past: [],
    future: []
  });
  const viewer = reactive<ViewerState>({
    image: null,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    pointerId: null,
    dragStartX: 0,
    dragStartY: 0
  });

  const commonTags = computed(() => parseTags(config.commonTagsText));
  const knownTags = computed(() => parseTags(config.knownTagsText));
  const highlightedTags = computed(() => parseTags(config.highlightTagsText));
  const highlightedText = computed(() => parseTags(config.highlightText));
  const orderTagsText = computed(() => config.orderTagsText);
  const tagTextStyleRules = computed<TagTextStyleRule[]>(() => [
    {
      key: "common-tag",
      className: "tag-text-common",
      match: "tag",
      tags: commonTags.value
    },
    {
      key: "highlight-tag",
      className: "tag-text-highlighted",
      match: "tag",
      tags: highlightedTags.value
    },
    {
      key: "highlight-fragment",
      className: "tag-text-fragment-highlighted",
      match: "fragment",
      fragments: highlightedText.value
    },
    {
      key: "filtered-blink-tag",
      className: "tag-text-filtered-blink",
      match: "tag",
      tags: filteredBlinkTags.value
    }
  ]);
  const imageTagTextStyleRules = computed<TagTextStyleRule[]>(() => [
    {
      key: "unknown-tag",
      className: "tag-text-unknown",
      match: "unmatched-tag",
      tags: knownTags.value
    },
    ...tagTextStyleRules.value
  ]);
  const filterTextStyleRules = computed<TagTextStyleRule[]>(() => config.filterMode === "regex"
    ? [{
        key: "filter-regex",
        className: "tag-text-regex",
        match: "all-tags"
      }]
    : imageTagTextStyleRules.value);
  const regexTextStyleRules = computed<TagTextStyleRule[]>(() => [{
    key: "regex-token",
    className: "tag-text-regex",
    match: "all-tags"
  }]);
  const dirtyImages = computed(() => images.value.filter((image) => image.dirty || image.draftDirty));
  const topTagStats = computed(() => tagStats.value.slice(0, 160));
  const lastUndoOperation = computed<DatasetOperation | null>(() => history.past[history.past.length - 1] ?? null);
  const lastRedoOperation = computed<DatasetOperation | null>(() => history.future[history.future.length - 1] ?? null);
  const hasHeaderTagSets = computed(() => (
    config.commonTagsPlacement === "top"
    || config.knownTagsPlacement === "top"
    || config.highlightTagsPlacement === "top"
    || config.highlightTextPlacement === "top"
    || config.orderTagsPlacement === "top"
  ));
  const hasSideTagSets = computed(() => (
    config.commonTagsPlacement === "side"
    || config.knownTagsPlacement === "side"
    || config.highlightTagsPlacement === "side"
    || config.highlightTextPlacement === "side"
    || config.orderTagsPlacement === "side"
  ));
  const hasHeaderPanelSections = computed(() => (
    config.fileManagementPlacement === "header"
    || config.layoutConfigPlacement === "header"
    || config.filterPlacement === "header"
    || hasHeaderTagSets.value
  ));
  const hasHeaderContent = computed(() => (
    config.headerPanelMode !== "hidden"
    && hasHeaderPanelSections.value
  ));
  const hasSidePanelSections = computed(() => (
    config.fileManagementPlacement === "side"
    || config.layoutConfigPlacement === "side"
    || config.filterPlacement === "side"
    || hasSideTagSets.value
    || config.batchToolsPlacement === "side"
    || config.statsPlacement === "side"
  ));
  const hasSidePanelContent = computed(() => (
    config.sidePanelMode !== "hidden"
    && hasSidePanelSections.value
  ));
  const layoutClasses = computed(() => ({
    "side-panel-right": config.sidePanelPosition === "right",
    "side-panel-hidden": !hasSidePanelContent.value,
    "row-tags-hidden": config.rowChipMode === "hidden"
  }));
  const viewerImageStyle = computed(() => ({
    transform: `translate(${viewer.x}px, ${viewer.y}px) scale(${viewer.scale})`
  }));

  const visibleImages = computed(() => {
    let matcher: (image: ImageRecord) => boolean = () => true;
    loadError.value = "";

    try {
      matcher = createFilterMatcher({
        text: config.filterText,
        mode: config.filterMode,
        ignoreCase: config.ignoreCase
      });
    } catch (error) {
      loadError.value = `Invalid filter regex: ${getErrorMessage(error)}`;
      return [];
    }

    const matched = images.value.filter((image) => matcher(image));
    const matchedIds = new Set(matched.map((image) => image.id));
    return filterInverted.value
      ? images.value.filter((image) => !matchedIds.has(image.id))
      : matched;
  });

  const renderedImages = computed(() => visibleImages.value.slice(0, visibleLimit.value));

  function refreshImages(): void {
    images.value = [...images.value];
  }

  function recalculateDerivedTags(): void {
    tagStats.value = countTags(images.value);
    autocompleteTags.value = collectKnownTags(images.value, config);
  }

  function setStatus(message: string): void {
    statusText.value = message;
  }

  let filteredBlinkTimer: ReturnType<typeof window.setTimeout> | null = null;

  function blinkFilteredTags(): void {
    filteredBlinkTags.value = config.filterMode === "tags" ? parseTags(config.filterText) : [];
    if (filteredBlinkTimer) {
      window.clearTimeout(filteredBlinkTimer);
    }
    filteredBlinkTimer = window.setTimeout(() => {
      filteredBlinkTimer = null;
      filteredBlinkTags.value = [];
    }, 3000);
  }

  const historyActions = createHistoryActions({
    images,
    history,
    orderTagsText,
    recalculateDerivedTags,
    refreshImages,
    setStatus
  });
  const filterActions = createFilterActions({
    config,
    filterInverted,
    visibleLimit,
    visibleImages,
    activeMainTab,
    visibleBatchSize,
    onFilterExecuted: blinkFilteredTags
  });
  const rowTagActions = createRowTagActions({
    config,
    commonTags,
    knownTags,
    highlightedTags,
    highlightedText,
    filteredBlinkTags,
    orderTagsText,
    commitOperation: historyActions.commitOperation,
    snapshotImage: historyActions.snapshotImage,
    refreshImages,
    setStatus
  });
  const datasetActions = createDatasetActions({
    folderInput,
    configInput,
    config,
    images,
    history,
    isBusy,
    loadError,
    datasetName,
    visibleLimit,
    visibleBatchSize,
    recalculateDerivedTags,
    revokeImageUrls: historyActions.revokeImageUrls,
    setStatus
  });
  const batchActions = createBatchActions({
    config,
    batch,
    images,
    visibleImages,
    loadError,
    orderTagsText,
    commitOperation: historyActions.commitOperation,
    snapshotImage: historyActions.snapshotImage,
    setStatus
  });
  const exportActions = createExportActions({
    config,
    images,
    visibleImages,
    isBusy,
    loadError,
    resizedMaxPixels,
    setStatus
  });
  const viewerActions = createViewerActions({ viewer });
  let persistenceReady = false;
  let persistenceTimer: ReturnType<typeof window.setTimeout> | null = null;

  const undoTitle = computed(() => lastUndoOperation.value
    ? `Undo: ${historyActions.operationPreview(lastUndoOperation.value)}`
    : "No undo operation is available.");
  const redoTitle = computed(() => lastRedoOperation.value
    ? `Redo: ${historyActions.operationPreview(lastRedoOperation.value)}`
    : "No redo operation is available.");

  function imageUndoTitle(image: ImageRecord): string {
    return historyActions.canUndoImage(image)
      ? `Undo this image's last operation: ${historyActions.operationPreview(lastUndoOperation.value)}`
      : "The next undo is not a single-image operation for this image. Use global Undo if needed.";
  }

  function imageRedoTitle(image: ImageRecord): string {
    return historyActions.canRedoImage(image)
      ? `Redo this image's last operation: ${historyActions.operationPreview(lastRedoOperation.value)}`
      : "The next redo is not a single-image operation for this image. Use global Redo if needed.";
  }

  function imageHistoryTitle(image: ImageRecord): string {
    const rows = historyActions.imageHistory(image);
    return rows.length
      ? `Show recent operations for ${image.fileName}: ${rows.map((row) => row.text).join(" | ")}`
      : `No committed history for ${image.fileName} yet.`;
  }

  function scheduleDatasetPersistence(): void {
    if (!persistenceReady || !images.value.length) {
      return;
    }

    if (persistenceTimer) {
      window.clearTimeout(persistenceTimer);
    }

    persistenceTimer = window.setTimeout(() => {
      persistenceTimer = null;
      void datasetActions.persistCurrentDataset();
    }, 250);
  }

  async function restoreSavedDataset(): Promise<void> {
    await datasetActions.restorePersistedDataset();
    persistenceReady = true;
  }

  function onGlobalKeydown(event: KeyboardEvent): void {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || (target instanceof HTMLElement && target.isContentEditable);

    if (event.key === "Escape" && viewer.image) {
      event.preventDefault();
      viewerActions.closeViewer();
      return;
    }

    if (isTyping || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    if (event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      historyActions.undoDataset();
      return;
    }

    if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
      event.preventDefault();
      historyActions.redoDataset();
    }
  }

  watch(
    () => makeDatasetSnapshot(config),
    (snapshot) => {
      localStorage.setItem(configStorageKey, JSON.stringify(snapshot));
    },
    { deep: true }
  );

  watch(
    () => [config.filterText, config.filterMode, config.ignoreCase, filterInverted.value],
    () => {
      visibleLimit.value = visibleBatchSize;
    }
  );

  watch(
    () => [
      config.commonTagsText,
      config.knownTagsText,
      config.highlightTagsText,
      config.highlightText,
      config.orderTagsText
    ],
    () => {
      rowTagActions.refreshAllEditTextFormatting(images.value);
      recalculateDerivedTags();
    }
  );

  watch(images, scheduleDatasetPersistence, { deep: true });

  watch(
    () => config.theme,
    (theme) => applyTheme(theme),
    { immediate: true }
  );

  watch(
    () => [config.statsPlacement, config.batchToolsPlacement],
    ([statsPlacement, batchToolsPlacement]) => {
      if (statsPlacement !== "tab" && activeMainTab.value === "stats") {
        activeMainTab.value = "images";
      }
      if (batchToolsPlacement !== "tab" && activeMainTab.value === "batch") {
        activeMainTab.value = "images";
      }
    }
  );

  onMounted(() => {
    const cached = localStorage.getItem(configStorageKey);
    if (cached) {
      try {
        Object.assign(config, normalizeConfig(JSON.parse(cached) as Record<string, unknown>));
      } catch {
        statusText.value = "Saved config could not be loaded.";
      }
    }

    applyTheme(config.theme);
    window.addEventListener("keydown", onGlobalKeydown);
    void restoreSavedDataset();
  });

  onBeforeUnmount(() => {
    if (persistenceTimer) {
      window.clearTimeout(persistenceTimer);
    }
    if (filteredBlinkTimer) {
      window.clearTimeout(filteredBlinkTimer);
    }
    window.removeEventListener("keydown", onGlobalKeydown);
    historyActions.revokeImageUrls();
    document.body.style.overflow = "";
  });

  return {
    folderInput,
    configInput,
    images,
    autocompleteTags,
    filteredBlinkTags,
    tagStats,
    visibleLimit,
    isBusy,
    statusText,
    loadError,
    datasetName,
    filterInverted,
    activeMainTab,
    config,
    batch,
    history,
    viewer,
    commonTags,
    knownTags,
    highlightedTags,
    highlightedText,
    orderTagsText,
    tagTextStyleRules,
    imageTagTextStyleRules,
    filterTextStyleRules,
    regexTextStyleRules,
    dirtyImages,
    topTagStats,
    lastUndoOperation,
    lastRedoOperation,
    undoTitle,
    redoTitle,
    layoutClasses,
    hasHeaderPanelSections,
    hasHeaderContent,
    hasSidePanelSections,
    hasSidePanelContent,
    hasHeaderTagSets,
    hasSideTagSets,
    viewerImageStyle,
    visibleImages,
    renderedImages,
    imageUndoTitle,
    imageRedoTitle,
    imageHistoryTitle,
    ...historyActions,
    ...filterActions,
    ...rowTagActions,
    ...datasetActions,
    ...batchActions,
    ...exportActions,
    ...viewerActions
  };
}

export type ImageTaggerContext = ReturnType<typeof createImageTaggerContext>;

const imageTaggerKey: InjectionKey<ImageTaggerContext> = Symbol("ImageTagger");

export function provideImageTagger(): ImageTaggerContext {
  const context = createImageTaggerContext();
  provide(imageTaggerKey, context);
  return context;
}

export function useImageTaggerContext(): ImageTaggerContext {
  const context = inject(imageTaggerKey);
  if (!context) {
    throw new Error("ImageTagger context is not available.");
  }

  return context;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
