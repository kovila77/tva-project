<template>
  <div v-if="viewer.image" class="viewer-overlay" @click.self="closeViewer">
    <div class="viewer-shell" role="dialog" aria-modal="true">
      <div class="viewer-bar">
        <strong>{{ viewer.image.fileName }}</strong>
        <div class="viewer-actions">
          <button class="btn" type="button" title="Zoom image preview out." @click="zoomViewer(0.85)"><span class="icon">−</span> Zoom Out</button>
          <span>{{ Math.round(viewer.scale * 100) }}%</span>
          <button class="btn" type="button" title="Zoom image preview in." @click="zoomViewer(1.15)"><span class="icon">＋</span> Zoom In</button>
          <button class="btn" type="button" title="Reset preview zoom and pan." @click="resetViewer"><span class="icon">⟲</span> Reset</button>
          <button class="btn danger" type="button" title="Close image preview." @click="closeViewer"><span class="icon">×</span> Close</button>
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
