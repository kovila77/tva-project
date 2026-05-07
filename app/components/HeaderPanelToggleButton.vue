<template>
  <button
    v-if="hasHeaderPanelSections"
    class="header-panel-toggle"
    type="button"
    :title="title"
    :aria-label="title"
    @click="toggleHeaderPanel"
  >
    <AppIcon :name="arrowIcon" class="icon header-panel-toggle__icon" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "~/components/AppIcon.vue";
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  padding: 2px 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;

  &:hover,
  &:focus-visible {
    color: var(--text);
  }

  &__icon {
    width: 1em;
    min-width: 1em;
  }

  span {
    white-space: nowrap;
  }
}
</style>
