<template>
  <div v-if="viewer.image" class="image-viewer" @click.self="closeViewer">
    <div class="image-viewer__shell" role="dialog" aria-modal="true">
      <div class="image-viewer__bar">
        <strong>{{ viewer.image.fileName }}</strong>
        <div class="image-viewer__actions">
          <button class="btn icon-btn" type="button" title="Zoom image preview out." aria-label="Zoom out" @click="zoomViewer(0.85)"><AppIcon name="zoomOut" class="icon" /></button>
          <span>{{ Math.round(viewer.scale * 100) }}%</span>
          <button class="btn icon-btn" type="button" title="Zoom image preview in." aria-label="Zoom in" @click="zoomViewer(1.15)"><AppIcon name="zoomIn" class="icon" /></button>
          <button class="btn icon-btn" type="button" title="Reset preview zoom and pan." aria-label="Reset preview" @click="resetViewer"><AppIcon name="reset" class="icon" /></button>
          <button class="btn danger icon-btn" type="button" title="Close image preview." aria-label="Close image preview" @click="closeViewer"><AppIcon name="close" class="icon" /></button>
        </div>
      </div>
      <div
        class="image-viewer__stage"
        :class="{ 'image-viewer__stage--dragging': viewer.dragging }"
        @wheel.prevent="onViewerWheel"
        @pointerdown="onViewerStagePointerDown"
        @pointermove="moveViewerDrag"
        @pointerup="onViewerStagePointerUp"
        @pointercancel="onViewerStagePointerUp"
        @lostpointercapture="onViewerStagePointerUp"
        @dblclick="resetViewer"
      >
        <img
          ref="viewerImageRef"
          :src="viewer.image.objectUrl"
          :alt="viewer.image.fileName"
          draggable="false"
          @dragstart.prevent
          :style="viewerImageStyle"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

const viewerImageRef = ref<HTMLImageElement | null>(null);

const {
  viewer,
  viewerImageStyle,
  closeViewer,
  zoomViewer,
  resetViewer,
  onViewerWheel,
  startViewerDrag,
  moveViewerDrag,
  stopViewerDrag
} = useImageTaggerContext();

function onViewerStagePointerDown(event: PointerEvent): void {
  const image = viewerImageRef.value;
  const stage = event.currentTarget as HTMLElement | null;
  const rect = image?.getBoundingClientRect();
  event.preventDefault();

  if (!rect || rect.width <= 0 || rect.height <= 0) {
    closeViewer();
    return;
  }

  const insideImage = event.clientX >= rect.left
    && event.clientX <= rect.right
    && event.clientY >= rect.top
    && event.clientY <= rect.bottom;

  if (!insideImage) {
    closeViewer();
    return;
  }

  stage?.setPointerCapture?.(event.pointerId);
  startViewerDrag(event);
}

function onViewerStagePointerUp(event: PointerEvent | Event): void {
  const stage = event.currentTarget as HTMLElement | null;
  const pointerId = "pointerId" in event ? event.pointerId : null;
  if (pointerId !== null && stage?.hasPointerCapture?.(pointerId)) {
    stage.releasePointerCapture(pointerId);
  }

  stopViewerDrag();
}
</script>

<style scoped lang="scss">
.image-viewer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 12px;
  background: rgba(8, 11, 18, 0.72);

  &__shell {
    width: min(1600px, 100%);
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0;
    background: transparent;
    color: var(--text);
  }

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px;
    background: transparent;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;

    span {
      min-width: 54px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
  }

  &__stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    touch-action: none;
    background: transparent;

    &--dragging {
      cursor: grabbing;
    }

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transform-origin: center center;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none;
    }
  }
}
</style>
