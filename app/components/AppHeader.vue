<template>
  <header
    v-if="hasHeaderContent"
    ref="headerElement"
    class="app-header"
    :style="headerStyle"
    title="Dataset files are loaded into browser memory. Source files are not modified."
  >
    <div class="app-header__content">
      <details v-if="config.fileManagementPlacement === 'header'" class="app-header__section" open>
        <summary>Config and image folders</summary>
        <FileManagementControls />
      </details>

      <QuickControls />
    </div>
    <button
      class="app-header__resize"
      type="button"
      title="Drag to resize the header."
      aria-label="Resize header"
      @pointerdown="startResize"
    />
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import FileManagementControls from "~/components/FileManagementControls.vue";
import QuickControls from "~/components/QuickControls.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const {
  config,
  hasHeaderContent
} = useImageTaggerContext();

const headerElement = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let resizeStartY = 0;
let resizeStartHeight = 0;

const headerStyle = computed(() => config.headerHeight > 0
  ? { height: `${config.headerHeight}px` }
  : {});

function updateHeaderOffset(): void {
  const height = hasHeaderContent.value ? headerElement.value?.offsetHeight ?? 0 : 0;
  document.documentElement.style.setProperty("--app-header-height", `${height}px`);
}

function observeHeader(): void {
  resizeObserver?.disconnect();
  resizeObserver = null;

  if (headerElement.value) {
    resizeObserver = new ResizeObserver(updateHeaderOffset);
    resizeObserver.observe(headerElement.value);
  }
}

function startResize(event: PointerEvent): void {
  if (!headerElement.value) {
    return;
  }

  resizeStartY = event.clientY;
  resizeStartHeight = config.headerHeight > 0 ? config.headerHeight : headerElement.value.offsetHeight;
  event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
  document.body.style.cursor = "row-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", resizeHeader);
  window.addEventListener("pointerup", stopResize, { once: true });
}

function resizeHeader(event: PointerEvent): void {
  const nextHeight = resizeStartHeight + event.clientY - resizeStartY;
  config.headerHeight = Math.min(1200, Math.max(48, Math.round(nextHeight)));
}

function stopResize(): void {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  window.removeEventListener("pointermove", resizeHeader);
}

onMounted(() => {
  void nextTick(updateHeaderOffset);
  observeHeader();
});

watch(hasHeaderContent, () => {
  void nextTick(() => {
    observeHeader();
    updateHeaderOffset();
  });
});

onBeforeUnmount(() => {
  stopResize();
  resizeObserver?.disconnect();
  document.documentElement.style.removeProperty("--app-header-height");
});
</script>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  max-height: calc(100vh - 16px);
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  resize: none;

  &__content {
    height: 100%;
    max-height: inherit;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 10px 12px 16px;
  }

  &__section {
    border-top: 1px solid var(--border);
    padding-top: 8px;

    summary {
      margin-bottom: 8px;
      cursor: pointer;
      font-weight: 750;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }
  }

  &__resize {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    width: 100%;
    min-height: 10px;
    margin: 0;
    border: 0;
    background: transparent;
    cursor: row-resize;

    &::after {
      content: "";
      display: block;
      height: 2px;
      border-radius: 999px;
      background: transparent;
    }

    &:hover::after,
    &:focus-visible::after {
      background: var(--blue);
    }
  }
}

@media (max-width: 860px) {
  .app-header {
    &__content {
      align-items: stretch;
      flex-direction: column;
    }
  }
}
</style>
