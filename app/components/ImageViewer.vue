<template>
  <div v-if="viewer.image" class="viewer-overlay" @click.self="closeViewer">
    <div class="viewer-shell" role="dialog" aria-modal="true">
      <div class="viewer-bar">
        <strong>{{ viewer.image.fileName }}</strong>
        <div class="viewer-actions">
          <button class="btn icon-btn" type="button" title="Zoom image preview out." aria-label="Zoom out" @click="zoomViewer(0.85)"><AppIcon name="zoomOut" class="icon" /></button>
          <span>{{ Math.round(viewer.scale * 100) }}%</span>
          <button class="btn icon-btn" type="button" title="Zoom image preview in." aria-label="Zoom in" @click="zoomViewer(1.15)"><AppIcon name="zoomIn" class="icon" /></button>
          <button class="btn icon-btn" type="button" title="Reset preview zoom and pan." aria-label="Reset preview" @click="resetViewer"><AppIcon name="reset" class="icon" /></button>
          <button class="btn danger icon-btn" type="button" title="Close image preview." aria-label="Close image preview" @click="closeViewer"><AppIcon name="close" class="icon" /></button>
        </div>
      </div>
      <div
        class="viewer-stage"
        :class="{ dragging: viewer.dragging }"
        @wheel.prevent="onViewerWheel"
        @pointerdown="startViewerDrag"
        @pointermove="moveViewerDrag"
        @pointerup="stopViewerDrag"
        @pointercancel="stopViewerDrag"
        @dblclick="resetViewer"
      >
        <img
          :src="viewer.image.objectUrl"
          :alt="viewer.image.fileName"
          draggable="false"
          :style="viewerImageStyle"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";

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
</script>
