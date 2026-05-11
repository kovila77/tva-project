import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, shallowRef, watch } from "vue";
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
  ViewerState,
  SettingsModalState
} from "~/types/imageTagger";
import { normalizeConfig } from "~/utils/config";
import { applyTheme } from "~/utils/imageFiles";
import { collectKnownTags, countTags, createFilterMatcher, makeDatasetSnapshot, parseTags } from "~/utils/tagDataset";
import { createSettingsModalActions } from "./imageTagger/settingModalActions";

const configStorageKey = "tva-image-tagger.config.v2";
const visibleBatchSize = 80;
const focusFilterEventName = "tva-image-tagger:focus-filter";

function createImageTaggerContext() {
  const folderInput = ref<HTMLInputElement | null>(null);
  const configInput = ref<HTMLInputElement | null>(null);
  const images = shallowRef<ImageRecord[]>([]);
  const autocompleteTags = shallowRef<string[]>([]);
  const tagStats = shallowRef<TagStat[]>([]);
  const filteredBlinkTags = shallowRef<string[]>([]);
  const filteredBlinkPatterns = shallowRef<string[]>([]);
  const visibleLimit = ref(visibleBatchSize);
  const visibleStatusBlinking = ref(false);
  const visibleStatusBlinkKey = ref(0);
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

  const settingsModal = reactive<SettingsModalState>({
    open: false
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
    },
    {
      key: "filtered-blink-regex",
      className: "tag-text-filtered-blink",
      match: "regex",
      patterns: filteredBlinkPatterns.value,
      caseSensitive: !config.ignoreCase
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
    hasHeaderTagSets.value
  ));
  const hasHeaderContent = computed(() => (
    config.headerPanelMode !== "hidden"
    && hasHeaderPanelSections.value
  ));
  const hasSidePanelSections = computed(() => (
    hasSideTagSets.value
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
    "row-tags-hidden": config.rowChipMode === "hidden",
    "corners-square": config.cornersStyle === "square",
    "spacing-minimal": config.spacingMode === "minimal",
    "spacing-super-minimal": config.spacingMode === "super-minimal",
    "spacing-none": config.spacingMode === "none"
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
        target: config.filterTarget,
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
  const canReorderImages = computed(() => (
    images.value.length > 1
    && visibleImages.value.length === images.value.length
    && renderedImages.value.length === images.value.length
  ));

  function refreshImages(): void {
    images.value = images.value.map((image) => ({ ...image }));
  }

  function recalculateDerivedTags(): void {
    tagStats.value = countTags(images.value);
    autocompleteTags.value = collectKnownTags(images.value, config);
  }

  function setStatus(message: string): void {
    statusText.value = message;
  }

  let filteredBlinkTimer: ReturnType<typeof window.setTimeout> | null = null;
  let visibleStatusBlinkTimer: ReturnType<typeof window.setTimeout> | null = null;
  let visibleSignatureReady = false;
  let lastVisibleStatusCount = 0;
  let reportedFilterSignature = "";
  let reportedVisibleSignature = "";

  function blinkVisibleStatus(): void {
    visibleStatusBlinkKey.value += 1;
    visibleStatusBlinking.value = true;
    if (visibleStatusBlinkTimer) {
      window.clearTimeout(visibleStatusBlinkTimer);
    }
    visibleStatusBlinkTimer = window.setTimeout(() => {
      visibleStatusBlinkTimer = null;
      visibleStatusBlinking.value = false;
    }, 1600);
  }

  function visibleImagesSignature(): string {
    return visibleImages.value.map((image) => image.id).sort().join("\n");
  }

  function filterStateSignature(): string {
    return [
      config.filterText,
      config.filterMode,
      config.filterTarget,
      config.ignoreCase ? "ignore-case" : "case-sensitive",
      filterInverted.value ? "inverted" : "normal"
    ].join("\n");
  }

  function signatureCount(signature: string | undefined): number {
    return signature ? signature.split("\n").filter(Boolean).length : 0;
  }

  function reportFilterApplied(previousCount = lastVisibleStatusCount): void {
    const nextSignature = visibleImagesSignature();
    const nextCount = signatureCount(nextSignature);

    blinkVisibleStatus();
    if (images.value.length) {
      setStatus(`Filter applied. Visible ${previousCount}->${nextCount}.`);
    }

    lastVisibleStatusCount = nextCount;
    reportedFilterSignature = filterStateSignature();
    reportedVisibleSignature = nextSignature;
  }

  function blinkFilteredTags(): void {
    reportFilterApplied();
    filteredBlinkTags.value = config.filterMode === "tags" && config.filterTarget === "caption"
      ? parseTags(config.filterText)
      : [];
    filteredBlinkPatterns.value = config.filterMode === "regex"
      ? parseTags(config.filterText, false)
      : [];
    if (filteredBlinkTimer) {
      window.clearTimeout(filteredBlinkTimer);
    }
    filteredBlinkTimer = window.setTimeout(() => {
      filteredBlinkTimer = null;
      filteredBlinkTags.value = [];
      filteredBlinkPatterns.value = [];
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
    images,
    config,
    commonTags,
    knownTags,
    highlightedTags,
    highlightedText,
    filteredBlinkTags,
    filteredBlinkPatterns,
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
    setStatus
  });
  const viewerActions = createViewerActions({ viewer });
  const settingsModalActions = createSettingsModalActions({ settingsModal });
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

  function persistCommittedDatasetChange(): void {
    if (!persistenceReady || !images.value.length) {
      return;
    }

    void datasetActions.persistCurrentDataset();
  }

  function moveImageRow(draggedId: string, targetId: string, placement: "before" | "after"): boolean {
    if (!canReorderImages.value) {
      setStatus("Show all loaded images before reordering rows.");
      return false;
    }
    if (draggedId === targetId) {
      return false;
    }

    const draggedIndex = images.value.findIndex((image) => image.id === draggedId);
    const targetImage = images.value.find((image) => image.id === targetId);
    if (draggedIndex < 0 || !targetImage) {
      return false;
    }

    const nextImages = [...images.value];
    const [draggedImage] = nextImages.splice(draggedIndex, 1);
    const targetIndex = nextImages.findIndex((image) => image.id === targetId);
    if (!draggedImage || targetIndex < 0) {
      return false;
    }

    nextImages.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, draggedImage);
    if (nextImages.every((image, index) => image.id === images.value[index]?.id)) {
      return false;
    }

    nextImages.forEach((image, index) => {
      image.index = index;
    });
    images.value = nextImages;
    setStatus(`Moved ${draggedImage.fileName} ${placement} ${targetImage.fileName}.`);
    if (persistenceReady) {
      void datasetActions.persistCurrentDataset();
    }
    return true;
  }

  async function restoreSavedDataset(): Promise<void> {
    const restored = await datasetActions.restorePersistedDataset();
    if (!restored) {
      await datasetActions.loadPlaceholderDataset();
    }
    persistenceReady = true;
  }

  async function focusFilter(): Promise<void> {
    config.filterBarMode = "open";
    await nextTick();
    window.dispatchEvent(new CustomEvent(focusFilterEventName));
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

    if (event.key === "Escape" && settingsModal.open) {
      event.preventDefault();
      settingsModalActions.closeSettingsModal();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "k" || event.code === "KeyK")) {
      event.preventDefault();
      void focusFilter();
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
    () => [config.filterText, config.filterMode, config.filterTarget, config.ignoreCase, filterInverted.value],
    () => {
      visibleLimit.value = visibleBatchSize;
      if (reportedFilterSignature === filterStateSignature()) {
        return;
      }

      reportFilterApplied();
    }
  );

  watch(
    () => visibleImagesSignature(),
    (nextSignature, previousSignature) => {
      const nextCount = signatureCount(nextSignature);
      if (!visibleSignatureReady) {
        visibleSignatureReady = true;
        lastVisibleStatusCount = nextCount;
        return;
      }

      if (reportedVisibleSignature === nextSignature) {
        lastVisibleStatusCount = nextCount;
        return;
      }

      const hasActiveFilter = Boolean(config.filterText.trim()) || filterInverted.value;
      if (hasActiveFilter && nextSignature !== previousSignature) {
        reportFilterApplied(signatureCount(previousSignature));
        return;
      }

      lastVisibleStatusCount = nextCount;
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

  watch(
    () => [history.past.length, history.future.length],
    persistCommittedDatasetChange
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
    if (visibleStatusBlinkTimer) {
      window.clearTimeout(visibleStatusBlinkTimer);
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
    visibleStatusBlinking,
    visibleStatusBlinkKey,
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
    settingsModal,
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
    canReorderImages,
    imageUndoTitle,
    imageRedoTitle,
    imageHistoryTitle,
    moveImageRow,
    ...historyActions,
    ...filterActions,
    ...rowTagActions,
    ...datasetActions,
    ...batchActions,
    ...exportActions,
    ...viewerActions,
    ...settingsModalActions
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
