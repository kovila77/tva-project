<template>
  <AppIconButton
    v-if="hasHeaderPanelSections"
    class="header-panel-toggle"
    :icon="arrowIcon"
    :title="title"
    :aria-label="title"
    @click="toggleHeaderPanel"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { AppIconName } from "~/utils/icons";

const { config, hasHeaderPanelSections } = useImageTaggerContext();

const isHidden = computed(() => config.headerPanelMode === "hidden");
const label = computed(() => isHidden.value ? "Show header" : "Hide header");
const title = computed(() => `${label.value} panel`);
const arrowIcon = computed<AppIconName>(() => isHidden.value ? "arrowDown" : "arrowUp");

function toggleHeaderPanel(): void {
  config.headerPanelMode = isHidden.value ? "open" : "hidden";
}
</script>

<style scoped lang="scss">
.header-panel-toggle {
  --app-icon-button-size: 28px;
  --app-icon-size: 1em;
  font-size: 13px;
  font-weight: 800;
}
</style>
