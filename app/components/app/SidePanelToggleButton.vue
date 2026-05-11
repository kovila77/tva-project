<template>
  <AppIconButton
    v-if="hasSidePanelSections"
    class="side-panel-toggle"
    :icon="arrowIcon"
    :title="title"
    :aria-label="title"
    @click="toggleSidePanel"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIconButton from "~/components/core/AppIconButton.vue";
import { useImageTaggerContext } from "~/composables/useImageTagger";
import type { AppIconName } from "~/utils/icons";

const { config, hasSidePanelSections } = useImageTaggerContext();

const isHidden = computed(() => config.sidePanelMode === "hidden");
const isRight = computed(() => config.sidePanelPosition === "right");
const label = computed(() => isHidden.value ? "Show side" : "Hide side");
const title = computed(() => `${label.value} panel`);
const arrowIcon = computed<AppIconName>(() => {
  if (isHidden.value) {
    return isRight.value ? "arrowLeft" : "arrowRight";
  }

  return isRight.value ? "arrowRight" : "arrowLeft";
});

function toggleSidePanel(): void {
  config.sidePanelMode = isHidden.value ? "open" : "hidden";
}
</script>

<style scoped lang="scss">
.side-panel-toggle {
  --app-icon-button-size: 28px;
  --app-icon-size: 1em;
  font-size: 13px;
  font-weight: 800;
}
</style>
