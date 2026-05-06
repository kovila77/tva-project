<template>
  <div class="app-layout" :data-theme="config.theme" :class="layoutClasses">
    <AppHeader />
    <QuickControls />

    <main class="workspace-grid">
      <SidePanel />
      <DatasetPanel />
    </main>

    <ImageViewer />
  </div>
</template>

<script setup lang="ts">
import AppHeader from "~/components/AppHeader.vue";
import DatasetPanel from "~/components/DatasetPanel.vue";
import ImageViewer from "~/components/ImageViewer.vue";
import QuickControls from "~/components/QuickControls.vue";
import SidePanel from "~/components/SidePanel.vue";
import { provideImageTagger } from "~/composables/useImageTagger";

const {
  config,
  layoutClasses
} = provideImageTagger();
</script>
