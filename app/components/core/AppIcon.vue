<template>
  <FontAwesomeIcon v-if="!isLayeredIcon(icon)" class="fa-icon" :icon="icon" aria-hidden="true" />
  <FontAwesomeLayers v-else class="fa-icon" aria-hidden="true">
    <FontAwesomeIcon :icon="icon.base" />
    <FontAwesomeIcon
      v-for="(overlay, index) in icon.overlays"
      :key="index"
      class="app-icon__overlay"
      :icon="overlay.icon"
      :transform="overlay.transform"
    />
  </FontAwesomeLayers>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FontAwesomeIcon, FontAwesomeLayers } from "@fortawesome/vue-fontawesome";
import { appIcons, type AppIconName, type AppIconSpec, type LayeredAppIcon } from "~/utils/icons";

const props = defineProps<{
  name: AppIconName;
}>();

const icon = computed(() => appIcons[props.name] ?? appIcons.close);

function isLayeredIcon(iconSpec: AppIconSpec): iconSpec is LayeredAppIcon {
  return "base" in iconSpec;
}
</script>

<style scoped lang="scss">
.fa-icon {
  display: inline-flex;
  width: 1em;
  height: 1em;
  align-items: center;
  justify-content: center;
}

.app-icon__overlay {
  stroke: var(--surface);
  stroke-width: 28px;
  paint-order: stroke fill;
}
</style>
