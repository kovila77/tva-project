import type { ComputedRef, Ref } from "vue";
import type { AppConfig, ImageRecord, MainTab } from "~/types/imageTagger";

interface FilterActionOptions {
  config: AppConfig;
  filterInverted: Ref<boolean>;
  visibleLimit: Ref<number>;
  visibleImages: ComputedRef<ImageRecord[]>;
  activeMainTab: Ref<MainTab>;
  visibleBatchSize: number;
  onFilterExecuted?: () => void;
}

export function createFilterActions({
  config,
  filterInverted,
  visibleLimit,
  visibleImages,
  activeMainTab,
  visibleBatchSize,
  onFilterExecuted
}: FilterActionOptions) {
  function applyFilter(): void {
    filterInverted.value = false;
    visibleLimit.value = visibleBatchSize;
    onFilterExecuted?.();
  }

  function invertFilter(): void {
    filterInverted.value = !filterInverted.value;
    visibleLimit.value = visibleBatchSize;
    onFilterExecuted?.();
  }

  function clearFilter(): void {
    config.filterText = "";
    filterInverted.value = false;
    onFilterExecuted?.();
  }

  function filterByTag(tag: string): void {
    config.filterMode = "tags";
    config.filterText = tag;
    activeMainTab.value = "images";
    applyFilter();
  }

  function showMore(): void {
    visibleLimit.value = Math.min(visibleLimit.value + visibleBatchSize, visibleImages.value.length);
  }

  function addSelectedToFilter(image: ImageRecord): void {
    if (!image?.selectedTag) {
      return;
    }

    config.filterText = config.filterText.trim()
      ? `${config.filterText}, ${image.selectedTag}`
      : image.selectedTag;
    applyFilter();
  }

  return {
    applyFilter,
    invertFilter,
    clearFilter,
    filterByTag,
    showMore,
    addSelectedToFilter
  };
}
